"use client";

import React, { useEffect, useRef } from "react";
import Hls from "hls.js";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const videoSrc =
  "https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8";

const posterSrc =
  "https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080";

export default function Hero({ heroStats, isLoadingStats }) {
  const { user } = useAuth();
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari plays HLS natively.
      video.src = videoSrc;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
    }
  }, []);

  return (
    <section className="relative w-full min-h-screen bg-[#000000] text-white overflow-hidden flex flex-col items-center">
      {/*
        Motion server-renders its `initial` state as inline opacity:0, so the hero
        would stay blank for anyone whose JS never runs. Force it visible instead.
      */}
      <noscript>
        <style>{`
          .hero-animate {
            opacity: 1 !important;
            transform: none !important;
          }
        `}</style>
      </noscript>

      {/* Background video */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        poster={posterSrc}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />

      {/* Video overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Decorative gradients */}
      <div className="pointer-events-none absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-900/20 blur-[120px] mix-blend-screen" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-indigo-900/20 blur-[120px] mix-blend-screen" />

      {/* Content */}
      <div className="relative z-10 mt-20 mx-auto max-w-5xl px-6 flex flex-col items-center text-center space-y-12 pb-24">
        <div className="space-y-4">
          {/* Pre-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="hero-animate font-instrument-serif text-white text-3xl sm:text-5xl lg:text-[48px] leading-[1.1]"
          >
            Trading signals backed by data,
          </motion.p>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="hero-animate font-instrument-sans font-semibold text-6xl sm:text-8xl lg:text-[136px] leading-[0.9] tracking-tighter bg-gradient-to-b from-white via-white to-[#b4c0ff] bg-clip-text text-transparent"
          >
            Not Promises
          </motion.h1>
        </div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="hero-animate font-instrument-sans text-white opacity-70 text-lg sm:text-[20px] leading-[1.65] max-w-xl"
        >
          AI-powered trading signals with a verified public track record. Every entry ships
          with a clear reason, a stop-loss, and a profit target. Start free on Bitcoin.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="hero-animate flex flex-col sm:flex-row items-center gap-6"
        >
          <a
            href={user ? "/terminal" : "/signup"}
            className="group flex items-center gap-3 bg-white pl-6 pr-2 py-2 rounded-full transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105"
          >
            <span className="font-instrument-sans font-medium text-lg text-[#0a0400]">
              {user ? "Go To Terminal" : "Start Trading Free"}
            </span>
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3054ff] group-hover:bg-[#2040e0] transition-colors">
              <ArrowRight className="w-5 h-5 text-white" />
            </span>
          </a>

          <a
            href="#track-record"
            className="group flex items-center gap-2 px-4 py-2 rounded-lg text-white/70 hover:text-white backdrop-blur-sm hover:bg-white/5 transition-all font-instrument-sans"
          >
            See Track Record
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>

        {/* Live stats strip — real data from /api/hero-stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="hero-animate w-full max-w-2xl grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/10 bg-white/10 backdrop-blur-md"
        >
          <div className="bg-black/65 px-4 py-5">
            <p className="font-instrument-sans text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              Win Rate
            </p>
            <p className="mt-1.5 font-instrument-sans text-2xl md:text-[32px] font-semibold tracking-tight text-white">
              {isLoadingStats ? "—" : `${heroStats.win_rate.toFixed(1)}%`}
            </p>
          </div>
          <div className="bg-black/65 px-4 py-5">
            <p className="font-instrument-sans text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              Total PnL
            </p>
            <p
              className={`mt-1.5 font-instrument-sans text-2xl md:text-[32px] font-semibold tracking-tight ${
                heroStats.total_pnl >= 0 ? "text-[#4ade80]" : "text-[#ff4d5e]"
              }`}
            >
              {isLoadingStats
                ? "—"
                : `${heroStats.total_pnl >= 0 ? "+" : ""}${heroStats.total_pnl.toFixed(2)}%`}
            </p>
          </div>
          <div className="bg-black/65 px-4 py-5">
            <p className="font-instrument-sans text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              Signals
            </p>
            <p className="mt-1.5 font-instrument-sans text-2xl md:text-[32px] font-semibold tracking-tight text-white">
              {isLoadingStats ? "—" : heroStats.total_signals.toLocaleString()}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
