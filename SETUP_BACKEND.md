# Backend WebSocket Setup Guide

The frontend WebSocket connection is now failing because the backend API server isn't running. Here's how to fix it:

## Quick Start (Local Development)

### Option 1: Using Docker Compose (Recommended)

Run all services (Redis, FastAPI, stream subscriber, signal engine) in one command:

```bash
cd backend
docker-compose up -d
```

This will start:
- **Redis** on `localhost:6379`
- **FastAPI WebSocket API** on `localhost:8000`
- **Stream subscriber** (processes Binance data)
- **Signal engine** (generates trading signals)

Verify services are running:
```bash
docker-compose ps
docker-compose logs -f api  # View API logs
```

Stop services:
```bash
docker-compose down
```

---

### Option 2: Local Python Environment (Manual)

#### Step 1: Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Step 2: Start Redis
You must have Redis running on port 6379. Choose one:

**Windows (using Windows Subsystem for Linux):**
```bash
wsl
redis-server
```

**Windows (using installed Redis):**
```bash
redis-server
```

**Using Docker (just Redis):**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

#### Step 3: Start the FastAPI backend
```bash
# From the backend/ directory
python run_local.py
```

Or directly:
```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 4: Verify the connection
- Frontend should be running: `http://localhost:3000`
- Backend should be running: `http://localhost:8000`
- In the browser console, you should see: `[HAChart] WebSocket open - subscribing to BTCUSDT 30m`

---

## Troubleshooting

### "WebSocket error: readyState 3, code 1006"
**Cause:** Backend server on port 8000 is not running.
**Fix:** Start the backend with `python run_local.py` or `docker-compose up`

### "REDIS_URL connection refused"
**Cause:** Redis is not running on port 6379.
**Fix:** Start Redis (see Step 2 above)

### "ModuleNotFoundError: No module named 'fastapi'"
**Cause:** Dependencies not installed.
**Fix:** Run `pip install -r requirements.txt` in the backend directory

### "Failed to authenticate WebSocket: No access token"
**Cause:** Missing or invalid Supabase JWT token.
**Fix:** Ensure `.env.local` has valid `SUPABASE_JWT_SECRET`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js) - localhost:3000                          │
│ - HAChart component with WebSocket client                   │
└────────────────┬────────────────────────────────────────────┘
                 │ WebSocket
                 │ ws://localhost:8000/ws/chart
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (FastAPI) - localhost:8000                           │
│ - WebSocket server at /ws/chart                             │
│ - Receives subscribe messages                               │
│ - Listens to Redis Pub/Sub channels                        │
└────────────────┬────────────────────────────────────────────┘
                 │ Redis Pub/Sub
                 │ Channels: chart:BTCUSDT:30m, price:BTCUSDT
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Redis - localhost:6379                                       │
│ - Pub/Sub broker for candle and price updates              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Environment Variables

Set in `.env.local`:

```bash
# Frontend uses this to connect to WebSocket
NEXT_PUBLIC_WS_URL=http://localhost:8000

# Backend uses this to connect to Redis
REDIS_URL=redis://localhost:6379

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Supabase JWT validation
SUPABASE_JWT_SECRET=eyJ...
```

---

## What Each Service Does

| Service | Purpose | Port | Tech |
|---------|---------|------|------|
| **Frontend** | Web UI for trading signals & charts | 3000 | Next.js + React |
| **Backend API** | WebSocket server for live chart data | 8000 | FastAPI + Uvicorn |
| **Redis** | Pub/Sub message broker | 6379 | Redis |
| **Stream Subscriber** | Fetches Binance kline data | N/A | Python async |
| **Signal Engine** | Generates trading signals | N/A | Python async |

---

## Development Workflow

1. **Start all services:**
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend + services (Docker)
   cd backend && docker-compose up
   
   # OR manually:
   # Terminal 2: Redis
   redis-server
   
   # Terminal 3: Backend API
   cd backend && python run_local.py
   ```

2. **Access the app:**
   - Open `http://localhost:3000` in your browser
   - Charts should connect to WebSocket and show live data
   - Check browser console for connection logs

3. **View service logs:**
   - Backend: Check terminal running `python run_local.py`
   - Redis: Check terminal running `redis-server`
   - Browser: Open DevTools Console (F12) → Console tab

---

## Production Deployment

For production, use Docker Compose:

```bash
cd backend
docker-compose -f docker-compose.yml up -d
```

Make sure to set proper environment variables in `.env.local` before deploying.
