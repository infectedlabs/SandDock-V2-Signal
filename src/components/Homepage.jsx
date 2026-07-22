"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { CtaPrimary, CtaSecondary } from "@/components/ui/Cta";

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
    a: "Most signal groups hide their losses and show cherry-picked wins. Sanddock logs every signal publicly-wins and losses. You can audit our track record yourself. 80% win rate. 6,500+ signals. Real data, no promises.",
  },
  {
    q: "How accurate are the signals?",
    a: "Our current verified win rate is 80% across 6,500+ signals. You can check our complete track record anytime in the Terminal section. Every signal-wins and losses-is timestamped and publicly logged. We don't cherry-pick. No deleted signals. No screenshots. Just data.",
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

// Single pill in the scrolling ticker. Locked coins open the upgrade modal.
function TickerPill({ item, onLocked }) {
  const isBuy = item.type === "BUY";
  return (
    <div
      onClick={() =>
        !item.free
          ? onLocked(
              `Unlock ${item.coin} Signals`,
              `Upgrade to the Pro Plan to view live alerts, automated stop-losses, and take-profit structures for ${item.coin} and 9 other premium altcoins.`
            )
          : null
      }
      className={`inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-surface-2/80 backdrop-blur-sm py-2 px-4 text-[12px] font-medium transition-colors ${
        item.free ? "" : "cursor-pointer hover:border-accent/40 hover:bg-surface-3/80"
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 font-bold tracking-wide ${
          isBuy ? "text-up" : "text-down"
        }`}
      >
        <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 10 10" aria-hidden="true">
          {isBuy ? <path d="M5 0l5 9H0z" /> : <path d="M5 10L0 1h10z" />}
        </svg>
        {item.type}
      </span>

      <span className="font-semibold text-ink">{item.coin}</span>
      <span className="text-ink-2 tabular-nums">{item.price}</span>
      <span className="text-white/12">|</span>
      <span className="text-accent-soft font-semibold tabular-nums">{item.confidence}%</span>
      <span className="text-ink-3 tabular-nums">{item.time}</span>

      {!item.free && (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-accent-soft bg-accent/15 border border-accent/25 px-1.5 py-0.5 rounded-md">
          <svg className="w-2 h-2 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-3.9 0H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          Pro
        </span>
      )}
    </div>
  );
}

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
      desc: "Get signals pushed to your phone the instant they fire. Telegram alerts or dashboard-choose your preference. Trade when you're ready, not when you happen to check.",
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
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden antialiased">

      {/* FIXED TRANSPARENT NAVBAR */}
      <Navbar />

      {/* Ambient drifting glow orbs, parallaxed against scroll.
          Offset past the full-viewport hero so they light the sections below it. */}
      <div
        className="pointer-events-none absolute top-[1300px] -left-40 w-[420px] h-[420px] rounded-full blur-[130px] bg-accent/10 hidden lg:block z-0 animate-drift"
        style={{ transform: `translateY(${scrollY * 0.06}px)` }}
      />
      <div
        className="pointer-events-none absolute top-[2100px] -right-40 w-[460px] h-[460px] rounded-full blur-[140px] bg-accent-2/10 hidden lg:block z-0 animate-drift"
        style={{ transform: `translateY(${scrollY * -0.05}px)` }}
      />

      {/* SECTION 1 - HERO (video background, Instrument type, Motion animations) */}
      <Hero heroStats={heroStats} isLoadingStats={isLoadingStats} />

      {/* SECTION 1b - TRUST BAND
          Carries the four trust metrics and exchange coverage that used to live
          in the hero's right-hand panel, now that the hero is a centred layout. */}
      <section className="relative border-b border-line bg-surface-0 py-14 md:py-16">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {[
              {
                title: "Public Track Record",
                body: "Every signal logged immutably. Zero cherry-picked wins.",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
              },
              {
                title: "Real-Time Performance",
                body: `Live PnL from ${heroStats.total_signals.toLocaleString()} verified signals.`,
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
              },
              {
                title: "No Hidden Fees",
                body: "Transparent pricing. No markup on signals. No surprise charges.",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
              },
              {
                title: "Win Rate Verified",
                body: `${heroStats.win_rate.toFixed(1)}% verified across the full ledger. Auditable data.`,
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.5l5-5 4 4 8.5-8.5M21 4v5h-5" />,
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent/25 to-accent-2/15 border border-white/10 text-accent-soft flex items-center justify-center">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                </div>
                <div className="flex-1 pt-0.5">
                  <h4 className="font-semibold text-ink text-[14px]">{item.title}</h4>
                  <p className="text-[13px] text-ink-2 mt-1 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof + exchange coverage */}
          <div className="mt-12 pt-8 border-t border-line flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["from-accent to-accent-2", "from-accent-2 to-accent-3", "from-accent-3 to-accent"].map((g, i) => (
                  <span key={i} className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} border-2 border-surface-0`} />
                ))}
              </div>
              <p className="text-[13px] text-ink-2">
                Trusted by <span className="text-ink font-semibold">thousands</span> of professional traders
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
                Market data from
              </span>
              <div className="flex items-center gap-7 text-[15px] font-semibold text-ink-2/70">
                <span>Binance</span>
                <span>Bybit</span>
                <span>OKX</span>
                <span>KuCoin</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 - LIVE SIGNAL TICKER */}
      <section className="relative border-b border-line bg-surface-1/60 backdrop-blur-sm py-4 overflow-hidden select-none">

        {/* Ticker Row 1 (scrolls left) */}
        <div className="relative w-full overflow-hidden whitespace-nowrap mb-2.5 marquee-mask">
          <div className="animate-scroll-left flex gap-3">
            {tickerStrip1.concat(tickerStrip1).map((item, idx) => (
              <TickerPill key={idx} item={item} onLocked={handleOpenModal} />
            ))}
          </div>
        </div>

        {/* Ticker Row 2 (scrolls right) */}
        <div className="relative w-full overflow-hidden whitespace-nowrap marquee-mask">
          <div className="animate-scroll-right flex gap-3">
            {tickerStrip2.concat(tickerStrip2).map((item, idx) => (
              <TickerPill key={idx} item={item} onLocked={handleOpenModal} />
            ))}
          </div>
        </div>

      </section>

      {/* SECTION 3 - WHY SANDDOCK (Outcome-First Comparison) */}
      <section className="relative py-24 md:py-28 border-b border-line mesh-glow-soft reveal-on-scroll">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
            <div className="lg:col-span-6 text-left">
              <span className="eyebrow">Verified performance</span>
              <h2 className="mt-4 text-[34px] md:text-[46px] font-semibold tracking-[-0.03em] text-gradient leading-[1.06]">
                Real data. Real results.
              </h2>
            </div>
            <div className="lg:col-span-6 text-[16px] md:text-[17px] text-ink-2 leading-relaxed">
              Sanddock doesn&apos;t make promises. Every signal is backtested, verified, and logged
              publicly. You see exactly what happened - wins and losses - with no cherry-picked
              screenshots or hidden track records. Pure data.
            </div>
          </div>

          {/* Comparison grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

            {/* Column 1: The Old Way */}
            <div className="card p-8 border-white/6 bg-surface-1/40">
              <span className="chip !border-down/25 !bg-down/10 !text-down mb-6">
                Without real data
              </span>
              <h3 className="text-[22px] font-bold tracking-tight text-ink/80 mb-7">
                Empty promises
              </h3>

              <ul className="space-y-5">
                {[
                  ["Cherry-Picked Results", "Signal groups post only winning screenshots, hiding losers and accuracy behind unverifiable claims."],
                  ["No Historical Record", "No public track record. No audit trail. Impossible to verify if 80% or 20% are real."],
                  ["Hidden Losses", "Bad signals get deleted or ignored. Real lose rates stay secret."],
                  ["No Risk Framework", "Signals without stop-loss or position sizing guidance. Your capital is unprotected."],
                ].map(([title, body]) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md bg-down/12 border border-down/20 text-down flex items-center justify-center">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                    <div>
                      <span className="block text-ink/85 font-semibold text-[14px] mb-1">{title}</span>
                      <span className="block text-[13.5px] leading-relaxed text-ink-3">{body}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: The Sanddock Way */}
            <div className="card-gradient-border p-px">
              <div className="rounded-[17px] bg-surface-2/70 backdrop-blur-xl p-8 relative overflow-hidden h-full">
                <div className="pointer-events-none absolute -top-28 -right-20 w-64 h-64 rounded-full bg-accent/14 blur-3xl" />
                <div className="relative">
                  <span className="chip !border-up/28 !bg-up/12 !text-up mb-6">
                    Sanddock approach
                  </span>
                  <h3 className="text-[22px] font-bold tracking-tight text-ink mb-7">
                    Verified on the record
                  </h3>

                  <ul className="space-y-5">
                    {[
                      ["24/7 Market Scanning", "Our AI monitors major coins around the clock. When a buy or sell opportunity appears, you get alerted instantly."],
                      ["Complete Trade Setup", "Entry price, stop-loss, and take-profit calculated for you. Everything you need to execute the trade immediately."],
                      ["Immutable Track Record", "6,500+ signals. All logged publicly. 80% win rate. Real data you can audit yourself."],
                      ["Instant Alerts", "Live Telegram notifications. Dashboard signals. Entry, exit, and risk management pre-calculated."],
                    ].map(([title, body]) => (
                      <li key={title} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md bg-up/15 border border-up/25 text-up flex items-center justify-center">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </span>
                        <div>
                          <span className="block text-ink font-semibold text-[14px] mb-1">{title}</span>
                          <span className="block text-[13.5px] leading-relaxed text-ink-2">{body}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* Outcomes bottom grid */}
          <div className="border-t border-line pt-12 grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              ["01", "Stop guessing", "Every signal backed by 6,500+ verified trades. Real win rate (80%). Real PnL (+3228%). No promises."],
              ["02", "Automated entry", "Signal fires. Entry price is pre-set. Stop-loss and take-profit already calculated. Copy the exact setup in 30 seconds."],
              ["03", "Verified results", "Check our public track record anytime. Every win, every loss. No hidden signals. No cherry-picked data. Pure math."],
            ].map(([num, title, body]) => (
              <div key={num}>
                <span className="text-[13px] font-bold tracking-[0.18em] text-gradient-accent">{num}</span>
                <h4 className="mt-2 text-[18px] font-bold tracking-tight text-ink">{title}</h4>
                <p className="mt-2 text-ink-2 text-[15px] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 - HOW IT WORKS */}
      <section id="how-it-works" className="relative py-24 md:py-28 border-b border-line reveal-left">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-left mb-14 max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-4 text-[34px] md:text-[46px] font-semibold tracking-[-0.03em] text-gradient leading-[1.06]">
              Get alerts. Trade. Profit.
            </h2>
            <p className="mt-4 text-ink-2 text-[16px] md:text-[17px] leading-relaxed">
              Three simple steps from signal to execution. No analysis paralysis. No watching charts all day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Constant watch",
                body: "Our system monitors the market 24/7. When it identifies a high-probability trading opportunity, you're the first to know. No missed entries while you sleep.",
                icon: <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />,
              },
              {
                num: "02",
                title: "Clear reasoning",
                body: "Every signal comes with a clear explanation of why this is a good trade opportunity. You understand the setup before you commit your money.",
                icon: <path d="M12 2a7 7 0 00-4 12.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2zm-3 19a1 1 0 001 1h4a1 1 0 001-1v-1H9v1z" />,
              },
              {
                num: "03",
                title: "Instant alert",
                body: "Signal fires and you get notified immediately on Telegram or your dashboard. Trade setup ready to copy. Act fast or wait for the next one.",
                icon: <path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22zm7-6v-5a7 7 0 00-5.5-6.84V3.5a1.5 1.5 0 00-3 0v.66A7 7 0 005 11v5l-1.7 1.7a1 1 0 00.7 1.3h16a1 1 0 00.7-1.3L19 16z" />,
              },
            ].map((c) => (
              <div
                key={c.num}
                className="card card-interactive p-8 flex flex-col justify-between gap-10 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white flex items-center justify-center shadow-[0_8px_24px_-10px_rgba(79,107,255,0.9)]">
                    <svg className="w-[19px] h-[19px] fill-current" viewBox="0 0 24 24">
                      {c.icon}
                    </svg>
                  </div>
                  <span className="text-[28px] font-semibold tracking-tight text-white/15 group-hover:text-white/25 transition-colors">
                    {c.num}
                  </span>
                </div>
                <div>
                  <h3 className="text-[20px] font-bold tracking-tight text-ink mb-3">{c.title}</h3>
                  <p className="text-ink-2 text-[15px] leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 - AI EXPLAINABILITY SHOWCASE */}
      <section id="explainability" className="relative py-24 md:py-28 border-b border-line mesh-glow-soft reveal-on-scroll">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* Left Side: Accordion */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full">
            <div>
              <span className="eyebrow">Sanddock platform</span>
              <h2 className="mt-4 mb-10 text-[34px] md:text-[46px] font-semibold tracking-[-0.03em] text-gradient leading-[1.06]">
                Every signal,
                <br />
                <span className="text-gradient-accent">explained.</span>
              </h2>

              {/* Accordion list */}
              <div className="divide-y divide-white/8 border-t border-white/8">
                {featureAccordions.map((feat, idx) => {
                  const isActive = activeFeatureIndex === idx;
                  return (
                    <div key={idx} className={`py-1 transition-colors ${isActive ? "bg-white/[0.02]" : ""}`}>
                      <button
                        onClick={() => handleFeatureAccordionClick(idx)}
                        className={`w-full text-left flex items-center justify-between gap-4 py-4 px-1 font-semibold text-[16px] transition-colors ${
                          isActive ? "text-ink" : "text-ink-2 hover:text-ink"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`w-1 h-5 rounded-full transition-all ${
                              isActive ? "bg-gradient-to-b from-accent to-accent-2" : "bg-white/10"
                            }`}
                          />
                          {feat.title}
                        </span>
                        <span
                          className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[13px] transition-all ${
                            isActive
                              ? "border-accent/40 bg-accent/15 text-accent-soft rotate-180"
                              : "border-white/12 text-ink-3"
                          }`}
                        >
                          {isActive ? "\u2212" : "+"}
                        </span>
                      </button>

                      {isActive && (
                        <p className="text-ink-2 text-[15px] leading-relaxed pb-5 pl-4 pr-8">
                          {feat.desc}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Side: Terminal mockup */}
          <div className="lg:col-span-7 w-full">
            <div className="card-gradient-border p-px shadow-[0_30px_80px_-30px_rgba(79,107,255,0.45)]">
            <div className="bg-[#080b14] rounded-[17px] p-6 relative overflow-hidden text-white flex flex-col justify-between min-h-[480px]">

              <div>
                {/* Header inside mockup */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 text-xs font-semibold text-ink-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-2 text-ink-2 text-[10px] tracking-[0.14em] uppercase">Sanddock Active Terminal</span>
                  </div>
                  <span className="text-[10px] text-accent-soft bg-accent/15 border border-accent/25 px-2 py-0.5 rounded-md font-bold">
                    {activeSignal.timeframe}
                  </span>
                </div>

                {/* Grid content inside mockup */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* SVG Line & Bar Chart (7 cols) */}
                  <div className="md:col-span-7 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{activeSignal.coin}</h4>
                        <span className="text-[9px] text-ink-2">Price Movement Chart</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#00e676] bg-[#00e676]/15 px-2 py-0.5 rounded-none">
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
                                className="text-[8px] font-bold"
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
                        <span className="bg-[#080d1a] px-1 text-[7px] text-[#00e676] tracking-wider font-bold">TP TARGET ({activeSignal.tp})</span>
                      </div>

                      {/* Entry Price Line */}
                      <div className="absolute left-0 right-10 border-t border-dashed border-white/30 top-[50%] z-20 pointer-events-none flex items-center justify-between pl-2">
                        <span className="bg-[#080d1a] px-1 text-[7px] text-white/50 tracking-wider font-bold">ENTRY PRICE ({activeSignal.price})</span>
                      </div>

                      {/* Stop Loss Target Line */}
                      <div className="absolute left-0 right-10 border-t border-dashed border-signal-sell/40 top-[80%] z-20 pointer-events-none flex items-center justify-between pl-2">
                        <span className="bg-[#080d1a] px-1 text-[7px] text-signal-sell tracking-wider font-bold">STOP LOSS ({activeSignal.sl})</span>
                      </div>

                      {/* Y-Axis Price Panel (Right aligned) */}
                      <div className="absolute right-0 top-0 bottom-6 w-10 border-l border-white/10 flex flex-col justify-between items-center py-2 text-[7px] text-ink-3 bg-black/20 pointer-events-none">
                        <span>$71k</span>
                        <span>$69k</span>
                        <span>$67k</span>
                        <span>$65k</span>
                      </div>

                      {/* X-Axis Time Panel (Bottom aligned) */}
                      <div className="absolute bottom-0 left-0 right-10 h-6 border-t border-white/10 flex justify-between items-center px-4 text-[7px] text-ink-3 bg-black/20 pointer-events-none">
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
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-none ${
                            activeSignal.type === "BUY" ? "bg-[#00e676]/15 text-[#00e676]" : "bg-signal-sell/15 text-signal-sell"
                          }`}>
                            {activeSignal.type}
                          </span>
                          <span className="text-[9px] text-ink-3">{activeSignal.time}</span>
                        </div>

                        <h4 className="text-xs font-bold text-white">{activeSignal.coin}</h4>

                        <div className="grid grid-cols-3 gap-1 my-2">
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-ink-3 font-bold">ENTRY</span>
                            <span className="text-[8px] text-white font-bold">{activeSignal.price}</span>
                          </div>
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-ink-3 font-bold">STOP LOSS</span>
                            <span className="text-[8px] text-signal-sell font-bold">{activeSignal.sl}</span>
                          </div>
                          <div className="bg-black/50 p-1.5 rounded-none border border-white/5">
                            <span className="block text-[6px] text-ink-3 font-bold">TAKE PROFIT</span>
                            <span className="text-[8px] text-[#00e676] font-bold">{activeSignal.tp}</span>
                          </div>
                        </div>

                        {/* Confidence score */}
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-[7px] font-bold text-ink-2">
                            <span>CONFIDENCE</span>
                            <span className="text-white">{activeSignal.confidence}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1 rounded-none overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent to-accent-2 rounded-full transition-all duration-500"
                              style={{ width: `${activeSignal.confidence}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[7px] text-ink-3 font-bold tracking-wider uppercase mb-1">AI Rationale & Strategy</span>
                        <p className="text-[9px] text-ink-2 leading-relaxed line-clamp-3">
                          {activeSignal.rationale}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Terminal Log Console */}
              <div className="mt-6 pt-4 border-t border-white/10 text-[10px] space-y-2 text-left">
                <div className="flex items-center justify-between text-[9px] font-bold text-ink-3 uppercase tracking-[0.16em] mb-1">
                  <span>System console logs</span>
                  <span className="flex items-center gap-1.5 text-up">
                    <span className="relative flex w-1.5 h-1.5">
                      <span className="absolute inline-flex w-full h-full rounded-full bg-up opacity-70 animate-ping" />
                      <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-up" />
                    </span>
                    Live connection
                  </span>
                </div>
                <div className="space-y-1 bg-black/50 p-3 rounded-lg border border-white/6 h-[86px] overflow-y-auto scrollbar-dark leading-relaxed text-ink-3">
                  <div className="text-up">&gt; [14:30:00] Initializing Sanddock Core Signal Engine v1.1.2...</div>
                  <div>&gt; [14:30:02] Connecting to Binance WebSockets... Status: 101 Switch Protocols</div>
                  <div>&gt; [14:30:05] Scanners active across 52 trading pairs. Monitoring 15m and 1h timeframes.</div>
                  {activeSignal.type === "BUY" ? (
                    <div className="text-up font-bold">&gt; [14:30:10] SIGNAL TRIGGERED: BUY {activeSignal.coin} @ {activeSignal.price} (Confidence: {activeSignal.confidence}%)</div>
                  ) : (
                    <div className="text-down font-bold">&gt; [14:30:10] SIGNAL TRIGGERED: SELL {activeSignal.coin} @ {activeSignal.price} (Confidence: {activeSignal.confidence}%)</div>
                  )}
                  <div className="text-ink-2">&gt; [14:30:12] Generating AI Rationale description blocks... Done.</div>
                </div>
              </div>

            </div>
            </div>
          </div>

        </div>
        </div>
      </section>

      {/* SECTION 6 - COIN UNLOCKS */}
      <section className="relative py-24 md:py-28 border-b border-line reveal-right">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-left mb-14 max-w-2xl">
          <span className="eyebrow">Coin unlocks</span>
          <h2 className="mt-4 text-[34px] md:text-[46px] font-semibold tracking-[-0.03em] text-gradient leading-[1.06]">
            Sanddock has got you covered
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

          {/* Card 1: Free */}
          <div className="card card-interactive p-8 flex flex-col gap-8">
            <div>
              <span className="chip mb-5">Free - no card needed</span>
              <h3 className="text-[26px] font-bold tracking-tight text-ink max-w-sm leading-tight">
                Start swing trading with Bitcoin
              </h3>
              <p className="mt-3 text-ink-2 text-[15px] leading-relaxed">
                Your free plan gives you real, live AI signals on the world&apos;s most traded cryptocurrency - forever. No credit card. No expiry. Just signals.
              </p>
            </div>

            {/* Visual: BTC unlocked, others locked */}
            <div className="space-y-3 pt-6 border-t border-white/8 mt-auto">
              <div className="flex items-center gap-3 rounded-xl bg-surface-3/60 border border-white/10 p-3 w-max">
                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#f7931a]/25 to-[#f7931a]/10 border border-[#f7931a]/30 text-[#f7931a] flex items-center justify-center text-[15px] font-bold">₿</span>
                <div>
                  <span className="block text-[13px] font-semibold text-ink">BTC/USDT</span>
                  <span className="text-[10px] text-up uppercase tracking-[0.12em] font-bold">Unlocked · Free</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {["ETH", "SOL", "BNB", "ADA"].map((coin) => (
                  <div key={coin} className="rounded-lg bg-surface-2/50 border border-white/6 p-2.5 text-center relative overflow-hidden">
                    <span className="text-[12px] font-semibold text-ink-3 block blur-[2.5px] select-none">{coin}</span>
                    <span className="absolute inset-0 flex items-center justify-center gap-1 text-[9px] text-ink-3 font-bold uppercase tracking-[0.12em] bg-surface-2/70 backdrop-blur-[1px]">
                      <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                      Pro
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <CtaSecondary href={user ? "/terminal" : "/signup"} className="w-full justify-center">
              {user ? "Go to Terminal" : "Get free BTC signals"}
            </CtaSecondary>
          </div>

          {/* Card 2: Pro & Master */}
          <div className="card-gradient-border p-px">
            <div className="rounded-[17px] bg-surface-2/70 backdrop-blur-xl p-8 flex flex-col gap-8 h-full relative overflow-hidden">
              <div className="pointer-events-none absolute -bottom-28 -right-20 w-64 h-64 rounded-full bg-accent-2/16 blur-3xl" />
              <div className="relative">
                <span className="chip chip-accent mb-5">Pro &amp; Master plans</span>
                <h3 className="text-[26px] font-bold tracking-tight text-ink max-w-sm leading-tight">
                  Unlock 50+ altcoins on the market
                </h3>
                <p className="mt-3 text-ink-2 text-[15px] leading-relaxed">
                  Upgrade to unlock real-time AI signals across the top 50 cryptocurrencies by market cap - ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, and dozens more. New coins added monthly.
                </p>
              </div>

              {/* Visual: Unlocked coin grid */}
              <div className="relative pt-6 border-t border-white/8 mt-auto">
                <div className="grid grid-cols-4 gap-2">
                  {["ETH", "SOL", "BNB", "ADA", "AVAX", "XRP", "DOT", "LINK"].map((coin) => (
                    <div key={coin} className="rounded-lg bg-surface-3/60 border border-white/10 p-2.5 text-center transition-colors hover:border-accent/40">
                      <span className="text-[12px] font-semibold text-ink block">{coin}</span>
                      <span className="text-[8px] text-up uppercase tracking-[0.14em] font-bold block mt-0.5">Live</span>
                    </div>
                  ))}
                </div>
              </div>

              <CtaPrimary href="/pricing" className="relative w-full justify-between">
                Upgrade to Pro
              </CtaPrimary>
            </div>
          </div>

        </div>
        </div>
      </section>

      {/* SECTION 7 - SUCCESS STORIES */}
      <section className="relative py-24 md:py-28 border-b border-line overflow-hidden mesh-glow-soft reveal-scale">
        <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* Header with counter aligned right */}
        <div className="flex items-end justify-between gap-6 mb-14">
          <div className="text-left">
            <span className="eyebrow">Success stories</span>
            <h2 className="mt-4 text-[34px] md:text-[46px] font-semibold tracking-[-0.03em] text-gradient leading-[1.06]">
              What traders are saying
            </h2>
          </div>

          <div className="hidden sm:block text-[15px] font-semibold text-ink-3 select-none tabular-nums flex-shrink-0 pb-2">
            <span className="text-ink">{String(activeTestimonialIdx + 1).padStart(2, "0")}</span>
            <span className="mx-1.5 text-white/15">/</span>
            {String(testimonials.length - 1).padStart(2, "0")}
          </div>
        </div>

        {/* Horizontal slider */}
        <div className="relative w-full">
          <div
            className="flex gap-6 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeTestimonialIdx * 350}px)` }}
          >
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="card card-interactive w-[320px] md:w-[360px] p-7 flex flex-col justify-between h-[340px] flex-shrink-0 relative"
              >
                <div>
                  <span className="block text-[10px] font-bold text-accent-soft tracking-[0.16em] uppercase mb-5">
                    {t.category}
                  </span>

                  {/* Mixed weight segment quote */}
                  <p className="text-[16px] leading-relaxed">
                    {t.segments.map((seg, sIdx) => (
                      <span key={sIdx} className={seg.bold ? "font-bold text-ink" : "text-ink-2"}>
                        {seg.text}
                      </span>
                    ))}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-5 border-t border-white/8">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/40 to-accent-2/30 border border-white/10 flex items-center justify-center text-[12px] font-bold text-ink flex-shrink-0">
                    {t.author.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-[13.5px] font-semibold text-ink truncate">{t.author}</h4>
                    <span className="text-[12px] text-ink-3 truncate block">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Next slide button */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none md:-mr-3">
            <button
              onClick={nextTestimonial}
              aria-label="Next testimonial"
              className="w-14 h-14 rounded-full bg-surface-3/90 backdrop-blur-md border border-white/12 text-ink hover:border-accent/50 hover:text-accent-soft flex items-center justify-center pointer-events-auto transition-colors shadow-[0_16px_40px_-14px_rgba(0,0,0,0.9)]"
            >
              <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        </div>
      </section>

      {/* SECTION 8 - PUBLIC TRACK RECORD */}
      <section id="track-record" className="relative py-24 md:py-28 border-b border-line reveal-left">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12 items-end">
          <div className="lg:col-span-7 text-left">
            <span className="eyebrow">Radical transparency</span>
            <h2 className="mt-4 text-[34px] md:text-[46px] font-semibold tracking-[-0.03em] text-gradient leading-[1.06]">
              Wins &amp; losses.
              <br />
              <span className="text-gradient-accent">On the record.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 text-[16px] md:text-[17px] text-ink-2 leading-relaxed">
            Most crypto signal services show you screenshots of their best calls. We show you everything - wins, losses, breakevens, and open signals - in a public, timestamped ledger. No cherry-picking. No deleted signals. Just data.
          </div>
        </div>

        {/* Live indicator */}
        <div className="mb-5 text-[13px] text-ink-2 flex items-center gap-2.5">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-up opacity-70 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-up" />
          </span>
          Real-time data from our immutable ledger
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line rounded-2xl overflow-hidden border border-line mb-8">
          <div className="bg-surface-1/90 p-6 text-left">
            <span className="block text-[10px] font-bold text-ink-3 uppercase tracking-[0.16em] mb-2">Total signals</span>
            <span className="text-[30px] font-semibold text-ink tracking-tight">
              {isLoadingStats ? '-' : heroStats.total_signals.toLocaleString()}
            </span>
          </div>
          <div className="bg-surface-1/90 p-6 text-left">
            <span className="block text-[10px] font-bold text-ink-3 uppercase tracking-[0.16em] mb-2">Verified win rate</span>
            <span className="text-[30px] font-semibold text-up tracking-tight">
              {isLoadingStats ? '-' : heroStats.win_rate.toFixed(1)}%
            </span>
          </div>
          <div className="bg-surface-1/90 p-6 text-left">
            <span className="block text-[10px] font-bold text-ink-3 uppercase tracking-[0.16em] mb-2">Total PnL</span>
            <span className={`text-[30px] font-semibold tracking-tight ${heroStats.total_pnl >= 0 ? 'text-up' : 'text-down'}`}>
              {isLoadingStats ? '-' : (heroStats.total_pnl >= 0 ? '+' : '') + heroStats.total_pnl.toFixed(2)}%
            </span>
          </div>
          <div className="bg-surface-1/90 p-6 text-left">
            <span className="block text-[10px] font-bold text-ink-3 uppercase tracking-[0.16em] mb-2">Updated</span>
            <span className="text-[15px] font-semibold text-ink-2">
              {isLoadingStats ? '-' : new Date(heroStats.last_updated).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Table Preview */}
        <div className="card overflow-hidden mb-8 !rounded-2xl">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-ink-2">
            <span>Recent closed trades</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/8 text-ink-3 text-[10px] uppercase tracking-[0.14em] font-bold">
                  <th className="px-5 py-3.5 font-bold">Date</th>
                  <th className="px-5 py-3.5 font-bold">Pair</th>
                  <th className="px-5 py-3.5 font-bold">Type</th>
                  <th className="px-5 py-3.5 font-bold">Entry</th>
                  <th className="px-5 py-3.5 font-bold">Exit</th>
                  <th className="px-5 py-3.5 font-bold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6 text-[13px]">
                {isLoadingSignals ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-ink-3">
                      Loading signals…
                    </td>
                  </tr>
                ) : closedSignals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-ink-3">
                      No closed signals yet. Signals will appear here as trades close.
                    </td>
                  </tr>
                ) : (
                  closedSignals.map((sig, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4 text-ink-3 tabular-nums">{sig.date}</td>
                      <td className="px-5 py-4 font-semibold text-ink">{sig.pair}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex text-[10px] font-bold px-2 py-1 rounded-md border ${
                          sig.type === "BUY"
                            ? "bg-up/12 text-up border-up/25"
                            : "bg-down/12 text-down border-down/25"
                        }`}>
                          {sig.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-ink-2 tabular-nums">{sig.entry}</td>
                      <td className="px-5 py-4 text-ink-2 tabular-nums">{sig.exit}</td>
                      <td className={`px-5 py-4 font-bold tabular-nums ${sig.win ? "text-up" : "text-down"}`}>
                        <span className="inline-flex items-center gap-1.5">
                          {sig.result}
                          {sig.win ? (
                            <svg className="w-3 h-3 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="3">
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
            href="/track-record"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink-2 hover:text-accent-soft transition-colors group"
          >
            View complete track record with full performance analytics
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5" />
            </svg>
          </a>
        </div>
        </div>
      </section>

      {/* SECTION 9 - LIFETIME ACCESS SHOWCASE (GrandMaster Deal) */}
      <section id="pricing" className="relative py-24 md:py-28 border-b border-line reveal-on-scroll">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-left max-w-2xl mb-12">
          <span className="eyebrow">GrandMaster offer</span>
          <h2 className="mt-4 text-[34px] md:text-[46px] font-semibold tracking-[-0.03em] text-gradient leading-[1.06]">
            No recurring fees.
            <br />
            <span className="text-gradient-accent">Own it forever.</span>
          </h2>
          <p className="mt-4 text-ink-2 text-[16px] md:text-[17px] leading-relaxed">
            Skip the subscription model entirely. Lock in a single, one-time payment for permanent
            Master-tier capabilities, including all future updates and features without any compromises.
          </p>
        </div>

        {/* GrandMaster Centerpiece */}
        <div className="card-gradient-border p-px shadow-[0_30px_90px_-35px_rgba(139,92,246,0.6)]">
          <div className="relative rounded-[17px] bg-surface-2/80 backdrop-blur-xl p-8 md:p-11 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-9 overflow-hidden">
            <div className="pointer-events-none absolute -top-32 right-10 w-80 h-80 rounded-full bg-accent-2/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-10 w-72 h-72 rounded-full bg-accent/14 blur-3xl" />

            <div className="relative text-left max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-white text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_8px_24px_-10px_rgba(139,92,246,0.9)]">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
                </svg>
                GrandMaster lifetime spot
              </div>

              <h3 className="mt-5 text-[28px] md:text-[34px] font-semibold tracking-[-0.03em] text-ink leading-tight">
                GrandMaster Lifetime Access
              </h3>
              <p className="mt-3 text-ink-2 text-[15px] md:text-[16px] leading-relaxed">
                Get permanent Master-level access to Sanddock forever with a single one-time payment.
                This includes all future features, altcoins, API webhooks, and core logic upgrades
                without any compromise or recurring fees.
              </p>

              {/* Scarcity meter */}
              <div className="mt-6 max-w-sm">
                <div className="flex items-center justify-between text-[12px] font-semibold mb-2">
                  <span className="inline-flex items-center gap-1.5 text-accent-soft">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14a8 8 0 1016 0c0-4.1-1.97-7.75-5.03-10.05L13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
                    </svg>
                    312 of 500 spots claimed
                  </span>
                  <span className="text-ink-3 tabular-nums">62%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-accent to-accent-2" />
                </div>
              </div>
            </div>

            <CtaPrimary href="/pricing" className="relative flex-shrink-0">
              Get lifetime access
            </CtaPrimary>
          </div>
        </div>
        </div>
      </section>

      {/* SECTION 10 - FAQ SECTION */}
      <section id="faq" className="relative py-24 md:py-28 border-b border-line reveal-right">
        <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="text-left mb-12">
          <span className="eyebrow">FAQ</span>
          <h2 className="mt-4 text-[34px] md:text-[46px] font-semibold tracking-[-0.03em] text-gradient leading-[1.06]">
            Everything you need to know
          </h2>
        </div>

        {/* Accordions */}
        <div className="divide-y divide-white/8 border-y border-white/8">
          {faqItems.map((item, idx) => {
            const isOpen = !!openFAQ[idx];
            return (
              <div key={idx}>
                <button
                  onClick={() => toggleFAQ(idx)}
                  aria-expanded={isOpen}
                  className={`w-full text-left flex items-center justify-between gap-6 py-5 text-[16px] font-semibold transition-colors ${
                    isOpen ? "text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  <span className="">{item.q}</span>
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-[14px] transition-all ${
                      isOpen
                        ? "border-accent/40 bg-accent/15 text-accent-soft"
                        : "border-white/12 text-ink-3"
                    }`}
                  >
                    {isOpen ? "\u2212" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="text-ink-2 text-[15px] leading-relaxed pb-6 pr-10 max-w-3xl">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </section>

      {/* SECTION 11 - FINAL CTA BANNER */}
      <section className="relative py-24 md:py-28 reveal-scale">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="card-gradient-border p-px shadow-[0_40px_100px_-40px_rgba(79,107,255,0.7)]">
          <div className="relative rounded-[17px] bg-surface-1/85 backdrop-blur-xl px-8 py-14 md:px-14 md:py-20 text-left overflow-hidden grain">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute -top-40 -right-20 w-[420px] h-[420px] rounded-full bg-accent-2/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-accent/18 blur-3xl" />

            <div className="max-w-2xl relative z-10">
              <h2 className="text-[34px] md:text-[52px] font-semibold tracking-[-0.035em] text-gradient leading-[1.05]">
                Your next trade deserves{" "}
                <span className="text-gradient-accent">a reason.</span>
              </h2>
              <p className="mt-5 text-ink-2 text-[16px] md:text-[18px] leading-relaxed max-w-lg">
                Join traders who get AI-powered Buy and Sell signals with a verified public track record.
                Start free on Bitcoin. No card needed.
              </p>
              <div className="flex flex-wrap gap-3 mt-9">
                <CtaPrimary href={user ? "/terminal" : "/signup"}>
                  {user ? "Go to Terminal" : "Get free signals"}
                </CtaPrimary>
                <CtaSecondary href="/track-record">View track record</CtaSecondary>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />

      {/* POPUP MODAL GATE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <div
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
          />

          {/* Modal Container */}
          <div className="card-gradient-border p-px relative w-full max-w-md z-10 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95)] animate-slide-up">
            <div className="rounded-[17px] bg-surface-2/95 backdrop-blur-xl p-8 space-y-6 text-left relative overflow-hidden">
              <div className="pointer-events-none absolute -top-24 -right-16 w-56 h-56 rounded-full bg-accent/18 blur-3xl" />

              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="absolute top-4 right-4 w-8 h-8 rounded-lg text-ink-3 hover:text-ink hover:bg-white/8 transition-colors flex items-center justify-center z-10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="relative space-y-2.5">
                <span className="eyebrow">Sanddock gateway</span>
                <h3 className="text-[24px] font-bold tracking-tight text-ink pr-8">{modalContent.title}</h3>
                <p className="text-ink-2 text-[14px] leading-relaxed">
                  {modalContent.body}
                </p>
              </div>

              {/* Email input inside modal */}
              <div className="relative space-y-2">
                <label className="block text-[11px] font-bold text-ink-3 uppercase tracking-[0.14em]">Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full bg-surface-0/70 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>

              <div className="relative flex gap-3 pt-1">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-medium text-[#0a0400] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
                >
                  Proceed
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-3 rounded-full text-[15px] font-medium text-white/70 hover:text-white hover:bg-white/5 border border-white/12 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
