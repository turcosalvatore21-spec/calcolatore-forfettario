import { supabase } from './supabase.js'

// Trasforma gli errori di Supabase/fetch in messaggi comprensibili in italiano,
// come in simulazioni.js.
function messaggioErrore(error) {
  const testo = error?.message || ''
  if (
    error instanceof TypeError ||
    /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(testo)
  ) {
    return 'Errore di rete: controlla la connessione a internet e riprova.'
  }
  if (/JWT|token|not authenticated|session/i.test(testo)) {
    return 'Sessione scaduta: esci e accedi di nuovo per continuare.'
  }
  if (/relation .* does not exist/i.test(testo)) {
    return 'La tabella delle proiezioni non esiste ancora: esegui la migrazione SQL 002 su Supabase.'
  }
  return `Operazione non riuscita: ${testo || 'errore sconosciuto'}. Riprova.`
}

function lancia(error) {
  throw new Error(messaggioErrore(error))
}

/** Carica la proiezione dell'utente autenticato per l'anno indicato (o null). */
export async function caricaProiezione(anno) {
  try {
    const { data, error } = await supabase
      .from('proiezioni')
      .select('anno, mesi, updated_at')
      .eq('anno', anno)
      .maybeSingle()
    if (error) lancia(error)
    return data
  } catch (err) {
    if (err instanceof TypeError) lancia(err)
    throw err
  }
}

/** Salva (crea o aggiorna) i ricavi mensili dell'anno: una riga per utente e anno. */
export async function salvaProiezione({ anno, mesi }) {
  try {
    const { data: sessione } = await supabase.auth.getSession()
    const userId = sessione?.session?.user?.id
    if (!userId) {
      throw new Error('Devi essere autenticato per salvare la proiezione.')
    }
    const { error } = await supabase
      .from('proiezioni')
      .upsert(
        { user_id: userId, anno, mesi, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,anno' }
      )
    if (error) lancia(error)
  } catch (err) {
    if (err instanceof TypeError) lancia(err)
    throw err
  }
}
