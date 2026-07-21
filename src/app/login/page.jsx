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
  const [trade, setTrade] = useState({
    result: '+5.2%',
    entry: '$66,850.00',
    exit: '$70,320.00',
    pair: 'BTC/USDT'
  });
  const router = useRouter();

  // Fetch recent high PnL trade
  useEffect(() => {
    const fetchRecentTrade = async () => {
      try {
        const response = await fetch('/api/closed-signals?limit=1');
        const data = await response.json();
        if (data.signals && data.signals.length > 0) {
          const topTrade = data.signals[0];
          setTrade({
            result: topTrade.result,
            entry: topTrade.entry,
            exit: topTrade.exit,
            pair: topTrade.pair
          });
        }
      } catch (err) {
        console.error('Failed to fetch recent trade:', err);
      }
    };

    fetchRecentTrade();
    // Refresh every 24 hours (86400000 ms)
    const interval = setInterval(fetchRecentTrade, 86400000);
    return () => clearInterval(interval);
  }, []);

  // Redirect to terminal if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/terminal');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-0 text-ink flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-10 h-10 animate-pulse object-contain" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3 animate-pulse">
            Loading
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
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-surface-0 text-ink grid grid-cols-1 lg:grid-cols-2">

      {/* Left Column: Product Branding & Live Open Signal Card Mockup (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-surface-1 mesh-glow grain p-10 border-r border-line relative overflow-hidden h-full">
        <div className="grid-lines" />

        {/* Top: Logo */}
        <a href="/" className="relative z-10 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-5 h-5 object-contain" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-ink">Sanddock</span>
        </a>

        {/* Center: Open Signal Card Mockup */}
        <div className="space-y-6 max-w-lg relative z-10 text-left my-auto w-full">
          <div className="space-y-2.5">
            <h2 className="font-instrument-serif text-[#b4c0ff] text-2xl leading-[1.1]">
              Real-time swing detection.
            </h2>
            <p className="text-ink-2 text-[15px] leading-relaxed">
              Live trade setups calculated by AI models.
            </p>
          </div>

          {/* Recent High PnL Trade Card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="chip !border-up/28 !bg-up/12 !text-up">
                <span className="w-1.5 h-1.5 rounded-full bg-up" />
                Closed trade {trade.result}
              </span>
              <span className="text-[11px] text-ink-3">{trade.pair} (30m HA)</span>
            </div>

            <div className="grid grid-cols-3 gap-3 border-y border-white/8 py-3 text-left">
              <div>
                <span className="block text-[10px] text-ink-3 font-semibold uppercase tracking-wider mb-1">Entry</span>
                <span className="text-[13px] font-semibold text-ink">{trade.entry}</span>
              </div>
              <div>
                <span className="block text-[10px] text-ink-3 font-semibold uppercase tracking-wider mb-1">Exit</span>
                <span className="text-[13px] font-semibold text-ink">{trade.exit}</span>
              </div>
              <div>
                <span className="block text-[10px] text-ink-3 font-semibold uppercase tracking-wider mb-1">Return</span>
                <span className="text-[13px] font-semibold text-up">{trade.result} PnL</span>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-up">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Profit target hit
              </span>
              <p className="text-[12.5px] text-ink-2 leading-relaxed">
                &ldquo;{trade.pair} signal executed with clean entry and exit. Trade closed at profit
                target level with {trade.result} verified gain.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Legal disclaimer */}
        <div className="relative z-10 pt-4 border-t border-white/8 text-[11px] text-ink-3 leading-relaxed">
          Signals are for educational purposes only — not financial advice. Past signals do not
          guarantee future results.
        </div>
      </div>

      {/* Right Column: Log In Form */}
      <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-12 bg-surface-0 relative h-full overflow-y-auto">
        <div className="flex justify-center mb-4 lg:hidden">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-semibold tracking-tight text-ink">Sanddock</span>
          </a>
        </div>

        <div className="my-auto max-w-md w-full mx-auto space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-[32px] font-semibold tracking-tight text-gradient leading-none">
              Welcome back
            </h1>
            <p className="text-ink-2 text-[14px]">
              Log in to access your live crypto swing signal dashboard.
            </p>
          </div>

          <div className="card p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-down/10 border border-down/25 text-down text-[13px] font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  required
                />
              </div>

              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field pr-14"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-4 flex items-center text-[11px] font-semibold text-ink-3 hover:text-ink transition-colors cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-form">
                {loading ? 'Logging in…' : 'Sign in'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="flex-1 border-b border-white/8" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">or</span>
              <span className="flex-1 border-b border-white/8" />
            </div>

            <button type="button" onClick={handleGoogleSignIn} className="btn-form-outline">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.18 4.113-3.415 0-6.19-2.775-6.19-6.19 0-3.415 2.775-6.19 6.19-6.19 1.483 0 2.836.52 3.9 1.39l3.056-3.056C18.232 2.066 15.383 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 10.74-4.537 10.74-10.925 0-.74-.067-1.428-.186-2.27H12.24z" />
              </svg>
              Continue with Google
            </button>

            <div className="pt-5 mt-5 border-t border-white/8 text-center text-[13px] text-ink-2">
              Don&apos;t have an account?{' '}
              <a href="/signup" className="font-semibold text-accent-soft hover:text-ink transition-colors">
                Start free
              </a>
            </div>
          </div>
        </div>

        {/* Mobile disclaimer */}
        <div className="lg:hidden mt-8 text-[11px] text-ink-3 leading-relaxed text-center">
          Signals are for educational purposes only — not financial advice. Past signals do not
          guarantee future results.
        </div>
      </div>

    </div>
  );
}
