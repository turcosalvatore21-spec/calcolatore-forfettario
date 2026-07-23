import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useAbbonamento } from '../hooks/useAbbonamento.js'
import { apriCheckout } from '../lib/lemonjs.js'
import { PIANI, pianoConfigurato, urlCheckout } from '../lib/lemonsqueezyConfig.js'
import { urlPortaleCliente } from '../lib/portale.js'

const dataBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const NOME_PIANO = { monthly: 'mensile', annual: 'annuale' }

// Ritenta la lettura dell'abbonamento un paio di volte dopo il checkout:
// il webhook Lemon Squeezy può impiegare qualche secondo ad aggiornare Supabase.
function ripianificaRicarica(ricarica) {
  ;[2000, 6000].forEach((ritardo) => setTimeout(ricarica, ritardo))
}

function BottonePiano({ id, config, inCorso, disabilitato, onClick }) {
  if (!pianoConfigurato(id)) {
    return (
      <div className="piano-pro">
        <h3>{config.etichetta}</h3>
        <p className="piano-prezzo">{config.prezzo}</p>
        <p className="avviso" role="alert">
          Checkout non disponibile al momento per questo piano. Riprova più tardi.
        </p>
      </div>
    )
  }

  return (
    <div className="piano-pro">
      <h3>{config.etichetta}</h3>
      <p className="piano-prezzo">{config.prezzo}</p>
      <button type="button" className="bottone bottone-pieno" onClick={onClick} disabled={disabilitato}>
        {inCorso ? 'Apertura checkout…' : `Passa a Pro — ${config.etichetta}`}
      </button>
    </div>
  )
}

export default function PaginaPro({ onApriAccesso }) {
  const { user } = useAuth()
  const { isPro, piano, rinnovaIl, inScadenza, scadeIl, loading, ricarica } = useAbbonamento()
  const [pianoInCorso, setPianoInCorso] = useState(null)
  const [errore, setErrore] = useState(null)
  const [portaleInCorso, setPortaleInCorso] = useState(false)
  const [errorePortale, setErrorePortale] = useState(null)

  async function onGestisciAbbonamento() {
    setErrorePortale(null)
    setPortaleInCorso(true)
    try {
      const url = await urlPortaleCliente()
      window.location.href = url
    } catch (err) {
      setErrorePortale(err.message || 'Impossibile aprire la gestione dell’abbonamento.')
      setPortaleInCorso(false)
    }
  }

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
        <>
          {inScadenza ? (
            <p className="auth-conferma auth-conferma-scadenza" role="status">
              Abbonamento disdetto — Pro {NOME_PIANO[piano] ? `(${NOME_PIANO[piano]}) ` : ''}attivo
              {scadeIl ? ` fino al ${dataBreve.format(new Date(scadeIl))}` : ' fino a fine periodo'}.
              Dopo questa data tornerai al piano gratuito; puoi riattivarlo quando vuoi.
            </p>
          ) : (
            <p className="auth-conferma" role="status">
              Sei già abbonato al piano Pro ({NOME_PIANO[piano] ?? piano}).
              {rinnovaIl && ` Si rinnova il ${dataBreve.format(new Date(rinnovaIl))}.`}
            </p>
          )}
          <div className="gestisci-abbonamento">
            <button
              type="button"
              className="bottone bottone-contorno"
              onClick={onGestisciAbbonamento}
              disabled={portaleInCorso}
            >
              {portaleInCorso ? 'Apertura…' : 'Gestisci abbonamento'}
            </button>
            <p className="auth-nota">
              Aggiorna il metodo di pagamento, scarica le fatture o disdici in autonomia dal portale
              cliente Lemon Squeezy.
            </p>
            {errorePortale && (
              <p className="avviso" role="alert">
                {errorePortale}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="auth-nota">
            Sblocca simulazioni salvate illimitate, confronto scenari ed export PDF.
          </p>
          <div className="piani-pro">
            {Object.entries(PIANI).map(([id, config]) => (
              <BottonePiano
                key={id}
                id={id}
                config={config}
                inCorso={pianoInCorso === id}
                disabilitato={pianoInCorso !== null}
                onClick={() => onClickPassaAPro(id)}
              />
            ))}
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
