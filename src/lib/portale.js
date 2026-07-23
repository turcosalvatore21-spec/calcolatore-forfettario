import { supabase } from './supabase.js'

/**
 * Chiede al backend un URL fresco del portale cliente Lemon Squeezy per
 * l'utente autenticato. Lancia un Error con messaggio già in italiano se
 * qualcosa non va (così il chiamante lo può mostrare direttamente).
 */
export async function urlPortaleCliente() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Devi essere autenticato per gestire l’abbonamento.')

  let risposta
  try {
    risposta = await fetch('/api/customer-portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch {
    throw new Error('Errore di rete: controlla la connessione e riprova.')
  }

  if (!risposta.ok) {
    if (risposta.status === 503) {
      throw new Error('La gestione dell’abbonamento non è al momento disponibile.')
    }
    if (risposta.status === 404) {
      throw new Error('Nessun abbonamento attivo da gestire.')
    }
    throw new Error('Impossibile aprire il portale di gestione. Riprova più tardi.')
  }

  const { url } = await risposta.json()
  if (!url) throw new Error('Portale non disponibile al momento.')
  return url
}
