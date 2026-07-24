-- Referral system + manual USDT billing migration.
-- Replaces Dodo Payments (removed) with manual admin-driven plan upgrades,
-- and adds referral tracking (unique link per user, invite count, one-time
-- 10% commission on a referred user's first paid upgrade).

-- ── 1. Rename 'lifetime' plan to 'grandmaster' everywhere ───────────────────
UPDATE public.profiles SET plan = 'grandmaster' WHERE plan = 'lifetime';

-- ── 2. Drop Dodo-specific columns, no longer used ───────────────────────────
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS trial_ends_at,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS current_period_end,
  DROP COLUMN IF EXISTS dodo_customer_id;

-- ── 3. Billing cycle + referral columns on profiles ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_cycle text, -- 'monthly' | 'yearly' | 'lifetime' | null (free)
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Backfill a unique referral code for existing rows that don't have one yet.
UPDATE public.profiles
SET referral_code = upper(substr(md5(id::text || coalesce(email, '')), 1, 8))
WHERE referral_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by);

-- ── 4. Auto-generate referral_code + attribute referred_by on signup ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  ref_code text;
  referrer_id uuid;
BEGIN
  ref_code := upper(substr(md5(new.id::text || new.email), 1, 8));

  IF new.raw_user_meta_data ? 'referral_code' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = upper(new.raw_user_meta_data->>'referral_code')
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, name, plan, referral_code, referred_by)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'free',
    ref_code,
    referrer_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Referral conversions - one row per referred user's first upgrade ────
CREATE TABLE IF NOT EXISTS public.referral_conversions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan               text        NOT NULL, -- 'pro' | 'master' | 'grandmaster'
  billing_cycle      text        NOT NULL, -- 'monthly' | 'yearly' | 'lifetime'
  plan_price         numeric(10,2) NOT NULL,
  commission_amount  numeric(10,2) NOT NULL,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (referred_user_id)
);

ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referrers can view own conversions" ON public.referral_conversions;
CREATE POLICY "Referrers can view own conversions"
  ON public.referral_conversions FOR SELECT
  USING (auth.uid() = referrer_id);

-- ── 6. Repurpose `payments` as a manual USDT payment ledger ─────────────────
-- Create it if the earlier add_billing_columns.sql migration was never run.
CREATE TABLE IF NOT EXISTS public.payments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount           numeric(10,2),
  currency         text        DEFAULT 'USDT',
  status           text,
  plan             text,
  billing_cycle    text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS dodo_payment_id;

ALTER TABLE public.payments
  ALTER COLUMN currency SET DEFAULT 'USDT';

UPDATE public.payments SET plan = 'grandmaster' WHERE plan = 'lifetime';
