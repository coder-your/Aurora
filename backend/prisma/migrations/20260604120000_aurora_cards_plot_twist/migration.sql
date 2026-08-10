-- Aurora Cards & Plot Twist feature

CREATE TABLE "reader_engagement" (
    "user_id" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "points_in_current_cycle" INTEGER NOT NULL DEFAULT 0,
    "total_cards_earned" INTEGER NOT NULL DEFAULT 0,
    "daily_streak" INTEGER NOT NULL DEFAULT 0,
    "last_streak_date" DATE,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reader_engagement_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "engagement_point_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "activity_type" VARCHAR(50) NOT NULL,
    "points" INTEGER NOT NULL,
    "reference_type" VARCHAR(30),
    "reference_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "engagement_point_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plot_twist_events" (
    "event_id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "max_submissions" INTEGER NOT NULL DEFAULT 30,
    "voting_enabled" BOOLEAN NOT NULL DEFAULT true,
    "closes_at" TIMESTAMP(6) NOT NULL,
    "closed_at" TIMESTAMP(6),
    "reviewed_at" TIMESTAMP(6),
    "author_decision" VARCHAR(30),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plot_twist_events_pkey" PRIMARY KEY ("event_id")
);

CREATE TABLE "aurora_cards" (
    "card_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rarity" VARCHAR(20) NOT NULL DEFAULT 'common',
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "earned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spent_at" TIMESTAMP(6),
    "refunded_at" TIMESTAMP(6),
    "event_id" INTEGER,
    CONSTRAINT "aurora_cards_pkey" PRIMARY KEY ("card_id")
);

CREATE TABLE "plot_twist_submissions" (
    "submission_id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "card_id" INTEGER NOT NULL,
    "twist_title" VARCHAR(120) NOT NULL,
    "twist_description" TEXT NOT NULL,
    "why_fits" TEXT NOT NULL,
    "combined_char_count" INTEGER NOT NULL,
    "moderation_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "quality_score" DOUBLE PRECISION,
    "originality_label" VARCHAR(20),
    "excitement_label" VARCHAR(20),
    "moderation_notes" TEXT,
    "author_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "vote_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plot_twist_submissions_pkey" PRIMARY KEY ("submission_id")
);

CREATE TABLE "plot_twist_votes" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plot_twist_votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plot_twist_contributors" (
    "user_id" INTEGER NOT NULL,
    "accepted_count" INTEGER NOT NULL DEFAULT 0,
    "stories_influenced" INTEGER NOT NULL DEFAULT 0,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "approval_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "influencer_level" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plot_twist_contributors_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "plot_twist_chapter_credits" (
    "credit_id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "credit_note" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plot_twist_chapter_credits_pkey" PRIMARY KEY ("credit_id")
);

CREATE TABLE "plot_twist_credit_contributors" (
    "id" SERIAL NOT NULL,
    "credit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "submission_id" INTEGER,
    "display_handle" VARCHAR(50),
    CONSTRAINT "plot_twist_credit_contributors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "engagement_activity_unique" ON "engagement_point_logs"("user_id", "activity_type", "reference_type", "reference_id");
CREATE INDEX "plot_twist_credit_contributors_credit_id_idx" ON "plot_twist_credit_contributors"("credit_id");
CREATE INDEX "plot_twist_votes_submission_id_idx" ON "plot_twist_votes"("submission_id");
CREATE INDEX "engagement_point_logs_user_id_created_at_idx" ON "engagement_point_logs"("user_id", "created_at");
CREATE INDEX "aurora_cards_user_id_status_idx" ON "aurora_cards"("user_id", "status");
CREATE INDEX "plot_twist_events_story_id_chapter_id_idx" ON "plot_twist_events"("story_id", "chapter_id");
CREATE INDEX "plot_twist_events_author_id_status_idx" ON "plot_twist_events"("author_id", "status");
CREATE INDEX "plot_twist_events_status_closes_at_idx" ON "plot_twist_events"("status", "closes_at");
CREATE UNIQUE INDEX "plot_twist_submissions_event_id_user_id_key" ON "plot_twist_submissions"("event_id", "user_id");
CREATE UNIQUE INDEX "plot_twist_submissions_card_id_key" ON "plot_twist_submissions"("card_id");
CREATE INDEX "plot_twist_submissions_event_id_moderation_status_quality_score_idx" ON "plot_twist_submissions"("event_id", "moderation_status", "quality_score");
CREATE UNIQUE INDEX "plot_twist_votes_submission_id_user_id_key" ON "plot_twist_votes"("submission_id", "user_id");
CREATE UNIQUE INDEX "plot_twist_chapter_credits_event_id_key" ON "plot_twist_chapter_credits"("event_id");

ALTER TABLE "reader_engagement" ADD CONSTRAINT "reader_engagement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engagement_point_logs" ADD CONSTRAINT "engagement_point_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_events" ADD CONSTRAINT "plot_twist_events_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_events" ADD CONSTRAINT "plot_twist_events_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("chapter_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_events" ADD CONSTRAINT "plot_twist_events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aurora_cards" ADD CONSTRAINT "aurora_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aurora_cards" ADD CONSTRAINT "aurora_cards_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "plot_twist_events"("event_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plot_twist_submissions" ADD CONSTRAINT "plot_twist_submissions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "plot_twist_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_submissions" ADD CONSTRAINT "plot_twist_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_submissions" ADD CONSTRAINT "plot_twist_submissions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "aurora_cards"("card_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_votes" ADD CONSTRAINT "plot_twist_votes_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "plot_twist_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_votes" ADD CONSTRAINT "plot_twist_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_contributors" ADD CONSTRAINT "plot_twist_contributors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_chapter_credits" ADD CONSTRAINT "plot_twist_chapter_credits_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "plot_twist_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_chapter_credits" ADD CONSTRAINT "plot_twist_chapter_credits_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("chapter_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plot_twist_credit_contributors" ADD CONSTRAINT "plot_twist_credit_contributors_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "plot_twist_chapter_credits"("credit_id") ON DELETE CASCADE ON UPDATE CASCADE;
