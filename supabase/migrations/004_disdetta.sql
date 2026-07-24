-- Migrazione 004: gestione disdetta con periodo di grazia.
--
-- Aggiunge due colonne alla tabella "abbonamenti":
--  - subscription_cancel_at_period_end: true se l'utente ha disdetto ma
--    conserva ancora l'accesso Pro fino a fine periodo pagato.
--  - subscription_ends_at: data in cui l'accesso Pro decade (fine del periodo
--    già pagato). NULL se l'abbonamento è attivo e si rinnova.
--
-- Con la disdetta l'abbonamento resta subscription_status='pro' (accesso
-- attivo) ma con cancel_at_period_end=true; solo al superamento di
-- subscription_ends_at l'utente torna a 'free' (evento subscription_expired
-- del webhook, oltre al controllo lato client come rete di sicurezza).
--
-- Da eseguire nel SQL Editor del progetto Supabase.

alter table public.abbonamenti
  add column if not exists subscription_cancel_at_period_end boolean not null default false,
  add column if not exists subscription_ends_at timestamptz;
