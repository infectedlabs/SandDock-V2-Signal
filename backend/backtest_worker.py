# backtest_worker.py - Pre-compute historical signal performance
# Run once on first deployment, then weekly via cron.
# Uses the same detect_swings() function as live signals for consistency.
# Never import this file from the Next.js frontend.

import os
import psycopg2
import psycopg2.extras
import requests
import pandas as pd

# Import the same functions used by the live engine
from signal_engine import to_heikin_ashi, detect_swings

DB_URL   = os.getenv("DATABASE_URL")
SL_PCT   = 2.5   # balanced risk
TP_PCT   = 5.0
LOOKBACK = 10

SYMBOLS   = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
INTERVALS = ["15m", "1h", "4h"]


# ── Fetch full historical OHLCV from Binance (paginated) ──────────────────────
def fetch_full_history(symbol, interval, days=180):
    """
    Fetch up to `days` of candles from Binance.
    Paginates in blocks of 1000 bars since Binance limits per request.
    """
    all_bars = []
    end_time = None
    bars_per_request = 1000

    interval_minutes = int(interval.replace("m", "").replace("h", "")) * (
        60 if interval.endswith("h") else 1
    )
    total_bars = (days * 24 * 60) // interval_minutes

    while len(all_bars) < total_bars:
        params = {
            "symbol":   symbol,
            "interval": interval,
            "limit":    bars_per_request,
        }
        if end_time:
            params["endTime"] = end_time

        r = requests.get(
            "https://api.binance.com/api/v3/klines",
            params=params,
            timeout=10,
        )
        r.raise_for_status()
        bars = r.json()
        if not bars:
            break

        all_bars = bars + all_bars
        end_time = bars[0][0] - 1  # go further back in time

        if len(bars) < bars_per_request:
            break

    df = pd.DataFrame(all_bars, columns=[
        "open_time", "open", "high", "low", "close", "volume",
        "close_time", "qav", "trades", "tbbav", "tbqav", "ignore",
    ])
    for col in ("open", "high", "low", "close"):
        df[col] = df[col].astype(float)
    df["volume"] = df["volume"].astype(float)
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    df.set_index("open_time", inplace=True)
    df = df[~df.index.duplicated()].sort_index()
    return df


# ── Simulate trades from signal events ────────────────────────────────────────
def simulate_trades(df, ha, events):
    """
    Replays detect_swings() events on historical data to simulate P&L:
    - 'new' event  → open a position
    - 'commit' event → close the previous position
    - Between open and close: check bar-by-bar if SL or TP was hit first
    """
    trades     = []
    open_trade = None

    highs      = ha["ha_high"].values
    lows       = ha["ha_low"].values
    bar_times  = ha.index.tolist()

    for ev in events:
        if ev["action"] == "new":
            entry_price = ev["price"]
            sig_type    = "buy" if ev["type"] == "bot" else "sell"

            if sig_type == "buy":
                sl = entry_price * (1 - SL_PCT / 100)
                tp = entry_price * (1 + TP_PCT / 100)
            else:
                sl = entry_price * (1 + SL_PCT / 100)
                tp = entry_price * (1 - TP_PCT / 100)

            open_trade = {
                "signal_type": sig_type,
                "entry_time":  ev["bar"],
                "entry_price": entry_price,
                "sl_price":    sl,
                "tp_price":    tp,
                "bar_index":   bar_times.index(ev["bar"]) if ev["bar"] in bar_times else None,
            }

        elif ev["action"] == "commit" and open_trade:
            entry_bar_idx  = open_trade.get("bar_index")
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
                    else:
                        if bar_high >= open_trade["sl_price"]:
                            close_price  = open_trade["sl_price"]
                            close_reason = "sl_hit"
                            break
                        if bar_low <= open_trade["tp_price"]:
                            close_price  = open_trade["tp_price"]
                            close_reason = "tp_hit"
                            break

            if open_trade["signal_type"] == "buy":
                pnl_pct = ((close_price - open_trade["entry_price"]) / open_trade["entry_price"]) * 100
            else:
                pnl_pct = ((open_trade["entry_price"] - close_price) / open_trade["entry_price"]) * 100

            duration = (commit_bar_idx - entry_bar_idx) if (
                entry_bar_idx is not None and commit_bar_idx is not None) else None

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


# ── Run backtest for one symbol/interval and store results ─────────────────────
def run_backtest(symbol, interval, days=180):
    conn = psycopg2.connect(DB_URL)
    print(f"Running backtest: {symbol} {interval} ({days}d)...")

    df     = fetch_full_history(symbol, interval, days=days)
    ha     = to_heikin_ashi(df)
    events = detect_swings(ha, LOOKBACK)
    trades = simulate_trades(df, ha, events)

    period_start = df.index[0]
    period_end   = df.index[-1]

    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM backtest_results WHERE symbol=%s AND interval=%s",
            (symbol, interval)
        )

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

    if records:
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
