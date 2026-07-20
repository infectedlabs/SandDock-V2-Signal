'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function ArticleRenderer({ article, category }) {
  const { frontmatter, html, headings, slug } = article;
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [renderedHtml, setRenderedHtml] = useState(html);
  const [stats, setStats] = useState(null);

  // 1. Reading progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Active heading highlighting on scroll
  useEffect(() => {
    const headingElements = headings.map(h => document.getElementById(h.id)).filter(Boolean);
    
    const handleIntersection = () => {
      const scrollPos = window.scrollY + 120; // offset for top header
      let currentActiveId = '';

      for (let i = 0; i < headingElements.length; i++) {
        const el = headingElements[i];
        if (el.offsetTop <= scrollPos) {
          currentActiveId = el.id;
        } else {
          break;
        }
      }

      if (!currentActiveId && headingElements.length > 0) {
        currentActiveId = headingElements[0].id;
      }
      
      setActiveHeadingId(currentActiveId);
    };

    window.addEventListener('scroll', handleIntersection);
    // Initial call
    handleIntersection();
    return () => window.removeEventListener('scroll', handleIntersection);
  }, [headings]);

  // 3. Dynamic stats hydration for the transparency track-record page
  useEffect(() => {
    const isTrackRecordPage = slug?.includes('public-track-record-transparency');
    if (isTrackRecordPage) {
      fetch('/api/performance/summary?symbol=BTCUSDT')
        .then(res => res.json())
        .then(data => {
          setStats(data);
          if (data && data.total_signals) {
            let updated = html;
            updated = updated.replace(
              /\[live signal count - pulled dynamically from the signals database\]/g,
              `<span class="font-mono font-bold text-[#ff5722] bg-[#ff5722]/5 px-1.5 py-0.5 rounded border border-[#ff5722]/20">${data.total_signals}</span>`
            );
            
            const winRateText = data.win_rate_pct 
              ? `${data.wins} wins and ${data.losses} losses (${data.win_rate_pct}% win rate)` 
              : `${data.wins} wins and ${data.losses} losses`;
            
            updated = updated.replace(
              /\[live win\/loss breakdown - pulled dynamically\]/g,
              `<span class="font-mono font-bold text-black bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">${winRateText}</span>`
            );
            setRenderedHtml(updated);
          }
        })
        .catch(err => {
          console.warn('[ArticleRenderer] Failed to load dynamic performance stats:', err);
        });
    }
  }, [html, slug]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-black selection:bg-brand-orange selection:text-white overflow-x-hidden font-sans">
      
      {/* Dynamic Reading Progress Bar */}
      <div 
        className="fixed top-16 left-0 h-1 bg-[#ff5722] z-50 transition-all duration-100 ease-out" 
        style={{ width: `${scrollProgress}%` }} 
      />

      {/* HEADER / NAVIGATION BAR (SWISS STYLE) */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          
          {/* Logo container block with right border */}
          <div className="flex items-center px-6 h-16 border-r border-black relative">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" onError={(e) => { e.target.src = 'https://placehold.co/32x32/orange/white?text=S' }} />
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
            <a href="/learn" className={`px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors ${category === 'learn' ? 'bg-zinc-100 text-[#ff5722]' : 'text-black'}`}>Learn</a>
            <a href="/compare" className={`px-6 h-full flex items-center border-r border-black hover:bg-black hover:text-white transition-colors ${category === 'compare' || category === 'alternatives' ? 'bg-zinc-100 text-[#ff5722]' : 'text-black'}`}>Compare</a>
          </nav>

          {/* Action button container on right with left border */}
          <div className="flex items-center h-16 border-l border-black relative">
            <a 
              href="/signup"
              className="px-6 h-full font-bold text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center"
            >
              Start Free &rarr;
            </a>
            {/* Diamond point marker */}
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
          </div>

        </div>
      </header>

      {/* Hero Header */}
      <section className="border-b border-black bg-zinc-50 py-12 md:py-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ff5722] mb-4">
            <a href="/" className="hover:underline">Home</a>
            <span>/</span>
            <a href={`/${category}`} className="hover:underline">{category}</a>
            <span>/</span>
            <span className="text-white font-medium truncate max-w-[200px] md:max-w-none">{frontmatter.title}</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold font-sans tracking-tight text-black leading-tight max-w-5xl">
            {frontmatter.title}
          </h1>

          <p className="mt-6 text-lg md:text-xl text-white max-w-3xl font-medium leading-relaxed">
            {frontmatter.meta_description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-y-4 gap-x-8 text-xs font-mono text-white border-t border-zinc-200 pt-6">
            <div>
              <span className="uppercase text-white">Written by:</span>
              <span className="ml-2 font-bold text-black">{frontmatter.author || 'Sanddock Research Team'}</span>
            </div>
            <div>
              <span className="uppercase text-white">Last updated:</span>
              <span className="ml-2 font-bold text-black">{formatDate(frontmatter.last_updated)}</span>
            </div>
            {frontmatter.target_keyword && (
              <div>
                <span className="uppercase text-white">Topic Focus:</span>
                <span className="ml-2 bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded uppercase text-[10px] font-bold tracking-wider">{frontmatter.target_keyword}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid Section */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative">
          
          {/* LEFT COLUMN: Table of Contents (Sticky on Desktop) */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 border border-black p-6 rounded-lg bg-zinc-50">
              <h4 className="font-mono text-xs uppercase tracking-wider text-black font-bold border-b border-black pb-3 mb-4 flex items-center justify-between">
                <span>Table of Contents</span>
                <span className="text-[#ff5722]">&sect;</span>
              </h4>
              {headings.length > 0 ? (
                <ul className="space-y-3 text-sm">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a 
                        href={`#${heading.id}`}
                        className={`block transition-colors duration-150 leading-snug hover:text-[#ff5722] ${
                          activeHeadingId === heading.id 
                            ? 'text-[#ff5722] font-bold pl-2 border-l-2 border-[#ff5722]' 
                            : 'text-white pl-0 border-l-0'
                        }`}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white text-xs italic">No sections found in this article.</p>
              )}
            </div>
          </aside>

          {/* MIDDLE COLUMN: Article Content */}
          <article className="lg:col-span-6 order-1 lg:order-2">
            <div 
              className="prose prose-zinc max-w-none prose-headings:font-sans prose-a:text-[#ff5722] prose-strong:font-bold prose-table:my-6"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />

            {/* Disclaimer block (E-E-A-T trust signal) */}
            <div className="mt-16 p-6 border border-zinc-200 rounded-lg bg-zinc-50 text-xs text-white space-y-2 leading-relaxed">
              <p className="font-mono font-bold uppercase tracking-wider text-zinc-700">⚠️ Risk Warning & Disclaimer</p>
              <p>
                Trading cryptocurrencies involves substantial risk and can result in the loss of your capital. The information provided in this article, including technical indicators, charts, formulas, and signals, is for educational and informational purposes only. It does not constitute investment advice, financial advice, trading advice, or any other sort of advice.
              </p>
              <p>
                Sanddock does not recommend that any cryptocurrency should be bought, sold, or held by you. Conduct your own due diligence and consult your financial advisor before making any investment decisions. Historical performance is not indicative of future results.
              </p>
            </div>
          </article>

          {/* RIGHT COLUMN: Conversion CTA Card (Sticky on Desktop) */}
          <aside className="lg:col-span-3 order-3">
            <div className="sticky top-24 space-y-6">
              
              {/* Main Conversion CTA Block */}
              <div className="border border-black p-6 rounded-lg bg-white relative overflow-hidden group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#ff5722]/10 rounded-bl-full flex items-center justify-center text-[#ff5722] font-mono text-xl font-bold group-hover:scale-110 transition-transform duration-200">
                  ⚡
                </div>
                <h4 className="font-sans font-bold text-lg text-black uppercase tracking-tight mb-2">
                  Are You Trading Blind?
                </h4>
                <p className="text-white text-sm leading-relaxed mb-6">
                  Get real-time, Heikin Ashi-smooth swing signals for Bitcoin with full plain-English AI explanations.
                </p>
                <div className="space-y-3 font-mono text-[11px] text-white mb-6 bg-zinc-50 p-3 rounded border border-zinc-200">
                  <div className="flex justify-between">
                    <span>Active pair:</span>
                    <span className="font-bold text-black">BTC/USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updates:</span>
                    <span className="font-bold text-black">Every 15 Seconds</span>
                  </div>
                  {stats && (
                    <div className="flex justify-between border-t border-zinc-200 pt-1.5 mt-1.5">
                      <span>Live signals count:</span>
                      <span className="font-bold text-[#ff5722]">{stats.total_signals}</span>
                    </div>
                  )}
                </div>
                <a 
                  href="/signup" 
                  className="block w-full py-3 bg-[#ff5722] hover:bg-[#e64a19] text-white font-bold text-center text-xs uppercase tracking-widest rounded transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
                >
                  Start Free Signals &rarr;
                </a>
                <p className="text-[10px] text-white text-center mt-3 font-medium">
                  Free plan includes BTC. No card required.
                </p>
              </div>

              {/* Differentiator trust badge */}
              <div className="border border-zinc-200 p-5 rounded-lg bg-zinc-50/50 text-xs text-white space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <div>
                    <span className="font-bold text-black block mb-0.5">Radical Transparency</span>
                    Every win and every loss is recorded publicly.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <div>
                    <span className="font-bold text-black block mb-0.5">No Bot Complexity</span>
                    Receive alerts, understand the reason, and execute manually.
                  </div>
                </div>
              </div>

            </div>
          </aside>

        </div>
      </main>

      {/* Footer Section */}
      <footer className="border-t border-black bg-zinc-50 py-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-6 h-6 object-contain" onError={(e) => { e.target.src = 'https://placehold.co/24x24/orange/white?text=S' }} />
            <span className="text-sm font-bold tracking-tighter uppercase font-sans text-black">
              Sanddock &copy; 2026
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-white">
            <a href="/" className="hover:text-black">Home</a>
            <a href="/pricing" className="hover:text-black">Pricing</a>
            <a href="/learn" className="hover:text-black">Learn</a>
            <a href="/compare" className="hover:text-black">Compare</a>
            <a href="/#faq" className="hover:text-black">FAQ</a>
            <a href="/contact" className="hover:text-black">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
