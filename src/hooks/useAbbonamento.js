import { useContext } from 'react'
import { AbbonamentoContext } from '../context/AbbonamentoContext.jsx'

// Espone { isPro, piano, rinnovaIl, loading, ricarica }: usarlo per
// sbloccare le funzioni Pro (simulazioni salvate, confronto, export PDF).
export function useAbbonamento() {
  return useContext(AbbonamentoContext)
}
