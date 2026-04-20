import prisma from "../utils/prisma.js";

const dayKeyUTC = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

const pctDelta = (current, prev) => {
  const c = Number(current) || 0;
  const p = Number(prev) || 0;
  if (!p) return null;
  return (c - p) / p;
};

const clampDateRange = ({ from, to }) => {
  const now = new Date();
  const toDate = to ? new Date(to) : now;
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { fromDate, toDate };
};

const ensureWriterStoryOwnership = async (storyId, userId) => {
  const story = await prisma.stories.findUnique({
    where: { story_id: storyId },
    select: { story_id: true, author_id: true, title: true, status: true, visibility: true, is_deleted: true },
  });

  if (!story || story.is_deleted) return { error: { status: 404, message: "Story not found" } };
  if (story.author_id !== userId) return { error: { status: 403, message: "Not allowed" } };
  return { story };
};

export const overview = async (req, res) => {
  try {
    const writerId = req.user.user_id;

    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

    const [stories, followersTotal, followersLastNDays] = await Promise.all([
      prisma.stories.findMany({
        where: { author_id: writerId, is_deleted: false },
        select: { story_id: true, status: true, visibility: true },
      }),
      prisma.writer_follows.count({ where: { writer_id: writerId } }),
      prisma.writer_follows.count({ where: { writer_id: writerId, created_at: { gte: since } } }),
    ]);

    const storyIds = stories.map((s) => s.story_id);

    let readsTotal = 0;
    let readsLastNDays = 0;
    let readsPrevNDays = 0;
    let likesTotal = 0;
    let likesLastNDays = 0;
    let likesPrevNDays = 0;
    let commentsTotal = 0;
    let commentsLastNDays = 0;
    let commentsPrevNDays = 0;
    let sharesTotal = 0;
    let sharesLastNDays = 0;
    let sharesPrevNDays = 0;
    let savesTotal = 0;
    let savesLastNDays = 0;
    let savesPrevNDays = 0;
    let readingMinutesLastNDays = 0;
    let readingMinutesPrevNDays = 0;
    let completionRate = null;
    let avgReadingMinutesPerReader = null;
    let rereadRatio = null;
    let readingActivityHeatmap = [];

    if (storyIds.length) {
      const [
        readsTotalRes,
        readsLastRes,
        readsPrevRes,
        likesTotalRes,
        likesLastRes,
        likesPrevRes,
        commentsTotalRes,
        commentsLastRes,
        commentsPrevRes,
        sharesTotalRes,
        sharesLastRes,
        sharesPrevRes,
        savesTotalRes,
        savesLastRes,
        savesPrevRes,
        sessionsLast,
        sessionsPrev,
        completedCount,
        rereadGroups,
      ] = await Promise.all([
        prisma.user_read_history.count({ where: { story_id: { in: storyIds }, progress: { gt: 0 } } }),
        prisma.user_read_history.count({
          where: { story_id: { in: storyIds }, progress: { gt: 0 }, last_read: { gte: since } },
        }),
        prisma.user_read_history.count({
          where: { story_id: { in: storyIds }, progress: { gt: 0 }, last_read: { gte: prevSince, lt: since } },
        }),
        prisma.story_likes.count({ where: { story_id: { in: storyIds } } }),
        prisma.story_likes.count({ where: { story_id: { in: storyIds }, created_at: { gte: since } } }),
        prisma.story_likes.count({ where: { story_id: { in: storyIds }, created_at: { gte: prevSince, lt: since } } }),
        prisma.comments.count({ where: { story_id: { in: storyIds }, is_deleted: false } }),
        prisma.comments.count({ where: { story_id: { in: storyIds }, is_deleted: false, created_at: { gte: since } } }),
        prisma.comments.count({ where: { story_id: { in: storyIds }, is_deleted: false, created_at: { gte: prevSince, lt: since } } }),
        prisma.story_shares.count({ where: { story_id: { in: storyIds } } }),
        prisma.story_shares.count({ where: { story_id: { in: storyIds }, created_at: { gte: since } } }),
        prisma.story_shares.count({ where: { story_id: { in: storyIds }, created_at: { gte: prevSince, lt: since } } }),
        prisma.to_be_read.count({ where: { story_id: { in: storyIds } } }),
        prisma.to_be_read.count({ where: { story_id: { in: storyIds }, added_at: { gte: since } } }),
        prisma.to_be_read.count({ where: { story_id: { in: storyIds }, added_at: { gte: prevSince, lt: since } } }),
        prisma.reading_sessions.aggregate({ where: { story_id: { in: storyIds }, date: { gte: since } }, _sum: { minutes: true } }).catch(() => ({ _sum: { minutes: 0 } })),
        prisma.reading_sessions.aggregate({ where: { story_id: { in: storyIds }, date: { gte: prevSince, lt: since } }, _sum: { minutes: true } }).catch(() => ({ _sum: { minutes: 0 } })),
        prisma.user_read_history.count({ where: { story_id: { in: storyIds }, progress: { gte: 95 } } }),
        prisma.reading_sessions.groupBy({
          by: ["user_id", "story_id"],
          _count: { id: true },
          where: { story_id: { in: storyIds }, user_id: { not: null } },
          take: 5000,
        }).catch(() => []),
      ]);

      readsTotal = readsTotalRes;
      readsLastNDays = readsLastRes;
      readsPrevNDays = readsPrevRes;
      likesTotal = likesTotalRes;
      likesLastNDays = likesLastRes;
      likesPrevNDays = likesPrevRes;
      commentsTotal = commentsTotalRes;
      commentsLastNDays = commentsLastRes;
      commentsPrevNDays = commentsPrevRes;
      sharesTotal = sharesTotalRes;
      sharesLastNDays = sharesLastRes;
      sharesPrevNDays = sharesPrevRes;
      savesTotal = savesTotalRes;
      savesLastNDays = savesLastRes;
      savesPrevNDays = savesPrevRes;

      readingMinutesLastNDays = Number(sessionsLast?._sum?.minutes) || 0;
      readingMinutesPrevNDays = Number(sessionsPrev?._sum?.minutes) || 0;

      completionRate = readsTotal ? completedCount / readsTotal : null;
      avgReadingMinutesPerReader = readsLastNDays ? readingMinutesLastNDays / readsLastNDays : null;

      try {
        const daysByUserStory = rereadGroups
          .map((g) => ({
            user_id: g.user_id,
            story_id: g.story_id,
            days: Number(g?._count?.id) || 0,
          }))
          .filter((x) => x.days >= 2);

        if (daysByUserStory.length) {
          const keys = new Set(daysByUserStory.map((x) => `${x.user_id}:${x.story_id}`));
          const finished = await prisma.user_read_history.findMany({
            where: { story_id: { in: storyIds }, progress: { gte: 95 } },
            select: { user_id: true, story_id: true },
            take: 5000,
          });
          const finishedKeys = new Set(finished.map((x) => `${x.user_id}:${x.story_id}`));
          const rereadFinished = Array.from(keys).filter((k) => finishedKeys.has(k)).length;
          const finishedTotal = finished.length;
          rereadRatio = finishedTotal ? rereadFinished / finishedTotal : null;
        }
      } catch {
        rereadRatio = null;
      }

      try {
        const sessions = await prisma.reading_sessions.findMany({
          where: { story_id: { in: storyIds }, date: { gte: since } },
          select: { date: true, minutes: true, user_id: true },
          take: 50_000,
        });

        const byDay = new Map();
        const usersByDay = new Map();

        for (const s of sessions) {
          const key = dayKeyUTC(s.date);
          const minutes = Math.max(0, Number(s.minutes) || 0);
          byDay.set(key, (byDay.get(key) || 0) + minutes);

          if (!usersByDay.has(key)) usersByDay.set(key, new Set());
          if (s.user_id) usersByDay.get(key).add(s.user_id);
        }

        readingActivityHeatmap = Array.from(byDay.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([day, minutes]) => ({
            day,
            minutes,
            readers: usersByDay.get(day) ? usersByDay.get(day).size : 0,
          }));
      } catch (e) {
        readingActivityHeatmap = [];
      }
    }

    const publishedStories = stories.filter((s) => s.status === "published" && s.visibility === "public").length;

    return res.json({
      range_days: days,
      stories_total: stories.length,
      stories_published: publishedStories,
      followers_total: followersTotal,
      followers_gained: followersLastNDays,
      reads_total: readsTotal,
      reads_recent: readsLastNDays,
      reads_prev: readsPrevNDays,
      reads_delta_percent: pctDelta(readsLastNDays, readsPrevNDays),
      likes_total: likesTotal,
      likes_recent: likesLastNDays,
      likes_prev: likesPrevNDays,
      likes_delta_percent: pctDelta(likesLastNDays, likesPrevNDays),
      comments_total: commentsTotal,
      comments_recent: commentsLastNDays,
      comments_prev: commentsPrevNDays,
      comments_delta_percent: pctDelta(commentsLastNDays, commentsPrevNDays),
      shares_total: sharesTotal,
      shares_recent: sharesLastNDays,
      shares_prev: sharesPrevNDays,
      shares_delta_percent: pctDelta(sharesLastNDays, sharesPrevNDays),
      saves_total: savesTotal,
      saves_recent: savesLastNDays,
      saves_prev: savesPrevNDays,
      saves_delta_percent: pctDelta(savesLastNDays, savesPrevNDays),
      completion_rate: completionRate,
      reading_minutes_recent: readingMinutesLastNDays,
      reading_minutes_prev: readingMinutesPrevNDays,
      reading_minutes_delta_percent: pctDelta(readingMinutesLastNDays, readingMinutesPrevNDays),
      avg_reading_minutes_per_reader: avgReadingMinutesPerReader,
      reread_ratio: rereadRatio,
      reading_activity_heatmap: readingActivityHeatmap,
    });
  } catch (err) {
    console.error("insights overview error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const books = async (req, res) => {
  try {
    const writerId = req.user.user_id;

    const stories = await prisma.stories.findMany({
      where: { author_id: writerId, is_deleted: false },
      orderBy: { updated_at: "desc" },
      select: {
        story_id: true,
        title: true,
        status: true,
        visibility: true,
        cover_url: true,
        created_at: true,
        updated_at: true,
        total_chapters: true,
        total_words: true,
      },
    });

    if (!stories.length) {
      return res.json({ books: [] });
    }

    const ids = stories.map((s) => s.story_id);

    const [likesAgg, commentsAgg, sharesAgg, readsAgg, reviewsAgg, minutesAgg, completedRows, savesAgg] = await Promise.all([
      prisma.story_likes.groupBy({ by: ["story_id"], where: { story_id: { in: ids } }, _count: { _all: true } }).catch(() => []),
      prisma.comments.groupBy({ by: ["story_id"], where: { story_id: { in: ids }, is_deleted: false }, _count: { _all: true } }).catch(() => []),
      prisma.story_shares.groupBy({ by: ["story_id"], where: { story_id: { in: ids } }, _count: { _all: true } }).catch(() => []),
      prisma.user_read_history.groupBy({ by: ["story_id"], where: { story_id: { in: ids }, progress: { gt: 0 } }, _count: { _all: true }, _avg: { progress: true } }).catch(
        () => []
      ),
      prisma.story_reviews.groupBy({ by: ["story_id"], where: { story_id: { in: ids } }, _count: { _all: true }, _avg: { rating: true } }).catch(() => []),
      prisma.reading_sessions.groupBy({ by: ["story_id"], where: { story_id: { in: ids } }, _sum: { minutes: true } }).catch(() => []),
      prisma.user_read_history.findMany({ where: { story_id: { in: ids }, progress: { gte: 95 } }, select: { story_id: true } }).catch(() => []),
      prisma.to_be_read.groupBy({ by: ["story_id"], where: { story_id: { in: ids } }, _count: { _all: true } }).catch(() => []),
    ]);

    const mapCount = (arr) => new Map(arr.map((x) => [x.story_id, x._count?._all || 0]));
    const mapAvg = (arr, key) => new Map(arr.map((x) => [x.story_id, x._avg?.[key] ?? null]));

    const likesMap = mapCount(likesAgg);
    const commentsMap = mapCount(commentsAgg);
    const sharesMap = mapCount(sharesAgg);
    const readsMap = mapCount(readsAgg);
    const completionMap = mapAvg(readsAgg, "progress");
    const reviewsCountMap = mapCount(reviewsAgg);
    const ratingAvgMap = mapAvg(reviewsAgg, "rating");
    const minutesMap = new Map(minutesAgg.map((x) => [x.story_id, Number(x?._sum?.minutes) || 0]));
    const completedMap = new Map();
    completedRows.forEach((r) => completedMap.set(r.story_id, (completedMap.get(r.story_id) || 0) + 1));
    const savesMap = mapCount(savesAgg);

    const out = stories.map((s) => ({
      ...s,
      reads: readsMap.get(s.story_id) || 0,
      likes: likesMap.get(s.story_id) || 0,
      comments: commentsMap.get(s.story_id) || 0,
      shares: sharesMap.get(s.story_id) || 0,
      avg_completion_percent: completionMap.get(s.story_id),
      completion_rate: (readsMap.get(s.story_id) || 0) ? (completedMap.get(s.story_id) || 0) / (readsMap.get(s.story_id) || 1) : null,
      review_count: reviewsCountMap.get(s.story_id) || 0,
      avg_rating: ratingAvgMap.get(s.story_id),
      reading_minutes_total: minutesMap.get(s.story_id) || 0,
      avg_reading_minutes_per_reader: (readsMap.get(s.story_id) || 0) ? (minutesMap.get(s.story_id) || 0) / (readsMap.get(s.story_id) || 1) : null,
      saves: savesMap.get(s.story_id) || 0,
    }));

    return res.json({ books: out });
  } catch (err) {
    console.error("insights books error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const bookDetail = async (req, res) => {
  try {
    const writerId = req.user.user_id;
    const storyId = Number(req.params.storyId);
    if (!storyId) return res.status(400).json({ message: "Invalid storyId" });

    const { story, error } = await ensureWriterStoryOwnership(storyId, writerId);
    if (error) return res.status(error.status).json({ message: error.message });

    const [chapters, reads, likes, comments, shares, reviews, sessions, positions] = await Promise.all([
      prisma.chapters.findMany({
        where: { story_id: storyId, is_deleted: false },
        orderBy: { order_index: "asc" },
        select: { chapter_id: true, title: true, order_index: true, word_count: true, reading_minutes: true, updated_at: true },
      }),
      prisma.user_read_history.findMany({ where: { story_id: storyId }, select: { user_id: true, progress: true, last_read: true } }),
      prisma.story_likes.count({ where: { story_id: storyId } }),
      prisma.comments.count({ where: { story_id: storyId, is_deleted: false } }),
      prisma.story_shares.count({ where: { story_id: storyId } }),
      prisma.story_reviews.findMany({ where: { story_id: storyId }, select: { rating: true } }),
      prisma.reading_sessions.findMany({ where: { story_id: storyId }, select: { minutes: true, date: true } }),
      prisma.reading_positions.findMany({ where: { story_id: storyId }, select: { user_id: true, chapter_id: true, position: true, updated_at: true } }).catch(() => []),
    ]);

    const startedReaders = reads.filter((r) => (r.progress ?? 0) > 0).length;
    const finishedReaders = reads.filter((r) => (r.progress ?? 0) >= 95).length;
    const totalReads = startedReaders;
    const avgCompletion = reads.length ? reads.reduce((s, r) => s + (r.progress ?? 0), 0) / reads.length : null;
    const completionRate = startedReaders ? finishedReaders / startedReaders : null;

    const ratingAvg = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : null;

    const chapterIndexById = new Map(chapters.map((c) => [c.chapter_id, c.order_index]));
    const reachedByUser = new Map();
    for (const p of positions) {
      const idx = chapterIndexById.get(p.chapter_id);
      if (idx === undefined) continue;
      const prev = reachedByUser.get(p.user_id);
      if (prev === undefined || idx > prev) reachedByUser.set(p.user_id, idx);
    }

    const startedByPositions = reachedByUser.size;
    const denom = startedByPositions || startedReaders || 0;

    const chapterRetention = chapters.map((c) => {
      const idx = c.order_index;
      let reached = 0;
      for (const v of reachedByUser.values()) {
        if (v >= idx) reached += 1;
      }
      return {
        chapter_id: c.chapter_id,
        order_index: c.order_index,
        title: c.title,
        readers_reached: reached,
        retention_rate: denom ? reached / denom : null,
      };
    });

    const readsPerChapterApprox = chapterRetention.map((x) => ({
      chapter_id: x.chapter_id,
      order_index: x.order_index,
      title: x.title,
      reads_approx: x.readers_reached,
    }));

    const sessionMinutesTotal = sessions.reduce((s, r) => s + (r.minutes || 0), 0);
    const avgReadingMinutesPerReader = totalReads ? sessionMinutesTotal / totalReads : null;

    return res.json({
      story,
      totals: {
        reads: totalReads,
        likes,
        comments,
        shares,
        avg_completion_percent: avgCompletion,
        completion_rate: completionRate,
        avg_rating: ratingAvg,
        reviews: reviews.length,
        reading_minutes_total: sessionMinutesTotal,
        avg_reading_minutes_per_reader: avgReadingMinutesPerReader,
      },
      chapters,
      reads_per_chapter: readsPerChapterApprox,
      chapter_retention: chapterRetention,
    });
  } catch (err) {
    console.error("insights bookDetail error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const audience = async (req, res) => {
  try {
    const writerId = req.user.user_id;
    const { fromDate, toDate } = clampDateRange({ from: req.query.from, to: req.query.to });

    const rows = await prisma.writer_follows.findMany({
      where: { writer_id: writerId, created_at: { gte: fromDate, lte: toDate } },
      orderBy: { created_at: "asc" },
      select: { created_at: true },
    });

    const byDay = new Map();
    for (const r of rows) {
      const d = new Date(r.created_at);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }

    const series = Array.from(byDay.entries()).map(([day, gained]) => ({ day, gained }));

    const total = await prisma.writer_follows.count({ where: { writer_id: writerId } });

    let topGenres = [];
    try {
      const writerStories = await prisma.stories.findMany({
        where: { author_id: writerId, is_deleted: false },
        select: { story_id: true },
      });
      const storyIds = writerStories.map((s) => s.story_id);
      if (storyIds.length) {
        const readers = await prisma.user_read_history.findMany({
          where: { story_id: { in: storyIds }, progress: { gt: 0 } },
          select: { user_id: true },
          take: 3000,
        });
        const readerIds = Array.from(new Set(readers.map((r) => r.user_id))).slice(0, 1500);
        if (readerIds.length) {
          const other = await prisma.user_read_history.findMany({
            where: { user_id: { in: readerIds }, progress: { gt: 0 }, story: { author_id: { not: writerId } } },
            include: { story: { select: { category: true } } },
            take: 8000,
          });
          const counts = new Map();
          for (const row of other) {
            const cat = row?.story?.category;
            if (!cat) continue;
            counts.set(cat, (counts.get(cat) || 0) + 1);
          }
          topGenres = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([category, count]) => ({ category, count }));
        }
      }
    } catch (e) {
      topGenres = [];
    }

    return res.json({ from: fromDate.toISOString(), to: toDate.toISOString(), followers_total: total, gained_series: series, top_genres: topGenres });
  } catch (err) {
    console.error("insights audience error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const engagement = async (req, res) => {
  try {
    const writerId = req.user.user_id;

    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

    const stories = await prisma.stories.findMany({
      where: { author_id: writerId, is_deleted: false },
      select: { story_id: true },
    });

    const ids = stories.map((s) => s.story_id);

    if (ids.length === 0) {
      return res.json({
        totals: { reads: 0, likes: 0, comments: 0, shares: 0, followers: await prisma.writer_follows.count({ where: { writer_id: writerId } }) },
        ratios: {
          likes_to_reads: null,
          comments_to_reads: null,
          shares_to_reads: null,
          follower_conversion_rate: null,
        },
      });
    }

    const [reads, likes, comments, shares, followers, minutesAgg, saves, readsRecent, readsPrev] = await Promise.all([
      prisma.user_read_history.count({ where: { story_id: { in: ids }, progress: { gt: 0 } } }),
      prisma.story_likes.count({ where: { story_id: { in: ids } } }),
      prisma.comments.count({ where: { story_id: { in: ids }, is_deleted: false } }),
      prisma.story_shares.count({ where: { story_id: { in: ids } } }),
      prisma.writer_follows.count({ where: { writer_id: writerId } }),
      prisma.reading_sessions.aggregate({ where: { story_id: { in: ids } }, _sum: { minutes: true } }).catch(() => ({ _sum: { minutes: 0 } })),
      prisma.to_be_read.count({ where: { story_id: { in: ids } } }).catch(() => 0),
      prisma.user_read_history.count({ where: { story_id: { in: ids }, progress: { gt: 0 }, last_read: { gte: since } } }).catch(() => 0),
      prisma.user_read_history.count({ where: { story_id: { in: ids }, progress: { gt: 0 }, last_read: { gte: prevSince, lt: since } } }).catch(() => 0),
    ]);

    const safeRatio = (a, b) => {
      if (!b) return null;
      return a / b;
    };

    return res.json({
      totals: { reads, likes, comments, shares, followers, saves, reading_minutes: Number(minutesAgg?._sum?.minutes) || 0 },
      ratios: {
        likes_to_reads: safeRatio(likes, reads),
        comments_to_reads: safeRatio(comments, reads),
        shares_to_reads: safeRatio(shares, reads),
        follower_conversion_rate: safeRatio(followers, reads),
        avg_reading_minutes_per_reader: reads ? (Number(minutesAgg?._sum?.minutes) || 0) / reads : null,
      },
      deltas: {
        reads_recent: readsRecent,
        reads_prev: readsPrev,
        reads_delta_percent: pctDelta(readsRecent, readsPrev),
      },
    });
  } catch (err) {
    console.error("insights engagement error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
