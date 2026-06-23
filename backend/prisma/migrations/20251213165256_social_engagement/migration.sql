-- CreateTable
CREATE TABLE "story_likes" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_likes" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "writer_posts" (
    "id" SERIAL NOT NULL,
    "writer_id" INTEGER NOT NULL,
    "story_id" INTEGER,
    "type" VARCHAR(30) NOT NULL DEFAULT 'post',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "writer_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_author_notes" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "placement" VARCHAR(10) NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_author_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_milestones" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "metric" VARCHAR(30) NOT NULL,
    "threshold" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_comment_settings" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "comments_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_comment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_keyword_filters" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "keyword" VARCHAR(100) NOT NULL,
    "is_blocked" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_keyword_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "comment_id" SERIAL NOT NULL,
    "story_id" INTEGER,
    "chapter_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "comment_reactions" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reaction" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_mentions" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "mentioned_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reports" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_reviews" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "review_text" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_shares" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "platform" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_shares" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "platform" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_likes_story_id_created_at_idx" ON "story_likes"("story_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "story_likes_user_id_story_id_key" ON "story_likes"("user_id", "story_id");

-- CreateIndex
CREATE INDEX "chapter_likes_chapter_id_created_at_idx" ON "chapter_likes"("chapter_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_likes_user_id_chapter_id_key" ON "chapter_likes"("user_id", "chapter_id");

-- CreateIndex
CREATE INDEX "writer_posts_writer_id_created_at_idx" ON "writer_posts"("writer_id", "created_at");

-- CreateIndex
CREATE INDEX "writer_posts_story_id_idx" ON "writer_posts"("story_id");

-- CreateIndex
CREATE INDEX "chapter_author_notes_author_id_updated_at_idx" ON "chapter_author_notes"("author_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_author_notes_chapter_id_placement_key" ON "chapter_author_notes"("chapter_id", "placement");

-- CreateIndex
CREATE INDEX "story_milestones_story_id_created_at_idx" ON "story_milestones"("story_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "story_milestones_story_id_metric_threshold_key" ON "story_milestones"("story_id", "metric", "threshold");

-- CreateIndex
CREATE UNIQUE INDEX "story_comment_settings_story_id_key" ON "story_comment_settings"("story_id");

-- CreateIndex
CREATE INDEX "comment_keyword_filters_story_id_created_at_idx" ON "comment_keyword_filters"("story_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "comment_keyword_filters_story_id_keyword_key" ON "comment_keyword_filters"("story_id", "keyword");

-- CreateIndex
CREATE INDEX "comments_story_id_created_at_idx" ON "comments"("story_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_chapter_id_created_at_idx" ON "comments"("chapter_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "comment_reactions_comment_id_created_at_idx" ON "comment_reactions"("comment_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "comment_reactions_comment_id_user_id_reaction_key" ON "comment_reactions"("comment_id", "user_id", "reaction");

-- CreateIndex
CREATE INDEX "comment_mentions_mentioned_user_id_created_at_idx" ON "comment_mentions"("mentioned_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "comment_mentions_comment_id_mentioned_user_id_key" ON "comment_mentions"("comment_id", "mentioned_user_id");

-- CreateIndex
CREATE INDEX "comment_reports_comment_id_created_at_idx" ON "comment_reports"("comment_id", "created_at");

-- CreateIndex
CREATE INDEX "story_reviews_story_id_created_at_idx" ON "story_reviews"("story_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "story_reviews_story_id_user_id_key" ON "story_reviews"("story_id", "user_id");

-- CreateIndex
CREATE INDEX "story_shares_story_id_created_at_idx" ON "story_shares"("story_id", "created_at");

-- CreateIndex
CREATE INDEX "chapter_shares_chapter_id_created_at_idx" ON "chapter_shares"("chapter_id", "created_at");

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_likes" ADD CONSTRAINT "chapter_likes_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("chapter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_likes" ADD CONSTRAINT "chapter_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writer_posts" ADD CONSTRAINT "writer_posts_writer_id_fkey" FOREIGN KEY ("writer_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writer_posts" ADD CONSTRAINT "writer_posts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_author_notes" ADD CONSTRAINT "chapter_author_notes_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("chapter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_author_notes" ADD CONSTRAINT "chapter_author_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_milestones" ADD CONSTRAINT "story_milestones_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_comment_settings" ADD CONSTRAINT "story_comment_settings_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_keyword_filters" ADD CONSTRAINT "comment_keyword_filters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("chapter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_reviews" ADD CONSTRAINT "story_reviews_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_reviews" ADD CONSTRAINT "story_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_shares" ADD CONSTRAINT "story_shares_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_shares" ADD CONSTRAINT "story_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_shares" ADD CONSTRAINT "chapter_shares_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("chapter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_shares" ADD CONSTRAINT "chapter_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
