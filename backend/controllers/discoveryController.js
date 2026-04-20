import prisma from "../utils/prisma.js";

const authorInclude = {
  author: {
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      profile: {
        select: {
          first_name: true,
          last_name: true,
          handle_name: true,
          profile_image: true,
        },
      },
    },
  },
};

const publishedPublicWhere = {
  visibility: "public",
  status: "published",
  is_deleted: false,
};

const getPagination = (query) => {
  const skip = Math.max(0, Number(query.skip) || 0);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { skip, limit };
};

export const mostSharedStories = async (req, res) => {
  try {
    const { skip, limit } = getPagination(req.query);

    const groups = await prisma.story_shares.groupBy({
      by: ["story_id"],
      _count: { story_id: true },
      orderBy: { _count: { story_id: "desc" } },
      take: skip + limit,
    });

    const ids = groups.slice(skip, skip + limit).map((g) => g.story_id);
    if (!ids.length) return res.json({ stories: [], skip, limit });

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: ids }, ...publishedPublicWhere },
      include: authorInclude,
    });

    const byId = new Map(stories.map((s) => [s.story_id, s]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return res.json({ stories: ordered, skip, limit });
  } catch (err) {
    console.error("mostSharedStories error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const mostCommentedStories = async (req, res) => {
  try {
    const { skip, limit } = getPagination(req.query);

    const groups = await prisma.comments.groupBy({
      by: ["story_id"],
      _count: { story_id: true },
      where: { story_id: { not: null }, is_deleted: false },
      orderBy: { _count: { story_id: "desc" } },
      take: skip + limit,
    });

    const ids = groups
      .map((g) => g.story_id)
      .filter(Boolean)
      .slice(skip, skip + limit);

    if (!ids.length) return res.json({ stories: [], skip, limit });

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: ids }, ...publishedPublicWhere },
      include: authorInclude,
    });

    const byId = new Map(stories.map((s) => [s.story_id, s]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return res.json({ stories: ordered, skip, limit });
  } catch (err) {
    console.error("mostCommentedStories error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const mostLikedStories = async (req, res) => {
  try {
    const { skip, limit } = getPagination(req.query);

    const groups = await prisma.story_likes.groupBy({
      by: ["story_id"],
      _count: { story_id: true },
      orderBy: { _count: { story_id: "desc" } },
      take: skip + limit,
    });

    const ids = groups.slice(skip, skip + limit).map((g) => g.story_id);
    if (!ids.length) return res.json({ stories: [], skip, limit });

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: ids }, ...publishedPublicWhere },
      include: authorInclude,
    });

    const byId = new Map(stories.map((s) => [s.story_id, s]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return res.json({ stories: ordered, skip, limit });
  } catch (err) {
    console.error("mostLikedStories error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const weeklyPicks = async (req, res) => {
  try {
    const { skip, limit } = getPagination(req.query);

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const groups = await prisma.user_read_history.groupBy({
      by: ["story_id"],
      _count: { story_id: true },
      where: { last_read: { gte: since } },
      orderBy: { _count: { story_id: "desc" } },
      take: skip + limit,
    });

    const ids = groups.slice(skip, skip + limit).map((g) => g.story_id);
    if (!ids.length) return res.json({ stories: [], skip, limit });

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: ids }, ...publishedPublicWhere },
      include: authorInclude,
    });

    const byId = new Map(stories.map((s) => [s.story_id, s]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return res.json({ stories: ordered, skip, limit });
  } catch (err) {
    console.error("weeklyPicks error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const popularWriters = async (req, res) => {
  try {
    const { skip, limit } = getPagination(req.query);

    const groups = await prisma.writer_follows.groupBy({
      by: ["writer_id"],
      _count: { writer_id: true },
      orderBy: { _count: { writer_id: "desc" } },
      take: skip + limit,
    });

    const ids = groups.slice(skip, skip + limit).map((g) => g.writer_id);
    if (!ids.length) return res.json({ writers: [], skip, limit });

    const writers = await prisma.users.findMany({
      where: { user_id: { in: ids }, is_writer: true },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        profile: { select: { handle_name: true, profile_image: true } },
      },
    });

    const byId = new Map(writers.map((w) => [w.user_id, w]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return res.json({ writers: ordered, skip, limit });
  } catch (err) {
    console.error("popularWriters error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const alsoRead = async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { skip, limit } = getPagination(req.query);

    const readers = await prisma.user_read_history.findMany({
      where: { story_id: storyId },
      select: { user_id: true },
      take: 2000,
    });

    const readerIds = [...new Set(readers.map((r) => r.user_id))];
    if (!readerIds.length) return res.json({ stories: [], skip, limit });

    const groups = await prisma.user_read_history.groupBy({
      by: ["story_id"],
      _count: { story_id: true },
      where: { user_id: { in: readerIds }, story_id: { not: storyId } },
      orderBy: { _count: { story_id: "desc" } },
      take: skip + limit,
    });

    const ids = groups.slice(skip, skip + limit).map((g) => g.story_id);
    if (!ids.length) return res.json({ stories: [], skip, limit });

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: ids }, ...publishedPublicWhere },
      include: authorInclude,
    });

    const byId = new Map(stories.map((s) => [s.story_id, s]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return res.json({ stories: ordered, skip, limit });
  } catch (err) {
    console.error("alsoRead error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
