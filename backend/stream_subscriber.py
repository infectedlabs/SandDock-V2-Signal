# stream_subscriber.py
# Persistent background process managing the Binance Futures WebSocket connection
# Feeds Redis caching, Pub/Sub channels, and PostgreSQL DB storage

import asyncio
import json
import logging
import os
import requests
import websockets
import redis.asyncio as aioredis
import psycopg2
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
REDIS_URL  = os.getenv("REDIS_URL", "redis://localhost:6379")
DB_URL     = os.getenv("DATABASE_URL")

# List of active symbols
SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "SOLUSDT", 
    "TRXUSDT", "DOGEUSDT", "HBARUSDT", "UNIUSDT", "SUIUSDT", 
    "AVAXUSDT", "AAVEUSDT", "JUPUSDT", "PUMPUSDT", "ARBUSDT"
]
INTERVALS = ["15m", "1h", "4h"]

SUBSCRIPTIONS = [(sym, tf) for sym in SYMBOLS for tf in INTERVALS]

def build_stream_url():
    streams = []
    # Kline streams
    for symbol, interval in SUBSCRIPTIONS:
        streams.append(f"{symbol.lower()}@kline_{interval}")
    # Mark price streams for real-time ticker prices
    for symbol in SYMBOLS:
        streams.append(f"{symbol.lower()}@markPrice")
    return "wss://fstream.binance.com/market/stream?streams=" + "/".join(streams)

# ── Heikin Ashi helpers ───────────────────────────────────────────────────────
async def compute_ha(symbol, interval, candle, redis_client):
    prev_key = f"ha:prev:{symbol}:{interval}"
    prev_raw = await redis_client.get(prev_key)

    if prev_raw:
        prev = json.loads(prev_raw)
        ha_open = (prev["ha_open"] + prev["ha_close"]) / 2
    else:
        # Initial fallback
        ha_open = (candle["open"] + candle["close"]) / 2

    ha_close = (candle["open"] + candle["high"] + candle["low"] + candle["close"]) / 4
    ha_high  = max(candle["high"], ha_open, ha_close)
    ha_low   = min(candle["low"],  ha_open, ha_close)

    ha = {
        "ha_open":  round(ha_open,  8),
        "ha_high":  round(ha_high,  8),
        "ha_low":   round(ha_low,   8),
        "ha_close": round(ha_close, 8),
    }

    if candle["is_closed"]:
        await redis_client.set(prev_key, json.dumps(ha))

    return ha

# ── REST klines fetching for bootstrapping ─────────────────────────────────────
def get_interval_minutes(interval):
    num = int(interval[:-1])
    if interval.endswith('m'): return num
    if interval.endswith('h'): return num * 60
    return 15

def fetch_rest_candles(symbol, interval, limit=1000):
    binance_interval = interval.toLowerCase() if hasattr(interval, 'toLowerCase') else interval.lower()
    url = f"https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval={binance_interval}&limit={limit}"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    rows = r.json()
    return [{
        "open_time":  r[0],
        "open":       float(r[1]),
        "high":       float(r[2]),
        "low":        float(r[3]),
        "close":      float(r[4]),
        "volume":     float(r[5]),
        "is_closed":  True,
    } for r in rows]

def compute_ha_list(candles):
    ha = []
    if not candles:
        return ha
    prev_open = (candles[0]["open"] + candles[0]["close"]) / 2
    for c in candles:
        ha_close = (c["open"] + c["high"] + c["low"] + c["close"]) / 4
        ha_open = (prev_open + (ha[-1]["ha_close"] if ha else prev_open)) / 2
        ha_high = max(c["high"], ha_open, ha_close)
        ha_low = min(c["low"],  ha_open, ha_close)
        
        ha.append({
            **c,
            "ha_open":  round(ha_open, 8),
            "ha_high":  round(ha_high, 8),
            "ha_low":   round(ha_low, 8),
            "ha_close": round(ha_close, 8),
        })
        prev_open = ha_open
    return ha

def store_candles_in_db(symbol, interval, ha_candles, db_conn):
    with db_conn.cursor() as cur:
        records = []
        for c in ha_candles:
            open_time = datetime.fromtimestamp(c["open_time"] / 1000, tz=timezone.utc)
            records.append((
                symbol, interval, open_time,
                c["open"], c["high"], c["low"], c["close"], c["volume"],
                c["ha_open"], c["ha_high"], c["ha_low"], c["ha_close"]
            ))
            
        psycopg2.extras.execute_values(cur, """
            INSERT INTO ohlcv_cache
                (symbol, interval, open_time,
                 open, high, low, close, volume,
                 ha_open, ha_high, ha_low, ha_close)
            VALUES %s
            ON CONFLICT (symbol, interval, open_time) DO UPDATE SET
                ha_open  = EXCLUDED.ha_open,
                ha_high  = EXCLUDED.ha_high,
                ha_low   = EXCLUDED.ha_low,
                ha_close = EXCLUDED.ha_close,
                close    = EXCLUDED.close,
                volume   = EXCLUDED.volume
        """, records)
        db_conn.commit()

# ── Self-Bootstrapping History ────────────────────────────────────────────────
def bootstrap_history(db_conn):
    log.info("Starting historical data self-bootstrapping...")
    for symbol, interval in SUBSCRIPTIONS:
        try:
            with db_conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM ohlcv_cache WHERE symbol=%s AND interval=%s",
                    (symbol, interval)
                )
                count = cur.fetchone()[0]
                
            if count < 500:
                log.info(f"Seeding {symbol} {interval} history (current count: {count})...")
                candles = fetch_rest_candles(symbol, interval, limit=1000)
                ha_candles = compute_ha_list(candles)
                store_candles_in_db(symbol, interval, ha_candles, db_conn)
                log.info(f"Successfully bootstrapped {len(ha_candles)} candles for {symbol} {interval}.")
            else:
                log.info(f"Skipping bootstrap for {symbol} {interval} (already has {count} candles).")
        except Exception as e:
            log.error(f"Failed to bootstrap history for {symbol} {interval}: {e}")
    log.info("Bootstrapping phase complete.")

# ── Handle incoming messages ──────────────────────────────────────────────────
async def handle_kline(data, redis_client, db_conn):
    k = data["k"]
    symbol    = k["s"]
    interval  = k["i"]
    is_closed = k["x"]

    candle = {
        "open_time":  k["t"],
        "open":       float(k["o"]),
        "high":       float(k["h"]),
        "low":        float(k["l"]),
        "close":      float(k["c"]),
        "volume":     float(k["v"]),
        "is_closed":  is_closed,
    }

    ha = await compute_ha(symbol, interval, candle, redis_client)

    # Cache the latest open/closed candle in Redis for instant WebSocket load
    current_key = f"candle:current:{symbol}:{interval}"
    payload = {**candle, **ha, "symbol": symbol, "interval": interval}
    await redis_client.setex(current_key, 90, json.dumps(payload))

    # Publish kline update to subscribers
    await redis_client.publish(f"chart:{symbol}:{interval}", json.dumps({
        "type":      "candle_update",
        "symbol":    symbol,
        "interval":  interval,
        "time":      k["t"] // 1000,
        "open":      ha["ha_open"],
        "high":      ha["ha_high"],
        "low":       ha["ha_low"],
        "close":     ha["ha_close"],
        "volume":    candle["volume"],
        "is_closed": is_closed,
    }))

    if is_closed:
        # Save closed candle to database cache
        open_time = datetime.fromtimestamp(candle["open_time"] / 1000, tz=timezone.utc)
        with db_conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ohlcv_cache
                    (symbol, interval, open_time,
                     open, high, low, close, volume,
                     ha_open, ha_high, ha_low, ha_close)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (symbol, interval, open_time) DO UPDATE SET
                    ha_open  = EXCLUDED.ha_open,
                    ha_high  = EXCLUDED.ha_high,
                    ha_low   = EXCLUDED.ha_low,
                    ha_close = EXCLUDED.ha_close,
                    close    = EXCLUDED.close,
                    volume   = EXCLUDED.volume
            """, (
                symbol, interval, open_time,
                candle["open"], candle["high"], candle["low"],
                candle["close"], candle["volume"],
                ha["ha_open"], ha["ha_high"], ha["ha_low"], ha["ha_close"],
            ))
            db_conn.commit()

        # Publish a trigger to the signal engine to recalculate
        await redis_client.publish("signal_engine:trigger", json.dumps({
            "symbol":   symbol,
            "interval": interval,
        }))
        log.info(f"Persisted closed candle and triggered signal engine: {symbol} {interval}")

async def handle_mark_price(data, redis_client):
    symbol = data["s"]
    price  = float(data["p"])

    # Cache mark price in Redis
    await redis_client.setex(f"price:{symbol}", 30, str(price))

    # Publish price ticks in real-time
    await redis_client.publish(f"price:{symbol}", json.dumps({
        "type":   "price_tick",
        "symbol": symbol,
        "price":  price,
        "time":   data["T"],
    }))

# ── Main Loop ─────────────────────────────────────────────────────────────────
async def run():
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    
    # Wait/retry for Redis connection to be available
    while True:
        try:
            await redis_client.ping()
            log.info("Successfully connected to Redis.")
            break
        except Exception as e:
            log.error(f"Cannot connect to Redis at {REDIS_URL}. Retrying in 5s... Error: {e}")
            await asyncio.sleep(5)
    
    log.info("Connecting to Database...")
    db_conn = psycopg2.connect(DB_URL)
    db_conn.autocommit = True
    
    # Run historical data bootstrap
    bootstrap_history(db_conn)
    
    # Always seed Heikin Ashi cache in Redis from database on startup
    log.info("Seeding Heikin Ashi previous closed candle cache from database...")
    for symbol, interval in SUBSCRIPTIONS:
        prev_key = f"ha:prev:{symbol}:{interval}"
        with db_conn.cursor() as cur:
            cur.execute("""
                SELECT ha_open, ha_close 
                FROM ohlcv_cache 
                WHERE symbol = %s AND interval = %s 
                ORDER BY open_time DESC 
                LIMIT 1
            """, (symbol, interval))
            row = cur.fetchone()
        if row:
            ha = {"ha_open": float(row[0]), "ha_close": float(row[1])}
            await redis_client.set(prev_key, json.dumps(ha))
    log.info("Finished seeding Heikin Ashi previous closed candle cache.")
    
    stream_url = build_stream_url()
    log.info(f"Connecting to Binance Futures WebSocket URL: {stream_url}")

    message_count = 0
    while True:
        try:
            async with websockets.connect(
                stream_url,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=5,
            ) as ws:
                log.info("Binance Futures WebSocket stream connected successfully.")

                async for raw_msg in ws:
                    try:
                        message_count += 1
                        if message_count % 100 == 0:
                            log.info(f"Binance stream active. Processed {message_count} messages.")

                        msg = json.loads(raw_msg)
                        data = msg.get("data", msg)
                        event_type = data.get("e")

                        if event_type == "kline":
                            await handle_kline(data, redis_client, db_conn)
                        elif event_type == "markPriceUpdate":
                            await handle_mark_price(data, redis_client)

                    except Exception as e:
                        log.error(f"Error handling message: {e}")
                        continue

        except Exception as e:
            log.error(f"WebSocket disconnected: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    import psycopg2.extras
    asyncio.run(run())
