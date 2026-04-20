import { getCommentIntelligence } from "../services/commentIntelligence.service.js";
import { getPredictiveSuccessScore } from "../services/successScore.service.js";

export const commentIntelligence = async (req, res) => {
  try {
    const writerId = req.user.user_id;
    const storyId = req.query.storyId ? Number(req.query.storyId) : null;
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));

    const result = await getCommentIntelligence(writerId, storyId, days);
    return res.json(result);
  } catch (err) {
    console.error("commentIntelligence error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const successScore = async (req, res) => {
  try {
    const writerId = req.user.user_id;
    const storyId = Number(req.params.storyId);

    if (!storyId) {
      return res.status(400).json({ message: "Invalid storyId" });
    }

    const story = await import("../utils/prisma.js").then((m) =>
      m.default.stories.findUnique({
        where: { story_id: storyId },
        select: { author_id: true, is_deleted: true },
      })
    );

    if (!story || story.is_deleted) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (story.author_id !== writerId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const result = await getPredictiveSuccessScore(storyId);
    if (!result) {
      return res.status(404).json({ message: "Story not found" });
    }

    return res.json(result);
  } catch (err) {
    console.error("successScore error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
