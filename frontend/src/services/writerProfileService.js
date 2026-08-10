import api from "./api";

export const getWriterPublicProfile = (writerId) =>
  api.get(`/api/writers/${writerId}/profile`);
