-- ============================================
-- CURRICULUM BUILDER - DATABASE SCHEMA
-- ============================================
-- This schema supports the Curriculum Builder feature for Empowered Sports Camp.
--
-- TABLE RELATIONSHIPS:
--
-- curriculum_templates (top-level container)
--   └── curriculum_template_days (Day 1, Day 2, etc.)
--         └── curriculum_day_blocks (blocks assigned to each day, ordered)
--               └── curriculum_blocks (reusable block library)
--
-- camp_session_curriculum links templates to actual camp sessions
--
-- MULTI-TENANT NOTES:
-- - licensee_id = NULL means "global" (HQ-created, visible to all)
-- - licensee_id = UUID means "licensee-specific" (only that licensee sees it)
-- ============================================

-- ============================================
-- ENUM TYPES
-- ============================================

-- Sport types offered
CREATE TYPE sport_type AS ENUM (
  'multi_sport',
  'basketball',
  'soccer',
  'volleyball',
  'softball',
  'flag_football',
  'lacrosse',
  'field_hockey',
  'track_field',
  'speed_agility'
);

-- Difficulty levels for templates
CREATE TYPE difficulty_level AS ENUM (
  'intro',
  'beginner',
  'intermediate',
  'advanced'
);

-- Block categories
CREATE TYPE block_category AS ENUM (
  'warmup',
  'drill',
  'skill_station',
  'scrimmage',
  'game',
  'mindset',
  'leadership',
  'team_building',
  'cooldown',
  'water_break',
  'transition',
  'other'
);

-- Intensity levels for blocks
CREATE TYPE intensity_level AS ENUM (
  'low',
  'moderate',
  'high',
  'variable'
);

-- ============================================
-- TABLE: curriculum_templates
-- ============================================
-- Represents a full curriculum template for a camp type/sport/age band.
-- Example: "Intro Multi-Sport Confidence Camp - Ages 5-7 - Week 1"

CREATE TABLE IF NOT EXISTS curriculum_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant: NULL = global (HQ), UUID = licensee-specific
  licensee_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template metadata
  sport sport_type NOT NULL DEFAULT 'multi_sport',
  name TEXT NOT NULL,
  description TEXT,

  -- Age targeting (nullable for flexible templates)
  age_min INTEGER CHECK (age_min >= 3 AND age_min <= 18),
  age_max INTEGER CHECK (age_max >= 3 AND age_max <= 18),

  -- Difficulty
  difficulty difficulty_level NOT NULL DEFAULT 'intro',

  -- Is this a global HQ template? (redundant with licensee_id but explicit)
  is_global BOOLEAN NOT NULL DEFAULT false,

  -- Number of days in this template (denormalized for quick display)
  total_days INTEGER NOT NULL DEFAULT 1,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,

  -- Audit fields
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_age_range CHECK (age_min IS NULL OR age_max IS NULL OR age_min <= age_max)
);

-- Indexes for common queries
CREATE INDEX idx_curriculum_templates_licensee ON curriculum_templates(licensee_id);
CREATE INDEX idx_curriculum_templates_sport ON curriculum_templates(sport);
CREATE INDEX idx_curriculum_templates_global ON curriculum_templates(is_global) WHERE is_global = true;
CREATE INDEX idx_curriculum_templates_active ON curriculum_templates(is_active) WHERE is_active = true;

-- ============================================
-- TABLE: curriculum_blocks
-- ============================================
-- Reusable building blocks like "Dynamic Warmup - 15 min", "Ball Handling Circuit - 20 min"
-- These can be used across multiple templates and days.

CREATE TABLE IF NOT EXISTS curriculum_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant: NULL = global (HQ), UUID = licensee-specific
  licensee_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Block metadata
  sport sport_type NOT NULL DEFAULT 'multi_sport',
  title TEXT NOT NULL,
  description TEXT,

  -- Timing
  duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes > 0 AND duration_minutes <= 180),

  -- Categorization
  category block_category NOT NULL DEFAULT 'drill',
  intensity intensity_level DEFAULT 'moderate',

  -- Equipment/setup notes
  equipment_needed TEXT,
  setup_notes TEXT,

  -- Coaching tips
  coaching_points TEXT,

  -- Is this a global HQ block?
  is_global BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_curriculum_blocks_licensee ON curriculum_blocks(licensee_id);
CREATE INDEX idx_curriculum_blocks_sport ON curriculum_blocks(sport);
CREATE INDEX idx_curriculum_blocks_category ON curriculum_blocks(category);
CREATE INDEX idx_curriculum_blocks_global ON curriculum_blocks(is_global) WHERE is_global = true;

-- ============================================
-- TABLE: curriculum_template_days
-- ============================================
-- Represents a single day within a template (Day 1, Day 2, etc.)

CREATE TABLE IF NOT EXISTS curriculum_template_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent template
  template_id UUID NOT NULL REFERENCES curriculum_templates(id) ON DELETE CASCADE,

  -- Day info
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  title TEXT NOT NULL, -- e.g., "Day 1 - Foundations & Confidence"
  theme TEXT, -- e.g., "Building Confidence Through Movement"
  notes TEXT, -- Overview notes for coaches

  -- Total duration (denormalized, updated when blocks change)
  total_duration_minutes INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each template can only have one Day 1, one Day 2, etc.
  CONSTRAINT unique_template_day UNIQUE (template_id, day_number)
);

-- Indexes
CREATE INDEX idx_curriculum_template_days_template ON curriculum_template_days(template_id);

-- ============================================
-- TABLE: curriculum_day_blocks
-- ============================================
-- Links blocks to specific days with ordering.
-- This is a junction table that allows blocks to be reused across days/templates.

CREATE TABLE IF NOT EXISTS curriculum_day_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent day
  day_id UUID NOT NULL REFERENCES curriculum_template_days(id) ON DELETE CASCADE,

  -- The block being used
  block_id UUID NOT NULL REFERENCES curriculum_blocks(id) ON DELETE CASCADE,

  -- Ordering within the day
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Optional overrides for this specific instance
  custom_title TEXT, -- Override block title for this day
  custom_duration_minutes INTEGER CHECK (custom_duration_minutes > 0),
  custom_notes TEXT, -- Day-specific notes

  -- Location/setup for this instance
  field_location TEXT, -- e.g., "Court A", "Field 1", "Indoor Gym"

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate blocks on the same day at same position
  CONSTRAINT unique_day_block_order UNIQUE (day_id, order_index)
);

-- Indexes
CREATE INDEX idx_curriculum_day_blocks_day ON curriculum_day_blocks(day_id);
CREATE INDEX idx_curriculum_day_blocks_block ON curriculum_day_blocks(block_id);
CREATE INDEX idx_curriculum_day_blocks_order ON curriculum_day_blocks(day_id, order_index);

-- ============================================
-- TABLE: camp_session_curriculum
-- ============================================
-- Links a curriculum template to a specific camp session.
-- This is how we assign "which curriculum does this camp use?"

CREATE TABLE IF NOT EXISTS camp_session_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The camp session (from existing camps table)
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,

  -- The assigned template
  template_id UUID NOT NULL REFERENCES curriculum_templates(id) ON DELETE CASCADE,

  -- Who assigned it and when
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Notes about this assignment
  notes TEXT,

  -- Each camp can only have one curriculum assigned
  CONSTRAINT unique_camp_curriculum UNIQUE (camp_id)
);

-- Indexes
CREATE INDEX idx_camp_session_curriculum_camp ON camp_session_curriculum(camp_id);
CREATE INDEX idx_camp_session_curriculum_template ON camp_session_curriculum(template_id);

-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_curriculum_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER curriculum_templates_updated_at
  BEFORE UPDATE ON curriculum_templates
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_updated_at();

CREATE TRIGGER curriculum_blocks_updated_at
  BEFORE UPDATE ON curriculum_blocks
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_updated_at();

CREATE TRIGGER curriculum_template_days_updated_at
  BEFORE UPDATE ON curriculum_template_days
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_updated_at();

CREATE TRIGGER curriculum_day_blocks_updated_at
  BEFORE UPDATE ON curriculum_day_blocks
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all curriculum tables
ALTER TABLE curriculum_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_day_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_session_curriculum ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_roles
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;

-- ============================================
-- CURRICULUM_TEMPLATES RLS
-- ============================================

-- SELECT: Users can see global templates OR their licensee's templates
CREATE POLICY "templates_select_policy"
ON curriculum_templates FOR SELECT
TO authenticated
USING (
  is_global = true
  OR licensee_id = public.get_my_tenant_id()
  OR public.get_my_role() = 'hq_admin'
);

-- INSERT: HQ can create any, licensees can create for their tenant
CREATE POLICY "templates_insert_policy"
ON curriculum_templates FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director'))
);

-- UPDATE: HQ can update any, licensees can update their own
CREATE POLICY "templates_update_policy"
ON curriculum_templates FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director'))
);

-- DELETE: HQ can delete any, licensees can delete their own (non-global only)
CREATE POLICY "templates_delete_policy"
ON curriculum_templates FOR DELETE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND is_global = false AND public.get_my_role() = 'licensee_owner')
);

-- ============================================
-- CURRICULUM_BLOCKS RLS
-- ============================================

CREATE POLICY "blocks_select_policy"
ON curriculum_blocks FOR SELECT
TO authenticated
USING (
  is_global = true
  OR licensee_id = public.get_my_tenant_id()
  OR public.get_my_role() = 'hq_admin'
);

CREATE POLICY "blocks_insert_policy"
ON curriculum_blocks FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director'))
);

CREATE POLICY "blocks_update_policy"
ON curriculum_blocks FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director'))
);

CREATE POLICY "blocks_delete_policy"
ON curriculum_blocks FOR DELETE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND is_global = false AND public.get_my_role() = 'licensee_owner')
);

-- ============================================
-- CURRICULUM_TEMPLATE_DAYS RLS
-- Inherits access from parent template
-- ============================================

CREATE POLICY "template_days_select_policy"
ON curriculum_template_days FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM curriculum_templates t
    WHERE t.id = template_id
    AND (t.is_global = true OR t.licensee_id = public.get_my_tenant_id() OR public.get_my_role() = 'hq_admin')
  )
);

CREATE POLICY "template_days_insert_policy"
ON curriculum_template_days FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM curriculum_templates t
    WHERE t.id = template_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director')))
  )
);

CREATE POLICY "template_days_update_policy"
ON curriculum_template_days FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM curriculum_templates t
    WHERE t.id = template_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director')))
  )
);

CREATE POLICY "template_days_delete_policy"
ON curriculum_template_days FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM curriculum_templates t
    WHERE t.id = template_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() = 'licensee_owner'))
  )
);

-- ============================================
-- CURRICULUM_DAY_BLOCKS RLS
-- Inherits access from parent day's template
-- ============================================

CREATE POLICY "day_blocks_select_policy"
ON curriculum_day_blocks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM curriculum_template_days d
    JOIN curriculum_templates t ON t.id = d.template_id
    WHERE d.id = day_id
    AND (t.is_global = true OR t.licensee_id = public.get_my_tenant_id() OR public.get_my_role() = 'hq_admin')
  )
);

CREATE POLICY "day_blocks_insert_policy"
ON curriculum_day_blocks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM curriculum_template_days d
    JOIN curriculum_templates t ON t.id = d.template_id
    WHERE d.id = day_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director')))
  )
);

CREATE POLICY "day_blocks_update_policy"
ON curriculum_day_blocks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM curriculum_template_days d
    JOIN curriculum_templates t ON t.id = d.template_id
    WHERE d.id = day_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director')))
  )
);

CREATE POLICY "day_blocks_delete_policy"
ON curriculum_day_blocks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM curriculum_template_days d
    JOIN curriculum_templates t ON t.id = d.template_id
    WHERE d.id = day_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() = 'licensee_owner'))
  )
);

-- ============================================
-- CAMP_SESSION_CURRICULUM RLS
-- Based on camp access (tenant ownership)
-- ============================================

CREATE POLICY "camp_curriculum_select_policy"
ON camp_session_curriculum FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camps c
    WHERE c.id = camp_id
    AND c.tenant_id = public.get_my_tenant_id()
  )
);

CREATE POLICY "camp_curriculum_insert_policy"
ON camp_session_curriculum FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camps c
    WHERE c.id = camp_id
    AND c.tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('licensee_owner', 'director')
  )
);

CREATE POLICY "camp_curriculum_update_policy"
ON camp_session_curriculum FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camps c
    WHERE c.id = camp_id
    AND c.tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('licensee_owner', 'director')
  )
);

CREATE POLICY "camp_curriculum_delete_policy"
ON camp_session_curriculum FOR DELETE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camps c
    WHERE c.id = camp_id
    AND c.tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'licensee_owner'
  )
);

-- ============================================
-- SEED DATA: Global Blocks Library
-- ============================================

-- WARMUP BLOCKS
INSERT INTO curriculum_blocks (id, licensee_id, sport, title, description, duration_minutes, category, intensity, is_global, equipment_needed, coaching_points) VALUES
  ('b0000001-0000-0000-0000-000000000001', NULL, 'multi_sport', 'Dynamic Warmup - Full Body', 'Full body dynamic stretches and movement prep to get athletes ready for activity. Includes high knees, butt kicks, arm circles, and light jogging.', 10, 'warmup', 'low', true, 'None', 'Focus on proper form over speed. Encourage athletes to feel their muscles warming up.'),
  ('b0000001-0000-0000-0000-000000000002', NULL, 'multi_sport', 'Movement Exploration', 'Fun movement activities including animal walks, skipping, galloping, and hopping. Great for younger athletes.', 15, 'warmup', 'moderate', true, 'Cones for markers', 'Make it playful! Let athletes express themselves through movement.'),
  ('b0000001-0000-0000-0000-000000000003', NULL, 'basketball', 'Basketball Dynamic Warmup', 'Basketball-specific warmup with dribbling in place, defensive slides, and shooting motion practice.', 10, 'warmup', 'moderate', true, 'Basketballs (1 per athlete)', 'Emphasize ball control even during warmup.'),
  ('b0000001-0000-0000-0000-000000000004', NULL, 'soccer', 'Soccer Dynamic Warmup', 'Soccer-specific warmup with toe taps, ball rolls, and light dribbling patterns.', 10, 'warmup', 'moderate', true, 'Soccer balls (1 per athlete)', 'Keep touches light and controlled.');

-- DRILL BLOCKS
INSERT INTO curriculum_blocks (id, licensee_id, sport, title, description, duration_minutes, category, intensity, is_global, equipment_needed, coaching_points) VALUES
  ('b0000002-0000-0000-0000-000000000001', NULL, 'basketball', 'Ball Handling Basics', 'Introduction to dribbling fundamentals: stationary dribbles, pound dribbles, and crossovers.', 20, 'drill', 'moderate', true, 'Basketballs, cones', 'Keep eyes up, not on the ball. Use fingertips, not palms.'),
  ('b0000002-0000-0000-0000-000000000002', NULL, 'basketball', 'Passing Partners', 'Partner passing drill focusing on chest passes, bounce passes, and overhead passes.', 15, 'drill', 'moderate', true, 'Basketballs', 'Step into your passes. Aim for partner''s chest or hands.'),
  ('b0000002-0000-0000-0000-000000000003', NULL, 'basketball', 'Layup Lines', 'Basic layup technique from both sides of the basket. Right hand on right side, left hand on left side.', 20, 'drill', 'moderate', true, 'Basketballs, hoops', 'Two steps after last dribble. Jump off opposite foot from shooting hand.'),
  ('b0000002-0000-0000-0000-000000000004', NULL, 'soccer', 'Dribbling Gates', 'Dribble through cone gates set up around the field. Focus on close ball control.', 15, 'drill', 'moderate', true, 'Soccer balls, cones', 'Small touches to keep ball close. Use both feet.'),
  ('b0000002-0000-0000-0000-000000000005', NULL, 'soccer', 'Passing Triangles', 'Groups of 3 pass around a triangle formation. Focus on first touch and accuracy.', 15, 'drill', 'moderate', true, 'Soccer balls, cones', 'Open your body to receive. Pass with inside of foot.'),
  ('b0000002-0000-0000-0000-000000000006', NULL, 'soccer', 'Shooting Basics', 'Basic shooting technique from various distances. Focus on striking with laces.', 20, 'drill', 'high', true, 'Soccer balls, goals or targets', 'Plant foot next to ball. Follow through toward target.'),
  ('b0000002-0000-0000-0000-000000000007', NULL, 'multi_sport', 'Agility Ladder Drills', 'Various agility ladder patterns: one foot in each, two feet in each, lateral shuffles.', 15, 'drill', 'high', true, 'Agility ladders', 'Quick feet! Stay light on your toes.');

-- SKILL STATION BLOCKS
INSERT INTO curriculum_blocks (id, licensee_id, sport, title, description, duration_minutes, category, intensity, is_global, equipment_needed, coaching_points) VALUES
  ('b0000003-0000-0000-0000-000000000001', NULL, 'multi_sport', 'Throwing Station', 'Practice overhand throwing technique at various targets. Focus on step and throw motion.', 15, 'skill_station', 'moderate', true, 'Soft balls, targets', 'Step with opposite foot. Point shoulder at target.'),
  ('b0000003-0000-0000-0000-000000000002', NULL, 'multi_sport', 'Catching Station', 'Practice catching balls of various sizes. Start stationary, progress to moving catches.', 15, 'skill_station', 'moderate', true, 'Various balls', 'Track the ball with your eyes. Soft hands!'),
  ('b0000003-0000-0000-0000-000000000003', NULL, 'multi_sport', 'Balance Challenge Station', 'Balance activities including single leg stands, balance beam walks, and stability challenges.', 10, 'skill_station', 'low', true, 'Balance beams, foam pads', 'Find a focal point. Use arms for balance.');

-- SCRIMMAGE/GAME BLOCKS
INSERT INTO curriculum_blocks (id, licensee_id, sport, title, description, duration_minutes, category, intensity, is_global, equipment_needed, coaching_points) VALUES
  ('b0000004-0000-0000-0000-000000000001', NULL, 'basketball', 'Mini Scrimmage 3v3', 'Small-sided game to apply skills learned. Emphasize teamwork and having fun.', 20, 'scrimmage', 'high', true, 'Basketballs, pinnies', 'Everyone touches the ball before shooting. Encourage passing!'),
  ('b0000004-0000-0000-0000-000000000002', NULL, 'soccer', 'Small-Sided Game 4v4', 'Small-sided soccer game with small goals. Focus on finding space and passing.', 20, 'scrimmage', 'high', true, 'Soccer balls, small goals, pinnies', 'Spread out! Look for open teammates.'),
  ('b0000004-0000-0000-0000-000000000003', NULL, 'multi_sport', 'Relay Races', 'Fun team relay races incorporating skills learned during the day.', 15, 'game', 'high', true, 'Cones, various equipment', 'Cheer for your teammates! Good sportsmanship always.');

-- MINDSET/LEADERSHIP BLOCKS
INSERT INTO curriculum_blocks (id, licensee_id, sport, title, description, duration_minutes, category, intensity, is_global, equipment_needed, coaching_points) VALUES
  ('b0000005-0000-0000-0000-000000000001', NULL, 'multi_sport', 'Leadership Huddle', 'Team circle discussion on the day''s leadership theme. Athletes share what they learned.', 10, 'leadership', 'low', true, 'None', 'Everyone''s voice matters. Active listening is key.'),
  ('b0000005-0000-0000-0000-000000000002', NULL, 'multi_sport', 'Confidence Builder', 'Activities designed to build self-confidence through achievable challenges and positive affirmations.', 15, 'mindset', 'moderate', true, 'Poster board, markers', 'Celebrate small wins. "I can" statements.'),
  ('b0000005-0000-0000-0000-000000000003', NULL, 'multi_sport', 'Team Building Challenge', 'Group problem-solving activity that requires communication and teamwork.', 20, 'team_building', 'moderate', true, 'Various props', 'No one succeeds alone. Listen to all ideas.');

-- COOLDOWN/TRANSITION BLOCKS
INSERT INTO curriculum_blocks (id, licensee_id, sport, title, description, duration_minutes, category, intensity, is_global, equipment_needed, coaching_points) VALUES
  ('b0000006-0000-0000-0000-000000000001', NULL, 'multi_sport', 'Static Stretching Cooldown', 'Guided static stretching to help muscles recover. Focus on major muscle groups.', 10, 'cooldown', 'low', true, 'Yoga mats optional', 'Hold each stretch 15-30 seconds. Breathe deeply.'),
  ('b0000006-0000-0000-0000-000000000002', NULL, 'multi_sport', 'Water Break & Hydration', 'Structured water break with hydration education.', 5, 'water_break', 'low', true, 'Water bottles', 'Drink before you feel thirsty!'),
  ('b0000006-0000-0000-0000-000000000003', NULL, 'multi_sport', 'Equipment Transition', 'Time for changing equipment between activities and bathroom breaks.', 5, 'transition', 'low', true, 'None', 'Quick and quiet transitions. Help each other.');

-- ============================================
-- SEED DATA: Global Templates
-- ============================================

-- Multi-Sport: Intro Confidence Camp - Ages 5-7
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published) VALUES
  ('a0000001-0000-0000-0000-000000000001', NULL, 'multi_sport', 'Intro Multi-Sport Confidence Camp - Ages 5-7', 'A beginner-friendly multi-sport experience designed to build confidence, basic motor skills, and a love for physical activity. Perfect for young athletes new to sports.', 5, 7, 'intro', true, 5, true, true);

-- Create 5 days for the multi-sport template
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
  ('d1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 1, 'Day 1 - Welcome & Movement Exploration', 'Introduction to Sports', 'Focus on making everyone feel welcome. Introduce basic movement patterns through play.'),
  ('d1000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 2, 'Day 2 - Throwing & Catching Fundamentals', 'Hand-Eye Coordination', 'Build confidence with throwing and catching activities.'),
  ('d1000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 3, 'Day 3 - Kicking & Soccer Introduction', 'Foot Skills', 'Introduce basic soccer skills in a fun, low-pressure environment.'),
  ('d1000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 4, 'Day 4 - Basketball Basics', 'Ball Handling', 'Introduction to dribbling and shooting with age-appropriate equipment.'),
  ('d1000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 5, 'Day 5 - Celebration & Skills Showcase', 'Putting It All Together', 'Fun day showcasing what we learned. Focus on celebration and confidence.');

-- Add blocks to Day 1
INSERT INTO curriculum_day_blocks (day_id, block_id, order_index, custom_notes) VALUES
  ('d1000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 1, 'Start with name game - have each athlete share their name and favorite animal'),
  ('d1000001-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000002', 2, 'Theme: "I Am an Athlete"'),
  ('d1000001-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000002', 3, NULL),
  ('d1000001-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000003', 4, 'Keep challenges achievable for this age group'),
  ('d1000001-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000003', 5, 'Make it silly and fun!'),
  ('d1000001-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000001', 6, 'Ask: What was your favorite part of today?'),
  ('d1000001-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000001', 7, NULL);

-- Basketball: Intro Skills - Ages 8-10
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published) VALUES
  ('a0000001-0000-0000-0000-000000000002', NULL, 'basketball', 'Intro Basketball Skills - Ages 8-10', 'Introduction to basketball fundamentals including dribbling, passing, and shooting. Designed to build confidence and basic skills in a supportive environment.', 8, 10, 'intro', true, 5, true, true);

-- Create 5 days for basketball template
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
  ('d2000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 1, 'Day 1 - Ball Handling Foundations', 'Getting Comfortable with the Ball', 'Focus on getting athletes comfortable dribbling and handling the basketball.'),
  ('d2000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 2, 'Day 2 - Passing Power', 'Communication & Teamwork', 'Introduce different types of passes and emphasize teamwork.'),
  ('d2000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 3, 'Day 3 - Shooting Basics', 'BEEF Technique', 'Balance, Eyes, Elbow, Follow-through. Basic shooting form.'),
  ('d2000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', 4, 'Day 4 - Defense & Movement', 'Active Feet', 'Introduction to defensive stance and movement.'),
  ('d2000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', 5, 'Day 5 - Game Day!', 'Putting It All Together', 'Apply skills in game situations. Celebrate growth!');

-- Add blocks to Basketball Day 1
INSERT INTO curriculum_day_blocks (day_id, block_id, order_index, custom_notes) VALUES
  ('d2000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003', 1, 'Everyone gets a ball right away'),
  ('d2000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001', 2, 'Start with dominant hand only'),
  ('d2000001-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000002', 3, NULL),
  ('d2000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000007', 4, 'Optional for more athletic groups'),
  ('d2000001-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000001', 5, 'Keep score fun and low-pressure'),
  ('d2000001-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000001', 6, 'Theme: Mistakes help us learn'),
  ('d2000001-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000001', 7, NULL);

-- Soccer: Intro Skills - Ages 5-9
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published) VALUES
  ('a0000001-0000-0000-0000-000000000003', NULL, 'soccer', 'Intro Soccer Skills - Ages 5-9', 'Fun introduction to soccer focusing on dribbling, passing, and basic game concepts. Designed to build a love for the beautiful game.', 5, 9, 'intro', true, 5, true, true);

-- Create days for soccer template
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
  ('d3000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 1, 'Day 1 - Toe Taps & Dribbling', 'Getting Friendly with the Ball', 'Focus on close ball control and comfort with the ball at feet.'),
  ('d3000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003', 2, 'Day 2 - Passing Partners', 'Teamwork Makes the Dream Work', 'Introduction to passing with inside of foot.'),
  ('d3000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003', 3, 'Day 3 - Shooting Stars', 'Finding the Goal', 'Basic shooting technique and goal celebration!'),
  ('d3000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', 4, 'Day 4 - Defending & Goalkeeping', 'Protecting the Goal', 'Introduction to defensive concepts and basic goalkeeping.'),
  ('d3000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', 5, 'Day 5 - World Cup Day', 'Mini Tournament', 'Small-sided tournament with team names and celebrations.');

-- Add blocks to Soccer Day 1
INSERT INTO curriculum_day_blocks (day_id, block_id, order_index, custom_notes) VALUES
  ('d3000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000004', 1, 'Ball at feet for entire warmup'),
  ('d3000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000004', 2, 'Set up 10-12 gates around the area'),
  ('d3000001-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000002', 3, NULL),
  ('d3000001-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000003', 4, 'Ball tag or similar soccer-themed team game'),
  ('d3000001-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000002', 5, 'Small goals, lots of touches'),
  ('d3000001-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000001', 6, 'Favorite soccer player discussion'),
  ('d3000001-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000001', 7, NULL);

-- Update total durations for days (calculated from blocks)
-- This would normally be done by a trigger or application logic

SELECT 'Curriculum tables, RLS policies, and seed data created successfully!' as status;
-- ============================================
-- CURRICULUM SEED DATA - EMPOWERED SPORTS CAMP
-- ============================================
--
-- This file seeds the curriculum builder with:
-- - Extended sport types (adds speed_agility)
-- - 50+ reusable blocks organized by sport
-- - 9 complete templates (A through I) as specified
-- - 3 days per template with ordered block schedules
--
-- RUN THIS IN: Supabase SQL Editor
-- PREREQUISITE: curriculum-tables.sql must be run first
--
-- ============================================

-- ============================================
-- STEP 1: ADD SPEED_AGILITY TO SPORT ENUM
-- ============================================

-- Check if speed_agility already exists, add if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'speed_agility' AND enumtypid = 'sport_type'::regtype) THEN
    ALTER TYPE sport_type ADD VALUE 'speed_agility';
  END IF;
END $$;

-- ============================================
-- STEP 2: CLEAR EXISTING SEED DATA (OPTIONAL)
-- ============================================
-- Uncomment these lines if you want to reset and re-seed

-- DELETE FROM curriculum_day_blocks WHERE day_id IN (SELECT id FROM curriculum_template_days WHERE template_id IN (SELECT id FROM curriculum_templates WHERE is_global = true));
-- DELETE FROM curriculum_template_days WHERE template_id IN (SELECT id FROM curriculum_templates WHERE is_global = true);
-- DELETE FROM curriculum_templates WHERE is_global = true;
-- DELETE FROM curriculum_blocks WHERE is_global = true;

-- ============================================
-- STEP 3: GLOBAL BLOCKS LIBRARY
-- ============================================
-- Organized by: Common, Multi-Sport, Basketball, Soccer, Volleyball, Flag Football, Speed & Agility

-- ----------------------------------------
-- COMMON BLOCKS (Used Across All Sports)
-- ----------------------------------------

INSERT INTO curriculum_blocks (id, licensee_id, sport, title, description, duration_minutes, category, intensity, is_global, equipment_needed, setup_notes, coaching_points) VALUES

-- Warmups
('c0000000-0001-0000-0000-000000000001', NULL, 'multi_sport', 'Dynamic Movement Warmup', 'Full body dynamic stretches including high knees, butt kicks, arm circles, leg swings, and light jogging. Gets athletes ready for activity while reducing injury risk.', 10, 'warmup', 'low', true, 'None - open space needed', 'Set up a 20-yard lane for movement. Athletes line up at one end.', 'Focus on proper form over speed. Encourage athletes to feel their muscles activating. Make it fun with music!'),

('c0000000-0001-0000-0000-000000000002', NULL, 'multi_sport', 'Movement Exploration Games', 'Fun movement activities including animal walks (bear crawls, crab walks, frog jumps), skipping variations, galloping, and creative movement challenges.', 15, 'warmup', 'moderate', true, 'Cones for markers, music speaker optional', 'Mark boundaries with cones. Clear the area of obstacles.', 'Make it playful! Let athletes express themselves. Younger groups love animal walks.'),

-- Mindset & Leadership
('c0000000-0002-0000-0000-000000000001', NULL, 'multi_sport', 'Leadership Huddle', 'Team circle discussion focused on the day''s character theme. Athletes share reflections, wins, and lessons learned. Builds communication and self-awareness.', 10, 'leadership', 'low', true, 'None', 'Gather athletes in a circle, seated or standing. Ensure everyone can see each other.', 'Everyone''s voice matters. Practice active listening. Use open-ended questions. "What did you learn about yourself today?"'),

('c0000000-0002-0000-0000-000000000002', NULL, 'multi_sport', 'Coach-Led Devotional / Character Moment', 'Brief inspirational message connecting sports to life lessons. Topics include perseverance, teamwork, integrity, and believing in yourself.', 10, 'mindset', 'low', true, 'Visual aid or story card optional', 'Find a quiet spot. Have athletes sit comfortably.', 'Keep it age-appropriate. Use relatable examples. Connect to sports scenarios they just experienced.'),

('c0000000-0002-0000-0000-000000000003', NULL, 'multi_sport', 'Confidence Builder Circle', 'Positive affirmation activity. Athletes state "I am" affirmations and receive encouragement from teammates. May include personal goal setting.', 10, 'mindset', 'low', true, 'Affirmation cards optional', 'Form a circle. Create a supportive atmosphere.', 'Model vulnerability. Celebrate courage. "I am brave. I am strong. I belong here."'),

('c0000000-0002-0000-0000-000000000004', NULL, 'multi_sport', 'Team Building Challenge', 'Group problem-solving activity requiring communication, strategy, and teamwork. Examples: human knot, tower building, group balancing.', 20, 'team_building', 'moderate', true, 'Challenge-specific materials (ropes, blocks, balls)', 'Explain rules clearly. Set boundaries.', 'No one succeeds alone. Every idea matters. Celebrate the process, not just the outcome.'),

-- Recovery & Transitions
('c0000000-0003-0000-0000-000000000001', NULL, 'multi_sport', 'Cooldown & Stretch', 'Guided static stretching targeting major muscle groups. Focus on breathing, reflection, and recovery. Calms energy before dismissal.', 10, 'cooldown', 'low', true, 'Yoga mats optional', 'Find a shaded/cool area. Athletes spread out with space to stretch.', 'Hold each stretch 20-30 seconds. Deep breaths. "What are you proud of today?"'),

('c0000000-0003-0000-0000-000000000002', NULL, 'multi_sport', 'Water Break & Hydration Chat', 'Structured hydration break with brief education about staying hydrated. Check in on how athletes are feeling.', 5, 'water_break', 'low', true, 'Water bottles for all athletes', 'Move to shaded area if possible.', 'Drink before you feel thirsty! Water helps you think and move better.'),

('c0000000-0003-0000-0000-000000000003', NULL, 'multi_sport', 'Equipment Transition', 'Time for switching equipment, bathroom breaks, and brief rest. Keep athletes engaged with quick chats or trivia.', 5, 'transition', 'low', true, 'None', 'Assign athlete helpers to collect/distribute equipment.', 'Quick and organized transitions. "Loud feet, quiet mouths"'),

-- ----------------------------------------
-- MULTI-SPORT SPECIFIC BLOCKS
-- ----------------------------------------

('e1000000-0001-0000-0000-000000000001', NULL, 'multi_sport', 'Multi-Sport Skills Circuit', 'Station-based rotation hitting multiple sports: throwing station, kicking station, catching station, dribbling station. 3-4 minutes per station.', 20, 'drill', 'moderate', true, 'Various balls (soccer, basketball, football, tennis), cones, targets', 'Set up 4-5 stations around the space. Number each station clearly.', 'Rotate on whistle. Encourage trying new things. Celebrate effort at every station.'),

('e1000000-0001-0000-0000-000000000002', NULL, 'multi_sport', 'Tag & Movement Games', 'Active tag variations: freeze tag, blob tag, tunnel tag, sharks and minnows. Gets heart rates up while building agility and awareness.', 15, 'drill', 'high', true, 'Cones for boundaries, pinnies for taggers', 'Define clear boundaries. Start with smaller area for more action.', 'Stay aware of surroundings. Quick changes of direction. It''s okay to get tagged!'),

('e1000000-0001-0000-0000-000000000003', NULL, 'multi_sport', 'Relay Races & Team Challenges', 'Fun competitive relays incorporating various movements: running, skipping, carrying objects, dribbling, passing. Teams cheer for each other.', 20, 'scrimmage', 'high', true, 'Cones, relay batons or objects, balls', 'Create even teams. Set up parallel lanes.', 'Cheer for your teammates! Good sportsmanship always. Win with grace, lose with dignity.'),

('e1000000-0001-0000-0000-000000000004', NULL, 'multi_sport', 'Obstacle Course Challenge', 'Fun agility course including cones to weave, hurdles to jump, tunnels to crawl, and balance challenges. Time each athlete to beat their own record.', 15, 'drill', 'high', true, 'Cones, small hurdles, tunnel, balance beam', 'Test the course yourself first. Make it achievable but challenging.', 'Compete against yourself! Celebrate personal bests.'),

('e1000000-0001-0000-0000-000000000005', NULL, 'multi_sport', 'Throwing & Catching Partners', 'Partner activities focusing on overhand throw, underhand toss, and catching technique. Progress from close to farther distances.', 15, 'drill', 'moderate', true, 'Soft balls, tennis balls, foam balls', 'Pair athletes by similar ability. Start close together.', 'Step into throws. Track the ball to your hands. Soft catches!'),

('e1000000-0001-0000-0000-000000000006', NULL, 'multi_sport', 'Body Control & Coordination', 'Activities building body awareness: jumping patterns, hopping sequences, skipping with direction changes, balance challenges.', 15, 'drill', 'moderate', true, 'Cones, agility ladder optional', 'Create patterns on the ground with cones.', 'Control over speed. Feel your body moving through space.'),

('e1000000-0001-0000-0000-000000000007', NULL, 'multi_sport', 'Mini Games Tournament', 'Rotation through quick mini-games: knockout, four square, wall ball, capture the ball. Short rounds keep energy high.', 25, 'game', 'high', true, 'Various balls, cones, targets', 'Set up 3-4 game stations. Rotate every 5-6 minutes.', 'Learn the rules quickly. Play fair. Have fun!'),

('e1000000-0001-0000-0000-000000000008', NULL, 'multi_sport', 'Compete With Yourself Challenges', 'Individual skill challenges with personal goal setting: how many catches in a row, longest balance, most accurate throws. Track progress.', 20, 'drill', 'moderate', true, 'Various balls, stopwatches, clipboards', 'Set up individual challenge stations.', 'Beat YOUR best score. Progress is the goal.'),

('e1000000-0001-0000-0000-000000000009', NULL, 'multi_sport', 'Team Vs Team Competitions', 'Structured team competitions with multiple rounds. Emphasize teamwork, strategy, and supporting teammates.', 25, 'scrimmage', 'high', true, 'Pinnies, various equipment', 'Create balanced teams. Explain scoring clearly.', 'Win together, learn together. Every role matters.'),

-- ----------------------------------------
-- BASKETBALL SPECIFIC BLOCKS
-- ----------------------------------------

('b0000000-0001-0000-0000-000000000001', NULL, 'basketball', 'Basketball Dynamic Warmup', 'Basketball-specific warmup with stationary dribbling, defensive slides, shooting arm circles, and ball slaps. Gets hands and feet ready.', 10, 'warmup', 'moderate', true, 'Basketballs (1 per athlete)', 'Everyone gets a ball immediately. Spread out in personal space.', 'Ball is part of warmup from the start. Wake up those hands!'),

('b0000000-0002-0000-0000-000000000001', NULL, 'basketball', 'Ball-Handling Station Circuit', 'Four stations rotating through: stationary dribbles, figure-8s, two-ball dribbling (advanced), and dribble moves. 4 minutes per station.', 20, 'drill', 'moderate', true, 'Basketballs (2 per athlete ideal), cones', 'Set up 4 clearly marked stations with instruction cards.', 'Keep eyes up! Pound the ball. Use fingertips not palms.'),

('b0000000-0002-0000-0000-000000000002', NULL, 'basketball', 'Dribble Moves & Crossovers', 'Focused work on crossover dribble, between the legs (intro), and change of pace. Build from stationary to moving.', 15, 'drill', 'moderate', true, 'Basketballs, cones for lanes', 'Create dribbling lanes with cones.', 'Low and tight crossovers. Sell the move with your shoulders.'),

('b0000000-0002-0000-0000-000000000003', NULL, 'basketball', 'Footwork & Defensive Slides', 'Defensive positioning basics: athletic stance, slide technique, drop steps, closeouts. Build good habits early.', 15, 'drill', 'high', true, 'Cones for markers', 'Mark slide lanes with cones. Demonstrate proper stance.', 'Stay low! Quick feet. Hands active but disciplined.'),

('b0000000-0002-0000-0000-000000000004', NULL, 'basketball', 'Passing On The Move', 'Partner and group passing while moving: chest passes on the move, leading teammates, give-and-go patterns.', 15, 'drill', 'moderate', true, 'Basketballs, cones', 'Set up passing lanes with cones. Groups of 3-4.', 'Lead your teammate. Hit them in their shooting pocket. Communicate!'),

('b0000000-0002-0000-0000-000000000005', NULL, 'basketball', 'Partner Passing Drills', 'Stationary partner passing working on chest pass, bounce pass, and overhead pass. Focus on technique and accuracy.', 15, 'drill', 'moderate', true, 'Basketballs (1 per pair)', 'Partners face each other about 10 feet apart.', 'Step into passes. Snap wrists for power. Target: teammate''s chest or numbers.'),

('b0000000-0002-0000-0000-000000000006', NULL, 'basketball', 'Layup Lines & Finishing', 'Right and left side layups working on proper footwork (opposite foot), soft touch, and finishing through contact. Progress to both hands.', 15, 'drill', 'moderate', true, 'Basketballs, hoops', 'Two lines on each side of the basket. Demonstrate footwork slowly first.', 'Right hand = left foot takeoff. Kiss the ball off the glass. Finish strong!'),

('b0000000-0002-0000-0000-000000000007', NULL, 'basketball', 'Shooting Form & BEEF', 'Shooting technique breakdown: Balance, Eyes on target, Elbow aligned, Follow through. Start close to basket, move out as form improves.', 20, 'drill', 'moderate', true, 'Basketballs, hoops', 'Start 3-5 feet from basket. One ball per 2 athletes.', 'BEEF: Balance, Eyes, Elbow, Follow-through. Arc is your friend!'),

('b0000000-0002-0000-0000-000000000008', NULL, 'basketball', 'Spot Shooting Competition', 'Shooting from marked spots around the lane. Track makes/attempts. Can be individual or team competition.', 15, 'drill', 'moderate', true, 'Basketballs, floor markers or cones', 'Mark 5 shooting spots. Groups rotate through spots.', 'Same routine every shot. Confidence breeds success.'),

('b0000000-0002-0000-0000-000000000009', NULL, 'basketball', '3v3 Small-Sided Games', 'Half-court 3v3 games focusing on spacing, passing, and team basketball. Short games with quick rotations.', 20, 'scrimmage', 'high', true, 'Basketballs, pinnies, hoops', 'Set up multiple half-court games if space allows.', 'Move the ball! Everyone touches before shooting. Talk on defense.'),

('b0000000-0002-0000-0000-000000000010', NULL, 'basketball', 'Full Court Scrimmage', 'Controlled 5v5 or 4v4 full court games. Coach stops play to teach moments. Focus on applying skills learned.', 20, 'scrimmage', 'high', true, 'Basketballs, pinnies', 'Teams of 4-5. Rotate teams if you have multiple.', 'This is practice! Make mistakes and learn. Transition is key.'),

('b0000000-0002-0000-0000-000000000011', NULL, 'basketball', 'Offense: Spacing & Cutting', 'Introduction to basic offensive concepts: staying spaced, cutting to the basket, reading defenders, and creating space for teammates.', 20, 'drill', 'moderate', true, 'Basketballs, cones', 'Set up half court with position markers.', 'Space the floor! Cut with purpose. Don''t stand and watch.'),

('b0000000-0002-0000-0000-000000000012', NULL, 'basketball', 'Defense: Hustle Plays', 'High-energy defensive drills: closeouts, box-outs, loose ball recovery, help defense rotations. Celebrate effort!', 15, 'drill', 'high', true, 'Basketballs, cones', 'Half court setup. Multiple groups rotating.', 'Defense is effort! Every possession matters. Hustle wins games.'),

('b0000000-0002-0000-0000-000000000013', NULL, 'basketball', 'Game Situations & Scenarios', 'Specific game scenarios: last possession plays, inbounds situations, 2-on-1 fast breaks, 3-on-2 situations.', 20, 'scrimmage', 'high', true, 'Basketballs, pinnies, scoreboard', 'Set up specific scenarios. Keep energy high with short rounds.', 'Pressure is a privilege! These moments make you better.'),

-- ----------------------------------------
-- SOCCER SPECIFIC BLOCKS
-- ----------------------------------------

('e2000000-0001-0000-0000-000000000001', NULL, 'soccer', 'Soccer Dynamic Warmup', 'Soccer-specific warmup with toe taps, ball rolls, sole work, and light dribbling patterns. Ball at feet throughout.', 10, 'warmup', 'moderate', true, 'Soccer balls (1 per athlete)', 'Open space with boundaries. Everyone has a ball.', 'Ball never stops moving. Light touches. Both feet!'),

('e2000000-0002-0000-0000-000000000001', NULL, 'soccer', 'Cone Dribbling Lanes', 'Dribble through cone gates scattered around the field. Focus on close ball control, head up, and using both feet.', 15, 'drill', 'moderate', true, 'Soccer balls, many cones', 'Set up 15-20 gates (2 cones each) around the area.', 'Small touches keep ball close. Count your gates! Use both feet.'),

('e2000000-0002-0000-0000-000000000002', NULL, 'soccer', 'Passing Gates & Receiving', 'Partners pass through cone gates. Receiver must control and pass back. Progress to one-touch passing. Competition: most successful passes in 2 minutes.', 20, 'drill', 'moderate', true, 'Soccer balls, cones for gates', 'Partners 15 yards apart with a gate between them.', 'Inside of foot passes. Open body to receive. Soft first touch!'),

('e2000000-0002-0000-0000-000000000003', NULL, 'soccer', 'Dribbling & Direction Changes', 'Dribbling with directional challenges: coach calls "turn!" and athletes must change direction, inside/outside cuts, pull-backs.', 15, 'drill', 'moderate', true, 'Soccer balls, cones for boundaries', 'Defined space with boundaries. Coach in the middle calling directions.', 'Head up to hear calls! Quick direction changes. Protect the ball.'),

('e2000000-0002-0000-0000-000000000004', NULL, 'soccer', 'Passing Combinations (Wall Pass)', 'Introduction to combination play: wall passes (give and go), overlaps, and simple through balls with partners.', 20, 'drill', 'moderate', true, 'Soccer balls, cones', 'Set up passing patterns with cones. Groups of 3.', 'Movement after passing! Timing is key. Play the way you face.'),

('e2000000-0002-0000-0000-000000000005', NULL, 'soccer', 'Shooting On Goal', 'Shooting from various distances and angles. Emphasize striking with laces, placement over power, and follow-through.', 15, 'drill', 'high', true, 'Soccer balls, goals or targets', 'Set up shooting lines. Use full-size or small goals.', 'Plant foot next to ball. Strike through the ball. Pick your spot!'),

('e2000000-0002-0000-0000-000000000006', NULL, 'soccer', '3v3 / 4v4 Small-Sided Games', 'Small-sided games with small goals. Maximum touches on the ball. Focus on finding space and quick decisions.', 20, 'scrimmage', 'high', true, 'Soccer balls, small goals, pinnies', 'Multiple small fields if possible. Rotate teams.', 'Spread out! Find space. Quick play = more fun.'),

('e2000000-0002-0000-0000-000000000007', NULL, 'soccer', 'Positions & Shape Introduction', 'Introduction to team shape: defenders, midfielders, forwards. Walk-through of basic positions and responsibilities.', 15, 'drill', 'low', true, 'Cones for position markers, pinnies', 'Set up position markers on a half field.', 'Everyone has a home base. Move from your position, return to your position.'),

('e2000000-0002-0000-0000-000000000008', NULL, 'soccer', 'Attacking vs Defending Concepts', 'Small groups practicing attack vs defense scenarios: 2v1, 3v2, with goals. Teach basic decision-making.', 20, 'drill', 'high', true, 'Soccer balls, small goals, cones', 'Set up attack zones with small goals.', 'Attack: Can I shoot? Pass? Dribble? Defense: Delay, force, win the ball.'),

('e2000000-0002-0000-0000-000000000009', NULL, 'soccer', 'Tournament Day Games', 'Mini tournament format with team names, group stage, and finals. Short games, big celebrations!', 25, 'scrimmage', 'high', true, 'Soccer balls, goals, pinnies, bracket board', 'Create balanced teams. Set up tournament bracket.', 'Play for your team! Every game matters. Shake hands after.'),

-- ----------------------------------------
-- VOLLEYBALL SPECIFIC BLOCKS
-- ----------------------------------------

('e3000000-0001-0000-0000-000000000001', NULL, 'volleyball', 'Volleyball Dynamic Warmup', 'Volleyball-specific warmup including jumping jacks, arm swings, quick feet patterns, and partner tosses.', 10, 'warmup', 'moderate', true, 'Volleyballs (1 per pair)', 'Open court space. Partners spread out.', 'Get your arms loose! Wrists and shoulders ready.'),

('e3000000-0002-0000-0000-000000000001', NULL, 'volleyball', 'Platform Passing Partners', 'Partners practice forearm passing (bumping) back and forth. Focus on platform formation, angle, and movement to the ball.', 15, 'drill', 'moderate', true, 'Volleyballs (1 per pair)', 'Partners 10-15 feet apart. Plenty of space around each pair.', 'Thumbs together, arms straight. Move feet to the ball. Platform to target.'),

('e3000000-0002-0000-0000-000000000002', NULL, 'volleyball', 'Wall Passing Reps', 'Individual passing practice against a wall. Count consecutive successful passes. Good for building muscle memory.', 10, 'drill', 'moderate', true, 'Volleyballs, gym wall', 'Athletes spread along the wall with space.', 'Stay low, stay ready. Beat your record!'),

('e3000000-0002-0000-0000-000000000003', NULL, 'volleyball', 'Serving Progressions', 'Step-by-step serving progression: toss practice, contact point work, underhand serves, overhand introduction (if ready).', 20, 'drill', 'moderate', true, 'Volleyballs, nets or targets', 'Set up serving lines. Can use badminton nets or tape lines.', 'Toss is key! Contact in front of body. Follow through to target.'),

('e3000000-0002-0000-0000-000000000004', NULL, 'volleyball', 'Setting Basics', 'Introduction to overhead setting: hand position, contact point, footwork. Start with self-sets, progress to partner setting.', 15, 'drill', 'moderate', true, 'Volleyballs (1 per person)', 'Demonstrate hand shape. Space for self-setting.', 'Triangle hands above forehead. Push from legs. Soft hands!'),

('e3000000-0002-0000-0000-000000000005', NULL, 'volleyball', 'Free Ball Communication Drill', 'Team drill practicing calling the ball ("Mine!"), moving to position, and communicating with teammates.', 15, 'drill', 'moderate', true, 'Volleyballs', 'Groups of 3-4. Coach tosses ball in randomly.', 'LOUD calls! Say it early. Your ball = your responsibility.'),

('e3000000-0002-0000-0000-000000000006', NULL, 'volleyball', 'Rotation Introduction', 'Walk-through of court positions (1-6) and rotation order. Practice rotating on whistle.', 10, 'drill', 'low', true, 'Court markings or cones', 'Use cones to mark positions if needed.', 'Everyone serves! Know your next rotation spot.'),

('e3000000-0002-0000-0000-000000000007', NULL, 'volleyball', '4v4 Mini Games', 'Modified volleyball games on smaller courts. Can allow one bounce or catch-throw-hit progression for beginners.', 20, 'scrimmage', 'high', true, 'Volleyballs, nets, pinnies', 'Lower net if possible. Smaller court boundaries.', 'Three hits max! Bump, set, hit. Celebrate rallies!'),

('e3000000-0002-0000-0000-000000000008', NULL, 'volleyball', 'Calling The Ball Games', 'Games emphasizing communication: queen of the court, wash drill variations, all requiring loud ball calls.', 15, 'scrimmage', 'high', true, 'Volleyballs, net', 'Standard court setup with rotation groups.', 'No silent volleyball! Talk = teamwork.'),

-- ----------------------------------------
-- FLAG FOOTBALL SPECIFIC BLOCKS
-- ----------------------------------------

('f0000000-0001-0000-0000-000000000001', NULL, 'flag_football', 'Flag Football Warmup', 'Sport-specific warmup with backpedaling, hip turns, reaching high catches, and flag belt practice.', 10, 'warmup', 'moderate', true, 'Flag belts for all', 'Open field. Everyone wearing flag belt from warmup.', 'Get those legs moving! Practice flag placement.'),

('f0000000-0002-0000-0000-000000000001', NULL, 'flag_football', 'Flag Pulling Relay', 'Team relay races where runners must pull a flag from a "defender" to complete their leg. Fun and competitive!', 15, 'drill', 'high', true, 'Flag belts, cones', 'Set up relay lanes with a flag-puller station.', 'Pull flags, not shorts! Quick hands. Be ready.'),

('f0000000-0002-0000-0000-000000000002', NULL, 'flag_football', 'Route Tree On Air', 'Receivers run basic routes without defense: slants, outs, go routes, curls. Focus on sharp cuts and hand targets.', 20, 'drill', 'moderate', true, 'Footballs, cones for route markers', 'Mark route starting points. QBs spread across field.', 'Sharp cuts! Sell your route. Eyes to QB at the break.'),

('f0000000-0002-0000-0000-000000000003', NULL, 'flag_football', 'QB & Receiver Timing', 'Partners work on throw timing: QB drops, receiver breaks. Practice different distances and route combinations.', 20, 'drill', 'moderate', true, 'Footballs, flag belts', 'Pairs spread across field with 15-20 yard spacing.', 'Trust your receiver. Throw to a spot. Timing > power.'),

('f0000000-0002-0000-0000-000000000004', NULL, 'flag_football', 'Catching Fundamentals', 'Catching technique: hands to ball, securing with body, catching over shoulder, contested catches.', 15, 'drill', 'moderate', true, 'Footballs', 'Partners about 10 yards apart.', 'Track it to your hands. Hands catch, body secures. Tuck it away!'),

('f0000000-0002-0000-0000-000000000005', NULL, 'flag_football', 'Throwing Mechanics', 'Proper throwing technique: grip, stance, arm motion, release point, follow-through. Progress from short to medium distances.', 15, 'drill', 'moderate', true, 'Footballs', 'Partners in lines facing each other.', 'Opposite foot forward. Elbow up. Spin the ball. Follow through!'),

('f0000000-0002-0000-0000-000000000006', NULL, 'flag_football', 'Offense vs Defense Concepts', 'Introduction to offensive formations and defensive alignment. Walk-through then live reps.', 15, 'drill', 'moderate', true, 'Footballs, flag belts, cones', 'Half field with clear boundaries.', 'Offense: know your job. Defense: pull flags, don''t guess.'),

('f0000000-0002-0000-0000-000000000007', NULL, 'flag_football', '5v5 Controlled Scrimmage', 'Modified game with coach involvement. Stop play to teach moments. Rotate positions so everyone tries offense and defense.', 20, 'scrimmage', 'high', true, 'Footballs, flag belts, pinnies, cones', 'Full field or modified field size. Clear end zones.', 'This is learning! Mistakes are expected. Celebrate good plays.'),

('f0000000-0002-0000-0000-000000000008', NULL, 'flag_football', 'Game Day Situations', 'Practice specific situations: red zone, last play, 4th down conversions. Short, intense reps.', 20, 'scrimmage', 'high', true, 'Footballs, flag belts, pinnies', 'Set up specific yard lines and down/distance.', 'Pressure makes diamonds! Execute your assignment.'),

-- ----------------------------------------
-- SPEED, AGILITY & STRENGTH BLOCKS
-- ----------------------------------------

('a0000000-0001-0000-0000-000000000001', NULL, 'speed_agility', 'Speed & Agility Dynamic Warmup', 'Comprehensive warmup with A-skips, B-skips, high knees, butt kicks, lateral shuffles, and carioca. Prepares body for speed work.', 10, 'warmup', 'moderate', true, 'Cones for lanes', 'Set up 20-yard lanes for movement.', 'This IS training! Quality reps. Posture matters.'),

('a0000000-0002-0000-0000-000000000001', NULL, 'speed_agility', 'Acceleration Mechanics Drills', 'Focus on start position, drive phase, and acceleration: wall drives, falling starts, 10-yard burst sprints.', 20, 'drill', 'high', true, 'Cones, wall space', 'Wall for wall drives. Flat surface for sprints.', 'Push the ground away. 45-degree lean. Patience in acceleration.'),

('a0000000-0002-0000-0000-000000000002', NULL, 'speed_agility', 'Cone COD (Change of Direction) Series', 'Multiple change-of-direction patterns: L-drill, T-drill, 5-10-5, box drills. Focus on deceleration and re-acceleration.', 20, 'drill', 'high', true, 'Cones, stopwatch optional', 'Set up each drill with cones. Demonstrate patterns.', 'Slow to fast! Plant and drive. Low hips on change.'),

('a0000000-0002-0000-0000-000000000003', NULL, 'speed_agility', 'Agility Ladder Patterns', 'Ladder footwork: one-in each, two-in each, lateral in-outs, icky shuffle. Build coordination and quick feet.', 15, 'drill', 'high', true, 'Agility ladders', 'Multiple ladders if available. Athletes cycle through.', 'Quick feet, light feet. Quality over speed first.'),

('a0000000-0002-0000-0000-000000000004', NULL, 'speed_agility', 'Sprint Relay Competitions', 'Team-based sprint competitions with flying starts, acceleration starts, and full sprints. High energy, fun competition.', 15, 'scrimmage', 'high', true, 'Cones, stopwatch', 'Set up relay lanes. Create equal teams.', 'Cheer loud! Give your best every rep.'),

('a0000000-0002-0000-0000-000000000005', NULL, 'speed_agility', 'Power & Plyometrics Intro', 'Age-appropriate jumping: box step-ups, broad jumps, single leg hops, lateral bounds. Build explosive power safely.', 20, 'drill', 'high', true, 'Low boxes or step, cones', 'Start with low heights. Soft landing surface.', 'Land soft! Absorb through your legs. Quality jumps only.'),

('a0000000-0002-0000-0000-000000000006', NULL, 'speed_agility', 'Core Strength Circuit', 'Station circuit for core: planks, dead bugs, bird dogs, glute bridges, side planks. 30 seconds per exercise.', 15, 'drill', 'moderate', true, 'Mats or grass area', 'Station cards with images. Demonstrate each movement.', 'Strong core = faster athlete. Breathe through it!'),

('a0000000-0002-0000-0000-000000000007', NULL, 'speed_agility', 'Competition Circuits', 'Timed circuit combining speed, agility, and power: sprint to cone, shuffle back, 3 jumps, sprint finish. Personal records.', 20, 'scrimmage', 'high', true, 'Cones, stopwatch, jump markers', 'Set up consistent circuit for timing.', 'Beat YOUR time. Leave nothing behind!')

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  category = EXCLUDED.category,
  intensity = EXCLUDED.intensity,
  equipment_needed = EXCLUDED.equipment_needed,
  setup_notes = EXCLUDED.setup_notes,
  coaching_points = EXCLUDED.coaching_points,
  updated_at = NOW();

-- ============================================
-- STEP 4: SEED THE 9 TEMPLATES
-- ============================================

-- ----------------------------------------
-- TEMPLATE A: Multi-Sport Foundations - Ages 5-7
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000001',
  NULL,
  'multi_sport',
  'Multi-Sport Foundations – Ages 5–7',
  'A first touch with organized sports designed for our youngest athletes. This curriculum emphasizes movement, fun, confidence, basic rules, and listening skills. Every activity is designed to make girls feel successful while building fundamental motor skills they''ll use in any sport.',
  5, 7, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template A Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000001-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 1, 'Day 1: Movement & Body Control', 'Learning to Move', 'Focus on making everyone feel welcome and comfortable. Introduce basic movement patterns through play. Lots of encouragement and celebration of effort.'),
('da000001-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 2, 'Day 2: Ball Familiarity & Games', 'Friends with the Ball', 'Introduction to balls of all types. Rolling, bouncing, throwing, catching in fun game formats. Every girl gets a ball in her hands.'),
('da000001-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001', 3, 'Day 3: Teamwork & Confidence', 'Better Together', 'Partner and team activities. Building connections while practicing skills. End with a celebration of what we learned!')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template A Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00001-0001-0000-0000-000000000001', 'da000001-0000-0000-0000-000000000001', 'c0000000-0001-0000-0000-000000000002', 1, 'Start with name game - share name and favorite color. Keep energy high and silly!'),
('dba00001-0001-0000-0000-000000000002', 'da000001-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000003', 2, 'Theme: "I Am An Athlete" - simple affirmations they can repeat'),
('dba00001-0001-0000-0000-000000000003', 'da000001-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00001-0001-0000-0000-000000000004', 'da000001-0000-0000-0000-000000000001', 'e1000000-0001-0000-0000-000000000006', 4, 'Focus on hopping, jumping, balancing - make it a game!'),
('dba00001-0001-0000-0000-000000000005', 'da000001-0000-0000-0000-000000000001', 'e1000000-0001-0000-0000-000000000002', 5, 'Freeze tag, blob tag - keep it moving!'),
('dba00001-0001-0000-0000-000000000006', 'da000001-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 6, 'Ask: What was your favorite thing we did today?'),
('dba00001-0001-0000-0000-000000000007', 'da000001-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 7, 'Gentle stretching with deep breaths')
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template A Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00001-0002-0000-0000-000000000001', 'da000001-0000-0000-0000-000000000002', 'c0000000-0001-0000-0000-000000000001', 1, 'Review names from yesterday. Add a movement to your name!'),
('dba00001-0002-0000-0000-000000000002', 'da000001-0000-0000-0000-000000000002', 'e1000000-0001-0000-0000-000000000005', 2, 'Start with soft balls. Underhand tosses first.'),
('dba00001-0002-0000-0000-000000000003', 'da000001-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00001-0002-0000-0000-000000000004', 'da000001-0000-0000-0000-000000000002', 'e1000000-0001-0000-0000-000000000001', 4, 'Simple stations - rolling, bouncing, kicking'),
('dba00001-0002-0000-0000-000000000005', 'da000001-0000-0000-0000-000000000002', 'e1000000-0001-0000-0000-000000000003', 5, 'Relay with balls - bouncing or carrying'),
('dba00001-0002-0000-0000-000000000006', 'da000001-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 6, 'Talk about trying new things'),
('dba00001-0002-0000-0000-000000000007', 'da000001-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template A Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00001-0003-0000-0000-000000000001', 'da000001-0000-0000-0000-000000000003', 'c0000000-0001-0000-0000-000000000002', 1, 'Movement warmup with partners - mirror game'),
('dba00001-0003-0000-0000-000000000002', 'da000001-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000004', 2, 'Simple team challenge appropriate for 5-7 year olds'),
('dba00001-0003-0000-0000-000000000003', 'da000001-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00001-0003-0000-0000-000000000004', 'da000001-0000-0000-0000-000000000003', 'e1000000-0001-0000-0000-000000000007', 4, 'Fun mini-games - celebrate every attempt!'),
('dba00001-0003-0000-0000-000000000005', 'da000001-0000-0000-0000-000000000003', 'e1000000-0001-0000-0000-000000000003', 5, 'Final fun relays - everyone cheers!'),
('dba00001-0003-0000-0000-000000000006', 'da000001-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'Celebrate camp! What will you remember?'),
('dba00001-0003-0000-0000-000000000007', 'da000001-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, 'Group photo before stretching!')
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ----------------------------------------
-- TEMPLATE B: Multi-Sport Confidence & Competition - Ages 8-10
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000002',
  NULL,
  'multi_sport',
  'Multi-Sport Confidence & Competition – Ages 8–10',
  'An introduction to healthy competition for athletes ready to challenge themselves. This curriculum teaches girls how to try hard, win and lose with grace, and be a supportive teammate. Athletes will compete against themselves, with their team, and against opponents in developmentally appropriate ways.',
  8, 10, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template B Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000002-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000002', 1, 'Day 1: Compete With Yourself', 'Personal Bests', 'Focus on individual improvement and beating your own records. Introduce goal-setting and tracking personal progress.'),
('da000002-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000002', 2, 'Day 2: Compete With Your Team', 'Team Power', 'Team-based challenges where success requires everyone contributing. Celebrate team achievements over individual glory.'),
('da000002-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000002', 3, 'Day 3: Compete With Opponents (Small Games)', 'Game Day', 'Head-to-head competition in various sports formats. Emphasis on sportsmanship, effort, and handling outcomes with grace.')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template B Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00002-0001-0000-0000-000000000001', 'da000002-0000-0000-0000-000000000001', 'c0000000-0001-0000-0000-000000000001', 1, 'High energy! Set the tone for competition week.'),
('dba00002-0001-0000-0000-000000000002', 'da000002-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000003', 2, 'Goal setting: What do I want to improve this week?'),
('dba00002-0001-0000-0000-000000000003', 'da000002-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00002-0001-0000-0000-000000000004', 'da000002-0000-0000-0000-000000000001', 'e1000000-0001-0000-0000-000000000008', 4, 'Record starting scores - we will beat them by Day 3!'),
('dba00002-0001-0000-0000-000000000005', 'da000002-0000-0000-0000-000000000001', 'e1000000-0001-0000-0000-000000000004', 5, 'Time yourself! Try to beat your own time.'),
('dba00002-0001-0000-0000-000000000006', 'da000002-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 6, 'Discuss: What does it mean to compete with yourself?'),
('dba00002-0001-0000-0000-000000000007', 'da000002-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template B Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00002-0002-0000-0000-000000000001', 'da000002-0000-0000-0000-000000000002', 'c0000000-0001-0000-0000-000000000001', 1, 'Partner warmup - you succeed when your partner succeeds'),
('dba00002-0002-0000-0000-000000000002', 'da000002-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000004', 2, 'Team challenge that requires everyone to contribute'),
('dba00002-0002-0000-0000-000000000003', 'da000002-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00002-0002-0000-0000-000000000004', 'da000002-0000-0000-0000-000000000002', 'e1000000-0001-0000-0000-000000000001', 4, 'Team stations - team score matters!'),
('dba00002-0002-0000-0000-000000000005', 'da000002-0000-0000-0000-000000000002', 'e1000000-0001-0000-0000-000000000003', 5, 'Team relays - cheer for your teammates!'),
('dba00002-0002-0000-0000-000000000006', 'da000002-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 6, 'What makes a great teammate?'),
('dba00002-0002-0000-0000-000000000007', 'da000002-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template B Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00002-0003-0000-0000-000000000001', 'da000002-0000-0000-0000-000000000003', 'c0000000-0001-0000-0000-000000000001', 1, 'Game day warmup - get ready to compete!'),
('dba00002-0003-0000-0000-000000000002', 'da000002-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000002', 2, 'Sportsmanship talk: win with grace, lose with dignity'),
('dba00002-0003-0000-0000-000000000003', 'da000002-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00002-0003-0000-0000-000000000004', 'da000002-0000-0000-0000-000000000003', 'e1000000-0001-0000-0000-000000000009', 4, 'Mini tournament with different sports stations'),
('dba00002-0003-0000-0000-000000000005', 'da000002-0000-0000-0000-000000000003', 'e1000000-0001-0000-0000-000000000008', 5, 'Re-test Day 1 challenges - celebrate improvement!'),
('dba00002-0003-0000-0000-000000000006', 'da000002-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'Share: What did you learn about competition?'),
('dba00002-0003-0000-0000-000000000007', 'da000002-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, 'Celebrate everyone!')
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ----------------------------------------
-- TEMPLATE C: Intro Basketball Skills - Ages 8-10
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000003',
  NULL,
  'basketball',
  'Intro Basketball Skills – Ages 8–10',
  'A foundational basketball curriculum focusing on dribbling, passing, shooting fundamentals, footwork, and court confidence. Every athlete will develop ball-handling skills and learn to love the game in a supportive, encouraging environment. Perfect for girls new to basketball or looking to build their fundamental skills.',
  8, 10, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template C Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000003-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000003', 1, 'Day 1: Ball-handling & Stance', 'Getting Comfortable', 'Focus on athletic stance, ball control, and stationary dribbling. Build confidence with the ball before adding movement.'),
('da000003-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000003', 2, 'Day 2: Passing & Space', 'Teamwork in Action', 'Introduction to passing types and the importance of spacing. Basketball is a team sport!'),
('da000003-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000003', 3, 'Day 3: Layups, Shooting Form & Small-Sided Games', 'Score & Play', 'Scoring fundamentals with proper layup and shooting technique, then apply in games.')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template C Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00003-0001-0000-0000-000000000001', 'da000003-0000-0000-0000-000000000001', 'b0000000-0001-0000-0000-000000000001', 1, 'Ball in hands immediately! Start building that relationship.'),
('dba00003-0001-0000-0000-000000000002', 'da000003-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000003', 2, 'Set a ball-handling goal for the week'),
('dba00003-0001-0000-0000-000000000003', 'da000003-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00003-0001-0000-0000-000000000004', 'da000003-0000-0000-0000-000000000001', 'b0000000-0002-0000-0000-000000000001', 4, 'Stationary first - pound dribbles, crossovers'),
('dba00003-0001-0000-0000-000000000005', 'da000003-0000-0000-0000-000000000001', 'b0000000-0002-0000-0000-000000000003', 5, 'Athletic stance competition - who can hold it longest?'),
('dba00003-0001-0000-0000-000000000006', 'da000003-0000-0000-0000-000000000001', 'b0000000-0002-0000-0000-000000000009', 6, 'Keep it simple - focus on ball control in game'),
('dba00003-0001-0000-0000-000000000007', 'da000003-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 7, 'What felt different about having a ball in your hands?'),
('dba00003-0001-0000-0000-000000000008', 'da000003-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template C Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00003-0002-0000-0000-000000000001', 'da000003-0000-0000-0000-000000000002', 'b0000000-0001-0000-0000-000000000001', 1, 'Add dribbling on the move to warmup'),
('dba00003-0002-0000-0000-000000000002', 'da000003-0000-0000-0000-000000000002', 'b0000000-0002-0000-0000-000000000005', 2, 'Chest pass, bounce pass - target practice!'),
('dba00003-0002-0000-0000-000000000003', 'da000003-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00003-0002-0000-0000-000000000004', 'da000003-0000-0000-0000-000000000002', 'b0000000-0002-0000-0000-000000000004', 4, 'Add movement to passing - give and go'),
('dba00003-0002-0000-0000-000000000005', 'da000003-0000-0000-0000-000000000002', 'b0000000-0002-0000-0000-000000000011', 5, 'Basic spacing concepts - spread out!'),
('dba00003-0002-0000-0000-000000000006', 'da000003-0000-0000-0000-000000000002', 'b0000000-0002-0000-0000-000000000009', 6, 'Emphasize passing before shooting'),
('dba00003-0002-0000-0000-000000000007', 'da000003-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 7, 'Why is passing important in basketball?'),
('dba00003-0002-0000-0000-000000000008', 'da000003-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template C Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00003-0003-0000-0000-000000000001', 'da000003-0000-0000-0000-000000000003', 'b0000000-0001-0000-0000-000000000001', 1, 'Game day warmup with extra shooting prep'),
('dba00003-0003-0000-0000-000000000002', 'da000003-0000-0000-0000-000000000003', 'b0000000-0002-0000-0000-000000000006', 2, 'Right side, left side - opposite hand!'),
('dba00003-0003-0000-0000-000000000003', 'da000003-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00003-0003-0000-0000-000000000004', 'da000003-0000-0000-0000-000000000003', 'b0000000-0002-0000-0000-000000000007', 4, 'BEEF! Close to basket first, move out slowly'),
('dba00003-0003-0000-0000-000000000005', 'da000003-0000-0000-0000-000000000003', 'b0000000-0002-0000-0000-000000000009', 5, 'Apply everything learned - celebrate good plays!'),
('dba00003-0003-0000-0000-000000000006', 'da000003-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'What basketball skill do you want to keep working on?'),
('dba00003-0003-0000-0000-000000000007', 'da000003-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ----------------------------------------
-- TEMPLATE D: Basketball Game IQ & Confidence - Ages 11-13
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000004',
  NULL,
  'basketball',
  'Basketball Game IQ & Confidence – Ages 11–13',
  'A game-focused basketball curriculum for athletes ready to think the game at a higher level. This curriculum emphasizes reading the floor, basic offense and defense concepts, communication, and leadership on the court. Athletes will develop the mental game alongside their physical skills.',
  11, 13, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template D Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000004-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000004', 1, 'Day 1: Offense Basics & Spacing', 'Creating Opportunities', 'Introduction to offensive concepts: spacing, cutting, moving without the ball. Understanding why we do what we do.'),
('da000004-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000004', 2, 'Day 2: Defense, Effort, and Hustle Plays', 'Defensive Mindset', 'Defense wins championships! Building a defensive identity through effort, positioning, and communication.'),
('da000004-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000004', 3, 'Day 3: Game Situations & Scrimmages', 'Putting It Together', 'Controlled scrimmages with specific situations. Apply offensive and defensive concepts in game scenarios.')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template D Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00004-0001-0000-0000-000000000001', 'da000004-0000-0000-0000-000000000001', 'b0000000-0001-0000-0000-000000000001', 1, 'Higher intensity warmup for older group'),
('dba00004-0001-0000-0000-000000000002', 'da000004-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000002', 2, 'Leadership discussion: What makes a leader on the court?'),
('dba00004-0001-0000-0000-000000000003', 'da000004-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00004-0001-0000-0000-000000000004', 'da000004-0000-0000-0000-000000000001', 'b0000000-0002-0000-0000-000000000011', 4, 'Floor spacing, cutting lanes, reading defenders'),
('dba00004-0001-0000-0000-000000000005', 'da000004-0000-0000-0000-000000000001', 'b0000000-0002-0000-0000-000000000002', 5, 'Add crossovers and hesitation moves'),
('dba00004-0001-0000-0000-000000000006', 'da000004-0000-0000-0000-000000000001', 'b0000000-0002-0000-0000-000000000009', 6, 'Focus on spacing and ball movement'),
('dba00004-0001-0000-0000-000000000007', 'da000004-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 7, 'What does "basketball IQ" mean to you?'),
('dba00004-0001-0000-0000-000000000008', 'da000004-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template D Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00004-0002-0000-0000-000000000001', 'da000004-0000-0000-0000-000000000002', 'b0000000-0001-0000-0000-000000000001', 1, 'Defense-focused warmup with slides'),
('dba00004-0002-0000-0000-000000000002', 'da000004-0000-0000-0000-000000000002', 'b0000000-0002-0000-0000-000000000003', 2, 'Defensive stance competition'),
('dba00004-0002-0000-0000-000000000003', 'da000004-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00004-0002-0000-0000-000000000004', 'da000004-0000-0000-0000-000000000002', 'b0000000-0002-0000-0000-000000000012', 4, 'Closeouts, box-outs, loose balls'),
('dba00004-0002-0000-0000-000000000005', 'da000004-0000-0000-0000-000000000002', 'b0000000-0002-0000-0000-000000000009', 5, 'Defense wins! Celebrate stops and steals.'),
('dba00004-0002-0000-0000-000000000006', 'da000004-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 6, 'Why is defense about effort, not talent?'),
('dba00004-0002-0000-0000-000000000007', 'da000004-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template D Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00004-0003-0000-0000-000000000001', 'da000004-0000-0000-0000-000000000003', 'b0000000-0001-0000-0000-000000000001', 1, 'Game day energy!'),
('dba00004-0003-0000-0000-000000000002', 'da000004-0000-0000-0000-000000000003', 'b0000000-0002-0000-0000-000000000013', 2, 'Last possession, inbounds, fast break situations'),
('dba00004-0003-0000-0000-000000000003', 'da000004-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00004-0003-0000-0000-000000000004', 'da000004-0000-0000-0000-000000000003', 'b0000000-0002-0000-0000-000000000010', 4, 'Apply everything! Coach stops to teach.'),
('dba00004-0003-0000-0000-000000000005', 'da000004-0000-0000-0000-000000000003', 'b0000000-0002-0000-0000-000000000009', 5, 'Final games - championship atmosphere!'),
('dba00004-0003-0000-0000-000000000006', 'da000004-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'What will you take from this week to your team?'),
('dba00004-0003-0000-0000-000000000007', 'da000004-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ----------------------------------------
-- TEMPLATE E: Intro Soccer Skills - Ages 5-8
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000005',
  NULL,
  'soccer',
  'Intro Soccer Skills – Ages 5–8',
  'A fun introduction to the beautiful game! This curriculum focuses on ball control, dribbling, directional play, and having fun with the ball at their feet. Perfect for girls experiencing soccer for the first time, building comfort and confidence with the ball through games and play.',
  5, 8, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template E Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000005-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000005', 1, 'Day 1: Dribbling & Direction', 'Ball at Your Feet', 'Getting comfortable with the ball. Focus on close control and changing direction. Make it playful!'),
('da000005-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000005', 2, 'Day 2: Passing & Receiving', 'Sharing the Ball', 'Introduction to passing with a partner. Learn to receive and pass back. Soccer is a team sport!'),
('da000005-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000005', 3, 'Day 3: Shooting & Small-Sided Games', 'Score Goals!', 'Learn basic shooting and celebrate goals in small-sided games. Finish with a mini-tournament!')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template E Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00005-0001-0000-0000-000000000001', 'da000005-0000-0000-0000-000000000001', 'e2000000-0001-0000-0000-000000000001', 1, 'Ball at feet from the start - toe taps, rolls, sole touches'),
('dba00005-0001-0000-0000-000000000002', 'da000005-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000003', 2, 'I am a soccer player! Simple affirmations'),
('dba00005-0001-0000-0000-000000000003', 'da000005-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00005-0001-0000-0000-000000000004', 'da000005-0000-0000-0000-000000000001', 'e2000000-0002-0000-0000-000000000001', 4, 'Lots of gates - count how many you can get through!'),
('dba00005-0001-0000-0000-000000000005', 'da000005-0000-0000-0000-000000000001', 'e2000000-0002-0000-0000-000000000003', 5, 'Coach calls directions - make it a game!'),
('dba00005-0001-0000-0000-000000000006', 'da000005-0000-0000-0000-000000000001', 'e2000000-0002-0000-0000-000000000006', 6, 'Simple small-sided game - keep it moving!'),
('dba00005-0001-0000-0000-000000000007', 'da000005-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 7, 'What was your favorite thing about having a ball at your feet?'),
('dba00005-0001-0000-0000-000000000008', 'da000005-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template E Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00005-0002-0000-0000-000000000001', 'da000005-0000-0000-0000-000000000002', 'e2000000-0001-0000-0000-000000000001', 1, 'Partner warmup - passing back and forth'),
('dba00005-0002-0000-0000-000000000002', 'da000005-0000-0000-0000-000000000002', 'e2000000-0002-0000-0000-000000000002', 2, 'Pass through the gate - inside of foot'),
('dba00005-0002-0000-0000-000000000003', 'da000005-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00005-0002-0000-0000-000000000004', 'da000005-0000-0000-0000-000000000002', 'e2000000-0002-0000-0000-000000000001', 4, 'Combine passing with dribbling through gates'),
('dba00005-0002-0000-0000-000000000005', 'da000005-0000-0000-0000-000000000002', 'e1000000-0001-0000-0000-000000000002', 5, 'Soccer tag - dribble while avoiding taggers'),
('dba00005-0002-0000-0000-000000000006', 'da000005-0000-0000-0000-000000000002', 'e2000000-0002-0000-0000-000000000006', 6, 'Focus on passing to teammates'),
('dba00005-0002-0000-0000-000000000007', 'da000005-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 7, 'Why is passing important?'),
('dba00005-0002-0000-0000-000000000008', 'da000005-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template E Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00005-0003-0000-0000-000000000001', 'da000005-0000-0000-0000-000000000003', 'e2000000-0001-0000-0000-000000000001', 1, 'Shooting prep in warmup'),
('dba00005-0003-0000-0000-000000000002', 'da000005-0000-0000-0000-000000000003', 'e2000000-0002-0000-0000-000000000005', 2, 'Strike with laces - aim for corners!'),
('dba00005-0003-0000-0000-000000000003', 'da000005-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00005-0003-0000-0000-000000000004', 'da000005-0000-0000-0000-000000000003', 'e2000000-0002-0000-0000-000000000006', 4, 'Mini-tournament with team names!'),
('dba00005-0003-0000-0000-000000000005', 'da000005-0000-0000-0000-000000000003', 'e2000000-0002-0000-0000-000000000006', 5, 'Continue tournament - finals!'),
('dba00005-0003-0000-0000-000000000006', 'da000005-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'Celebrate camp! What was your favorite goal?'),
('dba00005-0003-0000-0000-000000000007', 'da000005-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, 'Group photo!')
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ----------------------------------------
-- TEMPLATE F: Soccer Positioning & Small-Sided Games - Ages 9-12
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000006',
  NULL,
  'soccer',
  'Soccer Positioning & Small-Sided Games – Ages 9–12',
  'A game-focused soccer curriculum for athletes ready to understand team play. This curriculum emphasizes positions, spacing, small-sided decision making, and communication. Perfect for girls who have basic skills and want to learn how to play together as a team.',
  9, 12, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template F Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000006-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000006', 1, 'Day 1: Positions & Shape', 'Finding Your Spot', 'Introduction to team shape and positions. Where do I go? What''s my job? Build understanding of team structure.'),
('da000006-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000006', 2, 'Day 2: Attacking vs Defending', 'Two Sides of the Game', 'Basic principles of attacking and defending. When do we attack? When do we defend? Reading the game.'),
('da000006-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000006', 3, 'Day 3: Tournament Day', 'Game Time!', 'Mini-tournament applying everything learned. Teams, brackets, and championship celebrations!')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template F Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00006-0001-0000-0000-000000000001', 'da000006-0000-0000-0000-000000000001', 'e2000000-0001-0000-0000-000000000001', 1, 'Technical warmup with passing combinations'),
('dba00006-0001-0000-0000-000000000002', 'da000006-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000002', 2, 'Discussion: What position do you play? What does that mean?'),
('dba00006-0001-0000-0000-000000000003', 'da000006-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00006-0001-0000-0000-000000000004', 'da000006-0000-0000-0000-000000000001', 'e2000000-0002-0000-0000-000000000007', 4, 'Walk through positions on field'),
('dba00006-0001-0000-0000-000000000005', 'da000006-0000-0000-0000-000000000001', 'e2000000-0002-0000-0000-000000000004', 5, 'Wall pass combos - movement after passing'),
('dba00006-0001-0000-0000-000000000006', 'da000006-0000-0000-0000-000000000001', 'e2000000-0002-0000-0000-000000000006', 6, 'Play in positions - coach calls adjustments'),
('dba00006-0001-0000-0000-000000000007', 'da000006-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 7, 'What did you learn about your position today?'),
('dba00006-0001-0000-0000-000000000008', 'da000006-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template F Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00006-0002-0000-0000-000000000001', 'da000006-0000-0000-0000-000000000002', 'e2000000-0001-0000-0000-000000000001', 1, 'Dynamic warmup with direction changes'),
('dba00006-0002-0000-0000-000000000002', 'da000006-0000-0000-0000-000000000002', 'e2000000-0002-0000-0000-000000000008', 2, '2v1, 3v2 scenarios'),
('dba00006-0002-0000-0000-000000000003', 'da000006-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00006-0002-0000-0000-000000000004', 'da000006-0000-0000-0000-000000000002', 'e2000000-0002-0000-0000-000000000008', 4, 'Add defensive principles - delay, force'),
('dba00006-0002-0000-0000-000000000005', 'da000006-0000-0000-0000-000000000002', 'e2000000-0002-0000-0000-000000000006', 5, 'Full small-sided games with coaching stops'),
('dba00006-0002-0000-0000-000000000006', 'da000006-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 6, 'When should you attack? When should you defend?'),
('dba00006-0002-0000-0000-000000000007', 'da000006-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template F Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00006-0003-0000-0000-000000000001', 'da000006-0000-0000-0000-000000000003', 'e2000000-0001-0000-0000-000000000001', 1, 'Game day warmup'),
('dba00006-0003-0000-0000-000000000002', 'da000006-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000002', 2, 'Sportsmanship reminder before tournament'),
('dba00006-0003-0000-0000-000000000003', 'da000006-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00006-0003-0000-0000-000000000004', 'da000006-0000-0000-0000-000000000003', 'e2000000-0002-0000-0000-000000000009', 4, 'Tournament group stage'),
('dba00006-0003-0000-0000-000000000005', 'da000006-0000-0000-0000-000000000003', 'e2000000-0002-0000-0000-000000000009', 5, 'Tournament finals!'),
('dba00006-0003-0000-0000-000000000006', 'da000006-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'Award ceremony - celebrate everyone!'),
('dba00006-0003-0000-0000-000000000007', 'da000006-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, 'Team photos!')
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ----------------------------------------
-- TEMPLATE G: Intro Volleyball - Ages 10-13
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000007',
  NULL,
  'volleyball',
  'Intro Volleyball – Ages 10–13',
  'A foundational volleyball curriculum covering serving, passing, setting basics, court rotation, and communication. Athletes will learn proper technique while discovering how fun volleyball can be when everyone works together. Perfect for girls new to volleyball!',
  10, 13, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template G Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000007-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000007', 1, 'Day 1: Platform & Passing', 'Bump It Up', 'Introduction to forearm passing - the foundation of volleyball. Focus on platform, posture, and movement to the ball.'),
('da000007-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000007', 2, 'Day 2: Serving & Setting Basics', 'Serve It Up', 'Learn to start the game! Basic serving progression plus introduction to setting.'),
('da000007-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000007', 3, 'Day 3: Rotation, Calling The Ball & Games', 'Play Together', 'Court rotation, communication, and putting it all together in games.')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template G Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00007-0001-0000-0000-000000000001', 'da000007-0000-0000-0000-000000000001', 'e3000000-0001-0000-0000-000000000001', 1, 'Volleyball-specific warmup - arm swings, quick feet'),
('dba00007-0001-0000-0000-000000000002', 'da000007-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000003', 2, 'Set a passing goal for the week'),
('dba00007-0001-0000-0000-000000000003', 'da000007-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00007-0001-0000-0000-000000000004', 'da000007-0000-0000-0000-000000000001', 'e3000000-0002-0000-0000-000000000002', 4, 'Individual wall reps first'),
('dba00007-0001-0000-0000-000000000005', 'da000007-0000-0000-0000-000000000001', 'e3000000-0002-0000-0000-000000000001', 5, 'Partner passing - work on consistency'),
('dba00007-0001-0000-0000-000000000006', 'da000007-0000-0000-0000-000000000001', 'e3000000-0002-0000-0000-000000000007', 6, 'Modified games with coach toss'),
('dba00007-0001-0000-0000-000000000007', 'da000007-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 7, 'What makes a good platform?'),
('dba00007-0001-0000-0000-000000000008', 'da000007-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template G Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00007-0002-0000-0000-000000000001', 'da000007-0000-0000-0000-000000000002', 'e3000000-0001-0000-0000-000000000001', 1, 'Serving arm prep in warmup'),
('dba00007-0002-0000-0000-000000000002', 'da000007-0000-0000-0000-000000000002', 'e3000000-0002-0000-0000-000000000003', 2, 'Toss practice first, then add contact'),
('dba00007-0002-0000-0000-000000000003', 'da000007-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00007-0002-0000-0000-000000000004', 'da000007-0000-0000-0000-000000000002', 'e3000000-0002-0000-0000-000000000004', 4, 'Introduction to hand position and setting'),
('dba00007-0002-0000-0000-000000000005', 'da000007-0000-0000-0000-000000000002', 'e3000000-0002-0000-0000-000000000007', 5, 'Games with serve receive'),
('dba00007-0002-0000-0000-000000000006', 'da000007-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 6, 'What was hard about serving? What clicked?'),
('dba00007-0002-0000-0000-000000000007', 'da000007-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template G Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00007-0003-0000-0000-000000000001', 'da000007-0000-0000-0000-000000000003', 'e3000000-0001-0000-0000-000000000001', 1, 'Game day warmup'),
('dba00007-0003-0000-0000-000000000002', 'da000007-0000-0000-0000-000000000003', 'e3000000-0002-0000-0000-000000000006', 2, 'Walk through positions and rotation'),
('dba00007-0003-0000-0000-000000000003', 'da000007-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00007-0003-0000-0000-000000000004', 'da000007-0000-0000-0000-000000000003', 'e3000000-0002-0000-0000-000000000005', 4, 'Practice calling the ball - LOUD!'),
('dba00007-0003-0000-0000-000000000005', 'da000007-0000-0000-0000-000000000003', 'e3000000-0002-0000-0000-000000000008', 5, 'Tournament games!'),
('dba00007-0003-0000-0000-000000000006', 'da000007-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'Why is communication so important in volleyball?'),
('dba00007-0003-0000-0000-000000000007', 'da000007-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, 'Celebrate!')
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ----------------------------------------
-- TEMPLATE H: Intro Flag Football - Ages 9-12
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000008',
  NULL,
  'flag_football',
  'Intro Flag Football – Ages 9–12',
  'A safe, contact-free introduction to football! This curriculum covers basic routes, throwing, catching, and offense/defense concepts. Girls will learn why flag football is one of the fastest-growing girls'' sports while building confidence on the field.',
  9, 12, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template H Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000008-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000008', 1, 'Day 1: Movement, Flag Pulling & Routes', 'Getting Started', 'Introduction to flag football movement, flag pulling technique, and basic route running. Make it fun with games!'),
('da000008-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000008', 2, 'Day 2: Offense vs Defense Concepts', 'Two Sides of the Ball', 'Basic offensive and defensive concepts. Learn what to do with and without the ball on both sides.'),
('da000008-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000008', 3, 'Day 3: Game Day & Situational Play', 'Play Ball!', 'Controlled scrimmages with specific game situations. Apply everything learned in game settings!')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template H Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00008-0001-0000-0000-000000000001', 'da000008-0000-0000-0000-000000000001', 'f0000000-0001-0000-0000-000000000001', 1, 'Flag belts on immediately - get used to wearing them'),
('dba00008-0001-0000-0000-000000000002', 'da000008-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000003', 2, 'Girls'' flag football is growing fast - you''re part of it!'),
('dba00008-0001-0000-0000-000000000003', 'da000008-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00008-0001-0000-0000-000000000004', 'da000008-0000-0000-0000-000000000001', 'f0000000-0002-0000-0000-000000000001', 4, 'Make it a game - who can pull the most flags?'),
('dba00008-0001-0000-0000-000000000005', 'da000008-0000-0000-0000-000000000001', 'f0000000-0002-0000-0000-000000000002', 5, 'Basic routes - slant, out, go'),
('dba00008-0001-0000-0000-000000000006', 'da000008-0000-0000-0000-000000000001', 'f0000000-0002-0000-0000-000000000004', 6, 'Basic catching technique'),
('dba00008-0001-0000-0000-000000000007', 'da000008-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 7, 'What position do you want to try?'),
('dba00008-0001-0000-0000-000000000008', 'da000008-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template H Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00008-0002-0000-0000-000000000001', 'da000008-0000-0000-0000-000000000002', 'f0000000-0001-0000-0000-000000000001', 1, 'Review flag pulling in warmup'),
('dba00008-0002-0000-0000-000000000002', 'da000008-0000-0000-0000-000000000002', 'f0000000-0002-0000-0000-000000000005', 2, 'Grip, stance, release - basic throws'),
('dba00008-0002-0000-0000-000000000003', 'da000008-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00008-0002-0000-0000-000000000004', 'da000008-0000-0000-0000-000000000002', 'f0000000-0002-0000-0000-000000000003', 4, 'QB and receiver timing drills'),
('dba00008-0002-0000-0000-000000000005', 'da000008-0000-0000-0000-000000000002', 'f0000000-0002-0000-0000-000000000006', 5, 'Walk through formations, then add movement'),
('dba00008-0002-0000-0000-000000000006', 'da000008-0000-0000-0000-000000000002', 'f0000000-0002-0000-0000-000000000007', 6, 'Modified scrimmage with coaching stops'),
('dba00008-0002-0000-0000-000000000007', 'da000008-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 7, 'What do you like better - offense or defense?'),
('dba00008-0002-0000-0000-000000000008', 'da000008-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template H Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00008-0003-0000-0000-000000000001', 'da000008-0000-0000-0000-000000000003', 'f0000000-0001-0000-0000-000000000001', 1, 'Game day energy!'),
('dba00008-0003-0000-0000-000000000002', 'da000008-0000-0000-0000-000000000003', 'f0000000-0002-0000-0000-000000000008', 2, 'Red zone, 4th down scenarios'),
('dba00008-0003-0000-0000-000000000003', 'da000008-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00008-0003-0000-0000-000000000004', 'da000008-0000-0000-0000-000000000003', 'f0000000-0002-0000-0000-000000000007', 4, 'Full scrimmage - rotate positions'),
('dba00008-0003-0000-0000-000000000005', 'da000008-0000-0000-0000-000000000003', 'f0000000-0002-0000-0000-000000000007', 5, 'Championship game!'),
('dba00008-0003-0000-0000-000000000006', 'da000008-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'Who wants to play flag football on a team?'),
('dba00008-0003-0000-0000-000000000007', 'da000008-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, 'Celebrate!')
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ----------------------------------------
-- TEMPLATE I: Speed, Agility & Power - Ages 11-15
-- ----------------------------------------
INSERT INTO curriculum_templates (id, licensee_id, sport, name, description, age_min, age_max, difficulty, is_global, total_days, is_active, is_published)
VALUES (
  'aa000000-0000-0000-0000-000000000009',
  NULL,
  'speed_agility',
  'Speed, Agility & Power – Ages 11–15',
  'A sport-performance curriculum focused on movement quality, acceleration, deceleration, change of direction, and age-appropriate power development. Perfect for multi-sport athletes looking to get faster, more agile, and more explosive. Skills transfer to every sport!',
  11, 15, 'intro', true, 3, true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Template I Days
INSERT INTO curriculum_template_days (id, template_id, day_number, title, theme, notes) VALUES
('da000009-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000009', 1, 'Day 1: Acceleration & Mechanics', 'Get Fast!', 'Focus on starting mechanics, drive phase, and acceleration technique. Proper mechanics make you faster!'),
('da000009-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000009', 2, 'Day 2: Change Of Direction & Agility', 'Move Better', 'Deceleration, cutting, and change of direction. Control your body at all speeds.'),
('da000009-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000009', 3, 'Day 3: Power, Core & Competition Circuits', 'Be Explosive', 'Putting it all together with power movements, core strength, and competitive circuits.')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, theme = EXCLUDED.theme, notes = EXCLUDED.notes;

-- Template I Day 1 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00009-0001-0000-0000-000000000001', 'da000009-0000-0000-0000-000000000001', 'a0000000-0001-0000-0000-000000000001', 1, 'Quality warmup - this IS training'),
('dba00009-0001-0000-0000-000000000002', 'da000009-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000003', 2, 'Set a speed goal - what do you want to improve?'),
('dba00009-0001-0000-0000-000000000003', 'da000009-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00009-0001-0000-0000-000000000004', 'da000009-0000-0000-0000-000000000001', 'a0000000-0002-0000-0000-000000000001', 4, 'Wall drives, falling starts, 10-yard bursts'),
('dba00009-0001-0000-0000-000000000005', 'da000009-0000-0000-0000-000000000001', 'a0000000-0002-0000-0000-000000000003', 5, 'Ladder work for coordination'),
('dba00009-0001-0000-0000-000000000006', 'da000009-0000-0000-0000-000000000001', 'a0000000-0002-0000-0000-000000000004', 6, 'Sprint relays - compete!'),
('dba00009-0001-0000-0000-000000000007', 'da000009-0000-0000-0000-000000000001', 'c0000000-0002-0000-0000-000000000001', 7, 'What did you learn about your running form?'),
('dba00009-0001-0000-0000-000000000008', 'da000009-0000-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', 8, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template I Day 2 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00009-0002-0000-0000-000000000001', 'da000009-0000-0000-0000-000000000002', 'a0000000-0001-0000-0000-000000000001', 1, 'Warmup with lateral movement emphasis'),
('dba00009-0002-0000-0000-000000000002', 'da000009-0000-0000-0000-000000000002', 'a0000000-0002-0000-0000-000000000002', 2, 'L-drill, T-drill, 5-10-5'),
('dba00009-0002-0000-0000-000000000003', 'da000009-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00009-0002-0000-0000-000000000004', 'da000009-0000-0000-0000-000000000002', 'a0000000-0002-0000-0000-000000000003', 4, 'Advanced ladder patterns'),
('dba00009-0002-0000-0000-000000000005', 'da000009-0000-0000-0000-000000000002', 'a0000000-0002-0000-0000-000000000007', 5, 'Timed circuits - beat your time!'),
('dba00009-0002-0000-0000-000000000006', 'da000009-0000-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000001', 6, 'Why is deceleration as important as acceleration?'),
('dba00009-0002-0000-0000-000000000007', 'da000009-0000-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', 7, NULL)
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- Template I Day 3 Blocks
INSERT INTO curriculum_day_blocks (id, day_id, block_id, order_index, custom_notes) VALUES
('dba00009-0003-0000-0000-000000000001', 'da000009-0000-0000-0000-000000000003', 'a0000000-0001-0000-0000-000000000001', 1, 'Full warmup - competition day'),
('dba00009-0003-0000-0000-000000000002', 'da000009-0000-0000-0000-000000000003', 'a0000000-0002-0000-0000-000000000005', 2, 'Box jumps, broad jumps, lateral bounds'),
('dba00009-0003-0000-0000-000000000003', 'da000009-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000002', 3, NULL),
('dba00009-0003-0000-0000-000000000004', 'da000009-0000-0000-0000-000000000003', 'a0000000-0002-0000-0000-000000000006', 4, 'Core circuit for total body strength'),
('dba00009-0003-0000-0000-000000000005', 'da000009-0000-0000-0000-000000000003', 'a0000000-0002-0000-0000-000000000007', 5, 'Final competition - championship circuit!'),
('dba00009-0003-0000-0000-000000000006', 'da000009-0000-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000001', 6, 'How will you use these skills in your sport?'),
('dba00009-0003-0000-0000-000000000007', 'da000009-0000-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', 7, 'Celebrate gains!')
ON CONFLICT (id) DO UPDATE SET custom_notes = EXCLUDED.custom_notes, order_index = EXCLUDED.order_index;

-- ============================================
-- STEP 5: UPDATE DURATION CALCULATIONS
-- ============================================
-- Calculate total duration for each day based on its blocks

UPDATE curriculum_template_days d
SET total_duration_minutes = (
  SELECT COALESCE(SUM(COALESCE(db.custom_duration_minutes, b.duration_minutes)), 0)
  FROM curriculum_day_blocks db
  JOIN curriculum_blocks b ON b.id = db.block_id
  WHERE db.day_id = d.id
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count templates
SELECT
  'Templates' as item,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_global = true) as global_count
FROM curriculum_templates;

-- Count blocks by sport
SELECT
  sport,
  COUNT(*) as block_count
FROM curriculum_blocks
WHERE is_global = true
GROUP BY sport
ORDER BY sport;

-- Count days per template
SELECT
  t.name,
  t.sport,
  COUNT(d.id) as day_count,
  SUM(d.total_duration_minutes) as total_minutes
FROM curriculum_templates t
LEFT JOIN curriculum_template_days d ON d.template_id = t.id
WHERE t.is_global = true
GROUP BY t.id, t.name, t.sport
ORDER BY t.sport, t.name;

-- Verify day blocks are connected
SELECT
  t.name as template_name,
  d.title as day_title,
  COUNT(db.id) as blocks_count
FROM curriculum_templates t
JOIN curriculum_template_days d ON d.template_id = t.id
LEFT JOIN curriculum_day_blocks db ON db.day_id = d.id
WHERE t.is_global = true
GROUP BY t.id, t.name, d.id, d.day_number, d.title
ORDER BY t.name, d.day_number;

SELECT 'Curriculum seed data loaded successfully!' as status;
