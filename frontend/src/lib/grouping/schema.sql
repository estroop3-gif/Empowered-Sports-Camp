-- ============================================================================
-- EMPOWERED SPORTS CAMP - GROUPING ENGINE DATABASE SCHEMA
-- ============================================================================
-- This schema powers the proprietary grouping algorithm that is the core
-- value proposition of the Empowered Sports Camp SaaS platform.
-- ============================================================================

-- ============================================================================
-- SECTION 1: CAMP SESSIONS (Extended for Grouping)
-- ============================================================================

-- Add grouping-related columns to camps table if not exists
-- Note: Run this as ALTER TABLE if camps table already exists
ALTER TABLE camps ADD COLUMN IF NOT EXISTS grouping_status TEXT DEFAULT 'pending'
  CHECK (grouping_status IN ('pending', 'auto_grouped', 'reviewed', 'finalized'));
ALTER TABLE camps ADD COLUMN IF NOT EXISTS grouping_run_at TIMESTAMPTZ;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS grouping_finalized_at TIMESTAMPTZ;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS grouping_finalized_by UUID;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS max_group_size INTEGER DEFAULT 12;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS num_groups INTEGER DEFAULT 5;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS max_grade_spread INTEGER DEFAULT 2;

-- ============================================================================
-- SECTION 2: CAMPER STANDARDIZED DATA
-- ============================================================================
-- Stores computed/validated data for each camper per session to ensure
-- consistent grouping regardless of when calculations are performed.

CREATE TABLE IF NOT EXISTS camper_session_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Standardized Demographics (computed at registration or on-demand)
  age_at_camp_start INTEGER NOT NULL,           -- Age in years on camp start date
  age_months_at_camp_start INTEGER NOT NULL,    -- Age in months for finer sorting
  grade_from_registration TEXT,                  -- Grade as entered by parent
  grade_validated INTEGER,                       -- Numeric grade level (0=K, 1=1st, etc.)
  grade_computed_from_dob INTEGER,              -- What grade DOB suggests
  grade_discrepancy BOOLEAN DEFAULT false,       -- Flag if entered vs computed differ
  grade_discrepancy_resolved BOOLEAN DEFAULT false,
  grade_discrepancy_resolution TEXT,            -- Director's resolution note

  -- Friend Requests (denormalized for fast access)
  friend_requests TEXT[],                        -- Array of friend names as entered
  friend_request_athlete_ids UUID[],            -- Resolved athlete IDs (matched)
  friend_group_id UUID,                          -- Assigned friend group cluster

  -- Special Considerations
  medical_notes TEXT,
  allergies TEXT,
  special_considerations TEXT,
  leadership_potential BOOLEAN DEFAULT false,
  leadership_notes TEXT,

  -- Registration Timing
  registered_at TIMESTAMPTZ NOT NULL,
  is_late_registration BOOLEAN DEFAULT false,   -- Registered within 7 days of start

  -- Grouping Result
  assigned_group_id UUID,
  assignment_type TEXT CHECK (assignment_type IN ('auto', 'manual', 'override')),
  assignment_reason TEXT,                        -- Why placed in this group

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(registration_id),
  UNIQUE(camp_id, athlete_id)
);

CREATE INDEX idx_camper_session_camp ON camper_session_data(camp_id);
CREATE INDEX idx_camper_session_tenant ON camper_session_data(tenant_id);
CREATE INDEX idx_camper_session_grade ON camper_session_data(camp_id, grade_validated);
CREATE INDEX idx_camper_session_friend_group ON camper_session_data(friend_group_id);
CREATE INDEX idx_camper_session_assigned_group ON camper_session_data(assigned_group_id);

-- ============================================================================
-- SECTION 3: FRIEND GROUPS (Clusters)
-- ============================================================================
-- Pre-computed friend group clusters for a camp session.
-- A friend group is a connected component of campers who requested each other.

CREATE TABLE IF NOT EXISTS friend_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Group Metadata
  group_number INTEGER NOT NULL,                 -- Sequential number for display
  member_count INTEGER NOT NULL DEFAULT 0,

  -- Grade Analysis
  min_grade INTEGER,
  max_grade INTEGER,
  grade_spread INTEGER,                          -- max_grade - min_grade
  exceeds_grade_constraint BOOLEAN DEFAULT false,

  -- Size Analysis
  exceeds_size_constraint BOOLEAN DEFAULT false, -- If > max_group_size

  -- Placement
  can_be_placed_intact BOOLEAN DEFAULT true,    -- Can fit in one group without violations
  placement_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(camp_id, group_number)
);

CREATE INDEX idx_friend_groups_camp ON friend_groups(camp_id);

-- ============================================================================
-- SECTION 4: CAMP GROUPS (The Five Groups)
-- ============================================================================
-- The actual groups that campers are assigned to.

CREATE TABLE IF NOT EXISTS camp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Group Identity
  group_number INTEGER NOT NULL CHECK (group_number BETWEEN 1 AND 10),
  group_name TEXT,                               -- Optional custom name (e.g., "Lightning")
  group_color TEXT,                              -- Hex color for visual distinction

  -- Current State
  camper_count INTEGER DEFAULT 0,
  min_grade INTEGER,
  max_grade INTEGER,
  grade_spread INTEGER DEFAULT 0,

  -- Constraint Status
  size_violation BOOLEAN DEFAULT false,          -- Exceeds max_group_size
  grade_violation BOOLEAN DEFAULT false,         -- Exceeds max_grade_spread
  friend_violation BOOLEAN DEFAULT false,        -- Friend group split
  has_warnings BOOLEAN DEFAULT false,
  has_hard_violations BOOLEAN DEFAULT false,

  -- Display Order
  display_order INTEGER,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(camp_id, group_number)
);

CREATE INDEX idx_camp_groups_camp ON camp_groups(camp_id);

-- Default group colors matching brand palette
COMMENT ON COLUMN camp_groups.group_color IS
  'Suggested colors: #CCFF00 (Neon), #FF2DCE (Magenta), #6F00D8 (Purple), #22C55E (Success Green), #F59E0B (Warning Orange)';

-- ============================================================================
-- SECTION 5: GROUP ASSIGNMENTS (Audit Trail)
-- ============================================================================
-- Tracks all assignment changes for audit purposes.

CREATE TABLE IF NOT EXISTS group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  camper_session_id UUID NOT NULL REFERENCES camper_session_data(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Assignment
  from_group_id UUID REFERENCES camp_groups(id),
  to_group_id UUID NOT NULL REFERENCES camp_groups(id),

  -- Context
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('auto', 'manual', 'override')),
  reason TEXT,

  -- Violations at time of assignment
  caused_size_violation BOOLEAN DEFAULT false,
  caused_grade_violation BOOLEAN DEFAULT false,
  caused_friend_violation BOOLEAN DEFAULT false,
  override_acknowledged BOOLEAN DEFAULT false,
  override_note TEXT,

  -- Who/When
  assigned_by UUID,                              -- NULL for auto-grouping
  assigned_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_group_assignments_camp ON group_assignments(camp_id);
CREATE INDEX idx_group_assignments_camper ON group_assignments(camper_session_id);
CREATE INDEX idx_group_assignments_time ON group_assignments(assigned_at DESC);

-- ============================================================================
-- SECTION 6: GROUPING RUNS (Algorithm Execution Log)
-- ============================================================================
-- Logs each time the grouping algorithm is executed.

CREATE TABLE IF NOT EXISTS grouping_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Run Context
  run_type TEXT NOT NULL CHECK (run_type IN ('initial', 'rerun', 'incremental')),
  triggered_by UUID,                             -- User who triggered, NULL if automatic
  trigger_reason TEXT,                           -- "registration_closed", "manual", "new_registrations"

  -- Input Stats
  total_campers INTEGER NOT NULL,
  total_friend_groups INTEGER,
  late_registrations INTEGER DEFAULT 0,
  grade_discrepancies INTEGER DEFAULT 0,

  -- Constraint Configuration
  max_group_size INTEGER NOT NULL,
  num_groups INTEGER NOT NULL,
  max_grade_spread INTEGER NOT NULL,

  -- Algorithm Results
  algorithm_version TEXT DEFAULT '1.0',
  execution_time_ms INTEGER,

  -- Placement Results
  campers_auto_placed INTEGER DEFAULT 0,
  friend_groups_placed_intact INTEGER DEFAULT 0,
  friend_groups_split INTEGER DEFAULT 0,
  constraint_violations INTEGER DEFAULT 0,

  -- Final State
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  warnings TEXT[],

  -- Preservation
  preserved_manual_overrides BOOLEAN DEFAULT true,
  overrides_preserved_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_grouping_runs_camp ON grouping_runs(camp_id);
CREATE INDEX idx_grouping_runs_time ON grouping_runs(created_at DESC);

-- ============================================================================
-- SECTION 7: CONSTRAINT VIOLATIONS LOG
-- ============================================================================
-- Detailed log of constraint violations for director review.

CREATE TABLE IF NOT EXISTS constraint_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grouping_run_id UUID REFERENCES grouping_runs(id) ON DELETE SET NULL,

  -- Violation Details
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'size_exceeded',
    'grade_spread_exceeded',
    'friend_group_split',
    'friend_group_too_large',
    'impossible_placement',
    'grade_discrepancy'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'hard')),

  -- Context
  affected_group_id UUID REFERENCES camp_groups(id),
  affected_camper_ids UUID[],
  affected_friend_group_id UUID REFERENCES friend_groups(id),

  -- Description
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_resolution TEXT,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT CHECK (resolution_type IN ('auto_fixed', 'manual_override', 'accepted', 'dismissed')),
  resolution_note TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_violations_camp ON constraint_violations(camp_id);
CREATE INDEX idx_violations_unresolved ON constraint_violations(camp_id, resolved) WHERE NOT resolved;

-- ============================================================================
-- SECTION 8: GRADE MAPPING REFERENCE
-- ============================================================================
-- Reference table for grade level mapping.

CREATE TABLE IF NOT EXISTS grade_levels (
  id SERIAL PRIMARY KEY,
  grade_name TEXT NOT NULL UNIQUE,               -- "Pre-K", "Kindergarten", "1st Grade", etc.
  grade_short TEXT NOT NULL UNIQUE,              -- "PK", "K", "1", "2", etc.
  grade_numeric INTEGER NOT NULL UNIQUE,         -- -1 for Pre-K, 0 for K, 1-12 for grades
  typical_age_start INTEGER NOT NULL,            -- Age at start of school year
  typical_age_end INTEGER NOT NULL               -- Age at end of school year
);

-- Seed grade level data
INSERT INTO grade_levels (grade_name, grade_short, grade_numeric, typical_age_start, typical_age_end) VALUES
  ('Pre-Kindergarten', 'PK', -1, 4, 5),
  ('Kindergarten', 'K', 0, 5, 6),
  ('1st Grade', '1', 1, 6, 7),
  ('2nd Grade', '2', 2, 7, 8),
  ('3rd Grade', '3', 3, 8, 9),
  ('4th Grade', '4', 4, 9, 10),
  ('5th Grade', '5', 5, 10, 11),
  ('6th Grade', '6', 6, 11, 12),
  ('7th Grade', '7', 7, 12, 13),
  ('8th Grade', '8', 8, 13, 14),
  ('9th Grade', '9', 9, 14, 15),
  ('10th Grade', '10', 10, 15, 16),
  ('11th Grade', '11', 11, 16, 17),
  ('12th Grade', '12', 12, 17, 18)
ON CONFLICT (grade_name) DO NOTHING;

-- ============================================================================
-- SECTION 9: REPORT SNAPSHOTS
-- ============================================================================
-- Stores finalized group reports for historical reference.

CREATE TABLE IF NOT EXISTS group_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Report Metadata
  report_type TEXT NOT NULL CHECK (report_type IN ('draft', 'final', 'amended')),
  version INTEGER NOT NULL DEFAULT 1,

  -- Snapshot Data (JSON for flexibility)
  groups_snapshot JSONB NOT NULL,                -- Full group data at time of report
  campers_snapshot JSONB NOT NULL,               -- Full camper data at time of report
  violations_snapshot JSONB,                     -- Any accepted violations
  stats_snapshot JSONB NOT NULL,                 -- Summary statistics

  -- Director Info
  generated_by UUID,
  generated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,

  -- Amendment tracking
  amends_report_id UUID REFERENCES group_report_snapshots(id),
  amendment_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_report_snapshots_camp ON group_report_snapshots(camp_id);

-- ============================================================================
-- SECTION 10: HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate age in years at a specific date
CREATE OR REPLACE FUNCTION calculate_age_at_date(dob DATE, target_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM age(target_date, dob))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate age in months at a specific date
CREATE OR REPLACE FUNCTION calculate_age_months_at_date(dob DATE, target_date DATE)
RETURNS INTEGER AS $$
DECLARE
  age_interval INTERVAL;
BEGIN
  age_interval := age(target_date, dob);
  RETURN (EXTRACT(YEAR FROM age_interval) * 12 + EXTRACT(MONTH FROM age_interval))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to compute expected grade from DOB (assumes Sept 1 school year cutoff)
CREATE OR REPLACE FUNCTION compute_grade_from_dob(dob DATE, camp_start DATE)
RETURNS INTEGER AS $$
DECLARE
  age_years INTEGER;
  school_year_start DATE;
  grade INTEGER;
BEGIN
  -- Determine the school year the camp falls in
  IF EXTRACT(MONTH FROM camp_start) >= 9 THEN
    school_year_start := DATE_TRUNC('year', camp_start) + INTERVAL '8 months';
  ELSE
    school_year_start := DATE_TRUNC('year', camp_start) - INTERVAL '4 months';
  END IF;

  -- Calculate age at start of school year
  age_years := calculate_age_at_date(dob, school_year_start);

  -- Map age to grade (5 -> K, 6 -> 1st, etc.)
  grade := age_years - 5;

  -- Clamp to valid range (-1 to 12)
  IF grade < -1 THEN grade := -1; END IF;
  IF grade > 12 THEN grade := 12; END IF;

  RETURN grade;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to parse grade string to numeric
CREATE OR REPLACE FUNCTION parse_grade_to_numeric(grade_str TEXT)
RETURNS INTEGER AS $$
DECLARE
  grade_lower TEXT;
BEGIN
  IF grade_str IS NULL OR grade_str = '' THEN
    RETURN NULL;
  END IF;

  grade_lower := LOWER(TRIM(grade_str));

  -- Handle various formats
  CASE
    WHEN grade_lower IN ('pre-k', 'prek', 'pre-kindergarten', 'pk') THEN RETURN -1;
    WHEN grade_lower IN ('kindergarten', 'k', 'kinder') THEN RETURN 0;
    WHEN grade_lower ~ '^[0-9]+' THEN
      -- Extract numeric part (handles "1st", "2nd", "3rd", "4th", etc.)
      RETURN REGEXP_REPLACE(grade_lower, '[^0-9]', '', 'g')::INTEGER;
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update camp group statistics
CREATE OR REPLACE FUNCTION update_camp_group_stats(group_id UUID)
RETURNS VOID AS $$
DECLARE
  group_rec RECORD;
  camp_rec RECORD;
  stats RECORD;
BEGIN
  -- Get the group and its camp
  SELECT cg.*, c.max_group_size, c.max_grade_spread
  INTO group_rec
  FROM camp_groups cg
  JOIN camps c ON c.id = cg.camp_id
  WHERE cg.id = group_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Calculate stats from assigned campers
  SELECT
    COUNT(*) as count,
    MIN(grade_validated) as min_grade,
    MAX(grade_validated) as max_grade,
    COALESCE(MAX(grade_validated) - MIN(grade_validated), 0) as spread
  INTO stats
  FROM camper_session_data
  WHERE assigned_group_id = group_id;

  -- Update the group
  UPDATE camp_groups SET
    camper_count = stats.count,
    min_grade = stats.min_grade,
    max_grade = stats.max_grade,
    grade_spread = stats.spread,
    size_violation = stats.count > group_rec.max_group_size,
    grade_violation = stats.spread > group_rec.max_grade_spread,
    has_hard_violations = (stats.count > group_rec.max_group_size) OR (stats.spread > group_rec.max_grade_spread),
    updated_at = now()
  WHERE id = group_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update group stats when campers are assigned
CREATE OR REPLACE FUNCTION trigger_update_group_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old group if changed
  IF OLD.assigned_group_id IS DISTINCT FROM NEW.assigned_group_id THEN
    IF OLD.assigned_group_id IS NOT NULL THEN
      PERFORM update_camp_group_stats(OLD.assigned_group_id);
    END IF;
    IF NEW.assigned_group_id IS NOT NULL THEN
      PERFORM update_camp_group_stats(NEW.assigned_group_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER camper_group_assignment_changed
  AFTER UPDATE OF assigned_group_id ON camper_session_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_group_stats();

-- ============================================================================
-- SECTION 11: VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Campers ready for grouping with all relevant data
CREATE OR REPLACE VIEW v_campers_for_grouping AS
SELECT
  csd.id,
  csd.camp_id,
  csd.tenant_id,
  csd.athlete_id,
  csd.registration_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name as full_name,
  a.date_of_birth,
  csd.age_at_camp_start,
  csd.age_months_at_camp_start,
  csd.grade_validated,
  gl.grade_name,
  gl.grade_short,
  csd.grade_discrepancy,
  csd.grade_discrepancy_resolved,
  csd.friend_requests,
  csd.friend_request_athlete_ids,
  csd.friend_group_id,
  fg.member_count as friend_group_size,
  fg.exceeds_grade_constraint as friend_group_grade_issue,
  csd.medical_notes,
  csd.allergies,
  csd.special_considerations,
  csd.leadership_potential,
  csd.assigned_group_id,
  cg.group_number as assigned_group_number,
  cg.group_name as assigned_group_name,
  csd.assignment_type,
  csd.is_late_registration,
  csd.registered_at
FROM camper_session_data csd
JOIN athletes a ON a.id = csd.athlete_id
LEFT JOIN grade_levels gl ON gl.grade_numeric = csd.grade_validated
LEFT JOIN friend_groups fg ON fg.id = csd.friend_group_id
LEFT JOIN camp_groups cg ON cg.id = csd.assigned_group_id;

-- View: Group summary for director dashboard
CREATE OR REPLACE VIEW v_group_summary AS
SELECT
  cg.id,
  cg.camp_id,
  cg.tenant_id,
  cg.group_number,
  cg.group_name,
  cg.group_color,
  cg.camper_count,
  cg.min_grade,
  cg.max_grade,
  cg.grade_spread,
  cg.size_violation,
  cg.grade_violation,
  cg.friend_violation,
  cg.has_warnings,
  cg.has_hard_violations,
  c.name as camp_name,
  c.start_date as camp_start_date,
  c.max_group_size,
  c.max_grade_spread,
  c.grouping_status
FROM camp_groups cg
JOIN camps c ON c.id = cg.camp_id
ORDER BY cg.camp_id, cg.group_number;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
