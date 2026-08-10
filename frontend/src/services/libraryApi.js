import api from "./api";

export const getLibrary = () => api.get("/api/library");

export const addToTBR = (storyId) =>
  api.post("/api/library/tbr", { storyId });

export const removeFromTBR = (storyId) =>
  api.delete(`/api/library/tbr/${storyId}`);

export const updateLibraryStatus = (storyId, target) =>
  api.post("/api/library/status", { storyId, target });

export const clearLibraryEntry = (storyId) =>
  api.delete(`/api/library/entry/${storyId}`);
