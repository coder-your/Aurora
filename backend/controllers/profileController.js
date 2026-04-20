// controllers/profileController.js
import Profile from "../models/profile.js";
import cloudinary from "../utils/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { sendGoodbyeEmail } from "../utils/email.js";
import { pool } from "../config/db.js";

const isSchemaOrTableMissing = (err) => {
  const msg = (err && err.message ? err.message : "").toLowerCase();
  const code = err && err.code ? String(err.code) : "";
  if (code === "P2021" || code === "P2022") return true;
  if (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table") || msg.includes("column"))) return true;
  return false;
};

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

    // Handle_name uniqueness check
    if (req.body.handle_name) {
      const existingHandle = await Profile.findByHandleName(req.body.handle_name);
      if (existingHandle) {
        return res.status(400).json({ message: "Handle name already taken." });
      }
    }

    let imageUrl = null;

    
    if (req.file) {
      imageUrl = req.file.secure_url || req.file.path;
    }

    const newProfile = await Profile.create({
      user_id,
      profile_image: imageUrl,
      ...req.body,
    });

    // Sync user flags with profile role
    if (req.body.role === "writer" || req.body.role === "reader") {
      await pool.query(
        "UPDATE users SET is_writer = $1, is_reader = $2 WHERE user_id = $3",
        [req.body.role === "writer", req.body.role !== "writer", user_id]
      );
    }

    res.status(201).json(newProfile);
  } catch (error) {
    console.error("Error creating profile:", error);
    
    // Handle unique constraint violation for handle_name
    if (error.code === '23505' || error.message?.includes('unique_handle') || error.message?.includes('duplicate key')) {
      return res.status(400).json({ message: "Handle name already taken." });
    }
    
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET own profile
export const getMyProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    let profile = null;
    try {
      profile = await Profile.findByUserId(user_id);
    } catch (e) {
      if (!isSchemaOrTableMissing(e)) throw e;
    }

    let completedReads = 0;
    let writtenCount = 0;

    try {
      const completedReadsRes = await pool.query(
        "SELECT COUNT(*)::int AS count FROM user_read_history WHERE user_id = $1 AND progress >= 100",
        [user_id]
      );
      completedReads = completedReadsRes.rows?.[0]?.count ?? 0;
    } catch (e) {
      if (!isSchemaOrTableMissing(e)) throw e;
    }

    try {
      const writtenCountRes = await pool.query(
        "SELECT COUNT(*)::int AS count FROM stories WHERE author_id = $1 AND is_deleted = false",
        [user_id]
      );
      writtenCount = writtenCountRes.rows?.[0]?.count ?? 0;
    } catch (e) {
      if (!isSchemaOrTableMissing(e)) throw e;
    }

    if (profile) {
      const prevReads = profile.total_books_read ?? 0;
      const prevWritten = profile.total_books_written ?? 0;
      if (prevReads !== completedReads || prevWritten !== writtenCount) {
        try {
          await pool.query(
            "UPDATE user_profiles SET total_books_read = $1, total_books_written = $2 WHERE user_id = $3",
            [completedReads, writtenCount, user_id]
          );
        } catch (e) {
          if (!isSchemaOrTableMissing(e)) throw e;
        }
      }
    }

    if (!profile) {
      return res.json({
        user_id,
        profile_id: null,
        handle_name: null,
        bio: null,
        gender: null,
        role: req.user.is_writer ? "writer" : "reader",
        profile_image: null,
        total_books_read: completedReads,
        total_books_written: writtenCount,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
      });
    }

    return res.json({
      ...profile,
      total_books_read: completedReads,
      total_books_written: writtenCount,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    if (isSchemaOrTableMissing(error)) {
      return res.json({
        user_id: req.user?.user_id,
        profile_id: null,
        handle_name: null,
        bio: null,
        gender: null,
        role: req.user?.is_writer ? "writer" : "reader",
        profile_image: null,
        total_books_read: 0,
        total_books_written: 0,
        first_name: req.user?.first_name,
        last_name: req.user?.last_name,
      });
    }
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

    // Prevent duplicate handle_name
    if (req.body.handle_name && req.body.handle_name !== profile.handle_name) {
      const existingHandle = await Profile.findByHandleName(req.body.handle_name);
      if (existingHandle) {
        return res.status(400).json({ message: "Handle name already taken." });
      }
    }

    let imageUrl = profile.profile_image;

   
    if (req.file) {
      imageUrl = req.file.secure_url || req.file.path;
    }

    const updatedProfile = await Profile.update(profile.profile_id, {
      ...req.body,
      profile_image: imageUrl,
    });

    if (req.body.role === "writer" || req.body.role === "reader") {
      await pool.query(
        "UPDATE users SET is_writer = $1, is_reader = $2 WHERE user_id = $3",
        [req.body.role === "writer", req.body.role !== "writer", user_id]
      );
    }

    res.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    
    // Handle unique constraint violation for handle_name
    if (error.code === '23505' || error.message?.includes('unique_handle') || error.message?.includes('duplicate key')) {
      return res.status(400).json({ message: "Handle name already taken." });
    }
    
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

    // Farewell email
    try {
      await sendGoodbyeEmail(
        req.user.email,
        profile.first_name || "Aurora Friend"
      );
    } catch (emailError) {
      console.error("Failed to send goodbye email:", emailError);
    }

    res.json({
      message: "Profile deleted successfully. Goodbye email sent if possible.",
    });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
