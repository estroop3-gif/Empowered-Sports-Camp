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
