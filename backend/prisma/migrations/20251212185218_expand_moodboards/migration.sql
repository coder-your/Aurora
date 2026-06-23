-- AlterTable
ALTER TABLE "moodboards" ADD COLUMN     "story_id" INTEGER;

-- CreateIndex
CREATE INDEX "moodboards_story_id_idx" ON "moodboards"("story_id");

-- AddForeignKey
ALTER TABLE "moodboards" ADD CONSTRAINT "moodboards_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;
