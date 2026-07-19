import os
import json
import asyncio
import logging
import asyncpg
from fastapi import WebSocket, WebSocketDisconnect
from .auth import get_current_user_from_token

log = logging.getLogger(__name__)
DB_URL = os.getenv("DATABASE_URL")

# Plan access limits matching the Next.js frontend definitions
PLAN_SYMBOLS = {
    "free":   ["BTCUSDT"],
    "pro":    ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    "master": ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
}

def user_has_access(user_plan: str, symbol: str) -> bool:
    allowed = PLAN_SYMBOLS.get(user_plan.lower(), PLAN_SYMBOLS["free"])
    return symbol.upper() in allowed

async def chart_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    user = get_current_user_from_token(token)
    user_plan = user.get("plan", "free") if user else "free"

    await websocket.accept()
    log.info(f"WebSocket client connected. Plan: {user_plan}")

    subscribed = {}  # (symbol, interval) -> last_sent_candle_data
    last_price = {}  # symbol -> last_sent_price
    poller_task = None

    async def poll_and_send():
        """Periodically poll database for updates and send via WebSocket"""
        db_conn = await asyncpg.connect(DB_URL, statement_cache_size=0)
        try:
            while True:
                await asyncio.sleep(0.2)  # Poll every 200ms

                for (symbol, interval) in list(subscribed.keys()):
                    try:
                        # live_candles reflects the in-progress candle, updated
                        # on every kline tick. Fall back to ohlcv_cache (which
                        # only has closed candles) if nothing has ticked yet.
                        candle = await db_conn.fetchrow("""
                            SELECT open_time, open, high, low, close, volume,
                                   ha_open, ha_high, ha_low, ha_close
                            FROM live_candles
                            WHERE symbol = $1 AND interval = $2
                        """, symbol, interval)

                        if not candle:
                            candle = await db_conn.fetchrow("""
                                SELECT open_time, open, high, low, close, volume,
                                       ha_open, ha_high, ha_low, ha_close
                                FROM ohlcv_cache
                                WHERE symbol = $1 AND interval = $2
                                ORDER BY open_time DESC LIMIT 1
                            """, symbol, interval)

                        if candle and candle['open_time']:
                            data = {
                                "type": "candle_update",
                                "symbol": symbol,
                                "interval": interval,
                                "time": int(candle['open_time'].timestamp()),
                                "open": float(candle['ha_open']),
                                "high": float(candle['ha_high']),
                                "low": float(candle['ha_low']),
                                "close": float(candle['ha_close']),
                                "volume": float(candle['volume']),
                            }

                            # Only send if data changed
                            if subscribed[(symbol, interval)] != data:
                                try:
                                    await websocket.send_json(data)
                                    subscribed[(symbol, interval)] = data
                                    log.debug(f"[POLL] Sent {symbol} {interval}: time={data['time']} close=${data['close']}")
                                except Exception as e:
                                    log.error(f"[POLL] Failed to send: {e}")
                                    break
                        else:
                            log.warning(f"[POLL] No candle found for {symbol} {interval}")

                    except Exception as e:
                        log.error(f"[POLL] Query error for {symbol} {interval}: {e}")

                    # Also poll live last-trade price for this symbol
                    if symbol not in last_price:
                        last_price[symbol] = None
                    try:
                        price_row = await db_conn.fetchrow("""
                            SELECT price, event_time FROM live_prices WHERE symbol = $1
                        """, symbol)
                        if price_row:
                            price_data = {
                                "type": "price_tick",
                                "symbol": symbol,
                                "price": float(price_row['price']),
                                "time": price_row['event_time'],
                            }
                            if last_price[symbol] != price_data:
                                try:
                                    await websocket.send_json(price_data)
                                    last_price[symbol] = price_data
                                except Exception as e:
                                    log.error(f"[POLL] Failed to send price: {e}")
                                    break
                    except Exception as e:
                        log.error(f"[POLL] Price query error for {symbol}: {e}")

        except asyncio.CancelledError:
            pass
        finally:
            await db_conn.close()

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg.get("action") == "subscribe":
                symbol = msg.get("symbol", "").upper()
                interval = msg.get("interval", "")
                if not symbol or not interval:
                    continue

                if not user_has_access(user_plan, symbol):
                    await websocket.send_json({
                        "type": "error",
                        "message": f"{symbol} requires Pro/Master plan"
                    })
                    continue

                if (symbol, interval) not in subscribed:
                    subscribed[(symbol, interval)] = None
                    log.info(f"[WS] Subscribed: {symbol} {interval}")

                    if not poller_task:
                        poller_task = asyncio.create_task(poll_and_send())
                        log.info("[WS] Started polling task")

                    await websocket.send_json({
                        "type": "subscription_confirmed",
                        "channel": f"chart:{symbol}:{interval}"
                    })

    except WebSocketDisconnect:
        log.info("WebSocket disconnected")
    finally:
        if poller_task:
            poller_task.cancel()
            try:
                await poller_task
            except:
                pass
        subscribed.clear()
