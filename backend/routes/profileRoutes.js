// routes/profileRoutes.js
import express from "express";
import { 
  uploadProfileImage, 
  createProfile, 
  getMyProfile, 
  getProfileById, 
  updateProfile, 
  deleteProfile 
} from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js"; // ✅ make sure this matches your export

const router = express.Router();

// Middleware for auth protection
router.use(protect);

// Create profile (with image upload)
router.post("/", uploadProfileImage, createProfile);

// Get own profile
router.get("/me", getMyProfile);

// Get profile by ID (public or admin)
router.get("/:profile_id", getProfileById);

// Update own profile (with optional image upload)
router.put("/", uploadProfileImage, updateProfile);

// Delete own profile
router.delete("/", deleteProfile);

export default router;
