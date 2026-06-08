-- =============================================================================
-- Wearwise — Supabase Database Schema
-- Run this in the Supabase SQL editor (Database > SQL Editor > New query)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Custom ENUM types
-- ---------------------------------------------------------------------------
create type garment_category as enum (
  'top', 'bottom', 'shoes', 'outerwear', 'dress', 'accessory'
);

create type garment_formality as enum (
  'casual', 'smart-casual', 'formal'
);

create type outfit_rating as enum (
  'loved', 'worn', 'skipped'
);

create type subscription_tier as enum (
  'free', 'pro', 'premium'
);

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                 uuid        primary key default uuid_generate_v4(),
  email              text        not null unique,
  created_at         timestamptz not null default now(),
  style_profile      jsonb,
  subscription_tier  subscription_tier not null default 'free',
  push_token         text,
  timezone           text,
  city               text,
  calendar_connected boolean     not null default false
);

comment on table public.users is 'App user profiles and preferences';
comment on column public.users.style_profile is 'Free-form JSON: preferred styles, colours, body shape, etc.';

-- ---------------------------------------------------------------------------
-- 2. garments
-- ---------------------------------------------------------------------------
create table if not exists public.garments (
  id             uuid             primary key default uuid_generate_v4(),
  user_id        uuid             not null references public.users(id) on delete cascade,
  image_url      text             not null,
  category       garment_category not null,
  color          text,
  pattern        text,
  formality      garment_formality,
  season         text[]           default '{}',
  brand          text,
  purchase_price decimal(10, 2),
  tags           text[]           default '{}',
  times_worn     int              not null default 0,
  last_worn      date,
  created_at     timestamptz      not null default now()
);

comment on table public.garments is 'Individual clothing items belonging to a user';

-- ---------------------------------------------------------------------------
-- 3. outfits
-- ---------------------------------------------------------------------------
create table if not exists public.outfits (
  id               uuid         primary key default uuid_generate_v4(),
  user_id          uuid         not null references public.users(id) on delete cascade,
  garment_ids      uuid[]       not null default '{}',
  ai_explanation   text,
  occasion         text,
  weather_context  jsonb,
  rating           outfit_rating,
  worn_on          date,
  created_at       timestamptz  not null default now()
);

comment on table public.outfits is 'Complete outfit combinations, AI-generated or user-created';

-- ---------------------------------------------------------------------------
-- 4. wear_logs
-- ---------------------------------------------------------------------------
create table if not exists public.wear_logs (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  outfit_id    uuid        references public.outfits(id) on delete set null,
  garment_ids  uuid[]      not null default '{}',
  worn_date    date        not null,
  occasion     text,
  weather_temp int,
  weather_desc text,
  user_rating  int         check (user_rating between 1 and 5),
  notes        text,
  created_at   timestamptz not null default now()
);

comment on table public.wear_logs is 'Historical log of what the user actually wore each day';

-- ---------------------------------------------------------------------------
-- 5. daily_suggestions
-- ---------------------------------------------------------------------------
create table if not exists public.daily_suggestions (
  id               uuid        primary key default uuid_generate_v4(),
  user_id          uuid        not null references public.users(id) on delete cascade,
  date             date        not null,
  outfit_id        uuid        references public.outfits(id) on delete set null,
  score            float       not null default 0,
  reason_codes     text[]      default '{}',
  weather_snapshot jsonb,
  viewed           boolean     not null default false,
  acted_on         boolean     not null default false,
  created_at       timestamptz not null default now(),
  unique (user_id, date)
);

comment on table public.daily_suggestions is 'AI-generated daily outfit suggestions per user';

-- ---------------------------------------------------------------------------
-- 6. shopping_recs
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_recs (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  gap_type     text,
  product_name text        not null,
  product_url  text,
  price        decimal(10, 2),
  image_url    text,
  clicked      boolean     not null default false,
  purchased    boolean     not null default false,
  created_at   timestamptz not null default now()
);

comment on table public.shopping_recs is 'AI-detected wardrobe gaps and recommended purchases';

-- ---------------------------------------------------------------------------
-- 7. style_reports
-- ---------------------------------------------------------------------------
create table if not exists public.style_reports (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references public.users(id) on delete cascade,
  month             text        not null,
  pdf_url           text,
  insights          jsonb,
  most_worn         uuid[]      default '{}',
  least_worn        uuid[]      default '{}',
  cost_per_wear_avg decimal(10, 2),
  generated_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (user_id, month)
);

comment on table public.style_reports is 'Monthly AI-generated style analytics reports';

-- =============================================================================
-- Indexes
-- =============================================================================

-- users
create index if not exists idx_users_email         on public.users(email);
create index if not exists idx_users_created_at    on public.users(created_at);

-- garments
create index if not exists idx_garments_user_id    on public.garments(user_id);
create index if not exists idx_garments_created_at on public.garments(created_at);
create index if not exists idx_garments_category   on public.garments(category);
create index if not exists idx_garments_last_worn  on public.garments(last_worn);
create index if not exists idx_garments_season     on public.garments using gin(season);
create index if not exists idx_garments_tags       on public.garments using gin(tags);

-- outfits
create index if not exists idx_outfits_user_id    on public.outfits(user_id);
create index if not exists idx_outfits_created_at on public.outfits(created_at);
create index if not exists idx_outfits_worn_on    on public.outfits(worn_on);
create index if not exists idx_outfits_garment_ids on public.outfits using gin(garment_ids);

-- wear_logs
create index if not exists idx_wear_logs_user_id    on public.wear_logs(user_id);
create index if not exists idx_wear_logs_created_at on public.wear_logs(created_at);
create index if not exists idx_wear_logs_worn_date  on public.wear_logs(worn_date);
create index if not exists idx_wear_logs_outfit_id  on public.wear_logs(outfit_id);

-- daily_suggestions
create index if not exists idx_daily_suggestions_user_id    on public.daily_suggestions(user_id);
create index if not exists idx_daily_suggestions_created_at on public.daily_suggestions(created_at);
create index if not exists idx_daily_suggestions_date       on public.daily_suggestions(date);

-- shopping_recs
create index if not exists idx_shopping_recs_user_id    on public.shopping_recs(user_id);
create index if not exists idx_shopping_recs_created_at on public.shopping_recs(created_at);

-- style_reports
create index if not exists idx_style_reports_user_id    on public.style_reports(user_id);
create index if not exists idx_style_reports_created_at on public.style_reports(created_at);
create index if not exists idx_style_reports_month      on public.style_reports(month);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

alter table public.users            enable row level security;
alter table public.garments         enable row level security;
alter table public.outfits          enable row level security;
alter table public.wear_logs        enable row level security;
alter table public.daily_suggestions enable row level security;
alter table public.shopping_recs    enable row level security;
alter table public.style_reports    enable row level security;

-- ---------------------------------------------------------------------------
-- users policies
-- ---------------------------------------------------------------------------
create policy "users: select own row"
  on public.users for select
  using (auth.uid() = id);

create policy "users: insert own row"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users: update own row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users: delete own row"
  on public.users for delete
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- garments policies
-- ---------------------------------------------------------------------------
create policy "garments: select own"
  on public.garments for select
  using (auth.uid() = user_id);

create policy "garments: insert own"
  on public.garments for insert
  with check (auth.uid() = user_id);

create policy "garments: update own"
  on public.garments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "garments: delete own"
  on public.garments for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- outfits policies
-- ---------------------------------------------------------------------------
create policy "outfits: select own"
  on public.outfits for select
  using (auth.uid() = user_id);

create policy "outfits: insert own"
  on public.outfits for insert
  with check (auth.uid() = user_id);

create policy "outfits: update own"
  on public.outfits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "outfits: delete own"
  on public.outfits for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- wear_logs policies
-- ---------------------------------------------------------------------------
create policy "wear_logs: select own"
  on public.wear_logs for select
  using (auth.uid() = user_id);

create policy "wear_logs: insert own"
  on public.wear_logs for insert
  with check (auth.uid() = user_id);

create policy "wear_logs: update own"
  on public.wear_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "wear_logs: delete own"
  on public.wear_logs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_suggestions policies
-- ---------------------------------------------------------------------------
create policy "daily_suggestions: select own"
  on public.daily_suggestions for select
  using (auth.uid() = user_id);

create policy "daily_suggestions: insert own"
  on public.daily_suggestions for insert
  with check (auth.uid() = user_id);

create policy "daily_suggestions: update own"
  on public.daily_suggestions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_suggestions: delete own"
  on public.daily_suggestions for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- shopping_recs policies
-- ---------------------------------------------------------------------------
create policy "shopping_recs: select own"
  on public.shopping_recs for select
  using (auth.uid() = user_id);

create policy "shopping_recs: insert own"
  on public.shopping_recs for insert
  with check (auth.uid() = user_id);

create policy "shopping_recs: update own"
  on public.shopping_recs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "shopping_recs: delete own"
  on public.shopping_recs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- style_reports policies
-- ---------------------------------------------------------------------------
create policy "style_reports: select own"
  on public.style_reports for select
  using (auth.uid() = user_id);

create policy "style_reports: insert own"
  on public.style_reports for insert
  with check (auth.uid() = user_id);

create policy "style_reports: update own"
  on public.style_reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "style_reports: delete own"
  on public.style_reports for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- Helper: auto-create user profile row on auth.users insert
-- (Supabase auth integration — fires whenever someone signs up)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- Helper: increment garment times_worn when a wear_log is inserted
-- =============================================================================
create or replace function public.increment_times_worn()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.garments
  set
    times_worn = times_worn + 1,
    last_worn  = new.worn_date
  where id = any(new.garment_ids);
  return new;
end;
$$;

create or replace trigger on_wear_log_created
  after insert on public.wear_logs
  for each row execute procedure public.increment_times_worn();

-- =============================================================================
-- ScamShield — additional tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles (lightweight alias to users for ScamShield onboarding)
-- The existing `users` table serves as profiles; this view makes it easy
-- to query by the name used in the build spec.
-- ---------------------------------------------------------------------------
create or replace view public.profiles as
  select id, email, created_at from public.users;

-- ---------------------------------------------------------------------------
-- checks
-- ---------------------------------------------------------------------------
create table if not exists public.checks (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  input_type     text        not null check (input_type in ('text', 'link')),
  input_content  text        not null,
  verdict        text        not null check (verdict in ('scam', 'suspicious', 'likely_safe', 'unclear')),
  risk_score     int         not null check (risk_score between 0 and 100),
  scam_type      text,
  reasons        jsonb       not null default '[]'::jsonb,
  advice         text        not null,
  created_at     timestamptz not null default now()
);

comment on table public.checks is 'ScamShield — one row per user scam-check submission';

-- Composite index for per-user history, newest first
create index if not exists idx_checks_user_created
  on public.checks(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS for checks
-- ---------------------------------------------------------------------------
alter table public.checks enable row level security;

create policy "checks: select own"
  on public.checks for select
  using (auth.uid() = user_id);

create policy "checks: insert own"
  on public.checks for insert
  with check (auth.uid() = user_id);

create policy "checks: delete own"
  on public.checks for delete
  using (auth.uid() = user_id);
