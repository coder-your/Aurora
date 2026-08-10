// // src/services/profileService.js

// import api from "./api";

// // All profile routes start with /api/profile (confirmed from server.js)

// const BASE = "/api/profile";

// export const createProfile = async (data) => {
//   return api.post(`${BASE}`, data, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
// };

// export const getMyProfile = async () => {
//   return api.get(`${BASE}/me`);
// };

// export const getProfileById = async (profile_id) => {
//   return api.get(`${BASE}/${profile_id}`);
// };

// export const updateProfile = async (data) => {
//   return api.put(`${BASE}`, data, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
// };

// export const deleteProfile = async () => {
//   return api.delete(`${BASE}`);
// };


// src/services/profileService.js

// import api from "./api";

// // Correct: Do NOT include /api here
// const BASE = "/profile";

// export const createProfile = async (data) => {
//   return api.post(`${BASE}`, data, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
// };

// export const getMyProfile = async () => {
//   return api.get(`${BASE}/me`);
// };

// export const getProfileById = async (profile_id) => {
//   return api.get(`${BASE}/${profile_id}`);
// };

// export const updateProfile = async (data) => {
//   return api.put(`${BASE}`, data, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
// };

// export const deleteProfile = async () => {
//   return api.delete(`${BASE}`);
// };


// src/services/profileService.js

import api from "./api";

const BASE = "/api/profile";   

export const createProfile = async (data) => {
  return api.post(BASE, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getMyProfile = async () => {
  return api.get(`${BASE}/me`);
};

export const getProfileById = async (profile_id) => {
  return api.get(`${BASE}/id/${profile_id}`);
};

export const updateProfile = async (data) => {
  return api.put(BASE, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const deleteProfile = async () => {
  return api.delete(BASE);
};
