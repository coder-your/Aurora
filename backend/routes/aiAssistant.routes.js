import express from "express";
import { protect } from "../middleware/protect.js";
import * as aiAssistantController from "../controllers/aiAssistantController.js";

const router = express.Router();

// Test endpoint (no auth required)
router.get("/test", (req, res) => {
  res.json({ message: "AI Assistant API is working", timestamp: new Date().toISOString() });
});

// Get AI assistant capabilities list
router.get("/capabilities", protect, aiAssistantController.getCapabilities);

// Get AI usage for a story
router.get("/usage/:storyId", protect, aiAssistantController.getUsage);

// Request AI assistance for a story
router.post("/assist/:storyId", protect, aiAssistantController.assist);

export default router;
