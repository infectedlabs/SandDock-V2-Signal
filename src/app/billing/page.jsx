'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const PLAN_COLORS = {
  free:     'text-zinc-600',
  trial:    'text-blue-600',
  pro:      'text-brand-orange',
  master:   'text-purple-600',
  lifetime: 'text-amber-600',
  expired:  'text-red-600',
};

const STATUS_BADGES = {
  trial:     { label: 'Active Trial',    bg: 'bg-blue-100 text-blue-800 border-blue-300' },
  active:    { label: 'Active',          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  cancelled: { label: 'Cancelled',       bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  on_hold:   { label: 'On Hold',         bg: 'bg-orange-100 text-orange-800 border-orange-300' },
  expired:   { label: 'Expired',         bg: 'bg-red-100 text-red-800 border-red-300' },
  lifetime:  { label: 'Lifetime Member', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
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
      <div className="min-h-screen bg-white flex items-center justify-center border-t-4 border-brand-orange">
        <div className="w-8 h-8 border-3 border-zinc-200 border-t-brand-orange rounded-none animate-spin" />
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
    <div className="min-h-screen bg-[#f8f9fa] text-black">
      {/* Header */}
      <header className="border-b-2 border-black bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/terminal" className="text-zinc-600 hover:text-black transition-colors text-xs font-mono font-bold uppercase tracking-wider">← Terminal</a>
            <span className="text-black font-extrabold">|</span>
            <span className="text-xs font-black uppercase tracking-widest text-black">Billing & Plan</span>
          </div>
          <a href="/pricing" className="text-xs font-extrabold text-brand-orange uppercase tracking-wider hover:underline">View Plans</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Two-column layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column - Main Details (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Current Plan Card */}
            <section className="border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
              {plan !== 'free' && (
                <span className="absolute top-0 right-6 -translate-y-1/2 bg-brand-orange text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 border border-black">
                  Active Member
                </span>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Current Plan</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className={`text-2xl font-black uppercase tracking-tight ${PLAN_COLORS[plan] || 'text-black'}`}>
                      {plan === 'lifetime' ? 'GrandMaster Lifetime' : `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`}
                    </h1>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 border border-black uppercase tracking-widest ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Trial countdown */}
                  {isFreePlan && !isTrialExpired && trialDays !== null && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-3 w-42 bg-zinc-100 border border-black rounded-none overflow-hidden">
                        <div
                          className="h-full bg-brand-orange transition-all"
                          style={{ width: `${Math.max(5, ((7 - (7 - trialDays)) / 7) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-zinc-600">
                        {trialDays} day{trialDays !== 1 ? 's' : ''} remaining
                      </span>
                    </div>
                  )}

                  {isTrialExpired && (
                    <p className="text-[12px] text-red-600 font-extrabold uppercase tracking-wider">
                      ⚠ Trial ended - upgrade to restore live signals
                    </p>
                  )}

                  {isPaid && billing?.currentPeriodEnd && (
                    <p className="text-[12px] text-zinc-600 font-mono font-bold">
                      {status === 'cancelled'
                        ? `Access until: ${formatDate(billing.currentPeriodEnd)}`
                        : `Renews: ${formatDate(billing.currentPeriodEnd)}`}
                    </p>
                  )}

                  {plan === 'lifetime' && (
                    <p className="text-[12px] text-amber-600 font-mono font-extrabold">♾ Permanent access - no renewal needed</p>
                  )}
                </div>

                {/* CTA buttons */}
                <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto">
                  {isFreePlan && (
                    <>
                      <button
                        onClick={() => handleUpgrade('pro', 'monthly')}
                        disabled={!!checkoutLoading}
                        className="w-full py-2.5 bg-brand-orange hover:bg-black text-white font-bold text-[11px] uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50"
                      >
                        {checkoutLoading === 'pro_monthly' ? 'Loading…' : 'Upgrade to Pro'}
                      </button>
                      <button
                        onClick={() => handleUpgrade('master', 'monthly')}
                        disabled={!!checkoutLoading}
                        className="w-full py-2.5 bg-purple-600 hover:bg-black text-white font-bold text-[11px] uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50"
                      >
                        {checkoutLoading === 'master_monthly' ? 'Loading…' : 'Upgrade to Master'}
                      </button>
                    </>
                  )}
                  {plan === 'pro' && (
                    <button
                      onClick={() => handleUpgrade('master', 'monthly')}
                      disabled={!!checkoutLoading}
                      className="w-full py-2.5 bg-purple-600 hover:bg-black text-white font-bold text-[11px] uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {checkoutLoading === 'master_monthly' ? 'Loading…' : 'Upgrade to Master'}
                    </button>
                  )}
                  {plan !== 'lifetime' && (
                    <button
                      onClick={() => handleUpgrade('lifetime', 'lifetime')}
                      disabled={!!checkoutLoading}
                      className="w-full py-2.5 bg-amber-400 hover:bg-black text-black hover:text-white font-bold text-[11px] uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {checkoutLoading === 'lifetime_lifetime' ? 'Loading…' : 'Get Lifetime - $799'}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Payment History Card */}
            <section className="border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-[13px] font-black uppercase tracking-wider text-black mb-5 border-b-2 border-black pb-2">Payment History</h2>
              {payments.length === 0 ? (
                <div className="text-center py-10 border border-black bg-[#f8f9fa]">
                  <p className="text-[13px] font-mono font-bold text-zinc-600">No payments recorded yet.</p>
                  {isFreePlan && <p className="text-[11px] font-mono text-zinc-500 mt-1 uppercase">Upgrade to Pro or Master to unlock premium signals.</p>}
                </div>
              ) : (
                <div className="overflow-x-auto border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <table className="w-full text-left border-collapse text-[12px] bg-white">
                    <thead>
                      <tr className="bg-zinc-100 border-b-2 border-black text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-700">
                        <th className="p-3">Date</th>
                        <th className="p-3">Plan</th>
                        <th className="p-3">Cycle</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-black/10 divide-black/10">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="p-3 font-mono text-zinc-600">{formatDate(p.created_at)}</td>
                          <td className="p-3 font-extrabold uppercase text-black">{p.plan}</td>
                          <td className="p-3 capitalize text-zinc-600">{p.billing_cycle || '-'}</td>
                          <td className="p-3 font-mono font-bold text-emerald-600">{formatCurrency(p.amount, p.currency)}</td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 font-mono font-bold border border-black ${
                              p.status === 'succeeded'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
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

          </div>

          {/* Right Column - Secondary Actions (1/3 width) */}
          <div className="space-y-8">
            
            {/* Plan Feature Summary Card */}
            <section className="border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-[13px] font-black uppercase tracking-wider text-black mb-5 border-b-2 border-black pb-2">Your Plan Includes</h2>
              <div className="flex flex-col gap-4 text-[12px]">
                {[
                  { label: 'Signals Access', value: plan === 'free' ? 'BTC/USDT only' : plan === 'pro' ? 'BTC, ETH, BNB' : 'All 15 pairs' },
                  { label: 'Timeframes', value: 'All (15m, 1h, 4h)' },
                  { label: 'SL/TP Levels', value: plan === 'free' ? 'Locked' : 'Visible' },
                  { label: 'Telegram Alerts', value: plan === 'free' ? 'None' : plan === 'pro' ? '1 Chat/Group' : 'Unlimited' },
                  { label: 'AI Explanation', value: isTrialExpired ? 'Paused (upgrade)' : 'Full text' },
                  { label: 'CSV Export', value: isPaid ? 'Enabled' : 'Locked' },
                  { label: 'Live Active Signals', value: isTrialExpired ? 'Paused' : 'Active' },
                  { label: 'Signal History', value: isPaid ? (plan === 'pro' ? '3 coins' : 'All coins') : 'BTC read-only' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between bg-[#f8f9fa] border border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-zinc-600 font-mono uppercase tracking-wider text-[10px] font-bold">{label}</span>
                    <span className="font-extrabold text-black text-[11px] uppercase">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Manage Subscription Card */}
            {isPaid && status !== 'lifetime' && (
              <section className="border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-[13px] font-black uppercase tracking-wider text-black mb-2 border-b-2 border-black pb-2">Manage Subscription</h2>
                <p className="text-[12px] text-zinc-600 mb-5 font-medium leading-relaxed">
                  To cancel or update your payment method, contact us at{' '}
                  <a href="mailto:support@sanddock.com" className="text-brand-orange hover:underline font-bold">support@sanddock.com</a>
                  . You'll keep access until the end of your billing period.
                </p>
                <div className="flex flex-col gap-3">
                  <a
                    href="mailto:support@sanddock.com?subject=Cancel Subscription"
                    className="py-2.5 px-5 text-center text-[11px] font-bold uppercase tracking-widest bg-white hover:bg-red-50 text-red-600 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                  >
                    Request Cancellation
                  </a>
                  <a
                    href="mailto:support@sanddock.com?subject=Update Payment Method"
                    className="py-2.5 px-5 text-center text-[11px] font-bold uppercase tracking-widest bg-white hover:bg-zinc-100 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                  >
                    Update Payment Method
                  </a>
                </div>
              </section>
            )}

          </div>
          
        </div>
      </main>
    </div>
  );
}
