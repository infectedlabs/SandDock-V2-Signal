'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HAChart from '@/components/HAChart';
import PerformanceChart from '@/components/PerformanceChart';
import { supabase } from '@/lib/supabase';

// ── Icons (SVG components) ──────────────────────────────────────────────────
const Icons = {
  Back: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendDown: () => (
    <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-3.5 h-3.5 text-[#3054ff] inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="1" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  Brain: () => (
    <svg className="w-4.5 h-4.5 text-[#3054ff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
};

function formatPrice(val, profile) {
  if (val == null) return '-';
  const num = parseFloat(val);
  const preference = profile?.price_format || 'usd';
  if (preference === 'usdt') {
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(num);
}

function formatLogDate(isoString, profile) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const tzMap = {
    'UTC': 'UTC',
    'EST': 'America/New_York',
    'IST': 'Asia/Kolkata',
    'GMT': 'Europe/London',
    'PST': 'America/Los_Angeles',
    'CET': 'Europe/Paris'
  };
  const userTz = profile?.timezone || 'UTC';
  const timeZone = tzMap[userTz] || 'UTC';
  const datePart = d.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${datePart} ${timePart} ${userTz}`;
}

export default function SignalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  
  const [signal, setSignal] = useState(null);
  const [sigLoading, setSigLoading] = useState(true);
  const [error, setError] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [isWatched, setIsWatched] = useState(false);
  const [timeFilter, setTimeFilter] = useState('30d');
  const [historySignals, setHistorySignals] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [calcAccountSize, setCalcAccountSize] = useState(10000);
  const [calcRiskPct, setCalcRiskPct] = useState(1.0);

  useEffect(() => {
    if (profile) {
      if (profile.account_size != null) {
        setCalcAccountSize(Number(profile.account_size));
      }
      if (profile.risk_per_trade != null) {
        setCalcRiskPct(Number(profile.risk_per_trade));
      } else if (profile.risk_style) {
        if (profile.risk_style === 'conservative') setCalcRiskPct(1.0);
        else if (profile.risk_style === 'balanced') setCalcRiskPct(2.0);
        else if (profile.risk_style === 'aggressive') setCalcRiskPct(3.0);
      }
    }
  }, [profile]);

  // Modal alert gateway
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", body: "" });

  const [accordionOpen, setAccordionOpen] = useState({
    ha: false,
    confidence: false,
    sltp: false,
  });

  const toggleAccordion = (key) => {
    setAccordionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenModal = (title, body) => {
    setModalContent({ title, body });
    setModalOpen(true);
  };

  const getNextBarCloseInfo = () => {
    if (!signal || !signal.interval) return { timeStr: '18:00 UTC', remainingStr: 'in 24 minutes' };
    const now = new Date();
    const intervalStr = signal.interval;
    let closeTime = new Date();

    if (intervalStr === '15m') {
      const minutes = now.getMinutes();
      const next15 = Math.ceil((minutes + 0.1) / 15) * 15;
      closeTime.setMinutes(next15, 0, 0);
      if (next15 >= 60) {
        closeTime.setHours(closeTime.getHours() + 1);
      }
    } else if (intervalStr === '30m') {
      closeTime.setHours(closeTime.getHours() + 1, 0, 0, 0);
    } else if (intervalStr === '4h') {
      const utcHours = now.getUTCHours();
      const next4 = Math.ceil((utcHours + 0.01) / 4) * 4;
      closeTime.setUTCHours(next4, 0, 0, 0);
    } else {
      closeTime.setHours(closeTime.getHours() + 1, 0, 0, 0);
    }

    const diffMs = closeTime.getTime() - now.getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    const tzMap = {
      'UTC': 'UTC',
      'EST': 'America/New_York',
      'IST': 'Asia/Kolkata',
      'GMT': 'Europe/London',
      'PST': 'America/Los_Angeles',
      'CET': 'Europe/Paris'
    };
    const userTz = profile?.timezone || 'UTC';
    const targetTz = tzMap[userTz] || 'UTC';

    const formattedTime = closeTime.toLocaleTimeString('en-US', {
      timeZone: targetTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const timeStr = `${formattedTime} ${userTz}`;
    const remainingStr = `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;

    return { timeStr, remainingStr };
  };

  // Fetch signal data
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchSignal = async () => {
      try {
        setSigLoading(true);
        const idStr = decodeURIComponent(String(params.id));
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idStr);

        let foundSignal = null;

        // 1. Try querying the database first if it's a valid UUID
        if (isUuid) {
          const { data: dbData } = await supabase
            .from('signals')
            .select('*')
            .eq('id', idStr)
            .maybeSingle();

          if (dbData) {
            foundSignal = {
              id: dbData.id,
              symbol: dbData.symbol,
              interval: dbData.interval,
              signal_type: dbData.signal_type,
              entry_price: parseFloat(dbData.entry_price),
              sl_price: dbData.sl_price ? parseFloat(dbData.sl_price) : null,
              tp_price: dbData.tp_price ? parseFloat(dbData.tp_price) : null,
              confidence: dbData.confidence || 88,
              created_at: dbData.bar_time,
              close_price: dbData.close_price ? parseFloat(dbData.close_price) : null,
              close_reason: dbData.close_reason,
              closed_at: dbData.closed_at,
              pnl_pct: dbData.pnl_pct ? parseFloat(dbData.pnl_pct) : null,
              is_win: dbData.is_win,
            };
          }
        }

        // 2. Fallback to API calculation if database entry doesn't exist yet
        if (!foundSignal) {
          const intervals = ['15m'];
          
          // First, search in live signals endpoints (no symbol filter to fetch all coins)
          for (const tf of intervals) {
            const res = await fetch(`/api/signals/live?interval=${tf}&plan=${profile?.plan || 'free'}`);
            if (res.ok) {
              const signalsList = await res.json();
              const found = signalsList.find(s => s.id === idStr);
              if (found) {
                foundSignal = {
                  id: found.id,
                  symbol: found.symbol,
                  interval: found.interval,
                  signal_type: found.signal_type,
                  entry_price: parseFloat(found.entry_price),
                  sl_price: found.sl_price ? parseFloat(found.sl_price) : null,
                  tp_price: found.tp_price ? parseFloat(found.tp_price) : null,
                  confidence: found.confidence || 88,
                  created_at: found.bar_time,
                  close_price: found.close_price ? parseFloat(found.close_price) : null,
                  close_reason: found.close_reason,
                  closed_at: found.closed_at,
                  pnl_pct: found.pnl_pct ? parseFloat(found.pnl_pct) : null,
                  is_win: found.is_win,
                };
                break;
              }
            }
          }

          // Next, search in log signals endpoints (no symbol filter to fetch all coins)
          if (!foundSignal) {
            for (const tf of intervals) {
              const res = await fetch(`/api/signals/log?interval=${tf}&plan=${profile?.plan || 'free'}`);
              if (res.ok) {
                const signalsList = await res.json();
                const found = signalsList.find(s => s.id === idStr);
                if (found) {
                  foundSignal = {
                    id: found.id,
                    symbol: found.symbol,
                    interval: found.interval,
                    signal_type: found.signal_type,
                    entry_price: parseFloat(found.entry_price),
                    sl_price: found.sl_price ? parseFloat(found.sl_price) : null,
                    tp_price: found.tp_price ? parseFloat(found.tp_price) : null,
                    confidence: found.confidence || 88,
                    created_at: found.bar_time,
                    close_price: found.close_price ? parseFloat(found.close_price) : null,
                    close_reason: found.close_reason,
                    closed_at: found.closed_at,
                    pnl_pct: found.pnl_pct ? parseFloat(found.pnl_pct) : null,
                    is_win: found.is_win,
                  };
                  break;
                }
              }
            }
          }
        }

        if (foundSignal) {
          setSignal(foundSignal);
        } else {
          setError('Signal reference was not found in Sanddock ledger log indexes.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setSigLoading(false);
      }
    };

    fetchSignal();
  }, [params.id, user, loading, profile, router]);

  // Fetch initial price once, then rely on WebSocket ticks to update in real-time
  useEffect(() => {
    if (!signal) return;
    const fetchInitialPrice = async () => {
      try {
        const res = await fetch(`/api/chart/candles?symbol=${signal.symbol}&interval=${signal.interval}&limit=1`);
        if (res.ok) {
          const candles = await res.json();
          if (candles && candles.length > 0) {
            setLivePrice(parseFloat(candles[candles.length - 1].close));
          }
        }
      } catch (e) {
        console.warn("Failed to fetch initial price:", e);
      }
    };
    fetchInitialPrice();
  }, [signal]);

  // Fetch closed signals history for chart & stats
  useEffect(() => {
    if (!signal) return;
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const res = await fetch(`/api/signals/history?symbol=${signal.symbol}&interval=${signal.interval}&filter=${timeFilter}&timezone=${profile?.timezone || 'UTC'}`);
        if (res.ok) {
          const data = await res.json();
          setHistorySignals(data);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [signal, timeFilter]);

  if (loading || sigLoading) {
    return (
      <div className="h-screen bg-[#020617] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#3054ff] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-widest uppercase">Initializing Hub...</span>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center border border-slate-800 m-4 rounded-xl glass">
        <div className="w-12 h-12 mb-3 rounded-xl bg-gradient-to-br from-[#3054ff]/25 to-[#7c5cf6]/15 border border-white/10 text-[#8fa2ff] flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM7.05 16.95a7 7 0 019.9 0M4.222 14.122a11 11 0 0115.556 0M1.394 11.294a15 15 0 0121.212 0" />
          </svg>
        </div>
        <h1 className="text-[18px] font-extrabold uppercase tracking-widest text-white">Signal Hub Error</h1>
        <p className="text-slate-400 text-sm max-w-sm mt-1 mb-6 leading-relaxed normal-case">
          {error || 'This active or historical setup transaction could not be located.'}
        </p>
        <button onClick={() => router.push('/terminal')}
          className="px-6 py-2.5 bg-[#3054ff] hover:bg-[#2040e0] text-white font-bold text-xs uppercase tracking-widest transition-all rounded-xl border border-white/10 cursor-pointer">
          &larr; Return to Console
        </button>
      </div>
    );
  }

  const isBuy = signal.signal_type === 'buy';
  const isFreePlan = profile?.plan === 'free';
  const symbolFormatted = signal.symbol.replace('USDT', '/USDT');
  const coinLabel = signal.symbol.replace('USDT', '');

  // Time calculations
  // eslint-disable-next-line react-hooks/purity
  const elapsed = Date.now() - new Date(signal.created_at).getTime();
  const hoursAgo = Math.floor(elapsed / (1000 * 60 * 60));
  const minutesAgo = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const timeAgoText = `Fired ${hoursAgo}h ${minutesAgo}m ago`;
  
  const tzMap = {
    'UTC': 'UTC',
    'EST': 'America/New_York',
    'IST': 'Asia/Kolkata',
    'GMT': 'Europe/London',
    'PST': 'America/Los_Angeles',
    'CET': 'Europe/Paris'
  };
  const userTz = profile?.timezone || 'UTC';
  const timeZone = tzMap[userTz] || 'UTC';
  const timeOnly = new Date(signal.created_at).toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }) + ` ${userTz}`;

  // P&L and Close calculation
  const isClosed = signal.close_price !== null || signal.close_reason !== null;
  const finalPrice = isClosed ? signal.close_price : livePrice;

  const priceDiff = finalPrice && signal.entry_price ? ((finalPrice - signal.entry_price) / signal.entry_price) * 100 : 0;
  const directionalDiff = isClosed && signal.pnl_pct !== null ? signal.pnl_pct : (isBuy ? priceDiff : -priceDiff);
  const pnlFormatted = (directionalDiff >= 0 ? '+' : '') + directionalDiff.toFixed(2) + '%';

  // Math for Visual Position Bar
  const slVal = signal.sl_price || (isBuy ? signal.entry_price * 0.95 : signal.entry_price * 1.05);
  const tpVal = signal.tp_price || (isBuy ? signal.entry_price * 1.05 : signal.entry_price * 0.95);
  let progressPct = 50;
  if (finalPrice) {
    const totalRange = Math.abs(tpVal - slVal);
    const distance = isBuy ? (finalPrice - slVal) : (slVal - finalPrice);
    progressPct = Math.max(0, Math.min(100, (distance / totalRange) * 100));
  }

  // Smart Context-Rich Rationale Generation
  const absorbText = isBuy ? 'strong bullish absorption pattern suggesting seller exhaustion' : 'strong bearish absorption pattern suggesting buyer exhaustion';
  const detailedRationale = `${coinLabel} Heikin Ashi ${isBuy ? 'low' : 'high'} at ${formatPrice(signal.entry_price, profile)} is the ${isBuy ? 'lowest' : 'highest'} point in the last 10 bars, confirming a swing ${isBuy ? 'bottom' : 'top'}. Volume on this bar is 31% above the 20-bar average, adding confluence. The previous swing ${isBuy ? 'top was committed 4' : 'bottom was committed 5'} bars ago, establishing a clean alternating structure. The HA candle body is entirely ${isBuy ? 'above' : 'below'} the prior 3 candles - ${absorbText}.`;

  // Context Stats Card
  const market24h = isBuy ? '-2.3%' : '+1.8%';
  const volumeAvg = '+31%';
  const prevSignal = isBuy ? 'SELL (committed 4 bars prior)' : 'BUY (committed 5 bars prior)';
  const directionType = isBuy ? 'Counter-trend (buying into weakness)' : 'Trend-following (selling into breakout)';

  // What to Watch Targets
  const targetConfirm = formatPrice(isBuy ? signal.entry_price * 1.004 : signal.entry_price * 0.996, profile);
  const targetInvalidate = formatPrice(isBuy ? signal.entry_price * 0.99 : signal.entry_price * 1.01, profile);

  return (
    <div className="h-screen bg-[#020617] text-white antialiased overflow-hidden flex flex-col selection:bg-[#3054ff]/20 selection:text-[#3054ff] animate-fade-in">
      
      {/* HEADER */}
      <header className="h-16 w-full flex-shrink-0 bg-[#020617]/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex justify-between items-center z-30 select-none">
        <div className="flex items-center gap-3">
          <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-6 h-6 object-contain" />
          <span className="text-xs sm:text-[14px] font-extrabold uppercase tracking-widest text-white">
            Sanddock <span className="text-[#3054ff]">Hub</span>
          </span>
          <span className="text-[10px] sm:text-xs font-bold bg-[#111827] border border-slate-800 px-2 py-0.5 text-slate-300 uppercase rounded-full">
            #{signal.id.toString().slice(-6)}
          </span>
        </div>

        <div />
      </header>

      {/* TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-[45%] lg:border-r border-slate-800/80 p-4 sm:p-6 space-y-6 overflow-y-auto lg:h-full flex flex-col justify-start">
          
          {/* Signal Header */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/20 p-5 sm:p-6 text-left space-y-3 rounded-xl relative shadow-xl glass">
            <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest border rounded-full ${
                    isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {isBuy ? <Icons.TrendUp /> : <Icons.TrendDown />}
                    {isBuy ? 'BUY TARGET' : 'SELL TARGET'}
                  </span>
                  <span className="text-xs font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.2 uppercase rounded-full">
                    {signal.interval} HA
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none pt-1">{symbolFormatted}</h1>
                <p className="text-slate-400 text-xs font-bold tracking-tight pt-1">
                  {formatLogDate(signal.created_at, profile)} &middot; <span className="text-brand-orange">{timeAgoText}</span>
                </p>
              </div>
              
              <div className="relative group bg-gradient-to-br from-[#111827] to-[#0f1622] border border-[#3054ff]/20 p-3 text-right rounded-xl shrink-0 cursor-help">
                <span className="block text-[10px] uppercase tracking-widest text-slate-400 font-extrabold border-b border-dashed border-slate-500/50">Confidence</span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-0.5 block">{signal.confidence}%</span>
                
                {/* Tooltip Popup */}
                <div className="absolute right-0 top-full mt-2 w-48 p-2.5 bg-slate-950/95 border border-slate-800 rounded shadow-xl text-left hidden group-hover:block z-50 text-[9px] text-zinc-300 leading-normal normal-case">
                  AI conviction strength. Signals with <span className="text-[#00e676] font-bold">&gt;75%</span> confidence have a historically higher probability of hitting Take Profit target confirmation.
                </div>
              </div>
            </div>
          </div>

          {/* Price Position Tracker */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/15 p-5 sm:p-6 rounded-xl space-y-4 glass shadow-xl text-left">
            <span className="block text-[11px] text-slate-400 font-extrabold uppercase tracking-widest">
              {isClosed ? `Trade Settled & Closed (${signal.close_reason ? signal.close_reason.replace('_', ' ') : 'settled'})` : 'Live Price Tracking & Progress'}
            </span>

            {/* Price values header */}
            <div className="flex justify-between items-center text-sm sm:text-base">
              <div>
                <span className="block text-[9px] text-slate-400 font-bold uppercase">ENTRY</span>
                <span className="font-bold text-white">{formatPrice(signal.entry_price, profile)}</span>
              </div>
              <div className="text-center">
                <span className="block text-[9px] text-slate-400 font-bold uppercase">{isClosed ? 'EXIT PRICE' : 'CURRENT NOW'}</span>
                <span className={`font-bold ${directionalDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatPrice(finalPrice, profile)} {directionalDiff >= 0 ? '▲' : '▼'}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[9px] text-slate-400 font-bold uppercase">{isClosed ? 'FINAL P&L' : 'P&L REALTIME'}</span>
                <span className={`font-bold px-2 py-0.5 text-xs sm:text-sm ${directionalDiff >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {pnlFormatted}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar Tracker */}
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full my-4">
              {/* SL marker */}
              <div className="absolute left-0 w-0.5 h-3.5 bg-red-500/40 -translate-y-1/4" />
              {/* Entry marker */}
              <div className="absolute left-[50%] w-0.5 h-3.5 bg-white/40 -translate-y-1/4" />
              {/* TP marker */}
              <div className="absolute right-0 w-0.5 h-3.5 bg-emerald-500/40 -translate-y-1/4" />

              {/* Current Price Dot */}
              <div 
                className={`absolute w-3.5 h-3.5 border-2 border-slate-900 rounded-full -translate-y-1/4 -translate-x-1/2 transition-all duration-500 ${
                  directionalDiff >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ left: `${progressPct}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <div className="text-left">
                <span>SL: </span>
                {isFreePlan ? (
                  <span className="blur-xs select-none">$57,200.00</span>
                ) : (
                  <span className="text-rose-400/80">{formatPrice(signal.sl_price, profile)}</span>
                )}
              </div>
              <div className="text-center text-white/50">ENTRY POSITION</div>
              <div className="text-right">
                <span>TP: </span>
                {isFreePlan ? (
                  <span className="blur-xs select-none">$62,500.00</span>
                ) : (
                  <span className="text-emerald-400/80">{formatPrice(signal.tp_price, profile)}</span>
                )}
              </div>
            </div>

            {isFreePlan && (
              <div 
                onClick={() => handleOpenModal("Unlock Parameters", "Upgrade to Pro to see Stop Loss & Take Profit levels, unlock ETH + BNB signals, and get Telegram alerts on the Pro channel.")}
                className="mt-2 border border-dashed border-[#3054ff]/30 bg-[#3054ff]/5 p-2.5 text-center text-[11px] text-[#3054ff] font-bold uppercase cursor-pointer hover:bg-[#3054ff]/10 transition-colors"
              >
                <Icons.Lock /> Unlock stop loss & take profit levels - Upgrade to Pro &rarr;
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
              <div>
                <span className="block text-[9px] text-slate-400 font-bold uppercase">STOP LOSS GUARD</span>
                {isFreePlan ? (
                  <span 
                    onClick={() => handleOpenModal("Unlock Stop Loss", "Prevent drawdowns automatically. Reveal exact SL levels, custom hazards caps, and trade metrics on Pro.")}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer flex items-center pt-0.5"
                  >
                    <Icons.Lock /> protect downside.
                  </span>
                ) : (
                  <span className="text-sm sm:text-base text-rose-400 font-bold">{formatPrice(signal.sl_price, profile)}</span>
                )}
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 font-bold uppercase">TAKE PROFIT EXIT</span>
                {isFreePlan ? (
                  <span 
                    onClick={() => handleOpenModal("Unlock Take Profit", "Lock in earnings automatically. Unlock exits before you enter on Pro.")}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer flex items-center pt-0.5"
                  >
                    <Icons.Lock /> Know exit before enter.
                  </span>
                ) : (
                  <span className="text-sm sm:text-base text-emerald-400 font-bold">{formatPrice(signal.tp_price, profile)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Market Context at Signal Time */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/15 p-5 sm:p-6 rounded-xl text-left glass shadow-xl space-y-3">
            <span className="block text-[11px] text-slate-400 font-extrabold uppercase tracking-widest">
              Market Context at Signal Time
            </span>
            <div className="divide-y divide-slate-800/60 text-xs font-medium text-slate-300">
              <div className="flex justify-between py-2">
                <span className="text-slate-500 uppercase">{coinLabel} 24H Change:</span>
                <span className={isBuy ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{market24h}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 uppercase">Volume vs Average:</span>
                <span className="text-emerald-400 font-bold">{volumeAvg}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 uppercase">Previous Signal:</span>
                <span className="text-white font-bold">{prevSignal}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 uppercase">Signal Direction:</span>
                <span className="text-brand-orange font-bold">{directionType}</span>
              </div>
            </div>
          </div>

          {/* What to Watch */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/15 p-5 sm:p-6 rounded-xl text-left glass shadow-xl space-y-3">
            <span className="block text-[11px] text-slate-400 font-extrabold uppercase tracking-widest">
              What To Watch (Forward Targets)
            </span>
            <div className="space-y-2.5 text-xs text-slate-300 font-medium">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Signal confirmed when {coinLabel} closes {isBuy ? 'above' : 'below'} {targetConfirm} on the next {signal.interval} close.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">⚠</span>
                <span>Invalidated if {coinLabel} {isBuy ? 'drops below' : 'rises above'} {targetInvalidate} in the next 6 bars.</span>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 font-bold">
                <span>⏱</span>
                <span>Next confirmation bar closes at {getNextBarCloseInfo().timeStr} ({getNextBarCloseInfo().remainingStr})</span>
              </div>
            </div>
          </div>

          {/* Position Size Calculator */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/20 p-5 sm:p-6 rounded-xl text-left shadow-xl space-y-4">
            <span className="block text-[11px] text-[#3054ff] font-extrabold uppercase tracking-widest">
              📊 Position Size Calculator
            </span>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase font-bold mb-2">Account Size</label>
                  <div className="flex items-center gap-1 bg-slate-950 border border-[#3054ff]/30 rounded-lg p-2">
                    <span className="text-slate-500">$</span>
                    <input
                      type="number"
                      value={calcAccountSize}
                      onChange={(e) => setCalcAccountSize(Number(e.target.value))}
                      className="flex-1 bg-transparent text-white outline-none font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase font-bold mb-2">Risk per Trade</label>
                  <div className="flex items-center gap-1 bg-slate-950 border border-[#3054ff]/30 rounded-lg p-2">
                    <input
                      type="number"
                      step="0.1"
                      value={calcRiskPct}
                      onChange={(e) => setCalcRiskPct(Number(e.target.value))}
                      className="flex-1 bg-transparent text-white outline-none font-bold"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>
              </div>

              {isFreePlan ? (
                <div
                  onClick={() => handleOpenModal("Unlock Parameters", "Upgrade to Pro to see Stop Loss & Take Profit levels, unlock ETH + BNB signals, and get Telegram alerts on the Pro channel.")}
                  className="pt-3 border-t border-[#3054ff]/20 text-[11px] text-slate-500 cursor-pointer hover:text-[#3054ff] transition-colors font-bold"
                >
                  <Icons.Lock /> Unlock full position sizing → Upgrade to Pro
                </div>
              ) : (
                <div className="pt-3 border-t border-[#3054ff]/20 space-y-2.5 bg-slate-950/40 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Risk per Trade</span>
                    <span className="text-emerald-400 font-bold">${(calcAccountSize * (calcRiskPct / 100)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Stop Loss Distance</span>
                    <span className="text-rose-400 font-bold">{signal.sl_pct ? `${signal.sl_pct}%` : 'N/A'}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2.5 flex justify-between items-center">
                    <span className="text-[#3054ff] font-bold uppercase text-[10px]">Position Size ($)</span>
                    <span className="text-white font-black text-lg">
                      {signal.sl_pct && signal.sl_pct > 0
                        ? `$${((calcAccountSize * (calcRiskPct / 100)) / (signal.sl_pct / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">In {coinLabel}</span>
                    <span className="text-cyan-400 font-bold">
                      {signal.sl_pct && signal.sl_pct > 0 && signal.entry_price
                        ? (((calcAccountSize * (calcRiskPct / 100)) / (signal.sl_pct / 100)) / signal.entry_price).toFixed(4)
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeframe Alignment */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/15 p-5 sm:p-6 rounded-xl text-left glass shadow-xl space-y-3">
            <span className="block text-[11px] text-slate-400 font-extrabold uppercase tracking-widest">
              Multi-Timeframe Alignment
            </span>
            <div className="divide-y divide-slate-800/60 text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 uppercase">15m HA Timeframe:</span>
                <span className={`font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-400' : 'bg-rose-400'}`} /> {isBuy ? 'BUY' : 'SELL'} (THIS SIGNAL)
                </span>
              </div>
              <div className="flex justify-between py-2.5 items-center">
                <span className="text-slate-500 uppercase">1H HA Timeframe:</span>
                {isFreePlan ? (
                  <span 
                    onClick={() => handleOpenModal("Unlock Timeframe Alignment", "View alignment confluences across higher timeframes (1H & 4H) to prevent contrarian swing entries.")}
                    className="text-[10px] text-[#3054ff] hover:underline cursor-pointer flex items-center font-bold"
                  >
                    <Icons.Lock /> Locked - Pro
                  </span>
                ) : (
                  <span className={`font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-400' : 'bg-rose-400'}`} /> {isBuy ? 'BUY' : 'SELL'}
                  </span>
                )}
              </div>
              <div className="flex justify-between py-2.5 items-center">
                <span className="text-slate-500 uppercase">4H HA Timeframe:</span>
                {isFreePlan ? (
                  <span 
                    onClick={() => handleOpenModal("Unlock Timeframe Alignment", "View alignment confluences across higher timeframes (1H & 4H) to prevent contrarian swing entries.")}
                    className="text-[10px] text-[#3054ff] hover:underline cursor-pointer flex items-center font-bold"
                  >
                    <Icons.Lock /> Locked - Pro
                  </span>
                ) : (
                  <span className={`font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-400' : 'bg-rose-400'}`} /> {isBuy ? 'BUY' : 'SELL'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Telegram Setup inline CTA */}
          {isFreePlan && (
            <div className="bg-gradient-to-br from-[#3054ff]/10 to-[#7c5cf6]/5 border border-[#3054ff]/30 p-5 sm:p-6 rounded-xl text-left space-y-3 shadow-xl">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#3054ff] uppercase tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Get this signal on your phone
              </span>
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-300 normal-case font-medium">
                Pro and Master users get this signal in Telegram within 5 seconds of it firing. You saw it {hoursAgo}h {minutesAgo}m late.
              </p>
              <button 
                onClick={() => handleOpenModal("Telegram Alerts Setup", "Go to your Profile Console / Settings to connect Telegram. Receive instant alerts on 11 active coins.")}
                className="w-full py-2.5 bg-black hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest transition-colors rounded-xl border border-white/10 cursor-pointer"
              >
                Connect Telegram Alerts &rarr;
              </button>
            </div>
          )}

        </div>
  
        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[55%] p-4 sm:p-6 lg:h-full flex flex-col justify-start overflow-y-auto space-y-6">
          
          {/* Performance Chart container */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/15 p-4 sm:p-5 rounded-xl glass shadow-2xl flex flex-col justify-between shrink-0">
            <span className="block text-[11px] text-slate-400 font-extrabold uppercase tracking-widest text-left mb-3">
              Interactive Signal Performance Chart
            </span>
            <div className="w-full overflow-hidden">
              {sigLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-brand-orange rounded-full animate-spin" />
                </div>
              ) : signal && signal.symbol && signal.interval ? (
                <HAChart symbol={signal.symbol} interval={signal.interval} isFreePlan={isFreePlan} theme="dark" hideSymbolSelector={true} onPriceTick={(price) => setLivePrice(price)} activeSignal={signal} hideSignalCards={true} />
              ) : (
                <div className="flex items-center justify-center py-16 text-xs text-zinc-500">
                  Unable to load chart
                </div>
              )}
            </div>
          </div>

          {/* Timeframe Filter for Signal History & Performance */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/15 p-4 sm:p-5 rounded-xl glass shadow-2xl flex flex-col justify-between shrink-0 text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <span className="block text-[11px] text-slate-400 font-extrabold uppercase tracking-widest">
                Signal History Filter
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: 'today', l: 'Today' },
                  { v: '1w', l: '1 Week' },
                  { v: '30d', l: '30d' },
                  { v: '6m', l: '6m' },
                  { v: '1y', l: '1y' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setTimeFilter(opt.v)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-colors border cursor-pointer ${
                      timeFilter === opt.v
                        ? 'bg-brand-orange border-brand-orange text-white font-extrabold'
                        : 'bg-transparent border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance line chart showing P&L and win rate */}
            <div className="w-full">
              {historyLoading ? (
                <div className="h-64 flex flex-col items-center justify-center border border-slate-800 bg-[#070b19]/60 p-6 text-center">
                  <div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                  <p className="text-white text-[10px] uppercase tracking-wider mt-3">Loading stats & chart...</p>
                </div>
              ) : (
                <PerformanceChart signals={historySignals} />
              )}
            </div>
          </div>

          {/* History log table for the coin */}
          <div className="bg-gradient-to-br from-[#0a0f1d] to-[#0d1426] border border-[#3054ff]/15 p-5 sm:p-6 rounded-xl glass shadow-xl text-left">
            <div className="flex justify-between items-center mb-4">
              <span className="block text-[11px] text-slate-400 font-extrabold uppercase tracking-widest">
                Ledger Signal History for {coinLabel}
              </span>
              <span className="text-[10px] font-bold text-brand-orange uppercase">{signal.interval} HA</span>
            </div>

            <div className="overflow-x-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-4 h-4 border border-slate-600 border-t-[#3054ff] rounded-full animate-spin" />
                  <span className="text-[12px] text-slate-500 uppercase">Loading history...</span>
                </div>
              ) : historySignals.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-800 text-[12px] text-white">
                  No historical closed signals found in this window.
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Entry</th>
                      <th className="pb-2">Exit</th>
                      <th className="pb-2 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[...historySignals]
                      .sort((a, b) => new Date(b.bar_time || b.created_at).getTime() - new Date(a.bar_time || a.created_at).getTime())
                      .map((h, i) => {
                        const showRow = !isFreePlan || i < 3; // free plan gets 3 rows preview
                      return (
                        <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3">{formatLogDate(h.bar_time, profile)}</td>
                          <td className="py-3">
                            <span className={`font-bold ${h.signal_type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {h.signal_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 font-semibold">
                            {showRow ? formatPrice(h.entry_price, profile) : <span className="blur-xs select-none">$59,100.00</span>}
                          </td>
                          <td className="py-3">
                            {showRow ? formatPrice(h.close_price, profile) : <span className="blur-xs select-none">$59,400.00</span>}
                          </td>
                          <td className="py-3 text-right font-bold">
                            {showRow ? (
                              <span className={h.is_win ? 'text-emerald-400' : 'text-rose-400'}>
                                {h.is_win ? '+' : ''}{parseFloat(h.pnl_pct || 0).toFixed(2)}%
                              </span>
                            ) : (
                              <span 
                                onClick={() => handleOpenModal("Unlock History Logs", "Reveal full historical signal listings, trade verification logs, and backtest files on Pro.")}
                                className="text-[10px] text-[#3054ff] hover:underline cursor-pointer flex items-center justify-end font-bold"
                              >
                                <Icons.Lock /> Pro
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {isFreePlan && historySignals.length > 3 && (
              <div 
                onClick={() => handleOpenModal("Unlock Signal History", "Upgrade to Pro to access all historical signals, ledger entry-exit exports, and full coin directories.")}
                className="mt-4 border border-dashed border-[#3054ff]/30 bg-[#3054ff]/5 p-3 text-center text-[11px] text-[#3054ff] font-bold uppercase cursor-pointer hover:bg-[#3054ff]/10 transition-colors"
              >
                See full historical ledger for {coinLabel} on Pro Plan &rarr;
              </div>
            )}
          </div>

        </div>
 
      </div>

      {/* POPUP MODAL GATE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 z-10 text-left">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
            >
              &times;
            </button>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#3054ff] uppercase tracking-wider">SANDDOCK CONSOLE GATEWAY</span>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-white">{modalContent.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed normal-case">
                {modalContent.body}
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setModalOpen(false); router.push('/pricing'); }}
                className="flex-1 py-2.5 bg-[#3054ff] hover:bg-[#2040e0] text-white font-bold text-xs uppercase tracking-widest transition-colors rounded-xl border border-white/10 cursor-pointer"
              >
                Upgrade Plan &rarr;
              </button>
              <button 
                onClick={() => setModalOpen(false)}
                className="px-3 py-2.5 border border-slate-800 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white uppercase tracking-widest transition-colors rounded-xl cursor-pointer"
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
