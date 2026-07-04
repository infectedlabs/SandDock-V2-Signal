"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

// Tickers mock data
const tickerStrip1 = [
  { coin: "BTC", type: "BUY", price: "$67,432.00", confidence: 87, time: "14m ago", free: true },
  { coin: "ETH", type: "SELL", price: "$3,210.00", confidence: 72, time: "2h ago", free: false },
  { coin: "SOL", type: "BUY", price: "$142.50", confidence: 91, time: "5h ago", free: false },
  { coin: "BNB", type: "SELL", price: "$598.30", confidence: 68, time: "1d ago", free: false },
];

const tickerStrip2 = [
  { coin: "ADA", type: "BUY", price: "$0.612", confidence: 79, time: "3h ago", free: false },
  { coin: "AVAX", type: "SELL", price: "$38.20", confidence: 83, time: "6h ago", free: false },
  { coin: "XRP", type: "BUY", price: "$0.541", confidence: 74, time: "8h ago", free: false },
  { coin: "BTC", type: "BUY", price: "$66,950.00", confidence: 81, time: "12h ago", free: true },
];

// Closed signals for public track record preview
const closedSignals = [
  { date: "Nov 1, 14:23", pair: "BTC/USDT", type: "BUY", entry: "$67,432", exit: "$70,812", result: "+5.0%", win: true },
  { date: "Oct 31, 09:41", pair: "ETH/USDT", type: "SELL", entry: "$3,210", exit: "$3,018", result: "+6.0%", win: true },
  { date: "Oct 30, 22:17", pair: "BTC/USDT", type: "BUY", entry: "$66,100", exit: "$65,200", result: "-1.4%", win: false },
  { date: "Oct 30, 11:05", pair: "SOL/USDT", type: "BUY", entry: "$142.50", exit: "$149.30", result: "+4.8%", win: true },
  { date: "Oct 29, 16:30", pair: "BNB/USDT", type: "SELL", entry: "$598.00", exit: "$612.00", result: "-2.3%", win: false },
];

// Mixed weight segment styled testimonials (Swiss Editorial Style)
const testimonials = [
  {
    category: "TECH INNOVATIONS",
    segments: [
      { text: '"Been using Sanddock for 3 months. The ', bold: false },
      { text: 'AI explanation on every signal', bold: true },
      { text: ' is a game-changer - I actually understand why I\'m entering a trade now. First signal tool that doesn\'t make me feel confused."', bold: false }
    ],
    author: "Alex Rivera",
    role: "Senior Software Engineer"
  },
  {
    category: "HONEST LEDGER",
    segments: [
      { text: '"The ', bold: false },
      { text: 'public track record', bold: true },
      { text: ' is what sold me. They show the losses. Every other signal group hides that. ', bold: false },
      { text: 'Instant trust', bold: true },
      { text: ' from day one."', bold: false }
    ],
    author: "Nico G.",
    role: "Asset Allocator"
  },
  {
    category: "VOLATILITY PLAY",
    segments: [
      { text: '"BTC signal hit +5.2% last night. Got the Telegram alert while I was asleep, set my ', bold: false },
      { text: 'entry limit', bold: true },
      { text: ' and woke up in ', bold: false },
      { text: 'profit', bold: true },
      { text: '. Absolutely seamless execution."', bold: false }
    ],
    author: "Sarah Jenkins",
    role: "Retail Crypto Trader"
  },
  {
    category: "SIGNAL QUALITY",
    segments: [
      { text: '"Switched from a VIP signal group to Sanddock. No more spam. One clean alert with an ', bold: false },
      { text: 'explanation', bold: true },
      { text: '. The Pro plan is ', bold: false },
      { text: 'worth every penny', bold: true },
      { text: '."', bold: false }
    ],
    author: "Marcus Aurelius",
    role: "Swing Trader"
  },
  {
    category: "TRANSPARENCY FIRST",
    segments: [
      { text: '"Highly appreciate the lack of curated screenshots. Sanddock lists all wins and ', bold: false },
      { text: 'losses transparently', bold: true },
      { text: '. Clean interface and ', bold: false },
      { text: 'super fast load times', bold: true },
      { text: '."', bold: false }
    ],
    author: "Deep Value Crypto",
    role: "DeFi Researcher"
  },
  {
    category: "NOISE REDUCTION",
    segments: [
      { text: '"Heikin Ashi ', bold: false },
      { text: 'filters out so much market noise', bold: true },
      { text: '. I\'ve taken three swing trades this week and the stops were placed exactly where ', bold: false },
      { text: 'structure required', bold: true },
      { text: '. Brilliant UX."', bold: false }
    ],
    author: "Elena Rostova",
    role: "Portfolio Manager"
  }
];

// FAQ items
const faqItems = [
  {
    q: "What is Sanddock?",
    a: "Sanddock is an AI-powered crypto trading signal tool that monitors Bitcoin and 50+ other cryptocurrencies in real time. Using a Heikin Ashi swing detection engine and AI analysis, it fires Buy and Sell signals to your web dashboard and Telegram - with a plain-English explanation, confidence score, entry price, stop-loss, and take-profit on every alert.",
  },
  {
    q: "Is the free plan really free?",
    a: "Yes, completely. The free plan gives you real, live AI signals on Bitcoin (BTC/USDT) forever. No credit card required, no time limit. Telegram alerts, additional coins, and advanced analytics require a paid plan.",
  },
  {
    q: "What is a Heikin Ashi signal?",
    a: "Heikin Ashi is a Japanese candlestick technique that reduces price noise by averaging candle data. This makes swing highs and lows much easier to identify accurately than on raw price charts. Our signal engine detects when a coin hits a verified swing top (Sell) or bottom (Buy) on Heikin Ashi candles, then runs it through an AI confidence model before any alert fires.",
  },
  {
    q: "How accurate are the signals?",
    a: "Our current verified win rate is 67.3% across 4,218+ signals - you can verify this yourself on our public Track Record page. Every signal, win and loss, is timestamped and public. We never delete signals. We never show screenshots. Just the data.",
  },
  {
    q: "Can I trust these signals enough to trade real money?",
    a: "Sanddock signals are educational tools, not financial advice. They are based on technical analysis and historical patterns, which do not guarantee future results. Always use risk management and never risk more than you can afford to lose. Most users treat signals as one input alongside their own analysis.",
  },
  {
    q: "How do I get signals on Telegram?",
    a: "After signing up, go to Settings → Telegram and follow the 3-step pairing wizard. You'll connect your account to the Sanddock bot in under 2 minutes. Telegram alerts require a Pro or Master plan.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel in one click from account settings. No cancellation fees. No 'email us to cancel' friction. Your access continues until the end of your billing period.",
  },
  {
    q: "Does Sanddock place trades for me?",
    a: "No. Sanddock is a signal tool - it alerts you when and where to consider entering or exiting. It does not connect to your exchange or execute trades. If you want auto-execution, you can connect our webhook output (Master plan) to tools like Cornix or 3Commas.",
  },
  {
    q: "What is the Lifetime plan?",
    a: "A one-time payment of $999 that gives you Master-level access to Sanddock forever, including all current and future features without compromise. Available only during the launch window - limited to 500 GrandMaster members.",
  },
];

// Interactive Chart mock data
const chartCandles = [
  { time: "09:00", open: 66400, high: 66700, low: 66300, close: 66600, color: "green", signal: null },
  { time: "09:15", open: 66600, high: 67100, low: 66500, close: 66900, color: "green", signal: null },
  { time: "09:30", open: 66900, high: 67000, low: 66100, close: 66250, color: "red", signal: null },
  { time: "09:45", open: 66250, high: 66300, low: 65800, close: 65900, color: "red", signal: null },
  { time: "10:00", open: 65900, high: 66000, low: 65500, close: 65700, color: "red", signal: { type: "BUY", price: "$65,700", confidence: 87, sl: "$64,200", tp: "$68,500", rationale: "HA candle low confirms swing bottom at major support level. Buy volume spike provides confluence. alternating swing structure confirmed." } },
  { time: "10:15", open: 65700, high: 66400, low: 65650, close: 66300, color: "green", signal: null },
  { time: "10:30", open: 66300, high: 67200, low: 66200, close: 67050, color: "green", signal: null },
  { time: "10:45", open: 67050, high: 68100, low: 67000, close: 67900, color: "green", signal: null },
  { time: "11:00", open: 67900, high: 68400, low: 67800, close: 68250, color: "green", signal: { type: "SELL", price: "$68,250", confidence: 74, sl: "$69,500", tp: "$65,500", rationale: "HA top wick signals rejection at local resistance bounds. Momentum indicators overbought on the 15m timeframe. Swing top established." } },
  { time: "11:15", open: 68250, high: 68300, low: 67500, close: 67600, color: "red", signal: null },
  { time: "11:30", open: 67600, pattern: "11:30", high: 67700, low: 67000, close: 67200, color: "red", signal: null },
];

export default function Homepage() {
  const { user } = useAuth();
  
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.05 }
    );
    const elements = document.querySelectorAll(".reveal-on-scroll, .reveal-left, .reveal-right, .reveal-scale");
    elements.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", body: "" });
  
  // Pricing state (yearly = true, monthly = false)
  const [isYearly, setIsYearly] = useState(true);

  // FAQ accordion state
  const [openFAQ, setOpenFAQ] = useState({});

  // Active chart signal state
  const [activeSignal, setActiveSignal] = useState({
    type: "BUY",
    coin: "BTC/USDT",
    timeframe: "15m HA",
    price: "$67,432.00",
    confidence: 87,
    sl: "$65,800.00",
    tp: "$70,850.00",
    rationale: "BTC's Heikin Ashi low at $67,432 is the lowest point in the last 10 bars, confirming a swing bottom. Volume is 23% above the 20-bar average, adding confluence. The previous swing top was committed 3 bars ago, establishing the alternating structure.",
    time: "10:00",
  });

  // Accordion features state for Section 5
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  // Testimonials slider state
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);

  // Line chart coordinates mapping
  const linePoints = chartCandles.map((c, idx) => {
    const x = 20 + idx * 30; // spaced across 300px (x=20 to x=320)
    const y = 200 * (1 - (c.close - 65500) / 3000) + 20; // y=20 to y=220
    return { ...c, x, y };
  });
  const pathD = "M " + linePoints.map(p => `${p.x} ${p.y}`).join(" L ");
  const areaD = `${pathD} L ${linePoints[linePoints.length - 1].x} 240 L ${linePoints[0].x} 240 Z`;

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

  const handleChartCandleClick = (candle) => {
    if (candle.signal) {
      setActiveSignal({
        type: candle.signal.type,
        coin: "BTC/USDT",
        timeframe: "15m HA",
        price: candle.signal.price,
        confidence: candle.signal.confidence,
        sl: candle.signal.sl,
        tp: candle.signal.tp,
        rationale: candle.signal.rationale,
        time: "Fired at " + candle.time,
      });
    }
  };

  const nextTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev + 1) % (testimonials.length - 1));
  };

  const featureAccordions = [
    {
      title: "AI Confidence Scoring",
      desc: "Every signal fires after analyzing volume confluence, trend alignment indices, and historical swing rates. Rejects false setups during off-peak market volatility.",
      signal: {
        type: "BUY",
        price: "$65,700",
        confidence: 87,
        sl: "$64,200",
        tp: "$68,500",
        rationale: "AI Confidence Scoring evaluates underlying order flows. Swing low confirmed with 87% confidence rating based on volume confirms."
      }
    },
    {
      title: "Stop Loss & Take Profit",
      desc: "Calculates precise hazard caps and target exits automatically. Sets Conservative, Balanced, or Aggressive ratios based on your selected risk settings.",
      signal: {
        type: "BUY",
        price: "$65,700",
        confidence: 91,
        sl: "$65,100",
        tp: "$66,900",
        rationale: "Calculated Stop-Loss bounds at -1.5% and Take-Profit exits at +3.0% under conservative risk guidelines, protecting portfolio values."
      }
    },
    {
      title: "Heikin Ashi Filter Engine",
      desc: "Smooths candle structures and filters out false breakout traps that trip up traditional candlestick traders. Detects swing tops and bottoms at major levels.",
      signal: {
        type: "SELL",
        price: "$68,250",
        confidence: 74,
        sl: "$69,500",
        tp: "$65,500",
        rationale: "Heikin Ashi trend average candles signal local resistance exhaustion. Swing top established after consecutive red averaged candles."
      }
    },
    {
      title: "Telegram Alert Pairing",
      desc: "Connect @SanddockBot using a pairing code in under 2 minutes. Delivers explainable Buy/Sell signals with stops directly to your phone instantly.",
      signal: {
        type: "BUY",
        price: "$67,432.00",
        confidence: 87,
        sl: "$65,800.00",
        tp: "$70,850.00",
        rationale: "Telegram alerts configured. Received BTC/USDT Buy signal notification with instant pairing verified in account console settings."
      }
    }
  ];

  const handleFeatureAccordionClick = (index) => {
    setActiveFeatureIndex(index);
    const item = featureAccordions[index];
    setActiveSignal({
      type: item.signal.type,
      coin: "BTC/USDT",
      timeframe: "15m HA",
      price: item.signal.price,
      confidence: item.signal.confidence,
      sl: item.signal.sl,
      tp: item.signal.tp,
      rationale: item.signal.rationale,
      time: "Feature Sample",
    });
  };

  return (
    <div className="relative min-h-screen bg-white text-black selection:bg-brand-orange selection:text-white overflow-hidden">
      
      {/* HEADER / NAVIGATION BAR (SWISS STYLE) */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          
          {/* Logo container block with right border */}
          <div className="flex items-center px-6 h-16 border-r border-black relative">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-sans text-black">
                Sanddock
              </span>
            </a>
            {/* Diamond point marker */}
            <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

          {/* Links grid with right borders */}
          <nav className="hidden md:flex items-center flex-1 h-16 text-xs font-bold uppercase tracking-wider text-black">
            <a href="#how-it-works" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">How It Works</a>
            <a href="#explainability" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Platform Features</a>
            <a href="#track-record" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Track Record</a>
            <a href="/pricing" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Pricing</a>
            <a href="/contact" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Contact</a>
            <a href="#faq" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">FAQ</a>
            {user ? (
              <a href="/terminal" className="px-6 h-full flex items-center border-r border-black text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">Terminal</a>
            ) : (
              <a href="/login" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Login</a>
            )}
          </nav>

          {/* Action button container on right with left border */}
          <div className="flex items-center h-16 border-l border-black relative">
            {user ? (
              <a 
                href="/terminal"
                className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center"
              >
                Terminal &rarr;
              </a>
            ) : (
              <a 
                href="/signup"
                className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center"
              >
                Start Free &rarr;
              </a>
            )}
            {/* Diamond point marker */}
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

        </div>
      </header>

      {/* CURVED DECORATIVE SWISS LINE (Starts at logo vertical line position) with Parallax */}
      <div 
        className="absolute top-16 left-[180px] w-32 h-16 pointer-events-none hidden lg:block z-20"
        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
      >
        <svg width="128" height="64" viewBox="0 0 128 64" fill="none" className="stroke-black" strokeWidth="1.5">
          <path d="M0 0V24C0 32.8366 7.16344 40 16 40H96" strokeLinecap="round" />
          <circle cx="96" cy="40" r="3" className="fill-black" />
        </svg>
      </div>

      {/* Floating Retro Parallax Elements */}
      <div 
        className="absolute top-48 right-12 w-8 h-8 border border-black rotate-45 pointer-events-none hidden lg:flex items-center justify-center text-xs font-bold text-black select-none z-10"
        style={{ transform: `translateY(${scrollY * -0.12}px) rotate(45deg)` }}
      >
        SD
      </div>
      <div 
        className="absolute top-[600px] left-10 w-6 h-6 border-t border-l border-black pointer-events-none hidden lg:block z-10"
        style={{ transform: `translateY(${scrollY * 0.08}px)` }}
      />
      <div 
        className="absolute top-[800px] right-24 w-12 h-12 pointer-events-none hidden lg:block z-10 opacity-20"
        style={{ transform: `translateY(${scrollY * -0.15}px)` }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="stroke-black">
          <path d="M0 8H48M0 24H48M0 40H48M8 0V48M24 0V48M40 0V48" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* SECTION 1 - HERO SECTION */}
      <section className="relative pt-16 pb-20 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Huge typography & description & CTAs */}
          <div className="lg:col-span-7 space-y-10 text-left">
            <div className="space-y-4">
              {/* Row 1 */}
              <div className="flex flex-wrap items-center text-[40px] sm:text-[54px] md:text-[72px] font-extrabold uppercase tracking-tighter leading-none font-sans text-black">
                <span>AI Signals,</span>
              </div>

              {/* Row 2 */}
              <div className="flex flex-wrap items-center text-[40px] sm:text-[54px] md:text-[72px] font-extrabold uppercase tracking-tighter leading-none font-sans text-black">
                <span>Honest</span>
                <span className="text-brand-orange text-4xl md:text-6xl px-3 font-light">&lowast;</span>
                <span>Track</span>
              </div>

              {/* Row 3 */}
              <div className="text-[40px] sm:text-[54px] md:text-[72px] font-extrabold uppercase tracking-tighter leading-none font-sans text-black">
                Record
              </div>
            </div>

            {/* Description and copy */}
            <p className="text-base md:text-lg text-text-secondary leading-relaxed max-w-md">
              Real-time Buy and Sell signals powered by AI. Every signal comes with a reason. Start free on Bitcoin.
            </p>

            {/* Hero CTAs Row */}
            <div className="flex flex-wrap gap-4 pt-2">
              {user ? (
                <a 
                  href="/terminal"
                  className="bg-black hover:bg-brand-orange font-bold text-white text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-none inline-block text-center"
                >
                  Go to Terminal &rarr;
                </a>
              ) : (
                <a 
                  href="/signup"
                  className="bg-black hover:bg-brand-orange font-bold text-white text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-none inline-block text-center"
                >
                  Get Free Signals &rarr;
                </a>
              )}
              <a 
                href="#track-record" 
                className="border border-black font-bold text-black text-xs uppercase tracking-widest px-8 py-4 hover:bg-bg-secondary transition-colors rounded-none bg-white inline-block text-center"
              >
                See Track Record
              </a>
            </div>
          </div>

          {/* Right Column: Live Buy/Sell Signal & Outcome Mockup */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-[#080d1a] border border-black rounded-none p-6 shadow-xl text-white relative overflow-hidden">
              {/* Outer decorative line */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-orange/20 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-pulse" />
                  <span className="font-mono text-[10px] text-[#00e676] font-bold tracking-widest uppercase">LIVE ALERT OUTCOME</span>
                </div>
                <span className="font-mono text-[9px] text-text-muted">PAIRED VIA TELEGRAM</span>
              </div>

              {/* Signal details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] text-text-muted font-mono">INSTRUMENT</span>
                    <span className="text-lg font-bold font-mono tracking-tight text-white">BTC/USDT</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] text-text-muted font-mono">SIGNAL TYPE</span>
                    <span className="inline-block bg-[#00e676]/15 text-[#00e676] font-mono text-[10px] font-bold px-2 py-0.5 rounded-none border border-[#00e676]/20">
                      BUY ALERT
                    </span>
                  </div>
                </div>

                {/* Outcome Stats Box */}
                <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 border border-white/5 rounded-none">
                  <div>
                    <span className="block text-[8px] text-text-muted font-mono">ENTRY PRICE</span>
                    <span className="text-sm font-bold font-mono text-white">$67,432.00</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-text-muted font-mono">EXIT PRICE (TP HIT)</span>
                    <span className="text-sm font-bold font-mono text-[#00e676]">$70,812.00</span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="block text-[8px] text-text-muted font-mono">STOP LOSS</span>
                    <span className="text-xs font-mono text-signal-sell">$65,800.00</span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="block text-[8px] text-text-muted font-mono">TAKE PROFIT Target</span>
                    <span className="text-xs font-mono text-[#00e676]">$70,850.00</span>
                  </div>
                </div>

                {/* Outcome block */}
                <div className="flex items-center justify-between bg-[#00e676]/5 border border-[#00e676]/20 p-3 rounded-none">
                  <div>
                    <span className="block text-[8px] text-text-muted font-mono">SANDDOCK OUTCOME</span>
                    <span className="text-base font-bold font-mono text-[#00e676]">+5.01% Net Return</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] text-text-muted font-mono">LEVERAGE (10X)</span>
                    <span className="text-base font-bold font-mono text-[#00e676]">+50.1% Profit</span>
                  </div>
                </div>

                {/* AI verification block */}
                <div className="flex items-center gap-2 pt-2 text-[9px] text-[#00e676] font-semibold tracking-wider font-mono">
                  <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                  <span>LEDGER VERIFIED TRANSACTION #SD-4218</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Separator and Bottom Meta row */}
        <div className="border-t border-black mt-16 pt-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-bold uppercase tracking-wider text-black">
          {/* Contact Us bubble style */}
          <div 
            onClick={() => handleOpenModal("Contact Support", "Drop us an email at support@sanddock.com. Response within 12-48 hours.")}
            className="flex items-center gap-2 cursor-pointer hover:underline"
          >
            <svg className="w-4 h-4 fill-current inline-block" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
            </svg>
            <span className="underline decoration-black decoration-2">Contact us</span>
          </div>

          {/* Exchange lists */}
          <div className="flex items-center gap-6 opacity-60 text-[10px]">
            <span>Binance</span>
            <span>·</span>
            <span>Bybit</span>
            <span>·</span>
            <span>OKX</span>
            <span>·</span>
            <span>KuCoin</span>
          </div>

          {/* Scroll Down action */}
          <a href="#how-it-works" className="flex items-center gap-1.5 hover:text-brand-orange transition-colors">
            <span className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px]">&darr;</span>
            <span>Scroll down</span>
          </a>
        </div>
      </section>

      {/* SECTION 2 - LIVE SIGNAL TICKER (Styled to Light Swiss theme) */}
      <section className="border-b border-black bg-[#f8f9fa]/80 py-3 overflow-hidden select-none">
        
        {/* Ticker Row 1 (scrolls left) */}
        <div className="flex gap-8 relative w-full overflow-hidden whitespace-nowrap mb-2">
          <div className="animate-scroll-left flex gap-8">
            {tickerStrip1.concat(tickerStrip1).map((item, idx) => (
              <div 
                key={idx} 
                className="inline-flex items-center gap-3 bg-white border border-black rounded-none py-1.5 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-brand-orange transition-colors"
                onClick={() => !item.free ? handleOpenModal(`Unlock ${item.coin} Signals`, `Upgrade to the Pro Plan to view live alerts, automated stop-losses, and take-profit structures for ${item.coin} and 9 other premium altcoins.`) : null}
              >
                <span className={item.type === "BUY" ? "text-signal-buy" : "text-signal-sell"}>
                  {item.type === "BUY" ? "▲" : "▼"} {item.type}
                </span>
                <span className="text-black">{item.coin}</span>
                
                <span className="font-mono text-text-secondary">{item.price}</span>
                <span className="text-text-muted">·</span>
                <span className="text-brand-orange">{item.confidence}%</span>
                <span className="text-text-muted">·</span>
                <span className="text-text-muted font-mono">{item.time}</span>

                {!item.free && (
                  <span className="flex items-center gap-1 text-[9px] bg-brand-orange text-white px-2 py-0.2 rounded-none font-bold uppercase tracking-wider ml-1">
                    PRO
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ticker Row 2 (scrolls right) */}
        <div className="flex gap-8 relative w-full overflow-hidden whitespace-nowrap">
          <div className="animate-scroll-right flex gap-8">
            {tickerStrip2.concat(tickerStrip2).map((item, idx) => (
              <div 
                key={idx} 
                className="inline-flex items-center gap-3 bg-white border border-black rounded-none py-1.5 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-brand-orange transition-colors"
                onClick={() => !item.free ? handleOpenModal(`Unlock ${item.coin} Signals`, `Upgrade to the Pro Plan to view live alerts, automated stop-losses, and take-profit structures for ${item.coin} and 9 other premium altcoins.`) : null}
              >
                <span className={item.type === "BUY" ? "text-signal-buy" : "text-signal-sell"}>
                  {item.type === "BUY" ? "▲" : "▼"} {item.type}
                </span>
                <span className="text-black">{item.coin}</span>

                <span className="font-mono text-text-secondary">{item.price}</span>
                <span className="text-text-muted">·</span>
                <span className="text-brand-orange">{item.confidence}%</span>
                <span className="text-text-muted">·</span>
                <span className="text-text-muted font-mono">{item.time}</span>

                {!item.free && (
                  <span className="flex items-center gap-1 text-[9px] bg-brand-orange text-white px-2 py-0.2 rounded-none font-bold uppercase tracking-wider ml-1">
                    PRO
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* SECTION 3 - WHY SANDDOCK (Outcome-First Comparison) */}
      <section className="py-24 max-w-7xl mx-auto px-6 border-b border-black bg-white reveal-on-scroll">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 items-start">
          <div className="lg:col-span-6 space-y-4 text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
              The Sanddock Difference
            </span>
            <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
              The Outcome-First System
            </h2>
          </div>
          <div className="lg:col-span-6 text-base md:text-lg text-text-secondary leading-relaxed pt-2">
            Traditional signal groups focus on selling features or flashy screenshots. Sanddock is built around one single goal: delivering automated clarity, logical peace of mind, and verified trading outcomes.
          </div>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          {/* Column 1: The Old Way (Anxiety) */}
          <div className="border border-black p-8 bg-zinc-50 flex flex-col justify-between space-y-8">
            <div>
              <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 bg-signal-sell/10 text-signal-sell uppercase tracking-widest font-mono border border-signal-sell/20 mb-6">
                The Traditional Loop
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-8">
                The Anxiety Loop
              </h3>
              
              <ul className="space-y-6 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                <li className="flex items-start gap-3">
                  <span className="text-signal-sell mt-0.5">&#x2715;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Staring at Charts 24/7</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-sans">
                      Spending hours drawing trendlines, missing key entries because you fell asleep or left your computer.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-signal-sell mt-0.5">&#x2715;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Emotional Guesswork</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-sans">
                      Entering trades based on gut feelings or Twitter FOMO, without any mathematical confirmation.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-signal-sell mt-0.5">&#x2715;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Hidden Losses</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-sans">
                      Joining VIP signal channels that delete their bad calls and only post selective screenshots.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-signal-sell mt-0.5">&#x2715;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Uncalculated Risk</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-sans">
                      Trading without clear stop-loss guidelines, risking massive portfolio drawdowns during sudden market drops.
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 2: The Sanddock Way (Clarity) */}
          <div className="border-2 border-black p-8 bg-white flex flex-col justify-between space-y-8 relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 bg-signal-buy/15 text-[#00b050] uppercase tracking-widest font-mono border border-signal-buy/20 mb-6">
                The Sanddock Way
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-8">
                The Clarity System
              </h3>
              
              <ul className="space-y-6 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                <li className="flex items-start gap-3">
                  <span className="text-[#00b050] mt-0.5">&#x2713;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">24/7 Automated Scanning</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-sans">
                      Our engine does the heavy lifting. Clean Buy/Sell signals land in Telegram and your dashboard instantly.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00b050] mt-0.5">&#x2713;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Explainable AI Confidence</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-sans">
                      Every single signal comes with a clear, plain-English rationale so you know exactly why you are entering.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00b050] mt-0.5">&#x2713;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Verifiable Public Ledger</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-sans">
                      Every past signal - win or loss - remains permanently logged on our public, immutable track record.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00b050] mt-0.5">&#x2713;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Automated Risk Safeguards</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-sans">
                      Every signal specifies precise Entry, Stop-Loss, and Take-Profit bounds, mathematically protecting your capital.
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Outcomes bottom grid */}
        <div className="border-t border-black pt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h4 className="text-lg font-bold uppercase text-black font-sans">01 - Time Freedom</h4>
            <p className="text-text-secondary text-base leading-relaxed">
              Spend less than 5 minutes placing trades. Let our automated scanners watch the charts for you day and night.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold uppercase text-black font-sans">02 - Emotional Shield</h4>
            <p className="text-text-secondary text-base leading-relaxed">
              Trade with high-confidence statistical confluence. No more second-guessing, hesitation, or FOMO-induced losses.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold uppercase text-black font-sans">03 - Account Protection</h4>
            <p className="text-text-secondary text-base leading-relaxed">
              Pre-calculated risk limits defend your capital. Never experience catastrophic account liquidations or major drawdowns.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4 - HOW IT WORKS (Image 2 Card Grids Redesign) */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-6 border-b border-black reveal-left">
        <div className="text-left mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
            System Logic
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans">
            How the signal engine works &rarr;
          </h2>
          <p className="text-text-secondary text-base md:text-lg max-w-md">
            No charts to watch. No Pine Script to learn. Sanddock handles the analysis - you handle the decision.
          </p>
        </div>

        {/* 3 cards grid styling based on Image 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="bg-[#f4f6fa] p-8 rounded-none flex flex-col justify-between space-y-12 border border-transparent hover:border-black transition-all">
            <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center">
              {/* Clock Icon SVG */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">01 - Market Scan</h3>
              <p className="text-text-secondary text-base leading-relaxed">
                Sanddock monitors Heikin Ashi candles across all your tracked coins, 24/7. The signal engine detects swing tops and bottoms with precision - filtering out the noise that trips up other tools.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#f4f6fa] p-8 rounded-none flex flex-col justify-between space-y-12 border border-transparent hover:border-black transition-all">
            <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center">
              {/* Briefcase Icon SVG */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">02 - AI Explanation</h3>
              <p className="text-text-secondary text-base leading-relaxed">
                When a Buy or Sell signal fires, the AI generates a plain-English explanation of what it saw, why it's confident, and what to watch for. No black boxes. No &ldquo;just trust us.&rdquo;
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#f4f6fa] p-8 rounded-none flex flex-col justify-between space-y-12 border border-transparent hover:border-black transition-all">
            <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center">
              {/* Folder Icon SVG */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">03 - Phone Alert</h3>
              <p className="text-text-secondary text-base leading-relaxed">
                Your signal lands in Telegram within seconds. Entry price, stop-loss, take-profit, and a confidence score - everything you need to decide in one message.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5 - AI EXPLAINABILITY SHOWCASE (Image 3 Accordion Layout Redesign) */}
      <section id="explainability" className="py-24 max-w-7xl mx-auto px-6 border-b border-black reveal-on-scroll">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Left Side: Accordion Lists based on Image 3 */}
          <div className="lg:col-span-6 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
                Sanddock Platform
              </span>
              <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none mb-12">
                Every signal<br />explained &rarr;
              </h2>

              {/* Accordion list */}
              <div className="border-t border-black divide-y divide-black">
                {featureAccordions.map((feat, idx) => {
                  const isActive = activeFeatureIndex === idx;
                  return (
                    <div key={idx} className="py-5">
                      <button 
                        onClick={() => handleFeatureAccordionClick(idx)}
                        className="w-full text-left flex items-center justify-between gap-4 font-bold uppercase tracking-wide text-lg text-black hover:text-brand-orange transition-colors"
                      >
                        <span className="font-sans">{feat.title}</span>
                        <span className="text-xl font-bold font-mono">
                          {isActive ? "\u2212" : "+"}
                        </span>
                      </button>
                      
                      {isActive && (
                        <p className="text-text-secondary text-base leading-relaxed pt-3 pr-8 transition-all">
                          {feat.desc}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Side: Mockup dashboard/chart aligned with Image 3 */}
          <div className="lg:col-span-6 w-full">
            <div className="bg-[#080d1a] border border-black rounded-none p-6 shadow-xl relative overflow-hidden text-white flex flex-col justify-between min-h-[480px]">
              
              <div>
                {/* Header inside mockup */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 text-xs font-semibold text-text-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="ml-2 font-mono text-white text-[10px] tracking-wider">SANDDOCK ACTIVE TERMINAL</span>
                  </div>
                  <span className="text-[9px] font-mono text-brand-orange bg-brand-orange/15 px-2 py-0.5 rounded-none font-bold">
                    {activeSignal.timeframe}
                  </span>
                </div>

                {/* Grid content inside mockup */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* SVG Line & Bar Chart (7 cols) */}
                  <div className="md:col-span-7 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold font-mono text-white">{activeSignal.coin}</h4>
                        <span className="text-[9px] font-mono text-text-secondary">Swing Filter Line Chart</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-[#00e676] bg-[#00e676]/15 px-2 py-0.5 rounded-none">
                          {activeSignal.price}
                        </span>
                      </div>
                    </div>

                    {/* SVG Line Chart Container (Height increased to h-64) */}
                    <div className="h-64 border border-white/10 rounded-none bg-black/40 relative overflow-hidden">
                      
                      {/* Gradient defs */}
                      <svg className="absolute inset-0 w-0 h-0">
                        <defs>
                          <linearGradient id="area-grad-buy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00e676" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#00e676" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="area-grad-sell" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff1744" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#ff1744" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* SVG elements */}
                      <svg viewBox="0 0 350 250" className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <g opacity="0.08" stroke="#ffffff" strokeWidth="1">
                          <line x1="0" y1="30" x2="350" y2="30" strokeDasharray="3,3" />
                          <line x1="0" y1="90" x2="350" y2="90" strokeDasharray="3,3" />
                          <line x1="0" y1="150" x2="350" y2="150" strokeDasharray="3,3" />
                          <line x1="0" y1="210" x2="350" y2="210" strokeDasharray="3,3" />
                          <line x1="80" y1="0" x2="80" y2="250" strokeDasharray="3,3" />
                          <line x1="160" y1="0" x2="160" y2="250" strokeDasharray="3,3" />
                          <line x1="240" y1="0" x2="240" y2="250" strokeDasharray="3,3" />
                          <line x1="300" y1="0" x2="300" y2="250" strokeDasharray="3,3" />
                        </g>

                        {/* Volume Bars */}
                        <g opacity="0.15">
                          {linePoints.map((p, idx) => {
                            const barHeight = 15 + (idx * 5) % 35;
                            const yVal = 240 - barHeight;
                            return (
                              <rect
                                key={`vol-${idx}`}
                                x={p.x - 3}
                                y={yVal}
                                width="6"
                                height={barHeight}
                                fill={p.color === "green" ? "#00e676" : "#ff1744"}
                              />
                            );
                          })}
                        </g>

                        {/* Area Gradient Fill */}
                        <path
                          d={areaD}
                          fill={activeSignal.type === "BUY" ? "url(#area-grad-buy)" : "url(#area-grad-sell)"}
                          className="transition-all duration-300"
                        />

                        {/* Price Line Path */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={activeSignal.type === "BUY" ? "#00e676" : "#ff1744"}
                          strokeWidth="2.5"
                          className="transition-all duration-300 drop-shadow-[0_0_6px_rgba(0,230,118,0.3)]"
                        />

                        {/* Signal Nodes */}
                        {linePoints.map((p, idx) => {
                          if (!p.signal) return null;
                          const isBuy = p.signal.type === "BUY";
                          return (
                            <g 
                              key={`sig-${idx}`} 
                              className="cursor-pointer"
                              onClick={() => handleChartCandleClick(p)}
                            >
                              <circle cx={p.x} cy={p.y} r="8" fill={isBuy ? "#00e676" : "#ff1744"} opacity="0.3" className="animate-ping" />
                              <circle cx={p.x} cy={p.y} r="5" fill={isBuy ? "#00e676" : "#ff1744"} stroke="#ffffff" strokeWidth="1" />
                              <text 
                                x={p.x} 
                                y={isBuy ? p.y - 12 : p.y + 16} 
                                textAnchor="middle" 
                                fill={isBuy ? "#00e676" : "#ff1744"} 
                                className="text-[8px] font-mono font-bold"
                              >
                                {p.signal.type}
                              </text>
                            </g>
                          );
                        })}

                        {/* Click Targets */}
                        {linePoints.map((p, idx) => (
                          <g 
                            key={`target-${idx}`}
                            className="cursor-pointer group"
                            onClick={() => handleChartCandleClick(p)}
                          >
                            <line 
                              x1={p.x} 
                              y1="10" 
                              x2={p.x} 
                              y2="240" 
                              stroke="transparent" 
                              strokeWidth="20" 
                            />
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="3.5" 
                              fill="#ffffff" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity" 
                            />
                          </g>
                        ))}
                      </svg>

                      {/* Trade Parameters Horizontal Lines */}
                      {/* Take Profit Target Line */}
                      <div className="absolute left-0 right-10 border-t border-dashed border-[#00e676]/40 top-[20%] z-20 pointer-events-none flex items-center justify-between pl-2">
                        <span className="bg-[#080d1a] px-1 text-[7px] text-[#00e676] font-mono tracking-wider font-bold">TP TARGET ({activeSignal.tp})</span>
                      </div>

                      {/* Entry Price Line */}
                      <div className="absolute left-0 right-10 border-t border-dashed border-white/30 top-[50%] z-20 pointer-events-none flex items-center justify-between pl-2">
                        <span className="bg-[#080d1a] px-1 text-[7px] text-white/50 font-mono tracking-wider font-bold">ENTRY PRICE ({activeSignal.price})</span>
                      </div>

                      {/* Stop Loss Target Line */}
                      <div className="absolute left-0 right-10 border-t border-dashed border-signal-sell/40 top-[80%] z-20 pointer-events-none flex items-center justify-between pl-2">
                        <span className="bg-[#080d1a] px-1 text-[7px] text-signal-sell font-mono tracking-wider font-bold">STOP LOSS ({activeSignal.sl})</span>
                      </div>

                      {/* Y-Axis Price Panel (Right aligned) */}
                      <div className="absolute right-0 top-0 bottom-6 w-10 border-l border-white/10 flex flex-col justify-between items-center py-2 text-[7px] text-text-muted font-mono bg-black/20 pointer-events-none">
                        <span>$71k</span>
                        <span>$69k</span>
                        <span>$67k</span>
                        <span>$65k</span>
                      </div>

                      {/* X-Axis Time Panel (Bottom aligned) */}
                      <div className="absolute bottom-0 left-0 right-10 h-6 border-t border-white/10 flex justify-between items-center px-4 text-[7px] text-text-muted font-mono bg-black/20 pointer-events-none">
                        <span>09:30</span>
                        <span>10:15</span>
                        <span>11:00</span>
                        <span>11:30</span>
                      </div>

                    </div>
                  </div>

                  {/* Simulated Signal Details Card (5 cols) */}
                  <div className="md:col-span-5 flex flex-col justify-between h-full">
                    <div className={`border-l-2 rounded-none bg-black/60 p-3 h-full flex flex-col justify-between ${
                      activeSignal.type === "BUY" ? "border-[#00e676]" : "border-signal-sell"
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-none font-mono ${
                            activeSignal.type === "BUY" ? "bg-[#00e676]/15 text-[#00e676]" : "bg-signal-sell/15 text-signal-sell"
                          }`}>
                            {activeSignal.type}
                          </span>
                          <span className="text-[9px] font-mono text-text-muted">{activeSignal.time}</span>
                        </div>

                        <h4 className="text-xs font-bold text-white font-mono">{activeSignal.coin}</h4>

                        <div className="grid grid-cols-3 gap-1 my-2">
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-text-muted font-bold font-mono">ENTRY</span>
                            <span className="text-[8px] font-mono text-white font-bold">{activeSignal.price}</span>
                          </div>
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-text-muted font-bold font-mono">STOP LOSS</span>
                            <span className="text-[8px] font-mono text-signal-sell font-bold">{activeSignal.sl}</span>
                          </div>
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-text-muted font-bold font-mono">TAKE PROFIT</span>
                            <span className="text-[8px] font-mono text-[#00e676] font-bold">{activeSignal.tp}</span>
                          </div>
                        </div>

                        {/* Confidence score */}
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-[7px] font-bold text-text-secondary">
                            <span>CONFIDENCE</span>
                            <span className="text-white">{activeSignal.confidence}%</span>
                          </div>
                          <div className="w-full bg-border-default/40 h-1 rounded-none overflow-hidden">
                            <div 
                              className="h-full bg-brand-orange rounded-none transition-all duration-300" 
                              style={{ width: `${activeSignal.confidence}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[7px] text-text-muted font-bold tracking-wider uppercase mb-1">AI Rationale & Strategy</span>
                        <p className="text-[9px] text-text-secondary leading-relaxed font-sans line-clamp-3">
                          {activeSignal.rationale}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Terminal Log Console */}
              <div className="mt-6 pt-4 border-t border-white/10 font-mono text-[9px] text-zinc-400 space-y-1.5 text-left">
                <div className="flex items-center justify-between text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  <span>System Console Logs</span>
                  <span className="text-[#00e676] animate-pulse">● Live Connection</span>
                </div>
                <div className="space-y-1 bg-black/40 p-2.5 border border-white/5 h-[80px] overflow-y-auto">
                  <div className="text-[#00e676]">&gt; [14:30:00] Initializing Sanddock Core Signal Engine v1.1.2...</div>
                  <div>&gt; [14:30:02] Connecting to Binance WebSockets... Status: 101 Switch Protocols</div>
                  <div>&gt; [14:30:05] Scanners active across 52 trading pairs on 15m/1h/4h HA timeframes.</div>
                  {activeSignal.type === "BUY" ? (
                    <div className="text-[#00e676] font-bold">&gt; [14:30:10] SIGNAL TRIGGERED: BUY {activeSignal.coin} @ {activeSignal.price} (Confidence: {activeSignal.confidence}%)</div>
                  ) : (
                    <div className="text-signal-sell font-bold">&gt; [14:30:10] SIGNAL TRIGGERED: SELL {activeSignal.coin} @ {activeSignal.price} (Confidence: {activeSignal.confidence}%)</div>
                  )}
                  <div className="text-zinc-500">&gt; [14:30:12] Generating AI Rationale description blocks... Done.</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6 - THE SANDDOCK LEDGER */}
      <section className="py-24 max-w-7xl mx-auto px-6 border-b border-black reveal-right">
        <div className="text-left mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
            Coin Unlocks
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Sanddock has got<br />you covered &rarr;
          </h2>
        </div>

        {/* 2 large cards matching Image 4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* Card 1: Free */}
          <div className="bg-[#f4f6fa] p-8 rounded-none flex flex-col justify-between space-y-16 border border-transparent hover:border-black transition-all">
            <div className="space-y-4">
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 border border-black text-black bg-white uppercase">
                FREE - No card needed
              </span>
              <h3 className="text-3xl font-extrabold uppercase tracking-tight text-black max-w-sm">
                Start swing trading with Bitcoin
              </h3>
              <p className="text-text-secondary text-base leading-relaxed">
                Your free plan gives you real, live AI signals on the world&apos;s most traded cryptocurrency - forever. No credit card. No expiry. Just signals.
              </p>
            </div>

            {/* Visual: BTC icon unlocked, others locked */}
            <div className="space-y-4 pt-4 border-t border-black/10">
              <div className="flex items-center gap-3 bg-white border border-black p-3 w-max">
                <span className="w-8 h-8 rounded-none bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold font-mono">₿</span>
                <div>
                  <span className="block text-xs font-bold text-black">BTC/USDT</span>
                  <span className="text-[8px] text-brand-orange uppercase tracking-wider font-mono font-bold">Unlocked · Free</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 opacity-35">
                {["ETH", "SOL", "BNB", "ADA"].map((coin) => (
                  <div key={coin} className="bg-white border border-black/40 p-2 text-center relative overflow-hidden">
                    <span className="text-xs font-bold text-black block blur-[2px]">{coin}</span>
                    <span className="absolute inset-0 flex items-center justify-center gap-1 text-[8px] text-brand-orange font-bold uppercase tracking-widest bg-white/80">
                      <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                      PRO
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {user ? (
              <a 
                href="/terminal"
                className="w-full py-3.5 border border-black hover:bg-black hover:text-white font-bold text-xs uppercase tracking-widest text-center transition-colors bg-white rounded-none block"
              >
                Go to Terminal &rarr;
              </a>
            ) : (
              <a 
                href="/signup"
                className="w-full py-3.5 border border-black hover:bg-black hover:text-white font-bold text-xs uppercase tracking-widest text-center transition-colors bg-white rounded-none block"
              >
                Get free BTC signals &rarr;
              </a>
            )}
          </div>

          {/* Card 2: Pro & Master */}
          <div className="bg-[#f4f6fa] p-8 rounded-none flex flex-col justify-between space-y-16 border border-transparent hover:border-black transition-all">
            <div className="space-y-4">
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 border border-brand-orange/40 text-brand-orange bg-brand-orange/5 uppercase">
                PRO & MASTER PLANS
              </span>
              <h3 className="text-3xl font-extrabold uppercase tracking-tight text-black max-w-sm">
                Unlock 50+ altcoins on the market
              </h3>
              <p className="text-text-secondary text-base leading-relaxed">
                Upgrade to unlock real-time AI signals across the top 50 cryptocurrencies by market cap - ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, and dozens more. New coins added monthly.
              </p>
            </div>

            {/* Visual: Unlocked coin grid */}
            <div className="space-y-4 pt-4 border-t border-black/10">
              <div className="grid grid-cols-4 gap-2">
                {["ETH", "SOL", "BNB", "ADA", "AVAX", "XRP", "DOT", "LINK"].map((coin) => (
                  <div key={coin} className="bg-white border border-black p-2 text-center transition-colors hover:border-brand-orange">
                    <span className="text-xs font-bold text-black block">{coin}</span>
                    <span className="text-[7px] text-[#00e676] uppercase tracking-wider font-mono font-bold block mt-0.5">Live</span>
                  </div>
                ))}
              </div>
            </div>

            <a 
              href="/pricing"
              className="w-full py-3.5 bg-black hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest text-center transition-colors rounded-none"
            >
              Upgrade to Pro &rarr;
            </a>
          </div>

        </div>
      </section>

      {/* SECTION 9 - SOCIAL WALL / SUCCESS STORIES (Image 5 Testimonial Slider Redesign) */}
      {/* SECTION 7 - COIN COVERAGE */}
      <section className="py-24 max-w-7xl mx-auto px-6 border-b border-black overflow-hidden relative reveal-scale">
        
        {/* Header with fraction counter aligned right */}
        <div className="flex items-end justify-between mb-16">
          <div className="space-y-4 text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
              Success Stories
            </span>
            <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
              What Traders Are Saying
            </h2>
          </div>
          
          <div className="text-2xl font-bold font-sans text-black select-none">
            {activeTestimonialIdx + 1}/{testimonials.length - 1}
          </div>
        </div>

        {/* Testimonials horizontal slider view based on Image 5 */}
        <div className="relative w-full">
          <div 
            className="flex gap-8 transition-transform duration-500 ease-out" 
            style={{ transform: `translateX(-${activeTestimonialIdx * 350}px)` }}
          >
            {testimonials.map((t, idx) => (
              <div 
                key={idx} 
                className="w-[320px] md:w-[360px] bg-white border border-black p-8 rounded-none flex flex-col justify-between h-[340px] flex-shrink-0 relative hover:shadow-lg transition-all"
              >
                <div>
                  <span className="block text-[10px] font-bold text-brand-orange tracking-wider uppercase mb-6">
                    {t.category}
                  </span>
                  
                  {/* Mixed weight segment quote */}
                  <p className="text-lg text-text-secondary leading-relaxed font-sans">
                    {t.segments.map((seg, sIdx) => (
                      <span key={sIdx} className={seg.bold ? "font-bold text-black" : "text-text-secondary font-light"}>
                        {seg.text}
                      </span>
                    ))}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-black font-sans">{t.author}</h4>
                  <span className="text-xs text-text-secondary font-light">{t.role}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Floating Next Slide Circular Button on the Right boundary */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none md:-mr-4">
            <button 
              onClick={nextTestimonial}
              className="w-14 h-14 rounded-full bg-black hover:bg-brand-orange text-white flex items-center justify-center pointer-events-auto border border-black transition-colors shadow-xl"
            >
              <svg className="w-6 h-6 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

      </section>

      {/* SECTION 6 - PUBLIC TRACK RECORD (Editorial Swiss Layout) */}
      {/* SECTION 8 - TRACK RECORD */}
      <section id="track-record" className="py-24 max-w-7xl mx-auto px-6 border-b border-black reveal-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 items-end">
          <div className="lg:col-span-7 space-y-4 text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
              Radical Transparency
            </span>
            <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
              Wins & losses.<br />On the record.
            </h2>
          </div>
          <div className="lg:col-span-5 text-base md:text-lg text-text-secondary leading-relaxed">
            Most crypto signal services show you screenshots of their best calls. We show you everything - wins, losses, breakevens, and open signals - in a public, timestamped ledger. No cherry-picking. No deleted signals. Just data.
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black border border-black mb-12">
          <div className="bg-white p-6 text-left">
            <span className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Total signals</span>
            <span className="text-3xl font-bold font-mono text-black">4,218</span>
          </div>
          <div className="bg-white p-6 text-left">
            <span className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Verified win rate</span>
            <span className="text-3xl font-bold font-mono text-signal-buy">67.3%</span>
          </div>
          <div className="bg-white p-6 text-left">
            <span className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Average R:R ratio</span>
            <span className="text-3xl font-bold font-mono text-black">1 : 2.1</span>
          </div>
          <div className="bg-white p-6 text-left">
            <span className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Longest win streak</span>
            <span className="text-3xl font-bold font-mono text-black">11 signals</span>
          </div>
        </div>

        {/* Table Preview */}
        <div className="border border-black rounded-none bg-white overflow-hidden mb-8">
          <div className="p-4 border-b border-black bg-[#f8f9fa] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-black">
            <span>Last 5 Closed Signals</span>
            <span className="flex items-center gap-1.5 text-signal-buy">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-buy animate-pulse" />
              Verifiable Ledger
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black bg-white text-text-secondary font-mono text-xs uppercase font-bold">
                  <th className="p-4">Date</th>
                  <th className="p-4">Pair</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Entry</th>
                  <th className="p-4">Exit</th>
                  <th className="p-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 font-mono text-xs">
                {closedSignals.map((sig, idx) => (
                  <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="p-4 text-text-secondary">{sig.date}</td>
                    <td className="p-4 font-bold text-black">{sig.pair}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-none font-mono ${
                        sig.type === "BUY" ? "bg-signal-buy/15 text-signal-buy" : "bg-signal-sell/15 text-signal-sell"
                      }`}>
                        {sig.type}
                      </span>
                    </td>
                    <td className="p-4 text-black">{sig.entry}</td>
                    <td className="p-4 text-black">{sig.exit}</td>
                    <td className={`p-4 font-bold ${sig.win ? "text-signal-buy" : "text-signal-sell"}`}>
                      <span>
                        {sig.result}
                        {sig.win ? (
                          <svg className="w-3 h-3 stroke-current fill-none inline-block align-middle ml-1.5" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 stroke-current fill-none inline-block align-middle ml-1.5" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-left">
          <button 
            onClick={() => handleOpenModal("Full Track Record", "View the complete immutable track record containing over 4,200 closed signals, downloadable CSV reports, and monthly summaries.")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:text-brand-orange transition-colors uppercase tracking-wider"
          >
            View the full track record &rarr;
          </button>
        </div>
      </section>

      {/* SECTION 8 - LIFETIME ACCESS SHOWCASE (GrandMaster Deal) */}
      {/* SECTION 9 - PRICING SUMMARY */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6 border-b border-black reveal-on-scroll">
        <div className="text-left max-w-3xl mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
            GrandMaster Offer
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            No recurring fees.<br />Own it forever.
          </h2>
          <p className="text-text-secondary text-base md:text-lg max-w-xl">
            Skip the subscription model entirely. Lock in a single, one-time payment for permanent Master-tier capabilities, including all future updates and future features without any compromises.
          </p>
        </div>

        {/* GrandMaster Centerpiece Box */}
        <div className="relative rounded-none border border-black bg-[#f8f9fa] p-8 md:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-brand-orange/15 to-transparent pointer-events-none" />
          
          <div className="space-y-4 text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-brand-orange text-white text-[9px] font-bold uppercase tracking-wider font-mono">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 22h20L12 2z" />
              </svg>
              GrandMaster Lifetime Spot
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-black font-sans leading-none">
              GrandMaster Lifetime Access
            </h3>
            <p className="text-text-secondary text-sm md:text-base leading-relaxed">
              Get permanent Master-level access to Sanddock forever with a single one-time payment. This includes all future features, altcoins, API webhooks, and core logic upgrades without any compromise or recurring fees.
            </p>
            <div className="text-brand-orange font-mono text-xs font-bold uppercase tracking-wide">
              🔥 312 of 500 GrandMaster spots remaining
            </div>
          </div>

          <a 
            href="/pricing"
            className="w-full lg:w-auto bg-black hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-none border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] flex-shrink-0 text-center inline-block"
          >
            Get Lifetime Access &rarr;
          </a>
        </div>
      </section>

      {/* SECTION 10 - FAQ SECTION */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 border-b border-black reveal-right">
        <div className="text-left mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
            FAQ
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Everything you<br />need to know
          </h2>
        </div>

        {/* Accordions with thin black lines */}
        <div className="border-t border-black divide-y divide-black">
          {faqItems.map((item, idx) => {
            const isOpen = !!openFAQ[idx];
            return (
              <div key={idx} className="py-5">
                <button 
                  onClick={() => toggleFAQ(idx)}
                  className="w-full text-left flex items-center justify-between gap-4 font-bold uppercase text-base text-black hover:text-brand-orange transition-colors"
                >
                  <span className="font-sans">{item.q}</span>
                  <span className="text-xl font-bold font-mono">
                    {isOpen ? "\u2212" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="text-text-secondary text-base leading-relaxed pt-3 pr-8 transition-all">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 11 - FINAL CTA BANNER */}
      <section className="py-24 max-w-7xl mx-auto px-6 reveal-scale">
        <div className="relative rounded-none border border-black bg-[#f4f6fa] p-12 text-left overflow-hidden">
          
          <div className="max-w-2xl space-y-6 relative z-10">
            <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
              Your next trade<br />deserves <span className="text-brand-orange">a reason.</span>
            </h2>
            <p className="text-text-secondary text-base md:text-lg leading-relaxed max-w-md">
              Join traders who get AI-powered Buy and Sell signals with a verified public track record. Start free on Bitcoin. No card needed.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {user ? (
                <a 
                  href="/terminal"
                  className="bg-black hover:bg-brand-orange font-bold text-white text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-none inline-block text-center"
                >
                  Go to Terminal &rarr;
                </a>
              ) : (
                <a 
                  href="/signup"
                  className="bg-black hover:bg-brand-orange font-bold text-white text-xs uppercase tracking-widest px-8 py-4 transition-colors rounded-none inline-block text-center"
                >
                  Get Free Signals &rarr;
                </a>
              )}
              <a 
                href="#track-record" 
                className="border border-black font-bold text-black text-xs uppercase tracking-widest px-8 py-4 hover:bg-white transition-colors rounded-none bg-white inline-block text-center"
              >
                View Track Record
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white pt-16 pb-8 text-xs border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16">
            
            {/* Tagline / Logo (5 cols) */}
            <div className="md:col-span-5 space-y-4 text-left">
              <div className="flex items-center gap-2">
                <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-6 h-6 object-contain" />
                <span className="text-base font-bold uppercase tracking-wider font-sans text-white">
                  Sanddock
                </span>
              </div>
              <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
                AI signals. Honest track record.
              </p>
              <div className="flex gap-4 pt-2 text-[10px] font-bold uppercase tracking-wider">
                <a href="#twitter" className="text-zinc-500 hover:text-white transition-colors">Twitter/X</a>
                <a href="#telegram" className="text-zinc-500 hover:text-white transition-colors">Telegram</a>
                <a href="#youtube" className="text-zinc-500 hover:text-white transition-colors">YouTube</a>
              </div>
            </div>

            {/* Links Columns (7 cols) */}
            <div className="md:col-span-7 grid grid-cols-3 gap-8 text-left">
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Product</h4>
                <ul className="space-y-2 text-zinc-400 text-[11px] font-medium uppercase tracking-wider font-sans">
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#track-record" className="hover:text-white transition-colors">Track Record</a></li>
                  <li><a href="#blog" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#changelog" className="hover:text-white transition-colors">Changelog</a></li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Support</h4>
                <ul className="space-y-2 text-zinc-400 text-[11px] font-medium uppercase tracking-wider font-sans">
                  <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                  <li><a href="#docs" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
                  <li><a href="https://t.me/sanddockcom" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram Community</a></li>
                  <li><a href="#affiliates" className="hover:text-white transition-colors">Affiliate Program</a></li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Legal</h4>
                <ul className="space-y-2 text-zinc-400 text-[11px] font-medium uppercase tracking-wider font-sans">
                  <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#disclaimer" className="hover:text-white transition-colors">Disclaimer</a></li>
                  <li><a href="#cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
                </ul>
              </div>

            </div>

          </div>

          <div className="border-t border-zinc-800 pt-8 text-center text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} Sanddock. Not financial advice. All signals are for educational purposes only. Past performance does not indicate future results.
          </div>

        </div>
      </footer>

      {/* POPUP MODAL GATE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <div 
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Container (Swiss Editorial Design) */}
          <div className="relative w-full max-w-md bg-white border border-black rounded-none p-8 shadow-2xl space-y-6 z-10 text-left">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-black hover:text-brand-orange text-xl font-bold"
            >
              &times;
            </button>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider font-mono">SANDDOCK GATEWAY</span>
              <h3 className="text-2xl font-extrabold uppercase tracking-tight text-black font-sans">{modalContent.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {modalContent.body}
              </p>
            </div>

            {/* Email input inside modal */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-black uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                className="w-full bg-[#f4f6fa] border border-black rounded-none px-4 py-3 text-sm text-black focus:outline-none focus:border-brand-orange font-mono"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 bg-black hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest transition-colors rounded-none"
              >
                Proceed &rarr;
              </button>
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-3 border border-black bg-white hover:bg-[#f4f6fa] text-xs font-bold text-black uppercase tracking-widest transition-colors rounded-none"
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
