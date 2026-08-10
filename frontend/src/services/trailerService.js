import api from "./api";

export const trailerService = {
  getAllTrailers: async () => {
    const response = await api.get("/api/trailers");
    return response.data;
  },

  getTrailerById: async (id) => {
    const response = await api.get(`/api/trailers/${id}`);
    return response.data;
  },

  getTrailersByStory: async (storyId) => {
    const response = await api.get(`/api/trailers/story/${storyId}`);
    return response.data;
  },

  getUserTrailers: async () => {
    const response = await api.get("/api/trailers/user/my-trailers");
    return response.data;
  },

  getAITrailerLimit: async () => {
    const response = await api.get("/api/trailers/user/ai-limit");
    return response.data;
  },

  createTrailerAI: async (storyId) => {
    const response = await api.post("/api/trailers/generate", { story_id: storyId });
    return response.data;
  },

  uploadTrailer: async (storyId, videoFile) => {
    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("story_id", storyId);

    const response = await api.post("/api/trailers/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  deleteTrailer: async (id) => {
    const response = await api.delete(`/api/trailers/${id}`);
    return response.data;
  },

  getTrailerStatus: async (id) => {
    const response = await api.get(`/api/trailers/${id}/status`);
    return response.data;
  },
};

export default trailerService;
