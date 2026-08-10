import api from "./api";

export const followWriter = (writerId) => api.post(`/api/follows/${writerId}`);

export const unfollowWriter = (writerId) => api.delete(`/api/follows/${writerId}`);

export const getMyFollowingWriters = () => api.get("/api/me/following");

export const getWriterFollowers = (writerId, params = {}) =>
  api.get(`/api/writers/${writerId}/followers`, { params });
