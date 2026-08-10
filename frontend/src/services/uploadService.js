import api from "./api";

export const uploadCover = async (file, story_id, onProgress) => {
  if (!story_id) {
    throw new Error("story_id is missing. Upload aborted.");
  }

  const formData = new FormData();
  formData.append("file", file);  
  formData.append("story_id", story_id);

  const res = await api.post("/api/upload/cover", formData, {
    // Don't set Content-Type - let axios/browser set it automatically with boundary
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

  return res.data;
};
