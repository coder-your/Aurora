import express from "express";
import { protect } from "../middleware/protect.js";
import { writerOnly } from "../middleware/writerOnly.js";
import * as auroraCtrl from "../controllers/auroraCardsController.js";
import * as plotCtrl from "../controllers/plotTwistController.js";

const router = express.Router();

router.get("/engagement/me", protect, auroraCtrl.getMyEngagement);
router.get("/contributors/me", protect, auroraCtrl.getMyContributorProfile);
router.get("/contributors/:userId", protect, auroraCtrl.getContributorByUserId);

router.get("/hall-of-fame", protect, plotCtrl.hallOfFame);

router.get("/chapters/:chapterId/event", protect, plotCtrl.getChapterEvent);
router.get("/chapters/:chapterId/credits", protect, plotCtrl.chapterCredits);
router.get("/chapters/:chapterId/twist-mentions", protect, plotCtrl.chapterTwistMentions);


router.post("/events/:eventId/submit", protect, plotCtrl.postSubmission);
router.post("/submissions/:submissionId/vote", protect, plotCtrl.postVote);
router.get("/events/:eventId/voting-pool", protect, plotCtrl.votingPool);

router.post("/stories/:storyId/events", protect, writerOnly, plotCtrl.createEvent);
router.get("/events/me", protect, writerOnly, plotCtrl.listMyEvents);
router.get("/events/:eventId/dashboard", protect, writerOnly, plotCtrl.authorDashboard);
router.post("/events/:eventId/decision", protect, writerOnly, plotCtrl.postDecision);

export default router;
