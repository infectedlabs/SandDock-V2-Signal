"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit application");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="relative min-h-screen bg-white text-black overflow-hidden">
        <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tighter uppercase font-sans text-black">Sanddock</span>
            </a>
            <a href="/pricing" className="text-[11px] font-bold uppercase tracking-wider hover:text-brand-orange transition-colors">
              Back to Pricing →
            </a>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="text-6xl font-black mb-6">✓</div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tighter text-black mb-4">Application Received</h1>
          <p className="text-zinc-600 text-lg leading-relaxed mb-8">
            Thanks for applying! We'll review your application within 24 hours and send you an email with our decision. Please check your spam folder to make sure you don't miss it.
          </p>
          <p className="text-[11px] text-zinc-500">Redirecting to home in 3 seconds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-black overflow-hidden">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-black bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6 relative">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold tracking-tighter uppercase font-sans text-black">Sanddock</span>
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
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          {currentStepData.subtitle && (
            <p className="text-sm text-zinc-600 mb-4">{currentStepData.subtitle}</p>
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
                <option value="" className="text-zinc-400">Select an option</option>
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

          <p className="text-[11px] text-zinc-500 text-center">
            Reviewed within 24 hours. Email notification sent.
          </p>
        </form>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-8 text-center text-zinc-500 text-xs border-t border-black mt-12">
        <p>© 2024 Sanddock. Not financial advice. Educational purposes only.</p>
      </footer>
    </div>
  );
}
