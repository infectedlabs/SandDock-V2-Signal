"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CtaPrimary, CtaSecondary, SectionHeading } from "@/components/ui/Cta";

const faqItems = [
  {
    q: "How fast does support respond?",
    a: "Email support typically resolves all queries within 2 hours. Our Telegram community managers and support admins are active 24/7."
  },
  {
    q: "Can I get a custom webhook integration?",
    a: "Yes. GrandMaster and Master members can request custom payload formats or dedicated webhook routes for proprietary bots by contacting our integration engineering team."
  },
  {
    q: "Is there a phone support hotline?",
    a: "To keep overhead low and focus completely on engine latency, we offer support exclusively via email, Telegram, and our social media channels."
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: "Please email alex@sanddock.com with the subject line '[BUG]' or '[FEATURE]'. Our product engineers review all feedback weekly."
  }
];

const channels = [
  {
    kicker: "Direct email",
    title: "Email Us",
    body: "Get quick support and technical answers.",
    handle: "alex@sanddock.com",
    href: "mailto:alex@sanddock.com",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
  },
  {
    kicker: "Instant chat",
    title: "Telegram",
    body: "Chat with admins and our trading community.",
    handle: "@sanddockcom",
    href: "https://t.me/sanddockcom",
    external: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21.5 4.5L2.5 11.2l5.9 2 2.2 6.3 3-3.6 4.6 3.4 3.3-14.8z" />
    ),
  },
  {
    kicker: "Updates & news",
    title: "Twitter / X",
    body: "Follow our signal announcements and reviews.",
    handle: "@sanddockcom",
    href: "https://x.com/sanddockcom",
    external: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4l16 16M20 4L4 20" />
    ),
  },
  {
    kicker: "Visual feed",
    title: "Instagram",
    body: "Check visual walkthroughs and trade examples.",
    handle: "@sanddockcom",
    href: "https://instagram.com/sanddockcom",
    external: true,
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth={1.8} />
        <circle cx="12" cy="12" r="4" strokeWidth={1.8} />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

export default function ContactPage() {
  const { user } = useAuth();
  const [openFAQ, setOpenFAQ] = useState({});

  const toggleFAQ = (index) => {
    setOpenFAQ(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden antialiased">
      <Navbar />

      {/* CONTACT HERO */}
      <section className="relative mesh-glow grain border-b border-line overflow-hidden">
        <div className="grid-lines" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-20 md:pt-44 md:pb-24 text-center">
          <p className="font-instrument-serif text-[#b4c0ff] text-2xl sm:text-3xl leading-[1.1]">
            Get in touch
          </p>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-[86px] font-semibold tracking-tighter leading-[0.95] text-gradient">
            Connect With Us
          </h1>
          <p className="mt-6 text-white/70 text-[17px] md:text-lg leading-[1.65] max-w-2xl mx-auto">
            Have questions about Sanddock confluences, API webhook configuration, or GrandMaster
            spots? Our support team and engineering channels are available 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <CtaPrimary href="mailto:alex@sanddock.com">Email support</CtaPrimary>
            <CtaSecondary href="https://t.me/sanddockcom" target="_blank" rel="noopener noreferrer">
              Join Telegram
            </CtaSecondary>
          </div>
        </div>
      </section>

      {/* CONTACT CHANNELS */}
      <section className="relative py-20 md:py-24 border-b border-line mesh-glow-soft">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Every way to reach us" title="Pick a channel" />
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {channels.map((c) => (
              <a
                key={c.title}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="card card-interactive p-7 flex flex-col justify-between gap-10 group"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white flex items-center justify-center shadow-[0_8px_24px_-10px_rgba(48,84,255,0.9)]">
                    <svg className="w-[19px] h-[19px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {c.icon}
                    </svg>
                  </div>
                  <span className="mt-5 block text-[10px] font-semibold tracking-[0.16em] text-accent-soft uppercase">
                    {c.kicker}
                  </span>
                  <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-ink">{c.title}</h3>
                  <p className="mt-2 text-[13.5px] text-ink-2 leading-relaxed">{c.body}</p>
                </div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-ink-2 group-hover:text-accent-soft transition-colors">
                  {c.handle}
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORT FAQ */}
      <section className="relative py-20 md:py-24 border-b border-line">
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <SectionHeading eyebrow="Support FAQs" title="Basic support queries" />
          <div className="mt-12 divide-y divide-white/8 border-y border-white/8">
            {faqItems.map((item, idx) => {
              const isOpen = !!openFAQ[idx];
              return (
                <div key={idx}>
                  <button
                    onClick={() => toggleFAQ(idx)}
                    aria-expanded={isOpen}
                    className={`w-full text-left flex items-center justify-between gap-6 py-5 text-[16px] font-medium transition-colors ${
                      isOpen ? "text-ink" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    <span>{item.q}</span>
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-[14px] transition-all ${
                        isOpen
                          ? "border-accent/40 bg-accent/15 text-accent-soft"
                          : "border-white/12 text-ink-3"
                      }`}
                    >
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="text-ink-2 text-[15px] leading-relaxed pb-6 pr-10">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Closing CTA */}
          <div className="mt-14 card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-[20px] font-semibold tracking-tight text-ink">
                Still stuck?
              </h3>
              <p className="mt-1.5 text-[14.5px] text-ink-2">
                Message a support admin directly and we&apos;ll pick it up within the hour.
              </p>
            </div>
            <CtaSecondary
              href="https://t.me/alexsanddockcom"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/12 flex-shrink-0"
            >
              Contact @alexsanddockcom
            </CtaSecondary>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
