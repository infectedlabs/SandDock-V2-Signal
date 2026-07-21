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

// Icon set replaces the emoji glyphs the old wizard used per-option.
const Icons = {
  Shield: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  ),
  Scale: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 8l-3 6a3 3 0 006 0l-3-6zm14 0l-3 6a3 3 0 006 0l-3-6zM5 8h14M8 21h8" />
    </svg>
  ),
  Rocket: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8 1-2 1-2M15 9l3 3M12.5 20.5c2-2 5-6 5-11 0-2.5-2-5.5-5-5.5-5 0-9 3-11 5 0 0 4 1 6 3s3 6 3 6" />
    </svg>
  ),
  Book: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z" />
    </svg>
  ),
  Growth: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M21 7v6h-6" />
    </svg>
  ),
  Bolt: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.14A2 2 0 004.18 21h15.64a2 2 0 001.87-2.99L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

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
      <div className="min-h-screen bg-surface-0 text-ink flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/15 border-t-accent rounded-full animate-spin" />
          <span className="text-[13px] text-ink-2">Syncing layout session…</span>
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
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-8">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= step ? 'bg-gradient-to-r from-accent to-accent-2' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <span>Step {step} of 5</span>
      </div>
    );
  };

  const step1Options = [
    {
      id: 'beginner',
      label: 'Just starting out',
      desc: "I'm new to crypto trading. I want to learn as I go with clear explanations.",
      preview: 'What this means: Your dashboard will include beginner guides and plain-English explanations on every signal.',
      icon: <Icons.Shield />,
    },
    {
      id: 'comfortable',
      label: 'Getting comfortable',
      desc: "I've made some trades but still have plenty to learn. Don't over-explain.",
      preview: 'What this means: Standard terminal experience with selective jargon tooltips.',
      icon: <Icons.Scale />,
    },
    {
      id: 'experienced',
      label: 'Experienced trader',
      desc: "I know what I'm doing. I just want clean signals and data - skip the hand-holding.",
      preview: 'What this means: Full data mode with direct signals feed and advanced metrics.',
      icon: <Icons.Rocket />,
    },
  ];

  const riskOptions = [
    { id: 'conservative', icon: <Icons.Shield />, label: 'Conservative', desc: 'Smaller risk margins, smaller profit targets. Prioritizes security.', specs: 'SL -1.5%  |  TP +3.0%  |  Ratio 1:2' },
    { id: 'balanced', icon: <Icons.Scale />, label: 'Balanced', desc: 'Balanced risk parameters. Sensible middle strategy.', specs: 'SL -2.5%  |  TP +5.0%  |  Ratio 1:2' },
    { id: 'aggressive', icon: <Icons.Rocket />, label: 'Aggressive', desc: 'Wider stop ranges, higher yield targets. High volatility tolerance.', specs: 'SL -4.0%  |  TP +10.0%  |  Ratio 1:2.5' },
  ];

  const goalOptions = [
    { id: 'learn', icon: <Icons.Book />, label: 'Learn to trade smarter', desc: 'I want Heikin Ashi explanations, tooltips, and AI rationales to expand my analysis.' },
    { id: 'grow', icon: <Icons.Growth />, label: 'Grow my portfolio', desc: 'Focus on overall win rates, positive streaks, and historical metrics.' },
    { id: 'automate', icon: <Icons.Bolt />, label: 'Automate my alerts', desc: 'Prioritizes push notifications, Telegram connect widgets, and API settings.' },
  ];

  return (
    <div className="min-h-screen bg-surface-0 text-ink flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden mesh-glow grain">
      <div className="grid-lines" />

      {/* Header */}
      <header className="relative z-10 w-full flex items-center max-w-4xl mx-auto border-b border-white/8 pb-4">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10">
            <img src="/sanddock-logo.png" alt="Sanddock Logo" className="w-5 h-5 object-contain" />
          </span>
          <span className="text-[19px] font-semibold tracking-tight text-ink">Sanddock</span>
        </a>
      </header>

      {/* Center Container Card */}
      <main className="flex-1 flex items-center justify-center relative z-10 py-8">
        <div className="w-full max-w-4xl card p-6 md:p-9">

          {renderProgress()}

          {errorMsg && (
            <div className="mb-6 flex items-start gap-2 p-3.5 rounded-xl bg-down/10 border border-down/25 text-down text-[13px] font-medium">
              <Icons.Warning />
              {errorMsg}
            </div>
          )}

          {/* STEP 1: EXPERIENCE LEVEL */}
          {step === 1 && (
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <h2 className="text-[26px] md:text-[32px] font-semibold tracking-tight text-gradient leading-tight">
                  {headline}
                </h2>
                <p className="text-ink-2 text-[14px] leading-relaxed">
                  We will adjust your signals feed, descriptions, and learning tooltips to match where you are.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {step1Options.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setExperience(opt.id)}
                    className={`card-interactive flex flex-col p-5 border rounded-xl cursor-pointer text-left justify-between ${
                      experience === opt.id
                        ? 'border-accent/50 bg-accent/8 shadow-[0_0_0_1px_rgba(48,84,255,0.3)]'
                        : 'border-white/8 bg-surface-2/50'
                    }`}
                  >
                    <div>
                      <div className="mb-3 w-11 h-11 rounded-xl bg-gradient-to-br from-accent/25 to-accent-2/15 border border-white/10 text-accent-soft flex items-center justify-center">
                        {opt.icon}
                      </div>
                      <span className="block font-semibold text-[14px] mb-1.5 text-ink">{opt.label}</span>
                      <span className="block text-[12.5px] text-ink-2 leading-relaxed mb-3">{opt.desc}</span>
                    </div>
                    <div>
                      <div className="border-t border-white/8 my-2.5 w-full" />
                      <span className="block text-[11px] text-ink-3 leading-relaxed">{opt.preview}</span>
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
                <button onClick={handleNext} className="btn-form w-auto px-12">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COINS OF INTEREST */}
          {step === 2 && (
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <h2 className="text-[26px] md:text-[32px] font-semibold tracking-tight text-gradient leading-tight">
                  Which coins do you want to track?
                </h2>
                <p className="text-ink-2 text-[14px]">
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
                      className={`p-4 rounded-xl border transition-colors flex items-center justify-between text-left cursor-pointer ${
                        isBtc
                          ? 'border-accent/40 bg-accent/8 text-ink opacity-90 cursor-not-allowed'
                          : isSelected
                            ? 'border-accent/50 bg-accent/10 text-ink'
                            : 'border-white/8 bg-surface-2/50 hover:border-white/16 text-ink-2'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="block font-semibold text-[13px]">{coin.symbol}</span>
                        <span className="block text-[10.5px] text-ink-3">{coin.name}</span>
                      </div>
                      {isBtc ? (
                        <span className="text-[9px] font-bold bg-gradient-to-r from-accent to-accent-2 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Selected</span>
                      ) : !coin.free && (
                        <span className="text-[9px] font-bold bg-white/10 text-ink-2 px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedCoins.some((c) => c !== 'BTC') && (
                <div className="flex items-start gap-2 p-3.5 rounded-xl bg-accent/10 border border-accent/25 text-accent-soft text-[13px] font-medium mt-4">
                  <Icons.Info />
                  Pro and Master coins selected will appear as preview cards on your console.
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RISK STYLE */}
          {step === 3 && (
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <h2 className="text-[26px] md:text-[32px] font-semibold tracking-tight text-gradient leading-tight">
                  What is your default trading style?
                </h2>
                <p className="text-ink-2 text-[14px]">
                  This configures the default Stop Loss (SL) and Take Profit (TP) targets displayed on your trade alerts.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                {riskOptions.map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setRiskStyle(opt.id)}
                    className={`flex items-start gap-4 p-5 rounded-xl border transition-all cursor-pointer ${
                      riskStyle === opt.id
                        ? 'border-accent/50 bg-accent/8'
                        : 'border-white/8 bg-surface-2/50 hover:border-white/16'
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
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent/25 to-accent-2/15 border border-white/10 text-accent-soft flex items-center justify-center">
                      {opt.icon}
                    </span>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="font-semibold text-[14px] text-ink">{opt.label}</span>
                        <span className="text-[11px] font-medium text-ink-3">{opt.specs}</span>
                      </div>
                      <span className="block text-[13px] text-ink-2 leading-relaxed">{opt.desc}</span>
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
                <h2 className="text-[26px] md:text-[32px] font-semibold tracking-tight text-gradient leading-tight">
                  What is your main goal with Sanddock?
                </h2>
                <p className="text-ink-2 text-[14px]">
                  We will optimize your trading terminal panels around what matters most.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                {goalOptions.map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setGoal(opt.id)}
                    className={`flex items-start gap-4 p-5 rounded-xl border transition-all cursor-pointer ${
                      goal === opt.id
                        ? 'border-accent/50 bg-accent/8'
                        : 'border-white/8 bg-surface-2/50 hover:border-white/16'
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
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent/25 to-accent-2/15 border border-white/10 text-accent-soft flex items-center justify-center">
                      {opt.icon}
                    </span>
                    <div className="space-y-1">
                      <span className="block font-semibold text-[14px] text-ink">{opt.label}</span>
                      <span className="block text-[13px] text-ink-2 leading-relaxed">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: TELEGRAM PAIRING SCREEN */}
          {step === 5 && (
            <div className="space-y-6 text-left">
              <div className="space-y-2 border-b border-white/8 pb-5">
                <span className="eyebrow">Connect Telegram</span>
                <h2 className="text-[26px] md:text-[32px] font-semibold tracking-tight text-gradient leading-tight">
                  Connect your Telegram bot
                </h2>
                <p className="text-ink-2 text-[14px]">
                  Paired in under 2 minutes. Get alerts directly to your phone.
                </p>
              </div>

              <div className="space-y-6 pt-2 text-[13px]">
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-gradient-to-br from-accent to-accent-2 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0">1</span>
                    <span className="font-semibold text-ink">Search for the bot</span>
                  </div>
                  <p className="text-ink-2 pl-[34px] leading-relaxed">
                    Open Telegram on your device, search for <span className="text-ink font-semibold">@SanddockBot</span>, or click below:
                  </p>
                  <div className="pl-[34px]">
                    <a
                      href="https://t.me/SanddockBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-form-outline w-auto px-6 inline-flex"
                    >
                      Open @SanddockBot
                    </a>
                  </div>
                </div>

                <div className="border-t border-white/8" />

                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-gradient-to-br from-accent to-accent-2 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0">2</span>
                    <span className="font-semibold text-ink">Send start command</span>
                  </div>
                  <p className="text-ink-2 pl-[34px] leading-relaxed">
                    Send the command <span className="text-ink font-semibold">/start</span> to the bot conversation window.
                  </p>
                </div>

                <div className="border-t border-white/8" />

                {/* Step 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-gradient-to-br from-accent to-accent-2 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0">3</span>
                    <span className="font-semibold text-ink">Enter your pairing code</span>
                  </div>
                  <p className="text-ink-2 pl-[34px] leading-relaxed mb-2">
                    The bot will reply with a 6-digit verification code. Enter it here:
                  </p>

                  <div className="pl-[34px] flex flex-col sm:flex-row gap-4 items-center">
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
                          className="field !w-10 !h-12 !p-0 text-center text-lg font-bold"
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleVerifyTelegram}
                      disabled={pairingCode.some(c => !c) || telegramStatus === 'loading'}
                      className="w-auto px-6 py-3.5 rounded-xl bg-up text-[#03150c] font-semibold text-sm flex-shrink-0 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {telegramStatus === 'loading' ? 'Verifying…' : 'Pair account'}
                    </button>
                  </div>

                  {telegramStatus === 'success' && (
                    <div className="flex items-center gap-2 pl-[34px] text-up font-semibold mt-2 animate-pulse">
                      <Icons.Check />
                      Connection successful! Syncing workspace…
                    </div>
                  )}

                  {telegramStatus === 'error' && (
                    <div className="flex items-center gap-2 pl-[34px] text-down font-semibold mt-2">
                      <Icons.Warning />
                      Invalid code. Please verify the code on your bot chat and retry.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          {step > 1 && (
            <div className="mt-12 pt-6 border-t border-white/8 flex items-center justify-between">
              {step > 1 && step < 6 ? (
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  className="btn-form-outline w-auto px-6"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button onClick={handleNext} className="btn-form w-auto px-8">
                  Next
                </button>
              ) : step === 5 ? (
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  className="btn-form w-auto px-8"
                >
                  {submitting ? 'Submitting…' : 'Finish setup'}
                </button>
              ) : (
                // On step 6 (Telegram Pairing)
                <button
                  onClick={() => handleFinishOnboarding()}
                  className="btn-secondary"
                >
                  Set up later
                </button>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer Branding info */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto border-t border-white/8 pt-4 text-center text-[11px] text-ink-3">
        &copy; {new Date().getFullYear()} Sanddock Technical Systems. All data signals are for educational purposes.
      </footer>

    </div>
  );
}
