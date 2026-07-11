# Implementation Plan - Remove Free Trial, Gated Telegram Invites & Payment Prompts

We will remove the 7-day free trial limitations, ensuring free users have perpetual access to live BTC signals. We will restrict Telegram channels by plan (Free group for free users, Pro channel for Pro users, Master channel for Master users, and Grandmaster channel for Lifetime users) and implement private 1-invite gating for paid tiers. Finally, we will show payment success popups on `/billing` and signup success popups on `/terminal`.

## Proposed Changes

### 1. Database Schema
- [x] Create [add_telegram_invite_columns.sql](file:///c:/Users/GHURU%20PRASAATH/Desktop/sanddock/supabase/migrations/add_telegram_invite_columns.sql) to add `telegram_invite_link` and `telegram_invite_claimed` columns to `profiles`.

### 2. Authentication Context (`src/context/AuthContext.js`)
- Remove the trial expiration check (`trialExpired = false`).
- Update `checkExpiry` function to support checking plan expiry for `pro`, `master`, and `lifetime` plans.
- If a paid plan is expired, update the profile to plan = `'free'`, `subscription_status = 'expired'`, and clear their Telegram settings: `telegram_chat_id = null`, `telegram_invite_link = null`, and `telegram_invite_claimed = false`.
- Log the mock eviction to the console: `[Telegram Bot] Evicting user from Telegram channel due to plan expiry`.
- When creating a profile (both real Supabase and local mock profiles), initialize `subscription_status` as `'active'` (or `'free'`) and set `trial_ends_at` to `null` to bypass any legacy trial limitations.

### 3. Billing Status API (`src/app/api/billing/status/route.js`)
- Update the API to return `isTrialExpired: false`, `trialDaysRemaining: null`, and `trialEndsAt: null` for free users.

### 4. Billing Expiry Check API (`src/app/api/billing/expiry-check/route.js`)
- Update the check to query expired subscriptions for `pro`, `master`, and `lifetime` users.
- Downgrade expired users to `free` and set `trial_ends_at = null`, `telegram_chat_id = null`, `telegram_invite_link = null`, and `telegram_invite_claimed = false`.
- Print verification logs indicating eviction of the expired users from their respective paid channels.

### 5. Dodo Payments Webhook (`src/app/api/webhooks/dodopayments/route.js`)
- In `subscription.on_hold` and `subscription.failed` cases, set `telegram_chat_id = null`, `telegram_invite_link = null`, and `telegram_invite_claimed = false` to clear pairing and invite credentials immediately upon downgrade.

### 6. Terminal Dashboard (`src/app/terminal/page.jsx`)
- Remove all trial expired overlays, warnings, and banners.
- Change `isTrialExpired` variables to evaluate to `false` permanently.
- Remove timeframe locks (1h, 4h) for BTC signals (since BTC signals are always 100% open).
- Restructure the **Console Settings** Alert Delivery step:
  - **Free tier**: Link to public BTC Telegram Group (`https://t.me/sanddock_free_btc`) with unlimited invites.
  - **Pro/Master/Lifetime tier**: Private channel link with **1 invite allowed**. If they click "Join Channel", generate a private link (`https://t.me/joinchat/sanddock_[plan]_private_invite_xxx`), mark it as claimed, and save it to the profile. Once claimed, show "Invite claimed (1/1 limit reached)" and prevent further invite creation.
- Add a URL query parameter parser in `useEffect`. If `signup_success=true` is present, show a premium **Free Signup Success Modal** prompting them to join the free public BTC Telegram alert group.
- Update `/onboarding` redirection to point to `/terminal?signup_success=true`.

### 7. Billing Page (`src/app/billing/page.jsx`)
- Remove the trial progress bar and trial expiration warnings for free users.
- Display "Free Tier" or "Active" badge instead of "Trial Active" for free users.
- Add a URL query parameter parser in `useEffect`. If `success=true` is present, show a premium **Upgrade Success Modal** celebrating their payment success and prompting them to link Telegram and claim their private channel invitation.

### 8. Pricing Page (`src/app/pricing/page.jsx`)
- Rename "7-Day Free Trial" to "Free Plan".
- Change free sublabel from "No credit card required" to "Always open to BTC signals".
- Update feature grids and FAQs to clarify that BTC signals are permanently free, while altcoins/SL/TP/private Telegram alerts require upgrading.
- Replace button text "Start Free Trial →" with "Get Started Free →".
- Remove trial expired alerts/banners.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify Next.js compiles the modified files successfully.

### Manual Verification
- Test registration/onboarding and verify redirect to `/terminal?signup_success=true` shows the Free BTC group popup.
- Verify that BTC signals are 100% visible on 15m, 1h, and 4h timeframes for free users.
- Simulate a successful upgrade payment redirect `/billing?success=true&plan=pro` or `&plan=lifetime` and verify the premium payment success modal displays, allowing generation of exactly one invite.
- Verify settings page correctly reflects channel invite claim status and shows "Invite claimed (1/1 limit reached)" for paid users.
