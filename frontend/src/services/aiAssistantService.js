import api from "./api";

export const getCapabilities = () => api.get("/api/ai-assistant/capabilities");

export const getAIUsage = (storyId) => api.get(`/api/ai-assistant/usage/${storyId}`);

export const requestAIAssistance = (storyId, data) =>
  api.post(`/api/ai-assistant/assist/${storyId}`, data);
