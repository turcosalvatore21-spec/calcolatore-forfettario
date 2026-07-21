import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { salvaSimulazione } from '../lib/simulazioni.js'

// Bottone "Salva simulazione" sotto i risultati: chiede un nome e salva gli
// input correnti su Supabase. Se l'utente non è loggato apre la modale di accesso.
export default function SalvaSimulazione({ dati, onApriAccesso, onSalvata }) {
  const { user } = useAuth()
  const [formAperto, setFormAperto] = useState(false)
  const [nome, setNome] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState(null)
  const [salvata, setSalvata] = useState(false)

  function onClickSalva() {
    setSalvata(false)
    if (!user) {
      onApriAccesso()
      return
    }
    setErrore(null)
    setNome('')
    setFormAperto(true)
  }

  async function onSubmit(e) {
    e.preventDefault()
    const nomePulito = nome.trim()
    if (!nomePulito) return
    setErrore(null)
    setInCorso(true)
    try {
      await salvaSimulazione({ nome: nomePulito, dati })
      setFormAperto(false)
      setSalvata(true)
      onSalvata()
    } catch (err) {
      setErrore(err.message)
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="salva-simulazione">
      {formAperto ? (
        <form onSubmit={onSubmit} className="salva-form">
          <div className="campo">
            <label htmlFor="nome-simulazione">Nome della simulazione</label>
            <input
              id="nome-simulazione"
              type="text"
              required
              maxLength={80}
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Consulenza 2026, Secondo anno…"
            />
          </div>
          {errore && (
            <p className="avviso" role="alert">
              {errore}
            </p>
          )}
          <div className="salva-azioni">
            <button type="submit" className="bottone bottone-pieno" disabled={inCorso}>
              {inCorso ? 'Salvataggio…' : 'Salva'}
            </button>
            <button
              type="button"
              className="bottone bottone-contorno"
              onClick={() => setFormAperto(false)}
              disabled={inCorso}
            >
              Annulla
            </button>
          </div>
        </form>
      ) : (
        <>
          <button type="button" className="bottone bottone-pieno" onClick={onClickSalva}>
            Salva simulazione
          </button>
          {salvata && (
            <p className="auth-conferma" role="status">
              Simulazione salvata! La trovi qui sotto in «Le mie simulazioni».
            </p>
          )}
          {!user && (
            <p className="auth-nota">Accedi per salvare le tue simulazioni e confrontarle.</p>
          )}
        </>
      )}
    </div>
  )
}
