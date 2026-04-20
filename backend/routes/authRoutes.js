import express from "express";
import {
  signup,
  loginWith2FA,   // Step 1: login & send OTP
  verify2FA,  
  resend2FA,     // Step 2: verify OTP & issue JWT
  forgotPassword,
  resetPassword,
  verifyAccount,
  loginWithGoogleOAuth
} from "../controllers/authController.js";

const router = express.Router();

// Signup
router.post("/signup", signup);

// Login with 2FA (Step 1)
router.post("/login-2fa", loginWith2FA);

// Verify 2FA (Step 2)
router.post("/verify-2fa", verify2FA);
router.post("/resend-2fa", resend2FA);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Social OAuth
router.post("/oauth/google", loginWithGoogleOAuth);

// Email verification
router.get("/verify/:token", verifyAccount);

export default router;
