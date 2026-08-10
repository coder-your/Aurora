import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: `${BASE_URL}/api/recommendations`,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Categories & Tags
export const getCategories = () => api.get("/categories");
export const getTags = () => api.get("/tags");
export const getFeedTypes = () => api.get("/feeds");

// Feed-based recommendations
export const getByFeed = (feedType, params = {}) =>
  api.get(`/feed/${feedType}`, { params });

// Category / Tag / Mood
export const getByCategory = (category, params = {}) =>
  api.get(`/category/${encodeURIComponent(category)}`, { params });

export const getByTag = (tag, params = {}) =>
  api.get(`/tag/${encodeURIComponent(tag)}`, { params });

export const getByMood = (mood, params = {}) =>
  api.get(`/mood/${encodeURIComponent(mood)}`, { params });

// Story details
export const getStoryDetails = (storyId) => api.get(`/story/${storyId}`);

// Search
export const searchStories = (query, params = {}) =>
  api.get("/search", { params: { q: query, ...params } });

// To-Be-Read
export const addToBeRead = (userId, storyId) =>
  api.post("/toberead", { userId, storyId });

// Personalized & trending
export const getPersonalized = (userId, params = {}) =>
  api.get(`/personalized/${userId}`, { params });

export const getTrending = (params = {}) => api.get("/trending", { params });

export const getBecauseYouLoved = (storyId, params = {}) =>
  api.get(`/because/${storyId}`, { params });

/** Gemini-powered “because you loved this” picks with personalized reasons */
export const getGeminiRecommendations = (payload) =>
  api.post("/ai/gemini", payload);

export const getFresh = (params = {}) => api.get("/fresh", { params });

export const getHighRated = (params = {}) => api.get("/high-rated", { params });

export const getHiddenGems = (params = {}) =>
  api.get("/hidden-gems", { params });

// Quote of the Day
export const getQuote = () => api.get("/quote");
export const refreshQuote = () => api.get("/quote/refresh");

export default api;
