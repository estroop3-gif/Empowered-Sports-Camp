-- ============================================================================
-- EMPOWERED SPORTS CAMP - ADD GROUPING ENGINE TABLES
-- ============================================================================
-- Run this in Supabase SQL Editor to add grouping functionality
-- Your existing tenants, camps, and locations data will be preserved
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD GROUPING COLUMNS TO CAMPS TABLE
-- ============================================================================

ALTER TABLE camps ADD COLUMN IF NOT EXISTS grouping_status TEXT DEFAULT 'pending'
  CHECK (grouping_status IN ('pending', 'auto_grouped', 'reviewed', 'finalized'));
ALTER TABLE camps ADD COLUMN IF NOT EXISTS grouping_run_at TIMESTAMPTZ;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS grouping_finalized_at TIMESTAMPTZ;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS grouping_finalized_by UUID;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS max_group_size INTEGER DEFAULT 12;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS num_groups INTEGER DEFAULT 5;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS max_grade_spread INTEGER DEFAULT 2;

-- ============================================================================
-- SECTION 2: PROFILES TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 3: USER ROLES TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'licensor', 'licensee_owner', 'licensee_staff', 'parent')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);

-- ============================================================================
-- SECTION 4: ATHLETES TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  grade TEXT,
  school TEXT,
  medical_notes TEXT,
  allergies TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 5: REGISTRATIONS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  addons_total_cents INTEGER DEFAULT 0,
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'failed')),
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  friend_requests TEXT[],
  special_considerations TEXT,
  shirt_size TEXT,
  waiver_signed BOOLEAN DEFAULT false,
  waiver_signed_at TIMESTAMPTZ,
  waiver_signed_by TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'waitlisted', 'cancelled', 'refunded')),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(camp_id, athlete_id)
);

-- ============================================================================
-- SECTION 6: GRADE LEVELS REFERENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS grade_levels (
  id SERIAL PRIMARY KEY,
  grade_name TEXT NOT NULL UNIQUE,
  grade_short TEXT NOT NULL UNIQUE,
  grade_numeric INTEGER NOT NULL UNIQUE,
  typical_age_start INTEGER NOT NULL,
  typical_age_end INTEGER NOT NULL
);

-- Seed grade levels
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
  ('8th Grade', '8', 8, 13, 14)
ON CONFLICT (grade_name) DO NOTHING;

-- ============================================================================
-- SECTION 7: CAMPER SESSION DATA (Standardized for grouping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS camper_session_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Standardized Demographics
  age_at_camp_start INTEGER NOT NULL,
  age_months_at_camp_start INTEGER NOT NULL,
  grade_from_registration TEXT,
  grade_validated INTEGER,
  grade_computed_from_dob INTEGER,
  grade_discrepancy BOOLEAN DEFAULT false,
  grade_discrepancy_resolved BOOLEAN DEFAULT false,
  grade_discrepancy_resolution TEXT,

  -- Friend Requests
  friend_requests TEXT[],
  friend_request_athlete_ids UUID[],
  friend_group_id UUID,

  -- Special Considerations
  medical_notes TEXT,
  allergies TEXT,
  special_considerations TEXT,
  leadership_potential BOOLEAN DEFAULT false,
  leadership_notes TEXT,

  -- Registration Timing
  registered_at TIMESTAMPTZ NOT NULL,
  is_late_registration BOOLEAN DEFAULT false,

  -- Grouping Result
  assigned_group_id UUID,
  assignment_type TEXT CHECK (assignment_type IN ('auto', 'manual', 'override')),
  assignment_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(registration_id),
  UNIQUE(camp_id, athlete_id)
);

-- ============================================================================
-- SECTION 8: FRIEND GROUPS (Clusters)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_number INTEGER NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  min_grade INTEGER,
  max_grade INTEGER,
  grade_spread INTEGER,
  exceeds_grade_constraint BOOLEAN DEFAULT false,
  exceeds_size_constraint BOOLEAN DEFAULT false,
  can_be_placed_intact BOOLEAN DEFAULT true,
  placement_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(camp_id, group_number)
);

-- ============================================================================
-- SECTION 9: CAMP GROUPS (The Five Groups campers are assigned to)
-- ============================================================================

CREATE TABLE IF NOT EXISTS camp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_number INTEGER NOT NULL CHECK (group_number BETWEEN 1 AND 10),
  group_name TEXT,
  group_color TEXT,
  camper_count INTEGER DEFAULT 0,
  min_grade INTEGER,
  max_grade INTEGER,
  grade_spread INTEGER DEFAULT 0,
  size_violation BOOLEAN DEFAULT false,
  grade_violation BOOLEAN DEFAULT false,
  friend_violation BOOLEAN DEFAULT false,
  has_warnings BOOLEAN DEFAULT false,
  has_hard_violations BOOLEAN DEFAULT false,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(camp_id, group_number)
);

-- ============================================================================
-- SECTION 10: GROUP ASSIGNMENTS (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_session_id UUID NOT NULL REFERENCES camper_session_data(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_group_id UUID REFERENCES camp_groups(id),
  to_group_id UUID NOT NULL REFERENCES camp_groups(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('auto', 'manual', 'override')),
  reason TEXT,
  caused_size_violation BOOLEAN DEFAULT false,
  caused_grade_violation BOOLEAN DEFAULT false,
  caused_friend_violation BOOLEAN DEFAULT false,
  override_acknowledged BOOLEAN DEFAULT false,
  override_note TEXT,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 11: GROUPING RUNS (Algorithm Execution Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS grouping_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('initial', 'rerun', 'incremental')),
  triggered_by UUID,
  trigger_reason TEXT,
  total_campers INTEGER NOT NULL,
  total_friend_groups INTEGER,
  late_registrations INTEGER DEFAULT 0,
  grade_discrepancies INTEGER DEFAULT 0,
  max_group_size INTEGER NOT NULL,
  num_groups INTEGER NOT NULL,
  max_grade_spread INTEGER NOT NULL,
  algorithm_version TEXT DEFAULT '1.0',
  execution_time_ms INTEGER,
  campers_auto_placed INTEGER DEFAULT 0,
  friend_groups_placed_intact INTEGER DEFAULT 0,
  friend_groups_split INTEGER DEFAULT 0,
  constraint_violations INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  warnings TEXT[],
  preserved_manual_overrides BOOLEAN DEFAULT true,
  overrides_preserved_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 12: CONSTRAINT VIOLATIONS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS constraint_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grouping_run_id UUID REFERENCES grouping_runs(id) ON DELETE SET NULL,
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'size_exceeded', 'grade_spread_exceeded', 'friend_group_split',
    'friend_group_too_large', 'impossible_placement', 'grade_discrepancy'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'hard')),
  affected_group_id UUID REFERENCES camp_groups(id),
  affected_camper_ids UUID[],
  affected_friend_group_id UUID REFERENCES friend_groups(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_resolution TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT CHECK (resolution_type IN ('auto_fixed', 'manual_override', 'accepted', 'dismissed')),
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 13: GROUP REPORT SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('draft', 'final', 'amended')),
  version INTEGER NOT NULL DEFAULT 1,
  groups_snapshot JSONB NOT NULL,
  campers_snapshot JSONB NOT NULL,
  violations_snapshot JSONB,
  stats_snapshot JSONB NOT NULL,
  generated_by UUID,
  generated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  amends_report_id UUID REFERENCES group_report_snapshots(id),
  amendment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 14: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_camper_session_camp ON camper_session_data(camp_id);
CREATE INDEX IF NOT EXISTS idx_camper_session_tenant ON camper_session_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_camper_session_grade ON camper_session_data(camp_id, grade_validated);
CREATE INDEX IF NOT EXISTS idx_camper_session_friend_group ON camper_session_data(friend_group_id);
CREATE INDEX IF NOT EXISTS idx_camper_session_assigned_group ON camper_session_data(assigned_group_id);
CREATE INDEX IF NOT EXISTS idx_friend_groups_camp ON friend_groups(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_groups_camp ON camp_groups(camp_id);
CREATE INDEX IF NOT EXISTS idx_group_assignments_camp ON group_assignments(camp_id);
CREATE INDEX IF NOT EXISTS idx_group_assignments_camper ON group_assignments(camper_session_id);
CREATE INDEX IF NOT EXISTS idx_grouping_runs_camp ON grouping_runs(camp_id);
CREATE INDEX IF NOT EXISTS idx_violations_camp ON constraint_violations(camp_id);
CREATE INDEX IF NOT EXISTS idx_violations_unresolved ON constraint_violations(camp_id, resolved) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_report_snapshots_camp ON group_report_snapshots(camp_id);
CREATE INDEX IF NOT EXISTS idx_athletes_parent ON athletes(parent_id);
CREATE INDEX IF NOT EXISTS idx_registrations_camp ON registrations(camp_id);
CREATE INDEX IF NOT EXISTS idx_registrations_athlete ON registrations(athlete_id);

-- ============================================================================
-- SECTION 15: HELPER FUNCTIONS
-- ============================================================================

-- Calculate age in years at a specific date
CREATE OR REPLACE FUNCTION calculate_age_at_date(dob DATE, target_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM age(target_date, dob))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate age in months at a specific date
CREATE OR REPLACE FUNCTION calculate_age_months_at_date(dob DATE, target_date DATE)
RETURNS INTEGER AS $$
DECLARE
  age_interval INTERVAL;
BEGIN
  age_interval := age(target_date, dob);
  RETURN (EXTRACT(YEAR FROM age_interval) * 12 + EXTRACT(MONTH FROM age_interval))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Compute expected grade from DOB (Sept 1 cutoff)
CREATE OR REPLACE FUNCTION compute_grade_from_dob(dob DATE, camp_start DATE)
RETURNS INTEGER AS $$
DECLARE
  age_years INTEGER;
  school_year_start DATE;
  grade INTEGER;
BEGIN
  IF EXTRACT(MONTH FROM camp_start) >= 9 THEN
    school_year_start := DATE_TRUNC('year', camp_start) + INTERVAL '8 months';
  ELSE
    school_year_start := DATE_TRUNC('year', camp_start) - INTERVAL '4 months';
  END IF;
  age_years := calculate_age_at_date(dob, school_year_start);
  grade := age_years - 5;
  IF grade < -1 THEN grade := -1; END IF;
  IF grade > 12 THEN grade := 12; END IF;
  RETURN grade;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Parse grade string to numeric
CREATE OR REPLACE FUNCTION parse_grade_to_numeric(grade_str TEXT)
RETURNS INTEGER AS $$
DECLARE
  grade_lower TEXT;
BEGIN
  IF grade_str IS NULL OR grade_str = '' THEN
    RETURN NULL;
  END IF;
  grade_lower := LOWER(TRIM(grade_str));
  CASE
    WHEN grade_lower IN ('pre-k', 'prek', 'pre-kindergarten', 'pk') THEN RETURN -1;
    WHEN grade_lower IN ('kindergarten', 'k', 'kinder') THEN RETURN 0;
    WHEN grade_lower ~ '^[0-9]+' THEN
      RETURN REGEXP_REPLACE(grade_lower, '[^0-9]', '', 'g')::INTEGER;
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update camp group statistics
CREATE OR REPLACE FUNCTION update_camp_group_stats(group_id UUID)
RETURNS VOID AS $$
DECLARE
  group_rec RECORD;
  stats RECORD;
BEGIN
  SELECT cg.*, c.max_group_size, c.max_grade_spread
  INTO group_rec
  FROM camp_groups cg
  JOIN camps c ON c.id = cg.camp_id
  WHERE cg.id = group_id;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT
    COUNT(*) as count,
    MIN(grade_validated) as min_grade,
    MAX(grade_validated) as max_grade,
    COALESCE(MAX(grade_validated) - MIN(grade_validated), 0) as spread
  INTO stats
  FROM camper_session_data
  WHERE assigned_group_id = group_id;

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

-- ============================================================================
-- SECTION 16: TRIGGERS
-- ============================================================================

-- Handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grouping stats trigger
CREATE OR REPLACE FUNCTION trigger_update_group_stats()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS camper_group_assignment_changed ON camper_session_data;
CREATE TRIGGER camper_group_assignment_changed
  AFTER UPDATE OF assigned_group_id ON camper_session_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_group_stats();

-- ============================================================================
-- SECTION 17: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE camper_session_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grouping_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_report_snapshots ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- USER_ROLES policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ATHLETES policies
DROP POLICY IF EXISTS "Parents can view own athletes" ON athletes;
CREATE POLICY "Parents can view own athletes"
  ON athletes FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "Parents can manage own athletes" ON athletes;
CREATE POLICY "Parents can manage own athletes"
  ON athletes FOR ALL
  TO authenticated
  USING (parent_id = auth.uid());

-- REGISTRATIONS policies
DROP POLICY IF EXISTS "Parents can view own registrations" ON registrations;
CREATE POLICY "Parents can view own registrations"
  ON registrations FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "Parents can create registrations" ON registrations;
CREATE POLICY "Parents can create registrations"
  ON registrations FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

-- GROUPING tables - allow authenticated users for now (can tighten later)
DROP POLICY IF EXISTS "Authenticated users can view camp groups" ON camp_groups;
CREATE POLICY "Authenticated users can view camp groups"
  ON camp_groups FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage camp groups" ON camp_groups;
CREATE POLICY "Authenticated users can manage camp groups"
  ON camp_groups FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view camper session data" ON camper_session_data;
CREATE POLICY "Authenticated users can view camper session data"
  ON camper_session_data FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage camper session data" ON camper_session_data;
CREATE POLICY "Authenticated users can manage camper session data"
  ON camper_session_data FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view friend groups" ON friend_groups;
CREATE POLICY "Authenticated users can view friend groups"
  ON friend_groups FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage friend groups" ON friend_groups;
CREATE POLICY "Authenticated users can manage friend groups"
  ON friend_groups FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view group assignments" ON group_assignments;
CREATE POLICY "Authenticated users can view group assignments"
  ON group_assignments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view grouping runs" ON grouping_runs;
CREATE POLICY "Authenticated users can view grouping runs"
  ON grouping_runs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view constraint violations" ON constraint_violations;
CREATE POLICY "Authenticated users can view constraint violations"
  ON constraint_violations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage constraint violations" ON constraint_violations;
CREATE POLICY "Authenticated users can manage constraint violations"
  ON constraint_violations FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view report snapshots" ON group_report_snapshots;
CREATE POLICY "Authenticated users can view report snapshots"
  ON group_report_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- SECTION 18: INITIALIZE 5 GROUPS FOR EXISTING CAMP
-- ============================================================================

-- Create the 5 default groups for the Summer Basketball Camp
INSERT INTO camp_groups (camp_id, tenant_id, group_number, group_name, group_color, display_order)
SELECT
  'f4d9eeca-3848-497d-8c73-8fab64338758'::UUID,
  'df737c3b-d4ba-4bc9-9baf-da43f040878c'::UUID,
  gs.n,
  'Group ' || gs.n,
  CASE gs.n
    WHEN 1 THEN '#CCFF00'  -- Neon Green
    WHEN 2 THEN '#FF2DCE'  -- Hot Magenta
    WHEN 3 THEN '#6F00D8'  -- Electric Purple
    WHEN 4 THEN '#22C55E'  -- Success Green
    WHEN 5 THEN '#F59E0B'  -- Warning Orange
  END,
  gs.n
FROM generate_series(1, 5) AS gs(n)
ON CONFLICT (camp_id, group_number) DO NOTHING;

-- ============================================================================
-- DONE! Your grouping engine tables are now ready.
-- ============================================================================
