
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  withCredentials: true, //  send cookies only
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Log if token is missing for debugging
    console.warn("API request made without token:", config.url);
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const authPages = ["/login", "/signup", "/verify-2fa", "/forgot-password", "/reset-password"];

      const serverMessage =
        (error.response?.data?.message || error.response?.data?.error || "").toString().toLowerCase();
      const isAuthFailure =
        serverMessage.includes("not authorized") ||
        serverMessage.includes("jwt") ||
        serverMessage.includes("token") ||
        serverMessage.includes("user not found");
      
      // Only redirect if not already on an auth page
      if (!authPages.includes(currentPath) && isAuthFailure) {
        // Clear token and trigger App update
        localStorage.removeItem("token");
        window.dispatchEvent(new Event("token-updated"));
        
        // Use React Router navigation instead of window.location for smoother transition
        if (currentPath !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

