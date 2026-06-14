-- CreateIndex
CREATE INDEX IF NOT EXISTS "concession_credit_transactions_stripe_checkout_session_id_idx"
ON "concession_credit_transactions"("stripe_checkout_session_id");
