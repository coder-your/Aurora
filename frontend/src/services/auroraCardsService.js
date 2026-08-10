import api from "./api.js";

const base = "/api/aurora-cards";

export const getMyEngagement = () => api.get(`${base}/engagement/me`);

export const getMyContributorProfile = () => api.get(`${base}/contributors/me`);

export const getHallOfFame = (limit = 20) =>
  api.get(`${base}/hall-of-fame`, { params: { limit } });

export const getChapterPlotTwistEvent = (chapterId) =>
  api.get(`${base}/chapters/${chapterId}/event`);

export const getChapterCredits = (chapterId) =>
  api.get(`${base}/chapters/${chapterId}/credits`);

export const getChapterTwistMentions = (chapterId) =>
  api.get(`${base}/chapters/${chapterId}/twist-mentions`);


export const submitPlotTwist = (eventId, payload) =>
  api.post(`${base}/events/${eventId}/submit`, payload);

export const votePlotTwist = (submissionId) =>
  api.post(`${base}/submissions/${submissionId}/vote`);

export const getVotingPool = (eventId) =>
  api.get(`${base}/events/${eventId}/voting-pool`);

export const openPlotTwistEvent = (storyId, payload) =>
  api.post(`${base}/stories/${storyId}/events`, payload);

export const listMyPlotTwistEvents = (storyId) =>
  api.get(`${base}/events/me`, { params: storyId ? { storyId } : {} });

export const getPlotTwistDashboard = (eventId) =>
  api.get(`${base}/events/${eventId}/dashboard`);

export const resolvePlotTwistDecision = (eventId, payload) =>
  api.post(`${base}/events/${eventId}/decision`, payload);
