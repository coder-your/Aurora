import express from "express";
import { protect } from "../middleware/protect.js";
import {
  getStoryIntro,
  openReading,
  updateProgress,
  addBookmark,
  getBookmarks,
  deleteBookmark,
  addReadingSession,
  getTodaySummary,
} from "../controllers/readingController.js";

const router = express.Router();

router.use(protect);

// Story intro (details + reader context)
router.get("/stories/:storyId/intro", getStoryIntro);

// Begin/continue reading
router.post("/open", openReading);

// Save progress (position + %)
router.patch("/progress", updateProgress);

// Bookmarks
router.post("/bookmarks", addBookmark);
router.get("/bookmarks/:storyId", getBookmarks);
router.delete("/bookmarks/:bookmarkId", deleteBookmark);

// Reading time tracking
router.post("/session-tick", addReadingSession);
router.get("/today-summary", getTodaySummary);

export default router;
