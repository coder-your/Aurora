/*
  Warnings:

  - A unique constraint covering the columns `[comment_id,reporter_id]` on the table `comment_reports` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "comment_reports_comment_id_reporter_id_key" ON "comment_reports"("comment_id", "reporter_id");
