// Generazione PDF lato client con jsPDF (import dinamico: la libreria viene
// scaricata solo al primo clic su «Scarica PDF», non pesa sul bundle iniziale).

const MARGINE = 18
const LARGHEZZA_PAGINA = 210
const ALTEZZA_PAGINA = 297
const DISCLAIMER = 'Calcolo indicativo, non sostituisce la consulenza di un commercialista'

const euroFmt = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
})

const percentoFmt = new Intl.NumberFormat('it-IT', {
  style: 'percent',
  maximumFractionDigits: 1
})

// I formattatori Intl usano spazi unificatori (U+00A0 / U+202F) che i font
// standard di jsPDF non sempre rendono: li normalizziamo in spazi semplici.
const pulisci = (testo) => String(testo).replace(/[  ]/g, ' ')
const euro = (n) => pulisci(euroFmt.format(n))
const percento = (n) => pulisci(percentoFmt.format(n))

function intestazione(doc, sottotitolo) {
  doc.setTextColor(30, 58, 138)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Calcolatore Forfettario', MARGINE, 22)

  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const data = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(new Date())
  doc.text(`${sottotitolo} — generato il ${pulisci(data)}`, MARGINE, 29)

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(MARGINE, 33, LARGHEZZA_PAGINA - MARGINE, 33)

  doc.setTextColor(15, 23, 42)
  return 42
}

function pieDiPagina(doc) {
  const pagine = doc.getNumberOfPages()
  for (let i = 1; i <= pagine; i += 1) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(MARGINE, ALTEZZA_PAGINA - 18, LARGHEZZA_PAGINA - MARGINE, ALTEZZA_PAGINA - 18)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text(DISCLAIMER, LARGHEZZA_PAGINA / 2, ALTEZZA_PAGINA - 12, { align: 'center' })
  }
}

function titoloSezione(doc, testo, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 58, 138)
  doc.text(testo, MARGINE, y)
  doc.setTextColor(15, 23, 42)
  return y + 7
}

// Riga "etichetta ..... valore" con valore allineato a destra
function rigaVoce(doc, etichetta, valore, y, { evidenzia = false } = {}) {
  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(evidenzia ? 21 : 15, evidenzia ? 128 : 23, evidenzia ? 61 : 42)
  const testoEtichetta = doc.splitTextToSize(etichetta, 110)
  doc.text(testoEtichetta, MARGINE, y)
  doc.setFont('helvetica', 'bold')
  doc.text(pulisci(valore), LARGHEZZA_PAGINA - MARGINE, y, { align: 'right' })
  doc.setTextColor(15, 23, 42)
  const altezza = testoEtichetta.length * 4.6 + 2.4
  doc.setDrawColor(241, 245, 249)
  doc.setLineWidth(0.2)
  doc.line(MARGINE, y + altezza - 4.2, LARGHEZZA_PAGINA - MARGINE, y + altezza - 4.2)
  return y + altezza + 2
}

function etichettaGruppo(GRUPPI_ATECO, gruppoId) {
  return GRUPPI_ATECO.find((g) => g.id === gruppoId)?.label ?? gruppoId
}

function etichettaCassa(CASSE, cassaId) {
  return CASSE.find((c) => c.id === cassaId)?.label ?? cassaId
}

function sezioneInput(doc, y, { dati, GRUPPI_ATECO, CASSE, conRicavi = true }) {
  y = titoloSezione(doc, 'Dati inseriti', y)
  if (conRicavi) {
    y = rigaVoce(doc, 'Ricavi o compensi annui', euro(dati.ricavi), y)
  }
  // Il nome del gruppo ATECO può essere molto lungo: etichetta e valore su righe proprie
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.text('Attività (gruppo ATECO)', MARGINE, y)
  y += 5
  doc.setFontSize(9.5)
  doc.setTextColor(100, 116, 139)
  const righeGruppo = doc.splitTextToSize(etichettaGruppo(GRUPPI_ATECO, dati.gruppoId), 174)
  doc.text(righeGruppo, MARGINE, y)
  doc.setTextColor(15, 23, 42)
  y += righeGruppo.length * 4.2 + 0.4
  doc.setDrawColor(241, 245, 249)
  doc.setLineWidth(0.2)
  doc.line(MARGINE, y, LARGHEZZA_PAGINA - MARGINE, y)
  y += 6.4
  y = rigaVoce(
    doc,
    'Anni di attività',
    dati.anniAttivita <= 5 ? `${dati.anniAttivita}° anno (aliquota startup 5%)` : 'Oltre 5 anni (aliquota 15%)',
    y
  )
  y = rigaVoce(doc, 'Cassa previdenziale', etichettaCassa(CASSE, dati.cassaId), y)
  if (dati.cassaId !== 'gestione-separata') {
    y = rigaVoce(doc, 'Riduzione contributiva 35%', dati.riduzione35 ? 'Sì' : 'No', y)
  }
  return y + 4
}

function sezioneRisultati(doc, y, risultato) {
  y = titoloSezione(doc, 'Risultato del calcolo', y)
  y = rigaVoce(
    doc,
    `Reddito imponibile (coefficiente ${percento(risultato.coefficiente)})`,
    euro(risultato.redditoImponibile),
    y
  )
  y = rigaVoce(doc, 'Contributi INPS', euro(risultato.contributi), y)
  y = rigaVoce(
    doc,
    `Imposta sostitutiva (aliquota ${percento(risultato.aliquota)})`,
    euro(risultato.imposta),
    y
  )
  y = rigaVoce(doc, 'Totale tasse e contributi', euro(risultato.totaleDaVersare), y)
  y = rigaVoce(doc, 'Netto annuo', euro(risultato.nettoAnnuo), y, { evidenzia: true })
  y = rigaVoce(doc, 'Netto mensile', euro(risultato.nettoMensile), y, { evidenzia: true })
  y = rigaVoce(
    doc,
    'Da accantonare su ogni fattura',
    percento(risultato.percentualeAccantonamento),
    y
  )
  return y + 4
}

/** PDF del calcolo singolo: intestazione, input, risultati, footer disclaimer. */
export async function esportaPdfCalcolo({ dati, risultato, GRUPPI_ATECO, CASSE }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = intestazione(doc, 'Simulazione regime forfettario')
  y = sezioneInput(doc, y, { dati, GRUPPI_ATECO, CASSE })
  sezioneRisultati(doc, y, risultato)
  pieDiPagina(doc)

  doc.save(`calcolo-forfettario-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * PDF della proiezione annuale: intestazione, parametri, tabella mensile con
 * accantonamento consigliato, totali stimati, footer disclaimer.
 */
export async function esportaPdfProiezione({
  anno,
  mesi,
  nomiMesi,
  dati,
  risultato,
  totaleRicavi,
  superaLimite,
  limiteRicavi,
  GRUPPI_ATECO,
  CASSE
}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = intestazione(doc, `Proiezione annuale ${anno}`)
  y = sezioneInput(doc, y, { dati, GRUPPI_ATECO, CASSE, conRicavi: false })

  // Tabella mensile: mese | ricavi | accantonamento consigliato
  y = titoloSezione(doc, `Ricavi mensili ${anno}`, y)
  const colMese = MARGINE
  const colRicavi = 118
  const colAccantona = LARGHEZZA_PAGINA - MARGINE

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Mese', colMese, y)
  doc.text('Ricavi', colRicavi, y, { align: 'right' })
  doc.text('Accantonamento consigliato', colAccantona, y, { align: 'right' })
  doc.setTextColor(15, 23, 42)
  y += 2
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(MARGINE, y, LARGHEZZA_PAGINA - MARGINE, y)
  y += 5

  doc.setFontSize(10)
  mesi.forEach((importo, i) => {
    doc.setFont('helvetica', 'normal')
    doc.text(nomiMesi[i], colMese, y)
    doc.text(euro(importo), colRicavi, y, { align: 'right' })
    doc.text(euro(importo * risultato.percentualeAccantonamento), colAccantona, y, {
      align: 'right'
    })
    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(0.2)
    doc.line(MARGINE, y + 1.8, LARGHEZZA_PAGINA - MARGINE, y + 1.8)
    y += 6
  })

  doc.setFont('helvetica', 'bold')
  doc.text('Totale', colMese, y)
  doc.text(euro(totaleRicavi), colRicavi, y, { align: 'right' })
  doc.text(euro(risultato.totaleDaVersare), colAccantona, y, { align: 'right' })
  y += 9

  if (superaLimite) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(185, 28, 28)
    const avviso = doc.splitTextToSize(
      `Attenzione: il totale supera il limite di ${euro(limiteRicavi)} previsto per restare nel regime forfettario.`,
      174
    )
    doc.text(avviso, MARGINE, y)
    doc.setTextColor(15, 23, 42)
    y += avviso.length * 4.6 + 4
  }

  y = titoloSezione(doc, 'Stima sul totale annuo', y)
  y = rigaVoce(doc, 'Totale ricavi previsti', euro(totaleRicavi), y)
  y = rigaVoce(doc, 'Imposta sostitutiva stimata', euro(risultato.imposta), y)
  y = rigaVoce(doc, 'Contributi INPS stimati', euro(risultato.contributi), y)
  rigaVoce(
    doc,
    `Totale da accantonare (${percento(risultato.percentualeAccantonamento)} dei ricavi)`,
    euro(risultato.totaleDaVersare),
    y,
    { evidenzia: true }
  )

  pieDiPagina(doc)
  doc.save(`proiezione-forfettario-${anno}.pdf`)
}
