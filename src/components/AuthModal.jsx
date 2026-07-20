import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'

const MESSAGGI_ERRORE = {
  'Invalid login credentials': 'Email o password non corretti.',
  'Email not confirmed': 'Devi prima confermare la tua email: controlla la casella di posta.',
  'User already registered': 'Esiste già un account con questa email. Prova ad accedere.',
  'Password should be at least 6 characters.': 'La password deve avere almeno 6 caratteri.',
  'Signup requires a valid password': 'Inserisci una password valida.',
  'Email rate limit exceeded': 'Troppe richieste: riprova tra qualche minuto.'
}

function traduciErrore(error) {
  if (!error) return null
  return MESSAGGI_ERRORE[error.message] || `Si è verificato un errore: ${error.message}`
}

export default function AuthModal({ aperto, onChiudi }) {
  const { signInWithPassword, signUp, signInWithMagicLink } = useAuth()
  const [modalita, setModalita] = useState('accesso') // 'accesso' | 'registrazione' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState(null)
  const [conferma, setConferma] = useState(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (aperto) {
      setErrore(null)
      setConferma(null)
      setInCorso(false)
    }
  }, [aperto, modalita])

  useEffect(() => {
    if (!aperto) return
    const onEsc = (e) => {
      if (e.key === 'Escape') onChiudi()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [aperto, onChiudi])

  if (!aperto) return null

  const richiedePassword = modalita !== 'magic'

  async function onSubmit(e) {
    e.preventDefault()
    setErrore(null)
    setConferma(null)
    setInCorso(true)
    try {
      if (modalita === 'accesso') {
        const { error } = await signInWithPassword({ email, password })
        if (error) {
          setErrore(traduciErrore(error))
        } else {
          onChiudi()
        }
      } else if (modalita === 'registrazione') {
        const { data, error } = await signUp({ email, password })
        if (error) {
          setErrore(traduciErrore(error))
        } else if (data?.session) {
          onChiudi()
        } else {
          setConferma(
            'Registrazione completata! Controlla la tua email e clicca sul link di conferma per attivare l\'account.'
          )
        }
      } else {
        const { error } = await signInWithMagicLink({ email })
        if (error) {
          setErrore(traduciErrore(error))
        } else {
          setConferma(
            'Ti abbiamo inviato un link di accesso via email: aprilo per entrare senza password.'
          )
        }
      }
    } finally {
      setInCorso(false)
    }
  }

  const titolo =
    modalita === 'accesso'
      ? 'Accedi'
      : modalita === 'registrazione'
        ? 'Crea un account'
        : 'Accedi con link via email'

  const etichettaInvio =
    modalita === 'accesso'
      ? 'Accedi'
      : modalita === 'registrazione'
        ? 'Registrati'
        : 'Inviami il link'

  return (
    <div
      className="modale-sfondo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onChiudi()
      }}
    >
      <div
        className="modale scheda"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titolo-auth"
        ref={dialogRef}
      >
        <button type="button" className="modale-chiudi" onClick={onChiudi} aria-label="Chiudi">
          ×
        </button>

        <h2 id="titolo-auth">{titolo}</h2>

        <div className="auth-tab" role="tablist" aria-label="Modalità di accesso">
          <button
            type="button"
            role="tab"
            aria-selected={modalita === 'accesso'}
            className={modalita === 'accesso' ? 'attivo' : ''}
            onClick={() => setModalita('accesso')}
          >
            Accedi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modalita === 'registrazione'}
            className={modalita === 'registrazione' ? 'attivo' : ''}
            onClick={() => setModalita('registrazione')}
          >
            Registrati
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modalita === 'magic'}
            className={modalita === 'magic' ? 'attivo' : ''}
            onClick={() => setModalita('magic')}
          >
            Magic link
          </button>
        </div>

        {conferma ? (
          <div>
            <p className="auth-conferma" role="status">
              {conferma}
            </p>
            <button type="button" className="bottone bottone-pieno" onClick={onChiudi}>
              Chiudi
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="campo">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
              />
            </div>

            {richiedePassword && (
              <div className="campo">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={modalita === 'registrazione' ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Almeno 6 caratteri"
                />
              </div>
            )}

            {modalita === 'magic' && (
              <p className="auth-nota">
                Niente password: riceverai via email un link con cui accedere in un clic.
              </p>
            )}

            {errore && (
              <p className="avviso" role="alert">
                {errore}
              </p>
            )}

            <button type="submit" className="bottone bottone-pieno" disabled={inCorso}>
              {inCorso ? 'Attendere…' : etichettaInvio}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
