import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'

// Bottone «Scarica PDF», visibile solo agli utenti loggati. Riceve una
// funzione asincrona che genera e scarica il PDF nel browser (jsPDF).
export default function ScaricaPdf({ onEsporta, disabilitato = false }) {
  const { user } = useAuth()
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState(null)

  if (!user) return null

  async function onClick() {
    setErrore(null)
    setInCorso(true)
    try {
      await onEsporta()
    } catch {
      setErrore('Generazione del PDF non riuscita. Riprova.')
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="scarica-pdf">
      <button
        type="button"
        className="bottone bottone-contorno"
        onClick={onClick}
        disabled={inCorso || disabilitato}
      >
        {inCorso ? 'Generazione…' : 'Scarica PDF'}
      </button>
      {errore && (
        <p className="avviso" role="alert">
          {errore}
        </p>
      )}
    </div>
  )
}
