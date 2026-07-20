'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const { resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [resendTimeLimit, setResendTimeLimit] = useState(0);
  const [resendStatus, setResendStatus] = useState('');
  const router = useRouter();

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
    <div className="min-h-screen bg-white text-black flex flex-col justify-center items-center px-6 py-12 selection:bg-brand-orange selection:text-white font-satoshi">
      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center">
        <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain mb-6" />
        <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-center">
          Verify Your Email
        </h1>
        <p className="text-text-secondary text-sm md:text-base mt-2 text-center max-w-sm">
          We sent a verification link to your registered inbox.
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md border border-black bg-white p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center space-y-6">
        <div className="w-16 h-16 bg-[#f4f6fa] border border-black flex items-center justify-center mx-auto rounded-none">
          <span className="text-2xl">📧</span>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-text-secondary leading-relaxed">
            Please click the activation link in the email sent to:
          </p>
          <p className="text-base font-bold font-satoshi text-black break-all">
            {email}
          </p>
        </div>

        {resendStatus && (
          <div className="p-3 bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-semibold uppercase tracking-wider font-satoshi">
            {resendStatus}
          </div>
        )}

        <div className="pt-4 border-t border-black/10 flex flex-col gap-3">
          <button
            onClick={handleResend}
            disabled={resendTimeLimit > 0}
            className={`w-full py-3.5 font-bold text-xs uppercase tracking-widest transition-colors rounded-none cursor-pointer border ${
              resendTimeLimit > 0
                ? 'bg-[#f4f6fa] border-black/20 text-text-muted cursor-not-allowed'
                : 'bg-white border-black text-black hover:bg-black hover:text-white'
            }`}
          >
            {resendTimeLimit > 0 ? `Resend Available in ${resendTimeLimit}s` : 'Resend Email'}
          </button>

          <a
            href="/login"
            className="w-full py-3.5 bg-black hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest text-center transition-colors rounded-none block"
          >
            Return to Sign In &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
