-- Migration: Add billing columns to profiles table
-- Run this once in your Supabase SQL editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at       timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text        DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS current_period_end  timestamptz,
  ADD COLUMN IF NOT EXISTS dodo_customer_id    text;

-- Backfill: set trial_ends_at for existing free users who don't have it set yet
UPDATE profiles
SET
  trial_ends_at       = created_at + INTERVAL '7 days',
  subscription_status = 'trial'
WHERE plan = 'free'
  AND trial_ends_at IS NULL;

-- Backfill: mark pro/master users who already paid as active
UPDATE profiles
SET subscription_status = 'active'
WHERE plan IN ('pro', 'master', 'lifetime')
  AND subscription_status = 'trial';

-- Backfill: mark lifetime users
UPDATE profiles
SET subscription_status = 'lifetime'
WHERE plan = 'lifetime';

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  amount           numeric(10,2),
  currency         text        DEFAULT 'USD',
  status           text,
  dodo_payment_id  text,
  plan             text,
  billing_cycle    text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);
