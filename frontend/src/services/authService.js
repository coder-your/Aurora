import api from "./api"; // Axios instance pointing to backend

// ------------------ Signup ------------------
export const signupUser = async ({ first_name, last_name, email, password }) => {
  return await api.post("/api/auth/signup", { first_name, last_name, email, password });
};

// ------------------ Login (Step 1: 2FA) ------------------
export const loginUser = async ({ email, password }) => {
  return await api.post("/api/auth/login-2fa", { email, password });
};

// ------------------ Verify 2FA (Step 2) ------------------
export const verify2FAUser = async ({ email, otp }) => {
  return await api.post("/api/auth/verify-2fa", { email, otp });
};

// ------------------ Resend OTP ------------------
export const resendOTP = async ({ email }) => {
  return await api.post("/api/auth/resend-2fa", { email });
};

// ------------------ Forgot Password ------------------
export const forgotPassword = async ({ email }) => {
  return await api.post("/api/auth/forgot-password", { email });
};

// ------------------ Reset Password ------------------
export const resetPassword = async ({ email, token, newPassword }) => {
  return await api.post("/api/auth/reset-password", { email, token, newPassword });
};

// ------------------ Verify Account ------------------
export const verifyAccount = async (token) => {
  return await api.get(`/api/auth/verify/${token}`);
};

// ------------------ Social OAuth ------------------
export const loginWithGoogleOAuth = async ({ accessToken }) => {
  return await api.post("/api/auth/oauth/google", { accessToken });
};
