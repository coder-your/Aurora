import {
  openPlotTwistEvent,
  getEventForChapter,
  submitPlotTwist,
  getAuthorEventDashboard,
  voteOnSubmission,
  resolveAuthorDecision,
  getHallOfFame,
  getChapterCredits,
  listAuthorEvents,
  getVotingSubmissions,
} from "../services/plotTwist.service.js";


export const createEvent = async (req, res) => {
  try {
    const authorId = req.user.user_id;
    const storyId = Number(req.params.storyId);
    const { chapterId, maxSubmissions, votingEnabled } = req.body;

    if (!chapterId) {
      return res.status(400).json({ message: "chapterId is required." });
    }

    const event = await openPlotTwistEvent(authorId, {
      storyId,
      chapterId: Number(chapterId),
      maxSubmissions: maxSubmissions ? Number(maxSubmissions) : undefined,
      votingEnabled,
    });

    return res.status(201).json({
      eventId: event.event_id,
      closesAt: event.closes_at,
      status: event.status,
      message: "Plot twist submission window is now open.",
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("createEvent:", err);
    return res.status(status).json({ message: err.message || "Failed to open event." });
  }
};

export const getChapterEvent = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapterId);
    const event = await getEventForChapter(chapterId, req.user?.user_id);
    return res.json({ event });
  } catch (err) {
    console.error("getChapterEvent:", err);
    return res.status(500).json({ message: "Failed to load plot twist event." });
  }
};

export const postSubmission = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const { cardId, twistTitle, twistDescription, whyFits } = req.body;

    if (!cardId || !twistTitle || !twistDescription || !whyFits) {
      return res.status(400).json({
        message: "cardId, twistTitle, twistDescription, and whyFits are required.",
      });
    }

    const result = await submitPlotTwist(req.user.user_id, eventId, {
      cardId: Number(cardId),
      twistTitle,
      twistDescription,
      whyFits,
    });

    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("postSubmission:", err);
    return res.status(status).json({ message: err.message || "Submission failed." });
  }
};

export const authorDashboard = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const dashboard = await getAuthorEventDashboard(req.user.user_id, eventId);
    return res.json(dashboard);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("authorDashboard:", err);
    return res.status(status).json({ message: err.message || "Failed to load dashboard." });
  }
};

export const listMyEvents = async (req, res) => {
  try {
    const storyId = req.query.storyId ? Number(req.query.storyId) : null;
    const events = await listAuthorEvents(req.user.user_id, storyId);
    return res.json({ events });
  } catch (err) {
    console.error("listMyEvents:", err);
    return res.status(500).json({ message: "Failed to list events." });
  }
};

export const postVote = async (req, res) => {
  try {
    const submissionId = Number(req.params.submissionId);
    await voteOnSubmission(req.user.user_id, submissionId);
    return res.json({ success: true });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("postVote:", err);
    return res.status(status).json({ message: err.message || "Vote failed." });
  }
};

export const postDecision = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const { decision, acceptedSubmissionIds, creditChapterId, creditNote } = req.body;

    const result = await resolveAuthorDecision(req.user.user_id, eventId, {
      decision,
      acceptedSubmissionIds: acceptedSubmissionIds || [],
      creditChapterId: creditChapterId ? Number(creditChapterId) : null,
      creditNote,
    });

    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("postDecision:", err);
    return res.status(status).json({ message: err.message || "Failed to save decision." });
  }
};

export const hallOfFame = async (req, res) => {
  try {
    const data = await getHallOfFame({ limit: Number(req.query.limit) || 20 });
    return res.json(data);
  } catch (err) {
    console.error("hallOfFame:", err);
    return res.status(500).json({ message: "Failed to load hall of fame." });
  }
};

export const chapterCredits = async (req, res) => {

  try {
    const chapterId = Number(req.params.chapterId);
    const credits = await getChapterCredits(chapterId);
    return res.json({ credits });
  } catch (err) {
    console.error("chapterCredits:", err);
    return res.status(500).json({ message: "Failed to load credits." });
  }
};

export const chapterTwistMentions = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapterId);
    if (!chapterId) {
      return res.status(400).json({ message: "Invalid chapterId" });
    }

    const credits = await getChapterCredits(chapterId);
    const contributors = credits?.contributors || [];

    return res.json({
      mentions: contributors.map((c) => ({
        userId: c.userId,
        handle: c.handle,
      })),
    });
  } catch (err) {
    console.error("chapterTwistMentions:", err);
    return res.status(500).json({ message: "Failed to load twist mentions." });
  }
};

export const votingPool = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const subs = await getVotingSubmissions(eventId);
    return res.json({ submissions: subs });
  } catch (err) {
    console.error("votingPool:", err);
    return res.status(500).json({ message: "Failed to load voting pool." });
  }
};
