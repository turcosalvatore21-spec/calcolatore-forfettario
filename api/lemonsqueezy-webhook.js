import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Il webhook deve leggere il body raw per verificare la firma HMAC:
// Vercel non deve parsarlo prima che arrivi qui.
export const config = {
  api: {
    bodyParser: false
  }
}

// subscription_payment_success è incluso perché scatta ad ogni pagamento
// riuscito (anche il primo): garantisce l'attivazione Pro anche se per qualche
// motivo l'evento subscription_created non arrivasse o venisse perso.
const EVENTI_ATTIVAZIONE = [
  'subscription_created',
  'subscription_updated',
  'subscription_resumed',
  'subscription_payment_success'
]
const EVENTI_DISATTIVAZIONE = ['subscription_cancelled', 'subscription_expired']

// Stessi nomi di env var VITE_LEMONSQUEEZY_VARIANT_* usati dal client
// (src/lib/lemonsqueezyConfig.js), letti però da process.env: questo file
// gira su Node (funzione serverless Vercel), non su Vite, quindi NON deve
// importare quel modulo né usare import.meta.env (non esiste in questo
// runtime e romperebbe il webhook).
const VARIANT_MENSILE = process.env.VITE_LEMONSQUEEZY_VARIANT_MONTHLY || '1932382'
const VARIANT_ANNUALE = process.env.VITE_LEMONSQUEEZY_VARIANT_ANNUAL || '1932369'

/** Deduce il piano ('monthly' | 'annual') dal variant_id ricevuto dal webhook. */
function pianoDaVariantId(variantId) {
  const id = String(variantId)
  if (id === VARIANT_MENSILE) return 'monthly'
  if (id === VARIANT_ANNUALE) return 'annual'
  return null
}

async function leggiBodyRaw(req) {
  // Alcuni runtime Vercel espongono già il body come Buffer o stringa grezza:
  // in quei casi va usato così com'è, perché la firma HMAC è calcolata sui
  // byte esatti ricevuti. Altrimenti si legge lo stream (con bodyParser off).
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8')
  const pezzi = []
  for await (const pezzo of req) {
    pezzi.push(typeof pezzo === 'string' ? Buffer.from(pezzo) : pezzo)
  }
  return Buffer.concat(pezzi)
}

/** Verifica la firma X-Signature con confronto a tempo costante. */
export function verificaFirma(bodyRaw, firmaRicevuta, secret) {
  if (!secret || !firmaRicevuta) return false
  const digestAtteso = crypto.createHmac('sha256', secret).update(bodyRaw).digest()
  const digestRicevuto = Buffer.from(firmaRicevuta, 'hex')
  if (digestRicevuto.length !== digestAtteso.length) return false
  return crypto.timingSafeEqual(digestAtteso, digestRicevuto)
}

function client() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere configurate.')
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const bodyRaw = await leggiBodyRaw(req)
  const firma = req.headers['x-signature']
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

  if (!verificaFirma(bodyRaw, firma, secret)) {
    res.status(401).send('Firma non valida')
    return
  }

  let evento
  try {
    evento = JSON.parse(bodyRaw.toString('utf8'))
  } catch {
    res.status(400).send('JSON non valido')
    return
  }

  const nomeEvento = evento?.meta?.event_name
  const userId = evento?.meta?.custom_data?.user_id

  if (!userId) {
    // Niente user_id da collegare (es. evento di test): rispondiamo comunque
    // 200 per evitare che Lemon Squeezy ripeta la consegna all'infinito.
    res.status(200).send('OK (nessun user_id nei custom data)')
    return
  }

  const attributi = evento?.data?.attributes ?? {}
  const supabaseAdmin = client()

  try {
    if (EVENTI_ATTIVAZIONE.includes(nomeEvento)) {
      // Gli eventi subscription_* hanno data = subscription (id sottoscrizione,
      // variant_id, renews_at). subscription_payment_success ha invece data =
      // fattura: l'id della sottoscrizione è in attributes.subscription_id e non
      // contiene il variant_id. Estraiamo quindi i campi in modo condizionale.
      const isFattura = nomeEvento === 'subscription_payment_success'
      const subscriptionId = isFattura ? attributi.subscription_id : evento?.data?.id
      const piano = attributi.variant_id != null ? pianoDaVariantId(attributi.variant_id) : null

      // Includiamo solo i campi di cui abbiamo davvero un valore: le colonne
      // omesse restano invariate nell'upsert (così un evento senza variant_id
      // non azzera il piano già salvato).
      const dati = {
        user_id: userId,
        subscription_status: 'pro',
        updated_at: new Date().toISOString()
      }
      if (piano) dati.subscription_plan = piano
      if (attributi.renews_at) dati.subscription_renews_at = attributi.renews_at
      if (subscriptionId != null) dati.lemonsqueezy_subscription_id = String(subscriptionId)
      if (attributi.customer_id != null) dati.lemonsqueezy_customer_id = String(attributi.customer_id)

      const { error } = await supabaseAdmin
        .from('abbonamenti')
        .upsert(dati, { onConflict: 'user_id' })
      if (error) throw error
    } else if (EVENTI_DISATTIVAZIONE.includes(nomeEvento)) {
      const { error } = await supabaseAdmin
        .from('abbonamenti')
        .update({ subscription_status: 'free', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      if (error) throw error
    }
  } catch (err) {
    console.error('Errore aggiornamento abbonamento da webhook Lemon Squeezy:', err)
    res.status(500).send('Errore database')
    return
  }

  res.status(200).send('OK')
}
