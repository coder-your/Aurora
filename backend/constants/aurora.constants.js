export const POINTS_PER_CARD = 50;

export const ENGAGEMENT_POINTS = {
  CHAPTER_READ: 5,
  BOOK_COMPLETE: 50,
  REVIEW: 20,
  REVIEW_LIKE: 10,
  FOLLOW_AUTHOR: 5,
  DAILY_STREAK: 15,
  BOOKMARK: 2,
  SHARE_BOOK: 10,
  SHARE_CHAPTER: 10,
  COMMENT: 3,
  CHAPTER_LIKE: 2,
  STORY_LIKE: 2,
  PLOT_TWIST_APPROVED: 30,
  PLOT_TWIST_ACCEPTED: 50,
  PLOT_TWIST_CREDITED: 100,
};

export const ACTIVITY_TYPES = {
  CHAPTER_READ: "chapter_read",
  BOOK_COMPLETE: "book_complete",
  REVIEW: "review",
  REVIEW_LIKE: "review_like",
  FOLLOW_AUTHOR: "follow_author",
  DAILY_STREAK: "daily_streak",
  BOOKMARK: "bookmark",
  SHARE_BOOK: "share_book",
  SHARE_CHAPTER: "share_chapter",
  COMMENT: "comment",
  CHAPTER_LIKE: "chapter_like",
  STORY_LIKE: "story_like",
  PLOT_TWIST_APPROVED: "plot_twist_approved",
  PLOT_TWIST_ACCEPTED: "plot_twist_accepted",
  PLOT_TWIST_CREDITED: "plot_twist_credited",
};

export const CARD_RARITY = {
  COMMON: "common",
  RARE: "rare",
  LEGENDARY: "legendary",
};

export const CARD_STATUS = {
  AVAILABLE: "available",
  SPENT: "spent",
  REFUNDED: "refunded",
};

export const EVENT_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  EXPIRED: "expired",
  REVIEWED: "reviewed",
};

export const MODERATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const PLOT_TWIST_LIMITS = {
  MIN_COMBINED_CHARS: 100,
  MAX_COMBINED_CHARS: 500,
  MAX_SUBMISSIONS_DEFAULT: 30,
  EVENT_DURATION_HOURS: 48,
  VOTING_TOP_N: 10,
  MIN_QUALITY_FOR_AUTHOR: 60,
};

export const SPAM_PHRASES = [
  /^kill everyone/i,
  /^nice story$/i,
  /^lol+$/i,
  /^test+$/i,
  /^asdf+$/i,
  /^good (book|story)$/i,
];
