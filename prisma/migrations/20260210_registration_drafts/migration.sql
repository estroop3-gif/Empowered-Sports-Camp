-- CreateTable: registration_drafts
CREATE TABLE IF NOT EXISTS "registration_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_email" TEXT NOT NULL,
    "parent_name" TEXT,
    "camp_id" UUID NOT NULL,
    "camp_name" TEXT NOT NULL,
    "camp_slug" TEXT NOT NULL,
    "tenant_id" UUID,
    "checkout_state" JSONB NOT NULL,
    "current_step" TEXT NOT NULL,
    "camper_count" INTEGER NOT NULL DEFAULT 1,
    "total_estimate" DOUBLE PRECISION,
    "reminder_24h_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_72h_sent" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_drafts_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one draft per parent per camp
CREATE UNIQUE INDEX IF NOT EXISTS "registration_drafts_parent_email_camp_id_key"
    ON "registration_drafts"("parent_email", "camp_id");

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS "registration_drafts_parent_email_idx"
    ON "registration_drafts"("parent_email");
CREATE INDEX IF NOT EXISTS "registration_drafts_expires_at_idx"
    ON "registration_drafts"("expires_at");
CREATE INDEX IF NOT EXISTS "registration_drafts_reminder_24h_sent_idx"
    ON "registration_drafts"("reminder_24h_sent");
CREATE INDEX IF NOT EXISTS "registration_drafts_reminder_72h_sent_idx"
    ON "registration_drafts"("reminder_72h_sent");

-- Foreign key to camps
ALTER TABLE "registration_drafts"
    ADD CONSTRAINT "registration_drafts_camp_id_fkey"
    FOREIGN KEY ("camp_id") REFERENCES "camps"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new EmailType enum values
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'draft_save_confirmation';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'draft_reminder_24h';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'draft_reminder_72h';
