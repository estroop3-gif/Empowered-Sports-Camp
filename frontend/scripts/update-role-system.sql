-- ============================================================================
-- EMPOWERED SPORTS CAMP - ROLE SYSTEM UPDATE
-- ============================================================================
-- This migration updates the role system to the new 5-tier hierarchy:
-- parent < coach < director < licensee_owner < hq_admin
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE NEW ROLE ENUM TYPE
-- ============================================================================

-- Create the enum type (will be used going forward)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'parent',
      'coach',
      'director',
      'licensee_owner',
      'hq_admin'
    );
  END IF;
END$$;

-- ============================================================================
-- SECTION 2: UPDATE USER_ROLES TABLE
-- ============================================================================

-- First, migrate existing roles to new values
UPDATE user_roles SET role = 'hq_admin' WHERE role = 'superadmin';
UPDATE user_roles SET role = 'hq_admin' WHERE role = 'licensor';
UPDATE user_roles SET role = 'coach' WHERE role = 'licensee_staff';
-- parent and licensee_owner remain the same

-- Update the CHECK constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('parent', 'coach', 'director', 'licensee_owner', 'hq_admin'));

-- ============================================================================
-- SECTION 3: STAFF ASSIGNMENTS TABLE
-- ============================================================================
-- Links coaches/directors to specific camps they're assigned to

CREATE TABLE IF NOT EXISTS staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'director')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(user_id, camp_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_camp ON staff_assignments(camp_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_user ON staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_tenant ON staff_assignments(tenant_id);

-- ============================================================================
-- SECTION 4: HELPER FUNCTION FOR ROLE HIERARCHY
-- ============================================================================

CREATE OR REPLACE FUNCTION role_level(role_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE role_name
    WHEN 'parent' THEN 1
    WHEN 'coach' THEN 2
    WHEN 'director' THEN 3
    WHEN 'licensee_owner' THEN 4
    WHEN 'hq_admin' THEN 5
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if user has at least a certain role level
CREATE OR REPLACE FUNCTION has_role_or_higher(user_role TEXT, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN role_level(user_role) >= role_level(required_role);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- SECTION 5: RLS POLICIES FOR STAFF_ASSIGNMENTS
-- ============================================================================

ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;

-- HQ admins can see all assignments
CREATE POLICY "hq_admin_view_all_staff_assignments" ON staff_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'hq_admin'
    )
  );

-- Licensee owners can view assignments for their tenant
CREATE POLICY "licensee_owner_view_tenant_staff_assignments" ON staff_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = staff_assignments.tenant_id
      AND user_roles.role IN ('licensee_owner', 'director')
    )
  );

-- Directors can view their own and coach assignments for their camps
CREATE POLICY "director_view_camp_staff_assignments" ON staff_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_assignments sa
      WHERE sa.user_id = auth.uid()
      AND sa.camp_id = staff_assignments.camp_id
      AND sa.role = 'director'
    )
  );

-- Coaches can see their own assignment
CREATE POLICY "coach_view_own_assignment" ON staff_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- HQ and licensee_owner can manage assignments
CREATE POLICY "manage_staff_assignments" ON staff_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.role = 'hq_admin'
        OR (
          user_roles.role = 'licensee_owner'
          AND user_roles.tenant_id = staff_assignments.tenant_id
        )
      )
    )
  );

-- ============================================================================
-- SECTION 6: UPDATE CAMP RLS POLICIES
-- ============================================================================

-- Drop existing camp policies if they exist (ignore errors)
DROP POLICY IF EXISTS "view_camps" ON camps;
DROP POLICY IF EXISTS "manage_camps" ON camps;

-- Anyone authenticated can view published camps
CREATE POLICY "view_published_camps" ON camps
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.role = 'hq_admin'
        OR (
          user_roles.tenant_id = camps.tenant_id
          AND user_roles.role IN ('licensee_owner', 'director')
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM staff_assignments
      WHERE staff_assignments.user_id = auth.uid()
      AND staff_assignments.camp_id = camps.id
    )
  );

-- Directors and above can manage camps for their tenant
CREATE POLICY "manage_tenant_camps" ON camps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.role = 'hq_admin'
        OR (
          user_roles.tenant_id = camps.tenant_id
          AND user_roles.role IN ('licensee_owner', 'director')
        )
      )
    )
  );

-- ============================================================================
-- SECTION 7: UPDATE REGISTRATION RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "view_registrations" ON registrations;
DROP POLICY IF EXISTS "manage_registrations" ON registrations;

-- Parents can view their own registrations
CREATE POLICY "parent_view_own_registrations" ON registrations
  FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Staff can view registrations for camps they're assigned to
CREATE POLICY "staff_view_camp_registrations" ON registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_assignments
      WHERE staff_assignments.user_id = auth.uid()
      AND staff_assignments.camp_id = registrations.camp_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.role = 'hq_admin'
        OR (
          user_roles.tenant_id = registrations.tenant_id
          AND user_roles.role IN ('licensee_owner', 'director')
        )
      )
    )
  );

-- Parents can create registrations
CREATE POLICY "parent_create_registration" ON registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

-- Directors and above can manage registrations
CREATE POLICY "staff_manage_registrations" ON registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.role = 'hq_admin'
        OR (
          user_roles.tenant_id = registrations.tenant_id
          AND user_roles.role IN ('licensee_owner', 'director')
        )
      )
    )
  );

-- ============================================================================
-- SECTION 8: UPDATE GROUP_ASSIGNMENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "view_group_assignments" ON group_assignments;
DROP POLICY IF EXISTS "manage_group_assignments" ON group_assignments;

-- Coaches assigned to camp can view group assignments
CREATE POLICY "staff_view_group_assignments" ON group_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_assignments
      WHERE staff_assignments.user_id = auth.uid()
      AND staff_assignments.camp_id = group_assignments.camp_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.role = 'hq_admin'
        OR (
          user_roles.tenant_id = group_assignments.tenant_id
          AND user_roles.role IN ('licensee_owner', 'director')
        )
      )
    )
  );

-- Directors and above can manage group assignments
CREATE POLICY "director_manage_group_assignments" ON group_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND (
        user_roles.role = 'hq_admin'
        OR (
          user_roles.tenant_id = group_assignments.tenant_id
          AND user_roles.role IN ('licensee_owner', 'director')
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM staff_assignments
      WHERE staff_assignments.user_id = auth.uid()
      AND staff_assignments.camp_id = group_assignments.camp_id
      AND staff_assignments.role = 'director'
    )
  );

-- ============================================================================
-- SECTION 9: VIEW FOR ROLE ACCESS MATRIX
-- ============================================================================

CREATE OR REPLACE VIEW user_access_summary AS
SELECT
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  ur.role,
  ur.tenant_id,
  t.name as tenant_name,
  role_level(ur.role) as access_level,
  CASE ur.role
    WHEN 'hq_admin' THEN 'Full system access'
    WHEN 'licensee_owner' THEN 'Full tenant access'
    WHEN 'director' THEN 'Camp management access'
    WHEN 'coach' THEN 'Day-of camp access'
    WHEN 'parent' THEN 'Registration access only'
  END as access_description
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN tenants t ON t.id = ur.tenant_id
WHERE ur.is_active = true;

-- ============================================================================
-- SECTION 10: FUNCTION TO CHECK USER ACCESS
-- ============================================================================

-- Check if user can access a specific camp
CREATE OR REPLACE FUNCTION user_can_access_camp(
  p_user_id UUID,
  p_camp_id UUID,
  p_required_role TEXT DEFAULT 'coach'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_camp_tenant_id UUID;
  v_user_role TEXT;
  v_is_assigned BOOLEAN;
BEGIN
  -- Get camp tenant
  SELECT tenant_id INTO v_camp_tenant_id FROM camps WHERE id = p_camp_id;

  -- Check if user has HQ admin role
  SELECT role INTO v_user_role FROM user_roles
  WHERE user_id = p_user_id AND role = 'hq_admin' AND is_active = true;
  IF v_user_role = 'hq_admin' THEN RETURN true; END IF;

  -- Check if user has licensee_owner role for this tenant
  SELECT role INTO v_user_role FROM user_roles
  WHERE user_id = p_user_id AND tenant_id = v_camp_tenant_id
  AND role = 'licensee_owner' AND is_active = true;
  IF v_user_role IS NOT NULL THEN RETURN true; END IF;

  -- Check if user is assigned to this camp with required role
  SELECT true INTO v_is_assigned FROM staff_assignments
  WHERE user_id = p_user_id AND camp_id = p_camp_id AND is_active = true
  AND has_role_or_higher(role, p_required_role);

  RETURN COALESCE(v_is_assigned, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE
-- ============================================================================
-- Role system has been updated. Summary:
--
-- Roles (lowest to highest):
--   1. parent        - Can register athletes, view own registrations
--   2. coach         - Can view camp rosters, check in campers (day-of)
--   3. director      - Can manage camps, groups, and view all camp data
--   4. licensee_owner - Full access to their tenant's data
--   5. hq_admin      - Full system access across all tenants
--
-- New table: staff_assignments
--   - Links coaches/directors to specific camps
--   - Enables per-camp access control
--
-- Helper functions:
--   - role_level(role) - returns numeric level for comparison
--   - has_role_or_higher(role, required) - checks role hierarchy
--   - user_can_access_camp(user_id, camp_id, required_role) - camp access check
-- ============================================================================
