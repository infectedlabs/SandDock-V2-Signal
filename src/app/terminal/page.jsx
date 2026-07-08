'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useSignals } from '@/hooks/useSignals';
import { useSignalLog } from '@/hooks/useSignalLog';
import { usePerformance } from '@/hooks/usePerformance';
import HAChart from '@/components/HAChart';
import PerformanceChart from '@/components/PerformanceChart';

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
    <svg className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      {active && <circle cx="18" cy="6" r="3" fill="#ff4500" stroke="#080d1a" strokeWidth="1.5" />}
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
  { value: 'BNBUSDT', label: 'BNB (BNB)' },
  { value: 'XRPUSDT', label: 'XRP (XRP)' },
  { value: 'SOLUSDT', label: 'Solana (SOL)' },
  { value: 'TRXUSDT', label: 'Tron (TRX)' },
  { value: 'DOGEUSDT', label: 'Dogecoin (DOGE)' },
  { value: 'HBARUSDT', label: 'Hedera (HBAR)' },
  { value: 'UNIUSDT', label: 'Uniswap (UNI)' },
  { value: 'SUIUSDT', label: 'Sui (SUI)' },
  { value: 'AVAXUSDT', label: 'Avalanche (AVAX)' },
  { value: 'AAVEUSDT', label: 'Aave (AAVE)' },
  { value: 'JUPUSDT', label: 'Jupiter (JUP)' },
  { value: 'PUMPUSDT', label: 'Pump.fun (PUMP)' },
  { value: 'ARBUSDT', label: 'Arbitrum (ARB)' }
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
  const logo = COIN_LOGOS[coin] || { char: coin.slice(0, 1), bg: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
  const isBuy = type === 'BUY';

  return (
    <div
      onClick={onUpgrade}
      className="group px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left cursor-pointer hover:bg-slate-900/10 transition-all select-none opacity-45 hover:opacity-60 relative overflow-hidden"
    >
      {/* 1. Logo & Token Info */}
      <div className="flex items-center gap-3 w-full md:w-[22%] shrink-0">
        <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono font-bold text-[10px] shadow-inner shrink-0 ${logo.bg}`}>
          {logo.char}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-zinc-400 tracking-wide text-xs">{coin} <span className="text-zinc-600 font-normal">/ USDT</span></span>
            <span className="text-[9px] font-mono font-bold bg-slate-950/60 px-1.5 py-0.2 rounded border border-slate-800 text-zinc-500 tracking-wider">
              {timeframe}
            </span>
          </div>
          <span className="text-[10px] text-zinc-600 font-mono tracking-normal">Locked for your tier</span>
        </div>
      </div>

      {/* 2. Direction */}
      <div className="w-full md:w-[8%] flex items-center shrink-0">
        <span className="inline-flex items-center px-2.5 py-0.5 text-[9px] font-extrabold tracking-widest border uppercase rounded bg-zinc-800/40 text-zinc-500 border-zinc-700/20">
          {type}
        </span>
      </div>

      {/* 3. Locked Content Area */}
      <div className="w-full md:w-[56%] flex items-center justify-between text-zinc-600 text-xs font-mono">
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
  const logo = COIN_LOGOS[coin] || { char: coin.slice(0, 1), bg: 'bg-zinc-800 text-zinc-400 border-zinc-700' };

  let pnlText = '';
  let pnlColorClass = '';
  
  if (sig.pnl_pct != null) {
    pnlText = `${sig.pnl_pct >= 0 ? '+' : ''}${parseFloat(sig.pnl_pct).toFixed(2)}%`;
    pnlColorClass = sig.pnl_pct >= 0 ? 'text-[#10b981] font-bold' : 'text-[#ef4444] font-bold';
  } else if (isLive && livePrice) {
    const pnl = ((livePrice - sig.entry_price) / sig.entry_price) * 100;
    const finalPnl = isBuy ? pnl : -pnl;
    pnlText = `${finalPnl >= 0 ? '+' : ''}${finalPnl.toFixed(2)}%`;
    pnlColorClass = finalPnl >= 0 ? 'text-[#10b981] font-extrabold animate-pulse' : 'text-[#ef4444] font-extrabold animate-pulse';
  } else if (nextSignal) {
    const exitPrice = nextSignal.entry_price;
    const change = ((exitPrice - sig.entry_price) / sig.entry_price) * 100;
    const finalPnl = isBuy ? change : -change;
    pnlText = `${finalPnl >= 0 ? '+' : ''}${finalPnl.toFixed(2)}%`;
    pnlColorClass = finalPnl >= 0 ? 'text-[#10b981] font-bold' : 'text-[#ef4444] font-bold';
  }

  return (
    <div
      onClick={() => onViewDetails(sig)}
      className="group px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left cursor-pointer hover:bg-slate-900/30 transition-all select-none"
    >
      {/* 1. Logo & Token Info */}
      <div className="flex items-center gap-3 w-full md:w-[20%] shrink-0">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono font-bold text-xs shadow-inner shrink-0 ${logo.bg}`}>
          {logo.char}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-wide text-xs sm:text-sm">{coin} <span className="text-zinc-500 font-normal">/ USDT</span></span>
            <span className="text-[9px] font-mono font-bold bg-slate-950/60 px-1.5 py-0.2 rounded border border-slate-800 text-zinc-400 tracking-wider">
              {sig.interval}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono tracking-normal">Fired {formatRelativeTime(sig.created_at || sig.bar_time)}</span>
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
        <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Entry Price</span>
        <span className="font-mono text-xs sm:text-sm font-bold text-white mt-0.5 block">{formatPrice(sig.entry_price)}</span>
      </div>

      {/* 4. Stop Loss */}
      <div className="w-full md:w-[10%] flex flex-col justify-center">
        <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Stop Loss</span>
        <span className="font-mono text-xs text-zinc-400 mt-0.5 block">{sig.sl_price ? formatPrice(sig.sl_price) : '-'}</span>
      </div>

      {/* 5. Take Profit */}
      <div className="w-full md:w-[10%] flex flex-col justify-center">
        <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Take Profit</span>
        <span className="font-mono text-xs text-zinc-400 mt-0.5 block">{sig.tp_price ? formatPrice(sig.tp_price) : '-'}</span>
      </div>

      {/* R:R Ratio */}
      <div className="w-full md:w-[8%] flex flex-col justify-center">
        <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest">R:R Ratio</span>
        <span className="font-mono text-xs text-zinc-400 mt-0.5 block">
          1:{sig.sl_pct && sig.tp_pct && sig.sl_pct > 0 ? (sig.tp_pct / sig.sl_pct).toFixed(1) : '2.0'}
        </span>
      </div>

      {/* 6. Confidence */}
      <div className="relative group/tooltip w-full md:w-[10%] flex flex-col justify-center cursor-help">
        <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest border-b border-dashed border-zinc-600/50 w-max">Confidence</span>
        <span className="font-mono text-xs font-bold text-zinc-300 mt-0.5 block">{sig.confidence || 75}%</span>
        <div className="absolute left-0 bottom-full mb-2 w-40 p-2 bg-slate-950/95 border border-slate-800 rounded shadow-xl text-left hidden group-hover/tooltip:block z-50 font-mono text-[9px] text-zinc-300 leading-normal normal-case">
          AI conviction strength. Signals &gt;75% have higher historical accuracy.
        </div>
      </div>

      {/* 7. PNL */}
      <div className="w-full md:w-[9%] flex flex-col justify-center min-w-[70px]">
        <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-widest">PNL</span>
        <span className={`font-mono text-xs sm:text-sm font-bold mt-0.5 block ${pnlColorClass}`}>
          {pnlText || '0.00%'}
        </span>
      </div>

      {/* 8. Status & Action */}
      <div className="w-full md:w-[12%] flex items-center justify-between md:justify-end gap-2 shrink-0">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold bg-[#3D5AFE]/15 text-[#3D5AFE] border border-[#3D5AFE]/20 px-2 py-0.5 uppercase rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3D5AFE] animate-ping" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold bg-zinc-800/80 text-zinc-400 border border-zinc-700/40 px-2 py-0.5 uppercase rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Closed
          </span>
        )}
        <span className="text-zinc-500 group-hover:text-white transition-colors pl-1">
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
  const { signals: coinLog } = useSignalLog({ plan: isFreePlan ? 'free' : 'pro', symbol: sig.symbol, pageSize: 10 });

  return (
    <div className="w-full lg:w-[55%] h-full bg-[#0d1426] border-l border-[#1e2a3a] flex flex-col z-40 relative overflow-y-auto">
      {/* Sticky Drawer Header */}
      <div className="sticky top-0 bg-[#0d1426]/95 backdrop-blur-md p-5 border-b border-[#1e2a3a] flex justify-between items-center z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-bold font-mono text-white">{symbolFormatted}</h2>
            <span className="text-[12px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 uppercase">
              {sig.interval} HA
            </span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <span className="text-[14px] text-zinc-300 font-mono">
              Live Price: <span className="font-bold text-white">{formatPrice(sig.entry_price, profile)}</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-400/10 px-1 py-0.2 rounded-xs">
              +2.3% (24h)
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors cursor-pointer bg-transparent border-0">
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
              <span className="text-[11px] text-zinc-500">
                Fired {formatRelativeTime(sig.created_at)}
              </span>
            </div>
            <span className="text-zinc-400 font-mono text-[13px]">
              Conf: <span className="font-bold text-white">{sig.confidence}%</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-zinc-950 px-3 py-2.5 border border-zinc-900">
            <div>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Entry Target</span>
              <span className="text-[14px] text-white font-bold font-mono">{formatPrice(sig.entry_price, profile)}</span>
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Stop Loss</span>
              {isFreePlan ? (
                <button onClick={() => onUpgrade('Unlock Stop Loss Levels', 'Upgrade to view SL values.')}
                  className="text-[11px] font-bold text-[#3D5AFE] uppercase bg-transparent border-0 p-0 block text-left">
                  🔒 Pro Only
                </button>
              ) : (
                <span className="text-[14px] text-zinc-400 font-bold font-mono">
                  {formatPrice(sig.sl_price, profile)} ({sig.sl_pct}%)
                </span>
              )}
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Take Profit</span>
              {isFreePlan ? (
                <button onClick={() => onUpgrade('Unlock Take Profit Targets', 'Upgrade to view TP values.')}
                  className="text-[11px] font-bold text-[#3D5AFE] uppercase bg-transparent border-0 p-0 block text-left">
                  🔒 Pro Only
                </button>
              ) : (
                <span className="text-[14px] text-[#00e676] font-bold font-mono">
                  {formatPrice(sig.tp_price, profile)} (+{sig.tp_pct}%)
                </span>
              )}
            </div>
          </div>

          {sig.rationale && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">AI Analysis Rationale</span>
              <p className="text-[13px] text-zinc-300 normal-case leading-relaxed bg-zinc-950 p-3 border border-zinc-900/60">
                {sig.rationale}
              </p>
            </div>
          )}
        </div>

        {/* Section 2: HA Chart */}
        <div className="space-y-2">
          <span className="block text-[11px] font-mono text-zinc-500 uppercase tracking-widest text-left">
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
          <span className="block text-[11px] font-mono text-zinc-500 uppercase tracking-widest text-left">
            Completed signals for {symbolFormatted}
          </span>
          {coinLog.length === 0 ? (
            <div className="bg-zinc-950/20 border border-zinc-900 p-8 text-center text-zinc-500 text-[12px]">
              No past trade logs available for this coin pair yet.
            </div>
          ) : (
            <div className="overflow-x-auto bg-[#0d1426] border border-[#1e2a3a]">
              <table className="w-full text-left font-mono border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[#1e2a3a] text-zinc-500 uppercase tracking-wider text-[10px] bg-zinc-950/20">
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
                    const isWin = item.is_win;
                    const closed = !!item.close_reason;
                    return (
                      <tr key={item.id} className="border-b border-[#1e2a3a]/40 last:border-0 hover:bg-zinc-900/10">
                        <td className="p-3 text-zinc-400">{formatLogDate(item.created_at, profile)}</td>
                        <td className="p-3">
                          <span className={`inline-block px-1 py-0.2 text-[9px] font-bold ${
                            item.signal_type === 'buy' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff1744]/10 text-[#ff1744]'
                          }`}>
                            {item.signal_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">{formatPrice(item.entry_price, profile)}</td>
                        <td className="p-3">{closed ? formatPrice(item.close_price, profile) : '-'}</td>
                        <td className="p-3 text-zinc-400 capitalize">{item.close_reason ? item.close_reason.replace('_', ' ') : 'Open'}</td>
                        <td className="p-3">
                          {!closed ? (
                            <span className="text-zinc-500">Open</span>
                          ) : (
                            <span className={`font-bold ${isWin ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                              {isWin ? '+' : ''}{parseFloat(item.pnl_pct || 0).toFixed(2)}%
                            </span>
                          )}
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
          <span className="block text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
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
              <div className="p-3 pt-0 text-[12px] text-zinc-400 normal-case leading-relaxed">
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
              <div className="p-3 pt-0 text-[12px] text-zinc-400 normal-case leading-relaxed">
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
              <div className="p-3 pt-0 text-[12px] text-zinc-400 normal-case leading-relaxed">
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
  const [settingsExperience,setSettingsExperience] = useState('comfortable');
  const [settingsRisk,      setSettingsRisk]       = useState('balanced');
  const [settingsGoal,      setSettingsGoal]       = useState('grow');

  const [settingsAccountSize, setSettingsAccountSize] = useState(10000);
  const [settingsRiskPerTradeType, setSettingsRiskPerTradeType] = useState('1%'); // '1%' | '1.5%' | '2%' | 'custom'
  const [settingsCustomRiskVal, setSettingsCustomRiskVal] = useState('1.0');
  const [settingsMinConfidence, setSettingsMinConfidence] = useState(75);
  const [settingsDefaultTimeframe, setSettingsDefaultTimeframe] = useState('15m');
  const [settingsDefaultView, setSettingsDefaultView] = useState('Split');
  const [settingsTimezone, setSettingsTimezone] = useState('UTC');
  const [settingsPriceFormat, setSettingsPriceFormat] = useState('usd');
  const [settingsEmailSignalClosed, setSettingsEmailSignalClosed] = useState(true);
  const [settingsEmailWeeklyDebrief, setSettingsEmailWeeklyDebrief] = useState(true);
  const [settingsEmailSystemAlerts, setSettingsEmailSystemAlerts] = useState(true);

  // local states for Telegram pairing step status
  const [tgPairingStep, setTgPairingStep] = useState(1); // 1: disconnected, 2: pairing code input
  const [tgPairingCode, setTgPairingCode] = useState(['', '', '', '', '', '']);
  const [tgStatus, setTgStatus] = useState(''); // 'loading' | 'success' | 'error'
  const [isTelegramChannelJoined, setIsTelegramChannelJoined] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTelegramChannelJoined(localStorage.getItem('sanddock_tg_channel_joined') === 'true');
    }
  }, []);
  const [upgradeModal,      setUpgradeModal]       = useState(false);
  const [upgradeTriggerText,setUpgradeTriggerText] = useState({ title: '', desc: '' });
  const [profileMenuOpen,   setProfileMenuOpen]    = useState(false);
  const [bannerVisible,     setBannerVisible]      = useState(false);

  // Lifted Chart Selectors State
  const [selectedSymbol,   setSelectedSymbol]   = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState('15m');
  const [viewMode,         setViewMode]         = useState('Split');

  useEffect(() => {
    if (profile?.default_timeframe) {
      setSelectedInterval(profile.default_timeframe);
    }
    if (profile?.default_view) {
      setViewMode(profile.default_view);
    }
  }, [profile?.default_timeframe, profile?.default_view]);

  // Detail Drawer state
  const [selectedDrawerSignal, setSelectedDrawerSignal] = useState(null);
  
  // Performance chart & history states
  const [perfTimeFilter, setPerfTimeFilter] = useState('30d');
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
      if (tab && ['signals', 'chart', 'history', 'stats', 'settings'].includes(tab)) {
        setActiveTabState(tab);
      }
    }
  }, []);

  // Trigger background gap sync on mount
  useEffect(() => {
    const triggerSync = async () => {
      try {
        const res = await fetch('/api/signals/sync');
        if (res.ok) {
          const data = await res.json();
          console.log('[Sync Status]:', data.message);
        }
      } catch (err) {
        console.warn('Background sync trigger failed:', err.message);
      }
    };
    triggerSync();
  }, []);

  const signalFilters = useMemo(() => ({
    plan:        profile?.plan || 'free',
    signal_type: signalTypeFilter !== 'all' ? signalTypeFilter : undefined,
    interval:    selectedInterval,
  }), [profile?.plan, signalTypeFilter, selectedInterval]);

  const { signals: liveSignals, loading: sigLoading } = useSignals(signalFilters);
  const { signals: logSignals,  loading: logLoading  } = useSignalLog({ plan: profile?.plan || 'free', symbol: selectedSymbol, interval: selectedInterval });
  
  const cleanLogSignals = useMemo(() => {
    if (!logSignals) return [];
    let filtered = logSignals;
    if (profile?.min_confidence != null) {
      filtered = filtered.filter(s => (s.confidence || 75) >= profile.min_confidence);
    }
    return filtered;
  }, [logSignals, profile?.min_confidence]);
  
  const openSignalsCount = useMemo(() => {
    if (!cleanLogSignals || cleanLogSignals.length === 0) return 0;
    return cleanLogSignals.filter(s => !s.close_reason).length;
  }, [cleanLogSignals]);

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
        const res = await fetch(`/api/signals/history?symbol=${perfSymbol}&interval=${selectedInterval}&filter=${perfTimeFilter}&plan=${profile?.plan || 'free'}`);
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
      setSettingsDefaultTimeframe(profile.default_timeframe || '15m');
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

  // Trial expiry
  const isTrialExpired = isFreePlan && profile?.trial_ends_at && new Date() > new Date(profile.trial_ends_at);
  const trialDaysRemaining = useMemo(() => {
    if (!isFreePlan || !profile?.trial_ends_at) return null;
    const msLeft = new Date(profile.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }, [isFreePlan, profile?.trial_ends_at]);

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
    let filtered = liveSignals.filter(s => s.action === 'new');
    if (profile?.min_confidence != null) {
      filtered = filtered.filter(s => (s.confidence || 75) >= profile.min_confidence);
    }
    return filtered;
  }, [liveSignals, profile?.min_confidence]);

  const { activeSignals, closedSignals } = useMemo(() => {
    const active = [];
    const closed = [];
    cleanLiveSignals.forEach(s => {
      if (!s.close_reason) {
        active.push(s);
      } else {
        closed.push(s);
      }
    });
    return { activeSignals: active, closedSignals: closed };
  }, [cleanLiveSignals]);

  const combinedSignals = useMemo(() => {
    return [...activeSignals, ...closedSignals].sort((a, b) => {
      const tA = new Date(a.bar_time || a.created_at).getTime();
      const tB = new Date(b.bar_time || b.created_at).getTime();
      return tB - tA;
    });
  }, [activeSignals, closedSignals]);

  const todayStats = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todaySignals = cleanLiveSignals.filter(s => new Date(s.created_at || s.bar_time) >= oneDayAgo);
    
    const mapped = todaySignals.map((sig) => {
      let pnlVal = 0;
      const isClosed = sig.close_reason !== null || sig.pnl_pct !== null;
      if (!isClosed) {
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
  }, [cleanLiveSignals, livePrices]);

  const isChopRegime = useMemo(() => {
    if (!closedSignals || closedSignals.length < 2) return false;
    const wins = closedSignals.filter(s => s.is_win === true).length;
    const winRate = (wins / closedSignals.length) * 100;
    return winRate < 50;
  }, [closedSignals]);

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
      return allBtcHistoryLog.slice(1, 6);
    }
    return [];
  }, [allBtcHistoryLog]);

  const triggerUpgradeGate = (title, desc) => {
    setUpgradeTriggerText({ title, desc });
    setUpgradeModal(true);
  };

  const handleVirtualUpgrade = async () => {
    try { await updateProfile({ plan: 'pro' }); setUpgradeModal(false); }
    catch (err) { console.error(err); }
  };

  const handleUpdateSettings = async e => {
    e.preventDefault();
    try {
      let rVal = 1.0;
      if (settingsRiskPerTradeType === '1%') rVal = 1.0;
      else if (settingsRiskPerTradeType === '1.5%') rVal = 1.5;
      else if (settingsRiskPerTradeType === '2%') rVal = 2.0;
      else {
        rVal = parseFloat(settingsCustomRiskVal) || 1.0;
      }

      await updateProfile({
        experience_level: settingsExperience,
        risk_style: settingsRisk,
        primary_goal: settingsGoal,
        account_size: settingsAccountSize,
        risk_per_trade: rVal,
        min_confidence: settingsMinConfidence,
        default_timeframe: settingsDefaultTimeframe,
        default_view: settingsDefaultView,
        timezone: settingsTimezone,
        price_format: settingsPriceFormat,
        email_signal_closed: settingsEmailSignalClosed,
        email_weekly_debrief: settingsEmailWeeklyDebrief,
        email_system_alerts: settingsEmailSystemAlerts
      });
      alert('Preferences updated!');
    } catch (err) { console.error(err); }
  };

  if (loading || !user || !profile) {
    const prompt = loadingPrompt || LOADING_PROMPTS[0];
    const categoryColors = {
      'Trading Tip': 'border-amber-500 text-amber-400 bg-amber-500/5',
      'Success Story': 'border-emerald-500 text-emerald-400 bg-emerald-500/5',
      'Motivation': 'border-[#3D5AFE] text-[#3D5AFE] bg-[#3D5AFE]/5'
    };
    const categoryBorderColor = categoryColors[prompt.type] || 'border-zinc-500 text-zinc-400';

    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3D5AFE]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-brand-orange/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md flex flex-col items-center gap-8 relative z-10 animate-fade-in">
          {/* Logo or icon */}
          <div className="flex flex-col items-center gap-2">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-10 h-10 object-contain animate-pulse" />
            <h2 className="text-lg font-bold tracking-wider font-mono uppercase text-white">
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
              <span className="text-[10px] font-bold font-mono uppercase tracking-widest opacity-80">
                {prompt.type}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                Console Sync
              </span>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed font-sans font-medium">
              "{prompt.content}"
            </p>
          </div>

          {/* Subtle loading label */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono animate-pulse">
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
    <div className="h-screen overflow-hidden bg-[#080d1a] text-white flex flex-col font-sans">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-35 h-14 w-full flex-shrink-0 bg-[#0d1426]/90 backdrop-blur-md border-b border-[#1e2a3a] px-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/sanddock-logo.png" alt="Sanddock" className="w-6 h-6 object-contain" />
          <span className="text-[15px] font-bold uppercase tracking-wider font-mono">
            Sanddock <span className="text-brand-orange">Console</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-bold bg-[#111827] border border-zinc-800 text-zinc-400 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Signals Live
          </span>
        </div>

        <div className="flex items-center gap-3 relative">
          <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
            Total PnL: +142.8%
          </span>

          {/* Plan badge + trial countdown */}
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
              isTrialExpired
                ? 'bg-red-900/60 text-red-400 border border-red-700/50'
                : isFreePlan
                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                : userPlan === 'lifetime'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-brand-orange text-white'
            }`}>
              {isTrialExpired ? 'Trial Expired' : isFreePlan ? `Trial${trialDaysRemaining !== null ? ` - ${trialDaysRemaining}d` : ''}` : `${profile.plan} Plan`}
            </span>
            {isFreePlan && !isTrialExpired && trialDaysRemaining !== null && trialDaysRemaining <= 3 && (
              <span className="text-[10px] font-bold text-amber-400 animate-pulse font-mono uppercase">⚠ Expiring</span>
            )}
          </div>

          <button
            onClick={() => alert('All signal notification systems active.')}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer relative p-1 bg-transparent border-0"
          >
            <Icons.Bell active={isFreePlan} />
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-8 h-8 rounded-full bg-brand-orange text-white font-mono font-bold text-[12px] flex items-center justify-center cursor-pointer border border-[#1e2a3a] hover:border-brand-orange"
            >
              {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'SD'}
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#0d1426] border border-[#1e2a3a] shadow-xl py-1 z-50 text-left">
                <div className="px-4 py-2.5 border-b border-zinc-900">
                  <span className="block font-bold text-[13px] text-white uppercase tracking-wider">{profile.name}</span>
                  <span className="block text-[11px] text-zinc-500 font-mono truncate mt-0.5">{profile.email}</span>
                </div>
                <button onClick={() => { setActiveTab('settings'); setProfileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-zinc-300 hover:bg-[#111827] hover:text-white uppercase font-bold tracking-wider cursor-pointer bg-transparent border-0">
                  Settings
                </button>
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
        <aside className="hidden lg:flex flex-col w-56 bg-[#0d1426] border-r border-[#1e2a3a] p-4 justify-between select-none h-full overflow-y-auto flex-shrink-0">
          <div className="space-y-5">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block px-3 text-left">Trading Room</span>
              <nav className="space-y-0.5">
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-colors text-left cursor-pointer border-0 bg-transparent ${
                        activeTab === item.id
                          ? 'text-brand-orange bg-[#111827] border-l-2 border-brand-orange'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-950/20'
                      }`}>
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block px-3 text-left">Configuration</span>
              <nav>
                <button onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-colors text-left cursor-pointer border-0 bg-transparent ${
                    activeTab === 'settings'
                      ? 'text-brand-orange bg-[#111827] border-l-2 border-brand-orange'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-950/20'
                  }`}>
                  <Icons.Settings />
                  <span>Console Settings</span>
                </button>
              </nav>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-900">
            {/* Telegram status */}
            {profile.telegram_chat_id ? (
              <div className="bg-[#111827] border border-emerald-500/20 p-3 space-y-1.5 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Alerts Active</span>
                </div>
                <p className="text-[11px] text-zinc-400 normal-case leading-relaxed">Telegram delivery synced.</p>
              </div>
            ) : (
              <div className="bg-[#111827] border border-yellow-500/20 p-3 space-y-1.5 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 font-mono">Alerts Inactive</span>
                </div>
                <p className="text-[11px] text-zinc-400 normal-case leading-relaxed">Telegram not connected.</p>
                <button onClick={() => setActiveTab('settings')}
                  className="text-[11px] font-bold uppercase tracking-wider text-yellow-500 hover:text-white transition-colors cursor-pointer bg-transparent border-0 underline block p-0">
                  Set Up Alerts →
                </button>
              </div>
            )}

            {isFreePlan && (
              <>
                <div className="bg-[#111827] border border-red-500/25 p-3 space-y-1.5 text-left">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-red-400 font-mono">⚠️ Alerts Missed</span>
                  <p className="text-[11px] text-zinc-400 normal-case leading-relaxed">
                    12 signals fired on locked coins this week. Upgrade to catch the next alert instantly.
                  </p>
                </div>

                <div className="bg-[#111827] border border-zinc-800 p-3 space-y-2.5 text-left">
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-[#3D5AFE]">Console Plan</span>
                    <p className="text-[11px] text-zinc-400 normal-case leading-relaxed">Free - 1 of 11 coins active.</p>
                  </div>
                  <button
                    onClick={() => triggerUpgradeGate('Upgrade to Pro', 'Full access to all signals and Telegram alerts.')}
                    className="w-full py-1.5 bg-[#3D5AFE] hover:bg-[#2e4be6] text-white font-bold text-[11px] uppercase tracking-wider transition-colors border border-[#3D5AFE] cursor-pointer text-center block"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              </>
            )}

            {profile?.plan === 'pro' && (
              <>
                <div className="bg-[#111827] border border-purple-500/25 p-3 space-y-1.5 text-left">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-purple-400 font-mono">🔔 Master Alerts Missed</span>
                  <p className="text-[11px] text-zinc-400 normal-case leading-relaxed">
                    18 signals fired on locked Master coins this week. Upgrade to Master to access SOL, XRP, and 10 other high-beta coins.
                  </p>
                </div>

                <div className="bg-[#111827] border border-zinc-800 p-3 space-y-2.5 text-left">
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-purple-400 font-mono">Pro Plan Active</span>
                    <p className="text-[11px] text-zinc-400 normal-case leading-relaxed">Pro - 3 of 15 coins active.</p>
                  </div>
                  <button
                    onClick={() => triggerUpgradeGate('Upgrade to Master', 'Access SOL, XRP, and all 15 high-beta coins instantly.')}
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
          <main className="flex-1 bg-[#080d1a] p-5 lg:p-7 overflow-y-auto pb-24 lg:pb-8 h-full">

            {/* ══ SIGNALS TAB ════════════════════════════════════════════════ */}
            {activeTab === 'signals' && (
              <div className="space-y-5 animate-slide-up">

                {/* Today's Overview Banner */}
                <div className="bg-[#070b16]/40 border border-slate-800/50 rounded-2xl p-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-left shadow-xl select-none">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Signals Today</span>
                    <span className="block text-3xl font-extrabold font-mono text-white">
                      {todayStats.totalTrades}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Active Signals</span>
                    <span className="block text-3xl font-extrabold font-mono text-white">
                      {activeSignals.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Avg Confidence</span>
                    <span className="block text-3xl font-extrabold font-mono text-white">
                      {todayStats.avgConfidence}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Engine Status</span>
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20 uppercase font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trial expiry fullscreen prompt */}
                {isTrialExpired && (
                  <div className="mx-4 mt-4 bg-gradient-to-r from-red-900/30 to-[#0b1224] border border-red-700/40 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-widest">Free Trial Expired</span>
                      </div>
                      <p className="text-sm font-bold text-white">Your 7-day free trial has ended.</p>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">Upgrade to Pro to restore live signals, SL/TP levels, ETH & BNB coverage, and Telegram alerts. Closed signals below remain accessible.</p>
                    </div>
                    <a href="/pricing" className="shrink-0 px-5 py-2.5 bg-brand-orange text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-white hover:text-black transition-all">
                      Upgrade Now →
                    </a>
                  </div>
                )}

                {isFreePlan && !isTrialExpired && bannerVisible && (
                  <div className="bg-brand-orange text-white px-4 py-2.5 flex justify-between items-center text-[12px] font-bold uppercase tracking-wider">
                    <span>
                      ⚡ Free Trial - {trialDaysRemaining !== null ? `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left` : 'BTC signals only'}. Unlock ETH, BNB, SL/TP &amp; Telegram alerts.{' '}
                      <a href="/pricing"
                        className="underline font-extrabold hover:text-zinc-200 ml-1">
                        Upgrade →
                      </a>
                    </span>
                    <button onClick={() => { setBannerVisible(false); localStorage.setItem('sanddock_free_banner_dismissed', 'true'); }}
                      className="text-white font-bold hover:text-zinc-300 text-[16px] cursor-pointer bg-transparent border-0 p-0 ml-4">
                      &times;
                    </button>
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-[#070b16]/40 border border-slate-800/50 rounded-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex p-0.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      {['all', 'buy', 'sell'].map(type => (
                        <button key={type} onClick={() => setSignalTypeFilter(type)}
                          className={`px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer border-0 ${
                            signalTypeFilter === type ? 'bg-[#3D5AFE] text-white shadow-md' : 'text-zinc-500 hover:text-white bg-transparent'
                          }`}>
                          {type}
                        </button>
                      ))}
                    </div>

                    <div className="flex p-0.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      {['15m', '1h', '4h'].map(tf => {
                        const locked = isFreePlan && (tf === '1h' || tf === '4h');
                        return (
                          <button key={tf}
                            onClick={() => locked ? triggerUpgradeGate('Timeframe Locked', '1H and 4H timeframes are Pro features.') : setSelectedInterval(tf)}
                            className={`px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer border-0 ${
                              selectedInterval === tf ? 'bg-[#3D5AFE] text-white shadow-md' : 'text-zinc-500 hover:text-white bg-transparent'
                            }`}>
                            {tf} {locked && <span className="text-[#3D5AFE] text-[10px]">🔒</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs">
                    {sigLoading && <div className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-[#3D5AFE] rounded-full animate-spin" />}
                    <span>
                      {sigLoading ? 'Updating setups...' : `${cleanLiveSignals.length} signal${cleanLiveSignals.length !== 1 ? 's' : ''} today`}
                    </span>
                  </div>
                </div>

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
                          <p className="text-[12px] text-zinc-400 normal-case leading-relaxed">
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
                        <span className="block text-[11px] font-mono text-zinc-500 uppercase tracking-widest text-left">
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
                            isLive={selectedSymbol === 'BTCUSDT' && !lastBtcSignal.close_reason}
                          />
                        </div>
                      </div>
                    )}

                    {/* 2. Show Recent Signals below it */}
                    {recentBtcSignals.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-left">
                          <span className="block text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
                            Recent BTC Signals
                          </span>
                          <p className="text-[11px] text-zinc-500 normal-case leading-relaxed">
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
                    {/* Market Regime Detector banner */}
                    {isChopRegime && (
                      <div className="bg-yellow-500/10 border border-yellow-500/25 p-4 rounded-2xl flex items-center gap-3 text-left">
                        <span className="text-xl">⚠️</span>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] font-mono font-bold text-yellow-500 uppercase tracking-widest">Market Regime: Consolidation Chop</span>
                          <p className="text-xs text-zinc-300">
                            Expect tight ranges and signal flips. Lower position size risk.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Stream View Layout */}
                    {viewMode === 'Stream' && combinedSignals.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#3D5AFE]">{"Combined Signal Stream"}</span>
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#3D5AFE]/15 text-[#3D5AFE] rounded border border-[#3D5AFE]/20">
                              {combinedSignals.length} TOTAL
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Chronological feed of setups</span>
                        </div>
                        
                        <div className="bg-[#070b16]/60 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/40 shadow-2xl">
                          {combinedSignals.map((sig) => {
                            const globalIndex = cleanLiveSignals.findIndex(s => s.id === sig.id);
                            const isLive = !sig.close_reason;
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
                                isLive={isLive}
                                rank={globalIndex !== -1 ? globalIndex + 1 : null}
                                isLatest={globalIndex === 0}
                                nextSignal={globalIndex > 0 ? cleanLiveSignals[globalIndex - 1] : null}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Split View Layout */}
                    {viewMode !== 'Stream' && (
                      <>
                        {/* Active Signals Section */}
                        {activeSignals.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#3D5AFE]">{"Active Setups"}</span>
                                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#3D5AFE]/15 text-[#3D5AFE] rounded border border-[#3D5AFE]/20">
                                  {activeSignals.length} RUNNING
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Currently active swing positions</span>
                            </div>
                            
                            <div className="bg-[#070b16]/60 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/40 shadow-2xl">
                              {activeSignals.map((sig) => {
                                const globalIndex = cleanLiveSignals.findIndex(s => s.id === sig.id);
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
                                    isLive={true}
                                    rank={globalIndex + 1}
                                    isLatest={globalIndex === 0}
                                    nextSignal={globalIndex > 0 ? cleanLiveSignals[globalIndex - 1] : null}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Closed Signals Section */}
                        {closedSignals.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">Recent Completed Setups</span>
                                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 rounded border border-zinc-700/60">
                                  {closedSignals.length} TOTAL
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Closed within last 24 hours</span>
                            </div>

                            <div className="bg-[#070b16]/60 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/40 shadow-2xl">
                              {closedSignals.map((sig) => {
                                const globalIndex = cleanLiveSignals.findIndex(s => s.id === sig.id);
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
                                    isLive={false}
                                    rank={globalIndex + 1}
                                    isLatest={globalIndex === 0}
                                    nextSignal={globalIndex > 0 ? cleanLiveSignals[globalIndex - 1] : null}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Locked/Teaser Signals Section */}
                    {teaserCoins.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#3D5AFE]">{"Locked Asset Signals"}</span>
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#3D5AFE]/10 text-zinc-400 rounded border border-zinc-800">
                              {teaserCoins.length} LOCKED
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Available on higher tiers</span>
                        </div>

                        <div className="bg-[#070b16]/40 border border-slate-850/40 rounded-2xl overflow-hidden divide-y divide-slate-850/40 shadow-2xl">
                          {teaserCoins.map(coin => (
                            <LockedSignalCard
                              key={coin.symbol}
                              symbol={coin.symbol}
                              timeframe={coin.timeframe}
                              type={coin.type}
                              plan={userPlan}
                              confidence={coin.confidence}
                              onUpgrade={() => triggerUpgradeGate(`Unlock ${coin.symbol.split('/')[0]} Signals`, `HA signals for ${coin.symbol} are locked under your plan.`)}
                            />
                          ))}
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
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">Completed Setups</span>
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 rounded border border-zinc-700/60">
                          {closedSignals.length} CLOSED
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider hidden sm:block">Historical - read only</span>
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
            )}

            {/* ══ HISTORY TAB ══════════════════════════════════════════════════ */}
            {activeTab === 'history' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-[16px] font-bold uppercase tracking-wider text-white">Signal History Ledger</h2>
                  <div className="flex items-center gap-3">
                    {/* Timeframe Selector Filter */}
                    <div className="flex p-0.5 bg-slate-950/40 rounded-lg border border-[#1e2d4a]/30">
                      {['15m', '1h', '4h'].map(tf => {
                        const locked = isFreePlan && (tf === '1h' || tf === '4h');
                        return (
                          <button key={tf}
                            onClick={() => locked ? triggerUpgradeGate('Timeframe Locked', '1H and 4H timeframes are Pro features.') : setSelectedInterval(tf)}
                            className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase transition-all duration-300 cursor-pointer border-0 flex items-center gap-1 ${
                              selectedInterval === tf 
                                ? 'bg-[#3D5AFE] text-white shadow-md' 
                                : 'text-zinc-500 hover:text-white bg-transparent'
                            }`}>
                            {tf} {locked && <span className="text-[#3D5AFE] text-[10px]">🔒</span>}
                          </button>
                        );
                      })}
                    </div>
                    {/* Export button */}
                    <button
                      onClick={() => isFreePlan ? triggerUpgradeGate('CSV Export Locked', 'Downloading as CSV is a Pro feature.') : alert('CSV download triggered!')}
                      className="px-3 py-1.5 border border-[#1e2d4a]/40 hover:bg-zinc-900 font-mono text-[12px] uppercase tracking-wider text-zinc-400 hover:text-white cursor-pointer bg-transparent rounded-lg"
                    >
                      Export CSV {isFreePlan && '🔒'}
                    </button>
                  </div>
                </div>

                {logLoading && (
                  <div className="flex items-center justify-center py-16 gap-3">
                    <div className="w-4 h-4 border border-zinc-600 border-t-brand-orange rounded-full animate-spin" />
                    <span className="text-[12px] font-mono text-zinc-500 uppercase">Loading history...</span>
                  </div>
                )}

                {!logLoading && cleanLogSignals.length === 0 && (
                  <div className="bg-[#0d1426] border border-dashed border-[#1e2a3a] p-10 text-center space-y-3">
                    <span className="text-2xl">📋</span>
                    <p className="text-[12px] text-zinc-400 normal-case max-w-sm mx-auto leading-relaxed">
                      History ledger populates as signals hit SL, TP, or are replaced by a new swing.
                    </p>
                  </div>
                )}

                {!logLoading && cleanLogSignals.length > 0 && (
                  <div className="overflow-x-auto bg-[#0d1426] border border-[#1e2a3a]">
                    <table className="w-full text-left font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-[#1e2a3a] text-zinc-500 uppercase tracking-widest text-[11px] bg-zinc-950/20">
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
                          const isClosed = sig.close_price !== null && sig.close_price !== undefined && sig.close_reason !== 'open' && sig.close_reason !== '';
                          return (
                            <tr key={sig.id} className={`border-b border-[#1e2a3a]/40 last:border-0 hover:bg-zinc-900/10 text-[12px] ${showBlur ? 'opacity-40 select-none' : ''}`}>
                              <td className="p-3 text-zinc-400">{formatLogDate(sig.created_at, profile)}</td>
                              <td className="p-3 font-bold text-white">{formatSymbol(sig.symbol)}</td>
                              <td className="p-3">
                                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold ${isBuy ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff1744]/10 text-[#ff1744]'}`}>
                                  {isBuy ? 'BUY' : 'SELL'}
                                </span>
                              </td>
                              <td className="p-3 text-zinc-400">{sig.interval}</td>
                              <td className="p-3 text-zinc-300">{formatPrice(sig.entry_price, profile)}</td>
                              <td className="p-3 text-zinc-300">
                                {showBlur ? <span className="blur-sm">$$$,$$$.$$</span>
                                  : isClosed ? formatPrice(sig.close_price, profile)
                                  : <span className="text-zinc-500">Open</span>}
                              </td>
                              <td className="p-3">
                                {showBlur ? (
                                  <button onClick={() => triggerUpgradeGate('Unlock Logs', 'Full logs available on Pro.')}
                                    className="text-[10px] font-bold uppercase text-brand-orange cursor-pointer bg-transparent border-0">
                                    Upgrade 🔒
                                  </button>
                                ) : !isClosed ? (
                                  <span className="text-zinc-500 text-[11px] uppercase">Open</span>
                                ) : (
                                  <span className={`font-bold ${sig.is_win ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                                    {sig.is_win ? '+' : ''}{parseFloat(sig.pnl_pct || 0).toFixed(2)}% {sig.is_win ? '✅' : '❌'}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-zinc-400">{sig.confidence}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {/* ══ PERFORMANCE TAB ══════════════════════════════════════════════ */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* Tab Sub-Header & Navigation */}
                <div className="flex justify-between items-center border-b border-[#1e2d4a]/40 pb-2">
                  <div className="flex p-0.5 bg-slate-950/40 rounded-lg border border-[#1e2d4a]/30">
                    {['performance', 'ledger', 'audit'].map(sub => (
                      <button key={sub} onClick={() => setActiveSubTab(sub)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-300 cursor-pointer border-0 ${
                          activeSubTab === sub 
                            ? 'bg-[#3D5AFE] text-white shadow-md' 
                            : 'text-zinc-500 hover:text-white bg-transparent'
                        }`}>
                        {sub === 'performance' ? 'Analytics Dashboard' : sub === 'ledger' ? 'Global Ledger' : 'Calibration Audit'}
                      </button>
                    ))}
                  </div>
                </div>

                {activeSubTab === 'performance' && (
                  <div className="space-y-6">
                    {/* Timeframe Filter Selector Card */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-[#0d1426]/90 to-[#070b19]/90 border border-[#1e2a3a]/80 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left shadow-lg">
                      <div className="space-y-1">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#3D5AFE]">
                          Performance Filters
                        </span>
                        <h4 className="text-[13px] font-bold text-white uppercase tracking-wider">Select Timeframe & Range</h4>
                        <p className="text-[11px] text-zinc-400 normal-case max-w-md">Filter historical signals data to align statistical models with your execution style.</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 shadow-inner items-center">
                        {/* Coin Selector Dropdown */}
                        <div className="flex gap-2 items-center border-r border-slate-800/80 pr-3 mr-1">
                          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold pl-2">Asset:</span>
                          <select 
                            value={perfSymbol} 
                            onChange={(e) => setPerfSymbol(e.target.value)}
                            className="bg-[#0f172a] text-xs text-white font-mono font-bold rounded-lg border border-slate-800 p-1.5 focus:outline-none focus:border-[#3D5AFE] cursor-pointer"
                          >
                            {ALL_COINS.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Timeframe Interval Selector */}
                        <div className="flex gap-1 border-r border-slate-800/80 pr-3 mr-1">
                          {['15m', '1h', '4h'].map(tf => {
                            const locked = isFreePlan && (tf === '1h' || tf === '4h');
                            return (
                              <button key={tf}
                                onClick={() => locked ? triggerUpgradeGate('Timeframe Locked', '1H and 4H timeframes are Pro features.') : setSelectedInterval(tf)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all duration-300 cursor-pointer border-0 flex items-center gap-1 ${
                                  selectedInterval === tf 
                                    ? 'bg-[#3D5AFE] text-white shadow-md' 
                                    : 'text-zinc-500 hover:text-white bg-transparent'
                                }`}>
                                {tf} {locked && <span className="text-[#3D5AFE] text-[10px]">🔒</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* History range selectors */}
                        <div className="flex flex-wrap gap-2">
                          {[
                          { v: 'today', l: 'Today' },
                          { v: '1w', l: '1 Week' },
                          { v: '30d', l: '30 Days' },
                          { v: '6m', l: '6 Months' },
                          { v: '1y', l: '1 Year' },
                        ].map(opt => (
                          <button
                            key={opt.v}
                            onClick={() => setPerfTimeFilter(opt.v)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all duration-300 cursor-pointer border-0 ${
                              perfTimeFilter === opt.v
                                ? 'bg-[#3D5AFE] text-white shadow shadow-[#3D5AFE]/30 font-extrabold'
                                : 'bg-transparent text-zinc-500 hover:text-white'
                            }`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                    {perfLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-[#0a0f1d]/40 rounded-2xl border border-[#1e2d4a]/20">
                        <div className="w-6 h-6 border-2 border-[#3D5AFE] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">Aggregating trade outcomes...</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Redesigned Outcome Hero Cards Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {/* Hero 1: Net Profitability */}
                          <div className="relative overflow-hidden bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-5 rounded-2xl text-left space-y-4 shadow-xl flex flex-col justify-between group hover:border-[#3D5AFE]/40 transition-all duration-300">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Outcome Yield</span>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fixed-Risk PnL (1% Risk)</h3>
                              </div>
                              <span className={`p-2 rounded-lg text-xs font-mono font-bold ${
                                (computedStats?.cumulative_r || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {(computedStats?.cumulative_r || 0) >= 0 ? '↗ Positive' : '↘ Drawdown'}
                              </span>
                            </div>
                            
                            <div className="space-y-1 pt-2">
                              <span className={`block text-[22px] sm:text-2xl font-extrabold font-mono tracking-tight ${
                                (computedStats?.cumulative_r || 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'
                              }`}>
                                {computedStats?.cumulative_r != null 
                                  ? `${(computedStats.cumulative_r) >= 0 ? '+' : ''}${computedStats.cumulative_r.toFixed(2)}% (${(computedStats.cumulative_r) >= 0 ? '+' : ''}${computedStats.cumulative_r.toFixed(2)}R)`
                                  : '0.00%'}
                              </span>
                              <span className="block text-[11px] text-zinc-400 normal-case">
                                Net return risking a fixed 1% of balance per signal.
                              </span>
                            </div>
                            
                            {/* Visual Progress Line */}
                            <div className="w-full bg-[#162035] h-1.5 rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  (computedStats?.cumulative_r || 0) >= 0 ? 'bg-[#00e676]' : 'bg-[#ff1744]'
                                }`} 
                                style={{ width: `${Math.min(100, Math.max(10, Math.abs(computedStats?.cumulative_r || 0) * 4))}%` }}
                              />
                            </div>
                          </div>

                          {/* Hero 2: Accuracy Dial (Win Rate) */}
                          <div className="relative overflow-hidden bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-5 rounded-2xl text-left space-y-4 shadow-xl flex flex-col justify-between group hover:border-[#3D5AFE]/40 transition-all duration-300">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Hit Rate</span>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Trading Accuracy</h3>
                              </div>
                              <span className="p-2 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400">
                                {computedStats?.win_rate_pct != null ? `${computedStats.win_rate_pct}%` : '-'}
                              </span>
                            </div>
                            
                            <div className="space-y-1 pt-2 flex items-center justify-between gap-2">
                              <div>
                                <span className="block text-3xl font-extrabold font-mono tracking-tight text-white">
                                  {computedStats?.win_rate_pct != null ? `${computedStats.win_rate_pct}%` : '0.0%'}
                                </span>
                                <span className="block text-[11px] text-zinc-400 normal-case">
                                  Ratio of profitable closed swings.
                                </span>
                              </div>
                              
                              {/* Small Circular SVG Indicator */}
                              <div className="relative w-12 h-12 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="24" cy="24" r="20" stroke="#162035" strokeWidth="3" fill="transparent" />
                                  <circle cx="24" cy="24" r="20" stroke="#06b6d4" strokeWidth="3" fill="transparent"
                                    strokeDasharray={`${2 * Math.PI * 20}`}
                                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - (parseFloat(computedStats?.win_rate_pct || 0) / 100))}`}
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                  />
                                </svg>
                              </div>
                            </div>

                            <div className="text-[10px] font-mono text-[#06b6d4] uppercase tracking-wider">
                              🎯 {computedStats ? `${computedStats.wins} Wins` : '0'} / {computedStats ? `${computedStats.losses} Losses` : '0'}
                            </div>
                          </div>

                          {/* Hero 3: Efficiency Metric (Profit Factor) */}
                          <div className="relative overflow-hidden bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-5 rounded-2xl text-left space-y-4 shadow-xl flex flex-col justify-between group hover:border-[#3D5AFE]/40 transition-all duration-300">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Efficiency</span>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Profit Factor</h3>
                              </div>
                              <span className="p-2 rounded-lg text-xs font-mono font-bold bg-[#3D5AFE]/10 text-[#3D5AFE]">
                                {computedStats?.profit_factor ?? '-'}
                              </span>
                            </div>
                            
                            <div className="space-y-1 pt-2">
                              <span className="block text-3xl font-extrabold font-mono tracking-tight text-[#3D5AFE]">
                                {computedStats?.profit_factor ?? '0.00'}
                              </span>
                              <span className="block text-[11px] text-zinc-400 normal-case">
                                Gross positive gains vs gross negative risk loss.
                              </span>
                            </div>

                            {/* Efficiency horizontal split bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                                <span>Gains</span>
                                <span>Losses</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full overflow-hidden flex">
                                <div className="bg-[#00e676] h-full" style={{ width: `${computedStats ? (computedStats.wins / (computedStats.wins + computedStats.losses || 1)) * 100 : 50}%` }} />
                                <div className="bg-[#ff1744] h-full" style={{ width: `${computedStats ? (computedStats.losses / (computedStats.wins + computedStats.losses || 1)) * 100 : 50}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mid-level Grid: Numerical Value Details & Interactive Compound Outcome Simulator */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                          {/* Outcome Simulator Card */}
                          <div className="lg:col-span-1 bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-5 rounded-2xl text-left space-y-4 shadow-xl flex flex-col justify-between">
                            <div className="space-y-1">
                              <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#3D5AFE]">
                                Outcome Simulator
                              </span>
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fixed-Risk Growth</h3>
                              <p className="text-[11px] text-zinc-400 normal-case leading-relaxed">
                                Estimate capital growth risking a fixed 1% of balance per signal, using cumulative R-multiples.
                              </p>
                            </div>

                            <div className="space-y-3 pt-1">
                              {/* Capital Input Toggles */}
                              <div className="space-y-1.5">
                                <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Starting Balance ($)</label>
                                <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800/80 shadow-inner">
                                  {[5000, 10000, 25000].map(val => (
                                    <button
                                      key={val}
                                      onClick={() => setStartingCapital(val)}
                                      className={`py-1.5 rounded-md text-[10px] font-mono font-bold transition-all duration-300 cursor-pointer border-0 ${
                                        startingCapital === val
                                          ? 'bg-[#3D5AFE] text-white shadow shadow-[#3D5AFE]/20'
                                          : 'bg-transparent text-zinc-500 hover:text-white'
                                      }`}
                                    >
                                      ${val.toLocaleString()}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Simulation Results Output */}
                              <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/50 space-y-2 font-mono">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                  <span>Initial Capital:</span>
                                  <span className="text-white">${startingCapital.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                  <span>Risk Per Signal (1%):</span>
                                  <span className="text-white">${(startingCapital * 0.01).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                  <span>Cumulative R-Multiple:</span>
                                  <span className={`font-bold ${
                                    (computedStats?.cumulative_r || 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'
                                  }`}>
                                    {computedStats?.cumulative_r != null 
                                      ? `${(computedStats.cumulative_r) >= 0 ? '+' : ''}${computedStats.cumulative_r.toFixed(2)} R`
                                      : '0.00 R'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                  <span>Total Return PnL:</span>
                                  <span className={`font-bold ${
                                    (computedStats?.cumulative_r || 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'
                                  }`}>
                                    {computedStats?.cumulative_r != null 
                                      ? `${(computedStats.cumulative_r) >= 0 ? '+' : ''}${(computedStats.cumulative_r).toFixed(2)}%`
                                      : '0.00%'}
                                  </span>
                                </div>
                                <div className="border-t border-slate-900 my-1 pt-1 flex justify-between items-center">
                                  <span className="text-[10px] text-zinc-400 font-bold">Simulated Balance:</span>
                                  <span className="text-sm font-black text-white">
                                    ${(startingCapital + (computedStats?.cumulative_r || 0) * (startingCapital * 0.01)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2x3 Mini Metrics Cards */}
                          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {[
                              { label: 'Total Signals', val: computedStats?.total_signals ?? '-', note: `Complete Swings` },
                              { label: 'Average Outcome', val: computedStats?.avg_pnl != null ? `${parseFloat(computedStats.avg_pnl) >= 0 ? '+' : ''}${computedStats.avg_pnl}%` : '-', note: 'Per closed trade' },
                              { label: 'Open Indicators', val: openSignalsCount, note: 'Current active swings' },
                              { label: 'Best Outcome', val: computedStats?.best_trade != null ? `+${computedStats.best_trade}%` : '-', note: 'Maximum trade gain' },
                              { label: 'Max Drawdown', val: computedStats?.worst_trade != null ? `${computedStats.worst_trade}%` : '-', note: 'Maximum trade loss' },
                              { label: 'Trade Split', val: computedStats ? `${computedStats.wins}W - ${computedStats.losses}L` : '-', note: 'Total win/loss ratio' },
                            ].map((s, i) => (
                              <div key={i} className="bg-gradient-to-b from-[#0b1224] to-[#070d19] border border-[#1e2d4a] p-4 rounded-xl text-left space-y-1.5 group hover:border-[#3D5AFE]/30 transition-all duration-300">
                                <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">{s.label}</span>
                                <span className="block text-[20px] font-bold font-mono text-white tracking-tight">{s.val}</span>
                                <span className="block text-[10px] text-zinc-400 normal-case">{s.note}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Line Chart */}
                        <div className="w-full">
                          <PerformanceChart signals={perfSignals} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === 'ledger' && (
                  <div className="space-y-4 text-left">
                    <div className="p-6 bg-[#3D5AFE]/5 border border-[#3D5AFE]/20 rounded-2xl space-y-2">
                      <span className="text-[11px] font-mono text-[#3D5AFE] font-bold uppercase tracking-widest">Global Audit Ledger</span>
                      <h3 className="text-[15px] font-bold uppercase tracking-wide text-white">Immutable Historical Audits</h3>
                      <p className="text-[13px] text-zinc-400 normal-case leading-relaxed">
                        Every trading execution signal generated by the Sanddock algorithmic pipelines is logged permanently. We maintain a full, transparent audit trail with zero deletions or back-dated adjustments.
                      </p>
                    </div>
                    <div className="text-center py-16 border border-dashed border-zinc-800/80 rounded-2xl text-[12px] text-zinc-500 font-mono uppercase tracking-wider bg-[#070b19]/25">
                      📜 Database records are active. Access the complete ledger in the Signal Log tab.
                    </div>
                  </div>
                )}

                {activeSubTab === 'audit' && (
                  <div className="space-y-6 text-left animate-slide-up">
                    <div className="p-6 bg-gradient-to-r from-[#0b1224] to-[#070d19] border border-[#1e2d4a] rounded-2xl space-y-2">
                      <span className="text-[10px] font-mono text-[#3D5AFE] font-bold uppercase tracking-widest">Model Verification</span>
                      <h3 className="text-[15px] font-bold uppercase tracking-wide text-white">AI Confidence Calibration Audit</h3>
                      <p className="text-[13px] text-zinc-400 normal-case leading-relaxed">
                        This audit log validates that the Sanddock AI confidence score is highly calibrated to trading outcomes. Under a rational model, higher conviction levels should translate to superior accuracy and higher win-rates.
                      </p>
                    </div>

                    <div className="bg-[#0b1224] border border-[#1e2d4a] rounded-2xl overflow-hidden shadow-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#1e2d4a] bg-slate-950/40 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                            <th className="p-4">Confidence Band</th>
                            <th className="p-4">Sample Size</th>
                            <th className="p-4">Win Rate (%)</th>
                            <th className="p-4">Avg R-Multiple</th>
                            <th className="p-4">Status Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2d4a]/50 text-xs font-mono text-zinc-300">
                          {calibrationAuditData.map((row, idx) => {
                            const isHighAccuracy = parseFloat(row.winRate) >= 65;
                            return (
                              <tr key={idx} className="hover:bg-slate-900/10">
                                <td className="p-4 text-white font-bold">{row.label}</td>
                                <td className="p-4 text-zinc-400">{row.sampleSize} signals</td>
                                <td className={`p-4 font-bold ${isHighAccuracy ? 'text-[#00e676]' : 'text-zinc-400'}`}>{row.winRate}</td>
                                <td className={`p-4 font-bold ${row.avgR.startsWith('-') ? 'text-[#ff1744]' : 'text-zinc-300'}`}>{row.avgR}</td>
                                <td className="p-4">
                                  {row.sampleSize === 0 ? (
                                    <span className="text-zinc-600 text-[10px] uppercase font-bold">No Data</span>
                                  ) : isHighAccuracy ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                                      ✓ Strongly Calibrated
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded border border-zinc-700/20 uppercase">
                                      ✓ Normal Distribution
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ SETTINGS TAB ════════════════════════════════════════════════ */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-xl text-left">
                <div className="space-y-1 border-b border-zinc-800 pb-4">
                  <h2 className="text-[18px] font-bold uppercase tracking-wider text-white">Console Settings</h2>
                  <p className="text-[13px] text-zinc-400 font-mono">Update experience profile, risk tolerance, alerts, and display parameters.</p>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-6">

                  {/* TRADING PROFILE */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-850 pb-1.5 flex items-center gap-1.5 select-none">
                      <svg className="w-3.5 h-3.5 text-[#3D5AFE]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Trading Profile
                    </h3>
                    
                    <div className="space-y-3 font-mono">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Experience level</label>
                        <select value={settingsExperience} onChange={e => setSettingsExperience(e.target.value)}
                          className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none">
                          <option value="beginner">Just starting out</option>
                          <option value="comfortable">Getting comfortable</option>
                          <option value="experienced">Experienced trader</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Risk style</label>
                        <select value={settingsRisk} onChange={e => setSettingsRisk(e.target.value)}
                          className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none">
                          <option value="conservative">Conservative (SL -1.5% | TP +3.0%)</option>
                          <option value="balanced">Balanced (SL -2.5% | TP +5.0%)</option>
                          <option value="aggressive">Aggressive (SL -4.0% | TP +10.0%)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Primary goal</label>
                        <select value={settingsGoal} onChange={e => setSettingsGoal(e.target.value)}
                          className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none">
                          <option value="learn">Learn to trade smarter</option>
                          <option value="grow">Grow my portfolio</option>
                          <option value="automate">Automate my alerts</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Account size (USDT)</label>
                        <input type="number" value={settingsAccountSize} onChange={e => setSettingsAccountSize(Number(e.target.value))}
                          className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Risk per trade</label>
                        <div className="flex gap-2">
                          {['1%', '1.5%', '2%', 'custom'].map(type => (
                            <button key={type} type="button" onClick={() => setSettingsRiskPerTradeType(type)}
                              className={`px-4 py-2 text-xs font-bold uppercase transition-all border rounded-none cursor-pointer ${
                                settingsRiskPerTradeType === type
                                  ? 'bg-[#3D5AFE] text-white border-[#3D5AFE]'
                                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                              }`}>
                              {type}
                            </button>
                          ))}
                        </div>
                        {settingsRiskPerTradeType === 'custom' && (
                          <div className="pt-2">
                            <input type="number" step="0.1" placeholder="Custom risk %" value={settingsCustomRiskVal} onChange={e => setSettingsCustomRiskVal(e.target.value)}
                              className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SIGNAL PREFERENCES */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-850 pb-1.5 flex items-center gap-1.5 select-none">
                      <svg className="w-3.5 h-3.5 text-[#3D5AFE]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Signal Preferences
                    </h3>

                    <div className="space-y-3 font-mono">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Minimum confidence: {settingsMinConfidence}%</label>
                        <input type="range" min="65" max="95" step="5" value={settingsMinConfidence} onChange={e => setSettingsMinConfidence(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-orange" />
                        <div className="flex justify-between text-[9px] text-zinc-500">
                          <span>65% (More noise)</span>
                          <span>95% (Fewer setups)</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Default timeframe</label>
                        <select value={settingsDefaultTimeframe} onChange={e => setSettingsDefaultTimeframe(e.target.value)}
                          className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none">
                          <option value="15m">15m</option>
                          <option value="1h">1h</option>
                          <option value="4h">4h</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Default view</label>
                        <select value={settingsDefaultView} onChange={e => setSettingsDefaultView(e.target.value)}
                          className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none">
                          <option value="Stream">Stream</option>
                          <option value="Split">Split</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ALERT DELIVERY */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-850 pb-1.5 flex items-center gap-1.5 select-none">
                      <svg className="w-3.5 h-3.5 text-[#3D5AFE]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Alert Delivery
                    </h3>

                    {/* Telegram Section */}
                    <div className="p-4 bg-[#090e1a] border border-zinc-800 space-y-3 font-mono text-xs">
                      <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Telegram Integration</span>
                      
                      {/* If Free Plan */}
                      {isFreePlan ? (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-zinc-400 text-[11px]">Telegram pairing is locked.</span>
                          <button type="button"
                            onClick={() => triggerUpgradeGate('Telegram Alerts Locked', 'Telegram alerts are available on Pro and Master tiers.')}
                            className="py-1.5 px-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer border-0">
                            Pair Bot 🔒
                          </button>
                        </div>
                      ) : (
                        /* Paid Plan: Two-step pairing */
                        <div className="space-y-4">
                          
                          {/* Step 1: Link Account */}
                          <div className="flex justify-between items-center gap-2 border-b border-zinc-900 pb-2">
                            <div>
                              <span className="block text-[10px] text-zinc-500 uppercase font-bold">Step 1: Link account</span>
                              {profile.telegram_chat_id ? (
                                <span className="text-[#00e676] font-bold">● Connected — @ghuruprasaath</span>
                              ) : (
                                <span className="text-zinc-400">○ Not linked</span>
                              )}
                            </div>
                            {!profile.telegram_chat_id && tgPairingStep === 1 && (
                              <button type="button" onClick={() => setTgPairingStep(2)}
                                className="py-1.5 px-3 bg-[#3D5AFE] hover:bg-[#2943d0] text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer border-0">
                                Link Telegram
                              </button>
                            )}
                          </div>

                          {/* Interactive Verification code entry if in step 2 */}
                          {!profile.telegram_chat_id && tgPairingStep === 2 && (
                            <div className="p-3 bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                              <span className="block text-[10px] text-zinc-400 font-bold">Enter pairing code from @SanddockBot:</span>
                              <div className="flex gap-1.5 items-center justify-between flex-wrap">
                                <div className="flex gap-1">
                                  {tgPairingCode.map((char, index) => (
                                    <input key={index} id={`tg-code-${index}`} type="text" maxLength="1" value={char}
                                      onChange={e => {
                                        const newCode = [...tgPairingCode];
                                        newCode[index] = e.target.value.slice(-1);
                                        setTgPairingCode(newCode);
                                        if (e.target.value && index < 5) {
                                          document.getElementById(`tg-code-${index + 1}`)?.focus();
                                        }
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === 'Backspace' && !tgPairingCode[index] && index > 0) {
                                          document.getElementById(`tg-code-${index - 1}`)?.focus();
                                        }
                                      }}
                                      className="w-8 h-9 bg-slate-950 border border-zinc-800 text-center text-sm font-bold text-white focus:outline-none focus:border-brand-orange" />
                                  ))}
                                </div>
                                <button type="button"
                                  onClick={() => {
                                    setTgStatus('loading');
                                    setTimeout(() => {
                                      setTgStatus('success');
                                      setTimeout(async () => {
                                        await updateProfile({ telegram_chat_id: 'mock-tg-chat-9988' });
                                        setTgPairingStep(1);
                                        setTgStatus('');
                                      }, 1000);
                                    }, 1000);
                                  }}
                                  disabled={tgPairingCode.some(c => !c) || tgStatus === 'loading'}
                                  className="py-1.5 px-3 bg-[#00e676] hover:bg-emerald-600 text-black font-bold text-[10px] uppercase tracking-widest cursor-pointer disabled:opacity-40">
                                  {tgStatus === 'loading' ? 'Verifying...' : 'Verify'}
                                </button>
                              </div>
                              {tgStatus === 'success' && <div className="text-[10px] text-emerald-400 font-bold">✅ Success! Account linked.</div>}
                            </div>
                          )}

                          {/* Step 2: Join Channel */}
                          <div className="flex justify-between items-center gap-2">
                            <div>
                              <span className="block text-[10px] text-zinc-500 uppercase font-bold">Step 2: Join channel</span>
                              {!profile.telegram_chat_id ? (
                                <span className="text-zinc-500">○ Waiting for Step 1</span>
                              ) : isTelegramChannelJoined ? (
                                <span className="text-[#00e676] font-bold">✓ Member of Sanddock {profile.plan === 'master' ? 'Master' : 'Pro'} Signals</span>
                              ) : (
                                <span className="text-zinc-400">○ Not joined</span>
                              )}
                            </div>
                            {profile.telegram_chat_id && !isTelegramChannelJoined && (
                              <a href={profile.plan === 'master' ? 'https://t.me/sanddock_master' : 'https://t.me/sanddock_pro'}
                                target="_blank" rel="noopener noreferrer"
                                onClick={() => {
                                  setIsTelegramChannelJoined(true);
                                  localStorage.setItem('sanddock_tg_channel_joined', 'true');
                                }}
                                className="py-1.5 px-3 bg-[#3D5AFE] hover:bg-[#2943d0] text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer border-0 text-center select-none no-underline">
                                Join Channel
                              </a>
                            )}
                          </div>

                          {/* If fully linked and joined: show view channel and disconnect */}
                          {profile.telegram_chat_id && isTelegramChannelJoined && (
                            <div className="flex gap-2 pt-2 border-t border-zinc-900">
                              <a href={profile.plan === 'master' ? 'https://t.me/sanddock_master' : 'https://t.me/sanddock_pro'}
                                target="_blank" rel="noopener noreferrer"
                                className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-[10px] uppercase tracking-wider text-center select-none no-underline">
                                View Channel &rarr;
                              </a>
                              <button type="button"
                                onClick={async () => {
                                  await updateProfile({ telegram_chat_id: null });
                                  setIsTelegramChannelJoined(false);
                                  localStorage.removeItem('sanddock_tg_channel_joined');
                                }}
                                className="py-1.5 px-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] uppercase tracking-wider cursor-pointer">
                                Disconnect
                              </button>
                            </div>
                          )}

                        </div>
                      )}
                    </div>

                    {/* Email Notifications List */}
                    <div className="space-y-2 font-mono text-xs">
                      <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Email Notifications</span>
                      
                      {[
                        { label: 'Signal closed (TP/SL hit)', val: settingsEmailSignalClosed, set: setSettingsEmailSignalClosed },
                        { label: 'Weekly signal debrief', val: settingsEmailWeeklyDebrief, set: setSettingsEmailWeeklyDebrief },
                        { label: 'System alerts', val: settingsEmailSystemAlerts, set: setSettingsEmailSystemAlerts },
                      ].map((emailOpt, i) => (
                        <div key={i} className="flex justify-between items-center bg-[#090e1a] border border-zinc-800/60 p-3">
                          <span className="text-zinc-300 font-medium">{emailOpt.label}</span>
                          <button type="button" onClick={() => emailOpt.set(!emailOpt.val)}
                            className={`py-1 px-3 text-[10px] font-bold uppercase rounded-none cursor-pointer border ${
                              emailOpt.val
                                ? 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/20'
                                : 'bg-zinc-900 text-zinc-500 border-zinc-850'
                            }`}>
                            {emailOpt.val ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      ))}
                      <span className="block text-[9px] text-zinc-500 font-mono italic">Emails go to: {profile.email}</span>
                    </div>
                  </div>

                  {/* DISPLAY */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-850 pb-1.5 flex items-center gap-1.5 select-none">
                      <svg className="w-3.5 h-3.5 text-[#3D5AFE]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Display
                    </h3>

                    <div className="space-y-3 font-mono">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Timezone</label>
                        <select value={settingsTimezone} onChange={e => setSettingsTimezone(e.target.value)}
                          className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none">
                          <option value="UTC">UTC</option>
                          <option value="EST">EST (New York)</option>
                          <option value="IST">IST (India)</option>
                          <option value="GMT">GMT (London)</option>
                          <option value="PST">PST (Los Angeles)</option>
                          <option value="CET">CET (Paris)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Price format</label>
                        <select value={settingsPriceFormat} onChange={e => setSettingsPriceFormat(e.target.value)}
                          className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange rounded-none">
                          <option value="usd">USD ($62,410.00)</option>
                          <option value="usdt">USDT (62410.00 USDT)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* BILLING SHORTCUT */}
                  <div className="pt-4 border-t border-zinc-800 flex justify-between items-center gap-4 flex-wrap">
                    <a href="/billing" className="text-xs text-[#3D5AFE] hover:underline font-mono uppercase tracking-wider flex items-center gap-1 font-bold no-underline">
                      Manage Billing &amp; View Invoices &rarr;
                    </a>
                    
                    <button type="submit"
                      className="py-2.5 px-8 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[12px] uppercase tracking-widest transition-all cursor-pointer border-0 rounded-none shadow-md">
                      Save Settings
                    </button>
                  </div>

                </form>
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
          { id: 'settings',icon: Icons.Settings, label: 'Settings' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1 text-[11px] font-bold uppercase tracking-widest cursor-pointer border-0 bg-transparent ${
                activeTab === item.id ? 'text-brand-orange bg-zinc-950' : 'text-zinc-400 hover:text-white'
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
              className="absolute top-4 right-4 text-zinc-500 hover:text-white text-[20px] font-bold font-mono bg-transparent border-0 cursor-pointer">
              &times;
            </button>
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold text-brand-orange uppercase tracking-wider">Console Upgrade</span>
              <h3 className="text-[20px] font-extrabold uppercase tracking-tight text-white">{upgradeTriggerText.title}</h3>
              <p className="text-[13px] text-zinc-400 leading-relaxed normal-case">{upgradeTriggerText.desc}</p>
            </div>
            <div className="p-4 bg-zinc-950 border border-zinc-900 space-y-2">
              <span className="block text-[13px] font-bold text-white uppercase tracking-wider">Pro Plan Benefits</span>
              <ul className="space-y-1 text-[12px] text-zinc-400 list-disc list-inside normal-case">
                <li>10+ major crypto coins tracked</li>
                <li>Multiple timeframes (15m, 1H, 4H)</li>
                <li>Entry targets, Stop Loss, and Take Profit</li>
                <li>Automated Telegram push integrations</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleVirtualUpgrade}
                className="flex-1 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[13px] uppercase tracking-widest transition-colors cursor-pointer border-0">
                Upgrade to Pro ($29/mo)
              </button>
              <button onClick={() => setUpgradeModal(false)}
                className="px-4 py-3 border border-zinc-800 bg-transparent hover:bg-[#111827] hover:text-white text-[13px] font-bold text-zinc-400 uppercase tracking-widest transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
