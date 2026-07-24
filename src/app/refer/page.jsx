"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CtaPrimary, SectionHeading } from "@/components/ui/Cta";

const TIERS = [
  { plan: "Pro", amount: "$10", sub: "you earn $10 when they go monthly Pro" },
  { plan: "Master", amount: "$25", sub: "you earn $25 when they go monthly Master" },
  { plan: "GrandMaster", amount: "$99.90", sub: "you earn $99.90 when they take lifetime access" },
];

const STEPS = [
  {
    title: "Grab your link",
    body: "Sign in to the terminal's Refer & Earn tab to get your unique referral link and code.",
  },
  {
    title: "Share it",
    body: "Send it to traders who'd want verified signals - Telegram, X, group chats, wherever.",
  },
  {
    title: "They upgrade",
    body: "When someone you invited upgrades to Pro, Master, or GrandMaster, you're credited automatically.",
  },
  {
    title: "You get paid",
    body: "Earn 10% of what they paid, in USDT. Claim anytime, weekly, with no cap - just message the admin on Telegram.",
  },
];

export default function ReferPage() {
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) localStorage.setItem("sanddock_ref_code", ref.toUpperCase());
  }, []);

  return (
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden antialiased">
      <Navbar />

      {/* PAGE HEADER */}
      <section className="relative mesh-glow grain border-b border-line overflow-hidden">
        <div className="grid-lines" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-16 md:pt-40 md:pb-20">
          <p className="font-instrument-serif text-[#b4c0ff] text-2xl sm:text-3xl leading-[1.1]">
            Refer &amp; earn
          </p>
          <h1 className="mt-3 text-5xl sm:text-6xl lg:text-[72px] font-semibold tracking-tighter leading-[0.95] text-gradient">
            Earn 10% in USDT
            <br />for every upgrade
          </h1>
          <p className="mt-5 text-white/70 text-[16px] md:text-[17px] leading-[1.65] max-w-xl">
            Invite traders to Sanddock. When they upgrade to a paid plan, you earn a 10%
            commission in USDT - no cap on invites, no cap on earnings.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <CtaPrimary href={user ? "/terminal?tab=refer" : "/signup"}>
              {user ? "Get my referral link" : "Sign up to get your link"}
            </CtaPrimary>
          </div>
        </div>
      </section>

      {/* COMMISSION TIERS */}
      <section className="relative py-16 md:py-20 border-b border-line mesh-glow-soft">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="What you earn"
            title="10% commission,"
            accent="every single time"
            description="Commission is a reward paid the moment your referral first upgrades to a paid plan."
          />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((t) => (
              <div key={t.plan} className="card-gradient-border p-px">
                <div className="relative h-full rounded-[17px] bg-surface-2/80 backdrop-blur-xl p-6 overflow-hidden">
                  <div className="pointer-events-none absolute -top-24 -right-16 w-52 h-52 rounded-full bg-accent/18 blur-3xl" />
                  <div className="relative">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                      {t.plan} referral
                    </span>
                    <p className="mt-2 text-[40px] font-semibold tracking-tight text-gradient">
                      {t.amount}
                    </p>
                    <p className="text-[13.5px] text-ink-2 mt-1">{t.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-16 md:py-20 border-b border-line">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="How it works"
            title="Four steps,"
            accent="zero friction"
          />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card p-6">
                <span className="text-[11px] font-semibold text-accent-soft">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-[16px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[13.5px] text-ink-2 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLAIMING */}
      <section className="relative py-16 md:py-20 border-b border-line mesh-glow-soft">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="card p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-gradient">
                Claim weekly, no limit
              </h2>
              <p className="mt-2 text-[14.5px] text-ink-2 leading-relaxed max-w-xl">
                There&apos;s no cap on how much you can earn or how many people you can invite. Message
                the admin on Telegram any week to claim your accumulated USDT commission.
              </p>
            </div>
            <a
              href="https://t.me/alexsanddockcom"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary shrink-0"
            >
              <span>Contact admin on Telegram</span>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
