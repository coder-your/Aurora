import {
  getPersonalizedRecommendations,
  getSimilarStories,
} from "../services/advancedRecommendation.service.js";
import {
  trackRecommendationInteraction,
  trackRecommendationClick,
  trackRecommendationCompletion,
  submitRecommendationFeedback,
  getRecommendationStats,
  getRecommendationHistory,
  getRecommendationInsights,
} from "../services/recommendationTracking.service.js";
import { analyzeStory, getStoryAnalysis } from "../services/storyAnalysis.service.js";
import { generateStoryEmbedding, generateUserEmbedding } from "../services/embeddingService.js";

/**
 * Recommendation Controller
 * Handles all API endpoints for the AI-powered discovery system
 */

// GET /api/recommendations/personalized
// Get personalized story recommendations for the user
export const getPersonalizedDiscovery = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const recommendations = await getPersonalizedRecommendations(userId, limit);

    return res.json({
      message: "Personalized recommendations generated",
      recommendations,
      total: recommendations.length,
    });
  } catch (error) {
    console.error("Personalized discovery error:", error.message);
    return res.status(500).json({
      error: "Failed to generate recommendations",
      details: error.message,
    });
  }
};

// GET /api/recommendations/similar/:storyId
// Get stories similar to a specific story
export const getSimilarStoriesHandler = async (req, res) => {
  try {
    const { storyId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const userId = req.user?.id;

    const similar = await getSimilarStories(storyId, limit, userId);

    return res.json({
      message: "Similar stories retrieved",
      story_id: storyId,
      similar_stories: similar,
      total: similar.length,
    });
  } catch (error) {
    console.error("Similar stories error:", error.message);
    return res.status(500).json({
      error: "Failed to find similar stories",
      details: error.message,
    });
  }
};

// POST /api/recommendations/track/click
// Track when user clicks on a recommendation
export const trackRecommendationClickHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { story_id, rank_position } = req.body;

    if (!story_id) {
      return res.status(400).json({ error: "story_id is required" });
    }

    const result = await trackRecommendationClick(userId, story_id, rank_position);

    return res.json({ message: "Recommendation click tracked", ...result });
  } catch (error) {
    console.error("Track click error:", error.message);
    return res.status(500).json({
      error: "Failed to track recommendation click",
      details: error.message,
    });
  }
};

// POST /api/recommendations/track/interaction
// Track various user interactions (skip, like, dislike, etc.)
export const trackInteractionHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { story_id, interaction_type } = req.body;

    if (!story_id || !interaction_type) {
      return res.status(400).json({
        error: "story_id and interaction_type are required",
      });
    }

    const result = await trackRecommendationInteraction(userId, story_id, interaction_type);

    return res.json({
      message: "Interaction tracked",
      ...result,
    });
  } catch (error) {
    console.error("Track interaction error:", error.message);
    return res.status(500).json({
      error: "Failed to track interaction",
      details: error.message,
    });
  }
};

// POST /api/recommendations/track/completion
// Track when user completes reading a recommended story
export const trackCompletionHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { story_id, rank_position } = req.body;

    if (!story_id) {
      return res.status(400).json({ error: "story_id is required" });
    }

    const result = await trackRecommendationCompletion(userId, story_id, rank_position);

    return res.json({
      message: "Story completion tracked",
      ...result,
    });
  } catch (error) {
    console.error("Track completion error:", error.message);
    return res.status(500).json({
      error: "Failed to track completion",
      details: error.message,
    });
  }
};

// POST /api/recommendations/feedback
// Submit user feedback on recommendations
export const submitFeedbackHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { story_id, feedback, rank_position } = req.body;

    if (!story_id || !feedback) {
      return res.status(400).json({
        error: "story_id and feedback are required",
      });
    }

    const result = await submitRecommendationFeedback(
      userId,
      story_id,
      feedback,
      rank_position
    );

    return res.json({
      message: "Feedback submitted successfully",
      ...result,
    });
  } catch (error) {
    console.error("Feedback submission error:", error.message);
    return res.status(500).json({
      error: "Failed to submit feedback",
      details: error.message,
    });
  }
};

// GET /api/recommendations/stats
// Get user's recommendation performance statistics
export const getStatsHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const stats = await getRecommendationStats(userId);

    return res.json({
      message: "Recommendation statistics retrieved",
      stats,
    });
  } catch (error) {
    console.error("Get stats error:", error.message);
    return res.status(500).json({
      error: "Failed to retrieve statistics",
      details: error.message,
    });
  }
};

// GET /api/recommendations/history
// Get recommendation history for user
export const getHistoryHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const history = await getRecommendationHistory(userId, limit);

    return res.json({
      message: "Recommendation history retrieved",
      history,
      total: history.length,
    });
  } catch (error) {
    console.error("Get history error:", error.message);
    return res.status(500).json({
      error: "Failed to retrieve history",
      details: error.message,
    });
  }
};

// GET /api/recommendations/insights
// Get detailed insights about recommendation system performance
export const getInsightsHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const insights = await getRecommendationInsights(userId);

    return res.json({
      message: "Recommendation insights retrieved",
      insights,
    });
  } catch (error) {
    console.error("Get insights error:", error.message);
    return res.status(500).json({
      error: "Failed to retrieve insights",
      details: error.message,
    });
  }
};

// POST /api/recommendations/analyze/:storyId
// Manually analyze a story (admin endpoint)
export const analyzeStoryHandler = async (req, res) => {
  try {
    const { storyId } = req.params;

    if (!storyId) {
      return res.status(400).json({ error: "storyId is required" });
    }

    // Analyze story content
    const analysis = await analyzeStory(parseInt(storyId));

    // Generate embeddings
    const embedding = await generateStoryEmbedding(parseInt(storyId));

    return res.json({
      message: "Story analyzed and embedded successfully",
      analysis,
      embedding: {
        id: embedding.id,
        story_id: embedding.story_id,
        model: embedding.embedding_model,
        created_at: embedding.created_at,
      },
    });
  } catch (error) {
    console.error("Story analysis error:", error.message);
    return res.status(500).json({
      error: "Failed to analyze story",
      details: error.message,
    });
  }
};

// GET /api/recommendations/analysis/:storyId
// Get analysis metadata for a story
export const getAnalysisHandler = async (req, res) => {
  try {
    const { storyId } = req.params;

    if (!storyId) {
      return res.status(400).json({ error: "storyId is required" });
    }

    const analysis = await getStoryAnalysis(parseInt(storyId));

    if (!analysis) {
      return res.status(404).json({
        error: "Story analysis not found. Try analyzing the story first.",
      });
    }

    return res.json({
      message: "Story analysis retrieved",
      analysis,
    });
  } catch (error) {
    console.error("Get analysis error:", error.message);
    return res.status(500).json({
      error: "Failed to retrieve analysis",
      details: error.message,
    });
  }
};
