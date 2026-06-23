import express from "express";
import { upsertWritingProgress, getWritingStreak } from "../controllers/writingProgressController.js";
import { protect } from "../middleware/protect.js";
import { writerOnly } from "../middleware/writerOnly.js";

const router = express.Router();

router.post("/writing-progress", protect, writerOnly, upsertWritingProgress);
router.get("/writing-progress/streak", protect, writerOnly, getWritingStreak);

export default router;

