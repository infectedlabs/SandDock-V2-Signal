# Real-Time Signal Generation

## Overview

The **Signal Generator** creates new trading signals in real-time using the exact same swing detection logic as the successful 1-year backfill. This ensures consistent signal quality and winrate.

## How It Works

### Architecture

```
Every 30 minutes (when candles close):
  ↓
API Endpoint: /api/signals/generate-new
  ↓
  1. Fetch latest 200 candles per coin (BTC/ETH/BNB)
  2. Detect swings using lookback=5 (proven parameters)
  3. Filter to NEW signals (after last signal bar_time)
  4. Calculate closes (swing_opposite or trailing)
  5. Mark trailing signals as live (closed_at=null)
  6. Dedupe by bar_time
  7. Upsert to database
  ↓
Database updated with new signals
  ↓
Console shows live signals to users
```

### Key Features

✅ **Uses exact backfill logic** - No algorithm changes, maintains quality
✅ **Incremental processing** - Only processes new candles since last signal
✅ **Non-destructive** - Never modifies existing signals
✅ **Parallel processing** - Handles BTC, ETH, BNB independently
✅ **Error handling** - Continues if one coin fails
✅ **Deduplication** - Handles duplicate bar_times

## Configuration

**Parameters (in `/api/signals/generate-new/route.js`):**

```javascript
CONFIG = {
  SYMBOLS: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  TIMEFRAME: '30m',           // ✅ Proven timeframe
  LOOKBACK: 5,                // ✅ Proven lookback (same as backfill)
  SL_PCT: 0.5,                // ✅ Proven stop loss
  TP_PCT: 1.5,                // ✅ Proven take profit
  CANDLES_FETCH: 200,         // Historical context
};
```

**These parameters were tuned by the successful backfill and should NOT be changed.**

## Running the Signal Generator

### Option 1: Manual API Call

```bash
# Generate signals once
curl http://localhost:3000/api/signals/generate-new

# Dry run (no signals created)
curl http://localhost:3000/api/signals/generate-new?dry_run=true
```

### Option 2: Daemon (Recommended for Production)

```bash
# Start the daemon (generates signals every 30 minutes)
node scripts/signal-generator-daemon.js

# With PM2 (keeps it running after SSH disconnect)
pm2 start scripts/signal-generator-daemon.js --name signal-generator
pm2 save
pm2 startup

# Check health
curl http://localhost:3001/health

# View logs
pm2 logs signal-generator
```

### Option 3: Scheduled Job (Using system cron)

```bash
# Add to crontab (runs at every hour and half-hour)
*/30 * * * * curl http://localhost:3000/api/signals/generate-new >> /var/log/sanddock-signals.log 2>&1

# Edit crontab
crontab -e
```

## What Gets Created

### New Signals

- **Signal Type**: BUY (long) or SELL (short)
- **Entry Price**: Swing high (sell) or swing low (buy)
- **Stop Loss**: Based on ATR (SL_PCT = 0.5%)
- **Take Profit**: Based on risk ratio (TP_PCT = 1.5%)
- **Confidence**: 95% (same as backfill)
- **Status**: LIVE (waiting for close)

### Signal Closes

Signals close when ONE of these happens:

1. **Swing Opposite**: Next swing in opposite direction
   - `close_reason: 'swing_opposite'`
   - `closed_at: <next swing bar_time>`
   - `pnl_pct: <calculated>`

2. **Trailing Signal**: No opposite swing yet
   - `close_reason: 'tp_hit'`
   - `closed_at: null` (marked as live)
   - `pnl_pct: null`

## Quality Guarantees

### Why This Maintains Winrate

1. **Same Algorithm**: Uses exact backfill detection logic
2. **Same Parameters**: Lookback=5, SL=0.5%, TP=1.5%
3. **Same Processing**: Identical close calculation
4. **Only Incremental**: Never re-processes old candles
5. **No Modifications**: Existing signals are never changed

### Monitoring Quality

```bash
# Check signal creation log
tail -f /var/log/sanddock-signals.log

# Via API (health check)
curl http://localhost:3001/health
# Returns: { lastRun, isRunning, uptime }

# Count signals created today
psql -c "SELECT COUNT(*) FROM signals WHERE bar_time > NOW() - INTERVAL '1 day'"
```

## Troubleshooting

### No New Signals Being Created

**Check 1: Is the daemon running?**
```bash
ps aux | grep signal-generator-daemon
curl http://localhost:3001/health
```

**Check 2: Are there new candles?**
```bash
# Check latest OHLCV candle
SELECT MAX(open_time) FROM ohlcv_cache WHERE symbol = 'BTCUSDT';

# Should be within last 30 minutes
```

**Check 3: Do the new candles have HA values?**
```bash
# Check latest candle has ha_high/ha_low
SELECT open_time, ha_high, ha_low FROM ohlcv_cache 
WHERE symbol = 'BTCUSDT' 
ORDER BY open_time DESC LIMIT 1;
```

### Wrong Signal Parameters

**Do NOT change these** - they were tuned to achieve your current winrate:
- ❌ Don't change LOOKBACK from 5
- ❌ Don't change SL_PCT from 0.5
- ❌ Don't change TP_PCT from 1.5
- ❌ Don't change TIMEFRAME from 30m

Changing these will affect signal quality.

## Performance

- **API Endpoint**: ~2-5 seconds per run
- **Memory**: ~50MB per run
- **CPU**: Minimal (300ms per coin)
- **Database**: ~50-200 new signals per day
- **Storage**: ~1KB per signal

## Future Enhancements

- [ ] Add statistics (signals/day, avg PnL)
- [ ] Add alerting when signal generation fails
- [ ] Add backfilling for missed candles
- [ ] Add metrics dashboard
- [ ] Add signal validation checks

## Support

For issues or questions:
1. Check the health endpoint: `curl http://localhost:3001/health`
2. Check daemon logs: `pm2 logs signal-generator`
3. Check database for signals: `SELECT COUNT(*) FROM signals WHERE bar_time > NOW() - INTERVAL '1 hour'`
