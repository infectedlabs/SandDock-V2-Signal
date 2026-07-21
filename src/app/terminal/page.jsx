'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useSignals } from '@/hooks/useSignals';
import { useSignalLog } from '@/hooks/useSignalLog';
import { usePerformance } from '@/hooks/usePerformance';
import HAChart from '@/components/HAChart';
import PerformanceChart from '@/components/PerformanceChart';
import SignalPanel from '@/components/SignalPanel';

// ── SVG Icons (Replacing Emojis) ─────────────────────────────────────────────
const Icons = {
  Signals: () => (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.32 11.32l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  ),
  Chart: () => (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  History: () => (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Performance: () => (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.3 0-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Bell: ({ active }) => (
    <svg className="w-5 h-5 text-white hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      {active && <circle cx="18" cy="6" r="3" fill="#ff4500" stroke="#000000" strokeWidth="1.5" />}
    </svg>
  ),
  Lock: () => (
    <svg className="w-3.5 h-3.5 inline text-[#3D5AFE]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
};



const ALL_COINS = [
  { value: 'ALL', label: 'Overall (All Coins)' },
  { value: 'BTCUSDT', label: 'Bitcoin (BTC)' },
  { value: 'ETHUSDT', label: 'Ethereum (ETH)' },
  { value: 'BNBUSDT', label: 'BNB (BNB)' }
];

function formatPrice(val, profile) {
  if (val == null) return '-';
  const format = profile?.price_format || 'usd';
  const num = parseFloat(val);
  if (format === 'usdt') {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(num);
}

function formatRelativeTime(isoString) {
  if (!isoString) return '-';
  const diffMs   = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const hours = Math.floor(diffMins / 60);
  if (hours < 24)    return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatSymbol(sym) {
  return sym ? sym.replace('USDT', '/USDT') : sym;
}

function formatLogDate(isoString, profile) {
  if (!isoString) return '-';
  const tz = profile?.timezone || 'UTC';
  const tzMap = {
    EST: 'America/New_York',
    IST: 'Asia/Kolkata',
    GMT: 'Europe/London',
    PST: 'America/Los_Angeles',
    CET: 'Europe/Paris'
  };
  const timeZone = tzMap[tz] || 'UTC';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
}

const COIN_LOGOS = {
  'BTC': { char: '₿', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  'ETH': { char: 'Ξ', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-400/20' },
  'SOL': { char: '◎', bg: 'bg-purple-500/10 text-purple-400 border-purple-400/20' },
  'BNB': { char: '🔶', bg: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  'XRP': { char: '✕', bg: 'bg-blue-500/10 text-blue-400 border-blue-400/20' },
  'ADA': { char: '₳', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-400/20' },
  'AVAX': { char: '▲', bg: 'bg-red-500/10 text-red-500 border-red-500/20' },
  'DOT': { char: '●', bg: 'bg-pink-500/10 text-pink-400 border-pink-400/20' },
  'MATIC': { char: 'M', bg: 'bg-purple-600/10 text-purple-300 border-purple-300/20' },
  'LINK': { char: '⬡', bg: 'bg-blue-600/10 text-blue-300 border-blue-300/20' },
};

function LockedSignalCard({ symbol, timeframe, type, onUpgrade, plan = 'free', confidence }) {
  const coin = symbol.split('/')[0];
  const logo = COIN_LOGOS[coin] || { char: coin.slice(0, 1), bg: 'bg-zinc-800 text-white border-zinc-700' };
  const isBuy = type === 'BUY';

  return (
    <div
      onClick={onUpgrade}
      className="group px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left cursor-pointer hover:bg-slate-900/10 transition-all select-none opacity-45 hover:opacity-60 relative overflow-hidden"
    >
      {/* 1. Logo & Token Info */}
      <div className="flex items-center gap-3 w-full md:w-[22%] shrink-0">
        <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-satoshi font-bold text-[10px] shadow-inner shrink-0 ${logo.bg}`}>
          {logo.char}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-wide text-xs">{coin} <span className="text-white font-normal">/ USDT</span></span>
            <span className="text-[9px] font-satoshi font-bold bg-slate-950/60 px-1.5 py-0.2 rounded border border-slate-800 text-white tracking-wider">
              {timeframe}
            </span>
          </div>
          <span className="text-[10px] text-white font-satoshi tracking-normal">Locked for your tier</span>
        </div>
      </div>

      {/* 2. Direction */}
      <div className="w-full md:w-[8%] flex items-center shrink-0">
        <span className="inline-flex items-center px-2.5 py-0.5 text-[9px] font-extrabold tracking-widest border uppercase rounded bg-zinc-800/40 text-white border-zinc-700/20">
          {type}
        </span>
      </div>

      {/* 3. Locked Content Area */}
      <div className="w-full md:w-[56%] flex items-center justify-between text-white text-xs font-satoshi">
        <span>🔒 HA entry, targets, and live floating performance locked.</span>
        {confidence && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#3D5AFE] bg-[#3D5AFE]/10 border border-[#3D5AFE]/20 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
            {confidence}% Conviction Alert
          </span>
        )}
      </div>

      {/* 4. Upgrade action button */}
      <div className="w-full md:w-[14%] flex items-center justify-between md:justify-end gap-2 shrink-0">
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#3D5AFE] group-hover:underline">
          Upgrade →
        </span>
      </div>
    </div>
  );
}

// ── SignalCard ───────────────────────────────────────────────────────────────
function SignalCard({ sig, isFreePlan, isLastSignalBadge = false, isExpanded, onToggle, onUpgrade, onViewDetails, livePrice, isLive = false, nextSignal = null, rank = null, isLatest = false }) {
  const isBuy = sig.signal_type === 'buy';
  const coin = sig.symbol.replace('USDT', '');
  const logo = COIN_LOGOS[coin] || { char: coin.slice(0, 1), bg: 'bg-zinc-800 text-white border-zinc-700' };

  let pnlText = '';
  let pnlColorClass = '';
  
  // API already returns correct PnL calculation for both closed and live signals
  if (sig.pnl_pct != null) {
    pnlText = `${sig.pnl_pct >= 0 ? '+' : ''}${parseFloat(sig.pnl_pct).toFixed(2)}%`;
    pnlColorClass = sig.pnl_pct >= 0 ? 'text-[#10b981] font-bold' : 'text-[#ef4444] font-bold';
  } else {
    pnlText = 'LIVE';
    pnlColorClass = 'text-cyan-400 font-extrabold animate-pulse';
  }

  return (
    <div
      onClick={() => onViewDetails(sig)}
      className="group px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left cursor-pointer hover:bg-slate-900/30 transition-all select-none"
    >
      {/* 1. Logo & Token Info */}
      <div className="flex items-center gap-3 w-full md:w-[20%] shrink-0">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-satoshi font-bold text-xs shadow-inner shrink-0 ${logo.bg}`}>
          {logo.char}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-wide text-xs sm:text-sm">{coin} <span className="text-white font-normal">/ USDT</span></span>
            <span className="text-[9px] font-satoshi font-bold bg-slate-950/60 px-1.5 py-0.2 rounded border border-slate-800 text-white tracking-wider">
              {sig.interval}
            </span>
          </div>
          <span className="text-[10px] text-white font-satoshi tracking-normal">Fired {formatRelativeTime(sig.bar_time)}</span>
        </div>
      </div>

      {/* 2. Direction */}
      <div className="w-full md:w-[7%] flex items-center shrink-0">
        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-extrabold tracking-widest border uppercase rounded ${
          isBuy 
            ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20' 
            : 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/20'
        }`}>
          {isBuy ? 'BUY' : 'SELL'}
        </span>
      </div>

      {/* 3. Entry Price */}
      <div className="w-full md:w-[10%] flex flex-col justify-center">
        <span className="block text-[9px] text-white font-satoshi uppercase tracking-widest">Entry Price</span>
        <span className="font-satoshi text-xs sm:text-sm font-bold text-white mt-0.5 block">{formatPrice(sig.entry_price)}</span>
      </div>

      {/* 4. Stop Loss */}
      <div className="w-full md:w-[10%] flex flex-col justify-center">
        <span className="block text-[9px] text-white font-satoshi uppercase tracking-widest">Stop Loss</span>
        <span className="font-satoshi text-xs text-white mt-0.5 block">{sig.sl_price ? formatPrice(sig.sl_price) : '-'}</span>
      </div>

      {/* 5. Take Profit */}
      <div className="w-full md:w-[10%] flex flex-col justify-center">
        <span className="block text-[9px] text-white font-satoshi uppercase tracking-widest">Take Profit</span>
        <span className="font-satoshi text-xs text-white mt-0.5 block">{sig.tp_price ? formatPrice(sig.tp_price) : '-'}</span>
      </div>

      {/* R:R Ratio */}
      <div className="w-full md:w-[8%] flex flex-col justify-center">
        <span className="block text-[9px] text-white font-satoshi uppercase tracking-widest">R:R Ratio</span>
        <span className="font-satoshi text-xs text-white mt-0.5 block">
          1:{sig.sl_pct && sig.tp_pct && sig.sl_pct > 0 ? (sig.tp_pct / sig.sl_pct).toFixed(1) : '2.0'}
        </span>
      </div>

      {/* 6. Confidence */}
      <div className="relative group/tooltip w-full md:w-[10%] flex flex-col justify-center cursor-help">
        <span className="block text-[9px] text-white font-satoshi uppercase tracking-widest border-b border-dashed border-zinc-600/50 w-max">Confidence</span>
        <span className="font-satoshi text-xs font-bold text-zinc-300 mt-0.5 block">{sig.confidence || 75}%</span>
        <div className="absolute left-0 bottom-full mb-2 w-40 p-2 bg-slate-950/95 border border-slate-800 rounded shadow-xl text-left hidden group-hover/tooltip:block z-50 font-satoshi text-[9px] text-zinc-300 leading-normal normal-case">
          AI conviction strength. Signals &gt;75% have higher historical accuracy.
        </div>
      </div>

      {/* 7. PNL */}
      <div className="w-full md:w-[9%] flex flex-col justify-center min-w-[70px]">
        <span className="block text-[9px] text-white font-satoshi uppercase tracking-widest">PNL</span>
        <span className={`font-satoshi text-xs sm:text-sm font-bold mt-0.5 block ${pnlColorClass}`}>
          {pnlText || '0.00%'}
        </span>
      </div>

      {/* 8. Status & Action */}
      <div className="w-full md:w-[12%] flex items-center justify-between md:justify-end gap-2 shrink-0">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-satoshi font-bold bg-[#3D5AFE]/15 text-[#3D5AFE] border border-[#3D5AFE]/20 px-2 py-0.5 uppercase rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3D5AFE] animate-ping" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-satoshi font-bold bg-zinc-800/80 text-white border border-zinc-700/40 px-2 py-0.5 uppercase rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Closed
          </span>
        )}
        <span className="text-white group-hover:text-white transition-colors pl-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

// ── Detail Drawer Component ──────────────────────────────────────────────────
function DetailDrawer({ sig, profile, isFreePlan, experienceLevel, onClose, onUpgrade }) {
  const isBuy = sig.signal_type === 'buy';
  const symbolFormatted = formatSymbol(sig.symbol);

  // Accordion state based on experience level
  const [accordionOpen, setAccordionOpen] = useState({
    ha: experienceLevel === 'beginner',
    confidence: experienceLevel === 'beginner',
    sltp: experienceLevel === 'beginner',
    ai: experienceLevel === 'beginner'
  });

  const toggleAccordion = (key) => {
    setAccordionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Load stats specifically for this coin
  const { stats } = usePerformance(sig.symbol, sig.interval);
  const { signals: coinLog } = useSignalLog({ plan: isFreePlan ? 'free' : 'pro', user_id: profile?.id, symbol: sig.symbol, pageSize: 10 });

  return (
    <div className="w-full lg:w-[55%] h-full bg-[#000000] border-l border-[#1e2a3a] flex flex-col z-40 relative overflow-y-auto">
      {/* Sticky Drawer Header */}
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-md p-5 border-b border-[#1e2a3a] flex justify-between items-center z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-bold font-satoshi text-white">{symbolFormatted}</h2>
            <span className="text-[12px] font-satoshi bg-zinc-800 text-white px-2 py-0.5 uppercase">
              {sig.interval} HA
            </span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <span className="text-[14px] text-zinc-300 font-satoshi">
              Live Price: <span className="font-bold text-white">{formatPrice(sig.entry_price, profile)}</span>
            </span>
            <span className="text-[11px] font-satoshi text-emerald-400 bg-emerald-400/10 px-1 py-0.2 rounded-xs">
              +2.3% (24h)
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-white hover:text-white transition-colors cursor-pointer bg-transparent border-0">
          <Icons.Close />
        </button>
      </div>

      {/* Drawer Body content */}
      <div className="p-6 space-y-6">

        {/* Section 1: Current Signal Card view */}
        <div className={`p-5 bg-zinc-950/40 border ${isBuy ? 'border-[#00e676]/30' : 'border-[#ff1744]/30'} space-y-4 text-left`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`text-[12px] font-bold px-2 py-0.5 uppercase ${
                isBuy ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff1744]/10 text-[#ff1744]'
              }`}>
                {isBuy ? 'Active BUY Target' : 'Active SELL Target'}
              </span>
              <span className="text-[11px] text-white">
                Fired {formatRelativeTime(sig.created_at)}
              </span>
            </div>
            <span className="text-white font-satoshi text-[13px]">
              Conf: <span className="font-bold text-white">{sig.confidence}%</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-zinc-950 px-3 py-2.5 border border-zinc-900">
            <div>
              <span className="block text-[10px] text-white font-bold uppercase tracking-wider">Entry Target</span>
              <span className="text-[14px] text-white font-bold font-satoshi">{formatPrice(sig.entry_price, profile)}</span>
            </div>
            <div>
              <span className="block text-[10px] text-white font-bold uppercase tracking-wider">Stop Loss</span>
              {isFreePlan ? (
                <button onClick={() => onUpgrade('Unlock Stop Loss Levels', 'Upgrade to view SL values.')}
                  className="text-[11px] font-bold text-[#3D5AFE] uppercase bg-transparent border-0 p-0 block text-left">
                  🔒 Pro Only
                </button>
              ) : (
                <span className="text-[14px] text-white font-bold font-satoshi">
                  {formatPrice(sig.sl_price, profile)} ({sig.sl_pct}%)
                </span>
              )}
            </div>
            <div>
              <span className="block text-[10px] text-white font-bold uppercase tracking-wider">Take Profit</span>
              {isFreePlan ? (
                <button onClick={() => onUpgrade('Unlock Take Profit Targets', 'Upgrade to view TP values.')}
                  className="text-[11px] font-bold text-[#3D5AFE] uppercase bg-transparent border-0 p-0 block text-left">
                  🔒 Pro Only
                </button>
              ) : (
                <span className="text-[14px] text-[#00e676] font-bold font-satoshi">
                  {formatPrice(sig.tp_price, profile)} (+{sig.tp_pct}%)
                </span>
              )}
            </div>
          </div>

          {sig.rationale && (
            <div className="space-y-1">
              <span className="text-[10px] font-satoshi text-white font-bold uppercase">AI Analysis Rationale</span>
              <p className="text-[13px] text-zinc-300 normal-case leading-relaxed bg-zinc-950 p-3 border border-zinc-900/60">
                {sig.rationale}
              </p>
            </div>
          )}
        </div>

        {/* Section 2: HA Chart */}
        <div className="space-y-2">
          <span className="block text-[11px] font-satoshi text-white uppercase tracking-widest text-left">
            Signal Performance Chart
          </span>
          <HAChart
            symbol={sig.symbol}
            interval={sig.interval}
            isFreePlan={isFreePlan}
            plan={profile?.plan || 'free'}
            onUpgradeGate={triggerUpgradeGate}
          />
        </div>

        {/* Section 3: Signal History list */}
        <div className="space-y-3">
          <span className="block text-[11px] font-satoshi text-white uppercase tracking-widest text-left">
            Completed signals for {symbolFormatted}
          </span>
          {coinLog.length === 0 ? (
            <div className="bg-zinc-950/20 border border-zinc-900 p-8 text-center text-white text-[12px]">
              No past trade logs available for this coin pair yet.
            </div>
          ) : (
            <div className="overflow-x-auto bg-[#090909] border border-[#1e2a3a]">
              <table className="w-full text-left font-satoshi border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[#1e2a3a] text-white uppercase tracking-wider text-[10px] bg-zinc-950/20">
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Entry</th>
                    <th className="p-3">Exit</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {coinLog.map(item => {
                    const isTrulyClosed = item.is_closed;
                    const pnlValue = parseFloat(item.pnl_pct || 0);
                    const isProfit = isTrulyClosed ? item.is_win : (pnlValue >= 0);
                    return (
                      <tr key={item.id} className="border-b border-[#1e2a3a]/40 last:border-0 hover:bg-zinc-900/10">
                        <td className="p-3 text-white">{formatLogDate(item.created_at, profile)}</td>
                        <td className="p-3">
                          <span className={`inline-block px-1 py-0.2 text-[9px] font-bold ${
                            item.signal_type === 'buy' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff1744]/10 text-[#ff1744]'
                          }`}>
                            {item.signal_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">{formatPrice(item.entry_price, profile)}</td>
                        <td className="p-3">{isTrulyClosed ? formatPrice(item.close_price, profile) : '-'}</td>
                        <td className="p-3 text-white capitalize">{item.close_reason ? item.close_reason.replace('_', ' ') : 'Open'}</td>
                        <td className="p-3">
                          <span className={`font-bold ${isProfit ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                            {isProfit ? '+' : ''}{pnlValue.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 4: About This Signal accordion */}
        <div className="space-y-2 text-left">
          <span className="block text-[11px] font-satoshi text-white uppercase tracking-widest">
            Trading Educational Guides
          </span>

          {/* Accordion 1 */}
          <div className="border border-zinc-900 bg-zinc-950/30">
            <button onClick={() => toggleAccordion('ha')}
              className="w-full flex justify-between items-center p-3 text-[13px] font-bold uppercase tracking-wider border-0 bg-transparent text-white cursor-pointer">
              <span>What is a Heikin Ashi Signal?</span>
              <span>{accordionOpen.ha ? '−' : '+'}</span>
            </button>
            {accordionOpen.ha && (
              <div className="p-3 pt-0 text-[12px] text-white normal-case leading-relaxed">
                Heikin Ashi candles filter out market noise by averaging price movements. When the engine detects a consecutive run of specific colored candles matching local highs or lows, it flags potential market trend shifts.
              </div>
            )}
          </div>

          {/* Accordion 2 */}
          <div className="border border-zinc-900 bg-zinc-950/30">
            <button onClick={() => toggleAccordion('confidence')}
              className="w-full flex justify-between items-center p-3 text-[13px] font-bold uppercase tracking-wider border-0 bg-transparent text-white cursor-pointer">
              <span>What does Confidence Score mean?</span>
              <span>{accordionOpen.confidence ? '−' : '+'}</span>
            </button>
            {accordionOpen.confidence && (
              <div className="p-3 pt-0 text-[12px] text-white normal-case leading-relaxed">
                The score ranges from 40% to 95%. It reflects indicators such as relative volume strength, trend strength, and previous success metrics. Higher scores suggest clean reversals with high confirmations.
              </div>
            )}
          </div>

          {/* Accordion 3 */}
          <div className="border border-zinc-900 bg-zinc-950/30">
            <button onClick={() => toggleAccordion('sltp')}
              className="w-full flex justify-between items-center p-3 text-[13px] font-bold uppercase tracking-wider border-0 bg-transparent text-white cursor-pointer">
              <span>What is Stop Loss & Take Profit?</span>
              <span>{accordionOpen.sltp ? '−' : '+'}</span>
            </button>
            {accordionOpen.sltp && (
              <div className="p-3 pt-0 text-[12px] text-white normal-case leading-relaxed">
                These are automated rules designed to manage risk. Stop Loss limits your potential losses if the market moves against the signal, while Take Profit locks in gains when target levels are reached.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const LOADING_PROMPTS = [
  { type: 'Trading Tip', content: 'Always define your risk before entering a trade. Set your Stop Loss and stick to it.' },
  { type: 'Trading Tip', content: 'Heikin Ashi candles filter out noise. Look for consecutive flat-bottom candles to confirm strong trends.' },
  { type: 'Trading Tip', content: 'Keep your position sizing consistent. Never risk more than 2% of your capital on a single swing.' },
  { type: 'Success Story', content: 'Our Intraday Swing algorithm secured +18.4% on BTC during the recent volatility window.' },
  { type: 'Success Story', content: 'Sanddock traders who followed the conservative risk profile reported 82% profit efficiency last month.' },
  { type: 'Motivation', content: 'Trade what you see, not what you think. Discipline always beats intelligence.' },
  { type: 'Motivation', content: 'Success in trading is the sum of small efforts, repeated day in and day out.' }
];

// ── Custom Coins List Component ───────────────────────────────────────────────
function CustomCoinsList({ userId, plan }) {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !['master', 'grandmaster'].includes(plan)) return;

    fetch(`/api/custom-coins?user_id=${userId}&plan=${plan}`)
      .then(r => r.json())
      .then(data => {
        setCoins(data.custom_coins || []);
        setLoading(false);
      })
      .catch(e => {
        console.warn('Failed to fetch custom coins:', e);
        setLoading(false);
      });
  }, [userId, plan]);

  if (loading || coins.length === 0) return null;

  return (
    <div className="bg-[#000000]/40 border border-slate-800/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white">Custom Coins</span>
        <span className="text-[11px] font-satoshi text-white">{coins.length} / 5</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {coins.map(coin => (
          <div key={coin} className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-[11px] font-bold text-white">{coin}</span>
            <button
              onClick={async () => {
                if (confirm(`Remove ${coin}?`)) {
                  await fetch(`/api/custom-coins?user_id=${userId}&symbol=${coin}&plan=${plan}`, {
                    method: 'DELETE'
                  });
                  setCoins(coins.filter(c => c !== coin));
                }
              }}
              className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer ml-1 bg-transparent border-0 font-bold"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Terminal Page ────────────────────────────────────────────────────────
export default function TerminalPage() {
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTabState] = useState('signals');
  
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState(null, '', url.pathname + url.search);
    }
  };
  const [activeSubTab,      setActiveSubTab]       = useState('performance');
  const [signalTypeFilter,  setSignalTypeFilter]   = useState('all');
  const [timeframeFilter,   setTimeframeFilter]    = useState('all');
  const [sortBy,            setSortBy]             = useState('recent'); // recent, highest-pnl, lowest-pnl, highest-confidence, lowest-confidence, win-rate
  const [settingsExperience,setSettingsExperience] = useState('comfortable');
  const [settingsRisk,      setSettingsRisk]       = useState('balanced');
  const [settingsGoal,      setSettingsGoal]       = useState('grow');

  const [settingsAccountSize, setSettingsAccountSize] = useState(10000);
  const [settingsRiskPerTradeType, setSettingsRiskPerTradeType] = useState('1%'); // '1%' | '1.5%' | '2%' | 'custom'
  const [settingsCustomRiskVal, setSettingsCustomRiskVal] = useState('1.0');
  const [settingsMinConfidence, setSettingsMinConfidence] = useState(75);
  const [settingsDefaultTimeframe, setSettingsDefaultTimeframe] = useState('30m');
  const [settingsDefaultView, setSettingsDefaultView] = useState('Split');
  const [settingsTimezone, setSettingsTimezone] = useState('UTC');
  const [settingsPriceFormat, setSettingsPriceFormat] = useState('usd');
  const [settingsEmailSignalClosed, setSettingsEmailSignalClosed] = useState(true);
  const [settingsEmailWeeklyDebrief, setSettingsEmailWeeklyDebrief] = useState(true);
  const [settingsEmailSystemAlerts, setSettingsEmailSystemAlerts] = useState(true);

  // Weekly PnL for free users
  const [weeklyPnL, setWeeklyPnL] = useState({ BTC: 0, ETH: 0, BNB: 0, total: 0 });

  // Weekly stats for "This Week's Signal Activity"
  const [weeklyStats, setWeeklyStats] = useState({ total: 0, wins: 0, pnlSum: 0, seen: 0 });

  // local states for Telegram pairing step status
  const [tgPairingStep, setTgPairingStep] = useState(1); // 1: disconnected, 2: pairing code input
  const [tgPairingCode, setTgPairingCode] = useState(['', '', '', '', '', '']);
  const [tgStatus, setTgStatus] = useState(''); // 'loading' | 'success' | 'error'
  const [isTelegramChannelJoined, setIsTelegramChannelJoined] = useState(false);

  const [showFreeSuccessModal, setShowFreeSuccessModal] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTelegramChannelJoined(localStorage.getItem('sanddock_tg_channel_joined') === 'true');
      const params = new URLSearchParams(window.location.search);
      if (params.get('signup_success') === 'true') {
        setShowFreeSuccessModal(true);
      }
    }
  }, []);

  // Fetch application status
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

  // Fetch weekly PnL data from past 7 days
  useEffect(() => {
    const fetchWeeklyPnL = async () => {
      try {
        const response = await fetch('/api/weekly-pnl');
        const data = await response.json();
        setWeeklyPnL(data);
      } catch (error) {
        console.error('Failed to fetch weekly PnL:', error);
      }
    };

    fetchWeeklyPnL();
    const interval = setInterval(fetchWeeklyPnL, 300000);
    return () => clearInterval(interval);
  }, []);
  const [upgradeModal,      setUpgradeModal]       = useState(false);
  const [upgradeTriggerText,setUpgradeTriggerText] = useState({ title: '', desc: '' });
  const [profileMenuOpen,   setProfileMenuOpen]    = useState(false);
  const [bannerVisible,     setBannerVisible]      = useState(false);

  // Lifted Chart Selectors State
  const [selectedSymbol,   setSelectedSymbol]   = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState('30m'); // PRODUCTION: 30m only
  const [viewMode,         setViewMode]         = useState('Split');

  useEffect(() => {
    // Always use 30m - ignore user's default_timeframe setting
    setSelectedInterval('30m');
    if (profile?.default_view) {
      setViewMode(profile.default_view);
    }
  }, [profile?.default_view]);

  // Detail Drawer state
  const [selectedDrawerSignal, setSelectedDrawerSignal] = useState(null);
  
  // Performance chart & history states
  const [perfTimeFilter, setPerfTimeFilter] = useState('1y');
  const [perfSymbol, setPerfSymbol] = useState('ALL');
  const [perfSignals, setPerfSignals] = useState([]);
  const [perfLoading, setPerfLoading] = useState(true);
  const [startingCapital, setStartingCapital] = useState(10000);
  const [loadingPrompt, setLoadingPrompt] = useState(null);
  useEffect(() => {
    const idx = Math.floor(Math.random() * LOADING_PROMPTS.length);
    setLoadingPrompt(LOADING_PROMPTS[idx]);
  }, []);

  // Sync tab from URL query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['signals', 'chart', 'history', 'stats'].includes(tab)) {
        setActiveTabState(tab);
      }
    }
  }, []);

  // Signal generation (create/close) is handled entirely by the standalone
  // Railway worker (telegram-signal-worker/) — this app is read-only with
  // respect to the `signals` table. No sync trigger needed here.

  const signalFilters = useMemo(() => ({
    plan:        profile?.plan || 'free',
    signal_type: signalTypeFilter !== 'all' ? signalTypeFilter : undefined,
    interval:    selectedInterval,
  }), [profile?.plan, signalTypeFilter, selectedInterval]);

  const { signals: liveSignals, loading: sigLoading } = useSignals(signalFilters);
  const { signals: logSignals,  loading: logLoading  } = useSignalLog({ plan: profile?.plan || 'free', user_id: profile?.id, symbol: selectedSymbol, interval: selectedInterval });
  
  const cleanLogSignals = useMemo(() => {
    if (!logSignals) return [];
    let filtered = logSignals;
    if (profile?.min_confidence != null) {
      filtered = filtered.filter(s => (s.confidence || 75) >= profile.min_confidence);
    }
    return filtered;
  }, [logSignals, profile?.min_confidence]);
  
  const openSignalsCount = useMemo(() => {
    if (!liveSignals || liveSignals.length === 0) return 0;
    return liveSignals.filter(s => !s.closed_at).length;
  }, [liveSignals]);

  const [headerAllTimePnl, setHeaderAllTimePnl] = useState('0.00');

  useEffect(() => {
    if (!profile?.created_at) return;
    const fetchHeaderPnl = async () => {
      try {
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch(`/api/performance/alltime-pnl?plan=${profile.plan || 'free'}&joined_at=${oneYearAgo}&interval=${selectedInterval}`);
        if (res.ok) {
          const data = await res.json();
          setHeaderAllTimePnl(parseFloat(data.total_pnl_pct || 0).toFixed(2));
        }
      } catch (err) {
        console.warn('Failed to fetch header all-time PNL:', err.message);
      }
    };
    fetchHeaderPnl();
  }, [profile?.plan, profile?.created_at, selectedInterval]);

  // Live price poll
  const [livePrices, setLivePrices] = useState({});
  const liveBtcPrice = livePrices[selectedSymbol] || null;
  const setLiveBtcPrice = (price) => {
    setLivePrices(prev => ({ ...prev, [selectedSymbol]: price }));
  };

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/price', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const pricesMap = {};
          data.forEach(item => {
            if (item.symbol.endsWith('USDT')) {
              pricesMap[item.symbol] = parseFloat(item.price);
            }
          });
          setLivePrices(pricesMap);
        } else {
          throw new Error(`Binance response error: ${res.status}`);
        }
      } catch (e) {
        console.warn('Live price poll failed, seeding from active signals:', e.message);
        setLivePrices(prev => {
          const updated = { ...prev };
          if (cleanLiveSignals && cleanLiveSignals.length > 0) {
            cleanLiveSignals.forEach(sig => {
              if (updated[sig.symbol] === undefined) {
                updated[sig.symbol] = parseFloat(sig.entry_price);
              }
            });
          }
          return updated;
        });
      }
    };
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch closed performance signals history based on filter
  useEffect(() => {
    if (logLoading) return; // Wait until log (which seeds the DB) is loaded
    const fetchPerfHistory = async () => {
      try {
        setPerfLoading(true);
        const res = await fetch(`/api/signals/history?symbol=${perfSymbol}&interval=${selectedInterval}&filter=${perfTimeFilter}&plan=${profile?.plan || 'free'}&timezone=${profile?.timezone || 'UTC'}`);
        if (res.ok) {
          const data = await res.json();
          setPerfSignals(data);
        }
      } catch (err) {
        console.error('Failed to fetch performance history:', err);
      } finally {
        setPerfLoading(false);
      }
    };
    fetchPerfHistory();
  }, [perfSymbol, selectedInterval, perfTimeFilter, logLoading, profile?.plan]);

  // Compute stats dynamically based on performance signals
  const computedStats = useMemo(() => {
    if (!perfSignals || perfSignals.length === 0) return null;
    const completed = perfSignals;
    const wins = completed.filter(s => s.is_win === true).length;
    const losses = completed.filter(s => s.is_win === false).length;
    const pnlValues = completed.map(s => parseFloat(s.pnl_pct || 0));
    
    let cumulativeR = 0;
    completed.forEach(s => {
      const pnl = parseFloat(s.pnl_pct || 0);
      const sl = parseFloat(s.sl_pct || 0);
      const r = sl > 0 ? (pnl / sl) : 0;
      cumulativeR += r;
    });

    const avgPnl = pnlValues.length > 0
      ? (pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length).toFixed(2)
      : '0.00';
    const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues).toFixed(2) : '0.00';
    const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues).toFixed(2) : '0.00';
    const winRate = completed.length > 0
      ? ((wins / completed.length) * 100).toFixed(1)
      : '0.0';

    const positiveSum = pnlValues.filter(p => p > 0).reduce((sum, p) => sum + p, 0);
    const negativeSum = Math.abs(pnlValues.filter(p => p < 0).reduce((sum, p) => sum + p, 0));
    const profitFactor = negativeSum > 0 ? (positiveSum / negativeSum).toFixed(2) : positiveSum > 0 ? 'Infinite' : '-';

    // Plain arithmetic sum of the % moves shown in the signal log — distinct
    // from cumulative_r (R-multiple sum, i.e. account return assuming fixed
    // 1% risk per signal). Kept separate on purpose: they answer different
    // questions and shouldn't be conflated into one number.
    const rawPnlSum = pnlValues.reduce((sum, p) => sum + p, 0);

    return {
      total_signals: completed.length,
      wins,
      losses,
      win_rate_pct: winRate,
      avg_pnl: avgPnl,
      best_trade: bestTrade,
      worst_trade: worstTrade,
      profit_factor: profitFactor,
      cumulative_r: cumulativeR,
      raw_pnl_sum: rawPnlSum,
    };
  }, [perfSignals]);

  const calibrationAuditData = useMemo(() => {
    if (!perfSignals || perfSignals.length === 0) return [];
    
    const bands = [
      { label: '90% - 100% Conviction', min: 90, max: 100 },
      { label: '80% - 89% Conviction', min: 80, max: 89 },
      { label: '70% - 79% Conviction', min: 70, max: 79 },
      { label: '< 70% Conviction', min: 0, max: 69 },
    ];
    
    return bands.map(band => {
      const filtered = perfSignals.filter(s => {
        const conf = s.confidence || 75;
        return conf >= band.min && conf <= band.max;
      });
      
      const sampleSize = filtered.length;
      if (sampleSize === 0) {
        return {
          ...band,
          sampleSize: 0,
          winRate: '0.0%',
          avgR: '0.00 R',
        };
      }
      
      const wins = filtered.filter(s => s.is_win === true).length;
      const winRate = ((wins / sampleSize) * 100).toFixed(1) + '%';
      
      let sumR = 0;
      filtered.forEach(s => {
        const pnl = parseFloat(s.pnl_pct || 0);
        const sl = parseFloat(s.sl_pct || 0);
        const r = sl > 0 ? (pnl / sl) : 0;
        sumR += r;
      });
      const avgR = (sumR / sampleSize).toFixed(2) + ' R';
      
      return {
        ...band,
        sampleSize,
        winRate,
        avgR,
      };
    });
  }, [perfSignals]);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login');
      else if (!profile?.onboarding_completed_at) router.push('/onboarding');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (profile) {
      setSettingsExperience(profile.experience_level || 'comfortable');
      setSettingsRisk(profile.risk_style || 'balanced');
      setSettingsGoal(profile.primary_goal || 'grow');
      setSettingsAccountSize(profile.account_size != null ? Number(profile.account_size) : 10000);
      
      const r = profile.risk_per_trade != null ? Number(profile.risk_per_trade) : 1.0;
      if (r === 1.0) {
        setSettingsRiskPerTradeType('1%');
      } else if (r === 1.5) {
        setSettingsRiskPerTradeType('1.5%');
      } else if (r === 2.0) {
        setSettingsRiskPerTradeType('2%');
      } else {
        setSettingsRiskPerTradeType('custom');
        setSettingsCustomRiskVal(r.toString());
      }

      setSettingsMinConfidence(profile.min_confidence != null ? profile.min_confidence : 75);
      setSettingsDefaultTimeframe('30m'); // PRODUCTION: 30m only
      setSettingsDefaultView(profile.default_view || 'Split');
      setSettingsTimezone(profile.timezone || 'UTC');
      setSettingsPriceFormat(profile.price_format || 'usd');
      setSettingsEmailSignalClosed(profile.email_signal_closed !== false);
      setSettingsEmailWeeklyDebrief(profile.email_weekly_debrief !== false);
      setSettingsEmailSystemAlerts(profile.email_system_alerts !== false);

      if (profile.plan === 'free') {
        const dismissed  = localStorage.getItem('sanddock_free_banner_dismissed') === 'true';
        const viewsCount = parseInt(localStorage.getItem('sanddock_free_banner_views') || '0');
        if (!dismissed && viewsCount < 3) {
          setBannerVisible(true);
          localStorage.setItem('sanddock_free_banner_views', (viewsCount + 1).toString());
        }
      }
    }
  }, [profile]);

  const isFreePlan = profile?.plan === 'free';
  const userPlan = profile?.plan || 'free';

  // Trial features are permanently disabled
  const isTrialExpired = false;
  const trialDaysRemaining = null;

  const teaserCoins = useMemo(() => {
    if (userPlan === 'free') {
      return [
        { symbol: 'ETH/USDT', timeframe: '1H', type: 'BUY', confidence: 89 },
        { symbol: 'SOL/USDT', timeframe: '15m', type: 'SELL', confidence: 82 },
        { symbol: 'BNB/USDT', timeframe: '1H', type: 'BUY', confidence: 91 },
        { symbol: 'XRP/USDT', timeframe: '4H', type: 'BUY', confidence: 86 },
      ];
    } else if (userPlan === 'pro') {
      return [
        { symbol: 'SOL/USDT', timeframe: '15m', type: 'SELL', confidence: 82 },
        { symbol: 'XRP/USDT', timeframe: '4H', type: 'BUY', confidence: 86 },
        { symbol: 'SUI/USDT', timeframe: '1H', type: 'BUY', confidence: 88 },
        { symbol: 'AVAX/USDT', timeframe: '15m', type: 'SELL', confidence: 85 },
      ];
    }
    return [];
  }, [userPlan]);



  const cleanLiveSignals = useMemo(() => {
    let filtered = liveSignals;

    // Apply confidence filter — but never hide a currently open position.
    // min_confidence is meant to gate which NEW signal alerts get surfaced;
    // an already-open trade is real market exposure and must stay visible
    // regardless of the confidence score it happened to fire at, otherwise
    // a user can have an open position that silently disappears from every
    // "active" count and list on the page.
    if (profile?.min_confidence != null) {
      filtered = filtered.filter(s => s.is_live || (s.confidence || 75) >= profile.min_confidence);
    }

    // Apply signal type filter (buy/sell)
    if (signalTypeFilter !== 'all') {
      filtered = filtered.filter(s => s.signal_type?.toLowerCase() === signalTypeFilter.toLowerCase());
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'highest-pnl':
        sorted.sort((a, b) => (parseFloat(b.pnl_pct) || 0) - (parseFloat(a.pnl_pct) || 0));
        break;
      case 'lowest-pnl':
        sorted.sort((a, b) => (parseFloat(a.pnl_pct) || 0) - (parseFloat(b.pnl_pct) || 0));
        break;
      case 'highest-confidence':
        sorted.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        break;
      case 'lowest-confidence':
        sorted.sort((a, b) => (a.confidence || 0) - (b.confidence || 0));
        break;
      case 'win-rate':
        sorted.sort((a, b) => {
          const aWin = a.is_win ? 1 : 0;
          const bWin = b.is_win ? 1 : 0;
          return bWin - aWin;
        });
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => new Date(b.bar_time || b.created_at) - new Date(a.bar_time || a.created_at));
        break;
    }

    return sorted;
  }, [liveSignals, profile?.min_confidence, signalTypeFilter, sortBy]);

  const { activeSignals, closedSignals } = useMemo(() => {
    const active = [];
    const closed = [];
    cleanLiveSignals.forEach(s => {
      if (s.is_live) {
        active.push(s);
      } else {
        closed.push(s);
      }
    });
    return { activeSignals: active, closedSignals: closed };
  }, [cleanLiveSignals]);

  // Calculate weekly stats from signals
  useEffect(() => {
    if (!perfSignals || perfSignals.length === 0) {
      setWeeklyStats({ total: 0, wins: 0, pnlSum: 0, seen: 0 });
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklySignals = perfSignals.filter(s => {
      const sigTime = new Date(s.bar_time || s.created_at);
      return sigTime >= sevenDaysAgo;
    });

    const weeklyWins = weeklySignals.filter(s => s.is_win === true).length;
    const pnlValues = weeklySignals.map(s => parseFloat(s.pnl_pct || 0));
    const pnlSum = pnlValues.reduce((sum, p) => sum + p, 0);
    const seenCount = activeSignals.length;

    setWeeklyStats({
      total: weeklySignals.length,
      wins: weeklyWins,
      pnlSum: pnlSum,
      seen: seenCount
    });
  }, [perfSignals, activeSignals]);


  // Get the most recent LIVE signal for the selected symbol to display on chart
  const selectedSymbolActiveSignal = useMemo(() => {
    const activeForSymbol = cleanLiveSignals.filter(s => s.symbol === selectedSymbol && s.is_live);
    return activeForSymbol.length > 0 ? activeForSymbol[activeForSymbol.length - 1] : null;
  }, [cleanLiveSignals, selectedSymbol]);

  // Load fallback signals when live feed is empty (to prevent conversion drop)
  // Retrieve the most recent signal from the general history ledger
  const { signals: allBtcHistoryLog } = useSignalLog({ plan: 'free', symbol: 'BTCUSDT', pageSize: 6 });
  
  const lastBtcSignal = useMemo(() => {
    if (allBtcHistoryLog && allBtcHistoryLog.length > 0) {
      return allBtcHistoryLog[0];
    }
    return null;
  }, [allBtcHistoryLog]);

  const recentBtcSignals = useMemo(() => {
    if (allBtcHistoryLog && allBtcHistoryLog.length > 1) {
      // Exclude signals already shown in today's Active/Closed sections above.
      const shownIds = new Set(cleanLiveSignals.map(s => s.id));
      return allBtcHistoryLog.slice(1, 6).filter(s => !shownIds.has(s.id));
    }
    return [];
  }, [allBtcHistoryLog, cleanLiveSignals]);

  // Single unified feed: today's signals (active + closed) plus recent BTC history, deduped, newest first.
  const allRecentSignals = useMemo(() => {
    const seen = new Set();
    const merged = [];

    // Apply signal type filter to both cleanLiveSignals and recentBtcSignals
    const filteredRecentBtc = recentBtcSignals.filter(s => {
      if (signalTypeFilter !== 'all') {
        return s.signal_type?.toLowerCase() === signalTypeFilter.toLowerCase();
      }
      return true;
    });

    [...cleanLiveSignals, ...filteredRecentBtc].forEach(s => {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    });

    // Apply sorting based on sortBy state
    const sorted = [...merged];
    switch (sortBy) {
      case 'highest-pnl':
        sorted.sort((a, b) => (parseFloat(b.pnl_pct) || 0) - (parseFloat(a.pnl_pct) || 0));
        break;
      case 'lowest-pnl':
        sorted.sort((a, b) => (parseFloat(a.pnl_pct) || 0) - (parseFloat(b.pnl_pct) || 0));
        break;
      case 'highest-confidence':
        sorted.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        break;
      case 'lowest-confidence':
        sorted.sort((a, b) => (a.confidence || 0) - (b.confidence || 0));
        break;
      case 'win-rate':
        sorted.sort((a, b) => {
          const aWin = a.is_win ? 1 : 0;
          const bWin = b.is_win ? 1 : 0;
          return bWin - aWin;
        });
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => {
          const tA = new Date(a.bar_time || a.created_at).getTime();
          const tB = new Date(b.bar_time || b.created_at).getTime();
          return tB - tA;
        });
        break;
    }

    return sorted;
  }, [cleanLiveSignals, recentBtcSignals, sortBy, signalTypeFilter]);

  const todayStats = useMemo(() => {
    // On Live Signals tab: show all recent signals (live + closed + history)
    // On other tabs: show only the selected symbol's live signals
    const todaySignals = activeTab === 'signals'
      ? allRecentSignals
      : cleanLiveSignals.filter(s => s.symbol === selectedSymbol);

    const mapped = todaySignals.map((sig) => {
      let pnlVal = 0;
      if (sig.is_live) {
        const currentPrice = livePrices[sig.symbol];
        if (currentPrice) {
          const pnl = ((currentPrice - sig.entry_price) / sig.entry_price) * 100;
          pnlVal = sig.signal_type === 'buy' ? pnl : -pnl;
        } else {
          pnlVal = 0;
        }
      } else {
        pnlVal = parseFloat(sig.pnl_pct || 0);
      }
      return pnlVal;
    });

    const totalTrades = mapped.length;
    const wins = mapped.filter(p => p > 0).length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '-';
    const sumPnl = mapped.reduce((sum, p) => sum + p, 0);

    const confidences = todaySignals.map(s => s.confidence || 0).filter(c => c > 0);
    const avgConfidence = confidences.length > 0
      ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(0) + '%'
      : '82%';

    return {
      totalTrades,
      winRate,
      sumPnl: sumPnl.toFixed(2),
      avgConfidence
    };
  }, [cleanLiveSignals, livePrices, selectedSymbol, activeTab, allRecentSignals]);

  const triggerUpgradeGate = (title, desc) => {
    setUpgradeTriggerText({ title, desc });
    setUpgradeModal(true);
  };

  const handleVirtualUpgrade = () => {
    setUpgradeModal(false);
    router.push('/pricing');
  };


  if (loading || !user || !profile) {
    const prompt = loadingPrompt || LOADING_PROMPTS[0];
    const categoryColors = {
      'Trading Tip': 'border-amber-500 text-amber-400 bg-amber-500/5',
      'Success Story': 'border-emerald-500 text-emerald-400 bg-emerald-500/5',
      'Motivation': 'border-[#3D5AFE] text-[#3D5AFE] bg-[#3D5AFE]/5'
    };
    const categoryBorderColor = categoryColors[prompt.type] || 'border-zinc-500 text-white';

    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-satoshi">
        {/* Background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3D5AFE]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-brand-orange/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md flex flex-col items-center gap-8 relative z-10 animate-fade-in">
          {/* Logo or icon */}
          <div className="flex flex-col items-center gap-2">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-10 h-10 object-contain animate-pulse" />
            <h2 className="text-lg font-bold tracking-wider font-satoshi uppercase text-white">
              SANDDOCK <span className="text-[#3D5AFE]">CONSOLE</span>
            </h2>
          </div>

          {/* Premium Circular Spinner */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border border-[#3D5AFE]/20 animate-ping" />
            {/* Spinning gradient ring */}
            <div className="w-12 h-12 border-2 border-slate-800 border-t-[#3D5AFE] border-r-[#3D5AFE] rounded-full animate-spin" />
            {/* Inner dot */}
            <div className="absolute w-2 h-2 rounded-full bg-[#3D5AFE] animate-pulse" />
          </div>

          {/* Randomized prompt card */}
          <div className={`w-full p-5 rounded-xl border-l-4 ${categoryBorderColor} bg-slate-950/40 backdrop-blur-md shadow-xl transition-all duration-500`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold font-satoshi uppercase tracking-widest opacity-80">
                {prompt.type}
              </span>
              <span className="text-[9px] font-satoshi text-white uppercase tracking-wider">
                Console Sync
              </span>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed font-satoshi font-medium">
              "{prompt.content}"
            </p>
          </div>

          {/* Subtle loading label */}
          <div className="flex items-center gap-2">
            <span className="text-white uppercase tracking-widest text-[9px] font-satoshi animate-pulse">
              Restoring secure terminal session...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: 'signals', icon: Icons.Signals, label: 'Live Signals' },
    { id: 'chart',   icon: Icons.Chart, label: 'Heikin Ashi Chart' },
    { id: 'history', icon: Icons.History, label: 'Signal Log' },
    { id: 'stats',   icon: Icons.Performance, label: 'Performance' },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#000000] text-white flex flex-col font-satoshi">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-35 h-14 w-full flex-shrink-0 bg-[#000000]/90 backdrop-blur-md border-b border-[#1e2a3a] px-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/sanddock-logo.png" alt="Sanddock" className="w-6 h-6 object-contain" />
          <span className="text-[15px] font-bold uppercase tracking-wider font-satoshi">
            Sanddock <span className="text-brand-orange">Console</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-satoshi font-bold bg-[#000000] border border-zinc-800 text-white uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Signals Live
          </span>
        </div>

        <div className="flex items-center gap-3 relative">
          <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-satoshi font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
            Total PnL: +142.8%
          </span>

          {/* Plan badge + trial countdown */}
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-satoshi font-bold px-2 py-0.5 uppercase tracking-wider ${
              isTrialExpired
                ? 'bg-red-900/60 text-red-400 border border-red-700/50'
                : isFreePlan
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : userPlan === 'lifetime'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-brand-orange text-white'
            }`}>
              {isTrialExpired ? 'Trial Expired' : isFreePlan ? `Trial${trialDaysRemaining !== null ? ` - ${trialDaysRemaining}d` : ''}` : `${profile.plan} Plan`}
            </span>
            {isFreePlan && !isTrialExpired && trialDaysRemaining !== null && trialDaysRemaining <= 3 && (
              <span className="text-[10px] font-bold text-amber-400 animate-pulse font-satoshi uppercase">⚠ Expiring</span>
            )}
          </div>

          <button
            onClick={() => alert('All signal notification systems active.')}
            className="text-white hover:text-white transition-colors cursor-pointer relative p-1 bg-transparent border-0"
          >
            <Icons.Bell active={isFreePlan} />
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-8 h-8 rounded-full bg-brand-orange text-white font-satoshi font-bold text-[12px] flex items-center justify-center cursor-pointer border border-[#1e2a3a] hover:border-brand-orange"
            >
              {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'SD'}
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#000000] border border-[#1e2a3a] shadow-xl py-1 z-50 text-left">
                <div className="px-4 py-2.5 border-b border-zinc-900">
                  <span className="block font-bold text-[13px] text-white uppercase tracking-wider">{profile.name}</span>
                  <span className="block text-[11px] text-white font-satoshi truncate mt-0.5">{profile.email}</span>
                </div>
                <a href="/billing"
                  className="block w-full text-left px-4 py-2.5 text-[13px] text-zinc-300 hover:bg-[#111827] hover:text-white uppercase font-bold tracking-wider">
                  Billing & Plan
                </a>
                {isFreePlan && (
                  <button onClick={() => { triggerUpgradeGate('Upgrade Account', 'Unlock advanced features and push alerts.'); setProfileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-brand-orange hover:bg-[#111827] uppercase font-bold tracking-wider cursor-pointer bg-transparent border-0">
                    Upgrade Plan
                  </button>
                )}
                <button onClick={() => { signOut(); setProfileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-[#111827] uppercase font-bold tracking-wider cursor-pointer border-t border-zinc-900 bg-transparent">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-80 bg-[#000000] border-r border-[#1e2a3a] p-4 justify-between select-none h-full overflow-y-auto flex-shrink-0">
          <div className="space-y-5">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-white uppercase tracking-widest block px-3 text-left">Trading Room</span>
              <nav className="space-y-0.5">
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-colors text-left cursor-pointer border-0 bg-transparent ${
                        activeTab === item.id
                          ? 'text-brand-orange bg-[#000000] border-l-2 border-brand-orange'
                          : 'text-white hover:text-white hover:bg-zinc-950/20'
                      }`}>
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-900">
            {/* Application Status Alert */}
            {applicationStatus && (
              <div className={`bg-[#000000] border p-3 space-y-2 text-left ${
                applicationStatus.status === 'accepted' ? 'border-emerald-500/20' :
                applicationStatus.status === 'pending' ? 'border-blue-500/20' :
                applicationStatus.status === 'waitlisted' ? 'border-amber-500/20' :
                'border-red-500/20'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    applicationStatus.status === 'accepted' ? 'bg-emerald-500' :
                    applicationStatus.status === 'pending' ? 'bg-blue-500' :
                    applicationStatus.status === 'waitlisted' ? 'bg-amber-500' :
                    'bg-red-500'
                  } ${applicationStatus.status === 'pending' ? 'animate-pulse' : ''}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest font-satoshi ${
                    applicationStatus.status === 'accepted' ? 'text-emerald-500' :
                    applicationStatus.status === 'pending' ? 'text-blue-500' :
                    applicationStatus.status === 'waitlisted' ? 'text-amber-500' :
                    'text-red-500'
                  }`}>
                    {applicationStatus.status === 'accepted' ? '✓ Approved' :
                     applicationStatus.status === 'pending' ? '⏳ Under Review' :
                     applicationStatus.status === 'waitlisted' ? '⏳ Waiting List' :
                     '✗ Rejected'}
                  </span>
                </div>
                <p className="text-[11px] text-white normal-case leading-relaxed">
                  Your application for <span className="font-bold">{applicationStatus.plan?.toUpperCase()}</span>
                  {applicationStatus.status === 'pending' && ' is under review. We\'ll notify you within 24 hours.'}
                  {applicationStatus.status === 'waitlisted' && ' is under review. We\'ll notify you as soon as it\'s approved.'}
                  {applicationStatus.status === 'accepted' && ' is approved! Contact us to complete payment.'}
                  {applicationStatus.status === 'rejected' && ' was not approved. Contact us to discuss.'}
                </p>
                <a
                  href="https://t.me/alexsanddockcom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold uppercase tracking-wider text-blue-400 hover:text-white transition-colors block underline">
                  Contact @alexsanddockcom →
                </a>
              </div>
            )}

            {/* Telegram status */}
            {profile.telegram_chat_id && (
              <div className="bg-[#000000] border border-emerald-500/20 p-3 space-y-1.5 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Alerts Active</span>
                </div>
                <p className="text-[11px] text-white normal-case leading-relaxed">Telegram delivery synced.</p>
              </div>
            )}

            {isFreePlan && (
              <>
                <div className="bg-[#000000] border border-amber-900/50 p-3 space-y-2.5 text-left">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-600 font-satoshi">📊 1 Week PnL</span>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between items-center">
                      <span className="text-white">BTC:</span>
                      <span className={weeklyPnL.BTC >= 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                        {weeklyPnL.BTC >= 0 ? '+' : ''}{weeklyPnL.BTC.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">ETH:</span>
                      <span className={weeklyPnL.ETH >= 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                        {weeklyPnL.ETH >= 0 ? '+' : ''}{weeklyPnL.ETH.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">BNB:</span>
                      <span className={weeklyPnL.BNB >= 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                        {weeklyPnL.BNB >= 0 ? '+' : ''}{weeklyPnL.BNB.toFixed(2)}%
                      </span>
                    </div>
                    <div className="border-t border-zinc-800 pt-1.5 mt-1.5 flex justify-between items-center font-bold">
                      <span className="text-white">Total 1W PnL:</span>
                      <span className={weeklyPnL.total >= 0 ? 'text-emerald-500' : 'text-orange-500'}>
                        {weeklyPnL.total >= 0 ? '+' : ''}{weeklyPnL.total.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-white normal-case leading-relaxed pt-1 border-t border-zinc-800">
                    Upgrade to Pro to trade all coins and capture full opportunities.
                  </p>
                </div>
              </>
            )}

            {profile?.plan === 'pro' && (
              <>
                <div className="bg-[#000000] border border-purple-500/25 p-3 space-y-1.5 text-left">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-purple-400 font-satoshi">🔔 Master Alerts Missed</span>
                  <p className="text-[11px] text-white normal-case leading-relaxed">
                    18 signals fired on locked Master coins this week. Upgrade to Master to access SOL, XRP, and 10 other high-beta coins.
                  </p>
                </div>

                <div className="bg-[#000000] border border-zinc-800 p-3 space-y-2.5 text-left">
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-purple-400 font-satoshi">Pro Plan Active</span>
                    <p className="text-[11px] text-white normal-case leading-relaxed">Pro - 3 of 15 coins active.</p>
                  </div>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] uppercase tracking-wider transition-colors border border-purple-600 cursor-pointer text-center block"
                  >
                    Upgrade to Master
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* MAIN PANEL */}
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 bg-[#000000] p-5 lg:p-7 overflow-y-auto pb-24 lg:pb-8 h-full">

            {/* ══ SIGNALS TAB ════════════════════════════════════════════════ */}
            {activeTab === 'signals' && (
              <div className="space-y-5 animate-slide-up">

                {/* Today's Overview Banner */}
                <div className="bg-[#000000] border border-slate-800/50 rounded-2xl p-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-left shadow-xl select-none">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-white font-satoshi">Signals Today</span>
                    <span className="block text-3xl font-extrabold font-satoshi text-white">
                      {todayStats.totalTrades}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-white font-satoshi">Active Signals</span>
                    <span className="block text-3xl font-extrabold font-satoshi text-white">
                      {activeSignals.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-white font-satoshi">Avg Confidence</span>
                    <span className="block text-3xl font-extrabold font-satoshi text-white">
                      {todayStats.avgConfidence}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-white font-satoshi">Engine Status</span>
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20 uppercase font-satoshi">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                      </span>
                    </div>
                  </div>
                </div>



                {/* Filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-[#070b16]/40 border border-slate-800/50 rounded-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex p-0.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      {['all', 'buy', 'sell'].map(type => (
                        <button key={type} onClick={() => setSignalTypeFilter(type)}
                          className={`px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer border-0 ${
                            signalTypeFilter === type ? 'bg-[#3D5AFE] text-white shadow-md' : 'text-white hover:text-white bg-transparent'
                          }`}>
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="flex p-0.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      {['30m'].map(tf => (
                        <button key={tf}
                          onClick={() => setSelectedInterval(tf)}
                          className={`px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer border-0 ${
                            selectedInterval === tf ? 'bg-[#3D5AFE] text-white shadow-md' : 'text-white hover:text-white bg-transparent'
                          }`}>
                          {tf}
                        </button>
                      ))}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white">Sort:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-slate-950 text-xs text-white font-satoshi rounded-lg border border-slate-800 px-3 py-1.5 focus:outline-none focus:border-[#3D5AFE] cursor-pointer"
                      >
                        <option value="recent">Recent</option>
                        <option value="highest-pnl">Highest PnL</option>
                        <option value="lowest-pnl">Lowest PnL</option>
                        <option value="highest-confidence">Highest Confidence</option>
                        <option value="lowest-confidence">Lowest Confidence</option>
                        <option value="win-rate">Winners First</option>
                      </select>
                    </div>

                    {/* Custom Coins Management - MASTER only */}
                    {['master', 'grandmaster'].includes(profile?.plan) && (
                      <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white">Custom:</span>
                        <input
                          type="text"
                          placeholder="e.g. SOLUSDT"
                          id="customCoinInput"
                          className="bg-slate-950 text-xs text-white font-satoshi rounded-lg border border-slate-800 px-2 py-1 focus:outline-none focus:border-[#3D5AFE]"
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById('customCoinInput');
                            const symbol = input?.value?.toUpperCase();
                            if (!symbol) {
                              alert('Enter a coin symbol (e.g., SOLUSDT)');
                              return;
                            }
                            try {
                              const res = await fetch('/api/custom-coins', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  user_id: profile?.id,
                                  symbol,
                                  plan: profile?.plan
                                })
                              });
                              const data = await res.json();
                              if (res.ok) {
                                alert(`Added ${symbol}!`);
                                if (input) input.value = '';
                                window.location.reload();
                              } else {
                                alert(data.error || 'Failed to add coin');
                              }
                            } catch (e) {
                              alert('Error: ' + e.message);
                            }
                          }}
                          className="px-2 py-1 bg-[#3D5AFE] hover:bg-[#2943d0] text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer border-0"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-white font-satoshi text-xs">
                    {sigLoading && <div className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-[#3D5AFE] rounded-full animate-spin" />}
                    <span>
                      {sigLoading ? 'Updating setups...' : `${cleanLiveSignals.length} signal${cleanLiveSignals.length !== 1 ? 's' : ''} today`}
                    </span>
                  </div>
                </div>

                {/* Custom Coins List - MASTER only */}
                {['master', 'grandmaster'].includes(profile?.plan) && (
                  <CustomCoinsList userId={profile?.id} plan={profile?.plan} />
                )}

                {/* Empty State / Monitoring Layout with fallbacks (BTC Signals) */}
                {!isTrialExpired && !sigLoading && cleanLiveSignals.length === 0 && (
                  <div className="space-y-6">
                    {/* Scanning & Monitoring Animation Banner */}
                    <div className="bg-[#0d1426] border border-[#1e2a3a] p-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-brand-orange/30 flex items-center justify-center relative">
                          <span className="absolute w-6 h-6 rounded-full border border-brand-orange/60 animate-ping" />
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[13px] uppercase tracking-wider text-white">Scanning market parameters...</h3>
                          <p className="text-[12px] text-white normal-case leading-relaxed">
                            Watch the engine detect the next BTC signal - usually within a few hours.
                          </p>
                        </div>
                      </div>
                      {isFreePlan && (
                        <button onClick={() => triggerUpgradeGate('Enable Push Notifications', 'Enable instant Telegram alerts on Pro.')}
                          className="py-2 px-5 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[12px] uppercase tracking-widest transition-colors cursor-pointer border-0">
                          Enable Telegram Alerts →
                        </button>
                      )}
                    </div>

                    {/* 1. Show the last BTC signal with a LAST SIGNAL badge */}
                    {lastBtcSignal && (
                      <div className="space-y-2">
                        <span className="block text-[11px] font-satoshi text-white uppercase tracking-widest text-left">
                          Previous Active Setup
                        </span>
                        <div className="bg-[#070b16]/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
                          <SignalCard
                            sig={lastBtcSignal}
                            isFreePlan={isFreePlan}
                            isLastSignalBadge={true}
                            isExpanded={false}
                            onToggle={() => {}}
                            onUpgrade={triggerUpgradeGate}
                            onViewDetails={(s) => window.open(`/terminal/signals/${s.id}`, '_blank')}
                            livePrice={selectedSymbol === 'BTCUSDT' ? liveBtcPrice : null}
                            isLive={lastBtcSignal.is_live}
                          />
                        </div>
                      </div>
                    )}

                    {/* 2. Show Recent Signals below it */}
                    {recentBtcSignals.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-left">
                          <span className="block text-[11px] font-satoshi text-white uppercase tracking-widest">
                            Recent BTC Signals
                          </span>
                          <p className="text-[11px] text-white normal-case leading-relaxed">
                            These signals fired in the past 7 days. New signals appear here as they fire.
                          </p>
                        </div>
                        <div className="bg-[#070b16]/60 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/40 shadow-2xl">
                          {recentBtcSignals.map(sig => (
                            <SignalCard
                              key={sig.id}
                              sig={sig}
                              isFreePlan={isFreePlan}
                              isLastSignalBadge={false}
                              isExpanded={false}
                              onToggle={() => {}}
                              onUpgrade={triggerUpgradeGate}
                              onViewDetails={(s) => window.open(`/terminal/signals/${s.id}`, '_blank')}
                              isLive={false}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Active signals view layout */}
                {!isTrialExpired && cleanLiveSignals.length > 0 && (
                  <div className="space-y-6">
                    {/* Unified Recent Signals feed: today's active + closed, plus recent BTC history */}
                    {allRecentSignals.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#3D5AFE]">{"Recent Signals"}</span>
                            <span className="px-2 py-0.5 text-[9px] font-satoshi font-bold bg-[#3D5AFE]/15 text-[#3D5AFE] rounded border border-[#3D5AFE]/20">
                              {allRecentSignals.length} TOTAL
                            </span>
                          </div>
                          <span className="text-[10px] text-white font-satoshi uppercase tracking-wider">Chronological feed of setups</span>
                        </div>

                        <div className="bg-[#070b16]/60 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/40 shadow-2xl">
                          {allRecentSignals.map((sig) => {
                            const globalIndex = allRecentSignals.findIndex(s => s.id === sig.id);
                            return (
                              <SignalCard
                                key={sig.id}
                                sig={sig}
                                profile={profile}
                                isFreePlan={isFreePlan}
                                isExpanded={false}
                                onToggle={() => {}}
                                onUpgrade={triggerUpgradeGate}
                                onViewDetails={(s) => window.open(`/terminal/signals/${s.id}`, '_blank')}
                                livePrice={livePrices[sig.symbol] || null}
                                isLive={sig.is_live}
                                rank={globalIndex + 1}
                                isLatest={globalIndex === 0}
                                nextSignal={globalIndex > 0 ? allRecentSignals[globalIndex - 1] : null}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Locked/Teaser Signals Section */}
                    {teaserCoins.length > 0 && (
                      <div className="space-y-5 pt-2">
                        {/* CTA Banner - Premium Dark Style */}
                        <div className="relative rounded-lg border border-orange-500/30 bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] p-8 overflow-hidden">
                          {/* Accent bar */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff4500] via-orange-500 to-transparent" />

                          <div className="space-y-4 relative z-10">
                            <div className="flex items-start gap-3">
                              <svg className="w-8 h-8 text-orange-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <h3 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight text-white leading-tight pt-1">
                                Unlock ETH & BNB
                              </h3>
                            </div>
                            <p className="text-white/80 text-sm leading-relaxed max-w-2xl">
                              Upgrade to Pro for full signal access across all 3 coins with live Telegram alerts, automated stop-losses, and take-profits.
                            </p>
                            <button
                              onClick={() => router.push('/pricing')}
                              className="bg-gradient-to-r from-[#ff4500] to-orange-500 hover:from-orange-500 hover:to-[#ff6b3d] font-bold text-white text-xs uppercase tracking-widest px-6 py-2.5 transition-all rounded-lg inline-block shadow-lg hover:shadow-orange-500/25"
                            >
                              Upgrade to Pro →
                            </button>
                          </div>
                        </div>

                        {/* This Week's Signal Activity - Enhanced Design */}
                        <div className="border border-slate-800/60 bg-gradient-to-b from-[#0f0f0f] to-[#070707] rounded-lg p-6 space-y-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-[#ff4500]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#ff4500] font-satoshi">THIS WEEK'S STATS</h4>
                            </div>
                            <p className="text-white/60 text-xs">Across all {weeklyStats.total} signals fired</p>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Stat 1: Signals Fired */}
                            <div className="border border-slate-800/40 bg-[#0a0a0a] rounded-lg p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className="text-xs text-white/60 uppercase font-satoshi tracking-wide">Signals</span>
                              </div>
                              <span className="text-2xl font-bold text-white">{weeklyStats.total}</span>
                            </div>

                            {/* Stat 2: Winners */}
                            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs text-white/60 uppercase font-satoshi tracking-wide">Wins</span>
                              </div>
                              <span className="text-2xl font-bold text-emerald-400">{weeklyStats.wins}</span>
                            </div>

                            {/* Stat 3: Combined PnL */}
                            <div className="col-span-2 border border-orange-500/20 bg-orange-500/5 rounded-lg p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7H5v12h8V7z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 13h6V7h-6v6z" />
                                </svg>
                                <span className="text-xs text-white/60 uppercase font-satoshi tracking-wide">Combined PnL (1% risk each)</span>
                              </div>
                              <span className={`text-2xl font-bold ${weeklyStats.pnlSum >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {weeklyStats.pnlSum >= 0 ? '+' : ''}{weeklyStats.pnlSum.toFixed(2)}%
                              </span>
                            </div>
                          </div>

                          {/* FOMO Section */}
                          <div className="border-t border-slate-800/40 pt-6 space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <div>
                                  <p className="text-white font-bold text-sm">
                                    You saw {weeklyStats.seen} of {weeklyStats.total} signals
                                  </p>
                                  <p className="text-white/60 text-xs mt-1">(Free tier: BTC only)</p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#1a0f00] border border-orange-500/20 rounded-lg p-4 space-y-2">
                              <p className="text-white font-semibold text-sm">
                                You missed <span className="text-orange-400 font-bold">{Math.max(0, weeklyStats.total - weeklyStats.seen)} signals</span> on ETH & BNB
                              </p>
                              <p className="text-white/70 text-xs leading-relaxed">
                                That's {Math.max(0, weeklyStats.total - weeklyStats.seen)} opportunities other Pro members acted on.
                              </p>
                              <button
                                onClick={() => router.push('/pricing')}
                                className="text-xs font-bold uppercase tracking-wider text-[#ff4500] hover:text-orange-300 transition-colors cursor-pointer bg-transparent border-0 text-left mt-2 block"
                              >
                                → Upgrade to see them all
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Expired Trial: Show closed signals only */}
                {isTrialExpired && closedSignals.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-white">Completed Setups</span>
                        <span className="px-2 py-0.5 text-[9px] font-satoshi font-bold bg-zinc-800 text-white rounded border border-zinc-700/60">
                          {closedSignals.length} CLOSED
                        </span>
                      </div>
                      <span className="text-[10px] text-white font-satoshi uppercase tracking-wider hidden sm:block">Historical - read only</span>
                    </div>
                    <div className="bg-[#070b16]/60 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/40 shadow-2xl">
                      {closedSignals.map((sig) => (
                        <SignalCard
                          key={sig.id}
                          sig={sig}
                          isFreePlan={true}
                          isExpanded={false}
                          onToggle={() => {}}
                          onUpgrade={triggerUpgradeGate}
                          onViewDetails={(s) => window.open(`/terminal/signals/${s.id}`, '_blank')}
                          livePrice={null}
                          isLive={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ CHART TAB ════════════════════════════════════════════════════ */}
            {activeTab === 'chart' && (
              <div className="space-y-5">
                {/* Helpful Note */}
                <div className="bg-[#0d1426]/50 border border-[#1e2d4a]/50 rounded-lg p-3">
                  <p className="text-[11px] text-white/80 font-satoshi">💡 Click the arrow or drag near the signal to view entry, stop loss & take profit details</p>
                </div>

                {/* Chart Component - Full Width */}
                <div className="w-full">
                  <HAChart
                    symbol={selectedSymbol}
                    interval={selectedInterval}
                    isFreePlan={isFreePlan}
                    onSymbolChange={setSelectedSymbol}
                    onIntervalChange={setSelectedInterval}
                    onPriceTick={setLiveBtcPrice}
                    plan={profile?.plan || 'free'}
                    onUpgradeGate={triggerUpgradeGate}
                  />
                </div>

                {/* Signals Table Card - Separate Section */}
                <div className="w-full rounded-lg border border-slate-800/50 bg-[#0f172a]/30 overflow-hidden">
                  <SignalPanel signals={logSignals || []} />
                </div>
              </div>
            )}

            {/* ══ HISTORY TAB ══════════════════════════════════════════════════ */}
            {activeTab === 'history' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-[16px] font-bold uppercase tracking-wider text-white">Signal History Ledger</h2>
                  <div className="flex items-center gap-3">
                    {/* Coin Selector Filter - BTC/ETH/BNB only */}
                    <select
                      value={selectedSymbol}
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      className="bg-[#0d1426] text-xs text-white font-satoshi font-bold rounded-lg border border-slate-800 px-2 py-1.5 focus:outline-none focus:border-[#3D5AFE] cursor-pointer"
                    >
                      <option value="BTCUSDT">Bitcoin (BTC)</option>
                      <option value="ETHUSDT">Ethereum (ETH)</option>
                      <option value="BNBUSDT">BNB</option>
                    </select>

                    {/* Timeframe Selector Filter */}
                    <div className="flex p-0.5 bg-slate-950/40 rounded-lg border border-[#1e2d4a]/30">
                      {['30m'].map(tf => {
                        const locked = false;
                        return (
                          <button key={tf}
                            onClick={() => locked ? triggerUpgradeGate('Timeframe Locked', '1H and 4H timeframes are Pro features.') : setSelectedInterval(tf)}
                            className={`px-3 py-1.5 rounded-md text-xs font-satoshi font-bold uppercase transition-all duration-300 cursor-pointer border-0 flex items-center gap-1 ${
                              selectedInterval === tf
                                ? 'bg-[#3D5AFE] text-white shadow-md'
                                : 'text-white hover:text-white bg-transparent'
                            }`}>
                            {tf} {locked && <span className="text-[#3D5AFE] text-[10px]">🔒</span>}
                          </button>
                        );
                      })}
                    </div>
                    {/* Export button */}
                    <button
                      onClick={() => isFreePlan ? triggerUpgradeGate('CSV Export Locked', 'Downloading as CSV is a Pro feature.') : alert('CSV download triggered!')}
                      className="px-3 py-1.5 border border-[#1e2d4a]/40 hover:bg-zinc-900 font-satoshi text-[12px] uppercase tracking-wider text-white hover:text-white cursor-pointer bg-transparent rounded-lg"
                    >
                      Export CSV {isFreePlan && '🔒'}
                    </button>
                  </div>
                </div>

                {logLoading && (
                  <div className="flex items-center justify-center py-16 gap-3">
                    <div className="w-4 h-4 border border-zinc-600 border-t-brand-orange rounded-full animate-spin" />
                    <span className="text-[12px] font-satoshi text-white uppercase">Loading history...</span>
                  </div>
                )}

                {!logLoading && cleanLogSignals.length === 0 && (
                  <div className="bg-[#0d1426] border border-dashed border-[#1e2a3a] p-10 text-center space-y-3">
                    <span className="text-2xl">📋</span>
                    <p className="text-[12px] text-white normal-case max-w-sm mx-auto leading-relaxed">
                      History ledger populates as signals hit SL, TP, or are replaced by a new swing.
                    </p>
                  </div>
                )}

                {!logLoading && cleanLogSignals.length > 0 && (
                  <div className="overflow-x-auto bg-[#0d1426] border border-[#1e2a3a]">
                    <table className="w-full text-left font-satoshi border-collapse">
                      <thead>
                        <tr className="border-b border-[#1e2a3a] text-white uppercase tracking-widest text-[11px] bg-zinc-950/20">
                          {['Date', 'Pair', 'Type', 'TF', 'Entry', 'Exit', 'Result', 'Conf.'].map(h => (
                            <th key={h} className="p-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cleanLogSignals.map(sig => {
                          const isBtc    = sig.symbol === 'BTCUSDT';
                          const showBlur = isFreePlan && !isBtc;
                          const isBuy    = sig.signal_type === 'buy';
                          const isClosed = sig.is_closed;
                          return (
                            <tr key={sig.id} className={`border-b border-[#1e2a3a]/40 last:border-0 hover:bg-zinc-900/10 text-[12px] ${showBlur ? 'opacity-40 select-none' : ''}`}>
                              <td className="p-3 text-white">{formatLogDate(sig.bar_time, profile)}</td>
                              <td className="p-3 font-bold text-white">{formatSymbol(sig.symbol)}</td>
                              <td className="p-3">
                                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold ${isBuy ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff1744]/10 text-[#ff1744]'}`}>
                                  {isBuy ? 'BUY' : 'SELL'}
                                </span>
                              </td>
                              <td className="p-3 text-white">{sig.interval}</td>
                              <td className="p-3 text-zinc-300">{formatPrice(sig.entry_price, profile)}</td>
                              <td className="p-3 text-zinc-300">
                                {showBlur ? <span className="blur-sm">$$$,$$$.$$</span>
                                  : isClosed ? formatPrice(sig.close_price, profile)
                                  : <span className="text-white">Open</span>}
                              </td>
                              <td className="p-3">
                                {showBlur ? (
                                  <button onClick={() => triggerUpgradeGate('Unlock Logs', 'Full logs available on Pro.')}
                                    className="text-[10px] font-bold uppercase text-brand-orange cursor-pointer bg-transparent border-0">
                                    Upgrade
                                  </button>
                                ) : (
                                  <span className={!isClosed ? 'text-white' : sig.pnl_pct >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'}>
                                    {isClosed ? `${sig.pnl_pct >= 0 ? '+' : ''}${sig.pnl_pct.toFixed(2)}%` : 'Active'}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-white">{sig.confidence}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="bg-[#000000] text-white p-6 md:p-8 border border-zinc-800 rounded-none space-y-10 animate-fade-in text-left">
                {/* Swiss Header / Navigation */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tighter text-white uppercase font-satoshi flex items-center gap-2">
                      <span>Sanddock Conviction Matrix</span>
                      <span className="text-[#ff4500] font-light">&lowast;</span>
                    </h2>
                    <p className="text-sm text-white font-satoshi">Live conviction models & statistical performance verification.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-5 py-2.5 font-satoshi text-xs font-bold text-white rounded-none">
                    <span className="w-2.5 h-2.5 bg-[#ff4500] animate-pulse rounded-none" />
                    <span>FEED LIVE</span>
                  </div>
                </div>

                <div className="space-y-10">
                  {/* Timeframe Filter Card */}
                  <div className="bg-[#090909] border border-zinc-800 p-6 rounded-none flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 text-left relative">
                    <div className="space-y-1">
                      <span className="block text-xs font-satoshi font-bold uppercase tracking-widest text-[#ff4500]">
                        SYSTEM PARAMETERS
                      </span>
                      <h4 className="text-lg font-extrabold text-white uppercase tracking-tighter">Asset & Interval Calibration</h4>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 p-1.5 bg-black rounded-none border border-zinc-800 items-center w-full xl:w-auto">
                      {/* Coin Selector */}
                      <div className="flex gap-2.5 items-center border-b md:border-b-0 md:border-r border-zinc-800 pb-3 md:pb-0 md:pr-4 w-full md:w-auto justify-between md:justify-start">
                        <span className="text-xs text-white uppercase font-satoshi font-bold pl-2">Asset:</span>
                        <select 
                          value={perfSymbol} 
                          onChange={(e) => setPerfSymbol(e.target.value)}
                          className="bg-zinc-950 text-xs text-white font-satoshi font-bold rounded-none border border-zinc-800 p-2 focus:outline-none focus:border-[#ff4500] cursor-pointer"
                        >
                          {ALL_COINS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* History range selectors */}
                      <div className="flex flex-wrap gap-1 justify-start w-full md:w-auto">
                        {[
                          { v: 'today', l: 'Today' },
                          { v: '1w', l: '1W' },
                          { v: '30d', l: '30D' },
                          { v: '6m', l: '6M' },
                          { v: '1y', l: '1Y' },
                        ].map(opt => (
                          <button
                            key={opt.v}
                            onClick={() => setPerfTimeFilter(opt.v)}
                            className={`px-5 py-2.5 rounded-none text-xs font-satoshi font-bold uppercase transition-colors cursor-pointer border ${
                              perfTimeFilter === opt.v
                                ? 'bg-[#ff4500] text-white border-[#ff4500] font-extrabold'
                                : 'bg-transparent text-white hover:text-white border-transparent'
                            }`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {perfLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#090909] border border-zinc-800 rounded-none">
                      <div className="w-8 h-8 border-2 border-[#ff4500] border-t-transparent rounded-none animate-spin" />
                      <span className="text-xs font-satoshi text-white uppercase tracking-widest animate-pulse">Recompiling Engine...</span>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Top grid: Winrate card on left, performance calculator on right */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        {/* LEFT COLUMN: TELEMETRY BOARD */}
                        <div className="lg:col-span-4 bg-[#090909] border border-zinc-800 rounded-none p-6 flex flex-col justify-between relative text-white">
                          <div className="space-y-1.5 mb-6 text-left">
                            <span className="inline-block px-2.5 py-0.5 bg-[#ff4500]/10 border border-[#ff4500]/25 text-[10px] font-satoshi font-bold text-[#ff4500] uppercase tracking-wider rounded-none">
                              ACCURACY STATS
                            </span>
                            <h3 className="text-lg font-extrabold text-white uppercase tracking-tighter mt-1">Conviction Engine</h3>
                          </div>

                          {/* Digital winrate value */}
                          <div className="py-6 text-left space-y-4">
                            <div className="space-y-1">
                              <span className="text-xs text-white block font-satoshi font-bold uppercase">SWING WIN RATE</span>
                              <span className="text-6xl font-black font-satoshi tracking-tighter text-white block">
                                {computedStats?.win_rate_pct != null ? `${computedStats.win_rate_pct}%` : '0.0%'}
                              </span>
                            </div>
                            
                            {/* Flat progress bar */}
                            <div className="w-full h-5 bg-zinc-950 border border-zinc-850 rounded-none overflow-hidden p-0.5">
                              <div className="bg-[#ff4500] h-full transition-all duration-1000 ease-out" 
                                style={{ width: `${computedStats?.win_rate_pct || 0}%` }} 
                              />
                            </div>
                          </div>

                          {/* Live telemetry lines */}
                          <div className="space-y-4 mt-4 pt-4 border-t border-zinc-800 font-satoshi text-xs text-white">
                            <div className="flex justify-between items-center">
                              <span>Live Active Swings:</span>
                              <span className="text-white font-bold flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 bg-[#ff4500] rounded-none" />
                                {openSignalsCount} open
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Total Complete Swings:</span>
                              <span className="text-white font-bold">{computedStats?.total_signals ?? '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Engine Health:</span>
                              <span className="text-[#ff4500] font-bold uppercase">
                                STABLE &lowast;
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: CORE PERFORMANCE YIELD & CALCULATOR */}
                        <div className="lg:col-span-8 space-y-8">
                          {/* Upper stats blocks */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Card 1: Total PnL */}
                            <div className="bg-[#090909] border border-zinc-800 rounded-none p-6 text-left flex flex-col justify-between text-white">
                              <div className="flex justify-between items-start border-b border-zinc-800 pb-2 mb-4">
                                <span className="text-[10px] font-satoshi font-bold uppercase tracking-widest text-[#ff4500]">Total PnL Return</span>
                                <span className="text-white text-[10px] font-satoshi">All Closed Trades</span>
                              </div>
                              <div className="my-4">
                                <span className={`text-5xl font-black font-satoshi tracking-tighter block ${
                                  (computedStats?.raw_pnl_sum || 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'
                                }`}>
                                  {computedStats?.raw_pnl_sum != null
                                    ? `${(computedStats.raw_pnl_sum) >= 0 ? '+' : ''}${computedStats.raw_pnl_sum.toFixed(2)}%`
                                    : '0.00%'}
                                </span>
                              </div>
                              <div className="pt-3 border-t border-zinc-800 flex justify-between items-center text-xs font-satoshi">
                                <span className="text-white font-bold">Cumulative Gain/Loss:</span>
                                <span className={`font-black ${
                                  (computedStats?.raw_pnl_sum || 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'
                                }`}>
                                  {computedStats?.raw_pnl_sum != null
                                    ? `${(computedStats.raw_pnl_sum) >= 0 ? '+' : ''}${computedStats.raw_pnl_sum.toFixed(2)}%`
                                    : '0.00%'}
                                </span>
                              </div>
                            </div>

                            {/* Card 2: Profit Factor */}
                            <div className="bg-[#090909] border border-zinc-800 rounded-none p-6 text-left flex flex-col justify-between text-white">
                              <div className="flex justify-between items-start border-b border-zinc-800 pb-2 mb-4">
                                <span className="text-[10px] font-satoshi font-bold uppercase tracking-widest text-white">PROFIT FACTOR</span>
                                <span className="text-white text-[10px] font-satoshi">EFFICIENCY</span>
                              </div>
                              <div className="my-4">
                                <span className="text-5xl font-black font-satoshi tracking-tighter text-white block">
                                  {computedStats?.profit_factor ?? '0.00'}
                                </span>
                              </div>
                              <div className="pt-3 border-t border-zinc-800 flex flex-col gap-1 text-[10px] font-satoshi text-white">
                                <div className="flex justify-between font-bold">
                                  <span>Gains / Losses Winrate Ratio:</span>
                                  <span>{computedStats ? `${computedStats.wins} Wins` : '0'}</span>
                                </div>
                                <div className="w-full h-4 bg-zinc-950 border border-zinc-800 rounded-none overflow-hidden flex p-0.5 mt-1">
                                  <div className="bg-[#00e676] h-full" style={{ width: `${computedStats ? (computedStats.wins / (computedStats.wins + computedStats.losses || 1)) * 100 : 50}%` }} />
                                  <div className="bg-[#ff1744] h-full" style={{ width: `${computedStats ? (computedStats.losses / (computedStats.wins + computedStats.losses || 1)) * 100 : 50}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Swiss Compound Capital Estimator */}
                          <div className="bg-[#090909] border border-zinc-800 p-6 rounded-none text-left space-y-5 text-white">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-3">
                              <div>
                                <h3 className="text-lg font-extrabold text-white uppercase tracking-tighter">Compound Capital Estimator</h3>
                                <p className="text-xs text-white font-satoshi mt-0.5">Drag to calibrate starting capital and view simulated growth telemetry.</p>
                              </div>
                              <span className="px-4 py-1.5 bg-[#ff4500] text-white text-xs font-satoshi font-bold uppercase rounded-none">
                                Compounding Model
                              </span>
                            </div>

                            {/* Range slider input */}
                            <div className="space-y-2 pt-2">
                              <div className="flex justify-between font-satoshi text-sm text-white font-bold">
                                <span>$1,000</span>
                                <span className="text-white font-black text-lg underline decoration-[#ff4500] decoration-2">${startingCapital.toLocaleString()}</span>
                                <span>$100,000</span>
                              </div>
                              <input 
                                type="range" 
                                min="1000" 
                                max="100000" 
                                step="1000" 
                                value={startingCapital} 
                                onChange={(e) => setStartingCapital(Number(e.target.value))}
                                className="w-full h-2.5 bg-zinc-950 rounded-none appearance-none cursor-pointer accent-[#ff4500] border border-zinc-800" 
                              />
                            </div>

                            {/* Telemetry data grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black rounded-none border border-zinc-800 font-satoshi text-center text-xs">
                              <div>
                                <span className="block text-[9px] text-white uppercase tracking-widest font-bold">Starting Capital</span>
                                <span className="text-sm font-bold text-white mt-1 block">${startingCapital.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-white uppercase tracking-widest font-bold">PnL Return Rate</span>
                                <span className={`text-sm font-bold mt-1 block ${(computedStats?.raw_pnl_sum || 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                                  {computedStats?.raw_pnl_sum != null
                                    ? `${(computedStats.raw_pnl_sum) >= 0 ? '+' : ''}${(computedStats.raw_pnl_sum).toFixed(2)}%`
                                    : '0.00%'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-white uppercase tracking-widest font-bold">Projected Gain</span>
                                <span className={`text-sm font-bold mt-1 block ${(computedStats?.raw_pnl_sum || 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                                  ${((computedStats?.raw_pnl_sum || 0) * startingCapital / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-white font-bold uppercase tracking-widest font-bold">Simulated Equity</span>
                                <span className="text-sm font-extrabold text-[#ff4500] mt-1 block">
                                  ${(startingCapital + (computedStats?.raw_pnl_sum || 0) * startingCapital / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2x3 Metric Grid expanded full width below both cards */}
                      <div className="w-full border border-zinc-800 rounded-none p-6 bg-[#090909] shadow-none">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 font-satoshi text-white">
                          {[
                            { label: 'Average Outcome', val: computedStats?.avg_pnl != null ? `${parseFloat(computedStats.avg_pnl) >= 0 ? '+' : ''}${computedStats.avg_pnl}%` : '-', note: 'per closed trade' },
                            { label: 'Total Logs', val: computedStats?.total_signals ?? '-', note: 'closed swings' },
                            { label: 'Current Indicators', val: openSignalsCount, note: 'active metrics' },
                            { label: 'Peak Trade Gain', val: computedStats?.best_trade != null ? `+${computedStats.best_trade}%` : '-', note: 'maximum outcome' },
                            { label: 'Peak Drawdown', val: computedStats?.worst_trade != null ? `${computedStats.worst_trade}%` : '-', note: 'maximum loss' },
                            { label: 'Outcome Ratio', val: computedStats ? `${computedStats.wins}W - ${computedStats.losses}L` : '-', note: 'wins vs losses' },
                          ].map((s, i) => (
                            <div key={i} className="text-left py-2 px-4 border-r last:border-0 border-zinc-800/40 space-y-1">
                              <span className="block text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white leading-none">{s.label}</span>
                              <span className="block text-xl md:text-2xl font-black text-white tracking-tighter leading-none pt-1">{s.val}</span>
                              <span className="block text-[9px] text-white leading-none pt-0.5">{s.note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chart Container */}
                  {!perfLoading && (
                    <div className="w-full bg-[#090909] border border-zinc-800 rounded-none p-6 text-white">
                      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3">
                        <span className="text-xs font-satoshi font-bold uppercase tracking-widest text-[#ff4500]">OUTCOME DISTRIBUTION</span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Equity Growth curve</span>
                      </div>
                      <PerformanceChart signals={perfSignals} />
                    </div>
                  )}
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* ── MOBILE NAV ───────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-zinc-900 flex items-center justify-around z-40 select-none">
        {[
          { id: 'signals', icon: Icons.Signals, label: 'Signals' },
          { id: 'chart',   icon: Icons.Chart, label: 'Charts' },
          { id: 'history', icon: Icons.History, label: 'History' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1 text-[11px] font-bold uppercase tracking-widest cursor-pointer border-0 bg-transparent ${
                activeTab === item.id ? 'text-brand-orange bg-zinc-950' : 'text-white hover:text-white'
              }`}>
              <Icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── UPGRADE MODAL ────────────────────────────────────────────────── */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setUpgradeModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#0d1426] border border-zinc-800 p-7 shadow-2xl space-y-5 z-10 text-left">
            <button onClick={() => setUpgradeModal(false)}
              className="absolute top-4 right-4 text-white hover:text-white text-[20px] font-bold font-satoshi bg-transparent border-0 cursor-pointer">
              &times;
            </button>
            <div className="space-y-1.5">
              <span className="text-[11px] font-satoshi font-bold text-brand-orange uppercase tracking-wider">Console Upgrade</span>
              <h3 className="text-[20px] font-extrabold uppercase tracking-tight text-white">{upgradeTriggerText.title}</h3>
              <p className="text-[13px] text-white leading-relaxed normal-case">{upgradeTriggerText.desc}</p>
            </div>
            <div className="p-4 bg-zinc-950 border border-zinc-900 space-y-2">
              <span className="block text-[13px] font-bold text-white uppercase tracking-wider">Pro Plan Benefits</span>
              <ul className="space-y-1 text-[12px] text-white list-disc list-inside normal-case">
                <li>10+ major crypto coins tracked</li>
                <li>30-minute timeframe (swing high/low detection)</li>
                <li>Entry targets, Stop Loss, and Take Profit</li>
                <li>Automated Telegram push integrations</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleVirtualUpgrade}
                className="flex-1 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[13px] uppercase tracking-widest transition-colors cursor-pointer border-0">
                Upgrade to Pro
              </button>
              <button onClick={() => setUpgradeModal(false)}
                className="px-4 py-3 border border-zinc-800 bg-transparent hover:bg-[#111827] hover:text-white text-[13px] font-bold text-white uppercase tracking-widest transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIGNUP SUCCESS MODAL */}
      {showFreeSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => {
            setShowFreeSuccessModal(false);
            router.replace('/terminal');
          }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#0d1426] border border-zinc-800 p-7 shadow-2xl space-y-5 z-10 text-left">
            <button onClick={() => {
              setShowFreeSuccessModal(false);
              router.replace('/terminal');
            }}
              className="absolute top-4 right-4 text-white hover:text-white text-[20px] font-bold font-satoshi bg-transparent border-0 cursor-pointer">
              &times;
            </button>
            <div className="space-y-1.5 text-center">
              <span className="text-4xl block mb-2">Success!</span>
              <span className="text-[11px] font-satoshi font-bold text-brand-orange uppercase tracking-wider">Welcome to Sanddock</span>
              <h3 className="text-[20px] font-extrabold uppercase tracking-tight text-white">Account Created Successfully!</h3>
              <p className="text-[13px] text-white leading-relaxed normal-case">
                You now have unlimited access to live BTC/USDT signals, AI explanations, and chart setups.
              </p>
            </div>
            
            <div className="p-4 bg-zinc-950 border border-zinc-900 space-y-3">
              <span className="block text-[12px] font-bold text-white uppercase tracking-wider">Join Public Alerts Group</span>
              <p className="text-[12px] text-white normal-case leading-relaxed">
                Connect with our public channel to receive real-time BTC alert updates directly in Telegram.
              </p>
              <a
                href="https://t.me/sanddock_free_btc"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setIsTelegramChannelJoined(true);
                  localStorage.setItem('sanddock_tg_channel_joined', 'true');
                }}
                className="block text-center py-2 bg-[#3D5AFE] hover:bg-[#2943d0] text-white font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer select-none no-underline"
              >
                Join Free BTC Alerts Group &rarr;
              </a>
            </div>

            <div className="flex pt-1">
              <button onClick={() => {
                setShowFreeSuccessModal(false);
                router.replace('/terminal');
              }}
                className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black font-bold text-[11px] uppercase tracking-widest transition-colors cursor-pointer border-0">
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
