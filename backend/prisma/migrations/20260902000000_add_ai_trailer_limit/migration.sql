-- Add AI trailer generation limit fields to users table

ALTER TABLE "users" ADD COLUMN "ai_trailer_limit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "users" ADD COLUMN "ai_trailer_used" INTEGER NOT NULL DEFAULT 0;