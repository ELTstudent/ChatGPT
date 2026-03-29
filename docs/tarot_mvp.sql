-- Enable extension for UUID helpers (if not already enabled)
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  birth_year int check (birth_year between 1990 and 2006),
  primary_focus text check (primary_focus in ('ask','love','career','money','self','social','family')),
  tone_preference text not null default 'balanced' check (tone_preference in ('soft','balanced','direct')),
  relationship_status text check (relationship_status in ('single','dating','in_relationship','complicated','married','prefer_not_to_say')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tarot_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_tr text not null,
  arcana text not null check (arcana in ('major','minor')),
  suit text not null check (suit in ('major','wands','cups','swords','pentacles')),
  rank text not null,
  upright_keywords text[] not null default '{}',
  reversed_keywords text[] not null default '{}',
  energy text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recent_topics text[] not null default '{}',
  saved_themes text[] not null default '{}',
  favorite_spread_types text[] not null default '{}',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_area text not null check (focus_area in ('ask','love','career','money','self','social','family')),
  intention text,
  tone_preference text not null default 'balanced' check (tone_preference in ('soft','balanced','direct')),
  cards jsonb not null,
  result jsonb not null,
  theme_tags text[] not null default '{}',
  is_daily boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_context_updated_at on public.user_context;
create trigger trg_user_context_updated_at
before update on public.user_context
for each row execute function public.set_updated_at();

drop trigger if exists trg_readings_updated_at on public.readings;
create trigger trg_readings_updated_at
before update on public.readings
for each row execute function public.set_updated_at();

create index if not exists idx_readings_user_created_at on public.readings(user_id, created_at desc);
create index if not exists idx_readings_user_focus_created_at on public.readings(user_id, focus_area, created_at desc);
create index if not exists idx_readings_theme_tags_gin on public.readings using gin(theme_tags);

alter table public.profiles enable row level security;
alter table public.user_context enable row level security;
alter table public.readings enable row level security;
alter table public.tarot_cards enable row level security;

-- profiles policies
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_context policies
create policy "user_context_select_own" on public.user_context
for select using (auth.uid() = user_id);

create policy "user_context_insert_own" on public.user_context
for insert with check (auth.uid() = user_id);

create policy "user_context_update_own" on public.user_context
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- readings policies
create policy "readings_select_own" on public.readings
for select using (auth.uid() = user_id);

create policy "readings_insert_own" on public.readings
for insert with check (auth.uid() = user_id);

create policy "readings_update_own" on public.readings
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tarot_cards is readable by all authenticated users
create policy "tarot_cards_select_auth" on public.tarot_cards
for select using (auth.role() = 'authenticated');

-- Representative seed cards (subset, not full 78)
insert into public.tarot_cards (slug, name_tr, arcana, suit, rank, upright_keywords, reversed_keywords, energy)
values
  ('the-star', 'Yıldız', 'major', 'major', '17', array['umut','yenilenme','ilham'], array['enerji düşüşü','dağınık inanç','gecikme'], 'arı ve sakin'),
  ('the-empress', 'İmparatoriçe', 'major', 'major', '3', array['bereket','çekim','duygusal beslenme'], array['sınır kaybı','aşırı verme','yorgunluk'], 'yumuşak ve üretken'),
  ('the-chariot', 'Savaş Arabası', 'major', 'major', '7', array['irade','yön','kararlılık'], array['kontrol kaybı','acelecilik','dağınık hedef'], 'atak ve odaklı'),
  ('queen-of-cups', 'Kupa Kraliçesi', 'minor', 'cups', 'queen', array['sezgi','duygusal derinlik','şefkatli netlik'], array['aşırı hassasiyet','içe kapanma','bulanık sınırlar'], 'akışkan')
on conflict (slug) do nothing;
