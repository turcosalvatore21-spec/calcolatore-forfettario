# calcolatore-forfettario

## Migrazioni Supabase

Le migrazioni in `supabase/migrations/` non vengono eseguite automaticamente:
vanno incollate a mano nel SQL Editor di Supabase (Dashboard → SQL Editor →
incolla il contenuto del file → Run), in ordine:

1. `001_simulazioni.sql` — tabella `simulazioni` (salvataggio simulazioni)
2. `002_proiezioni.sql` — tabella `proiezioni` (proiezione annuale mese per mese)
3. `003_abbonamenti.sql` — tabella `abbonamenti` (stato piano Pro, aggiornata dal webhook Lemon Squeezy)

## Abbonamento Pro (Lemon Squeezy)

Variabili d'ambiente da configurare su Vercel (Project Settings → Environment
Variables), **non** in `.env.local`/`VITE_*` perché sono usate solo lato
server dalla funzione `api/lemonsqueezy-webhook.js`:

- `LEMONSQUEEZY_WEBHOOK_SECRET` — signing secret del webhook (Lemon Squeezy
  Dashboard → Settings → Webhooks)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key del progetto Supabase
  (Dashboard → Project Settings → API); bypassa la RLS per scrivere lo stato
  dell'abbonamento
- `SUPABASE_URL` (o, se già presente, riusa `VITE_SUPABASE_URL`) — URL del
  progetto Supabase

Nel Dashboard Lemon Squeezy, configura il webhook su
`https://<tuo-dominio>/api/lemonsqueezy-webhook` con gli eventi
`subscription_created`, `subscription_updated`, `subscription_resumed`,
`subscription_cancelled`, `subscription_expired`.

La tabella `abbonamenti` ha RLS in sola lettura per l'utente proprietario:
solo il webhook (con la service role key) può scrivere lo stato del piano,
così un utente non può auto-assegnarsi il piano Pro dal client.
