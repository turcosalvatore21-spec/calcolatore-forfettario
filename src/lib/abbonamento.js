import { supabase } from './supabase.js'

function messaggioErrore(error) {
  const testo = error?.message || ''
  if (
    error instanceof TypeError ||
    /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(testo)
  ) {
    return 'Errore di rete: controlla la connessione a internet e riprova.'
  }
  if (/relation .* does not exist/i.test(testo)) {
    return "La tabella dell'abbonamento non esiste ancora: esegui la migrazione SQL su Supabase."
  }
  return `Operazione non riuscita: ${testo || 'errore sconosciuto'}. Riprova.`
}

const ABBONAMENTO_FREE = {
  subscription_status: 'free',
  subscription_plan: null,
  subscription_renews_at: null,
  subscription_cancel_at_period_end: false,
  subscription_ends_at: null
}

/**
 * Legge l'abbonamento dell'utente autenticato. Nessuna riga in "abbonamenti"
 * equivale a piano free (il webhook crea la riga solo al primo acquisto pro).
 */
export async function ottieniAbbonamento(userId) {
  if (!userId) return { ...ABBONAMENTO_FREE }
  try {
    const { data, error } = await supabase
      .from('abbonamenti')
      .select(
        'subscription_status, subscription_plan, subscription_renews_at, subscription_cancel_at_period_end, subscription_ends_at'
      )
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(messaggioErrore(error))
    return data ?? { ...ABBONAMENTO_FREE }
  } catch (err) {
    if (err instanceof TypeError) throw new Error(messaggioErrore(err))
    throw err
  }
}
