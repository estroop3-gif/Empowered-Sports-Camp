-- =====================================================
-- EMPOWERED ATHLETES - MULTI-TENANT SAAS ARCHITECTURE
-- =====================================================
-- Franchise/Licensee model with complete tenant isolation
-- Licensor (HQ) → Licensees → Staff → Parents/Athletes
-- =====================================================

-- =====================================================
-- USER ROLES ENUM
-- =====================================================
CREATE TYPE user_role AS ENUM (
  'licensor_admin',      -- HQ/Brand owner - sees everything
  'licensor_staff',      -- HQ support staff - limited HQ access
  'licensee_owner',      -- Franchise owner - full access to their tenant
  'licensee_admin',      -- Franchise admin - manages their tenant
  'licensee_coach',      -- Coach/staff - limited tenant access
  'parent'               -- Parent/guardian - sees only their data
);

-- =====================================================
-- TENANTS (LICENSEES/FRANCHISES) TABLE
-- =====================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
  legal_name VARCHAR(255),

  -- Territory
  territory_name VARCHAR(255) NOT NULL, -- "Chicagoland North", "Austin Metro"
  territory_description TEXT,
  territory_zip_codes TEXT[], -- Array of zip codes in territory
  territory_states TEXT[], -- States covered
  exclusive_territory BOOLEAN DEFAULT true,

  -- Contact
  primary_contact_name VARCHAR(200),
  primary_contact_email VARCHAR(255) NOT NULL,
  primary_contact_phone VARCHAR(20),

  -- Business address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),

  -- Branding (white-label options)
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#CCFF00', -- Can customize accent
  secondary_color VARCHAR(7) DEFAULT '#FF2DCE',
  custom_domain VARCHAR(255), -- Optional custom domain

  -- Financial
  license_fee_monthly INTEGER DEFAULT 0, -- In cents
  license_fee_annual INTEGER DEFAULT 0,
  revenue_share_percent DECIMAL(5,2) DEFAULT 10.00, -- HQ takes X%
  stripe_account_id VARCHAR(255), -- Stripe Connect account

  -- Contract
  contract_start_date DATE,
  contract_end_date DATE,
  contract_document_url TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  onboarding_completed BOOLEAN DEFAULT false,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Indexes for common queries
  CONSTRAINT valid_revenue_share CHECK (revenue_share_percent >= 0 AND revenue_share_percent <= 100)
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_territory ON tenants USING GIN(territory_zip_codes);

-- =====================================================
-- USER ROLES TABLE (Links users to tenants and roles)
-- =====================================================
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for licensor roles
  role user_role NOT NULL,

  -- Additional permissions (JSON for flexibility)
  permissions JSONB DEFAULT '{}',

  -- Status
  active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),

  -- A user can have one role per tenant (or one licensor role)
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- =====================================================
-- UPDATE EXISTING TABLES WITH TENANT_ID
-- =====================================================

-- Add tenant_id to locations
ALTER TABLE locations ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_locations_tenant ON locations(tenant_id);

-- Add tenant_id to camps
ALTER TABLE camps ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_camps_tenant ON camps(tenant_id);

-- Add tenant_id to profiles (parents belong to a tenant context)
ALTER TABLE profiles ADD COLUMN primary_tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_profiles_tenant ON profiles(primary_tenant_id);

-- Add tenant_id to athletes
ALTER TABLE athletes ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_athletes_tenant ON athletes(tenant_id);

-- Add tenant_id to registrations
ALTER TABLE registrations ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_registrations_tenant ON registrations(tenant_id);

-- Add tenant_id to payments
ALTER TABLE payments ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);

-- Add tenant_id to promo_codes (can be tenant-specific or global)
ALTER TABLE promo_codes ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE promo_codes ADD COLUMN is_global BOOLEAN DEFAULT false; -- Licensor can create global codes
CREATE INDEX idx_promo_codes_tenant ON promo_codes(tenant_id);

-- Add tenant_id to waitlist
ALTER TABLE waitlist ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_waitlist_tenant ON waitlist(tenant_id);

-- Add tenant_id to staff
ALTER TABLE staff ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_staff_tenant ON staff(tenant_id);

-- =====================================================
-- TENANT METRICS TABLE (Cached/aggregated for performance)
-- =====================================================
CREATE TABLE tenant_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),

  -- Registration metrics
  total_registrations INTEGER DEFAULT 0,
  new_registrations INTEGER DEFAULT 0,
  cancelled_registrations INTEGER DEFAULT 0,
  waitlist_count INTEGER DEFAULT 0,

  -- Revenue metrics (in cents)
  gross_revenue INTEGER DEFAULT 0,
  refunds INTEGER DEFAULT 0,
  net_revenue INTEGER DEFAULT 0,
  licensor_share INTEGER DEFAULT 0, -- Amount owed to HQ

  -- Capacity metrics
  total_capacity INTEGER DEFAULT 0,
  filled_capacity INTEGER DEFAULT 0,
  utilization_percent DECIMAL(5,2) DEFAULT 0,

  -- Camp metrics
  active_camps INTEGER DEFAULT 0,
  completed_camps INTEGER DEFAULT 0,

  -- Athlete metrics
  unique_athletes INTEGER DEFAULT 0,
  returning_athletes INTEGER DEFAULT 0,
  new_athletes INTEGER DEFAULT 0,

  -- Computed at
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, period_start, period_type)
);

CREATE INDEX idx_tenant_metrics_tenant ON tenant_metrics(tenant_id);
CREATE INDEX idx_tenant_metrics_period ON tenant_metrics(period_start, period_type);

-- =====================================================
-- GLOBAL METRICS TABLE (For licensor dashboard)
-- =====================================================
CREATE TABLE global_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),

  -- Tenant metrics
  active_tenants INTEGER DEFAULT 0,
  new_tenants INTEGER DEFAULT 0,

  -- Registration metrics
  total_registrations INTEGER DEFAULT 0,

  -- Revenue metrics (in cents)
  platform_gross_revenue INTEGER DEFAULT 0,
  licensor_revenue INTEGER DEFAULT 0, -- Revenue share collected

  -- Athlete metrics
  total_unique_athletes INTEGER DEFAULT 0,

  -- Computed at
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(period_start, period_type)
);

-- =====================================================
-- AUDIT LOG TABLE (For compliance and debugging)
-- =====================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  user_role user_role,

  -- What
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,

  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,

  -- When
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- IP for security
  ip_address INET
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant UUID;
BEGIN
  SELECT tenant_id INTO tenant
  FROM user_roles
  WHERE user_id = auth.uid()
    AND active = true
    AND tenant_id IS NOT NULL
  LIMIT 1;

  RETURN tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is licensor
CREATE OR REPLACE FUNCTION is_licensor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('licensor_admin', 'licensor_staff')
      AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a tenant
CREATE OR REPLACE FUNCTION has_tenant_access(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Licensors have access to all tenants
  IF is_licensor() THEN
    RETURN true;
  END IF;

  -- Check if user belongs to the tenant
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = check_tenant_id
      AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
  r user_role;
BEGIN
  SELECT role INTO r
  FROM user_roles
  WHERE user_id = auth.uid()
    AND active = true
  ORDER BY
    CASE role
      WHEN 'licensor_admin' THEN 1
      WHEN 'licensor_staff' THEN 2
      WHEN 'licensee_owner' THEN 3
      WHEN 'licensee_admin' THEN 4
      WHEN 'licensee_coach' THEN 5
      WHEN 'parent' THEN 6
    END
  LIMIT 1;

  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES (MULTI-TENANT)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- TENANTS: Licensors see all, licensees see only their own
CREATE POLICY "Licensors can view all tenants" ON tenants
  FOR SELECT USING (is_licensor());

CREATE POLICY "Licensees can view their own tenant" ON tenants
  FOR SELECT USING (has_tenant_access(id));

CREATE POLICY "Only licensor admins can insert tenants" ON tenants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'licensor_admin'
        AND active = true
    )
  );

CREATE POLICY "Only licensor admins can update tenants" ON tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'licensor_admin'
        AND active = true
    )
  );

-- USER_ROLES: Users see their own roles, licensors see all
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid() OR is_licensor());

CREATE POLICY "Licensee owners can manage their tenant roles" ON user_roles
  FOR ALL USING (
    -- User is a licensee owner/admin for this tenant
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = user_roles.tenant_id
        AND ur.role IN ('licensee_owner', 'licensee_admin')
        AND ur.active = true
    )
    -- Can't manage roles higher than their own
    AND user_roles.role NOT IN ('licensor_admin', 'licensor_staff', 'licensee_owner')
  );

CREATE POLICY "Licensor admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'licensor_admin'
        AND active = true
    )
  );

-- DROP existing policies on locations and recreate with tenant isolation
DROP POLICY IF EXISTS "Locations are viewable by everyone" ON locations;

CREATE POLICY "Locations viewable by tenant members or licensor" ON locations
  FOR SELECT USING (
    is_licensor()
    OR has_tenant_access(tenant_id)
    OR tenant_id IS NULL -- Global/template locations
  );

CREATE POLICY "Locations manageable by tenant admins" ON locations
  FOR ALL USING (
    is_licensor()
    OR (
      has_tenant_access(tenant_id)
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = locations.tenant_id
          AND role IN ('licensee_owner', 'licensee_admin')
          AND active = true
      )
    )
  );

-- DROP existing policies on camps and recreate with tenant isolation
DROP POLICY IF EXISTS "Active camps are viewable by everyone" ON camps;

CREATE POLICY "Active camps viewable publicly within tenant" ON camps
  FOR SELECT USING (
    active = true
    AND (
      is_licensor()
      OR has_tenant_access(tenant_id)
      OR tenant_id IS NULL
    )
  );

CREATE POLICY "Camps manageable by tenant admins" ON camps
  FOR ALL USING (
    is_licensor()
    OR (
      has_tenant_access(tenant_id)
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = camps.tenant_id
          AND role IN ('licensee_owner', 'licensee_admin', 'licensee_coach')
          AND active = true
      )
    )
  );

-- Update profiles policies for multi-tenant
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Tenant admins can view profiles in their tenant" ON profiles
  FOR SELECT USING (
    is_licensor()
    OR (
      has_tenant_access(primary_tenant_id)
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = profiles.primary_tenant_id
          AND role IN ('licensee_owner', 'licensee_admin', 'licensee_coach')
          AND active = true
      )
    )
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Update athletes policies for multi-tenant
DROP POLICY IF EXISTS "Parents can view their own athletes" ON athletes;
DROP POLICY IF EXISTS "Parents can insert their own athletes" ON athletes;
DROP POLICY IF EXISTS "Parents can update their own athletes" ON athletes;
DROP POLICY IF EXISTS "Parents can delete their own athletes" ON athletes;

CREATE POLICY "Parents can view own athletes" ON athletes
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Tenant staff can view athletes in their tenant" ON athletes
  FOR SELECT USING (
    is_licensor()
    OR (
      has_tenant_access(tenant_id)
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = athletes.tenant_id
          AND role IN ('licensee_owner', 'licensee_admin', 'licensee_coach')
          AND active = true
      )
    )
  );

CREATE POLICY "Parents can insert own athletes" ON athletes
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own athletes" ON athletes
  FOR UPDATE USING (auth.uid() = parent_id);

-- Update registrations policies for multi-tenant
DROP POLICY IF EXISTS "Parents can view their own registrations" ON registrations;
DROP POLICY IF EXISTS "Parents can create registrations for their athletes" ON registrations;

CREATE POLICY "Parents can view own registrations" ON registrations
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Tenant staff can view registrations in their tenant" ON registrations
  FOR SELECT USING (
    is_licensor()
    OR (
      has_tenant_access(tenant_id)
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = registrations.tenant_id
          AND role IN ('licensee_owner', 'licensee_admin', 'licensee_coach')
          AND active = true
      )
    )
  );

CREATE POLICY "Parents can create registrations" ON registrations
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Tenant admins can manage registrations" ON registrations
  FOR UPDATE USING (
    is_licensor()
    OR (
      has_tenant_access(tenant_id)
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = registrations.tenant_id
          AND role IN ('licensee_owner', 'licensee_admin')
          AND active = true
      )
    )
  );

-- Update payments policies for multi-tenant
DROP POLICY IF EXISTS "Parents can view their own payments" ON payments;

CREATE POLICY "Parents can view own payments" ON payments
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Tenant admins can view payments in their tenant" ON payments
  FOR SELECT USING (
    is_licensor()
    OR (
      has_tenant_access(tenant_id)
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = payments.tenant_id
          AND role IN ('licensee_owner', 'licensee_admin')
          AND active = true
      )
    )
  );

-- TENANT_METRICS: Licensors see all, licensees see their own
CREATE POLICY "Licensors can view all tenant metrics" ON tenant_metrics
  FOR SELECT USING (is_licensor());

CREATE POLICY "Licensees can view their own metrics" ON tenant_metrics
  FOR SELECT USING (has_tenant_access(tenant_id));

-- GLOBAL_METRICS: Only licensors
CREATE POLICY "Only licensors can view global metrics" ON global_metrics
  FOR SELECT USING (is_licensor());

-- AUDIT_LOG: Licensors see all, licensees see their tenant
CREATE POLICY "Licensors can view all audit logs" ON audit_log
  FOR SELECT USING (is_licensor());

CREATE POLICY "Licensees can view their tenant audit logs" ON audit_log
  FOR SELECT USING (has_tenant_access(tenant_id));

-- =====================================================
-- TRIGGERS FOR TENANT CONTEXT
-- =====================================================

-- Auto-set tenant_id on registration insert based on camp
CREATE OR REPLACE FUNCTION set_registration_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM camps WHERE id = NEW.camp_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_registration_tenant_trigger
  BEFORE INSERT ON registrations
  FOR EACH ROW EXECUTE FUNCTION set_registration_tenant();

-- Auto-set tenant_id on payment insert based on registration
CREATE OR REPLACE FUNCTION set_payment_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.registration_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM registrations WHERE id = NEW.registration_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payment_tenant_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION set_payment_tenant();

-- Audit log trigger function
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    tenant_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_tenants AFTER INSERT OR UPDATE OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_registrations AFTER INSERT OR UPDATE OR DELETE ON registrations
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- =====================================================
-- SEED DATA FOR MULTI-TENANT
-- =====================================================

-- Create the licensor tenant (HQ) - this is a special system tenant
INSERT INTO tenants (
  id,
  name,
  slug,
  legal_name,
  territory_name,
  primary_contact_email,
  status,
  onboarding_completed
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Empowered Athletes HQ',
  'hq',
  'Empowered Athletes LLC',
  'Global',
  'admin@empoweredathletes.com',
  'active',
  true
);

-- Create sample licensee tenants
INSERT INTO tenants (
  name,
  slug,
  legal_name,
  territory_name,
  territory_description,
  territory_zip_codes,
  territory_states,
  primary_contact_email,
  city,
  state,
  revenue_share_percent,
  status,
  onboarding_completed
) VALUES
(
  'Empowered Athletes Chicago North',
  'chicago-north',
  'Chicago North Sports LLC',
  'Chicagoland North',
  'Northern Chicago suburbs including Evanston, Skokie, Wilmette, and surrounding areas',
  ARRAY['60201', '60202', '60203', '60076', '60077', '60091', '60093'],
  ARRAY['IL'],
  'chicago-north@empoweredathletes.com',
  'Evanston',
  'IL',
  10.00,
  'active',
  true
),
(
  'Empowered Athletes Chicago West',
  'chicago-west',
  'West Suburbs Athletics Inc',
  'Chicagoland West',
  'Western Chicago suburbs including Oak Park, Naperville, and Aurora',
  ARRAY['60302', '60303', '60304', '60540', '60563', '60564', '60505'],
  ARRAY['IL'],
  'chicago-west@empoweredathletes.com',
  'Oak Park',
  'IL',
  10.00,
  'active',
  true
),
(
  'Empowered Athletes Austin',
  'austin',
  'Austin Youth Sports LLC',
  'Austin Metro',
  'Greater Austin area including Round Rock, Cedar Park, and Georgetown',
  ARRAY['78701', '78702', '78703', '78704', '78681', '78613', '78626'],
  ARRAY['TX'],
  'austin@empoweredathletes.com',
  'Austin',
  'TX',
  12.00,
  'active',
  false
);

-- Update existing locations to belong to Chicago North tenant
UPDATE locations
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'chicago-north')
WHERE city IN ('Chicago', 'Evanston');

UPDATE locations
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'chicago-west')
WHERE city IN ('Oak Park', 'Naperville', 'Schaumburg');

-- Update existing camps to belong to appropriate tenants
UPDATE camps
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'chicago-north')
WHERE slug LIKE '%lincoln-park%' OR slug LIKE '%evanston%';

UPDATE camps
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'chicago-west')
WHERE slug LIKE '%oak-park%' OR slug LIKE '%naperville%' OR slug LIKE '%schaumburg%';
