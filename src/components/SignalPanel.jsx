'use client';

import { useState } from 'react';

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function SignalPanel({ signals = [] }) {
  const [activeTab, setActiveTab] = useState('live');

  const liveSignals = signals.filter(s => !s.closed_at);
  const closedSignals = [...signals.filter(s => s.closed_at)].reverse();

  const tabSignals = activeTab === 'live' ? liveSignals : closedSignals;

  return (
    <div className="rounded-lg border border-slate-800/50 bg-[#0f172a]/50 backdrop-blur-sm overflow-hidden flex flex-col h-full font-sans">
      {/* Header with Inline Toggle */}
      <div className="px-5 py-4 border-b border-slate-800/50 flex items-center gap-4 shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Live & Closed Signals</h2>

        {/* Google Material Design Toggle */}
        <div className="flex items-center gap-2 bg-slate-800/40 rounded-full p-0.5 border border-slate-700/30">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'live'
                ? 'bg-cyan-500/30 text-cyan-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" opacity="0.3"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5z"/>
            </svg>
            Live ({liveSignals.length})
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'closed'
                ? 'bg-purple-500/30 text-purple-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" opacity="0.3"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5z"/>
            </svg>
            Closed ({closedSignals.length})
          </button>
        </div>
      </div>

      {/* Table - Scrollable */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {tabSignals.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
            No {activeTab} signals
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0a0e1a]/80 border-b border-slate-800/50">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Symbol</th>
                <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase tracking-wider">Entry</th>
                <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase tracking-wider">SL</th>
                <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase tracking-wider">TP</th>
                <th className="px-3 py-2 text-center font-bold text-slate-400 uppercase tracking-wider">Conf</th>
                <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase tracking-wider">PnL</th>
              </tr>
            </thead>
            <tbody>
              {tabSignals.map((sig, idx) => {
                const isBuy = sig.signal_type === 'buy';
                const isLive = !sig.closed_at;
                const rowBg = idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/10';

                return (
                  <tr
                    key={sig.id || sig.bar_time}
                    className={`border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors ${rowBg}`}
                  >
                    {/* Type */}
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        isBuy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isBuy ? '▲ BUY' : '▼ SELL'}
                      </span>
                    </td>

                    {/* Symbol */}
                    <td className="px-3 py-2 font-semibold text-white">
                      {sig.symbol.replace('USDT', '')}/USDT
                    </td>

                    {/* Entry */}
                    <td className="px-3 py-2 text-right font-mono text-white">
                      ${sig.entry_price?.toFixed(2)}
                    </td>

                    {/* SL */}
                    <td className="px-3 py-2 text-right font-mono text-slate-400">
                      ${sig.sl_price?.toFixed(2)}
                    </td>

                    {/* TP */}
                    <td className="px-3 py-2 text-right font-mono text-slate-400">
                      ${sig.tp_price?.toFixed(2)}
                    </td>

                    {/* Confidence */}
                    <td className="px-3 py-2 text-center font-bold text-white">
                      {sig.confidence || 75}%
                    </td>

                    {/* Time */}
                    <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">
                      {formatTime(sig.bar_time)}
                    </td>

                    {/* PnL */}
                    <td className="px-3 py-2 text-right font-bold font-mono">
                      <span className={`${
                        isLive ? 'text-cyan-400 animate-pulse' : sig.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isLive ? 'LIVE' : `${sig.pnl_pct >= 0 ? '+' : ''}${sig.pnl_pct?.toFixed(2)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
