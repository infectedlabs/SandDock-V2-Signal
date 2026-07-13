#!/usr/bin/env node

/**
 * Signal Generator Daemon
 *
 * Runs every 30 minutes to generate new signals using the same logic
 * as the successful backfill. Maintains signal quality and winrate.
 *
 * Usage:
 *   node scripts/signal-generator-daemon.js
 *
 * Or run in background with PM2:
 *   pm2 start scripts/signal-generator-daemon.js --name signal-generator
 */

const http = require('http');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

// ─── Configuration ────────────────────────────────────────────────
const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || 3000;
const API_PROTOCOL = process.env.API_PROTOCOL || 'http';
const GENERATE_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

let lastRunTime = null;
let isRunning = false;

// ─── Logging ─────────────────────────────────────────────────────
function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// ─── Call Signal Generator API ────────────────────────────────────
function generateSignals() {
  return new Promise((resolve, reject) => {
    if (isRunning) {
      log('WARN', 'Signal generation already in progress, skipping');
      return resolve({ status: 'skipped', reason: 'already_running' });
    }

    isRunning = true;

    const url = `${API_PROTOCOL}://${API_HOST}:${API_PORT}/api/signals/generate-new`;
    log('INFO', `Calling ${url}`);

    const startTime = Date.now();

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        isRunning = false;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        lastRunTime = new Date();

        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200) {
            log('INFO', `Success (${elapsed}s): ${response.message}`);
            log('INFO', `Created: ${response.created}, Updated: ${response.updated}`);
            if (response.errors?.length > 0) {
              log('WARN', `Errors: ${response.errors.join(', ')}`);
            }
            resolve(response);
          } else {
            log('ERROR', `Status ${res.statusCode}: ${response.message}`);
            reject(new Error(`API returned ${res.statusCode}`));
          }
        } catch (err) {
          log('ERROR', `Failed to parse response: ${err.message}`);
          reject(err);
        }
      });
    }).on('error', (err) => {
      isRunning = false;
      log('ERROR', `HTTP request failed: ${err.message}`);
      reject(err);
    });
  });
}

// ─── Run Signal Generation ────────────────────────────────────────
async function run() {
  try {
    await generateSignals();
  } catch (err) {
    log('ERROR', `Signal generation failed: ${err.message}`);
  }
}

// ─── Start Daemon ────────────────────────────────────────────────
function startDaemon() {
  log('INFO', '═══════════════════════════════════════════════════════');
  log('INFO', 'Signal Generator Daemon Started');
  log('INFO', `Interval: Every 30 minutes`);
  log('INFO', `API Endpoint: ${API_PROTOCOL}://${API_HOST}:${API_PORT}/api/signals/generate-new`);
  log('INFO', '═══════════════════════════════════════════════════════');

  // Run immediately on startup
  log('INFO', 'Running initial signal generation...');
  run();

  // Schedule recurring runs
  setInterval(async () => {
    log('INFO', '▶ Starting scheduled signal generation run');
    await run();
  }, GENERATE_INTERVAL);
}

// ─── Status Endpoint (Optional) ────────────────────────────────────
function startStatusServer() {
  const statusServer = require('http').createServer((req, res) => {
    if (req.url === '/health') {
      const health = {
        status: 'ok',
        lastRun: lastRunTime,
        isRunning,
        uptime: process.uptime()
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  const statusPort = parseInt(process.env.STATUS_PORT || 3001);
  statusServer.listen(statusPort, () => {
    log('INFO', `Health check available at http://${API_HOST}:${statusPort}/health`);
  });
}

// ─── Graceful Shutdown ────────────────────────────────────────────
process.on('SIGTERM', () => {
  log('INFO', 'Received SIGTERM, gracefully shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('INFO', 'Received SIGINT, gracefully shutting down...');
  process.exit(0);
});

// ─── Start Everything ────────────────────────────────────────────
startStatusServer();
startDaemon();
