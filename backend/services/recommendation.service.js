import prisma from "../utils/prisma.js";

// Standard author include with handle_name from profile
// NOTE: profile.first_name/last_name take precedence over users.first_name/last_name
// The frontend should prefer author.profile.first_name over author.first_name
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

// Default pagination
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const NOW = () => new Date();

const splitTags = (tags) => {
  if (!tags) return [];
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

const daysAgo = (d) => {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    const diff = NOW().getTime() - dt.getTime();
    return Math.max(0, diff / 86_400_000);
  } catch {
    return 9999;
  }
};

const recencyDecay = (days, halfLifeDays = 21) => {
  // 0.5 at halfLifeDays
  if (!Number.isFinite(days)) return 0.0;
  return Math.pow(0.5, days / Math.max(1, halfLifeDays));
};

const bump = (map, key, amount) => {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
};

const publishedPublicWhere = {
  visibility: "public",
  status: "published",
  is_deleted: false,
};

const buildUserTasteProfile = async (userId) => {
  const tagWeights = new Map();
  const categoryWeights = new Map();
  const excludeStoryIds = new Set();
  const followedWriterIds = new Set();

  if (!userId) {
    return { tagWeights, categoryWeights, excludeStoryIds, followedWriterIds };
  }

  // Author affinity
  try {
    const follows = await prisma.writer_follows.findMany({
      where: { follower_id: userId },
      select: { writer_id: true },
      take: 500,
    });
    follows.forEach((f) => {
      if (f?.writer_id) followedWriterIds.add(f.writer_id);
    });
  } catch (e) {
    console.warn("buildUserTasteProfile: follows unavailable", e?.message);
  }

  // Reading history (progress + recency)
  let history = [];
  try {
    history = await prisma.user_read_history.findMany({
      where: { user_id: userId },
      orderBy: { last_read: "desc" },
      take: 60,
      include: {
        story: { select: { story_id: true, tags: true, category: true, author_id: true } },
      },
    });
  } catch (e) {
    console.warn("buildUserTasteProfile: read history unavailable", e?.message);
  }

  for (const h of history) {
    if (h?.story_id) excludeStoryIds.add(h.story_id);
    const d = daysAgo(h?.last_read);
    const decay = recencyDecay(d, 21);
    const progress = Math.max(0, Math.min(100, Number(h?.progress) || 0));

    // Abandon penalty
    const progressFactor = progress <= 20 ? 0.15 : 0.6 + progress / 100;
    const finishedBoost = progress >= 95 ? 1.8 : 1.0;
    const w = 2.0 * decay * progressFactor * finishedBoost;

    const tags = splitTags(h?.story?.tags);
    tags.forEach((t) => bump(tagWeights, t, w));

    if (h?.story?.category) bump(categoryWeights, h.story.category, w * 0.9);
  }

  // Likes are strong positive signal
  try {
    const likes = await prisma.story_likes.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 120,
      include: { story: { select: { story_id: true, tags: true, category: true, author_id: true } } },
    });
    for (const like of likes) {
      if (like?.story_id) excludeStoryIds.add(like.story_id);
      const d = daysAgo(like?.created_at);
      const decay = recencyDecay(d, 35);
      const w = 3.5 * decay;
      splitTags(like?.story?.tags).forEach((t) => bump(tagWeights, t, w));
      if (like?.story?.category) bump(categoryWeights, like.story.category, w * 0.9);
    }
  } catch (e) {
    console.warn("buildUserTasteProfile: likes unavailable", e?.message);
  }

  // Reading sessions: minutes read in last 14 days
  try {
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const groups = await prisma.reading_sessions.groupBy({
      by: ["story_id"],
      _sum: { minutes: true },
      where: { user_id: userId, date: { gte: since } },
      orderBy: { story_id: "asc" },
      take: 200,
    });

    const ids = groups.map((g) => g.story_id).filter(Boolean);
    if (ids.length) {
      const stories = await prisma.stories.findMany({
        where: { story_id: { in: ids } },
        select: { story_id: true, tags: true, category: true },
      });
      const byId = new Map(stories.map((s) => [s.story_id, s]));
      for (const g of groups) {
        const mins = Math.max(0, Number(g?._sum?.minutes) || 0);
        if (!mins) continue;
        const s = byId.get(g.story_id);
        if (!s) continue;

        const w = Math.min(4, mins / 20);
        splitTags(s.tags).forEach((t) => bump(tagWeights, t, w));
        if (s.category) bump(categoryWeights, s.category, w * 0.7);
      }
    }
  } catch (e) {
    console.warn("buildUserTasteProfile: reading sessions unavailable", e?.message);
  }

  return { tagWeights, categoryWeights, excludeStoryIds, followedWriterIds };
};

const topKeys = (map, n) => {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
};

const scoreStoryForUser = ({ story, tagWeights, categoryWeights, followedWriterIds }) => {
  let score = 0;
  const tags = splitTags(story?.tags);
  for (const t of tags) score += tagWeights.get(t) || 0;
  if (story?.category) score += (categoryWeights.get(story.category) || 0) * 1.2;
  if (followedWriterIds.has(story?.author_id)) score += 6.0;

  // Small freshness boost
  score += recencyDecay(daysAgo(story?.last_updated), 35) * 0.8;

  // Tiny deterministic tie-breaker
  score += (Number(story?.story_id) % 97) / 10_000;
  return score;
};

const getLookalikeBoostedStories = async (userId, excludeStoryIds, limit = 40) => {
  if (!userId) return [];

  // Use user's most recent reads as "seed"
  const seeds = await prisma.user_read_history.findMany({
    where: { user_id: userId },
    orderBy: { last_read: "desc" },
    take: 10,
    select: { story_id: true },
  });

  const seedIds = seeds.map((s) => s.story_id).filter(Boolean);
  if (!seedIds.length) return [];

  const otherReaders = await prisma.user_read_history.findMany({
    where: { story_id: { in: seedIds }, user_id: { not: userId } },
    take: 2000,
    select: { user_id: true },
  });

  const readerIds = Array.from(new Set(otherReaders.map((r) => r.user_id))).slice(0, 800);
  if (!readerIds.length) return [];

  const groups = await prisma.user_read_history.groupBy({
    by: ["story_id"],
    _count: { story_id: true },
    where: { user_id: { in: readerIds }, story_id: { notIn: Array.from(excludeStoryIds) } },
    orderBy: { _count: { story_id: "desc" } },
    take: limit,
  });

  const ids = groups.map((g) => g.story_id).filter(Boolean);
  if (!ids.length) return [];

  const stories = await prisma.stories.findMany({
    where: { story_id: { in: ids }, ...publishedPublicWhere },
    include: authorInclude,
  });

  const byId = new Map(stories.map((s) => [s.story_id, s]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

const getHotNowStories = async (options = {}) => {
  const { skip, take } = getPagination(options);
  const since = new Date();
  since.setDate(since.getDate() - 7);

  try {
    let grouped = [];
    try {
      grouped = await prisma.user_read_history.groupBy({
        by: ["story_id"],
        _count: { story_id: true },
        where: { last_read: { gte: since } },
      });
      grouped.sort((a, b) => (b._count?.story_id || 0) - (a._count?.story_id || 0));
    } catch (groupErr) {
      console.warn("weekly-picks groupBy failed, using findMany:", groupErr.message);
      const rows = await prisma.user_read_history.findMany({
        where: { last_read: { gte: since } },
        select: { story_id: true },
        take: 500,
      });
      const counts = new Map();
      for (const row of rows) {
        if (!row.story_id) continue;
        counts.set(row.story_id, (counts.get(row.story_id) || 0) + 1);
      }
      grouped = [...counts.entries()]
        .map(([story_id, count]) => ({ story_id, _count: { story_id: count } }))
        .sort((a, b) => b._count.story_id - a._count.story_id);
    }

    const ids = grouped
      .map((r) => r.story_id)
      .filter(Boolean)
      .slice(skip, skip + take);

    if (!ids.length) return getRecentlyUpdated(options);

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: ids }, ...publishedPublicWhere },
      include: authorInclude,
    });

    const byId = new Map(stories.map((s) => [s.story_id, s]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return { stories: ordered, total: grouped.length, skip, limit: take };
  } catch (error) {
    console.error("getHotNowStories error:", error);
    return getRecentlyUpdated(options);
  }
};

/**
 * Parse pagination params with defaults
 */
const getPagination = (options = {}) => {
  const skip = Math.max(0, Number(options.skip) || 0);
  const take = Math.min(MAX_LIMIT, Math.max(1, Number(options.limit) || DEFAULT_LIMIT));
  return { skip, take };
};

/**
 * Fetch stories by category with pagination
 */
export const getStoriesByCategory = async (category, options = {}) => {
  try {
    const { skip, take } = getPagination(options);
    const [stories, total] = await Promise.all([
      prisma.stories.findMany({
        where: { category, ...publishedPublicWhere },
        include: authorInclude,
        orderBy: { last_updated: "desc" },
        skip,
        take,
      }),
      prisma.stories.count({
        where: { category, ...publishedPublicWhere },
      }),
    ]);
    return { stories, total, skip, limit: take };
  } catch (error) {
    console.error("getStoriesByCategory error:", error);
    throw error;
  }
};

/**
 * Fetch stories by tag with pagination
 */
export const getStoriesByTag = async (tag, options = {}) => {
  try {
    const { skip, take } = getPagination(options);
    const where = { tags: { contains: tag }, ...publishedPublicWhere };
    const [stories, total] = await Promise.all([
      prisma.stories.findMany({
        where,
        include: authorInclude,
        orderBy: { last_updated: "desc" },
        skip,
        take,
      }),
      prisma.stories.count({ where }),
    ]);
    return { stories, total, skip, limit: take };
  } catch (error) {
    console.error("getStoriesByTag error:", error);
    throw error;
  }
};

/**
 * Feed configurations for all 20 recommendation types
 */
const FEED_CONFIG = {
  // 1. Stories That Match Your Mood
  "mood-picks": {
    tags: ["Calm", "Cozy", "Emotional", "Hopeful", "Nostalgic", "Lighthearted", "Uplifting", "Wholesome"],
    categories: ["Drama", "Romance", "Poetry", "General Fiction", "Young Adult"],
  },
  // 2. Your Emotional Picks Today
  "emotion-feed": {
    tags: ["Emotional", "Heartwarming", "Hopeful", "Motivational"],
    categories: ["Drama", "Romance", "Poetry"],
  },
  // 3. For Quiet Late-Night Reading
  "night-reads": {
    tags: ["Thought-Provoking", "Calm", "Nostalgic", "Creative"],
    categories: ["Poetry", "Drama", "Mystery", "General Fiction"],
  },
  // 4. When You Need Something Gentle
  "soft-reads": {
    tags: ["Wholesome", "Uplifting", "Calm", "Cozy", "Heartwarming", "Hopeful"],
    categories: ["Romance", "General Fiction", "Poetry"],
  },
  // 5. Reads You Won't Put Down
  "unputdownable": {
    tags: ["Exciting", "Dramatic", "Mystery Vibes"],
    categories: ["Thriller", "Adventure", "Mystery", "Science Fiction", "Fantasy"],
  },
  // 6. Short Reads, Big Feelings
  "quick-reads": {
    tags: ["Short & Sweet", "Lighthearted", "Emotional"],
    categories: ["Short Story", "Poetry"],
  },
  // 7. Hidden Gems Worth Discovering
  "hidden-gems": {
    tags: ["Inspiring", "Creative", "Imaginative"],
    categories: null, // Any genre
  },
  // 8. Updated Just for You (Fresh Updates) - handled separately
  "fresh-updates": {
    tags: null,
    categories: null,
  },
  // 9. Books That Match Your Writing Style
  "write-alikes": {
    tags: ["Creative", "Dramatic", "Emotional"],
    categories: ["Poetry", "Drama", "General Fiction", "Fantasy"],
  },
  // 10. Patterns You Love in Stories
  "story-patterns": {
    tags: ["Friendship", "Found Family", "Coming of Age", "Courage", "Teamwork", "Fantasy Elements", "Problem-Solving"],
    categories: ["Young Adult", "Fantasy", "Adventure", "General Fiction"],
  },
  // 11. Because You Loved the Vibe of ___ - handled separately with storyId
  "vibe-match": {
    tags: ["Mystery Vibes", "Calm", "Cozy", "Imaginative", "Magical"],
    categories: ["Mystery", "Fantasy", "Young Adult", "Historical Fiction"],
  },
  // 12. High-Emotion, High-Drama Picks
  "intense-reads": {
    tags: ["Emotional", "Dramatic"],
    categories: ["Drama", "Romance", "Thriller"],
  },
  // 13. Calm & Comforting Reads
  "cozy-corner": {
    tags: ["Calm", "Cozy", "Wholesome"],
    categories: ["Romance", "General Fiction"],
  },
  // 14. Characters You'll Care About
  "beloved-characters": {
    tags: ["Heartwarming", "Inspiring", "Found Family", "Hopeful"],
    categories: ["Young Adult", "Romance", "General Fiction"],
  },
  // 15. Stories Written Like Art
  "literary-aesthetic": {
    tags: ["Creative", "Emotional"],
    categories: ["Poetry", "General Fiction", "Young Adult"],
  },
  // 16. Your Personalized Reading Path - handled separately with userId
  "your-journey": {
    tags: null,
    categories: null,
  },
  // 17. This Week's Reader Favorites
  "weekly-picks": {
    tags: ["Dramatic", "Emotional", "Exciting"],
    categories: ["Thriller", "Young Adult", "Fantasy", "Romance"],
  },
  // 18. Stories That Feel Cinematic
  "cinematic-reads": {
    tags: ["Imaginative", "Magical", "Dramatic", "Exciting"],
    categories: ["Fantasy", "Science Fiction", "Thriller", "Adventure"],
  },
  // 19. Books to Lift Your Spirit
  "soul-lifter": {
    tags: ["Hopeful", "Uplifting", "Inspiring", "Heartwarming"],
    categories: ["Romance", "General Fiction", "Poetry"],
  },
  // 20. Quiet Stories With a Lasting Impact
  "lasting-impact": {
    tags: ["Thought-Provoking", "Calm", "Creative"],
    categories: ["Historical Fiction", "General Fiction", "Poetry"],
  },
};

/**
 * Get all available feed types
 */
export const getFeedTypes = () => {
  return Object.keys(FEED_CONFIG).map(key => ({
    key,
    name: getFeedDisplayName(key),
  }));
};

const getFeedDisplayName = (key) => {
  const names = {
    "mood-picks": "Stories That Match Your Mood",
    "emotion-feed": "Your Emotional Picks Today",
    "night-reads": "For Quiet Late-Night Reading",
    "soft-reads": "When You Need Something Gentle",
    "unputdownable": "Reads You Won't Put Down",
    "quick-reads": "Short Reads, Big Feelings",
    "hidden-gems": "Hidden Gems Worth Discovering",
    "fresh-updates": "Updated Just for You",
    "write-alikes": "Books That Match Your Writing Style",
    "story-patterns": "Patterns You Love in Stories",
    "vibe-match": "Because You Loved the Vibe",
    "intense-reads": "High-Emotion, High-Drama Picks",
    "cozy-corner": "Calm & Comforting Reads",
    "beloved-characters": "Characters You'll Care About",
    "literary-aesthetic": "Stories Written Like Art",
    "your-journey": "Your Personalized Reading Path",
    "weekly-picks": "This Week's Reader Favorites",
    "cinematic-reads": "Stories That Feel Cinematic",
    "soul-lifter": "Books to Lift Your Spirit",
    "lasting-impact": "Quiet Stories With a Lasting Impact",
  };
  return names[key] || key;
};

/**
 * Generic feed fetcher by feed type with improved relevance scoring
 * Uses AND between tags and categories for better matches, with fallback to OR
 */
export const getStoriesByFeed = async (feedType, options = {}) => {
  try {
    const config = FEED_CONFIG[feedType];
    if (!config) return { stories: [], total: 0, skip: 0, limit: DEFAULT_LIMIT };

    const { skip, take } = getPagination(options);

    // Special cases
    if (feedType === "fresh-updates") {
      return getRecentlyUpdated(options);
    }
    if (feedType === "your-journey" && options.userId) {
      return getPersonalizedRecommendations(options.userId, options);
    }
    if (feedType === "weekly-picks") {
      return getHotNowStories(options);
    }
    if (feedType === "hidden-gems") {
      return getHiddenGems(options);
    }

    const hasTags = config.tags && config.tags.length > 0;
    const hasCategories = config.categories && config.categories.length > 0;

    // Base where conditions
    let whereConditions = { ...publishedPublicWhere };

    // Build tag conditions
    const tagConditions = hasTags
      ? config.tags.map(tag => ({ tags: { contains: tag } }))
      : [];

    // Build category conditions
    const categoryConditions = hasCategories
      ? [{ category: { in: config.categories } }]
      : [];

    // Strategy: Use OR for broader results (more forgiving)
    if (hasTags && hasCategories) {
      whereConditions.OR = [...tagConditions, ...categoryConditions];
    } else if (hasTags) {
      whereConditions.OR = tagConditions;
    } else if (hasCategories) {
      whereConditions.OR = categoryConditions;
    }

    const [rawStories, total] = await Promise.all([
      prisma.stories.findMany({
        where: whereConditions,
        include: authorInclude,
        orderBy: { last_updated: "desc" },
        skip,
        take,
      }),
      prisma.stories.count({ where: whereConditions }),
    ]);

    // Optional personalization: if userId is provided, reorder within the feed
    if (options.userId) {
      const profile = await buildUserTasteProfile(Number(options.userId));
      const scored = rawStories
        .map((s) => ({ story: s, score: scoreStoryForUser({ story: s, ...profile }) }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.story);
      return { stories: scored, total, skip, limit: take };
    }

    return { stories: rawStories, total, skip, limit: take };
  } catch (error) {
    console.error("getStoriesByFeed error:", error);
    // Return empty result instead of throwing to prevent 500 errors
    return { stories: [], total: 0, skip: 0, limit: DEFAULT_LIMIT };
  }
};

/**
 * Hidden Gems - stories with fewer reads but good content
 */
export const getHiddenGems = async (options = {}) => {
  try {
    const { skip, take } = getPagination(options);

    // Get popular story IDs to exclude (handle empty table gracefully)
    let excludeIds = [];
    try {
      const popularIds = await prisma.user_read_history.groupBy({
        by: ["story_id"],
        _count: { story_id: true },
        orderBy: { _count: { story_id: "desc" } },
        take: 50,
      });
      excludeIds = popularIds.map(p => p.story_id);
    } catch (err) {
      // Table might be empty or not exist, continue without exclusions
      console.warn("Could not fetch popular stories for exclusion:", err.message);
    }

    const where = {
      ...(excludeIds.length > 0 && { story_id: { notIn: excludeIds } }),
      ...publishedPublicWhere,
      OR: [
        { tags: { contains: "Inspiring" } },
        { tags: { contains: "Creative" } },
        { tags: { contains: "Imaginative" } },
      ],
    };

    const [stories, total] = await Promise.all([
      prisma.stories.findMany({
        where,
        include: authorInclude,
        orderBy: { last_updated: "desc" },
        skip,
        take,
      }),
      prisma.stories.count({ where }),
    ]);

    return { stories, total, skip, limit: take };
  } catch (error) {
    console.error("getHiddenGems error:", error);
    return { stories: [], total: 0, skip: 0, limit: DEFAULT_LIMIT };
  }
};

/**
 * Fetch stories by mood (legacy - maps to feed types)
 */
export const getStoriesByMood = async (mood, options = {}) => {
  const moodToFeed = {
    Calm: "cozy-corner",
    Emotional: "emotion-feed",
    Dramatic: "intense-reads",
    Inspiring: "soul-lifter",
    Fun: "quick-reads",
    Mysterious: "night-reads",
    Magical: "cinematic-reads",
  };

  const feedType = moodToFeed[mood];
  if (feedType) {
    return getStoriesByFeed(feedType, options);
  }

  return { stories: [], total: 0, skip: 0, limit: DEFAULT_LIMIT };
};

/**
 * Fetch story details
 */
export const getStoryDetails = async (storyId) => {
  try {
    const story = await prisma.stories.findUnique({
      where: { story_id: storyId },
      include: {
        ...authorInclude,
        chapters: {
          where: { is_deleted: false },
          orderBy: { order_index: "asc" },
          select: { chapter_id: true, title: true, order_index: true, word_count: true },
        },
      },
    });
    return story;
  } catch (error) {
    console.error("getStoryDetails error:", error);
    throw error;
  }
};

/**
 * Search stories & authors with pagination
 */
export const searchStoriesOrAuthors = async (query, options = {}) => {
  try {
    if (!query || query.trim().length < 2) {
      return { stories: [], total: 0, skip: 0, limit: DEFAULT_LIMIT };
    }

    const { skip, take } = getPagination(options);
    const where = {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { author: { first_name: { contains: query, mode: "insensitive" } } },
        { author: { last_name: { contains: query, mode: "insensitive" } } },
        { author: { profile: { handle_name: { contains: query, mode: "insensitive" } } } },
      ],
      visibility: "public",
      is_deleted: false,
    };

    const [stories, total] = await Promise.all([
      prisma.stories.findMany({
        where,
        include: authorInclude,
        skip,
        take,
      }),
      prisma.stories.count({ where }),
    ]);

    return { stories, total, skip, limit: take };
  } catch (error) {
    console.error("searchStoriesOrAuthors error:", error);
    throw error;
  }
};

/**
 * Add story to To-Be-Read list
 */
export const addToBeReadList = async (userId, storyId) => {
  try {
    // Use upsert to avoid duplicates
    return await prisma.to_be_read.upsert({
      where: { user_id_story_id: { user_id: userId, story_id: storyId } },
      update: { added_at: new Date() },
      create: { user_id: userId, story_id: storyId },
    });
  } catch (error) {
    console.error("addToBeReadList error:", error);
    throw error;
  }
};

/**
 * Personalized recommendations based on reading history
 */
export const getPersonalizedRecommendations = async (userId, options = {}) => {
  try {
    const { skip, take } = getPagination(options);

    const profile = await buildUserTasteProfile(userId);
    const topTags = topKeys(profile.tagWeights, 14);
    const topCategories = topKeys(profile.categoryWeights, 6);

    // Fallback to fresh if no signals
    if (!topTags.length && !topCategories.length && !profile.followedWriterIds.size) {
      return getRecentlyUpdated(options);
    }

    const where = {
      ...publishedPublicWhere,
      ...(profile.excludeStoryIds.size ? { story_id: { notIn: Array.from(profile.excludeStoryIds) } } : {}),
    };

    const or = [];
    topTags.forEach((t) => or.push({ tags: { contains: t } }));
    if (topCategories.length) or.push({ category: { in: topCategories } });
    if (profile.followedWriterIds.size) or.push({ author_id: { in: Array.from(profile.followedWriterIds) } });
    if (or.length) where.OR = or;

    const candidates = await prisma.stories.findMany({
      where,
      include: authorInclude,
      orderBy: { last_updated: "desc" },
      take: Math.min(600, take * 30),
      skip: 0,
    });

    const collab = await getLookalikeBoostedStories(userId, profile.excludeStoryIds, 40);
    const collabIds = new Set(collab.map((s) => s.story_id));

    const scored = candidates
      .filter((s) => s)
      .map((s) => {
        let sc = scoreStoryForUser({ story: s, ...profile });
        if (collabIds.has(s.story_id)) sc += 4.0;
        return { story: s, score: sc };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.story);

    // Wildcard: 1-2 "surprise" stories from outside top categories
    let wildcard = [];
    try {
      const wcWhere = {
        ...publishedPublicWhere,
        ...(profile.excludeStoryIds.size ? { story_id: { notIn: Array.from(profile.excludeStoryIds) } } : {}),
        ...(topCategories.length ? { category: { notIn: topCategories } } : {}),
      };
      wildcard = await prisma.stories.findMany({
        where: wcWhere,
        include: authorInclude,
        orderBy: { last_updated: "desc" },
        take: 2,
      });
    } catch (e) {
      // ignore
    }

    const merged = [];
    const seen = new Set();

    // Interleave: mostly scored, occasionally wildcard
    let wi = 0;
    for (const s of scored) {
      if (!s?.story_id || seen.has(s.story_id)) continue;
      merged.push(s);
      seen.add(s.story_id);
      if (merged.length % 12 === 0 && wildcard[wi]?.story_id && !seen.has(wildcard[wi].story_id)) {
        merged.push(wildcard[wi]);
        seen.add(wildcard[wi].story_id);
        wi += 1;
      }
      if (merged.length >= skip + take) break;
    }

    const page = merged.slice(skip, skip + take);
    return { stories: page, total: merged.length, skip, limit: take };
  } catch (error) {
    console.error("getPersonalizedRecommendations error:", error);
    return getRecentlyUpdated(options);
  }
};

/**
 * Trending / Weekly Picks (most read in last 7 days)
 */
export const getTrendingStories = async (options = {}) => {
  try {
    const { skip, take } = getPagination(options);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Try to get trending from read history, fallback to recent if empty
    let storyIds = [];
    try {
      const trending = await prisma.user_read_history.groupBy({
        by: ["story_id"],
        _count: { story_id: true },
        where: { last_read: { gte: sevenDaysAgo } },
        orderBy: { _count: { story_id: "desc" } },
        take: take + skip,
      });
      storyIds = trending.slice(skip, skip + take).map(t => t.story_id);
    } catch (err) {
      console.warn("Could not fetch trending stories:", err.message);
    }

    if (!storyIds.length) {
      return getRecentlyUpdated(options);
    }

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: storyIds }, ...publishedPublicWhere },
      include: authorInclude,
    });

    return { stories, total: storyIds.length, skip, limit: take };
  } catch (error) {
    console.error("getTrendingStories error:", error);
    return getRecentlyUpdated(options);
  }
};

/**
 * Because You Loved ___ (similar tags AND category)
 */
export const getBecauseYouLoved = async (storyId, options = {}) => {
  try {
    const { skip, take } = getPagination(options);
    const story = await prisma.stories.findUnique({ where: { story_id: storyId } });
    if (!story?.tags) {
      return { stories: [], total: 0, skip, limit: take };
    }

    const tags = story.tags.split(",").map(t => t.trim());
    const where = {
      story_id: { not: storyId },
      ...publishedPublicWhere,
    };

    // Use AND for better relevance: match tags AND same category
    if (story.category) {
      where.AND = [
        { OR: tags.map(tag => ({ tags: { contains: tag } })) },
        { category: story.category },
      ];
    } else {
      where.OR = tags.map(tag => ({ tags: { contains: tag } }));
    }

    const [stories, total] = await Promise.all([
      prisma.stories.findMany({
        where,
        include: authorInclude,
        skip,
        take,
      }),
      prisma.stories.count({ where }),
    ]);

    // Fallback to OR if AND returns too few
    if (stories.length < 5 && story.category) {
      const fallbackWhere = {
        story_id: { not: storyId },
        visibility: "public",
        is_deleted: false,
        OR: [...tags.map(tag => ({ tags: { contains: tag } })), { category: story.category }],
      };
      const [fallbackStories, fallbackTotal] = await Promise.all([
        prisma.stories.findMany({
          where: fallbackWhere,
          include: authorInclude,
          skip,
          take,
        }),
        prisma.stories.count({ where: fallbackWhere }),
      ]);
      return { stories: fallbackStories, total: fallbackTotal, skip, limit: take };
    }

    return { stories, total, skip, limit: take };
  } catch (error) {
    console.error("getBecauseYouLoved error:", error);
    throw error;
  }
};

/**
 * Recently updated / Fresh stories
 */
export const getRecentlyUpdated = async (options = {}) => {
  try {
    const { skip, take } = getPagination(options);
    const where = { ...publishedPublicWhere };

    const [stories, total] = await Promise.all([
      prisma.stories.findMany({
        where,
        include: authorInclude,
        orderBy: { last_updated: "desc" },
        skip,
        take,
      }),
      prisma.stories.count({ where }),
    ]);

    return { stories, total, skip, limit: take };
  } catch (error) {
    console.error("getRecentlyUpdated error:", error);
    return { stories: [], total: 0, skip: 0, limit: DEFAULT_LIMIT };
  }
};

/**
 * High-rated stories (by read count as proxy)
 */
export const getHighRatedStories = async (options = {}) => {
  try {
    const { skip, take } = getPagination(options);

    let storyIds = [];
    try {
      const popular = await prisma.user_read_history.groupBy({
        by: ["story_id"],
        _count: { story_id: true },
        orderBy: { _count: { story_id: "desc" } },
        take: take + skip,
      });
      storyIds = popular.slice(skip, skip + take).map(p => p.story_id);
    } catch (err) {
      console.warn("Could not fetch high-rated stories:", err.message);
    }

    if (!storyIds.length) return getRecentlyUpdated(options);

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: storyIds }, ...publishedPublicWhere },
      include: authorInclude,
    });

    return { stories, total: storyIds.length, skip, limit: take };
  } catch (error) {
    console.error("getHighRatedStories error:", error);
    return getRecentlyUpdated(options);
  }
};
