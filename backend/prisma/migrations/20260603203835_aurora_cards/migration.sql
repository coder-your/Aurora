-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "ai_turns_limit" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "ai_turns_used" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ai_assistant_history" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "capability" VARCHAR(50) NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_assistant_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_assistant_history_story_id_idx" ON "ai_assistant_history"("story_id");

-- CreateIndex
CREATE INDEX "ai_assistant_history_user_id_idx" ON "ai_assistant_history"("user_id");

-- CreateIndex
CREATE INDEX "ai_assistant_history_created_at_idx" ON "ai_assistant_history"("created_at");

-- AddForeignKey
ALTER TABLE "ai_assistant_history" ADD CONSTRAINT "ai_assistant_history_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_assistant_history" ADD CONSTRAINT "ai_assistant_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

