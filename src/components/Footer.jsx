"use client";

import React from "react";

const socials = [
  {
    label: "Twitter/X",
    href: "https://x.com/sanddockcom",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.637l-5.206-6.801-5.979 6.801h-3.31l7.734-8.835L2.25 2.25h6.82l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z",
  },
  {
    label: "Telegram",
    href: "https://t.me/sanddockcom",
    path: "M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.82-1.084.51l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.782 13.5l-2.995-.937c-.652-.213-.66-.652.135-.973l11.717-4.518c.54-.213 1.012.122.84 1.15z",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@SandDock",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/sanddockcom/",
    path: "M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.441 7.265c.504 0 .915.41.915.915 0 .504-.41.915-.915.915-.504 0-.915-.41-.915-.915 0-.504.41-.915.915-.915zm-3.441.915c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-1.5c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5-2.015-4.5-4.5-4.5zm6.5-2c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5z",
  },
];

const columns = [
  {
    heading: "Product",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Terminal", href: "/terminal" },
      { label: "Pricing", href: "/pricing" },
      { label: "Articles", href: "/articles" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Telegram Community", href: "https://t.me/sanddockcom", external: true },
      { label: "Billing", href: "/billing" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Support Channel", href: "https://t.me/alexsanddockcom", external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-surface-1 text-ink pt-16 pb-8 border-t border-line">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-14">
          {/* Tagline / logo */}
          <div className="md:col-span-5 space-y-4 text-left">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
                <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-5 h-5 object-contain" />
              </span>
              <span className="text-[16px] font-semibold tracking-tight text-ink">Sanddock</span>
            </div>
            <p className="text-ink-2 text-[14px] leading-relaxed max-w-xs">
              Trading signals backed by data, not promises.
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2.5">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    aria-label={s.label}
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 text-ink-2 hover:text-ink hover:border-accent/40 hover:bg-accent/10 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
              <div className="pt-1">
                <a
                  href="mailto:alex@sanddock.com"
                  className="text-ink-2 hover:text-accent-soft transition-colors text-[13px] font-medium"
                >
                  alex@sanddock.com
                </a>
              </div>
            </div>
          </div>

          {/* Link columns */}
          <div className="md:col-span-7 grid grid-cols-3 gap-8 text-left">
            {columns.map((col) => (
              <div key={col.heading} className="space-y-3.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                  {col.heading}
                </h4>
                <ul className="space-y-2.5 text-ink-2 text-[13.5px] font-medium">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="hover:text-ink transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-line pt-8 text-center text-[12px] text-ink-3 leading-relaxed max-w-3xl mx-auto">
          &copy; {new Date().getFullYear()} Sanddock. Not financial advice. All signals are for
          educational purposes only. Past performance does not indicate future results.
        </div>
      </div>
    </footer>
  );
}
