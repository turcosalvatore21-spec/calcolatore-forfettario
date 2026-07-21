# calcolatore-forfettario

## Migrazioni Supabase

Le migrazioni in `supabase/migrations/` non vengono eseguite automaticamente:
vanno incollate a mano nel SQL Editor di Supabase (Dashboard → SQL Editor →
incolla il contenuto del file → Run), in ordine:

1. `001_simulazioni.sql` — tabella `simulazioni` (salvataggio simulazioni)
2. `002_proiezioni.sql` — tabella `proiezioni` (proiezione annuale mese per mese)
3. `003_abbonamenti.sql` — tabella `abbonamenti` (stato piano Pro, aggiornata dal webhook Lemon Squeezy)

## Abbonamento Pro (Lemon Squeezy)

### Store e variant (checkout, lato client)

`src/lib/lemonsqueezyConfig.js` legge store e variant ID da variabili
d'ambiente **VITE_** (quindi vanno bene sia in `.env.local` che tra le
Environment Variables di Vercel — sono valori pubblici, non segreti: compaiono
comunque nell'URL di checkout):

- `VITE_LEMONSQUEEZY_STORE` — sottodominio dello store (default: `strataitalia`)
- `VITE_LEMONSQUEEZY_VARIANT_MONTHLY` — variant ID piano mensile (default: `1932382`)
- `VITE_LEMONSQUEEZY_VARIANT_ANNUAL` — variant ID piano annuale (default: `1932369`)

Se non impostate vengono usati i valori di default (lo store "live"), quindi
l'app funziona anche senza configurarle. Impostale per passare allo store di
test durante lo sviluppo (`VITE_LEMONSQUEEZY_STORE=<store-test>` con i variant
ID di quello store). Se un piano risulta senza variant ID configurato, il
bottone di checkout mostra un avviso invece di aprire un link rotto.

**Importante:** se cambi questi variant ID (es. passando allo store live),
aggiorna anche le stesse variabili su Vercel per la funzione webhook (vedi
sotto) — il webhook usa gli stessi nomi per dedurre il piano dall'evento.

### Webhook (lato server)

Variabili d'ambiente da configurare su Vercel (Project Settings → Environment
Variables), usate solo lato server dalla funzione `api/lemonsqueezy-webhook.js`:

- `LEMONSQUEEZY_WEBHOOK_SECRET` — signing secret del webhook (Lemon Squeezy
  Dashboard → Settings → Webhooks); **non va mai messo nel codice**
- `SUPABASE_SERVICE_ROLE_KEY` — service role key del progetto Supabase
  (Dashboard → Project Settings → API); bypassa la RLS per scrivere lo stato
  dell'abbonamento
- `SUPABASE_URL` (o, se già presente, riusa `VITE_SUPABASE_URL`) — URL del
  progetto Supabase
- `VITE_LEMONSQUEEZY_VARIANT_MONTHLY` / `VITE_LEMONSQUEEZY_VARIANT_ANNUAL` —
  stesse variabili del client sopra, lette qui via `process.env` (il webhook
  gira su Node, non su Vite: non condivide codice con il client per evitare
  di dipendere da `import.meta.env`, che in quel runtime non esiste)

Nel Dashboard Lemon Squeezy, configura il webhook su
`https://<tuo-dominio>/api/lemonsqueezy-webhook` con gli eventi
`subscription_created`, `subscription_updated`, `subscription_resumed`,
`subscription_cancelled`, `subscription_expired`.

La tabella `abbonamenti` ha RLS in sola lettura per l'utente proprietario:
solo il webhook (con la service role key) può scrivere lo stato del piano,
così un utente non può auto-assegnarsi il piano Pro dal client.

### Se l'app mostra una pagina bianca

`src/components/ErrorBoundary.jsx` avvolge l'intera app: qualunque errore
imprevisto durante il render mostra un messaggio invece di una pagina bianca.
Se lo vedi, apri la console del browser per il dettaglio dell'errore.
