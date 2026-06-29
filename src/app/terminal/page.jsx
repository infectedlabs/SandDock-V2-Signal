'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useSignals } from '@/hooks/useSignals';
import { useSignalLog } from '@/hooks/useSignalLog';
import { usePerformance } from '@/hooks/usePerformance';
import HAChart from '@/components/HAChart';

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

const TEASER_LOCKED_COINS = [
  { symbol: 'ETH/USDT', timeframe: '1H', type: 'BUY' },
  { symbol: 'SOL/USDT', timeframe: '15m', type: 'SELL' },
  { symbol: 'BNB/USDT', timeframe: '1H', type: 'BUY' },
  { symbol: 'XRP/USDT', timeframe: '4H', type: 'BUY' },
];

function formatPrice(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(parseFloat(val));
}

function formatRelativeTime(isoString) {
  if (!isoString) return '—';
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

function formatLogDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── LockedSignalCard ─────────────────────────────────────────────────────────
function LockedSignalCard({ symbol, timeframe, type, onUpgrade }) {
  return (
    <div
      onClick={onUpgrade}
      className="bg-[#0d1426] border border-zinc-900 p-5 flex flex-col justify-between text-left relative cursor-pointer border-l-4 border-l-zinc-700 min-h-[200px] gap-3"
    >
      <div className="flex justify-between items-center">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[15px] font-bold text-zinc-400">{symbol}</span>
            <span className="text-[12px] font-mono text-zinc-500">({timeframe} HA)</span>
          </div>
          <span className="block text-[11px] text-zinc-500 font-medium">Signal active</span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Confidence</span>
          <span className="font-mono text-[13px] font-bold text-[#3D5AFE] flex items-center gap-1">
            <Icons.Lock /> Locked
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2 bg-zinc-950/20 px-3 border border-zinc-900/60 blur-xs select-none">
        {['Entry', 'Stop Loss', 'Take Profit'].map(label => (
          <div key={label}>
            <span className="block text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{label}</span>
            <span className="text-[13px] text-zinc-500 font-bold">---</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 select-none">
        <span className="block text-[10px] text-zinc-600 font-bold uppercase tracking-widest">AI Explanation</span>
        <p className="text-[13px] text-zinc-500 italic leading-relaxed">🔒 AI analysis locked.</p>
      </div>

      <button
        type="button"
        className="w-full py-2 bg-[#3D5AFE]/10 hover:bg-[#3D5AFE] text-[#3D5AFE] hover:text-white font-bold text-[11px] uppercase tracking-widest transition-all text-center border border-[#3D5AFE]/20 cursor-pointer"
      >
        Unlock {symbol.split('/')[0]} signals on Pro →
      </button>
    </div>
  );
}

// ── SignalCard ───────────────────────────────────────────────────────────────
function SignalCard({ sig, isFreePlan, isLastSignalBadge = false, isExpanded, onToggle, onUpgrade, onViewDetails, livePrice, isLive = false, nextSignal = null }) {
  const isBuy = sig.signal_type === 'buy';

  let pnlText = '';
  let pnlColorClass = 'text-white';
  
  if (sig.pnl_pct != null) {
    pnlText = `${sig.pnl_pct >= 0 ? '+' : ''}${parseFloat(sig.pnl_pct).toFixed(2)}%`;
    pnlColorClass = sig.pnl_pct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
  } else if (isLive && livePrice) {
    const pnl = ((livePrice - sig.entry_price) / sig.entry_price) * 100;
    const finalPnl = isBuy ? pnl : -pnl;
    pnlText = `${finalPnl >= 0 ? '+' : ''}${finalPnl.toFixed(2)}% Live`;
    pnlColorClass = finalPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
  } else if (nextSignal) {
    const exitPrice = nextSignal.entry_price;
    const change = ((exitPrice - sig.entry_price) / sig.entry_price) * 100;
    const finalPnl = isBuy ? change : -change;
    pnlText = `${finalPnl >= 0 ? '+' : ''}${finalPnl.toFixed(2)}%`;
    pnlColorClass = finalPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
  }

  return (
    <div
      onClick={() => onViewDetails(sig)}
      className={`glass rounded-xl border transition-all duration-300 hover:scale-[1.02] flex flex-col text-left cursor-pointer shadow-lg hover:shadow-[#3D5AFE]/5 ${
        isExpanded ? 'border-zinc-700' : 'border-[#1e2a3a]/60 hover:border-zinc-800'
      } ${(isLastSignalBadge || isLive) ? 'border-l-4 border-l-zinc-500 animate-pulse-glow' : isBuy ? 'border-l-4 border-l-[#10b981]' : 'border-l-4 border-l-[#ef4444]'}`}
    >
      {/* Header */}
      <div className="p-5 flex justify-between items-center select-none">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {(isLastSignalBadge || isLive) ? (
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-400 animate-ping" />
            ) : (
              <span className={`inline-block w-2 h-2 rounded-full ${isBuy ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
            )}
            <span className="font-mono text-[15px] font-bold text-white">{formatSymbol(sig.symbol)}</span>
            <span className="text-[12px] font-mono text-zinc-500">({sig.interval} HA)</span>
            {(isLastSignalBadge || isLive) && (
              <span className="text-[9px] font-mono font-bold bg-[#3D5AFE]/10 text-[#3D5AFE] border border-[#3D5AFE]/20 px-1 py-0.2 uppercase rounded-xs">
                ACTIVE PIPELINE
              </span>
            )}
          </div>
          <span className="block text-[11px] text-zinc-500 font-medium">
            {(isLastSignalBadge || isLive) ? `Fired ${formatRelativeTime(sig.created_at)}` : formatRelativeTime(sig.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            {pnlText ? (
              <>
                <span className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold">PnL</span>
                <span className={`font-mono text-[13px] font-bold ${pnlColorClass}`}>{pnlText}</span>
              </>
            ) : (
              <>
                <span className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Confidence</span>
                <span className="font-mono text-[13px] font-bold text-white">{sig.confidence}%</span>
              </>
            )}
          </div>
          <span className="text-[#3D5AFE] text-[11px] font-bold uppercase tracking-wider hover:underline flex items-center gap-0.5">
            Details <Icons.ChevronRight />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Detail Drawer Component ──────────────────────────────────────────────────
function DetailDrawer({ sig, isFreePlan, experienceLevel, onClose, onUpgrade }) {
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
              Live Price: <span className="font-bold text-white">{formatPrice(sig.entry_price)}</span>
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
              <span className="text-[14px] text-white font-bold font-mono">{formatPrice(sig.entry_price)}</span>
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
                  {formatPrice(sig.sl_price)} ({sig.sl_pct}%)
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
                  {formatPrice(sig.tp_price)} (+{sig.tp_pct}%)
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
          <HAChart symbol={sig.symbol} interval={sig.interval} isFreePlan={isFreePlan} />
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
                        <td className="p-3 text-zinc-400">{formatLogDate(item.created_at)}</td>
                        <td className="p-3">
                          <span className={`inline-block px-1 py-0.2 text-[9px] font-bold ${
                            item.signal_type === 'buy' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff1744]/10 text-[#ff1744]'
                          }`}>
                            {item.signal_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">{formatPrice(item.entry_price)}</td>
                        <td className="p-3">{closed ? formatPrice(item.close_price) : '—'}</td>
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

// ── Main Terminal Page ────────────────────────────────────────────────────────
export default function TerminalPage() {
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const router = useRouter();

  const [activeTab,         setActiveTab]         = useState('signals');
  const [activeSubTab,      setActiveSubTab]       = useState('performance');
  const [signalTypeFilter,  setSignalTypeFilter]   = useState('all');
  const [timeframeFilter,   setTimeframeFilter]    = useState('all');
  const [settingsExperience,setSettingsExperience] = useState('comfortable');
  const [settingsRisk,      setSettingsRisk]       = useState('balanced');
  const [settingsGoal,      setSettingsGoal]       = useState('grow');
  const [upgradeModal,      setUpgradeModal]       = useState(false);
  const [upgradeTriggerText,setUpgradeTriggerText] = useState({ title: '', desc: '' });
  const [profileMenuOpen,   setProfileMenuOpen]    = useState(false);
  const [bannerVisible,     setBannerVisible]      = useState(false);

  // Lifted Chart Selectors State
  const [selectedSymbol,   setSelectedSymbol]   = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState('15m');

  // Detail Drawer state
  const [selectedDrawerSignal, setSelectedDrawerSignal] = useState(null);
  
  // Live price poll
  const [liveBtcPrice, setLiveBtcPrice] = useState(null);
  useEffect(() => {
    const fetchLivePrice = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${selectedSymbol}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          setLiveBtcPrice(parseFloat(data.price));
        } else {
          throw new Error(`Binance response error: ${res.status}`);
        }
      } catch (e) {
        console.warn('Live price poll failed, using simulated price:', e.message);
        setLiveBtcPrice(prev => {
          if (prev !== null) {
            return prev + (Math.random() - 0.5) * (prev * 0.0005);
          }
          let base = 67000;
          if (selectedSymbol.includes('ETH')) base = 3500;
          else if (selectedSymbol.includes('SOL')) base = 145;
          else if (selectedSymbol.includes('BNB')) base = 580;
          else if (selectedSymbol.includes('XRP')) base = 0.55;
          return base + (Math.random() - 0.5) * (base * 0.001);
        });
      }
    };
    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 5000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

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

  const signalFilters = useMemo(() => ({
    plan:        profile?.plan || 'free',
    symbol:      selectedSymbol,
    signal_type: signalTypeFilter !== 'all' ? signalTypeFilter : undefined,
    interval:    selectedInterval,
  }), [profile?.plan, selectedSymbol, signalTypeFilter, selectedInterval]);

  const { signals: liveSignals, loading: sigLoading } = useSignals(signalFilters);
  const { signals: logSignals,  loading: logLoading  } = useSignalLog({ plan: profile?.plan || 'free', symbol: selectedSymbol, interval: selectedInterval });
  const { stats,                loading: statsLoading } = usePerformance(selectedSymbol, selectedInterval);

  const cleanLiveSignals = useMemo(() => {
    return liveSignals.filter(s => s.action === 'new');
  }, [liveSignals]);

  const todayStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todaySignals = cleanLiveSignals.filter(s => new Date(s.created_at).toDateString() === todayStr);
    
    const mapped = todaySignals.map((sig, index) => {
      const originalIdx = cleanLiveSignals.findIndex(s => s.id === sig.id);
      let pnlVal = 0;
      if (originalIdx === 0 && liveBtcPrice) {
        const pnl = ((liveBtcPrice - sig.entry_price) / sig.entry_price) * 100;
        pnlVal = sig.signal_type === 'buy' ? pnl : -pnl;
      } else if (originalIdx > 0) {
        const nextSig = cleanLiveSignals[originalIdx - 1];
        const change = ((nextSig.entry_price - sig.entry_price) / sig.entry_price) * 100;
        pnlVal = sig.signal_type === 'buy' ? change : -change;
      }
      return pnlVal;
    });

    const totalTrades = mapped.length;
    const wins = mapped.filter(p => p > 0).length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '—';
    const sumPnl = mapped.reduce((sum, p) => sum + p, 0);
    
    return {
      totalTrades,
      winRate,
      sumPnl: sumPnl.toFixed(2)
    };
  }, [cleanLiveSignals, liveBtcPrice]);

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
      await updateProfile({ experience_level: settingsExperience, risk_style: settingsRisk, primary_goal: settingsGoal });
      alert('Preferences updated!');
    } catch (err) { console.error(err); }
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-[#080d1a] text-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px]">Restoring sandbox configuration...</span>
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
          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
            isFreePlan
              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              : 'bg-brand-orange text-white'
          }`}>
            {profile.plan} Plan
          </span>

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
              <div className="bg-[#111827] border border-zinc-800 p-3 space-y-2.5 text-left">
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-[#3D5AFE]">Console Plan</span>
                  <p className="text-[11px] text-zinc-400 normal-case leading-relaxed">Free — 1 of 11 coins active.</p>
                </div>
                <button
                  onClick={() => triggerUpgradeGate('Upgrade to Pro', 'Full access to all signals and Telegram alerts.')}
                  className="w-full py-1.5 bg-[#3D5AFE] hover:bg-[#2e4be6] text-white font-bold text-[11px] uppercase tracking-wider transition-colors border border-[#3D5AFE] cursor-pointer text-center block"
                >
                  Upgrade to Pro
                </button>
              </div>
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
                <div className="glass border border-slate-800/80 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-left shadow-lg select-none">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Today's PnL</span>
                    <span className={`block text-2xl font-extrabold font-mono mt-1 ${
                      parseFloat(todayStats.sumPnl) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                    }`}>
                      {parseFloat(todayStats.sumPnl) >= 0 ? '+' : ''}{todayStats.sumPnl}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Today's Win Rate</span>
                    <span className="block text-2xl font-extrabold font-mono text-white mt-1">
                      {todayStats.winRate}{todayStats.winRate !== '—' ? '%' : ''}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Swings Executed</span>
                    <span className="block text-2xl font-extrabold font-mono text-white mt-1">
                      {todayStats.totalTrades}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Live Status</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Engine Online
                    </span>
                  </div>
                </div>

                {isFreePlan && bannerVisible && (
                  <div className="bg-brand-orange text-white px-4 py-2.5 flex justify-between items-center text-[12px] font-bold uppercase tracking-wider">
                    <span>
                      ⚡ Free Plan — unlock 10 coins, Telegram alerts, SL/TP.{' '}
                      <button onClick={() => triggerUpgradeGate('Upgrade to Pro', 'Unlock all assets and instant push alerts.')}
                        className="underline font-extrabold hover:text-zinc-200 cursor-pointer bg-transparent border-0 p-0 ml-1">
                        Upgrade →
                      </button>
                    </span>
                    <button onClick={() => { setBannerVisible(false); localStorage.setItem('sanddock_free_banner_dismissed', 'true'); }}
                      className="text-white font-bold hover:text-zinc-300 text-[16px] cursor-pointer bg-transparent border-0 p-0 ml-4">
                      &times;
                    </button>
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0d1426] border border-[#1e2a3a] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex border border-zinc-800">
                      {['all', 'buy', 'sell'].map(type => (
                        <button key={type} onClick={() => setSignalTypeFilter(type)}
                          className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border-r border-zinc-800 last:border-r-0 cursor-pointer bg-transparent ${
                            signalTypeFilter === type ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                          }`}>
                          {type}
                        </button>
                      ))}
                    </div>

                    <div className="flex border border-zinc-800">
                      {['15m', '1h', '4h'].map(tf => {
                        const locked = isFreePlan && (tf === '1h' || tf === '4h');
                        return (
                          <button key={tf}
                            onClick={() => locked ? triggerUpgradeGate('Timeframe Locked', '1H and 4H timeframes are Pro features.') : setSelectedInterval(tf)}
                            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border-r border-zinc-800 last:border-r-0 flex items-center gap-1 cursor-pointer bg-transparent ${
                              selectedInterval === tf ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                            }`}>
                            {tf} {locked && <span className="text-[#3D5AFE] text-[9px]">🔒</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sigLoading && <div className="w-3 h-3 border border-zinc-600 border-t-brand-orange rounded-full animate-spin" />}
                    <span className="text-[12px] font-mono text-zinc-500">
                      {sigLoading ? 'Fetching...' : `${cleanLiveSignals.length} live setup${cleanLiveSignals.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>

                {/* Empty State / Monitoring Layout with fallbacks (BTC Signals) */}
                {!sigLoading && cleanLiveSignals.length === 0 && (
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
                            Watch the engine detect the next BTC signal — usually within a few hours.
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
                        <SignalCard
                          sig={lastBtcSignal}
                          isFreePlan={isFreePlan}
                          isLastSignalBadge={true}
                          isExpanded={false}
                          onToggle={() => {}}
                          onUpgrade={triggerUpgradeGate}
                          onViewDetails={(s) => window.open(`/terminal/signals/${s.id}`, '_blank')}
                          livePrice={liveBtcPrice}
                          isLive={true}
                        />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {recentBtcSignals.map(sig => {
                            const isBuy = sig.signal_type === 'buy';
                            const isWin = sig.is_win;
                            return (
                              <div
                                key={sig.id}
                                onClick={() => window.open(`/terminal/signals/${sig.id}`, '_blank')}
                                className={`bg-[#0d1426] border border-[#1e2a3a] hover:border-zinc-800 p-4 flex flex-col justify-between text-left cursor-pointer border-l-4 ${
                                  isBuy ? 'border-l-[#00e676]' : 'border-l-[#ff1744]'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-[13px] font-bold text-white">BTC/USDT</span>
                                      <span className="text-[11px] font-mono text-zinc-500">({sig.interval} HA)</span>
                                    </div>
                                    <span className="block text-[11px] text-zinc-400">
                                      Closed {formatLogDate(sig.created_at)}
                                    </span>
                                  </div>
                                  <span className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-xs ${
                                    isWin ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff1744]/10 text-[#ff1744]'
                                  }`}>
                                    {isWin ? 'WIN' : 'LOSS'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-900/60 font-mono text-[11px]">
                                  <span className="text-zinc-500">PnL Output</span>
                                  <span className={`font-bold ${isWin ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                                    {isWin ? '+' : ''}{parseFloat(sig.pnl_pct || 0).toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Active signals grid */}
                {cleanLiveSignals.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cleanLiveSignals.map((sig, index) => (
                      <SignalCard
                        key={sig.id}
                        sig={sig}
                        isFreePlan={isFreePlan}
                        isExpanded={false}
                        onToggle={() => {}}
                        onUpgrade={triggerUpgradeGate}
                        onViewDetails={(s) => window.open(`/terminal/signals/${s.id}`, '_blank')}
                        livePrice={liveBtcPrice}
                        isLive={index === 0}
                        nextSignal={index > 0 ? cleanLiveSignals[index - 1] : null}
                      />
                    ))}
                    {isFreePlan && TEASER_LOCKED_COINS.map(coin => (
                      <LockedSignalCard
                        key={coin.symbol}
                        symbol={coin.symbol}
                        timeframe={coin.timeframe}
                        type={coin.type}
                        onUpgrade={() => triggerUpgradeGate(`Unlock ${coin.symbol.split('/')[0]} Signals`, `HA signals for ${coin.symbol} are locked on free tier.`)}
                      />
                    ))}
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
              />
            )}

            {/* ══ HISTORY TAB ══════════════════════════════════════════════════ */}
            {activeTab === 'history' && (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-[16px] font-bold uppercase tracking-wider text-white">Signal History Ledger</h2>
                  <button
                    onClick={() => isFreePlan ? triggerUpgradeGate('CSV Export Locked', 'Downloading as CSV is a Pro feature.') : alert('CSV download triggered!')}
                    className="px-3 py-1.5 border border-zinc-800 hover:bg-zinc-900 font-mono text-[12px] uppercase tracking-wider text-zinc-400 hover:text-white cursor-pointer bg-transparent"
                  >
                    Export CSV {isFreePlan && '🔒'}
                  </button>
                </div>

                {logLoading && (
                  <div className="flex items-center justify-center py-16 gap-3">
                    <div className="w-4 h-4 border border-zinc-600 border-t-brand-orange rounded-full animate-spin" />
                    <span className="text-[12px] font-mono text-zinc-500 uppercase">Loading history...</span>
                  </div>
                )}

                {!logLoading && logSignals.length === 0 && (
                  <div className="bg-[#0d1426] border border-dashed border-[#1e2a3a] p-10 text-center space-y-3">
                    <span className="text-2xl">📋</span>
                    <p className="text-[12px] text-zinc-400 normal-case max-w-sm mx-auto leading-relaxed">
                      History ledger populates as signals hit SL, TP, or are replaced by a new swing.
                    </p>
                  </div>
                )}

                {!logLoading && logSignals.length > 0 && (
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
                        {logSignals.map(sig => {
                          const isBtc    = sig.symbol === 'BTCUSDT';
                          const showBlur = isFreePlan && !isBtc;
                          const isBuy    = sig.signal_type === 'buy';
                          const isClosed = !!sig.close_reason;
                          return (
                            <tr key={sig.id} className={`border-b border-[#1e2a3a]/40 last:border-0 hover:bg-zinc-900/10 text-[12px] ${showBlur ? 'opacity-40 select-none' : ''}`}>
                              <td className="p-3 text-zinc-400">{formatLogDate(sig.created_at)}</td>
                              <td className="p-3 font-bold text-white">{formatSymbol(sig.symbol)}</td>
                              <td className="p-3">
                                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold ${isBuy ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ff1744]/10 text-[#ff1744]'}`}>
                                  {isBuy ? 'BUY' : 'SELL'}
                                </span>
                              </td>
                              <td className="p-3 text-zinc-400">{sig.interval}</td>
                              <td className="p-3 text-zinc-300">{formatPrice(sig.entry_price)}</td>
                              <td className="p-3 text-zinc-300">
                                {showBlur ? <span className="blur-sm">$$$,$$$.$$</span>
                                  : isClosed ? formatPrice(sig.close_price)
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
              <div className="space-y-5">
                <div className="flex border-b border-[#1e2a3a]">
                  {['performance', 'ledger'].map(sub => (
                    <button key={sub} onClick={() => setActiveSubTab(sub)}
                      className={`px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider border-b-2 cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 ${
                        activeSubTab === sub ? 'border-brand-orange text-white' : 'border-transparent text-zinc-500 hover:text-white'
                      }`}>
                      {sub === 'performance' ? 'My Stats' : 'Global Ledger'}
                    </button>
                  ))}
                </div>

                {activeSubTab === 'performance' && (
                  <div className="space-y-5">
                    {statsLoading ? (
                      <div className="flex items-center gap-3 py-8">
                        <div className="w-4 h-4 border border-zinc-600 border-t-brand-orange rounded-full animate-spin" />
                        <span className="text-[12px] font-mono text-zinc-500 uppercase">Loading stats...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Total Signals', val: stats?.total_signals ?? '—', note: 'All-time' },
                          { label: 'Win Rate',      val: stats?.win_rate_pct != null ? `${stats.win_rate_pct}%` : '—', note: 'Wins vs losses' },
                          { label: 'Wins / Losses', val: stats ? `${stats.wins}W / ${stats.losses}L` : '—', note: 'Completed trades' },
                          { label: 'Profit Factor', val: stats?.profit_factor ?? '—', note: 'Gross wins / losses' },
                          { label: 'Best Trade',    val: stats?.best_trade != null ? `+${stats.best_trade}%` : '—', note: 'Historical high' },
                          { label: 'Worst Trade',   val: stats?.worst_trade != null ? `${stats.worst_trade}%` : '—', note: 'Historical low' },
                          { label: 'Average PnL',   val: stats?.avg_pnl != null ? `${parseFloat(stats.avg_pnl) >= 0 ? '+' : ''}${stats.avg_pnl}%` : '—', note: 'Per closed swing' },
                          { label: 'Open Signals',  val: stats?.open_signals ?? '—', note: 'Currently active' },
                        ].map((s, i) => (
                          <div key={i} className="bg-[#0d1426] border border-[#1e2a3a] p-4 text-left space-y-1">
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">{s.label}</span>
                            <span className="block text-[22px] font-bold font-mono text-white">{s.val}</span>
                            <span className="block text-[11px] text-zinc-400 normal-case">{s.note}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!statsLoading && stats?.completed_trades === 0 && (
                      <div className="bg-[#0d1426] border border-dashed border-[#1e2a3a] p-8 text-center space-y-3">
                        <span className="text-2xl">📊</span>
                        <p className="text-[12px] text-zinc-400 normal-case max-w-sm mx-auto leading-relaxed">
                          Performance charts appear once signals have closed trades.
                          Run <code className="font-mono bg-zinc-900 px-1 text-[11px]">backtest_worker.py</code> for instant history.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === 'ledger' && (
                  <div className="space-y-4 text-left">
                    <div className="p-5 bg-brand-orange/5 border border-brand-orange/20 space-y-2">
                      <span className="text-[11px] font-mono text-brand-orange font-bold uppercase tracking-widest">Public Ledger</span>
                      <h3 className="text-[15px] font-bold uppercase tracking-wide text-white">Immutable historical tracking</h3>
                      <p className="text-[13px] text-zinc-400 normal-case leading-relaxed">
                        Every signal is logged. No modifications or deletions — full trading audit trail.
                      </p>
                    </div>
                    <div className="text-center py-12 border border-dashed border-zinc-800 text-[12px] text-zinc-500">
                      📜 Global ledger loads from the signals database once the engine is seeded.
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
                  <p className="text-[13px] text-zinc-400">Update experience profile, risk tolerance, and alert pairing.</p>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-5">
                  {[
                    { label: 'Experience Profile', key: 'experience', val: settingsExperience, set: setSettingsExperience,
                      opts: [
                        { v: 'beginner',    l: '🌱 Just starting out' },
                        { v: 'comfortable', l: '📈 Getting comfortable' },
                        { v: 'experienced', l: '🎯 Experienced trader' },
                      ]},
                    { label: 'Risk Parameters', key: 'risk', val: settingsRisk, set: setSettingsRisk,
                      opts: [
                        { v: 'conservative', l: '🛡️ Conservative (SL -1.5% | TP +3.0%)' },
                        { v: 'balanced',     l: '⚖️ Balanced (SL -2.5% | TP +5.0%)' },
                        { v: 'aggressive',   l: '🚀 Aggressive (SL -4.0% | TP +10.0%)' },
                      ]},
                    { label: 'Primary Goal', key: 'goal', val: settingsGoal, set: setSettingsGoal,
                      opts: [
                        { v: 'learn',    l: '📚 Learn to trade smarter' },
                        { v: 'grow',     l: '💰 Grow my portfolio' },
                        { v: 'automate', l: '⚡ Automate my alerts' },
                      ]},
                  ].map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400">{field.label}</label>
                      <select value={field.val} onChange={e => field.set(e.target.value)}
                        className="w-full bg-[#111827] border border-zinc-800 px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-brand-orange font-mono rounded-none">
                        {field.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}

                  <div className="p-4 bg-zinc-950 border border-zinc-800 space-y-2.5 font-mono">
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Telegram Alert Integration</span>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="space-y-0.5">
                        <span className="block text-[13px] font-bold text-white uppercase tracking-wider">
                          {profile.telegram_chat_id ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                        {profile.telegram_chat_id && (
                          <span className="block text-[11px] text-zinc-400">Chat ID: {profile.telegram_chat_id}</span>
                        )}
                      </div>
                      {!profile.telegram_chat_id && (
                        <button type="button"
                          onClick={() => triggerUpgradeGate('Telegram Alerts Locked', 'Telegram alerts are available on Pro and Master tiers.')}
                          className="py-2 px-4 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer border-0">
                          Pair Bot 🔒
                        </button>
                      )}
                    </div>
                  </div>

                  <button type="submit"
                    className="py-2.5 px-7 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[13px] uppercase tracking-widest transition-colors cursor-pointer border-0">
                    Save Settings
                  </button>
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
