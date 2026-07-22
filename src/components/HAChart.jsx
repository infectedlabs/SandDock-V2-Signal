'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * HAChart - Heikin Ashi candlestick chart using TradingView Lightweight Charts v5.
 * Features live ticking price updates, dynamic cumulative PnL calculations,
 * and floating premium HTML label cards that auto-expand on hover.
 */
export default function HAChart({
  symbol: selectedSymbol = 'BTCUSDT',
  interval: selectedInterval = '30m', 
  isFreePlan = true, 
  theme = 'dark',
  onSymbolChange,
  onIntervalChange,
  onPriceTick,
  plan = 'free',
  onUpgradeGate,
  hideSymbolSelector = false,
  activeSignal = null,
  hideSignalCards = false
}) {
  const { session } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  const [loading, setLoading] = useState(true);
  const [noData,  setNoData]  = useState(false);
  const [hideOldSignals, setHideOldSignals] = useState(false);
  const hideOldSignalsRef = useRef(false);

  // Floating HTML signal cards state
  const [signalCards, setSignalCards] = useState([]);
  const sigsRef         = useRef([]);
  const candleDataRef   = useRef([]);
  const [hoveredSignalId, setHoveredSignalId] = useState(null);
  const hoveredSignalIdRef = useRef(null);


  const handleMouseMove = (e) => {
    if (!containerRef.current || signalCards.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let closestSig = null;
    let minDistance = 30; // 30px hover threshold

    signalCards.forEach(sig => {
      if (sig.x === null || sig.y === null) return;
      const dx = mouseX - sig.x;
      const dy = mouseY - sig.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        closestSig = sig;
      }
    });

    const newHoveredId = closestSig ? closestSig.id : null;
    if (newHoveredId !== hoveredSignalIdRef.current) {
      hoveredSignalIdRef.current = newHoveredId;
      setHoveredSignalId(newHoveredId);
    }
  };

  const handleMouseLeave = () => {
    hoveredSignalIdRef.current = null;
    setHoveredSignalId(null);
  };

  const offsetSecondsRef = useRef(0);

  const updateFloatingCards = () => {
    if (!chartRef.current || !seriesRef.current || !containerRef.current || sigsRef.current.length === 0) return;
    const timeScale = chartRef.current.timeScale();
    const activeSeries = seriesRef.current;
    const currentPrice = livePriceRef.current;
    const candles = candleDataRef.current || [];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const updated = sigsRef.current.map((s, idx, arr) => {
      const sigTime = Math.floor(new Date(s.bar_time).getTime() / 1000) + offsetSecondsRef.current;

      // Find nearest preceding candle (all times now in local timezone)
      let matchingCandle = null;
      for (let i = candles.length - 1; i >= 0; i--) {
        if (candles[i].time <= sigTime) {
          matchingCandle = candles[i];
          break;
        }
      }
      const finalTime = matchingCandle ? matchingCandle.time : (candles[0]?.time || sigTime);

      const x = timeScale.timeToCoordinate(finalTime);
      const y = activeSeries.priceToCoordinate(s.entry_price);

      const isLatest = idx === arr.length - 1;
      const isVisible = x !== null && x >= 0 && x <= containerRef.current.clientWidth && y !== null && y >= 0 && y <= 460;

      // Calculate displayPnl
      const hasOpposite = s.close_reason === 'swing_opposite';
      const isClosed = s.pnl !== null && hasOpposite;

      let displayPnl;
      if (!isClosed) {
        if (isLatest && currentPrice) {
          const rawPnl = ((currentPrice - s.entry_price) / s.entry_price) * 100;
          displayPnl = s.signal_type === 'buy' ? rawPnl : -rawPnl;
        } else {
          displayPnl = null;
        }
      } else {
        displayPnl = s.pnl;
      }

      const barDate = new Date(s.bar_time);
      const isToday = (
        barDate.getUTCFullYear() === today.getUTCFullYear() &&
        barDate.getUTCMonth() === today.getUTCMonth() &&
        barDate.getUTCDate() === today.getUTCDate()
      );

      const shouldShow = !hideOldSignalsRef.current || isToday;

      return {
        ...s,
        x,
        y,
        isVisible: isVisible && shouldShow,
        isLatest,
        isToday,
        displayPnl,
      };
    }).filter(c => c.isVisible);

    setSignalCards(updated);
  };

  const signalStats = useMemo(() => {
    if (!activeSignal) return null;
    const entryVal = parseFloat(activeSignal.entry_price);
    const slVal = parseFloat(activeSignal.sl_price);
    const tpVal = parseFloat(activeSignal.tp_price);
    const isBuySignal = activeSignal.signal_type === 'buy';
    const rawTpPct = ((tpVal - entryVal) / entryVal) * 100;
    const rawSlPct = ((slVal - entryVal) / entryVal) * 100;
    const tpPctVal = isBuySignal ? rawTpPct : -rawTpPct;
    const slPctVal = isBuySignal ? rawSlPct : -rawSlPct;
    return {
      tpPct: tpPctVal.toFixed(1),
      slPct: slPctVal.toFixed(1),
      tpPctVal,
      slPctVal,
      entryVal,
      slVal,
      tpVal,
      isBuySignal,
    };
  }, [activeSignal]);
  const livePriceRef    = useRef(null);
  // Holds the Lightweight Charts price-line that displays REAL last-trade
  // price on the right axis. HA close ≠ real price; this line overrides it.
  const realPriceLineRef = useRef(null);
  const pnlTrackerSeriesRef = useRef(null);
  const signalBarTimeRef    = useRef(null);
  const lastCandleTimeRef   = useRef(null);
  const pnlTrackerLineRef   = useRef(null);

  const PRO_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT'
  ];

  const isSymbolLocked = (sym) => {
    if (['master', 'grandmaster'].includes(plan)) return false; // MASTER/GRANDMASTER: BTC, ETH, BNB
    if (plan === 'pro') {
      return !['BTCUSDT', 'ETHUSDT'].includes(sym); // PRO: BTC, ETH
    }
    return sym !== 'BTCUSDT'; // FREE: BTC only
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

      const { createChart, CandlestickSeries } = lwc;

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
        upColor:          '#10b981',
        downColor:        '#ef4444',
        borderUpColor:    '#10b981',
        borderDownColor:  '#ef4444',
        wickUpColor:      '#10b981',
        wickDownColor:    '#ef4444',
        // Hide the HA-close label from the right axis. We replace it with a
        // real-price line below so the axis shows actual last-trade price
        // (matching TradingView BTCUSDT.P) instead of the HA-smoothed close.
        lastValueVisible: false,
      });
      seriesRef.current = candleSeries;

      // ── Real-price axis label (matches TradingView price scale) ────────────
      // Lightweight Charts by default shows the last series value (HA close)
      // on the right axis. HA close = (O+H+L+C)/4 and is always offset from
      // the real last-trade price by ~$10-40 for BTC. We create a price line
      // instead that gets updated from live price_tick events.
      const realPriceLine = candleSeries.createPriceLine({
        price:               0,
        color:               '#ef4444',
        lineWidth:           1,
        lineStyle:           0,   // Solid
        axisLabelVisible:    true,
        title:               '',
      });
      realPriceLineRef.current = realPriceLine;

      // ── Start WebSocket IMMEDIATELY - before any await - so the TCP
      // handshake runs in parallel with candle/signal data fetching.
      // By the time the chart renders, the socket is already live.
      // ───────────────────────────────────────────────────────────────
      let wsRetryCount = 0;
      const MAX_WS_RETRIES = 5;
      const connectWebSocket = () => {
        if (!session?.access_token) {
          console.warn('[HAChart] WebSocket: No access token available, skipping connection');
          return;
        }

        // Build WebSocket URL from environment only (don't default to localhost:8000)
        let wsUrl;
        const baseUrl = process.env.NEXT_PUBLIC_WS_URL;

        if (!baseUrl) {
          console.info('[HAChart] WebSocket disabled - NEXT_PUBLIC_WS_URL not set, using polling only');
          return;
        }

        // Convert HTTP(S) URLs to WS(S) for WebSocket
        if (baseUrl.startsWith('https://')) {
          wsUrl = `wss://${baseUrl.replace(/^https:\/\//, '')}/ws/chart?token=${session.access_token}`;
        } else if (baseUrl.startsWith('http://')) {
          wsUrl = `ws://${baseUrl.replace(/^http:\/\//, '')}/ws/chart?token=${session.access_token}`;
        } else {
          // Fallback for bare hostnames
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${proto}//${baseUrl}/ws/chart?token=${session.access_token}`;
        }

        try {
          ws = new WebSocket(wsUrl);
          console.log('[HAChart] WebSocket connecting...');

          ws.onopen = () => {
            console.log('[HAChart] WebSocket connected');
            wsRetryCount = 0;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: 'subscribe', symbol: selectedSymbol, interval: selectedInterval }));
            }
          };

          ws.onerror = () => {
            console.warn('[HAChart] WebSocket connection failed, using polling mode');
          };

          ws.onclose = () => {
            if (wsRetryCount < MAX_WS_RETRIES && isMounted) {
              wsRetryCount++;
              const delayMs = 5000 * wsRetryCount;
              setTimeout(connectWebSocket, delayMs);
            }
          };
        } catch (err) {
          console.warn('[HAChart] WebSocket unavailable:', err.message);
        }
      };

      connectWebSocket();

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

        // Compute a stable timezone offset for this chart session.
        // Server sends UTC Unix seconds; we shift to local time so the
        // TradingView time scale labels match the user's clock.
        // IMPORTANT: computed ONCE here and reused for both historical
        const offsetSeconds = -new Date().getTimezoneOffset() * 60;
        offsetSecondsRef.current = offsetSeconds;
        const candleData = candles.map((c) => ({
          time:  Math.floor(new Date(c.open_time).getTime() / 1000) + offsetSeconds,
          // Heikin Ashi values - same as TradingView when using HA chart mode
          open:  parseFloat(c.ha_open),
          high:  parseFloat(c.ha_high),
          low:   parseFloat(c.ha_low),
          close: parseFloat(c.ha_close),
        }));
        candleSeries.setData(candleData);
        candleDataRef.current = candleData;

        // Set default price scale margins to center candles with space for volume/timestamp
        chart.priceScale('right').applyOptions({
          scaleMargins: {
            top: 0.15,
            bottom: 0.25,
          },
        });

        let lastCandle = candleData[candleData.length - 1];

        // Seed the real-price axis label with the last candle's actual close
        // (raw Binance last-trade price, not HA-smoothed) so it shows a correct
        // price immediately on load before the first price_tick arrives.
        const lastRawClose = parseFloat(candles[candles.length - 1]?.close ?? 0);
        if (realPriceLineRef.current && lastRawClose > 0) {
          realPriceLineRef.current.applyOptions({ price: lastRawClose });
        }

        // Compute interval duration in seconds so we can sanity-check
        // incoming WebSocket candles against the last historical candle.
        const intervalSeconds = (() => {
          const n = parseInt(selectedInterval);
          if (selectedInterval.endsWith('m')) return n * 60;
          if (selectedInterval.endsWith('h')) return n * 3600;
          if (selectedInterval.endsWith('d')) return n * 86400;
          return 900; // default 15 min
        })();

        // ── S/R Level Detector (Layer 5) ──
        const detectSRLevels = (haData, lookback = 10) => {
          const highs = haData.map(c => c.high);
          const lows = haData.map(c => c.low);
          const levels = [];

          for (let i = lookback; i < haData.length - lookback; i++) {
            const sliceHighs = highs.slice(i - lookback, i + lookback + 1);
            const sliceLows = lows.slice(i - lookback, i + lookback + 1);
            
            if (highs[i] === Math.max(...sliceHighs)) {
              levels.push({ price: highs[i], type: 'resistance' });
            }
            if (lows[i] === Math.min(...sliceLows)) {
              levels.push({ price: lows[i], type: 'support' });
            }
          }

          const significant = [];
          levels.forEach(level => {
            const cluster = levels.filter(l => Math.abs(l.price - level.price) / level.price < 0.003);
            if (cluster.length >= 2) {
              const avgPrice = cluster.reduce((sum, c) => sum + c.price, 0) / cluster.length;
              if (!significant.some(s => Math.abs(s.price - avgPrice) / avgPrice < 0.003)) {
                significant.push({ price: Number(avgPrice.toFixed(2)), type: level.type });
              }
            }
          });

          return significant;
        };

        const srLevels = detectSRLevels(candleData, 10);
        srLevels.forEach(level => {
          candleSeries.createPriceLine({
            price: level.price,
            color: level.type === 'resistance' ? 'rgba(255, 23, 68, 0.35)' : 'rgba(0, 230, 118, 0.35)',
            lineWidth: 1,
            lineStyle: lwc.LineStyle.Dotted,
            axisLabelVisible: false,
            title: level.type === 'resistance' ? 'R' : 'S',
          });
        });

        // ── Active Signal-Specific Layers (Layer 1, 3, 6, 7) ──
        let signalBarTime = null;
        if (activeSignal && signalStats) {
          const { entryVal, slVal, tpVal, tpPct, slPct, tpPctVal, slPctVal } = signalStats;

          signalBarTime = Math.floor(new Date(activeSignal.created_at || activeSignal.bar_time).getTime() / 1000) + offsetSeconds;
          signalBarTimeRef.current = signalBarTime;
          lastCandleTimeRef.current = lastCandle.time;

          // Force price scale Y-axis range to fit all three levels (SL, Entry, TP) with padding
          const rangeBuffer = Math.abs(tpVal - slVal) * 0.15;
          chart.priceScale('right').applyOptions({
            scaleMargins: {
              top: 0.15,
              bottom: 0.25,
            },
            priceRange: {
              minValue: Math.min(slVal, entryVal, tpVal) - rangeBuffer,
              maxValue: Math.max(slVal, entryVal, tpVal) + rangeBuffer,
            },
          });

          // Center time scale around the signal bar index (45 bars of history, 15 bars forward)
          const signalBarIndex = candleData.findIndex(c => c.time === signalBarTime);
          if (signalBarIndex !== -1) {
            setTimeout(() => {
              chart.timeScale().setVisibleLogicalRange({
                from: Math.max(0, signalBarIndex - 45),
                to: Math.min(candleData.length - 1, signalBarIndex + 15),
              });
            }, 50);
          }

          // Layer 1: Three price lines
          candleSeries.createPriceLine({
            price: entryVal,
            color: 'rgba(255,255,255,0.6)',
            lineWidth: 1,
            lineStyle: lwc.LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Entry $${entryVal.toLocaleString(undefined, {minimumFractionDigits:2})}`,
          });

          candleSeries.createPriceLine({
            price: slVal,
            color: '#ff1744',
            lineWidth: 1.5,
            lineStyle: lwc.LineStyle.Solid,
            axisLabelVisible: true,
            title: `SL $${slVal.toLocaleString(undefined, {minimumFractionDigits:2})} (${slPctVal >= 0 ? '+' : ''}${slPct}%)`,
          });

          candleSeries.createPriceLine({
            price: tpVal,
            color: '#00e676',
            lineWidth: 1.5,
            lineStyle: lwc.LineStyle.Solid,
            axisLabelVisible: true,
            title: `TP $${tpVal.toLocaleString(undefined, {minimumFractionDigits:2})} (${tpPctVal >= 0 ? '+' : ''}${tpPct}%)`,
          });

          // Layer 1: Baseline fills for green profit and red risk zones (bound to right scale)
          const profitZone = chart.addSeries(lwc.BaselineSeries, {
            baseValue: { type: 'price', price: entryVal },
            topLineColor: 'transparent',
            bottomLineColor: 'transparent',
            topFillColor1: 'rgba(0, 230, 118, 0.06)',
            topFillColor2: 'rgba(0, 230, 118, 0.02)',
            bottomFillColor1: 'transparent',
            bottomFillColor2: 'transparent',
            lastValueVisible: false,
            priceLineVisible: false,
            priceScaleId: 'right',
          });

          const riskZone = chart.addSeries(lwc.BaselineSeries, {
            baseValue: { type: 'price', price: slVal }, // set baseline to SL
            topLineColor: 'transparent',
            bottomLineColor: 'transparent',
            topFillColor1: 'rgba(255, 23, 68, 0.06)', // use top fill to draw strictly between SL and Entry!
            topFillColor2: 'rgba(255, 23, 68, 0.02)',
            bottomFillColor1: 'transparent',
            bottomFillColor2: 'transparent',
            lastValueVisible: false,
            priceLineVisible: false,
            priceScaleId: 'right',
          });

          profitZone.setData(candleData.map(c => ({ time: c.time, value: tpVal })));
          riskZone.setData(candleData.map(c => ({ time: c.time, value: entryVal }))); // set data to Entry price

          // Layer 7: Live P&L tracking line
          const pnlTracker = chart.addSeries(lwc.LineSeries, {
            color: lastRawClose > entryVal ? '#00e676' : '#ff1744',
            lineWidth: 1.5,
            lineStyle: lwc.LineStyle.Dashed,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
          });
          pnlTracker.setData([
            { time: signalBarTime, value: entryVal },
            { time: lastCandle.time, value: lastRawClose }
          ]);
          pnlTrackerSeriesRef.current = pnlTracker;

          // Layer 7: Live P&L floating title label price line
          const directionalChange = ((lastRawClose - entryVal) / entryVal) * 100;
          const livePnlPct = activeSignal.signal_type === 'buy' ? directionalChange : -directionalChange;
          const pnlLine = pnlTracker.createPriceLine({
            price: lastRawClose,
            color: lastRawClose > entryVal ? '#00e676' : '#ff1744',
            lineWidth: 1,
            lineStyle: lwc.LineStyle.Dotted,
            axisLabelVisible: true,
            title: `Live: ${livePnlPct >= 0 ? '+' : ''}${livePnlPct.toFixed(2)}%`,
          });
          pnlTrackerLineRef.current = pnlLine;
        }

        // Layer 6: Volume bars with signal bar highlighted and separate pane
        const volumeSeries = chart.addSeries(lwc.HistogramSeries, {
          color: 'rgba(255, 255, 255, 0.25)',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume-scale',
        });
        chart.priceScale('volume-scale').applyOptions({
          visible: true, // show volume scale label
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });

        const volumeData = candles.map((c) => {
          const t = Math.floor(new Date(c.open_time).getTime() / 1000) + offsetSeconds;
          const isSignal = signalBarTime && t === signalBarTime;
          let barColor = 'rgba(255, 255, 255, 0.25)';
          if (isSignal) {
            barColor = 'rgba(61, 90, 254, 0.9)';
          } else {
            barColor = parseFloat(c.ha_close) >= parseFloat(c.ha_open)
              ? 'rgba(0, 230, 118, 0.35)'
              : 'rgba(255, 23, 68, 0.35)';
          }
          return {
            time: t,
            value: parseFloat(c.volume),
            color: barColor,
          };
        });
        volumeSeries.setData(volumeData);

        // ── Load signal markers (arrows on canvas, cards in React) ──────────
        // Only fetch signals within the time range of loaded candles
        const sigRes  = await fetch(
          `/api/chart/signals?symbol=${selectedSymbol}&interval=${selectedInterval}&plan=${plan}`
        );
        if (!isMounted) return;
        const allSigData = await sigRes.json();

        // Filter to only signals within candle date range
        const firstCandleTime = new Date(candles[0].open_time).getTime();
        const lastCandleTime = new Date(candles[candles.length - 1].open_time).getTime();

        const filteredSigs = allSigData.filter(sig => {
          const sigTime = new Date(sig.bar_time).getTime();
          return sigTime >= firstCandleTime && sigTime <= lastCandleTime;
        });

        sigsRef.current = filteredSigs;
        console.log('[HAChart] Loaded signals:', filteredSigs.length);

        // Find the most recent LIVE signal (not closed) and draw its Entry/TP/SL
        // lines. Wrapped in try/catch + isFinite guards: a bad/missing value here
        // must never throw, since createPriceLine() with a NaN price throws inside
        // Lightweight Charts and previously aborted the rest of this function
        // (arrows, floating cards, subscriptions) before they were ever set up.
        try {
          const liveSignal = filteredSigs.find(sig => sig.closed_at === null);
          if (liveSignal) {
            const entryVal = parseFloat(liveSignal.entry_price);
            const slVal = parseFloat(liveSignal.sl_price);
            const tpVal = parseFloat(liveSignal.tp_price);
            const isBuySignal = liveSignal.signal_type === 'buy';

            const signalBarTime = Math.floor(new Date(liveSignal.bar_time).getTime() / 1000) + offsetSeconds;
            signalBarTimeRef.current = signalBarTime;
            lastCandleTimeRef.current = candleData[candleData.length - 1].time;

            const candleSeries = seriesRef.current;
            if (candleSeries) {
              // Entry line (Blue)
              if (Number.isFinite(entryVal)) {
                candleSeries.createPriceLine({
                  price: entryVal,
                  color: '#3b82f6',
                  lineWidth: 2,
                  lineStyle: lwc.LineStyle.Solid,
                  axisLabelVisible: true,
                  title: 'Entry',
                });
              }
              // TP line (Green)
              if (Number.isFinite(tpVal)) {
                candleSeries.createPriceLine({
                  price: tpVal,
                  color: '#10b981',
                  lineWidth: 2,
                  lineStyle: lwc.LineStyle.Dashed,
                  axisLabelVisible: true,
                  title: 'Take Profit',
                });
              }
              // SL line (Red)
              if (Number.isFinite(slVal)) {
                candleSeries.createPriceLine({
                  price: slVal,
                  color: '#ef4444',
                  lineWidth: 2,
                  lineStyle: lwc.LineStyle.Dashed,
                  axisLabelVisible: true,
                  title: 'Stop Loss',
                });
              }
            }
          }
        } catch (liveSigErr) {
          console.error('[HAChart] Failed to draw live signal lines:', liveSigErr.message);
        }

        // Immediately update card positions (for floating labels)
        if (filteredSigs.length > 0) {
          updateCardPositions();
        }

        // Show today's data by default (last 50-100 candles)
        setTimeout(() => {
          if (isMounted && chartRef.current && candleData && candleData.length > 0) {
            try {
              const lastIdx = candleData.length - 1;
              const firstIdxToShow = Math.max(0, lastIdx - 100);
              chartRef.current.timeScale().setVisibleLogicalRange({
                from: firstIdxToShow,
                to: lastIdx + 5
              });
            } catch (e) {
              console.error('[HAChart] Error setting visible range:', e.message);
            }
          }
        }, 150);

        // ── Single Unified Canvas Overlay Drawer ──
        const drawCanvasOverlay = () => {
          const canvas = document.getElementById('chart-overlay');
          if (!canvas || !chartLocal) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const timeScale = chartLocal.timeScale();
          const candleSeries = seriesRef.current;
          if (!candleSeries) return;

          // Set canvas dimensions
          const rect = canvas.parentElement?.getBoundingClientRect();
          const width = rect?.width || canvas.clientWidth || 1280;
          const height = rect?.height || canvas.clientHeight || 460;
          canvas.width = width;
          canvas.height = height;

          ctx.clearRect(0, 0, width, height);

          // 1. Draw Lookback Scan Window (if activeSignal is present)
          if (activeSignal) {
            const signalBarTimeVal = Math.floor(new Date(activeSignal.created_at || activeSignal.bar_time).getTime() / 1000) + offsetSeconds;
            const windowStartTime = signalBarTimeVal - (10 * intervalSeconds);
            const windowEndTime = signalBarTimeVal;

            const x1 = timeScale.timeToCoordinate(windowStartTime);
            const x2 = timeScale.timeToCoordinate(windowEndTime);

            if (x1 !== null && x2 !== null) {
              const chartHeight = height * 0.8; // upper 80%

              ctx.fillStyle = 'rgba(61, 90, 254, 0.025)';
              ctx.fillRect(x1, 0, x2 - x1, chartHeight);

              ctx.strokeStyle = 'rgba(61, 90, 254, 0.2)';
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 3]);
              ctx.strokeRect(x1, 0, x2 - x1, chartHeight);

              ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
              ctx.font = 'bold 9px monospace';
              ctx.setLineDash([]);
              ctx.fillText('AI scan window · 10 bars', x1 + 6, 14);
            }
          }

          // Filter signals based on hideOldSignals toggle
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          const sigsToRender = sigsRef.current.filter(sig => {
            if (!hideOldSignalsRef.current) return true;
            const barDate = new Date(sig.bar_time);
            return (
              barDate.getUTCFullYear() === today.getUTCFullYear() &&
              barDate.getUTCMonth() === today.getUTCMonth() &&
              barDate.getUTCDate() === today.getUTCDate()
            );
          });

          // 2. Draw circles at bottom AND arrows at entry prices
          sigsToRender.forEach(sig => {
            try {
              const sigTime = Math.floor(new Date(sig.bar_time).getTime() / 1000) + offsetSeconds;

              // Find matching candle in candleData (all times in local timezone)
              let matchingCandle = null;
              for (let i = candleData.length - 1; i >= 0; i--) {
                if (candleData[i].time <= sigTime) {
                  matchingCandle = candleData[i];
                  break;
                }
              }

              const finalTime = matchingCandle ? matchingCandle.time : (candleData[0]?.time || sigTime);

              const x = timeScale.timeToCoordinate(finalTime);
              const y = candleSeries.priceToCoordinate(sig.entry_price);

              if (x === null || x < 0 || x > width) return;

              const isBuy = sig.signal_type === 'buy';

              // Draw arrow at entry price
              if (y !== null && y >= 0 && y <= height) {
                const arrowSize = 14;
                const arrowColor = isBuy ? '#00e676' : '#ff1744';

                ctx.fillStyle = arrowColor;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 1;

                if (isBuy) {
                  // Arrow pointing UP (below the entry price)
                  const arrowBaseY = y + 25;
                  ctx.beginPath();
                  ctx.moveTo(x, arrowBaseY - arrowSize);
                  ctx.lineTo(x - arrowSize / 2, arrowBaseY);
                  ctx.lineTo(x + arrowSize / 2, arrowBaseY);
                  ctx.closePath();
                  ctx.stroke();
                  ctx.fill();
                } else {
                  // Arrow pointing DOWN (above the entry price)
                  const arrowBaseY = y - 25;
                  ctx.beginPath();
                  ctx.moveTo(x, arrowBaseY + arrowSize);
                  ctx.lineTo(x - arrowSize / 2, arrowBaseY);
                  ctx.lineTo(x + arrowSize / 2, arrowBaseY);
                  ctx.closePath();
                  ctx.stroke();
                  ctx.fill();
                }
              }
            } catch (e) {
              console.log('[drawCanvasOverlay] Error drawing element:', e.message);
            }
          });
        };

        updateCardPositions = () => {
          drawCanvasOverlay();
          updateFloatingCards();
        };

        const updateWithArrows = () => {
          updateCardPositions();
        };

        chart.timeScale().subscribeVisibleTimeRangeChange(updateWithArrows);
        setTimeout(() => updateWithArrows(), 100);

        // Force redraw on data load
        setTimeout(() => updateCardPositions(), 500);
        
        // ── Attach onmessage AFTER data loads so the handler closes over
        // candleSeries, lastCandle - variables that only exist once historical
        // candles have been processed. The WebSocket itself was already opened
        // and subscribed in the early-init block.
        if (ws) {
          ws.onmessage = (event) => {
            if (!isMounted) return;
            try {
              const msg = JSON.parse(event.data);

              if (msg.type === 'candle_update' && msg.symbol === selectedSymbol && msg.interval === selectedInterval) {
                // msg.time is raw UTC seconds from the backend; historical
                // candles were shifted by offsetSeconds (local tz) when loaded
                // above, so the same shift must be applied here or every
                // live update looks "hours behind" and gets dropped as stale.
                const candleTime = msg.time + offsetSeconds;
                // Stale-candle guard: drop candles >2 intervals behind current
                if (candleTime < lastCandle.time - intervalSeconds * 2) {
                  console.warn(`[HAChart] Dropping stale WS candle: ${candleTime} vs ${lastCandle.time}`);
                  return;
                }
                const updatedCandle = { time: candleTime, open: msg.open, high: msg.high, low: msg.low, close: msg.close };
                candleSeries.update(updatedCandle);
                
                // Keep candleDataRef.current in sync
                const currentData = [...candleDataRef.current];
                const existingIndex = currentData.findIndex(c => c.time === candleTime);
                if (existingIndex !== -1) {
                  currentData[existingIndex] = updatedCandle;
                } else {
                  currentData.push(updatedCandle);
                }
                candleDataRef.current = currentData;

                if (msg.is_closed) {
                  lastCandle = updatedCandle;
                }
                updateCardPositions();
              }

              if (msg.type === 'price_tick' && msg.symbol === selectedSymbol) {
                const realPrice = msg.price;
                livePriceRef.current = realPrice;
                onPriceTick?.(realPrice);
                if (realPriceLineRef.current) {
                  const isUp = realPrice >= (lastCandle?.close ?? realPrice);
                  const lineColor = isUp ? '#10b981' : '#ef4444';
                  realPriceLineRef.current.applyOptions({ price: realPrice, color: lineColor, axisLabelColor: lineColor });
                }
                if (pnlTrackerSeriesRef.current && signalBarTimeRef.current) {
                  const entryVal = parseFloat(activeSignal.entry_price);
                  pnlTrackerSeriesRef.current.setData([
                    { time: signalBarTimeRef.current, value: entryVal },
                    { time: lastCandleTimeRef.current || lastCandle.time, value: realPrice }
                  ]);
                  pnlTrackerSeriesRef.current.applyOptions({ color: realPrice > entryVal ? '#00e676' : '#ff1744' });
                  if (pnlTrackerLineRef.current) {
                    const dc = ((realPrice - entryVal) / entryVal) * 100;
                    const livePnlPct = activeSignal.signal_type === 'buy' ? dc : -dc;
                    pnlTrackerLineRef.current.applyOptions({
                      price: realPrice,
                      color: realPrice > entryVal ? '#00e676' : '#ff1744',
                      title: `Live: ${livePnlPct >= 0 ? '+' : ''}${livePnlPct.toFixed(2)}%`,
                    });
                  }
                }
                updateCardPositions();
              }
            } catch (err) {
              console.warn('[HAChart] Error processing WS message:', err);
            }
          };
        }

        // Initial card positioning - ensure signal cards are displayed
        setTimeout(() => {
          if (isMounted) {
            console.log('[HAChart] Calling updateCardPositions with', sigsRef.current?.length || 0, 'signals');
            updateCardPositions();
          }
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
  }, [selectedSymbol, selectedInterval, activeSignal, signalStats]);

  // Keep hideOldSignalsRef in sync
  useEffect(() => {
    hideOldSignalsRef.current = hideOldSignals;
  }, [hideOldSignals]);

  // Re-filter signals when hideOldSignals toggle changes
  useEffect(() => {
    updateFloatingCards();
  }, [hideOldSignals]);

  const formatSymbolDisplay = (s) => s.replace('USDT', '/USDT');

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Controls Row - above chart */}
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap justify-between">
        {/* Left: Symbol Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`px-4 py-2 rounded-lg text-sm font-bold font-satoshi tracking-wider transition-all duration-200 flex items-center gap-2 border cursor-pointer select-none ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                : 'bg-slate-950/40 hover:bg-slate-900 border-slate-800/50 text-white'
            }`}
          >
            <span>{selectedSymbol.replace('USDT', '')} / USDT</span>
            <svg className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <>
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
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-satoshi font-bold tracking-wide transition-all duration-200 flex items-center justify-between cursor-pointer border-0 ${
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

        {/* Center: Timeframe + Toggle */}
        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex p-1 bg-slate-950/40 rounded-lg border border-slate-800/50 shadow-inner">
            {['30m'].map(tf => {
              const active = selectedInterval === tf;
              return (
                <button
                  key={tf}
                  onClick={() => onIntervalChange?.(tf)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold font-satoshi tracking-wider transition-all duration-300 cursor-pointer ${
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

          {/* Hide Old Signals Toggle */}
          <button
            onClick={() => setHideOldSignals(!hideOldSignals)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-satoshi tracking-wider transition-all duration-300 cursor-pointer border ${
              hideOldSignals
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-amber-500/20 shadow-sm'
                : 'bg-slate-950/40 text-slate-400 border-slate-800/50 hover:text-slate-300'
            }`}
            title="Show only today's signals"
          >
            {hideOldSignals ? '📅 TODAY ONLY' : '📅 ALL SIGNALS'}
          </button>
        </div>

        {/* Right: Live Feed Badge */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-sm shadow-emerald-500/5 transition-all">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-satoshi font-bold tracking-widest text-emerald-400">
            {formatSymbolDisplay(selectedSymbol)} LIVE FEED
          </span>
        </div>
      </div>

      {/* Premium Chart container with rounded corners */}
      <div className={`rounded-xl border relative shadow-2xl transition-all duration-300 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800/60 shadow-slate-950/55'
      }`} style={{ minHeight: 460 }}>
        {loading && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 ${isLight ? 'bg-white' : 'bg-[#0a0f1d]'}`}>
            <div className="w-8 h-8 border-3 border-[#3D5AFE] border-t-transparent rounded-full animate-spin shadow-[#3D5AFE]/30" />
            <span className="text-xs font-satoshi text-slate-400 uppercase tracking-widest animate-pulse">Initializing Live Charts...</span>
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


        <div
          className="relative w-full h-[620px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div ref={containerRef} className="absolute inset-0 z-10" style={{ visibility: loading || noData ? 'hidden' : 'visible' }} />

          {/* Floating HTML Label Cards Overlay */}
          {!loading && !noData && !hideSignalCards && (
            <>
              {signalCards.map((card) => {
                const isBuy = card.signal_type === 'buy';
                const pnlVal = card.displayPnl;
                const hasOpposite = card.close_reason === 'swing_opposite';
                const isClosed = card.pnl !== null && hasOpposite;
                const formattedPnl = pnlVal !== null
                  ? `${pnlVal >= 0 ? '+' : ''}${pnlVal.toFixed(2)}%${(card.isLatest && !isClosed) ? ' Live' : ''}`
                  : 'LIVE';

                const isActive = activeSignal && card.id === activeSignal.id;
                const isHovered = hoveredSignalId === card.id;

                if (isClosed && !isActive && !isHovered) return null;

                return (
                  <div
                    key={card.id || card.bar_time}
                    onClick={() => {
                      const signalId = card.isLatest
                        ? `live-${selectedSymbol}-${card.bar_time}-new`
                        : `log-${selectedSymbol}-${card.bar_time}`;
                      window.open(`/terminal/signals/${signalId}`, '_blank');
                    }}
                    className={`absolute z-25 group rounded-xl p-2.5 transition-all duration-300 ease-out glass border hover:scale-[1.05] hover:z-40 text-left cursor-pointer flex flex-col gap-1 w-28 hover:w-44 overflow-hidden select-none shadow-xl`}
                    style={{
                      left: `${card.x - 56}px`,
                      top: isBuy ? `${card.y + 18}px` : `${card.y - 65}px`,
                      borderColor: isBuy ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    {/* Card Title Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                        {isClosed ? (
                          <span className="text-[7.5px] font-extrabold px-1 py-0.5 rounded bg-zinc-800 text-white select-none uppercase tracking-wide leading-none">
                            closed
                          </span>
                        ) : (
                          <span className="text-[7.5px] font-extrabold px-1 py-0.5 rounded bg-cyan-900/40 text-cyan-400 select-none uppercase tracking-wide leading-none">
                            live
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-satoshi font-bold ${
                        pnlVal === null ? 'text-cyan-400 animate-pulse' : pnlVal >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {formattedPnl}
                      </span>
                    </div>
                    
                    {/* Expandable Body Content on Hover */}
                    <div className="max-h-0 opacity-0 group-hover:max-h-64 group-hover:opacity-100 transition-all duration-300 ease-out border-t border-slate-800/40 pt-1.5 mt-1 space-y-1 font-satoshi text-[8.5px] text-slate-400 overflow-y-auto">
                      <div>Entry: <span className="text-white font-bold">${card.entry_price?.toLocaleString()}</span></div>
                      <div>Time: <span className="text-slate-300">{new Date(card.bar_time).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false})}</span></div>
                      {isClosed && card.close_price !== null && card.close_price !== undefined && (
                        <>
                          <div className="border-t border-slate-800/40 pt-1 mt-1">
                            <div>Exit: <span className="text-white font-bold">${card.close_price?.toLocaleString()}</span></div>
                            <div>Method: <span className={`font-bold ${
                              card.close_reason === 'swing_opposite' ? 'text-cyan-400' :
                              card.close_reason === 'tp_hit' ? 'text-emerald-400' :
                              card.close_reason === 'sl_hit' ? 'text-red-400' :
                              'text-orange-400'
                            }`}>
                              {card.close_reason?.replace(/_/g, ' ').toUpperCase()}
                            </span></div>
                            {card.closed_at && (
                              <div>Exit Time: <span className="text-slate-300">{new Date(card.closed_at).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false})}</span></div>
                            )}
                          </div>
                        </>
                      )}
                      {!isClosed && (
                        <div className="border-t border-slate-800/40 pt-1 mt-1">
                          <div className="text-cyan-400 font-bold">⏳ Awaiting Opposite Signal</div>
                          <div className="text-slate-500 text-[7.5px] mt-1">Live PnL updates as price moves</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Canvas overlay - always render for signal arrows */}
          {!loading && !noData && (
            <canvas
              id="chart-overlay"
              className="absolute inset-0 pointer-events-none z-20"
              style={{ width: '100%', height: '100%' }}
            />
          )}

          {activeSignal && !loading && !noData && (
            <>

              <div className="absolute right-24 top-6 z-30 bg-[#0b1224]/90 border border-slate-800/80 rounded px-3 py-2 font-satoshi text-[10px] shadow-2xl text-left select-none pointer-events-none select-none">
                <div className="text-white font-extrabold uppercase tracking-wider">Risk : Reward</div>
                <div className="text-[#00e676] font-black text-[13px] mt-0.5">
                  1 : {(Math.abs(parseFloat(activeSignal.tp_price) - parseFloat(activeSignal.entry_price)) / Math.abs(parseFloat(activeSignal.entry_price) - parseFloat(activeSignal.sl_price)) || 1.0).toFixed(1)}
                </div>
                <div className="text-white mt-0.5 font-bold">
                  {signalStats ? `${signalStats.tpPctVal >= 0 ? '+' : ''}${signalStats.tpPct}% / ${signalStats.slPctVal >= 0 ? '+' : ''}${signalStats.slPct}%` : ''}
                </div>
              </div>
              {livePriceRef.current && (
                <div className="absolute left-6 top-6 z-30 bg-[#0b1224]/90 border border-slate-800/80 rounded px-3 py-2 font-satoshi text-[10px] shadow-2xl text-left select-none pointer-events-none select-none">
                  <div className="text-white font-extrabold uppercase tracking-wider">Live Position Gain</div>
                  {(() => {
                    const isBuy = activeSignal.signal_type === 'buy';
                    const diff = livePriceRef.current - parseFloat(activeSignal.entry_price);
                    const pnlPct = (isBuy ? (diff / parseFloat(activeSignal.entry_price)) : (-diff / parseFloat(activeSignal.entry_price))) * 100;
                    const isProfit = pnlPct >= 0;
                    const absVal = Math.abs(diff);
                    return (
                      <>
                        <div className={`font-black text-[13px] mt-0.5 ${isProfit ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                          {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                        </div>
                        <div className="text-white mt-0.5 font-bold">
                          {isProfit ? 'Profit' : 'Loss'}: {isProfit ? '' : '-'}${absVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modern Legend */}
      {!noData && !loading && (
        <div className={`flex flex-wrap items-center gap-6 p-4 rounded-xl border border-slate-800/50 bg-[#0f172a]/30 backdrop-blur-sm text-xs font-satoshi tracking-wider text-slate-400 animate-slide-up shadow-lg`}>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#10b981] shadow shadow-[#10b981]/50" /> Bullish HA
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] shadow shadow-[#ef4444]/50" /> Bearish HA
          </span>
          <span className="flex items-center gap-2 text-[#10b981] font-bold">
            ▲ BUY Signal
          </span>
          <span className="flex items-center gap-2 text-[#ef4444] font-bold">
            ▼ SELL Signal
          </span>
        </div>
      )}
    </div>
  );
}
