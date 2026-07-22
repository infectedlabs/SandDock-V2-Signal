# Production Deployment - Quick Start

For the complete guide, see `DEPLOYMENT.md`. This is the TL;DR version.

## What You Need
- Netlify account (frontend) - free tier OK
- Railway account (backend) - paid, but cheapest option for WebSocket
- Supabase (already using)
- GitHub repo

## 5-Minute Setup

### Step 1: Backend Deployment (Railway)
```bash
1. Go to https://railway.app → Sign up with GitHub
2. Create new project → Deploy from GitHub
3. Select this repo → Railway detects Dockerfile
4. Go to Variables tab → Add:
   - DATABASE_URL=<from Supabase>
   - REDIS_URL=<use Railway Redis plugin>
   - SUPABASE_JWT_SECRET=<from Supabase>
5. Copy your Railway URL (will be something like https://sanddock-prod.up.railway.app)
```

### Step 2: Frontend Deployment (Netlify)
```bash
1. Go to https://netlify.com → Sign up with GitHub
2. New site → Import existing project → Select this repo
3. Click "Show advanced" → Add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
   - NEXT_PUBLIC_WS_URL=https://sanddock-prod.up.railway.app
4. Deploy
```

### Step 3: Verify
```bash
1. Open your Netlify site
2. Open DevTools (F12) → Console
3. Should see: [HAChart] WebSocket open - subscribing to BTCUSDT 30m
4. If error, check NEXT_PUBLIC_WS_URL in Netlify dashboard
```

## That's It! 🎉

Every push to `main` now auto-deploys:
- Frontend to Netlify
- Backend to Railway
- See `.github/workflows/` for auto-deployment config

## Environment Variables Quick Reference

Copy from `.env.example` and fill in:

```bash
# Get from Supabase Dashboard
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=

# From Railway
REDIS_URL=

# Your backend (from Railway dashboard)
NEXT_PUBLIC_WS_URL=https://your-railway-app.up.railway.app
```

## Troubleshooting

**WebSocket error code 1006?**
→ Backend not running. Check Railway dashboard

**"No reason provided" on close?**
→ Redis not running. Check Railway Redis plugin is added

**CORS error?**
→ Check NEXT_PUBLIC_WS_URL is set correctly in Netlify

For more help, see `DEPLOYMENT.md` → "Common Issues & Fixes"

## Next Deployment

Just push to GitHub → Automatic deployment to both frontend and backend ✅

No more manual steps needed!
