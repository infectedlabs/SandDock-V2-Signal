"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

function ApplyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const initialPlan = searchParams.get("plan") || "";

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telegram: "",
    country: "",
    experience: "",
    capital: "",
    exchanges: "",
    currentServices: "",
    currentServicesExperience: "",
    plan: initialPlan,
    goal: "",
    howYouFoundUs: "",
    riskManagement: "",
  });

  // Form steps - one question per step
  const steps = [
    {
      title: "What's your name?",
      fields: ["name"],
      type: "text",
      placeholder: "e.g., Alex Rivera",
    },
    {
      title: "What's your email?",
      fields: ["email"],
      type: "email",
      placeholder: "alex@example.com",
    },
    {
      title: "Telegram handle (optional)",
      fields: ["telegram"],
      type: "text",
      placeholder: "@alexrivera",
      optional: true,
    },
    {
      title: "Country of residence",
      fields: ["country"],
      type: "text",
      placeholder: "United States",
    },
    {
      title: "How long have you been trading crypto?",
      fields: ["experience"],
      type: "select",
      options: [
        { value: "under-6m", label: "Under 6 months" },
        { value: "6-24m", label: "6–24 months" },
        { value: "2plus-years", label: "2+ years" },
      ],
    },
    {
      title: "What's your approximate trading capital?",
      fields: ["capital"],
      type: "select",
      options: [
        { value: "under-1k", label: "Under $1,000" },
        { value: "1k-10k", label: "$1,000–$10,000" },
        { value: "10k-50k", label: "$10,000–$50,000" },
        { value: "50k-plus", label: "$50,000+" },
      ],
    },
    {
      title: "Which exchanges do you primarily use?",
      fields: ["exchanges"],
      type: "text",
      placeholder: "Binance, Kraken, Coinbase",
      optional: true,
    },
    {
      title: "Do you currently use any signal services?",
      fields: ["currentServices"],
      type: "text",
      placeholder: "TradingView alerts, CryptoBros Discord",
      optional: true,
      dependsOn: formData.currentServices ? [
        {
          title: "What's your experience with them?",
          fields: ["currentServicesExperience"],
          type: "textarea",
          placeholder: "Good signals but too much noise and false alarms",
        },
      ] : [],
    },
    {
      title: "Which plan are you applying for?",
      fields: ["plan"],
      type: "select",
      options: [
        { value: "pro", label: "Pro (BTC, ETH, BNB)" },
        { value: "master", label: "Master (All 15 coins)" },
        { value: "grandmaster", label: "Grandmaster (Lifetime)" },
      ],
    },
    {
      title: "What's your primary goal with Sanddock?",
      fields: ["goal"],
      type: "textarea",
      placeholder: "I want to improve my entry points and reduce false trades. Looking for high-conviction signals with clear risk management rules.",
    },
    {
      title: "How did you find out about Sanddock?",
      fields: ["howYouFoundUs"],
      type: "text",
      placeholder: "Twitter recommendation from a trader I follow",
      optional: true,
    },
    {
      title: "What is your risk management approach per trade?",
      subtitle: "This is the real question. It tells us everything we need to know.",
      fields: ["riskManagement"],
      type: "textarea",
      placeholder: "I typically risk 1–2% of my capital per trade with a pre-set stop loss placed at a technical level. I calculate position size based on the distance to my stop loss and never move it to a worse price. If I lose 2 trades in a row, I step back and reassess.",
    },
  ];

  const currentStepData = steps[currentStep];
  const totalSteps = steps.length;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSubmitError("");
  };

  const validateStep = () => {
    for (const field of currentStepData.fields) {
      const value = formData[field];
      if (!currentStepData.optional && (!value || value.trim() === "")) {
        setSubmitError(`Please answer this question to continue`);
        return false;
      }
      if (field === "email" && value && !value.includes("@")) {
        setSubmitError("Please enter a valid email address");
        return false;
      }
      if (field === "goal" && value && value.trim().length < 10) {
        setSubmitError("Please provide at least 10 characters");
        return false;
      }
      if (field === "riskManagement" && value && value.trim().length < 20) {
        setSubmitError("Please provide more detail about your risk management");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep(currentStep + 1);
    setSubmitError("");
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
    setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      // Include user_id if user is logged in
      const dataToSubmit = {
        ...formData,
        ...(user && { user_id: user.id }),
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit application");
      }

      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Require login to submit application
  if (!user) {
    return (
      <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden">
        <Navbar />

        <div className="relative mesh-glow grain">
          <div className="grid-lines" />
          <div className="relative z-10 max-w-2xl mx-auto px-6 pt-36 pb-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/25 to-accent-2/15 border border-white/10 text-accent-soft flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-[38px] font-semibold tracking-tight text-gradient leading-none">
              Login required
            </h1>

            <div className="card p-8 mt-8 space-y-5 text-left">
              <p className="text-[14.5px] text-ink-2 leading-relaxed">
                To prevent spam and maintain application quality, you must be logged in to submit
                an application.
              </p>
              <p className="text-[13px] text-ink-3 leading-relaxed">
                This ensures we can properly review and contact you about your application.
              </p>

              <div className="flex gap-3 pt-2">
                <button onClick={() => router.push('/login')} className="btn-form flex-1">
                  Sign in
                </button>
                <button onClick={() => router.push('/signup')} className="btn-form-outline flex-1">
                  Create account
                </button>
              </div>

              <button onClick={() => router.push('/pricing')} className="btn-secondary w-full justify-center">
                Back to pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden">
        <Navbar />

        <div className="relative mesh-glow grain">
          <div className="grid-lines" />
          <div className="relative z-10 max-w-2xl mx-auto px-6 pt-36 pb-24">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-up/12 border border-up/25 text-up flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-[38px] font-semibold tracking-tight text-gradient leading-none">
                Application received
              </h1>
            </div>

            <div className="card p-8 space-y-6">
              <div className="space-y-2.5">
                <h2 className="text-[18px] font-semibold text-ink">What happens next?</h2>
                <p className="text-[14px] text-ink-2 leading-relaxed">
                  Thanks for applying! We&apos;ll review your application within 24 hours and send you
                  an email with our decision. Please check your spam folder to make sure you don&apos;t
                  miss it.
                </p>
              </div>

              <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 space-y-3">
                <h3 className="font-semibold text-[14px] text-amber-200">
                  Want to know more about pricing and application status?
                </h3>
                <p className="text-[13px] text-ink-2 leading-relaxed">
                  Contact us on Telegram for details about pricing, payment options, and to follow
                  up on your application.
                </p>
                <a
                  href="https://t.me/alexsanddockcom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-300 hover:text-amber-100 transition-colors"
                >
                  Contact @alexsanddockcom
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5" />
                  </svg>
                </a>
              </div>

              <button onClick={() => router.push('/terminal')} className="btn-form">
                Go back to terminal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-surface-0 text-ink overflow-hidden">
      <Navbar />

      <div className="relative mesh-glow-soft">
        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-28 pb-20">
          {/* Progress */}
          <div className="mb-10">
            <div className="flex items-center justify-between gap-6 mb-4">
              <h1 className="text-[26px] md:text-[32px] font-semibold tracking-tight text-gradient leading-tight">
                {currentStepData.title}
              </h1>
              <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>
            {currentStepData.subtitle && (
              <p className="text-[14px] text-ink-2 mb-4">{currentStepData.subtitle}</p>
            )}
            <div className="w-full bg-white/8 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {submitError && (
              <div className="p-4 rounded-xl bg-down/10 border border-down/25 text-down text-[13.5px] font-medium">
                {submitError}
              </div>
            )}

            <div className="card p-8">
              {currentStepData.type === "text" || currentStepData.type === "email" ? (
                <input
                  type={currentStepData.type}
                  name={currentStepData.fields[0]}
                  value={formData[currentStepData.fields[0]]}
                  onChange={handleChange}
                  placeholder={currentStepData.placeholder}
                  className="field !text-lg !py-3.5"
                />
              ) : currentStepData.type === "textarea" ? (
                <textarea
                  name={currentStepData.fields[0]}
                  value={formData[currentStepData.fields[0]]}
                  onChange={handleChange}
                  placeholder={currentStepData.placeholder}
                  rows="6"
                  className="field !text-base resize-none"
                />
              ) : currentStepData.type === "select" ? (
                <select
                  name={currentStepData.fields[0]}
                  value={formData[currentStepData.fields[0]]}
                  onChange={handleChange}
                  className="field !text-base cursor-pointer"
                >
                  <option value="" className="bg-surface-1">Select an option</option>
                  {currentStepData.options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-surface-1">
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {/* Navigation */}
            <div className="flex gap-4 justify-between">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="btn-form-outline w-auto px-8"
              >
                Previous
              </button>

              {currentStep === totalSteps - 1 ? (
                <button type="submit" disabled={isSubmitting} className="btn-form w-auto px-8">
                  {isSubmitting ? "Submitting…" : "Submit application"}
                </button>
              ) : (
                <button type="button" onClick={handleNext} className="btn-form w-auto px-8">
                  Next
                </button>
              )}
            </div>

            <p className="text-[12px] text-ink-3 text-center">
              Reviewed within 24 hours. Email notification sent.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-0 flex items-center justify-center text-ink-2">Loading…</div>}>
      <ApplyPageContent />
    </Suspense>
  );
}
