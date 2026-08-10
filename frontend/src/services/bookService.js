import api from "./api";

export const createBook = async (data) => {
  const res = await api.post("/api/books", data);
  return res.data;
};

export const getWriterDashboard = async () => {
  const res = await api.get("/api/dashboard");
  return res.data;
};

export const upsertWritingProgress = async (payload) => {
  const res = await api.post("/api/writing/writing-progress", payload);
  return res.data;
};

export const getWritingStreak = async () => {
  const res = await api.get("/api/writing/writing-progress/streak");
  return res.data;
};

export const publishBook = async (bookId) => {
  const res = await api.patch(`/api/books/${bookId}/publish`);
  return res.data;
};

export const deleteBook = async (bookId) => {
  const res = await api.delete(`/api/books/${bookId}`);
  return res.data;
};

export const restoreBook = async (bookId) => {
  const res = await api.post(`/api/books/${bookId}/restore`);
  return res.data;
};

export const updateBookMetadata = async (bookId, payload) => {
  const res = await api.patch(`/api/books/${bookId}`, payload);
  return res.data;
};

export const uploadBookCover = async (bookId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("story_id", String(bookId));

  const res = await api.post("/api/upload/cover", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getUserStories = async () => {
  const res = await api.get("/api/dashboard");
  const { drafts = [], in_progress = [], published = [] } = res.data || {};
  return [...drafts, ...in_progress, ...published];
};
