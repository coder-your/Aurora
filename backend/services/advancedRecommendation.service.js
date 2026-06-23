import prisma from "../utils/prisma.js";
import {
  generateStoryEmbedding,
  generateUserEmbedding,
  cosineSimilarity,
  getStoryEmbedding,
  getUserEmbedding,
} from "./embeddingService.js";

/**
 * Advanced Recommendation Service
 * Combines multiple signals for intelligent story recommendations:
 * 1. Embedding-based similarity (vector cosine similarity)
 * 2. User preference matching (genres, themes, emotions)
 * 3. Collaborative filtering (similar readers)
 * 4. Trending and freshness signals
 * 5. Author affinity and network effects
 */

// Calculate similarity score between user and story using embeddings
const calculateEmbeddingSimilarity = (userEmbedding, storyEmbedding) => {
  if (!userEmbedding || !storyEmbedding) return 0;

  try {
    const userVec = JSON.parse(userEmbedding.embedding_vector || "[]");
    const storyVec = JSON.parse(storyEmbedding.embedding_vector || "[]");
    return Math.max(0, cosineSimilarity(userVec, storyVec));
  } catch (error) {
    console.warn("Embedding similarity calculation error:", error.message);
    return 0;
  }
};

// Calculate preference match score
const calculatePreferenceMatch = (userAnalysis, storyAnalysis) => {
  if (!storyAnalysis) return 0;

  let matchScore = 0;
  let totalWeight = 0;

  try {
    // Genre matching (weight: 0.3)
    if (userAnalysis.favorite_genres && storyAnalysis.genres) {
      const storyGenres = JSON.parse(storyAnalysis.genres || "[]");
      const matchingGenres = storyGenres.filter((g) =>
        userAnalysis.favorite_genres.includes(g)
      );
      matchScore += (matchingGenres.length / Math.max(1, storyGenres.length)) * 0.3;
      totalWeight += 0.3;
    }

    // Theme matching (weight: 0.25)
    if (userAnalysis.favorite_themes && storyAnalysis.primary_themes) {
      const storyThemes = JSON.parse(storyAnalysis.primary_themes || "[]");
      const matchingThemes = storyThemes.filter((t) =>
        userAnalysis.favorite_themes.includes(t)
      );
      matchScore += (matchingThemes.length / Math.max(1, storyThemes.length)) * 0.25;
      totalWeight += 0.25;
    }

    // Emotion matching (weight: 0.2)
    if (userAnalysis.favorite_emotions && storyAnalysis.emotions) {
      const storyEmotions = JSON.parse(storyAnalysis.emotions || "[]");
      const matchingEmotions = storyEmotions.filter((e) =>
        userAnalysis.favorite_emotions.includes(e)
      );
      matchScore += (matchingEmotions.length / Math.max(1, storyEmotions.length)) * 0.2;
      totalWeight += 0.2;
    }

    // Tone matching (weight: 0.15)
    if (userAnalysis.favorite_tones && storyAnalysis.tone) {
      if (userAnalysis.favorite_tones.includes(storyAnalysis.tone)) {
        matchScore += 0.15;
      }
      totalWeight += 0.15;
    }

    // Complexity match (weight: 0.1)
    if (userAnalysis.preferred_complexity && storyAnalysis.complexity_level) {
      if (userAnalysis.preferred_complexity === storyAnalysis.complexity_level) {
        matchScore += 0.1;
      }
      totalWeight += 0.1;
    }

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  } catch (error) {
    console.warn("Preference match calculation error:", error.message);
    return 0;
  }
};

// Calculate trending score
const calculateTrendingScore = (story, timeWindowDays = 30) => {
  try {
    const daysOld = (Date.now() - new Date(story.last_updated).getTime()) / (1000 * 60 * 60 * 24);

    // Decay over time (half-life of timeWindowDays)
    const trendDecay = Math.pow(0.5, daysOld / timeWindowDays);

    // Recent updates boost
    if (daysOld < 7) return 0.8 * trendDecay;
    if (daysOld < 14) return 0.6 * trendDecay;
    if (daysOld < 30) return 0.4 * trendDecay;

    return 0.2 * trendDecay;
  } catch (error) {
    return 0;
  }
};

// Get user's reading analysis profile
const getUserAnalysisProfile = async (userId) => {
  try {
    // Aggregate user's liked stories' analyses
    const likes = await prisma.story_likes.findMany({
      where: { user_id: userId },
      take: 60,
      include: { story: { include: { story_analysis: true } } },
    });

    const profile = {
      favorite_genres: [],
      favorite_themes: [],
      favorite_emotions: [],
      favorite_tones: [],
      preferred_complexity: "intermediate",
    };

    const genreCounter = {};
    const themeCounter = {};
    const emotionCounter = {};
    const toneCounter = {};

    for (const like of likes) {
      if (like.story?.story_analysis) {
        const analysis = like.story.story_analysis;

        // Count genres
        if (analysis.genres) {
          const genres = JSON.parse(analysis.genres);
          genres.forEach((g) => {
            genreCounter[g] = (genreCounter[g] || 0) + 1;
          });
        }

        // Count themes
        if (analysis.primary_themes) {
          const themes = JSON.parse(analysis.primary_themes);
          themes.forEach((t) => {
            themeCounter[t] = (themeCounter[t] || 0) + 1;
          });
        }

        // Count emotions
        if (analysis.emotions) {
          const emotions = JSON.parse(analysis.emotions);
          emotions.forEach((e) => {
            emotionCounter[e] = (emotionCounter[e] || 0) + 1;
          });
        }

        // Count tones
        if (analysis.tone) {
          toneCounter[analysis.tone] = (toneCounter[analysis.tone] || 0) + 1;
        }
      }
    }

    // Get top 5 of each
    profile.favorite_genres = Object.entries(genreCounter)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([g]) => g);

    profile.favorite_themes = Object.entries(themeCounter)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([t]) => t);

    profile.favorite_emotions = Object.entries(emotionCounter)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([e]) => e);

    profile.favorite_tones = Object.entries(toneCounter)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([t]) => t);

    return profile;
  } catch (error) {
    console.warn("Error building user analysis profile:", error.message);
    return {};
  }
};

// Main recommendation engine
export const getPersonalizedRecommendations = async (userId, limit = 20) => {
  try {
    // Get user's read and liked stories (to exclude)
    const [readStories, likedStories, userEmbedding] = await Promise.all([
      prisma.user_read_history.findMany({
        where: { user_id: userId },
        select: { story_id: true },
        take: 200,
      }),
      prisma.story_likes.findMany({
        where: { user_id: userId },
        select: { story_id: true },
        take: 200,
      }),
      generateUserEmbedding(userId),
    ]);

    const excludedStoryIds = new Set([
      ...readStories.map((r) => r.story_id),
      ...likedStories.map((l) => l.story_id),
    ]);

    // Get user's preference profile
    const userProfile = await getUserAnalysisProfile(userId);

    // Get all published stories not in exclusion set
    const allStories = await prisma.stories.findMany({
      where: {
        visibility: "public",
        status: "published",
        is_deleted: false,
        story_id: {
          notIn: Array.from(excludedStoryIds),
        },
      },
      include: {
        story_analysis: true,
        story_embeddings: true,
        _count: {
          select: { story_likes: true },
        },
      },
      take: 500, // Consider top 500 candidates
    });

    // Score and rank each story
    const scoredStories = allStories
      .map((story) => {
        const embeddingSimilarity = userEmbedding
          ? calculateEmbeddingSimilarity(userEmbedding, story.story_embeddings)
          : 0;

        const preferenceMatch = story.story_analysis
          ? calculatePreferenceMatch(userProfile, story.story_analysis)
          : 0;

        const trendingScore = calculateTrendingScore(story);

        // Popularity (normalized engagement)
        const popularityScore = Math.min(1, (story._count.story_likes || 0) / 100);

        // Weighted final score
        const finalScore =
          embeddingSimilarity * 0.4 + // 40% embedding similarity
          preferenceMatch * 0.3 + // 30% preference matching
          popularityScore * 0.15 + // 15% popularity
          trendingScore * 0.15; // 15% freshness/trending

        return {
          story_id: story.story_id,
          title: story.title,
          description: story.description,
          cover_url: story.cover_url,
          category: story.category,
          author_id: story.author_id,
          embedding_similarity: embeddingSimilarity,
          preference_match: preferenceMatch,
          trending_score: trendingScore,
          popularity_score: popularityScore,
          final_score: finalScore,
          story_analysis: story.story_analysis,
          recommendation_reason: generateRecommendationReason(
            embeddingSimilarity,
            preferenceMatch,
            popularityScore,
            trendingScore
          ),
        };
      })
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, limit);

    // Log recommendations for tracking
    for (let i = 0; i < scoredStories.length; i++) {
      await prisma.recommendation_history.create({
        data: {
          user_id: userId,
          story_id: scoredStories[i].story_id,
          rank_position: i + 1,
          similarity_score: scoredStories[i].embedding_similarity,
          weighted_score: scoredStories[i].final_score,
          recommendation_reason: scoredStories[i].recommendation_reason,
        },
      });
    }

    return scoredStories;
  } catch (error) {
    console.error("Recommendation generation error:", error.message);
    throw error;
  }
};

// Generate human-readable reason for recommendation
const generateRecommendationReason = (
  embeddingSimilarity,
  preferenceMatch,
  popularityScore,
  trendingScore
) => {
  const reasons = [];

  if (embeddingSimilarity > 0.7) reasons.push("embedding_match");
  if (preferenceMatch > 0.7) reasons.push("similar_preferences");
  if (popularityScore > 0.6) reasons.push("popular");
  if (trendingScore > 0.6) reasons.push("trending");

  return reasons.length > 0 ? reasons[0] : "recommended";
};

// Get recommendations similar to a specific story
export const getSimilarStories = async (storyId, limit = 10, userId = null) => {
  try {
    const targetStory = await prisma.stories.findUnique({
      where: { story_id: storyId },
      include: {
        story_embeddings: true,
        story_analysis: true,
      },
    });

    if (!targetStory) throw new Error("Story not found");

    // Get embeddings for all similar stories
    const stories = await prisma.stories.findMany({
      where: {
        visibility: "public",
        status: "published",
        is_deleted: false,
        story_id: { not: storyId },
      },
      include: {
        story_embeddings: true,
        story_analysis: true,
      },
      take: 200,
    });

    // Score by similarity
    const similar = stories
      .map((story) => ({
        ...story,
        similarity: calculateEmbeddingSimilarity(
          targetStory.story_embeddings,
          story.story_embeddings
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similar;
  } catch (error) {
    console.error("Similar stories error:", error.message);
    throw error;
  }
};

// Update user embedding based on new interaction
export const updateUserEmbeddingOnInteraction = async (userId, interactionType) => {
  try {
    // Only regenerate on significant interactions
    if (["like", "bookmark", "reading_session_complete"].includes(interactionType)) {
      await generateUserEmbedding(userId);
    }
  } catch (error) {
    console.warn("Error updating user embedding:", error.message);
  }
};
