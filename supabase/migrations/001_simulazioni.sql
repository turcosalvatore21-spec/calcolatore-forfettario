-- Migrazione 001: tabella "simulazioni" per il salvataggio delle simulazioni
-- degli utenti autenticati, con Row Level Security.
--
-- Da eseguire nel SQL Editor del progetto Supabase (Dashboard → SQL Editor →
-- incolla tutto il contenuto → Run).

create table if not exists public.simulazioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  dati jsonb not null,
  created_at timestamptz not null default now()
);

-- Indice per elencare rapidamente le simulazioni di un utente, più recenti prima
create index if not exists simulazioni_user_id_created_at_idx
  on public.simulazioni (user_id, created_at desc);

-- Row Level Security: ogni utente vede e gestisce SOLO le proprie righe
alter table public.simulazioni enable row level security;

create policy "Gli utenti leggono solo le proprie simulazioni"
  on public.simulazioni
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Gli utenti inseriscono solo simulazioni proprie"
  on public.simulazioni
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Gli utenti aggiornano solo le proprie simulazioni"
  on public.simulazioni
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Gli utenti eliminano solo le proprie simulazioni"
  on public.simulazioni
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
