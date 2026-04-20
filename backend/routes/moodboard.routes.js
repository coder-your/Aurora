import express from "express";
import { protect } from "../middleware/protect.js";
import { writerOnly } from "../middleware/writerOnly.js";
import { moodboardOwnerOnly } from "../middleware/moodboardOwnerOnly.js";
import upload from "../utils/multer.js";
import multer from "multer";
import {
  createMoodboard,
  getMyMoodboards,
  getMoodboardById,
  updateMoodboard,
  deleteMoodboard,
  getPublicMoodboardsForUser,
  getPublicMoodboards,
} from "../controllers/moodboardController.js";
import { getVibePanel, upsertVibePanel } from "../controllers/moodboardVibeController.js";
import {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  getCharacterLinks,
  createCharacterLink,
  deleteCharacterLink,
} from "../controllers/moodboardCharacterController.js";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getTimeline,
  createTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
} from "../controllers/moodboardPlotController.js";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getWorldMeta,
  upsertWorldMeta,
} from "../controllers/moodboardWorldController.js";
import {
  getQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
} from "../controllers/moodboardQuoteController.js";
import {
  getTracks,
  createTrack,
  updateTrack,
  deleteTrack,
} from "../controllers/moodboardSoundtrackController.js";
import {
  getInspirations,
  createInspiration,
  updateInspiration,
  deleteInspiration,
} from "../controllers/moodboardInspirationController.js";
import { uploadMoodboardAsset } from "../controllers/moodboardUploadController.js";

const router = express.Router();

// All moodboard access requires auth (visibility rules enforced in controllers)
router.use("/", protect);

// Core moodboard CRUD
router.post("/", writerOnly, createMoodboard);
router.get("/mine", writerOnly, getMyMoodboards);

// Public moodboards feed (reader Discover)
router.get("/public", getPublicMoodboards);

// Public endpoint to see a writer's shared moodboards list
router.get("/public/user/:userId", getPublicMoodboardsForUser);

router.get("/:id", getMoodboardById);
router.patch("/:id", writerOnly, updateMoodboard);
router.delete("/:id", writerOnly, deleteMoodboard);

// Vibe panel
router.get("/:id/vibe", getVibePanel);
router.put("/:id/vibe", writerOnly, moodboardOwnerOnly, upsertVibePanel);

// Characters
router.get("/:id/characters", getCharacters);
router.post("/:id/characters", writerOnly, moodboardOwnerOnly, createCharacter);
router.patch("/characters/:charId", writerOnly, updateCharacter);
router.delete("/characters/:charId", writerOnly, deleteCharacter);

// Character relationships web
router.get("/:id/relationships", getCharacterLinks);
router.post("/:id/relationships", writerOnly, moodboardOwnerOnly, createCharacterLink);
router.delete("/relationships/:linkId", writerOnly, deleteCharacterLink);

// Plot & Scenes Wall - sticky notes
router.get("/:id/notes", getNotes);
router.post("/:id/notes", writerOnly, moodboardOwnerOnly, createNote);
router.patch("/notes/:noteId", writerOnly, updateNote);
router.delete("/notes/:noteId", writerOnly, deleteNote);

// Plot & Scenes Wall - timeline
router.get("/:id/timeline", getTimeline);
router.post("/:id/timeline", writerOnly, moodboardOwnerOnly, createTimelineEvent);
router.patch("/timeline/:eventId", writerOnly, updateTimelineEvent);
router.delete("/timeline/:eventId", writerOnly, deleteTimelineEvent);

// World-building: locations
router.get("/:id/locations", getLocations);
router.post("/:id/locations", writerOnly, moodboardOwnerOnly, createLocation);
router.patch("/locations/:locId", writerOnly, updateLocation);
router.delete("/locations/:locId", writerOnly, deleteLocation);

// World-building: meta (rules, culture, etc.)
router.get("/:id/world-meta", getWorldMeta);
router.put("/:id/world-meta", writerOnly, moodboardOwnerOnly, upsertWorldMeta);

// Dialogue & quote hub
router.get("/:id/quotes", getQuotes);
router.post("/:id/quotes", writerOnly, moodboardOwnerOnly, createQuote);
router.patch("/quotes/:quoteId", writerOnly, updateQuote);
router.delete("/quotes/:quoteId", writerOnly, deleteQuote);

// Soundtrack area
router.get("/:id/tracks", getTracks);
router.post("/:id/tracks", writerOnly, moodboardOwnerOnly, createTrack);
router.patch("/tracks/:trackId", writerOnly, updateTrack);
router.delete("/tracks/:trackId", writerOnly, deleteTrack);

// Inspiration library
router.get("/:id/inspirations", getInspirations);
router.post("/:id/inspirations", writerOnly, moodboardOwnerOnly, createInspiration);
router.patch("/inspirations/:itemId", writerOnly, updateInspiration);
router.delete("/inspirations/:itemId", writerOnly, deleteInspiration);

// Generic asset upload for moodboard images/files (Cloudinary)
const handleUploadError = (err, req, res, next) => {
  if (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "Unexpected file field. Expected field name: 'file'" });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    return res.status(400).json({ message: err.message || "File upload failed" });
  }
  next();
};

router.post("/upload/asset", writerOnly, upload.single("file"), handleUploadError, uploadMoodboardAsset);

export default router;
