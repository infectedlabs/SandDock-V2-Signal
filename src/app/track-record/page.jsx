"use client";

import React, { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CtaPrimary, CtaSecondary, SectionHeading } from "@/components/ui/Cta";
import { useAuth } from "@/context/AuthContext";

const COINS = [
  { symbol: "BTCUSDT", label: "BTC" },
  { symbol: "ETHUSDT", label: "ETH" },
  { symbol: "BNBUSDT", label: "BNB" },
];

function formatPct(n, withSign = true) {
  const num = Number(n) || 0;
  const sign = withSign && num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function TrackRecordPage() {
  const { user } = useAuth();

  // Overall stats — same aggregate feed the homepage hero uses.
  const [heroStats, setHeroStats] = useState({ total_pnl: 0, win_rate: 0, total_signals: 0, last_updated: null });
  const [isLoadingHero, setIsLoadingHero] = useState(true);

  // Per-coin breakdown from /api/performance/summary.
  const [activeCoin, setActiveCoin] = useState("BTCUSDT");
  const [coinSummary, setCoinSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // This week's PnL by coin.
  const [weeklyPnl, setWeeklyPnl] = useState({ BTC: 0, ETH: 0, BNB: 0, total: 0 });

  // Full closed-trade ledger.
  const [ledger, setLedger] = useState([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(true);
  const [ledgerFilter, setLedgerFilter] = useState("ALL"); // ALL | BTCUSDT | ETHUSDT | BNBUSDT

  // Compound capital estimator.
  const [startingCapital, setStartingCapital] = useState(10000);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        setIsLoadingHero(true);
        const res = await fetch("/api/hero-stats");
        const data = await res.json();
        if (data.total_pnl !== undefined) setHeroStats(data);
      } catch (e) {
        console.error("Failed to fetch hero stats:", e);
      } finally {
        setIsLoadingHero(false);
      }
    };
    fetchHero();
    const interval = setInterval(fetchHero, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setIsLoadingSummary(true);
        const res = await fetch(`/api/performance/summary?symbol=${activeCoin}&interval=30m`);
        const data = await res.json();
        setCoinSummary(data);
      } catch (e) {
        console.error("Failed to fetch coin summary:", e);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [activeCoin]);

  useEffect(() => {
    const fetchWeekly = async () => {
      try {
        const res = await fetch("/api/weekly-pnl");
        const data = await res.json();
        setWeeklyPnl(data);
      } catch (e) {
        console.error("Failed to fetch weekly PnL:", e);
      }
    };
    fetchWeekly();
    const interval = setInterval(fetchWeekly, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        setIsLoadingLedger(true);
        // plan=master requests the zero-delay feed — this page is a public
        // record of closed history, not a live entry signal, so there is no
        // reason to apply the free-tier 5 minute delay here.
        const res = await fetch(
          `/api/signals/history?symbol=${ledgerFilter}&interval=30m&filter=30d&plan=master`
        );
        const data = await res.json();
        const closed = Array.isArray(data)
          ? data.filter((s) => s.pnl_pct !== null && s.pnl_pct !== undefined && s.bar_time)
          : [];
        closed.sort((a, b) => new Date(b.bar_time).getTime() - new Date(a.bar_time).getTime());
        setLedger(closed);
      } catch (e) {
        console.error("Failed to fetch ledger:", e);
        setLedger([]);
      } finally {
        setIsLoadingLedger(false);
      }
    };
    fetchLedger();
    const interval = setInterval(fetchLedger, 60000);
    return () => clearInterval(interval);
  }, [ledgerFilter]);

  const visibleLedger = useMemo(() => ledger.slice(0, 50), [ledger]);

  const projectedCapital = startingCapital + (heroStats.total_pnl / 100) * startingCapital;
  const projectedGain = projectedCapital - startingCapital;

  return (
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden antialiased">
      <Navbar />

      {/* HERO */}
      <section className="relative mesh-glow grain border-b border-line overflow-hidden">
        <div className="grid-lines" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-16 md:pt-44 md:pb-20 text-center">
          <div className="chip chip-accent mx-auto mb-7">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-up opacity-70 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-up" />
            </span>
            Live ledger · updates every 60s
          </div>

          <p className="font-instrument-serif text-[#b4c0ff] text-2xl sm:text-3xl leading-[1.1]">
            Every signal. Every result.
          </p>
          <h1 className="mt-3 text-5xl sm:text-6xl lg:text-[86px] font-semibold tracking-tighter leading-[0.95] text-gradient">
            On the record.
          </h1>
          <p className="mt-6 text-white/70 text-[17px] md:text-lg leading-[1.65] max-w-2xl mx-auto">
            No login required. No cherry-picked screenshots. This page pulls directly from the
            same database Sanddock trades against — wins, losses, and everything in between.
          </p>

          {/* Live stats strip — identical data source to the homepage hero */}
          <div className="mt-12 max-w-2xl mx-auto grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-line bg-line">
            <div className="bg-surface-1/90 px-4 py-5 md:px-6">
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">Win Rate</p>
              <p className="mt-1.5 text-2xl md:text-[32px] font-extrabold text-ink tracking-tight">
                {isLoadingHero ? "—" : `${heroStats.win_rate.toFixed(1)}%`}
              </p>
            </div>
            <div className="bg-surface-1/90 px-4 py-5 md:px-6">
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">Total PnL</p>
              <p className={`mt-1.5 text-2xl md:text-[32px] font-extrabold tracking-tight ${heroStats.total_pnl >= 0 ? "text-up" : "text-down"}`}>
                {isLoadingHero ? "—" : formatPct(heroStats.total_pnl)}
              </p>
            </div>
            <div className="bg-surface-1/90 px-4 py-5 md:px-6">
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">Signals</p>
              <p className="mt-1.5 text-2xl md:text-[32px] font-extrabold text-ink tracking-tight">
                {isLoadingHero ? "—" : heroStats.total_signals.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-ink-3">
            Last updated {isLoadingHero ? "—" : new Date(heroStats.last_updated).toLocaleString()}
          </p>
        </div>
      </section>

      {/* PER-COIN BREAKDOWN */}
      <section className="relative py-20 md:py-24 border-b border-line mesh-glow-soft">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <SectionHeading eyebrow="By coin" title="Performance breakdown" className="!max-w-xl" />
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-max">
              {COINS.map((c) => (
                <button
                  key={c.symbol}
                  onClick={() => setActiveCoin(c.symbol)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                    activeCoin === c.symbol
                      ? "bg-gradient-to-r from-accent to-accent-2 text-white"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-line bg-line">
            {[
              { label: "Win rate", value: isLoadingSummary || !coinSummary ? "—" : `${coinSummary.win_rate_pct}%`, tone: "text-up" },
              { label: "Completed trades", value: isLoadingSummary || !coinSummary ? "—" : coinSummary.completed_trades, tone: "text-ink" },
              { label: "Profit factor", value: isLoadingSummary || !coinSummary ? "—" : coinSummary.profit_factor, tone: "text-gradient-accent" },
              { label: "Avg PnL / trade", value: isLoadingSummary || !coinSummary ? "—" : formatPct(coinSummary.avg_pnl), tone: parseFloat(coinSummary?.avg_pnl) >= 0 ? "text-up" : "text-down" },
              { label: "Wins", value: isLoadingSummary || !coinSummary ? "—" : coinSummary.wins, tone: "text-up" },
              { label: "Losses", value: isLoadingSummary || !coinSummary ? "—" : coinSummary.losses, tone: "text-down" },
              { label: "Best trade", value: isLoadingSummary || !coinSummary ? "—" : formatPct(coinSummary.best_trade), tone: "text-up" },
              { label: "Worst trade", value: isLoadingSummary || !coinSummary ? "—" : formatPct(coinSummary.worst_trade), tone: "text-down" },
            ].map((s) => (
              <div key={s.label} className="bg-surface-1/90 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3 mb-2">{s.label}</p>
                <p className={`text-[26px] font-extrabold tracking-tight ${s.tone}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* This week by coin */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "BTC — 7d", value: weeklyPnl.BTC },
              { label: "ETH — 7d", value: weeklyPnl.ETH },
              { label: "BNB — 7d", value: weeklyPnl.BNB },
              { label: "Combined — 7d", value: weeklyPnl.total },
            ].map((w) => (
              <div key={w.label} className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-1.5">{w.label}</p>
                <p className={`text-[20px] font-bold tracking-tight ${w.value >= 0 ? "text-up" : "text-down"}`}>
                  {formatPct(w.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPOUND CAPITAL ESTIMATOR */}
      <section className="relative py-20 md:py-24 border-b border-line">
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <SectionHeading
            eyebrow="Estimator"
            title="What this track record means for your capital"
            description="Applies the verified all-time return to a starting balance. Illustrative only — past performance does not guarantee future results."
          />

          <div className="card-gradient-border p-px mt-10">
            <div className="relative rounded-[17px] bg-surface-2/70 backdrop-blur-xl p-8 overflow-hidden">
              <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-accent/16 blur-3xl" />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div>
                  <label className="field-label">Starting capital</label>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[28px] font-bold text-ink tracking-tight">
                      ${startingCapital.toLocaleString()}
                    </span>
                    <span className="text-[12px] text-ink-3">
                      at {isLoadingHero ? "—" : formatPct(heroStats.total_pnl)} all-time
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="100000"
                    step="500"
                    value={startingCapital}
                    onChange={(e) => setStartingCapital(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-[#3054ff]"
                  />
                  <div className="flex justify-between text-[11px] text-ink-3 mt-2">
                    <span>$500</span>
                    <span>$100,000</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-black/30 border border-white/8 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-1.5">
                      Projected gain
                    </p>
                    <p className={`text-[20px] font-bold tracking-tight ${projectedGain >= 0 ? "text-up" : "text-down"}`}>
                      {projectedGain >= 0 ? "+" : "-"}${Math.abs(projectedGain).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/30 border border-white/8 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-1.5">
                      Projected balance
                    </p>
                    <p className="text-[20px] font-bold tracking-tight text-ink">
                      ${projectedCapital.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FULL LEDGER */}
      <section className="relative py-20 md:py-24 border-b border-line mesh-glow-soft">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <SectionHeading eyebrow="The ledger" title="Closed trades, last 30 days" className="!max-w-xl" />
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-max">
              {[{ symbol: "ALL", label: "All" }, ...COINS].map((c) => (
                <button
                  key={c.symbol}
                  onClick={() => setLedgerFilter(c.symbol)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                    ledgerFilter === c.symbol
                      ? "bg-gradient-to-r from-accent to-accent-2 text-white"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden !rounded-2xl">
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-ink-2">
              <span>Recent closed trades</span>
              <span className="text-ink-3 normal-case font-medium tracking-normal">
                {isLoadingLedger ? "Loading…" : `Showing ${visibleLedger.length} of ${ledger.length}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/8 text-ink-3 font-satoshi text-[10px] uppercase tracking-[0.14em] font-bold">
                    <th className="px-5 py-3.5 font-bold">Date</th>
                    <th className="px-5 py-3.5 font-bold">Time</th>
                    <th className="px-5 py-3.5 font-bold">Pair</th>
                    <th className="px-5 py-3.5 font-bold">Type</th>
                    <th className="px-5 py-3.5 font-bold">Entry</th>
                    <th className="px-5 py-3.5 font-bold">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 font-satoshi text-[13px]">
                  {isLoadingLedger ? (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-ink-3">Loading signals…</td>
                    </tr>
                  ) : visibleLedger.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-ink-3">No closed signals in this window yet.</td>
                    </tr>
                  ) : (
                    visibleLedger.map((sig, idx) => {
                      const isBuy = String(sig.signal_type).toLowerCase() === "buy";
                      const isWin = sig.is_win;
                      return (
                        <tr key={sig.id || idx} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-5 py-4 text-ink-3 tabular-nums">{formatDate(sig.bar_time)}</td>
                          <td className="px-5 py-4 text-ink-3 tabular-nums">{formatTime(sig.bar_time)}</td>
                          <td className="px-5 py-4 font-semibold text-ink">{String(sig.symbol || "").replace("USDT", "")}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex text-[10px] font-bold px-2 py-1 rounded-md font-satoshi border ${
                              isBuy ? "bg-up/12 text-up border-up/25" : "bg-down/12 text-down border-down/25"
                            }`}>
                              {isBuy ? "BUY" : "SELL"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-ink-2 tabular-nums">
                            {sig.entry_price ? `$${Number(sig.entry_price).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—"}
                          </td>
                          <td className={`px-5 py-4 font-bold tabular-nums ${isWin ? "text-up" : "text-down"}`}>
                            <span className="inline-flex items-center gap-1.5">
                              {formatPct(sig.pnl_pct)}
                              {isWin ? (
                                <svg className="w-3 h-3 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="relative py-24 md:py-28">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="card-gradient-border p-px shadow-[0_40px_100px_-40px_rgba(48,84,255,0.7)]">
            <div className="relative rounded-[17px] bg-surface-1/85 backdrop-blur-xl px-8 py-14 md:px-14 md:py-16 text-center overflow-hidden grain">
              <div className="pointer-events-none absolute -top-40 -right-20 w-[420px] h-[420px] rounded-full bg-accent-2/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-accent/18 blur-3xl" />
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-[32px] md:text-[46px] font-semibold tracking-tighter leading-[1.05] text-gradient">
                  Trade alongside <span className="text-gradient-accent">the record.</span>
                </h2>
                <p className="mt-5 text-white/70 text-[16px] md:text-[17px] leading-relaxed">
                  Start free on Bitcoin and get every signal this page is built from, the moment it fires.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-9">
                  <CtaPrimary href={user ? "/terminal" : "/signup"}>
                    {user ? "Go to Terminal" : "Get free signals"}
                  </CtaPrimary>
                  <CtaSecondary href="/pricing">See pricing</CtaSecondary>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
