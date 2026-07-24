# calcolatore-forfettario

## Migrazioni Supabase

Le migrazioni in `supabase/migrations/` non vengono eseguite automaticamente:
vanno incollate a mano nel SQL Editor di Supabase (Dashboard → SQL Editor →
incolla il contenuto del file → Run), in ordine:

1. `001_simulazioni.sql` — tabella `simulazioni` (salvataggio simulazioni)
2. `002_proiezioni.sql` — tabella `proiezioni` (proiezione annuale mese per mese)
3. `003_abbonamenti.sql` — tabella `abbonamenti` (stato piano Pro, aggiornata dal webhook Lemon Squeezy)
4. `004_disdetta.sql` — colonne per la disdetta con periodo di grazia (`subscription_cancel_at_period_end`, `subscription_ends_at`)

## Abbonamento Pro (Lemon Squeezy)

### Store, checkout e variant (lato client)

`src/lib/lemonsqueezyConfig.js` legge da variabili d'ambiente **VITE_**
(quindi vanno bene sia in `.env.local` che tra le Environment Variables di
Vercel — sono valori pubblici, non segreti: compaiono comunque nell'URL di
checkout). Attenzione: per ogni piano ci sono **due identificativi diversi**.

- `VITE_LEMONSQUEEZY_STORE` — sottodominio dello store
- `VITE_LEMONSQUEEZY_CHECKOUT_MONTHLY` — **UUID** di checkout mensile
- `VITE_LEMONSQUEEZY_CHECKOUT_ANNUAL` — **UUID** di checkout annuale
- `VITE_LEMONSQUEEZY_VARIANT_MONTHLY` — variant id **numerico** mensile
- `VITE_LEMONSQUEEZY_VARIANT_ANNUAL` — variant id **numerico** annuale

**UUID vs numero — è la distinzione che conta:**
- L'**UUID** è l'unico valore valido nell'URL di pagamento
  (`/checkout/buy/<uuid>`). Si copia da **Lemon Squeezy → Products →
  Share**. Mettere il numero qui produce un **404** (era il bug originale).
- Il **numero** (variant id API) serve **solo al webhook** per capire quale
  piano è stato acquistato dall'evento ricevuto. Non va mai nell'URL.

**Default solo in sviluppo:** i valori di default (store/checkout/variant di
test) sono usati **solo** in `vite dev`. In **produzione** (build su Vercel)
queste variabili **devono** essere impostate: se mancano, il piano risulta
non configurato e il bottone di checkout mostra un avviso invece di usare per
errore gli id di test. È così che test e live si distinguono **solo dalla
configurazione su Vercel**, senza toccare il codice.

**Importante:** i variant id numerici vanno impostati con gli stessi nomi
anche per la funzione webhook (gira su Node, li legge da `process.env`) — vedi
sotto.

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

### Portale cliente (gestione abbonamento)

La funzione `api/customer-portal.js` restituisce un URL fresco del portale
cliente Lemon Squeezy (aggiorna pagamento, scarica fatture, disdici). Gli URL
del portale sono firmati e scadono, quindi vengono generati al momento via
API. Richiede una env var aggiuntiva su Vercel:

- `LEMONSQUEEZY_API_KEY` — API key Lemon Squeezy (Dashboard → Settings → API)

Riusa inoltre `SUPABASE_URL`/`VITE_SUPABASE_URL` e `SUPABASE_ANON_KEY`/
`VITE_SUPABASE_ANON_KEY`. L'utente è identificato dal suo token Supabase e può
ottenere **solo** il portale del proprio abbonamento (RLS). Se
`LEMONSQUEEZY_API_KEY` non è impostata, il bottone «Gestisci abbonamento»
mostra un avviso invece di rompersi.

### Disdetta con periodo di grazia

Chi disdice mantiene l'accesso Pro **fino alla fine del periodo già pagato**,
poi decade automaticamente:

- Alla disdetta il webhook riceve `subscription_cancelled` (o
  `subscription_updated` con `status: cancelled`) e imposta
  `subscription_cancel_at_period_end = true` e `subscription_ends_at` alla
  data di fine periodo, mantenendo `subscription_status = 'pro'`.
- Alla scadenza effettiva arriva `subscription_expired` → `subscription_status
  = 'free'`. Come rete di sicurezza, anche il client considera scaduto l'accesso
  se `subscription_ends_at` è passata, senza aspettare il webhook.
- Le **simulazioni salvate non vengono mai cancellate** al ritorno a free:
  restano nell'account, semplicemente non accessibili finché non si riattiva il
  Pro.
- Nell'area utente lo stato è mostrato come «Abbonamento disdetto — Pro attivo
  fino al [data]».

### Passare alla modalità Live su Lemon Squeezy

Il codice non contiene nulla di specifico per test/live: la differenza è
**solo** nelle Environment Variables su Vercel (poi **Redeploy**). Per andare
in live, impostare su Vercel (ambiente **Production**), con i valori dello
store **Live**:

| Variabile | Dove si trova su Lemon Squeezy | Note |
|---|---|---|
| `VITE_LEMONSQUEEZY_STORE` | sottodominio dello store | pubblica |
| `VITE_LEMONSQUEEZY_CHECKOUT_MONTHLY` | Products → prodotto mensile → Share (UUID) | pubblica |
| `VITE_LEMONSQUEEZY_CHECKOUT_ANNUAL` | Products → prodotto annuale → Share (UUID) | pubblica |
| `VITE_LEMONSQUEEZY_VARIANT_MONTHLY` | variant id numerico mensile (API/URL Share `?enabled=`) | pubblica |
| `VITE_LEMONSQUEEZY_VARIANT_ANNUAL` | variant id numerico annuale | pubblica |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Settings → Webhooks (webhook **Live**) | **segreta** |
| `LEMONSQUEEZY_API_KEY` | Settings → API | **segreta** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | **segreta** |
| `SUPABASE_URL` (o `VITE_SUPABASE_URL`) | Supabase → Project Settings → API | |

In Live serve anche **creare un webhook Live** (Settings → Webhooks in modalità
Live) verso `/api/lemonsqueezy-webhook` con gli stessi eventi, e usare il suo
signing secret in `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Pagine legali

Privacy Policy e Termini di Servizio sono viste dell'app raggiungibili dal
footer (hash `#privacy` / `#termini`), in `src/components/PagineLegali.jsx`.

### Se l'app mostra una pagina bianca

`src/components/ErrorBoundary.jsx` avvolge l'intera app: qualunque errore
imprevisto durante il render mostra un messaggio invece di una pagina bianca.
Se lo vedi, apri la console del browser per il dettaglio dell'errore.
