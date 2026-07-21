import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { LIMITE_RICAVI, GRUPPI_ATECO, CASSE, calcolaForfettario } from '../lib/calcolo.js'
import { caricaProiezione, salvaProiezione } from '../lib/proiezioni.js'
import { esportaPdfProiezione } from '../lib/pdf.js'
import ScaricaPdf from './ScaricaPdf.jsx'

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
})

const percento = new Intl.NumberFormat('it-IT', {
  style: 'percent',
  maximumFractionDigits: 1
})

export const NOMI_MESI = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre'
]

const RITARDO_SALVATAGGIO = 900

// Sezione "Proiezione annuale", visibile solo da loggati: griglia dei 12 mesi
// dell'anno corrente con i ricavi fatturati o previsti. Riusa la funzione di
// calcolo con i parametri scelti nel calcolatore e salva in automatico su
// Supabase (debounce) a ogni modifica.
export default function ProiezioneAnnuale({ dati }) {
  const { user } = useAuth()
  const anno = new Date().getFullYear()

  const [mesi, setMesi] = useState(() => Array(12).fill(''))
  const [caricamento, setCaricamento] = useState(true)
  const [stato, setStato] = useState('idle') // idle | modificato | salvataggio | salvato | errore
  const [errore, setErrore] = useState(null)
  // true solo dopo il caricamento iniziale: evita di salvare i dati appena letti
  const prontoRef = useRef(false)
  // scarta gli esiti dei salvataggi superati da modifiche più recenti
  const versioneRef = useRef(0)

  useEffect(() => {
    prontoRef.current = false
    if (!user) {
      setMesi(Array(12).fill(''))
      setStato('idle')
      setErrore(null)
      return
    }
    let attivo = true
    setCaricamento(true)
    setErrore(null)
    caricaProiezione(anno)
      .then((riga) => {
        if (!attivo) return
        if (Array.isArray(riga?.mesi)) {
          setMesi(
            Array.from({ length: 12 }, (_, i) => {
              const n = Number(riga.mesi[i])
              return n > 0 ? String(n) : ''
            })
          )
        }
        setStato(riga ? 'salvato' : 'idle')
      })
      .catch((err) => {
        if (attivo) setErrore(err.message)
      })
      .finally(() => {
        if (attivo) {
          setCaricamento(false)
          prontoRef.current = true
        }
      })
    return () => {
      attivo = false
    }
  }, [user, anno])

  const mesiNumerici = useMemo(() => mesi.map((m) => Math.max(Number(m) || 0, 0)), [mesi])
  const totaleRicavi = useMemo(() => mesiNumerici.reduce((a, b) => a + b, 0), [mesiNumerici])

  const risultato = useMemo(
    () =>
      calcolaForfettario({
        ricavi: totaleRicavi,
        gruppoId: dati.gruppoId,
        anniAttivita: dati.anniAttivita,
        cassaId: dati.cassaId,
        riduzione35: dati.riduzione35
      }),
    [totaleRicavi, dati]
  )

  // Salvataggio automatico con debounce a ogni modifica dei valori mensili
  useEffect(() => {
    if (!user || !prontoRef.current || stato !== 'modificato') return
    const versione = ++versioneRef.current
    const timer = setTimeout(() => {
      setStato('salvataggio')
      setErrore(null)
      salvaProiezione({ anno, mesi: mesiNumerici })
        .then(() => {
          if (versioneRef.current === versione) setStato('salvato')
        })
        .catch((err) => {
          if (versioneRef.current === versione) {
            setStato('errore')
            setErrore(err.message)
          }
        })
    }, RITARDO_SALVATAGGIO)
    return () => clearTimeout(timer)
  }, [user, anno, stato, mesiNumerici])

  if (!user) return null

  function onCambiaMese(indice, valore) {
    setMesi((prima) => {
      const dopo = [...prima]
      dopo[indice] = valore
      return dopo
    })
    setStato('modificato')
  }

  function testoStato() {
    if (stato === 'salvataggio') return 'Salvataggio…'
    if (stato === 'salvato') return 'Salvato ✓'
    if (stato === 'modificato') return 'Modifiche non salvate…'
    return null
  }

  return (
    <section className="scheda" aria-labelledby="titolo-proiezione">
      <div className="proiezione-intestazione">
        <h2 id="titolo-proiezione">Proiezione annuale {anno}</h2>
        {testoStato() && (
          <span
            className={`stato-salvataggio${stato === 'salvato' ? ' stato-salvato' : ''}`}
            role="status"
          >
            {testoStato()}
          </span>
        )}
      </div>

      <p className="auth-nota">
        Inserisci i ricavi fatturati o previsti mese per mese: la stima usa i parametri
        (ATECO, anni di attività, cassa) scelti nel calcolatore qui sopra e si salva in
        automatico.
      </p>

      {errore && (
        <p className="avviso" role="alert">
          {errore}
        </p>
      )}

      {caricamento ? (
        <p className="auth-nota">Caricamento della proiezione…</p>
      ) : (
        <>
          <div className="griglia-mesi">
            {NOMI_MESI.map((nome, i) => (
              <div key={nome} className="mese">
                <label htmlFor={`mese-${i}`}>{nome}</label>
                <input
                  id={`mese-${i}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="100"
                  placeholder="0"
                  value={mesi[i]}
                  onChange={(e) => onCambiaMese(i, e.target.value)}
                />
                <small className="mese-accantona">
                  {mesiNumerici[i] > 0
                    ? `accantona ${euro.format(
                        mesiNumerici[i] * risultato.percentualeAccantonamento
                      )}`
                    : ' '}
                </small>
              </div>
            ))}
          </div>

          {risultato.superaLimite && (
            <p className="avviso avviso-limite" role="alert">
              Attenzione: il totale di {euro.format(totaleRicavi)} supera il limite di{' '}
              {euro.format(LIMITE_RICAVI)} previsto per restare nel regime forfettario.
            </p>
          )}

          <div className="proiezione-totali">
            <div className="riga">
              <span className="riga-label">Totale ricavi anno</span>
              <span className="riga-valore">{euro.format(totaleRicavi)}</span>
            </div>
            <div className="riga">
              <span className="riga-label">Imposta sostitutiva stimata</span>
              <span className="riga-valore">{euro.format(risultato.imposta)}</span>
            </div>
            <div className="riga">
              <span className="riga-label">Contributi INPS stimati</span>
              <span className="riga-valore">{euro.format(risultato.contributi)}</span>
            </div>
            <div className="riga riga-evidenziata">
              <span className="riga-label">
                Totale da accantonare
                <small>{percento.format(risultato.percentualeAccantonamento)} dei ricavi</small>
              </span>
              <span className="riga-valore">{euro.format(risultato.totaleDaVersare)}</span>
            </div>
          </div>

          <ScaricaPdf
            disabilitato={totaleRicavi <= 0}
            onEsporta={() =>
              esportaPdfProiezione({
                anno,
                mesi: mesiNumerici,
                nomiMesi: NOMI_MESI,
                dati,
                risultato,
                totaleRicavi,
                superaLimite: risultato.superaLimite,
                limiteRicavi: LIMITE_RICAVI,
                GRUPPI_ATECO,
                CASSE
              })
            }
          />
        </>
      )}
    </section>
  )
}
