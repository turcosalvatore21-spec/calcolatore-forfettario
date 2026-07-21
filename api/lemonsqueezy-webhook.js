import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Il webhook deve leggere il body raw per verificare la firma HMAC:
// Vercel non deve parsarlo prima che arrivi qui.
export const config = {
  api: {
    bodyParser: false
  }
}

const EVENTI_ATTIVAZIONE = ['subscription_created', 'subscription_updated', 'subscription_resumed']
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
  const pezzi = []
  for await (const pezzo of req) pezzi.push(pezzo)
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
      const { error } = await supabaseAdmin.from('abbonamenti').upsert(
        {
          user_id: userId,
          subscription_status: 'pro',
          subscription_plan: pianoDaVariantId(attributi.variant_id),
          subscription_renews_at: attributi.renews_at ?? null,
          lemonsqueezy_subscription_id: String(evento.data?.id ?? ''),
          lemonsqueezy_customer_id: String(attributi.customer_id ?? ''),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
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
