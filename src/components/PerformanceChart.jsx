'use client';

import React, { useState, useMemo, useRef } from 'react';

export default function PerformanceChart({ signals = [] }) {
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl' | 'winrate'
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const containerRef = useRef(null);
  const [hoverX, setHoverX] = useState(0);

  // Process data points
  const chartData = useMemo(() => {
    let cumulativePnl = 0;
    let totalWins = 0;

    return signals.map((s, idx) => {
      const pnl = parseFloat(s.pnl_pct || 0);
      cumulativePnl += pnl;
      if (s.is_win) {
        totalWins += 1;
      }
      const winRate = ((totalWins / (idx + 1)) * 100);

      return {
        date: new Date(s.bar_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pnl,
        cumulativePnl: Number(cumulativePnl.toFixed(2)),
        winRate: Number(winRate.toFixed(1)),
        isWin: s.is_win,
      };
    });
  }, [signals]);

  const points = chartData;

  // Layout parameters for SVG
  const width = 600;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const bounds = useMemo(() => {
    if (points.length === 0) return { min: 0, max: 0 };
    const values = points.map(p => activeTab === 'pnl' ? p.cumulativePnl : p.winRate);
    let min = Math.min(...values);
    let max = Math.max(...values);
    
    // Add buffer
    const range = max - min;
    if (range === 0) {
      min -= 5;
      max += 5;
    } else {
      min -= range * 0.1;
      max += range * 0.1;
    }
    return { min, max };
  }, [points, activeTab]);

  // Scalers
  const xScale = (index) => {
    if (points.length <= 1) return padding.left;
    return padding.left + (index / (points.length - 1)) * (width - padding.left - padding.right);
  };

  const yScale = (val) => {
    const range = bounds.max - bounds.min;
    const chartHeight = height - padding.top - padding.bottom;
    return height - padding.bottom - ((val - bounds.min) / range) * chartHeight;
  };

  // Generate SVG path string
  const pathString = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, idx) => {
        const val = activeTab === 'pnl' ? p.cumulativePnl : p.winRate;
        const x = xScale(idx);
        const y = yScale(val);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [points, activeTab, bounds]);

  // Generate Area/Fill path string
  const areaString = useMemo(() => {
    if (points.length === 0) return '';
    const startX = xScale(0);
    const endX = xScale(points.length - 1);
    const zeroY = yScale(bounds.min);
    return `${pathString} L ${endX} ${zeroY} L ${startX} ${zeroY} Z`;
  }, [points, pathString, bounds]);

  const handleMouseMove = (e) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverX(x);

    // Find nearest data point index
    const chartWidth = width - padding.left - padding.right;
    const relativeX = x - padding.left;
    const pct = Math.max(0, Math.min(1, relativeX / chartWidth));
    const index = Math.round(pct * (points.length - 1));
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  if (points.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-slate-800 bg-[#070b19]/60 p-6 text-center">
        <span className="text-xl">📈</span>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-wider mt-2">No completed trades in this window.</p>
      </div>
    );
  }

  // Draw grid lines
  const gridLines = [];
  const gridStep = 4;
  for (let i = 0; i <= gridStep; i++) {
    const val = bounds.min + (i / gridStep) * (bounds.max - bounds.min);
    gridLines.push(val);
  }

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 p-4 sm:p-5 rounded-none shadow-2xl relative select-none">
      
      {/* Header and Toggles */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
              activeTab === 'pnl'
                ? 'bg-brand-orange border-brand-orange text-white font-extrabold'
                : 'bg-transparent border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            PnL Performance
          </button>
          <button
            onClick={() => setActiveTab('winrate')}
            className={`px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
              activeTab === 'winrate'
                ? 'bg-brand-orange border-brand-orange text-white font-extrabold'
                : 'bg-transparent border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Win Rate %
          </button>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase block tracking-widest font-extrabold">
            {activeTab === 'pnl' ? 'Net Cumulative PnL' : 'Running Win Rate'}
          </span>
          <span className={`text-lg font-black font-mono ${
            activeTab === 'pnl'
              ? points[points.length - 1].cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              : 'text-cyan-400'
          }`}>
            {activeTab === 'pnl' ? `${points[points.length - 1].cumulativePnl >= 0 ? '+' : ''}${points[points.length - 1].cumulativePnl}%` : `${points[points.length - 1].winRate}%`}
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-visible cursor-crosshair w-full"
      >
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible"
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="winrateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((val, idx) => {
            const y = yScale(val);
            return (
              <g key={idx} className="opacity-20">
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={width - padding.right} 
                  y2={y} 
                  stroke="#475569" 
                  strokeWidth="0.8" 
                  strokeDasharray="4 4"
                />
                <text 
                  x={padding.left - 10} 
                  y={y + 4} 
                  fill="#94a3b8" 
                  fontSize="10" 
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {activeTab === 'pnl' ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : `${val.toFixed(0)}%`}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path 
            d={areaString} 
            fill={`url(#${activeTab === 'pnl' ? 'pnlGrad' : 'winrateGrad'})`} 
          />

          {/* Line Path */}
          <path 
            d={pathString} 
            fill="none" 
            stroke={activeTab === 'pnl' ? '#10b981' : '#06b6d4'} 
            strokeWidth="2.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover indicator line & dot */}
          {hoveredIndex !== null && (
            <g>
              <line 
                x1={xScale(hoveredIndex)} 
                y1={padding.top} 
                x2={xScale(hoveredIndex)} 
                y2={height - padding.bottom} 
                stroke="#475569" 
                strokeWidth="1" 
                strokeDasharray="2 2"
                className="opacity-60"
              />
              <circle 
                cx={xScale(hoveredIndex)} 
                cy={yScale(activeTab === 'pnl' ? points[hoveredIndex].cumulativePnl : points[hoveredIndex].winRate)} 
                r="5" 
                fill={activeTab === 'pnl' ? '#10b981' : '#06b6d4'} 
                stroke="#0f172a" 
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Labels */}
          {points.length > 0 && [0, Math.floor(points.length / 2), points.length - 1].map((idx) => {
            const p = points[idx];
            if (!p) return null;
            return (
              <text 
                key={idx}
                x={xScale(idx)} 
                y={height - padding.bottom + 16} 
                fill="#94a3b8" 
                fontSize="9" 
                fontFamily="monospace"
                textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
              >
                {p.date}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div 
            className="absolute z-20 bg-slate-950/95 border border-slate-800 p-2.5 shadow-2xl pointer-events-none font-mono text-[10px]"
            style={{ 
              left: `${Math.min(width - 150, Math.max(10, xScale(hoveredIndex) - 60))}px`,
              top: '40px' 
            }}
          >
            <span className="block text-slate-500 font-extrabold uppercase mb-1">
              Trade #{hoveredIndex + 1} ({points[hoveredIndex].date})
            </span>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Trade PnL:</span>
                <span className={`font-bold ${points[hoveredIndex].pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {points[hoveredIndex].pnl >= 0 ? '+' : ''}{points[hoveredIndex].pnl.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Cumulative:</span>
                <span className="text-white font-bold">{points[hoveredIndex].cumulativePnl >= 0 ? '+' : ''}{points[hoveredIndex].cumulativePnl}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Win Rate:</span>
                <span className="text-cyan-400 font-bold">{points[hoveredIndex].winRate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
