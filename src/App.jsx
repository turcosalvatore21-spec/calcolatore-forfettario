import { useCallback, useMemo, useState } from 'react'
import { GRUPPI_ATECO, CASSE, LIMITE_RICAVI, calcolaForfettario } from './lib/calcolo.js'
import { useAuth } from './hooks/useAuth.js'
import AuthModal from './components/AuthModal.jsx'
import SalvaSimulazione from './components/SalvaSimulazione.jsx'
import MieSimulazioni from './components/MieSimulazioni.jsx'
import ProiezioneAnnuale from './components/ProiezioneAnnuale.jsx'
import ScaricaPdf from './components/ScaricaPdf.jsx'
import { esportaPdfCalcolo } from './lib/pdf.js'

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
})

const percento = new Intl.NumberFormat('it-IT', {
  style: 'percent',
  maximumFractionDigits: 1
})

function Riga({ label, value, evidenzia, nota }) {
  return (
    <div className={`riga${evidenzia ? ' riga-evidenziata' : ''}`}>
      <span className="riga-label">
        {label}
        {nota && <small>{nota}</small>}
      </span>
      <span className="riga-valore">{value}</span>
    </div>
  )
}

function BarraUtente({ onApriAccesso }) {
  const { user, loading, signOut } = useAuth()

  if (loading) return <div className="barra-utente" aria-hidden="true" />

  return (
    <div className="barra-utente">
      {user ? (
        <>
          <span className="utente-email" title={user.email}>
            {user.email}
          </span>
          <button type="button" className="bottone bottone-contorno" onClick={() => signOut()}>
            Esci
          </button>
        </>
      ) : (
        <button type="button" className="bottone bottone-pieno" onClick={onApriAccesso}>
          Accedi
        </button>
      )}
    </div>
  )
}

export default function App() {
  const [ricavi, setRicavi] = useState('30000')
  const [gruppoId, setGruppoId] = useState('professionisti')
  const [anniAttivita, setAnniAttivita] = useState('1')
  const [cassaId, setCassaId] = useState('gestione-separata')
  const [riduzione35, setRiduzione35] = useState(false)
  const [modaleAuthAperto, setModaleAuthAperto] = useState(false)
  const [versioneSimulazioni, setVersioneSimulazioni] = useState(0)

  const ricaviNum = Number(ricavi) || 0
  const mostraRiduzione = cassaId !== 'gestione-separata'

  const risultato = useMemo(
    () =>
      calcolaForfettario({
        ricavi: ricaviNum,
        gruppoId,
        anniAttivita: Number(anniAttivita),
        cassaId,
        riduzione35: mostraRiduzione && riduzione35
      }),
    [ricaviNum, gruppoId, anniAttivita, cassaId, riduzione35, mostraRiduzione]
  )

  // Input correnti nel formato salvato su Supabase (colonna jsonb "dati")
  const datiCorrenti = useMemo(
    () => ({
      ricavi: ricaviNum,
      gruppoId,
      anniAttivita: Number(anniAttivita),
      cassaId,
      riduzione35: mostraRiduzione && riduzione35
    }),
    [ricaviNum, gruppoId, anniAttivita, cassaId, riduzione35, mostraRiduzione]
  )

  const caricaSimulazione = useCallback((dati) => {
    if (!dati) return
    setRicavi(String(dati.ricavi ?? ''))
    if (GRUPPI_ATECO.some((g) => g.id === dati.gruppoId)) setGruppoId(dati.gruppoId)
    const anni = Number(dati.anniAttivita)
    setAnniAttivita(anni >= 1 && anni <= 6 ? String(anni) : '1')
    if (CASSE.some((c) => c.id === dati.cassaId)) setCassaId(dati.cassaId)
    setRiduzione35(Boolean(dati.riduzione35))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="app">
      <header className="intestazione">
        <BarraUtente onApriAccesso={() => setModaleAuthAperto(true)} />
        <h1>Calcolo tasse regime forfettario</h1>
        <p className="sottotitolo">
          Calcola gratis imposta sostitutiva, contributi INPS e netto annuo della tua partita IVA
          forfettaria — parametri aggiornati al 2026.
        </p>
      </header>

      <main>
        <section className="scheda" aria-labelledby="titolo-dati">
          <h2 id="titolo-dati">I tuoi dati</h2>

          <div className="campo">
            <label htmlFor="ricavi">Ricavi o compensi annui (€)</label>
            <input
              id="ricavi"
              type="number"
              inputMode="numeric"
              min="0"
              step="500"
              value={ricavi}
              onChange={(e) => setRicavi(e.target.value)}
            />
            {risultato.superaLimite && (
              <p className="avviso" role="alert">
                Attenzione: superi il limite di {euro.format(LIMITE_RICAVI)} previsto per restare
                nel regime forfettario.
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="ateco">Attività (gruppo ATECO)</label>
            <select id="ateco" value={gruppoId} onChange={(e) => setGruppoId(e.target.value)}>
              {GRUPPI_ATECO.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label} — coeff. {Math.round(g.coefficiente * 100)}%
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="anni">Anni di attività</label>
            <select id="anni" value={anniAttivita} onChange={(e) => setAnniAttivita(e.target.value)}>
              <option value="1">1° anno — aliquota startup 5%</option>
              <option value="2">2° anno — aliquota startup 5%</option>
              <option value="3">3° anno — aliquota startup 5%</option>
              <option value="4">4° anno — aliquota startup 5%</option>
              <option value="5">5° anno — aliquota startup 5%</option>
              <option value="6">Oltre 5 anni — aliquota 15%</option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="cassa">Cassa previdenziale</label>
            <select id="cassa" value={cassaId} onChange={(e) => setCassaId(e.target.value)}>
              {CASSE.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {mostraRiduzione && (
            <div className="campo campo-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={riduzione35}
                  onChange={(e) => setRiduzione35(e.target.checked)}
                />
                Applica la riduzione contributiva del 35% per i forfettari
              </label>
            </div>
          )}
        </section>

        <section className="scheda risultati" aria-labelledby="titolo-risultati">
          <h2 id="titolo-risultati">Risultato del calcolo</h2>

          <Riga
            label="Reddito imponibile"
            nota={`coefficiente di redditività ${percento.format(risultato.coefficiente)}`}
            value={euro.format(risultato.redditoImponibile)}
          />
          <Riga
            label="Contributi INPS"
            nota={cassaId === 'gestione-separata' ? 'Gestione Separata 26,07%' : 'fissi sul minimale + eccedenza'}
            value={euro.format(risultato.contributi)}
          />
          <Riga
            label="Imposta sostitutiva"
            nota={`aliquota ${percento.format(risultato.aliquota)} sull'imponibile al netto dei contributi`}
            value={euro.format(risultato.imposta)}
          />
          <Riga label="Totale tasse e contributi" value={euro.format(risultato.totaleDaVersare)} />
          <Riga label="Netto annuo" value={euro.format(risultato.nettoAnnuo)} evidenzia />
          <Riga label="Netto mensile" value={euro.format(risultato.nettoMensile)} evidenzia />

          <div className="accantonamento">
            <span className="accantonamento-valore">
              {percento.format(risultato.percentualeAccantonamento)}
            </span>
            <span className="accantonamento-label">
              da accantonare su ogni fattura per coprire tasse e contributi
            </span>
          </div>

          <SalvaSimulazione
            dati={datiCorrenti}
            onApriAccesso={() => setModaleAuthAperto(true)}
            onSalvata={() => setVersioneSimulazioni((v) => v + 1)}
          />

          <ScaricaPdf
            onEsporta={() =>
              esportaPdfCalcolo({ dati: datiCorrenti, risultato, GRUPPI_ATECO, CASSE })
            }
          />
        </section>

        <MieSimulazioni onCarica={caricaSimulazione} versione={versioneSimulazioni} />

        <ProiezioneAnnuale dati={datiCorrenti} />

        <section className="scheda testo-seo" aria-labelledby="titolo-info">
          <h2 id="titolo-info">Come funziona il calcolo delle tasse nel regime forfettario</h2>
          <p>
            Nel regime forfettario il reddito imponibile non si calcola sottraendo i costi reali,
            ma applicando ai ricavi un <strong>coefficiente di redditività</strong> che dipende dal
            codice ATECO dell’attività. Sul reddito così ottenuto, al netto dei contributi
            previdenziali versati, si paga un’<strong>imposta sostitutiva</strong> del 15%, ridotta
            al <strong>5% per i primi 5 anni</strong> di nuove attività.
          </p>
          <h3>Contributi previdenziali</h3>
          <p>
            I liberi professionisti senza cassa di categoria versano i contributi alla{' '}
            <strong>Gestione Separata INPS</strong> (26,07% del reddito imponibile). Artigiani e
            commercianti versano invece contributi fissi sul reddito minimale e una percentuale
            sulla parte eccedente, con la possibilità di richiedere una{' '}
            <strong>riduzione del 35%</strong> riservata ai contribuenti forfettari.
          </p>
          <h3>Quanto accantonare per le tasse</h3>
          <p>
            Il calcolatore stima anche la <strong>percentuale da accantonare su ogni fattura</strong>:
            mettendo da parte quella quota di ogni incasso avrai sempre la liquidità necessaria per
            pagare imposta sostitutiva e contributi INPS a scadenza.
          </p>
          <p className="disclaimer">
            I risultati sono una stima a regime basata sui parametri 2026 e non sostituiscono la
            consulenza di un commercialista. I contributi effettivi dipendono dai versamenti
            dell’anno e dalla posizione previdenziale individuale.
          </p>
        </section>
      </main>

      <footer className="pie-pagina">
        <p>Calcolatore Forfettario — funziona anche offline, installalo come app.</p>
      </footer>

      <AuthModal aperto={modaleAuthAperto} onChiudi={() => setModaleAuthAperto(false)} />
    </div>
  )
}
