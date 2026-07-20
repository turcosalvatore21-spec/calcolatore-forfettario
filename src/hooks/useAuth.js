import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

// Hook riutilizzabile: espone utente, sessione e azioni di autenticazione.
// Da usare in futuro per proteggere feature riservate (es. paywall):
//   const { user } = useAuth()
//   if (!user) { ...mostra invito al login... }
export function useAuth() {
  return useContext(AuthContext)
}
