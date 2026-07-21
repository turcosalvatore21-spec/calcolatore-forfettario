// Configurazione Lemon Squeezy lato client (bottoni di checkout). Store e
// variant ID non sono segreti (compaiono comunque nell'URL di checkout
// pubblico): il solo segreto è LEMONSQUEEZY_WEBHOOK_SECRET, letto da env
// var nel webhook (api/lemonsqueezy-webhook.js).
//
// Leggibili da variabili d'ambiente VITE_LEMONSQUEEZY_* per poter passare
// dallo store di test a quello live senza toccare il codice. Se le env var
// non sono impostate si usano questi valori di default, così l'app resta
// funzionante anche a configurazione incompleta invece di rompersi.
//
// Nota: questo modulo NON deve essere importato da api/lemonsqueezy-webhook.js
// (funzione Node su Vercel): import.meta.env è un costrutto solo-Vite e non
// esiste in quel runtime.
const STORE_DEFAULT = 'strataitalia'
const VARIANT_MENSILE_DEFAULT = '1932382'
const VARIANT_ANNUALE_DEFAULT = '1932369'

export const STORE_SUBDOMAIN = import.meta.env.VITE_LEMONSQUEEZY_STORE || STORE_DEFAULT
export const VARIANT_MENSILE = import.meta.env.VITE_LEMONSQUEEZY_VARIANT_MONTHLY || VARIANT_MENSILE_DEFAULT
export const VARIANT_ANNUALE = import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ANNUAL || VARIANT_ANNUALE_DEFAULT

export const PIANI = {
  monthly: {
    variantId: VARIANT_MENSILE,
    etichetta: 'Mensile',
    prezzo: '6€/mese'
  },
  annual: {
    variantId: VARIANT_ANNUALE,
    etichetta: 'Annuale',
    prezzo: '49€/anno'
  }
}

/** true se store e variant id per il piano risultano configurati (non vuoti). */
export function pianoConfigurato(piano) {
  return Boolean(STORE_SUBDOMAIN && PIANI[piano]?.variantId)
}

/**
 * Costruisce l'URL di checkout Lemon.js overlay con lo user_id come custom
 * data. Se lo store o il variant id del piano mancano, lancia un errore in
 * italiano invece di restituire un link rotto.
 */
export function urlCheckout({ piano, userId, email }) {
  if (!PIANI[piano]) throw new Error(`Piano sconosciuto: ${piano}`)
  if (!pianoConfigurato(piano)) {
    throw new Error(
      'Il checkout per questo piano non è al momento configurato correttamente. Riprova più tardi o contatta il supporto.'
    )
  }

  const url = new URL(`https://${STORE_SUBDOMAIN}.lemonsqueezy.com/checkout/buy/${PIANI[piano].variantId}`)
  url.searchParams.set('checkout[custom][user_id]', userId)
  if (email) url.searchParams.set('checkout[email]', email)
  url.searchParams.set('embed', '1')
  return url.toString()
}
