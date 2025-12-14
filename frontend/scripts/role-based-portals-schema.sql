-- ============================================================================
-- EMPOWERED SPORTS CAMP - ROLE-BASED PORTALS SCHEMA
-- ============================================================================
-- This migration adds:
-- 1. New cit_volunteer role
-- 2. LMS completion tracking fields on profiles
-- 3. Volunteer certifications table
-- 4. LMS modules and progress tables (minimal)
--
-- RUN THIS IN: Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD CIT_VOLUNTEER ROLE
-- ============================================================================
-- Update the CHECK constraint on user_roles to include the new role

-- First, drop the existing constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add updated constraint with cit_volunteer
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('parent', 'coach', 'director', 'licensee_owner', 'hq_admin', 'cit_volunteer'));

-- ============================================================================
-- SECTION 2: ADD LMS COMPLETION FIELDS TO PROFILES
-- ============================================================================
-- These flags gate access to operational tools per role

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_completed_lms_core BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_completed_lms_director BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_completed_lms_volunteer BOOLEAN DEFAULT false;

-- Also add a general onboarding completion flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================================================
-- SECTION 3: CREATE VOLUNTEER CERTIFICATIONS TABLE
-- ============================================================================
-- Tracks uploaded certification documents for CIT/Volunteer users

CREATE TYPE certification_status AS ENUM ('pending_review', 'approved', 'rejected', 'expired');

CREATE TABLE IF NOT EXISTS volunteer_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner of this certification
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Document details
  document_url TEXT NOT NULL,  -- Supabase Storage URL
  document_type TEXT NOT NULL, -- 'background_check', 'concussion_training', 'cpr_first_aid', 'other'
  document_name TEXT,          -- Original filename for display

  -- Status workflow
  status certification_status NOT NULL DEFAULT 'pending_review',

  -- Timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,      -- Optional expiration date
  reviewed_at TIMESTAMPTZ,
  reviewed_by_profile_id UUID REFERENCES profiles(id),

  -- Notes
  notes TEXT,                  -- Submitted by user
  reviewer_notes TEXT,         -- Notes from reviewer

  -- Tenant scope (for licensee-managed volunteers)
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_volunteer_certs_profile ON volunteer_certifications(profile_id);
CREATE INDEX idx_volunteer_certs_status ON volunteer_certifications(status);
CREATE INDEX idx_volunteer_certs_tenant ON volunteer_certifications(tenant_id);

-- Document type constraint
ALTER TABLE volunteer_certifications ADD CONSTRAINT valid_document_type
  CHECK (document_type IN ('background_check', 'concussion_training', 'cpr_first_aid', 'safe_sport', 'other'));

-- ============================================================================
-- SECTION 4: LMS MODULES TABLE (Minimal)
-- ============================================================================
-- Tracks available LMS modules and their requirements per role

CREATE TABLE IF NOT EXISTS lms_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Module info
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Who needs this module
  required_for_roles TEXT[] DEFAULT '{}', -- Array of role slugs

  -- Module content (could be external URL or internal path)
  content_url TEXT,
  duration_minutes INTEGER DEFAULT 30,

  -- Ordering
  order_index INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: LMS PROGRESS TABLE
-- ============================================================================
-- Tracks user progress through LMS modules

CREATE TABLE IF NOT EXISTS lms_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES lms_modules(id) ON DELETE CASCADE,

  -- Progress tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),

  -- Quiz/assessment results if applicable
  quiz_score INTEGER,
  quiz_passed BOOLEAN,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(profile_id, module_id)
);

CREATE INDEX idx_lms_progress_profile ON lms_progress(profile_id);
CREATE INDEX idx_lms_progress_completed ON lms_progress(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- SECTION 6: SEED DEFAULT LMS MODULES
-- ============================================================================

INSERT INTO lms_modules (slug, title, description, required_for_roles, duration_minutes, order_index) VALUES
  ('core-operations', 'Core Operations Training', 'Essential operational knowledge for all staff', ARRAY['licensee_owner', 'director', 'coach', 'cit_volunteer'], 45, 1),
  ('director-certification', 'Director Certification Program', 'Advanced training for camp directors including emergency procedures, group management, and leadership', ARRAY['director'], 90, 2),
  ('volunteer-orientation', 'CIT & Volunteer Orientation', 'Introduction to camp policies, safety procedures, and youth interaction guidelines', ARRAY['cit_volunteer'], 30, 3),
  ('business-fundamentals', 'Business Fundamentals', 'Licensee business operations, royalty tracking, and financial management', ARRAY['licensee_owner'], 60, 4),
  ('coach-training', 'Coach Training Module', 'Sport-specific coaching techniques and camper engagement strategies', ARRAY['coach'], 45, 5)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  required_for_roles = EXCLUDED.required_for_roles;

-- ============================================================================
-- SECTION 7: RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE volunteer_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_progress ENABLE ROW LEVEL SECURITY;

-- VOLUNTEER CERTIFICATIONS POLICIES

-- Users can view their own certifications
CREATE POLICY "Users can view own certifications"
ON volunteer_certifications FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Admins and licensee owners can view certifications in their tenant
CREATE POLICY "Admins can view tenant certifications"
ON volunteer_certifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND (
      user_roles.role = 'hq_admin'
      OR (user_roles.role IN ('licensee_owner', 'director') AND user_roles.tenant_id = volunteer_certifications.tenant_id)
    )
  )
);

-- Users can insert their own certifications
CREATE POLICY "Users can upload own certifications"
ON volunteer_certifications FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Users can update their own pending certifications
CREATE POLICY "Users can update own pending certifications"
ON volunteer_certifications FOR UPDATE
TO authenticated
USING (profile_id = auth.uid() AND status = 'pending_review');

-- Admins can update certification status (for review)
CREATE POLICY "Admins can review certifications"
ON volunteer_certifications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND (
      user_roles.role = 'hq_admin'
      OR (user_roles.role IN ('licensee_owner', 'director') AND user_roles.tenant_id = volunteer_certifications.tenant_id)
    )
  )
);

-- Users can delete their own pending certifications
CREATE POLICY "Users can delete own pending certifications"
ON volunteer_certifications FOR DELETE
TO authenticated
USING (profile_id = auth.uid() AND status = 'pending_review');

-- LMS MODULES POLICIES

-- All authenticated users can view active modules
CREATE POLICY "Anyone can view LMS modules"
ON lms_modules FOR SELECT
TO authenticated
USING (is_active = true);

-- Only hq_admin can manage modules
CREATE POLICY "HQ admin can manage LMS modules"
ON lms_modules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'hq_admin'
  )
);

-- LMS PROGRESS POLICIES

-- Users can view their own progress
CREATE POLICY "Users can view own LMS progress"
ON lms_progress FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Admins can view all progress for reporting
CREATE POLICY "Admins can view all LMS progress"
ON lms_progress FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('hq_admin', 'licensee_owner', 'director')
  )
);

-- Users can manage their own progress
CREATE POLICY "Users can manage own LMS progress"
ON lms_progress FOR ALL
TO authenticated
USING (profile_id = auth.uid());

-- ============================================================================
-- SECTION 8: HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user has completed required LMS for their role
CREATE OR REPLACE FUNCTION check_lms_completion(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_completed BOOLEAN;
BEGIN
  -- Check the appropriate flag based on role
  CASE p_role
    WHEN 'director' THEN
      SELECT has_completed_lms_director INTO v_completed
      FROM profiles WHERE id = p_user_id;
    WHEN 'cit_volunteer' THEN
      SELECT has_completed_lms_volunteer INTO v_completed
      FROM profiles WHERE id = p_user_id;
    WHEN 'licensee_owner' THEN
      SELECT has_completed_lms_core INTO v_completed
      FROM profiles WHERE id = p_user_id;
    WHEN 'coach' THEN
      SELECT has_completed_lms_core INTO v_completed
      FROM profiles WHERE id = p_user_id;
    ELSE
      v_completed := true; -- No LMS requirement for parent/hq_admin
  END CASE;

  RETURN COALESCE(v_completed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update LMS completion flags when all required modules are done
CREATE OR REPLACE FUNCTION update_lms_completion_flags()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_all_director_done BOOLEAN;
  v_all_volunteer_done BOOLEAN;
  v_all_core_done BOOLEAN;
BEGIN
  v_profile_id := NEW.profile_id;

  -- Check director modules completion
  SELECT NOT EXISTS (
    SELECT 1 FROM lms_modules m
    WHERE 'director' = ANY(m.required_for_roles)
    AND m.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM lms_progress p
      WHERE p.profile_id = v_profile_id
      AND p.module_id = m.id
      AND p.completed_at IS NOT NULL
    )
  ) INTO v_all_director_done;

  -- Check volunteer modules completion
  SELECT NOT EXISTS (
    SELECT 1 FROM lms_modules m
    WHERE 'cit_volunteer' = ANY(m.required_for_roles)
    AND m.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM lms_progress p
      WHERE p.profile_id = v_profile_id
      AND p.module_id = m.id
      AND p.completed_at IS NOT NULL
    )
  ) INTO v_all_volunteer_done;

  -- Check core modules completion
  SELECT NOT EXISTS (
    SELECT 1 FROM lms_modules m
    WHERE 'licensee_owner' = ANY(m.required_for_roles)
    AND 'core-operations' = m.slug
    AND m.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM lms_progress p
      WHERE p.profile_id = v_profile_id
      AND p.module_id = m.id
      AND p.completed_at IS NOT NULL
    )
  ) INTO v_all_core_done;

  -- Update profile flags
  UPDATE profiles SET
    has_completed_lms_director = v_all_director_done,
    has_completed_lms_volunteer = v_all_volunteer_done,
    has_completed_lms_core = v_all_core_done,
    updated_at = NOW()
  WHERE id = v_profile_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update completion flags
DROP TRIGGER IF EXISTS trg_update_lms_completion ON lms_progress;
CREATE TRIGGER trg_update_lms_completion
  AFTER INSERT OR UPDATE OF completed_at ON lms_progress
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION update_lms_completion_flags();

-- ============================================================================
-- SECTION 9: UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_volunteer_certs_updated_at ON volunteer_certifications;
CREATE TRIGGER trg_volunteer_certs_updated_at
  BEFORE UPDATE ON volunteer_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lms_progress_updated_at ON lms_progress;
CREATE TRIGGER trg_lms_progress_updated_at
  BEFORE UPDATE ON lms_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE!
-- ============================================================================
-- After running this migration:
-- 1. The user_roles table now accepts 'cit_volunteer' as a valid role
-- 2. Profiles have LMS completion tracking fields
-- 3. Volunteer certifications can be uploaded and tracked
-- 4. LMS modules and progress are ready for use
-- ============================================================================
