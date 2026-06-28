"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const planFeatures = {
  free: [
    "BTC/USDT signals (15m HA)",
    "Real-time web dashboard",
    "AI explanation & confidence score",
    "1 active alert connection"
  ],
  pro: [
    "Top 10 premium altcoins (ETH, SOL, BNB...)",
    "15m, 1h, and 4h signal timeframes",
    "Automated Stop Loss & Take Profit targets",
    "Telegram alerts (1 paired chat)",
    "AI trend rationale & support validation"
  ],
  master: [
    "50+ altcoins scanned 24/7",
    "Outbound API webhooks (Cornix, 3Commas)",
    "Multi-timeframe trend confluence",
    "Unlimited Telegram alerts & channels",
    "Priority pipeline execution"
  ],
  lifetime: [
    "All current Master plan features",
    "Permanent access — no recurring fees",
    "All future features included without compromise",
    "Dedicated premium support access",
    "GrandMaster certification tag"
  ]
};

const faqItems = [
  {
    q: "How does the monthly vs yearly billing work?",
    a: "Yearly subscriptions are paid in a single upfront payment of $228/year for Pro ($19/mo equivalent) or $588/year for Master ($49/mo equivalent), saving you up to 38% compared to month-to-month billing. You can cancel at any time before your renewal date."
  },
  {
    q: "What is the GrandMaster Lifetime Deal?",
    a: "The GrandMaster Lifetime Deal is a one-time purchase of $999 that grants you permanent Master-level access to Sanddock forever. It guarantees that you will receive all future features, altcoin additions, webhook integrations, and API updates we ever release—without any future subscription fees, upsells, or compromises."
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. You can cancel your monthly or yearly plan in a single click directly from your Account Console settings. You will retain full access to your plan benefits until the end of your current billing period, with no cancellation fees."
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 14-day money-back guarantee on all monthly and yearly plans, and a 30-day money-back guarantee on the GrandMaster Lifetime Deal. If you are not satisfied with the signal clarity, contact support@sanddock.com for a full refund."
  },
  {
    q: "How many Telegram chats can I connect?",
    a: "The Free plan allows web dashboard access only. The Pro plan allows pairing with 1 individual Telegram chat. The Master and Lifetime plans allow unlimited Telegram integrations, including channels, groups, and automated API webhook bots."
  }
];

export default function PricingPage() {
  const { user } = useAuth();
  const [isYearly, setIsYearly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", body: "" });
  const [openFAQ, setOpenFAQ] = useState({});

  const handleOpenModal = (title, body) => {
    setModalContent({ title, body });
    setModalOpen(true);
  };

  const toggleFAQ = (index) => {
    setOpenFAQ(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 selection:bg-[#3D5AFE] selection:text-white overflow-hidden animate-fade-in">
      
      {/* HEADER / NAVIGATION BAR (SWISS STYLE) */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          
          <div className="flex items-center px-6 h-16 border-r border-slate-800 relative">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-sans text-white">
                Sanddock
              </span>
            </a>
          </div>

          <nav className="hidden md:flex items-center flex-1 h-16 text-xs font-bold uppercase tracking-wider text-slate-300">
            <a href="/#how-it-works" className="px-6 h-full flex items-center border-r border-slate-800 hover:bg-slate-900 hover:text-white transition-colors">How It Works</a>
            <a href="/#explainability" className="px-6 h-full flex items-center border-r border-slate-800 hover:bg-slate-900 hover:text-white transition-colors">Platform Features</a>
            <a href="/#track-record" className="px-6 h-full flex items-center border-r border-slate-800 hover:bg-slate-900 hover:text-white transition-colors">Track Record</a>
            <a href="/pricing" className="px-6 h-full flex items-center border-r border-slate-800 hover:bg-slate-900 hover:text-white transition-colors text-white">Pricing</a>
            <a href="/contact" className="px-6 h-full flex items-center border-r border-slate-800 hover:bg-slate-900 hover:text-white transition-colors">Contact</a>
            {user ? (
              <a href="/terminal" className="px-6 h-full flex items-center border-r border-slate-800 text-[#3D5AFE] hover:bg-[#3D5AFE] hover:text-white transition-colors">Terminal</a>
            ) : (
              <a href="/login" className="px-6 h-full flex items-center border-r border-slate-800 hover:bg-slate-900 hover:text-white transition-colors">Login</a>
            )}
          </nav>

          <div className="flex items-center h-16 border-l border-slate-800 relative">
            {user ? (
              <a 
                href="/terminal"
                className="px-6 h-full font-bold text-xs uppercase tracking-wider text-slate-100 hover:bg-[#3D5AFE] hover:text-white transition-all flex items-center"
              >
                Terminal &rarr;
              </a>
            ) : (
              <a 
                href="/signup"
                className="px-6 h-full font-bold text-xs uppercase tracking-wider text-slate-100 hover:bg-[#3D5AFE] hover:text-white transition-all flex items-center"
              >
                Start Free &rarr;
              </a>
            )}
          </div>

        </div>
      </header>

      {/* PRICING TITLE SECTION */}
      <section className="pt-20 pb-12 max-w-7xl mx-auto px-6 border-b border-slate-800 text-left animate-slide-up">
        <span className="text-xs font-bold uppercase tracking-widest text-[#3D5AFE] block mb-3">
          Transparent Cost
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tighter text-white font-sans leading-none mb-6">
          Simple, Honest Pricing
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Select a package optimized for your trade frequency and altcoin coverage.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center justify-start gap-3 pt-8">
          <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${!isYearly ? "text-white" : "text-slate-500"}`}>Monthly billing</span>
          <button 
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-12 h-6 bg-slate-800 rounded-full transition-colors focus:outline-none"
            aria-label="Toggle Billing Frequency"
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isYearly ? "translate-x-6" : ""}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${isYearly ? "text-white" : "text-slate-500"}`}>Yearly billing</span>
            <span className="text-[10px] font-bold text-[#3D5AFE] bg-[#3D5AFE]/10 border border-[#3D5AFE]/20 px-2 py-0.5 rounded-none uppercase">
              Save up to 38%
            </span>
          </div>
        </div>
      </section>

      {/* PLAN CARDS GRID */}
      <section className="py-16 max-w-7xl mx-auto px-6 border-b border-slate-800">
        
        {/* GRANDMASTER LIFETIME ACCESS CARD */}
        <div className="relative rounded-2xl border border-[#3D5AFE]/40 bg-slate-950/60 backdrop-blur-md p-8 md:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 overflow-hidden shadow-2xl hover-scale animate-pulse-glow mb-16" id="plan-lifetime">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#3D5AFE]/20 to-transparent pointer-events-none" />
          
          <div className="space-y-4 text-left max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#3D5AFE]/10 text-[#3D5AFE] border border-[#3D5AFE]/20 text-[10px] font-bold uppercase tracking-widest font-mono">
              RECOMMENDED — BEST VALUE GRANDMASTER SPOT
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-white font-sans leading-none">
              GrandMaster Lifetime Deal - $999
            </h2>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed">
              Get permanent Master-level access to Sanddock forever with a single one-time payment. This includes full access to all features available in the future as well.
            </p>
            <div className="text-emerald-400 font-mono text-sm font-bold uppercase tracking-wide">
              🔥 312 of 500 GrandMaster spots remaining
            </div>
          </div>

          <button 
            onClick={() => handleOpenModal("GrandMaster Lifetime Deal", "Purchase the founding lifetime membership for $999 one-time. Includes permanent Master-level features and a 30-day money-back guarantee.")}
            className="w-full lg:w-auto bg-white hover:bg-[#3D5AFE] text-black hover:text-white font-bold text-xs uppercase tracking-widest px-8 py-4 transition-all rounded-xl border border-white shadow-lg flex-shrink-0 text-center cursor-pointer"
          >
            Secure Spot Now &rarr;
          </button>
        </div>

        {/* SUBSCRIPTION CARDS GRID */}
        <div className="mb-8 text-left">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Or Choose A Subscription Plan</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* Free Card */}
          <div className="glass rounded-2xl p-8 flex flex-col justify-between space-y-8 relative hover-scale" id="plan-free">
            <div className="space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Free Plan</h3>
              <div className="space-y-1">
                <span className="text-5xl font-extrabold font-mono text-white">$0</span>
                <span className="block text-xs text-slate-500 font-bold uppercase tracking-wide">forever</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Perfect for beginners learning Heikin Ashi trade confluences.</p>
              
              <ul className="space-y-3 pt-6 border-t border-slate-800 text-xs text-slate-300 font-bold uppercase tracking-wider">
                {planFeatures.free.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[#3D5AFE] font-mono">&bull;</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {user ? (
              <a 
                href="/terminal"
                className="w-full py-3.5 bg-white text-black hover:bg-[#3D5AFE] hover:text-white font-bold text-xs uppercase tracking-widest text-center transition-all rounded-xl block cursor-pointer"
              >
                Go to Terminal &rarr;
              </a>
            ) : (
              <button 
                onClick={() => handleOpenModal("Get Free Signals", "Create your free membership immediately to receive verified BTC/USDT technical signal rationales.")}
                className="w-full py-3.5 bg-white text-black hover:bg-[#3D5AFE] hover:text-white font-bold text-xs uppercase tracking-widest transition-all rounded-xl cursor-pointer"
              >
                Get Free Signals &rarr;
              </button>
            )}
          </div>

          {/* Pro Card */}
          <div className="glass border border-[#3D5AFE]/30 rounded-2xl p-8 flex flex-col justify-between space-y-8 relative hover-scale" id="plan-pro">
            <span className="absolute top-0 right-8 -translate-y-1/2 bg-[#3D5AFE] text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
              Standard Choice
            </span>
            
            <div className="space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3D5AFE]">Pro Plan</h3>
              <div className="space-y-1">
                <span className="text-5xl font-extrabold font-mono text-white">
                  {isYearly ? "$19" : "$29"}
                </span>
                <span className="text-white text-sm font-bold uppercase">/mo</span>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                  {isYearly ? "Billed annually ($228/yr)" : "Billed monthly"}
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Ideal for active retail traders seeking portfolio diversification.</p>
              
              <ul className="space-y-3 pt-6 border-t border-slate-800 text-xs text-slate-300 font-bold uppercase tracking-wider">
                {planFeatures.pro.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[#3D5AFE] font-mono">&bull;</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => handleOpenModal("Checkout Pro Plan", `Checkout the Sanddock Pro plan at ${isYearly ? "$19/mo (billed annually at $228)" : "$29/mo (billed monthly)"}. Instant setup.`)}
              className="w-full py-3.5 bg-[#3D5AFE] hover:bg-brand-orange-hover text-white font-bold text-xs uppercase tracking-widest transition-all rounded-xl cursor-pointer"
            >
              Upgrade to Pro &rarr;
            </button>
          </div>

          {/* Master Card */}
          <div className="glass rounded-2xl p-8 flex flex-col justify-between space-y-8 relative hover-scale" id="plan-master">
            <div className="space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Master Plan</h3>
              <div className="space-y-1">
                <span className="text-5xl font-extrabold font-mono text-white">
                  {isYearly ? "$49" : "$79"}
                </span>
                <span className="text-white text-sm font-bold uppercase">/mo</span>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                  {isYearly ? "Billed annually ($588/yr)" : "Billed monthly"}
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Built for power users requiring API webhook automation.</p>
              
              <ul className="space-y-3 pt-6 border-t border-slate-800 text-xs text-slate-300 font-bold uppercase tracking-wider">
                {planFeatures.master.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[#3D5AFE] font-mono">&bull;</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => handleOpenModal("Checkout Master Plan", `Checkout the Sanddock Master plan at ${isYearly ? "$49/mo (billed annually at $588)" : "$79/mo (billed monthly)"}.`)}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-widest transition-all rounded-xl cursor-pointer border border-slate-700"
            >
              Get Master Now &rarr;
            </button>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-8 text-xs border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 text-center">
          &copy; {new Date().getFullYear()} Sanddock. Dynamic Live Data. Not financial advice.
        </div>
      </footer>

      {/* POPUP MODAL GATE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div 
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 z-10 text-left">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold font-mono cursor-pointer"
            >
              &times;
            </button>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#3D5AFE] uppercase tracking-wider font-mono">SANDDOCK GATEWAY</span>
              <h3 className="text-2xl font-extrabold uppercase tracking-tight text-white font-sans">{modalContent.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed normal-case font-sans">
                {modalContent.body}
              </p>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                className="w-full bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3D5AFE] font-mono"
              />
            </div>
            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 bg-[#3D5AFE] hover:bg-[#2943d0] text-white font-bold text-xs uppercase tracking-widest transition-colors rounded-xl cursor-pointer"
              >
                Proceed &rarr;
              </button>
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-3 border border-slate-800 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white uppercase tracking-widest transition-colors rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
