"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Anchors are prefixed with "/" so they resolve correctly from every page
// that mounts this navbar, not only the homepage itself.
const navLinks = [
  { label: "Platform", href: "/#explainability", hasDropdown: true },
  { label: "Track Record", href: "/track-record" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-transparent px-6 py-4 flex items-center justify-between font-instrument-sans">
      {/* Left: mark */}
      <a href="/" className="flex items-center gap-2.5 text-white" aria-label="Sanddock home">
        <img src="/sanddock-logo.png" alt="" className="w-7 h-7 object-contain" />
        <span className="text-[20px] font-semibold tracking-tight">Sanddock</span>
      </a>

      {/* Center: links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            {link.label}
            {link.hasDropdown && <ChevronDown className="w-4 h-4" />}
          </a>
        ))}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-5">
        <a
          href="/track-record"
          className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          See Track Record
        </a>
        <a
          href={user ? "/terminal" : "/signup"}
          className="bg-white text-black rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          {user ? "Terminal" : "Get Started"}
        </a>
      </div>
    </nav>
  );
}
