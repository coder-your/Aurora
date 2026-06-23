-- AlterTable
ALTER TABLE "moodboards" ADD COLUMN     "layout_state" TEXT,
ADD COLUMN     "story_vibe" TEXT;

-- CreateTable
CREATE TABLE "moodboard_vibe_panel" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "color_palette" TEXT,
    "images" TEXT,
    "themes" TEXT,
    "vibe_summary" TEXT,

    CONSTRAINT "moodboard_vibe_panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_characters" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "age" VARCHAR(50),
    "role" VARCHAR(100),
    "image_url" TEXT,
    "introvert_extrovert" INTEGER NOT NULL DEFAULT 50,
    "soft_fierce" INTEGER NOT NULL DEFAULT 50,
    "chaotic_ordered" INTEGER NOT NULL DEFAULT 50,
    "logical_emotional" INTEGER NOT NULL DEFAULT 50,
    "backstory" TEXT,
    "extra_gallery" TEXT,

    CONSTRAINT "moodboard_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_world_locations" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "kind" VARCHAR(50),
    "image_url" TEXT,
    "notes" TEXT,

    CONSTRAINT "moodboard_world_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_world_meta" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "magic_rules" TEXT,
    "politics" TEXT,
    "society" TEXT,
    "culture_food" TEXT,
    "clothing" TEXT,

    CONSTRAINT "moodboard_world_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_quotes" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "kind" VARCHAR(30),
    "text" TEXT NOT NULL,
    "speaker" VARCHAR(100),
    "tone" VARCHAR(50),

    CONSTRAINT "moodboard_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_tracks" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "label" VARCHAR(255),
    "spotify_id" VARCHAR(191),
    "spotify_url" TEXT,
    "ambient_tag" VARCHAR(50),
    "scene_label" VARCHAR(255),

    CONSTRAINT "moodboard_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_inspirations" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255),
    "source" VARCHAR(100),
    "url" TEXT,
    "content" TEXT,
    "meta" TEXT,

    CONSTRAINT "moodboard_inspirations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_notes" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255),
    "content" TEXT,
    "parent_id" INTEGER,
    "pos_x" INTEGER,
    "pos_y" INTEGER,
    "color" VARCHAR(20),

    CONSTRAINT "moodboard_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_timeline_events" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "act" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "moodboard_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_character_links" (
    "id" SERIAL NOT NULL,
    "moodboard_id" INTEGER NOT NULL,
    "from_id" INTEGER NOT NULL,
    "to_id" INTEGER NOT NULL,
    "label" VARCHAR(255),
    "intensity" INTEGER,

    CONSTRAINT "moodboard_character_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moodboard_vibe_panel_moodboard_id_key" ON "moodboard_vibe_panel"("moodboard_id");

-- CreateIndex
CREATE INDEX "moodboard_characters_moodboard_id_idx" ON "moodboard_characters"("moodboard_id");

-- CreateIndex
CREATE INDEX "moodboard_world_locations_moodboard_id_idx" ON "moodboard_world_locations"("moodboard_id");

-- CreateIndex
CREATE UNIQUE INDEX "moodboard_world_meta_moodboard_id_key" ON "moodboard_world_meta"("moodboard_id");

-- CreateIndex
CREATE INDEX "moodboard_quotes_moodboard_id_idx" ON "moodboard_quotes"("moodboard_id");

-- CreateIndex
CREATE INDEX "moodboard_tracks_moodboard_id_idx" ON "moodboard_tracks"("moodboard_id");

-- CreateIndex
CREATE INDEX "moodboard_inspirations_moodboard_id_idx" ON "moodboard_inspirations"("moodboard_id");

-- CreateIndex
CREATE INDEX "moodboard_notes_moodboard_id_idx" ON "moodboard_notes"("moodboard_id");

-- CreateIndex
CREATE INDEX "moodboard_timeline_events_moodboard_id_idx" ON "moodboard_timeline_events"("moodboard_id");

-- CreateIndex
CREATE INDEX "moodboard_character_links_moodboard_id_idx" ON "moodboard_character_links"("moodboard_id");

-- AddForeignKey
ALTER TABLE "moodboard_vibe_panel" ADD CONSTRAINT "moodboard_vibe_panel_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_characters" ADD CONSTRAINT "moodboard_characters_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_world_locations" ADD CONSTRAINT "moodboard_world_locations_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_world_meta" ADD CONSTRAINT "moodboard_world_meta_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_quotes" ADD CONSTRAINT "moodboard_quotes_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_tracks" ADD CONSTRAINT "moodboard_tracks_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_inspirations" ADD CONSTRAINT "moodboard_inspirations_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_notes" ADD CONSTRAINT "moodboard_notes_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_timeline_events" ADD CONSTRAINT "moodboard_timeline_events_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_character_links" ADD CONSTRAINT "moodboard_character_links_moodboard_id_fkey" FOREIGN KEY ("moodboard_id") REFERENCES "moodboards"("moodboard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_character_links" ADD CONSTRAINT "moodboard_character_links_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "moodboard_characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moodboard_character_links" ADD CONSTRAINT "moodboard_character_links_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "moodboard_characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
