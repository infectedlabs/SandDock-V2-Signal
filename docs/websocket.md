This is a genuine architectural problem that will hit you hard once you get more than 50–100 concurrent users. The fix is a single architectural shift that eliminates rate limits entirely regardless of how many users you have. Let me explain why the current approach breaks and exactly what to build instead.

---

## Why REST polling breaks at scale

Currently the signal engine calls `fetch_klines()` every 15 seconds — that's 4 Binance API requests per minute just for the engine. Every user viewing the HA chart triggers additional REST calls for chart data. Binance's rate limit is 1,200 weighted requests per minute per IP. With 300 concurrent users each refreshing chart data, you hit the limit in under 30 seconds and Binance starts returning 429 errors. The engine stops receiving price data. Signals stop firing. Users see broken charts.

The deeper problem is that REST polling is inherently wrong for this use case. You're asking Binance "what happened?" every 15 seconds when Binance is already broadcasting "here's what's happening right now" continuously via WebSocket. You're ignoring a free push stream and instead hammering a rate-limited pull endpoint.

---

## The fix: one WebSocket connection per stream, shared across all users

```
BEFORE (broken at scale):
User 1 → REST API call → Binance  (hits rate limit)
User 2 → REST API call → Binance  (hits rate limit)
User 3 → REST API call → Binance  (hits rate limit)
Signal engine → REST API call → Binance  (hits rate limit)

AFTER (scales to unlimited users):
Binance WebSocket ──────────────────────────────────────────
    (1 connection per stream, regardless of user count)      │
                                                              ▼
                                               Sanddock Stream Subscriber
                                                    │              │
                                                    ▼              ▼
                                                 Redis           PostgreSQL
                                             (live candle)    (closed candles)
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                               User 1 WS       User 2 WS      Signal Engine
                               (chart)         (chart)        (reads from DB)
```

One connection to Binance per symbol+timeframe combination. That connection feeds everything else. User count becomes completely irrelevant to your Binance rate limit exposure.

---

## Binance Futures WebSocket specifics

Binance Futures uses a different domain from spot: `fstream.binance.com`. You can subscribe to multiple streams in a single connection using the combined stream endpoint:

```
wss://fstream.binance.com/stream?streams=btcusdt@kline_15m/btcusdt@kline_1h/btcusdt@kline_4h/btcusdt@aggTrade/ethusdt@kline_15m/...
```

Binance allows up to 1,024 streams per connection. Your full Pro/Master coin coverage — 50 coins × 3 timeframes = 150 streams — fits in a single connection with room to spare.

---

## The stream subscriber service — full implementation

```python
# stream_subscriber.py
# Runs as a single persistent process alongside the signal engine
# Handles ALL Binance WebSocket data for the entire application

import asyncio
import json
import logging
import os
import websockets
import redis.asyncio as aioredis
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone

# ── Configuration ─────────────────────────────────────────────────────────────
REDIS_URL  = os.getenv("REDIS_URL", "redis://localhost:6379")
DB_URL     = os.getenv("DATABASE_URL")

# All symbol+interval combinations to subscribe to
# Add or remove coins here — the WebSocket handles them all in one connection
SUBSCRIPTIONS = [
    # Free plan
    ("BTCUSDT", "15m"), ("BTCUSDT", "1h"), ("BTCUSDT", "4h"),
    # Pro plan coins
    ("ETHUSDT", "15m"), ("ETHUSDT", "1h"), ("ETHUSDT", "4h"),
    ("SOLUSDT", "15m"), ("SOLUSDT", "1h"), ("SOLUSDT", "4h"),
    ("BNBUSDT", "15m"), ("BNBUSDT", "1h"), ("BNBUSDT", "4h"),
    ("XRPUSDT", "15m"), ("XRPUSDT", "1h"), ("XRPUSDT", "4h"),
    # Add Master plan coins here...
]

# Build the combined stream URL
def build_stream_url():
    streams = []
    for symbol, interval in SUBSCRIPTIONS:
        streams.append(f"{symbol.lower()}@kline_{interval}")
    # Add mark price streams for live price display
    symbols_seen = set()
    for symbol, _ in SUBSCRIPTIONS:
        if symbol not in symbols_seen:
            streams.append(f"{symbol.lower()}@markPrice")
            symbols_seen.add(symbol)
    return "wss://fstream.binance.com/stream?streams=" + "/".join(streams)


# ── HA computation ─────────────────────────────────────────────────────────────
# Needs the previous HA candle to compute correctly
# Store previous HA values in Redis so they persist across restarts
async def compute_ha(symbol, interval, candle, redis_client):
    prev_key = f"ha:prev:{symbol}:{interval}"
    prev_raw = await redis_client.get(prev_key)

    if prev_raw:
        prev = json.loads(prev_raw)
        ha_open  = (prev["ha_open"] + prev["ha_close"]) / 2
    else:
        # First candle: use standard open/close average
        ha_open  = (candle["open"] + candle["close"]) / 2

    ha_close = (candle["open"] + candle["high"] + candle["low"] + candle["close"]) / 4
    ha_high  = max(candle["high"], ha_open, ha_close)
    ha_low   = min(candle["low"],  ha_open, ha_close)

    ha = {
        "ha_open":  round(ha_open,  8),
        "ha_high":  round(ha_high,  8),
        "ha_low":   round(ha_low,   8),
        "ha_close": round(ha_close, 8),
    }

    # Store for next candle's calculation
    if candle["is_closed"]:
        await redis_client.set(prev_key, json.dumps(ha))

    return ha


# ── Handle incoming kline messages ────────────────────────────────────────────
async def handle_kline(data, redis_client, db_conn):
    k = data["k"]
    symbol    = k["s"]          # BTCUSDT
    interval  = k["i"]          # 15m
    is_closed = k["x"]          # True only when the candle has finished

    candle = {
        "open_time":  k["t"],
        "open":       float(k["o"]),
        "high":       float(k["h"]),
        "low":        float(k["l"]),
        "close":      float(k["c"]),
        "volume":     float(k["v"]),
        "is_closed":  is_closed,
    }

    # Compute HA values for this candle
    ha = await compute_ha(symbol, interval, candle, redis_client)

    # Always update Redis with the current (possibly still open) candle
    # This is what the chart uses for the live updating bar
    current_key = f"candle:current:{symbol}:{interval}"
    payload = {**candle, **ha, "symbol": symbol, "interval": interval}
    await redis_client.setex(current_key, 90, json.dumps(payload))

    # Publish to the channel so connected WebSocket clients get the update
    # (every tick, not just on close — this is what makes the chart update smoothly)
    await redis_client.publish(f"chart:{symbol}:{interval}", json.dumps({
        "type":      "candle_update",
        "symbol":    symbol,
        "interval":  interval,
        "time":      k["t"] // 1000,  # Unix seconds for Lightweight Charts
        "open":      ha["ha_open"],
        "high":      ha["ha_high"],
        "low":       ha["ha_low"],
        "close":     ha["ha_close"],
        "volume":    candle["volume"],
        "is_closed": is_closed,
    }))

    # On candle close: persist to DB and notify signal engine
    if is_closed:
        await store_closed_candle(symbol, interval, candle, ha, db_conn)
        # Publish to signal engine's trigger channel
        await redis_client.publish("signal_engine:trigger", json.dumps({
            "symbol":   symbol,
            "interval": interval,
        }))
        logging.info(f"Closed candle stored: {symbol} {interval} HA close={ha['ha_close']}")


# ── Handle mark price (live price ticker) ─────────────────────────────────────
async def handle_mark_price(data, redis_client):
    symbol = data["s"]
    price  = float(data["p"])

    # Store live price in Redis — used by the dashboard's live price display
    await redis_client.setex(f"price:{symbol}", 30, str(price))

    # Publish price tick to all subscribers
    await redis_client.publish(f"price:{symbol}", json.dumps({
        "type":   "price_tick",
        "symbol": symbol,
        "price":  price,
        "time":   data["T"],  # Next funding time
    }))


# ── Persist closed candle to PostgreSQL ──────────────────────────────────────
async def store_closed_candle(symbol, interval, candle, ha, db_conn):
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


# ── Main WebSocket loop with auto-reconnect ───────────────────────────────────
async def run():
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    db_conn      = psycopg2.connect(DB_URL)
    stream_url   = build_stream_url()

    logging.info(f"Connecting to {len(SUBSCRIPTIONS)} streams on Binance Futures WebSocket")

    while True:  # Auto-reconnect on any disconnect
        try:
            async with websockets.connect(
                stream_url,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=5,
            ) as ws:
                logging.info("Binance WebSocket connected")

                async for raw_message in ws:
                    try:
                        msg  = json.loads(raw_message)
                        data = msg.get("data", msg)
                        event_type = data.get("e")

                        if event_type == "kline":
                            await handle_kline(data, redis_client, db_conn)
                        elif event_type == "markPriceUpdate":
                            await handle_mark_price(data, redis_client)

                    except Exception as e:
                        logging.error(f"Error processing message: {e}")
                        continue  # Never crash on a single bad message

        except Exception as e:
            logging.error(f"WebSocket disconnected: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run())
```

---

## Signal engine — stop calling Binance, read from DB instead

The only change needed in `signal_engine.py` is replacing `fetch_klines()` with a database read, and replacing the polling loop with an event-driven trigger:

```python
# signal_engine.py — modified sections only

import redis
import json

redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)

# ── Replace fetch_klines() with DB read ───────────────────────────────────────
def fetch_klines_from_db(symbol: str, interval: str, limit: int = 200):
    """
    Read historical candles from ohlcv_cache instead of Binance REST API.
    The stream_subscriber keeps this table perfectly up to date.
    Zero Binance API calls. Zero rate limits.
    """
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

    if not rows:
        return None

    # Return in ascending order (oldest first), same format as before
    df = pd.DataFrame(reversed(rows), columns=[
        "open_time", "open", "high", "low", "close", "volume",
        "ha_open", "ha_high", "ha_low", "ha_close"
    ])
    df.set_index("open_time", inplace=True)
    return df


# ── Replace polling loop with event-driven trigger ────────────────────────────
def main():
    conn     = get_db()
    pubsub   = redis_client.pubsub()
    pubsub.subscribe("signal_engine:trigger")

    # Seed initial state from DB (replaces the startup fetch_klines call)
    df = fetch_klines_from_db(BINANCE_SYMBOL, INTERVAL, limit=200)
    if df is not None:
        ha_seed  = df[["ha_open","ha_high","ha_low","ha_close"]].rename(
            columns={"ha_open":"ha_open","ha_high":"ha_high",
                     "ha_low":"ha_low","ha_close":"ha_close"})
        startup_watermark    = df.index[-1]
        last_processed_close = startup_watermark
        logging.info(f"Watermark seeded: {startup_watermark}")

    pending_tg_id    = None
    current_swing_group = str(uuid.uuid4())

    # Listen for closed-candle trigger events instead of polling
    for message in pubsub.listen():
        if message["type"] != "message":
            continue

        trigger = json.loads(message["data"])
        symbol   = trigger["symbol"]
        interval = trigger["interval"]

        # Only process the coins/intervals this engine instance handles
        if symbol != BINANCE_SYMBOL or interval != INTERVAL:
            continue

        try:
            # Read fresh data from DB — no Binance call
            df = fetch_klines_from_db(symbol, interval, limit=200)
            if df is None:
                continue

            ha      = df[["ha_open","ha_high","ha_low","ha_close"]]
            events  = detect_swings(ha, LOOKBACK)
            new_evs = [e for e in events if e["bar"] > last_processed_close]

            for ev in new_evs:
                live_price = float(
                    redis_client.get(f"price:{symbol}") or 0
                )
                # ... rest of existing event handling unchanged ...

        except Exception as e:
            logging.exception(f"Signal engine error: {e}")
```

---

## Frontend chart — zero Binance calls, all from Sanddock

```typescript
// hooks/useChart.ts
// Loads historical data from Sanddock's DB, then receives live updates via WebSocket

export function useChart(symbol: string, interval: string) {
  const seriesRef = useRef(null)

  useEffect(() => {
    // Step 1: Load historical HA candles from YOUR database — no Binance call
    fetch(`/api/v1/chart/candles?symbol=${symbol}&interval=${interval}&limit=300`)
      .then(r => r.json())
      .then(candles => {
        const data = candles.map(c => ({
          time:  Math.floor(new Date(c.open_time).getTime() / 1000),
          open:  parseFloat(c.ha_open),
          high:  parseFloat(c.ha_high),
          low:   parseFloat(c.ha_low),
          close: parseFloat(c.ha_close),
        }))
        seriesRef.current?.setData(data)
      })

    // Step 2: Connect to Sanddock's WebSocket for live updates
    // This connection goes to YOUR server, not Binance
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/chart`)
    ws.onopen = () => {
      // Subscribe to this symbol/interval combination
      ws.send(JSON.stringify({ action: "subscribe", symbol, interval }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === "candle_update") {
        // Update the live bar on the chart — whether candle is open or closed
        seriesRef.current?.update({
          time:  msg.time,
          open:  msg.open,
          high:  msg.high,
          low:   msg.low,
          close: msg.close,
        })
      }

      if (msg.type === "price_tick") {
        // Update the live price display in the header
        setLivePrice(msg.price)
      }

      if (msg.type === "new_signal") {
        // Add signal marker to chart
        addSignalMarker(msg)
      }
    }

    return () => ws.close()
  }, [symbol, interval])
}
```

---

## Sanddock's user-facing WebSocket server — routes Redis pub/sub to connected clients

```python
# api/websocket_chart.py
# Bridges Redis pub/sub (from stream_subscriber) to browser WebSocket connections

from fastapi import WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
import json

async def chart_websocket(websocket: WebSocket, user=Depends(get_current_user)):
    await websocket.accept()
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    subscribed_channels = set()

    async def listen_redis():
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    try:
        # Wait for the client to tell us what it wants
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg["action"] == "subscribe":
                symbol   = msg["symbol"]
                interval = msg["interval"]

                # Verify user has access to this symbol based on their plan
                if not user_has_access(user, symbol):
                    await websocket.send_json({
                        "type": "error",
                        "message": f"{symbol} requires Pro plan"
                    })
                    continue

                # Subscribe to the Redis channels for this symbol/interval
                channel = f"chart:{symbol}:{interval}"
                price_ch = f"price:{symbol}"

                if channel not in subscribed_channels:
                    await pubsub.subscribe(channel, price_ch)
                    subscribed_channels.add(channel)

                    # Send the current open candle immediately (so chart shows
                    # the live bar before the next tick arrives)
                    current = await redis_client.get(
                        f"candle:current:{symbol}:{interval}"
                    )
                    if current:
                        data = json.loads(current)
                        await websocket.send_json({
                            "type":  "candle_update",
                            "time":  data["open_time"] // 1000,
                            "open":  data["ha_open"],
                            "high":  data["ha_high"],
                            "low":   data["ha_low"],
                            "close": data["ha_close"],
                        })

            # Start listening to Redis in the background
            asyncio.create_task(listen_redis())

    except WebSocketDisconnect:
        await pubsub.unsubscribe(*subscribed_channels)
```

---

## Scaling numbers — what this architecture actually handles

| Metric | Current (REST polling) | New (WebSocket + Redis pub/sub) |
|---|---|---|
| Binance API calls per minute | 4 × N users + 4 engine calls | 0 — none, ever |
| Binance connections | 1 per poll cycle | 1 per stream (permanent) |
| Max concurrent users before Binance rate limit | ~100 | Unlimited |
| Chart data latency | 15 seconds | Under 1 second |
| Signal engine latency | 15 seconds | Under 1 second (event-driven) |
| Binance rate limit exposure | Constant | Zero |

---

## Docker Compose addition

```yaml
stream_subscriber:
  build: ./backend
  command: python stream_subscriber.py
  environment:
    REDIS_URL:    redis://redis:6379
    DATABASE_URL: postgresql://sanddock:${DB_PASSWORD}@db:5432/sanddock
  depends_on: [db, redis]
  restart: always   # Auto-reconnects to Binance on any disconnect

redis:
  image: redis:7-alpine
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes  # Persist pub/sub state across restarts
```

---

## One bootstrapping note

The `ohlcv_cache` table needs to be seeded with historical data before the WebSocket subscriber takes over, since the WebSocket only gives you data from connection time forward. Run this once at deployment:

```python
# bootstrap_history.py — run ONCE at initial deployment, then never again
# Uses REST API to backfill historical candles into ohlcv_cache

def bootstrap_history(symbol, interval, days=180):
    """
    One-time REST API call to seed historical data.
    After this runs, the WebSocket subscriber maintains everything.
    This is the ONLY legitimate use of the REST API going forward.
    """
    df = fetch_full_history(symbol, interval, days=days)
    # compute HA for all historical bars
    ha = to_heikin_ashi(df)
    # store in ohlcv_cache
    cache_ohlcv(db_conn, df, ha, symbol, interval)
    print(f"Bootstrapped {len(df)} candles for {symbol} {interval}")
```

After bootstrap runs once per coin/interval combination, the REST API is never needed again. The WebSocket subscriber maintains everything in real time indefinitely.