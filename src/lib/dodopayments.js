/**
 * Dodo Payments configuration for Sanddock.
 * Contains plan definitions, product ID mappings, and access-control helpers.
 */

export const PLANS = {
  free: {
    id: 'free',
    name: '7-Day Free Trial',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Start with BTC signals — upgrade when the edge proves itself.',
    features: [
      'BTC/USDT signals — all 3 timeframes (15m, 1h, 4h)',
      'Real-time web dashboard',
      'AI explanation & confidence score',
      'Full BTC signal history (log + performance)',
      'Basic BTC Heikin Ashi chart view',
      'No Automated Stop Loss & Take Profit',
      'No Telegram alerts',
    ],
    limits: {
      symbols: ['BTCUSDT'],
      timeframes: ['15m', '1h', '4h'],
      telegramChats: 0,
      csvExport: false,
      slTpVisible: false,
      haChart: ['BTCUSDT'],
    },
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 19,  // billed annually at $228
    yearlyTotal: 228,
    monthlyProductId: process.env.DODO_PRO_MONTHLY_PRODUCT_ID,
    yearlyProductId: process.env.DODO_PRO_YEARLY_PRODUCT_ID,
    description: 'For active retail traders who want diversified altcoin signals.',
    features: [
      'BTC + ETH + BNB signals (Top 3 premium pairs)',
      '15m, 1h, and 4h timeframes for all 3 coins',
      'Automated Stop Loss & Take Profit levels',
      'Telegram alerts (1 paired chat or group)',
      'P&L calculator & full metrics dashboard',
      'AI explanation & confidence score',
      'CSV export of signal history',
      'Priority 24h email support',
    ],
    limits: {
      symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
      timeframes: ['15m', '1h', '4h'],
      telegramChats: 1,
      csvExport: true,
      slTpVisible: true,
      haChart: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
    },
  },

  master: {
    id: 'master',
    name: 'Master',
    monthlyPrice: 79,
    yearlyPrice: 49,  // billed annually at $588
    yearlyTotal: 588,
    monthlyProductId: process.env.DODO_MASTER_MONTHLY_PRODUCT_ID,
    yearlyProductId: process.env.DODO_MASTER_YEARLY_PRODUCT_ID,
    description: 'Built for power traders who need full altcoin coverage.',
    features: [
      'All 15 premium altcoins scanned 24/7',
      'All timeframes: 15m, 1h, and 4h',
      'Automated Stop Loss & Take Profit levels',
      'Unlimited Telegram alerts & channels',
      'Multi-timeframe trend confluence analysis',
      'Full P&L history & export',
      'AI explanation & confidence score',
      'Priority 12h email support',
    ],
    limits: {
      symbols: 'all',
      timeframes: ['15m', '1h', '4h'],
      telegramChats: -1, // unlimited
      csvExport: true,
      slTpVisible: true,
      haChart: 'all',
    },
  },

  lifetime: {
    id: 'lifetime',
    name: 'GrandMaster Lifetime',
    oneTimePrice: 799,
    productId: process.env.DODO_LIFETIME_PRODUCT_ID,
    description: 'Permanent Master-level access — one payment, forever.',
    features: [
      'Everything in Master — permanently',
      'All future coins, features & updates included',
      'Dedicated premium support access',
      'GrandMaster certification tag',
      'No recurring fees, ever',
    ],
    limits: {
      symbols: 'all',
      timeframes: ['15m', '1h', '4h'],
      telegramChats: -1,
      csvExport: true,
      slTpVisible: true,
      haChart: 'all',
    },
  },
};

export function getPlan(planId) {
  return PLANS[planId] ?? PLANS.free;
}

export function getProductId(plan, billingCycle) {
  if (plan === 'lifetime') return PLANS.lifetime.productId;
  const planObj = PLANS[plan];
  if (!planObj) return null;
  return billingCycle === 'yearly' ? planObj.yearlyProductId : planObj.monthlyProductId;
}

/** Returns true if the plan is a paid/active plan (not free/trial/expired) */
export function isPaidPlan(plan) {
  return ['pro', 'master', 'lifetime'].includes(plan);
}

/**
 * Compute remaining trial days for a free user.
 * Returns null if the user is not on trial.
 */
export function getTrialDaysRemaining(profile) {
  if (!profile?.trial_ends_at) return null;
  if (profile.plan !== 'free') return null;
  const msLeft = new Date(profile.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

/**
 * Returns true if the user's free trial has expired.
 */
export function isTrialExpired(profile) {
  if (!profile) return false;
  if (profile.plan !== 'free') return false;
  if (!profile.trial_ends_at) return false; // no expiry = still valid
  return new Date() > new Date(profile.trial_ends_at);
}
