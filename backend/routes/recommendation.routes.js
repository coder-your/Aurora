import express from "express";
import * as controller from "../controllers/recommendation.controller.js";
import * as quoteController from "../controllers/quote.controller.js";
import { protect } from "../middleware/protect.js";
import {
  getPersonalizedDiscovery,
  getSimilarStoriesHandler,
  trackRecommendationClickHandler,
  trackInteractionHandler,
  trackCompletionHandler,
  submitFeedbackHandler,
  getStatsHandler,
  getHistoryHandler,
  getInsightsHandler,
  analyzeStoryHandler,
  getAnalysisHandler,
} from "../controllers/recommendationController.js";

const router = express.Router();

// ==================== AI-Powered Discovery System ====================
// Get personalized story recommendations using AI
router.get("/ai/personalized", protect, getPersonalizedDiscovery);

// Get stories similar to a specific story using embeddings
router.get("/ai/similar/:storyId", getSimilarStoriesHandler);

// ==================== Interaction Tracking ====================
// Track various user interactions (skip, like, dislike, etc.)
router.post("/ai/track/click", protect, trackRecommendationClickHandler);
router.post("/ai/track/interaction", protect, trackInteractionHandler);
router.post("/ai/track/completion", protect, trackCompletionHandler);

// ==================== Feedback & Analytics ====================
// Submit user feedback on recommendations
router.post("/ai/feedback", protect, submitFeedbackHandler);

// Get user's recommendation statistics
router.get("/ai/stats", protect, getStatsHandler);

// Get recommendation history
router.get("/ai/history", protect, getHistoryHandler);

// Get detailed insights about recommendation system performance
router.get("/ai/insights", protect, getInsightsHandler);

// ==================== Story Analysis ====================
// Analyze a story and generate embeddings
router.post("/ai/analyze/:storyId", analyzeStoryHandler);

// Get story analysis metadata (genres, themes, emotions, tone, style)
router.get("/ai/analysis/:storyId", getAnalysisHandler);

// ==================== Original Recommendation System ====================
// Get available categories, tags, and feed types
router.get("/categories", controller.getCategories);
router.get("/tags", controller.getTags);
router.get("/feeds", controller.getFeedTypes);

// Feed-based recommendations (all 20 types)
router.get("/feed/:feedType", controller.getByFeed);

// Categories / Tags / Mood
router.get("/category/:category", controller.getByCategory);
router.get("/tag/:tag", controller.getByTag);
router.get("/mood/:mood", controller.getByMood);

// Story details
router.get("/story/:id", controller.getStory);

// Search
router.get("/search", controller.search);

// To-Be-Read
router.post("/toberead", controller.addToBeRead);

// Personalized & trending (original system)
router.get("/personalized/:userId", controller.personalized);
router.get("/trending", controller.trending);
router.get("/because/:storyId", controller.becauseYouLoved);
router.get("/fresh", controller.recentlyUpdated);
router.get("/high-rated", controller.highRated);
router.get("/hidden-gems", controller.hiddenGems);

// Quote of the Day - refresh must come before /quote to avoid route conflict
router.get("/quote/refresh", quoteController.refreshQuote);
router.get("/quote", quoteController.fetchQuote);

export default router;
