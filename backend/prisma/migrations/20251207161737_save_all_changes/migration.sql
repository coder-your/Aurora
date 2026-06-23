-- CreateTable
CREATE TABLE "to_be_read" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "story_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "to_be_read_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_read_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "story_id" INTEGER NOT NULL,
    "last_read" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_read_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_tags" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "tag" VARCHAR(50) NOT NULL,

    CONSTRAINT "story_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "to_be_read_user_id_story_id_key" ON "to_be_read"("user_id", "story_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_read_history_user_id_story_id_key" ON "user_read_history"("user_id", "story_id");

-- AddForeignKey
ALTER TABLE "to_be_read" ADD CONSTRAINT "to_be_read_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "to_be_read" ADD CONSTRAINT "to_be_read_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_history" ADD CONSTRAINT "user_read_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_history" ADD CONSTRAINT "user_read_history_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;
