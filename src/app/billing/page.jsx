'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const PLAN_COLORS = {
  free:     'text-zinc-400',
  trial:    'text-blue-400',
  pro:      'text-brand-orange',
  master:   'text-purple-400',
  lifetime: 'text-amber-400',
  expired:  'text-red-400',
};

const STATUS_BADGES = {
  trial:     { label: 'Active Trial',    bg: 'bg-blue-500/10  text-blue-400  border-blue-500/20'  },
  active:    { label: 'Active',          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelled',       bg: 'bg-amber-500/10  text-amber-400 border-amber-500/20'  },
  on_hold:   { label: 'On Hold',         bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  expired:   { label: 'Expired',         bg: 'bg-red-500/10    text-red-400   border-red-500/20'   },
  lifetime:  { label: 'Lifetime Member', bg: 'bg-amber-500/10  text-amber-400 border-amber-500/30'  },
};

function formatDate(isoString) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

export default function BillingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/billing/status?userId=${user.id}`);
        if (res.ok) setBilling(await res.json());
      } catch (e) {
        console.error('Failed to load billing:', e);
      } finally {
        setBillingLoading(false);
      }
    };
    load();
  }, [user]);

  const handleUpgrade = async (plan, billingCycle = 'monthly') => {
    if (!user) return;
    setCheckoutLoading(`${plan}_${billingCycle}`);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle, userId: user.id }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(`Error: ${data.error || 'Could not create checkout session.'}`);
      }
    } catch (e) {
      alert('An error occurred. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading || billingLoading) {
    return (
      <div className="min-h-screen bg-[#060c1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-brand-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const plan = billing?.plan || profile?.plan || 'free';
  const status = billing?.subscriptionStatus || 'trial';
  const trialDays = billing?.trialDaysRemaining;
  const isTrialExpired = billing?.isTrialExpired;
  const statusBadge = STATUS_BADGES[status] || STATUS_BADGES.trial;
  const payments = billing?.payments || [];

  const isFreePlan = plan === 'free';
  const isPaid = ['pro', 'master', 'lifetime'].includes(plan);

  return (
    <div className="min-h-screen bg-[#060c1a] text-white">

      {/* Header */}
      <header className="border-b border-[#1e2a3a] bg-[#080d1a]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/terminal" className="text-zinc-500 hover:text-white transition-colors text-sm font-mono">← Terminal</a>
            <span className="text-zinc-700">|</span>
            <span className="text-sm font-bold uppercase tracking-wider text-white">Billing & Plan</span>
          </div>
          <a href="/pricing" className="text-xs font-bold text-brand-orange uppercase tracking-wider hover:underline">View Plans</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Current Plan Card */}
        <section className="bg-[#0d1426] border border-[#1e2a3a] rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Current Plan</span>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className={`text-2xl font-extrabold uppercase tracking-tight ${PLAN_COLORS[plan] || 'text-white'}`}>
                  {plan === 'lifetime' ? 'GrandMaster Lifetime' : `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`}
                </h1>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
              </div>

              {/* Trial countdown */}
              {isFreePlan && !isTrialExpired && trialDays !== null && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-1.5 w-40 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-orange rounded-full transition-all"
                      style={{ width: `${Math.max(5, ((7 - (7 - trialDays)) / 7) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {trialDays} day{trialDays !== 1 ? 's' : ''} remaining
                  </span>
                </div>
              )}

              {isTrialExpired && (
                <p className="text-[12px] text-red-400 font-bold uppercase tracking-wider">
                  ⚠ Trial ended - upgrade to restore live signals
                </p>
              )}

              {isPaid && billing?.currentPeriodEnd && (
                <p className="text-[12px] text-zinc-400 font-mono">
                  {status === 'cancelled'
                    ? `Access until: ${formatDate(billing.currentPeriodEnd)}`
                    : `Renews: ${formatDate(billing.currentPeriodEnd)}`}
                </p>
              )}

              {plan === 'lifetime' && (
                <p className="text-[12px] text-amber-400 font-mono font-bold">♾ Permanent access - no renewal needed</p>
              )}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2 min-w-[160px]">
              {isFreePlan && (
                <>
                  <button
                    onClick={() => handleUpgrade('pro', 'monthly')}
                    disabled={!!checkoutLoading}
                    className="px-5 py-2.5 bg-brand-orange hover:bg-white hover:text-black text-white font-bold text-[11px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {checkoutLoading === 'pro_monthly' ? 'Loading…' : 'Upgrade to Pro'}
                  </button>
                  <button
                    onClick={() => handleUpgrade('master', 'monthly')}
                    disabled={!!checkoutLoading}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-white hover:text-black text-white font-bold text-[11px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {checkoutLoading === 'master_monthly' ? 'Loading…' : 'Upgrade to Master'}
                  </button>
                </>
              )}
              {plan === 'pro' && (
                <button
                  onClick={() => handleUpgrade('master', 'monthly')}
                  disabled={!!checkoutLoading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-white hover:text-black text-white font-bold text-[11px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {checkoutLoading === 'master_monthly' ? 'Loading…' : 'Upgrade to Master'}
                </button>
              )}
              {plan !== 'lifetime' && (
                <button
                  onClick={() => handleUpgrade('lifetime', 'lifetime')}
                  disabled={!!checkoutLoading}
                  className="px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-black font-bold text-[11px] uppercase tracking-widest rounded-xl transition-all border border-amber-500/30 disabled:opacity-50 cursor-pointer"
                >
                  {checkoutLoading === 'lifetime_lifetime' ? 'Loading…' : 'Get Lifetime - $799'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Plan Feature Summary */}
        <section className="bg-[#0d1426] border border-[#1e2a3a] rounded-2xl p-6 sm:p-8">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-zinc-300 mb-5">Your Plan Includes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            {[
              { label: 'Signals Access', value: plan === 'free' ? 'BTC/USDT only' : plan === 'pro' ? 'BTC, ETH, BNB' : 'All 15 pairs' },
              { label: 'Timeframes', value: 'All (15m, 1h, 4h)' },
              { label: 'SL/TP Levels', value: plan === 'free' ? 'Locked' : 'Visible' },
              { label: 'Telegram Alerts', value: plan === 'free' ? 'None' : plan === 'pro' ? '1 Chat/Group' : 'Unlimited' },
              { label: 'AI Explanation', value: isTrialExpired ? 'Paused (upgrade)' : 'Full text' },
              { label: 'CSV Export', value: isPaid ? 'Enabled' : 'Locked' },
              { label: 'Live Active Signals', value: isTrialExpired ? 'Paused (trial expired)' : 'Active' },
              { label: 'Signal History', value: isPaid ? (plan === 'pro' ? '3 coins' : 'All coins') : 'BTC read-only' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between bg-[#060c1a] border border-[#1a2235] rounded-xl px-4 py-2.5">
                <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px]">{label}</span>
                <span className="font-bold text-white text-[11px]">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Payment History */}
        <section className="bg-[#0d1426] border border-[#1e2a3a] rounded-2xl p-6 sm:p-8">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-zinc-300 mb-5">Payment History</h2>
          {payments.length === 0 ? (
            <div className="text-center py-10 text-zinc-600">
              <p className="text-[13px] font-mono">No payments recorded yet.</p>
              {isFreePlan && <p className="text-[11px] mt-1">Upgrade to Pro or Master to unlock premium signals.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[#1e2a3a] text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Plan</th>
                    <th className="pb-3 pr-4">Cycle</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2235]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#111827] transition-colors">
                      <td className="py-3 pr-4 font-mono text-zinc-400">{formatDate(p.created_at)}</td>
                      <td className="py-3 pr-4 font-bold uppercase text-white">{p.plan}</td>
                      <td className="py-3 pr-4 capitalize text-zinc-400">{p.billing_cycle || '-'}</td>
                      <td className="py-3 pr-4 font-mono font-bold text-emerald-400">{formatCurrency(p.amount, p.currency)}</td>
                      <td className="py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                          p.status === 'succeeded'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Manage Subscription */}
        {isPaid && status !== 'lifetime' && (
          <section className="bg-[#0d1426] border border-[#1e2a3a] rounded-2xl p-6 sm:p-8">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-zinc-300 mb-2">Manage Subscription</h2>
            <p className="text-[12px] text-zinc-500 mb-5">
              To cancel or update your payment method, contact us at{' '}
              <a href="mailto:support@sanddock.com" className="text-brand-orange hover:underline">support@sanddock.com</a>
              . You'll keep access until the end of your billing period.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:support@sanddock.com?subject=Cancel Subscription"
                className="px-5 py-2 text-[11px] font-bold uppercase tracking-widest border border-red-700/50 text-red-400 hover:bg-red-700/10 rounded-xl transition-all"
              >
                Request Cancellation
              </a>
              <a
                href="mailto:support@sanddock.com?subject=Update Payment Method"
                className="px-5 py-2 text-[11px] font-bold uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:bg-zinc-800 rounded-xl transition-all"
              >
                Update Payment Method
              </a>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
