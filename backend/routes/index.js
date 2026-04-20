

// export default router;
import express from "express";
import * as bookCtrl from "../controllers/bookController.js";
import * as chapCtrl from "../controllers/chapterController.js";
import { uploadCover } from "../controllers/uploadController.js";

import * as dictCtrl from "../controllers/dictionaryController.js";
import * as dashCtrl from "../controllers/dashboardController.js";
import { subscribeUpdates } from "../controllers/subscriptionController.js";
import * as followCtrl from "../controllers/followController.js";
import * as notifCtrl from "../controllers/notificationController.js";
import * as engageCtrl from "../controllers/engagementController.js";
import * as insightsCtrl from "../controllers/insightsController.js";
import * as writerPostCtrl from "../controllers/writerPostController.js";
import * as authorNotesCtrl from "../controllers/authorNotesController.js";
import * as milestoneCtrl from "../controllers/milestoneController.js";
import * as discoveryCtrl from "../controllers/discoveryController.js";
import * as writerProfileCtrl from "../controllers/writerProfileController.js";
import * as commentIntelCtrl from "../controllers/commentIntelligenceController.js";
import { protect } from "../middleware/protect.js";
import { writerOnly } from "../middleware/writerOnly.js";
import upload from "../utils/multer.js";
import multer from "multer";
import {
  getStoryWithChapters,
  updateChapterTitle
} from "../controllers/chapterController.js";
const router = express.Router();

// -------------------
// Book routes
// -------------------

// Create a new book
router.post("/books", protect, bookCtrl.createBook);

// Get a book by story_id
router.get("/books/:story_id", protect, bookCtrl.getBook);

// Update metadata
router.patch("/books/:story_id", protect, bookCtrl.updateMetadata);

// Publish book
router.patch("/books/:story_id/publish", protect, bookCtrl.publishBook);

// Soft delete book
router.delete("/books/:story_id", protect, bookCtrl.deleteBook);

// Restore soft-deleted book
router.post("/books/:story_id/restore", protect, bookCtrl.restoreBook);

// Get story with chapters
router.get("/stories/:story_id", protect, getStoryWithChapters);

// -------------------
// Chapter routes
// -------------------

// Create a new chapter under a book
router.post("/books/:story_id/chapters", protect, chapCtrl.createChapter);

// Update chapter title
router.patch("/chapters/:chapter_id", protect, updateChapterTitle);

// Autosave a chapter
router.patch("/chapters/:chapter_id/autosave", protect, chapCtrl.autosaveChapter);

// Get chapter versions
router.get("/chapters/:chapter_id/versions", protect, chapCtrl.getChapterVersions);

// Restore a specific chapter version
router.post("/chapters/:chapter_id/versions/restore", protect, chapCtrl.restoreVersion);

// Manually save a new version snapshot
router.post("/chapters/:chapter_id/versions/save", protect, chapCtrl.saveManualVersion);

// Delete a specific chapter version (accept both patterns for safety)
router.delete("/chapters/versions/:version_id", protect, chapCtrl.deleteVersion);
router.delete("/chapters/:chapter_id/versions/:version_id", protect, chapCtrl.deleteVersion);

// Reorder chapters within a story
router.patch("/books/:story_id/chapters/reorder", protect, writerOnly, chapCtrl.reorderChapters);

// Soft delete a chapter
router.delete("/chapters/:chapter_id", protect, chapCtrl.deleteChapter);

// Restore soft-deleted chapter
router.post("/chapters/:chapter_id/restore", protect, chapCtrl.restoreChapter);

// Preview chapter content
router.get("/chapters/:chapter_id/preview", protect, chapCtrl.previewChapter);

// Upload cover - with multer error handling
const handleUploadError = (err, req, res, next) => {
  if (err) {
    console.error("Multer error:", err);
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "Unexpected file field. Expected field name: 'file'" });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    // File filter error or other errors
    return res.status(400).json({ message: err.message || "File upload failed" });
  }
  next();
};

router.post("/upload/cover", protect, upload.single("file"), handleUploadError, uploadCover);

// -------------------
// Dictionary
// -------------------
router.get("/dictionary/:word", protect, dictCtrl.lookupWord);

// -------------------
// Dashboard
// -------------------
router.get("/dashboard", protect, dashCtrl.getWriterDashboard);

router.post("/follows/:writerId", protect, followCtrl.followWriter);
router.delete("/follows/:writerId", protect, followCtrl.unfollowWriter);
router.get("/me/following", protect, followCtrl.getMyFollowingWriters);
router.get("/writers/:writerId/followers", protect, followCtrl.getWriterFollowers);
router.get("/writers/:writerId/profile", protect, writerProfileCtrl.getWriterPublicProfile);

router.get("/notifications", protect, notifCtrl.listNotifications);
router.get("/notifications/unread-count", protect, notifCtrl.unreadCount);
router.post("/notifications/:id/read", protect, notifCtrl.markAsRead);
router.post("/notifications/read-all", protect, notifCtrl.markAllAsRead);

router.post("/stories/:storyId/like", protect, engageCtrl.likeStory);
router.delete("/stories/:storyId/like", protect, engageCtrl.unlikeStory);
router.get("/stories/:storyId/engagement", protect, engageCtrl.storyEngagement);
router.post("/chapters/:chapterId/like", protect, engageCtrl.likeChapter);
router.delete("/chapters/:chapterId/like", protect, engageCtrl.unlikeChapter);
router.get("/chapters/:chapterId/engagement", protect, engageCtrl.chapterEngagement);

router.get("/stories/:storyId/comments", protect, engageCtrl.listStoryComments);
router.post("/stories/:storyId/comments", protect, engageCtrl.createStoryComment);
router.get("/chapters/:chapterId/comments", protect, engageCtrl.listChapterComments);
router.post("/chapters/:chapterId/comments", protect, engageCtrl.createChapterComment);
router.post("/comments/:commentId/replies", protect, engageCtrl.replyToComment);

router.post("/comments/:commentId/reactions", protect, engageCtrl.reactToComment);
router.delete("/comments/:commentId/reactions", protect, engageCtrl.removeCommentReaction);

router.post("/comments/:commentId/pin", protect, engageCtrl.pinComment);
router.post("/comments/:commentId/unpin", protect, engageCtrl.unpinComment);
router.delete("/comments/:commentId", protect, engageCtrl.deleteComment);

router.post("/stories/:storyId/review", protect, engageCtrl.upsertStoryReview);
router.get("/stories/:storyId/reviews", protect, engageCtrl.listStoryReviews);
router.post("/stories/:storyId/share", protect, engageCtrl.shareStory);
router.post("/chapters/:chapterId/share", protect, engageCtrl.shareChapter);

router.post("/comments/:commentId/report", protect, engageCtrl.reportComment);

router.get("/insights/overview", protect, writerOnly, insightsCtrl.overview);
router.get("/insights/books", protect, writerOnly, insightsCtrl.books);
router.get("/insights/books/:storyId", protect, writerOnly, insightsCtrl.bookDetail);
router.get("/insights/audience", protect, writerOnly, insightsCtrl.audience);
router.get("/insights/engagement", protect, writerOnly, insightsCtrl.engagement);
router.get("/insights/comment-intelligence", protect, writerOnly, commentIntelCtrl.commentIntelligence);
router.get("/insights/success-score/:storyId", protect, writerOnly, commentIntelCtrl.successScore);

router.post("/writer-posts", protect, writerOnly, writerPostCtrl.createWriterPost);
router.delete("/writer-posts/:postId", protect, writerOnly, writerPostCtrl.deleteWriterPost);
router.get("/writer-posts/me", protect, writerOnly, writerPostCtrl.listMyWriterPosts);
router.get("/writer-posts/writer/:writerId", protect, writerPostCtrl.listWriterPostsForWriter);
router.get("/writer-posts/feed", protect, writerPostCtrl.listFeedForReader);

router.put("/chapters/:chapterId/author-notes", protect, writerOnly, authorNotesCtrl.upsertAuthorNote);
router.delete("/chapters/:chapterId/author-notes", protect, writerOnly, authorNotesCtrl.deleteAuthorNote);
router.get("/chapters/:chapterId/author-notes", protect, authorNotesCtrl.getChapterAuthorNotes);

router.post("/milestones/run", protect, writerOnly, milestoneCtrl.runMilestonesForMe);
router.post("/milestones/stories/:storyId/run", protect, writerOnly, milestoneCtrl.runMilestonesForStory);
router.get("/milestones/stories/:storyId/badges", protect, writerOnly, milestoneCtrl.listStoryBadges);

router.get("/milestones/public/stories/:storyId/badges", protect, milestoneCtrl.listPublicStoryBadges);
router.post("/milestones/public/badges/batch", protect, milestoneCtrl.batchPublicStoryBadges);

router.get("/discover/most-shared", protect, discoveryCtrl.mostSharedStories);
router.get("/discover/most-commented", protect, discoveryCtrl.mostCommentedStories);
router.get("/discover/most-liked", protect, discoveryCtrl.mostLikedStories);
router.get("/discover/weekly-picks", protect, discoveryCtrl.weeklyPicks);
router.get("/discover/popular-writers", protect, discoveryCtrl.popularWriters);
router.get("/discover/also-read/:storyId", protect, discoveryCtrl.alsoRead);

// -------------------
// Public newsletter subscription
// -------------------
router.post("/subscribe-updates", subscribeUpdates);


export default router;


