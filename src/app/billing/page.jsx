'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const PLAN_COLORS = {
  free:     'text-zinc-400',
  trial:    'text-[#3D5AFE]',
  pro:      'text-brand-orange',
  master:   'text-purple-400',
  lifetime: 'text-amber-400',
  expired:  'text-red-400',
};

const STATUS_BADGES = {
  free:      { label: 'Free Tier',       bg: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  trial:     { label: 'Trial Active',    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  active:    { label: 'Active Member',   bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelled',       bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  on_hold:   { label: 'On Hold',         bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  expired:   { label: 'Expired',         bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
  lifetime:  { label: 'Lifetime Member', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
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
  const { user, profile, loading, updateProfile } = useAuth();
  const router = useRouter();

  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  // States for payment success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPlan, setSuccessPlan] = useState('');
  const [tgPairingStep, setTgPairingStep] = useState(1);
  const [tgPairingCode, setTgPairingCode] = useState(['', '', '', '', '', '']);
  const [tgStatus, setTgStatus] = useState('');
  const [isTelegramChannelJoined, setIsTelegramChannelJoined] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        setShowSuccessModal(true);
        setSuccessPlan(params.get('plan') || 'pro');
      }
      setIsTelegramChannelJoined(localStorage.getItem('sanddock_tg_channel_joined') === 'true');
    }
  }, []);

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
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-[#3D5AFE] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const plan = billing?.plan || profile?.plan || 'free';
  const status = plan === 'free' ? 'free' : (billing?.subscriptionStatus || 'active');
  const trialDays = null;
  const isTrialExpired = false;
  const statusBadge = STATUS_BADGES[status] || STATUS_BADGES.active;
  const payments = billing?.payments || [];

  const isFreePlan = plan === 'free';
  const isPaid = ['pro', 'master', 'lifetime'].includes(plan);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="border-b border-[#1e2d4a]/50 bg-[#0b1224]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/terminal" className="text-zinc-400 hover:text-white transition-colors text-xs font-mono font-bold uppercase tracking-wider">← Terminal Console</a>
            <span className="text-slate-800">|</span>
            <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Billing & Plan</span>
          </div>
          <a href="/pricing" className="text-xs font-extrabold text-[#3D5AFE] uppercase tracking-wider hover:text-white transition-colors">View Plans & Pricing</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Two-column layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column - Main Details (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Current Plan Card */}
            <section className="bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-6 sm:p-8 rounded-2xl text-left shadow-2xl relative">
              {plan !== 'free' && (
                <span className="absolute top-0 right-6 -translate-y-1/2 bg-[#3D5AFE]/15 border border-[#3D5AFE]/30 text-[#3D5AFE] text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                  {status === 'trial' ? 'Trial Member' : 'Active Member'}
                </span>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Current Plan</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className={`text-2xl font-black uppercase tracking-tight ${PLAN_COLORS[plan] || 'text-white'}`}>
                      {plan === 'lifetime' ? 'GrandMaster Lifetime' : `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`}
                    </h1>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 border uppercase tracking-widest rounded-full ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>


                  {isPaid && billing?.currentPeriodEnd && (
                    <p className="text-[12px] text-zinc-400 font-mono font-bold">
                      {status === 'cancelled'
                        ? `Access until: ${formatDate(billing.currentPeriodEnd)}`
                        : `Renews: ${formatDate(billing.currentPeriodEnd)}`}
                    </p>
                  )}

                  {plan === 'lifetime' && (
                    <p className="text-[12px] text-amber-400 font-mono font-extrabold">♾ Permanent access - no renewal needed</p>
                  )}
                </div>

                {/* CTA buttons */}
                <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto">
                  {isFreePlan && (
                    <>
                      <button
                        onClick={() => handleUpgrade('pro', 'monthly')}
                        disabled={!!checkoutLoading}
                        className="w-full py-2.5 rounded-xl bg-[#3D5AFE] hover:bg-[#2e4be6] border-0 text-white font-bold text-[11px] uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {checkoutLoading === 'pro_monthly' ? 'Loading…' : 'Upgrade to Pro'}
                      </button>
                      <button
                        onClick={() => handleUpgrade('master', 'monthly')}
                        disabled={!!checkoutLoading}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 border-0 text-white font-bold text-[11px] uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {checkoutLoading === 'master_monthly' ? 'Loading…' : 'Upgrade to Master'}
                      </button>
                    </>
                  )}
                  {plan === 'pro' && (
                    <button
                      onClick={() => handleUpgrade('master', 'monthly')}
                      disabled={!!checkoutLoading}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 border-0 text-white font-bold text-[11px] uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {checkoutLoading === 'master_monthly' ? 'Loading…' : 'Upgrade to Master'}
                    </button>
                  )}
                  {plan !== 'lifetime' && (
                    <button
                      onClick={() => handleUpgrade('lifetime', 'lifetime')}
                      disabled={!!checkoutLoading}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 border-0 text-slate-950 font-black text-[11px] uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {checkoutLoading === 'lifetime_lifetime' ? 'Loading…' : 'Get Lifetime - $799'}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Payment History Card */}
            <section className="bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-6 sm:p-8 rounded-2xl text-left shadow-2xl">
              <h2 className="text-[13px] font-black uppercase tracking-wider text-white mb-5 border-b border-[#1e2d4a] pb-2">Payment History</h2>
              {payments.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 bg-[#020617]/40 rounded-xl">
                  <p className="text-[13px] font-mono font-bold text-zinc-500">No payments recorded yet.</p>
                  {isFreePlan && <p className="text-[11px] font-mono text-zinc-600 mt-1 uppercase">Upgrade to Pro or Master to unlock premium signals.</p>}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#1e2d4a] shadow-inner bg-[#020617]/50">
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-[#1e2d4a] text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                        <th className="p-3">Date</th>
                        <th className="p-3">Plan</th>
                        <th className="p-3">Cycle</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2d4a]/30 font-mono text-zinc-300">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="p-3 text-zinc-500">{formatDate(p.created_at)}</td>
                          <td className="p-3 font-extrabold uppercase text-white">{p.plan}</td>
                          <td className="p-3 capitalize text-zinc-400">{p.billing_cycle || '-'}</td>
                          <td className="p-3 font-bold text-[#00e676]">{formatCurrency(p.amount, p.currency)}</td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 font-bold border rounded-full ${
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

          </div>

          {/* Right Column - Secondary Actions (1/3 width) */}
          <div className="space-y-8">
            
            {/* Plan Feature Summary Card */}
            <section className="bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-6 sm:p-8 rounded-2xl text-left shadow-2xl">
              <h2 className="text-[13px] font-black uppercase tracking-wider text-white mb-5 border-b border-[#1e2d4a] pb-2">Your Plan Includes</h2>
              <div className="flex flex-col gap-3 text-[12px] font-mono">
                {[
                  { label: 'Signals Access', value: plan === 'free' ? 'BTC/USDT only' : plan === 'pro' ? 'BTC, ETH, BNB' : 'All 15 pairs' },
                  { label: 'Timeframes', value: 'All (15m, 1h, 4h)' },
                  { label: 'SL/TP Levels', value: plan === 'free' ? 'Locked' : 'Visible' },
                  { label: 'Telegram Alerts', value: plan === 'free' ? 'Free BTC Group' : plan === 'pro' ? 'Pro Channel (1 Invite)' : plan === 'master' ? 'Master Channel (1 Invite)' : 'GrandMaster Channel (1 Invite)' },
                  { label: 'AI Explanation', value: 'Full text' },
                  { label: 'CSV Export', value: isPaid ? 'Enabled' : 'Locked' },
                  { label: 'Live Active Signals', value: 'Active' },
                  { label: 'Signal History', value: isPaid ? (plan === 'pro' ? '3 coins' : 'All coins') : 'BTC read-only' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between bg-slate-950/40 border border-[#1e2d4a]/50 p-3 rounded-xl">
                    <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold">{label}</span>
                    <span className="font-extrabold text-white text-[10px] uppercase">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Manage Subscription Card */}
            {isPaid && status !== 'lifetime' && (
              <section className="bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-6 sm:p-8 rounded-2xl text-left shadow-2xl">
                <h2 className="text-[13px] font-black uppercase tracking-wider text-white mb-2 border-b border-[#1e2d4a] pb-2">Manage Subscription</h2>
                <p className="text-[12px] text-zinc-400 mb-5 font-medium leading-relaxed">
                  To cancel or update your payment method, contact us at{' '}
                  <a href="mailto:support@sanddock.com" className="text-[#3D5AFE] hover:underline font-bold">support@sanddock.com</a>
                  . You'll keep access until the end of your billing period.
                </p>
                <div className="flex flex-col gap-3 font-mono">
                  <a
                    href="mailto:support@sanddock.com?subject=Cancel Subscription"
                    className="py-2 px-4 rounded-xl text-center text-[10px] font-bold uppercase tracking-widest bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/30 transition-colors"
                  >
                    Request Cancellation
                  </a>
                  <a
                    href="mailto:support@sanddock.com?subject=Update Payment Method"
                    className="py-2 px-4 rounded-xl text-center text-[10px] font-bold uppercase tracking-widest bg-slate-950/50 hover:bg-slate-900/50 text-zinc-300 border border-[#1e2d4a] transition-colors"
                  >
                    Update Payment Method
                  </a>
                </div>
              </section>
            )}

          </div>
          
        </div>
      </main>

      {/* UPGRADE SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#070b16] border border-[#3D5AFE]/40 rounded-2xl p-6 sm:p-8 space-y-6 text-left shadow-2xl relative">
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.replace('/billing');
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer text-lg font-mono"
            >
              &times;
            </button>

            <div className="text-center space-y-2">
              <span className="text-4xl">Success!</span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                Upgrade Successful!
              </h2>
              <p className="text-[13px] text-zinc-400 font-mono">
                You are now a premium Sanddock {successPlan.toUpperCase()} member.
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <h3 className="text-xs font-bold text-[#3D5AFE] uppercase tracking-wider border-b border-zinc-800/60 pb-2 flex items-center gap-1.5 select-none">
                Telegram Alert Delivery Setup
              </h3>

              {/* Step 1: Link Account */}
              <div className="p-4 bg-[#090e1a] border border-zinc-850 space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <span className="block text-[10px] text-zinc-500 uppercase font-bold">Step 1: Link account</span>
                    {profile?.telegram_chat_id ? (
                      <span className="text-[#00e676] font-bold">Connected</span>
                    ) : (
                      <span className="text-zinc-400">Not linked</span>
                    )}
                  </div>
                  {!profile?.telegram_chat_id && tgPairingStep === 1 && (
                    <button type="button" onClick={() => setTgPairingStep(2)}
                      className="py-1.5 px-3 bg-[#3D5AFE] hover:bg-[#2943d0] text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer border-0">
                      Link Telegram
                    </button>
                  )}
                </div>

                {!profile?.telegram_chat_id && tgPairingStep === 2 && (
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                    <span className="block text-[10px] text-zinc-400 font-bold">Enter pairing code from @SanddockBot:</span>
                    <div className="flex gap-1.5 items-center justify-between flex-wrap">
                      <div className="flex gap-1">
                        {tgPairingCode.map((char, index) => (
                          <input key={index} id={`tg-modal-code-${index}`} type="text" maxLength="1" value={char}
                            onChange={e => {
                              const newCode = [...tgPairingCode];
                              newCode[index] = e.target.value.slice(-1);
                              setTgPairingCode(newCode);
                              if (e.target.value && index < 5) {
                                document.getElementById(`tg-modal-code-${index + 1}`)?.focus();
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Backspace' && !tgPairingCode[index] && index > 0) {
                                document.getElementById(`tg-modal-code-${index - 1}`)?.focus();
                              }
                            }}
                            className="w-8 h-9 bg-slate-950 border border-zinc-800 text-center text-sm font-bold text-white focus:outline-none focus:border-brand-orange" />
                        ))}
                      </div>
                      <button type="button"
                        onClick={() => {
                          setTgStatus('loading');
                          setTimeout(() => {
                            setTgStatus('success');
                            setTimeout(async () => {
                              await updateProfile({ telegram_chat_id: 'mock-tg-chat-9988' });
                              setTgPairingStep(1);
                              setTgStatus('');
                            }, 1000);
                          }, 1000);
                        }}
                        disabled={tgPairingCode.some(c => !c) || tgStatus === 'loading'}
                        className="py-1.5 px-3 bg-[#00e676] hover:bg-emerald-600 text-black font-bold text-[10px] uppercase tracking-widest cursor-pointer disabled:opacity-40">
                        {tgStatus === 'loading' ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Join Channel */}
              <div className="p-4 bg-[#090e1a] border border-zinc-850 space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <span className="block text-[10px] text-zinc-500 uppercase font-bold">Step 2: Join {successPlan === 'lifetime' ? 'GrandMaster' : successPlan.charAt(0).toUpperCase() + successPlan.slice(1)} Channel</span>
                    {!profile?.telegram_chat_id ? (
                      <span className="text-zinc-500 font-bold">Waiting for Step 1</span>
                    ) : profile?.telegram_invite_claimed ? (
                      <span className="text-[#00e676] font-bold">Private link generated (1/1 claimed)</span>
                    ) : (
                      <span className="text-zinc-400 font-bold">Invite not claimed yet</span>
                    )}
                  </div>
                  {profile?.telegram_chat_id && (
                    <button
                      type="button"
                      onClick={async () => {
                        let link = profile?.telegram_invite_link;
                        if (!profile?.telegram_invite_claimed) {
                          const randSuffix = Math.random().toString(36).substring(2, 9);
                          link = `https://t.me/joinchat/sanddock_${successPlan}_private_invite_${randSuffix}`;
                          await updateProfile({
                            telegram_invite_claimed: true,
                            telegram_invite_link: link
                          });
                        }
                        setIsTelegramChannelJoined(true);
                        localStorage.setItem('sanddock_tg_channel_joined', 'true');
                        window.open(link, '_blank');
                      }}
                      className="py-1.5 px-3 bg-[#3D5AFE] hover:bg-[#2943d0] text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer border-0"
                    >
                      {profile?.telegram_invite_claimed ? 'Open Channel' : 'Claim invite & Join'}
                    </button>
                  )}
                </div>
                {profile?.telegram_invite_claimed && (
                  <div className="mt-2 p-2.5 bg-zinc-950 border border-zinc-800 break-all text-[11px] text-zinc-300">
                    <span className="block text-[9px] text-zinc-500 font-bold uppercase">Your 1-time Invite Link:</span>
                    <a href={profile.telegram_invite_link} target="_blank" rel="noopener noreferrer" className="text-[#3D5AFE] hover:underline">
                      {profile.telegram_invite_link}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.replace('/terminal');
                }}
                className="py-2.5 px-6 bg-white hover:bg-zinc-200 text-black font-extrabold text-[11px] uppercase tracking-widest border-0 cursor-pointer rounded-none"
              >
                Go to Terminal Console &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
