import prisma from "../utils/prisma.js";
import { sanitizeInput } from "../utils/sanitize.js";
import { analyzeToxicity } from "../utils/toxicity.js";

const REPORT_HIDE_THRESHOLD = 5;

const isHiddenColumnMissing = (err) => {
  const msg = (err && err.message ? err.message : "").toLowerCase();
  const code = err && err.code ? String(err.code) : "";
  if (code === "P2022") return true;
  if (msg.includes("is_hidden") && msg.includes("does not exist")) return true;
  if (msg.includes("unknown argument") && msg.includes("is_hidden")) return true;
  return false;
};

const isSchemaOrTableMissing = (err) => {
  const msg = (err && err.message ? err.message : "").toLowerCase();
  const code = err && err.code ? String(err.code) : "";
  if (code === "P2021" || code === "P2022") return true;
  if (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table") || msg.includes("column"))) return true;
  return false;
};

const ensurePublishedStoryById = async (storyId) => {
  const story = await prisma.stories.findUnique({
    where: { story_id: storyId },
    select: {
      story_id: true,
      author_id: true,
      status: true,
      visibility: true,
      is_deleted: true,
    },
  });

  if (!story || story.is_deleted) {
    return { error: { status: 404, message: "Story not found" } };
  }

  if (story.status !== "published" || story.visibility !== "public") {
    return { error: { status: 403, message: "Engagement is only available for published stories" } };
  }

  return { story };
};

const ensurePublishedStoryByChapterId = async (chapterId) => {
  const chapter = await prisma.chapters.findUnique({
    where: { chapter_id: chapterId },
    select: { chapter_id: true, story_id: true },
  });

  if (!chapter) {
    return { error: { status: 404, message: "Chapter not found" } };
  }

  const { story, error } = await ensurePublishedStoryById(chapter.story_id);
  if (error) return { error };

  return { story, chapter };
};

const ensureReader = (user) => {
  if (!user) {
    return { error: { status: 401, message: "Authentication required" } };
  }
  if (!user.is_reader && !user.is_writer) {
    return { error: { status: 403, message: "Reader or writer access required" } };
  }
  return { ok: true };
};

const extractMentions = (text) => {
  if (!text || typeof text !== "string") return [];
  const regex = /(^|\s)@([a-zA-Z0-9_\.]{3,30})\b/g;
  const out = new Set();
  let m;
  while ((m = regex.exec(text)) !== null) {
    const handle = (m[2] || "").trim();
    if (handle) out.add(handle);
  }
  return Array.from(out);
};

const createMentionNotifications = async ({ commentId, actorId, handles }) => {
  if (!handles.length) return;

  const profiles = await prisma.user_profiles.findMany({
    where: { handle_name: { in: handles } },
    select: { user_id: true, handle_name: true },
  });

  if (!profiles.length) return;

  const mentionRows = profiles.map((p) => ({
    comment_id: commentId,
    mentioned_user_id: p.user_id,
  }));

  await prisma.comment_mentions.createMany({
    data: mentionRows,
    skipDuplicates: true,
  });

  const notifRows = profiles
    .filter((p) => p.user_id !== actorId)
    .map((p) => ({
      recipient_id: p.user_id,
      actor_id: actorId,
      type: "mention",
      entity_type: "comment",
      entity_id: commentId,
      data: null,
    }));

  if (notifRows.length) {
    await prisma.notifications.createMany({ data: notifRows });
  }
};

export const storyEngagement = async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { story, error } = await ensurePublishedStoryById(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    const [likeCount, commentCount, shareCount] = await Promise.all([
      prisma.story_likes.count({ where: { story_id: storyId } }),
      prisma.comments.count({ where: { story_id: storyId, chapter_id: null, is_deleted: false } }),
      prisma.story_shares.count({ where: { story_id: storyId } }),
    ]);

    let likedByMe = false;
    if (req.user?.is_reader && !req.user?.is_writer) {
      const row = await prisma.story_likes.findUnique({
        where: { user_id_story_id: { user_id: req.user.user_id, story_id: storyId } },
        select: { id: true },
      });
      likedByMe = Boolean(row);
    }

    return res.json({
      story_id: story.story_id,
      likeCount,
      commentCount,
      shareCount,
      likedByMe,
    });
  } catch (err) {
    console.error("storyEngagement error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listStoryReviews = async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { error } = await ensurePublishedStoryById(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const [total, reviews, agg] = await Promise.all([
      prisma.story_reviews.count({ where: { story_id: storyId } }),
      prisma.story_reviews.findMany({
        where: { story_id: storyId },
        orderBy: { updated_at: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          },
        },
      }),
      prisma.story_reviews.aggregate({ where: { story_id: storyId }, _avg: { rating: true } }),
    ]);

    return res.json({
      story_id: storyId,
      total,
      skip,
      limit,
      avg_rating: agg?._avg?.rating ?? null,
      reviews,
    });
  } catch (err) {
    console.error("listStoryReviews error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const chapterEngagement = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const { story, error } = await ensurePublishedStoryByChapterId(chapterId);
    if (error) return res.status(error.status).json({ message: error.message });

    const [likeCount, commentCount, shareCount] = await Promise.all([
      prisma.chapter_likes.count({ where: { chapter_id: chapterId } }),
      prisma.comments.count({ where: { chapter_id: chapterId, is_deleted: false } }),
      prisma.chapter_shares.count({ where: { chapter_id: chapterId } }),
    ]);

    let likedByMe = false;
    if (req.user?.user_id) {
      const row = await prisma.chapter_likes.findUnique({
        where: { user_id_chapter_id: { user_id: req.user.user_id, chapter_id: chapterId } },
        select: { id: true },
      });
      likedByMe = Boolean(row);
    }

    return res.json({
      chapter_id: chapterId,
      story_id: story.story_id,
      likeCount,
      commentCount,
      shareCount,
      likedByMe,
    });
  } catch (err) {
    console.error("chapterEngagement error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const likeStory = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { error } = await ensurePublishedStoryById(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.story_likes.upsert({
      where: { user_id_story_id: { user_id: user.user_id, story_id: storyId } },
      update: {},
      create: { user_id: user.user_id, story_id: storyId },
    });

    const count = await prisma.story_likes.count({ where: { story_id: storyId } });
    return res.status(201).json({ liked: true, count });
  } catch (err) {
    console.error("likeStory error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unlikeStory = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { error } = await ensurePublishedStoryById(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.story_likes.deleteMany({ where: { user_id: user.user_id, story_id: storyId } });
    const count = await prisma.story_likes.count({ where: { story_id: storyId } });
    return res.json({ liked: false, count });
  } catch (err) {
    console.error("unlikeStory error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const likeChapter = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const { error } = await ensurePublishedStoryByChapterId(chapterId);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.chapter_likes.upsert({
      where: { user_id_chapter_id: { user_id: user.user_id, chapter_id: chapterId } },
      update: {},
      create: { user_id: user.user_id, chapter_id: chapterId },
    });

    const count = await prisma.chapter_likes.count({ where: { chapter_id: chapterId } });
    return res.status(201).json({ liked: true, count });
  } catch (err) {
    console.error("likeChapter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unlikeChapter = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const { error } = await ensurePublishedStoryByChapterId(chapterId);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.chapter_likes.deleteMany({ where: { user_id: user.user_id, chapter_id: chapterId } });
    const count = await prisma.chapter_likes.count({ where: { chapter_id: chapterId } });
    return res.json({ liked: false, count });
  } catch (err) {
    console.error("unlikeChapter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listStoryComments = async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { story, error } = await ensurePublishedStoryById(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const canSeeHidden = req.user?.user_id && story?.author_id === req.user.user_id;

    let rows;
    try {
      rows = await prisma.comments.findMany({
        where: {
          story_id: storyId,
          parent_id: null,
          is_deleted: false,
          ...(canSeeHidden ? {} : { is_hidden: false }),
        },
        orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          },
          replies: {
            where: {
              is_deleted: false,
              ...(canSeeHidden ? {} : { is_hidden: false }),
            },
            orderBy: { created_at: "asc" },
            take: 50,
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                  profile: { select: { handle_name: true, profile_image: true } },
                },
              },
            },
          },
          reactions: true,
        },
      });
    } catch (e) {
      if (!isHiddenColumnMissing(e)) throw e;
      rows = await prisma.comments.findMany({
        where: {
          story_id: storyId,
          parent_id: null,
          is_deleted: false,
        },
        orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          },
          replies: {
            where: { is_deleted: false },
            orderBy: { created_at: "asc" },
            take: 50,
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                  profile: { select: { handle_name: true, profile_image: true } },
                },
              },
            },
          },
          reactions: true,
        },
      });
    }

    return res.json({ comments: rows, skip, limit });
  } catch (err) {
    console.error("listStoryComments error:", err);
    if (isSchemaOrTableMissing(err)) {
      return res.json({ comments: [], skip: 0, limit: 0 });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listChapterComments = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const { story, error } = await ensurePublishedStoryByChapterId(chapterId);
    if (error) return res.status(error.status).json({ message: error.message });

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const canSeeHidden = req.user?.user_id && story?.author_id === req.user.user_id;

    let rows;
    try {
      rows = await prisma.comments.findMany({
        where: {
          chapter_id: chapterId,
          parent_id: null,
          is_deleted: false,
          ...(canSeeHidden ? {} : { is_hidden: false }),
        },
        orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          },
          replies: {
            where: {
              is_deleted: false,
              ...(canSeeHidden ? {} : { is_hidden: false }),
            },
            orderBy: { created_at: "asc" },
            take: 50,
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                  profile: { select: { handle_name: true, profile_image: true } },
                },
              },
            },
          },
          reactions: true,
        },
      });
    } catch (e) {
      if (!isHiddenColumnMissing(e)) throw e;
      rows = await prisma.comments.findMany({
        where: {
          chapter_id: chapterId,
          parent_id: null,
          is_deleted: false,
        },
        orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          },
          replies: {
            where: { is_deleted: false },
            orderBy: { created_at: "asc" },
            take: 50,
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                  profile: { select: { handle_name: true, profile_image: true } },
                },
              },
            },
          },
          reactions: true,
        },
      });
    }

    return res.json({ comments: rows, skip, limit });
  } catch (err) {
    console.error("listChapterComments error:", err);
    if (isSchemaOrTableMissing(err)) {
      return res.json({ comments: [], skip: 0, limit: 0 });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createStoryComment = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { story, error } = await ensurePublishedStoryById(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    const body = sanitizeInput((req.body?.body || "").toString());
    if (!body.trim()) return res.status(400).json({ message: "Comment body is required" });

    const tox = await analyzeToxicity(body);
    if (tox.ok && tox.isToxic) {
      return res.status(422).json({
        message: "Your comment appears to contain toxic content and cannot be posted.",
        labels: tox.labels || [],
      });
    }

    let created;
    try {
      created = await prisma.comments.create({
        data: {
          story_id: storyId,
          chapter_id: null,
          user_id: user.user_id,
          parent_id: null,
          body,
        },
      });
    } catch (e) {
      if (!isHiddenColumnMissing(e)) throw e;
      created = await prisma.comments.create({
        data: {
          story_id: storyId,
          chapter_id: null,
          user_id: user.user_id,
          parent_id: null,
          body,
        },
      });
    }

    try {
      await prisma.notifications.create({
        data: {
          recipient_id: story.author_id,
          actor_id: user.user_id,
          type: "comment",
          entity_type: "story",
          entity_id: storyId,
          data: JSON.stringify({
            storyId,
            storyTitle: story.title,
            commentId: created.comment_id,
            preview: body.slice(0, 120),
          }),
        },
      });
    } catch (e) {
      if (!isSchemaOrTableMissing(e)) throw e;
    }

    try {
      const handles = extractMentions(body);
      await createMentionNotifications({ commentId: created.comment_id, actorId: user.user_id, handles });
    } catch (e) {
      if (!isSchemaOrTableMissing(e)) throw e;
    }

    return res.status(201).json(created);
  } catch (err) {
    console.error("createStoryComment error:", err);
    if (isSchemaOrTableMissing(err)) {
      return res.status(500).json({
        message: "Database schema for comments is not ready. Run Prisma migrate/db push then restart the server.",
        error: err.message,
      });
    }
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

export const createChapterComment = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const { story, chapter, error } = await ensurePublishedStoryByChapterId(chapterId);
    if (error) return res.status(error.status).json({ message: error.message });

    const body = sanitizeInput((req.body?.body || "").toString());
    if (!body.trim()) return res.status(400).json({ message: "Comment body is required" });

    const tox = await analyzeToxicity(body);
    if (tox.ok && tox.isToxic) {
      return res.status(422).json({
        message: "Your comment appears to contain toxic content and cannot be posted.",
        labels: tox.labels || [],
      });
    }

    let created;
    try {
      created = await prisma.comments.create({
        data: {
          story_id: story.story_id,
          chapter_id: chapter.chapter_id,
          user_id: user.user_id,
          parent_id: null,
          body,
        },
      });
    } catch (e) {
      if (!isHiddenColumnMissing(e)) throw e;
      created = await prisma.comments.create({
        data: {
          story_id: story.story_id,
          chapter_id: chapter.chapter_id,
          user_id: user.user_id,
          parent_id: null,
          body,
        },
      });
    }

    try {
      await prisma.notifications.create({
        data: {
          recipient_id: story.author_id,
          actor_id: user.user_id,
          type: "comment",
          entity_type: "chapter",
          entity_id: chapter.chapter_id,
          data: JSON.stringify({
            storyId: story.story_id,
            storyTitle: story.title,
            chapterId: chapter.chapter_id,
            chapterTitle: chapter.title,
            commentId: created.comment_id,
            preview: body.slice(0, 120),
          }),
        },
      });
    } catch (e) {
      if (!isSchemaOrTableMissing(e)) throw e;
    }

    try {
      const handles = extractMentions(body);
      await createMentionNotifications({ commentId: created.comment_id, actorId: user.user_id, handles });
    } catch (e) {
      if (!isSchemaOrTableMissing(e)) throw e;
    }

    return res.status(201).json(created);
  } catch (err) {
    console.error("createChapterComment error:", err);
    if (isSchemaOrTableMissing(err)) {
      return res.status(500).json({
        message: "Database schema for comments is not ready. Run Prisma migrate/db push then restart the server.",
        error: err.message,
      });
    }
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

export const replyToComment = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const parentId = Number(req.params.commentId);
    if (!parentId) return res.status(400).json({ message: "Invalid commentId" });

    const parent = await prisma.comments.findUnique({
      where: { comment_id: parentId },
      select: { comment_id: true, story_id: true, chapter_id: true, user_id: true, is_deleted: true },
    });

    if (!parent || parent.is_deleted) return res.status(404).json({ message: "Comment not found" });

    if (parent.chapter_id) {
      const { error } = await ensurePublishedStoryByChapterId(parent.chapter_id);
      if (error) return res.status(error.status).json({ message: error.message });
    } else if (parent.story_id) {
      const { error } = await ensurePublishedStoryById(parent.story_id);
      if (error) return res.status(error.status).json({ message: error.message });
    } else {
      return res.status(400).json({ message: "Invalid comment target" });
    }

    const body = sanitizeInput((req.body?.body || "").toString());
    if (!body.trim()) return res.status(400).json({ message: "Reply body is required" });

    const tox = await analyzeToxicity(body);
    if (tox.ok && tox.isToxic) {
      return res.status(422).json({
        message: "Your reply appears to contain toxic content and cannot be posted.",
        labels: tox.labels || [],
      });
    }

    let created;
    try {
      created = await prisma.comments.create({
        data: {
          story_id: parent.story_id,
          chapter_id: parent.chapter_id,
          user_id: user.user_id,
          parent_id: parent.comment_id,
          body,
        },
      });
    } catch (e) {
      if (!isHiddenColumnMissing(e)) throw e;
      created = await prisma.comments.create({
        data: {
          story_id: parent.story_id,
          chapter_id: parent.chapter_id,
          user_id: user.user_id,
          parent_id: parent.comment_id,
          body,
        },
      });
    }

    if (parent.user_id !== user.user_id) {
      try {
        await prisma.notifications.create({
          data: {
            recipient_id: parent.user_id,
            actor_id: user.user_id,
            type: "reply",
            entity_type: "comment",
            entity_id: parent.comment_id,
            data: JSON.stringify({
              storyId: parent.story_id,
              chapterId: parent.chapter_id,
              commentId: parent.comment_id,
              replyId: created.comment_id,
              preview: body.slice(0, 120),
            }),
          },
        });
      } catch (e) {
        if (!isSchemaOrTableMissing(e)) throw e;
      }
    }

    try {
      const handles = extractMentions(body);
      await createMentionNotifications({ commentId: created.comment_id, actorId: user.user_id, handles });
    } catch (e) {
      if (!isSchemaOrTableMissing(e)) throw e;
    }

    return res.status(201).json(created);
  } catch (err) {
    console.error("replyToComment error:", err);
    if (isSchemaOrTableMissing(err)) {
      return res.status(500).json({
        message: "Database schema for comments is not ready. Run Prisma migrate/db push then restart the server.",
        error: err.message,
      });
    }
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

export const pinComment = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.is_writer) return res.status(403).json({ message: "Writer access required" });

    const commentId = Number(req.params.commentId);
    if (!commentId) return res.status(400).json({ message: "Invalid commentId" });

    const comment = await prisma.comments.findUnique({
      where: { comment_id: commentId },
      select: { comment_id: true, story_id: true, is_deleted: true },
    });

    if (!comment || comment.is_deleted) return res.status(404).json({ message: "Comment not found" });
    if (!comment.story_id) return res.status(400).json({ message: "Comment is not attached to a story" });

    const story = await prisma.stories.findUnique({ where: { story_id: comment.story_id }, select: { author_id: true } });
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.author_id !== user.user_id) return res.status(403).json({ message: "Not allowed" });

    await prisma.comments.update({
      where: { comment_id: commentId },
      data: { is_pinned: true, updated_at: new Date() },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("pinComment error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unpinComment = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.is_writer) return res.status(403).json({ message: "Writer access required" });

    const commentId = Number(req.params.commentId);
    if (!commentId) return res.status(400).json({ message: "Invalid commentId" });

    const comment = await prisma.comments.findUnique({
      where: { comment_id: commentId },
      select: { comment_id: true, story_id: true, is_deleted: true },
    });

    if (!comment || comment.is_deleted) return res.status(404).json({ message: "Comment not found" });
    if (!comment.story_id) return res.status(400).json({ message: "Comment is not attached to a story" });

    const story = await prisma.stories.findUnique({ where: { story_id: comment.story_id }, select: { author_id: true } });
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.author_id !== user.user_id) return res.status(403).json({ message: "Not allowed" });

    await prisma.comments.update({
      where: { comment_id: commentId },
      data: { is_pinned: false, updated_at: new Date() },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("unpinComment error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const user = req.user;
    const commentId = Number(req.params.commentId);
    if (!commentId) return res.status(400).json({ message: "Invalid commentId" });

    const comment = await prisma.comments.findUnique({
      where: { comment_id: commentId },
      select: { comment_id: true, user_id: true, story_id: true, chapter_id: true, is_deleted: true },
    });

    if (!comment || comment.is_deleted) return res.status(404).json({ message: "Comment not found" });

    let canDelete = comment.user_id === user.user_id;

    if (!canDelete && comment.story_id) {
      const story = await prisma.stories.findUnique({
        where: { story_id: comment.story_id },
        select: { author_id: true },
      });
      if (story?.author_id === user.user_id) canDelete = true;
    }

    if (!canDelete) return res.status(403).json({ message: "Not allowed" });

    await prisma.comments.update({
      where: { comment_id: commentId },
      data: { is_deleted: true, deleted_at: new Date(), updated_at: new Date() },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const reactToComment = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const commentId = Number(req.params.commentId);
    if (!commentId) return res.status(400).json({ message: "Invalid commentId" });

    const reaction = (req.body?.reaction || "").toString().trim().toLowerCase();
    if (!reaction) return res.status(400).json({ message: "reaction is required" });

    const comment = await prisma.comments.findUnique({
      where: { comment_id: commentId },
      select: { comment_id: true, story_id: true, chapter_id: true, user_id: true, is_deleted: true },
    });
    if (!comment || comment.is_deleted) return res.status(404).json({ message: "Comment not found" });

    if (comment.chapter_id) {
      const { error } = await ensurePublishedStoryByChapterId(comment.chapter_id);
      if (error) return res.status(error.status).json({ message: error.message });
    } else if (comment.story_id) {
      const { error } = await ensurePublishedStoryById(comment.story_id);
      if (error) return res.status(error.status).json({ message: error.message });
    }

    await prisma.comment_reactions.upsert({
      where: { comment_id_user_id_reaction: { comment_id: commentId, user_id: user.user_id, reaction } },
      update: {},
      create: { comment_id: commentId, user_id: user.user_id, reaction },
    });

    if (comment.user_id !== user.user_id) {
      await prisma.notifications.create({
        data: {
          recipient_id: comment.user_id,
          actor_id: user.user_id,
          type: "comment_reaction",
          entity_type: "comment",
          entity_id: commentId,
          data: null,
        },
      });
    }

    const count = await prisma.comment_reactions.count({ where: { comment_id: commentId } });
    return res.status(201).json({ reacted: true, count });
  } catch (err) {
    console.error("reactToComment error:", err);
    const msg = (err && err.message) ? err.message : "";
    if (msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation") || msg.toLowerCase().includes("table")) {
      return res.status(500).json({
        message: "Database tables for comment reactions are not ready. Run Prisma migrate/db push then restart the server.",
        error: err.message,
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const removeCommentReaction = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const commentId = Number(req.params.commentId);
    if (!commentId) return res.status(400).json({ message: "Invalid commentId" });

    const reaction = (req.query.reaction || "").toString().trim().toLowerCase();
    if (!reaction) return res.status(400).json({ message: "reaction is required" });

    await prisma.comment_reactions.deleteMany({
      where: { comment_id: commentId, user_id: user.user_id, reaction },
    });

    const count = await prisma.comment_reactions.count({ where: { comment_id: commentId } });
    return res.json({ reacted: false, count });
  } catch (err) {
    console.error("removeCommentReaction error:", err);
    const msg = (err && err.message) ? err.message : "";
    if (msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation") || msg.toLowerCase().includes("table")) {
      return res.status(500).json({
        message: "Database tables for comment reactions are not ready. Run Prisma migrate/db push then restart the server.",
        error: err.message,
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const upsertStoryReview = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { story, error } = await ensurePublishedStoryById(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    const rating = Number(req.body?.rating);
    if (!rating || Number.isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
    }

    const review_text_raw = (req.body?.review_text || "").toString();
    const review_text = review_text_raw ? sanitizeInput(review_text_raw) : null;

    const saved = await prisma.story_reviews.upsert({
      where: { story_id_user_id: { story_id: storyId, user_id: user.user_id } },
      update: { rating, review_text, updated_at: new Date() },
      create: { story_id: storyId, user_id: user.user_id, rating, review_text },
    });

    if (story?.author_id && story.author_id !== user.user_id) {
      await prisma.notifications.create({
        data: {
          recipient_id: story.author_id,
          actor_id: user.user_id,
          type: "review",
          entity_type: "story_review",
          entity_id: saved.id,
          data: JSON.stringify({
            storyId,
            storyTitle: story.title,
            reviewId: saved.id,
            rating,
            preview: review_text?.slice(0, 160) || null,
          }),
        },
      });
    }

    return res.status(201).json(saved);
  } catch (err) {
    console.error("upsertStoryReview error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const shareStory = async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { error } = await ensurePublishedStoryById(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    const platform = (req.body?.platform || "copy_link").toString().trim().toLowerCase();

    await prisma.story_shares.create({
      data: {
        story_id: storyId,
        user_id: req.user?.user_id || null,
        platform,
      },
    });

    const count = await prisma.story_shares.count({ where: { story_id: storyId } });
    return res.status(201).json({ shared: true, count });
  } catch (err) {
    console.error("shareStory error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const shareChapter = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const { error } = await ensurePublishedStoryByChapterId(chapterId);
    if (error) return res.status(error.status).json({ message: error.message });

    const platform = (req.body?.platform || "copy_link").toString().trim().toLowerCase();

    await prisma.chapter_shares.create({
      data: {
        chapter_id: chapterId,
        user_id: req.user?.user_id || null,
        platform,
      },
    });

    const count = await prisma.chapter_shares.count({ where: { chapter_id: chapterId } });
    return res.status(201).json({ shared: true, count });
  } catch (err) {
    console.error("shareChapter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const reportComment = async (req, res) => {
  try {
    const user = req.user;
    const { error: readerErr } = ensureReader(user);
    if (readerErr) return res.status(readerErr.status).json({ message: readerErr.message });

    const commentId = Number(req.params.commentId);
    if (!commentId) return res.status(400).json({ message: "Invalid commentId" });

    let comment;
    try {
      comment = await prisma.comments.findUnique({
        where: { comment_id: commentId },
        select: { comment_id: true, story_id: true, chapter_id: true, is_deleted: true, is_hidden: true },
      });
    } catch (e) {
      if (!isHiddenColumnMissing(e)) throw e;
      comment = await prisma.comments.findUnique({
        where: { comment_id: commentId },
        select: { comment_id: true, story_id: true, chapter_id: true, is_deleted: true },
      });
    }

    if (!comment || comment.is_deleted) return res.status(404).json({ message: "Comment not found" });

    if (comment.chapter_id) {
      const { error } = await ensurePublishedStoryByChapterId(comment.chapter_id);
      if (error) return res.status(error.status).json({ message: error.message });
    } else if (comment.story_id) {
      const { error } = await ensurePublishedStoryById(comment.story_id);
      if (error) return res.status(error.status).json({ message: error.message });
    }

    const reason_raw = (req.body?.reason || "").toString();
    const reason = reason_raw ? sanitizeInput(reason_raw) : null;

    try {
      await prisma.comment_reports.create({
        data: {
          comment_id: commentId,
          reporter_id: user.user_id,
          reason,
        },
      });
    } catch (err) {
      const msg = (err && err.message) ? err.message : "";
      if (!msg.toLowerCase().includes("unique") && !msg.toLowerCase().includes("duplicate")) {
        throw err;
      }
    }

    const count = await prisma.comment_reports.count({ where: { comment_id: commentId } });

    let hidden = Boolean(comment && comment.is_hidden);
    if (!hidden && count > REPORT_HIDE_THRESHOLD) {
      try {
        await prisma.comments.update({
          where: { comment_id: commentId },
          data: { is_hidden: true, updated_at: new Date() },
        });
        hidden = true;
      } catch (e) {
        if (!isHiddenColumnMissing(e)) throw e;
      }
    }

    return res.status(201).json({ reported: true, count, hidden });
  } catch (err) {
    console.error("reportComment error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
