-- ─────────────────────────────────────────────────────────────────────────────
-- Sanddock - RLS Policies for Signal Engine Tables (idempotent)
-- Migration: 20260628000001_signal_rls.sql
--
-- signals table already has RLS enabled + public read policy from the original
-- migration (20260627230000_create_schema.sql), so we only handle the new tables.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────
-- ohlcv_cache - new table
-- Chart data is available to all authenticated users (including free plan).
-- The Python signal engine writes using the service role key (bypasses RLS).
-- ─────────────────────────────────────────────────
ALTER TABLE public.ohlcv_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'ohlcv_cache'
      AND policyname = 'ohlcv_cache_select_authenticated'
  ) THEN
    CREATE POLICY "ohlcv_cache_select_authenticated"
      ON public.ohlcv_cache
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Allow service role (signal engine) to write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'ohlcv_cache'
      AND policyname = 'ohlcv_cache_write_service'
  ) THEN
    CREATE POLICY "ohlcv_cache_write_service"
      ON public.ohlcv_cache
      FOR ALL
      USING (true);
  END IF;
END $$;


-- ─────────────────────────────────────────────────
-- backtest_results - new table
-- All authenticated users can read.
-- ─────────────────────────────────────────────────
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'backtest_results'
      AND policyname = 'backtest_results_select_authenticated'
  ) THEN
    CREATE POLICY "backtest_results_select_authenticated"
      ON public.backtest_results
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Allow service role (backtest worker) to write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'backtest_results'
      AND policyname = 'backtest_results_write_service'
  ) THEN
    CREATE POLICY "backtest_results_write_service"
      ON public.backtest_results
      FOR ALL
      USING (true);
  END IF;
END $$;


-- ─────────────────────────────────────────────────
-- signals - also add INSERT/UPDATE policies for the
-- signal engine service role (needed to write new signals
-- and close them with UPDATE).
-- ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'signals'
      AND policyname = 'signals_write_service'
  ) THEN
    CREATE POLICY "signals_write_service"
      ON public.signals
      FOR ALL
      USING (true);
  END IF;
END $$;
