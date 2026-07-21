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
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Current Plan Section */}
          <section>
            <h1 className="text-5xl md:text-6xl font-extrabold uppercase tracking-tighter text-black mb-8">
              Your Plan
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Plan Status Card */}
              <div className="lg:col-span-1 border border-black p-4 space-y-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-black">Current Plan</span>
                  <h2 className="text-3xl font-extrabold uppercase tracking-tight text-black mt-2">
                    {currentPlan === 'free' ? 'Free' : currentPlan === 'pro' ? 'Pro' : currentPlan === 'master' ? 'Master' : 'Lifetime'}
                  </h2>
                  <p className="text-sm text-black mt-1 font-semibold">
                    {currentPlan === 'free' ? 'BTC signals only' : currentPlan === 'pro' ? 'BTC + ETH + BNB' : currentPlan === 'master' ? 'All 15 pairs' : 'Lifetime access'}
                  </p>
                </div>

                {/* Application Status */}
                {applicationStatus && (
                  <div className="border-t border-black pt-3 space-y-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-black">Application Status</span>
                      <div className="mt-2 flex items-start gap-2">
                        <span className={`text-sm font-bold uppercase ${
                          isApproved ? 'text-emerald-600' : isPending ? 'text-blue-600' : isWaitingList ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {isApproved ? '✓ Approved' : isPending ? '⏳ Under Review' : isWaitingList ? '⏳ Waiting List' : '✗ Rejected'}
                        </span>
                      </div>
                    </div>

                    {isApproved && currentPlan === 'free' && (
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 space-y-1">
                        <p className="text-xs font-bold text-emerald-900">
                          Approved! 🎉
                        </p>
                        <a
                          href="https://t.me/alexsanddockcom"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                        >
                          Complete payment →
                        </a>
                      </div>
                    )}

                    {isPending && (
                      <div className="bg-blue-50 border border-blue-200 p-4 space-y-2">
                        <p className="text-sm font-semibold text-blue-900">Under Review</p>
                        <p className="text-sm text-blue-800">
                          Your {appliedFor?.toUpperCase()} application is under review. We'll notify you within 24 hours.
                        </p>
                        <a
                          href="https://t.me/alexsanddockcom"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm font-bold text-blue-700 hover:text-blue-900 underline"
                        >
                          Status update →
                        </a>
                      </div>
                    )}

                    {isWaitingList && (
                      <div className="bg-amber-50 border border-amber-200 p-4 space-y-2">
                        <p className="text-sm font-semibold text-amber-900">Waiting List</p>
                        <p className="text-sm text-amber-800">
                          Your {appliedFor?.toUpperCase()} application is on the waiting list. We'll notify you when approved.
                        </p>
                        <a
                          href="https://t.me/alexsanddockcom"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm font-bold text-amber-700 hover:text-amber-900 underline"
                        >
                          Check status →
                        </a>
                      </div>
                    )}

                    {isRejected && (
                      <div className="bg-red-50 border border-red-200 p-4 space-y-2">
                        <p className="text-sm font-semibold text-red-900">Not Approved</p>
                        <p className="text-sm text-red-800">
                          Your {appliedFor?.toUpperCase()} application was not approved at this time.
                        </p>
                        <a
                          href="https://t.me/alexsanddockcom"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm font-bold text-red-700 hover:text-red-900 underline"
                        >
                          Discuss options →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {!applicationStatus && currentPlan === 'free' && (
                  <div className="border-t border-black pt-4">
                    <p className="text-sm text-black mb-4 font-semibold">
                      Want access to more coins? Apply for Pro or Master.
                    </p>
                    <a
                      href="/pricing"
                      className="inline-block w-full text-center py-3 bg-black hover:bg-brand-orange text-white font-bold text-sm uppercase tracking-widest transition-all border border-black"
                    >
                      View Plans & Apply →
                    </a>
                  </div>
                )}
              </div>

              {/* Plan Features */}
              <div className="lg:col-span-2 border border-black p-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-black">What's Included</span>
                <ul className="space-y-1.5 mt-3 text-sm">
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

              {/* Need Help Card - Black Background with Blue Button */}
              <div className="border border-black bg-black p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-extrabold uppercase tracking-tight text-white">
                    Need Help?
                  </h2>
                  <p className="text-xs text-white mt-1.5">
                    For payment issues, plan upgrades, or technical support, contact us on Telegram.
                  </p>
                </div>
                <a
                  href="https://t.me/alexsanddockcom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest transition-all border border-blue-600 w-full text-center"
                >
                  Contact @alexsanddockcom →
                </a>
              </div>

              {/* Billing & Expiry Card */}
              <div className="border border-black p-4 space-y-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-black">Billing</span>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs text-zinc-600">Billing Cycle</p>
                      <p className="text-sm font-semibold text-black">{currentPlan === 'free' ? 'Free Forever' : 'Monthly'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600">Next Renewal</p>
                      <p className="text-sm font-semibold text-black">{currentPlan === 'free' ? 'N/A' : 'Dec 21, 2026'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600">Auto-Renewal</p>
                      <p className="text-sm font-semibold text-emerald-600">{currentPlan === 'free' ? 'N/A' : 'Active'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage & Account Card */}
              <div className="border border-black p-4 space-y-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-black">Account</span>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs text-zinc-600">Account Status</p>
                      <p className="text-sm font-semibold text-emerald-600">Active</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600">Member Since</p>
                      <p className="text-sm font-semibold text-black">Nov 15, 2026</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600">Support Tier</p>
                      <p className="text-sm font-semibold text-black">{currentPlan === 'free' ? 'Community' : currentPlan === 'pro' ? '24h Email' : '12h Priority'}</p>
                    </div>
                  </div>
                </div>
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

        </div>
      </main>
    </div>
  );
}
