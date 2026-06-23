import prisma from "../utils/prisma.js";

export async function getPredictiveSuccessScore(storyId) {
  const story = await prisma.stories.findUnique({
    where: { story_id: storyId },
    select: {
      story_id: true,
      title: true,
      author_id: true,
      created_at: true,
      total_chapters: true,
      visibility: true,
      status: true,
    },
  });

  if (!story) return null;

  const now = new Date();
  const storyAgeMs = now.getTime() - new Date(story.created_at).getTime();
  const storyAgeDays = Math.max(1, storyAgeMs / (24 * 60 * 60 * 1000));

  const [
    readHistory,
    sessions,
    comments,
    shares,
    likes,
    chapters,
    positions,
  ] = await Promise.all([
    prisma.user_read_history.findMany({
      where: { story_id: storyId },
      select: { user_id: true, progress: true, last_read: true },
    }),
    prisma.reading_sessions.findMany({
      where: { story_id: storyId },
      select: { user_id: true, minutes: true, date: true },
    }),
    prisma.comments.findMany({
      where: { story_id: storyId, is_deleted: false },
      select: { comment_id: true, body: true, chapter_id: true, created_at: true },
    }),
    prisma.story_shares.count({ where: { story_id: storyId } }),
    prisma.story_likes.count({ where: { story_id: storyId } }),
    prisma.chapters.findMany({
      where: { story_id: storyId, is_deleted: false },
      orderBy: { order_index: "asc" },
      select: { chapter_id: true, order_index: true },
    }),
    prisma.reading_positions.findMany({
      where: { story_id: storyId },
      select: { user_id: true, chapter_id: true },
    }),
  ]);

  const totalReaders = readHistory.filter((r) => (r.progress ?? 0) > 0).length;

  const hookScore = computeHookScore(readHistory, positions, chapters, storyAgeDays);
  const stickinessScore = computeStickinessScore(sessions, readHistory);
  const engagementIntensity = computeEngagementIntensity(comments, shares, totalReaders);
  const sentimentMomentum = computeSentimentMomentum(comments, chapters);

  const rawScore =
    hookScore.score * 0.25 +
    stickinessScore.score * 0.25 +
    engagementIntensity.score * 0.25 +
    sentimentMomentum.score * 0.25;

  const viralScore = Math.round(Math.min(100, Math.max(0, rawScore)));

  const forecast = generateForecast(viralScore, totalReaders, storyAgeDays);
  const levers = generateLevers(hookScore, stickinessScore, engagementIntensity, sentimentMomentum);

  return {
    story_id: storyId,
    title: story.title,
    viral_score: viralScore,
    condition: getConditionLabel(viralScore),
    hook: hookScore,
    stickiness: stickinessScore,
    engagement_intensity: engagementIntensity,
    sentiment_momentum: sentimentMomentum,
    forecast,
    levers,
    total_readers: totalReaders,
    total_comments: comments.length,
    total_shares: shares,
    total_likes: likes,
    story_age_days: Math.round(storyAgeDays),
  };
}

function computeHookScore(readHistory, positions, chapters, storyAgeDays) {
  const started = readHistory.filter((r) => (r.progress ?? 0) > 0).length;
  if (!started) return { score: 0, ch1_retention: null, velocity: null };

  const chapterMap = new Map(chapters.map((c) => [c.chapter_id, c.order_index]));
  const userMaxChapter = new Map();
  for (const p of positions) {
    const idx = chapterMap.get(p.chapter_id);
    if (idx === undefined) continue;
    const prev = userMaxChapter.get(p.user_id);
    if (prev === undefined || idx > prev) userMaxChapter.set(p.user_id, idx);
  }

  const passedCh1 = Array.from(userMaxChapter.values()).filter((idx) => idx >= 1).length;
  const ch1Retention = started ? passedCh1 / started : 0;

  const velocity = storyAgeDays > 0 ? started / storyAgeDays : 0;
  const velocityScore = Math.min(50, velocity * 5);
  const retentionScore = ch1Retention * 50;

  return {
    score: Math.round(velocityScore + retentionScore),
    ch1_retention: ch1Retention,
    velocity: velocity,
  };
}

function computeStickinessScore(sessions, readHistory) {
  if (!sessions.length) return { score: 0, avg_session_depth: null, return_rate: null };

  const sessionsByUser = new Map();
  for (const s of sessions) {
    if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, []);
    sessionsByUser.get(s.user_id).push(s);
  }

  let totalMinutes = 0;
  let sessionCount = 0;
  let returners = 0;

  for (const [uid, userSessions] of sessionsByUser.entries()) {
    const sorted = userSessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const s of sorted) {
      totalMinutes += s.minutes || 0;
      sessionCount += 1;
    }

    if (sorted.length >= 2) {
      const first = new Date(sorted[0].date);
      const second = new Date(sorted[1].date);
      if (second - first <= 24 * 60 * 60 * 1000) returners += 1;
    }
  }

  const avgSessionMinutes = sessionCount ? totalMinutes / sessionCount : 0;
  const sessionDepthScore = Math.min(50, avgSessionMinutes * 2);

  const totalUsers = sessionsByUser.size;
  const returnRate = totalUsers ? returners / totalUsers : 0;
  const returnScore = returnRate * 50;

  return {
    score: Math.round(sessionDepthScore + returnScore),
    avg_session_depth: avgSessionMinutes,
    return_rate: returnRate,
  };
}

function computeEngagementIntensity(comments, shares, totalReaders) {
  if (!totalReaders) return { score: 0, avg_comment_length: null, share_to_read_ratio: null };

  const totalLength = comments.reduce((sum, c) => sum + (c.body?.length || 0), 0);
  const avgLength = comments.length ? totalLength / comments.length : 0;
  const lengthScore = Math.min(40, avgLength / 5);

  const shareRatio = totalReaders ? shares / totalReaders : 0;
  const shareScore = Math.min(60, shareRatio * 300);

  return {
    score: Math.round(lengthScore + shareScore),
    avg_comment_length: avgLength,
    share_to_read_ratio: shareRatio,
  };
}

function computeSentimentMomentum(comments, chapters) {
  if (!comments.length || !chapters.length) {
    return { score: 50, trend: "neutral", cliffhanger_impact: null };
  }

  const chapterMap = new Map(chapters.map((c) => [c.chapter_id, c.order_index]));
  const byChapter = new Map();

  for (const c of comments) {
    const idx = chapterMap.get(c.chapter_id);
    if (idx === undefined) continue;
    if (!byChapter.has(idx)) byChapter.set(idx, []);
    byChapter.get(idx).push(c);
  }

  const sortedIdxs = Array.from(byChapter.keys()).sort((a, b) => a - b);
  if (sortedIdxs.length < 2) return { score: 50, trend: "neutral", cliffhanger_impact: null };

  const firstHalf = sortedIdxs.slice(0, Math.ceil(sortedIdxs.length / 2));
  const secondHalf = sortedIdxs.slice(Math.ceil(sortedIdxs.length / 2));

  const countFirst = firstHalf.reduce((s, idx) => s + (byChapter.get(idx)?.length || 0), 0);
  const countSecond = secondHalf.reduce((s, idx) => s + (byChapter.get(idx)?.length || 0), 0);

  let trend = "neutral";
  let trendScore = 50;
  if (countSecond > countFirst * 1.2) {
    trend = "rising";
    trendScore = 75;
  } else if (countSecond < countFirst * 0.8) {
    trend = "declining";
    trendScore = 30;
  }

  const lastIdx = sortedIdxs[sortedIdxs.length - 1];
  const prevIdx = sortedIdxs.length > 1 ? sortedIdxs[sortedIdxs.length - 2] : null;
  let cliffhangerImpact = null;
  if (prevIdx !== null) {
    const lastCount = byChapter.get(lastIdx)?.length || 0;
    const prevCount = byChapter.get(prevIdx)?.length || 0;
    if (prevCount) cliffhangerImpact = (lastCount - prevCount) / prevCount;
  }

  return { score: trendScore, trend, cliffhanger_impact: cliffhangerImpact };
}

function getConditionLabel(score) {
  if (score >= 80) return "Sunny";
  if (score >= 60) return "Partly Cloudy";
  if (score >= 40) return "Cloudy";
  if (score >= 20) return "Overcast";
  return "Stormy";
}

function generateForecast(viralScore, totalReaders, storyAgeDays) {
  if (!totalReaders || storyAgeDays < 1) {
    return { message: "Not enough data yet to forecast.", target_reads: null, target_date: null };
  }

  const dailyRate = totalReaders / storyAgeDays;
  const multiplier = 1 + (viralScore / 100) * 0.5;
  const projectedDaily = dailyRate * multiplier;

  const target = totalReaders < 100 ? 100 : totalReaders < 500 ? 500 : totalReaders < 1000 ? 1000 : 5000;
  const remaining = target - totalReaders;
  if (remaining <= 0) {
    return { message: `Congratulations! You've already passed ${target} reads.`, target_reads: target, target_date: null };
  }

  const daysToTarget = Math.ceil(remaining / projectedDaily);
  const targetDate = new Date(Date.now() + daysToTarget * 24 * 60 * 60 * 1000);

  return {
    message: `Based on current engagement, this story is on track to hit ${target} reads by ${targetDate.toLocaleDateString()}.`,
    target_reads: target,
    target_date: targetDate.toISOString(),
  };
}

function generateLevers(hook, stickiness, engagement, sentiment) {
  const levers = [];

  if (hook.ch1_retention !== null && hook.ch1_retention < 0.7) {
    const boost = Math.round((0.7 - hook.ch1_retention) * 100);
    levers.push({
      action: `Improve Chapter 1 retention by ${boost}%`,
      impact: "Could boost your Hook Score significantly",
    });
  }

  if (stickiness.return_rate !== null && stickiness.return_rate < 0.4) {
    levers.push({
      action: "End chapters on cliffhangers to increase return rate",
      impact: "Could improve Stickiness Score",
    });
  }

  if (engagement.avg_comment_length !== null && engagement.avg_comment_length < 50) {
    levers.push({
      action: "Ask thought-provoking questions in author notes",
      impact: "Encourages longer, more engaged comments",
    });
  }

  if (engagement.share_to_read_ratio !== null && engagement.share_to_read_ratio < 0.1) {
    levers.push({
      action: "Add a call-to-action for readers to share",
      impact: "Could dramatically increase viral potential",
    });
  }

  if (sentiment.trend === "declining") {
    levers.push({
      action: "Analyze recent chapters for pacing issues",
      impact: "Reversing sentiment decline can boost retention",
    });
  }

  if (!levers.length) {
    levers.push({
      action: "Keep up the great work!",
      impact: "Your metrics are looking healthy",
    });
  }

  return levers.slice(0, 4);
}
