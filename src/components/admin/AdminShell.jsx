"use client";

import React from "react";

const TABS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/users", label: "Users & Plans" },
  { href: "/admin/referrals", label: "Referral Payouts" },
];

export function AdminAccessDenied() {
  return (
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden antialiased flex items-center justify-center">
      <div className="mesh-glow absolute inset-0" />
      <div className="relative z-10 card p-10 text-center max-w-sm mx-6">
        <p className="text-[22px] font-semibold tracking-tight text-gradient">Access denied</p>
        <p className="mt-2 text-[13.5px] text-ink-2">Only the admin account can view this page.</p>
        <a href="/" className="btn-primary mt-6 inline-flex">
          <span>Go home</span>
        </a>
      </div>
    </div>
  );
}

export default function AdminShell({ active, eyebrow = "Admin", title, description, children }) {
  return (
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden antialiased">
      {/* Sticky nav */}
      <header className="sticky top-0 z-40 w-full glass-nav backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <a href="/admin" className="flex items-center gap-2.5 text-ink shrink-0" aria-label="Admin home">
            <img src="/sanddock-logo.png" alt="" className="w-6 h-6 object-contain" />
            <span className="text-[14px] font-semibold tracking-tight">Sanddock Admin</span>
          </a>
          <nav className="hidden sm:flex items-center gap-1.5">
            {TABS.map((t) => (
              <a
                key={t.href}
                href={t.href}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  active === t.href
                    ? "bg-accent/15 text-accent-soft border border-accent/30"
                    : "text-ink-2 hover:text-ink border border-transparent"
                }`}
              >
                {t.label}
              </a>
            ))}
          </nav>
          <a href="/terminal" className="text-[12px] font-medium text-ink-2 hover:text-ink transition-colors shrink-0">
            Terminal →
          </a>
        </div>
      </header>

      {/* PAGE HEADER */}
      <section className="relative mesh-glow-soft border-b border-line overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-8">
          <span className="eyebrow text-[16px]">{eyebrow}</span>
          <h1 className="mt-1.5 text-[32px] md:text-[40px] font-semibold tracking-tighter leading-[1.05] text-gradient">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-ink-2 text-[14px] md:text-[15px] leading-relaxed max-w-xl">{description}</p>
          )}
        </div>
      </section>

      {/* Mobile tab nav */}
      <nav className="sm:hidden flex items-center gap-1.5 px-6 py-3 border-b border-line overflow-x-auto">
        {TABS.map((t) => (
          <a
            key={t.href}
            href={t.href}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
              active === t.href
                ? "bg-accent/15 text-accent-soft border border-accent/30"
                : "text-ink-2 border border-line"
            }`}
          >
            {t.label}
          </a>
        ))}
      </nav>

      <main className="relative max-w-7xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
