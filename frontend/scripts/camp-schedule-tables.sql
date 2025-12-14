-- ============================================
-- CAMP SCHEDULE & CURRICULUM ASSIGNMENT TABLES
-- ============================================
-- This schema extends the camp system with day-by-day scheduling
-- and curriculum integration, similar to a call sheet builder.
--
-- RELATIONSHIPS:
--
-- camps (existing)
--   └── camp_session_curriculum (links camp to curriculum template)
--   └── camp_session_days (Day 1, Day 2, etc.)
--         └── camp_session_schedule_blocks (hour-by-hour schedule)
--               └── curriculum_blocks (optional link to curriculum)
--
-- schedule_templates (reusable schedule layouts)
--   └── schedule_template_blocks (template time slots)
--
-- ============================================

-- ============================================
-- TABLE: camp_session_days
-- ============================================
-- Represents each day of a camp session (Day 1, Day 2, etc.)
-- Created automatically based on camp start/end dates or manually

CREATE TABLE IF NOT EXISTS camp_session_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent camp
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,

  -- Day identification
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  actual_date DATE, -- The actual calendar date for this day

  -- Day metadata
  title TEXT NOT NULL, -- e.g., "Day 1 - Welcome & Foundations"
  theme TEXT, -- e.g., "Building Confidence"
  notes TEXT, -- Director/coach notes for this day

  -- Status tracking
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each camp can only have one Day 1, Day 2, etc.
  CONSTRAINT unique_camp_day UNIQUE (camp_id, day_number)
);

-- Indexes
CREATE INDEX idx_camp_session_days_camp ON camp_session_days(camp_id);
CREATE INDEX idx_camp_session_days_date ON camp_session_days(actual_date);

-- ============================================
-- TABLE: camp_session_schedule_blocks
-- ============================================
-- Represents hour-by-hour (or time-slot) items in the daily schedule
-- Similar to call sheet rows - each block is a scheduled activity

CREATE TABLE IF NOT EXISTS camp_session_schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent day
  camp_session_day_id UUID NOT NULL REFERENCES camp_session_days(id) ON DELETE CASCADE,

  -- Time slot
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Content
  label TEXT NOT NULL, -- e.g., "Dynamic Warmup", "Check-in & Name Tags", "Lunch"
  description TEXT, -- More detailed notes/instructions

  -- Optional link to curriculum block
  curriculum_block_id UUID REFERENCES curriculum_blocks(id) ON DELETE SET NULL,

  -- Location/logistics
  location TEXT, -- e.g., "Court 1", "Field A", "Indoor Gym", "Cafeteria"

  -- Staff assignment (optional for now)
  assigned_staff_notes TEXT, -- e.g., "Coach Mike leads", "All coaches"

  -- Display/ordering
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Visual category for non-curriculum blocks
  block_type TEXT DEFAULT 'activity' CHECK (block_type IN (
    'activity',      -- Regular activity/drill
    'transition',    -- Movement between areas
    'break',         -- Water break, snack, rest
    'meal',          -- Lunch, snack time
    'arrival',       -- Check-in, arrival
    'departure',     -- Pickup, departure
    'special',       -- Special event, guest speaker
    'curriculum'     -- Linked to curriculum block
  )),

  -- Color coding (optional override)
  color_code TEXT, -- Hex color for UI display

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Time validation
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_schedule_blocks_day ON camp_session_schedule_blocks(camp_session_day_id);
CREATE INDEX idx_schedule_blocks_curriculum ON camp_session_schedule_blocks(curriculum_block_id);
CREATE INDEX idx_schedule_blocks_order ON camp_session_schedule_blocks(camp_session_day_id, order_index);
CREATE INDEX idx_schedule_blocks_time ON camp_session_schedule_blocks(camp_session_day_id, start_time);

-- ============================================
-- TABLE: schedule_templates
-- ============================================
-- Reusable schedule layouts (e.g., "Standard 9am-3pm Day")
-- Can be global (HQ) or licensee-specific

CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant: NULL = global (HQ), UUID = licensee-specific
  licensee_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template metadata
  name TEXT NOT NULL, -- e.g., "Standard 3-Day Camp - 9am to 3pm"
  description TEXT,

  -- Schedule parameters
  default_start_time TIME DEFAULT '09:00:00',
  default_end_time TIME DEFAULT '15:00:00',
  total_days INTEGER DEFAULT 1,

  -- Targeting (optional)
  sport TEXT, -- If specific to a sport

  -- Status
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schedule_templates_licensee ON schedule_templates(licensee_id);
CREATE INDEX idx_schedule_templates_global ON schedule_templates(is_global) WHERE is_global = true;

-- ============================================
-- TABLE: schedule_template_blocks
-- ============================================
-- Individual time slots within a schedule template

CREATE TABLE IF NOT EXISTS schedule_template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent template
  template_id UUID NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,

  -- Which day in the template (for multi-day templates)
  day_number INTEGER NOT NULL DEFAULT 1 CHECK (day_number > 0),

  -- Time slot
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Default content
  label TEXT NOT NULL,
  description TEXT,

  -- Default location
  default_location TEXT,

  -- Block type
  block_type TEXT DEFAULT 'activity' CHECK (block_type IN (
    'activity', 'transition', 'break', 'meal', 'arrival', 'departure', 'special', 'curriculum'
  )),

  -- Ordering
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_template_time_range CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_schedule_template_blocks_template ON schedule_template_blocks(template_id);
CREATE INDEX idx_schedule_template_blocks_day ON schedule_template_blocks(template_id, day_number);

-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================

CREATE TRIGGER camp_session_days_updated_at
  BEFORE UPDATE ON camp_session_days
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_updated_at();

CREATE TRIGGER camp_session_schedule_blocks_updated_at
  BEFORE UPDATE ON camp_session_schedule_blocks
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_updated_at();

CREATE TRIGGER schedule_templates_updated_at
  BEFORE UPDATE ON schedule_templates
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_updated_at();

CREATE TRIGGER schedule_template_blocks_updated_at
  BEFORE UPDATE ON schedule_template_blocks
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE camp_session_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_session_schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_template_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CAMP_SESSION_DAYS RLS
-- Access based on parent camp's tenant
-- ============================================

CREATE POLICY "camp_days_select_policy"
ON camp_session_days FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camps c
    WHERE c.id = camp_id
    AND c.tenant_id = public.get_my_tenant_id()
  )
);

CREATE POLICY "camp_days_insert_policy"
ON camp_session_days FOR INSERT
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

CREATE POLICY "camp_days_update_policy"
ON camp_session_days FOR UPDATE
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

CREATE POLICY "camp_days_delete_policy"
ON camp_session_days FOR DELETE
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
-- CAMP_SESSION_SCHEDULE_BLOCKS RLS
-- Access based on parent day's camp tenant
-- ============================================

CREATE POLICY "schedule_blocks_select_policy"
ON camp_session_schedule_blocks FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camp_session_days d
    JOIN camps c ON c.id = d.camp_id
    WHERE d.id = camp_session_day_id
    AND c.tenant_id = public.get_my_tenant_id()
  )
);

CREATE POLICY "schedule_blocks_insert_policy"
ON camp_session_schedule_blocks FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camp_session_days d
    JOIN camps c ON c.id = d.camp_id
    WHERE d.id = camp_session_day_id
    AND c.tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('licensee_owner', 'director')
  )
);

CREATE POLICY "schedule_blocks_update_policy"
ON camp_session_schedule_blocks FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camp_session_days d
    JOIN camps c ON c.id = d.camp_id
    WHERE d.id = camp_session_day_id
    AND c.tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('licensee_owner', 'director')
  )
);

CREATE POLICY "schedule_blocks_delete_policy"
ON camp_session_schedule_blocks FOR DELETE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR EXISTS (
    SELECT 1 FROM camp_session_days d
    JOIN camps c ON c.id = d.camp_id
    WHERE d.id = camp_session_day_id
    AND c.tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('licensee_owner', 'director')
  )
);

-- ============================================
-- SCHEDULE_TEMPLATES RLS
-- Global templates visible to all, licensee templates scoped
-- ============================================

CREATE POLICY "schedule_templates_select_policy"
ON schedule_templates FOR SELECT
TO authenticated
USING (
  is_global = true
  OR licensee_id = public.get_my_tenant_id()
  OR public.get_my_role() = 'hq_admin'
);

CREATE POLICY "schedule_templates_insert_policy"
ON schedule_templates FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director'))
);

CREATE POLICY "schedule_templates_update_policy"
ON schedule_templates FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director'))
);

CREATE POLICY "schedule_templates_delete_policy"
ON schedule_templates FOR DELETE
TO authenticated
USING (
  public.get_my_role() = 'hq_admin'
  OR (licensee_id = public.get_my_tenant_id() AND is_global = false AND public.get_my_role() = 'licensee_owner')
);

-- ============================================
-- SCHEDULE_TEMPLATE_BLOCKS RLS
-- Inherits from parent template
-- ============================================

CREATE POLICY "schedule_template_blocks_select_policy"
ON schedule_template_blocks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedule_templates t
    WHERE t.id = template_id
    AND (t.is_global = true OR t.licensee_id = public.get_my_tenant_id() OR public.get_my_role() = 'hq_admin')
  )
);

CREATE POLICY "schedule_template_blocks_insert_policy"
ON schedule_template_blocks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM schedule_templates t
    WHERE t.id = template_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director')))
  )
);

CREATE POLICY "schedule_template_blocks_update_policy"
ON schedule_template_blocks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedule_templates t
    WHERE t.id = template_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() IN ('licensee_owner', 'director')))
  )
);

CREATE POLICY "schedule_template_blocks_delete_policy"
ON schedule_template_blocks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedule_templates t
    WHERE t.id = template_id
    AND (public.get_my_role() = 'hq_admin' OR (t.licensee_id = public.get_my_tenant_id() AND public.get_my_role() = 'licensee_owner'))
  )
);

-- ============================================
-- SEED DATA: Default Schedule Templates
-- ============================================

-- Standard Full-Day Camp Schedule (9am-3pm)
INSERT INTO schedule_templates (id, licensee_id, name, description, default_start_time, default_end_time, total_days, is_global, is_active) VALUES
  ('f0000001-0000-0000-0000-000000000001', NULL, 'Standard Full-Day Camp (9am-3pm)', 'A typical full-day camp schedule with structured activities, breaks, and lunch.', '09:00:00', '15:00:00', 1, true, true);

-- Add blocks to the standard schedule
INSERT INTO schedule_template_blocks (template_id, day_number, start_time, end_time, label, description, block_type, order_index) VALUES
  ('f0000001-0000-0000-0000-000000000001', 1, '09:00:00', '09:15:00', 'Arrival & Check-in', 'Greet campers, check attendance, distribute name tags', 'arrival', 1),
  ('f0000001-0000-0000-0000-000000000001', 1, '09:15:00', '09:30:00', 'Opening Circle & Warmup', 'Welcome, daily theme introduction, dynamic warmup', 'activity', 2),
  ('f0000001-0000-0000-0000-000000000001', 1, '09:30:00', '10:15:00', 'Skill Session 1', 'First focused skill development block', 'curriculum', 3),
  ('f0000001-0000-0000-0000-000000000001', 1, '10:15:00', '10:30:00', 'Water Break', 'Hydration and rest', 'break', 4),
  ('f0000001-0000-0000-0000-000000000001', 1, '10:30:00', '11:15:00', 'Skill Session 2', 'Second focused skill development block', 'curriculum', 5),
  ('f0000001-0000-0000-0000-000000000001', 1, '11:15:00', '11:30:00', 'Transition & Snack', 'Move to next area, light snack if provided', 'transition', 6),
  ('f0000001-0000-0000-0000-000000000001', 1, '11:30:00', '12:00:00', 'Team Games / Scrimmage', 'Apply skills in game-like situations', 'curriculum', 7),
  ('f0000001-0000-0000-0000-000000000001', 1, '12:00:00', '12:45:00', 'Lunch', 'Supervised lunch period', 'meal', 8),
  ('f0000001-0000-0000-0000-000000000001', 1, '12:45:00', '13:00:00', 'Mindset / Leadership Moment', 'Character development or team building', 'curriculum', 9),
  ('f0000001-0000-0000-0000-000000000001', 1, '13:00:00', '13:45:00', 'Skill Session 3', 'Afternoon skill development', 'curriculum', 10),
  ('f0000001-0000-0000-0000-000000000001', 1, '13:45:00', '14:00:00', 'Water Break', 'Hydration and rest', 'break', 11),
  ('f0000001-0000-0000-0000-000000000001', 1, '14:00:00', '14:40:00', 'Games & Competition', 'Fun competitive activities and games', 'curriculum', 12),
  ('f0000001-0000-0000-0000-000000000001', 1, '14:40:00', '14:55:00', 'Cooldown & Closing Circle', 'Stretching, reflection, awards/recognition', 'activity', 13),
  ('f0000001-0000-0000-0000-000000000001', 1, '14:55:00', '15:00:00', 'Dismissal', 'Parent pickup, farewell', 'departure', 14);

-- Half-Day Morning Schedule (9am-12pm)
INSERT INTO schedule_templates (id, licensee_id, name, description, default_start_time, default_end_time, total_days, is_global, is_active) VALUES
  ('f0000001-0000-0000-0000-000000000002', NULL, 'Half-Day Morning Camp (9am-12pm)', 'Condensed morning program with focused activities.', '09:00:00', '12:00:00', 1, true, true);

INSERT INTO schedule_template_blocks (template_id, day_number, start_time, end_time, label, description, block_type, order_index) VALUES
  ('f0000001-0000-0000-0000-000000000002', 1, '09:00:00', '09:15:00', 'Arrival & Check-in', 'Greet campers, check attendance', 'arrival', 1),
  ('f0000001-0000-0000-0000-000000000002', 1, '09:15:00', '09:30:00', 'Warmup & Introduction', 'Dynamic warmup and daily theme', 'activity', 2),
  ('f0000001-0000-0000-0000-000000000002', 1, '09:30:00', '10:15:00', 'Skill Session 1', 'Primary skill development', 'curriculum', 3),
  ('f0000001-0000-0000-0000-000000000002', 1, '10:15:00', '10:30:00', 'Water Break', 'Hydration and rest', 'break', 4),
  ('f0000001-0000-0000-0000-000000000002', 1, '10:30:00', '11:15:00', 'Skill Session 2', 'Secondary skill development', 'curriculum', 5),
  ('f0000001-0000-0000-0000-000000000002', 1, '11:15:00', '11:50:00', 'Games & Activities', 'Fun games and skill application', 'curriculum', 6),
  ('f0000001-0000-0000-0000-000000000002', 1, '11:50:00', '12:00:00', 'Cooldown & Dismissal', 'Closing circle and parent pickup', 'departure', 7);

SELECT 'Camp schedule tables created successfully!' as status;
