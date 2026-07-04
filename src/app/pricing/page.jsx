"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// ── Plan Definitions ────────────────────────────────────────────────────────
const PLANS_DATA = {
  free: {
    label: "7-Day Free Trial",
    sublabel: "No credit card required",
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: "text-zinc-400",
    badge: null,
    highlight: false,
    features: [
      { text: "BTC/USDT signals — 15m, 1h & 4h timeframes",  available: true },
      { text: "Real-time web dashboard",                       available: true },
      { text: "AI explanation & confidence score",            available: true },
      { text: "Full BTC signal history (log + performance)",  available: true },
      { text: "Basic BTC Heikin Ashi chart view",             available: true },
      { text: "Automated Stop Loss & Take Profit",            available: false },
      { text: "Telegram alerts",                              available: false },
      { text: "ETH, BNB or altcoin signals",                  available: false },
    ],
  },
  pro: {
    label: "Pro",
    sublabel: "Best for active traders",
    monthlyPrice: 29,
    yearlyPrice: 19,
    yearlyTotal: 228,
    color: "text-brand-orange",
    badge: "Most Popular",
    highlight: true,
    features: [
      { text: "BTC + ETH + BNB signals (Top 3 pairs)",        available: true },
      { text: "15m, 1h & 4h timeframes for all 3 coins",      available: true },
      { text: "Automated Stop Loss & Take Profit levels",     available: true },
      { text: "Telegram alerts (1 paired chat / group)",      available: true },
      { text: "P&L dashboard & full performance metrics",     available: true },
      { text: "AI explanation & confidence score",            available: true },
      { text: "CSV export of signal history",                 available: true },
      { text: "Priority 24h email support",                   available: true },
    ],
  },
  master: {
    label: "Master",
    sublabel: "For power traders",
    monthlyPrice: 79,
    yearlyPrice: 49,
    yearlyTotal: 588,
    color: "text-purple-400",
    badge: "All Coins",
    highlight: false,
    features: [
      { text: "All 15 premium altcoins scanned 24/7",         available: true },
      { text: "15m, 1h & 4h on every pair",                   available: true },
      { text: "Automated Stop Loss & Take Profit levels",     available: true },
      { text: "Unlimited Telegram alerts & channels",         available: true },
      { text: "Multi-timeframe trend confluence analysis",    available: true },
      { text: "Full P&L history & CSV export",                available: true },
      { text: "AI explanation & confidence score",            available: true },
      { text: "Priority 12h email support",                   available: true },
    ],
  },
};

const FEATURE_TABLE = [
  {
    group: "Signal Coverage",
    rows: [
      { name: "Coins Available",          free: "BTC only",       pro: "BTC, ETH, BNB", master: "All 15 pairs" },
      { name: "Timeframes",               free: "15m, 1h, 4h",    pro: "15m, 1h, 4h",   master: "15m, 1h, 4h" },
      { name: "Live Active Signals",      free: "Trial: Yes",     pro: "Yes",           master: "Yes" },
      { name: "Historical Signal Log",    free: "BTC read-only",  pro: "3 coins",       master: "All coins" },
    ],
  },
  {
    group: "Risk & Calculation",
    rows: [
      { name: "SL & TP Levels",          free: "Locked",         pro: "Visible",       master: "Visible" },
      { name: "P&L Calculator",          free: "No",             pro: "30-day window", master: "Full history" },
      { name: "Heikin Ashi Chart",       free: "BTC only",       pro: "BTC, ETH, BNB", master: "All pairs" },
      { name: "CSV Export",              free: "No",             pro: "Yes",           master: "Yes" },
    ],
  },
  {
    group: "Alerts & Automation",
    rows: [
      { name: "Web Dashboard",           free: "Real-time",      pro: "Real-time",     master: "Real-time" },
      { name: "Telegram Alerts",         free: "No",             pro: "1 Chat/Group",  master: "Unlimited" },
      { name: "AI Explanation",          free: "Trial: Yes",     pro: "Yes",           master: "Yes + Confluence" },
    ],
  },
  {
    group: "Support",
    rows: [
      { name: "Email Support",           free: "48h response",   pro: "24h response",  master: "12h priority" },
    ],
  },
];

const FAQS = [
  {
    q: "How does the 7-day free trial work?",
    a: "When you sign up, you get 7 days of full BTC/USDT signal access across all 3 timeframes (15m, 1h, 4h) with AI explanations, signal history, and the Heikin Ashi chart — completely free with no credit card required. After 7 days, live active signals are paused and you'll see only closed/historical signals until you upgrade.",
  },
  {
    q: "What happens after my trial expires?",
    a: "You keep access to the terminal and can view your closed historical BTC signals. Live active signals will be hidden until you upgrade to Pro or Master. Your signal history and performance data are preserved.",
  },
  {
    q: "How does monthly vs yearly billing work?",
    a: "Yearly plans are billed as one upfront payment — $228/year for Pro ($19/mo equivalent) or $588/year for Master ($49/mo equivalent), saving up to 38% vs monthly billing. You can cancel before your renewal date.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. Email support@sanddock.com or use the Billing page inside your account. You keep full access to your plan until the end of your current billing period with zero cancellation fees.",
  },
  {
    q: "What is the GrandMaster Lifetime Deal?",
    a: "A one-time payment of $799 grants permanent Master-level access — forever. No recurring fees, upsells, or surprises. All future coins, features, and updates are included. Comes with a 30-day money-back guarantee.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes. 14-day money-back guarantee on all monthly and yearly plans, and a 30-day guarantee on the Lifetime Deal. Contact support@sanddock.com.",
  },
];

const TESTIMONIALS = [
  {
    category: "SIGNAL QUALITY",
    text: '"The AI explanation on every signal is a game-changer — I actually understand why I\'m entering a trade now. First signal tool that doesn\'t make me feel confused."',
    author: "Alex Rivera",
    role: "Senior Software Engineer",
  },
  {
    category: "HONEST LEDGER",
    text: '"The public track record is what sold me. They show the losses too. Every other signal group hides that. Instant trust from day one."',
    author: "Nico G.",
    role: "Asset Allocator",
  },
  {
    category: "PRO USER",
    text: '"Switched from a VIP signal group to Sanddock. No more spam. One clean alert with an explanation. The Pro plan is absolutely worth it."',
    author: "Marcus Aurelius",
    role: "Swing Trader",
  },
];

// ── Checkout helper ─────────────────────────────────────────────────────────
async function startCheckout({ userId, plan, billingCycle }) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, plan, billingCycle }),
  });
  const data = await res.json();
  if (data.checkoutUrl) {
    window.location.href = data.checkoutUrl;
    return true;
  }
  throw new Error(data.error || "Could not start checkout");
}

// ── CheckIcon ───────────────────────────────────────────────────────────────
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

// ── PricingCard ─────────────────────────────────────────────────────────────
function PricingCard({ planKey, data, isYearly, user, onUpgrade, loadingKey }) {
  const price = isYearly ? data.yearlyPrice : data.monthlyPrice;
  const isFree = planKey === "free";
  const isLoading = loadingKey === `${planKey}_${isYearly ? "yearly" : "monthly"}`;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-none border p-7 ${
        data.highlight
          ? "border-brand-orange bg-white shadow-[6px_6px_0px_0px_rgba(61,90,254,0.6)]"
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
          <div className="mt-1.5 flex items-end gap-1">
            <span className="text-4xl font-extrabold font-mono text-black">
              {isFree ? "$0" : `$${price}`}
            </span>
            {!isFree && <span className="text-sm font-bold text-black uppercase mb-1">/mo</span>}
          </div>
          {!isFree && isYearly && (
            <span className="block text-[11px] text-zinc-500 font-bold">
              Billed annually (${data.yearlyTotal}/yr)
            </span>
          )}
          {isFree && (
            <span className="block text-[11px] text-zinc-500 font-bold mt-0.5">No credit card · 7 days free</span>
          )}
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
              Start Free Trial →
            </a>
          )
        ) : (
          <button
            onClick={() => onUpgrade(planKey, isYearly ? "yearly" : "monthly")}
            disabled={isLoading}
            className={`w-full py-3 font-bold text-[12px] uppercase tracking-widest transition-all rounded-none border cursor-pointer disabled:opacity-60 ${
              data.highlight
                ? "bg-brand-orange hover:bg-black text-white border-brand-orange"
                : "bg-black hover:bg-brand-orange text-white border-black"
            }`}
          >
            {isLoading ? "Redirecting…" : `Upgrade to ${data.label} →`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(true);
  const [openFAQ, setOpenFAQ] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);

  // Trial status for logged-in free users
  const isFreePlan = profile?.plan === "free";
  const trialEndsAt = profile?.trial_ends_at;
  const trialDaysLeft = isFreePlan && trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const trialExpired = isFreePlan && trialEndsAt && new Date() > new Date(trialEndsAt);

  const handleUpgrade = async (plan, billingCycle) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const key = `${plan}_${billingCycle}`;
    setLoadingKey(key);
    try {
      await startCheckout({ userId: user.id, plan, billingCycle });
    } catch (e) {
      alert(`Checkout error: ${e.message}`);
      setLoadingKey(null);
    }
  };

  const handleLifetime = async () => {
    if (!user) { router.push("/login"); return; }
    setLoadingKey("lifetime_lifetime");
    try {
      await startCheckout({ userId: user.id, plan: "lifetime", billingCycle: "lifetime" });
    } catch (e) {
      alert(`Checkout error: ${e.message}`);
      setLoadingKey(null);
    }
  };

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

      {/* ── TRIAL EXPIRY BANNER (logged in, expired) ───────────────────────── */}
      {user && trialExpired && (
        <div className="bg-red-600 text-white px-6 py-3 text-center text-[13px] font-bold uppercase tracking-wider">
          ⚠ Your 7-day free trial has expired — upgrade to restore live signals &amp; full access.
        </div>
      )}
      {user && isFreePlan && !trialExpired && trialDaysLeft !== null && trialDaysLeft <= 3 && (
        <div className="bg-amber-500 text-black px-6 py-2 text-center text-[12px] font-bold uppercase tracking-wider">
          ⏱ Your free trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} — upgrade to keep your signals.
        </div>
      )}

      {/* ── TITLE SECTION ──────────────────────────────────────────────────── */}
      <section className="pt-16 pb-10 max-w-7xl mx-auto px-6 border-b border-black text-left">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block mb-2">
          Transparent Cost
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none mb-4">
          Simple pricing. No surprises.
        </h1>
        <p className="text-zinc-500 text-sm max-w-xl leading-relaxed">
          Start free on Bitcoin for 7 days. Upgrade when the signals prove themselves.
        </p>

        <div className="flex items-center justify-start gap-3 pt-7">
          <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${!isYearly ? "text-black" : "text-zinc-400"}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-10 h-5 bg-zinc-200 border border-black rounded-none transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle billing frequency"
          >
            <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-black rounded-none transition-transform duration-200 ${isYearly ? "translate-x-5" : ""}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${isYearly ? "text-black" : "text-zinc-400"}`}>
              Yearly
            </span>
            <span className="text-[10px] font-bold text-white bg-brand-orange px-2 py-0.5 rounded-none uppercase">
              Save 38%
            </span>
          </div>
        </div>
      </section>

      {/* ── PLAN CARDS ─────────────────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {Object.entries(PLANS_DATA).map(([key, data]) => (
            <PricingCard
              key={key}
              planKey={key}
              data={data}
              isYearly={isYearly}
              user={user}
              onUpgrade={handleUpgrade}
              loadingKey={loadingKey}
            />
          ))}
        </div>

        {/* ── Lifetime Card ─────────────────────────────────────────────── */}
        <div
          className="relative rounded-none border border-black bg-[#f4f6fa] p-8 mt-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          id="plan-lifetime"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-brand-orange/15 to-transparent pointer-events-none" />
          <div className="space-y-3 text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-orange text-white text-[10px] font-bold uppercase tracking-wider">
              ⚡ Founding Member Offer — One-Time Payment
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-black font-sans leading-none">
              GrandMaster Lifetime Access — $799
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Permanent Master-level access to Sanddock forever. All future coins, features &amp; updates included — no recurring fees.
            </p>
            <ul className="space-y-1.5 text-[12px] text-zinc-700 font-semibold">
              {["All 15 coins, all timeframes — permanently", "Unlimited Telegram alerts & channels", "All future features included automatically", "GrandMaster certification badge", "30-day money-back guarantee"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-brand-orange font-mono text-sm">•</span> {f}
                </li>
              ))}
            </ul>
            <div className="text-brand-orange font-mono text-[11px] font-bold uppercase tracking-wide">
              🔥 Only 188 spots left at this price — 312 of 500 claimed
            </div>
          </div>
          <button
            onClick={handleLifetime}
            disabled={!!loadingKey}
            className="w-full lg:w-auto bg-black hover:bg-brand-orange text-white font-bold text-[12px] uppercase tracking-widest px-8 py-4 transition-all rounded-none border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] flex-shrink-0 text-center cursor-pointer disabled:opacity-60"
          >
            {loadingKey === "lifetime_lifetime" ? "Redirecting…" : "Secure Spot Now →"}
          </button>
        </div>
      </section>

      {/* ── SIGNAL OUTCOME MOCKUP ──────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 text-left space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange">Verified Outcomes</span>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
              Every alert has a verified entry &amp; exit.
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              We do not post curated screenshots of hypothetical returns. Our system tracks every trade in a public ledger linked with live alerts.
            </p>
            <div className="p-4 bg-zinc-50 border border-black rounded-none space-y-2 text-[11px] font-bold uppercase tracking-wider text-black">
              <div className="flex justify-between"><span>Signal Accuracy</span><span className="text-[#00b050]">78.4%</span></div>
              <div className="flex justify-between"><span>Avg Return / Trade</span><span className="text-[#00b050]">+4.92%</span></div>
              <div className="flex justify-between font-extrabold border-t border-black/10 pt-2"><span>Monthly Net (10x Leverage)</span><span>+48.1%</span></div>
            </div>
          </div>
          <div className="lg:col-span-7 w-full">
            <div className="bg-[#080d1a] border border-black rounded-none p-6 text-white relative overflow-hidden text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
                  <span className="font-mono text-[10px] text-[#00e676] font-bold tracking-widest uppercase">Real-Time Signal Outcome</span>
                </div>
                <span className="font-mono text-[9px] text-zinc-500">PAIRED TELEGRAM OUTFLOW</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div><span className="block text-[9px] text-zinc-500 font-mono">INSTRUMENT</span><span className="text-lg font-bold font-mono tracking-tight">BTC/USDT</span></div>
                  <div><span className="block text-[9px] text-zinc-500 font-mono">SIGNAL TYPE</span><span className="inline-block bg-[#00e676]/15 text-[#00e676] font-mono text-[10px] font-bold px-2 py-0.5 border border-[#00e676]/20">BUY ALERT</span></div>
                  <div className="bg-black/40 p-3 border border-white/5 space-y-1.5 font-mono text-[10px]">
                    <div className="flex justify-between"><span className="text-zinc-500">ENTRY:</span><span className="text-white font-bold">$67,432.00</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">EXIT:</span><span className="text-[#00e676] font-bold">$70,812.00</span></div>
                    <div className="flex justify-between border-t border-white/5 pt-1.5"><span className="text-zinc-500">STOP LOSS:</span><span className="text-red-400 font-bold">$65,800.00</span></div>
                  </div>
                </div>
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="bg-[#00e676]/5 border border-[#00e676]/20 p-3">
                    <span className="block text-[9px] text-zinc-500 font-mono uppercase">Trade Profit</span>
                    <span className="block text-2xl font-bold font-mono text-[#00e676]">+5.01%</span>
                    <span className="block text-[9px] text-[#00e676]/80 font-mono mt-0.5">Unleveraged Spot</span>
                  </div>
                  <div className="bg-[#00e676]/10 border border-[#00e676]/30 p-3">
                    <span className="block text-[9px] text-zinc-500 font-mono uppercase">10× Leverage Return</span>
                    <span className="block text-2xl font-bold font-mono text-[#00e676]">+50.1%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE TABLE ──────────────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="text-left mb-8">
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block mb-2">Detailed Comparison</span>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Compare all plan capabilities.
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-left">
            <thead>
              <tr className="bg-zinc-100 border-b border-black text-[11px] font-extrabold uppercase tracking-wider text-black">
                <th className="p-3.5 border-r border-black">Feature</th>
                <th className="p-3.5 border-r border-black text-center w-28">Free Trial</th>
                <th className="p-3.5 border-r border-black text-center w-28 text-brand-orange">Pro</th>
                <th className="p-3.5 text-center w-28">Master</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 font-sans">
              {FEATURE_TABLE.map((section) => (
                <React.Fragment key={section.group}>
                  <tr className="bg-zinc-50 font-bold border-t border-b border-black/30">
                    <td colSpan={4} className="p-2.5 pl-3.5 text-[10px] uppercase tracking-widest text-zinc-500">{section.group}</td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.name} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="p-3.5 border-r border-black/10 font-bold text-[12px] uppercase tracking-wide text-black">{row.name}</td>
                      <td className="p-3.5 border-r border-black/10 text-center text-[12px] text-zinc-600">{row.free}</td>
                      <td className="p-3.5 border-r border-black/10 text-center text-[12px] font-semibold text-zinc-900">{row.pro}</td>
                      <td className="p-3.5 text-center text-[12px] font-bold text-black">{row.master}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="text-left mb-8">
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange block mb-2">Social Proof</span>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Loved by active crypto traders.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-zinc-50 border border-black p-6 flex flex-col justify-between space-y-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="space-y-3">
                <span className="text-[9px] font-bold px-2 py-0.5 border border-black bg-white text-black font-mono">{t.category}</span>
                <p className="text-sm text-zinc-700 leading-relaxed font-sans normal-case">{t.text}</p>
              </div>
              <div className="border-t border-black/10 pt-3">
                <span className="block font-bold text-[12px] text-black uppercase">{t.author}</span>
                <span className="block text-[10px] text-zinc-500 uppercase font-mono mt-0.5">{t.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-14 max-w-4xl mx-auto px-6 border-b border-black">
        <div className="text-left mb-8 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange">FAQ</span>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Everything you need to know
          </h2>
        </div>
        <div className="border-t border-black divide-y divide-black">
          {FAQS.map((item, i) => {
            const isOpen = !!openFAQ[i];
            return (
              <div key={i} className="py-5">
                <button
                  onClick={() => setOpenFAQ((prev) => ({ ...prev, [i]: !prev[i] }))}
                  className="w-full text-left flex items-center justify-between gap-4 font-bold uppercase text-sm text-black hover:text-brand-orange transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  <span className="font-sans">{item.q}</span>
                  <span className="text-lg font-bold font-mono">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <p className="text-zinc-600 text-sm leading-relaxed pt-3 pr-8 normal-case font-normal font-sans">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-6">
        <div className="relative rounded-none border border-black bg-[#f4f6fa] p-10 text-left overflow-hidden">
          <div className="max-w-xl space-y-4 relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
              Not sure? Start free — no card required.
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Join traders who get AI-powered Buy and Sell signals with a verified public track record. Start free for 7 days on BTC.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {user ? (
                <a href="/terminal" className="bg-black hover:bg-brand-orange font-bold text-white text-[12px] uppercase tracking-widest px-7 py-3.5 transition-colors rounded-none inline-block border border-black">
                  Go to Terminal →
                </a>
              ) : (
                <a href="/signup" className="bg-black hover:bg-brand-orange font-bold text-white text-[12px] uppercase tracking-widest px-7 py-3.5 transition-colors rounded-none inline-block border border-black">
                  Start Free Trial →
                </a>
              )}
              <a href="/pricing#faq" className="font-bold text-black text-[12px] uppercase tracking-widest px-7 py-3.5 border border-black hover:bg-zinc-100 transition-colors rounded-none inline-block">
                Read FAQ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-black text-white py-8 text-[11px] border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-zinc-500">
          <span>© {new Date().getFullYear()} Sanddock. Dynamic Live Data. Not financial advice.</span>
          <div className="flex items-center gap-5">
            <a href="/billing" className="hover:text-white transition-colors uppercase tracking-wider font-bold">Billing</a>
            <a href="/contact" className="hover:text-white transition-colors uppercase tracking-wider font-bold">Contact</a>
            <a href="/pricing#faq" className="hover:text-white transition-colors uppercase tracking-wider font-bold">FAQ</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
