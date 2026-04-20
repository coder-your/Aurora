import prisma from "../utils/prisma.js";
import { sanitizeInput } from "../utils/sanitize.js";

const ensureStoryOwnedByWriter = async (storyId, writerId) => {
  const story = await prisma.stories.findUnique({
    where: { story_id: storyId },
    select: { story_id: true, author_id: true, is_deleted: true },
  });

  if (!story || story.is_deleted) return { error: { status: 404, message: "Story not found" } };
  if (story.author_id !== writerId) return { error: { status: 403, message: "Not allowed" } };
  return { story };
};

const notifyFollowers = async ({ writerId, postId }) => {
  const followers = await prisma.writer_follows.findMany({
    where: { writer_id: writerId },
    select: { follower_id: true },
  });

  if (!followers.length) return;

  const rows = followers
    .filter((f) => f.follower_id !== writerId)
    .map((f) => ({
      recipient_id: f.follower_id,
      actor_id: writerId,
      type: "writer_post",
      entity_type: "writer_post",
      entity_id: postId,
      data: null,
    }));

  if (rows.length) {
    await prisma.notifications.createMany({ data: rows });
  }
};

export const createWriterPost = async (req, res) => {
  try {
    const writerId = req.user.user_id;

    const typeRaw = (req.body?.type || "post").toString().trim().toLowerCase();
    const type = ["post", "announcement", "thank_you"].includes(typeRaw) ? typeRaw : "post";

    const storyIdRaw = req.body?.story_id;
    const storyId = storyIdRaw === null || storyIdRaw === "" || storyIdRaw === undefined ? null : Number(storyIdRaw);
    if (storyIdRaw !== undefined && storyId !== null && (!storyId || Number.isNaN(storyId))) {
      return res.status(400).json({ message: "Invalid story_id" });
    }

    if (storyId !== null) {
      const { error } = await ensureStoryOwnedByWriter(storyId, writerId);
      if (error) return res.status(error.status).json({ message: error.message });
    }

    const titleRaw = (req.body?.title || "").toString();
    const bodyRaw = (req.body?.body || "").toString();

    const title = titleRaw ? sanitizeInput(titleRaw).trim() : null;
    const body = sanitizeInput(bodyRaw).trim();

    if (!body) return res.status(400).json({ message: "body is required" });

    const created = await prisma.writer_posts.create({
      data: {
        writer_id: writerId,
        story_id: storyId,
        type,
        title,
        body,
      },
    });

    await notifyFollowers({ writerId, postId: created.id });

    return res.status(201).json(created);
  } catch (err) {
    console.error("createWriterPost error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteWriterPost = async (req, res) => {
  try {
    const writerId = req.user.user_id;
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ message: "Invalid postId" });

    const existing = await prisma.writer_posts.findUnique({
      where: { id: postId },
      select: { id: true, writer_id: true, is_deleted: true },
    });

    if (!existing || existing.is_deleted) return res.status(404).json({ message: "Post not found" });
    if (existing.writer_id !== writerId) return res.status(403).json({ message: "Not allowed" });

    await prisma.writer_posts.update({
      where: { id: postId },
      data: { is_deleted: true, updated_at: new Date() },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteWriterPost error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listWriterPostsForWriter = async (req, res) => {
  try {
    const writerId = Number(req.params.writerId);
    if (!writerId) return res.status(400).json({ message: "Invalid writerId" });

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const posts = await prisma.writer_posts.findMany({
      where: { writer_id: writerId, is_deleted: false },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        story: { select: { story_id: true, title: true, status: true, visibility: true } },
        writer: { select: { user_id: true, first_name: true, last_name: true, profile: { select: { handle_name: true, profile_image: true } } } },
      },
    });

    return res.json({ posts, skip, limit });
  } catch (err) {
    console.error("listWriterPostsForWriter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listMyWriterPosts = async (req, res) => {
  try {
    const writerId = req.user.user_id;

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const posts = await prisma.writer_posts.findMany({
      where: { writer_id: writerId, is_deleted: false },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });

    return res.json({ posts, skip, limit });
  } catch (err) {
    console.error("listMyWriterPosts error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listFeedForReader = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.is_reader || user?.is_writer) {
      return res.status(403).json({ message: "Reader access required" });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const following = await prisma.writer_follows.findMany({
      where: { follower_id: user.user_id },
      select: { writer_id: true },
    });

    const writerIds = following.map((f) => f.writer_id);
    if (!writerIds.length) return res.json({ posts: [], skip, limit });

    const posts = await prisma.writer_posts.findMany({
      where: { writer_id: { in: writerIds }, is_deleted: false },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        story: { select: { story_id: true, title: true, status: true, visibility: true } },
        writer: { select: { user_id: true, first_name: true, last_name: true, profile: { select: { handle_name: true, profile_image: true } } } },
      },
    });

    return res.json({ posts, skip, limit });
  } catch (err) {
    console.error("listFeedForReader error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
