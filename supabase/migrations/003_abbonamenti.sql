-- Migrazione 003: tabella "abbonamenti" per lo stato del piano Pro
-- (integrazione Lemon Squeezy), una riga per utente.
--
-- Da eseguire nel SQL Editor del progetto Supabase (Dashboard → SQL Editor →
-- incolla tutto il contenuto → Run).

create table if not exists public.abbonamenti (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'pro')),
  subscription_plan text
    check (subscription_plan in ('monthly', 'annual')),
  subscription_renews_at timestamptz,
  lemonsqueezy_subscription_id text,
  lemonsqueezy_customer_id text,
  updated_at timestamptz not null default now()
);

-- Row Level Security: ogni utente legge SOLO la propria riga.
-- Nessuna policy di insert/update/delete per il ruolo "authenticated":
-- lo stato dell'abbonamento è scritto esclusivamente dal webhook Lemon
-- Squeezy (api/lemonsqueezy-webhook.js) usando la service role key, che
-- bypassa RLS. Se un utente potesse scrivere la propria riga potrebbe
-- auto-assegnarsi il piano Pro senza pagare.
alter table public.abbonamenti enable row level security;

create policy "Gli utenti leggono solo il proprio abbonamento"
  on public.abbonamenti
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
