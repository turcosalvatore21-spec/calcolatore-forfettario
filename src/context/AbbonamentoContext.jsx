import { createContext, useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { ottieniAbbonamento } from '../lib/abbonamento.js'

const ABBONAMENTO_FREE = {
  subscription_status: 'free',
  subscription_plan: null,
  subscription_renews_at: null,
  subscription_cancel_at_period_end: false,
  subscription_ends_at: null
}

export const AbbonamentoContext = createContext({
  isPro: false,
  piano: null,
  rinnovaIl: null,
  inScadenza: false,
  scadeIl: null,
  loading: true,
  ricarica: async () => {}
})

export function AbbonamentoProvider({ children }) {
  const { user } = useAuth()
  const [abbonamento, setAbbonamento] = useState(ABBONAMENTO_FREE)
  const [loading, setLoading] = useState(true)

  const ricarica = useCallback(async () => {
    if (!user) {
      setAbbonamento(ABBONAMENTO_FREE)
      setLoading(false)
      return
    }
    try {
      const dati = await ottieniAbbonamento(user.id)
      setAbbonamento(dati)
    } catch {
      // in caso di errore di rete manteniamo l'ultimo stato noto (fail-safe verso free)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setLoading(true)
    ricarica()
  }, [ricarica])

  // Rete di sicurezza lato client: se l'abbonamento è disdetto e la data di
  // fine periodo è già passata, l'accesso Pro decade anche se il webhook
  // "subscription_expired" non ha ancora aggiornato il database.
  const scadeIl = abbonamento.subscription_ends_at
  const graziaScaduta =
    Boolean(abbonamento.subscription_cancel_at_period_end) &&
    Boolean(scadeIl) &&
    new Date(scadeIl).getTime() <= Date.now()

  const isPro = abbonamento.subscription_status === 'pro' && !graziaScaduta

  const value = {
    isPro,
    piano: abbonamento.subscription_plan,
    rinnovaIl: abbonamento.subscription_renews_at,
    // in disdetta = Pro ancora attivo ma non si rinnoverà (mostra "Pro fino al …")
    inScadenza: isPro && Boolean(abbonamento.subscription_cancel_at_period_end),
    scadeIl,
    loading,
    ricarica
  }

  return <AbbonamentoContext.Provider value={value}>{children}</AbbonamentoContext.Provider>
}
