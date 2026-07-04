# Onboarding Wizard, Terminal Console Renaming & Database Schema Walkthrough

We have successfully deleted the legacy `/demo-dashboard` workspace, renamed and expanded the secure dashboard space into `/terminal`, created the 5-step onboarding wizard at `/onboarding`, and provided Supabase SQL migration files under the `supabase/migrations/` folder.

## Implemented Work

### 1. Terminal Console Audit Refinements
- **No Stacked Banners**: Collapsed the yellow Telegram warning strip into the sidebar as a neat, non-intrusive alert box. Only the blue upgrade banner displays at the top of the signals feed.
- **Internal Dashboard Scrolling**: Refactored the terminal page layout to use `h-screen overflow-hidden` on the outer wrapper, forcing the main signals feed container (`overflow-y-auto`) to scroll internally. This prevents cut-off bugs on the bottom-right signal cards.
- **Multiple Default Card Expansion**: Initialized the expanded cards state as a dictionary (`expandedSignals = { 'sig-1': true, 'sig-4': true }`), allowing both free signals to show all entry, target, and AI rationale parameters on initial load.
- **Consistent Lock Colors**: Swapped yellow lock buttons and emojis for premium brand blue (`#3D5AFE`) gating markers.
- **Cleaned Up Indicators**: Removed confusing gray dots from locked coin cards since their locked status is already represented by the card structure.
- **Simplified Rationale Labels**: Removed the technical "Heikin Ashi Confirmation" secondary pill tags from the AI rationale headers to focus on user readability.
- **Sidebar Upgrade Card**: Rendered a premium upgrade card in the sidebar highlighting current asset coverage (`"Free Plan - 1 of 11 coins active. Upgrade to Pro"`).
- **Banner Emojis Refinement**: Replaced the rocket emoji with a lightning bolt (`⚡`) inside the main upgrade banner.

### 2. Onboarding API & RLS Policy Mitigation
- **Split Update-then-Insert Pattern**: Refactored the `updateProfile` method inside `src/context/AuthContext.js` to attempt an `update` query first. If no profile row is found, it falls back to an `insert` query. This bypasses client-side insert security violations completely for users with pre-existing profiles.
- **Profiles RLS Insert Policy**: Added the missing RLS insert policy (`Allow users to insert their own profile`) under `supabase/migrations/20260627230000_create_schema.sql` to permit client-side inserts.

### 3. Signal Log Synchronization
- **Forced Loss Removal**: Removed the artificial `forceLoss` simulation inside [route.js](file:///c:/Users/GHURU%20PRASAATH/Desktop/sanddock/src/app/api/signals/log/route.js) which randomly introduced simulated losses in the Signal History Ledger. This ensures that the closed signals shown in the Signal Log tab match the true swing signals shown in the Live Signals and the Heikin Ashi chart.

### 4. Signal Database Logging & Performance Charts
- **Database Unique Constraint**: Applied a unique constraint `unique_symbol_interval_bar_time` on the `public.signals` table via a migration script, ensuring no duplicate entries are saved.
- **Auto-Sync to Database**: Modified `/api/signals/log` to upsert all processed signals (both open and closed) into the Supabase database.
- **Closed Signals History API**: Added a new `/api/signals/history` endpoint that queries the closed signals from the database with built-in range filtering (`today`, `1w`, `30d`, `6m`, `1y`).
- **Premium Performance Line Chart**: Built a premium, interactive custom SVG [PerformanceChart](file:///c:/Users/GHURU%20PRASAATH/Desktop/sanddock/src/components/PerformanceChart.jsx) that calculates and displays running Cumulative P&L and Win Rate with glow states, gradient shadows, grid lines, and interactive tooltips.
- **Integrations**: 
  - Integrated range filtering and the performance chart in the [SignalDetailPage](file:///c:/Users/GHURU%20PRASAATH/Desktop/sanddock/src/app/terminal/signals/%5Bid%5D/page.jsx), feeding from the database instead of mock data.
  - Refactored `fetchSignal` to query Supabase first for the exact parameters (`sl_price`, `tp_price`, etc.) and fall back to the fully populated `/api/signals/log` calculation endpoint instead of `chart/signals`, resolving the price and parameter mismatch bugs.
- **Unique swing_group_id**: Updated the `/api/signals/log` and `/api/signals/live` route handlers to populate `swing_group_id` with a dynamically generated UUID (v4) via `crypto.randomUUID()`, avoiding any long/custom concatenated identifiers.

## Verification

- Built the project successfully with `npm run build` and verified compile-time correctness:
  ```bash
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ƒ /api/backtest/results
  ├ ƒ /api/chart/candles
  ├ ƒ /api/chart/signals
  ├ ƒ /api/performance/summary
  ├ ƒ /api/signals/history
  ├ ƒ /api/signals/live
  ├ ƒ /api/signals/log
  ├ ○ /contact
  ├ ○ /login
  ├ ○ /onboarding
  ├ ○ /pricing
  ├ ○ /signup
  ├ ○ /terminal
  ├ ƒ /terminal/signals/[id]
  └ ○ /verify-email
  ```
