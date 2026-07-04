'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const { signUpWithEmail, signInWithGoogle, user, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Redirect to terminal if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/terminal');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-12 h-12 animate-pulse object-contain" />
          <span className="text-xs font-bold uppercase tracking-widest font-mono text-zinc-500 animate-pulse">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await signUpWithEmail(email, password, name);
      // Store pending email for display in verify-email
      localStorage.setItem('sanddock_pending_verification', email);
      router.push('/verify-email');
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setErrorMsg('');
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred with Google Sign-in.');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-white text-black grid grid-cols-1 lg:grid-cols-2 selection:bg-brand-orange selection:text-white">
      
      {/* Left Column: Product Branding & Features (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-black text-white p-10 border-r border-black relative overflow-hidden h-full">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-orange/10 to-transparent pointer-events-none" />
        
        {/* Top: Logo */}
        <div className="relative z-10">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-extrabold tracking-tighter uppercase font-mono text-white">
              Sanddock
            </span>
          </a>
        </div>

        {/* Center: Hero Branding & Feature list */}
        <div className="space-y-8 max-w-lg relative z-10 text-left my-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-white leading-none">
            Your next trade<br />deserves <span className="text-brand-orange">a reason.</span>
          </h2>
          
          <ul className="space-y-4 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <li className="flex items-start gap-3">
              <span className="text-[#00e676] text-base">&#x2713;</span>
              <span>Every signal comes with a plain-English AI reason</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#00e676] text-base">&#x2713;</span>
              <span>Entry, Stop Loss, and Take Profit calculated automatically</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#00e676] text-base">&#x2713;</span>
              <span>Alerts go straight to Telegram</span>
            </li>
          </ul>

          {/* Testimonial Quote */}
          <div className="pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-400 italic font-sans normal-case font-normal leading-relaxed">
              &ldquo;The AI rationale changes everything. I don&apos;t just blindly follow calls anymore - I understand the market structure behind each swing.&rdquo;
            </p>
            <span className="block text-[9px] font-bold text-brand-orange uppercase tracking-wider mt-2 font-mono">
              - Verified Trader
            </span>
          </div>
        </div>

        {/* Bottom: Legal Disclaimer */}
        <div className="relative z-10 pt-4 border-t border-zinc-900 text-[9px] text-zinc-500 uppercase font-bold tracking-wider leading-relaxed">
          Signals are for educational purposes only - not financial advice. Past signals do not guarantee future results.
        </div>
      </div>

      {/* Right Column: Sign Up Form Card */}
      <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-12 bg-white relative h-full overflow-y-auto">
        {/* Top logo for both desktop & mobile */}
        <div className="flex justify-center mb-4">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-extrabold tracking-tighter uppercase font-sans text-black">
              Sanddock
            </span>
          </a>
        </div>

        <div className="my-auto max-w-md w-full mx-auto space-y-4">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black leading-none">
              Create your free account
            </h1>
            <p className="text-text-secondary text-xs">
              Start with Bitcoin signals. No credit card required.
            </p>
          </div>

          {/* Main Card border wrapper */}
          <div className="border border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <form onSubmit={handleSignup} className="space-y-4">
              {errorMsg && (
                <div className="p-2.5 bg-signal-sell/10 border border-signal-sell/20 text-signal-sell text-xs font-semibold uppercase tracking-wider font-mono">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="space-y-0.5 text-left">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-black">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Alex Honnold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-black rounded-none px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-brand-orange font-mono"
                  required
                />
              </div>

              <div className="space-y-0.5 text-left">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-black">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-black rounded-none px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-brand-orange font-mono"
                  required
                />
              </div>

              <div className="space-y-0.5 text-left relative">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-black">
                  Password (8+ Characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#f4f6fa] border border-black rounded-none px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-brand-orange font-mono pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-black font-mono cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-black hover:bg-brand-orange text-white hover:text-white font-bold text-xs uppercase tracking-widest transition-colors border border-black cursor-pointer rounded-none"
              >
                {loading ? 'Registering...' : 'Create Account →'}
              </button>
            </form>

            <div className="my-4 flex items-center justify-between">
              <span className="w-1/5 border-b border-black/10" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">or</span>
              <span className="w-1/5 border-b border-black/10" />
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 border border-black hover:bg-[#f4f6fa] font-bold text-xs uppercase tracking-widest transition-colors rounded-none flex items-center justify-center gap-2 cursor-pointer bg-white"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.18 4.113-3.415 0-6.19-2.775-6.19-6.19 0-3.415 2.775-6.19 6.19-6.19 1.483 0 2.836.52 3.9 1.39l3.056-3.056C18.232 2.066 15.383 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 10.74-4.537 10.74-10.925 0-.74-.067-1.428-.186-2.27H12.24z" />
              </svg>
              Continue with Google
            </button>

            {/* Redirect link placed inside the card to prevent overflow/scrolling */}
            <div className="pt-4 mt-4 border-t border-black/10 text-center text-xs font-bold uppercase tracking-wider">
              Already have an account?{' '}
              <a href="/login" className="text-brand-orange hover:text-brand-orange-hover transition-colors">
                Login &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Mobile Disclaimer */}
        <div className="lg:hidden mt-8 text-[9px] text-zinc-500 uppercase font-bold tracking-wider leading-relaxed text-center">
          Signals are for educational purposes only - not financial advice. Past signals do not guarantee future results.
        </div>
      </div>

    </div>
  );
}
