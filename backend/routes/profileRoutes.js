// import express from "express";
// import { body } from "express-validator";
// import { 
//   uploadProfileImage, 
//   createProfile, 
//   getMyProfile, 
//   getProfileById, 
//   updateProfile, 
//   deleteProfile 
// } from "../controllers/profileController.js";
// import { protect } from "../middleware/protect.js";
// import { validateRequest } from "../middleware/validateRequest.js"; // 

// const router = express.Router();

// // Public route — anyone can view user profiles by ID
// router.get("/:profile_id", getProfileById);

// // Protect all other routes (must be logged in)
// router.use(protect);

// // Validation rules for profile creation/update
// const profileValidation = [
//   body("first_name").optional().isLength({ max: 50 }).withMessage("First name too long"),
//   body("last_name").optional().isLength({ max: 50 }).withMessage("Last name too long"),
//   body("handle_name")
//     .optional()
//     .isLength({ min: 3, max: 30 })
//     .withMessage("Handle name must be 3–30 characters long"),
//   body("bio").optional().isLength({ max: 300 }).withMessage("Bio must be under 300 characters"),
//   body("gender").optional().isIn(["male", "female", "nonbinary", "other"]).withMessage("Invalid gender"),
//   body("role").optional().isIn(["reader", "writer"]).withMessage("Role must be reader or writer"),
// ];

// // Create profile (with validation + image upload)
// router.post("/", uploadProfileImage, profileValidation, validateRequest, createProfile);

// // Get own profile
// router.get("/me", getMyProfile);

// // Update profile (with validation)
// router.put("/", uploadProfileImage, profileValidation, validateRequest, updateProfile);

// // Delete own profile
// router.delete("/", deleteProfile);

// export default router;


import express from "express";
import { body } from "express-validator";
import {
  uploadProfileImage,
  createProfile,
  getMyProfile,
  getProfileById,
  updateProfile,
  deleteProfile,
} from "../controllers/profileController.js";
import { protect } from "../middleware/protect.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();

//  Public route — view ANY profile by ID
router.get("/id/:profile_id", getProfileById); 
//  (CHANGED to /id/:profile_id to avoid conflict with /me)

//  All routes below require login
router.use(protect);

//  Field validations
const profileValidation = [
  body("first_name").optional({ checkFalsy: true }).isLength({ max: 50 }),
  body("last_name").optional({ checkFalsy: true }).isLength({ max: 50 }),
  body("handle_name").optional({ checkFalsy: true }).isLength({ min: 3, max: 30 }),
  body("bio").optional({ checkFalsy: true }).isLength({ max: 300 }),
  body("gender").optional({ checkFalsy: true }).isIn(["male", "female", "nonbinary", "other"]),
  body("role").optional({ checkFalsy: true }).isIn(["reader", "writer"]),
];

// Create a profile
router.post("/", uploadProfileImage, profileValidation, validateRequest, createProfile);

//  Get your own profile
router.get("/me", getMyProfile);

//  Update profile
router.put("/", uploadProfileImage, profileValidation, validateRequest, updateProfile);

//  Delete profile
router.delete("/", deleteProfile);

export default router;
