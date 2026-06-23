-- CreateTable
CREATE TABLE "moodboards" (
    "moodboard_id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "data" TEXT,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moodboards_pkey" PRIMARY KEY ("moodboard_id")
);

-- CreateIndex
CREATE INDEX "moodboards_owner_id_visibility_idx" ON "moodboards"("owner_id", "visibility");

-- AddForeignKey
ALTER TABLE "moodboards" ADD CONSTRAINT "moodboards_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
