import { createContext, useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { ottieniAbbonamento } from '../lib/abbonamento.js'

export const AbbonamentoContext = createContext({
  isPro: false,
  piano: null,
  rinnovaIl: null,
  loading: true,
  ricarica: async () => {}
})

export function AbbonamentoProvider({ children }) {
  const { user } = useAuth()
  const [abbonamento, setAbbonamento] = useState({
    subscription_status: 'free',
    subscription_plan: null,
    subscription_renews_at: null
  })
  const [loading, setLoading] = useState(true)

  const ricarica = useCallback(async () => {
    if (!user) {
      setAbbonamento({ subscription_status: 'free', subscription_plan: null, subscription_renews_at: null })
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

  const value = {
    isPro: abbonamento.subscription_status === 'pro',
    piano: abbonamento.subscription_plan,
    rinnovaIl: abbonamento.subscription_renews_at,
    loading,
    ricarica
  }

  return <AbbonamentoContext.Provider value={value}>{children}</AbbonamentoContext.Provider>
}
