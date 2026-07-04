-- ─────────────────────────────────────────────────────────────────────────────
-- Sanddock - Signal Engine Tables (idempotent migration)
-- Migration: 20260628000000_signal_tables.sql
--
-- IMPORTANT: The signals table already exists from 20260627230000_create_schema.sql
-- with a different schema. This migration:
--   1. Adds missing columns to the existing signals table
--   2. Creates ohlcv_cache (new)
--   3. Creates backtest_results (new)
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────
-- PATCH existing signals table
-- Add all columns that were missing from the original schema.
-- ADD COLUMN IF NOT EXISTS is safe to run multiple times.
-- ─────────────────────────────────────────────────

-- Rename timeframe → interval (the engine uses 'interval' as per Binance naming)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'timeframe'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'interval'
  ) THEN
    ALTER TABLE public.signals RENAME COLUMN timeframe TO interval;
  END IF;
END $$;

-- Rename price → entry_price
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'entry_price'
  ) THEN
    ALTER TABLE public.signals RENAME COLUMN price TO entry_price;
  END IF;
END $$;

-- Rename result_pct → pnl_pct
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'result_pct'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'pnl_pct'
  ) THEN
    ALTER TABLE public.signals RENAME COLUMN result_pct TO pnl_pct;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS symbol         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS signal_type    VARCHAR(4),
  ADD COLUMN IF NOT EXISTS ha_price       NUMERIC(20,8),
  ADD COLUMN IF NOT EXISTS swing_group_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS close_reason   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS entry_price    NUMERIC(20,8),
  ADD COLUMN IF NOT EXISTS sl_price       NUMERIC(20,8),
  ADD COLUMN IF NOT EXISTS tp_price       NUMERIC(20,8),
  ADD COLUMN IF NOT EXISTS sl_pct         NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS tp_pct         NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS confidence     INTEGER,
  ADD COLUMN IF NOT EXISTS rationale      TEXT,
  ADD COLUMN IF NOT EXISTS bar_time       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interval       VARCHAR(5),
  ADD COLUMN IF NOT EXISTS action         VARCHAR(10),
  ADD COLUMN IF NOT EXISTS pnl_pct        NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS closed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS close_price    NUMERIC(20,8),
  ADD COLUMN IF NOT EXISTS is_win         BOOLEAN;

-- Create indexes on the existing signals table (IF NOT EXISTS avoids duplicate errors)
CREATE INDEX IF NOT EXISTS idx_signals_symbol_type
    ON public.signals (symbol, signal_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_group
    ON public.signals (swing_group_id);

CREATE INDEX IF NOT EXISTS idx_signals_action
    ON public.signals (action, created_at DESC);


-- ─────────────────────────────────────────────────
-- OHLCV cache - new table for HA candle data
-- Written by signal_engine.py, read by chart API
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ohlcv_cache (
    id          BIGSERIAL PRIMARY KEY,
    symbol      VARCHAR(20)   NOT NULL,
    interval    VARCHAR(5)    NOT NULL,
    open_time   TIMESTAMPTZ   NOT NULL,
    open        NUMERIC(20,8) NOT NULL,
    high        NUMERIC(20,8) NOT NULL,
    low         NUMERIC(20,8) NOT NULL,
    close       NUMERIC(20,8) NOT NULL,
    volume      NUMERIC(30,8) NOT NULL,
    ha_open     NUMERIC(20,8),
    ha_high     NUMERIC(20,8),
    ha_low      NUMERIC(20,8),
    ha_close    NUMERIC(20,8),
    UNIQUE (symbol, interval, open_time)
);

CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_interval_time
    ON public.ohlcv_cache (symbol, interval, open_time DESC);


-- ─────────────────────────────────────────────────
-- Backtest results - pre-computed historical trades
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.backtest_results (
    id              BIGSERIAL PRIMARY KEY,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol          VARCHAR(20) NOT NULL,
    interval        VARCHAR(5)  NOT NULL,
    lookback        INTEGER     NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    signal_type     VARCHAR(4),
    entry_time      TIMESTAMPTZ NOT NULL,
    entry_price     NUMERIC(20,8) NOT NULL,
    exit_time       TIMESTAMPTZ,
    exit_price      NUMERIC(20,8),
    sl_price        NUMERIC(20,8),
    tp_price        NUMERIC(20,8),
    close_reason    VARCHAR(20),
    pnl_pct         NUMERIC(10,4),
    is_win          BOOLEAN,
    duration_bars   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_backtest_symbol
    ON public.backtest_results (symbol, interval, entry_time DESC);
