import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useAbbonamento } from '../hooks/useAbbonamento.js'
import { calcolaForfettario } from '../lib/calcolo.js'
import { elencaSimulazioni, eliminaSimulazione, rinominaSimulazione } from '../lib/simulazioni.js'

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
})

const dataBreve = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

const MAX_CONFRONTO = 3

function risultatoDi(sim) {
  const dati = sim.dati ?? {}
  return calcolaForfettario({
    ricavi: Number(dati.ricavi) || 0,
    gruppoId: dati.gruppoId,
    anniAttivita: Number(dati.anniAttivita) || 1,
    cassaId: dati.cassaId,
    riduzione35: Boolean(dati.riduzione35)
  })
}

// Sezione "Le mie simulazioni": visibile solo da loggati. Elenca le simulazioni
// salvate, permette di ricaricarle nel calcolatore, rinominarle, eliminarle e
// confrontarne 2-3 in una tabella comparativa.
export default function MieSimulazioni({ onCarica, versione }) {
  const { user } = useAuth()
  const { isPro } = useAbbonamento()
  const [simulazioni, setSimulazioni] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [selezionate, setSelezionate] = useState([])
  const [idInModifica, setIdInModifica] = useState(null)
  const [nuovoNome, setNuovoNome] = useState('')
  const [idOccupato, setIdOccupato] = useState(null)

  useEffect(() => {
    if (!user || !isPro) {
      setSimulazioni([])
      setSelezionate([])
      return
    }
    let attivo = true
    setCaricamento(true)
    setErrore(null)
    elencaSimulazioni()
      .then((righe) => {
        if (attivo) setSimulazioni(righe)
      })
      .catch((err) => {
        if (attivo) setErrore(err.message)
      })
      .finally(() => {
        if (attivo) setCaricamento(false)
      })
    return () => {
      attivo = false
    }
  }, [user, isPro, versione])

  const confrontate = useMemo(
    () => simulazioni.filter((s) => selezionate.includes(s.id)),
    [simulazioni, selezionate]
  )

  if (!user) return null

  if (!isPro) {
    return (
      <section className="scheda" aria-labelledby="titolo-simulazioni">
        <h2 id="titolo-simulazioni">Le mie simulazioni</h2>
        <p className="upsell-pro">
          Salvataggio e confronto delle simulazioni sono funzioni <strong>Pro</strong>.{' '}
          <a href="#pro">Passa a Pro</a> per sbloccarle.
        </p>
      </section>
    )
  }

  function toggleSelezione(id) {
    setSelezionate((prima) => {
      if (prima.includes(id)) return prima.filter((x) => x !== id)
      if (prima.length >= MAX_CONFRONTO) return prima
      return [...prima, id]
    })
  }

  function apriRinomina(sim) {
    setIdInModifica(sim.id)
    setNuovoNome(sim.nome)
    setErrore(null)
  }

  async function confermaRinomina(e) {
    e.preventDefault()
    const nome = nuovoNome.trim()
    if (!nome) return
    setIdOccupato(idInModifica)
    setErrore(null)
    try {
      await rinominaSimulazione(idInModifica, nome)
      setSimulazioni((prima) =>
        prima.map((s) => (s.id === idInModifica ? { ...s, nome } : s))
      )
      setIdInModifica(null)
    } catch (err) {
      setErrore(err.message)
    } finally {
      setIdOccupato(null)
    }
  }

  async function onElimina(sim) {
    if (!window.confirm(`Eliminare la simulazione «${sim.nome}»? L'operazione è definitiva.`)) {
      return
    }
    setIdOccupato(sim.id)
    setErrore(null)
    try {
      await eliminaSimulazione(sim.id)
      setSimulazioni((prima) => prima.filter((s) => s.id !== sim.id))
      setSelezionate((prima) => prima.filter((id) => id !== sim.id))
    } catch (err) {
      setErrore(err.message)
    } finally {
      setIdOccupato(null)
    }
  }

  return (
    <section className="scheda" aria-labelledby="titolo-simulazioni">
      <h2 id="titolo-simulazioni">Le mie simulazioni</h2>

      {errore && (
        <p className="avviso" role="alert">
          {errore}
        </p>
      )}

      {caricamento ? (
        <p className="auth-nota">Caricamento delle simulazioni…</p>
      ) : simulazioni.length === 0 ? (
        !errore && (
          <p className="auth-nota">
            Non hai ancora simulazioni salvate. Fai un calcolo e tocca «Salva simulazione».
          </p>
        )
      ) : (
        <>
          <p className="auth-nota">
            Tocca una simulazione per ricaricarla nel calcolatore. Seleziona 2 o 3 caselle per
            confrontarle.
          </p>

          <ul className="lista-simulazioni">
            {simulazioni.map((sim) => {
              const risultato = risultatoDi(sim)
              const occupata = idOccupato === sim.id
              return (
                <li key={sim.id} className="simulazione">
                  {idInModifica === sim.id ? (
                    <form className="rinomina-form" onSubmit={confermaRinomina}>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        autoFocus
                        value={nuovoNome}
                        onChange={(e) => setNuovoNome(e.target.value)}
                        aria-label="Nuovo nome della simulazione"
                      />
                      <div className="salva-azioni">
                        <button
                          type="submit"
                          className="bottone bottone-pieno bottone-piccolo"
                          disabled={occupata}
                        >
                          {occupata ? 'Salvataggio…' : 'Salva nome'}
                        </button>
                        <button
                          type="button"
                          className="bottone bottone-contorno bottone-piccolo"
                          onClick={() => setIdInModifica(null)}
                          disabled={occupata}
                        >
                          Annulla
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <label className="simulazione-selezione">
                        <input
                          type="checkbox"
                          checked={selezionate.includes(sim.id)}
                          onChange={() => toggleSelezione(sim.id)}
                          disabled={
                            !selezionate.includes(sim.id) && selezionate.length >= MAX_CONFRONTO
                          }
                          aria-label={`Seleziona «${sim.nome}» per il confronto`}
                        />
                      </label>
                      <button
                        type="button"
                        className="simulazione-corpo"
                        onClick={() => onCarica(sim.dati)}
                        title="Ricarica questi dati nel calcolatore"
                      >
                        <span className="simulazione-nome">{sim.nome}</span>
                        <span className="simulazione-dettagli">
                          {dataBreve.format(new Date(sim.created_at))} · ricavi{' '}
                          {euro.format(Number(sim.dati?.ricavi) || 0)} · netto{' '}
                          {euro.format(risultato.nettoAnnuo)}
                        </span>
                      </button>
                      <div className="simulazione-azioni">
                        <button
                          type="button"
                          className="bottone bottone-contorno bottone-piccolo"
                          onClick={() => apriRinomina(sim)}
                          disabled={occupata}
                        >
                          Rinomina
                        </button>
                        <button
                          type="button"
                          className="bottone bottone-contorno bottone-piccolo bottone-pericolo"
                          onClick={() => onElimina(sim)}
                          disabled={occupata}
                        >
                          {occupata ? '…' : 'Elimina'}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>

          {confrontate.length >= 2 && (
            <div className="confronto">
              <h3>Confronto simulazioni</h3>
              <div className="confronto-scroll">
                <table className="confronto-tabella">
                  <thead>
                    <tr>
                      <th scope="col">Voce</th>
                      {confrontate.map((sim) => (
                        <th key={sim.id} scope="col">
                          {sim.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Ricavi', (s) => euro.format(Number(s.dati?.ricavi) || 0)],
                      ['Reddito imponibile', (s) => euro.format(risultatoDi(s).redditoImponibile)],
                      ['Imposta sostitutiva', (s) => euro.format(risultatoDi(s).imposta)],
                      ['Contributi INPS', (s) => euro.format(risultatoDi(s).contributi)],
                      ['Netto annuo', (s) => euro.format(risultatoDi(s).nettoAnnuo)]
                    ].map(([voce, valore]) => (
                      <tr key={voce} className={voce === 'Netto annuo' ? 'confronto-netto' : ''}>
                        <th scope="row">{voce}</th>
                        {confrontate.map((sim) => (
                          <td key={sim.id}>{valore(sim)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
