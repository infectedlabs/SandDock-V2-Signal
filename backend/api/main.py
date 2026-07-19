import os
import asyncio
import logging
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .websocket_chart import chart_websocket

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="Sanddock Real-time API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import stream_subscriber to run it as a background task
# (avoids needing a separate Railway service on free tier)
async def start_stream_subscriber():
    """Start stream_subscriber in the background on API startup"""
    try:
        # Import here to avoid circular dependencies
        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        import stream_subscriber

        log.info("[Main] Starting stream_subscriber background task...")
        asyncio.create_task(stream_subscriber.run())
    except Exception as e:
        log.error(f"[Main] Failed to start stream_subscriber: {e}")

@app.on_event("startup")
async def startup_event():
    await start_stream_subscriber()

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Sanddock WebSocket API"}

@app.websocket("/ws/chart")
async def ws_chart(websocket: WebSocket):
    await chart_websocket(websocket)
