-- Admin Alert Subscriptions
-- Allows admin users to subscribe to event-based email alerts with per-category toggles

CREATE TABLE IF NOT EXISTS admin_alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  forwarding_email TEXT NOT NULL,
  enabled_categories TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_alert_subs_active ON admin_alert_subscriptions(is_active);

-- Add admin_alert email type
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'admin_alert';
