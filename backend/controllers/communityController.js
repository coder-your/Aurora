import prisma from "../utils/prisma.js";
import { sanitizeInput } from "../utils/sanitize.js";
import {
  COMMUNITY_CATEGORIES,
  SIDEBAR_GENRES,
  resolveGenreName,
  normalizeCommunityCategory,
  extractHashtags,
  sortCommunityThreads,
  buildThreadWhere,
} from "../services/community.service.js";

const THREAD_INCLUDE = {
  user: {
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      profile: { select: { handle_name: true, profile_image: true } },
    },
  },
  story: {
    select: {
      story_id: true,
      title: true,
      category: true,
      author_id: true,
      author: {
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          profile: { select: { handle_name: true } },
        },
      },
    },
  },
  replies: {
    where: { is_deleted: false },
    orderBy: { created_at: "asc" },
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
};

const publishedStoryWhere = {
  visibility: "public",
  status: "published",
  is_deleted: false,
};

const splitCommunityTerms = (value) => {
  if (!value) return [];
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((term) => term.length > 2);
};

const buildThreadPayload = (thread, options = {}) => ({
  id: thread.id,
  title: thread.title,
  body: thread.body,
  category: thread.category,
  channel_type: thread.channel_type,
  target_id: thread.target_id,
  flair: thread.flair,
  upvotes: thread.upvotes,
  downvotes: thread.downvotes,
  spoiler: thread.spoiler,
  is_pinned: thread.is_pinned,
  created_at: thread.created_at,
  updated_at: thread.updated_at,
  personalization_score: options.personalizationScore ?? null,
  matched_signal: options.matchedSignal ?? null,
  story: thread.story
    ? {
        story_id: thread.story.story_id,
        title: thread.story.title,
        category: thread.story.category,
        author_id: thread.story.author_id,
        author: thread.story.author
          ? {
              first_name: thread.story.author.first_name,
              last_name: thread.story.author.last_name,
              profile: thread.story.author.profile
                ? { handle_name: thread.story.author.profile.handle_name }
                : null,
            }
          : null,
      }
    : null,
  user: thread.user
    ? {
        user_id: thread.user.user_id,
        first_name: thread.user.first_name,
        last_name: thread.user.last_name,
        profile: thread.user.profile
          ? {
              handle_name: thread.user.profile.handle_name,
              profile_image: thread.user.profile.profile_image,
            }
          : null,
      }
    : null,
  replies: (thread.replies || []).map((reply) => ({
    id: reply.id,
    parent_id: reply.parent_id,
    body: reply.body,
    upvotes: reply.upvotes,
    downvotes: reply.downvotes,
    spoiler: reply.spoiler,
    created_at: reply.created_at,
    updated_at: reply.updated_at,
    user: reply.user
      ? {
          user_id: reply.user.user_id,
          first_name: reply.user.first_name,
          last_name: reply.user.last_name,
          profile: reply.user.profile
            ? {
                handle_name: reply.user.profile.handle_name,
                profile_image: reply.user.profile.profile_image,
              }
            : null,
        }
      : null,
  })),
});

const buildUserCommunitySignals = async (userId) => {
  const tagWeights = new Map();
  const categoryWeights = new Map();

  if (!userId) {
    return { tagWeights, categoryWeights };
  }

  try {
    const history = await prisma.user_read_history.findMany({
      where: { user_id: userId },
      orderBy: { last_read: "desc" },
      take: 50,
      include: { story: { select: { tags: true, category: true, title: true } } },
    });

    for (const entry of history) {
      const story = entry?.story;
      if (!story) continue;
      const recencyBoost = entry?.last_read ? 1.3 : 1.0;
      const progress = Math.max(0, Math.min(100, Number(entry?.progress) || 0));
      const progressFactor = progress <= 20 ? 0.6 : 0.85 + progress / 200;
      const weight = 1.8 * recencyBoost * progressFactor;

      splitCommunityTerms(story.tags).forEach((term) => {
        tagWeights.set(term, (tagWeights.get(term) || 0) + weight);
      });
      if (story.category) {
        categoryWeights.set(String(story.category).toLowerCase(), (categoryWeights.get(String(story.category).toLowerCase()) || 0) + weight * 0.9);
      }
      splitCommunityTerms(story.title).forEach((term) => {
        tagWeights.set(term, (tagWeights.get(term) || 0) + weight * 0.5);
      });
    }
  } catch (error) {
    console.warn("buildUserCommunitySignals: read history unavailable", error?.message);
  }

  try {
    const likes = await prisma.story_likes.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 80,
      include: { story: { select: { tags: true, category: true, title: true } } },
    });

    for (const like of likes) {
      const story = like?.story;
      if (!story) continue;
      const weight = 2.6;
      splitCommunityTerms(story.tags).forEach((term) => {
        tagWeights.set(term, (tagWeights.get(term) || 0) + weight);
      });
      if (story.category) {
        categoryWeights.set(String(story.category).toLowerCase(), (categoryWeights.get(String(story.category).toLowerCase()) || 0) + weight * 0.85);
      }
      splitCommunityTerms(story.title).forEach((term) => {
        tagWeights.set(term, (tagWeights.get(term) || 0) + weight * 0.45);
      });
    }
  } catch (error) {
    console.warn("buildUserCommunitySignals: likes unavailable", error?.message);
  }

  return { tagWeights, categoryWeights };
};

const scoreThreadForUser = (thread, signals) => {
  if (!thread || !signals) return 0;

  const text = `${thread.title || ""} ${thread.body || ""} ${thread.category || ""}`.toLowerCase();
  const category = String(thread.category || "").toLowerCase();
  let score = 0;

  if (signals.categoryWeights.has(category)) {
    score += signals.categoryWeights.get(category) * 1.5;
  }

  const terms = splitCommunityTerms(text);
  const seen = new Set();

  terms.forEach((term) => {
    if (seen.has(term)) return;
    seen.add(term);
    if (signals.tagWeights.has(term)) {
      score += signals.tagWeights.get(term) * 0.65;
    }
  });

  if (thread.is_pinned) {
    score += 1.4;
  }

  return score;
};

export const listCommunityThreads = async (req, res) => {
  try {
    const view = String(req.query.view || "all").toLowerCase();
    const sort = String(req.query.sort || "latest").toLowerCase();
    const genre = req.query.genre ? resolveGenreName(req.query.genre) : null;
    const authorId = req.query.author_id ? Number(req.query.author_id) : null;
    const storyId = req.query.story_id ? Number(req.query.story_id) : null;
    const categoryFilter = req.query.category_filter || null;
    const userId = req.user?.user_id;

    let followingTargets = [];
    let followedAuthorIds = [];

    if (view === "following" && userId) {
      const [communityFollows, writerFollows] = await Promise.all([
        prisma.community_follows.findMany({ where: { user_id: userId } }),
        prisma.writer_follows.findMany({ where: { follower_id: userId }, select: { writer_id: true } }),
      ]);
      followingTargets = communityFollows.map((f) => ({
        channel_type: f.channel_type,
        target_id: f.target_id,
      }));
      followedAuthorIds = writerFollows.map((f) => f.writer_id).filter(Boolean);
    }

    const whereInput = buildThreadWhere({
      view,
      genre,
      authorId,
      storyId,
      categoryFilter,
      followingTargets,
      followedAuthorIds,
    });

    if (whereInput.impossible) {
      return res.json({
        threads: [],
        suggestedThreads: [],
        personalization: { label: "Follow authors, genres, or books to see discussions here." },
        categories: COMMUNITY_CATEGORIES,
        sort,
        view,
      });
    }

    const { impossible, ...where } = whereInput;

    const threads = await prisma.community_threads.findMany({
      where,
      include: THREAD_INCLUDE,
    });

    const sortedThreads = sortCommunityThreads(threads, sort);

    const signals = await buildUserCommunitySignals(userId);
    const scoredThreads = sortedThreads
      .map((thread) => ({
        thread,
        score: scoreThreadForUser(thread, signals),
      }))
      .sort((a, b) => b.score - a.score);

    const suggestedThreads = scoredThreads
      .filter(({ score }) => score > 0)
      .slice(0, 3)
      .map(({ thread, score }) => buildThreadPayload(thread, { personalizationScore: score, matchedSignal: "reading-pattern" }));

    let savedThreadIds = [];
    if (userId) {
      const saves = await prisma.community_saves.findMany({
        where: { user_id: userId },
        select: { thread_id: true },
      });
      savedThreadIds = saves.map((s) => s.thread_id);
    }

    return res.json({
      threads: sortedThreads.map((thread) => ({
        ...buildThreadPayload(thread),
        is_saved: savedThreadIds.includes(thread.id),
        reply_count: thread.replies?.length || 0,
      })),
      suggestedThreads,
      personalization: {
        label: userId
          ? "Based on your reading patterns, likes, and recent story interests"
          : "Browse the latest conversations and discover cozy spaces that match your mood.",
      },
      categories: COMMUNITY_CATEGORIES,
      sort,
      view,
    });
  } catch (error) {
    console.error("listCommunityThreads error:", error);
    return res.status(500).json({ message: "Failed to load community threads" });
  }
};

export const createCommunityThread = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.user_id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    const category = normalizeCommunityCategory(req.body?.category);
    const channel_type = String(req.body?.channel_type || "General");
    const target_id = req.body?.target_id ? Number(req.body.target_id) : null;
    const flair = req.body?.flair ? String(req.body.flair) : null;
    const spoiler = Boolean(req.body?.spoiler);
    const storyId = req.body?.story_id ? Number(req.body.story_id) : null;

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    const thread = await prisma.community_threads.create({
      data: {
        user_id: user.user_id,
        title: sanitizeInput(title),
        body: sanitizeInput(body),
        category,
        channel_type,
        target_id,
        flair,
        spoiler,
        story_id: storyId,
      },
      include: {
        story: {
          select: {
            story_id: true,
            title: true,
            author: {
              select: {
                first_name: true,
                last_name: true,
                profile: { select: { handle_name: true } },
              },
            },
          },
        },
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
      },
    });

    return res.status(201).json({ thread: buildThreadPayload(thread) });
  } catch (error) {
    console.error("createCommunityThread error:", error);
    return res.status(500).json({ message: "Failed to create thread" });
  }
};

export const createCommunityReply = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.user_id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const threadId = Number(req.params.threadId);
    const body = String(req.body?.body || "").trim();
    const spoiler = Boolean(req.body?.spoiler);
    const parentId = req.body?.parent_id ? Number(req.body.parent_id) : null;

    if (!threadId || !body) {
      return res.status(400).json({ message: "Thread id and body are required" });
    }

    const thread = await prisma.community_threads.findUnique({ where: { id: threadId } });
    if (!thread || thread.is_deleted) {
      return res.status(404).json({ message: "Thread not found" });
    }

    if (parentId) {
      const parentReply = await prisma.community_replies.findUnique({ where: { id: parentId } });
      if (!parentReply || parentReply.thread_id !== threadId) {
        return res.status(400).json({ message: "Invalid parent reply" });
      }
    }

    const reply = await prisma.community_replies.create({
      data: {
        thread_id: threadId,
        user_id: user.user_id,
        parent_id: parentId,
        body: sanitizeInput(body),
        spoiler,
      },
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
    });

    return res.status(201).json({ reply });
  } catch (error) {
    console.error("createCommunityReply error:", error);
    return res.status(500).json({ message: "Failed to add reply" });
  }
};

export const voteCommunityThread = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.user_id) return res.status(401).json({ message: "Authentication required" });

    const threadId = Number(req.params.threadId);
    const voteType = Number(req.body.vote_type); // 1 for upvote, -1 for downvote

    if (![1, -1].includes(voteType)) {
      return res.status(400).json({ message: "Invalid vote type" });
    }

    const existingVote = await prisma.community_thread_votes.findUnique({
      where: { thread_id_user_id: { thread_id: threadId, user_id: user.user_id } },
    });

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote
        await prisma.community_thread_votes.delete({ where: { id: existingVote.id } });
        await prisma.community_threads.update({
          where: { id: threadId },
          data: voteType === 1 ? { upvotes: { decrement: 1 } } : { downvotes: { decrement: 1 } },
        });
        return res.json({ message: "Vote removed" });
      } else {
        // Change vote
        await prisma.community_thread_votes.update({
          where: { id: existingVote.id },
          data: { vote_type: voteType },
        });
        await prisma.community_threads.update({
          where: { id: threadId },
          data: voteType === 1
            ? { upvotes: { increment: 1 }, downvotes: { decrement: 1 } }
            : { upvotes: { decrement: 1 }, downvotes: { increment: 1 } },
        });
        return res.json({ message: "Vote changed" });
      }
    } else {
      // New vote
      await prisma.community_thread_votes.create({
        data: { thread_id: threadId, user_id: user.user_id, vote_type: voteType },
      });
      await prisma.community_threads.update({
        where: { id: threadId },
        data: voteType === 1 ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } },
      });
      return res.status(201).json({ message: "Vote added" });
    }
  } catch (error) {
    console.error("voteCommunityThread error:", error);
    return res.status(500).json({ message: "Failed to vote" });
  }
};

export const voteCommunityReply = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.user_id) return res.status(401).json({ message: "Authentication required" });

    const replyId = Number(req.params.replyId);
    const voteType = Number(req.body.vote_type);

    if (![1, -1].includes(voteType)) {
      return res.status(400).json({ message: "Invalid vote type" });
    }

    const existingVote = await prisma.community_reply_votes.findUnique({
      where: { reply_id_user_id: { reply_id: replyId, user_id: user.user_id } },
    });

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        await prisma.community_reply_votes.delete({ where: { id: existingVote.id } });
        await prisma.community_replies.update({
          where: { id: replyId },
          data: voteType === 1 ? { upvotes: { decrement: 1 } } : { downvotes: { decrement: 1 } },
        });
        return res.json({ message: "Vote removed" });
      } else {
        await prisma.community_reply_votes.update({
          where: { id: existingVote.id },
          data: { vote_type: voteType },
        });
        await prisma.community_replies.update({
          where: { id: replyId },
          data: voteType === 1
            ? { upvotes: { increment: 1 }, downvotes: { decrement: 1 } }
            : { upvotes: { decrement: 1 }, downvotes: { increment: 1 } },
        });
        return res.json({ message: "Vote changed" });
      }
    } else {
      await prisma.community_reply_votes.create({
        data: { reply_id: replyId, user_id: user.user_id, vote_type: voteType },
      });
      await prisma.community_replies.update({
        where: { id: replyId },
        data: voteType === 1 ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } },
      });
      return res.status(201).json({ message: "Vote added" });
    }
  } catch (error) {
    console.error("voteCommunityReply error:", error);
    return res.status(500).json({ message: "Failed to vote" });
  }
};

export const getCommunityExplore = async (req, res) => {
  try {
    const userId = req.user?.user_id;

    const [authorsRaw, booksRaw, threads] = await Promise.all([
      prisma.stories.groupBy({
        by: ["author_id"],
        where: publishedStoryWhere,
        _count: { story_id: true },
        orderBy: { _count: { story_id: "desc" } },
        take: 8,
      }),
      prisma.stories.findMany({
        where: publishedStoryWhere,
        include: {
          author: {
            select: {
              user_id: true,
              profile: { select: { handle_name: true } },
            },
          },
          _count: { select: { community_threads: true, story_likes: true } },
        },
        orderBy: [{ story_likes: { _count: "desc" } }, { last_updated: "desc" }],
        take: 8,
      }),
      prisma.community_threads.findMany({
        where: { is_deleted: false },
        select: { body: true, title: true },
        take: 100,
        orderBy: { created_at: "desc" },
      }),
    ]);

    const authorIds = authorsRaw.map((a) => a.author_id);
    const authorUsers = authorIds.length
      ? await prisma.users.findMany({
          where: { user_id: { in: authorIds } },
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            profile: { select: { handle_name: true, profile_image: true } },
          },
        })
      : [];

    const followerCounts = authorIds.length
      ? await prisma.writer_follows.groupBy({
          by: ["writer_id"],
          where: { writer_id: { in: authorIds } },
          _count: { follower_id: true },
        })
      : [];

    const followerMap = new Map(followerCounts.map((f) => [f.writer_id, f._count.follower_id]));

    const popularAuthors = authorsRaw.map((row) => {
      const user = authorUsers.find((u) => u.user_id === row.author_id);
      const handle = user?.profile?.handle_name;
      const name = handle || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Author";
      return {
        user_id: row.author_id,
        name,
        book_count: row._count.story_id,
        reader_count: followerMap.get(row.author_id) || 0,
        profile_image: user?.profile?.profile_image || null,
      };
    });

    const popularBooks = booksRaw.map((book) => ({
      story_id: book.story_id,
      title: book.title,
      category: book.category,
      cover_url: book.cover_url,
      author_name: book.author?.profile?.handle_name || "Author",
      discussion_count: book._count?.community_threads || 0,
      like_count: book._count?.story_likes || 0,
    }));

    const tagCounts = new Map();
    threads.forEach((thread) => {
      extractHashtags(`${thread.title} ${thread.body}`).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const defaultTopics = ["#chapter4", "#writingtips", "#bookclub"];
    const trendingTopics = [
      ...[...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag),
      ...defaultTopics,
    ]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 6);

    return res.json({
      genres: SIDEBAR_GENRES,
      popularAuthors,
      popularBooks,
      trendingTopics,
      isAuthenticated: Boolean(userId),
    });
  } catch (error) {
    console.error("getCommunityExplore error:", error);
    return res.status(500).json({ message: "Failed to load explore data" });
  }
};

export const listCommunityAuthors = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();

    const grouped = await prisma.stories.groupBy({
      by: ["author_id"],
      where: publishedStoryWhere,
      _count: { story_id: true },
      orderBy: { _count: { story_id: "desc" } },
      take: 50,
    });

    const authorIds = grouped.map((g) => g.author_id);
    const users = await prisma.users.findMany({
      where: { user_id: { in: authorIds } },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        profile: { select: { handle_name: true, profile_image: true } },
      },
    });

    const followerCounts = await prisma.writer_follows.groupBy({
      by: ["writer_id"],
      where: { writer_id: { in: authorIds } },
      _count: { follower_id: true },
    });
    const followerMap = new Map(followerCounts.map((f) => [f.writer_id, f._count.follower_id]));

    let authors = grouped.map((row) => {
      const user = users.find((u) => u.user_id === row.author_id);
      const handle = user?.profile?.handle_name;
      const name = handle || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Author";
      return {
        user_id: row.author_id,
        name,
        book_count: row._count.story_id,
        reader_count: followerMap.get(row.author_id) || 0,
        profile_image: user?.profile?.profile_image || null,
      };
    });

    if (q) {
      authors = authors.filter((a) => a.name.toLowerCase().includes(q));
    }

    return res.json({ authors });
  } catch (error) {
    console.error("listCommunityAuthors error:", error);
    return res.status(500).json({ message: "Failed to load authors" });
  }
};

export const getCommunityAuthor = async (req, res) => {
  try {
    const authorId = Number(req.params.authorId);
    if (!authorId) return res.status(400).json({ message: "Invalid author id" });

    const user = await prisma.users.findUnique({
      where: { user_id: authorId },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        profile: { select: { handle_name: true, profile_image: true, bio: true } },
      },
    });

    if (!user) return res.status(404).json({ message: "Author not found" });

    const [books, readerCount, threadCount, isFollowing] = await Promise.all([
      prisma.stories.findMany({
        where: { author_id: authorId, ...publishedStoryWhere },
        select: {
          story_id: true,
          title: true,
          cover_url: true,
          category: true,
          description: true,
        },
        orderBy: { last_updated: "desc" },
        take: 12,
      }),
      prisma.writer_follows.count({ where: { writer_id: authorId } }),
      prisma.community_threads.count({
        where: {
          is_deleted: false,
          OR: [{ channel_type: "Author", target_id: authorId }, { story: { author_id: authorId } }],
        },
      }),
      req.user?.user_id
        ? prisma.writer_follows.findUnique({
            where: { follower_id_writer_id: { follower_id: req.user.user_id, writer_id: authorId } },
          })
        : null,
    ]);

    const name =
      user.profile?.handle_name ||
      `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      "Author";

    return res.json({
      author: {
        user_id: user.user_id,
        name,
        bio: user.profile?.bio || null,
        profile_image: user.profile?.profile_image || null,
        book_count: books.length,
        reader_count: readerCount,
        discussion_count: threadCount,
        is_following: Boolean(isFollowing),
      },
      books,
    });
  } catch (error) {
    console.error("getCommunityAuthor error:", error);
    return res.status(500).json({ message: "Failed to load author community" });
  }
};

const genreTargetId = (genre) =>
  String(genre || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const getCommunityGenre = async (req, res) => {
  try {
    const genre = resolveGenreName(req.params.genre);
    if (!genre) return res.status(400).json({ message: "Invalid genre" });

    const [memberCount, discussionCount, isFollowing, books] = await Promise.all([
      prisma.stories.count({ where: { category: genre, ...publishedStoryWhere } }),
      prisma.community_threads.count({
        where: {
          is_deleted: false,
          OR: [{ story: { category: genre } }, { channel_type: "Genre", flair: genre }],
        },
      }),
      req.user?.user_id
        ? prisma.community_follows.findUnique({
            where: {
              user_id_channel_type_target_id: {
                user_id: req.user.user_id,
                channel_type: "Genre",
                target_id: genreTargetId(genre),
              },
            },
          })
        : null,
      prisma.stories.findMany({
        where: { category: genre, ...publishedStoryWhere },
        include: {
          author: { select: { profile: { select: { handle_name: true } } } },
          _count: { select: { community_threads: true, story_likes: true } },
        },
        orderBy: { last_updated: "desc" },
        take: 12,
      }),
    ]);

    return res.json({
      genre,
      member_count: memberCount,
      discussion_count: discussionCount,
      is_following: Boolean(isFollowing),
      books: books.map((book) => ({
        story_id: book.story_id,
        title: book.title,
        cover_url: book.cover_url,
        category: book.category,
        author_name: book.author?.profile?.handle_name || "Author",
        discussion_count: book._count.community_threads,
        like_count: book._count.story_likes,
      })),
    });
  } catch (error) {
    console.error("getCommunityGenre error:", error);
    return res.status(500).json({ message: "Failed to load genre community" });
  }
};

export const getCommunityBook = async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid story id" });

    const story = await prisma.stories.findFirst({
      where: { story_id: storyId, ...publishedStoryWhere },
      include: {
        author: {
          select: {
            user_id: true,
            profile: { select: { handle_name: true } },
          },
        },
        _count: { select: { community_threads: true, story_likes: true } },
      },
    });

    if (!story) return res.status(404).json({ message: "Book not found" });

    let isFollowing = false;
    if (req.user?.user_id) {
      const follow = await prisma.community_follows.findUnique({
        where: {
          user_id_channel_type_target_id: {
            user_id: req.user.user_id,
            channel_type: "Book",
            target_id: storyId,
          },
        },
      });
      isFollowing = Boolean(follow);
    }

    return res.json({
      book: {
        story_id: story.story_id,
        title: story.title,
        description: story.description,
        category: story.category,
        cover_url: story.cover_url,
        author_id: story.author_id,
        author_name: story.author?.profile?.handle_name || "Author",
        like_count: story._count.story_likes,
        discussion_count: story._count.community_threads,
        is_following: isFollowing,
      },
    });
  } catch (error) {
    console.error("getCommunityBook error:", error);
    return res.status(500).json({ message: "Failed to load book community" });
  }
};

export const followCommunityChannel = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.user_id) return res.status(401).json({ message: "Authentication required" });

    const channelType = String(req.body?.channel_type || "").trim();
    let targetId = Number(req.body?.target_id);
    const genreName = req.body?.genre ? resolveGenreName(req.body.genre) : null;

    if (!["Author", "Genre", "Book"].includes(channelType)) {
      return res.status(400).json({ message: "Invalid channel type" });
    }

    if (channelType === "Genre" && genreName) {
      targetId = genreTargetId(genreName);
    }

    if (!targetId) return res.status(400).json({ message: "target_id is required" });

    if (channelType === "Author") {
      await prisma.writer_follows.upsert({
        where: {
          follower_id_writer_id: { follower_id: user.user_id, writer_id: targetId },
        },
        update: {},
        create: { follower_id: user.user_id, writer_id: targetId },
      });
    }

    await prisma.community_follows.upsert({
      where: {
        user_id_channel_type_target_id: {
          user_id: user.user_id,
          channel_type: channelType,
          target_id: targetId,
        },
      },
      update: {},
      create: {
        user_id: user.user_id,
        channel_type: channelType,
        target_id: targetId,
      },
    });

    return res.json({ message: "Following community", is_following: true });
  } catch (error) {
    console.error("followCommunityChannel error:", error);
    return res.status(500).json({ message: "Failed to follow community" });
  }
};

export const unfollowCommunityChannel = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.user_id) return res.status(401).json({ message: "Authentication required" });

    const channelType = String(req.body?.channel_type || "").trim();
    let targetId = Number(req.body?.target_id);
    const genreName = req.body?.genre ? resolveGenreName(req.body.genre) : null;

    if (channelType === "Genre" && genreName) {
      targetId = genreTargetId(genreName);
    }

    if (!channelType || !targetId) {
      return res.status(400).json({ message: "channel_type and target_id are required" });
    }

    await prisma.community_follows.deleteMany({
      where: { user_id: user.user_id, channel_type: channelType, target_id: targetId },
    });

    if (channelType === "Author") {
      await prisma.writer_follows.deleteMany({
        where: { follower_id: user.user_id, writer_id: targetId },
      });
    }

    return res.json({ message: "Unfollowed community", is_following: false });
  } catch (error) {
    console.error("unfollowCommunityChannel error:", error);
    return res.status(500).json({ message: "Failed to unfollow community" });
  }
};

export const saveCommunityThread = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.user_id) return res.status(401).json({ message: "Authentication required" });

    const threadId = Number(req.params.threadId);
    if (!threadId) return res.status(400).json({ message: "Invalid thread id" });

    const existing = await prisma.community_saves.findUnique({
      where: { user_id_thread_id: { user_id: user.user_id, thread_id: threadId } },
    });

    if (existing) {
      await prisma.community_saves.delete({ where: { id: existing.id } });
      return res.json({ message: "Thread unsaved", is_saved: false });
    }

    await prisma.community_saves.create({
      data: { user_id: user.user_id, thread_id: threadId },
    });

    return res.status(201).json({ message: "Thread saved", is_saved: true });
  } catch (error) {
    console.error("saveCommunityThread error:", error);
    return res.status(500).json({ message: "Failed to save thread" });
  }
};

export const deleteCommunityThread = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.user_id) return res.status(401).json({ message: "Authentication required" });

    const threadId = Number(req.params.threadId);
    if (!threadId) return res.status(400).json({ message: "Invalid thread id" });

    const thread = await prisma.community_threads.findUnique({
      where: { id: threadId },
      select: { id: true, user_id: true, is_deleted: true },
    });

    if (!thread || thread.is_deleted) return res.status(404).json({ message: "Thread not found" });
    if (thread.user_id !== user.user_id) return res.status(403).json({ message: "Not allowed to delete this thread" });

    await prisma.community_threads.update({
      where: { id: threadId },
      data: { is_deleted: true, updated_at: new Date() },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("deleteCommunityThread error:", error);
    return res.status(500).json({ message: "Failed to delete thread" });
  }
};

export const getMyFollowing = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const [communityFollows, writerFollows] = await Promise.all([
      prisma.community_follows.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
      }),
      prisma.writer_follows.findMany({
        where: { follower_id: userId },
        orderBy: { created_at: "desc" },
        include: {
          writer: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          },
        },
      }),
    ]);

    const genreFollows = communityFollows.filter((f) => f.channel_type === "Genre");
    const bookFollows = communityFollows.filter((f) => f.channel_type === "Book");
    const authorFollows = communityFollows.filter((f) => f.channel_type === "Author");

    const genreTargetIds = genreFollows.map((f) => f.target_id).filter(Boolean);
    const bookIds = bookFollows.map((f) => f.target_id).filter(Boolean);
    const authorIds = authorFollows.map((f) => f.target_id).filter(Boolean);

    // Map target IDs back to genre names
    const genreMap = new Map(SIDEBAR_GENRES.map((g) => [genreTargetId(g), g]));
    const followedGenres = genreTargetIds
      .map((id) => genreMap.get(id))
      .filter(Boolean);

    const [genres, books, authors] = await Promise.all([
      followedGenres.length > 0
        ? prisma.stories.groupBy({
            by: ["category"],
            where: { category: { in: followedGenres }, ...publishedStoryWhere },
            _count: { story_id: true },
          })
        : [],
      bookIds.length > 0
        ? prisma.stories.findMany({
            where: { story_id: { in: bookIds }, ...publishedStoryWhere },
            select: {
              story_id: true,
              title: true,
              cover_url: true,
              category: true,
              author: { select: { profile: { select: { handle_name: true } } } },
              _count: { select: { community_threads: true } },
            },
          })
        : [],
      authorIds.length > 0
        ? prisma.users.findMany({
            where: { user_id: { in: authorIds } },
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          })
        : [],
    ]);

    const genreDetails = genres.map((g) => ({
      name: g.category,
      book_count: g._count.story_id,
    }));

    const bookDetails = books.map((b) => ({
      story_id: b.story_id,
      title: b.title,
      cover_url: b.cover_url,
      category: b.category,
      author_name: b.author?.profile?.handle_name || "Author",
      discussion_count: b._count.community_threads,
    }));

    const authorDetails = authors.map((a) => ({
      user_id: a.user_id,
      name: a.profile?.handle_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || "Author",
      profile_image: a.profile?.profile_image || null,
    }));

    const writerDetails = writerFollows.map((wf) => ({
      user_id: wf.writer.user_id,
      name: wf.writer.profile?.handle_name || `${wf.writer.first_name || ""} ${wf.writer.last_name || ""}`.trim() || "Author",
      profile_image: wf.writer.profile?.profile_image || null,
    }));

    return res.json({
      genres: genreDetails,
      books: bookDetails,
      authors: authorDetails,
      writers: writerDetails,
    });
  } catch (error) {
    console.error("getMyFollowing error:", error);
    return res.status(500).json({ message: "Failed to load following data" });
  }
};
