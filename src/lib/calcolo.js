// Parametri fiscali e previdenziali — regime forfettario, anno 2026.
// Fonti: L. 190/2014 (coefficienti di redditività, allegato 4) e circolari INPS
// sulle aliquote di artigiani, commercianti e Gestione Separata.

export const LIMITE_RICAVI = 85000

// Coefficienti di redditività ufficiali per gruppo ATECO
export const GRUPPI_ATECO = [
  {
    id: 'alimentari',
    label: 'Industrie alimentari e delle bevande (10–11)',
    coefficiente: 0.4
  },
  {
    id: 'commercio',
    label: 'Commercio all’ingrosso e al dettaglio (45, 46.2–46.9, 47.1–47.7, 47.9)',
    coefficiente: 0.4
  },
  {
    id: 'ambulante-alimentari',
    label: 'Commercio ambulante di prodotti alimentari e bevande (47.81)',
    coefficiente: 0.4
  },
  {
    id: 'ambulante-altri',
    label: 'Commercio ambulante di altri prodotti (47.82–47.89)',
    coefficiente: 0.54
  },
  {
    id: 'costruzioni',
    label: 'Costruzioni e attività immobiliari (41–43, 68)',
    coefficiente: 0.86
  },
  {
    id: 'intermediari',
    label: 'Intermediari del commercio (46.1)',
    coefficiente: 0.62
  },
  {
    id: 'alloggio-ristorazione',
    label: 'Servizi di alloggio e ristorazione (55–56)',
    coefficiente: 0.4
  },
  {
    id: 'professionisti',
    label:
      'Attività professionali, scientifiche, tecniche, sanitarie, istruzione, servizi finanziari e assicurativi (64–66, 69–75, 85, 86–88)',
    coefficiente: 0.78
  },
  {
    id: 'altre',
    label: 'Altre attività economiche (01–09, 12–33, 35–39, 49–53, 58–63, 77–82, 84, 90–99)',
    coefficiente: 0.67
  }
]

export const CASSE = [
  {
    id: 'gestione-separata',
    label: 'Gestione Separata INPS (professionisti senza cassa)'
  },
  { id: 'artigiani', label: 'Gestione INPS Artigiani' },
  { id: 'commercianti', label: 'Gestione INPS Commercianti' }
]

// Gestione Separata: aliquota per professionisti senza altra copertura previdenziale
const ALIQUOTA_GESTIONE_SEPARATA = 0.2607

// Artigiani e commercianti: contributi fissi sul minimale + percentuale sull'eccedenza
const MINIMALE = 18555
const SCAGLIONE_SUPERIORE = 55448
const PARAMETRI_IVS = {
  artigiani: { aliquota: 0.24, aliquotaSuperiore: 0.25, maternita: 7.44 },
  commercianti: { aliquota: 0.2448, aliquotaSuperiore: 0.2548, maternita: 7.44 }
}

function contributiIvs(reddito, parametri, riduzione35) {
  const base = Math.max(reddito, MINIMALE)
  const entroScaglione = Math.min(base, SCAGLIONE_SUPERIORE)
  const oltreScaglione = Math.max(base - SCAGLIONE_SUPERIORE, 0)
  let contributi =
    entroScaglione * parametri.aliquota +
    oltreScaglione * parametri.aliquotaSuperiore +
    parametri.maternita
  if (riduzione35) contributi *= 0.65
  return contributi
}

/**
 * Calcola imposta sostitutiva, contributi INPS e netto del regime forfettario.
 * I contributi sono stimati sul reddito imponibile dell'anno e considerati
 * interamente deducibili (situazione a regime).
 */
export function calcolaForfettario({ ricavi, gruppoId, anniAttivita, cassaId, riduzione35 }) {
  const gruppo = GRUPPI_ATECO.find((g) => g.id === gruppoId) ?? GRUPPI_ATECO[0]
  const redditoImponibile = ricavi * gruppo.coefficiente

  let contributi
  if (cassaId === 'gestione-separata') {
    contributi = redditoImponibile * ALIQUOTA_GESTIONE_SEPARATA
  } else {
    contributi = contributiIvs(redditoImponibile, PARAMETRI_IVS[cassaId], riduzione35)
  }

  const imponibileFiscale = Math.max(redditoImponibile - contributi, 0)
  const aliquota = anniAttivita <= 5 ? 0.05 : 0.15
  const imposta = imponibileFiscale * aliquota

  const nettoAnnuo = ricavi - imposta - contributi
  const totaleDaVersare = imposta + contributi

  return {
    coefficiente: gruppo.coefficiente,
    redditoImponibile,
    contributi,
    imponibileFiscale,
    aliquota,
    imposta,
    totaleDaVersare,
    nettoAnnuo,
    nettoMensile: nettoAnnuo / 12,
    percentualeAccantonamento: ricavi > 0 ? totaleDaVersare / ricavi : 0,
    superaLimite: ricavi > LIMITE_RICAVI
  }
}
