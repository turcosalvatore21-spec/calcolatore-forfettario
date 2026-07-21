-- Migrazione 002: tabella "proiezioni" per il salvataggio dei ricavi mensili
-- della proiezione annuale, una riga per utente e anno, con Row Level Security.
--
-- NON viene eseguita automaticamente: da incollare nel SQL Editor del progetto
-- Supabase (Dashboard → SQL Editor → incolla tutto il contenuto → Run).

create table if not exists public.proiezioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  anno int not null,
  mesi jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, anno)
);

-- Row Level Security: ogni utente vede e gestisce SOLO le proprie righe
-- (stesse regole della tabella "simulazioni")
alter table public.proiezioni enable row level security;

create policy "Gli utenti leggono solo le proprie proiezioni"
  on public.proiezioni
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Gli utenti inseriscono solo proiezioni proprie"
  on public.proiezioni
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Gli utenti aggiornano solo le proprie proiezioni"
  on public.proiezioni
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Gli utenti eliminano solo le proprie proiezioni"
  on public.proiezioni
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
