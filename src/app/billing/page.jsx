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
      {/* HEADER / NAVIGATION BAR (FROM HOMEPAGE) */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">

          {/* Logo container block with right border */}
          <div className="flex items-center px-6 h-16 border-r border-black relative">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-satoshi text-black">
                Sanddock
              </span>
            </a>
            <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

          {/* Links grid with right borders */}
          <nav className="hidden md:flex items-center flex-1 h-16 text-xs font-bold uppercase tracking-wider text-black">
            <a href="/#how-it-works" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">How It Works</a>
            <a href="/#explainability" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Platform Features</a>
            <a href="/#track-record" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Track Record</a>
            <a href="/pricing" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Pricing</a>
            <a href="/contact" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Contact</a>
            <a href="/#faq" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">FAQ</a>
            <a href="/articles" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Articles</a>
            <a href="/terminal" className="px-6 h-full flex items-center border-r border-black text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">Terminal</a>
          </nav>

          {/* Action button container on right with left border */}
          <div className="flex items-center h-16 border-l border-black relative">
            <a
              href="/terminal"
              className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center"
            >
              Terminal &rarr;
            </a>
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Plan Status Card */}
              <div className="border border-black p-4 space-y-3">
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
                      <p className="text-sm font-semibold text-black">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </p>
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

      {/* FOOTER (FROM HOMEPAGE) */}
      <footer className="bg-black text-white pt-16 pb-8 text-xs border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16">

            {/* Tagline / Logo (5 cols) */}
            <div className="md:col-span-5 space-y-4 text-left">
              <div className="flex items-center gap-2">
                <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-6 h-6 object-contain" />
                <span className="text-base font-bold uppercase tracking-wider font-satoshi text-white">
                  Sanddock
                </span>
              </div>
              <p className="text-white text-xs uppercase font-bold tracking-wider">
                Trading signals backed by data, not promises.
              </p>
              <div className="space-y-4 pt-4">
                <div className="flex gap-4">
                  <a href="https://x.com/sanddockcom" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white transition-colors" title="Twitter/X">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.637l-5.206-6.801-5.979 6.801h-3.31l7.734-8.835L2.25 2.25h6.82l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/>
                    </svg>
                  </a>
                  <a href="https://t.me/sanddockcom" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white transition-colors" title="Telegram">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.82-1.084.51l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.782 13.5l-2.995-.937c-.652-.213-.66-.652.135-.973l11.717-4.518c.54-.213 1.012.122.84 1.15z"/>
                    </svg>
                  </a>
                  <a href="https://www.youtube.com/@SandDock" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white transition-colors" title="YouTube">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/sanddockcom/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white transition-colors" title="Instagram">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.441 7.265c.504 0 .915.41.915.915 0 .504-.41.915-.915.915-.504 0-.915-.41-.915-.915 0-.504.41-.915.915-.915zm-3.441.915c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-1.5c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5-2.015-4.5-4.5-4.5zm6.5-2c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5z"/>
                    </svg>
                  </a>
                </div>
                <div className="pt-2">
                  <a href="mailto:alex@sanddock.com" className="text-white hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider">
                    alex@sanddock.com
                  </a>
                </div>
              </div>
            </div>

            {/* Links Columns (7 cols) */}
            <div className="md:col-span-7 grid grid-cols-3 gap-8 text-left">

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Product</h4>
                <ul className="space-y-2 text-white text-[11px] font-medium uppercase tracking-wider font-satoshi">
                  <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
                  <li><a href="/terminal" className="hover:text-white transition-colors">Terminal</a></li>
                  <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="/articles" className="hover:text-white transition-colors">Articles</a></li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Support</h4>
                <ul className="space-y-2 text-white text-[11px] font-medium uppercase tracking-wider font-satoshi">
                  <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
                  <li><a href="https://t.me/sanddockcom" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram Community</a></li>
                  <li><a href="/billing" className="hover:text-white transition-colors">Billing</a></li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Legal</h4>
                <ul className="space-y-2 text-white text-[11px] font-medium uppercase tracking-wider font-satoshi">
                  <li><a href="https://t.me/alexsanddockcom" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Support Channel</a></li>
                </ul>
              </div>

            </div>

          </div>

          <div className="border-t border-zinc-800 pt-8 text-center text-[10px] text-white leading-relaxed font-bold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} Sanddock. Not financial advice. All signals are for educational purposes only. Past performance does not indicate future results.
          </div>

        </div>
      </footer>
    </div>
  );
}
