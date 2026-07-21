"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

// Tickers mock data structure (will be updated with real prices)
const getInitialTickerStrip1 = () => [
  { coin: "BTC", type: "BUY", price: "$67,432.00", confidence: 87, time: "14m ago", free: true },
  { coin: "ETH", type: "SELL", price: "$3,210.00", confidence: 72, time: "2h ago", free: false },
  { coin: "SOL", type: "BUY", price: "$142.50", confidence: 91, time: "5h ago", free: false },
  { coin: "BNB", type: "SELL", price: "$598.30", confidence: 68, time: "1d ago", free: false },
];

const getInitialTickerStrip2 = () => [
  { coin: "ADA", type: "BUY", price: "$0.612", confidence: 79, time: "3h ago", free: false },
  { coin: "AVAX", type: "SELL", price: "$38.20", confidence: 83, time: "6h ago", free: false },
  { coin: "XRP", type: "BUY", price: "$0.541", confidence: 74, time: "8h ago", free: false },
  { coin: "BTC", type: "BUY", price: "$66,950.00", confidence: 81, time: "12h ago", free: true },
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
    category: "SIGNAL QUALITY",
    segments: [
      { text: '"The signal quality is ', bold: false },
      { text: 'exceptional', bold: true },
      { text: '. I\'ve taken three trades this week and all three hit profit targets. The ', bold: false },
      { text: 'stop-loss levels are perfect', bold: true },
      { text: '. Best trading tool I\'ve used."', bold: false }
    ],
    author: "Elena Rostova",
    role: "Portfolio Manager"
  }
];

// FAQ items
const faqItems = [
  {
    q: "What is Sanddock?",
    a: "Sanddock is an AI trading signal tool that monitors Bitcoin and 50+ cryptocurrencies 24/7. When it identifies a high-probability trading opportunity, it sends you a signal with entry price, stop-loss, and take-profit. You decide whether to trade. No guessing. No analysis paralysis.",
  },
  {
    q: "Is the free plan really free?",
    a: "Yes, completely. The free plan gives you real, live AI signals on Bitcoin (BTC/USDT) forever. No credit card required, no time limit. Telegram alerts, additional coins, and advanced analytics require a paid plan.",
  },
  {
    q: "What makes Sanddock signals different from other signal groups?",
    a: "Most signal groups hide their losses and show cherry-picked wins. Sanddock logs every signal publicly—wins and losses. You can audit our track record yourself. 80% win rate. 6,500+ signals. Real data, no promises.",
  },
  {
    q: "How accurate are the signals?",
    a: "Our current verified win rate is 80% across 6,500+ signals. You can check our complete track record anytime in the Terminal section. Every signal—wins and losses—is timestamped and publicly logged. We don't cherry-pick. No deleted signals. No screenshots. Just data.",
  },
  {
    q: "Can I trust these signals enough to trade real money?",
    a: "Sanddock signals are educational tools, not financial advice. They are based on technical analysis and historical patterns, which do not guarantee future results. Always use risk management and never risk more than you can afford to lose. Most users treat signals as one input alongside their own analysis.",
  },
  {
    q: "How do I get signals on Telegram?",
    a: "After signing up, go to Settings → Telegram and connect using our pairing wizard. You'll get live alerts instantly. Free plan gets Bitcoin alerts. Pro plan adds 50+ coins and advanced features. Master plan includes webhook integration for automation.",
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
    a: "A one-time payment that gives you Master-level access to Sanddock forever, including all current and future features without compromise. Available only during the launch window - limited to 500 GrandMaster members.",
  },
];

// Interactive Chart mock data
const chartCandles = [
  { time: "09:00", open: 66400, high: 66700, low: 66300, close: 66600, color: "green", signal: null },
  { time: "09:15", open: 66600, high: 67100, low: 66500, close: 66900, color: "green", signal: null },
  { time: "09:30", open: 66900, high: 67000, low: 66100, close: 66250, color: "red", signal: null },
  { time: "09:45", open: 66250, high: 66300, low: 65800, close: 65900, color: "red", signal: null },
  { time: "10:00", open: 65900, high: 66000, low: 65500, close: 65700, color: "red", signal: { type: "BUY", price: "$65,700", confidence: 87, sl: "$64,200", tp: "$68,500", rationale: "Strong buy signal at support level. 87% confidence based on historical data. Entry: $65,700 • Stop: $64,200 • Target: $68,500" } },
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
  const [heroStats, setHeroStats] = useState({
    total_pnl: 0,
    win_rate: 0,
    total_signals: 0,
    last_updated: new Date().toISOString(),
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [closedSignals, setClosedSignals] = useState([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [tickerStrip1, setTickerStrip1] = useState(getInitialTickerStrip1());
  const [tickerStrip2, setTickerStrip2] = useState(getInitialTickerStrip2());

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

  // Fetch hero stats (1Y win rate, coin PnL, etc)
  useEffect(() => {
    const fetchHeroStats = async () => {
      try {
        setIsLoadingStats(true);
        const response = await fetch('/api/hero-stats');
        const data = await response.json();

        if (data.total_pnl !== undefined) {
          setHeroStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch hero stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchHeroStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchHeroStats, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch closed signals from database
  useEffect(() => {
    const fetchClosedSignals = async () => {
      try {
        setIsLoadingSignals(true);
        const response = await fetch('/api/closed-signals?limit=5');
        const data = await response.json();

        console.log('Closed signals API response:', data);

        if (data.signals && Array.isArray(data.signals)) {
          console.log('Setting closed signals:', data.signals);
          setClosedSignals(data.signals);
        } else {
          console.log('No signals array in response or not an array');
        }
      } catch (error) {
        console.error('Failed to fetch closed signals:', error);
      } finally {
        setIsLoadingSignals(false);
      }
    };

    fetchClosedSignals();
    // Refresh every 60 seconds
    const interval = setInterval(fetchClosedSignals, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch crypto prices from Coinbase API and update ticker
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD');
        const data = await response.json();

        if (data.data && data.data.rates) {
          const rates = data.data.rates;

          // Coinbase API returns rates as crypto per USD, need to invert to get USD per crypto
          const priceMap = {
            BTC: rates.BTC ? 1 / parseFloat(rates.BTC) : null,
            ETH: rates.ETH ? 1 / parseFloat(rates.ETH) : null,
            SOL: rates.SOL ? 1 / parseFloat(rates.SOL) : null,
            BNB: rates.BNB ? 1 / parseFloat(rates.BNB) : null,
            ADA: rates.ADA ? 1 / parseFloat(rates.ADA) : null,
            AVAX: rates.AVAX ? 1 / parseFloat(rates.AVAX) : null,
            XRP: rates.XRP ? 1 / parseFloat(rates.XRP) : null,
          };

          // Update ticker strips with real prices
          setTickerStrip1((prev) =>
            prev.map((item) => ({
              ...item,
              price: priceMap[item.coin]
                ? `$${priceMap[item.coin].toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : item.price,
            }))
          );

          setTickerStrip2((prev) =>
            prev.map((item) => ({
              ...item,
              price: priceMap[item.coin]
                ? `$${priceMap[item.coin].toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : item.price,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error);
      }
    };

    fetchCryptoPrices();
    // Refresh every 5 minutes
    const interval = setInterval(fetchCryptoPrices, 300000);
    return () => clearInterval(interval);
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
    timeframe: "15m",
    price: "$67,432.00",
    confidence: 87,
    sl: "$65,800.00",
    tp: "$70,850.00",
    rationale: "Strong BUY signal at $67,432 support level. 87% confidence. Price has bounced from this level multiple times in the past. Volume confirms the move. Stop at $65,800, Target at $70,850.",
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
      title: "Confidence Scoring",
      desc: "Every signal gets a confidence score. High score means it's backed by strong historical data. Low score means we skip the trade. You only get the best opportunities.",
      signal: {
        type: "BUY",
        price: "$65,700",
        confidence: 87,
        sl: "$64,200",
        tp: "$68,500",
        rationale: "87% confidence score. This setup has a strong track record of profitability. Historical data shows similar conditions resulted in gains 87% of the time."
      }
    },
    {
      title: "Built-In Risk Management",
      desc: "Stop-loss and take-profit levels are calculated for every trade. Know exactly where you'll exit if the trade goes wrong, and where you'll lock in profits.",
      signal: {
        type: "BUY",
        price: "$65,700",
        confidence: 91,
        sl: "$65,100",
        tp: "$66,900",
        rationale: "Stop-loss at $65,100 protects your downside. Take-profit at $66,900 locks in gains. Risk is defined before you enter the trade."
      }
    },
    {
      title: "Noise Filtering",
      desc: "Filters out fake signals and market noise. Waits for setups with high probability of success before alerting you. Fewer alerts, higher quality trades.",
      signal: {
        type: "SELL",
        price: "$68,250",
        confidence: 74,
        sl: "$69,500",
        tp: "$65,500",
        rationale: "74% confidence SELL signal. Market is showing signs of reversal. Historical patterns suggest this level is a strong resistance zone."
      }
    },
    {
      title: "Telegram & Mobile Alerts",
      desc: "Get signals pushed to your phone the instant they fire. Telegram alerts or dashboard—choose your preference. Trade when you're ready, not when you happen to check.",
      signal: {
        type: "BUY",
        price: "$67,432.00",
        confidence: 87,
        sl: "$65,800.00",
        tp: "$70,850.00",
        rationale: "Signal alert received on Telegram. Entry: $67,432 • Stop: $65,800 • Target: $70,850. Ready to execute in seconds."
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
    <div className="relative min-h-screen bg-white text-black selection:bg-brand-orange selection:text-white overflow-hidden font-satoshi">
      
      {/* HEADER / NAVIGATION BAR (SWISS STYLE) */}
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
            <a href="/articles" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Articles</a>
            {user && (
              <a href="/terminal" className="px-6 h-full flex items-center border-r border-black text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">Terminal</a>
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
              <>
                <a
                  href="/login"
                  className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center border-r border-black"
                >
                  Login
                </a>
                <a
                  href="/signup"
                  className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center"
                >
                  Start Free &rarr;
                </a>
              </>
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
      <section className="relative z-20 pt-10 pb-10 max-w-7xl mx-auto px-6 border-b border-black bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Huge typography & description & CTAs */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="space-y-3">
              <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-extrabold tracking-tighter leading-snug font-satoshi text-black max-w-full">
                Trading signals backed by data,<br className="hidden md:block" /> not promises.
              </h1>
            </div>

            {/* Live Stats Row - Total Performance */}
            <div className="py-3 md:py-5 border-t border-b border-black">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 mb-3">
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-text-muted">Win Rate</p>
                  <p className="text-xl md:text-3xl font-extrabold text-black font-satoshi">
                    {isLoadingStats ? '...' : heroStats.win_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-text-muted">Total PnL</p>
                  <p className={`text-xl md:text-3xl font-extrabold font-satoshi ${heroStats.total_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isLoadingStats ? '...' : (heroStats.total_pnl >= 0 ? '+' : '') + heroStats.total_pnl.toFixed(2)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-text-muted">Total Signals</p>
                  <p className="text-xl md:text-3xl font-extrabold text-black font-satoshi">
                    {isLoadingStats ? '...' : heroStats.total_signals.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-black">
                Last updated {isLoadingStats ? '...' : new Date(heroStats.last_updated).toLocaleTimeString()}
              </p>
            </div>

            {/* Description and copy */}
            <p className="text-base md:text-lg text-text-secondary leading-relaxed max-w-3xl whitespace-normal break-words">
              AI-powered trading signals. Verified track record. Every entry with a clear reason, stop-loss, and profit target. Start free on Bitcoin.
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

          {/* Right Column: Verified & Transparent Trust Metrics */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-white border border-black rounded-none p-8 shadow-xl relative overflow-hidden">
              {/* Header */}
              <div className="pb-4 border-b border-black mb-6">
                <h3 className="text-2xl font-extrabold uppercase tracking-tighter text-black mb-1 mt-2">Verified & Transparent</h3>
                <p className="text-sm text-black">Why traders trust Sanddock</p>
              </div>

              {/* Trust Metrics */}
              <div className="space-y-5">
                {/* Metric 1 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-black text-sm">Public Track Record</h4>
                    <p className="text-xs text-black mt-1">Every signal logged immutably. Zero cherry-picked wins.</p>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-black text-sm">Real-Time Performance</h4>
                    <p className="text-xs text-black mt-1">Live PnL from {heroStats.total_signals.toLocaleString()} verified signals.</p>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-black text-sm">No Hidden Fees</h4>
                    <p className="text-xs text-white mt-1">Transparent pricing. No markup on signals. No surprise charges.</p>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-black text-sm">Win Rate Verified</h4>
                    <p className="text-xs text-white mt-1">{heroStats.win_rate.toFixed(1)}% on-chain verified. Auditable data.</p>
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="mt-6 pt-6 border-t border-zinc-200 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white mb-2">Trusted By</p>
                <p className="text-xs text-black font-semibold">Thousands of Professional Traders</p>
              </div>
            </div>
          </div>

        </div>

        {/* Separator and Bottom Meta row */}
        <div className="border-t border-black mt-16 pt-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-bold uppercase tracking-wider text-black">

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
                
                <span className="font-satoshi text-text-secondary">{item.price}</span>
                <span className="text-text-muted">·</span>
                <span className="text-brand-orange">{item.confidence}%</span>
                <span className="text-text-muted">·</span>
                <span className="text-text-muted font-satoshi">{item.time}</span>

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

                <span className="font-satoshi text-text-secondary">{item.price}</span>
                <span className="text-text-muted">·</span>
                <span className="text-brand-orange">{item.confidence}%</span>
                <span className="text-text-muted">·</span>
                <span className="text-text-muted font-satoshi">{item.time}</span>

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
              Verified Performance
            </span>
            <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi leading-none">
              Real Data, Real Results
            </h2>
          </div>
          <div className="lg:col-span-6 text-base md:text-lg text-text-secondary leading-relaxed pt-2">
            Sanddock doesn't make promises. Every signal is backtested, verified on-chain, and logged publicly. You see exactly what happened—wins and losses—with no cherry-picked screenshots or hidden track records. Pure data.
          </div>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          {/* Column 1: The Old Way (Anxiety) */}
          <div className="border border-black p-8 bg-zinc-50 flex flex-col justify-between space-y-8">
            <div>
              <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 bg-signal-sell/10 text-signal-sell uppercase tracking-widest font-satoshi border border-signal-sell/20 mb-6">
                Without Real Data
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-8">
                Empty Promises
              </h3>

              <ul className="space-y-6 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                <li className="flex items-start gap-3">
                  <span className="text-signal-sell mt-0.5">&#x2715;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Cherry-Picked Results</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-satoshi">
                      Signal groups post only winning screenshots, hiding losers and accuracy behind unverifiable claims.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-signal-sell mt-0.5">&#x2715;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">No Historical Record</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-satoshi">
                      No public track record. No audit trail. Impossible to verify if 80% or 20% are real.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-signal-sell mt-0.5">&#x2715;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Hidden Losses</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-satoshi">
                      Bad signals get deleted or ignored. Real lose rates stay secret.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-signal-sell mt-0.5">&#x2715;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">No Risk Framework</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-satoshi">
                      Signals without stop-loss or position sizing guidance. Your capital is unprotected.
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 2: The Sanddock Way (Clarity) */}
          <div className="border-2 border-black p-8 bg-white flex flex-col justify-between space-y-8 relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 bg-signal-buy/15 text-[#00b050] uppercase tracking-widest font-satoshi border border-signal-buy/20 mb-6">
                Sanddock Approach
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-8">
                Verified On-Chain
              </h3>

              <ul className="space-y-6 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                <li className="flex items-start gap-3">
                  <span className="text-[#00b050] mt-0.5">&#x2713;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">24/7 Market Scanning</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-satoshi">
                      Our AI monitors major coins around the clock. When a buy or sell opportunity appears, you get alerted instantly.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00b050] mt-0.5">&#x2713;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Complete Trade Setup</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-satoshi">
                      Entry price, stop-loss, and take-profit calculated for you. Everything you need to execute the trade immediately.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00b050] mt-0.5">&#x2713;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Immutable Track Record</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-satoshi">
                      6,500+ signals. All logged publicly. 80% win rate. Real data you can audit yourself.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#00b050] mt-0.5">&#x2713;</span>
                  <div>
                    <span className="block text-black font-bold mb-1">Instant Alerts</span>
                    <span className="text-xs md:text-sm leading-relaxed text-text-secondary block normal-case font-normal font-satoshi">
                      Live Telegram notifications. Dashboard signals. Entry, exit, and risk management pre-calculated.
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
            <h4 className="text-lg font-bold uppercase text-black font-satoshi">01 - Stop Guessing</h4>
            <p className="text-text-secondary text-base leading-relaxed">
              Every signal backed by 6,500+ verified trades. Real win rate (80%). Real PnL (+3228%). No promises.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold uppercase text-black font-satoshi">02 - Automated Entry</h4>
            <p className="text-text-secondary text-base leading-relaxed">
              Signal fires. Entry price is pre-set. Stop-loss and take-profit already calculated. Copy the exact setup in 30 seconds.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold uppercase text-black font-satoshi">03 - Verified Results</h4>
            <p className="text-text-secondary text-base leading-relaxed">
              Check our public track record anytime. Every win, every loss. No hidden signals. No cherry-picked data. Pure math.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4 - HOW IT WORKS (Image 2 Card Grids Redesign) */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-6 border-b border-black reveal-left">
        <div className="text-left mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
            How It Works
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi">
            Get Alerts. Trade. Profit. &rarr;
          </h2>
          <p className="text-text-secondary text-base md:text-lg max-w-md">
            Three simple steps from signal to execution. No analysis paralysis. No watching charts all day.
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
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">01 - Constant Watch</h3>
              <p className="text-text-secondary text-base leading-relaxed">
                Our system monitors the market 24/7. When it identifies a high-probability trading opportunity, you're the first to know. No missed entries while you sleep.
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
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">02 - Clear Reasoning</h3>
              <p className="text-text-secondary text-base leading-relaxed">
                Every signal comes with a clear explanation of why this is a good trade opportunity. You understand the setup before you commit your money.
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
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">03 - Instant Alert</h3>
              <p className="text-text-secondary text-base leading-relaxed">
                Signal fires and you get notified immediately on Telegram or your dashboard. Trade setup ready to copy. Act fast or wait for the next one.
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
              <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi leading-none mb-12">
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
                        <span className="font-satoshi">{feat.title}</span>
                        <span className="text-xl font-bold font-satoshi">
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
                    <span className="ml-2 font-satoshi text-white text-[10px] tracking-wider">SANDDOCK ACTIVE TERMINAL</span>
                  </div>
                  <span className="text-[9px] font-satoshi text-brand-orange bg-brand-orange/15 px-2 py-0.5 rounded-none font-bold">
                    {activeSignal.timeframe}
                  </span>
                </div>

                {/* Grid content inside mockup */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* SVG Line & Bar Chart (7 cols) */}
                  <div className="md:col-span-7 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold font-satoshi text-white">{activeSignal.coin}</h4>
                        <span className="text-[9px] font-satoshi text-text-secondary">Price Movement Chart</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-satoshi font-bold text-[#00e676] bg-[#00e676]/15 px-2 py-0.5 rounded-none">
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
                                className="text-[8px] font-satoshi font-bold"
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
                        <span className="bg-[#080d1a] px-1 text-[7px] text-[#00e676] font-satoshi tracking-wider font-bold">TP TARGET ({activeSignal.tp})</span>
                      </div>

                      {/* Entry Price Line */}
                      <div className="absolute left-0 right-10 border-t border-dashed border-white/30 top-[50%] z-20 pointer-events-none flex items-center justify-between pl-2">
                        <span className="bg-[#080d1a] px-1 text-[7px] text-white/50 font-satoshi tracking-wider font-bold">ENTRY PRICE ({activeSignal.price})</span>
                      </div>

                      {/* Stop Loss Target Line */}
                      <div className="absolute left-0 right-10 border-t border-dashed border-signal-sell/40 top-[80%] z-20 pointer-events-none flex items-center justify-between pl-2">
                        <span className="bg-[#080d1a] px-1 text-[7px] text-signal-sell font-satoshi tracking-wider font-bold">STOP LOSS ({activeSignal.sl})</span>
                      </div>

                      {/* Y-Axis Price Panel (Right aligned) */}
                      <div className="absolute right-0 top-0 bottom-6 w-10 border-l border-white/10 flex flex-col justify-between items-center py-2 text-[7px] text-text-muted font-satoshi bg-black/20 pointer-events-none">
                        <span>$71k</span>
                        <span>$69k</span>
                        <span>$67k</span>
                        <span>$65k</span>
                      </div>

                      {/* X-Axis Time Panel (Bottom aligned) */}
                      <div className="absolute bottom-0 left-0 right-10 h-6 border-t border-white/10 flex justify-between items-center px-4 text-[7px] text-text-muted font-satoshi bg-black/20 pointer-events-none">
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
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-none font-satoshi ${
                            activeSignal.type === "BUY" ? "bg-[#00e676]/15 text-[#00e676]" : "bg-signal-sell/15 text-signal-sell"
                          }`}>
                            {activeSignal.type}
                          </span>
                          <span className="text-[9px] font-satoshi text-text-muted">{activeSignal.time}</span>
                        </div>

                        <h4 className="text-xs font-bold text-white font-satoshi">{activeSignal.coin}</h4>

                        <div className="grid grid-cols-3 gap-1 my-2">
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-text-muted font-bold font-satoshi">ENTRY</span>
                            <span className="text-[8px] font-satoshi text-white font-bold">{activeSignal.price}</span>
                          </div>
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-text-muted font-bold font-satoshi">STOP LOSS</span>
                            <span className="text-[8px] font-satoshi text-signal-sell font-bold">{activeSignal.sl}</span>
                          </div>
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-text-muted font-bold font-satoshi">TAKE PROFIT</span>
                            <span className="text-[8px] font-satoshi text-[#00e676] font-bold">{activeSignal.tp}</span>
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
                        <p className="text-[9px] text-text-secondary leading-relaxed font-satoshi line-clamp-3">
                          {activeSignal.rationale}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Terminal Log Console */}
              <div className="mt-6 pt-4 border-t border-white/10 font-satoshi text-[9px] text-white space-y-1.5 text-left">
                <div className="flex items-center justify-between text-[8px] font-bold text-white uppercase tracking-widest mb-1">
                  <span>System Console Logs</span>
                  <span className="text-[#00e676] animate-pulse">● Live Connection</span>
                </div>
                <div className="space-y-1 bg-black/40 p-2.5 border border-white/5 h-[80px] overflow-y-auto">
                  <div className="text-[#00e676]">&gt; [14:30:00] Initializing Sanddock Core Signal Engine v1.1.2...</div>
                  <div>&gt; [14:30:02] Connecting to Binance WebSockets... Status: 101 Switch Protocols</div>
                  <div>&gt; [14:30:05] Scanners active across 52 trading pairs. Monitoring 15m and 1h timeframes.</div>
                  {activeSignal.type === "BUY" ? (
                    <div className="text-[#00e676] font-bold">&gt; [14:30:10] SIGNAL TRIGGERED: BUY {activeSignal.coin} @ {activeSignal.price} (Confidence: {activeSignal.confidence}%)</div>
                  ) : (
                    <div className="text-signal-sell font-bold">&gt; [14:30:10] SIGNAL TRIGGERED: SELL {activeSignal.coin} @ {activeSignal.price} (Confidence: {activeSignal.confidence}%)</div>
                  )}
                  <div className="text-white">&gt; [14:30:12] Generating AI Rationale description blocks... Done.</div>
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
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi leading-none">
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
                <span className="w-8 h-8 rounded-none bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold font-satoshi">₿</span>
                <div>
                  <span className="block text-xs font-bold text-black">BTC/USDT</span>
                  <span className="text-[8px] text-brand-orange uppercase tracking-wider font-satoshi font-bold">Unlocked · Free</span>
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
                    <span className="text-[7px] text-[#00e676] uppercase tracking-wider font-satoshi font-bold block mt-0.5">Live</span>
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
            <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi leading-none">
              What Traders Are Saying
            </h2>
          </div>
          
          <div className="text-2xl font-bold font-satoshi text-black select-none">
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
                  <p className="text-lg text-text-secondary leading-relaxed font-satoshi">
                    {t.segments.map((seg, sIdx) => (
                      <span key={sIdx} className={seg.bold ? "font-bold text-black" : "text-text-secondary font-light"}>
                        {seg.text}
                      </span>
                    ))}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-black font-satoshi">{t.author}</h4>
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
            <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi leading-none">
              Wins & losses.<br />On the record.
            </h2>
          </div>
          <div className="lg:col-span-5 text-base md:text-lg text-text-secondary leading-relaxed">
            Most crypto signal services show you screenshots of their best calls. We show you everything - wins, losses, breakevens, and open signals - in a public, timestamped ledger. No cherry-picking. No deleted signals. Just data.
          </div>
        </div>

        {/* Stats Row - Real Data from Database */}
        <div className="mb-4 text-xs text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-signal-buy animate-pulse" />
          Real-time data from our immutable ledger
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black border border-black mb-12">
          <div className="bg-white p-6 text-left">
            <span className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Total signals</span>
            <span className="text-3xl font-bold font-satoshi text-black">
              {isLoadingStats ? '...' : heroStats.total_signals.toLocaleString()}
            </span>
          </div>
          <div className="bg-white p-6 text-left">
            <span className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Verified win rate</span>
            <span className="text-3xl font-bold font-satoshi text-signal-buy">
              {isLoadingStats ? '...' : heroStats.win_rate.toFixed(1)}%
            </span>
          </div>
          <div className="bg-white p-6 text-left">
            <span className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Total PnL</span>
            <span className={`text-3xl font-bold font-satoshi ${heroStats.total_pnl >= 0 ? 'text-signal-buy' : 'text-signal-sell'}`}>
              {isLoadingStats ? '...' : (heroStats.total_pnl >= 0 ? '+' : '') + heroStats.total_pnl.toFixed(2)}%
            </span>
          </div>
          <div className="bg-white p-6 text-left">
            <span className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Updated</span>
            <span className="text-xs font-satoshi text-black">
              {isLoadingStats ? '...' : new Date(heroStats.last_updated).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Table Preview */}
        <div className="border border-black rounded-none bg-white overflow-hidden mb-8">
          <div className="p-4 border-b border-black bg-[#f8f9fa] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-black">
            <span>Today's Trades</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black bg-white text-text-secondary font-satoshi text-xs uppercase font-bold">
                  <th className="p-4">Date</th>
                  <th className="p-4">Pair</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Entry</th>
                  <th className="p-4">Exit</th>
                  <th className="p-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 font-satoshi text-xs">
                {isLoadingSignals ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-secondary">
                      Loading signals...
                    </td>
                  </tr>
                ) : closedSignals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-secondary">
                      No closed signals yet. Signals will appear here as trades close.
                    </td>
                  </tr>
                ) : (
                  closedSignals.map((sig, idx) => (
                    <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="p-4 text-text-secondary">{sig.date}</td>
                      <td className="p-4 font-bold text-black">{sig.pair}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-none font-satoshi ${
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-left">
          <a
            href="/terminal"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:text-brand-orange transition-colors uppercase tracking-wider"
          >
            View complete track record with full performance analytics &rarr;
          </a>
        </div>
      </section>

      {/* SECTION 8 - LIFETIME ACCESS SHOWCASE (GrandMaster Deal) */}
      {/* SECTION 9 - PRICING SUMMARY */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6 border-b border-black reveal-on-scroll">
        <div className="text-left max-w-3xl mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
            GrandMaster Offer
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi leading-none">
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-brand-orange text-white text-[9px] font-bold uppercase tracking-wider font-satoshi">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 22h20L12 2z" />
              </svg>
              GrandMaster Lifetime Spot
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-black font-satoshi leading-none">
              GrandMaster Lifetime Access
            </h3>
            <p className="text-text-secondary text-sm md:text-base leading-relaxed">
              Get permanent Master-level access to Sanddock forever with a single one-time payment. This includes all future features, altcoins, API webhooks, and core logic upgrades without any compromise or recurring fees.
            </p>
            <div className="text-brand-orange font-satoshi text-xs font-bold uppercase tracking-wide">
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
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi leading-none">
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
                  <span className="font-satoshi">{item.q}</span>
                  <span className="text-xl font-bold font-satoshi">
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
            <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter text-black font-satoshi leading-none">
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
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="/terminal" className="hover:text-white transition-colors">Terminal</a></li>
                  <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#track-record" className="hover:text-white transition-colors">Track Record</a></li>
                  <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Support</h4>
                <ul className="space-y-2 text-white text-[11px] font-medium uppercase tracking-wider font-satoshi">
                  <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
                  <li><a href="https://t.me/sanddockcom" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram Community</a></li>
                  <li><a href="#docs" className="hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#status" className="hover:text-white transition-colors">System Status</a></li>
                  <li><a href="#affiliates" className="hover:text-white transition-colors">Affiliate Program</a></li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Legal</h4>
                <ul className="space-y-2 text-white text-[11px] font-medium uppercase tracking-wider font-satoshi">
                  <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#disclaimer" className="hover:text-white transition-colors">Disclaimer</a></li>
                  <li><a href="#cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
                </ul>
              </div>

            </div>

          </div>

          <div className="border-t border-zinc-800 pt-8 text-center text-[10px] text-white leading-relaxed font-bold uppercase tracking-wider">
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
              <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider font-satoshi">SANDDOCK GATEWAY</span>
              <h3 className="text-2xl font-extrabold uppercase tracking-tight text-black font-satoshi">{modalContent.title}</h3>
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
                className="w-full bg-[#f4f6fa] border border-black rounded-none px-4 py-3 text-sm text-black focus:outline-none focus:border-brand-orange font-satoshi"
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
