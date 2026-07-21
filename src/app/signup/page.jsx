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
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-surface-0 text-ink grid grid-cols-1 lg:grid-cols-2">

      {/* Left Column: Product Branding & Features (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-surface-1 mesh-glow grain p-10 border-r border-line relative overflow-hidden h-full">
        <div className="grid-lines" />

        {/* Top: Logo */}
        <a href="/" className="relative z-10 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-5 h-5 object-contain" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-ink">Sanddock</span>
        </a>

        {/* Center: Hero branding & feature list */}
        <div className="space-y-8 max-w-lg relative z-10 text-left my-auto">
          <h2 className="font-instrument-serif text-[#b4c0ff] text-2xl sm:text-3xl leading-[1.15]">
            Signals backed by <span className="text-gradient-accent">verified results.</span>
          </h2>

          <ul className="space-y-4 text-[14px] text-ink-2">
            {[
              '80% verified win rate across 6,500+ signals',
              'Automated entry, stop loss, and take profit levels',
              'Real-time Telegram alerts. Trade within seconds',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md bg-up/15 border border-up/25 text-up flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="pt-6 border-t border-white/8">
            <p className="text-[13.5px] text-ink-2 italic leading-relaxed">
              &ldquo;Three trades this week. All three hit profit targets. This is the first signal
              tool that actually delivers results.&rdquo;
            </p>
            <span className="block text-[11px] font-semibold text-accent-soft mt-2">
              — Verified trader
            </span>
          </div>
        </div>

        {/* Bottom: Legal disclaimer */}
        <div className="relative z-10 pt-4 border-t border-white/8 text-[11px] text-ink-3 leading-relaxed">
          Signals are for educational purposes only — not financial advice. Past signals do not
          guarantee future results.
        </div>
      </div>

      {/* Right Column: Sign Up Form */}
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
              Create your free account
            </h1>
            <p className="text-ink-2 text-[14px]">
              Start with Bitcoin signals. No credit card required.
            </p>
          </div>

          <div className="card p-6">
            <form onSubmit={handleSignup} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-down/10 border border-down/25 text-down text-[13px] font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  placeholder="Alex Honnold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field"
                  required
                />
              </div>

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
                <label className="field-label">Password (8+ characters)</label>
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
                {loading ? 'Registering…' : 'Create account'}
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
              Already have an account?{' '}
              <a href="/login" className="font-semibold text-accent-soft hover:text-ink transition-colors">
                Login
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
