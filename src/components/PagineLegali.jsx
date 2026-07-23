// Pagine legali (Privacy Policy e Termini di Servizio) mostrate come "viste"
// dell'app in base all'hash dell'URL (#privacy / #termini). Nessuna dipendenza
// da un router: la logica di switch è in App.jsx.

const EMAIL = 'turcosalvatore21@gmail.com'
const AGGIORNAMENTO = '23 luglio 2026'

function PaginaLegale({ titolo, onIndietro, children }) {
  return (
    <main>
      <section className="scheda testo-legale" aria-labelledby="titolo-legale">
        <button type="button" className="link-indietro" onClick={onIndietro}>
          ← Torna al calcolatore
        </button>
        <h1 id="titolo-legale">{titolo}</h1>
        <p className="legale-aggiornamento">Ultimo aggiornamento: {AGGIORNAMENTO}</p>
        {children}
      </section>
    </main>
  )
}

export function Privacy({ onIndietro }) {
  return (
    <PaginaLegale titolo="Privacy Policy" onIndietro={onIndietro}>
      <p>
        La presente informativa descrive come vengono trattati i dati personali degli utenti del
        Calcolatore Forfettario (di seguito «il Servizio»), in conformità al Regolamento (UE)
        2016/679 («GDPR»).
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        Il titolare del trattamento è il gestore del Servizio, contattabile all’indirizzo email{' '}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Per qualsiasi richiesta relativa ai tuoi dati o
        all’esercizio dei tuoi diritti puoi scrivere a questo indirizzo.
      </p>

      <h2>Quali dati raccogliamo</h2>
      <ul>
        <li>
          <strong>Dati di registrazione e account:</strong> l’indirizzo email e le credenziali di
          accesso, gestite tramite il servizio di autenticazione <strong>Supabase</strong>. La
          password è conservata da Supabase in forma cifrata: noi non la vediamo mai.
        </li>
        <li>
          <strong>Simulazioni e proiezioni salvate:</strong> i dati che inserisci e scegli di
          salvare nel tuo account (ricavi, coefficiente ATECO, cassa previdenziale, ricavi mensili
          della proiezione annuale, nome della simulazione).
        </li>
        <li>
          <strong>Dati di pagamento:</strong> in caso di abbonamento Pro, i dati della carta o del
          conto di pagamento sono raccolti e gestiti <strong>esclusivamente da Lemon Squeezy</strong>
          , il fornitore che gestisce i pagamenti (vedi sotto). Noi <strong>non</strong> raccogliamo,
          vediamo né conserviamo i dati della tua carta.
        </li>
      </ul>

      <h2>Dove sono conservati i dati</h2>
      <p>
        I dati dell’account e le simulazioni sono conservati su <strong>Supabase</strong>, con
        infrastruttura localizzata nell’Unione Europea (<strong>region Europe</strong>).
        L’applicazione è ospitata su <strong>Vercel</strong>. I dati di pagamento sono conservati da{' '}
        <strong>Lemon Squeezy</strong>.
      </p>

      <h2>Finalità e base giuridica del trattamento</h2>
      <ul>
        <li>
          <strong>Fornire il Servizio</strong> (creazione account, salvataggio delle simulazioni,
          accesso alle funzioni Pro): base giuridica <em>esecuzione di un contratto</em> (art. 6.1.b
          GDPR).
        </li>
        <li>
          <strong>Gestire l’abbonamento Pro e i pagamenti</strong>: base giuridica <em>esecuzione di
          un contratto</em> e <em>obblighi legali</em> (art. 6.1.b e 6.1.c GDPR).
        </li>
        <li>
          <strong>Garantire sicurezza e corretto funzionamento</strong> del Servizio: base giuridica{' '}
          <em>legittimo interesse</em> (art. 6.1.f GDPR).
        </li>
      </ul>

      <h2>Fornitori terzi (responsabili del trattamento)</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — database, autenticazione e conservazione dati (UE).
        </li>
        <li>
          <strong>Vercel</strong> — hosting dell’applicazione.
        </li>
        <li>
          <strong>Lemon Squeezy</strong> — gestione di pagamenti, abbonamenti e fatturazione, in
          qualità di <strong>merchant of record</strong> (rivenditore ufficiale).
        </li>
      </ul>

      <h2>Per quanto tempo conserviamo i dati</h2>
      <p>
        Conserviamo i dati dell’account e le simulazioni finché il tuo account resta attivo. Alla
        cancellazione dell’account i dati associati vengono eliminati, fatti salvi gli eventuali
        obblighi di legge (ad esempio i dati fiscali conservati da Lemon Squeezy per la
        fatturazione).
      </p>

      <h2>I tuoi diritti</h2>
      <p>In qualità di interessato hai il diritto di:</p>
      <ul>
        <li>accedere ai tuoi dati e ottenerne una copia;</li>
        <li>rettificare dati inesatti o incompleti;</li>
        <li>chiedere la cancellazione dei dati («diritto all’oblio»);</li>
        <li>limitare o opporti al trattamento;</li>
        <li>ottenere la portabilità dei dati;</li>
        <li>proporre reclamo all’autorità di controllo (in Italia, il Garante per la protezione dei dati personali).</li>
      </ul>

      <h2>Come richiedere la cancellazione dell’account</h2>
      <p>
        Per cancellare il tuo account e i dati associati è sufficiente inviare una richiesta
        all’indirizzo <a href={`mailto:${EMAIL}`}>{EMAIL}</a> dall’email con cui ti sei registrato.
        Provvederemo alla cancellazione nel più breve tempo possibile.
      </p>

      <h2>Cookie e archiviazione locale</h2>
      <p>
        Il Servizio utilizza esclusivamente archiviazione tecnica necessaria al funzionamento (ad
        esempio per mantenere attiva la sessione di accesso). Non utilizziamo cookie di profilazione
        o strumenti di tracciamento pubblicitario.
      </p>

      <h2>Modifiche a questa informativa</h2>
      <p>
        Potremo aggiornare questa informativa nel tempo. La versione aggiornata sarà sempre
        disponibile in questa pagina, con la relativa data di ultimo aggiornamento.
      </p>

      <p className="disclaimer">
        Per qualsiasi domanda su questa informativa scrivi a{' '}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>
    </PaginaLegale>
  )
}

export function Termini({ onIndietro }) {
  return (
    <PaginaLegale titolo="Termini di Servizio" onIndietro={onIndietro}>
      <p>
        I presenti Termini di Servizio regolano l’utilizzo del Calcolatore Forfettario (di seguito
        «il Servizio»). Utilizzando il Servizio accetti questi termini.
      </p>

      <h2>Descrizione del Servizio</h2>
      <p>
        Il Servizio è uno strumento online che calcola imposta sostitutiva, contributi INPS e netto
        del regime forfettario. Il calcolatore di base è <strong>gratuito</strong>. È disponibile un
        piano <strong>Pro</strong> in abbonamento che sblocca funzioni aggiuntive: salvataggio delle
        simulazioni, confronto tra scenari, proiezione annuale mese per mese ed esportazione in PDF.
      </p>

      <h2>Account</h2>
      <p>
        Per usare le funzioni riservate è necessario registrare un account con un indirizzo email
        valido. Sei responsabile della riservatezza delle tue credenziali e delle attività svolte
        tramite il tuo account.
      </p>

      <h2>Piano Pro, prezzi e rinnovo</h2>
      <ul>
        <li>Piano <strong>mensile</strong>: <strong>6&nbsp;€ al mese</strong>.</li>
        <li>Piano <strong>annuale</strong>: <strong>49&nbsp;€ all’anno</strong>.</li>
      </ul>
      <p>
        L’abbonamento si <strong>rinnova automaticamente</strong> alla scadenza (mensile o annuale)
        al prezzo allora vigente, fino a quando non viene disdetto. I prezzi sono comprensivi delle
        imposte applicabili, gestite dal merchant of record (vedi sotto).
      </p>

      <h2>Pagamenti e fatturazione — Merchant of Record</h2>
      <p>
        I pagamenti e la fatturazione sono gestiti da <strong>Lemon Squeezy</strong>, che agisce in
        qualità di <strong>merchant of record</strong> (rivenditore ufficiale). Questo significa che
        è <strong>Lemon Squeezy a vendere l’abbonamento, a emettere la fattura e a gestire l’IVA</strong>
        {' '}per nostro conto: il rapporto commerciale relativo all’acquisto e al pagamento è quindi
        con Lemon Squeezy. Le fatture dei tuoi pagamenti sono disponibili tramite il portale cliente
        di Lemon Squeezy.
      </p>

      <h2>Come disdire l’abbonamento</h2>
      <p>
        Puoi disdire l’abbonamento <strong>in autonomia e in qualsiasi momento</strong> dal portale
        cliente di Lemon Squeezy, raggiungibile tramite il link «Gestisci abbonamento» presente nella
        tua area utente. Dallo stesso portale puoi anche aggiornare il metodo di pagamento e scaricare
        le fatture. In caso di disdetta, il piano Pro resta attivo fino al termine del periodo già
        pagato; non sono previsti rinnovi successivi.
      </p>

      <h2>Diritto di recesso e rimborsi</h2>
      <p>
        Trattandosi di un servizio digitale fruibile immediatamente, l’esecuzione ha inizio con il
        tuo consenso al momento dell’acquisto. Eventuali richieste di recesso o rimborso sono gestite
        secondo la policy di <strong>Lemon Squeezy</strong>, in qualità di merchant of record. Per
        assistenza puoi comunque scrivere a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>

      <h2>Natura indicativa dei calcoli — nessuna consulenza fiscale</h2>
      <p className="disclaimer">
        I risultati forniti dal Servizio sono <strong>stime indicative</strong> basate sui parametri
        di calcolo del regime forfettario e sui dati inseriti dall’utente. <strong>Non
        costituiscono consulenza fiscale, contabile o legale</strong> e non sostituiscono il parere
        di un commercialista o professionista abilitato. Gli importi effettivamente dovuti dipendono
        dalla tua posizione individuale e dalla normativa vigente. Non ci assumiamo responsabilità
        per decisioni prese sulla base dei risultati del Servizio.
      </p>

      <h2>Limitazione di responsabilità</h2>
      <p>
        Il Servizio è fornito «così com’è». Nei limiti consentiti dalla legge, non rispondiamo di
        danni derivanti dall’uso o dall’impossibilità di utilizzo del Servizio, né dell’eventuale
        indisponibilità temporanea dello stesso.
      </p>

      <h2>Modifiche ai termini e ai prezzi</h2>
      <p>
        Potremo aggiornare questi Termini e i prezzi del piano Pro. Le modifiche ai prezzi non
        incidono sui periodi già pagati e saranno comunicate prima del rinnovo. La versione aggiornata
        dei Termini è sempre disponibile in questa pagina.
      </p>

      <h2>Legge applicabile</h2>
      <p>
        I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia si applica
        la normativa a tutela del consumatore ove prevista.
      </p>

      <p className="disclaimer">
        Per qualsiasi domanda sui Termini scrivi a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>
    </PaginaLegale>
  )
}
