# signal_engine.py
# Runs swing detection in-memory, monitors SL hits, and sends alerts to Telegram.
# Run as a standalone background process: python signal_engine.py

import os
import uuid
import time
import logging
import requests
import pandas as pd
import redis
import psycopg2
import json
from datetime import datetime, timezone

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG  — edit here or set environment variables
# ──────────────────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = "7537318580:AAGxtZh4h4BlgHw-HTdkmdfLfGU3-zzFGWw"
TELEGRAM_CHAT_ID   = "1412689228"
BINANCE_SYMBOL     = os.getenv("BINANCE_SYMBOL", "BTCUSDT")
LOOKBACK           = int(os.getenv("LOOKBACK",   "10"))
INTERVAL           = "15m"   # Binance kline interval
POLL_SECONDS       = 15      # how often to check for new closed bar / SL hit
TRADING_STYLE      = os.getenv("TRADING_STYLE", "Intraday")

# Trading style config
_STYLE_CONFIG = {
    "Scalp":    {"atr_mult": 1.0, "tp1_mult": 0.5, "tp2_mult": 1.0},
    "Intraday": {"atr_mult": 1.5, "tp1_mult": 2.0, "tp2_mult": 4.0},
    "Swing":    {"atr_mult": 2.0, "tp1_mult": 2.5, "tp2_mult": 5.0},
}
_cfg      = _STYLE_CONFIG.get(TRADING_STYLE, _STYLE_CONFIG["Intraday"])
ATR_MULT  = _cfg["atr_mult"]
TP1_MULT  = _cfg["tp1_mult"]
TP2_MULT  = _cfg["tp2_mult"]

BINANCE_REST = "https://api.binance.com/api/v3/klines"

# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Telegram helpers
# ──────────────────────────────────────────────────────────────────────────────

def tg_send(text: str) -> int | None:
    """Send a message; returns message_id on success."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    r = requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": text}, timeout=10)
    if r.ok:
        msg_id = r.json()["result"]["message_id"]
        log.info("TG sent  msg_id=%s  %s", msg_id, text.replace("\n", " | "))
        return msg_id
    log.error("TG send failed: %s", r.text)
    return None

def tg_edit(message_id: int, text: str) -> bool:
    """Edit an existing message (slide behaviour)."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText"
    r = requests.post(
        url,
        json={"chat_id": TELEGRAM_CHAT_ID, "message_id": message_id, "text": text},
        timeout=10,
    )
    if r.ok:
        log.info("TG edit  msg_id=%s  %s", message_id, text.replace("\n", " | "))
        return True
    log.error("TG edit failed: %s", r.text)
    return False

# ──────────────────────────────────────────────────────────────────────────────
# Redis & DB helpers replacing REST API
# ──────────────────────────────────────────────────────────────────────────────

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def get_db():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def fetch_klines_from_db(symbol: str, interval: str, limit: int = 200) -> pd.DataFrame:
    """Read historical candles from ohlcv_cache instead of Binance REST API."""
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT open_time, open, high, low, close, volume,
                       ha_open, ha_high, ha_low, ha_close
                FROM ohlcv_cache
                WHERE symbol = %s AND interval = %s
                ORDER BY open_time DESC
                LIMIT %s
            """, (symbol, interval, limit))
            rows = cur.fetchall()
        conn.close()
        
        if not rows:
            return pd.DataFrame()
            
        df = pd.DataFrame(reversed(rows), columns=[
            "open_time", "open", "high", "low", "close", "volume",
            "ha_open", "ha_high", "ha_low", "ha_close"
        ])
        df["open_time"] = pd.to_datetime(df["open_time"], utc=True)
        df.set_index("open_time", inplace=True)
        return df
    except Exception as e:
        log.error(f"Error fetching klines from DB: {e}")
        return pd.DataFrame()

def fetch_live_price(symbol: str) -> float:
    """Read the latest mark price from Redis cache instead of Binance REST API."""
    try:
        val = redis_client.get(f"price:{symbol}")
        if val is not None:
            return float(val)
    except Exception as e:
        log.error(f"Error reading live price from Redis: {e}")
    # Fallback to REST API if Redis is down
    try:
        r = requests.get(
            f"https://fapi.binance.com/fapi/v1/ticker/price",
            params={"symbol": symbol},
            timeout=5,
        )
        if r.ok:
            return float(r.json()["price"])
    except Exception:
        pass
    return 0.0

# ──────────────────────────────────────────────────────────────────────────────
# Heikin Ashi conversion
# ──────────────────────────────────────────────────────────────────────────────

def to_heikin_ashi(df: pd.DataFrame) -> pd.DataFrame:
    ha = df[["open", "high", "low", "close"]].copy()
    ha["ha_close"] = (df["open"] + df["high"] + df["low"] + df["close"]) / 4

    ha_open = [0.0] * len(df)
    ha_open[0] = (df["open"].iloc[0] + df["close"].iloc[0]) / 2
    for i in range(1, len(df)):
        ha_open[i] = (ha_open[i - 1] + ha["ha_close"].iloc[i - 1]) / 2

    ha["ha_open"] = ha_open
    ha["ha_high"] = df[["high"]].join(ha[["ha_open", "ha_close"]]).max(axis=1)
    ha["ha_low"]  = df[["low"]].join(ha[["ha_open", "ha_close"]]).min(axis=1)
    return ha

# ──────────────────────────────────────────────────────────────────────────────
# Swing detection (mirrors Pine Script left-side logic)
# ──────────────────────────────────────────────────────────────────────────────

def detect_swings(
    ha: pd.DataFrame,
    lookback: int,
    atr_mult: float,
    tp1_mult: float,
    tp2_mult: float,
) -> list[dict]:
    highs  = ha["ha_high"].values
    lows   = ha["ha_low"].values
    closes = ha["ha_close"].values
    n      = len(highs)
    win    = lookback + 1

    # ── ATR(14) on HA series ──────────────────────
    tr_arr = [0.0] * n
    for k in range(1, n):
        tr_arr[k] = max(
            highs[k] - lows[k],
            abs(highs[k] - closes[k - 1]),
            abs(lows[k]  - closes[k - 1]),
        )
    atr_arr  = [0.0] * n
    period   = 14
    if n >= period:
        atr_arr[period - 1] = sum(tr_arr[:period]) / period
        for k in range(period, n):
            atr_arr[k] = (atr_arr[k - 1] * (period - 1) + tr_arr[k]) / period

    last_confirmed_high: float | None = None
    last_confirmed_low:  float | None = None

    events = []

    active_state  = 0
    active_price  = None
    active_bar    = None
    has_commit    = False
    commit_price  = None

    pending_type  = None
    pending_price = None

    for i in range(n):
        lo = max(0, i - lookback)
        window_high = max(highs[lo: i + 1])
        window_low  = min(lows[lo: i + 1])
        window_size = i - lo + 1

        raw_top = highs[i] == window_high and window_size == win
        raw_bot = lows[i]  == window_low  and window_size == win

        is_top = raw_top and not (raw_top and raw_bot and active_state == 1)
        is_bot = raw_bot and not (raw_top and raw_bot and active_state == 2)
        if raw_top and raw_bot and active_state == 0:
            is_bot = False

        # ── PROCESS TOP ──────────────────────────────────────────────────────
        if is_top:
            if active_state == 2:
                if has_commit:
                    events.append({
                        "bar":       ha.index[active_bar],
                        "type":      "bot",
                        "price":     active_price,
                        "action":    "commit",
                        "sl_price":  None,
                        "tp1_price": None,
                        "tp2_price": None,
                        "ha_high":   highs[active_bar],
                        "ha_low":    lows[active_bar],
                    })
                has_commit    = True
                commit_price  = active_price
                active_price  = None
                active_bar    = None
                active_state  = 1
                pending_type  = None
                pending_price = None

                last_confirmed_low = commit_price

            elif active_state == 0:
                active_state = 1

            if active_state == 1:
                cur_atr = atr_arr[i]
                sl = round(highs[i] + cur_atr * atr_mult, 2) if cur_atr > 0 else round(highs[i], 2)

                entry  = closes[i]
                risk   = abs(entry - sl)
                tp1    = round(entry - risk * tp1_mult, 2)
                tp2    = round(entry - risk * tp2_mult, 2)

                last_confirmed_high = highs[i]

                action = "slide" if (pending_type == "top" and pending_price is not None) else "new"
                events.append({
                    "bar":       ha.index[i],
                    "type":      "top",
                    "price":     highs[i],
                    "action":    action,
                    "sl_price":  sl,
                    "tp1_price": tp1,
                    "tp2_price": tp2,
                    "ha_high":   highs[i],
                    "ha_low":    lows[i],
                })
                pending_type  = "top"
                pending_price = highs[i]
                active_price  = highs[i]
                active_bar    = i

                if not has_commit:
                    has_commit   = True
                    commit_price = highs[i]

        # ── PROCESS BOTTOM ───────────────────────────────────────────────────
        if is_bot:
            if active_state == 1:
                if has_commit:
                    events.append({
                        "bar":       ha.index[active_bar],
                        "type":      "top",
                        "price":     active_price,
                        "action":    "commit",
                        "sl_price":  None,
                        "tp1_price": None,
                        "tp2_price": None,
                        "ha_high":   highs[active_bar],
                        "ha_low":    lows[active_bar],
                    })
                has_commit    = True
                commit_price  = active_price
                active_price  = None
                active_bar    = None
                active_state  = 2
                pending_type  = None
                pending_price = None

                last_confirmed_high = commit_price

            elif active_state == 0:
                active_state = 2

            if active_state == 2:
                cur_atr = atr_arr[i]
                sl = round(lows[i] - cur_atr * atr_mult, 2) if cur_atr > 0 else round(lows[i], 2)

                entry  = closes[i]
                risk   = abs(entry - sl)
                tp1    = round(entry + risk * tp1_mult, 2)
                tp2    = round(entry + risk * tp2_mult, 2)

                last_confirmed_low = lows[i]

                action = "slide" if (pending_type == "bot" and pending_price is not None) else "new"
                events.append({
                    "bar":       ha.index[i],
                    "type":      "bot",
                    "price":     lows[i],
                    "action":    action,
                    "sl_price":  sl,
                    "tp1_price": tp1,
                    "tp2_price": tp2,
                    "ha_high":   highs[i],
                    "ha_low":    lows[i],
                })
                pending_type  = "bot"
                pending_price = lows[i]
                active_price  = lows[i]
                active_bar    = i

                if not has_commit:
                    has_commit   = True
                    commit_price = lows[i]

    return events

# ──────────────────────────────────────────────────────────────────────────────
# Alert formatters
# ──────────────────────────────────────────────────────────────────────────────

def format_alert(
    symbol: str,
    signal_type: str,
    live_price: float,
    bar_time: datetime,
    sl_price: float | None,
    tp1_price: float | None = None,
    tp2_price: float | None = None,
) -> str:
    ts   = bar_time.strftime("%Y-%m-%d %H:%M UTC")
    side = "🟢 Buy" if signal_type == "bot" else "🔴 Sell"
    lines = [
        f"{side} @ {live_price:.2f}",
        f"{symbol} · 15m HA · {ts}",
    ]
    if sl_price is not None:
        lines.append(f"⛔ SL:  {sl_price:.2f}")
    if tp1_price is not None:
        lines.append(f"🎯 TP1: {tp1_price:.2f}")
    if tp2_price is not None:
        lines.append(f"🏆 TP2: {tp2_price:.2f}")
    return "\n".join(lines)

def format_sl_hit(
    symbol: str,
    signal_type: str,
    entry_price: float,
    sl_price: float,
    hit_price: float,
) -> str:
    side      = "Buy" if signal_type == "bot" else "Sell"
    direction = "rose above" if signal_type == "bot" else "fell below"
    loss      = abs(hit_price - entry_price)
    return (
        f"🚨 SL HIT — {side} trade stopped out!\n"
        f"{symbol} · 15m HA\n"
        f"Entry : {entry_price:.2f}\n"
        f"SL    : {sl_price:.2f}\n"
        f"Price {direction} SL → {hit_price:.2f}\n"
        f"Loss  ≈ {loss:.2f} pts"
    )

def format_flip_close(
    symbol: str,
    signal_type: str,
    entry_price: float,
    close_price: float,
) -> str:
    side  = "Buy" if signal_type == "bot" else "Sell"
    pnl   = (close_price - entry_price) if signal_type == "bot" else (entry_price - close_price)
    emoji = "✅" if pnl >= 0 else "❌"
    return (
        f"🔄 {side} trade closed — direction flip\n"
        f"{symbol} · 15m HA\n"
        f"Entry : {entry_price:.2f}\n"
        f"Close : {close_price:.2f}\n"
        f"{emoji} PnL  ≈ {pnl:+.2f} pts"
    )

# ──────────────────────────────────────────────────────────────────────────────
# Main loop
# ──────────────────────────────────────────────────────────────────────────────

def main():
    log.info("Signal engine starting (event-driven mode)...")

    # Seed initial state from DB
    df_seed = fetch_klines_from_db(BINANCE_SYMBOL, INTERVAL, limit=200)
    if not df_seed.empty:
        log.info("Candle engine initialized with %d bars from DB.", len(df_seed))
        startup_watermark = df_seed.index[-1]
    else:
        log.warning("No DB history found. Waiting for first stream event to start...")
        startup_watermark = datetime.now(timezone.utc)

    pending_tg_id:    int | None      = None
    pending_sig_type: str | None      = None   # "top" or "bot"

    # Active trade / SL tracking
    active_sl_price:    float | None  = None
    active_entry_price: float | None  = None
    active_trade_type:  str | None    = None   # "top" or "bot"
    sl_already_hit:     bool          = False

    last_processed_close: datetime = startup_watermark

    while True:
        try:
            # Listen to Redis channels instead of polling
            pubsub = redis_client.pubsub()
            pubsub.subscribe("signal_engine:trigger", f"price:{BINANCE_SYMBOL}")
            log.info("Subscribed to Redis channels 'signal_engine:trigger' and 'price:%s'", BINANCE_SYMBOL)

            for message in pubsub.listen():
                if message["type"] != "message":
                    continue

                channel = message["channel"]
                data_raw = message["data"]

                try:
                    # ── 1. Check live price against active SL (real-time price updates) ──
                    if channel == f"price:{BINANCE_SYMBOL}":
                        if active_sl_price is not None and not sl_already_hit:
                            try:
                                price_data = json.loads(data_raw)
                                live = float(price_data["price"])
                                
                                sl_hit = (
                                    (active_trade_type == "bot" and live <= active_sl_price)
                                    or
                                    (active_trade_type == "top" and live >= active_sl_price)
                                )

                                if sl_hit:
                                    safe_entry = active_entry_price if active_entry_price is not None else active_sl_price
                                    msg = format_sl_hit(
                                        BINANCE_SYMBOL,
                                        active_trade_type,
                                        safe_entry,
                                        active_sl_price,
                                        live,
                                    )
                                    tg_send(msg)
                                    log.warning(
                                        "SL HIT  type=%s  entry=%.2f  sl=%.2f  price=%.2f",
                                        active_trade_type, safe_entry,
                                        active_sl_price, live,
                                    )
                                    
                                    sl_already_hit     = True
                                    active_sl_price    = None
                                    active_entry_price = None
                                    active_trade_type  = None

                            except Exception as exc:
                                log.warning("Real-time SL check failed: %s", exc)
                        continue

                    # ── 2. Run swing detection on trigger (candle close events) ──────────
                    if channel == "signal_engine:trigger":
                        trigger = json.loads(data_raw)
                        symbol = trigger["symbol"]
                        interval = trigger["interval"]

                        if symbol != BINANCE_SYMBOL or interval != INTERVAL:
                            continue

                        df = fetch_klines_from_db(symbol, interval, limit=200)
                        if df.empty:
                            continue

                        events = detect_swings(df, LOOKBACK, ATR_MULT, TP1_MULT, TP2_MULT)

                        if not events:
                            continue

                        new_events = [e for e in events if e["bar"] > last_processed_close]

                        for ev in new_events:
                            sig_type  = ev["type"]
                            price     = ev["price"]
                            bar_time  = ev["bar"]
                            action    = ev["action"]
                            sl_price  = ev["sl_price"]
                            tp1_price = ev.get("tp1_price")
                            tp2_price = ev.get("tp2_price")

                            live_price = fetch_live_price(BINANCE_SYMBOL)
                            log.info("Swing event: %s %s @ %.2f (action=%s)", sig_type.upper(), BINANCE_SYMBOL, live_price, action)

                            # Telegram alerts logic
                            text = format_alert(BINANCE_SYMBOL, sig_type, live_price, bar_time,
                                                sl_price, tp1_price, tp2_price)

                            if action == "new":
                                msg_id = tg_send(text)
                                pending_tg_id    = msg_id
                                pending_sig_type = sig_type

                                # Arm SL monitoring
                                active_sl_price    = sl_price
                                active_entry_price = live_price
                                active_trade_type  = sig_type
                                sl_already_hit     = False
                                log.info(
                                    "SL armed  type=%s  entry=%.2f  sl=%.2f  tp1=%.2f  tp2=%.2f",
                                    sig_type, live_price, sl_price or 0,
                                    tp1_price or 0, tp2_price or 0,
                                )

                            elif action == "slide":
                                if pending_tg_id and pending_sig_type == sig_type:
                                    tg_edit(pending_tg_id, text)
                                else:
                                    msg_id = tg_send(text)
                                    pending_tg_id    = msg_id
                                    pending_sig_type = sig_type

                                if sl_price is not None:
                                    active_sl_price   = sl_price
                                    active_trade_type = sig_type
                                    sl_already_hit    = False
                                    if active_entry_price is None:
                                        active_entry_price = live_price

                            elif action == "commit":
                                if (
                                    active_trade_type is not None
                                    and active_entry_price is not None
                                    and not sl_already_hit
                                ):
                                    flip_live = fetch_live_price(BINANCE_SYMBOL)
                                    flip_text = format_flip_close(
                                        BINANCE_SYMBOL,
                                        active_trade_type,
                                        active_entry_price,
                                        flip_live,
                                    )
                                    tg_send(flip_text)
                                    log.info(
                                        "Trade closed (flip)  type=%s  entry=%.2f  close=%.2f",
                                        active_trade_type, active_entry_price, flip_live,
                                    )
                                
                                pending_tg_id      = None
                                pending_sig_type   = None
                                active_sl_price    = None
                                active_entry_price = None
                                active_trade_type  = None
                                sl_already_hit     = False

                            if bar_time > last_processed_close:
                                last_processed_close = bar_time

                except Exception as exc:
                    log.exception("Unexpected error in signal engine event loop: %s", exc)
                    
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as exc:
            log.error("Redis connection error: %s. Retrying subscription in 5 seconds...", exc)
            time.sleep(5)


if __name__ == "__main__":
    main()
