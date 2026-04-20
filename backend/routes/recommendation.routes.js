import express from "express";
import * as controller from "../controllers/recommendation.controller.js";
import * as quoteController from "../controllers/quote.controller.js";

const router = express.Router();

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

// Personalized & trending
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
