import api from "./api";

export const createChapter = async (story_id, data) => {
  const res = await api.post(`/api/books/${story_id}/chapters`, data);
  return res.data;
};

export const autosaveChapter = async (chapter_id, data) => {
  const res = await api.patch(`/api/chapters/${chapter_id}/autosave`, data);
  return res.data;
};

export const getChapterVersions = async (chapter_id) => {
  const res = await api.get(`/api/chapters/${chapter_id}/versions`);
  return res.data;
};

export const restoreChapterVersion = async (chapter_id, version_id) => {
  const res = await api.post(`/api/chapters/${chapter_id}/versions/restore`, { version_id });
  return res.data;
};

export const reorderChapters = async (story_id, order) => {
  const res = await api.patch(`/api/books/${story_id}/chapters/reorder`, { order });
  return res.data;
};