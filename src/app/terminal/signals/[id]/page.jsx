'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HAChart from '@/components/HAChart';

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
    <svg className="w-3 h-3 text-[#3D5AFE] inline-block" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="1" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  Brain: () => (
    <svg className="w-4 h-4 text-[#3D5AFE]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
};

function formatPrice(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(parseFloat(val));
}

function formatLogDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function SignalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  
  const [signal, setSignal] = useState(null);
  const [sigLoading, setSigLoading] = useState(true);
  const [error, setError] = useState(null);

  const [accordionOpen, setAccordionOpen] = useState({
    ha: false,
    confidence: false,
    sltp: false,
  });

  const toggleAccordion = (key) => {
    setAccordionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
        const parts = idStr.split('-');
        let sym = 'BTCUSDT';
        if (parts.length > 1) {
          sym = parts[1];
        }

        const intervals = ['15m', '1h', '4h'];
        let foundSignal = null;

        for (const tf of intervals) {
          const res = await fetch(`/api/chart/signals?symbol=${sym}&interval=${tf}`);
          if (res.ok) {
            const signalsList = await res.json();
            const found = signalsList.find(s => idStr.includes(s.bar_time));
            if (found) {
              foundSignal = {
                id: params.id,
                symbol: sym,
                interval: tf,
                signal_type: found.signal_type,
                entry_price: found.entry_price,
                sl_price: found.sl_price,
                tp_price: found.tp_price,
                confidence: found.confidence || 75,
                rationale: found.rationale || `Dynamic trend validation for ${sym} on the ${tf} Heikin Ashi chart.`,
                created_at: found.bar_time
              };
              break;
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

  if (loading || sigLoading) {
    return (
      <div className="h-screen bg-[#020617] text-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#3D5AFE] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-widest uppercase">Initializing Hub...</span>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center font-mono border border-slate-800 m-4 rounded-2xl glass">
        <span className="text-3xl mb-3">📡</span>
        <h1 className="text-[18px] font-extrabold uppercase tracking-widest text-white">Signal Hub Error</h1>
        <p className="text-slate-400 text-sm max-w-sm mt-1 mb-6 leading-relaxed normal-case">
          {error || 'This active or historical setup transaction could not be located.'}
        </p>
        <button onClick={() => router.push('/terminal')}
          className="px-6 py-2.5 bg-[#3D5AFE] hover:bg-[#2943d0] text-white font-bold text-xs uppercase tracking-widest transition-all rounded-xl cursor-pointer">
          &larr; Return to Console
        </button>
      </div>
    );
  }

  const isBuy = signal.signal_type === 'buy';
  const isFreePlan = profile?.plan === 'free';
  const symbolFormatted = signal.symbol.replace('USDT', '/USDT');

  return (
    <div className="h-screen bg-[#020617] text-white font-mono antialiased overflow-hidden flex flex-col selection:bg-[#3D5AFE]/20 selection:text-[#3D5AFE] animate-fade-in">
      
      {/* HEADER */}
      <header className="h-16 w-full flex-shrink-0 bg-[#020617]/85 backdrop-blur-md border-b border-slate-800/80 px-6 flex justify-between items-center z-30 select-none">
        <div className="flex items-center gap-3">
          <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-6 h-6 object-contain" />
          <span className="text-[14px] font-extrabold uppercase tracking-widest text-white">
            Sanddock <span className="text-[#3D5AFE]">Hub</span>
          </span>
          <span className="text-[10px] font-mono font-bold bg-[#111827] border border-slate-800 px-2 py-0.5 text-slate-300 uppercase rounded-md">
            ID: #{signal.id.toString().slice(-6)}
          </span>
        </div>

        <button onClick={() => router.push('/terminal')}
          className="px-4 py-2 border border-slate-800 hover:bg-slate-800 font-bold text-xs uppercase tracking-wider text-white transition-all bg-[#0a0f1d] cursor-pointer flex items-center gap-1.5 rounded-xl">
          <Icons.Back /> Back to Console
        </button>
      </header>

      {/* TWO-COLUMN HORIZONTAL GRID */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN */}
        <div className="w-[45%] border-r border-slate-800/80 p-6 space-y-5 overflow-y-auto h-full flex flex-col justify-start">
          
          {/* Hero Metadata Box */}
          <div className="bg-[#0a0f1d] border border-slate-800/80 p-6 text-left space-y-4 rounded-2xl relative shadow-xl glass">
            <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest border rounded ${
                    isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {isBuy ? <Icons.TrendUp /> : <Icons.TrendDown />}
                    {isBuy ? 'BUY TARGET' : 'SELL TARGET'}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.2 uppercase rounded">
                    {signal.interval} HA
                  </span>
                </div>
                <h1 className="text-3xl font-black text-white font-mono tracking-tighter leading-none pt-1">{symbolFormatted}</h1>
                <p className="text-slate-400 text-[11px] font-bold font-mono tracking-tight pt-0.5">{formatLogDate(signal.created_at)}</p>
              </div>
              
              <div className="bg-[#111827] border border-slate-800/80 p-3 text-right rounded-xl">
                <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Confidence</span>
                <span className="text-2xl font-black font-mono text-white mt-0.5 block">{signal.confidence}%</span>
              </div>
            </div>
          </div>

          {/* Setup targets card */}
          <div className="bg-[#0a0f1d] border border-slate-800/80 p-5 rounded-2xl space-y-4 glass shadow-xl">
            <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest text-left">Signal Parameters</span>
            <div className="grid grid-cols-3 gap-0 border border-slate-800/85 divide-x divide-slate-800/85 rounded-xl overflow-hidden">
              <div className="p-3 space-y-0.5 text-left bg-slate-950/20">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Entry</span>
                <span className="text-[13px] text-white font-bold font-mono">{formatPrice(signal.entry_price)}</span>
              </div>
              <div className="p-3 space-y-0.5 text-left bg-slate-950/20">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Stop Loss</span>
                {isFreePlan ? (
                  <span className="text-[10px] font-extrabold text-[#3D5AFE] flex items-center gap-1 mt-0.5">
                    <Icons.Lock /> Pro Only
                  </span>
                ) : (
                  <span className="text-[13px] text-rose-400 font-bold font-mono">
                    {formatPrice(signal.sl_price)}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-0.5 text-left bg-slate-950/20">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Take Profit</span>
                {isFreePlan ? (
                  <span className="text-[10px] font-extrabold text-[#3D5AFE] flex items-center gap-1 mt-0.5">
                    <Icons.Lock /> Pro Only
                  </span>
                ) : (
                  <span className="text-[13px] text-emerald-400 font-bold font-mono">
                    {formatPrice(signal.tp_price)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AI Logic explanation */}
          <div className="bg-[#0a0f1d] border border-slate-800/80 p-5 rounded-2xl space-y-2 text-left glass shadow-xl">
            <div className="flex items-center gap-1.5">
              <Icons.Brain />
              <span className="text-[10px] text-[#3D5AFE] font-extrabold uppercase tracking-widest font-mono">AI Logic Rationale</span>
            </div>
            <p className="text-slate-200 text-[13px] leading-relaxed bg-slate-950/40 p-4 border border-slate-800/60 font-medium rounded-xl">
              {signal.rationale}
            </p>
          </div>

          {/* Educational Accordions */}
          <div className="space-y-2 text-left">
            <span className="block text-[9px] text-slate-500 font-extrabold uppercase tracking-widest font-mono">Educational Layer</span>
            
            <div className="border border-slate-800/80 bg-[#0a0f1d] rounded-xl glass shadow-md overflow-hidden">
              <button onClick={() => toggleAccordion('ha')}
                className="w-full flex justify-between items-center p-3 text-[11px] font-bold uppercase tracking-wider border-0 bg-transparent text-white cursor-pointer">
                <span>What is a Heikin Ashi Signal?</span>
                <span className="text-slate-400 font-mono text-sm">{accordionOpen.ha ? '−' : '+'}</span>
              </button>
              {accordionOpen.ha && (
                <div className="p-3 pt-0 text-slate-400 text-xs leading-relaxed border-t border-slate-800/60 normal-case">
                  Heikin Ashi candles filter out market noise by averaging price movements. When the engine detects a consecutive run of specific colored candles matching local highs or lows, it flags potential market trend shifts.
                </div>
              )}
            </div>

            <div className="border border-slate-800/80 bg-[#0a0f1d] rounded-xl glass shadow-md overflow-hidden">
              <button onClick={() => toggleAccordion('confidence')}
                className="w-full flex justify-between items-center p-3 text-[11px] font-bold uppercase tracking-wider border-0 bg-transparent text-white cursor-pointer">
                <span>What does Confidence Score mean?</span>
                <span className="text-slate-400 font-mono text-sm">{accordionOpen.confidence ? '−' : '+'}</span>
              </button>
              {accordionOpen.confidence && (
                <div className="p-3 pt-0 text-slate-400 text-xs leading-relaxed border-t border-slate-800/60 normal-case">
                  The score reflects indicators such as relative volume strength, trend strength, and previous success metrics. Higher scores suggest reversals with high confirmations.
                </div>
              )}
            </div>
          </div>

        </div>
 
        {/* RIGHT COLUMN */}
        <div className="w-[55%] p-6 h-full flex flex-col justify-start">
          <div className="bg-[#0a0f1d] border border-slate-800/80 p-5 h-full flex flex-col justify-between rounded-2xl glass shadow-2xl">
            <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono text-left mb-3">
              Interactive Signal Performance Chart
            </span>
            <div className="flex-1 flex flex-col justify-center">
              <HAChart symbol={signal.symbol} interval={signal.interval} isFreePlan={isFreePlan} theme="dark" />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
