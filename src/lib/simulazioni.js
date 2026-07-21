import { supabase } from './supabase.js'

// Trasforma gli errori di Supabase/fetch in messaggi comprensibili in italiano.
// Le operazioni lanciano un Error con messaggio già pronto per l'interfaccia.
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
    return 'La tabella delle simulazioni non esiste ancora: esegui la migrazione SQL su Supabase.'
  }
  return `Operazione non riuscita: ${testo || 'errore sconosciuto'}. Riprova.`
}

function lancia(error) {
  throw new Error(messaggioErrore(error))
}

/** Elenca le simulazioni dell'utente autenticato, più recenti prima. */
export async function elencaSimulazioni() {
  try {
    const { data, error } = await supabase
      .from('simulazioni')
      .select('id, nome, dati, created_at')
      .order('created_at', { ascending: false })
    if (error) lancia(error)
    return data ?? []
  } catch (err) {
    if (err instanceof TypeError) lancia(err)
    throw err
  }
}

/** Salva una nuova simulazione con gli input correnti del calcolatore. */
export async function salvaSimulazione({ nome, dati }) {
  try {
    const { data: sessione } = await supabase.auth.getSession()
    const userId = sessione?.session?.user?.id
    if (!userId) {
      throw new Error('Devi essere autenticato per salvare una simulazione.')
    }
    const { data, error } = await supabase
      .from('simulazioni')
      .insert({ user_id: userId, nome, dati })
      .select('id, nome, dati, created_at')
      .single()
    if (error) lancia(error)
    return data
  } catch (err) {
    if (err instanceof TypeError) lancia(err)
    throw err
  }
}

/** Rinomina una simulazione esistente. */
export async function rinominaSimulazione(id, nome) {
  try {
    const { error } = await supabase.from('simulazioni').update({ nome }).eq('id', id)
    if (error) lancia(error)
  } catch (err) {
    if (err instanceof TypeError) lancia(err)
    throw err
  }
}

/** Elimina definitivamente una simulazione. */
export async function eliminaSimulazione(id) {
  try {
    const { error } = await supabase.from('simulazioni').delete().eq('id', id)
    if (error) lancia(error)
  } catch (err) {
    if (err instanceof TypeError) lancia(err)
    throw err
  }
}
