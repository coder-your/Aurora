import api from "./api";

export const insightsOverview = () => api.get("/api/insights/overview");

export const insightsBooks = () => api.get("/api/insights/books");

export const insightsBookDetail = (storyId) => api.get(`/api/insights/books/${storyId}`);

export const insightsAudience = () => api.get("/api/insights/audience");

export const insightsEngagement = () => api.get("/api/insights/engagement");

export const insightsCommentIntelligence = (storyId = null, days = 30) => {
  const params = new URLSearchParams();
  if (storyId) params.append("storyId", storyId);
  if (days) params.append("days", days);
  return api.get(`/api/insights/comment-intelligence?${params.toString()}`);
};

export const insightsSuccessScore = (storyId) => api.get(`/api/insights/success-score/${storyId}`);

export const insightsStoryBadges = (storyId) => api.get(`/api/milestones/stories/${storyId}/badges`);

export const publicStoryBadges = (storyId) => api.get(`/api/milestones/public/stories/${storyId}/badges`);

export const publicBadgesBatch = (storyIds) =>
  api.post(`/api/milestones/public/badges/batch`, { storyIds });
