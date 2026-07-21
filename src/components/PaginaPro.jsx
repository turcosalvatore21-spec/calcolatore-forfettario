import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useAbbonamento } from '../hooks/useAbbonamento.js'
import { apriCheckout } from '../lib/lemonjs.js'
import { urlCheckout } from '../lib/lemonsqueezyConfig.js'

const dataBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const NOME_PIANO = { monthly: 'mensile', annual: 'annuale' }

// Ritenta la lettura dell'abbonamento un paio di volte dopo il checkout:
// il webhook Lemon Squeezy può impiegare qualche secondo ad aggiornare Supabase.
function ripianificaRicarica(ricarica) {
  ;[2000, 6000].forEach((ritardo) => setTimeout(ricarica, ritardo))
}

export default function PaginaPro({ onApriAccesso }) {
  const { user } = useAuth()
  const { isPro, piano, rinnovaIl, loading, ricarica } = useAbbonamento()
  const [pianoInCorso, setPianoInCorso] = useState(null)
  const [errore, setErrore] = useState(null)

  async function onClickPassaAPro(pianoScelto) {
    if (!user) {
      onApriAccesso()
      return
    }
    setErrore(null)
    setPianoInCorso(pianoScelto)
    try {
      const url = urlCheckout({ piano: pianoScelto, userId: user.id, email: user.email })
      await apriCheckout(url, {
        onSuccess: () => {
          ricarica()
          ripianificaRicarica(ricarica)
        }
      })
    } catch (err) {
      setErrore(err.message || 'Impossibile aprire il checkout. Riprova.')
    } finally {
      setPianoInCorso(null)
    }
  }

  return (
    <section id="pro" className="scheda scheda-pro" aria-labelledby="titolo-pro">
      <h2 id="titolo-pro">Passa a Pro</h2>

      {loading ? (
        <p className="auth-nota">Verifica dell'abbonamento…</p>
      ) : isPro ? (
        <p className="auth-conferma" role="status">
          Sei già abbonato al piano Pro ({NOME_PIANO[piano] ?? piano}).
          {rinnovaIl && ` Si rinnova il ${dataBreve.format(new Date(rinnovaIl))}.`}
        </p>
      ) : (
        <>
          <p className="auth-nota">
            Sblocca simulazioni salvate illimitate, confronto scenari ed export PDF.
          </p>
          <div className="piani-pro">
            <div className="piano-pro">
              <h3>Mensile</h3>
              <p className="piano-prezzo">6€/mese</p>
              <button
                type="button"
                className="bottone bottone-pieno"
                onClick={() => onClickPassaAPro('monthly')}
                disabled={pianoInCorso !== null}
              >
                {pianoInCorso === 'monthly' ? 'Apertura checkout…' : 'Passa a Pro — Mensile'}
              </button>
            </div>
            <div className="piano-pro">
              <h3>Annuale</h3>
              <p className="piano-prezzo">49€/anno</p>
              <button
                type="button"
                className="bottone bottone-pieno"
                onClick={() => onClickPassaAPro('annual')}
                disabled={pianoInCorso !== null}
              >
                {pianoInCorso === 'annual' ? 'Apertura checkout…' : 'Passa a Pro — Annuale'}
              </button>
            </div>
          </div>
          {!user && <p className="auth-nota">Accedi prima di procedere: il piano va collegato al tuo account.</p>}
          {errore && (
            <p className="avviso" role="alert">
              {errore}
            </p>
          )}
        </>
      )}
    </section>
  )
}
