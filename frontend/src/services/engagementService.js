import api from "./api";

export const likeStory = (storyId) => api.post(`/api/stories/${storyId}/like`);

export const unlikeStory = (storyId) => api.delete(`/api/stories/${storyId}/like`);

export const getStoryEngagement = (storyId) => api.get(`/api/stories/${storyId}/engagement`);

export const listStoryComments = (storyId, params = {}) =>
  api.get(`/api/stories/${storyId}/comments`, { params });

export const createStoryComment = (storyId, body) =>
  api.post(`/api/stories/${storyId}/comments`, { body });

export const shareStory = (storyId, platform = "copy_link") =>
  api.post(`/api/stories/${storyId}/share`, { platform });

export const upsertStoryReview = (storyId, rating, review_text) =>
  api.post(`/api/stories/${storyId}/review`, { rating, review_text });

export const listStoryReviews = (storyId, params = {}) =>
  api.get(`/api/stories/${storyId}/reviews`, { params });

export const likeChapter = (chapterId) => api.post(`/api/chapters/${chapterId}/like`);

export const unlikeChapter = (chapterId) => api.delete(`/api/chapters/${chapterId}/like`);

export const listChapterComments = (chapterId, params = {}) =>
  api.get(`/api/chapters/${chapterId}/comments`, { params });

export const createChapterComment = (chapterId, body) =>
  api.post(`/api/chapters/${chapterId}/comments`, { body });

export const replyToComment = (commentId, body) =>
  api.post(`/api/comments/${commentId}/replies`, { body });

export const reactToComment = (commentId, reaction) =>
  api.post(`/api/comments/${commentId}/reactions`, { reaction });

export const removeCommentReaction = (commentId, reaction) =>
  api.delete(`/api/comments/${commentId}/reactions`, { params: { reaction } });

export const getChapterEngagement = (chapterId) =>
  api.get(`/api/chapters/${chapterId}/engagement`);

export const shareChapter = (chapterId, platform = "copy_link") =>
  api.post(`/api/chapters/${chapterId}/share`, { platform });

export const deleteComment = (commentId) =>
  api.delete(`/api/comments/${commentId}`);

export const reportComment = (commentId, reason = null) =>
  api.post(`/api/comments/${commentId}/report`, { reason });
