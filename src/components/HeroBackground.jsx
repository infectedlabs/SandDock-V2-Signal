"use client";

import React, { useEffect, useRef } from "react";

export default function HeroBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = 600;

    // Animated candlestick data
    const candles = [];
    const candleCount = 15;
    const spacing = canvas.width / (candleCount + 1);

    class AnimatedCandle {
      constructor(x, index) {
        this.x = x;
        this.index = index;
        this.baseOpen = 100 + Math.random() * 100;
        this.time = 0;
      }

      getPrice() {
        // Sine wave movement to create swing pattern
        const swingPattern = Math.sin((this.time + this.index * 0.3) * 0.05) * 60;
        const noise = Math.sin(this.time * 0.02 + this.index) * 20;
        return this.baseOpen + swingPattern + noise;
      }

      update() {
        this.time += 0.3;
      }

      draw(ctx) {
        const open = this.getPrice();
        const close = this.getPrice() + Math.sin(this.time * 0.01) * 15;
        const high = Math.max(open, close) + Math.abs(Math.sin(this.time * 0.008)) * 20;
        const low = Math.min(open, close) - Math.abs(Math.cos(this.time * 0.008)) * 20;

        // Scale prices to canvas
        const scale = (price) => canvas.height * 0.7 - (price / 200) * 300;

        const y_open = scale(open);
        const y_close = scale(close);
        const y_high = scale(high);
        const y_low = scale(low);

        // Candle color based on open/close
        const isGreen = close >= open;
        const color = isGreen ? "#00e676" : "#ff4500";
        const opacity = 0.3 + (Math.sin(this.time * 0.05) + 1) * 0.35;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 2;

        // Draw wick (high-low line)
        ctx.beginPath();
        ctx.moveTo(this.x, y_high);
        ctx.lineTo(this.x, y_low);
        ctx.stroke();

        // Draw body (open-close rectangle)
        const bodyWidth = 8;
        const bodyY = Math.min(y_open, y_close);
        const bodyHeight = Math.abs(y_close - y_open) || 3;

        ctx.fillRect(this.x - bodyWidth / 2, bodyY, bodyWidth, bodyHeight);

        ctx.globalAlpha = 1;
      }
    }

    // Initialize candles
    for (let i = 0; i < candleCount; i++) {
      candles.push(new AnimatedCandle(spacing * (i + 1), i));
    }

    // Animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Clear with white background
      ctx.fillStyle = "rgba(255, 255, 255, 1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle grid
      ctx.strokeStyle = "rgba(0, 0, 0, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (canvas.height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw center line
      ctx.strokeStyle = "rgba(255, 69, 0, 0.1)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.5);
      ctx.lineTo(canvas.width, canvas.height * 0.5);
      ctx.stroke();

      // Update and draw candles
      candles.forEach((candle) => {
        candle.update();
        candle.draw(ctx);
      });

      // Draw label
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.font = "11px monospace";
      ctx.fillText("SWING DETECTION VISUALIZED", 20, canvas.height - 15);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "600px",
        zIndex: 1,
        display: "block",
        background: "white",
      }}
    />
  );
}
