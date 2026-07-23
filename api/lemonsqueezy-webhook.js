import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Il webhook deve leggere il body RAW (non parsato) per verificare la firma
// HMAC: la firma è calcolata da Lemon Squeezy sui byte esatti inviati, quindi
// qualsiasi ri-serializzazione del JSON (che cambia spazi/ordine chiavi) fa
// fallire il confronto → 401.
//
// Su @vercel/node (questa NON è una route Next.js: il progetto è Vite, le
// funzioni in /api girano su @vercel/node) questa export disattiva il parsing
// automatico del body, così lo stream resta leggibile. leggiBodyRaw legge
// comunque prima lo stream e usa req.body solo come fallback, per essere
// robusto a prescindere dal runtime.
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
  // Leggiamo PRIMA lo stream grezzo: con bodyParser off il body non è ancora
  // stato consumato e sono i byte esatti su cui è calcolata la firma. NON
  // accediamo a req.body prima dello stream, perché su alcuni runtime la sola
  // lettura di req.body innesca il parsing e "svuota" lo stream.
  const pezzi = []
  for await (const pezzo of req) {
    pezzi.push(typeof pezzo === 'string' ? Buffer.from(pezzo) : pezzo)
  }
  if (pezzi.length > 0) return Buffer.concat(pezzi)
  // Fallback: se lo stream era già stato consumato, proviamo con req.body
  // (solo se è ancora grezzo: Buffer o stringa).
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8')
  return Buffer.alloc(0)
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
  // .trim() difende dallo spazio o "a capo" finale che spesso finisce nella
  // env var quando la si incolla su Vercel: è una causa tipica di 401 anche
  // quando il secret sembra identico a occhio.
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim()

  if (!verificaFirma(bodyRaw, firma, secret)) {
    // DIAGNOSTICA TEMPORANEA: il messaggio 401 riporta perché la firma non
    // torna, così è leggibile dalla schermata "Recent deliveries" di Lemon
    // Squeezy senza dover aprire i log di Vercel. Da rimuovere una volta a 200.
    //  - body=0B            -> il body raw non arriva (runtime che pre-parsa)
    //  - secret=ASSENTE     -> env var LEMONSQUEEZY_WEBHOOK_SECRET non impostata
    //  - secret=NNchar      -> lunghezza del secret dopo trim (atteso 40)
    const diagnostica =
      `body=${bodyRaw.length}B ` +
      `secret=${secret ? secret.length + 'char' : 'ASSENTE'} ` +
      `header=${firma ? 'presente' : 'assente'}`
    res.status(401).send(`Firma non valida [${diagnostica}]`)
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
