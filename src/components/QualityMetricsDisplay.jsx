'use client';

import React from 'react';

export default function QualityMetricsDisplay({ metrics, symbol = 'BTCUSDT', interval = '15m' }) {
  if (!metrics) return null;

  const ws = metrics.weekly_summary;
  const dailyData = metrics.daily_metrics || [];

  // Helper to check if target is met
  const checkTarget = (actual, target) => {
    const num = parseFloat(actual);
    const thresh = parseFloat(target);
    return num >= thresh;
  };

  const meetsWinRate = checkTarget(ws.win_rate, '70');
  const meetsPnL = checkTarget(ws.total_pnl, '15');

  return (
    <div className="space-y-4">
      {/* Quality Targets Banner */}
      <div className="bg-gradient-to-r from-[#3D5AFE]/20 to-[#00e676]/20 border border-[#3D5AFE]/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Quality Targets</h3>
          <span className="text-xs font-satoshi bg-[#3D5AFE]/20 px-2 py-1 rounded border border-[#3D5AFE]/40 text-[#3D5AFE]">
            V2 Optimized
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-satoshi">
          <div className="bg-slate-950/40 px-2 py-2 rounded border border-slate-800">
            <div className="text-white">Signals/Day</div>
            <div className="text-white font-bold">2-4</div>
          </div>
          <div className="bg-slate-950/40 px-2 py-2 rounded border border-slate-800">
            <div className="text-white">Daily PnL</div>
            <div className="text-white font-bold">+3%</div>
          </div>
          <div className="bg-slate-950/40 px-2 py-2 rounded border border-slate-800">
            <div className="text-white">Weekly PnL</div>
            <div className="text-white font-bold">+15%</div>
          </div>
          <div className="bg-slate-950/40 px-2 py-2 rounded border border-slate-800">
            <div className="text-white">Win Rate</div>
            <div className="text-white font-bold">&gt;70%</div>
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Last 7 Days Summary</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <div className="text-[11px] text-white font-satoshi uppercase mb-1">Total Trades</div>
            <div className="text-lg font-bold text-white">{ws.total_trades}</div>
          </div>

          <div>
            <div className="text-[11px] text-white font-satoshi uppercase mb-1">Wins / Losses</div>
            <div className="text-lg font-bold">
              <span className="text-[#10b981]">{ws.wins}</span>
              <span className="text-white"> / </span>
              <span className="text-[#ef4444]">{ws.losses}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-white font-satoshi uppercase mb-1">Win Rate</div>
            <div className={`text-lg font-bold ${meetsWinRate ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {ws.win_rate}
              {meetsWinRate ? ' ✓' : ' ✗'}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-white font-satoshi uppercase mb-1">Weekly PnL</div>
            <div className={`text-lg font-bold ${meetsPnL ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {ws.total_pnl}
              {meetsPnL ? ' ✓' : ' ✗'}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="text-[10px] text-white font-satoshi">
            Avg Daily PnL: <span className="text-white font-bold">{ws.avg_daily_pnl}</span>
            {' '} | Target: <span className="text-[#3D5AFE] font-bold">+3.00%</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3">
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
            ws.meets_targets === '✓ YES'
              ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
              : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'
          }`}>
            <span>{ws.meets_targets}</span>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      {dailyData.length > 0 && (
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Daily Performance</h4>

          <div className="space-y-2">
            {dailyData.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] font-satoshi p-2 bg-slate-950 rounded border border-slate-900">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-white">{day.date}</span>
                  <span className="text-white">
                    {day.trades} trades
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white">
                    {day.wins}W {day.losses}L
                  </span>
                  <span className={`${
                    parseFloat(day.win_rate) >= 70 ? 'text-[#10b981]' : 'text-white'
                  } min-w-[50px] text-right`}>
                    {day.win_rate}
                  </span>
                  <span className={`${
                    parseFloat(day.pnl) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                  } min-w-[60px] text-right font-bold`}>
                    {day.pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
