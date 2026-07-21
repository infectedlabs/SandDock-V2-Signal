'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CtaPrimary, CtaSecondary } from '@/components/ui/Cta';

// Feature lists per plan, replacing the previous inline ✓/✗ glyphs.
const PLAN_FEATURES = {
  free: [
    ['BTC/USDT signals', true],
    ['15m, 1h, 4h timeframes', true],
    ['Free BTC Telegram group', true],
    ['ETH & BNB signals', false],
    ['SL/TP levels visible', false],
  ],
  pro: [
    ['BTC + ETH + BNB signals', true],
    ['Visible SL/TP levels', true],
    ['Private Pro Telegram channel', true],
    ['CSV export', true],
    ['All 15 coins', false],
  ],
  master: [
    ['All 15 pairs', true],
    ['Visible SL/TP levels', true],
    ['Unlimited Telegram channels', true],
    ['Full CSV export', true],
    ['Priority support', true],
  ],
};

function FeatureRow({ label, available }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex-shrink-0 w-4 h-4 rounded-md flex items-center justify-center ${
          available ? 'bg-up/15 text-up' : 'bg-white/5 text-ink-3/70'
        }`}
      >
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          {available ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
      </span>
      <span className={`text-[13.5px] ${available ? 'text-ink-2' : 'text-ink-3/70 line-through'}`}>
        {label}
      </span>
    </li>
  );
}

// Small labelled stat used across the billing/account cards.
function Field({ label, value, tone = 'text-ink' }) {
  return (
    <div>
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className={`text-[14.5px] font-medium ${tone}`}>{value}</p>
    </div>
  );
}

export default function BillingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [applicationStatus, setApplicationStatus] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch application status by user_id (primary) or email (fallback)
        const appRes = await fetch(`/api/applications?user_id=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`);
        if (appRes.ok) {
          const appData = await appRes.json();
          if (appData && appData.length > 0) {
            setApplicationStatus(appData[0]);
          }
        }

        // Fetch payment history
        const payRes = await fetch(`/api/billing/status?userId=${user.id}`);
        if (payRes.ok) {
          const payData = await payRes.json();
          setPaymentHistory(payData.payments || []);
        }
      } catch (e) {
        console.error('Failed to load billing data:', e);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/15 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const currentPlan = profile?.plan || 'free';
  const isApproved = applicationStatus?.status === 'accepted';
  const isPending = applicationStatus?.status === 'pending';
  const isWaitingList = applicationStatus?.status === 'waitlisted';
  const isRejected = applicationStatus?.status === 'rejected';
  const appliedFor = applicationStatus?.plan;

  const planLabel =
    currentPlan === 'free' ? 'Free'
      : currentPlan === 'pro' ? 'Pro'
      : currentPlan === 'master' ? 'Master'
      : 'Lifetime';

  const planSub =
    currentPlan === 'free' ? 'BTC signals only'
      : currentPlan === 'pro' ? 'BTC + ETH + BNB'
      : currentPlan === 'master' ? 'All 15 pairs'
      : 'Lifetime access';

  const features = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.master;

  // Status banner content, keyed off the application state.
  const banner = isApproved
    ? { tone: 'border-up/35 bg-up/10', title: 'Approved', body: 'Contact us to complete payment and activate your plan.', cta: 'Complete payment' }
    : isPending
    ? { tone: 'border-accent/35 bg-accent/10', title: 'Under review', body: `Your ${appliedFor?.toUpperCase()} application is under review. We'll notify you within 24 hours.`, cta: 'Status update' }
    : isWaitingList
    ? { tone: 'border-amber-400/35 bg-amber-400/10', title: 'Waiting list', body: `Your ${appliedFor?.toUpperCase()} application is on the waiting list. We'll notify you when approved.`, cta: 'Check status' }
    : isRejected
    ? { tone: 'border-down/35 bg-down/10', title: 'Not approved', body: `Your ${appliedFor?.toUpperCase()} application was not approved at this time.`, cta: 'Discuss options' }
    : null;

  const statusLabel = isApproved
    ? 'Approved'
    : isPending
    ? 'Under review'
    : isWaitingList
    ? 'Waiting list'
    : isRejected
    ? 'Rejected'
    : null;

  const statusTone = isApproved
    ? 'text-up'
    : isPending
    ? 'text-accent-soft'
    : isWaitingList
    ? 'text-amber-300'
    : 'text-down';

  return (
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden antialiased">
      <Navbar />

      {/* PAGE HEADER */}
      <section className="relative mesh-glow grain border-b border-line overflow-hidden">
        <div className="grid-lines" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-16 md:pt-40 md:pb-20">
          <p className="font-instrument-serif text-[#b4c0ff] text-2xl sm:text-3xl leading-[1.1]">
            Billing &amp; account
          </p>
          <h1 className="mt-3 text-5xl sm:text-6xl lg:text-[72px] font-semibold tracking-tighter leading-[0.95] text-gradient">
            Your Plan
          </h1>
          <p className="mt-5 text-white/70 text-[16px] md:text-[17px] leading-[1.65] max-w-xl">
            Manage your subscription, review your application status, and check payment history.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="relative py-16 md:py-20 border-b border-line mesh-glow-soft">
        <div className="relative z-10 max-w-7xl mx-auto px-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Plan status */}
            <div className="card-gradient-border p-px">
              <div className="relative h-full rounded-[17px] bg-surface-2/80 backdrop-blur-xl p-6 overflow-hidden">
                <div className="pointer-events-none absolute -top-24 -right-16 w-52 h-52 rounded-full bg-accent/18 blur-3xl" />
                <div className="relative space-y-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                      Current plan
                    </span>
                    <h2 className="text-[32px] font-semibold tracking-tight text-gradient mt-1.5">
                      {planLabel}
                    </h2>
                    <p className="text-[13.5px] text-ink-2 mt-1">{planSub}</p>
                  </div>

                  {applicationStatus && (
                    <div className="border-t border-white/8 pt-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                          Application status
                        </span>
                        <p className={`mt-1.5 text-[14px] font-semibold ${statusTone}`}>
                          {statusLabel}
                        </p>
                      </div>

                      {banner && (
                        <div className={`rounded-xl border p-3.5 space-y-2 ${banner.tone}`}>
                          <p className="text-[13px] font-semibold text-ink">{banner.title}</p>
                          <p className="text-[12.5px] text-ink-2 leading-relaxed">{banner.body}</p>
                          <a
                            href="https://t.me/alexsanddockcom"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent-soft hover:text-ink transition-colors"
                          >
                            {banner.cta}
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {!applicationStatus && currentPlan === 'free' && (
                    <div className="border-t border-white/8 pt-4">
                      <p className="text-[13.5px] text-ink-2 mb-4">
                        Want access to more coins? Apply for Pro or Master.
                      </p>
                      <CtaPrimary href="/pricing" className="w-full justify-between">
                        View plans
                      </CtaPrimary>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Plan features */}
            <div className="lg:col-span-2 card p-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                What&apos;s included
              </span>
              <ul className="space-y-3 mt-4">
                {features.map(([label, available]) => (
                  <FeatureRow key={label} label={label} available={available} />
                ))}
              </ul>
            </div>

            {/* Need help */}
            <div className="card p-6 flex flex-col justify-between gap-5">
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-ink">Need help?</h2>
                <p className="text-[13px] text-ink-2 mt-1.5 leading-relaxed">
                  For payment issues, plan upgrades, or technical support, contact us on Telegram.
                </p>
              </div>
              <CtaSecondary
                href="https://t.me/alexsanddockcom"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/12 justify-center"
              >
                Contact support
              </CtaSecondary>
            </div>

            {/* Billing */}
            <div className="card p-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                Billing
              </span>
              <div className="mt-4 space-y-3.5">
                <Field label="Billing cycle" value={currentPlan === 'free' ? 'Free forever' : 'Monthly'} />
                <Field label="Next renewal" value={currentPlan === 'free' ? 'N/A' : 'Dec 21, 2026'} />
                <Field
                  label="Auto-renewal"
                  value={currentPlan === 'free' ? 'N/A' : 'Active'}
                  tone={currentPlan === 'free' ? 'text-ink-2' : 'text-up'}
                />
              </div>
            </div>

            {/* Account */}
            <div className="card p-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                Account
              </span>
              <div className="mt-4 space-y-3.5">
                <Field label="Account status" value="Active" tone="text-up" />
                <Field
                  label="Member since"
                  value={
                    user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'N/A'
                  }
                />
                <Field
                  label="Support tier"
                  value={currentPlan === 'free' ? 'Community' : currentPlan === 'pro' ? '24h email' : '12h priority'}
                />
              </div>
            </div>
          </div>

          {/* Payment history */}
          {paymentHistory.length > 0 && (
            <section className="pt-8">
              <h2 className="text-[26px] font-semibold tracking-tight text-gradient mb-6">
                Payment history
              </h2>
              <div className="card overflow-hidden !rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="border-b border-white/8">
                        <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Date</th>
                        <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Plan</th>
                        <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Amount</th>
                        <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/6">
                      {paymentHistory.map((payment, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-5 py-4 text-ink-2 tabular-nums">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4 font-semibold text-ink">{payment.plan?.toUpperCase()}</td>
                          <td className="px-5 py-4 text-ink-2 tabular-nums">
                            ${(payment.amount / 100).toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex text-[10px] font-semibold px-2 py-1 rounded-md border ${
                                payment.status === 'succeeded'
                                  ? 'bg-up/12 text-up border-up/25'
                                  : 'bg-down/12 text-down border-down/25'
                              }`}
                            >
                              {payment.status === 'succeeded' ? 'Paid' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
