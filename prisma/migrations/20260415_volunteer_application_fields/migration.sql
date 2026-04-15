-- Migration: Add volunteer application fields to cit_applications
-- Adds prior_experience, background_summary, volunteer_roles, availability_windows

ALTER TABLE cit_applications
  ADD COLUMN IF NOT EXISTS prior_experience       TEXT,
  ADD COLUMN IF NOT EXISTS background_summary     TEXT,
  ADD COLUMN IF NOT EXISTS volunteer_roles        TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_windows   TEXT[]  DEFAULT '{}';
