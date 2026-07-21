# calcolatore-forfettario

## Migrazioni Supabase

Le migrazioni in `supabase/migrations/` non vengono eseguite automaticamente:
vanno incollate a mano nel SQL Editor di Supabase (Dashboard → SQL Editor →
incolla il contenuto del file → Run), in ordine:

1. `001_simulazioni.sql` — tabella `simulazioni` (salvataggio simulazioni)
2. `002_proiezioni.sql` — tabella `proiezioni` (proiezione annuale mese per mese)
