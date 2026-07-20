'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle, user, loading: authLoading } = useAuth();
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
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-satoshi">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-12 h-12 animate-pulse object-contain" />
          <span className="text-xs font-bold uppercase tracking-widest font-satoshi text-black animate-pulse">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await signInWithEmail(email, password);
      router.push('/terminal');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password.');
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
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-white text-black grid grid-cols-1 lg:grid-cols-2 selection:bg-brand-orange selection:text-white font-satoshi">
      
      {/* Left Column: Product Branding & Live Open Signal Card Mockup (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-black text-white p-10 border-r border-black relative overflow-hidden h-full">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-orange/10 to-transparent pointer-events-none" />
        
        {/* Top: Logo */}
        <div className="relative z-10">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-extrabold tracking-tighter uppercase font-satoshi text-black">
              Sanddock
            </span>
          </a>
        </div>

        {/* Center: Open Signal Card Mockup */}
        <div className="space-y-6 max-w-lg relative z-10 text-left my-auto w-full">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-black leading-none">
              Real-time<br />swing detection.
            </h2>
            <p className="text-black text-xs uppercase tracking-wider font-semibold">
              Live trade setups calculated by AI models.
            </p>
          </div>

          {/* Open Signal Mockup Card */}
          <div className="bg-[#111] border border-zinc-800 p-5 space-y-3 rounded-none relative">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-satoshi">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Setup Open
              </span>
              <span className="text-[9px] font-satoshi text-white uppercase">BTC/USDT (15m HA)</span>
            </div>

            <div className="grid grid-cols-3 gap-3 border-y border-zinc-900 py-2.5 text-left">
              <div>
                <span className="block text-[7px] text-white font-bold uppercase tracking-widest">Entry Target</span>
                <span className="font-satoshi text-xs font-bold text-white">$67,420.00</span>
              </div>
              <div>
                <span className="block text-[7px] text-white font-bold uppercase tracking-widest">Stop Loss</span>
                <span className="font-satoshi text-xs font-bold text-white">$66,850.00</span>
              </div>
              <div>
                <span className="block text-[7px] text-white font-bold uppercase tracking-widest">Take Profit</span>
                <span className="font-satoshi text-xs font-bold text-[#00e676]">$69,200.00</span>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold bg-brand-orange text-white px-1.5 py-0.5 uppercase tracking-widest font-satoshi">AI Rating</span>
                <span className="font-satoshi text-xs font-bold text-white">87% Confidence</span>
              </div>
              <p className="text-[11px] text-white font-satoshi leading-relaxed normal-case">
                &ldquo;BTC swing bottom confirmed on Heikin Ashi candles. Spot volume shows strong absorption at local support levels. Proceeding with alternating swing structure.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Legal Disclaimer */}
        <div className="relative z-10 pt-4 border-t border-zinc-900 text-[9px] text-white uppercase font-bold tracking-wider leading-relaxed">
          Signals are for educational purposes only - not financial advice. Past signals do not guarantee future results.
        </div>
      </div>

      {/* Right Column: Log In Form Card */}
      <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-12 bg-white relative h-full overflow-y-auto">
        {/* Top logo for both desktop & mobile */}
        <div className="flex justify-center mb-4">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-extrabold tracking-tighter uppercase font-satoshi text-black">
              Sanddock
            </span>
          </a>
        </div>

        <div className="my-auto max-w-md w-full mx-auto space-y-4">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black leading-none">
              Welcome Back
            </h1>
            <p className="text-text-secondary text-xs">
              Log in to access your live crypto swing signal dashboard.
            </p>
          </div>

          {/* Main Card border wrapper */}
          <div className="border border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-2.5 bg-signal-sell/10 border border-signal-sell/20 text-signal-sell text-xs font-semibold uppercase tracking-wider font-satoshi">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="space-y-0.5 text-left">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-black">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f4f6fa] border border-black rounded-none px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-brand-orange font-satoshi"
                  required
                />
              </div>

              <div className="space-y-0.5 text-left relative">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-black">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#f4f6fa] border border-black rounded-none px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-brand-orange font-satoshi pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-black font-satoshi cursor-pointer"
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
                {loading ? 'Logging in...' : 'Sign In →'}
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

            {/* Redirect link placed inside the card */}
            <div className="pt-4 mt-4 border-t border-black/10 text-center text-xs font-bold uppercase tracking-wider">
              Don&apos;t have an account?{' '}
              <a href="/signup" className="text-brand-orange hover:text-brand-orange-hover transition-colors">
                Start Free &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Mobile Disclaimer */}
        <div className="lg:hidden mt-8 text-[9px] text-white uppercase font-bold tracking-wider leading-relaxed text-center">
          Signals are for educational purposes only - not financial advice. Past signals do not guarantee future results.
        </div>
      </div>

    </div>
  );
}
