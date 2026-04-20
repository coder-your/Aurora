import * as service from "../services/recommendation.service.js";
import { CATEGORIES, TAGS } from "../constants.js";

/**
 * Extract pagination params from query
 */
const getPaginationParams = (query) => ({
  skip: query.skip ? Number(query.skip) : 0,
  limit: query.limit ? Number(query.limit) : 20,
});

export const getByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const pagination = getPaginationParams(req.query);
    const result = await service.getStoriesByCategory(category, pagination);
    res.json(result);
  } catch (error) {
    console.error("getByCategory error:", error);
    res.status(500).json({ error: "Failed to fetch stories by category" });
  }
};

export const getByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const pagination = getPaginationParams(req.query);
    const result = await service.getStoriesByTag(tag, pagination);
    res.json(result);
  } catch (error) {
    console.error("getByTag error:", error);
    res.status(500).json({ error: "Failed to fetch stories by tag" });
  }
};

export const getByMood = async (req, res) => {
  try {
    const { mood } = req.params;
    const pagination = getPaginationParams(req.query);
    const result = await service.getStoriesByMood(mood, pagination);
    res.json(result);
  } catch (error) {
    console.error("getByMood error:", error);
    res.status(500).json({ error: "Failed to fetch stories by mood" });
  }
};

export const getStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await service.getStoryDetails(Number(id));
    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }
    res.json(story);
  } catch (error) {
    console.error("getStory error:", error);
    res.status(500).json({ error: "Failed to fetch story details" });
  }
};

export const search = async (req, res) => {
  try {
    const { q } = req.query;
    const pagination = getPaginationParams(req.query);
    const result = await service.searchStoriesOrAuthors(q, pagination);
    res.json(result);
  } catch (error) {
    console.error("search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
};

export const addToBeRead = async (req, res) => {
  try {
    const { userId, storyId } = req.body;
    if (!userId || !storyId) {
      return res.status(400).json({ error: "userId and storyId are required" });
    }
    const result = await service.addToBeReadList(Number(userId), Number(storyId));
    res.json(result);
  } catch (error) {
    console.error("addToBeRead error:", error);
    res.status(500).json({ error: "Failed to add to reading list" });
  }
};

export const personalized = async (req, res) => {
  try {
    const { userId } = req.params;
    const pagination = getPaginationParams(req.query);
    const result = await service.getPersonalizedRecommendations(Number(userId), pagination);
    res.json(result);
  } catch (error) {
    console.error("personalized error:", error);
    res.status(500).json({ error: "Failed to fetch personalized recommendations" });
  }
};

export const trending = async (req, res) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await service.getTrendingStories(pagination);
    res.json(result);
  } catch (error) {
    console.error("trending error:", error);
    res.status(500).json({ error: "Failed to fetch trending stories" });
  }
};

export const becauseYouLoved = async (req, res) => {
  try {
    const { storyId } = req.params;
    const pagination = getPaginationParams(req.query);
    const result = await service.getBecauseYouLoved(Number(storyId), pagination);
    res.json(result);
  } catch (error) {
    console.error("becauseYouLoved error:", error);
    res.status(500).json({ error: "Failed to fetch similar stories" });
  }
};

export const recentlyUpdated = async (req, res) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await service.getRecentlyUpdated(pagination);
    res.json(result);
  } catch (error) {
    console.error("recentlyUpdated error:", error);
    res.status(500).json({ error: "Failed to fetch recent stories" });
  }
};

export const highRated = async (req, res) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await service.getHighRatedStories(pagination);
    res.json(result);
  } catch (error) {
    console.error("highRated error:", error);
    res.status(500).json({ error: "Failed to fetch high-rated stories" });
  }
};

export const getCategories = (req, res) => {
  res.json(CATEGORIES);
};

export const getTags = (req, res) => {
  res.json(TAGS);
};

export const getFeedTypes = (req, res) => {
  const feeds = service.getFeedTypes();
  res.json(feeds);
};

export const getByFeed = async (req, res) => {
  try {
    const { feedType } = req.params;
    const { userId } = req.query;
    const pagination = getPaginationParams(req.query);
    const result = await service.getStoriesByFeed(feedType, { 
      ...pagination,
      userId: userId ? Number(userId) : null,
    });
    res.json(result);
  } catch (error) {
    console.error("getByFeed error:", error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
};

export const hiddenGems = async (req, res) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await service.getHiddenGems(pagination);
    res.json(result);
  } catch (error) {
    console.error("hiddenGems error:", error);
    res.status(500).json({ error: "Failed to fetch hidden gems" });
  }
};
