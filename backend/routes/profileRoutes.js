import express from "express";
import { body } from "express-validator";
import { 
  uploadProfileImage, 
  createProfile, 
  getMyProfile, 
  getProfileById, 
  updateProfile, 
  deleteProfile 
} from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js"; // 👈 we'll create this

const router = express.Router();

// Public route — anyone can view user profiles by ID
router.get("/:profile_id", getProfileById);

// Protect all other routes (must be logged in)
router.use(protect);

// Validation rules for profile creation/update
const profileValidation = [
  body("first_name").optional().isLength({ max: 50 }).withMessage("First name too long"),
  body("last_name").optional().isLength({ max: 50 }).withMessage("Last name too long"),
  body("handle_name")
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage("Handle name must be 3–30 characters long"),
  body("bio").optional().isLength({ max: 300 }).withMessage("Bio must be under 300 characters"),
  body("gender").optional().isIn(["male", "female", "nonbinary", "other"]).withMessage("Invalid gender"),
  body("role").optional().isIn(["reader", "writer"]).withMessage("Role must be reader or writer"),
];

// Create profile (with validation + image upload)
router.post("/", uploadProfileImage, profileValidation, validateRequest, createProfile);

// Get own profile
router.get("/me", getMyProfile);

// Update profile (with validation)
router.put("/", uploadProfileImage, profileValidation, validateRequest, updateProfile);

// Delete own profile
router.delete("/", deleteProfile);

export default router;
