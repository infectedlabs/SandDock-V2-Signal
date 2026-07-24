/**
 * Plan tiers, manual USDT pricing, and referral commission math for Sanddock.
 * All payments are manual (USDT TRC20) - an admin confirms payment and
 * upgrades the user's plan by hand in /admin/users. There is no self-serve
 * checkout and no automated recurring billing.
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free Plan',
    description: 'Start with BTC signals - upgrade when the edge proves itself.',
    features: [
      'BTC/USDT signals - 30m timeframe',
      'Real-time web dashboard',
      'Full BTC signal history (log + performance)',
      'Basic BTC Heikin Ashi chart view',
      'Free BTC Telegram group alerts',
      'Stop Loss & Take Profit levels (locked)',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    prices: { monthly: 100, yearly: 1000 },
    description: 'For active traders who want BTC, ETH, and BNB signals with automated risk management.',
    features: [
      'BTC + ETH + BNB signals - 30m timeframe',
      'Automated Stop Loss & Take Profit levels',
      'Added to Pro Telegram channel',
      'P&L dashboard & full performance metrics',
      'CSV export of signal history',
      'Priority 12h email support',
    ],
  },

  master: {
    id: 'master',
    name: 'Master',
    prices: { monthly: 250, yearly: 2500 },
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
  },

  grandmaster: {
    id: 'grandmaster',
    name: 'GrandMaster',
    prices: { lifetime: 999 },
    description: 'Permanent Master-level access - one payment, forever.',
    features: [
      'Everything in Master - permanently',
      'All future coins, features & updates included',
      'Dedicated premium support access',
      'GrandMaster certification tag',
      'No recurring fees, ever',
    ],
  },
};

export const BILLING_CYCLES_BY_PLAN = {
  pro: ['monthly', 'yearly'],
  master: ['monthly', 'yearly'],
  grandmaster: ['lifetime'],
};

export const REFERRAL_COMMISSION_RATE = 0.10;

export function getPlan(planId) {
  return PLANS[planId] ?? PLANS.free;
}

/** Returns the USDT price for a plan + billing cycle, or null if invalid. */
export function getPlanPrice(plan, billingCycle) {
  const planObj = PLANS[plan];
  if (!planObj?.prices) return null;
  return planObj.prices[billingCycle] ?? null;
}

/** Returns true if the plan is a paid plan (not free). */
export function isPaidPlan(plan) {
  return ['pro', 'master', 'grandmaster'].includes(plan);
}

/** 10% of the plan price, rounded to 2 decimals. */
export function getCommissionAmount(plan, billingCycle) {
  const price = getPlanPrice(plan, billingCycle);
  if (price == null) return null;
  return Math.round(price * REFERRAL_COMMISSION_RATE * 100) / 100;
}

/**
 * Computes when a plan expires from a given start date.
 * Grandmaster (lifetime) never expires - returns null.
 */
export function computePlanEndsAt(plan, billingCycle, from = new Date()) {
  if (plan === 'free' || billingCycle === 'lifetime') return null;
  const end = new Date(from);
  if (billingCycle === 'yearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end.toISOString();
}
