'use client';

import { useState } from 'react';

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function SignalCard({ sig, isOpen, onToggle }) {
  const isBuy = sig.signal_type === 'buy';
  const isLive = !sig.closed_at;

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isOpen
          ? isBuy ? 'border-green-500/60 bg-green-500/5' : 'border-red-500/60 bg-red-500/5'
          : 'border-slate-700/40 bg-slate-900/40 hover:border-slate-600/60'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded ${
            isBuy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isBuy ? '▲ BUY' : '▼ SELL'}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {sig.symbol.replace('USDT', '')}/USDT
            </div>
            <div className="text-[11px] text-slate-500 font-mono truncate">
              {formatTime(sig.bar_time)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-sm font-bold font-mono ${
            isLive ? 'text-cyan-400 animate-pulse' : sig.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {isLive ? 'LIVE' : `${sig.pnl_pct >= 0 ? '+' : ''}${sig.pnl_pct.toFixed(2)}%`}
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-700/30 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between col-span-2">
              <span className="text-slate-400">Entry Price</span>
              <span className="text-white font-mono font-bold">${sig.entry_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stop Loss</span>
              <span className="text-white font-mono">${sig.sl_price?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Take Profit</span>
              <span className="text-white font-mono">${sig.tp_price?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between col-span-2">
              <span className="text-slate-400">Confidence</span>
              <span className="text-white font-bold">{sig.confidence || 75}%</span>
            </div>
          </div>

          {sig.closed_at ? (
            <div className="pt-2 border-t border-slate-700/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Exit Price</span>
                <span className="text-white font-mono font-bold">${sig.close_price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Exit Time</span>
                <span className="text-white font-mono text-xs">{formatTime(sig.closed_at)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Reason</span>
                <span className="text-white text-xs">
                  {sig.close_reason === 'swing_opposite' ? 'Opposite Swing' : 'Target Hit'}
                </span>
              </div>
              <div className={`flex justify-between items-center p-2 rounded-lg ${
                sig.is_win ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <span className="text-slate-400 text-sm">Final PnL</span>
                <span className={`font-bold font-mono ${sig.is_win ? 'text-green-400' : 'text-red-400'}`}>
                  {sig.pnl_pct >= 0 ? '+' : ''}{sig.pnl_pct.toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-700/30 flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Awaiting opposite signal — PnL updates live
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SignalPanel({ signals = [] }) {
  const [openId, setOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('live');

  const liveSignals = signals.filter(s => !s.closed_at);
  const closedSignals = [...signals.filter(s => s.closed_at)].reverse();

  const tabSignals = activeTab === 'live' ? liveSignals : closedSignals;

  return (
    <div className="rounded-xl border border-slate-800/50 bg-[#0f172a]/30 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/50 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Trading Signals</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('live'); setOpenId(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:bg-slate-800/60'
            }`}
          >
            Live ({liveSignals.length})
          </button>
          <button
            onClick={() => { setActiveTab('closed'); setOpenId(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'closed'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:bg-slate-800/60'
            }`}
          >
            Closed ({closedSignals.length})
          </button>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="p-4 max-h-[420px] overflow-y-auto custom-scrollbar">
        {tabSignals.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
            No {activeTab} signals for this symbol
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {tabSignals.map((sig) => (
              <SignalCard
                key={sig.id || sig.bar_time}
                sig={sig}
                isOpen={openId === (sig.id || sig.bar_time)}
                onToggle={() => setOpenId(openId === (sig.id || sig.bar_time) ? null : (sig.id || sig.bar_time))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
