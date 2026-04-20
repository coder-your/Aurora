import prisma from "../utils/prisma.js";

const BADGE_METRIC_PREFIX = "badge_";

const MILESTONES = {
  reads: [100, 500, 1000, 5000, 10000],
  likes: [10, 50, 100, 500, 1000],
  comments: [10, 50, 100, 500, 1000],
  shares: [10, 50, 100, 500, 1000],
};

const clampDays = (days) => Math.min(365, Math.max(1, Number(days) || 30));

const badgeKey = (key) => `${BADGE_METRIC_PREFIX}${key}`;

const safeRatio = (a, b) => {
  if (!b) return null;
  return a / b;
};

const storyMetrics = async (storyId) => {
  const [reads, likes, comments, shares] = await Promise.all([
    prisma.user_read_history.count({ where: { story_id: storyId, progress: { gt: 0 } } }),
    prisma.story_likes.count({ where: { story_id: storyId } }),
    prisma.comments.count({ where: { story_id: storyId, is_deleted: false } }),
    prisma.story_shares.count({ where: { story_id: storyId } }),
  ]);
  return { reads, likes, comments, shares };
};

const getStoryReadsAndSessions = async (storyId, days = 30) => {
  const since = new Date(Date.now() - clampDays(days) * 24 * 60 * 60 * 1000);
  const [readsRows, sessionsAgg] = await Promise.all([
    prisma.user_read_history.findMany({
      where: { story_id: storyId },
      select: { user_id: true, progress: true },
      take: 25_000,
    }),
    prisma.reading_sessions.aggregate({
      where: { story_id: storyId, date: { gte: since } },
      _sum: { minutes: true },
      _count: { id: true },
    }).catch(() => ({ _sum: { minutes: 0 }, _count: { id: 0 } })),
  ]);

  const startedReaders = readsRows.filter((r) => (r.progress ?? 0) > 0).length;
  const finishedReaders = readsRows.filter((r) => (r.progress ?? 0) >= 95).length;
  const completionRate = startedReaders ? finishedReaders / startedReaders : null;

  const totalMinutes = Number(sessionsAgg?._sum?.minutes) || 0;
  const sessionCount = Number(sessionsAgg?._count?.id) || 0;
  const avgSessionMinutes = sessionCount ? totalMinutes / sessionCount : null;

  return { startedReaders, finishedReaders, completionRate, totalMinutes, avgSessionMinutes };
};

const getFirstFiveChapterRetention = async (storyId) => {
  const chapters = await prisma.chapters.findMany({
    where: { story_id: storyId, is_deleted: false },
    orderBy: { order_index: "asc" },
    select: { chapter_id: true, order_index: true },
  });

  if (chapters.length < 5) {
    return { ok: false, reason: "needs_5_chapters" };
  }

  const firstFive = chapters.slice(0, 5);
  const idxByChapterId = new Map(firstFive.map((c) => [c.chapter_id, c.order_index]));
  const positions = await prisma.reading_positions.findMany({
    where: { story_id: storyId },
    select: { user_id: true, chapter_id: true },
    take: 50_000,
  }).catch(() => []);

  const maxIdxByUser = new Map();
  for (const p of positions) {
    const idx = idxByChapterId.get(p.chapter_id);
    if (idx === undefined) continue;
    const prev = maxIdxByUser.get(p.user_id);
    if (prev === undefined || idx > prev) maxIdxByUser.set(p.user_id, idx);
  }

  const started = maxIdxByUser.size;
  if (!started) return { ok: true, started: 0, finished5: 0, retention: null };

  const finished5 = Array.from(maxIdxByUser.values()).filter((idx) => idx >= firstFive[4].order_index).length;
  const retention = finished5 / started;
  return { ok: true, started, finished5, retention };
};

const getViralSparkShares = async (storyId) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const shares24h = await prisma.story_shares.count({
    where: { story_id: storyId, created_at: { gte: since } },
  }).catch(() => 0);
  return { shares_24h: shares24h };
};

const getSaves = async (storyId) => {
  const total = await prisma.to_be_read.count({ where: { story_id: storyId } }).catch(() => 0);
  return { saves_total: total };
};

const getLikeToReadRatioWindow = async (storyId, days = 30) => {
  const d = clampDays(days);
  const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const [likes, reads] = await Promise.all([
    prisma.story_likes.count({ where: { story_id: storyId, created_at: { gte: since } } }).catch(() => 0),
    prisma.user_read_history.count({ where: { story_id: storyId, progress: { gt: 0 }, last_read: { gte: since } } }).catch(() => 0),
  ]);
  return { likes, reads, ratio: safeRatio(likes, reads) };
};

const getAnalyticalLongCommentsForChapter = async (storyId) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const comments = await prisma.comments.findMany({
    where: { story_id: storyId, is_deleted: false, created_at: { gte: since }, parent_id: null },
    select: { chapter_id: true, body: true },
    take: 5000,
  }).catch(() => []);

  const analyticalPatterns = [/\btheory\b/i, /\bforeshadow/i, /\bi\s*think\b/i, /\bwhat\s*if\b/i, /\bcould\s*it\s*be\b/i, /\bplot\s*twist\b/i];
  const byChapter = new Map();
  for (const c of comments) {
    if (!c.chapter_id) continue;
    const len = (c.body || "").trim().length;
    if (len < 120) continue;
    const isAnalytical = analyticalPatterns.some((p) => p.test(c.body || ""));
    if (!isAnalytical) continue;
    byChapter.set(c.chapter_id, (byChapter.get(c.chapter_id) || 0) + 1);
  }
  let top = { chapter_id: null, count: 0 };
  for (const [chapter_id, count] of byChapter.entries()) {
    if (count > top.count) top = { chapter_id, count };
  }
  return top;
};

const getChapterPublishingConsistency = async (storyId) => {
  const chapters = await prisma.chapters.findMany({
    where: { story_id: storyId, is_deleted: false },
    orderBy: { created_at: "desc" },
    select: { created_at: true },
    take: 12,
  });

  if (chapters.length < 5) return { ok: false, streak_weeks: 0 };

  const times = chapters.map((c) => new Date(c.created_at)).sort((a, b) => a - b);
  const deltas = [];
  for (let i = 1; i < times.length; i += 1) {
    deltas.push((times[i] - times[i - 1]) / (24 * 60 * 60 * 1000));
  }

  // Heuristic: 4 consecutive ~weekly gaps between uploads (5 uploads total)
  const weeklyish = deltas.slice(-4).every((d) => d >= 5 && d <= 9);
  return { ok: true, streak_weeks: weeklyish ? 4 : 0 };
};

const BADGE_CATALOG = [
  {
    key: "page_turner",
    title: "The Page-Turner",
    description: "80% of readers finish the first five chapters.",
  },
  {
    key: "unputdownable",
    title: "Unputdownable",
    description: "Average reading session exceeds 20 minutes.",
  },
  {
    key: "polished_pro",
    title: "Polished Pro",
    description: "10,000 words + strong completion rate.",
  },
  {
    key: "theorist_magnet",
    title: "The Theorist Magnet",
    description: "A chapter attracts lots of long-form analytical comments.",
  },
  {
    key: "crowd_favorite",
    title: "Crowd Favorite",
    description: "Like-to-read ratio above 15% for a month.",
  },
  {
    key: "viral_spark",
    title: "Viral Spark",
    description: "50+ shares in 24 hours.",
  },
  {
    key: "clockwork_creator",
    title: "Clockwork Creator",
    description: "Weekly chapter publishing streak (4 weeks).",
  },
  {
    key: "century_club",
    title: "Century Club",
    description: "100+ library saves.",
  },
];

const BADGE_UI = {
  page_turner: { icon: "📚", short: "Page-Turner" },
  unputdownable: { icon: "🔥", short: "Binge-Worthy" },
  polished_pro: { icon: "✨", short: "Polished" },
  theorist_magnet: { icon: "🧠", short: "Deep Plot" },
  crowd_favorite: { icon: "🏆", short: "Crowd Favorite" },
  viral_spark: { icon: "⚡", short: "Viral Spark" },
  clockwork_creator: { icon: "⏰", short: "Weekly Updates" },
  century_club: { icon: "💯", short: "100 Saves" },
};

const formatPct = (x) => {
  if (x === null || x === undefined) return "—";
  return `${Math.round(x * 100)}%`;
};

const formatMinutes = (x) => {
  if (x === null || x === undefined) return "—";
  return `${Math.round(x)}m`;
};

const buildBadgeTooltip = (key, state) => {
  const ui = BADGE_UI[key] || { short: key };
  if (!state) return ui.short;

  if (key === "page_turner") {
    return `${ui.short}: ${formatPct(state.progress)} of readers finish the first 5 chapters`;
  }
  if (key === "unputdownable") {
    return `${ui.short}: Avg session ${formatMinutes(state.progress)} (target 20m+)`;
  }
  if (key === "polished_pro") {
    const words = state.progress?.words;
    const completion = state.progress?.completion_rate;
    const wordsStr = typeof words === "number" ? `${Math.round(words / 1000)}k words` : "—";
    return `${ui.short}: ${wordsStr} • Completion ${formatPct(completion)}`;
  }
  if (key === "theorist_magnet") {
    return `${ui.short}: ${state.progress || 0} long theory comments (30d)`;
  }
  if (key === "crowd_favorite") {
    return `${ui.short}: Like-to-read ${formatPct(state.progress)} (30d)`;
  }
  if (key === "viral_spark") {
    return `${ui.short}: ${state.progress || 0} shares in 24h`;
  }
  if (key === "clockwork_creator") {
    return `${ui.short}: Weekly publishing streak ${state.progress || 0}/4 weeks`;
  }
  if (key === "century_club") {
    return `${ui.short}: ${state.progress || 0}/100 library saves`;
  }
  return `${ui.short}`;
};

const computeBadgesForStory = async ({ storyId }) => {
  const [
    retention,
    sessionStats,
    story,
    viral,
    saves,
    ratio30d,
    theoristTop,
    consistency,
  ] = await Promise.all([
    getFirstFiveChapterRetention(storyId),
    getStoryReadsAndSessions(storyId, 30),
    prisma.stories.findUnique({ where: { story_id: storyId }, select: { total_words: true } }),
    getViralSparkShares(storyId),
    getSaves(storyId),
    getLikeToReadRatioWindow(storyId, 30),
    getAnalyticalLongCommentsForChapter(storyId),
    getChapterPublishingConsistency(storyId),
  ]);

  const completionRate = sessionStats.completionRate;
  const totalWords = story?.total_words || 0;

  const out = new Map();

  // Page-Turner
  out.set("page_turner", {
    achieved: retention.ok && (retention.retention ?? 0) >= 0.8,
    progress: retention.ok && retention.retention !== null ? retention.retention : null,
    target: 0.8,
    meta: retention.ok ? { started: retention.started, finished5: retention.finished5 } : { reason: retention.reason },
  });

  // Unputdownable
  out.set("unputdownable", {
    achieved: (sessionStats.avgSessionMinutes ?? 0) >= 20,
    progress: sessionStats.avgSessionMinutes,
    target: 20,
    meta: { avg_session_minutes: sessionStats.avgSessionMinutes, minutes_30d: sessionStats.totalMinutes },
  });

  // Polished Pro
  out.set("polished_pro", {
    achieved: totalWords >= 10_000 && (completionRate ?? 0) >= 0.35,
    progress: {
      words: totalWords,
      completion_rate: completionRate,
    },
    target: { words: 10_000, completion_rate: 0.35 },
    meta: null,
  });

  // Theorist Magnet
  out.set("theorist_magnet", {
    achieved: (theoristTop?.count || 0) >= 8,
    progress: theoristTop?.count || 0,
    target: 8,
    meta: { chapter_id: theoristTop?.chapter_id || null },
  });

  // Crowd Favorite
  out.set("crowd_favorite", {
    achieved: (ratio30d.ratio ?? 0) >= 0.15 && (ratio30d.reads || 0) >= 25,
    progress: ratio30d.ratio,
    target: 0.15,
    meta: { likes_30d: ratio30d.likes, reads_30d: ratio30d.reads },
  });

  // Viral Spark
  out.set("viral_spark", {
    achieved: (viral.shares_24h || 0) >= 50,
    progress: viral.shares_24h || 0,
    target: 50,
    meta: null,
  });

  // Clockwork Creator
  out.set("clockwork_creator", {
    achieved: (consistency.streak_weeks || 0) >= 4,
    progress: consistency.streak_weeks || 0,
    target: 4,
    meta: null,
  });

  // Century Club
  out.set("century_club", {
    achieved: (saves.saves_total || 0) >= 100,
    progress: saves.saves_total || 0,
    target: 100,
    meta: null,
  });

  return out;
};

const ensureWriterOwnsStory = async (storyId, writerId) => {
  const story = await prisma.stories.findUnique({
    where: { story_id: storyId },
    select: { story_id: true, author_id: true, title: true, is_deleted: true },
  });
  if (!story || story.is_deleted) return { error: { status: 404, message: "Story not found" } };
  if (story.author_id !== writerId) return { error: { status: 403, message: "Not allowed" } };
  return { story };
};

const checkAndCreateForStory = async ({ storyId, writerId }) => {
  const story = await prisma.stories.findUnique({ where: { story_id: storyId }, select: { title: true } });
  const title = story?.title || `Story #${storyId}`;

  const metrics = await storyMetrics(storyId);
  let created = 0;

  for (const [metric, thresholds] of Object.entries(MILESTONES)) {
    const value = metrics[metric] || 0;
    for (const threshold of thresholds) {
      if (value < threshold) continue;

      const exists = await prisma.story_milestones.findFirst({
        where: { story_id: storyId, metric, threshold },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.story_milestones.create({ data: { story_id: storyId, metric, threshold } });

      await prisma.notifications.create({
        data: {
          recipient_id: writerId,
          actor_id: null,
          type: "milestone",
          entity_type: "story",
          entity_id: storyId,
          data: JSON.stringify({ metric, threshold, value, title }),
        },
      });

      created += 1;
    }
  }

  // Badge-style milestones (stored as metric='badge_*', threshold=1)
  const badgeStates = await computeBadgesForStory({ storyId });
  for (const badge of BADGE_CATALOG) {
    const state = badgeStates.get(badge.key);
    if (!state?.achieved) continue;

    const metric = badgeKey(badge.key);
    const threshold = 1;

    const exists = await prisma.story_milestones.findFirst({
      where: { story_id: storyId, metric, threshold },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.story_milestones.create({ data: { story_id: storyId, metric, threshold } });

    await prisma.notifications.create({
      data: {
        recipient_id: writerId,
        actor_id: null,
        type: "milestone",
        entity_type: "story",
        entity_id: storyId,
        data: JSON.stringify({
          kind: "badge",
          badge_key: badge.key,
          title: badge.title,
          description: badge.description,
          story_title: title,
        }),
      },
    });

    created += 1;
  }

  return { created, metrics };
};

export const listStoryBadges = async (req, res) => {
  try {
    const writerId = req.user.user_id;
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { error } = await ensureWriterOwnsStory(storyId, writerId);
    if (error) return res.status(error.status).json({ message: error.message });

    const earned = await prisma.story_milestones.findMany({
      where: { story_id: storyId, metric: { startsWith: BADGE_METRIC_PREFIX } },
      select: { metric: true, created_at: true },
      orderBy: { created_at: "desc" },
    });

    const earnedKeys = new Set(earned.map((e) => e.metric.replace(BADGE_METRIC_PREFIX, "")));
    const states = await computeBadgesForStory({ storyId });

    const badges = BADGE_CATALOG.map((b) => {
      const state = states.get(b.key);
      return {
        key: b.key,
        title: b.title,
        description: b.description,
        earned: earnedKeys.has(b.key),
        earned_at: earned.find((e) => e.metric === badgeKey(b.key))?.created_at || null,
        progress: state?.progress ?? null,
        target: state?.target ?? null,
        meta: state?.meta ?? null,
      };
    });

    return res.json({ story_id: storyId, badges });
  } catch (err) {
    console.error("listStoryBadges error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const ensurePublicStory = async (storyId) => {
  const story = await prisma.stories.findUnique({
    where: { story_id: storyId },
    select: { story_id: true, is_deleted: true, status: true, visibility: true },
  });
  if (!story || story.is_deleted) return { error: { status: 404, message: "Story not found" } };
  if (story.status !== "published" || story.visibility !== "public") {
    return { error: { status: 403, message: "Not allowed" } };
  }
  return { story };
};

export const listPublicStoryBadges = async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { error } = await ensurePublicStory(storyId);
    if (error) return res.status(error.status).json({ message: error.message });

    const earned = await prisma.story_milestones.findMany({
      where: { story_id: storyId, metric: { startsWith: BADGE_METRIC_PREFIX } },
      select: { metric: true, created_at: true },
      orderBy: { created_at: "desc" },
    });

    const earnedKeys = new Set(earned.map((e) => e.metric.replace(BADGE_METRIC_PREFIX, "")));
    const states = await computeBadgesForStory({ storyId });

    const publicBadges = BADGE_CATALOG.filter((b) => earnedKeys.has(b.key)).map((b) => {
      const state = states.get(b.key);
      const ui = BADGE_UI[b.key] || { icon: "🏷️", short: b.title };
      return {
        key: b.key,
        icon: ui.icon,
        label: ui.short,
        tooltip: buildBadgeTooltip(b.key, state),
      };
    });

    return res.json({ story_id: storyId, badges: publicBadges });
  } catch (err) {
    console.error("listPublicStoryBadges error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const batchPublicStoryBadges = async (req, res) => {
  try {
    const storyIds = Array.isArray(req.body?.storyIds) ? req.body.storyIds.map(Number).filter(Boolean) : [];
    const unique = Array.from(new Set(storyIds)).slice(0, 300);
    if (!unique.length) return res.json({ badgesByStoryId: {} });

    const stories = await prisma.stories.findMany({
      where: { story_id: { in: unique }, is_deleted: false, status: "published", visibility: "public" },
      select: { story_id: true },
    });
    const allowedIds = stories.map((s) => s.story_id);
    if (!allowedIds.length) return res.json({ badgesByStoryId: {} });

    const earnedRows = await prisma.story_milestones.findMany({
      where: { story_id: { in: allowedIds }, metric: { startsWith: BADGE_METRIC_PREFIX } },
      select: { story_id: true, metric: true },
    });

    const earnedByStory = new Map();
    for (const r of earnedRows) {
      const key = r.metric.replace(BADGE_METRIC_PREFIX, "");
      if (!earnedByStory.has(r.story_id)) earnedByStory.set(r.story_id, new Set());
      earnedByStory.get(r.story_id).add(key);
    }

    const badgesByStoryId = {};
    for (const id of allowedIds) {
      const earnedKeys = earnedByStory.get(id) || new Set();
      if (!earnedKeys.size) {
        badgesByStoryId[id] = [];
        continue;
      }

      // compute states only when needed (earned badges exist)
      const states = await computeBadgesForStory({ storyId: id });
      const badges = BADGE_CATALOG.filter((b) => earnedKeys.has(b.key)).map((b) => {
        const state = states.get(b.key);
        const ui = BADGE_UI[b.key] || { icon: "🏷️", short: b.title };
        return {
          key: b.key,
          icon: ui.icon,
          label: ui.short,
          tooltip: buildBadgeTooltip(b.key, state),
        };
      });
      badgesByStoryId[id] = badges;
    }

    return res.json({ badgesByStoryId });
  } catch (err) {
    console.error("batchPublicStoryBadges error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const runMilestonesForStory = async (req, res) => {
  try {
    const writerId = req.user.user_id;
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { error } = await ensureWriterOwnsStory(storyId, writerId);
    if (error) return res.status(error.status).json({ message: error.message });

    const result = await checkAndCreateForStory({ storyId, writerId });
    return res.json({ storyId, ...result });
  } catch (err) {
    console.error("runMilestonesForStory error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const runMilestonesForMe = async (req, res) => {
  try {
    const writerId = req.user.user_id;
    const stories = await prisma.stories.findMany({
      where: { author_id: writerId, is_deleted: false },
      select: { story_id: true },
    });

    let totalCreated = 0;
    const perStory = [];

    for (const s of stories) {
      const result = await checkAndCreateForStory({ storyId: s.story_id, writerId });
      totalCreated += result.created;
      perStory.push({ story_id: s.story_id, created: result.created, metrics: result.metrics });
    }

    return res.json({ total_created: totalCreated, stories: perStory });
  } catch (err) {
    console.error("runMilestonesForMe error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
