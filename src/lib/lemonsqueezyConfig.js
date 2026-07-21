// Configurazione condivisa Lemon Squeezy: usata sia dal client (bottoni di
// checkout) sia dalla funzione serverless del webhook. Store e variant ID
// non sono segreti (compaiono comunque nell'URL di checkout pubblico): il
// solo segreto è LEMONSQUEEZY_WEBHOOK_SECRET, letto da env var nel webhook.
export const STORE_SUBDOMAIN = 'strataitalia'

export const VARIANT_MENSILE = '1932382'
export const VARIANT_ANNUALE = '1932369'

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

/** Deduce il piano ('monthly' | 'annual') dal variant_id ricevuto dal webhook. */
export function pianoDaVariantId(variantId) {
  const id = String(variantId)
  if (id === VARIANT_MENSILE) return 'monthly'
  if (id === VARIANT_ANNUALE) return 'annual'
  return null
}

/** Costruisce l'URL di checkout Lemon.js overlay con lo user_id come custom data. */
export function urlCheckout({ piano, userId, email }) {
  const variantId = PIANI[piano]?.variantId
  if (!variantId) throw new Error(`Piano sconosciuto: ${piano}`)

  const url = new URL(`https://${STORE_SUBDOMAIN}.lemonsqueezy.com/buy/${variantId}`)
  url.searchParams.set('checkout[custom][user_id]', userId)
  if (email) url.searchParams.set('checkout[email]', email)
  url.searchParams.set('embed', '1')
  return url.toString()
}
