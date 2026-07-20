"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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

    // Handle dependent fields
    if (currentStepData.dependsOn && currentStepData.dependsOn.length > 0 && formData.currentServices) {
      // Show the dependent question
      setCurrentStep(currentStep + 1);
    } else if (currentStepData.dependsOn && formData.currentServices) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(currentStep + 1);
    }
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
      <div className="relative min-h-screen bg-white text-black overflow-hidden font-satoshi">
        <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-satoshi text-black">Sanddock</span>
            </a>
            <a href="/pricing" className="text-[11px] font-bold uppercase tracking-wider hover:text-brand-orange transition-colors">
              Back to Pricing →
            </a>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-6 py-24">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="text-6xl font-black">🔐</div>
              <h1 className="text-4xl font-extrabold uppercase tracking-tighter text-black">Login Required</h1>
            </div>

            <div className="border border-black p-8 space-y-6 text-center">
              <p className="text-sm text-black leading-relaxed">
                To prevent spam and maintain application quality, you must be logged in to submit an application.
              </p>
              <p className="text-xs text-zinc-600">
                This ensures we can properly review and contact you about your application.
              </p>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => router.push('/login')}
                  className="flex-1 py-3 bg-black hover:bg-brand-orange text-white font-bold text-sm uppercase tracking-widest transition-all border border-black"
                >
                  Sign In →
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="flex-1 py-3 bg-white hover:bg-zinc-100 text-black font-bold text-sm uppercase tracking-widest transition-all border border-black"
                >
                  Create Account →
                </button>
              </div>

              <button
                onClick={() => router.push('/pricing')}
                className="w-full py-3 bg-white hover:bg-zinc-50 text-black font-bold text-sm uppercase tracking-widest transition-all border border-black"
              >
                Back to Pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="relative min-h-screen bg-white text-black overflow-hidden font-satoshi">
        <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-satoshi text-black">Sanddock</span>
            </a>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="text-6xl font-black">✓</div>
              <h1 className="text-4xl font-extrabold uppercase tracking-tighter text-black">Application Received</h1>
            </div>

            <div className="border border-black p-8 space-y-6">
              <div className="space-y-3">
                <h2 className="text-lg font-bold uppercase tracking-tight text-black">What happens next?</h2>
                <p className="text-sm text-black leading-relaxed">
                  Thanks for applying! We'll review your application within 24 hours and send you an email with our decision.
                  Please check your spam folder to make sure you don't miss it.
                </p>
              </div>

              <div className="border-t border-black pt-6 space-y-4 bg-amber-50 border border-amber-200 p-4">
                <h3 className="font-bold text-black">Want to know more about pricing and application status?</h3>
                <p className="text-sm text-black leading-relaxed">
                  Contact us on Telegram for details about pricing, payment options, and to follow up on your application.
                </p>
                <a
                  href="https://t.me/alexsanddockcom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-bold text-amber-700 hover:text-amber-900 underline"
                >
                  Contact @alexsanddockcom →
                </a>
              </div>
            </div>

            <button
              onClick={() => router.push('/terminal')}
              className="w-full py-3 bg-black hover:bg-brand-orange text-white font-bold text-sm uppercase tracking-widest transition-all border border-black"
            >
              Go Back to Terminal →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-black overflow-hidden font-satoshi">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6 relative">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold tracking-tighter uppercase font-satoshi text-black">Sanddock</span>
          </a>
          <a href="/pricing" className="text-[11px] font-bold uppercase tracking-wider hover:text-brand-orange transition-colors">
            Back to Pricing →
          </a>
          <div className="absolute bottom-0 left-6 translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 z-10" />
        </div>
      </header>

      {/* ── FORM CONTAINER ─────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-extrabold uppercase tracking-tighter text-black">
              {currentStepData.title}
            </h1>
            <span className="text-xs font-bold uppercase tracking-widest text-black">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          {currentStepData.subtitle && (
            <p className="text-sm text-black mb-4">{currentStepData.subtitle}</p>
          )}
          <div className="w-full bg-zinc-200 h-1 rounded-none overflow-hidden">
            <div
              className="bg-brand-orange h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Message */}
          {submitError && (
            <div className="border border-red-300 bg-red-50 text-red-700 p-4 text-sm rounded-none">
              {submitError}
            </div>
          )}

          {/* Current Step Fields */}
          <div className="border border-black p-8 bg-zinc-50 space-y-4">
            {currentStepData.type === "text" || currentStepData.type === "email" ? (
              <input
                type={currentStepData.type}
                name={currentStepData.fields[0]}
                value={formData[currentStepData.fields[0]]}
                onChange={handleChange}
                placeholder={currentStepData.placeholder}
                className="w-full border border-zinc-300 px-4 py-3 text-lg bg-white text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-orange rounded-none"
              />
            ) : currentStepData.type === "textarea" ? (
              <textarea
                name={currentStepData.fields[0]}
                value={formData[currentStepData.fields[0]]}
                onChange={handleChange}
                placeholder={currentStepData.placeholder}
                rows="6"
                className="w-full border border-zinc-300 px-4 py-3 text-base bg-white text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-orange rounded-none resize-none"
              />
            ) : currentStepData.type === "select" ? (
              <select
                name={currentStepData.fields[0]}
                value={formData[currentStepData.fields[0]]}
                onChange={handleChange}
                className="w-full border border-zinc-300 px-4 py-3 text-base bg-white text-black focus:outline-none focus:ring-2 focus:ring-brand-orange rounded-none cursor-pointer"
              >
                <option value="" className="text-black">Select an option</option>
                {currentStepData.options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-black">
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-8 py-3 border border-black text-black font-bold text-[12px] uppercase tracking-widest hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-none"
            >
              ← Previous
            </button>

            {currentStep === totalSteps - 1 ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-brand-orange hover:bg-black text-white font-bold text-[12px] uppercase tracking-widest disabled:opacity-60 transition-all rounded-none border border-brand-orange hover:border-black"
              >
                {isSubmitting ? "Submitting..." : "Submit Application →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3 bg-black hover:bg-brand-orange text-white font-bold text-[12px] uppercase tracking-widest transition-all rounded-none border border-black hover:border-brand-orange"
              >
                Next →
              </button>
            )}
          </div>

          <p className="text-[11px] text-black text-center">
            Reviewed within 24 hours. Email notification sent.
          </p>
        </form>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-8 text-center text-black text-xs border-t border-black mt-12">
        <p>© 2024 Sanddock. Not financial advice. Educational purposes only.</p>
      </footer>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-satoshi">Loading...</div>}>
      <ApplyPageContent />
    </Suspense>
  );
}
