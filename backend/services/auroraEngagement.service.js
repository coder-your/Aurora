import prisma from "../utils/prisma.js";
import {
  POINTS_PER_CARD,
  ENGAGEMENT_POINTS,
  ACTIVITY_TYPES,
  CARD_RARITY,
  CARD_STATUS,
} from "../constants/aurora.constants.js";

const isTableMissing = (err) => {
  const msg = (err?.message || "").toLowerCase();
  const code = err?.code ? String(err.code) : "";
  return code === "P2021" || code === "P2022" || msg.includes("does not exist");
};

const todayKey = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const rollRarity = (totalCardsEarned) => {
  if (totalCardsEarned > 0 && totalCardsEarned % 25 === 0) return CARD_RARITY.LEGENDARY;
  if (totalCardsEarned > 0 && totalCardsEarned % 10 === 0) return CARD_RARITY.RARE;
  const roll = Math.random();
  if (roll < 0.05) return CARD_RARITY.LEGENDARY;
  if (roll < 0.2) return CARD_RARITY.RARE;
  return CARD_RARITY.COMMON;
};

const mintCardsFromPoints = async (tx, userId, engagement) => {
  let cycle = engagement.points_in_current_cycle;
  let totalEarned = engagement.total_cards_earned;
  const newCards = [];

  while (cycle >= POINTS_PER_CARD) {
    cycle -= POINTS_PER_CARD;
    totalEarned += 1;
    const rarity = rollRarity(totalEarned);
    const card = await tx.aurora_cards.create({
      data: {
        user_id: userId,
        rarity,
        status: CARD_STATUS.AVAILABLE,
      },
    });
    newCards.push(card);
  }

  await tx.reader_engagement.update({
    where: { user_id: userId },
    data: {
      points_in_current_cycle: cycle,
      total_cards_earned: totalEarned,
      total_points: engagement.total_points,
    },
  });

  return newCards;
};

const updateDailyStreak = async (tx, userId) => {
  const engagement = await tx.reader_engagement.upsert({
    where: { user_id: userId },
    create: { user_id: userId },
    update: {},
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = engagement.last_streak_date
    ? new Date(engagement.last_streak_date)
    : null;

  let streak = engagement.daily_streak;
  let awardStreak = false;

  if (!last) {
    streak = 1;
    awardStreak = true;
  } else {
    const lastDay = new Date(last);
    lastDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - lastDay) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) {
      return { streak, awarded: false };
    }
    if (diffDays === 1) {
      streak += 1;
      awardStreak = true;
    } else {
      streak = 1;
      awardStreak = true;
    }
  }

  await tx.reader_engagement.update({
    where: { user_id: userId },
    data: { daily_streak: streak, last_streak_date: today },
  });

  if (awardStreak) {
    await awardEngagementPoints(userId, ACTIVITY_TYPES.DAILY_STREAK, {
      referenceType: "day",
      referenceId: todayKey(),
      skipStreak: true,
      tx,
    });
  }

  return { streak, awarded: awardStreak };
};

/**
 * Award engagement points (idempotent per activity + reference).
 * Returns { ok, pointsAwarded, cardsMinted } or { ok: false } if tables missing.
 */
const POINTS_BY_ACTIVITY = Object.fromEntries(
  Object.entries(ACTIVITY_TYPES).map(([activityConstKey, activityTypeValue]) => [
    activityTypeValue, // e.g. "chapter_read"
    ENGAGEMENT_POINTS[activityConstKey], // e.g. ENGAGEMENT_POINTS.CHAPTER_READ
  ])
);

export const awardEngagementPoints = async (
  userId,
  activityType,
  { points, referenceType = null, referenceId = null, skipStreak = false, tx: externalTx } = {}
) => {
  const pointValue = points ?? POINTS_BY_ACTIVITY[activityType];

  if (!pointValue || pointValue <= 0) {
    return { ok: true, pointsAwarded: 0, cardsMinted: [] };
  }

  const run = async (tx) => {
    try {
      await tx.engagement_point_logs.create({
        data: {
          user_id: userId,
          activity_type: activityType,
          points: pointValue,
          reference_type: referenceType,
          reference_id: referenceId,
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        return { ok: true, pointsAwarded: 0, cardsMinted: [], duplicate: true };
      }
      throw err;
    }

    const engagement = await tx.reader_engagement.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        total_points: pointValue,
        points_in_current_cycle: pointValue,
      },
      update: {
        total_points: { increment: pointValue },
        points_in_current_cycle: { increment: pointValue },
      },
    });

    const cardsMinted = await mintCardsFromPoints(tx, userId, engagement);

    if (!skipStreak) {
      await updateDailyStreak(tx, userId);
    }

    return { ok: true, pointsAwarded: pointValue, cardsMinted };
  };

  try {
    if (externalTx) return run(externalTx);
    return prisma.$transaction(run);
  } catch (err) {
    if (isTableMissing(err)) {
      return { ok: false, skipped: true };
    }
    throw err;
  }
};

export const getReaderEngagementSummary = async (userId) => {
  const [engagement, availableCards, recentLogs] = await Promise.all([

    prisma.reader_engagement.findUnique({ where: { user_id: userId } }),
    prisma.aurora_cards.findMany({
      where: { user_id: userId, status: CARD_STATUS.AVAILABLE },
      orderBy: { earned_at: "desc" },
    }),
    prisma.engagement_point_logs.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
  ]);

  // Points in current cycle may drift if engagement row was created before all tables existed.
  // Recompute from available card count + earned_at-safe total_points when engagement row is missing.

  const totalPoints = engagement?.total_points ?? 0;
  const cyclePoints = engagement?.points_in_current_cycle ?? 0;



  return {
    totalPoints,
    pointsInCurrentCycle: cyclePoints,
    pointsUntilNextCard: Math.max(0, POINTS_PER_CARD - cyclePoints),
    dailyStreak: engagement?.daily_streak ?? 0,
    totalCardsEarned: engagement?.total_cards_earned ?? 0,
    availableCards: availableCards.map((c) => ({
      cardId: c.card_id,
      rarity: c.rarity,
      earnedAt: c.earned_at,
    })),
    recentActivity: recentLogs.map((l) => ({
      activityType: l.activity_type,
      points: l.points,
      createdAt: l.created_at,
    })),
  };
};

export const getContributorProfile = async (userId) => {
  const contributor = await prisma.plot_twist_contributors.findUnique({
    where: { user_id: userId },
  });

  const profile = await prisma.user_profiles.findUnique({
    where: { user_id: userId },
    select: { handle_name: true, nickname: true },
  });

  if (!contributor) {
    return {
      userId,
      handle: profile?.handle_name || null,
      acceptedCount: 0,
      storiesInfluenced: 0,
      totalSubmissions: 0,
      approvalRate: 0,
      influencerLevel: 1,
    };
  }

  return {
    userId,
    handle: profile?.handle_name || null,
    acceptedCount: contributor.accepted_count,
    storiesInfluenced: contributor.stories_influenced,
    totalSubmissions: contributor.total_submissions,
    approvalRate: Math.round(contributor.approval_rate * 100) / 100,
    influencerLevel: contributor.influencer_level,
  };
};
