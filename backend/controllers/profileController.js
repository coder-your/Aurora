// controllers/profileController.js
import Profile from "../models/profile.js";
import cloudinary from "../utils/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

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

// DELETE profile
export const deleteProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const profile = await Profile.findByUserId(user_id);
    if (!profile) return res.status(404).json({ message: "Profile not found." });

    await Profile.remove(profile.profile_id);
    res.json({ message: "Profile deleted successfully." });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
