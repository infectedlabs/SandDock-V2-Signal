"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const planFeatures = {
  free: [
    "BTC/USDT signals (15m HA)",
    "Real-time web dashboard",
    "AI explanation & confidence score",
    "Last 7 days of signal history",
    "Basic BTC chart view"
  ],
  pro: [
    "Top 10 premium altcoins",
    "15m, 1h, and 4h signal timeframes",
    "Automated Stop Loss & Take Profit",
    "Telegram alerts (1 paired chat)",
    "P&L calculator & metrics"
  ],
  master: [
    "50+ altcoins scanned 24/7",
    "Outbound API webhooks (Cornix)",
    "Multi-timeframe trend confluence",
    "Unlimited Telegram alerts & channels",
    "Priority pipeline execution"
  ],
  lifetime: [
    "All current Master plan features",
    "Permanent access — no recurring fees",
    "All future features included",
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
    a: "The GrandMaster Lifetime Deal is a one-time purchase of $799 that grants you permanent Master-level access to Sanddock forever. It guarantees that you will receive all future features, altcoin additions, webhook integrations, and API updates we ever release—without any future subscription fees, upsells, or compromises."
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

const pricingTestimonials = [
  {
    category: "TECH INNOVATIONS",
    text: '"The AI explanation on every signal is a game-changer — I actually understand why I\'m entering a trade now. First signal tool that doesn\'t make me feel confused."',
    author: "Alex Rivera",
    role: "Senior Software Engineer"
  },
  {
    category: "HONEST LEDGER",
    text: '"The public track record is what sold me. They show the losses. Every other signal group hides that. Instant trust from day one."',
    author: "Nico G.",
    role: "Asset Allocator"
  },
  {
    category: "SIGNAL QUALITY",
    text: '"Switched from a VIP signal group to Sanddock. No more spam. One clean alert with an explanation. The Pro plan is worth every penny."',
    author: "Marcus Aurelius",
    role: "Swing Trader"
  }
];

const featureTableGroups = [
  {
    title: "Signal Coverage & Core Logic",
    features: [
      { name: "Scanned Pairs", free: "BTC only", pro: "11 Top Pairs", master: "50+ Pairs", lifetime: "50+ Pairs" },
      { name: "Timeframes Supported", free: "15m HA only", pro: "15m, 1h, 4h HA", master: "All timeframes", lifetime: "All timeframes" },
      { name: "AI Rationale Explanation", free: "Yes (Full Text)", pro: "Yes (Full Text)", master: "Yes + Confluence Score", lifetime: "Yes + Confluence Score" },
      { name: "Historical Win Rate Chart", free: "Read-only", pro: "Read-only", master: "Interactive", lifetime: "Interactive" }
    ]
  },
  {
    title: "Risk Safeguards & Calculation",
    features: [
      { name: "Automated SL & TP Levels", free: "Locked/Blurred", pro: "Yes", master: "Yes", lifetime: "Yes" },
      { name: "Risk Ratio Presets", free: "No", pro: "Conservative Only", master: "Custom Presets", lifetime: "Custom Presets" },
      { name: "P&L Calculator integration", free: "No", pro: "Yes (30d)", master: "Yes (Full History)", lifetime: "Yes (Full History)" }
    ]
  },
  {
    title: "Alerts & Automation",
    features: [
      { name: "Web Dashboard Updates", free: "Real-time", pro: "Real-time", master: "Real-time", lifetime: "Real-time" },
      { name: "Telegram Paired Alerts", free: "No", pro: "1 Group/DM", master: "Unlimited chats", lifetime: "Unlimited chats" },
      { name: "API Webhook Output", free: "No", pro: "No", master: "Yes (Cornix/3Commas)", lifetime: "Yes (Cornix/3Commas)" },
      { name: "Discord Webhook Integration", free: "No", pro: "No", master: "Yes", lifetime: "Yes" }
    ]
  },
  {
    title: "Support & Extras",
    features: [
      { name: "Email Support Response", free: "48 hours", pro: "24 hours", master: "Priority (12h)", lifetime: "Priority (12h)" },
      { name: "Lifetime Member Badge", free: "No", pro: "No", master: "Founding Tag", lifetime: "GrandMaster Tag" },
      { name: "Zoom Onboarding Call", free: "No", pro: "No", master: "No", lifetime: "30-min Private Call" }
    ]
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
    <div className="relative min-h-screen bg-white text-black selection:bg-brand-orange selection:text-white overflow-hidden animate-fade-in">
      
      {/* HEADER / NAVIGATION BAR (SWISS STYLE) */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          
          <div className="flex items-center px-6 h-16 border-r border-black relative">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-sans text-black">
                Sanddock
              </span>
            </a>
            <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

          <nav className="hidden md:flex items-center flex-1 h-16 text-xs font-bold uppercase tracking-wider text-black">
            <a href="/#how-it-works" className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">How It Works</a>
            <a href="/#explainability" className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">Platform Features</a>
            <a href="/#track-record" className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">Track Record</a>
            <a href="/pricing" className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors text-brand-orange bg-zinc-50">Pricing</a>
            <a href="/contact" className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">Contact</a>
            {user ? (
              <a href="/terminal" className="px-6 h-full flex items-center border-r border-black text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">Terminal</a>
            ) : (
              <a href="/login" className="px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors">Login</a>
            )}
          </nav>

          <div className="flex items-center h-16 border-l border-black relative">
            {user ? (
              <a 
                href="/terminal"
                className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all flex items-center"
              >
                Terminal &rarr;
              </a>
            ) : (
              <a 
                href="/signup"
                className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all flex items-center"
              >
                Start Free &rarr;
              </a>
            )}
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

        </div>
      </header>

      {/* PRICING TITLE SECTION */}
      <section className="pt-16 pb-10 max-w-7xl mx-auto px-6 border-b border-black text-left animate-slide-up">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange block mb-2">
          Transparent Cost
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none mb-4">
          Simple pricing. No surprises.
        </h1>
        <p className="text-text-secondary text-xs max-w-xl leading-relaxed">
          Start free on Bitcoin. Upgrade when the signals prove themselves.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center justify-start gap-3 pt-6">
          <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${!isYearly ? "text-black" : "text-zinc-400"}`}>Monthly billing</span>
          <button 
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-10 h-5 bg-zinc-200 border border-black rounded-none transition-colors focus:outline-none"
            aria-label="Toggle Billing Frequency"
          >
            <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-black rounded-none transition-transform duration-200 ${isYearly ? "translate-x-5" : ""}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isYearly ? "text-black" : "text-zinc-400"}`}>Yearly billing</span>
            <span className="text-[9px] font-bold text-white bg-brand-orange px-2 py-0.5 rounded-none uppercase">
              Save 38%
            </span>
          </div>
        </div>
      </section>

      {/* SUBSCRIPTION CARDS GRID */}
      <section className="py-12 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* Free Card */}
          <div className="bg-[#f8f9fa] border border-black rounded-none p-6 flex flex-col justify-between space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" id="plan-free">
            <div className="space-y-3 text-left">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Free Plan</h3>
              <div className="space-y-0.5">
                <span className="text-3xl font-extrabold font-mono text-black">$0</span>
                <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wide">forever</span>
              </div>
              <p className="text-text-secondary text-xs leading-relaxed">Perfect for beginners learning Heikin Ashi trade confluences.</p>
              
              <ul className="space-y-2 pt-4 border-t border-black/10 text-[10px] text-zinc-700 font-bold uppercase tracking-wider">
                {planFeatures.free.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-brand-orange font-mono">&bull;</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {user ? (
              <a 
                href="/terminal"
                className="w-full py-2.5 bg-black hover:bg-brand-orange text-white font-bold text-[10px] uppercase tracking-widest text-center transition-all rounded-none block border border-black"
              >
                Go to Terminal &rarr;
              </a>
            ) : (
              <button 
                onClick={() => handleOpenModal("Get Free Signals", "Create your free membership immediately to receive verified BTC/USDT technical signal rationales.")}
                className="w-full py-2.5 bg-white hover:bg-black text-black hover:text-white font-bold text-[10px] uppercase tracking-widest transition-all rounded-none border border-black"
              >
                Get Free Signals &rarr;
              </button>
            )}
          </div>

          {/* Pro Card (Highlighted) */}
          <div className="bg-white border-2 border-brand-orange rounded-none p-6 flex flex-col justify-between space-y-6 shadow-[6px_6px_0px_0px_rgba(61,90,254,1)] relative" id="plan-pro">
            <span className="absolute top-0 right-6 -translate-y-1/2 bg-brand-orange text-white font-bold text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-none">
              Most Popular
            </span>
            
            <div className="space-y-3 text-left">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">Pro Plan</h3>
              <div className="space-y-0.5">
                <span className="text-3xl font-extrabold font-mono text-black">
                  {isYearly ? "$19" : "$29"}
                </span>
                <span className="text-black text-xs font-bold uppercase">/mo</span>
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wide">
                  {isYearly ? "Billed annually ($228/yr)" : "Billed monthly"}
                </span>
              </div>
              <p className="text-text-secondary text-xs leading-relaxed">Ideal for active retail traders seeking portfolio diversification.</p>
              
              <ul className="space-y-2 pt-4 border-t border-black/10 text-[10px] text-zinc-700 font-bold uppercase tracking-wider">
                {planFeatures.pro.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-brand-orange font-mono">&bull;</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => handleOpenModal("Checkout Pro Plan", `Checkout the Sanddock Pro plan at ${isYearly ? "$19/mo (billed annually at $228)" : "$29/mo (billed monthly)"}. Instant setup.`)}
              className="w-full py-2.5 bg-brand-orange hover:bg-black text-white font-bold text-[10px] uppercase tracking-widest transition-all rounded-none border border-brand-orange"
            >
              Upgrade to Pro &rarr;
            </button>
          </div>

          {/* Master Card */}
          <div className="bg-[#f8f9fa] border border-black rounded-none p-6 flex flex-col justify-between space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" id="plan-master">
            <div className="space-y-3 text-left">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Master Plan</h3>
              <div className="space-y-0.5">
                <span className="text-3xl font-extrabold font-mono text-black">
                  {isYearly ? "$49" : "$79"}
                </span>
                <span className="text-black text-xs font-bold uppercase">/mo</span>
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wide">
                  {isYearly ? "Billed annually ($588/yr)" : "Billed monthly"}
                </span>
              </div>
              <p className="text-text-secondary text-xs leading-relaxed">Built for power users requiring API webhook automation.</p>
              
              <ul className="space-y-2 pt-4 border-t border-black/10 text-[10px] text-zinc-700 font-bold uppercase tracking-wider">
                {planFeatures.master.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-brand-orange font-mono">&bull;</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => handleOpenModal("Checkout Master Plan", `Checkout the Sanddock Master plan at ${isYearly ? "$49/mo (billed annually at $588)" : "$79/mo (billed monthly)"}.`)}
              className="w-full py-2.5 bg-black hover:bg-brand-orange text-white font-bold text-[10px] uppercase tracking-widest transition-all rounded-none border border-black"
            >
              Get Master Now &rarr;
            </button>
          </div>

        </div>

        {/* GRANDMASTER LIFETIME ACCESS CARD */}
        <div className="relative rounded-none border border-black bg-[#f4f6fa] p-8 mt-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" id="plan-lifetime">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-brand-orange/15 to-transparent pointer-events-none" />
          
          <div className="space-y-3 text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-brand-orange text-white text-[8px] font-bold uppercase tracking-wider font-mono">
              ⚡ Founding Member Offer — Save Big
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight text-black font-sans leading-none">
              GrandMaster Lifetime Access - $799
            </h2>
            <p className="text-text-secondary text-xs leading-relaxed">
              Get permanent Master-level access to Sanddock forever with a single one-time payment. Less than 11 months of Master subscription value.
            </p>
            <div className="text-brand-orange font-mono text-[10px] font-bold uppercase tracking-wide">
              🔥 Only 188 spots left at this price (312 of 500 spots claimed)
            </div>
          </div>

          <button 
            onClick={() => handleOpenModal("GrandMaster Lifetime Deal", "Purchase the founding lifetime membership for $799 one-time. Includes permanent Master-level features and a 30-day money-back guarantee.")}
            className="w-full lg:w-auto bg-black hover:bg-brand-orange text-white font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 transition-all rounded-none border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] flex-shrink-0 text-center cursor-pointer"
          >
            Secure Spot Now &rarr;
          </button>
        </div>
      </section>

      {/* OUTCOME / SIGNAL MOCKUP SECTION */}
      <section className="py-12 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 text-left space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">
              Verified Outcomes
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
              Every alert has a verified entry & exit.
            </h2>
            <p className="text-text-secondary text-xs leading-relaxed">
              We do not post curated screenshots of hypothetical returns. Our system tracks trades in a public ledger linked with live alerts.
            </p>
            <div className="p-4 bg-zinc-50 border border-black rounded-none space-y-2 text-[10px] font-bold uppercase tracking-wider text-black">
              <div className="flex justify-between">
                <span>Signal Accuracy</span>
                <span className="text-[#00b050]">78.4%</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Return / Trade</span>
                <span className="text-[#00b050]">+4.92%</span>
              </div>
              <div className="flex justify-between font-extrabold border-t border-black/10 pt-2">
                <span>Monthly Net Confluence</span>
                <span>+48.1% (10x Leverage)</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 w-full">
            <div className="bg-[#080d1a] border border-black rounded-none p-5 text-white relative overflow-hidden text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
                  <span className="font-mono text-[9px] text-[#00e676] font-bold tracking-widest uppercase">REAL-TIME SIGNAL OUTCOME</span>
                </div>
                <span className="font-mono text-[8px] text-text-muted">PAIRED TELEGRAM OUTFLOW</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="block text-[8px] text-text-muted font-mono">INSTRUMENT</span>
                    <span className="text-base font-bold font-mono tracking-tight text-white">BTC/USDT</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-text-muted font-mono">SIGNAL TYPE</span>
                    <span className="inline-block bg-[#00e676]/15 text-[#00e676] font-mono text-[9px] font-bold px-2 py-0.5 rounded-none border border-[#00e676]/20">
                      BUY ALERT
                    </span>
                  </div>
                  <div className="bg-black/40 p-3 border border-white/5 space-y-1.5 font-mono text-[9px]">
                    <div className="flex justify-between"><span className="text-text-muted">ENTRY:</span><span className="text-white font-bold">$67,432.00</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">EXIT:</span><span className="text-[#00e676] font-bold">$70,812.00</span></div>
                    <div className="flex justify-between border-t border-white/5 pt-1.5"><span className="text-text-muted">STOP LOSS:</span><span className="text-signal-sell font-bold">$65,800.00</span></div>
                  </div>
                </div>

                <div className="space-y-3 flex flex-col justify-between">
                  <div className="bg-[#00e676]/5 border border-[#00e676]/20 p-3">
                    <span className="block text-[8px] text-text-muted font-mono uppercase">Trade Profit</span>
                    <span className="block text-xl font-bold font-mono text-[#00e676]">+5.01% Net</span>
                    <span className="block text-[8px] text-[#00e676]/80 font-mono mt-0.5">UNLEVERAGED SPOT RETURN</span>
                  </div>
                  
                  <div className="bg-[#00e676]/10 border border-[#00e676]/30 p-3">
                    <span className="block text-[8px] text-text-muted font-mono uppercase">10x Leverage Return</span>
                    <span className="block text-xl font-bold font-mono text-[#00e676]">+50.1% Profit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON TABLE */}
      <section className="py-12 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="text-left mb-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange block mb-2">
            Detailed Comparison
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Compare all plan capabilities.
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-left text-xs">
            <thead>
              <tr className="bg-zinc-100 border-b border-black font-sans text-[10px] font-extrabold uppercase tracking-wider text-black">
                <th className="p-3 border-r border-black">Core Features</th>
                <th className="p-3 border-r border-black text-center w-24">Free</th>
                <th className="p-3 border-r border-black text-center w-24">Pro</th>
                <th className="p-3 border-r border-black text-center w-24 font-bold text-brand-orange">Master</th>
                <th className="p-3 text-center w-24">Lifetime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black font-sans">
              {featureTableGroups.map((group, groupIdx) => (
                <React.Fragment key={groupIdx}>
                  <tr className="bg-zinc-50 font-bold border-t border-b border-black text-[9px] uppercase tracking-wider text-black">
                    <td colSpan={5} className="p-2.5 pl-3">{group.title}</td>
                  </tr>
                  {group.features.map((feat, featureIdx) => (
                    <tr key={featureIdx} className="hover:bg-zinc-50/50 transition-colors text-[11px] font-medium text-zinc-700">
                      <td className="p-3 border-r border-black font-bold uppercase text-black tracking-wide">{feat.name}</td>
                      <td className="p-3 border-r border-black text-center">{feat.free}</td>
                      <td className="p-3 border-r border-black text-center font-semibold text-zinc-900">{feat.pro}</td>
                      <td className="p-3 border-r border-black text-center font-bold text-black">{feat.master}</td>
                      <td className="p-3 text-center font-bold text-brand-orange">{feat.lifetime}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-12 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="text-left mb-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange block mb-2">
            Social Proof
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Loved by active crypto traders.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingTestimonials.map((t, idx) => (
            <div key={idx} className="bg-zinc-50 border border-black p-6 rounded-none flex flex-col justify-between text-left space-y-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="space-y-3">
                <span className="text-[8px] font-bold px-2 py-0.5 border border-black bg-white text-black font-mono inline-block">
                  {t.category}
                </span>
                <p className="text-xs text-zinc-700 leading-relaxed font-sans normal-case">
                  {t.text}
                </p>
              </div>
              <div className="border-t border-black/10 pt-3">
                <span className="block font-bold text-[11px] text-black uppercase">{t.author}</span>
                <span className="block text-[9px] text-zinc-500 uppercase font-mono mt-0.5">{t.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-12 max-w-4xl mx-auto px-6 border-b border-black">
        <div className="text-left mb-8 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">
            FAQ
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Everything you need to know
          </h2>
        </div>

        <div className="border-t border-black divide-y divide-black">
          {faqItems.map((item, idx) => {
            const isOpen = !!openFAQ[idx];
            return (
              <div key={idx} className="py-4">
                <button 
                  onClick={() => toggleFAQ(idx)}
                  className="w-full text-left flex items-center justify-between gap-4 font-bold uppercase text-xs md:text-sm text-black hover:text-brand-orange transition-colors"
                >
                  <span className="font-sans">{item.q}</span>
                  <span className="text-base font-bold font-mono">
                    {isOpen ? "\u2212" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="text-zinc-600 text-xs leading-relaxed pt-2.5 pr-8 transition-all normal-case font-normal font-sans">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="py-12 max-w-7xl mx-auto px-6">
        <div className="relative rounded-none border border-black bg-[#f4f6fa] p-8 text-left overflow-hidden">
          <div className="max-w-xl space-y-4 relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
              Not sure? Start free — no credit card required.
            </h2>
            <p className="text-text-secondary text-xs leading-relaxed">
              Join traders who get AI-powered Buy and Sell signals with a verified public track record. Start free on Bitcoin.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {user ? (
                <a 
                  href="/terminal"
                  className="bg-black hover:bg-brand-orange font-bold text-white text-[10px] uppercase tracking-widest px-6 py-3 transition-colors rounded-none inline-block text-center border border-black"
                >
                  Go to Terminal &rarr;
                </a>
              ) : (
                <a 
                  href="/signup"
                  className="bg-black hover:bg-brand-orange font-bold text-white text-[10px] uppercase tracking-widest px-6 py-3 transition-colors rounded-none inline-block text-center border border-black"
                >
                  Get Free Signals &rarr;
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white pt-12 pb-6 text-[10px] border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          &copy; {new Date().getFullYear()} Sanddock. Dynamic Live Data. Not financial advice. All signals are for educational purposes.
        </div>
      </footer>

      {/* POPUP MODAL GATE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-md bg-white border border-black rounded-none p-6 shadow-2xl space-y-4 z-10 text-left">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-black hover:text-brand-orange text-lg font-bold font-mono cursor-pointer"
            >
              &times;
            </button>
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-brand-orange uppercase tracking-wider font-mono">SANDDOCK GATEWAY</span>
              <h3 className="text-lg font-extrabold uppercase tracking-tight text-black font-sans">{modalContent.title}</h3>
              <p className="text-zinc-600 text-xs leading-relaxed normal-case font-sans">
                {modalContent.body}
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-[8px] font-bold text-zinc-700 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                className="w-full bg-[#f4f6fa] border border-black rounded-none px-3 py-2 text-xs text-black focus:outline-none focus:border-brand-orange font-mono"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 bg-black hover:bg-brand-orange text-white font-bold text-[10px] uppercase tracking-widest transition-colors rounded-none border border-black"
              >
                Proceed &rarr;
              </button>
              <button 
                onClick={() => setModalOpen(false)}
                className="px-3 py-2.5 border border-black bg-white hover:bg-zinc-100 text-[10px] font-bold text-black uppercase tracking-widest transition-colors rounded-none"
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
