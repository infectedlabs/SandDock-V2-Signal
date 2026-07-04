'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * HAChart - Heikin Ashi candlestick chart using TradingView Lightweight Charts v5.
 * Features live ticking price updates, dynamic cumulative PnL calculations,
 * and floating premium HTML label cards that auto-expand on hover.
 */
export default function HAChart({ 
  symbol: selectedSymbol = 'BTCUSDT', 
  interval: selectedInterval = '15m', 
  isFreePlan = true, 
  theme = 'dark',
  onSymbolChange,
  onIntervalChange,
  onPriceTick,
  plan = 'free',
  onUpgradeGate,
  hideSymbolSelector = false
}) {
  const { session } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  const [loading, setLoading] = useState(true);
  const [noData,  setNoData]  = useState(false);
  
  // Floating HTML signal cards state
  const [signalCards, setSignalCards] = useState([]);
  const sigsRef = useRef([]);
  const livePriceRef = useRef(null);

  const PRO_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 
    'TRXUSDT', 'DOGEUSDT', 'HBARUSDT', 'UNIUSDT', 'SUIUSDT', 
    'AVAXUSDT', 'AAVEUSDT', 'JUPUSDT', 'PUMPUSDT', 'ARBUSDT'
  ];

  const isSymbolLocked = (sym) => {
    if (plan === 'master') return false;
    if (plan === 'pro') {
      return !['BTCUSDT', 'ETHUSDT', 'BNBUSDT'].includes(sym);
    }
    return sym !== 'BTCUSDT'; // free plan
  };

  const isLight = theme === 'light';

  useEffect(() => {
    let isMounted = true;
    let chartLocal = null;
    let resizeObserver = null;
    let ws = null;

    if (!containerRef.current) return;

    let updateCardPositions = () => {};

    const initChart = async () => {
      // ── Dynamically import to avoid SSR issues ────────────────────────────
      const lwc = await import('lightweight-charts');
      if (!isMounted) return;

      const { createChart, CandlestickSeries, createSeriesMarkers } = lwc;

      // Destroy previous instance on re-render
      if (chartRef.current) {
        const prevChart = chartRef.current;
        chartRef.current  = null;
        seriesRef.current = null;
        try {
          prevChart.remove();
        } catch (e) {}
      }

      const chart = createChart(containerRef.current, {
        layout: {
          background: { color: isLight ? '#ffffff' : '#0a0f1d' },
          textColor:  isLight ? '#64748b' : '#94a3b8',
          fontSize:   12,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        },
        grid: {
          vertLines: { color: isLight ? '#f1f5f9' : '#1e293b' },
          horzLines: { color: isLight ? '#f1f5f9' : '#1e293b' },
        },
        crosshair: { mode: 1 },
        rightPriceScale: {
          borderColor: isLight ? '#e2e8f0' : '#334155',
        },
        timeScale: {
          borderColor:    isLight ? '#e2e8f0' : '#334155',
          timeVisible:    true,
          secondsVisible: false,
        },
        autoSize: true,
      });

      if (!isMounted) {
        chart.remove();
        return;
      }

      chartLocal = chart;
      chartRef.current = chart;

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor:         '#10b981',
        downColor:       '#ef4444',
        borderUpColor:   '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor:     '#10b981',
        wickDownColor:   '#ef4444',
      });
      seriesRef.current = candleSeries;

      setLoading(true);
      setNoData(false);

      try {
        // ── Load HA candles ─────────────────────────────────────────────────
        const candleRes = await fetch(
          `/api/chart/candles?symbol=${selectedSymbol}&interval=${selectedInterval}&limit=500`
        );
        if (!isMounted) return;
        const candles = await candleRes.json();

        if (!candles || candles.length === 0) {
          setNoData(true);
          setLoading(false);
          return;
        }

        const offsetSeconds = -new Date().getTimezoneOffset() * 60;

        const candleData = candles.map((c) => ({
          time:  Math.floor(new Date(c.open_time).getTime() / 1000) + offsetSeconds,
          open:  parseFloat(c.ha_open),
          high:  parseFloat(c.ha_high),
          low:   parseFloat(c.ha_low),
          close: parseFloat(c.ha_close),
        }));
        candleSeries.setData(candleData);

        let lastCandle = candleData[candleData.length - 1];

        // ── Load signal markers (arrows on canvas, cards in React) ──────────
        const sigRes  = await fetch(
          `/api/chart/signals?symbol=${selectedSymbol}&interval=${selectedInterval}`
        );
        if (!isMounted) return;
        const sigData = await sigRes.json();

        sigsRef.current = sigData || [];

        // Canvas markers are clean (no text to avoid congestion)
        if (sigData && sigData.length > 0) {
          const markers = sigData
            .filter(s => s.action === 'new')
            .map((s) => ({
              time:       Math.floor(new Date(s.bar_time).getTime() / 1000) + offsetSeconds,
              position:   s.signal_type === 'buy' ? 'belowBar' : 'aboveBar',
              color:      s.signal_type === 'buy' ? '#10b981'  : '#ef4444',
              shape:      s.signal_type === 'buy' ? 'arrowUp'  : 'arrowDown',
              text:       '', // Keep canvas clean
            }));

          createSeriesMarkers(candleSeries, markers);
        }

        // Helper to recalculate card coordinates on chart scroll/zoom
        updateCardPositions = () => {
          if (!isMounted || !chartRef.current || !seriesRef.current || !containerRef.current) return;
          const timeScale = chartRef.current.timeScale();
          const activeSeries = seriesRef.current;
          const currentPrice = livePriceRef.current;

          const updated = sigsRef.current.map((s, idx, arr) => {
            const timeMs = Math.floor(new Date(s.bar_time).getTime() / 1000) + offsetSeconds;
            const x = timeScale.timeToCoordinate(timeMs);
            const y = activeSeries.priceToCoordinate(s.entry_price);

            const isLatest = idx === arr.length - 1;
            const isVisible = x !== null && x >= 0 && x <= containerRef.current.clientWidth && y !== null && y >= 0 && y <= 460;

            let displayPnl = s.pnl;
            if (isLatest && currentPrice) {
              const rawPnl = ((currentPrice - s.entry_price) / s.entry_price) * 100;
              displayPnl = s.signal_type === 'buy' ? rawPnl : -rawPnl;
            }

            return {
              ...s,
              x,
              y,
              isVisible,
              isLatest,
              displayPnl,
            };
          }).filter(c => c.isVisible);

          setSignalCards(updated);
        };

        // Hook coordinate update listeners
        chart.timeScale().subscribeVisibleTimeRangeChange(updateCardPositions);
        
        // ── Live ticking WebSocket (real-time price & candle updates) ────────
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = process.env.NEXT_PUBLIC_WS_URL 
          ? process.env.NEXT_PUBLIC_WS_URL.replace(/^https?:\/\//, '')
          : 'localhost:8000';
        const wsUrl = `${wsProto}//${wsHost}/ws/chart?token=${session?.access_token || ''}`;
        
        console.log(`Connecting to Sanddock WebSocket: ${wsUrl}`);
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log("WebSocket connection established. Subscribing...");
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              action: "subscribe",
              symbol: selectedSymbol,
              interval: selectedInterval
            }));
          }
        };
        
        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            
            if (msg.type === "candle_update" && msg.symbol === selectedSymbol && msg.interval === selectedInterval) {
              const offsetSeconds = -new Date().getTimezoneOffset() * 60;
              const candleTime = msg.time + offsetSeconds;
              
              candleSeries.update({
                time: candleTime,
                open: msg.open,
                high: msg.high,
                low: msg.low,
                close: msg.close,
              });
              
              livePriceRef.current = msg.close;
              onPriceTick?.(msg.close);
              
              if (msg.is_closed) {
                lastCandle = {
                  time: candleTime,
                  open: msg.open,
                  high: msg.high,
                  low: msg.low,
                  close: msg.close
                };
              }
              updateCardPositions();
            }
            
            if (msg.type === "price_tick" && msg.symbol === selectedSymbol) {
              livePriceRef.current = msg.price;
              onPriceTick?.(msg.price);
              updateCardPositions();
            }
          } catch (err) {
            console.warn("Error processing WebSocket message:", err);
          }
        };
        
        ws.onerror = (err) => {
          console.error("WebSocket connection error:", err);
        };
        
        ws.onclose = () => {
          console.log("WebSocket disconnected.");
        };

        // Initial positioning delay
        setTimeout(() => {
          if (isMounted) updateCardPositions();
        }, 100);

      } catch (err) {
        console.error('[HAChart] Failed to load chart data:', err);
        setNoData(true);
      }

      setLoading(false);

      resizeObserver = new ResizeObserver(() => {
        if (isMounted && containerRef.current) {
          updateCardPositions();
        }
      });
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
    };

    initChart().catch(console.error);

    return () => {
      isMounted = false;
      if (ws) ws.close();
      if (resizeObserver) resizeObserver.disconnect();
      
      const toRemove = chartRef.current;
      chartRef.current  = null;
      seriesRef.current = null;
      
      if (toRemove) {
        try {
          toRemove.remove();
        } catch (e) {}
      }
      if (chartLocal && chartLocal !== toRemove) {
        try {
          chartLocal.remove();
        } catch (e) {}
      }
    };
  }, [selectedSymbol, selectedInterval]);

  const formatSymbolDisplay = (s) => s.replace('USDT', '/USDT');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Premium Chart header */}
      <div className={`p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-xl border shadow-2xl transition-all duration-300 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0f172a] border-slate-800/80 text-slate-100'
      }`}>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Custom Dropdown Symbol selector */}
          {!hideSymbolSelector && (
            <div className="relative z-50">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all duration-200 flex items-center gap-2 border cursor-pointer select-none ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800' 
                    : 'bg-slate-950/40 hover:bg-slate-900 border-slate-800/50 text-white'
                }`}
              >
                <span>{selectedSymbol.replace('USDT', '')} / USDT</span>
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  {/* Click outside backdrop */}
                  <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                  <div className={`absolute left-0 mt-2 w-48 rounded-xl border p-2 z-50 shadow-2xl backdrop-blur-xl animate-slide-down ${
                    isLight 
                      ? 'bg-white/95 border-slate-250 text-slate-800' 
                      : 'bg-[#0b1224]/95 border-slate-800/80 text-white'
                  }`}>
                    <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                      {PRO_SYMBOLS.map(sym => {
                        const isLocked = isSymbolLocked(sym);
                        const active = selectedSymbol === sym;
                        return (
                          <button
                            key={sym}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (isLocked) {
                                onUpgradeGate?.('Symbol Locked', `${sym.replace('USDT', '')} chart access is restricted under your plan.`);
                              } else {
                                onSymbolChange?.(sym);
                              }
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wide transition-all duration-200 flex items-center justify-between cursor-pointer border-0 ${
                              active
                                ? 'bg-[#3D5AFE] text-white shadow-md'
                                : isLocked
                                ? 'text-slate-600 hover:bg-white/5 bg-transparent'
                                : 'text-slate-400 hover:text-white hover:bg-white/5 bg-transparent'
                            }`}
                          >
                            <span>{sym.replace('USDT', '')} / USDT</span>
                            {isLocked && <span className="text-[10px]">🔒</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Timeframe Selector */}
          <div className="flex p-1 bg-slate-950/40 rounded-lg border border-slate-800/50 shadow-inner">
            {['15m', '1h', '4h'].map(tf => {
              const active = selectedInterval === tf;
              return (
                <button
                  key={tf}
                  onClick={() => onIntervalChange?.(tf)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold font-mono tracking-wider transition-all duration-300 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-sm shadow-emerald-500/5 transition-all">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-400">
            {formatSymbolDisplay(selectedSymbol)} LIVE FEED
          </span>
        </div>
      </div>

      {/* Premium Chart container with rounded corners */}
      <div className={`rounded-xl border relative shadow-2xl overflow-hidden transition-all duration-300 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800/60 shadow-slate-950/55'
      }`} style={{ minHeight: 460 }}>
        {loading && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 ${isLight ? 'bg-white' : 'bg-[#0a0f1d]'}`}>
            <div className="w-8 h-8 border-3 border-[#3D5AFE] border-t-transparent rounded-full animate-spin shadow-[#3D5AFE]/30" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest animate-pulse">Initializing Live Charts...</span>
          </div>
        )}

        {!loading && noData && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-8 text-center ${isLight ? 'bg-white' : 'bg-[#0a0f1d]'}`}>
            <div className="relative w-14 h-14 flex items-center justify-center">
              <span className="absolute w-14 h-14 rounded-full border border-[#3D5AFE]/20 animate-ping" />
              <span className="text-3xl">📡</span>
            </div>
            <div className="space-y-2">
              <h3 className={`font-bold text-sm uppercase tracking-widest ${isLight ? 'text-slate-800' : 'text-white'}`}>Warming Engine</h3>
              <p className="text-slate-400 text-sm normal-case max-w-xs leading-relaxed">
                Rebuilding connection directly to live kline pipelines.
              </p>
            </div>
          </div>
        )}

        {/* Floating HTML Label Cards Overlay */}
        {!loading && !noData && signalCards.map((card) => {
          const isBuy = card.signal_type === 'buy';
          const pnlVal = card.displayPnl;
          const formattedPnl = pnlVal !== null 
            ? `${pnlVal >= 0 ? '+' : ''}${pnlVal.toFixed(2)}%${card.isLatest ? ' Live' : ''}` 
            : 'LIVE';

          return (
            <div
              key={card.id || card.bar_time}
              onClick={() => {
                const signalId = card.isLatest
                  ? `live-${selectedSymbol}-${card.bar_time}-new`
                  : `log-${selectedSymbol}-${card.bar_time}`;
                window.open(`/terminal/signals/${signalId}`, '_blank');
              }}
              className={`absolute z-20 group rounded-xl p-2.5 transition-all duration-300 ease-out glass border hover:scale-[1.05] hover:z-40 text-left cursor-pointer flex flex-col gap-1 w-28 hover:w-44 overflow-hidden select-none shadow-xl`}
              style={{
                left: `${card.x - 56}px`,
                top: isBuy ? `${card.y + 18}px` : `${card.y - 65}px`,
                borderColor: isBuy ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
              }}
            >
              {/* Card Title Header */}
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                  isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {isBuy ? 'BUY' : 'SELL'}
                </span>
                <span className={`text-[10px] font-mono font-bold ${
                  pnlVal === null ? 'text-cyan-400 animate-pulse' : pnlVal >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {formattedPnl}
                </span>
              </div>
              
              {/* Expandable Body Content on Hover */}
              <div className="max-h-0 opacity-0 group-hover:max-h-24 group-hover:opacity-100 transition-all duration-300 ease-out border-t border-slate-800/40 pt-1.5 mt-1 space-y-1 font-mono text-[9px] text-slate-400">
                <div>Entry: <span className="text-white font-bold">${card.entry_price.toLocaleString()}</span></div>
                <div>Time: <span className="text-slate-300">{new Date(card.bar_time).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false})}</span></div>
              </div>
            </div>
          );
        })}

        <div ref={containerRef} className="w-full h-[460px]" style={{ visibility: loading || noData ? 'hidden' : 'visible' }} />
      </div>

      {/* Modern Legend */}
      {!noData && !loading && (
        <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl border border-slate-800/50 bg-[#0f172a]/30 backdrop-blur-sm text-xs font-mono tracking-wider text-slate-400 animate-slide-up shadow-lg">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#10b981] shadow shadow-[#10b981]/50" /> Bullish HA
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] shadow shadow-[#ef4444]/50" /> Bearish HA
          </span>
          <span className="flex items-center gap-2 text-[#10b981] font-bold">
            ▲ BUY (Dynamic PnL)
          </span>
          <span className="flex items-center gap-2 text-[#ef4444] font-bold">
            ▼ SELL (Dynamic PnL)
          </span>
        </div>
      )}
    </div>
  );
}
