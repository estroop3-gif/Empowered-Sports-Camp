-- Backfill: Cole Richardson's $1.00 concession credit purchase from 2026-06-12
-- Stripe session: cs_live_a11bU6XeKbLikcDZRPIY2dCz2BgQMeWcaj7jmbBCQgjBfsBSErHEvgBhMR
-- The webhook failed to write to the DB despite Stripe showing paid.

-- Only insert if not already present (idempotent)
DO $$
DECLARE
  v_credit_id UUID;
  v_parent_id UUID;
  v_athlete_id UUID := '5132187b-9624-4550-b7bf-57a0698a8d82'::UUID;
  v_camp_id UUID := 'ed480735-9621-41bb-95ec-274e40d31fc6'::UUID;
  v_registration_id UUID := '26e4a20a-b388-4fae-b018-f1dfe8915e30'::UUID;
  v_session_id TEXT := 'cs_live_a11bU6XeKbLikcDZRPIY2dCz2BgQMeWcaj7jmbBCQgjBfsBSErHEvgBhMR';
BEGIN
  -- Skip if already backfilled
  IF EXISTS (
    SELECT 1 FROM concession_credit_transactions
    WHERE stripe_checkout_session_id = v_session_id
  ) THEN
    RAISE NOTICE 'Already backfilled for session %', v_session_id;
    RETURN;
  END IF;

  -- Look up the parent from the registration
  SELECT r.parent_id INTO v_parent_id
  FROM registrations r
  WHERE r.id = v_registration_id;

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Registration % not found — verify the UUID', v_registration_id;
  END IF;

  -- Upsert concession credit balance
  INSERT INTO concession_credits (id, athlete_id, parent_id, camp_id, registration_id, balance_cents, created_at, updated_at)
  VALUES (gen_random_uuid(), v_athlete_id, v_parent_id, v_camp_id, v_registration_id, 100, NOW(), NOW())
  ON CONFLICT (athlete_id, camp_id)
  DO UPDATE SET balance_cents = concession_credits.balance_cents + 100, updated_at = NOW()
  RETURNING id INTO v_credit_id;

  -- Create transaction record
  INSERT INTO concession_credit_transactions (id, credit_id, type, amount_cents, balance_after_cents, description, performed_by, stripe_checkout_session_id, created_at)
  VALUES (
    gen_random_uuid(),
    v_credit_id,
    'purchase',
    100,
    (SELECT balance_cents FROM concession_credits WHERE id = v_credit_id),
    'Concession credits purchase (backfill)',
    v_parent_id,
    v_session_id,
    NOW()
  );

  RAISE NOTICE 'Backfilled $1.00 concession credits for athlete %, credit_id %', v_athlete_id, v_credit_id;
END $$;
