import prisma from "../utils/prisma.js";
import { updateUserEmbeddingOnInteraction } from "./advancedRecommendation.service.js";

/**
 * Recommendation Tracking Service
 * Tracks all user interactions with recommendations for continuous learning
 * and feedback-based improvement
 */

// Track when a user interacts with a story
export const trackRecommendationInteraction = async (userId, storyId, interactionType) => {
  try {
    // Normalize interaction type
    const validTypes = [
      "skip", // User scrolled past without opening
      "view", // User opened the story card
      "like", // User liked the story
      "dislike", // User actively disliked
      "read", // User started reading
      "bookmark", // User bookmarked
      "comment", // User commented
      "share", // User shared the story
      "hide", // User asked to hide recommendation
    ];

    if (!validTypes.includes(interactionType)) {
      console.warn(`Invalid interaction type: ${interactionType}`);
      return;
    }

    // Determine interaction score (0 = negative, 1 = positive)
    const interactionScores = {
      skip: 0.1, // Weak negative signal
      view: 0.3, // Neutral signal (showed interest)
      like: 0.9, // Strong positive signal
      dislike: 0.05, // Negative signal
      read: 0.8, // Strong positive signal
      bookmark: 0.85, // Strong positive signal
      comment: 0.9, // Very engaged
      share: 0.95, // Very positive signal
      hide: 0.0, // Very negative signal
    };

    const score = interactionScores[interactionType] || 0.5;

    // Record interaction
    await prisma.recommendation_interactions.upsert({
      where: {
        user_id_story_id_interaction_type: {
          user_id: userId,
          story_id: storyId,
          interaction_type: interactionType,
        },
      },
      update: {
        interaction_score: score,
        created_at: new Date(),
      },
      create: {
        user_id: userId,
        story_id: storyId,
        interaction_type: interactionType,
        interaction_score: score,
      },
    });

    // Update user embedding if significant interaction
    await updateUserEmbeddingOnInteraction(userId, interactionType);

    return { success: true, interaction_type: interactionType, score };
  } catch (error) {
    console.error("Tracking interaction error:", error.message);
    throw error;
  }
};

// Track recommendation click/view
export const trackRecommendationClick = async (userId, storyId, rankPosition) => {
  try {
    // Update history record
    await prisma.recommendation_history.updateMany({
      where: {
        user_id: userId,
        story_id: storyId,
        rank_position: rankPosition,
      },
      data: {
        was_clicked: true,
      },
    });

    // Track as interaction
    await trackRecommendationInteraction(userId, storyId, "view");

    return { success: true };
  } catch (error) {
    console.error("Tracking recommendation click error:", error.message);
    throw error;
  }
};

// Track story completion from recommendation
export const trackRecommendationCompletion = async (userId, storyId, rankPosition) => {
  try {
    // Update history record
    await prisma.recommendation_history.updateMany({
      where: {
        user_id: userId,
        story_id: storyId,
        rank_position: rankPosition,
      },
      data: {
        was_completed: true,
      },
    });

    // Track as interaction
    await trackRecommendationInteraction(userId, storyId, "read");

    // Update recommendation stats
    await updateRecommendationStats(userId);

    return { success: true };
  } catch (error) {
    console.error("Tracking completion error:", error.message);
    throw error;
  }
};

// Record user feedback on recommendation
export const submitRecommendationFeedback = async (
  userId,
  storyId,
  feedback,
  rankPosition = null
) => {
  try {
    const validFeedbacks = ["helpful", "not_relevant", "already_read", "not_interested"];

    if (!validFeedbacks.includes(feedback)) {
      throw new Error(`Invalid feedback: ${feedback}`);
    }

    // Update history with feedback
    const where = { user_id: userId, story_id: storyId };
    if (rankPosition) where.rank_position = rankPosition;

    await prisma.recommendation_history.updateMany({
      where,
      data: {
        user_feedback: feedback,
        feedback_at: new Date(),
      },
    });

    // Track negative feedback as dislike
    if (feedback === "not_relevant" || feedback === "not_interested") {
      await trackRecommendationInteraction(userId, storyId, "dislike");
    }

    // Track positive feedback as like
    if (feedback === "helpful") {
      await trackRecommendationInteraction(userId, storyId, "like");
    }

    return { success: true, feedback };
  } catch (error) {
    console.error("Feedback submission error:", error.message);
    throw error;
  }
};

// Update recommendation statistics for user
const updateRecommendationStats = async (userId) => {
  try {
    const history = await prisma.recommendation_history.findMany({
      where: { user_id: userId },
    });

    const totalRecommendations = history.length;
    const totalClicks = history.filter((h) => h.was_clicked).length;
    const totalCompletions = history.filter((h) => h.was_completed).length;

    const clickThroughRate = totalRecommendations > 0 ? totalClicks / totalRecommendations : 0;
    const completionRate = totalClicks > 0 ? totalCompletions / totalClicks : 0;

    await prisma.recommendation_stats.upsert({
      where: { user_id: userId },
      update: {
        total_recommendations: totalRecommendations,
        total_clicks: totalClicks,
        total_completions: totalCompletions,
        click_through_rate: clickThroughRate,
        completion_rate: completionRate,
        last_updated: new Date(),
      },
      create: {
        user_id: userId,
        total_recommendations: totalRecommendations,
        total_clicks: totalClicks,
        total_completions: totalCompletions,
        click_through_rate: clickThroughRate,
        completion_rate: completionRate,
      },
    });

    return { clickThroughRate, completionRate };
  } catch (error) {
    console.error("Updating recommendation stats error:", error.message);
  }
};

// Get user's recommendation performance
export const getRecommendationStats = async (userId) => {
  try {
    const stats = await prisma.recommendation_stats.findUnique({
      where: { user_id: userId },
    });

    if (!stats) {
      return {
        total_recommendations: 0,
        total_clicks: 0,
        total_completions: 0,
        click_through_rate: 0,
        completion_rate: 0,
      };
    }

    return stats;
  } catch (error) {
    console.error("Getting recommendation stats error:", error.message);
    throw error;
  }
};

// Get recent recommendation history for user
export const getRecommendationHistory = async (userId, limit = 50) => {
  try {
    const history = await prisma.recommendation_history.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      include: {
        // Note: You'll need to manually join with stories
      },
      take: limit,
    });

    return history;
  } catch (error) {
    console.error("Getting recommendation history error:", error.message);
    throw error;
  }
};

// Get insights about recommendation effectiveness
export const getRecommendationInsights = async (userId) => {
  try {
    // Get stats
    const stats = await getRecommendationStats(userId);

    // Get recent interactions
    const interactions = await prisma.recommendation_interactions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    // Aggregate interaction types
    const interactionSummary = {};
    interactions.forEach((interaction) => {
      const type = interaction.interaction_type;
      if (!interactionSummary[type]) {
        interactionSummary[type] = { count: 0, avgScore: 0, scores: [] };
      }
      interactionSummary[type].count++;
      interactionSummary[type].scores.push(interaction.interaction_score);
    });

    // Calculate averages
    for (const type in interactionSummary) {
      const scores = interactionSummary[type].scores;
      interactionSummary[type].avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    // Get feedback summary
    const feedbackData = await prisma.recommendation_history.groupBy({
      by: ["user_feedback"],
      _count: true,
      where: { user_id: userId, user_feedback: { not: null } },
    });

    const feedbackSummary = {};
    feedbackData.forEach((fb) => {
      feedbackSummary[fb.user_feedback] = fb._count;
    });

    return {
      stats,
      interaction_summary: interactionSummary,
      feedback_summary: feedbackSummary,
      total_interactions: interactions.length,
    };
  } catch (error) {
    console.error("Getting recommendation insights error:", error.message);
    throw error;
  }
};

// Batch update embeddings for all users based on recent interactions
export const updateAllUserEmbeddings = async () => {
  try {
    const users = await prisma.users.findMany({
      select: { user_id: true },
      take: 100, // Process in batches
    });

    const results = [];
    for (const user of users) {
      try {
        await updateUserEmbeddingOnInteraction(user.user_id, "batch_update");
        results.push({ user_id: user.user_id, success: true });
      } catch (error) {
        console.warn(`Failed to update embeddings for user ${user.user_id}:`, error.message);
        results.push({ user_id: user.user_id, success: false, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error("Batch embedding update error:", error.message);
    throw error;
  }
};
