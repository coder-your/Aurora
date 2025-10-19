// controllers/profileController.js
import Profile from "../models/profile.js";
import cloudinary from "../utils/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { sendGoodbyeEmail } from "../utils/email.js";

// Cloudinary + Multer setup
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "user_profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });
export const uploadProfileImage = upload.single("profile_image");

// CREATE profile
export const createProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const existing = await Profile.findByUserId(user_id);
    if (existing) {
      return res
        .status(400)
        .json({ message: "Profile already exists for this user." });
    }

    //  NEW: handle_name uniqueness check
    if (req.body.handle_name) {
      const existingHandle = await Profile.findByHandleName(req.body.handle_name);
      if (existingHandle) {
        return res.status(400).json({ message: "Handle name already taken." });
      }
    }

    let imageUrl = null;
    if (req.file && req.file.path) imageUrl = req.file.path;

    const newProfile = await Profile.create({
      user_id,
      profile_image: imageUrl,
      ...req.body,
    });

    res.status(201).json(newProfile);
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};


// GET own profile
export const getMyProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const profile = await Profile.findByUserId(user_id);
    if (!profile) return res.status(404).json({ message: "Profile not found." });
    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET by ID
export const getProfileById = async (req, res) => {
  try {
    const { profile_id } = req.params;
    const profile = await Profile.findByProfileId(profile_id);
    if (!profile) return res.status(404).json({ message: "Profile not found." });
    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// UPDATE profile
export const updateProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const profile = await Profile.findByUserId(user_id);
    if (!profile) return res.status(404).json({ message: "Profile not found." });

    //  NEW: prevent duplicate handle_name
    if (req.body.handle_name && req.body.handle_name !== profile.handle_name) {
      const existingHandle = await Profile.findByHandleName(req.body.handle_name);
      if (existingHandle) {
        return res.status(400).json({ message: "Handle name already taken." });
      }
    }

    let imageUrl = profile.profile_image;
    if (req.file && req.file.path) imageUrl = req.file.path;

    const updatedProfile = await Profile.update(profile.profile_id, {
      ...req.body,
      profile_image: imageUrl,
    });

    res.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};


export const deleteProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const profile = await Profile.findByUserId(user_id);
    if (!profile) return res.status(404).json({ message: "Profile not found." });

    // Delete profile from DB
    await Profile.remove(profile.profile_id);

    //  farewell email
    try {
      await sendGoodbyeEmail(req.user.email, profile.first_name || "Aurora Friend");
    } catch (emailError) {
      console.error("Failed to send goodbye email:", emailError);
    }

    res.json({ message: "Profile deleted successfully. Goodbye email sent if possible." });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};