import api from "./api";

export const getStoryIntro = (storyId) =>
  api.get(`/api/reading/stories/${storyId}/intro`);

export const openReading = (storyId) =>
  api.post("/api/reading/open", { storyId });

export const updateProgress = (payload) =>
  api.patch("/api/reading/progress", payload);

export const addBookmark = (payload) =>
  api.post("/api/reading/bookmarks", payload);

export const getBookmarks = (storyId) =>
  api.get(`/api/reading/bookmarks/${storyId}`);

export const deleteBookmark = (bookmarkId) =>
  api.delete(`/api/reading/bookmarks/${bookmarkId}`);

export const addReadingSession = (payload) =>
  api.post("/api/reading/session-tick", payload);

export const getTodaySummary = () =>
  api.get("/api/reading/today-summary");

// Fetch chapter preview (HTML/raw) by chapter ID using existing backend endpoint
export const getChapterPreview = (chapterId) =>
  api.get(`/api/chapters/${chapterId}/preview`);
