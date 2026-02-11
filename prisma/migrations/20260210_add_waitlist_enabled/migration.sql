-- Add waitlist_enabled flag to camps table
ALTER TABLE "camps" ADD COLUMN IF NOT EXISTS "waitlist_enabled" BOOLEAN NOT NULL DEFAULT TRUE;
