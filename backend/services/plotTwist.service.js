import prisma from "../utils/prisma.js";
import {
  EVENT_STATUS,
  CARD_STATUS,
  MODERATION_STATUS,
  PLOT_TWIST_LIMITS,
  CARD_RARITY,
  ACTIVITY_TYPES,
} from "../constants/aurora.constants.js";
import { tryAward } from "../utils/auroraHooks.js";


const HOURS_48_MS = PLOT_TWIST_LIMITS.EVENT_DURATION_HOURS * 60 * 60 * 1000;

// Note: Twist length enforcement is handled in moderatePlotTwistSubmission (300 chars for description).


export const expireStaleEvents = async () => {
  const now = new Date();
  const expired = await prisma.plot_twist_events.findMany({
    where: {
      status: EVENT_STATUS.OPEN,
      closes_at: { lt: now },
    },
    include: { submissions: { include: { card: true } } },
  });

  for (const event of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.plot_twist_events.update({
        where: { event_id: event.event_id },
        data: { status: EVENT_STATUS.EXPIRED, closed_at: now },
      });

      if (!event.reviewed_at) {
        for (const sub of event.submissions) {
          if (sub.card && sub.card.status === CARD_STATUS.SPENT) {
            await tx.aurora_cards.update({
              where: { card_id: sub.card_id },
              data: {
                status: CARD_STATUS.REFUNDED,
                refunded_at: now,
                event_id: null,
              },
            });
          }
        }
      }
    });
  }

  return expired.length;
};

export const openPlotTwistEvent = async (authorId, { storyId, chapterId, maxSubmissions, votingEnabled }) => {
  const story = await prisma.stories.findFirst({
    where: { story_id: storyId, author_id: authorId, is_deleted: false },
  });
  if (!story) throw Object.assign(new Error("Story not found or not yours."), { status: 404 });

  const chapter = await prisma.chapters.findFirst({
    where: { chapter_id: chapterId, story_id: storyId, is_deleted: false },
  });
  if (!chapter) throw Object.assign(new Error("Chapter not found."), { status: 404 });

  const existing = await prisma.plot_twist_events.findFirst({
    where: {
      chapter_id: chapterId,
      status: { in: [EVENT_STATUS.OPEN, EVENT_STATUS.CLOSED] },
    },
  });
  if (existing) {
    throw Object.assign(new Error("An active plot twist window already exists for this chapter."), {
      status: 409,
    });
  }

  const closesAt = new Date(Date.now() + HOURS_48_MS);
  const event = await prisma.plot_twist_events.create({
    data: {
      story_id: storyId,
      chapter_id: chapterId,
      author_id: authorId,
      status: EVENT_STATUS.OPEN,
      max_submissions: maxSubmissions || PLOT_TWIST_LIMITS.MAX_SUBMISSIONS_DEFAULT,
      voting_enabled: votingEnabled !== false,
      closes_at: closesAt,
    },
    include: {
      story: { select: { title: true } },
      chapter: { select: { title: true } },
    },
  });

  return event;
};

export const getEventForChapter = async (chapterId, userId = null) => {
  await expireStaleEvents();

  const event = await prisma.plot_twist_events.findFirst({
    where: { chapter_id: chapterId },
    orderBy: { created_at: "desc" },
    include: {
      story: { select: { story_id: true, title: true, author_id: true } },
      chapter: { select: { chapter_id: true, title: true } },
      _count: { select: { submissions: true } },
    },
  });

  if (!event) return null;

  let userSubmission = null;
  if (userId) {
    userSubmission = await prisma.plot_twist_submissions.findUnique({
      where: { event_id_user_id: { event_id: event.event_id, user_id: userId } },
      select: { submission_id: true, moderation_status: true, created_at: true },
    });
  }

  const slotsLeft = Math.max(0, event.max_submissions - event._count.submissions);

  return {
    eventId: event.event_id,
    storyId: event.story_id,
    chapterId: event.chapter_id,
    status: event.status,
    closesAt: event.closes_at,
    maxSubmissions: event.max_submissions,
    submissionCount: event._count.submissions,
    slotsLeft,
    votingEnabled: event.voting_enabled,
    storyTitle: event.story?.title,
    chapterTitle: event.chapter?.title,
    userHasSubmitted: !!userSubmission,
    userSubmission,
  };
};

export const submitPlotTwist = async (
  userId,
  eventId,
  { cardId, twistTitle, twistDescription, whyFits }
) => {
  await expireStaleEvents();

  const event = await prisma.plot_twist_events.findUnique({
    where: { event_id: eventId },
    include: {
      story: { select: { title: true } },
      chapter: { select: { title: true } },
      submissions: { select: { twist_title: true } },
      _count: { select: { submissions: true } },
    },
  });

  if (!event) throw Object.assign(new Error("Event not found."), { status: 404 });
  if (event.status !== EVENT_STATUS.OPEN) {
    throw Object.assign(new Error("This plot twist window is closed."), { status: 400 });
  }
  if (new Date() > event.closes_at) {
    throw Object.assign(new Error("Submission window has ended."), { status: 400 });
  }
  if (event._count.submissions >= event.max_submissions) {
    throw Object.assign(new Error("All submission slots are full."), { status: 400 });
  }
  if (event.author_id === userId) {
    throw Object.assign(new Error("Authors cannot submit to their own event."), { status: 403 });
  }

  const existingUser = await prisma.plot_twist_submissions.findUnique({
    where: { event_id_user_id: { event_id: eventId, user_id: userId } },
  });
  if (existingUser) {
    throw Object.assign(new Error("You already submitted to this event."), { status: 409 });
  }

  const card = await prisma.aurora_cards.findFirst({
    where: { card_id: cardId, user_id: userId, status: CARD_STATUS.AVAILABLE },
  });
  if (!card) throw Object.assign(new Error("Invalid or unavailable Aurora Card."), { status: 400 });

  // No AI moderation - writer decides to accept/reject
  const submissionBody = {
    twistTitle,
    twistDescription,
    whyFits,
  };

  const result = await prisma.$transaction(async (tx) => {
    await tx.aurora_cards.update({
      where: { card_id: cardId },
      data: { status: CARD_STATUS.SPENT, spent_at: new Date(), event_id: eventId },
    });

    const submission = await tx.plot_twist_submissions.create({
      data: {
        event_id: eventId,
        user_id: userId,
        card_id: cardId,
        twist_title: (twistTitle || "").trim(),
        twist_description: (twistDescription || "").trim(),
        why_fits: (whyFits || "").trim(),
        combined_char_count: (twistTitle?.length || 0) + (twistDescription?.length || 0) + (whyFits?.length || 0),
        moderation_status: MODERATION_STATUS.APPROVED, // Auto-approve, writer decides
        quality_score: 80, // Default score
        originality_label: "Creative",
        excitement_label: "Exciting",
      },
    });

    await tx.plot_twist_contributors.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        total_submissions: 1,
      },
      update: { total_submissions: { increment: 1 } },
    });

    if (event._count.submissions + 1 >= event.max_submissions) {
      await tx.plot_twist_events.update({
        where: { event_id: eventId },
        data: { status: EVENT_STATUS.CLOSED, closed_at: new Date() },
      });
    }

    return submission;
  });

  tryAward(userId, ACTIVITY_TYPES.PLOT_TWIST_APPROVED, {
    referenceType: "plot_twist_submission",
    referenceId: result.submission_id,
  });

  return {
    submissionId: result.submission_id,
    moderationStatus: MODERATION_STATUS.APPROVED,
    qualityScore: 80,
    message: "Plot twist submitted! The writer will review and decide.",
  };
};


export const getAuthorEventDashboard = async (authorId, eventId) => {
  await expireStaleEvents();

  const event = await prisma.plot_twist_events.findFirst({
    where: { event_id: eventId, author_id: authorId },
    include: {
      story: { select: { story_id: true, title: true } },
      chapter: { select: { chapter_id: true, title: true } },
      submissions: {
        orderBy: [{ created_at: "asc" }],
        include: {
          user: {
            select: {
              user_id: true,
              profile: { select: { handle_name: true, nickname: true } },
            },
          },
        },
      },
    },
  });

  if (!event) throw Object.assign(new Error("Event not found."), { status: 404 });

  // Get all chapters for this story (to show in dropdown)
  const allChapters = await prisma.chapters.findMany({
    where: { story_id: event.story_id, is_deleted: false },
    orderBy: { order_index: "asc" },
    select: { chapter_id: true, order_index: true, title: true },
  });

  const submissions = event.submissions || [];

  const topForVoting = [...submissions]
    .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
    .slice(0, PLOT_TWIST_LIMITS.VOTING_TOP_N);

  const communityFavorite = [...submissions].sort(
    (a, b) => b.vote_count - a.vote_count
  )[0];
  const aiFavorite = submissions[0];

  const mapSub = (s, index) => ({
    submissionId: s.submission_id,
    displayNumber: index + 1,
    twistTitle: s.twist_title,
    twistDescription: s.twist_description,
    whyFits: s.why_fits,
    qualityScore: s.quality_score,
    originality: s.originality_label,
    excitement: s.excitement_label,
    voteCount: s.vote_count,
    moderationStatus: s.moderation_status,
    authorStatus: s.author_status,
    submitter: {
      userId: s.user_id,
      handle:
        s.user?.profile?.handle_name ||
        s.user?.profile?.nickname ||
        `Reader${s.user_id}`,
    },
  });

  return {
    eventId: event.event_id,
    storyId: event.story_id,
    chapterId: event.chapter_id,
    status: event.status,
    storyTitle: event.story?.title,
    chapterTitle: event.chapter?.title,
    closesAt: event.closes_at,
    authorDecision: event.author_decision,
    submissions: event.submissions.map(mapSub),
    chapters: allChapters.map((c) => ({
      chapterId: c.chapter_id,
      chapterNumber: c.order_index + 1,
      title: c.title,
    })),
    insights: {
      communityFavoriteId: communityFavorite?.submission_id ?? null,
      aiFavoriteId: aiFavorite?.submission_id ?? null,
      votingPool: topForVoting.map((s, i) => mapSub(s, i)),
    },
  };
};

export const voteOnSubmission = async (userId, submissionId) => {
  const submission = await prisma.plot_twist_submissions.findUnique({
    where: { submission_id: submissionId },
    include: { event: true },
  });
  if (!submission) throw Object.assign(new Error("Submission not found."), { status: 404 });
  if (!submission.event.voting_enabled) {
    throw Object.assign(new Error("Voting is disabled for this event."), { status: 400 });
  }
  if (submission.event.status === EVENT_STATUS.EXPIRED) {
    throw Object.assign(new Error("Event has expired."), { status: 400 });
  }
  if (submission.moderation_status !== MODERATION_STATUS.APPROVED) {
    throw Object.assign(new Error("Cannot vote on this submission."), { status: 400 });
  }

  try {
    await prisma.$transaction([
      prisma.plot_twist_votes.create({
        data: { submission_id: submissionId, user_id: userId },
      }),
      prisma.plot_twist_submissions.update({
        where: { submission_id: submissionId },
        data: { vote_count: { increment: 1 } },
      }),
    ]);
    return { success: true };
  } catch (err) {
    if (err.code === "P2002") {
      throw Object.assign(new Error("You already voted on this submission."), { status: 409 });
    }
    throw err;
  }
};

export const resolveAuthorDecision = async (
  authorId,
  eventId,
  { decision, acceptedSubmissionIds = [], creditChapterId, creditNote, twistTitle, twistText }
) => {
  const event = await prisma.plot_twist_events.findFirst({
    where: { event_id: eventId, author_id: authorId },
    include: { submissions: { include: { user: { include: { profile: true } } } } },
  });
  if (!event) throw Object.assign(new Error("Event not found."), { status: 404 });

  const validDecisions = ["accept", "combine", "reject"];
  if (!validDecisions.includes(decision)) {
    throw Object.assign(new Error("Invalid decision."), { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.plot_twist_events.update({
      where: { event_id: eventId },
      data: {
        status: EVENT_STATUS.REVIEWED,
        reviewed_at: new Date(),
        author_decision: decision,
      },
    });

    const acceptedSet = new Set(acceptedSubmissionIds.map(Number));

    for (const sub of event.submissions) {
      const isAccepted =
        decision !== "reject" && acceptedSet.has(sub.submission_id);
      await tx.plot_twist_submissions.update({
        where: { submission_id: sub.submission_id },
        data: {
          author_status: isAccepted ? "accepted" : decision === "reject" ? "rejected" : "not_selected",
        },
      });

      if (isAccepted) {
        const contrib = await tx.plot_twist_contributors.upsert({
          where: { user_id: sub.user_id },
          create: {
            user_id: sub.user_id,
            accepted_count: 1,
            stories_influenced: 1,
            total_submissions: 1,
            approval_rate: 1,
            influencer_level: 1,
          },
          update: {
            accepted_count: { increment: 1 },
            stories_influenced: { increment: 1 },
          },
        });

        const total = contrib.total_submissions || 1;
        const rate = contrib.accepted_count / total;
        const level = Math.min(20, 1 + Math.floor(contrib.accepted_count / 2));

        await tx.plot_twist_contributors.update({
          where: { user_id: sub.user_id },
          data: { approval_rate: rate, influencer_level: level },
        });

        // Award points for accepted submission (per submission, idempotent via referenceId)
        tryAward(sub.user_id, ACTIVITY_TYPES.PLOT_TWIST_ACCEPTED, {
          referenceType: "plot_twist_submission_accepted",
          referenceId: sub.submission_id,
        });
      }
    }

    if (decision !== "reject" && acceptedSubmissionIds.length && creditChapterId) {
      // Get first accepted submission's content for display in chapter
      const firstAccepted = event.submissions.find(
        (s) => acceptedSet.has(s.submission_id)
      );
      const credit = await tx.plot_twist_chapter_credits.create({
        data: {
          event_id: eventId,
          chapter_id: creditChapterId,
          credit_note: creditNote || null,
          twist_title: twistTitle || firstAccepted?.twist_title || null,
          twist_text: twistText || firstAccepted?.twist_description || null,
        },
      });

      // Award points for author credit decisions
      // - author gets points once per credit
      // - each credited submission's author gets points once per credit
      tryAward(authorId, ACTIVITY_TYPES.PLOT_TWIST_CREDITED, {
        referenceType: "plot_twist_credit",
        referenceId: credit.credit_id,
      });

      for (const subId of acceptedSubmissionIds) {
        const sub = event.submissions.find((s) => s.submission_id === Number(subId));
        if (!sub) continue;

        await tx.plot_twist_credit_contributors.create({
          data: {
            credit_id: credit.credit_id,
            user_id: sub.user_id,
            submission_id: sub.submission_id,
            display_handle:
              sub.user?.profile?.handle_name ||
              sub.user?.profile?.nickname ||
              `Reader${sub.user_id}`,
          },
        });

        tryAward(sub.user_id, ACTIVITY_TYPES.PLOT_TWIST_CREDITED, {
          referenceType: "plot_twist_credit_submission",
          referenceId: sub.submission_id,
        });
      }
    }

  });

  return { success: true, decision };
};

export const getHallOfFame = async ({ limit = 20 } = {}) => {
  const topContributors = await prisma.plot_twist_contributors.findMany({
    where: { accepted_count: { gt: 0 } },
    orderBy: [{ accepted_count: "desc" }, { approval_rate: "desc" }],
    take: limit,
    include: {
      user: {
        select: {
          profile: { select: { handle_name: true, nickname: true, profile_image: true } },
        },
      },
    },
  });

  const recentAccepted = await prisma.plot_twist_submissions.findMany({
    where: { author_status: "accepted" },
    orderBy: { created_at: "desc" },
    take: limit,
    include: {
      event: {
        include: {
          story: { select: { story_id: true, title: true } },
          chapter: { select: { title: true } },
        },
      },
      user: {
        select: { profile: { select: { handle_name: true } } },
      },
    },
  });

  return {
    topContributors: topContributors.map((c) => ({
      userId: c.user_id,
      handle:
        c.user?.profile?.handle_name ||
        c.user?.profile?.nickname ||
        `Reader${c.user_id}`,
      profileImage: c.user?.profile?.profile_image,
      acceptedCount: c.accepted_count,
      storiesInfluenced: c.stories_influenced,
      approvalRate: c.approval_rate,
      influencerLevel: c.influencer_level,
    })),
    recentAcceptedTwists: recentAccepted.map((s) => ({
      submissionId: s.submission_id,
      twistTitle: s.twist_title,
      storyId: s.event?.story_id,
      storyTitle: s.event?.story?.title,
      chapterTitle: s.event?.chapter?.title,
      handle: s.user?.profile?.handle_name,
      qualityScore: s.quality_score,
    })),
  };
};

export const getChapterCredits = async (chapterId) => {
  const credit = await prisma.plot_twist_chapter_credits.findFirst({
    where: { chapter_id: chapterId },
    include: { contributors: true },
  });
  if (!credit) return null;
  return {
    creditNote: credit.credit_note,
    twistTitle: credit.twist_title,
    twistText: credit.twist_text,
    contributors: credit.contributors.map((c) => ({
      handle: c.display_handle,
      userId: c.user_id,
    })),
  };
};

export const listAuthorEvents = async (authorId, storyId = null) => {
  await expireStaleEvents();
  const where = { author_id: authorId };
  if (storyId) where.story_id = storyId;

  const events = await prisma.plot_twist_events.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      story: { select: { title: true } },
      chapter: { select: { title: true } },
      _count: { select: { submissions: true } },
    },
  });

  return events.map((e) => ({
    eventId: e.event_id,
    storyId: e.story_id,
    chapterId: e.chapter_id,
    status: e.status,
    closesAt: e.closes_at,
    submissionCount: e._count.submissions,
    storyTitle: e.story?.title,
    chapterTitle: e.chapter?.title,
  }));
};

export const getVotingSubmissions = async (eventId) => {
  const subs = await prisma.plot_twist_submissions.findMany({
    where: {
      event_id: eventId,
      moderation_status: MODERATION_STATUS.APPROVED,
    },
    orderBy: [{ quality_score: "desc" }],
    take: PLOT_TWIST_LIMITS.VOTING_TOP_N,
    select: {
      submission_id: true,
      twist_title: true,
      vote_count: true,
      quality_score: true,
    },
  });
  return subs;
};

export const getRarityLimits = (rarity) => {
  if (rarity === CARD_RARITY.LEGENDARY) {
    return { maxCombined: 500, priorityReview: true };
  }
  if (rarity === CARD_RARITY.RARE) {
    return { maxCombined: 500, priorityReview: true };
  }
  return { maxCombined: 500, priorityReview: false };
};
