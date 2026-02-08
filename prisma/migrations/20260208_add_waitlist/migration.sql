-- Add waitlist fields to registrations
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS waitlist_joined_at TIMESTAMPTZ;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS waitlist_offer_sent_at TIMESTAMPTZ;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS waitlist_offer_expires_at TIMESTAMPTZ;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS waitlist_offer_token TEXT;

-- Partial index for efficient waitlist queries
CREATE INDEX IF NOT EXISTS registrations_camp_waitlist_idx
  ON registrations (camp_id, waitlist_position)
  WHERE waitlist_position IS NOT NULL;

-- Add new EmailType enum values
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'waitlist_confirmation';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'waitlist_offer';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'waitlist_offer_expired';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'waitlist_nearby_camps';
