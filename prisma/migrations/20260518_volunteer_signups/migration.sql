-- Volunteer Sign-Ups (separate from CIT applications)
CREATE TABLE IF NOT EXISTS volunteer_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  age INT NOT NULL,
  incoming_grade TEXT NOT NULL,
  phone TEXT NOT NULL,
  camp_ids UUID[] DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_signups_status ON volunteer_signups(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_created ON volunteer_signups(created_at);
