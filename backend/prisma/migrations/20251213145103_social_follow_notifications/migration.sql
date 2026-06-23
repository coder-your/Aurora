-- CreateTable
CREATE TABLE "writer_follows" (
    "id" SERIAL NOT NULL,
    "follower_id" INTEGER NOT NULL,
    "writer_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "writer_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "data" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "writer_follows_writer_id_created_at_idx" ON "writer_follows"("writer_id", "created_at");

-- CreateIndex
CREATE INDEX "writer_follows_follower_id_created_at_idx" ON "writer_follows"("follower_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "writer_follows_follower_id_writer_id_key" ON "writer_follows"("follower_id", "writer_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_created_at_idx" ON "notifications"("recipient_id", "is_read", "created_at");

-- AddForeignKey
ALTER TABLE "writer_follows" ADD CONSTRAINT "writer_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writer_follows" ADD CONSTRAINT "writer_follows_writer_id_fkey" FOREIGN KEY ("writer_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
