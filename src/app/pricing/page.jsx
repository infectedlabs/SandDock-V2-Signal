"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CtaPrimary, CtaSecondary, SectionHeading } from "@/components/ui/Cta";

// ── Plan Definitions ────────────────────────────────────────────────────────
const PLANS_DATA = {
  free: {
    label: "Free Plan",
    sublabel: "Always open to BTC signals",
    monthlyPrice: 0,
    color: "text-ink",
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
    color: "text-accent-soft",
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
    color: "text-[#c4b5fd]",
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

const COMPARISON_ROWS = [
  ["Coins Available", "BTC only", "BTC, ETH, BNB", "All 15 pairs"],
  ["Timeframes", "15m, 1h, 4h", "15m, 1h, 4h", "15m, 1h, 4h"],
  ["SL & TP Levels", "Locked", "Visible", "Visible"],
  ["P&L Calculator", "No", "Full history", "Full history"],
  ["CSV Export", "No", "Yes", "Yes"],
  ["Telegram Alerts", "Free BTC Group", "Private Channel", "Unlimited Channels"],
  ["AI Explanations", "Yes", "Yes", "Yes + Confluence"],
  ["Email Support", "48h response", "24h response", "12h priority"],
];

const PRICING_FAQ = [
  {
    q: "How long does the review process take?",
    a: "Applications are reviewed within 24 hours of submission. You'll receive an email with your decision and feedback on your risk management. Please check your spam folder to ensure you don't miss it.",
  },
  {
    q: "What if I'm rejected?",
    a: "You'll receive specific feedback on your risk management approach. Most rejections are because traders aren't sizing positions properly or moving stops. You can reapply after addressing the feedback.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. Email alex@sanddock.com anytime. Your account downgrades to Free on your renewal date.",
  },
  {
    q: "Why USDT only?",
    a: "USDT TRC-20 has near-zero fees, instant confirmation, and no price volatility. We avoid volatile assets to simplify accounting and prevent refund nightmares when BTC drops 20% after you pay.",
  },
];

const PROCESS_STEPS = [
  {
    title: "Applications reviewed",
    body: "Within 24 hours of submission",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
  },
  {
    title: "Notification",
    body: "Decision sent via email. Check spam folder to be safe.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
  },
  {
    title: "Payment method",
    body: "USDT TRC-20 only. Direct on-chain, no middleman.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h4m-7 4h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
  },
];

function CheckIcon({ available }) {
  if (available) {
    return (
      <svg className="w-4 h-4 text-up shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-ink-3/60 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Status pill icons, replacing the previous emoji glyphs.
function StatusIcon({ status }) {
  const common = { className: "w-4 h-4", fill: "none", stroke: "currentColor", strokeWidth: 2.2, viewBox: "0 0 24 24" };
  if (status === "accepted") {
    return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
  }
  if (status === "rejected") {
    return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
  }
  // pending / waitlisted
  return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

// ── PricingCard ─────────────────────────────────────────────────────────
function PricingCard({ planKey, data, user }) {
  const router = useRouter();
  const isFree = planKey === "free";

  const Shell = ({ children }) =>
    data.highlight ? (
      <div className="card-gradient-border p-px h-full shadow-[0_30px_80px_-35px_rgba(48,84,255,0.65)]">
        <div className="relative flex flex-col justify-between h-full rounded-[17px] bg-surface-2/80 backdrop-blur-xl p-7 overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-16 w-56 h-56 rounded-full bg-accent/18 blur-3xl" />
          <div className="relative flex flex-col justify-between h-full">{children}</div>
        </div>
      </div>
    ) : (
      <div className="card card-interactive flex flex-col justify-between h-full p-7">{children}</div>
    );

  return (
    <div className="relative h-full" id={`plan-${planKey}`}>
      {data.badge && (
        <span
          className={`absolute top-0 right-6 -translate-y-1/2 z-20 text-[10px] font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-full ${
            data.highlight
              ? "bg-gradient-to-r from-accent to-accent-2 text-white shadow-[0_8px_24px_-10px_rgba(48,84,255,0.9)]"
              : "bg-surface-3 text-ink-2 border border-white/10"
          }`}
        >
          {data.badge}
        </span>
      )}

      <Shell>
        <div className="space-y-5">
          <div>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${data.color}`}>
              {data.label}
            </span>
            <div className="mt-2">
              {isFree ? (
                <>
                  <span className="text-4xl font-semibold tracking-tight text-ink">$0</span>
                  <span className="block text-[12px] text-ink-3 mt-1">
                    No credit card · Permanent access
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-semibold tracking-tight text-gradient">
                    Application Only
                  </span>
                  <span className="block text-[12px] text-ink-3 mt-1">
                    Pricing revealed after approval
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-[13px] text-ink-2 leading-relaxed">{data.sublabel}</p>

          <ul className="space-y-2.5 pt-4 border-t border-white/8">
            {data.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckIcon available={f.available} />
                <span
                  className={`text-[12.5px] leading-snug ${
                    f.available ? "text-ink-2" : "text-ink-3/70 line-through"
                  }`}
                >
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-7">
          {isFree ? (
            user ? (
              <CtaSecondary href="/terminal" className="w-full justify-center border border-white/12">
                Go to Terminal
              </CtaSecondary>
            ) : (
              <CtaSecondary href="/signup" className="w-full justify-center border border-white/12">
                Get Started Free
              </CtaSecondary>
            )
          ) : (
            <button
              onClick={() => router.push(`/apply?plan=${planKey}`)}
              className="btn-primary w-full justify-between cursor-pointer"
            >
              <span>Apply for {data.label}</span>
              <span className="btn-primary__arrow">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </Shell>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { user } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [openFAQ, setOpenFAQ] = useState({});

  useEffect(() => {
    if (!user) return;

    const fetchApplicationStatus = async () => {
      try {
        const appRes = await fetch(`/api/applications?user_id=${encodeURIComponent(user.id)}`);
        if (appRes.ok) {
          const appData = await appRes.json();
          if (appData && appData.length > 0) {
            setApplicationStatus(appData[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch application status:', error);
      }
    };

    fetchApplicationStatus();
  }, [user]);

  const toggleFAQ = (idx) => setOpenFAQ((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const statusTone = {
    accepted: "border-up/40 bg-up/10 text-up",
    pending: "border-accent/40 bg-accent/10 text-accent-soft",
    waitlisted: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    rejected: "border-down/40 bg-down/10 text-down",
  };

  return (
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden antialiased">
      <Navbar />

      {/* ── TITLE SECTION ──────────────────────────────────────────────────── */}
      <section className="relative mesh-glow grain border-b border-line overflow-hidden">
        <div className="grid-lines" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-20 md:pt-44 md:pb-24 text-center">
          <p className="font-instrument-serif text-[#b4c0ff] text-2xl sm:text-3xl leading-[1.1]">
            Application-based access
          </p>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-[86px] font-semibold tracking-tighter leading-[0.95] text-gradient max-w-4xl mx-auto">
            We&apos;re selective about who we let in.
          </h1>
          <p className="mt-6 text-white/70 text-[17px] md:text-lg leading-[1.65] max-w-2xl mx-auto">
            Every trader is reviewed for risk management. Start free on Bitcoin, then apply for Pro
            or Master. We review applications within 24 hours and notify you via email.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <CtaPrimary href="/apply">Start application</CtaPrimary>
            <CtaSecondary href="#compare">Compare plans</CtaSecondary>
          </div>
        </div>
      </section>

      {/* ── APPLICATION STATUS ALERT ──────────────────────────────────────── */}
      {user && applicationStatus && (
        <section className="relative py-14 border-b border-line">
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div
              className={`card p-7 border-l-2 ${
                statusTone[applicationStatus.status] || statusTone.pending
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <StatusIcon status={applicationStatus.status} />
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">
                  {applicationStatus.status === "accepted"
                    ? "Approved"
                    : applicationStatus.status === "pending"
                    ? "Under review"
                    : applicationStatus.status === "waitlisted"
                    ? "Waiting list"
                    : "Rejected"}
                </p>
              </div>
              <p className="text-[15px] text-ink-2 leading-relaxed mb-5">
                Your application for{" "}
                <span className="font-semibold text-ink uppercase">{applicationStatus.plan}</span> is{" "}
                {applicationStatus.status === "pending" && "under review. We'll notify you within 24 hours."}
                {applicationStatus.status === "waitlisted" && "under review. We'll notify you as soon as it's approved."}
                {applicationStatus.status === "accepted" && "approved! Contact us to complete payment and activate your plan."}
                {applicationStatus.status === "rejected" && "not approved at this time. Contact us to discuss further opportunities."}
              </p>
              <div className="flex flex-wrap gap-3">
                <CtaSecondary
                  href="https://t.me/alexsanddockcom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white/12"
                >
                  Contact @alexsanddockcom
                </CtaSecondary>
                <CtaSecondary href="/billing" className="border border-white/12">
                  View billing
                </CtaSecondary>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── PLAN CARDS ─────────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-24 border-b border-line mesh-glow-soft">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {Object.entries(PLANS_DATA).map(([key, data]) => (
              <PricingCard key={key} planKey={key} data={data} user={user} />
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCESS STATUS (FOMO) ───────────────────────────────────────────── */}
      <section className="relative py-20 md:py-24 border-b border-line">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Current access status" title="Where the queue stands today" />
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-line bg-line">
            {[
              { label: "Pro Plan", value: "Open", sub: `${DEMO_STATS.proAccepted} accepted this month`, tone: "text-up" },
              { label: "Master Waitlist", value: DEMO_STATS.masterWaitlist, sub: "traders waiting for access", tone: "text-gradient-accent" },
              { label: "This Week", value: DEMO_STATS.thisWeek, sub: `${DEMO_STATS.acceptedThisWeek} approved applications`, tone: "text-ink" },
              { label: "Response Time", value: "< 24h", sub: "email notification sent", tone: "text-gradient-accent" },
            ].map((s) => (
              <div key={s.label} className="bg-surface-1/90 p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3 mb-2">
                  {s.label}
                </p>
                <p className={`text-[30px] font-semibold tracking-tight mb-1 ${s.tone}`}>{s.value}</p>
                <p className="text-[12.5px] text-ink-3">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW THE PROCESS WORKS ──────────────────────────────────────────── */}
      <section className="relative py-20 md:py-24 border-b border-line">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="The application process"
            title="Why we review every application"
            description="Signal quality means nothing if you don't understand risk management. We review each application and grant access based on your approach to position sizing and stop losses. This ensures everyone on the platform has realistic expectations and the discipline to follow their plan."
          />
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROCESS_STEPS.map((step) => (
              <div key={step.title} className="card card-interactive p-7">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white flex items-center justify-center shadow-[0_8px_24px_-10px_rgba(48,84,255,0.9)]">
                  <svg className="w-[19px] h-[19px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {step.icon}
                  </svg>
                </div>
                <p className="mt-5 font-semibold text-ink text-[15px]">{step.title}</p>
                <p className="mt-1.5 text-[13.5px] text-ink-2 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE COMPARISON TABLE ────────────────────────────────────────── */}
      <section id="compare" className="relative py-20 md:py-24 border-b border-line mesh-glow-soft">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Side by side" title="Complete feature comparison" />
          <div className="mt-12 card overflow-hidden !rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left py-4 px-5 font-semibold text-[10px] uppercase tracking-[0.16em] text-ink-3">Feature</th>
                    <th className="text-center py-4 px-5 font-semibold text-[10px] uppercase tracking-[0.16em] text-ink-3">Free</th>
                    <th className="text-center py-4 px-5 font-semibold text-[10px] uppercase tracking-[0.16em] text-accent-soft">Pro</th>
                    <th className="text-center py-4 px-5 font-semibold text-[10px] uppercase tracking-[0.16em] text-[#c4b5fd]">Master</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {COMPARISON_ROWS.map(([feature, free, pro, master]) => (
                    <tr key={feature} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-5 text-[13.5px] font-medium text-ink">{feature}</td>
                      <td className="text-center py-3.5 px-5 text-[13.5px] text-ink-2">{free}</td>
                      <td className="text-center py-3.5 px-5 text-[13.5px] text-ink-2">{pro}</td>
                      <td className="text-center py-3.5 px-5 text-[13.5px] text-ink-2">{master}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-24 border-b border-line">
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <SectionHeading eyebrow="Questions?" title="Before you apply" />
          <div className="mt-12 divide-y divide-white/8 border-y border-white/8">
            {PRICING_FAQ.map((item, idx) => {
              const isOpen = !!openFAQ[idx];
              return (
                <div key={idx}>
                  <button
                    onClick={() => toggleFAQ(idx)}
                    aria-expanded={isOpen}
                    className={`w-full text-left flex items-center justify-between gap-6 py-5 text-[16px] font-medium transition-colors ${
                      isOpen ? "text-ink" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    <span>{item.q}</span>
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-[14px] transition-all ${
                        isOpen
                          ? "border-accent/40 bg-accent/15 text-accent-soft"
                          : "border-white/12 text-ink-3"
                      }`}
                    >
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="text-ink-2 text-[15px] leading-relaxed pb-6 pr-10">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-24 border-b border-line">
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="card-gradient-border p-px shadow-[0_40px_100px_-40px_rgba(48,84,255,0.7)]">
            <div className="relative rounded-[17px] bg-surface-1/85 backdrop-blur-xl px-8 py-14 md:px-14 md:py-16 text-center overflow-hidden grain">
              <div className="pointer-events-none absolute -top-40 -right-20 w-[420px] h-[420px] rounded-full bg-accent-2/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-accent/18 blur-3xl" />
              <div className="relative z-10">
                <h2 className="text-[32px] md:text-[46px] font-semibold tracking-tighter leading-[1.05] text-gradient">
                  Ready to apply?
                </h2>
                <p className="mt-5 text-white/70 text-[16px] md:text-[17px] leading-[1.65] max-w-2xl mx-auto">
                  The application takes 3 minutes. We review within 24 hours and notify you via
                  email with specific feedback on your risk management. Please check your spam folder.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-9">
                  <CtaPrimary href="/apply">Start application</CtaPrimary>
                  <CtaSecondary
                    href="https://t.me/alexsanddockcom"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ask a question first
                  </CtaSecondary>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUICK SUPPORT ────────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-24 border-b border-line">
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-ink mb-2">
                Quick support
              </h2>
              <p className="text-[14.5px] text-ink-2">
                Have questions about pricing, applications, or the payment process?
              </p>
            </div>
            <CtaSecondary
              href="https://t.me/alexsanddockcom"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/12 flex-shrink-0"
            >
              Contact on Telegram
            </CtaSecondary>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
