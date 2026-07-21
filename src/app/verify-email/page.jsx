'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmailPage() {
  const { resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [resendTimeLimit, setResendTimeLimit] = useState(0);
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    // Recover pending email address
    const pendingEmail = localStorage.getItem('sanddock_pending_verification');
    if (pendingEmail) {
      setEmail(pendingEmail);
    } else {
      // Fallback
      setEmail('your email address');
    }
  }, []);

  useEffect(() => {
    let timer;
    if (resendTimeLimit > 0) {
      timer = setInterval(() => {
        setResendTimeLimit((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimeLimit]);

  const handleResend = async () => {
    if (resendTimeLimit > 0) return;
    setResendStatus('');
    try {
      await resendVerification(email);
      setResendStatus('Verification email sent! Check your inbox.');
      setResendTimeLimit(60); // 60 seconds throttle
    } catch (err) {
      setResendStatus(err.message || 'Error resending verification email.');
    }
  };

  return (
    <div className="relative min-h-screen bg-surface-0 text-ink mesh-glow grain flex flex-col justify-center items-center px-6 py-12 overflow-hidden">
      <div className="grid-lines" />

      {/* Brand header */}
      <div className="relative z-10 mb-8 flex flex-col items-center">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 border border-white/10 mb-6">
          <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-6 h-6 object-contain" />
        </span>
        <h1 className="text-[34px] font-semibold tracking-tight text-gradient text-center leading-none">
          Verify your email
        </h1>
        <p className="text-ink-2 text-[15px] mt-3 text-center max-w-sm">
          We sent a verification link to your registered inbox.
        </p>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md card p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/25 to-accent-2/15 border border-white/10 text-accent-soft flex items-center justify-center mx-auto">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="space-y-2">
          <p className="text-[14px] text-ink-2 leading-relaxed">
            Please click the activation link in the email sent to:
          </p>
          <p className="text-[16px] font-semibold text-ink break-all">{email}</p>
        </div>

        {resendStatus && (
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/25 text-accent-soft text-[13px] font-medium">
            {resendStatus}
          </div>
        )}

        <div className="pt-4 border-t border-white/8 flex flex-col gap-3">
          <button
            onClick={handleResend}
            disabled={resendTimeLimit > 0}
            className="btn-form-outline"
          >
            {resendTimeLimit > 0 ? `Resend available in ${resendTimeLimit}s` : 'Resend email'}
          </button>

          <a href="/login" className="btn-form">
            Return to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
