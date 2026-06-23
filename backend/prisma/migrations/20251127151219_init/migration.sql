-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "first_name" VARCHAR(50),
    "last_name" VARCHAR(50),
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_writer" BOOLEAN NOT NULL DEFAULT false,
    "is_reader" BOOLEAN NOT NULL DEFAULT true,
    "reset_token" VARCHAR(255),
    "reset_token_expires" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" VARCHAR(255),
    "two_factor_code" VARCHAR(10),
    "two_factor_expires" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "profile_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_name" VARCHAR(50),
    "last_name" VARCHAR(50),
    "handle_name" VARCHAR(50),
    "nickname" VARCHAR(50),
    "pronouns" VARCHAR(30),
    "bio" TEXT,
    "gender" VARCHAR(20),
    "profile_image" TEXT,
    "total_books_read" INTEGER NOT NULL DEFAULT 0,
    "total_books_written" INTEGER NOT NULL DEFAULT 0,
    "role" VARCHAR(20) NOT NULL DEFAULT 'reader',
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "stories" (
    "story_id" SERIAL NOT NULL,
    "author_id" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "category" VARCHAR(50),
    "tags" TEXT,
    "cover_url" TEXT,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "status" VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    "is_mature" BOOLEAN NOT NULL DEFAULT false,
    "has_copyright" BOOLEAN NOT NULL DEFAULT false,
    "total_words" INTEGER NOT NULL DEFAULT 0,
    "total_chapters" INTEGER NOT NULL DEFAULT 0,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("story_id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "chapter_id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "content_raw" TEXT,
    "content_html" TEXT,
    "content_delta" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "char_count" INTEGER NOT NULL DEFAULT 0,
    "paragraphs" INTEGER NOT NULL DEFAULT 0,
    "reading_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("chapter_id")
);

-- CreateTable
CREATE TABLE "chapter_versions" (
    "version_id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "content_raw" TEXT NOT NULL,
    "content_html" TEXT NOT NULL,
    "content_delta" TEXT,
    "word_count" INTEGER NOT NULL,
    "char_count" INTEGER NOT NULL,
    "paragraphs" INTEGER NOT NULL,
    "reading_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signature" VARCHAR(255) NOT NULL,

    CONSTRAINT "chapter_versions_pkey" PRIMARY KEY ("version_id")
);

-- CreateTable
CREATE TABLE "story_versions" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "media_id" SERIAL NOT NULL,
    "owner_id" INTEGER,
    "url" TEXT NOT NULL,
    "mime_type" VARCHAR(100),
    "size_bytes" INTEGER,
    "source" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("media_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_handle" ON "user_profiles"("handle_name");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_versions" ADD CONSTRAINT "chapter_versions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("chapter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_versions" ADD CONSTRAINT "chapter_versions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;
