-- ─────────────────────────────────────────────────────────────────────────────
-- Add Custom Coins for MASTER users
-- Migration: add_custom_coins.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Create custom_coins table to store MASTER user custom coin selections
-- Max 5 custom coins per user, stored as simple list
CREATE TABLE IF NOT EXISTS public.custom_coins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, symbol),
    CONSTRAINT max_5_custom_coins CHECK (
      (SELECT COUNT(*) FROM public.custom_coins c WHERE c.user_id = user_id) <= 5
    )
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_coins_user_id ON public.custom_coins(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_coins_symbol ON public.custom_coins(symbol);

-- Enable RLS
ALTER TABLE public.custom_coins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can only see their own custom coins
CREATE POLICY "Users can see their own custom coins"
  ON public.custom_coins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom coins"
  ON public.custom_coins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom coins"
  ON public.custom_coins FOR DELETE
  USING (auth.uid() = user_id);
