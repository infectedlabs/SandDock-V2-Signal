-- Create profiles table linked to auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  plan text default 'free'::text not null, -- 'free' | 'pro' | 'master' | 'lifetime'
  plan_started_at timestamp with time zone,
  plan_ends_at timestamp with time zone,
  experience_level text, -- 'beginner' | 'comfortable' | 'experienced'
  risk_style text, -- 'conservative' | 'balanced' | 'aggressive'
  primary_goal text, -- 'learn' | 'grow' | 'automate'
  coins_selected jsonb default '["BTC"]'::jsonb not null,
  alert_delivery jsonb default '{"web": true, "telegram": false}'::jsonb not null,
  telegram_chat_id text,
  telegram_verified_at timestamp with time zone,
  onboarding_completed_at timestamp with time zone
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles RLS Policies
create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow users to insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create trigger function to auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create signals table
create table public.signals (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  symbol text not null,
  timeframe text not null,
  signal_type text not null, -- 'buy' | 'sell'
  action text not null, -- 'new' | 'slide' | 'commit'
  price numeric not null,
  bar_time timestamp with time zone not null,
  confidence integer not null,
  rationale text not null,
  sl_price numeric,
  tp_price numeric,
  sl_pct numeric,
  tp_pct numeric,
  closed_at timestamp with time zone,
  close_price numeric,
  result_pct numeric,
  is_win boolean
);

-- Enable RLS on signals
alter table public.signals enable row level security;

-- Signals RLS Policies
create policy "Allow public read access to signals" on public.signals
  for select using (true);

create policy "Allow write access to service role / admin" on public.signals
  for all using (true);
