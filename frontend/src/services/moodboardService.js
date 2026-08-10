import api from "./api";

// Core moodboards
export const getMyMoodboards = (storyId, options = {}) => {
  const params = {
    ...(storyId ? { storyId } : {}),
    ...(options?.sort ? { sort: options.sort } : {}),
  };
  return api.get("/api/moodboards/mine", { params });
};
export const createMoodboard = (payload) => api.post("/api/moodboards", payload);
export const getMoodboard = (id) => api.get(`/api/moodboards/${id}`);
export const updateMoodboard = (id, payload) => api.patch(`/api/moodboards/${id}`, payload);
export const deleteMoodboard = (id) => api.delete(`/api/moodboards/${id}`);

// Public discover feed
export const getPublicMoodboards = (params = {}) => api.get("/api/moodboards/public", { params });

export const getPublicMoodboardsForUser = (userId, params = {}) =>
  api.get(`/api/moodboards/public/user/${userId}`, { params });

// Sections
export const getVibe = (id) => api.get(`/api/moodboards/${id}/vibe`);
export const upsertVibe = (id, payload) => api.put(`/api/moodboards/${id}/vibe`, payload);

export const getCharacters = (id) => api.get(`/api/moodboards/${id}/characters`);
export const createCharacter = (id, payload) =>
  api.post(`/api/moodboards/${id}/characters`, payload);

export const getPlotNotes = (id) => api.get(`/api/moodboards/${id}/notes`);
export const createNote = (id, payload) =>
  api.post(`/api/moodboards/${id}/notes`, payload);
export const getTimeline = (id) => api.get(`/api/moodboards/${id}/timeline`);

export const getLocations = (id) => api.get(`/api/moodboards/${id}/locations`);
export const createLocation = (id, payload) =>
  api.post(`/api/moodboards/${id}/locations`, payload);
export const getWorldMeta = (id) => api.get(`/api/moodboards/${id}/world-meta`);
export const upsertWorldMeta = (id, payload) =>
  api.put(`/api/moodboards/${id}/world-meta`, payload);

export const getQuotes = (id) => api.get(`/api/moodboards/${id}/quotes`);
export const createQuote = (id, payload) =>
  api.post(`/api/moodboards/${id}/quotes`, payload);
export const getTracks = (id) => api.get(`/api/moodboards/${id}/tracks`);
export const createTrack = (id, payload) =>
  api.post(`/api/moodboards/${id}/tracks`, payload);
export const getInspirations = (id) => api.get(`/api/moodboards/${id}/inspirations`);
export const createInspiration = (id, payload) =>
  api.post(`/api/moodboards/${id}/inspirations`, payload);

// Upload asset via Cloudinary
export const uploadMoodboardAsset = (file, folder) => {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) formData.append("folder", folder);
  return api.post("/api/moodboards/upload/asset", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
