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
- **Sidebar Upgrade Card**: Rendered a premium upgrade card in the sidebar highlighting current asset coverage (`"Free Plan — 1 of 11 coins active. Upgrade to Pro"`).
- **Banner Emojis Refinement**: Replaced the rocket emoji with a lightning bolt (`⚡`) inside the main upgrade banner.

### 2. Onboarding API & RLS Policy Mitigation
- **Split Update-then-Insert Pattern**: Refactored the `updateProfile` method inside `src/context/AuthContext.js` to attempt an `update` query first. If no profile row is found, it falls back to an `insert` query. This bypasses client-side insert security violations completely for users with pre-existing profiles.
- **Profiles RLS Insert Policy**: Added the missing RLS insert policy (`Allow users to insert their own profile`) under `supabase/migrations/20260627230000_create_schema.sql` to permit client-side inserts.

## Verification

- Built the project successfully with `npm run build` and verified compile-time correctness:
  ```bash
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ○ /contact
  ├ ○ /login
  ├ ○ /onboarding
  ├ ○ /pricing
  ├ ○ /signup
  ├ ○ /terminal
  └ ○ /verify-email
  ```
