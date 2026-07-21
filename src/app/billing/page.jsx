'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

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
          console.log('[Billing] Application API response:', appData);
          if (appData && appData.length > 0) {
            console.log('[Billing] Setting applicationStatus:', appData[0]);
            setApplicationStatus(appData[0]);
          } else {
            console.log('[Billing] No application data found for user', user.id);
          }
        } else {
          console.log('[Billing] Application fetch failed:', appRes.status);
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
      <div className="min-h-screen bg-white flex items-center justify-center font-satoshi">
        <div className="w-8 h-8 border-2 border-black border-t-brand-orange rounded-full animate-spin" />
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

  return (
    <div className="min-h-screen bg-white font-satoshi">
      {/* Header */}
      <header className="border-b border-black bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/terminal" className="text-black text-xs font-bold uppercase tracking-widest hover:text-brand-orange transition-colors">
            ← Terminal
          </a>
          <span className="text-xs font-bold uppercase tracking-widest text-black">Billing & Plan</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-12">
          {/* Current Plan Section */}
          <section>
            <h1 className="text-5xl md:text-6xl font-extrabold uppercase tracking-tighter text-black mb-8">
              Your Plan
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Plan Status Card */}
              <div className="border border-black p-8 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-black">Current Plan</span>
                  <h2 className="text-3xl font-extrabold uppercase tracking-tight text-black mt-2">
                    {currentPlan === 'free' ? 'Free' : currentPlan === 'pro' ? 'Pro' : currentPlan === 'master' ? 'Master' : 'Lifetime'}
                  </h2>
                  <p className="text-sm text-black mt-2">
                    {currentPlan === 'free' ? 'BTC signals only' : currentPlan === 'pro' ? 'BTC + ETH + BNB' : currentPlan === 'master' ? 'All 15 pairs' : 'Lifetime access'}
                  </p>
                </div>

                {/* Application Status */}
                {applicationStatus && (
                  <div className="border-t border-black pt-6 space-y-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-black">Application Status</span>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-sm font-bold uppercase ${
                          isApproved ? 'text-emerald-600' : isPending ? 'text-blue-600' : isWaitingList ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {isApproved ? '✓ Approved' : isPending ? '⏳ Under Review' : isWaitingList ? '⏳ Waiting List' : '✗ Rejected'}
                        </span>
                        <span className="text-xs text-black">for {appliedFor?.toUpperCase()}</span>
                      </div>
                    </div>

                    {isApproved && currentPlan === 'free' && (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                        <p className="text-sm font-semibold text-emerald-900">
                          Your application is approved! 🎉
                        </p>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                          Finish payment to upgrade to {appliedFor?.toUpperCase()} and unlock all premium features.
                        </p>
                        <a
                          href="https://t.me/alexsanddockcom"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                        >
                          Contact @alexsanddockcom for payment →
                        </a>
                      </div>
                    )}

                    {isPending && (
                      <div className="bg-blue-50 border border-blue-200 p-4 space-y-3">
                        <p className="text-xs text-blue-800">
                          Your application for <b>{appliedFor?.toUpperCase()}</b> is under review. We'll notify you within 24 hours.
                        </p>
                        <a
                          href="https://t.me/alexsanddockcom"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                        >
                          Contact @alexsanddockcom for status update →
                        </a>
                      </div>
                    )}

                    {isWaitingList && (
                      <div className="bg-amber-50 border border-amber-200 p-4 space-y-3">
                        <p className="text-xs text-amber-800">
                          Your application for {appliedFor?.toUpperCase()} is under review. We'll notify you as soon as it's approved.
                        </p>
                        <a
                          href="https://t.me/alexsanddockcom"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs font-bold text-amber-700 hover:text-amber-900 underline"
                        >
                          Contact @alexsanddockcom for status update →
                        </a>
                      </div>
                    )}

                    {isRejected && (
                      <div className="bg-red-50 border border-red-200 p-4 space-y-2">
                        <p className="text-xs text-red-800">
                          Your {appliedFor?.toUpperCase()} application was not approved this time.
                        </p>
                        <a
                          href="https://t.me/alexsanddockcom"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs font-bold text-red-700 hover:text-red-900 underline"
                        >
                          Contact us to discuss →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {!applicationStatus && currentPlan === 'free' && (
                  <div className="border-t border-black pt-6">
                    <p className="text-xs text-black mb-4">
                      Want access to more coins? Apply for Pro or Master.
                    </p>
                    <a
                      href="/pricing"
                      className="inline-block w-full text-center py-3 bg-black hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest transition-all border border-black"
                    >
                      View Plans & Apply →
                    </a>
                  </div>
                )}
              </div>

              {/* Plan Features */}
              <div className="border border-black p-8">
                <span className="text-xs font-bold uppercase tracking-widest text-black">What's Included</span>
                <ul className="space-y-3 mt-6 text-sm">
                  {currentPlan === 'free' && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">BTC/USDT signals</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">15m, 1h, 4h timeframes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">Free BTC Telegram group</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-zinc-400">✗</span>
                        <span className="text-black line-through">ETH & BNB signals</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-zinc-400">✗</span>
                        <span className="text-black line-through">SL/TP levels visible</span>
                      </li>
                    </>
                  )}
                  {currentPlan === 'pro' && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">BTC + ETH + BNB signals</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">Visible SL/TP levels</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">Private Pro Telegram channel</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">CSV export</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-zinc-400">✗</span>
                        <span className="text-black line-through">All 15 coins</span>
                      </li>
                    </>
                  )}
                  {(currentPlan === 'master' || currentPlan === 'lifetime') && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">All 15 pairs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">Visible SL/TP levels</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">Unlimited Telegram channels</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">Full CSV export</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600">✓</span>
                        <span className="text-black">Priority support</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <section>
              <h2 className="text-3xl font-extrabold uppercase tracking-tight text-black mb-6">
                Payment History
              </h2>
              <div className="border border-black overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-black bg-white">
                    <tr>
                      <th className="text-left p-4 font-bold uppercase tracking-widest text-xs text-black">Date</th>
                      <th className="text-left p-4 font-bold uppercase tracking-widest text-xs text-black">Plan</th>
                      <th className="text-left p-4 font-bold uppercase tracking-widest text-xs text-black">Amount</th>
                      <th className="text-left p-4 font-bold uppercase tracking-widest text-xs text-black">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment, idx) => (
                      <tr key={idx} className="border-t border-black">
                        <td className="p-4 text-black">{new Date(payment.created_at).toLocaleDateString()}</td>
                        <td className="p-4 font-bold text-black">{payment.plan?.toUpperCase()}</td>
                        <td className="p-4 text-black">${(payment.amount / 100).toFixed(2)}</td>
                        <td className="p-4">
                          <span className={payment.status === 'succeeded' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                            {payment.status === 'succeeded' ? 'Paid' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Support Section */}
          <section className="border border-black p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold uppercase tracking-tight text-black">
                Need Help?
              </h2>
              <p className="text-sm text-black mt-2">
                For payment issues, plan upgrades, or technical support, contact us on Telegram.
              </p>
            </div>
            <a
              href="https://t.me/alexsanddockcom"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-black hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest transition-all border border-black"
            >
              Contact @alexsanddockcom on Telegram →
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
