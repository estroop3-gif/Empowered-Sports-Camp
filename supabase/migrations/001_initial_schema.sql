-- =====================================================
-- EMPOWERED ATHLETES - DATABASE SCHEMA
-- =====================================================
-- Multi-sport camps for girls ages 5-17
-- Built for girls, led by women
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Program types offered
CREATE TYPE program_type AS ENUM (
  'all_girls_sports_camp',
  'cit_program',
  'soccer_strength',
  'basketball_intensive',
  'volleyball_clinic',
  'specialty_camp'
);

-- Registration status
CREATE TYPE registration_status AS ENUM (
  'pending',
  'confirmed',
  'waitlisted',
  'cancelled',
  'refunded'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded'
);

-- =====================================================
-- LOCATIONS TABLE
-- =====================================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL DEFAULT 'IL',
  zip_code VARCHAR(10) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  facility_details TEXT,
  parking_info TEXT,
  indoor BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CAMPS TABLE
-- =====================================================
CREATE TABLE camps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  program_type program_type NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Dates and times
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_start_time TIME DEFAULT '09:00',
  daily_end_time TIME DEFAULT '15:00',

  -- Age requirements
  min_age INTEGER NOT NULL DEFAULT 5,
  max_age INTEGER NOT NULL DEFAULT 17,

  -- Capacity
  max_capacity INTEGER NOT NULL DEFAULT 50,
  spots_reserved INTEGER DEFAULT 0, -- For waitlist management

  -- Pricing (stored in cents)
  price INTEGER NOT NULL, -- Base price
  early_bird_price INTEGER, -- Optional early bird discount
  early_bird_deadline DATE,
  sibling_discount_percent INTEGER DEFAULT 10,

  -- Extended care options (stored in cents)
  before_care_price INTEGER DEFAULT 0,
  after_care_price INTEGER DEFAULT 0,
  before_care_start TIME DEFAULT '07:30',
  after_care_end TIME DEFAULT '18:00',

  -- Content
  image_url TEXT,
  highlights TEXT[], -- Array of highlight bullet points
  what_to_bring TEXT[],
  sports_offered TEXT[],

  -- Status
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  registration_open BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_camps_dates ON camps(start_date, end_date);
CREATE INDEX idx_camps_program_type ON camps(program_type);
CREATE INDEX idx_camps_active ON camps(active, registration_open);

-- =====================================================
-- PROFILES TABLE (Parents/Guardians)
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),

  -- Emergency contact (if different from parent)
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),

  -- Marketing preferences
  marketing_opt_in BOOLEAN DEFAULT false,
  sms_opt_in BOOLEAN DEFAULT false,

  -- Stripe
  stripe_customer_id VARCHAR(255),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ATHLETES TABLE (Campers - the children)
-- =====================================================
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(50),

  -- School info
  school_name VARCHAR(255),
  grade VARCHAR(20),

  -- Medical info
  allergies TEXT,
  medical_conditions TEXT,
  medications TEXT,
  dietary_restrictions TEXT,

  -- Emergency contacts specific to this child
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),

  -- Authorized pickup persons
  authorized_pickups JSONB DEFAULT '[]',

  -- T-shirt size for camp gear
  tshirt_size VARCHAR(10),

  -- Experience level
  sports_experience TEXT,
  special_needs TEXT,

  -- Photo/media consent
  photo_consent BOOLEAN DEFAULT false,

  -- Metadata
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for parent lookups
CREATE INDEX idx_athletes_parent ON athletes(parent_id);

-- =====================================================
-- REGISTRATIONS TABLE
-- =====================================================
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core relationships
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE RESTRICT,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE RESTRICT,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Status
  status registration_status DEFAULT 'pending',

  -- Pricing at time of registration (stored in cents)
  base_price INTEGER NOT NULL,
  before_care_added BOOLEAN DEFAULT false,
  after_care_added BOOLEAN DEFAULT false,
  before_care_price INTEGER DEFAULT 0,
  after_care_price INTEGER DEFAULT 0,
  sibling_discount INTEGER DEFAULT 0,
  promo_discount INTEGER DEFAULT 0,
  promo_code VARCHAR(50),
  total_price INTEGER NOT NULL,

  -- Additional info
  special_requests TEXT,
  how_heard_about_us VARCHAR(255),

  -- Waitlist position (null if not waitlisted)
  waitlist_position INTEGER,

  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate registrations
  UNIQUE(camp_id, athlete_id)
);

-- Indexes for common queries
CREATE INDEX idx_registrations_camp ON registrations(camp_id);
CREATE INDEX idx_registrations_athlete ON registrations(athlete_id);
CREATE INDEX idx_registrations_parent ON registrations(parent_id);
CREATE INDEX idx_registrations_status ON registrations(status);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Stripe info
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  stripe_refund_id VARCHAR(255),

  -- Amount (stored in cents)
  amount INTEGER NOT NULL,
  refunded_amount INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'usd',

  -- Status
  status payment_status DEFAULT 'pending',

  -- Payment method info
  payment_method_type VARCHAR(50), -- card, etc.
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),

  -- Metadata
  description TEXT,
  receipt_url TEXT,
  failure_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- Index for Stripe lookups
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_registration ON payments(registration_id);
CREATE INDEX idx_payments_parent ON payments(parent_id);

-- =====================================================
-- PROMO CODES TABLE
-- =====================================================
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,

  -- Discount type
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL, -- Percent (0-100) or cents

  -- Restrictions
  min_purchase INTEGER, -- Minimum purchase in cents
  max_uses INTEGER, -- Total uses allowed (null = unlimited)
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,

  -- Valid programs (null = all)
  valid_program_types program_type[],
  valid_camp_ids UUID[],

  -- Date restrictions
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  -- Status
  active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);

-- =====================================================
-- WAITLIST TABLE
-- =====================================================
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  position INTEGER NOT NULL,
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- When their spot offer expires

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(camp_id, athlete_id)
);

CREATE INDEX idx_waitlist_camp ON waitlist(camp_id, position);

-- =====================================================
-- COACH/STAFF TABLE (for future use)
-- =====================================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  role VARCHAR(50) NOT NULL, -- 'coach', 'director', 'admin', 'cit'
  bio TEXT,
  photo_url TEXT,
  certifications TEXT[],

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CAMP STAFF ASSIGNMENTS
-- =====================================================
CREATE TABLE camp_staff (
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role VARCHAR(50), -- 'lead_coach', 'assistant', 'cit'

  PRIMARY KEY (camp_id, staff_id)
);

-- =====================================================
-- VIEWS
-- =====================================================

-- View for camp cards with location and spots info
CREATE VIEW camp_cards AS
SELECT
  c.id,
  c.slug,
  c.name,
  c.program_type,
  c.start_date,
  c.end_date,
  c.min_age,
  c.max_age,
  c.price,
  c.early_bird_price,
  c.early_bird_deadline,
  c.image_url,
  c.featured,
  c.max_capacity,
  l.name AS location_name,
  l.city,
  l.state,
  c.max_capacity - COALESCE(
    (SELECT COUNT(*) FROM registrations r
     WHERE r.camp_id = c.id AND r.status IN ('confirmed', 'pending')),
    0
  ) AS spots_left
FROM camps c
LEFT JOIN locations l ON c.location_id = l.id
WHERE c.active = true AND c.registration_open = true;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_camps_updated_at BEFORE UPDATE ON camps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate age from date of birth
CREATE OR REPLACE FUNCTION calculate_age(dob DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, dob))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if athlete is eligible for camp
CREATE OR REPLACE FUNCTION is_athlete_eligible(athlete_id UUID, camp_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  athlete_age INTEGER;
  camp_min_age INTEGER;
  camp_max_age INTEGER;
BEGIN
  SELECT calculate_age(date_of_birth) INTO athlete_age
  FROM athletes WHERE id = athlete_id;

  SELECT min_age, max_age INTO camp_min_age, camp_max_age
  FROM camps WHERE id = camp_id;

  RETURN athlete_age >= camp_min_age AND athlete_age <= camp_max_age;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_staff ENABLE ROW LEVEL SECURITY;

-- LOCATIONS: Public read, admin write
CREATE POLICY "Locations are viewable by everyone" ON locations
  FOR SELECT USING (true);

-- CAMPS: Public read for active camps, admin write
CREATE POLICY "Active camps are viewable by everyone" ON camps
  FOR SELECT USING (active = true);

-- PROFILES: Users can only see/edit their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ATHLETES: Parents can only see/edit their own children
CREATE POLICY "Parents can view their own athletes" ON athletes
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert their own athletes" ON athletes
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update their own athletes" ON athletes
  FOR UPDATE USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their own athletes" ON athletes
  FOR DELETE USING (auth.uid() = parent_id);

-- REGISTRATIONS: Parents can view/create their own registrations
CREATE POLICY "Parents can view their own registrations" ON registrations
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can create registrations for their athletes" ON registrations
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- PAYMENTS: Parents can view their own payments
CREATE POLICY "Parents can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = parent_id);

-- PROMO CODES: Public read for active codes
CREATE POLICY "Active promo codes are viewable" ON promo_codes
  FOR SELECT USING (active = true);

-- WAITLIST: Parents can view/manage their own waitlist entries
CREATE POLICY "Parents can view their own waitlist entries" ON waitlist
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert their own waitlist entries" ON waitlist
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their own waitlist entries" ON waitlist
  FOR DELETE USING (auth.uid() = parent_id);

-- STAFF: Public read for active staff (for coach bios)
CREATE POLICY "Active staff are viewable" ON staff
  FOR SELECT USING (active = true);

-- CAMP_STAFF: Public read
CREATE POLICY "Camp staff assignments are viewable" ON camp_staff
  FOR SELECT USING (true);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert sample locations
INSERT INTO locations (name, address_line1, city, state, zip_code, indoor) VALUES
('Lincoln Park Athletic Field', '2045 N Lincoln Park West', 'Chicago', 'IL', '60614', false),
('Evanston Recreation Center', '2100 Ridge Ave', 'Evanston', 'IL', '60201', true),
('Oak Park Community Center', '218 Madison St', 'Oak Park', 'IL', '60302', true),
('Schaumburg Sports Complex', '1020 W Irving Park Rd', 'Schaumburg', 'IL', '60193', false),
('Naperville Park District', '320 W Jackson Ave', 'Naperville', 'IL', '60540', false);

-- Insert sample camps
INSERT INTO camps (
  slug, name, description, program_type, location_id,
  start_date, end_date, min_age, max_age,
  max_capacity, price, early_bird_price, early_bird_deadline,
  featured, sports_offered, highlights
) VALUES
(
  'summer-week-1-lincoln-park',
  'Summer Week 1 - Lincoln Park',
  'Kick off your summer with an action-packed week of multi-sport fun! Our flagship camp introduces girls to 7 different sports in a supportive, all-female environment.',
  'all_girls_sports_camp',
  (SELECT id FROM locations WHERE city = 'Chicago' LIMIT 1),
  '2025-06-09', '2025-06-13', 6, 12,
  50, 29900, 26900, '2025-05-01',
  true,
  ARRAY['Soccer', 'Basketball', 'Volleyball', 'Flag Football', 'Lacrosse', 'Tennis', 'Track & Field'],
  ARRAY['7 different sports in one week', 'All-female coaching staff', 'Confidence-building activities', 'New friendships guaranteed']
),
(
  'summer-week-2-evanston',
  'Summer Week 2 - Evanston',
  'Our Evanston location offers the same amazing Empowered experience with indoor facilities for any weather conditions.',
  'all_girls_sports_camp',
  (SELECT id FROM locations WHERE city = 'Evanston' LIMIT 1),
  '2025-06-16', '2025-06-20', 6, 12,
  40, 29900, 26900, '2025-05-01',
  true,
  ARRAY['Soccer', 'Basketball', 'Volleyball', 'Flag Football', 'Lacrosse', 'Tennis', 'Track & Field'],
  ARRAY['Indoor facilities', 'All-female coaching staff', 'Confidence-building activities', 'Transportation available']
),
(
  'cit-program-summer-2025',
  'CIT Program - Summer 2025',
  'Our Counselor-in-Training program develops the next generation of female sports leaders. Gain real coaching experience while earning community service hours.',
  'cit_program',
  (SELECT id FROM locations WHERE city = 'Chicago' LIMIT 1),
  '2025-06-09', '2025-08-08', 14, 17,
  20, 59900, 54900, '2025-04-15',
  true,
  ARRAY['Leadership Training', 'Coaching Fundamentals', 'First Aid Certification', 'Sports Instruction'],
  ARRAY['Real coaching experience', 'Community service hours', 'Leadership development', 'Resume builder']
),
(
  'summer-week-3-oak-park',
  'Summer Week 3 - Oak Park',
  'Join us in Oak Park for a week of sports, fun, and friendship!',
  'all_girls_sports_camp',
  (SELECT id FROM locations WHERE city = 'Oak Park' LIMIT 1),
  '2025-06-23', '2025-06-27', 6, 12,
  45, 29900, 26900, '2025-05-15',
  false,
  ARRAY['Soccer', 'Basketball', 'Volleyball', 'Flag Football', 'Lacrosse', 'Tennis', 'Track & Field'],
  ARRAY['7 different sports', 'All-female coaches', 'Indoor/outdoor facilities']
),
(
  'basketball-intensive-july',
  'Basketball Intensive - July',
  'Take your basketball skills to the next level with our intensive week-long program. Perfect for girls who want to focus on one sport.',
  'basketball_intensive',
  (SELECT id FROM locations WHERE city = 'Evanston' LIMIT 1),
  '2025-07-14', '2025-07-18', 10, 15,
  30, 34900, 31900, '2025-06-01',
  false,
  ARRAY['Basketball'],
  ARRAY['Skill development', 'Scrimmages daily', 'Video analysis', 'College prep tips']
);

-- Insert a sample promo code
INSERT INTO promo_codes (code, description, discount_type, discount_value, valid_until) VALUES
('SUMMER2025', 'Early summer signup discount', 'percent', 10, '2025-05-31'),
('FRIEND25', 'Refer a friend discount', 'fixed', 2500, '2025-08-31');
