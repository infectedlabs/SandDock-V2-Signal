import os
import json
import asyncio
import logging
from fastapi import WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from .auth import get_current_user_from_token

log = logging.getLogger(__name__)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

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
    # Retrieve token from query parameters
    token = websocket.query_params.get("token")
    user = get_current_user_from_token(token)
    user_plan = user.get("plan", "free") if user else "free"

    await websocket.accept()
    log.info(f"WebSocket client connected. Plan: {user_plan}")
    
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    subscribed_channels = set()
    
    # Listen to Redis Pub/Sub channels and forward to browser WebSocket
    async def listen_redis():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    await websocket.send_text(message["data"])
        except asyncio.CancelledError:
            pass
        except Exception as e:
            log.error(f"Error in Redis listener task: {e}")

    listener_task = None
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg.get("action") == "subscribe":
                symbol   = msg.get("symbol")
                interval = msg.get("interval")
                if not symbol or not interval:
                    continue

                symbol = symbol.upper()
                # Verify plan limits
                if not user_has_access(user_plan, symbol):
                    await websocket.send_json({
                        "type": "error",
                        "message": f"{symbol} requires Pro/Master plan"
                    })
                    continue

                # Redis channels to subscribe to
                channel = f"chart:{symbol}:{interval}"
                price_ch = f"price:{symbol}"

                if channel not in subscribed_channels:
                    await pubsub.subscribe(channel, price_ch)
                    subscribed_channels.add(channel)
                    subscribed_channels.add(price_ch)
                    log.info(f"Subscribed client to: {channel} & {price_ch}")

                    # Immediately send current open candle from Redis cache to chart.
                    # open_time in Redis is the raw Binance ms timestamp (integer).
                    # Guard against it being stored as a string (e.g. ISO format).
                    current = await redis_client.get(
                        f"candle:current:{symbol}:{interval}"
                    )
                    if current:
                        data = json.loads(current)
                        raw_ot = data.get("open_time", 0)
                        if isinstance(raw_ot, str):
                            # ISO-format string — convert to unix ms
                            from datetime import datetime
                            raw_ot = int(datetime.fromisoformat(
                                raw_ot.replace("Z", "+00:00")
                            ).timestamp() * 1000)
                        await websocket.send_json({
                            "type":      "candle_update",
                            "symbol":    symbol,
                            "interval":  interval,
                            "time":      raw_ot // 1000,
                            # HA values — matches chart's historical HA candles
                            "open":      data["ha_open"],
                            "high":      data["ha_high"],
                            "low":       data["ha_low"],
                            "close":     data["ha_close"],
                            # Raw OHLC alongside for signal engine consumers
                            "raw_open":  data["open"],
                            "raw_high":  data["high"],
                            "raw_low":   data["low"],
                            "raw_close": data["close"],
                            "is_closed": False,  # current open candle
                        })

                # Start the background listening task if not running
                if not listener_task:
                    listener_task = asyncio.create_task(listen_redis())

    except WebSocketDisconnect:
        log.info("Client disconnected from WebSocket")
    finally:
        if listener_task:
            listener_task.cancel()
        if subscribed_channels:
            await pubsub.unsubscribe(*subscribed_channels)
        await pubsub.close()
        await redis_client.close()
