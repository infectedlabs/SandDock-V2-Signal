'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const coinList = [
  { symbol: 'BTC', name: 'Bitcoin', free: true },
  { symbol: 'ETH', name: 'Ethereum', free: false },
  { symbol: 'BNB', name: 'BNB', free: false },
  { symbol: 'SOL', name: 'Solana', free: false },
  { symbol: 'XRP', name: 'Ripple', free: false },
  { symbol: 'ADA', name: 'Cardano', free: false },
  { symbol: 'DOGE', name: 'Dogecoin', free: false },
  { symbol: 'AVAX', name: 'Avalanche', free: false },
  { symbol: 'MATIC', name: 'Polygon', free: false },
  { symbol: 'DOT', name: 'Polkadot', free: false },
  { symbol: 'LINK', name: 'Chainlink', free: false },
  { symbol: 'LTC', name: 'Litecoin', free: false },
];

export default function OnboardingPage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const firstName = profile?.name 
    ? profile.name.trim().split(' ')[0] 
    : (user?.user_metadata?.full_name 
        ? user.user_metadata.full_name.trim().split(' ')[0] 
        : '');
  const headline = firstName 
    ? `${firstName}, how would you describe your trading experience?` 
    : 'How would you describe your trading experience?';
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 to 4, and 5 for Telegram connect

  // Onboarding answers states
  const [experience, setExperience] = useState(null); // 'beginner', 'comfortable', 'experienced'
  const [selectedCoins, setSelectedCoins] = useState(['BTC']); // BTC is default and locked
  const [riskStyle, setRiskStyle] = useState('balanced'); // 'conservative', 'balanced', 'aggressive'
  const [delivery, setDelivery] = useState({ web: true, telegram: false });
  const [goal, setGoal] = useState('grow'); // 'learn', 'grow', 'automate'

  // Telegram pairing states
  const [pairingCode, setPairingCode] = useState(['', '', '', '', '', '']);
  const [telegramStatus, setTelegramStatus] = useState(''); // '', 'loading', 'success', 'error'
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Route security redirect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (profile?.onboarding_completed_at) {
        router.push('/terminal');
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#080d1a] text-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          <span>Syncing layout session...</span>
        </div>
      </div>
    );
  }

  // Next Step trigger
  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Step 4 completed
      if (delivery.telegram) {
        // Redirect to Telegram Connection step
        setStep(5);
      } else {
        handleFinishOnboarding();
      }
    }
  };

  // Back Step trigger
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Skip onboarding
  const handleSkip = async () => {
    try {
      setSubmitting(true);
      setErrorMsg('');
      await updateProfile({
        experience_level: 'comfortable',
        risk_style: 'balanced',
        primary_goal: 'grow',
        coins_selected: ['BTC'],
        alert_delivery: { web: true, telegram: false },
        onboarding_completed_at: new Date().toISOString(),
      });
      router.push('/terminal?signup_success=true');
    } catch (err) {
      console.error('Onboarding skip error:', err);
      setErrorMsg(err.message || "Failed to save profile. If you're using Supabase, make sure you have run the database schema migration in your SQL Editor.");
    } finally {
      setSubmitting(false);
    }
  };

  // Complete Onboarding
  const handleFinishOnboarding = async (chatId = null) => {
    try {
      setSubmitting(true);
      setErrorMsg('');
      const updates = {
        experience_level: experience,
        risk_style: riskStyle,
        primary_goal: goal,
        coins_selected: selectedCoins,
        alert_delivery: delivery,
        onboarding_completed_at: new Date().toISOString(),
      };
      if (chatId) {
        updates.telegram_chat_id = chatId;
        updates.telegram_verified_at = new Date().toISOString();
      }
      await updateProfile(updates);
      router.push('/terminal?signup_success=true');
    } catch (err) {
      console.error('Onboarding submit error:', err);
      setErrorMsg(err.message || "Failed to save profile. If you're using Supabase, make sure you have run the database schema migration in your SQL Editor.");
    } finally {
      setSubmitting(false);
    }
  };

  // Coin selection toggle
  const handleCoinToggle = (coinSymbol) => {
    if (coinSymbol === 'BTC') return; // BTC is locked
    if (selectedCoins.includes(coinSymbol)) {
      setSelectedCoins(selectedCoins.filter((c) => c !== coinSymbol));
    } else {
      setSelectedCoins([...selectedCoins, coinSymbol]);
    }
  };

  // Pairing code inputs management
  const handlePairingCodeChange = (e, index) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (!val) return;
    const newCode = [...pairingCode];
    newCode[index] = val.slice(-1);
    setPairingCode(newCode);

    // Focus next input automatically
    if (index < 5 && val) {
      const nextInput = document.getElementById(`code-char-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePairingCodeKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newCode = [...pairingCode];
      newCode[index] = '';
      setPairingCode(newCode);
      if (index > 0) {
        const prevInput = document.getElementById(`code-char-${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  // Simulate Telegram Connect verify
  const handleVerifyTelegram = () => {
    const entered = pairingCode.join('');
    if (entered.length < 6) {
      setTelegramStatus('error');
      return;
    }
    setTelegramStatus('loading');
    setTimeout(() => {
      setTelegramStatus('success');
      setTimeout(() => {
        // Finish setup with a mock chat ID
        handleFinishOnboarding('mock-tg-chat-9988');
      }, 1500);
    }, 1500);
  };

  // Progress Bar Dots Helper
  const renderProgress = () => {
    if (step > 5) return null;
    return (
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#8892a4] mb-8">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i <= step ? 'bg-brand-orange shadow-[0_0_8px_rgba(46,59,244,0.4)]' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <span className="ml-2">Step {step} of 5</span>
      </div>
    );
  };

  const step1Options = [
    {
      id: 'beginner',
      label: 'Just starting out',
      desc: "I'm new to crypto trading. I want to learn as I go with clear explanations.",
      preview: "What this means: Your dashboard will include beginner guides and plain-English explanations on every signal.",
      icon: (
        <svg className="w-8 h-8 text-brand-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8a7 7 0 0 1-9 10Z" />
          <path d="M9 22v-4" />
        </svg>
      )
    },
    {
      id: 'comfortable',
      label: 'Getting comfortable',
      desc: "I've made some trades but still have plenty to learn. Don't over-explain.",
      preview: "What this means: Standard terminal experience with selective jargon tooltips.",
      icon: (
        <svg className="w-8 h-8 text-brand-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      )
    },
    {
      id: 'experienced',
      label: 'Experienced trader',
      desc: "I know what I'm doing. I just want clean signals and data - skip the hand-holding.",
      preview: "What this means: Full data mode with direct signals feed and advanced metrics.",
      icon: (
        <svg className="w-8 h-8 text-brand-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#080d1a] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans selection:bg-brand-orange selection:text-white">
      
      {/* Decorative Glow Grid */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-orange/5 to-transparent pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-brand-orange/5 to-transparent pointer-events-none z-0" />

      {/* Header Logo */}
      <header className="relative z-10 w-full flex justify-between items-center max-w-4xl mx-auto border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-extrabold tracking-tighter uppercase font-mono">
            Sanddock
          </span>
        </div>
      </header>

      {/* Center Container Card */}
      <main className="flex-1 flex items-center justify-center relative z-10 py-6">
        <div className="w-full max-w-4xl bg-[#0d1426] border border-zinc-800 p-6 md:p-8 shadow-2xl relative">
          
          {renderProgress()}

          {errorMsg && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold uppercase tracking-wider font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* STEP 1: EXPERIENCE LEVEL */}
          {step === 1 && (
            <div className="space-y-5 text-left">
              <div className="space-y-1.5">
                <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight text-black leading-none">
                  {headline}
                </h2>
                <p className="text-black text-xs leading-relaxed normal-case">
                  We will adjust your signals feed, descriptions, and learning tooltips to match where you are.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {step1Options.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setExperience(opt.id)}
                    className={`flex flex-col p-5 border transition-all cursor-pointer rounded-none text-left justify-between ${
                      experience === opt.id
                        ? 'border-brand-orange bg-brand-orange/5 shadow-[0_0_15px_rgba(46,59,244,0.15)]'
                        : 'border-zinc-800 bg-[#111827] hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="mb-3 flex text-brand-orange">
                        {opt.icon}
                      </div>
                      <span className="block font-bold text-xs uppercase tracking-wider mb-1.5 text-black">{opt.label}</span>
                      <span className="block text-[11px] text-black normal-case leading-relaxed mb-3">{opt.desc}</span>
                    </div>
                    <div>
                      <div className="border-t border-zinc-800/80 my-2.5 w-full" />
                      <span className="block text-[10px] text-black normal-case leading-relaxed font-mono">{opt.preview}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue button container */}
              <div className={`transition-all duration-300 flex flex-col items-center gap-2.5 pt-4 ${
                experience 
                  ? 'opacity-100 transform translate-y-0' 
                  : 'opacity-0 transform translate-y-4 pointer-events-none'
              }`}>
                <button
                  onClick={handleNext}
                  className="py-3 px-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer shadow-lg rounded-none border-0"
                >
                  Continue &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COINS OF INTEREST */}
          {step === 2 && (
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-white leading-none">
                  Which coins do you want to track?
                </h2>
                <p className="text-white text-sm">
                  Bitcoin is always included on your plan. Select other coins you would like to track on your console.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                {coinList.map((coin) => {
                  const isSelected = selectedCoins.includes(coin.symbol);
                  const isBtc = coin.symbol === 'BTC';
                  return (
                    <button
                      key={coin.symbol}
                      onClick={() => handleCoinToggle(coin.symbol)}
                      disabled={isBtc}
                      className={`p-4 border transition-colors flex items-center justify-between text-left cursor-pointer ${
                        isBtc 
                          ? 'border-brand-orange/50 bg-[#111827] text-white opacity-80 cursor-not-allowed'
                          : isSelected
                            ? 'border-brand-orange bg-brand-orange/10 text-white'
                            : 'border-zinc-800 bg-[#111827] hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="block font-bold text-xs uppercase tracking-wider">{coin.symbol}</span>
                        <span className="block text-[10px] text-white normal-case">{coin.name}</span>
                      </div>
                      {isBtc ? (
                        <span className="text-[9px] font-mono font-bold bg-brand-orange text-white px-1.5 py-0.2 uppercase">Selected</span>
                      ) : !coin.free && (
                        <span className="text-[8px] font-mono font-bold bg-zinc-800 text-white px-1.5 py-0.2 uppercase">PRO</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedCoins.some((c) => c !== 'BTC') && (
                <div className="p-3 bg-brand-orange/10 border border-brand-orange/20 text-zinc-300 text-xs font-semibold uppercase tracking-wider font-mono mt-4">
                  ℹ️ Pro and Master coins selected will appear as preview cards on your console.
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RISK STYLE */}
          {step === 3 && (
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-white leading-none">
                  What is your default trading style?
                </h2>
                <p className="text-white text-sm">
                  This configures the default Stop Loss (SL) and Take Profit (TP) targets displayed on your trade alerts.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                {[
                  { id: 'conservative', icon: '🛡️', label: 'Conservative', desc: 'Smaller risk margins, smaller profit targets. Prioritizes security.', specs: 'SL -1.5%  |  TP +3.0%  |  Ratio 1:2' },
                  { id: 'balanced', icon: '⚖️', label: 'Balanced', desc: 'Balanced risk parameters. Sensible middle strategy.', specs: 'SL -2.5%  |  TP +5.0%  |  Ratio 1:2' },
                  { id: 'aggressive', icon: '🚀', label: 'Aggressive', desc: 'Wider stop ranges, higher yield targets. High volatility tolerance.', specs: 'SL -4.0%  |  TP +10.0%  |  Ratio 1:2.5' }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setRiskStyle(opt.id)}
                    className={`flex items-start gap-4 p-5 border transition-all cursor-pointer ${
                      riskStyle === opt.id
                        ? 'border-brand-orange bg-brand-orange/5'
                        : 'border-zinc-800 bg-[#111827] hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="riskStyle"
                      value={opt.id}
                      checked={riskStyle === opt.id}
                      onChange={() => {}}
                      className="hidden"
                    />
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="space-y-1 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm uppercase tracking-wide">{opt.label}</span>
                        <span className="text-[10px] font-mono font-bold text-white">{opt.specs}</span>
                      </div>
                      <span className="block text-xs text-white normal-case leading-relaxed">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: PRIMARY GOAL */}
          {step === 4 && (
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-white leading-none">
                  What is your main goal with Sanddock?
                </h2>
                <p className="text-white text-sm">
                  We will optimize your trading terminal panels around what matters most.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                {[
                  { id: 'learn', icon: '📚', label: 'Learn to trade smarter', desc: 'I want Heikin Ashi explanations, tooltips, and AI rationales to expand my analysis.' },
                  { id: 'grow', icon: '💰', label: 'Grow my portfolio', desc: 'Focus on overall win rates, positive streaks, and historical metrics.' },
                  { id: 'automate', icon: '⚡', label: 'Automate my alerts', desc: 'Prioritizes push notifications, Telegram connect widgets, and API settings.' }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setGoal(opt.id)}
                    className={`flex items-start gap-4 p-5 border transition-all cursor-pointer ${
                      goal === opt.id
                        ? 'border-brand-orange bg-brand-orange/5'
                        : 'border-zinc-800 bg-[#111827] hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={opt.id}
                      checked={goal === opt.id}
                      onChange={() => {}}
                      className="hidden"
                    />
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="space-y-1">
                      <span className="block font-bold text-sm uppercase tracking-wide">{opt.label}</span>
                      <span className="block text-xs text-white normal-case leading-relaxed">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: TELEGRAM PAIRING SCREEN */}
          {step === 5 && (
            <div className="space-y-6 text-left">
              <div className="space-y-2 border-b border-zinc-800 pb-4">
                <span className="text-[10px] font-mono text-brand-orange font-bold uppercase tracking-widest">Connect Telegram</span>
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-white leading-none">
                  Connect Your Telegram Bot
                </h2>
                <p className="text-white text-sm">
                  Paired in under 2 minutes. Get alerts directly to your phone.
                </p>
              </div>

              <div className="space-y-6 pt-2 font-mono text-xs">
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-orange text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">1</span>
                    <span className="font-bold text-white uppercase tracking-wider">Search for the bot</span>
                  </div>
                  <p className="text-white normal-case pl-7 leading-relaxed">
                    Open Telegram on your device, search for <span className="text-white font-bold">@SanddockBot</span>, or click below:
                  </p>
                  <div className="pl-7">
                    <a
                      href="https://t.me/SanddockBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block py-2.5 px-6 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs uppercase tracking-widest transition-colors font-sans"
                    >
                      Open @SanddockBot ↗
                    </a>
                  </div>
                </div>

                <div className="border-t border-zinc-900" />

                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-orange text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">2</span>
                    <span className="font-bold text-white uppercase tracking-wider">Send start command</span>
                  </div>
                  <p className="text-white normal-case pl-7 leading-relaxed">
                    Send the command <span className="text-white font-bold">/start</span> to the bot conversation window.
                  </p>
                </div>

                <div className="border-t border-zinc-900" />

                {/* Step 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-orange text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">3</span>
                    <span className="font-bold text-white uppercase tracking-wider">Enter your pairing code</span>
                  </div>
                  <p className="text-white normal-case pl-7 leading-relaxed mb-2">
                    The bot will reply with a 6-digit verification code. Enter it here:
                  </p>
                  
                  <div className="pl-7 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex gap-2">
                      {pairingCode.map((char, index) => (
                        <input
                          key={index}
                          id={`code-char-${index}`}
                          type="text"
                          maxLength="1"
                          value={char}
                          onChange={(e) => handlePairingCodeChange(e, index)}
                          onKeyDown={(e) => handlePairingCodeKeyDown(e, index)}
                          className="w-10 h-12 bg-[#111827] border border-zinc-800 text-center text-lg font-bold text-white focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleVerifyTelegram}
                      disabled={pairingCode.some(c => !c) || telegramStatus === 'loading'}
                      className="py-3 px-6 bg-[#00e676] hover:bg-emerald-600 text-black font-bold text-xs uppercase tracking-widest transition-colors font-sans flex-shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {telegramStatus === 'loading' ? 'Verifying...' : 'Pair Account →'}
                    </button>
                  </div>

                  {telegramStatus === 'success' && (
                    <div className="pl-7 text-emerald-400 font-bold uppercase tracking-wider mt-2 animate-pulse">
                      ✅ Connection successful! Syncing workspace...
                    </div>
                  )}

                  {telegramStatus === 'error' && (
                    <div className="pl-7 text-red-500 font-bold uppercase tracking-wider mt-2">
                      ⚠️ Invalid code. Please verify the code on your bot chat and retry.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          {step > 1 && (
            <div className="mt-12 pt-6 border-t border-[#1e2a3a] flex items-center justify-between">
              {step > 1 && step < 6 ? (
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  className="py-3 px-6 border border-zinc-800 hover:bg-[#111827] text-zinc-300 font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer bg-transparent"
                >
                  &larr; Back
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  onClick={handleNext}
                  className="py-3 px-8 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer border-0"
                >
                  Next &rarr;
                </button>
              ) : step === 5 ? (
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  className="py-3 px-8 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer border-0"
                >
                  {submitting ? 'Submitting...' : 'Finish Setup →'}
                </button>
              ) : (
                // On step 6 (Telegram Pairing)
                <button
                  onClick={() => handleFinishOnboarding()}
                  className="py-3 px-6 text-white hover:text-white text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer bg-transparent border-0"
                >
                  Set Up Later &rarr;
                </button>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer Branding info */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto border-t border-zinc-900 pt-4 text-center text-[10px] text-white uppercase font-mono tracking-wider">
        © 2025 Sanddock Technical Systems. All data signals are for educational purposes.
      </footer>

    </div>
  );
}
