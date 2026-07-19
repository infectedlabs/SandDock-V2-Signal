"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// ── Plan Definitions ────────────────────────────────────────────────────────
const PLANS_DATA = {
  free: {
    label: "Free Plan",
    sublabel: "Always open to BTC signals",
    monthlyPrice: 0,
    color: "text-zinc-400",
    badge: null,
    highlight: false,
    features: [
      { text: "BTC/USDT signals - 15m, 1h & 4h timeframes", available: true },
      { text: "Real-time web dashboard", available: true },
      { text: "AI explanation & confidence score", available: true },
      { text: "Full BTC signal history (log + performance)", available: true },
      { text: "Basic BTC Heikin Ashi chart view", available: true },
      { text: "Free BTC Telegram group alerts", available: true },
      { text: "Automated Stop Loss & Take Profit", available: false },
      { text: "Pro/Master private channels alerts", available: false },
    ],
  },
  pro: {
    label: "Pro",
    sublabel: "Best for active traders",
    color: "text-brand-orange",
    badge: "Most Popular",
    highlight: true,
    features: [
      { text: "BTC + ETH + BNB signals (Top 3 pairs)", available: true },
      { text: "15m, 1h & 4h timeframes for all 3 coins", available: true },
      { text: "Automated Stop Loss & Take Profit levels", available: true },
      { text: "Telegram alerts (1 paired chat / group)", available: true },
      { text: "P&L dashboard & full performance metrics", available: true },
      { text: "AI explanation & confidence score", available: true },
      { text: "CSV export of signal history", available: true },
      { text: "Priority 24h email support", available: true },
    ],
  },
  master: {
    label: "Master",
    sublabel: "For power traders",
    color: "text-purple-400",
    badge: "All Coins",
    highlight: false,
    features: [
      { text: "All 15 premium altcoins scanned 24/7", available: true },
      { text: "15m, 1h & 4h on every pair", available: true },
      { text: "Automated Stop Loss & Take Profit levels", available: true },
      { text: "Unlimited Telegram alerts & channels", available: true },
      { text: "Multi-timeframe trend confluence analysis", available: true },
      { text: "Full P&L history & CSV export", available: true },
      { text: "AI explanation & confidence score", available: true },
      { text: "Priority 12h email support", available: true },
    ],
  },
};

// Demo/Mock stats for FOMO
const DEMO_STATS = {
  totalApplications: 47,
  thisWeek: 12,
  acceptedThisWeek: 8,
  proAccepted: 23,
  proWaitlist: 6,
  masterAccepted: 11,
  masterWaitlist: 13,
  averageReviewTime: "< 48 hours",
  lastReviewDate: "Tuesday",
};

function CheckIcon({ available }) {
  if (available) {
    return (
      <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ── PricingCard ─────────────────────────────────────────────────────────
function PricingCard({ planKey, data, user }) {
  const router = useRouter();
  const isFree = planKey === "free";

  return (
    <div
      className={`relative flex flex-col justify-between rounded-none border p-7 ${
        data.highlight
          ? "border-brand-orange bg-white shadow-[6px_6px_0px_0px_rgba(255,69,0,0.3)]"
          : "border-black bg-[#f8f9fa] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      }`}
      id={`plan-${planKey}`}
    >
      {data.badge && (
        <span className="absolute top-0 right-6 -translate-y-1/2 bg-brand-orange text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-none">
          {data.badge}
        </span>
      )}

      <div className="space-y-5">
        <div>
          <span className={`text-[11px] font-extrabold uppercase tracking-wider ${data.color}`}>{data.label}</span>
          <div className="mt-1.5">
            {isFree ? (
              <>
                <span className="text-4xl font-extrabold font-mono text-black">$0</span>
                <span className="block text-[11px] text-zinc-500 font-bold mt-0.5">No credit card · Permanent access</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-extrabold font-mono text-brand-orange">Application Only</span>
                <span className="block text-[11px] text-zinc-500 font-bold mt-1">Pricing revealed after approval</span>
              </>
            )}
          </div>
        </div>

        <p className="text-[13px] text-zinc-600 leading-relaxed">{data.sublabel}</p>

        <ul className="space-y-2.5 pt-2 border-t border-black/10">
          {data.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckIcon available={f.available} />
              <span className={`text-[12px] font-semibold leading-snug ${f.available ? "text-zinc-800" : "text-zinc-400 line-through"}`}>
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7">
        {isFree ? (
          user ? (
            <a
              href="/terminal"
              className="block w-full py-3 text-center bg-black hover:bg-brand-orange text-white font-bold text-[12px] uppercase tracking-widest transition-all rounded-none border border-black"
            >
              Go to Terminal →
            </a>
          ) : (
            <a
              href="/signup"
              className="block w-full py-3 text-center bg-white hover:bg-black text-black hover:text-white font-bold text-[12px] uppercase tracking-widest transition-all rounded-none border border-black"
            >
              Get Started Free →
            </a>
          )
        ) : (
          <button
            onClick={() => router.push(`/apply?plan=${planKey}`)}
            className={`w-full py-3 font-bold text-[12px] uppercase tracking-widest transition-all rounded-none border cursor-pointer ${
              data.highlight
                ? "bg-brand-orange hover:bg-black text-white border-brand-orange"
                : "bg-black hover:bg-brand-orange text-white border-black"
            }`}
          >
            Apply for {data.label} →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen bg-white text-black overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          <div className="flex items-center px-6 h-16 border-r border-black relative">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-sans text-black">Sanddock</span>
            </a>
            <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

          <nav className="hidden md:flex items-center flex-1 h-16 text-[11px] font-bold uppercase tracking-wider text-black">
            <a href="/#how-it-works"    className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">How It Works</a>
            <a href="/#explainability"  className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">Platform Features</a>
            <a href="/#track-record"    className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">Track Record</a>
            <a href="/pricing"          className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors text-brand-orange bg-zinc-50">Pricing</a>
            <a href="/contact"          className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">Contact</a>
            {user
              ? <a href="/terminal" className="px-6 h-full flex items-center border-r border-black text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">Terminal</a>
              : <a href="/login"    className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">Login</a>
            }
          </nav>

          <div className="flex items-center h-16 border-l border-black relative">
            {user ? (
              <a href="/terminal" className="px-6 h-full font-bold text-[11px] uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all flex items-center">
                Terminal →
              </a>
            ) : (
              <a href="/signup" className="px-6 h-full font-bold text-[11px] uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all flex items-center">
                Start Free →
              </a>
            )}
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>
        </div>
      </header>


      {/* ── TITLE SECTION ──────────────────────────────────────────────────── */}
      <section className="pt-16 pb-10 max-w-7xl mx-auto px-6 border-b border-black text-left">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block mb-2">
          Application-Based Access
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none mb-4">
          We're selective about who we let in.
        </h1>
        <p className="text-zinc-500 text-sm max-w-xl leading-relaxed">
          Every trader is reviewed for risk management. Start free on Bitcoin, then apply for Pro or Master. We review applications within 24 hours and notify you via email.
        </p>
      </section>

      {/* ── PLAN CARDS ─────────────────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {Object.entries(PLANS_DATA).map(([key, data]) => (
            <PricingCard
              key={key}
              planKey={key}
              data={data}
              user={user}
            />
          ))}
        </div>
      </section>

      {/* ── ACCESS STATUS (FOMO) ───────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6 border-b border-black">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block mb-6">
          Current Access Status
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="border border-black p-6 bg-white">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Pro Plan</p>
            <p className="text-3xl font-extrabold text-black mb-1">Open</p>
            <p className="text-[11px] text-zinc-600">{DEMO_STATS.proAccepted} accepted this month</p>
          </div>
          <div className="border border-black p-6 bg-zinc-50">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Master Waitlist</p>
            <p className="text-3xl font-extrabold text-brand-orange mb-1">{DEMO_STATS.masterWaitlist}</p>
            <p className="text-[11px] text-zinc-600">traders waiting for access</p>
          </div>
          <div className="border border-black p-6 bg-white">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">This Week</p>
            <p className="text-3xl font-extrabold text-black mb-1">{DEMO_STATS.thisWeek}</p>
            <p className="text-[11px] text-zinc-600">{DEMO_STATS.acceptedThisWeek} approved applications</p>
          </div>
          <div className="border border-black p-6 bg-zinc-50">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Response Time</p>
            <p className="text-3xl font-extrabold text-brand-orange mb-1">&lt; 24h</p>
            <p className="text-[11px] text-zinc-600">email notification sent</p>
          </div>
        </div>
      </section>

      {/* ── HOW THE PROCESS WORKS ──────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6 border-b border-black">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block mb-6">
          The Application Process
        </span>
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8">Why we review every application</h2>
        <div className="space-y-6 text-zinc-700 max-w-3xl">
          <p className="leading-relaxed">
            Signal quality means nothing if you don't understand risk management. We review each application and grant access based on your approach to position sizing and stop losses. This ensures everyone on the platform has realistic expectations and the discipline to follow their plan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-black p-6 bg-zinc-50">
              <div className="text-2xl font-bold mb-2">📋</div>
              <p className="font-bold text-black mb-1 text-[13px]">Applications reviewed</p>
              <p className="text-[12px] text-zinc-600">Within 24 hours of submission</p>
            </div>
            <div className="border border-black p-6 bg-white">
              <div className="text-2xl font-bold mb-2">✉️</div>
              <p className="font-bold text-black mb-1 text-[13px]">Notification</p>
              <p className="text-[12px] text-zinc-600">Decision sent via email. Check spam folder to be safe.</p>
            </div>
            <div className="border border-black p-6 bg-zinc-50">
              <div className="text-2xl font-bold mb-2">💳</div>
              <p className="font-bold text-black mb-1 text-[13px]">Payment method</p>
              <p className="text-[12px] text-zinc-600">USDT TRC-20 only. Direct on-chain, no middleman.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE COMPARISON TABLE ────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6 border-b border-black">
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8">Complete Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-zinc-600">Feature</th>
                <th className="text-center py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-zinc-600">Free</th>
                <th className="text-center py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-brand-orange">Pro</th>
                <th className="text-center py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-purple-600">Master</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black/10">
                <td className="py-3 px-4 text-sm font-semibold">Coins Available</td>
                <td className="text-center py-3 px-4 text-sm text-zinc-600">BTC only</td>
                <td className="text-center py-3 px-4 text-sm text-black">BTC, ETH, BNB</td>
                <td className="text-center py-3 px-4 text-sm text-black">All 15 pairs</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-3 px-4 text-sm font-semibold">Timeframes</td>
                <td className="text-center py-3 px-4 text-sm text-zinc-600">15m, 1h, 4h</td>
                <td className="text-center py-3 px-4 text-sm text-black">15m, 1h, 4h</td>
                <td className="text-center py-3 px-4 text-sm text-black">15m, 1h, 4h</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-3 px-4 text-sm font-semibold">SL & TP Levels</td>
                <td className="text-center py-3 px-4 text-sm text-zinc-600">Locked</td>
                <td className="text-center py-3 px-4 text-sm text-black">Visible</td>
                <td className="text-center py-3 px-4 text-sm text-black">Visible</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-3 px-4 text-sm font-semibold">P&L Calculator</td>
                <td className="text-center py-3 px-4 text-sm text-zinc-600">No</td>
                <td className="text-center py-3 px-4 text-sm text-black">Full history</td>
                <td className="text-center py-3 px-4 text-sm text-black">Full history</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-3 px-4 text-sm font-semibold">CSV Export</td>
                <td className="text-center py-3 px-4 text-sm text-zinc-600">No</td>
                <td className="text-center py-3 px-4 text-sm text-black">Yes</td>
                <td className="text-center py-3 px-4 text-sm text-black">Yes</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-3 px-4 text-sm font-semibold">Telegram Alerts</td>
                <td className="text-center py-3 px-4 text-sm text-zinc-600">Free BTC Group</td>
                <td className="text-center py-3 px-4 text-sm text-black">Private Channel</td>
                <td className="text-center py-3 px-4 text-sm text-black">Unlimited Channels</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-3 px-4 text-sm font-semibold">AI Explanations</td>
                <td className="text-center py-3 px-4 text-sm text-zinc-600">Yes</td>
                <td className="text-center py-3 px-4 text-sm text-black">Yes</td>
                <td className="text-center py-3 px-4 text-sm text-black">Yes + Confluence</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-sm font-semibold">Email Support</td>
                <td className="text-center py-3 px-4 text-sm text-zinc-600">48h response</td>
                <td className="text-center py-3 px-4 text-sm text-black">24h response</td>
                <td className="text-center py-3 px-4 text-sm text-black">12h priority</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="py-14 max-w-4xl mx-auto px-6 border-b border-black">
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8">Questions?</h2>
        <div className="space-y-4">
          <div className="border border-black p-6 bg-zinc-50">
            <h3 className="font-bold text-black mb-2">How long does the review process take?</h3>
            <p className="text-sm text-zinc-700">Applications are reviewed within 24 hours of submission. You'll receive an email with your decision and feedback on your risk management. Please check your spam folder to ensure you don't miss it.</p>
          </div>
          <div className="border border-black p-6 bg-white">
            <h3 className="font-bold text-black mb-2">What if I'm rejected?</h3>
            <p className="text-sm text-zinc-700">You'll receive specific feedback on your risk management approach. Most rejections are because traders aren't sizing positions properly or moving stops. You can reapply after addressing the feedback.</p>
          </div>
          <div className="border border-black p-6 bg-zinc-50">
            <h3 className="font-bold text-black mb-2">Can I cancel my subscription?</h3>
            <p className="text-sm text-zinc-700">Yes. Email support@sanddock.com anytime. Your account downgrades to Free on your renewal date.</p>
          </div>
          <div className="border border-black p-6 bg-white">
            <h3 className="font-bold text-black mb-2">Why USDT only?</h3>
            <p className="text-sm text-zinc-700">USDT TRC-20 has near-zero fees, instant confirmation, and no price volatility. We avoid volatile assets to simplify accounting and prevent refund nightmares when BTC drops 20% after you pay.</p>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-14 max-w-4xl mx-auto px-6 text-center border-b border-black">
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-4">Ready to apply?</h2>
        <p className="text-zinc-600 text-sm mb-8 max-w-2xl mx-auto">The application takes 3 minutes. We review within 24 hours and notify you via email with specific feedback on your risk management. Please check spam folder.</p>
        <a
          href="/apply"
          className="inline-block px-8 py-3 bg-brand-orange hover:bg-black text-white font-bold text-[12px] uppercase tracking-widest transition-all rounded-none border border-brand-orange hover:border-black"
        >
          Start Application →
        </a>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-8 text-center text-zinc-500 text-xs border-t border-black">
        <p>© 2024 Sanddock. Not financial advice. Educational purposes only.</p>
      </footer>
    </div>
  );
}
