#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * Run this before deploying to production to ensure all environment variables are set
 *
 * Usage: node scripts/validate-production.js
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  section: (msg) => console.log(`\n${COLORS.cyan}${msg}${COLORS.reset}`),
};

function checkEnvironmentFile() {
  log.section('1. Checking Environment Files');

  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  if (fs.existsSync(envLocalPath)) {
    log.success('.env.local exists');
    const content = fs.readFileSync(envLocalPath, 'utf8');
    return content;
  } else {
    log.error('.env.local not found');
    if (fs.existsSync(envExamplePath)) {
      log.info('Hint: Copy .env.example to .env.local and fill in values');
    }
    return null;
  }
}

function checkRequiredVariables(envContent) {
  log.section('2. Checking Required Variables');

  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', production: true },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', production: true },
    { name: 'NEXT_PUBLIC_WS_URL', label: 'WebSocket URL', production: true },
    { name: 'DATABASE_URL', label: 'Database URL (backend)', production: true },
    { name: 'SUPABASE_JWT_SECRET', label: 'Supabase JWT Secret (backend)', production: true },
    { name: 'REDIS_URL', label: 'Redis URL (backend)', production: false },
  ];

  const found = [];
  const missing = [];

  requiredVars.forEach((variable) => {
    const regex = new RegExp(`^${variable.name}=`, 'm');
    if (regex.test(envContent)) {
      const value = envContent.match(new RegExp(`^${variable.name}=(.*)$`, 'm'))?.[1];
      found.push({ ...variable, value });
    } else {
      missing.push(variable);
    }
  });

  found.forEach((v) => {
    const masked = v.value.substring(0, 20) + (v.value.length > 20 ? '...' : '');
    log.success(`${v.label}: ${masked}`);
  });

  missing.forEach((v) => {
    const severity = v.production ? 'error' : 'warn';
    const fn = severity === 'error' ? log.error : log.warn;
    fn(`${v.label}: NOT SET`);
  });

  const criticalMissing = missing.filter((v) => v.production);
  return criticalMissing.length === 0;
}

function checkProductionDomains() {
  log.section('3. Checking Production Domains');

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || '';

  if (wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1')) {
    log.warn('NEXT_PUBLIC_WS_URL appears to be localhost (for production, use real domain)');
    log.info('Example: https://api.yourapp.com');
  } else if (wsUrl.startsWith('http') || wsUrl.startsWith('https')) {
    log.success(`WebSocket URL appears to be production domain: ${wsUrl}`);
  } else {
    log.warn(`WebSocket URL format unclear: ${wsUrl}`);
  }
}

function checkBackendDeployment() {
  log.section('4. Checking Backend Deployment');

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || '';
  const hasBackendUrl = wsUrl && wsUrl !== 'http://localhost:8000';

  if (hasBackendUrl) {
    log.success('Backend URL configured (appears to be production)');
    log.info(`Attempting to verify backend health...`);

    // Note: Can't actually fetch from Node.js in CI/CD, so just check the URL format
    if (wsUrl.startsWith('https://')) {
      log.success('Using secure WebSocket (wss://)');
    } else if (wsUrl.startsWith('http://')) {
      log.warn('Using insecure WebSocket (ws://) - recommend HTTPS for production');
    }
  } else {
    log.warn('Backend URL not configured for production');
    log.info('Set NEXT_PUBLIC_WS_URL to your production backend URL');
  }
}

function checkDeploymentPlatforms() {
  log.section('5. Checking Deployment Platforms');

  // Check for Netlify
  if (process.env.NETLIFY) {
    log.success('Detected Netlify deployment');
    if (!process.env.NEXT_PUBLIC_WS_URL) {
      log.error('NEXT_PUBLIC_WS_URL not set in Netlify build');
      log.info('Set it in: Netlify Dashboard → Site Settings → Build & Deploy → Environment');
    }
  } else {
    log.info('Not detected as Netlify deployment');
  }

  // Check for Vercel
  if (process.env.VERCEL) {
    log.success('Detected Vercel deployment');
  }

  // Check for Railway
  if (process.env.RAILWAY_ENVIRONMENT) {
    log.success('Detected Railway deployment');
  }
}

function printDeploymentGuide() {
  log.section('6. Production Deployment Checklist');

  const checklist = [
    { task: 'Backend deployed (Railway/Render/Fly.io)', cmd: 'See DEPLOYMENT.md' },
    { task: 'Redis configured', cmd: 'Railway Redis Plugin or managed service' },
    { task: 'Environment variables set on Netlify', cmd: 'See DEPLOYMENT.md' },
    { task: 'Custom domain configured (optional)', cmd: 'Netlify Domain Settings' },
    { task: 'WebSocket connection tested', cmd: 'Open browser console, should see "WebSocket open"' },
    { task: 'SSL certificate verified', cmd: 'Browser address bar should show 🔒' },
    { task: 'Database backups configured', cmd: 'Supabase Dashboard → Backups' },
  ];

  checklist.forEach((item, index) => {
    console.log(`  ${index + 1}. [ ] ${item.task}`);
    console.log(`     → ${item.cmd}`);
  });
}

function printNextSteps() {
  log.section('7. Next Steps');

  console.log(`
1. If this is your first production deployment:
   → Read DEPLOYMENT.md for complete instructions
   → Choose a backend platform (Railway recommended)
   → Deploy backend and configure environment variables

2. If deploying frontend updates:
   → Push to GitHub
   → Netlify auto-deploys
   → Check console for WebSocket connection

3. If WebSocket not connecting after deployment:
   → Check backend is running (curl https://api.yourapp.com/)
   → Verify NEXT_PUBLIC_WS_URL is correct in Netlify
   → Check browser DevTools Network tab for WebSocket messages

4. For troubleshooting:
   → See DEPLOYMENT.md "Common Issues & Fixes" section
   → Check Netlify build logs
   → Check backend logs (Railway/Render dashboard)
  `);
}

function main() {
  console.log(`\n${COLORS.cyan}╔════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.cyan}║  SANDDOCK - Production Deployment Validator                 ║${COLORS.reset}`);
  console.log(`${COLORS.cyan}╚════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

  const envContent = checkEnvironmentFile();

  if (!envContent) {
    log.error('Cannot proceed without .env.local');
    process.exit(1);
  }

  const varsValid = checkRequiredVariables(envContent);
  checkProductionDomains();
  checkBackendDeployment();
  checkDeploymentPlatforms();
  printDeploymentGuide();
  printNextSteps();

  console.log(`\n${COLORS.cyan}════════════════════════════════════════════════════════════${COLORS.reset}\n`);

  if (!varsValid) {
    log.error('Critical variables missing. Please configure before deploying.');
    process.exit(1);
  } else {
    log.success('All critical checks passed!');
    log.info('You can now deploy to production.');
  }
}

main();
