# Sanddock — Technical Implementation Guide
## Live Data, Charts, Signal Engine, Backtesting & Dashboard Tabs
### For Antigravity Development Team | Version 1.0

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Backend — Signal Engine Service](#3-backend--signal-engine-service)
4. [REST API Endpoints](#4-rest-api-endpoints)
5. [WebSocket Layer](#5-websocket-layer)
6. [Live Signals Tab](#6-live-signals-tab)
7. [Heikin Ashi Chart Tab](#7-heikin-ashi-chart-tab)
8. [Backtesting Engine](#8-backtesting-engine)
9. [Signal Log Tab](#9-signal-log-tab)
10. [Performance Tab](#10-performance-tab)
11. [Deployment](#11-deployment)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BINANCE REST API                         │
│  /api/v3/klines  ·  /api/v3/ticker/price                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ polls every 15s
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              signal_engine.py  (background service)        │
│  fetch_klines() → to_heikin_ashi() → detect_swings()       │
│  → writes events to PostgreSQL → fires Telegram alerts     │
└──────────────────────────┬──────────────────────────────────┘
                           │ writes to DB
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│  signals · ohlcv_cache · backtest_results · users          │
└──────┬──────────────────────────┬───────────────────────────┘
       │ reads                    │ reads
       ▼                          ▼
┌─────────────┐          ┌────────────────────┐
│  FastAPI    │          │  Backtesting       │
│  REST API   │          │  Worker (runs once │
│  /api/v1/*  │          │  on startup + cron)│
└──────┬──────┘          └────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│               WebSocket Server (FastAPI)                    │
│  broadcasts: new_signal · price_update · signal_closed     │
└──────────────────────────┬──────────────────────────────────┘
                           │ ws://
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   React Frontend (Next.js)                  │
│  Live Signals · HA Chart · Signal Log · Performance        │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles
- The signal engine runs as a **separate persistent Python process** — not inside the API server
- All signal events are written to PostgreSQL **first**, then pushed to the frontend via WebSocket
- The frontend **never calls Binance directly** — all data goes through your backend
- Backtesting runs **server-side** using the same `detect_swings()` function as live signals — guarantees consistency

---

## 2. Database Schema

```sql
-- ─────────────────────────────────────────────────
-- OHLCV cache — raw candle data from Binance
-- ─────────────────────────────────────────────────
CREATE TABLE ohlcv_cache (
    id          BIGSERIAL PRIMARY KEY,
    symbol      VARCHAR(20)  NOT NULL,
    interval    VARCHAR(5)   NOT NULL,  -- '15m', '1h', '4h'
    open_time   TIMESTAMPTZ  NOT NULL,
    open        NUMERIC(20,8) NOT NULL,
    high        NUMERIC(20,8) NOT NULL,
    low         NUMERIC(20,8) NOT NULL,
    close       NUMERIC(20,8) NOT NULL,
    volume      NUMERIC(30,8) NOT NULL,
    -- Heikin Ashi computed values (stored to avoid recomputing)
    ha_open     NUMERIC(20,8),
    ha_high     NUMERIC(20,8),
    ha_low      NUMERIC(20,8),
    ha_close    NUMERIC(20,8),
    UNIQUE (symbol, interval, open_time)
);

CREATE INDEX idx_ohlcv_symbol_interval_time
    ON ohlcv_cache (symbol, interval, open_time DESC);


-- ─────────────────────────────────────────────────
-- Signals — every event from detect_swings()
-- ─────────────────────────────────────────────────
CREATE TABLE signals (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    symbol          VARCHAR(20)  NOT NULL,
    interval        VARCHAR(5)   NOT NULL,
    signal_type     VARCHAR(4)   NOT NULL,   -- 'buy' or 'sell'
    action          VARCHAR(10)  NOT NULL,   -- 'new', 'slide', 'commit'
    bar_time        TIMESTAMPTZ  NOT NULL,   -- HA bar that triggered signal
    entry_price     NUMERIC(20,8),           -- live ticker price at signal fire
    ha_price        NUMERIC(20,8),           -- HA high (sell) or HA low (buy)
    sl_price        NUMERIC(20,8),           -- stop loss level
    tp_price        NUMERIC(20,8),           -- take profit level
    sl_pct          NUMERIC(8,4),            -- stop loss %
    tp_pct          NUMERIC(8,4),            -- take profit %
    confidence      INTEGER,                 -- AI confidence score 0-100
    rationale       TEXT,                    -- AI-generated explanation
    -- Outcome (filled when signal closes)
    closed_at       TIMESTAMPTZ,
    close_price     NUMERIC(20,8),
    close_reason    VARCHAR(20),             -- 'tp_hit', 'sl_hit', 'signal_flip'
    pnl_pct         NUMERIC(10,4),           -- final % P&L
    is_win          BOOLEAN,
    -- Group ID: links 'new' + 'slide' + 'commit' events for the same swing
    swing_group_id  VARCHAR(36)              -- UUID
);

CREATE INDEX idx_signals_symbol_type  ON signals (symbol, signal_type, created_at DESC);
CREATE INDEX idx_signals_group        ON signals (swing_group_id);
CREATE INDEX idx_signals_action       ON signals (action, created_at DESC);


-- ─────────────────────────────────────────────────
-- Backtest results — pre-computed historical analysis
-- ─────────────────────────────────────────────────
CREATE TABLE backtest_results (
    id              BIGSERIAL PRIMARY KEY,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol          VARCHAR(20) NOT NULL,
    interval        VARCHAR(5)  NOT NULL,
    lookback        INTEGER     NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    signal_type     VARCHAR(4),             -- 'buy', 'sell', or NULL for all
    entry_time      TIMESTAMPTZ NOT NULL,
    entry_price     NUMERIC(20,8) NOT NULL,
    exit_time       TIMESTAMPTZ,
    exit_price      NUMERIC(20,8),
    sl_price        NUMERIC(20,8),
    tp_price        NUMERIC(20,8),
    close_reason    VARCHAR(20),            -- 'tp_hit', 'sl_hit', 'signal_flip'
    pnl_pct         NUMERIC(10,4),
    is_win          BOOLEAN,
    duration_bars   INTEGER                 -- how many bars the trade lasted
);

CREATE INDEX idx_backtest_symbol ON backtest_results (symbol, interval, entry_time DESC);
```

---

## 3. Backend — Signal Engine Service

### 3a. Enhance live-signal.py → signal_engine.py

The existing `live-signal.py` sends Telegram alerts. Extend it to also **write every event to PostgreSQL** and **push updates via WebSocket**.

```python
# signal_engine.py — enhanced version of live-signal.py

import os
import uuid
import time
import logging
import requests
import pandas as pd
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
from collections import deque

# Import the original functions unchanged
from live_signal import (
    fetch_klines,
    to_heikin_ashi,
    detect_swings,
    fetch_live_price,
    format_alert,
    tg_send,
    tg_edit,
    BINANCE_SYMBOL,
    LOOKBACK,
    INTERVAL,
    POLL_SECONDS,
)

# ── Database connection ───────────────────────────────────────────────────────
DB_URL = os.getenv("DATABASE_URL")  # postgresql://user:pass@host:5432/sanddock

def get_db():
    return psycopg2.connect(DB_URL)


# ── Confidence scoring (rule-based v1) ───────────────────────────────────────
def calculate_confidence(signal_type, ha_data, bar_index, lookback):
    """
    Rule-based confidence score: 40–95.
    Replace with ML model in v2.
    """
    score = 60  # base

    # 1. Volume above 20-bar average → +10
    if "volume" in ha_data.columns:
        window = ha_data["volume"].iloc[max(0, bar_index-20):bar_index]
        if len(window) > 0 and ha_data["volume"].iloc[bar_index] > window.mean():
            score += 10

    # 2. Signal aligned with 1H trend (check if ha_close > ha_open on 1H) → +10
    # (requires 1H data to be fetched separately; implement in v2 if needed)

    # 3. Previous swing was cleanly committed → +5
    score += 5  # simplified; implement full check in v2

    # Clamp to valid range
    return max(40, min(95, score))


# ── AI rationale generator (template-based v1) ────────────────────────────────
def generate_rationale(signal_type, symbol, lookback, bar_index, ha_data):
    direction = "bottom" if signal_type == "buy" else "top"
    price_field = "ha_low" if signal_type == "buy" else "ha_high"
    direction_word = "lowest" if signal_type == "buy" else "highest"

    rationale = (
        f"Swing {direction} confirmed. "
        f"{symbol} HA {price_field.split('_')[1]} is the {direction_word} "
        f"point in the last {lookback} bars. "
    )

    # Volume check
    if "volume" in ha_data.columns:
        window_vol = ha_data["volume"].iloc[max(0, bar_index-20):bar_index]
        if len(window_vol) > 0:
            current_vol = ha_data["volume"].iloc[bar_index]
            pct = round((current_vol / window_vol.mean() - 1) * 100)
            if pct > 0:
                rationale += f"Volume is {pct}% above the 20-bar average."

    return rationale.strip()


# ── SL/TP calculation ─────────────────────────────────────────────────────────
def calculate_sl_tp(signal_type, entry_price, risk_style="balanced"):
    """
    Conservative: SL -1.5%, TP +3.0%
    Balanced:     SL -2.5%, TP +5.0%
    Aggressive:   SL -4.0%, TP +10.0%
    """
    params = {
        "conservative": (1.5, 3.0),
        "balanced":     (2.5, 5.0),
        "aggressive":   (4.0, 10.0),
    }
    sl_pct, tp_pct = params.get(risk_style, (2.5, 5.0))

    if signal_type == "buy":
        sl = entry_price * (1 - sl_pct / 100)
        tp = entry_price * (1 + tp_pct / 100)
    else:  # sell
        sl = entry_price * (1 + sl_pct / 100)
        tp = entry_price * (1 - tp_pct / 100)

    return round(sl, 2), round(tp, 2), sl_pct, tp_pct


# ── Write signal to DB ────────────────────────────────────────────────────────
def save_signal(conn, event, symbol, interval, entry_price,
                sl, tp, sl_pct, tp_pct, confidence, rationale, swing_group_id):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO signals
                (symbol, interval, signal_type, action, bar_time,
                 entry_price, ha_price, sl_price, tp_price, sl_pct, tp_pct,
                 confidence, rationale, swing_group_id)
            VALUES
                (%s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s,
                 %s, %s, %s)
            RETURNING id
        """, (
            symbol, interval,
            "buy" if event["type"] == "bot" else "sell",
            event["action"],
            event["bar"],
            entry_price, event["price"],
            sl, tp, sl_pct, tp_pct,
            confidence, rationale, swing_group_id,
        ))
        signal_id = cur.fetchone()[0]
        conn.commit()
        return signal_id


# ── Cache OHLCV to DB ─────────────────────────────────────────────────────────
def cache_ohlcv(conn, df, ha, symbol, interval):
    """Write raw + HA candles to ohlcv_cache for chart rendering."""
    records = []
    for idx in df.index:
        records.append((
            symbol, interval, idx,
            float(df.loc[idx, "open"]),  float(df.loc[idx, "high"]),
            float(df.loc[idx, "low"]),   float(df.loc[idx, "close"]),
            float(df.loc[idx, "volume"]),
            float(ha.loc[idx, "ha_open"]), float(ha.loc[idx, "ha_high"]),
            float(ha.loc[idx, "ha_low"]),  float(ha.loc[idx, "ha_close"]),
        ))

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(cur, """
            INSERT INTO ohlcv_cache
                (symbol, interval, open_time, open, high, low, close, volume,
                 ha_open, ha_high, ha_low, ha_close)
            VALUES %s
            ON CONFLICT (symbol, interval, open_time) DO UPDATE SET
                ha_open  = EXCLUDED.ha_open,
                ha_high  = EXCLUDED.ha_high,
                ha_low   = EXCLUDED.ha_low,
                ha_close = EXCLUDED.ha_close
        """, records)
        conn.commit()


# ── Enhanced main loop ────────────────────────────────────────────────────────
def main():
    conn = get_db()

    df_seed  = fetch_klines(BINANCE_SYMBOL, INTERVAL, limit=200)
    ha_seed  = to_heikin_ashi(df_seed)
    cache_ohlcv(conn, df_seed, ha_seed, BINANCE_SYMBOL, INTERVAL)

    startup_watermark    = df_seed.index[-1]
    last_processed_close = startup_watermark
    pending_tg_id        = None
    pending_sig_type     = None
    current_swing_group  = str(uuid.uuid4())

    while True:
        try:
            df     = fetch_klines(BINANCE_SYMBOL, INTERVAL, limit=200)
            ha     = to_heikin_ashi(df)
            events = detect_swings(ha, LOOKBACK)

            # Cache latest candles
            cache_ohlcv(conn, df, ha, BINANCE_SYMBOL, INTERVAL)

            new_events = [e for e in events if e["bar"] > last_processed_close]

            for ev in new_events:
                bar_index    = df.index.get_loc(ev["bar"]) if ev["bar"] in df.index else -1
                live_price   = fetch_live_price(BINANCE_SYMBOL)
                sig_type_str = "buy" if ev["type"] == "bot" else "sell"

                confidence = calculate_confidence(sig_type_str, ha, bar_index, LOOKBACK)
                rationale  = generate_rationale(sig_type_str, BINANCE_SYMBOL, LOOKBACK, bar_index, ha)
                sl, tp, sl_pct, tp_pct = calculate_sl_tp(sig_type_str, live_price)

                if ev["action"] == "new":
                    current_swing_group = str(uuid.uuid4())

                signal_id = save_signal(
                    conn, ev, BINANCE_SYMBOL, INTERVAL, live_price,
                    sl, tp, sl_pct, tp_pct, confidence, rationale,
                    current_swing_group,
                )

                # Telegram (existing logic, unchanged)
                text = format_alert(BINANCE_SYMBOL, ev["type"], live_price, ev["bar"])
                if ev["action"] == "new":
                    pending_tg_id    = tg_send(text)
                    pending_sig_type = ev["type"]
                elif ev["action"] == "slide" and pending_tg_id and pending_sig_type == ev["type"]:
                    tg_edit(pending_tg_id, text)
                elif ev["action"] == "commit":
                    pending_tg_id    = None
                    pending_sig_type = None

                if ev["bar"] > last_processed_close:
                    last_processed_close = ev["bar"]

        except Exception as exc:
            logging.exception("Signal engine error: %s", exc)

        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
```

---

## 4. REST API Endpoints

Build these with **FastAPI** (Python). All endpoints are authenticated via session JWT except the public track record endpoint.

```python
# api/routes/signals.py

from fastapi import APIRouter, Depends, Query
from typing import Optional
import psycopg2

router = APIRouter(prefix="/api/v1")


# ── GET /api/v1/signals/live ─────────────────────────────────────────────────
# Returns the latest N 'new' signals for the dashboard feed.
# Only returns signals for coins the user's plan allows.
@router.get("/signals/live")
def get_live_signals(
    symbol: Optional[str] = None,
    signal_type: Optional[str] = None,  # 'buy' or 'sell'
    interval: Optional[str] = None,     # '15m', '1h', '4h'
    limit: int = Query(default=20, le=100),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    allowed_symbols = get_allowed_symbols(user.plan)  # ['BTCUSDT'] for free
    query = """
        SELECT id, symbol, interval, signal_type, action, bar_time,
               entry_price, sl_price, tp_price, sl_pct, tp_pct,
               confidence, rationale, created_at, swing_group_id
        FROM signals
        WHERE action = 'new'
          AND symbol = ANY(%s)
          {symbol_filter}
          {type_filter}
          {interval_filter}
        ORDER BY created_at DESC
        LIMIT %s
    """.format(
        symbol_filter   = "AND symbol = %s"         if symbol       else "",
        type_filter     = "AND signal_type = %s"    if signal_type  else "",
        interval_filter = "AND interval = %s"       if interval     else "",
    )
    # Build params dynamically based on filters
    params = [allowed_symbols]
    if symbol:       params.append(symbol)
    if signal_type:  params.append(signal_type)
    if interval:     params.append(interval)
    params.append(limit)

    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(query, params)
        return cur.fetchall()


# ── GET /api/v1/chart/candles ─────────────────────────────────────────────────
# Returns HA candle data for chart rendering.
@router.get("/chart/candles")
def get_candles(
    symbol: str = "BTCUSDT",
    interval: str = "15m",
    limit: int = Query(default=200, le=1000),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT open_time, open, high, low, close, volume,
                   ha_open, ha_high, ha_low, ha_close
            FROM ohlcv_cache
            WHERE symbol = %s AND interval = %s
            ORDER BY open_time DESC
            LIMIT %s
        """, (symbol, interval, limit))
        rows = cur.fetchall()
    # Return in ascending order for chart libraries
    return list(reversed(rows))


# ── GET /api/v1/chart/signals ─────────────────────────────────────────────────
# Returns signal markers for overlaying on the chart.
@router.get("/chart/signals")
def get_chart_signals(
    symbol: str = "BTCUSDT",
    interval: str = "15m",
    limit: int = Query(default=100, le=500),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT bar_time, signal_type, entry_price, confidence, action
            FROM signals
            WHERE symbol = %s AND interval = %s AND action IN ('new', 'commit')
            ORDER BY bar_time DESC
            LIMIT %s
        """, (symbol, interval, limit))
        return list(reversed(cur.fetchall()))


# ── GET /api/v1/signals/log ───────────────────────────────────────────────────
# Signal Log tab — paginated history of all signals.
@router.get("/signals/log")
def get_signal_log(
    symbol: Optional[str] = None,
    signal_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    offset = (page - 1) * page_size
    allowed_symbols = get_allowed_symbols(user.plan)

    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, symbol, interval, signal_type, bar_time,
                   entry_price, sl_price, tp_price,
                   close_price, close_reason, pnl_pct, is_win,
                   created_at, closed_at, confidence, swing_group_id
            FROM signals
            WHERE action = 'new'
              AND symbol = ANY(%s)
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (allowed_symbols, page_size, offset))
        return cur.fetchall()


# ── GET /api/v1/performance/summary ──────────────────────────────────────────
# Performance tab — aggregated stats.
@router.get("/performance/summary")
def get_performance_summary(
    symbol: str = "BTCUSDT",
    interval: str = "15m",
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT
                COUNT(*)                                    AS total_signals,
                COUNT(*) FILTER (WHERE is_win = TRUE)      AS wins,
                COUNT(*) FILTER (WHERE is_win = FALSE)     AS losses,
                COUNT(*) FILTER (WHERE close_reason IS NULL) AS open_signals,
                AVG(pnl_pct) FILTER (WHERE pnl_pct IS NOT NULL) AS avg_pnl,
                MAX(pnl_pct)                               AS best_trade,
                MIN(pnl_pct)                               AS worst_trade
            FROM signals
            WHERE action = 'new'
              AND symbol = %s
              AND interval = %s
        """, (symbol, interval))
        return cur.fetchone()


# ── GET /api/v1/backtest/results ──────────────────────────────────────────────
# Returns pre-computed backtest results.
@router.get("/backtest/results")
def get_backtest(
    symbol: str = "BTCUSDT",
    interval: str = "15m",
    page: int = 1,
    page_size: int = 50,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    offset = (page - 1) * page_size
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT entry_time, entry_price, exit_time, exit_price,
                   sl_price, tp_price, close_reason, pnl_pct, is_win,
                   signal_type, duration_bars
            FROM backtest_results
            WHERE symbol = %s AND interval = %s
            ORDER BY entry_time DESC
            LIMIT %s OFFSET %s
        """, (symbol, interval, page_size, offset))
        return cur.fetchall()
```

---

## 5. WebSocket Layer

The frontend connects to a WebSocket to receive real-time signal updates without polling.

```python
# api/websocket.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import asyncio, json

class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)

manager = ConnectionManager()


@app.websocket("/ws/signals")
async def signals_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; server pushes events via manager.broadcast()
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### Broadcasting from the Signal Engine

After saving a signal to DB in `signal_engine.py`, call the broadcast endpoint:

```python
import httpx

async def broadcast_signal(signal_data: dict):
    async with httpx.AsyncClient() as client:
        await client.post(
            "http://localhost:8000/internal/broadcast",
            json={"type": "new_signal", "data": signal_data},
        )
```

### WebSocket Message Types

```json
// New signal fired
{ "type": "new_signal",
  "data": { "id": 1, "symbol": "BTCUSDT", "signal_type": "buy",
            "entry_price": 67432.00, "sl_price": 65800.00,
            "tp_price": 70850.00, "confidence": 87,
            "rationale": "Swing bottom confirmed...",
            "bar_time": "2024-11-01T14:15:00Z" } }

// Signal updated (slide)
{ "type": "signal_updated",
  "data": { "swing_group_id": "uuid", "entry_price": 67500.00 } }

// Signal closed (TP/SL hit or opposite signal)
{ "type": "signal_closed",
  "data": { "swing_group_id": "uuid", "close_reason": "tp_hit",
            "close_price": 70812.00, "pnl_pct": 5.01 } }

// Live price tick (every 5 seconds)
{ "type": "price_tick",
  "data": { "symbol": "BTCUSDT", "price": 67580.00 } }
```

---

## 6. Live Signals Tab

### Frontend Implementation (React + Next.js)

```typescript
// hooks/useSignals.ts

import { useEffect, useRef, useState } from "react"

export interface Signal {
  id: number
  symbol: string
  interval: string
  signal_type: "buy" | "sell"
  entry_price: number
  sl_price: number
  tp_price: number
  sl_pct: number
  tp_pct: number
  confidence: number
  rationale: string
  bar_time: string
  created_at: string
  swing_group_id: string
}

export function useSignals(filters: { symbol?: string; signal_type?: string; interval?: string }) {
  const [signals, setSignals] = useState<Signal[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // Initial load
  useEffect(() => {
    const params = new URLSearchParams(filters as Record<string, string>)
    fetch(`/api/v1/signals/live?${params}`)
      .then(r => r.json())
      .then(setSignals)
  }, [filters])

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/signals`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === "new_signal") {
        setSignals(prev => [msg.data, ...prev])
      }

      if (msg.type === "signal_updated") {
        setSignals(prev => prev.map(s =>
          s.swing_group_id === msg.data.swing_group_id
            ? { ...s, entry_price: msg.data.entry_price }
            : s
        ))
      }

      if (msg.type === "signal_closed") {
        setSignals(prev => prev.map(s =>
          s.swing_group_id === msg.data.swing_group_id
            ? { ...s, close_reason: msg.data.close_reason, pnl_pct: msg.data.pnl_pct }
            : s
        ))
      }
    }

    return () => ws.close()
  }, [])

  return signals
}
```

### Signal Card Component

```typescript
// components/SignalCard.tsx

interface SignalCardProps {
  signal: Signal
  userPlan: "free" | "pro" | "master"
}

export function SignalCard({ signal, userPlan }: SignalCardProps) {
  const isBuy     = signal.signal_type === "buy"
  const isLocked  = signal.symbol !== "BTCUSDT" && userPlan === "free"
  const borderColor = isBuy ? "#00e676" : "#ff1744"

  if (isLocked) {
    return <LockedSignalCard symbol={signal.symbol} interval={signal.interval} />
  }

  return (
    <div style={{ borderLeft: `3px solid ${borderColor}` }} className="signal-card">
      <div className="signal-header">
        <span className="symbol">{signal.symbol}</span>
        <span className="interval">({signal.interval} HA)</span>
        <span className="timestamp">{formatRelativeTime(signal.created_at)}</span>
        <span className={`badge ${isBuy ? "buy" : "sell"}`}>
          {isBuy ? "BUY" : "SELL"}
        </span>
        <span className="confidence">{signal.confidence}%</span>
      </div>

      <div className="signal-data">
        <div>
          <label>ENTRY</label>
          <span>{formatPrice(signal.entry_price)}</span>
        </div>
        <div>
          <label>STOP LOSS</label>
          {userPlan === "free"
            ? <span className="locked">PRO ONLY 🔒</span>
            : <span className="red">{formatPrice(signal.sl_price)} ({signal.sl_pct}%)</span>
          }
        </div>
        <div>
          <label>TAKE PROFIT</label>
          {userPlan === "free"
            ? <span className="locked">PRO ONLY 🔒</span>
            : <span className="green">{formatPrice(signal.tp_price)} (+{signal.tp_pct}%)</span>
          }
        </div>
      </div>

      <div className="ai-rationale">
        <label>AI RATIONALE</label>
        <p>{signal.rationale}</p>
      </div>

      <ConfidenceBar value={signal.confidence} />
    </div>
  )
}
```

---

## 7. Heikin Ashi Chart Tab

### Library: TradingView Lightweight Charts

```bash
npm install lightweight-charts
```

### Chart Component

```typescript
// components/HAChart.tsx

import { useEffect, useRef } from "react"
import {
  createChart,
  CandlestickSeries,
  SeriesMarker,
  UTCTimestamp,
} from "lightweight-charts"

export function HAChart({ symbol = "BTCUSDT", interval = "15m" }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<any>(null)
  const seriesRef    = useRef<any>(null)
  const wsRef        = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // ── Create chart ──────────────────────────────────────────────────────
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#080d1a" },
        textColor:  "#8892a4",
      },
      grid: {
        vertLines: { color: "#1e2a3a" },
        horzLines: { color: "#1e2a3a" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: "#1e2a3a",
      },
      timeScale: {
        borderColor:     "#1e2a3a",
        timeVisible:     true,
        secondsVisible:  false,
      },
      width:  containerRef.current.clientWidth,
      height: 500,
    })
    chartRef.current = chart

    // ── Add HA candlestick series ─────────────────────────────────────────
    const candleSeries = chart.addCandlestickSeries({
      upColor:          "#00e676",  // bullish HA candle — green
      downColor:        "#ff1744",  // bearish HA candle — red
      borderUpColor:    "#00e676",
      borderDownColor:  "#ff1744",
      wickUpColor:      "#00e676",
      wickDownColor:    "#ff1744",
    })
    seriesRef.current = candleSeries

    // ── Load historical HA candles ────────────────────────────────────────
    fetch(`/api/v1/chart/candles?symbol=${symbol}&interval=${interval}&limit=300`)
      .then(r => r.json())
      .then(candles => {
        // Map DB rows to Lightweight Charts format
        const data = candles.map((c: any) => ({
          time:  Math.floor(new Date(c.open_time).getTime() / 1000) as UTCTimestamp,
          open:  parseFloat(c.ha_open),
          high:  parseFloat(c.ha_high),
          low:   parseFloat(c.ha_low),
          close: parseFloat(c.ha_close),
        }))
        candleSeries.setData(data)

        // ── Load and overlay signal markers ───────────────────────────────
        return fetch(`/api/v1/chart/signals?symbol=${symbol}&interval=${interval}`)
      })
      .then(r => r.json())
      .then(signals => {
        const markers: SeriesMarker<UTCTimestamp>[] = signals
          .filter((s: any) => s.action === "new")
          .map((s: any) => ({
            time:     Math.floor(new Date(s.bar_time).getTime() / 1000) as UTCTimestamp,
            position: s.signal_type === "buy" ? "belowBar" : "aboveBar",
            color:    s.signal_type === "buy" ? "#00e676" : "#ff1744",
            shape:    s.signal_type === "buy" ? "arrowUp"  : "arrowDown",
            text:     `${s.signal_type.toUpperCase()} ${s.confidence}%`,
          }))
        candleSeries.setMarkers(markers)
      })

    // ── Real-time candle updates via WebSocket ────────────────────────────
    // Binance WebSocket stream for live kline updates
    const streamSymbol = symbol.toLowerCase()
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${streamSymbol}@kline_${interval}`
    )
    wsRef.current = ws

    ws.onmessage = (event) => {
      const msg  = JSON.parse(event.data)
      const k    = msg.k
      if (!k.x) return  // only process closed candles

      // We can't compute HA in real-time on the frontend accurately
      // (HA depends on all previous bars). Instead, re-fetch the last candle
      // from our backend which has the correct HA values.
      fetch(`/api/v1/chart/candles?symbol=${symbol}&interval=${interval}&limit=2`)
        .then(r => r.json())
        .then(candles => {
          if (candles.length > 0) {
            const c = candles[candles.length - 1]
            candleSeries.update({
              time:  Math.floor(new Date(c.open_time).getTime() / 1000) as UTCTimestamp,
              open:  parseFloat(c.ha_open),
              high:  parseFloat(c.ha_high),
              low:   parseFloat(c.ha_low),
              close: parseFloat(c.ha_close),
            })
          }
        })
    }

    return () => {
      chart.remove()
      ws.close()
    }
  }, [symbol, interval])

  return (
    <div>
      <div ref={containerRef} />
    </div>
  )
}
```

---

## 8. Backtesting Engine

The backtesting engine runs `detect_swings()` on historical data and simulates trades.

### How It Works

```
Historical bars (e.g. 6 months of 15m candles)
         ↓
detect_swings() — same function as live signals
         ↓
For every "new" event:
    → Record as entry (use bar's ha_price as entry price)
For every "commit" event:
    → This means the PREVIOUS swing is confirmed
    → The current bar's price is the exit
    → Between entry and exit: check if SL or TP was hit first
         ↓
Calculate P&L for each completed trade
         ↓
Store in backtest_results table
```

### Backtesting Worker

```python
# backtest_worker.py

import psycopg2
import psycopg2.extras
import requests
import pandas as pd
from signal_engine import fetch_klines, to_heikin_ashi, detect_swings

DB_URL = os.getenv("DATABASE_URL")
SL_PCT = 2.5  # balanced risk
TP_PCT = 5.0

SYMBOLS   = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]   # expand as needed
INTERVALS = ["15m", "1h", "4h"]
LOOKBACK  = 10


def fetch_full_history(symbol, interval, days=180):
    """
    Fetch up to `days` of 15m candles.
    Binance limits 1000 bars per request; paginate to get full history.
    """
    all_bars = []
    end_time = None
    bars_per_request = 1000
    total_bars = (days * 24 * 60) // int(interval.replace("m","").replace("h","60"))

    while len(all_bars) < total_bars:
        params = {
            "symbol":   symbol,
            "interval": interval,
            "limit":    bars_per_request,
        }
        if end_time:
            params["endTime"] = end_time

        r = requests.get("https://api.binance.com/api/v3/klines", params=params, timeout=10)
        r.raise_for_status()
        bars = r.json()
        if not bars:
            break

        all_bars = bars + all_bars
        end_time = bars[0][0] - 1  # go further back in time

        if len(bars) < bars_per_request:
            break

    df = pd.DataFrame(all_bars, columns=[
        "open_time","open","high","low","close","volume",
        "close_time","qav","trades","tbbav","tbqav","ignore",
    ])
    for col in ("open","high","low","close"):
        df[col] = df[col].astype(float)
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    df.set_index("open_time", inplace=True)
    df = df[~df.index.duplicated()].sort_index()
    return df


def simulate_trades(df, ha, events):
    """
    Given the events from detect_swings(), simulate trades:
    - "new" event = open a position at the signal's ha_price
    - "commit" event = close the previous position
    - Between open and close: scan bars to see if SL or TP was hit first

    Returns a list of completed trade dicts.
    """
    trades = []
    open_trade = None

    highs = ha["ha_high"].values
    lows  = ha["ha_low"].values
    bar_times = ha.index.tolist()

    for ev in events:
        if ev["action"] == "new":
            # Open a new trade
            entry_price = ev["price"]
            sig_type    = "buy" if ev["type"] == "bot" else "sell"

            if sig_type == "buy":
                sl = entry_price * (1 - SL_PCT / 100)
                tp = entry_price * (1 + TP_PCT / 100)
            else:
                sl = entry_price * (1 + SL_PCT / 100)
                tp = entry_price * (1 - TP_PCT / 100)

            open_trade = {
                "signal_type":  sig_type,
                "entry_time":   ev["bar"],
                "entry_price":  entry_price,
                "sl_price":     sl,
                "tp_price":     tp,
                "bar_index":    bar_times.index(ev["bar"]) if ev["bar"] in bar_times else None,
            }

        elif ev["action"] == "commit" and open_trade:
            # Close the previous trade — but first check if SL or TP was hit
            # between the entry bar and this commit bar
            entry_bar_idx = open_trade.get("bar_index")
            commit_bar_idx = bar_times.index(ev["bar"]) if ev["bar"] in bar_times else None

            close_price  = ev["price"]
            close_reason = "signal_flip"

            if entry_bar_idx is not None and commit_bar_idx is not None:
                for i in range(entry_bar_idx + 1, commit_bar_idx + 1):
                    bar_high = highs[i]
                    bar_low  = lows[i]

                    if open_trade["signal_type"] == "buy":
                        if bar_low <= open_trade["sl_price"]:
                            close_price  = open_trade["sl_price"]
                            close_reason = "sl_hit"
                            break
                        if bar_high >= open_trade["tp_price"]:
                            close_price  = open_trade["tp_price"]
                            close_reason = "tp_hit"
                            break
                    else:  # sell
                        if bar_high >= open_trade["sl_price"]:
                            close_price  = open_trade["sl_price"]
                            close_reason = "sl_hit"
                            break
                        if bar_low <= open_trade["tp_price"]:
                            close_price  = open_trade["tp_price"]
                            close_reason = "tp_hit"
                            break

            # Calculate P&L
            if open_trade["signal_type"] == "buy":
                pnl_pct = ((close_price - open_trade["entry_price"])
                           / open_trade["entry_price"]) * 100
            else:
                pnl_pct = ((open_trade["entry_price"] - close_price)
                           / open_trade["entry_price"]) * 100

            duration = (commit_bar_idx - entry_bar_idx) if (
                entry_bar_idx and commit_bar_idx) else None

            trades.append({
                "signal_type":   open_trade["signal_type"],
                "entry_time":    open_trade["entry_time"],
                "entry_price":   open_trade["entry_price"],
                "exit_time":     ev["bar"],
                "exit_price":    round(close_price, 2),
                "sl_price":      open_trade["sl_price"],
                "tp_price":      open_trade["tp_price"],
                "close_reason":  close_reason,
                "pnl_pct":       round(pnl_pct, 4),
                "is_win":        pnl_pct > 0,
                "duration_bars": duration,
            })
            open_trade = None

    return trades


def run_backtest(symbol, interval, days=180):
    conn = psycopg2.connect(DB_URL)

    print(f"Running backtest: {symbol} {interval} ({days}d)...")
    df     = fetch_full_history(symbol, interval, days=days)
    ha     = to_heikin_ashi(df)
    events = detect_swings(ha, LOOKBACK)
    trades = simulate_trades(df, ha, events)

    period_start = df.index[0]
    period_end   = df.index[-1]

    # Clear old results for this symbol/interval
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM backtest_results WHERE symbol=%s AND interval=%s",
            (symbol, interval)
        )

    # Insert new results
    records = [(
        symbol, interval, LOOKBACK,
        period_start, period_end,
        t["signal_type"],
        t["entry_time"],   t["entry_price"],
        t["exit_time"],    t["exit_price"],
        t["sl_price"],     t["tp_price"],
        t["close_reason"], t["pnl_pct"],
        t["is_win"],       t["duration_bars"],
    ) for t in trades]

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(cur, """
            INSERT INTO backtest_results
                (symbol, interval, lookback, period_start, period_end,
                 signal_type, entry_time, entry_price,
                 exit_time, exit_price, sl_price, tp_price,
                 close_reason, pnl_pct, is_win, duration_bars)
            VALUES %s
        """, records)
        conn.commit()

    print(f"  → {len(trades)} trades stored for {symbol} {interval}")
    conn.close()


if __name__ == "__main__":
    for symbol in SYMBOLS:
        for interval in INTERVALS:
            run_backtest(symbol, interval)
```

### When to Run the Backtesting Worker

```
1. On first deployment (one-time full history run)
2. Weekly cron job to keep results fresh with recent data
3. On-demand via API endpoint (Master plan users only)

# crontab — run every Sunday at 2am UTC
0 2 * * 0 cd /app && python backtest_worker.py
```

---

## 9. Signal Log Tab

The Signal Log shows every signal ever fired, paginated, with its outcome.

### What to Display

| Column | Source | Notes |
|---|---|---|
| Date/Time | `signals.created_at` | UTC, formatted relative |
| Pair | `signals.symbol` | e.g. BTC/USDT |
| Interval | `signals.interval` | 15m / 1H / 4H |
| Type | `signals.signal_type` | BUY badge (green) / SELL badge (red) |
| Entry | `signals.entry_price` | Monospace font |
| Stop Loss | `signals.sl_price` | Red color |
| Take Profit | `signals.tp_price` | Green color |
| Status | `signals.close_reason` | Open / TP Hit / SL Hit / Signal Flip |
| Confidence | `signals.confidence` | Progress bar |

### Closing Open Signals

The signal engine needs to monitor open signals and close them when SL/TP is hit.

```python
# In signal_engine.py main loop — add this check every iteration

def check_and_close_open_signals(conn, symbol, current_price):
    """
    For each open signal (close_reason IS NULL), check if
    current price has hit the SL or TP. If so, mark it closed.
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, signal_type, entry_price, sl_price, tp_price
            FROM signals
            WHERE symbol = %s AND action = 'new' AND close_reason IS NULL
        """, (symbol,))
        open_signals = cur.fetchall()

    for sig in open_signals:
        close_reason = None
        close_price  = None

        if sig["signal_type"] == "buy":
            if current_price <= sig["sl_price"]:
                close_reason = "sl_hit"
                close_price  = sig["sl_price"]
            elif current_price >= sig["tp_price"]:
                close_reason = "tp_hit"
                close_price  = sig["tp_price"]
        else:  # sell
            if current_price >= sig["sl_price"]:
                close_reason = "sl_hit"
                close_price  = sig["sl_price"]
            elif current_price <= sig["tp_price"]:
                close_reason = "tp_hit"
                close_price  = sig["tp_price"]

        if close_reason:
            pnl = ((close_price - sig["entry_price"]) / sig["entry_price"]) * 100
            if sig["signal_type"] == "sell":
                pnl = -pnl

            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE signals
                    SET closed_at    = NOW(),
                        close_price  = %s,
                        close_reason = %s,
                        pnl_pct      = %s,
                        is_win       = %s
                    WHERE id = %s
                """, (close_price, close_reason, round(pnl, 4), pnl > 0, sig["id"]))
                conn.commit()

            # Broadcast close event to frontend
            broadcast_signal({
                "type": "signal_closed",
                "data": {
                    "signal_id":    sig["id"],
                    "close_reason": close_reason,
                    "close_price":  close_price,
                    "pnl_pct":      round(pnl, 4),
                }
            })
```

---

## 10. Performance Tab

The Performance tab shows aggregated statistics from the `backtest_results` table.

### What to Display

**Important:** Frame all performance data as historical/educational, never predictive.

```
"This shows how signals from the same engine would have performed
on historical data. Past results are not indicative of future performance."
```

### Summary Cards (top of Performance tab)

Fetch from `GET /api/v1/performance/summary`:

```
Total Signals    |   Completed Trades    |   Open Signals
─────────────────────────────────────────────────────────
4,218            |   3,810               |   1

Avg Trade Duration    |   Best Trade      |   Worst Trade
─────────────────────────────────────────────────────────
14 bars (~3.5h)       |   Fetched from DB |   Fetched from DB
```

### Monthly P&L Breakdown Chart (bar chart)

```sql
-- Aggregate completed trades by month
SELECT
    DATE_TRUNC('month', entry_time) AS month,
    COUNT(*)                         AS trades,
    SUM(pnl_pct)                     AS total_pnl,
    COUNT(*) FILTER (WHERE is_win)   AS wins
FROM backtest_results
WHERE symbol = %s AND interval = %s
GROUP BY month
ORDER BY month
```

Render as a bar chart using Recharts or Chart.js:
- Green bars for months where total_pnl > 0
- Red bars for months where total_pnl < 0
- Hover tooltip: month name, total P&L, number of trades

### Trade Distribution Chart

- Pie or donut chart: TP Hit / SL Hit / Signal Flip breakdown
- Fetch `close_reason` counts from `backtest_results`

### Signal Duration Histogram

- X-axis: duration in bars
- Y-axis: number of trades
- Shows how long signals typically run before closing

---

## 11. Deployment

### Process Management

```
Process 1: FastAPI server      → uvicorn api.main:app --port 8000
Process 2: Signal engine       → python signal_engine.py
Process 3: Backtest worker     → python backtest_worker.py (runs once, then exits)

Use supervisor, PM2, or Docker Compose to manage these.
```

### Docker Compose (recommended)

```yaml
version: "3.8"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: sanddock
      POSTGRES_USER: sanddock
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./backend
    command: uvicorn api.main:app --host 0.0.0.0 --port 8000
    environment:
      DATABASE_URL: postgresql://sanddock:${DB_PASSWORD}@db:5432/sanddock
    depends_on: [db]
    ports:
      - "8000:8000"

  signal_engine:
    build: ./backend
    command: python signal_engine.py
    environment:
      DATABASE_URL: postgresql://sanddock:${DB_PASSWORD}@db:5432/sanddock
      BINANCE_SYMBOL: BTCUSDT
      TELEGRAM_BOT_TOKEN: ${TG_TOKEN}
      TELEGRAM_CHAT_ID: ${TG_CHAT_ID}
    depends_on: [db, api]
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:8000
      NEXT_PUBLIC_WS_URL: ws://api:8000

volumes:
  pgdata:
```

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://sanddock:password@localhost:5432/sanddock
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
BINANCE_SYMBOL=BTCUSDT
LOOKBACK=10
INTERNAL_API_SECRET=random_secret_for_engine_to_api_calls

# Frontend
NEXT_PUBLIC_API_URL=https://api.sanddock.com
NEXT_PUBLIC_WS_URL=wss://api.sanddock.com
```

### Security Notes

- The Telegram bot token in the current `live-signal.py` is **hardcoded and exposed**. Move it to an environment variable immediately before any deployment.
- The internal broadcast endpoint (`/internal/broadcast`) must be protected with a secret header — it should only be callable from the signal engine process, not from the public internet.
- All `/api/v1/*` endpoints must validate the user's JWT token and check plan entitlements before returning data.
- Never expose raw Binance API calls from the frontend — always proxy through your backend.

---

## Quick Reference: Which Tab Uses Which Data

| Tab | Primary Data Source | Update Method | Key Endpoint |
|---|---|---|---|
| Live Signals | `signals` table (action='new') | WebSocket push | `GET /api/v1/signals/live` |
| HA Chart | `ohlcv_cache` table | WebSocket + polling | `GET /api/v1/chart/candles` |
| Signal Log | `signals` table (all actions) | Polling (30s) | `GET /api/v1/signals/log` |
| Performance | `backtest_results` table | Static (weekly cron) | `GET /api/v1/performance/summary` |

---

*Document: Sanddock Technical Implementation v1.0*
*For: Antigravity Development Team*