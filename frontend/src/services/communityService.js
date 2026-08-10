import api from './api';

export const listCommunityThreads = (params = {}) =>
  api.get('/api/community/threads', { params });

export const getCommunityExplore = () => api.get('/api/community/explore');

export const listCommunityAuthors = (params = {}) =>
  api.get('/api/community/authors', { params });

export const getCommunityAuthor = (authorId) =>
  api.get(`/api/community/authors/${authorId}`);

export const getCommunityGenre = (genre) =>
  api.get(`/api/community/genres/${encodeURIComponent(genre)}`);

export const getCommunityBook = (storyId) =>
  api.get(`/api/community/books/${storyId}`);

export const followCommunityChannel = (payload) =>
  api.post('/api/community/follow', payload);

export const unfollowCommunityChannel = (payload) =>
  api.post('/api/community/unfollow', payload);

export const getMyFollowing = () => api.get('/api/community/following');

export const createCommunityThread = (payload) => api.post('/api/community/threads', payload);
export const deleteCommunityThread = (threadId) => api.delete(`/api/community/threads/${threadId}`);
export const createCommunityReply = (threadId, payload) => api.post(`/api/community/threads/${threadId}/replies`, payload);
export const voteCommunityThread = (threadId, voteType) => api.post(`/api/community/threads/${threadId}/vote`, { vote_type: voteType });
export const voteCommunityReply = (replyId, voteType) => api.post(`/api/community/replies/${replyId}/vote`, { vote_type: voteType });
export const saveCommunityThread = (threadId) => api.post(`/api/community/threads/${threadId}/save`);
export const searchBooks = (query) => api.get('/api/books', { params: { q: query } });
