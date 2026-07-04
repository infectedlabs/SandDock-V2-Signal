# Sanddock - Complete Product & Build Specification
### For Antigravity Development Team | Version 1.0

> **Purpose of this document:** Everything Antigravity needs to design, build, and launch Sanddock - from visual design system to page-by-page flows, onboarding, pricing, features, SEO content, and the $10k MRR plan. Read it top to bottom before writing a single line of code.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Visual Design System](#2-visual-design-system)
3. [Page Architecture & User Flows](#3-page-architecture--user-flows)
4. [Homepage - Full SEO & AI-Optimized Content](#4-homepage--full-seo--ai-optimized-content)
5. [Auth Flow](#5-auth-flow)
6. [Personalized Onboarding](#6-personalized-onboarding)
7. [Dashboard & Core App](#7-dashboard--core-app)
8. [Feature Specification by Plan](#8-feature-specification-by-plan)
9. [Pricing Plans - Exact Numbers & Limitations](#9-pricing-plans--exact-numbers--limitations)
10. [Telegram Integration](#10-telegram-integration)
11. [Technical Requirements](#11-technical-requirements)
12. [SEO & Marketing Infrastructure](#12-seo--marketing-infrastructure)
13. [$10K MRR Roadmap](#13-10k-mrr-roadmap)
14. [Legal Disclaimer Template](#14-legal-disclaimer-template)

---

## 1. Product Overview

| Field | Value |
|---|---|
| **Product Name** | Sanddock |
| **Tagline** | AI signals. Honest track record. |
| **Type** | SaaS web app + Telegram alert delivery |
| **Target User** | Retail crypto traders - beginners to intermediate |
| **Core Technology** | Heikin Ashi swing detection + AI confidence scoring + Telegram delivery |
| **Primary Exchange** | Binance (expand to Bybit, OKX in v2) |
| **Launch Pairs** | BTC/USDT (free plan), 50+ coins on paid plans |
| **Revenue Goal** | $10,000 MRR |

### What Sanddock Does

Sanddock monitors crypto price data in real-time using Heikin Ashi (HA) candles, detects high-probability swing tops and bottoms via a proprietary state machine, and fires Buy/Sell alerts to users through a web dashboard and Telegram. Every signal includes an AI-generated plain-English explanation, a confidence score (0–100%), and recommended entry price, stop-loss, and take-profit levels.

Unlike other signal services that hide losses and curate screenshots, Sanddock maintains a fully public, immutable, timestamped track record of every signal ever fired - wins and losses both.

### The 5 Core Differentiators

| # | Differentiator | Why It Matters |
|---|---|---|
| 1 | **Radical transparency** | Public, verifiable track record - not curated screenshots. This alone separates Sanddock from 90% of the market. |
| 2 | **AI explainability** | Every signal explains *why* it fired, not just what to do. Builds understanding and trust. |
| 3 | **Heikin Ashi engine** | Proven noise-reduction technique. Fewer false signals than raw OHLC detection. |
| 4 | **Slide-not-spam** | When a swing extends to a better price, the existing Telegram message is edited - not spammed with new alerts. |
| 5 | **Beginner-first UX** | Designed for people who don't know Pine Script or backtesting. No jargon without explanation. |

### What Sanddock Is NOT

- Not a trading bot (does not execute trades)
- Not financial advice
- Not a black-box "trust us" signal group
- Not another generic Telegram VIP group

---

## 2. Visual Design System

### Design Reference

Take **Fogo's visual language** as the aesthetic foundation:
- Dark navy background
- Heavy geometric sans-serif typography
- Bold, editorial section layouts
- Scrolling ticker strips
- Strong section rhythm

Apply it to a **trust-first, data-forward signal SaaS** - not a blockchain protocol. The hero image is always the product UI, never a mascot or abstract illustration.

---

### Color Palette

| Role | Name | Hex | Usage |
|---|---|---|---|
| Background Primary | Deep Navy Black | `#080d1a` | Page background, main surfaces |
| Background Secondary | Dark Navy | `#0d1426` | Cards, panels, sidebar |
| Background Tertiary | Dark Blue-Gray | `#111827` | Input fields, secondary panels |
| **Accent Primary** | **Electric Orange** | **`#ff5722`** | **Primary CTAs, buttons, links, brand highlights** |
| Accent Hover | Deep Orange | `#e64a19` | Button/link hover state |
| **Buy Signal** | **Signal Green** | **`#00e676`** | **ALL Buy alerts, positive P&L, wins** |
| **Sell Signal** | **Signal Red** | **`#ff1744`** | **ALL Sell alerts, negative P&L, losses** |
| Confidence High | Bright Green | `#69f0ae` | Confidence score > 75% |
| Confidence Mid | Amber | `#ffca28` | Confidence score 50–74% |
| Confidence Low | Coral | `#ff7043` | Confidence score < 50% |
| Text Primary | Pure White | `#ffffff` | Headlines, key data, nav |
| Text Secondary | Blue-Gray | `#8892a4` | Body text, descriptions |
| Text Muted | Slate | `#4a5568` | Placeholders, labels, timestamps |
| Border Default | Subtle Navy | `#1e2a3a` | Card borders, dividers, hairlines |
| Border Hover | Mid Navy | `#2d3d52` | Hovered card borders |

> **Critical rule for all developers:** `#00e676` Green is **exclusively** for Buy signals and positive numbers. `#ff1744` Red is **exclusively** for Sell signals and negative numbers. Never use these for any other UI purpose. `#ff5722` Orange is the brand accent only - **never** used for signal colors.

---

### Typography

**Font Stack:**
- **Primary (all UI):** Space Grotesk - geometric, modern, excellent legibility at large display sizes
- **Fallback:** DM Sans → Inter → system-ui
- **Monospace (prices, numbers, code):** JetBrains Mono

**Load from Google Fonts:**
```
Space Grotesk: weights 400, 500, 600, 700, 800
JetBrains Mono: weights 400, 500
```

**Type Scale:**

| Level | Size (desktop) | Weight | Usage |
|---|---|---|---|
| Display | 72–96px | 800 | Hero headline only |
| H1 | 48–56px | 700 | Page-level titles |
| H2 | 32–40px | 600 | Section headers |
| H3 | 22–26px | 600 | Card titles, feature headings |
| H4 | 18px | 500 | Sub-sections |
| Body Large | 18px | 400 | Hero sub-copy, key descriptions |
| Body | 16px | 400 | Standard body copy |
| Small | 14px | 400 | Labels, captions, nav links |
| Micro | 12px | 400 | Timestamps, fine print, badges |

**Typography Rules:**
- All prices and numeric data: always use JetBrains Mono
- Section eyebrow text: uppercase, 12px, 1.5px letter-spacing, orange color (`#ff5722`)
- Hero headline: mixed case (never all-caps for hero), 2–5 words per line max for impact
- Maximum 3 font weights visible on any single page
- Line height: 1.2 for display/H1, 1.4 for H2/H3, 1.7 for body

---

### UI Components

**Buttons:**

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `#ff5722` | White | None | Main CTAs: "Get Signals", "Upgrade" |
| Primary Hover | `#e64a19` | White | None | Hover state |
| Secondary | Transparent | `#ff5722` | 1px `#ff5722` | Secondary CTAs: "Learn More" |
| Ghost | Transparent | White | 1px `#1e2a3a` | Tertiary: "View Demo" |
| Danger | `#ff1744` | White | None | Destructive: "Cancel Plan" |

All buttons: `border-radius: 8px`, `font-weight: 600`, `font-size: 14px`
Sizes: sm (8px/16px padding), md (12px/24px), lg (16px/32px)
Transition: `0.15s ease` on all color/shadow changes

**Cards:**
- Background: `#0d1426`
- Border: `1px solid #1e2a3a`
- Border-radius: `12px`
- Padding: `24px`
- Hover state: border shifts to `#2d3d52`
- Transition: `border-color 0.15s ease`

**Signal Alert Cards (critical component - appears throughout app):**

```
┌─────────────────────────────────────────────────┐  ← border-left: 3px solid #00e676 (Buy)
│ 🟢 BUY  BTC/USDT · 15m HA          87% ████░  │     or #ff1744 (Sell)
│                                                 │
│ Entry  $67,432.00    SL  $65,800    TP $70,850 │
│                                                 │
│ "HA low is lowest in 10 bars - swing bottom     │
│  confirmed. Volume 23% above average."          │
│                                                 │
│ 14 minutes ago                      [Expand ↓] │
└─────────────────────────────────────────────────┘
```

- Buy cards: left border `#00e676`, background tint `rgba(0, 230, 118, 0.04)`
- Sell cards: left border `#ff1744`, background tint `rgba(255, 23, 68, 0.04)`
- Confidence score: colored progress bar (green > 75%, amber 50–74%, coral < 50%)
- All prices in JetBrains Mono

**Scrolling Ticker Strip:**
- Height: 44px
- Background: `#0d1426`
- Two rows (optional): one scrolling left, one scrolling right at slightly different speeds
- Content: recent signals with emoji, coin, price, confidence, time
- Example content: `🟢 BTC Buy @ $67,432 · 87% · 14m ago · 🔴 ETH Sell @ $3,210 · 72% · 2h ago`

**Charts:**
- Library: TradingView Lightweight Charts (free, performant, MIT license)
- HA candles: bullish `#00e676`, bearish `#ff1744`
- Background: `#080d1a`
- Grid lines: `#1e2a3a` at 0.5px
- Signal markers: orange triangle (▲ Buy, ▼ Sell) with price label
- Crosshair: thin `#4a5568`

---

## 3. Page Architecture & User Flows

### Sitemap

```
/ ──────────────────── Homepage (public)
/pricing ────────────── Pricing (public)
/track-record ──────── Public track record (public)
/blog ──────────────── Blog (public, SEO-first)
  /blog/[slug]
/login ─────────────── Login
/signup ────────────── Sign up
/verify-email ──────── Email verification gate
/onboarding ────────── 5-step wizard (protected, first-login only)
/dashboard ─────────── Main app (protected)
  /dashboard/signals ─── Live signal feed (default tab)
  /dashboard/chart ────── HA chart view
  /dashboard/history ──── Personal signal history
  /dashboard/track-record ─ Full track record (with personal stats)
/settings ──────────── Account settings (protected)
  /settings/profile
  /settings/billing
  /settings/telegram
  /settings/alerts
  /settings/api ───────── Master plan only
/upgrade ───────────── Upgrade page (protected - shown when free user hits a gate)
/affiliates ────────── Affiliate program (public)
```

---

### Flow 1 - New Visitor → Free Account

```
Landing on Homepage
        ↓
Clicks "Get Free Signals →" or "Start Free"
        ↓
/signup - email + password (or Google OAuth)
        ↓
Email verification sent → User clicks link in email
        ↓
/onboarding - Step 1: Experience level
        ↓
/onboarding - Step 2: Coins of interest
        ↓
/onboarding - Step 3: Risk style
        ↓
/onboarding - Step 4: Alert delivery preference
        ↓
/onboarding - Step 5: Primary goal
        ↓ (if Telegram selected in Step 4)
Telegram Connect screen (3-step pairing flow)
        ↓
/dashboard (personalized based on all onboarding answers)
        ↓
First signal appears → user sees live BTC Buy/Sell alert
```

---

### Flow 2 - Free User → Upgrade

```
Free user takes one of these actions:
  → Clicks a non-BTC signal card (e.g. ETH)
  → Goes to Settings → Telegram
  → Clicks "Export CSV"
  → Tries to access 1H/4H timeframes
  → Clicks locked SL/TP on a signal
        ↓
Upgrade modal appears (contextual, explains exactly what they'll get)
        ↓
Clicks "Upgrade to Pro →"
        ↓
/upgrade page OR direct Stripe Checkout
        ↓
Payment complete → Stripe webhook updates user plan in DB
        ↓
Dashboard refreshes with plan features unlocked
        ↓
Success toast: "Welcome to Pro! You now have access to 10 coins + Telegram alerts."
```

---

### Flow 3 - Returning User

```
Visits sanddock.com (any page) or direct /login
        ↓
Login (email/password or Google OAuth)
        ↓
Session restored → /dashboard (last position)
```

---

### Flow 4 - No-Auth Pages (Visitor, Not Logged In)

Pages accessible without login that show product value and drive signups:

**Homepage (`/`)** - Full homepage with live scrolling ticker, track record preview, pricing summary

**Track Record (`/track-record`)** - Full public signal history table, filterable. No login required. This is intentional - it's a trust-building page that should be indexed and shareable.

**Pricing (`/pricing`)** - Full pricing comparison. No login required.

**Blog (`/blog/[slug]`)** - All blog posts public. No login. Full SEO content.

> All these pages have a sticky top CTA bar: "Get free Bitcoin signals → Start free, no card needed" when scrolling down past the hero.

---

## 4. Homepage - Full SEO & AI-Optimized Content

### Technical SEO Metadata

```html
<title>Sanddock - AI Crypto Trading Signals | Heikin Ashi Buy & Sell Alerts</title>

<meta name="description" content="Real-time AI-powered Buy and Sell signals for Bitcoin and 50+ crypto coins. Heikin Ashi-based alerts with AI explanation delivered to Telegram and your dashboard. Verified track record. Start free - no credit card needed." />

<link rel="canonical" href="https://sanddock.com/" />

<!-- Open Graph -->
<meta property="og:title" content="Sanddock - AI Crypto Trading Signals" />
<meta property="og:description" content="Get AI-powered Buy/Sell signals with a verified track record. Every signal explained. Start free with Bitcoin." />
<meta property="og:image" content="https://sanddock.com/og-image.png" />
<!-- OG image: dashboard screenshot showing a BTC Buy signal with AI explanation panel. 1200×630px. -->
<meta property="og:type" content="website" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Sanddock - AI Crypto Signals with Verified Track Record" />
```

**Schema Markup (JSON-LD - embed in `<head>`):**

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Sanddock",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web, iOS, Android",
      "description": "AI-powered crypto trading signals using Heikin Ashi candles. Real-time Buy/Sell alerts with AI explanation, confidence scores, and a public verified track record.",
      "url": "https://sanddock.com",
      "offers": [
        { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD" },
        { "@type": "Offer", "name": "Pro", "price": "29", "priceCurrency": "USD", "priceSpecification": { "billingIncrement": "P1M" } },
        { "@type": "Offer", "name": "Master", "price": "79", "priceCurrency": "USD", "priceSpecification": { "billingIncrement": "P1M" } }
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "212"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Sanddock?",
          "acceptedAnswer": { "@type": "Answer", "text": "Sanddock is an AI-powered crypto trading signal tool that monitors Bitcoin and 50+ cryptocurrencies using Heikin Ashi candle analysis. It fires Buy and Sell alerts to your web dashboard and Telegram with a plain-English AI explanation, confidence score, and entry/SL/TP levels on every signal." }
        },
        {
          "@type": "Question",
          "name": "Is the free plan really free?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. The free plan gives you real, live AI signals on Bitcoin (BTC/USDT) forever - no credit card required. Telegram alerts, additional coins, and advanced features require a paid plan." }
        },
        {
          "@type": "Question",
          "name": "What is a Heikin Ashi signal?",
          "acceptedAnswer": { "@type": "Answer", "text": "Heikin Ashi is a Japanese candlestick technique that smooths price noise by averaging candle values. Our signal engine detects when a coin hits a verified swing high (Sell) or swing low (Buy) on Heikin Ashi candles, filtered through an AI confidence model before any alert fires." }
        }
      ]
    }
  ]
}
```

**Target Keywords:**

| Type | Keywords |
|---|---|
| Primary | `crypto trading signals`, `AI crypto signals`, `bitcoin trading alerts` |
| Secondary | `heikin ashi signals`, `crypto signals telegram`, `crypto buy sell alerts`, `real-time crypto signals` |
| Long-tail | `best crypto signals 2025`, `AI trading signals telegram`, `bitcoin swing trading signals`, `crypto signal tool with track record` |
| AI-search queries | "which crypto signal tool shows wins and losses", "best AI trading signals for beginners", "crypto signals with explanation" |

---

### Homepage Section-by-Section Content

---

#### NAV

**Left:** Sanddock wordmark (Space Grotesk 700, white with orange accent on the "S" or as a dot)

**Center links:** Home · How It Works · Pricing · Track Record · Blog

**Right:** "Login" (ghost button) + "Start Free" (orange primary button)

**Behavior:** Nav becomes sticky with `backdrop-blur` + slight dark tint on scroll. "Start Free" button always visible.

---

#### SECTION 1 - HERO

**Eyebrow text (orange, uppercase, 12px):**
`AI-Powered · Heikin Ashi · Verified Track Record`

**Headline (display size, white, 2 lines):**
```
Trade smarter.
Not blindly.
```

**Sub-headline (body large, `#8892a4`, max-width 520px):**
```
Real-time Buy and Sell signals powered by AI and Heikin Ashi analysis.
Every signal comes with a reason. Every result is on the public record.
Start free - Bitcoin signals, forever.
```

**CTA Row:**
- Primary button: "Get Free Signals →" (orange, large)
- Ghost button: "See Track Record" (links to `/track-record`)

**Trust row (below CTAs, inline, 14px, muted gray):**
`✓ No credit card required   ✓ BTC signals free forever   ✓ Cancel anytime`

**Hero Visual (right column on desktop, stacked below on mobile):**

A product screenshot / animated mockup showing:
- Left: BTC/USDT Heikin Ashi chart with a green Buy signal triangle at the bottom
- Right panel: Signal card with confidence score bar, AI rationale text, Entry/SL/TP
- Phone overlay (floating): Telegram message with the same signal

> Dev note: Use a real screenshot of the actual dashboard when built. For launch, use a high-fidelity Figma mockup exported as PNG/WebP. Consider a subtle "live" animation - the confidence bar filling up, then a Telegram ping sound effect animation.

**Stats Row (3 columns, below hero visual):**

| Metric | Value | Note |
|---|---|---|
| Signals fired (all time) | 4,200+ | Pull from DB, update live |
| Average confidence score | 81% | Running average from DB |
| Verified win rate | 67.3% | From track record, with losses counted |

> These numbers must be real. Pull from the actual database via API. Never hardcode fake stats.

---

#### SECTION 2 - LIVE SIGNAL TICKER

Full-width scrolling strip(s), placed directly below the hero.

**Strip 1 (scrolls left, 40px height):**
`🟢 BTC Buy @ $67,432 · 87% confidence · 14m ago   ·   🔴 ETH Sell @ $3,210 · 72% confidence · 2h ago   ·   🟢 SOL Buy @ $142.50 · 91% confidence · 5h ago   ·   🔴 BNB Sell @ $598.30 · 68% confidence · 1d ago   ·`

**Strip 2 (optional, scrolls right, slightly slower):**
`🟢 ADA Buy @ $0.612 · 79% · 3h ago   ·   🔴 AVAX Sell @ $38.20 · 83% · 6h ago   ·   🟢 XRP Buy @ $0.541 · 74% · 8h ago   ·`

**Visual treatment for free users:**
Non-BTC coins in Strip 2 are slightly blurred (CSS `filter: blur(4px)`) with a small lock icon and "Pro" pill badge on hover/tap. Tooltip: "ETH signals available on Pro."

---

#### SECTION 3 - SOCIAL PROOF (EXCHANGE LOGOS)

**Eyebrow:** `Signals from the world's most trusted exchanges`

**Logo row (horizontal scroll on mobile):**
Binance · Bybit · OKX · KuCoin · Coinbase

> Use grayscale logos that brighten on hover. Not clickable - decorative trust signal.

---

#### SECTION 4 - HOW IT WORKS

**Eyebrow:** `Three steps`

**Section headline:** `From signal to trade in under 60 seconds`

**Sub-copy (center, max-width 560px, muted gray):**
No charts to watch. No Pine Script to learn. Sanddock handles the analysis - you handle the decision.

**Steps (numbered cards, 01 / 02 / 03 layout):**

**01 - AI scans the market**
Icon: Candlestick chart
Body: Sanddock monitors Heikin Ashi candles across all your tracked coins, 24/7. The signal engine detects swing tops and bottoms with precision - filtering out the noise that trips up other tools.

**02 - Every signal is explained**
Icon: Brain / AI chip
Body: When a Buy or Sell signal fires, the AI generates a plain-English explanation of what it saw, why it's confident, and what to watch for. No black boxes. No "just trust us."

**03 - Alert arrives on your phone**
Icon: Telegram logo or phone
Body: Your signal lands in Telegram within seconds. Entry price, stop-loss, take-profit, and a confidence score - everything you need to decide in one message.

---

#### SECTION 5 - AI EXPLAINABILITY SHOWCASE

**Eyebrow:** `The Sanddock difference`

**Section headline:** `Every signal tells you why`

**Layout:** Two columns - left is the signal card mockup, right is copy.

**Left - Signal Card Mockup (styled as a real UI component):**

```
┌──────────────────────────────────────────────────────┐
│ 🟢 BUY SIGNAL                  BTC/USDT · 15m HA    │
│──────────────────────────────────────────────────────│
│ Entry Price      $67,432.00                          │
│ Stop Loss        $65,800.00         (-2.4%)          │
│ Take Profit      $70,850.00         (+5.1%)          │
│──────────────────────────────────────────────────────│
│ Confidence    ████████░░  87%  ·  HIGH               │
│ Fired at      14:23 UTC, Nov 1 2024                  │
│──────────────────────────────────────────────────────│
│ AI Rationale                                         │
│ "BTC's Heikin Ashi low at $67,432 is the lowest      │
│  point in the last 10 bars, confirming a swing        │
│  bottom. Volume is 23% above the 20-bar average,     │
│  adding confluence. The previous swing top was        │
│  committed 3 bars ago, establishing the              │
│  alternating structure."                             │
└──────────────────────────────────────────────────────┘
```

**Right - Copy:**

**Headline:** No black box. No guesswork.

**Body:**
Every signal Sanddock fires comes with a plain-English explanation of what the AI detected and why it matters. Confidence scores tell you how strong the setup is. Stop-loss and take-profit levels are calculated automatically so you always know your risk before you enter.

Most signal services tell you what to trade. We tell you *why*.

**CTA:** "Start getting explained signals →"

---

#### SECTION 6 - PUBLIC TRACK RECORD

**Eyebrow:** `Nothing to hide`

**Section headline:** `Every signal. Win or loss. On the record.`

**Sub-copy (center, max-width 580px):**
Most crypto signal services show you screenshots of their best calls. We show you everything - wins, losses, breakevens, and open signals - in a public, timestamped ledger. No cherry-picking. No deleted signals. Just data.

**Stats Row (4 metric cards):**

| Metric | Value |
|---|---|
| Total signals | 4,218 |
| Verified win rate | 67.3% |
| Average R:R ratio | 1 : 2.1 |
| Longest win streak | 11 signals |

> All values pull from the live database. Never hardcode.

**Table Preview (last 5 closed signals):**

| Date | Pair | Type | Entry | Exit | Result |
|---|---|---|---|---|---|
| Nov 1, 14:23 | BTC/USDT | Buy | $67,432 | $70,812 | +5.0% ✅ |
| Oct 31, 09:41 | ETH/USDT | Sell | $3,210 | $3,018 | +6.0% ✅ |
| Oct 30, 22:17 | BTC/USDT | Buy | $66,100 | $65,200 | -1.4% ❌ |
| Oct 30, 11:05 | SOL/USDT | Buy | $142.50 | $149.30 | +4.8% ✅ |
| Oct 29, 16:30 | BNB/USDT | Sell | $598.00 | $612.00 | -2.3% ❌ |

> Losses must be shown here. Real losses. This is the entire point of the section.

**CTA:** "View the full track record →" (links to `/track-record`)

---

#### SECTION 7 - COIN COVERAGE

**Eyebrow:** `What you get`

**Section headline:** `Bitcoin is just the start`

**Layout:** Two-column split

**Left column - FREE:**
Badge: `FREE - No card needed`
Headline: Start with Bitcoin

Body: Your free plan gives you real AI signals on the world's most traded cryptocurrency - forever. No credit card. No expiry. Just signals.

Visual: BTC coin logo, large and clear. Below it, a grid of 8–10 other coin logos, blurred with lock icons and "Pro" labels.

CTA: "Get free BTC signals →"

**Right column - PRO & MASTER:**
Badge: `PRO & MASTER`
Headline: 50+ coins unlocked

Body: Upgrade to unlock real-time AI signals across the top 50 cryptocurrencies by market cap - ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, and dozens more. New coins added monthly.

Visual: Grid of coin logos - ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, MATIC, DOT, LINK, LTC, UNI, ATOM, NEAR, and more - all visible, no blur.

CTA: "See all coins →" + "Upgrade to Pro →"

---

#### SECTION 8 - PRICING SUMMARY

**Eyebrow:** `Simple pricing`

**Section headline:** `Start free. Upgrade when you're ready.`

**Toggle:** Monthly / Yearly - default to Monthly. Show "Save up to 38%" badge next to Yearly toggle.

Display 3 plan cards in a row: Free | Pro | Master.

Pro card has a "Most popular" badge (orange border, `2px solid #ff5722`).

Each card shows: plan name, price, 3 headline features, CTA button.

**CTA below cards:** "See full feature comparison →" → `/pricing`

**Lifetime deal teaser (below the 3 cards, in a dark banner):**
"Looking for a one-time deal? The Sanddock Lifetime plan gives you Master access, forever. **312 of 500 founding spots remaining.**" → "See Lifetime Deal →"

---

#### SECTION 9 - SOCIAL WALL

**Eyebrow:** `What traders are saying`

**Section headline:** `Don't just take our word for it`

**Layout:** Masonry grid of 6–8 testimonials styled as tweets/social posts

Embed real tweets via Twitter oEmbed API when available. Fallback to styled HTML cards with user avatar, handle, and post text.

**Example content (replace with real posts as they come in):**

> "Been using Sanddock for 3 months. The AI explanation on every signal is a game changer - I actually understand *why* I'm entering a trade now. First signal tool that doesn't make me feel dumb." - @trader_handle

> "The public track record is what sold me. They show the losses. Every other signal group hides that. Instant trust from day one." - @crypto_handle

> "BTC signal hit +5.2% last night. Got the Telegram alert while I was asleep, set my entry limit and woke up in profit. This is the way." - @handle

> "Switched from [competitor] to Sanddock. No more signal spam. One clean alert with an explanation. Pro plan is worth every penny." - @handle

---

#### SECTION 10 - FAQ

**Eyebrow:** `Questions`

**Section headline:** `Everything you need to know`

> Schema markup: wrap each Q&A in `@type: Question` + `acceptedAnswer` (already in JSON-LD above)

---

**Q: What is Sanddock?**
Sanddock is an AI-powered crypto trading signal tool that monitors Bitcoin and 50+ other cryptocurrencies in real time. Using a Heikin Ashi swing detection engine and AI analysis, it fires Buy and Sell signals to your web dashboard and Telegram - with a plain-English explanation, confidence score, entry price, stop-loss, and take-profit on every alert.

**Q: Is the free plan really free?**
Yes, completely. The free plan gives you real, live AI signals on Bitcoin (BTC/USDT) forever. No credit card required, no time limit. Telegram alerts, additional coins, and advanced analytics require a paid plan.

**Q: What is a Heikin Ashi signal?**
Heikin Ashi is a Japanese candlestick technique that reduces price noise by averaging candle data. This makes swing highs and lows much easier to identify accurately than on raw price charts. Our signal engine detects when a coin hits a verified swing top (Sell) or bottom (Buy) on Heikin Ashi candles, then runs it through an AI confidence model before any alert fires.

**Q: How accurate are the signals?**
Our current verified win rate is 67.3% across 4,218+ signals - you can verify this yourself on our public Track Record page. Every signal, win and loss, is timestamped and public. We never delete signals. We never show screenshots. Just the data.

**Q: Can I trust these signals enough to trade real money?**
Sanddock signals are educational tools, not financial advice. They are based on technical analysis and historical patterns, which do not guarantee future results. Always use risk management and never risk more than you can afford to lose. Most users treat signals as one input alongside their own analysis.

**Q: How do I get signals on Telegram?**
After signing up, go to Settings → Telegram and follow the 3-step pairing wizard. You'll connect your account to the Sanddock bot in under 2 minutes. Telegram alerts require a Pro or Master plan.

**Q: Can I cancel anytime?**
Yes. Cancel in one click from account settings. No cancellation fees. No "email us to cancel" friction. Your access continues until the end of your billing period.

**Q: Does Sanddock place trades for me?**
No. Sanddock is a signal tool - it alerts you when and where to consider entering or exiting. It does not connect to your exchange or execute trades. If you want auto-execution, you can connect our webhook output (Master plan) to tools like Cornix or 3Commas.

**Q: What is the Lifetime plan?**
A one-time payment that gives you Master-level access to Sanddock forever, including all future feature updates. Available only during the launch window - limited to 500 founding members.

---

#### SECTION 11 - FINAL CTA BANNER

**Background:** Dark navy with subtle orange radial glow (top-right corner, very subtle - not a gradient, just a glow effect)

**Headline:**
```
Your next trade deserves
a reason.
```

**Sub-copy:**
Join traders who get AI-powered Buy and Sell signals with a verified public track record. Start free on Bitcoin. No card needed.

**CTAs:**
- Primary: "Get Free Signals →" (orange, large)
- Ghost: "View Track Record"

---

#### FOOTER

**Top section:**
Left: Sanddock logo + tagline: "AI signals. Honest track record."
Right: Social icons: Twitter/X · Telegram · YouTube

**Link columns:**

| Product | Support | Legal |
|---|---|---|
| How It Works | FAQ | Privacy Policy |
| Pricing | Documentation | Terms of Service |
| Track Record | Contact Us | Disclaimer |
| Blog | Telegram Community | Cookie Policy |
| Changelog | Affiliate Program | |

**Bottom bar:**
`© 2025 Sanddock. Not financial advice. All signals are for educational purposes only. Past performance does not indicate future results.`

---

## 5. Auth Flow

### Sign Up Page (`/signup`)

**Layout:** Centered card on full dark background, card max-width 480px, 48px padding

**Header:**
- Sanddock logo (centered)
- H1: "Create your free account"
- Sub: "Start with Bitcoin signals. No credit card needed."

**Form fields:**
1. Full name - text input, placeholder "Your name"
2. Email address - email input, placeholder "you@email.com"
3. Password - password input, 8+ chars, show/hide toggle (eye icon)
4. "Create account" - orange primary button, full width
5. Divider: `── or ──`
6. "Continue with Google" - white button, Google SVG icon, full width

**Below form:**
`By creating an account, you agree to our Terms of Service and Privacy Policy.`

Already have an account? `Login →` (link, orange)

---

### Email Verification Screen

Shown immediately after email signup, before onboarding:

```
📧 Check your inbox

We sent a verification link to:
you@email.com

Click the link in the email to activate your account.
──────────────────────────────
Didn't get it?  Resend email  (available after 60s countdown)
Wrong email?    Change email
```

On click of verification link → user redirected to `/onboarding`

---

### Login Page (`/login`)

**H1:** "Welcome back"
**Sub:** "Your signals are waiting."

**Form:**
1. Email address
2. Password + "Forgot password?" (right-aligned link, 13px)
3. "Login" - orange primary button, full width
4. Divider: `── or ──`
5. "Continue with Google"

**Below form:** "Don't have an account? `Start free →`"

---

### Forgot Password Flow

Step 1: Enter email → orange button "Send reset link"
Step 2: "Reset link sent - check your inbox"
Step 3: Click link → "Enter new password" + "Confirm password" → "Reset password"
Step 4: ✅ "Password updated" → Auto-redirect to `/login` after 3 seconds

---

## 6. Personalized Onboarding

The onboarding runs once, immediately after email verification on first login. It is a 5-step full-screen wizard.

**Design specs:**
- Full-screen dark background (`#080d1a`)
- Centered card, max-width 640px, no close button
- Progress bar at top: `●●○○○  Step 1 of 5` (orange filled dots)
- "Skip for now" ghost text link (bottom right) - sets all preferences to defaults
- "← Back" ghost button on steps 2–5 (bottom left)
- "Next →" orange primary button (bottom right)
- Subtle entrance animation: card slides up + fades in on each step

---

### Onboarding Step 1 - Experience Level

**Progress:** Step 1 of 5

**Headline:** "How would you describe your trading experience?"

**Sub-copy:** We'll adjust your dashboard, tooltips, and signal explanations to match where you are.

**Options (3 large selectable cards, single select, radio behavior):**

```
🌱  Just starting out
    I'm new to crypto trading. I want to learn
    as I go with clear explanations.

📈  Getting comfortable
    I've made some trades but still have plenty
    to learn. Don't over-explain.

🎯  Experienced trader
    I know what I'm doing. I just want clean
    signals and data - skip the hand-holding.
```

**Card selected state:** Orange border `2px solid #ff5722`, slight orange background tint.

**Dashboard effect by selection:**

| Selection | Dashboard Behavior |
|---|---|
| Just starting out | Tutorial overlay on first visit, glossary tooltips on jargon, simplified chart view, beginner guide pinned in sidebar |
| Getting comfortable | Standard dashboard, selective tooltips, no tutorial overlay |
| Experienced trader | Full data mode, all metrics visible, no tooltips, no tutorial |

---

### Onboarding Step 2 - Coins of Interest

**Progress:** Step 2 of 5

**Headline:** "Which coins do you want to track?"

**Sub-copy:** BTC is always included on your free plan. Select any others you're interested in - you'll see them on your dashboard (they unlock as you upgrade).

**Layout:** Grid of coin selector pills with official logos (multi-select)

**Coins shown:**

| Coin | Free Plan | Pro Plan | Master Plan |
|---|---|---|---|
| BTC | ✅ Always included, locked | ✅ | ✅ |
| ETH | 🔒 Pro badge | ✅ | ✅ |
| BNB | 🔒 Pro badge | ✅ | ✅ |
| SOL | 🔒 Pro badge | ✅ | ✅ |
| XRP | 🔒 Pro badge | ✅ | ✅ |
| ADA | 🔒 Pro badge | ✅ | ✅ |
| DOGE | 🔒 Pro badge | ✅ | ✅ |
| AVAX | 🔒 Pro badge | ✅ | ✅ |
| MATIC | 🔒 Pro badge | ✅ | ✅ |
| DOT | 🔒 Pro badge | ✅ | ✅ |
| LINK | 🔒 Master badge | ❌ | ✅ |
| LTC | 🔒 Pro badge | ✅ | ✅ |
| + 38 more | | | ✅ |

**Free user behavior:** BTC is pre-selected and locked (cannot deselect). Other coins can be selected - they appear as "locked preview" cards on the dashboard with an upgrade prompt. Selecting them does NOT charge the user - it just configures which locked preview cards they see.

**Inline note when non-BTC selected:**
`You've added ETH - unlock real-time ETH signals on Pro ($29/mo).`

---

### Onboarding Step 3 - Risk Style

**Progress:** Step 3 of 5

**Headline:** "What's your trading style?"

**Sub-copy:** This sets the default Stop Loss and Take Profit levels shown on your signals. You can change these any time in settings.

**Options (3 cards, single select):**

```
🛡️  Conservative
    Smaller risk, smaller targets. I prefer
    safety over large swings.
    
    Default: SL -1.5%  |  TP +3.0%  |  R:R 1:2

⚖️  Balanced
    Standard risk/reward. The sensible middle.
    
    Default: SL -2.5%  |  TP +5.0%  |  R:R 1:2

🚀  Aggressive
    Wider stops, bigger targets. I can handle
    the volatility.
    
    Default: SL -4.0%  |  TP +10.0%  |  R:R 1:2.5
```

> These pre-fill default SL/TP on all signals shown to this user. Overridable per-signal on Pro+, globally adjustable in Settings.

---

### Onboarding Step 4 - Alert Delivery

**Progress:** Step 4 of 5

**Headline:** "How do you want to receive your signals?"

**Sub-copy:** Choose how Sanddock reaches you when a new signal fires.

**Options (multi-select - user can choose one or both):**

```
📊  Web dashboard                        [SELECT]
    Check signals in the app when I log in.
    Available on all plans including free.

✈️  Telegram alerts                      [SELECT]
    Get signals pushed to my phone via Telegram.
    Available on Pro and Master plans.
```

**If Telegram selected and user is on Free plan:**
Show inline notice below the Telegram card:
```
ℹ️ Telegram alerts are included on Pro ($29/mo) and Master ($79/mo).
   We'll walk you through the setup right after onboarding.
   You can activate it when you're ready to upgrade.
```

**Post-Step-5 behavior:** If Telegram was selected, show the Telegram connect screen before redirecting to dashboard.

---

### Onboarding Step 5 - Primary Goal

**Progress:** Step 5 of 5

**Headline:** "What's your main goal with Sanddock?"

**Sub-copy:** We'll arrange your dashboard around what matters most to you.

**Options (3 cards, single select):**

```
📚  Learn to trade smarter
    I want to understand why signals fire,
    not just follow them blindly.
    
    → AI explanation panel open by default
    → Learning resources pinned in sidebar
    → Glossary tooltips on signal terms

💰  Grow my portfolio
    I want high-confidence signals that help
    me build wealth over time.
    
    → Track record and P&L calculator prominent
    → Win rate and streak stats highlighted
    → "Best signals" filter as default

⚡  Automate my alerts
    I want signals sent to Telegram so I can
    react fast without watching charts.
    
    → Telegram setup card pinned until connected
    → Signal history view as default tab
    → Latency and delivery stats shown
```

**Button text on Step 5:** "Finish setup →" (not "Next")

---

### Dashboard Personalization Summary

| Onboarding Answer | What Changes on Dashboard |
|---|---|
| Experience: Beginner | Tutorial overlay on load, glossary tooltips, simplified chart view, "Learning hub" pinned in sidebar |
| Experience: Comfortable | Standard view, minimal tooltips |
| Experience: Experienced | Full data mode, no tooltips, advanced metrics table |
| Risk: Conservative | All SL/TP defaults set to conservative values |
| Risk: Balanced | SL/TP defaults at standard values |
| Risk: Aggressive | SL/TP defaults at aggressive values |
| Goal: Learn | AI rationale panel open by default, learning content pinned |
| Goal: Grow | Track record tab prominent, P&L calculator in sidebar |
| Goal: Automate | Telegram status card pinned, signal history default tab |
| Coins selected | Those coins appear as locked preview cards on the dashboard |

---

## 7. Dashboard & Core App

### Overall Layout

**Top nav bar (all pages, height 60px):**
- Left: Sanddock logo
- Center: current page title
- Right: Plan badge pill (Free | Pro | Master) · Notification bell · User avatar → dropdown (Profile, Settings, Billing, Logout)

**Left sidebar (desktop, collapsible, width 220px):**
```
📊  Signals          ← default landing
📈  Chart
📋  History
🏆  Track Record
🔔  Alert Settings
⚙️  Settings
────────────────
🔼  Upgrade          ← only shown on Free or Pro
```

**Main content area:** Changes per active tab. Padding: 24px all sides.

**Mobile:** Bottom tab navigation (Signals · Chart · History · Settings)

---

### Tab 1 - Signals (Live Feed) - Default

**Header row:**
Filters: All Signals | Buy Only | Sell Only
Filters: All Coins | [Coin pills] (filtered by user's selected coins)
Filters: All Timeframes | 15m | 1H | 4H (1H/4H locked on Free)
Sort: Newest First | Confidence High→Low

**Signal cards in feed:**

Each card (unexpanded):
- Coin pair + timeframe badge: `BTC/USDT · 15m HA`
- Signal type badge: `🟢 BUY` or `🔴 SELL` (colored)
- Entry price (monospace)
- Confidence score (colored progress bar, % number)
- Relative timestamp: "14 minutes ago"
- Expand button `↓`

Each card (expanded):
- All above +
- Stop Loss: `$65,800.00 (-2.4%)`
- Take Profit: `$70,850.00 (+5.1%)`
- Full AI rationale text
- "Open chart" button → Chart tab with this signal highlighted

**Locked signal cards (Free user, non-BTC coin):**
- Card visible but blurred (CSS `blur(6px) brightness(0.5)`)
- Coin logo visible through blur
- Centered overlay: `🔒 ETH signals on Pro` + "Unlock →" button
- Click anywhere on card → Upgrade prompt modal

**Empty state (no new signals):**
```
No new signals in the last 4 hours.

Sanddock's engine is watching the market.
Your next alert will appear here as soon as a
confirmed swing is detected.

 [Enable Telegram alerts to get notified instantly →]
```

---

### Tab 2 - Chart View

**Layout:**
- Full-width Heikin Ashi candlestick chart (TradingView Lightweight Charts)
- Top bar: Coin selector dropdown + Timeframe tabs (15m | 1H | 4H)
- Chart area: HA candles + signal triangle overlays
- Right panel (320px): selected signal detail - AI rationale, SL/TP, confidence, timestamp

**Free plan restriction:**
- BTC only. Other coins show blurred placeholder + "Pro" overlay.
- 1H and 4H tabs show lock icon + tooltip: "Multi-timeframe charts on Pro."

**Chart interactions:**
- Click a signal triangle → highlights signal, loads it in right panel
- Hover on candle → shows OHLCV tooltip
- Pinch to zoom (mobile)

---

### Tab 3 - History

Table of all signals the account has received:

| Column | Detail |
|---|---|
| Date/Time | UTC timestamp, sortable |
| Pair | e.g. BTC/USDT |
| Type | 🟢 Buy / 🔴 Sell badge |
| Timeframe | 15m / 1H / 4H |
| Entry Price | Monospace |
| Status | Open / Closed / Expired |
| Result | +5.0% ✅ / -1.4% ❌ / - (if open) |
| Confidence | Score at time of signal |

**Controls:** Sortable columns, date range filter, coin filter, type filter

**Export:** "Export CSV" button (Pro+ only - locked on Free with upgrade prompt)

---

### Tab 4 - Track Record

Two sub-tabs:

**Sub-tab A: My Performance** (personal stats)
- Only signals from coins on the user's plan
- Win rate, avg return, avg confidence, total signals followed
- Equity curve chart (portfolio growth if 1% per trade)

**Sub-tab B: All Sanddock Signals** (public, same data as `/track-record`)
- Full history, all signals ever fired
- Shows wins and losses
- Filterable by coin, type, timeframe, date range

---

### Upgrade Prompt Triggers & Copy

| Trigger | Modal Headline | Body |
|---|---|---|
| Clicks non-BTC signal | "Unlock ETH signals on Pro" | "Get real-time Buy/Sell signals for ETH, SOL, BNB, and 7 more coins - from $29/mo." |
| Goes to Telegram settings on Free | "Telegram alerts are on Pro" | "Get signals pushed to your phone within seconds of firing. Set up in 2 minutes." |
| Clicks CSV export | "Export your signal history" | "Download your full signal history as CSV on Pro and Master." |
| Clicks 1H/4H timeframe tab | "Multi-timeframe signals on Pro" | "Unlock 1-hour and 4-hour Heikin Ashi signals for stronger confluence." |
| Hovers SL/TP on Free | "See Stop Loss & Take Profit levels" | "Know your risk before every trade. SL/TP included on Pro and Master." |
| 7 days as free user (banner) | "You've been with us a week 👋" | "Ready for more than BTC? Unlock 10 coins, Telegram alerts, and SL/TP - from $19/mo on the annual plan." |

All upgrade modals include:
- Plan name + price
- 3 key features unlocked
- "Upgrade now →" primary button
- "Maybe later" ghost link (dismisses modal, doesn't show again for 72 hours)

---

## 8. Feature Specification by Plan

### Signal Engine

| Feature | Free | Pro | Master |
|---|---|---|---|
| Heikin Ashi signal detection | ✅ | ✅ | ✅ |
| BTC/USDT signals | ✅ | ✅ | ✅ |
| Top 10 coins (ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, MATIC, DOT, LTC) | ❌ | ✅ | ✅ |
| 50+ coins (all top Binance pairs) | ❌ | ❌ | ✅ |
| 15m timeframe | ✅ | ✅ | ✅ |
| 1H timeframe | ❌ | ✅ | ✅ |
| 4H timeframe | ❌ | ✅ | ✅ |
| AI confidence score (visible) | ✅ | ✅ | ✅ |
| AI plain-English rationale | ✅ | ✅ | ✅ |
| Entry price | ✅ | ✅ | ✅ |
| Stop Loss level | ❌ (locked) | ✅ | ✅ |
| Take Profit level | ❌ (locked) | ✅ | ✅ |
| Custom lookback window (5–20 bars) | ❌ | ❌ | ✅ |
| Custom SL/TP ratios per coin | ❌ | ❌ | ✅ |
| Multi-timeframe confluence scoring | ❌ | ❌ | ✅ |

### Delivery & Alerts

| Feature | Free | Pro | Master |
|---|---|---|---|
| Web dashboard | ✅ | ✅ | ✅ |
| Telegram alerts (1 group) | ❌ | ✅ | ✅ |
| Telegram alerts (unlimited groups/channels) | ❌ | ❌ | ✅ |
| Daily email signal digest | ❌ | ✅ | ✅ |
| Outbound webhook / API | ❌ | ❌ | ✅ |
| Discord webhook | ❌ | ❌ | ✅ |
| Custom alert rules (coin/confidence threshold filter) | ❌ | ❌ | ✅ |

### Analytics & History

| Feature | Free | Pro | Master |
|---|---|---|---|
| Signal history | 7 days | 30 days | Unlimited |
| Public track record (view) | ✅ | ✅ | ✅ |
| Personal performance stats | ❌ | ✅ | ✅ |
| P&L calculator | ❌ | ✅ | ✅ |
| Backtesting (90-day lookback) | ❌ | ✅ | ✅ |
| Backtesting (full history) | ❌ | ❌ | ✅ |
| CSV export | ❌ | ✅ | ✅ |
| Equity curve view | ❌ | ✅ | ✅ |

### Support & Community

| Feature | Free | Pro | Master |
|---|---|---|---|
| Community Telegram access (read-only) | ✅ | ✅ | ✅ |
| Community Telegram (full posting) | ❌ | ✅ | ✅ |
| Email support | ❌ | ✅ (48h) | ✅ (12h) |
| Priority Discord support | ❌ | ❌ | ✅ |
| Early access to new features | ❌ | ❌ | ✅ |
| Founding Member badge (launch period) | ❌ | ❌ | ✅ |

---

## 9. Pricing Plans - Exact Numbers & Limitations

### Pricing Table

| | Free | Pro | Master | Lifetime |
|---|---|---|---|---|
| **Monthly price** | $0 | **$29/mo** | **$79/mo** | **$799 one-time** |
| **Annual price** | $0 | **$19/mo** ($228/yr) | **$49/mo** ($588/yr) | - |
| **Annual saving** | - | Save 34% ($120/yr) | Save 38% ($360/yr) | - |
| **Best for** | Testing the product | Active retail traders | Power users, community admins | Committed long-term users |
| **Equivalent value** | - | - | - | ~13 months of Master |

---

### Free Plan - $0/mo (Forever)

**Purpose:** Top-of-funnel trust builder. Show enough value that upgrading feels like a no-brainer.

**Strategy:** Give full AI rationale (our best feature) but lock SL/TP, Telegram, and non-BTC coins. This makes the user experience real value AND see clearly what they're missing.

**Included:**
- BTC/USDT signals only (15m timeframe only)
- Real-time signals (not delayed - respect the user)
- Web dashboard access
- Full AI explanation text on every signal
- Confidence score visible
- Signal history: last 7 days
- Public track record access (read-only)
- Basic BTC chart view

**Limitations (locked features shown with upgrade prompt):**
- 1 coin only (BTC)
- No Stop Loss levels (blurred/locked)
- No Take Profit levels (blurred/locked)
- No Telegram alerts
- No email alerts
- No 1H/4H timeframe signals
- No personal performance stats
- No P&L calculator
- No CSV export
- No backtesting
- No API/webhook

**Free plan upgrade triggers (exactly when to show prompts):**
- Clicks any non-BTC coin or signal
- Hovers over locked SL/TP level
- Goes to Settings → Telegram
- Attempts to view 1H or 4H tab
- Clicks "Export CSV"
- 7 days after signup (banner prompt)
- 14 days after signup (email prompt)

---

### Pro Plan - $29/mo | $19/mo (billed annually at $228/yr)

**Purpose:** Main revenue driver. Everything an actively trading retail user needs.

**Annual pricing nudge:** Show annual as the first/default option with "Most popular" badge. Monthly available via toggle.

**Everything in Free, plus:**
- 10 coins: BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, MATIC, DOT, LTC (11 total)
- 15m + 1H + 4H timeframe signals
- Stop Loss and Take Profit levels on every signal
- Telegram alerts (1 group or DM)
- Daily email digest of signals
- Signal history: last 30 days
- Personal performance stats
- P&L calculator (track % return on followed signals)
- Backtesting: last 90 days of signal history
- CSV export
- Equity curve view
- Community Telegram full access
- Email support (48-hour response)

---

### Master Plan - $79/mo | $49/mo (billed annually at $588/yr)

**Purpose:** Power users, serious traders, people running their own signal communities on Telegram.

**Everything in Pro, plus:**
- 50+ coins (all top Binance pairs by market cap)
- Unlimited Telegram groups and channels
- Discord webhook support
- Advanced AI: multi-timeframe confluence scoring (15m + 1H + 4H alignment score)
- Full backtesting (entire signal history, unlimited lookback)
- Custom lookback window (5–20 bars, per coin)
- Custom SL/TP ratios per coin
- Outbound webhook + API access (for connecting to Cornix, 3Commas, etc.)
- Portfolio tracker (track open positions against signals)
- Priority email support (12-hour response)
- Priority Discord support channel
- Early access to all new features before public release
- Founding Master badge on community profile

---

### Lifetime Deal - $799 one-time

**Purpose:** Generate launch-stage cash flow, reward early believers, create loyal permanent advocates.

**Positioning:** "Less than 11 months of Master. Yours forever."

**Included:**
- All Master plan features, forever
- All future feature updates (no annual fee, ever)
- Founding Lifetime Member badge
- Listed on Founding Members wall on `/about` page (opt-in)
- Priority onboarding call: 30-min Zoom with the Sanddock team (first 100 members only)

**Scarcity:** Hard limit of 500 founding lifetime spots. Show a live counter: "312 of 500 remaining." Remove the offer permanently at 500.

**Urgency message (on pricing page):**
```
⚡ Founding Member Offer
Only 188 spots left at this price.
When they're gone, Master is available
as a monthly/annual subscription only.
```

**Refund policy for Lifetime:** Full refund within 30 days, no questions asked. Note this clearly on the checkout page.

---

### Pricing Page Layout (`/pricing`)

**Section order:**

1. **Hero:** "Simple pricing. No surprises."
   Sub: "Start free on Bitcoin. Upgrade when the signals prove themselves."

2. **Toggle:** Monthly / Yearly - default Yearly to maximize annual subscriptions (show "Save 38%" badge)

3. **Three plan cards in a row:** Free | Pro | Master
   - Pro card: `2px solid #ff5722` border + "Most popular" badge
   - All cards: plan name, price, 5 headline features, CTA button

4. **Lifetime deal banner** (below the 3 cards)
   Full-width dark card with orange accent: plan name, price, founding counter, 3 key perks, CTA

5. **Full feature comparison table**
   All features, grouped by category, all three plans + Lifetime column

6. **FAQ section**
   "Can I switch plans?", "What happens if I cancel?", "Do you offer refunds?", "Is the Lifetime deal really forever?", "What coins are on Pro vs Master?"

7. **Final CTA:** "Not sure? Start free - no card needed →"

---

### Billing & Cancellation Policy

| | Monthly | Annual | Lifetime |
|---|---|---|---|
| Cancel | Anytime, 1 click | Anytime, access until period end | No cancel - permanent |
| Refund | No refund on current period | 14-day money-back, no questions | 30-day money-back, no questions |
| Price lock | No (can change with notice) | Locked for the paid year | Locked forever |
| Cancellation method | 1 click in account settings | 1 click in account settings | N/A |

> **No "email us to cancel" friction. Ever.** This is the #1 complaint about competitors. One click, done.

---

## 10. Telegram Integration

### How It Works (Technical)

1. Sanddock operates a Telegram Bot registered via `@BotFather`
2. Each user account has a unique 6-digit pairing code generated on the backend
3. User opens `@SanddockBot` on Telegram and sends `/start`
4. Bot replies with instructions and prompts for the pairing code
5. User pastes their code → bot sends code to Sanddock API → API links `telegram_chat_id` to `user_id` in database
6. Signal engine calls `tg_send()` when a new signal fires → delivers to linked chat_id
7. When signal "slides" to a better price → `tg_edit()` updates the existing message (no duplicate alert)
8. "Commit" action → no new message, state cleared internally

### Telegram Alert Format

```
🟢 Buy @ $67,432.15
BTC/USDT · 15m HA · 2024-11-01 14:15 UTC

Confidence: 87% ████████░░ HIGH
SL: $65,800.00 (-2.4%)
TP: $70,850.00 (+5.1%)

AI: Swing bottom confirmed. HA low is lowest
in 10 bars. Volume 23% above average.

sanddock.com
```

```
🔴 Sell @ $68,120.00
BTC/USDT · 15m HA · 2024-11-01 15:00 UTC

Confidence: 74% ███████░░░ MEDIUM
SL: $69,400.00 (+1.9%)
TP: $65,800.00 (-3.4%)

AI: Swing top confirmed. HA high is highest
in 10 bars. Previous swing bottom committed.

sanddock.com
```

### Master Plan - Multi-Group Delivery

- User adds multiple Telegram groups/channels via the settings UI
- Each group can be configured with filters:
  - Coins: All | specific coin list
  - Signal types: All | Buy only | Sell only
  - Minimum confidence: 50% | 60% | 70% | 75% | 80%+
- Use case: running a public Telegram signal channel powered by Sanddock on the backend

---

## 11. Technical Requirements

### Recommended Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript | SSR for SEO, fast, React ecosystem |
| Styling | Tailwind CSS | Rapid UI development, design system friendly |
| Charts | TradingView Lightweight Charts | Free, fast, crypto-native, 60fps |
| Backend API | Node.js (Fastify) or Python (FastAPI) | Matches the Python signal engine |
| Signal Engine | Python (live-signal.py as core service) | Existing proven implementation |
| Database | PostgreSQL | Signals, users, history, track record |
| Caching | Redis | Live signal cache, session data |
| Auth | NextAuth.js or Supabase Auth | Email + Google OAuth, session management |
| Payments | Stripe | Subscriptions + one-time lifetime, webhooks |
| Telegram | python-telegram-bot or raw Bot API | Signal delivery |
| Email | Resend | Transactional email (verification, digest) |
| Frontend hosting | Vercel | Automatic CI/CD, edge network |
| Backend hosting | Railway or Render | Signal engine as persistent background service |
| Error tracking | Sentry | Client + server error monitoring |
| Analytics | PostHog | Product analytics, funnel tracking, feature flags |
| File storage | Cloudflare R2 or S3 | OG images, user avatars |

---

### Signal Engine Integration

The existing `live-signal.py` is the core of the signal engine. It runs as a persistent background service alongside the main API.

**Integration flow:**
1. Signal engine detects event → writes to `signals` table in PostgreSQL with all metadata (type, price, confidence, rationale, bar_time, action)
2. Signal engine simultaneously fires Telegram alert to all subscribed users via Bot API
3. Frontend polls the `signals` API endpoint every 15 seconds (or connects via WebSocket for real-time push)
4. Dashboard renders new signals as they arrive

**Database schema additions (key tables):**

```sql
-- Signals table
signals (
  id, created_at, symbol, timeframe,
  signal_type,     -- 'buy' | 'sell'
  action,          -- 'new' | 'slide' | 'commit'
  price,           -- entry price at moment of firing
  bar_time,        -- HA bar timestamp
  confidence,      -- 0-100 AI confidence score
  rationale,       -- AI-generated text
  sl_price,        -- stop loss
  tp_price,        -- take profit
  sl_pct,          -- stop loss %
  tp_pct,          -- take profit %
  closed_at,       -- null if open
  close_price,     -- null if open
  result_pct,      -- null if open, final % when closed
  is_win           -- null if open, true/false when closed
)

-- Users table
users (
  id, email, name, created_at,
  plan,              -- 'free' | 'pro' | 'master' | 'lifetime'
  plan_started_at,
  plan_ends_at,
  experience_level,  -- from onboarding
  risk_style,        -- from onboarding
  primary_goal,      -- from onboarding
  coins_selected,    -- JSON array from onboarding
  alert_delivery,    -- JSON: { web: true, telegram: true }
  telegram_chat_id,  -- null if not connected
  telegram_verified_at,
  onboarding_completed_at
)
```

---

### AI Confidence Model (MVP - v1 Rule-Based)

Ship a rule-based heuristic for launch. Replace with ML model in v2.

**Scoring logic:**

```python
def calculate_confidence(signal, ha_data, volume_data, market_hours):
    score = 60  # Base score

    # Trend alignment: +10 if signal direction matches 1H trend
    if is_aligned_with_1h_trend(signal, ha_data):
        score += 10

    # Volume confirmation: +10 if volume > 20-bar average at signal bar
    if volume_data['current'] > volume_data['avg_20bar'] * 1.0:
        score += 10

    # Structure quality: +5 if previous swing was cleanly committed
    if previous_swing_cleanly_committed(ha_data):
        score += 5

    # Round number proximity: -10 if within 2% of major round number
    if near_round_number(signal['price'], threshold=0.02):
        score -= 10

    # Off-hours penalty: -5 outside peak UTC 08:00-20:00
    if not is_peak_hours(market_hours):
        score -= 5

    # Clamp to 40-95 range
    return max(40, min(95, score))
```

**AI rationale template (v1):**

```python
def generate_rationale(signal, score, volume_data, trend_aligned):
    base = f"{'Swing bottom' if signal['type'] == 'buy' else 'Swing top'} confirmed. "
    base += f"HA {'low' if signal['type'] == 'buy' else 'high'} is the {'lowest' if signal['type'] == 'buy' else 'highest'} point in the last {lookback} bars. "

    if volume_data['current'] > volume_data['avg_20bar']:
        pct = round((volume_data['current'] / volume_data['avg_20bar'] - 1) * 100)
        base += f"Volume is {pct}% above the 20-bar average, adding confluence. "

    if trend_aligned:
        base += f"Signal is aligned with the 1H trend direction. "

    return base.strip()
```

---

### Performance Requirements

| Metric | Target |
|---|---|
| Signal → Telegram delivery | < 5 seconds |
| Dashboard signal feed refresh | 15s polling or WebSocket push |
| Homepage LCP (Core Web Vitals) | < 2.5 seconds |
| Homepage First Contentful Paint | < 1.2 seconds |
| Signal engine uptime | 99.5%+ |
| Chart render to interactive | < 500ms |
| API response time (p95) | < 200ms |

---

## 12. SEO & Marketing Infrastructure

### SEO Blog Posts - Launch Backlog

| URL | Target Keyword | Monthly Volume Est. | Type | Priority |
|---|---|---|---|---|
| `/blog/what-are-heikin-ashi-signals` | "heikin ashi signals" | Medium | Educational | P1 |
| `/blog/best-crypto-signals-telegram-2025` | "crypto signals telegram" | High | Comparison | P1 |
| `/blog/how-to-read-crypto-signals` | "how to read crypto signals" | Medium | Educational | P1 |
| `/blog/bitcoin-swing-trading-signals` | "bitcoin trading signals" | High | Pillar | P1 |
| `/blog/ai-crypto-trading-tools-compared` | "AI crypto trading tools" | Growing | Comparison | P2 |
| `/blog/sanddock-vs-cryptosignals-org` | "cryptosignals org alternative" | Low | Comparison | P2 |
| `/blog/free-crypto-signals-that-actually-work` | "free crypto signals" | High | High-intent | P1 |
| `/blog/crypto-signal-accuracy-explained` | "crypto signal accuracy" | Medium | Educational | P2 |
| `/blog/what-is-a-swing-top-swing-bottom` | "swing top swing bottom crypto" | Low | Educational | P3 |

**Blog post structure for each:**
- H1: target keyword naturally in title
- 1,500–2,500 words
- Introduce Sanddock naturally in context (not forced)
- CTA section at the end: "Try Sanddock free →"
- Author byline: "Sanddock Research Team" with avatar
- Published date + last updated date (important for freshness signal)
- Internal links to `/track-record` and `/pricing`

---

### Affiliate Program

| Parameter | Value |
|---|---|
| Commission | 40% recurring on all paid plan payments |
| Cookie duration | 90 days |
| Payout minimum | $50 |
| Payout schedule | Monthly, 15th of each month |
| Payout method | USDT (crypto) or PayPal |
| Affiliate dashboard | Real-time: clicks, signups, conversions, earnings |
| Affiliate signup page | `/affiliates` (public, no login required) |

**Primary affiliate targets:**
- Telegram community admins with 1k+ members in crypto groups
- YouTube creators covering crypto trading (any size - micro-influencers convert well)
- Twitter/X accounts posting crypto technical analysis
- Crypto blog owners (SEO-focused)

**Affiliate outreach message:**
> "Hey [name] - I built Sanddock, an AI crypto signal tool with a public verified track record. We pay 40% recurring commission. If your audience trades crypto, this converts well. Want a free Master account to test it first?"

---

### Free Telegram Channel (Top-of-Funnel Engine)

- Channel: `Sanddock Signals (Free)` - public Telegram channel
- Posts: BTC signals only (same as free plan), in real-time
- Pinned post: upgrade message explaining what Pro/Master adds
- Posting format: same as Telegram alert format above
- Weekly post: "This week's Sanddock results - [X wins, Y losses, Z% win rate]"
- Growth target: 2,000 members by month 3, 5,000 by month 6

---

## 13. $10K MRR Roadmap

### The Math

| Scenario | ARPU | Subscribers Needed |
|---|---|---|
| 80% Pro + 20% Master | ~$37 | ~270 |
| 60% Pro + 40% Master | ~$49 | ~204 |
| 50% annual + 50% monthly | Blended ~$40 | ~250 |

**Conversion funnel assumption:**
- Free→Paid conversion: 3–5% (industry average for crypto tools)
- At 3%: need ~8,000 free users to get 240 paying
- At 5%: need ~5,000 free users to get 250 paying

**Monthly churn target:** < 6% (industry average is 6–8%)

At 6% monthly churn: losing ~15 subscribers/month at 250 subs
Need to acquire ~15 new paid subs/month just to stay flat.
**Net new target: 20–25 new paid subs/month by Month 9**

---

### Phase 1 - Months 0–3: Prove the Signal

**Goal:** Build trust infrastructure before selling anything.

| Action | Detail |
|---|---|
| Launch free Telegram channel | Post real BTC signals publicly, no signup required |
| Launch web app (free plan only) | Full dashboard, no paid plan yet |
| Post weekly track record | Twitter/X + Telegram every Sunday - wins AND losses |
| Build first 3 SEO blog posts | Target long-tail keywords |
| DO NOT push paid plans yet | Wait for 60-day track record before monetizing |

**Month 3 targets:**
- 2,000 free Telegram channel members
- 500 free web account signups
- 60-day public track record live
- Win rate publicly visible and above 60%

---

### Phase 2 - Months 3–6: Convert

**Goal:** Turn free users into paying subscribers.

| Action | Detail |
|---|---|
| Activate Stripe + Pro plan | Enable payments, launch pricing page |
| Lifetime deal launch | First 500 spots, $799, heavy promotion for 30 days |
| Launch affiliate program | 40% recurring, recruit first 20 affiliates |
| 3 YouTube micro-influencer sponsorships | $300–$800 per video, targeted crypto audiences |
| Weekly performance email to free users | "Here's what Sanddock signaled this week" with upgrade CTA |
| In-product upgrade triggers live | All 7 trigger points active |

**Month 6 targets:**
- 100 paying subscribers (~$3–4k MRR)
- 50–100 Lifetime deals sold (~$40–80k cash)
- 20 active affiliates driving signups
- 5,000 free Telegram members

---

### Phase 3 - Months 6–12: Scale to $10k MRR

**Goal:** Hit the MRR target through affiliate scale + SEO + annual plan push.

| Action | Detail |
|---|---|
| Master plan launch | Enable advanced features, higher price tier |
| Annual plan push | Dedicated campaign, email + in-app prompt to monthly subs |
| SEO compounding | Content from Phase 2 starts ranking, driving organic signups |
| Double affiliate network | Target 50+ active affiliates |
| Add 40+ more coins (Master) | Expand coin coverage to justify Master ARPU |
| Monthly "Signal Report" newsletter | Retention play for paid users |

**Month 12 targets:**
- 250 paying subscribers
- $40 blended ARPU
- **$10,000 MRR** ✅
- < 6% monthly churn (target by pushing annual plans)
- 10,000+ free Telegram channel members (ongoing acquisition engine)

---

### Retention Tactics

| Tactic | Detail |
|---|---|
| Monthly signal performance email | "Your Sanddock signals in October: 8 wins, 3 losses, +31% if risked 1% each" |
| Annual plan discount at 3 months | Email monthly subs: "Lock in your rate and save 34% - switch to annual" |
| In-app achievement badges | "100 signals tracked", "First winning streak of 5", "1-year member" |
| Win notification emails | "Your BTC signal from yesterday just hit take-profit (+5.1%) 🎯" |
| Re-engagement at 7 days inactive | "We've had 12 signals since your last visit. Here's what you missed." |
| Churn save flow on cancellation | Show last 30-day performance. Offer 1 month free before canceling. |

---

## 14. Legal Disclaimer Template

Place in footer on every page, on the pricing page, and at the bottom of every blog post:

---

*Sanddock provides technical analysis signals for educational and informational purposes only. Nothing on Sanddock.com, in our Telegram channels, or in any Sanddock communication constitutes financial advice, investment advice, trading advice, or any other form of advice. Sanddock is not a registered investment advisor. Past signal performance is not indicative of future results. Cryptocurrency trading involves substantial risk of loss and is not appropriate for every investor. Never invest money you cannot afford to lose. Always conduct your own research before making any trading or investment decision.*

---

*Document: Sanddock Product Specification v1.0*
*Prepared for: Antigravity Development Team*
*Last updated: 2025*