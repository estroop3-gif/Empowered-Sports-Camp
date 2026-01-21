-- ============================================================================
-- EMPOWERED SPORTS CAMP - FIND CAMPS FEATURE SUPPORT
-- ============================================================================
-- NOTE: This is a reference schema file. Use Prisma migrations for actual DB changes.
-- Adds: status workflow, grade ranges, public camp view, RLS for public access
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD STATUS FIELD TO CAMPS
-- ============================================================================
-- Status workflow: draft -> published -> open -> closed
-- draft: Camp being created, not visible publicly
-- published: Visible publicly but registration not yet open
-- open: Registration is open, can accept registrations
-- closed: Registration closed (either full or manually closed)

ALTER TABLE camps ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'open', 'closed'));

-- Migrate existing data based on current boolean fields
UPDATE camps SET status =
  CASE
    WHEN active = false THEN 'draft'
    WHEN registration_open = false THEN 'closed'
    ELSE 'open'
  END
WHERE status IS NULL OR status = 'draft';

-- Add published_at timestamp to track when camp went public
ALTER TABLE camps ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Set published_at for existing active camps
UPDATE camps SET published_at = created_at
WHERE status IN ('published', 'open', 'closed') AND published_at IS NULL;

-- ============================================================================
-- SECTION 2: ADD GRADE RANGE SUPPORT
-- ============================================================================
-- Some camps filter by grade instead of (or in addition to) age

ALTER TABLE camps ADD COLUMN IF NOT EXISTS min_grade INTEGER;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS max_grade INTEGER;

-- Constraint: grade range must be valid (-1 = Pre-K, 0 = K, 1-12 = grades)
ALTER TABLE camps DROP CONSTRAINT IF EXISTS camps_grade_range_check;
ALTER TABLE camps ADD CONSTRAINT camps_grade_range_check
  CHECK (
    (min_grade IS NULL AND max_grade IS NULL) OR
    (min_grade >= -1 AND max_grade <= 12 AND min_grade <= max_grade)
  );

-- ============================================================================
-- SECTION 3: ADD COMPUTED SPOTS REMAINING
-- ============================================================================
-- Function to calculate spots remaining for a camp

CREATE OR REPLACE FUNCTION get_camp_spots_remaining(camp_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_capacity INTEGER;
  confirmed_count INTEGER;
BEGIN
  SELECT max_capacity INTO total_capacity
  FROM camps WHERE id = camp_uuid;

  IF total_capacity IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO confirmed_count
  FROM registrations
  WHERE camp_id = camp_uuid
    AND status IN ('confirmed', 'pending');

  RETURN GREATEST(0, total_capacity - confirmed_count);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SECTION 4: PUBLIC CAMP CARDS VIEW
-- ============================================================================
-- This view is used by the Find Camps page to display available camps

DROP VIEW IF EXISTS public_camp_cards;
CREATE VIEW public_camp_cards AS
SELECT
  c.id,
  c.slug,
  c.name,
  c.description,
  c.program_type::TEXT as program_type,
  c.start_date,
  c.end_date,
  c.daily_start_time,
  c.daily_end_time,
  c.min_age,
  c.max_age,
  c.min_grade,
  c.max_grade,
  c.max_capacity,
  c.price,
  c.early_bird_price,
  c.early_bird_deadline,
  c.image_url,
  c.highlights,
  c.sports_offered,
  c.featured,
  c.status,
  c.tenant_id,
  -- Location fields
  l.id as location_id,
  l.name as location_name,
  l.address_line1 as location_address,
  l.city,
  l.state,
  l.zip_code,
  l.latitude,
  l.longitude,
  l.indoor,
  -- Tenant info for multi-tenant display
  t.name as tenant_name,
  t.slug as tenant_slug,
  -- Computed fields
  get_camp_spots_remaining(c.id) as spots_remaining,
  CASE
    WHEN c.early_bird_price IS NOT NULL
      AND c.early_bird_deadline IS NOT NULL
      AND CURRENT_DATE <= c.early_bird_deadline
    THEN c.early_bird_price
    ELSE c.price
  END as current_price,
  CASE
    WHEN get_camp_spots_remaining(c.id) <= 0 THEN true
    ELSE false
  END as is_full
FROM camps c
LEFT JOIN locations l ON c.location_id = l.id
LEFT JOIN tenants t ON c.tenant_id = t.id
WHERE c.status IN ('published', 'open')
  AND c.start_date >= CURRENT_DATE;

-- ============================================================================
-- SECTION 5: RLS POLICY FOR PUBLIC CAMP ACCESS
-- ============================================================================
-- Allow public/anonymous access to view published camps

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Active camps viewable publicly within tenant" ON camps;
DROP POLICY IF EXISTS "Active camps are viewable by everyone" ON camps;
DROP POLICY IF EXISTS "Public can view published camps" ON camps;

-- Create new policy allowing public access to published/open camps
CREATE POLICY "Public can view published camps" ON camps
  FOR SELECT
  USING (status IN ('published', 'open'));

-- Ensure anon role can select from camps
GRANT SELECT ON camps TO anon;
GRANT SELECT ON locations TO anon;
GRANT SELECT ON tenants TO anon;
GRANT EXECUTE ON FUNCTION get_camp_spots_remaining(UUID) TO anon;

-- ============================================================================
-- SECTION 6: SEARCH HELPER FUNCTIONS
-- ============================================================================

-- Function to search camps by location (city, state, or zip)
CREATE OR REPLACE FUNCTION search_camps_by_location(
  search_city TEXT DEFAULT NULL,
  search_state TEXT DEFAULT NULL,
  search_zip TEXT DEFAULT NULL,
  search_radius_miles INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  slug VARCHAR,
  name VARCHAR,
  description TEXT,
  program_type TEXT,
  start_date DATE,
  end_date DATE,
  min_age INTEGER,
  max_age INTEGER,
  min_grade INTEGER,
  max_grade INTEGER,
  max_capacity INTEGER,
  price INTEGER,
  current_price INTEGER,
  image_url TEXT,
  featured BOOLEAN,
  status TEXT,
  tenant_id UUID,
  location_name VARCHAR,
  city VARCHAR,
  state VARCHAR,
  zip_code VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  spots_remaining INTEGER,
  is_full BOOLEAN,
  distance_miles FLOAT
) AS $$
BEGIN
  -- For now, simple exact match on city/state/zip
  -- Distance calculation requires PostGIS for proper radius search
  RETURN QUERY
  SELECT
    pcc.id,
    pcc.slug,
    pcc.name,
    pcc.description,
    pcc.program_type,
    pcc.start_date,
    pcc.end_date,
    pcc.min_age,
    pcc.max_age,
    pcc.min_grade,
    pcc.max_grade,
    pcc.max_capacity,
    pcc.price,
    pcc.current_price,
    pcc.image_url,
    pcc.featured,
    pcc.status,
    pcc.tenant_id,
    pcc.location_name,
    pcc.city,
    pcc.state,
    pcc.zip_code,
    pcc.latitude,
    pcc.longitude,
    pcc.spots_remaining,
    pcc.is_full,
    NULL::FLOAT as distance_miles
  FROM public_camp_cards pcc
  WHERE
    (search_city IS NULL OR LOWER(pcc.city) = LOWER(search_city))
    AND (search_state IS NULL OR LOWER(pcc.state) = LOWER(search_state))
    AND (search_zip IS NULL OR pcc.zip_code = search_zip)
  ORDER BY pcc.start_date ASC, pcc.featured DESC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION search_camps_by_location(TEXT, TEXT, TEXT, INTEGER) TO anon;

-- ============================================================================
-- SECTION 7: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_camps_status ON camps(status);
CREATE INDEX IF NOT EXISTS idx_camps_start_date ON camps(start_date);
CREATE INDEX IF NOT EXISTS idx_camps_status_date ON camps(status, start_date) WHERE status IN ('published', 'open');
CREATE INDEX IF NOT EXISTS idx_locations_city_state ON locations(city, state);
CREATE INDEX IF NOT EXISTS idx_locations_zip ON locations(zip_code);

-- ============================================================================
-- SECTION 8: TRIGGER TO AUTO-UPDATE STATUS
-- ============================================================================
-- Automatically close camps that are past their end date or full

CREATE OR REPLACE FUNCTION auto_close_camps()
RETURNS TRIGGER AS $$
BEGIN
  -- If camp end date has passed, mark as closed
  IF NEW.end_date < CURRENT_DATE AND NEW.status = 'open' THEN
    NEW.status := 'closed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_close_camps ON camps;
CREATE TRIGGER trigger_auto_close_camps
  BEFORE UPDATE ON camps
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_camps();

-- ============================================================================
-- DONE! Your Find Camps feature database support is ready.
-- ============================================================================
--
-- To test, run:
-- SELECT * FROM public_camp_cards;
-- SELECT * FROM search_camps_by_location('Chicago', 'IL', NULL, NULL);
-- ============================================================================
