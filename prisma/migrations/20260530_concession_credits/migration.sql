CREATE TABLE IF NOT EXISTS concession_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  balance_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_concession_credits_athlete_camp ON concession_credits(athlete_id, camp_id);
CREATE INDEX IF NOT EXISTS idx_concession_credits_parent ON concession_credits(parent_id);
CREATE INDEX IF NOT EXISTS idx_concession_credits_camp ON concession_credits(camp_id);

CREATE TABLE IF NOT EXISTS concession_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES concession_credits(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'deduction', 'adjustment', 'refund')),
  amount_cents INT NOT NULL,
  balance_after_cents INT NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES profiles(id),
  stripe_checkout_session_id TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_concession_txn_credit ON concession_credit_transactions(credit_id);
CREATE INDEX IF NOT EXISTS idx_concession_txn_created ON concession_credit_transactions(created_at);
