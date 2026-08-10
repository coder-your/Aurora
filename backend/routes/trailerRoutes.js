import express from "express";
import {
  getAllTrailers,
  getTrailerById,
  getTrailersByStory,
  getUserTrailers,
  getAITrailerLimit,
  createTrailerAI,
  uploadTrailer,
  deleteTrailer,
  getTrailerStatus,
} from "../controllers/trailerController.js";
import { protect } from "../middleware/protect.js";
import { writerOnly } from "../middleware/writerOnly.js";
import videoUpload from "../middleware/videoUploadMiddleware.js";

const router = express.Router();

router.get("/", getAllTrailers);
router.get("/user/my-trailers", protect, writerOnly, getUserTrailers);
router.get("/user/ai-limit", protect, writerOnly, getAITrailerLimit);
router.get("/story/:storyId", getTrailersByStory);
router.get("/:id", getTrailerById);
router.get("/:id/status", getTrailerStatus);

router.post("/generate", protect, writerOnly, createTrailerAI);
router.post("/upload", protect, writerOnly, videoUpload.single("video"), uploadTrailer);
router.delete("/:id", protect, writerOnly, deleteTrailer);

export default router;
