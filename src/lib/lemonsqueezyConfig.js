// Configurazione Lemon Squeezy lato client (bottoni di checkout). Store,
// checkout id e variant id non sono segreti (compaiono comunque nell'URL di
// checkout pubblico): il solo segreto è LEMONSQUEEZY_WEBHOOK_SECRET, letto da
// env var nel webhook (api/lemonsqueezy-webhook.js).
//
// IMPORTANTE — due identificativi diversi per piano:
//  1. checkoutId: l'UUID che va nell'URL di pagamento
//     (/checkout/buy/<uuid>). È quello che si copia da Lemon Squeezy →
//     Products → Share. NON è il numero: usare il numero qui dà un 404.
//  2. variantId: il variant id NUMERICO dell'API, usato SOLO dal webhook per
//     dedurre il piano dall'evento ricevuto (vedi api/lemonsqueezy-webhook.js).
//
// Tutti leggibili da variabili d'ambiente VITE_LEMONSQUEEZY_*, così il
// passaggio test → live si fa SOLO dalla configurazione su Vercel, senza
// toccare il codice.
//
// I valori di default qui sotto valgono SOLO in sviluppo (vite dev). In
// produzione (build) NON vengono usati: se una variabile manca, il valore è
// vuoto e il piano risulta "non configurato" (il bottone mostra un avviso
// invece di aprire un checkout con id sbagliati). Questo evita di usare per
// errore gli id di test in produzione.
//
// Nota: questo modulo NON deve essere importato da api/lemonsqueezy-webhook.js
// (funzione Node su Vercel): import.meta.env è un costrutto solo-Vite e non
// esiste in quel runtime.
const DEV = import.meta.env.DEV
const DEFAULT_SVILUPPO = {
  store: 'strataitalia',
  checkoutMensile: '1e79cbcc-5be2-4823-85d9-3a88a7b59b9e',
  checkoutAnnuale: '5f2cdc12-54f3-4a44-9c62-ee732a81d08e',
  variantMensile: '1932382',
  variantAnnuale: '1932369'
}
// Ritorna il valore della env var; in sua assenza usa il default SOLO in dev.
const daEnv = (valore, chiave) => valore || (DEV ? DEFAULT_SVILUPPO[chiave] : '')

export const STORE_SUBDOMAIN = daEnv(import.meta.env.VITE_LEMONSQUEEZY_STORE, 'store')
export const CHECKOUT_MENSILE = daEnv(import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_MONTHLY, 'checkoutMensile')
export const CHECKOUT_ANNUALE = daEnv(import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_ANNUAL, 'checkoutAnnuale')
export const VARIANT_MENSILE = daEnv(import.meta.env.VITE_LEMONSQUEEZY_VARIANT_MONTHLY, 'variantMensile')
export const VARIANT_ANNUALE = daEnv(import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ANNUAL, 'variantAnnuale')

export const PIANI = {
  monthly: {
    checkoutId: CHECKOUT_MENSILE,
    variantId: VARIANT_MENSILE,
    etichetta: 'Mensile',
    prezzo: '6€/mese'
  },
  annual: {
    checkoutId: CHECKOUT_ANNUALE,
    variantId: VARIANT_ANNUALE,
    etichetta: 'Annuale',
    prezzo: '49€/anno'
  }
}

/** true se store e checkout id per il piano risultano configurati (non vuoti). */
export function pianoConfigurato(piano) {
  return Boolean(STORE_SUBDOMAIN && PIANI[piano]?.checkoutId)
}

/**
 * Costruisce l'URL di checkout Lemon.js overlay con lo user_id come custom
 * data. Se lo store o il checkout id del piano mancano, lancia un errore in
 * italiano invece di restituire un link rotto.
 */
export function urlCheckout({ piano, userId, email }) {
  if (!PIANI[piano]) throw new Error(`Piano sconosciuto: ${piano}`)
  if (!pianoConfigurato(piano)) {
    throw new Error(
      'Il checkout per questo piano non è al momento configurato correttamente. Riprova più tardi o contatta il supporto.'
    )
  }

  const { checkoutId, variantId } = PIANI[piano]
  const url = new URL(`https://${STORE_SUBDOMAIN}.lemonsqueezy.com/checkout/buy/${checkoutId}`)
  // Limita il checkout al variant giusto (come fa il link "Share" di Lemon Squeezy)
  if (variantId) url.searchParams.set('enabled', variantId)
  url.searchParams.set('checkout[custom][user_id]', userId)
  if (email) url.searchParams.set('checkout[email]', email)
  url.searchParams.set('embed', '1')
  return url.toString()
}
