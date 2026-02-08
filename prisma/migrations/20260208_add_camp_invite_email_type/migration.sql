-- Add camp_invite to EmailType enum
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'camp_invite';
