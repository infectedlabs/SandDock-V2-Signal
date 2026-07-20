"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

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

export default function ContactPage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", body: "" });
  const [openFAQ, setOpenFAQ] = useState({});

  const handleOpenModal = (title, body) => {
    setModalContent({ title, body });
    setModalOpen(true);
  };

  const toggleFAQ = (index) => {
    setOpenFAQ(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="relative min-h-screen bg-white text-black selection:bg-brand-orange selection:text-white overflow-hidden">
      
      {/* HEADER / NAVIGATION BAR (SWISS STYLE) */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          
          {/* Logo container block with right border */}
          <div className="flex items-center px-6 h-16 border-r border-black relative">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-sans text-black">
                Sanddock
              </span>
            </a>
            {/* Diamond point marker */}
            <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

          {/* Links grid with right borders */}
          <nav className="hidden md:flex items-center flex-1 h-16 text-xs font-bold uppercase tracking-wider text-black">
            <a href="/#how-it-works" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">How It Works</a>
            <a href="/#explainability" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Platform Features</a>
            <a href="/#track-record" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Track Record</a>
            <a href="/pricing" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Pricing</a>
            <a href="/contact" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Contact</a>
            <a href="/#faq" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">FAQ</a>
            {user ? (
              <a href="/terminal" className="px-6 h-full flex items-center border-r border-black text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">Terminal</a>
            ) : (
              <a href="/login" className="px-6 h-full flex items-center border-r border-black text-black hover:bg-black hover:text-white transition-colors">Login</a>
            )}
          </nav>

          {/* Action button container on right with left border */}
          <div className="flex items-center h-16 border-l border-black relative">
            {user ? (
              <a 
                href="/terminal"
                className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center"
              >
                Terminal &rarr;
              </a>
            ) : (
              <a 
                href="/signup"
                className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center"
              >
                Start Free &rarr;
              </a>
            )}
            {/* Diamond point marker */}
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

        </div>
      </header>

      {/* CONTACT HERO TITLE SECTION */}
      <section className="pt-20 pb-12 max-w-7xl mx-auto px-6 border-b border-black text-left">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-3">
          Get in Touch
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none mb-6">
          Connect With Us
        </h1>
        <p className="text-text-secondary text-base md:text-lg max-w-2xl leading-relaxed">
          Have questions about Sanddock confluences, API webhook configuration, or GrandMaster spots? Our support team and engineering channels are available 24/7.
        </p>
      </section>

      {/* CONTACT CARDS GRID */}
      <section className="py-16 max-w-7xl mx-auto px-6 border-b border-black">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Card 1: Email */}
          <a href="mailto:alex@sanddock.com" className="bg-[#f4f6fa] border border-black p-8 rounded-none flex flex-col justify-between h-56 hover:bg-black hover:text-white transition-colors group">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider block text-brand-orange uppercase mb-4">Direct Email</span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black group-hover:text-white">Email Us</h3>
              <p className="text-text-secondary text-sm group-hover:text-zinc-300 mt-2">Get quick support and technical answers.</p>
            </div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider mt-4">
              alex@sanddock.com &rarr;
            </div>
          </a>

          {/* Card 2: Telegram */}
          <a href="https://t.me/sanddockcom" target="_blank" rel="noopener noreferrer" className="bg-[#f4f6fa] border border-black p-8 rounded-none flex flex-col justify-between h-56 hover:bg-black hover:text-white transition-colors group">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider block text-brand-orange uppercase mb-4">Instant Chat</span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black group-hover:text-white">Telegram</h3>
              <p className="text-text-secondary text-sm group-hover:text-zinc-300 mt-2">Chat with admins and our trading community.</p>
            </div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider mt-4">
              @sanddockcom &rarr;
            </div>
          </a>

          {/* Card 3: Twitter/X */}
          <a href="https://x.com/sanddockcom" target="_blank" rel="noopener noreferrer" className="bg-[#f4f6fa] border border-black p-8 rounded-none flex flex-col justify-between h-56 hover:bg-black hover:text-white transition-colors group">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider block text-brand-orange uppercase mb-4">Updates & News</span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black group-hover:text-white">Twitter / X</h3>
              <p className="text-text-secondary text-sm group-hover:text-zinc-300 mt-2">Follow our signal announcements and reviews.</p>
            </div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider mt-4">
              @sanddockcom &rarr;
            </div>
          </a>

          {/* Card 4: Instagram */}
          <a href="https://instagram.com/sanddockcom" target="_blank" rel="noopener noreferrer" className="bg-[#f4f6fa] border border-black p-8 rounded-none flex flex-col justify-between h-56 hover:bg-black hover:text-white transition-colors group">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider block text-brand-orange uppercase mb-4">Visual Feed</span>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-black group-hover:text-white">Instagram</h3>
              <p className="text-text-secondary text-sm group-hover:text-zinc-300 mt-2">Check visual walkthroughs and trade examples.</p>
            </div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider mt-4">
              @sanddockcom &rarr;
            </div>
          </a>

        </div>
      </section>

      {/* SUPPORT FAQ SECTION */}
      <section className="py-20 max-w-4xl mx-auto px-6 border-b border-black text-left">
        <div className="mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-2">
            Support FAQs
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tighter text-black font-sans leading-none">
            Basic Support Queries
          </h2>
        </div>

        <div className="border-t border-black divide-y divide-black">
          {faqItems.map((item, idx) => {
            const isOpen = !!openFAQ[idx];
            return (
              <div key={idx} className="py-5">
                <button 
                  onClick={() => toggleFAQ(idx)}
                  className="w-full text-left flex items-center justify-between gap-4 font-bold uppercase text-base text-black hover:text-brand-orange transition-colors"
                >
                  <span className="font-sans">{item.q}</span>
                  <span className="text-xl font-bold font-mono">
                    {isOpen ? "\u2212" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="text-text-secondary text-base leading-relaxed pt-3 pr-8 transition-all normal-case font-sans">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white pt-16 pb-8 text-xs border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16">
            
            <div className="md:col-span-5 space-y-4 text-left">
              <div className="flex items-center gap-2">
                <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-6 h-6 object-contain" />
                <span className="text-base font-bold uppercase tracking-wider font-sans text-white">
                  Sanddock
                </span>
              </div>
              <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
                AI signals. Honest track record.
              </p>
              <div className="flex gap-4 pt-2 text-[10px] font-bold uppercase tracking-wider">
                <a href="https://x.com/sanddockcom" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">Twitter/X</a>
                <a href="https://t.me/sanddockcom" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">Telegram</a>
                <a href="https://www.youtube.com/@SandDock" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">YouTube</a>
                <a href="https://www.instagram.com/sanddockcom/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">Instagram</a>
              </div>
            </div>

            <div className="md:col-span-7 grid grid-cols-3 gap-8 text-left">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Product</h4>
                <ul className="space-y-2 text-zinc-400 text-[11px] font-medium uppercase tracking-wider font-sans">
                  <li><a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="/#track-record" className="hover:text-white transition-colors">Track Record</a></li>
                  <li><a href="#blog" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#changelog" className="hover:text-white transition-colors">Changelog</a></li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Support</h4>
                <ul className="space-y-2 text-zinc-400 text-[11px] font-medium uppercase tracking-wider font-sans">
                  <li><a href="/#faq" className="hover:text-white transition-colors">FAQ</a></li>
                  <li><a href="#docs" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
                  <li><a href="https://t.me/sanddockcom" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram Community</a></li>
                  <li><a href="#affiliates" className="hover:text-white transition-colors">Affiliate Program</a></li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Legal</h4>
                <ul className="space-y-2 text-zinc-400 text-[11px] font-medium uppercase tracking-wider font-sans">
                  <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#disclaimer" className="hover:text-white transition-colors">Disclaimer</a></li>
                  <li><a href="#cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </div>

          </div>

          <div className="border-t border-zinc-800 pt-8 text-center text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} Sanddock. Not financial advice. All signals are for educational purposes only. Past performance does not indicate future results.
          </div>
        </div>
      </footer>

      {/* POPUP MODAL GATE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-md bg-white border border-black rounded-none p-8 shadow-2xl space-y-6 z-10 text-left">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-black hover:text-brand-orange text-xl font-bold font-mono"
            >
              &times;
            </button>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider font-mono">SANDDOCK GATEWAY</span>
              <h3 className="text-2xl font-extrabold uppercase tracking-tight text-black font-sans">{modalContent.title}</h3>
              <p className="text-text-secondary text-base leading-relaxed normal-case font-sans">
                {modalContent.body}
              </p>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-black uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                className="w-full bg-[#f4f6fa] border border-black rounded-none px-4 py-3 text-sm text-black focus:outline-none focus:border-brand-orange font-mono"
              />
            </div>
            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 bg-black hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest transition-colors rounded-none"
              >
                Proceed &rarr;
              </button>
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-3 border border-black bg-white hover:bg-[#f4f6fa] text-xs font-bold text-black uppercase tracking-widest transition-colors rounded-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
