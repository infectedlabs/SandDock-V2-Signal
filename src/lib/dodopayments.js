/**
 * Dodo Payments configuration for Sanddock.
 * Contains plan definitions, product ID mappings, and access-control helpers.
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free Plan',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Start with BTC signals - upgrade when the edge proves itself.',
    features: [
      'BTC/USDT signals - 30m timeframe',
      'Real-time web dashboard',
      'Full BTC signal history (log + performance)',
      'Basic BTC Heikin Ashi chart view',
      'Free BTC Telegram group alerts',
      'Stop Loss & Take Profit levels (locked)',
    ],
    limits: {
      symbols: ['BTCUSDT'],
      timeframes: ['30m'],
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
    description: 'For active traders who want BTC, ETH, and BNB signals with automated risk management.',
    features: [
      'BTC + ETH + BNB signals - 30m timeframe',
      'Automated Stop Loss & Take Profit levels',
      'Added to Pro Telegram channel',
      'P&L dashboard & full performance metrics',
      'CSV export of signal history',
      'Priority 12h email support',
    ],
    limits: {
      symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
      timeframes: ['30m'],
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
    description: 'For power traders and quants who want personalized signals and API access.',
    features: [
      'Everything in Pro (BTC + ETH + BNB - 30m)',
      'Choose 5 custom coins - signals sent directly to you',
      'Automated SL & TP on all 8 coins',
      'Full P&L history & CSV export across all coins',
      'Custom coin picker',
      'Position sizing calculator',
      'Weekly portfolio digest',
      'Read-only API endpoint for integrations',
      'Priority 6h email support',
    ],
    limits: {
      symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'], // + 5 user-chosen custom coins
      timeframes: ['30m'],
      telegramChats: 1, // Pro channel, plus DMs for custom coins
      csvExport: true,
      slTpVisible: true,
      haChart: 'all', // all 8 coins
      customCoinsLimit: 5,
      apiAccess: true,
    },
  },

  lifetime: {
    id: 'lifetime',
    name: 'GrandMaster Lifetime',
    oneTimePrice: 799,
    productId: process.env.DODO_LIFETIME_PRODUCT_ID,
    description: 'Permanent Master-level access - one payment, forever.',
    features: [
      'Everything in Master - permanently',
      'All future coins, features & updates included',
      'Dedicated premium support access',
      'GrandMaster certification tag',
      'No recurring fees, ever',
    ],
    limits: {
      symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'], // + 5 user-chosen custom coins (same as Master)
      timeframes: ['30m'],
      telegramChats: 1,
      csvExport: true,
      slTpVisible: true,
      haChart: 'all',
      customCoinsLimit: 5,
      apiAccess: true,
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
