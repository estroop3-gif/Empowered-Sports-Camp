-- ============================================================================
-- EMPOWERED SPORTS CAMP - COMPLETE DATABASE SETUP
-- ============================================================================
-- Run this in Supabase SQL Editor after restoring your project
-- This creates all tables, functions, triggers, and RLS policies
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================

-- TENANTS (Licensees)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#CCFF00',
  secondary_color TEXT DEFAULT '#FF2DCE',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  license_status TEXT DEFAULT 'active' CHECK (license_status IN ('active', 'suspended', 'terminated')),
  license_start_date DATE,
  license_end_date DATE,
  royalty_rate DECIMAL(5,4) DEFAULT 0.08,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- LOCATIONS (Camp Sites)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  indoor_outdoor TEXT CHECK (indoor_outdoor IN ('indoor', 'outdoor', 'both')),
  capacity INTEGER,
  amenities TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CAMPS (Sessions)
CREATE TABLE IF NOT EXISTS camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  min_age INTEGER DEFAULT 5,
  max_age INTEGER DEFAULT 14,
  capacity INTEGER DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 0,
  early_bird_price_cents INTEGER,
  early_bird_deadline DATE,
  registration_open DATE,
  registration_close DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled')),

  -- Grouping Configuration
  grouping_status TEXT DEFAULT 'pending' CHECK (grouping_status IN ('pending', 'auto_grouped', 'reviewed', 'finalized')),
  grouping_run_at TIMESTAMPTZ,
  grouping_finalized_at TIMESTAMPTZ,
  grouping_finalized_by UUID,
  max_group_size INTEGER DEFAULT 12,
  num_groups INTEGER DEFAULT 5,
  max_grade_spread INTEGER DEFAULT 2,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, slug)
);

-- PROFILES (User Accounts)
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

-- USER ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'licensor', 'licensee_owner', 'licensee_staff', 'parent')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, tenant_id, role)
);

-- ATHLETES (Campers)
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

-- REGISTRATIONS
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Pricing
  base_price_cents INTEGER NOT NULL,
  discount_cents INTEGER DEFAULT 0,
  addons_total_cents INTEGER DEFAULT 0,
  total_price_cents INTEGER NOT NULL,

  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'failed')),
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,

  -- Registration Details
  friend_requests TEXT[],
  special_considerations TEXT,
  shirt_size TEXT,

  -- Promo Code
  promo_code_id UUID,
  promo_discount_cents INTEGER DEFAULT 0,

  -- Waiver
  waiver_signed BOOLEAN DEFAULT false,
  waiver_signed_at TIMESTAMPTZ,
  waiver_signed_by TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'waitlisted', 'cancelled', 'refunded')),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(camp_id, athlete_id)
);

-- PROMO CODES
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_purchase_cents INTEGER,
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, code)
);

-- ADDONS
CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  camp_id UUID REFERENCES camps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  max_quantity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ADDON VARIANTS (e.g., shirt sizes)
CREATE TABLE IF NOT EXISTS addon_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment_cents INTEGER DEFAULT 0,
  inventory INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- REGISTRATION ADDONS
CREATE TABLE IF NOT EXISTS registration_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES addon_variants(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 3: GROUPING ENGINE TABLES
-- ============================================================================

-- CAMPER SESSION DATA (Standardized for grouping)
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

-- FRIEND GROUPS (Clusters)
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

-- CAMP GROUPS (The Five Groups)
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

-- GROUP ASSIGNMENTS (Audit Trail)
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

-- GROUPING RUNS (Algorithm Execution Log)
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

-- CONSTRAINT VIOLATIONS LOG
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

-- GRADE LEVELS REFERENCE
CREATE TABLE IF NOT EXISTS grade_levels (
  id SERIAL PRIMARY KEY,
  grade_name TEXT NOT NULL UNIQUE,
  grade_short TEXT NOT NULL UNIQUE,
  grade_numeric INTEGER NOT NULL UNIQUE,
  typical_age_start INTEGER NOT NULL,
  typical_age_end INTEGER NOT NULL
);

-- GROUP REPORT SNAPSHOTS
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
-- SECTION 4: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_camps_tenant ON camps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_camps_dates ON camps(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_camps_status ON camps(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_athletes_parent ON athletes(parent_id);
CREATE INDEX IF NOT EXISTS idx_registrations_camp ON registrations(camp_id);
CREATE INDEX IF NOT EXISTS idx_registrations_athlete ON registrations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_registrations_parent ON registrations(parent_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- Grouping indexes
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

-- ============================================================================
-- SECTION 5: SEED DATA
-- ============================================================================

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
-- SECTION 6: HELPER FUNCTIONS
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 7: TRIGGERS
-- ============================================================================

-- Create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-update timestamps
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_camps_updated_at ON camps;
CREATE TRIGGER update_camps_updated_at
  BEFORE UPDATE ON camps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_athletes_updated_at ON athletes;
CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grouping stats trigger
DROP TRIGGER IF EXISTS camper_group_assignment_changed ON camper_session_data;
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

CREATE TRIGGER camper_group_assignment_changed
  AFTER UPDATE OF assigned_group_id ON camper_session_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_group_stats();

-- ============================================================================
-- SECTION 8: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE camper_session_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grouping_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_report_snapshots ENABLE ROW LEVEL SECURITY;

-- TENANTS policies
CREATE POLICY "Tenants are publicly viewable"
  ON tenants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can view tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

-- LOCATIONS policies
CREATE POLICY "Locations are publicly viewable"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "Licensees can manage their locations"
  ON locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = locations.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

-- CAMPS policies
CREATE POLICY "Published camps are publicly viewable"
  ON camps FOR SELECT
  USING (status != 'draft');

CREATE POLICY "Licensees can manage their camps"
  ON camps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = camps.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- USER_ROLES policies
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ATHLETES policies
CREATE POLICY "Parents can view own athletes"
  ON athletes FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can manage own athletes"
  ON athletes FOR ALL
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Licensees can view their registered athletes"
  ON athletes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM registrations r
      JOIN user_roles ur ON ur.tenant_id = r.tenant_id
      WHERE r.athlete_id = athletes.id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('licensee_owner', 'licensee_staff')
    )
  );

-- REGISTRATIONS policies
CREATE POLICY "Parents can view own registrations"
  ON registrations FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can create registrations"
  ON registrations FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Licensees can manage their registrations"
  ON registrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = registrations.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

-- PROMO_CODES policies
CREATE POLICY "Promo codes viewable by tenant staff"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = promo_codes.tenant_id
    )
  );

-- ADDONS policies
CREATE POLICY "Addons are publicly viewable"
  ON addons FOR SELECT
  USING (is_active = true);

-- ADDON_VARIANTS policies
CREATE POLICY "Variants are publicly viewable"
  ON addon_variants FOR SELECT
  USING (is_active = true);

-- REGISTRATION_ADDONS policies
CREATE POLICY "Users can view own registration addons"
  ON registration_addons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM registrations
      WHERE id = registration_addons.registration_id
      AND parent_id = auth.uid()
    )
  );

-- GROUPING tables policies (licensee staff access)
CREATE POLICY "Licensees can manage camper session data"
  ON camper_session_data FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = camper_session_data.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

CREATE POLICY "Licensees can manage friend groups"
  ON friend_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = friend_groups.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

CREATE POLICY "Licensees can manage camp groups"
  ON camp_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = camp_groups.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

CREATE POLICY "Licensees can view group assignments"
  ON group_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = group_assignments.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

CREATE POLICY "Licensees can view grouping runs"
  ON grouping_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = grouping_runs.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

CREATE POLICY "Licensees can manage constraint violations"
  ON constraint_violations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = constraint_violations.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

CREATE POLICY "Licensees can manage report snapshots"
  ON group_report_snapshots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = group_report_snapshots.tenant_id
      AND role IN ('licensee_owner', 'licensee_staff')
    )
  );

-- ============================================================================
-- SECTION 9: VIEWS
-- ============================================================================

-- Campers ready for grouping
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

-- Group summary for dashboard
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
-- SETUP COMPLETE
-- ============================================================================
-- Your database is now ready for Empowered Sports Camp!
--
-- Next steps:
-- 1. Create a test tenant in the tenants table
-- 2. Create a test user and assign them a role
-- 3. Set NEXT_PUBLIC_USE_MOCK=false in .env.local
-- 4. Restart your development server
-- ============================================================================
