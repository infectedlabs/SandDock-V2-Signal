# Production Deployment Guide

This guide covers deploying both the frontend (Netlify) and backend (Railway/Render) to production.

## Architecture Overview

- **Frontend:** Netlify (free tier available)
- **Backend:** Railway/Render/Fly.io (Docker-based)
- **Database:** Supabase (managed PostgreSQL)
- **Redis:** Managed Redis service
- **DNS:** Your custom domain

```
user browser
    ↓ HTTPS
[Netlify Frontend] ←── wss://api.yourapp.com/ws/chart ──→ [Railway Backend]
    ↓                                                        ↓
[Supabase DB] ←────────────────────────────────────────────┘
    ↓
[Redis Cache]
```

---

## Step 1: Backend Deployment (Choose One)

### Option A: Railway (Recommended for simplicity)

1. **Create account:** https://railway.app
2. **Create new project** → "Deploy from GitHub"
3. **Connect your GitHub repo**
4. **Railway auto-detects Docker setup** from `backend/docker-compose.yml`

**Set Environment Variables in Railway Dashboard:**
```
DATABASE_URL=postgresql://...  (from Supabase)
REDIS_URL=redis://<redis-connection-string>  (use Railway Redis plugin)
SUPABASE_JWT_SECRET=<your-jwt-secret>
TELEGRAM_BOT_TOKEN=<your-token>
TELEGRAM_CHAT_ID=<your-chat-id>
```

**Add Redis to Railway:**
- In Project Settings → Add Plugin → Redis
- Copy the `REDIS_URL` from plugin details

**Deploy:**
- Push to GitHub → Railway auto-deploys
- Your backend URL will be: `https://<project-name>.up.railway.app`

---

### Option B: Render.com

1. **Create account:** https://render.com
2. **New → Web Service**
3. **Connect GitHub repo**
4. **Configure:**
   - **Runtime:** Docker
   - **Build Command:** Leave empty (uses Dockerfile)
   - **Start Command:** Leave empty (uses Dockerfile CMD)

**Environment Variables:**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...  (use Render Redis service)
SUPABASE_JWT_SECRET=...
```

**Add Redis:**
- New → Redis → Copy connection URL to `REDIS_URL` env var

**Deploy:** Render auto-deploys on GitHub push

---

### Option C: Fly.io

1. **Install flyctl:** https://fly.io/docs/getting-started/installing-flyctl/
2. **Login:** `flyctl auth login`
3. **Deploy:**
   ```bash
   cd backend
   flyctl launch
   ```
4. **Set secrets:**
   ```bash
   flyctl secrets set DATABASE_URL="..."
   flyctl secrets set REDIS_URL="..."
   flyctl secrets set SUPABASE_JWT_SECRET="..."
   ```

Your backend URL: `https://<app-name>.fly.dev`

---

## Step 2: Redis Setup

**Option 1: Railway Redis Plugin** (easiest)
- Add Plugin in Railway dashboard
- Copy connection URL

**Option 2: Render Managed Redis**
- New → Redis → Copy connection URL

**Option 3: Redis Cloud** (free tier: https://redis.com/try-free/)
- Create database
- Copy connection string

---

## Step 3: Frontend Deployment (Netlify)

1. **Create account:** https://netlify.com
2. **New site → Import existing project → GitHub**
3. **Select your repo**

### Build Settings:
```
Build command:    npm run build
Publish directory: .next
```

### Environment Variables (Set in Netlify Dashboard):

Go to **Site Settings → Build & Deploy → Environment**

```
NEXT_PUBLIC_SUPABASE_URL=https://...          (from Supabase)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...         (from Supabase)
NEXT_PUBLIC_WS_URL=https://api.yourapp.com   (your backend URL)
```

**Important:** The `NEXT_PUBLIC_WS_URL` must:
- Start with `http://` or `https://` (not `ws://` or `wss://`)
- Point to your **production backend domain** (Railway/Render)
- Frontend will automatically convert to `wss://` for secure WebSocket

### Custom Domain:
1. **Go to Site Settings → Domain Management**
2. **Add custom domain**
3. **Update DNS records** (Netlify shows instructions)

### Deploy:
- Push to GitHub → Netlify auto-deploys
- Your frontend URL: `https://yourapp.com` or `https://site-name.netlify.app`

---

## Step 4: Configure Environment Variables

### Development (Local)
File: `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_WS_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
SUPABASE_JWT_SECRET=...
DATABASE_URL=postgresql://...
```

### Production
Set in your hosting platform's dashboard:

**Netlify (Frontend):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_WS_URL=https://api.yourapp.com`

**Railway/Render (Backend):**
- `DATABASE_URL`
- `REDIS_URL`
- `SUPABASE_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

---

## Step 5: Verify Production Setup

### Test Frontend:
1. Open `https://yourapp.com`
2. Open DevTools (F12) → Console
3. Should see: `[HAChart] WebSocket open — subscribing to BTCUSDT 30m`

### Test Backend Health:
```bash
curl https://api.yourapp.com/
# Should return: {"status": "ok", "service": "Sanddock WebSocket API"}
```

### Debug WebSocket Connection:
```javascript
// In browser console:
console.log(document.location.protocol);  // Should be 'https:'
fetch(process.env.NEXT_PUBLIC_WS_URL).then(r => console.log('Backend reachable:', r.status));
```

---

## Common Issues & Fixes

### Issue: WebSocket connects but immediately closes (code 1006)

**Cause:** Backend crashed or Redis unavailable

**Fix:**
```bash
# Check backend logs
railway logs  # or Render dashboard

# Check if Redis is running
redis-cli ping  # Should return PONG
```

---

### Issue: "WebSocket connection error: connection refused"

**Cause:** Wrong `NEXT_PUBLIC_WS_URL` or backend not deployed

**Fix:**
```bash
# Verify backend is running
curl https://api.yourapp.com/

# Check Netlify environment variable
# Site Settings → Build & Deploy → Environment → Check NEXT_PUBLIC_WS_URL
```

---

### Issue: CORS error on WebSocket

**Cause:** Frontend URL not whitelisted in backend

**Fix:** Update backend CORS to accept your Netlify domain:

In `backend/api/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourapp.com", "https://www.yourapp.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then push to GitHub → Re-deploy

---

### Issue: Frontend shows "Warming Engine" indefinitely

**Cause:** WebSocket not connecting (backend down or unreachable)

**Check:**
1. Backend health: `curl https://api.yourapp.com/`
2. Network tab in DevTools → Check WebSocket connection
3. Backend logs → Look for connection errors

---

## Automatic Deployments

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npx railwayapp up --token ${{ secrets.RAILWAY_TOKEN }}
```

---

## Cost Estimation (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Netlify | Pro/Free | $0-19 |
| Railway | Starter | $5+ |
| Supabase | Pro | $25+ |
| Redis | Managed | $0-15 |
| **Total** | | **$30-60** |

Free tiers available for all services if traffic is low.

---

## Production Checklist

- [ ] Backend deployed (Railway/Render/Fly.io)
- [ ] Redis configured and running
- [ ] Frontend deployed to Netlify
- [ ] Environment variables set on all platforms
- [ ] Custom domain configured (optional)
- [ ] SSL certificate auto-enabled (Netlify/Railway do this)
- [ ] WebSocket connection tested in production
- [ ] Error logging configured
- [ ] Backup strategy for database configured
- [ ] Monitoring/alerts setup (optional)

---

## Quick Reference: Environment Variables

### What Each Platform Needs

| Variable | Netlify | Railway | Both |
|----------|---------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | | ✓ |
| `NEXT_PUBLIC_WS_URL` | ✓ | | - |
| `DATABASE_URL` | | ✓ | ✓ |
| `REDIS_URL` | | ✓ | ✓ |
| `SUPABASE_JWT_SECRET` | | ✓ | ✓ |

### How to Get Them

1. **NEXT_PUBLIC_SUPABASE_URL & KEY**: Supabase Dashboard → Project Settings → API
2. **SUPABASE_JWT_SECRET**: Supabase Dashboard → Project Settings → API → JWT Secret
3. **DATABASE_URL**: Supabase Dashboard → Project Settings → Database → Connection String
4. **REDIS_URL**: Railway Redis Plugin details or Redis Cloud dashboard
5. **NEXT_PUBLIC_WS_URL**: Your Railway/Render backend URL (e.g., `https://api.yourapp.com`)

---

## Rollback Strategy

If production breaks:

1. **Frontend:** Netlify auto-keeps previous builds → Rollback in Netlify Dashboard
2. **Backend:** Railway/Render keeps deploy history → Revert to previous deploy
3. **Database:** Supabase auto-backups → Restore from backup (24hr retention on free)

---

## Monitoring & Alerts

### Railway Dashboard
- View logs real-time
- CPU/Memory usage
- Restart failed services

### Netlify Analytics
- Build times
- Deployment status
- Domain analytics

### Browser DevTools
- Network tab → WebSocket frames
- Console → Error messages
- Performance → Connection latency

---

## Next Steps

1. Choose your backend platform (Railway recommended)
2. Create accounts on Railway, Netlify, and verify Supabase access
3. Follow deployment steps above
4. Test production setup
5. Set up DNS for custom domain
6. Configure monitoring/alerts
7. Document deployment process for team
