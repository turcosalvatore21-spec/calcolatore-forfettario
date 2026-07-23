import { createClient } from '@supabase/supabase-js'

// Restituisce un URL FRESCO del portale cliente Lemon Squeezy per l'utente
// autenticato, così può aggiornare il metodo di pagamento, scaricare le
// fatture e disdire da solo.
//
// Gli URL del portale (attributes.urls.customer_portal) sono firmati e
// scadono dopo poche ore: per questo NON li salviamo, ma li chiediamo alla
// API di Lemon Squeezy al momento del click.
//
// Sicurezza: l'utente viene identificato dal suo token Supabase (JWT). Si
// legge SOLO la sua riga in "abbonamenti" (RLS), quindi non può ottenere il
// portale di un altro utente.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Metodo non consentito')
    return
  }

  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    res.status(401).send('Non autenticato')
    return
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const apiKey = process.env.LEMONSQUEEZY_API_KEY

  if (!url || !anonKey) {
    res.status(500).send('Configurazione Supabase mancante')
    return
  }
  if (!apiKey) {
    // Serve una API key Lemon Squeezy (Settings → API) nella env var
    // LEMONSQUEEZY_API_KEY. Senza, la gestione self-service non è disponibile.
    res.status(503).send('Gestione abbonamento non disponibile')
    return
  }

  // Client con il token dell'utente: le query rispettano la RLS come se fosse
  // l'utente stesso a leggerle.
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    res.status(401).send('Sessione non valida')
    return
  }

  const { data: riga, error: rigaErr } = await supabase
    .from('abbonamenti')
    .select('lemonsqueezy_subscription_id, subscription_status')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (rigaErr) {
    res.status(500).send('Errore nel recupero dell’abbonamento')
    return
  }
  if (!riga || riga.subscription_status !== 'pro' || !riga.lemonsqueezy_subscription_id) {
    res.status(404).send('Nessun abbonamento attivo')
    return
  }

  let portale
  try {
    const risposta = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${riga.lemonsqueezy_subscription_id}`,
      { headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${apiKey}` } }
    )
    if (!risposta.ok) {
      res.status(502).send('Errore Lemon Squeezy')
      return
    }
    const json = await risposta.json()
    portale = json?.data?.attributes?.urls?.customer_portal
  } catch (err) {
    console.error('Errore chiamata API Lemon Squeezy per il portale cliente:', err)
    res.status(502).send('Errore di rete verso Lemon Squeezy')
    return
  }

  if (!portale) {
    res.status(404).send('URL del portale non disponibile')
    return
  }

  res.status(200).json({ url: portale })
}
