# Onboarding Wizard, Terminal Console Renaming & Database Schema Walkthrough

We have successfully deleted the legacy `/demo-dashboard` workspace, renamed and expanded the secure dashboard space into `/terminal`, created the 5-step onboarding wizard at `/onboarding`, and provided Supabase SQL migration files under the `supabase/migrations/` folder.

## Implemented Work

### 1. Onboarding API & Query Crash Mitigation
- **Resilient Upsert Querying**: Updated the `updateProfile` method inside `src/context/AuthContext.js` to perform an `upsert` rather than an `update`. This ensures that even if a trigger function failed or has not run on the database, a new public profile row is safely generated on the fly.
- **Defensive Profile Creation Fallbacks**: Updated `fetchProfile` inside `AuthContext.js` to automatically insert a base profile row into the profiles table if no matching row is returned on session change.
- **Onboarding Error Catch Alerts**: Integrated user-facing alert UI widgets (`errorMsg` state) inside `src/app/onboarding/page.jsx`. If a database query fails (for example, if the user has not run the database schema SQL migration file), the page catches it and displays a warning with actionable instructions on how to copy and execute the SQL file.

### 2. Onboarding Step 1 Audit Enhancements
- **Dynamic Continue Button**: Setup the default state to `null` so the user is forced to select a preference. Once selected, an animated `Continue →` button slides up below the card deck to handle the action.
- **Skip Relocation**: Removed the top-right "Skip Setup" header link on Step 1, replacing it with a small `Skip personalisation for now →` ghost link below the Continue button at the bottom of the container.
- **Header Cleanups**: Hided the top solid orange card indicator lines. The steps progress is tracked cleanly by the 5 dots indicator.
- **Desktop Horizontal Grid**: Configured the 3 experience cards to stack side-by-side horizontally (`md:grid-cols-3`) on desktop layouts for better utilization of space, falling back to a vertical stack on mobile viewports.
- **Personalized Header Title**: Pulls the first name of the user from their profile/auth data to render a warm, customized greeting.
- **Brand SVG Icons**: Replaced emojis with custom inline SVG icons styled in the brand accent color.
- **Consequence Previews**: Added detail footers below each option card to give clear expectations.

### 3. Supabase SQL Database Migration
- Created SQL migration script `supabase/migrations/20260627230000_create_schema.sql` defining profiles table trigger function and signals.

### 4. Terminal Workspace Console (`/terminal`)
- Configured a dashboard console at `/terminal` representing the core secure app workspace with signals feed, interactive chart, and performance indicators.

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
