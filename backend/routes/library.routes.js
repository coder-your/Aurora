import express from "express";
import { protect } from "../middleware/protect.js";
import { getLibrary, addToTBR, removeFromTBR, updateLibraryStatus, clearFromLibrary } from "../controllers/libraryController.js";

const router = express.Router();

router.use(protect);

// My Library main view
router.get("/", getLibrary);

// TBR management
router.post("/tbr", addToTBR);
router.delete("/tbr/:storyId", removeFromTBR);

// Library status updates (tbr/current/finished) and removal
router.post("/status", updateLibraryStatus);
router.delete("/entry/:storyId", clearFromLibrary);

export default router;
