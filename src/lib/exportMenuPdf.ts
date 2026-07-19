import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { caricaGriglia } from "../data/menu";
import { listRicette } from "../data/ricette";
import { raggruppaSlot } from "./portate";
import { formattaData, giornoSettimana } from "./date";
import { salvaFileBinario } from "./fileExport";
import { Campo, Giorno, PastoTipo, Portata, Servizio } from "../types/domain";

const vfsFonts = pdfFonts as unknown as { pdfMake?: { vfs: unknown }; default?: unknown };
(pdfMake as unknown as { vfs: unknown }).vfs = vfsFonts.pdfMake?.vfs ?? vfsFonts.default ?? pdfFonts;

const COLORE_SG = "#BDD7EE";
const COLORE_LC = "#F4B8B8";
const COLORE_TESTATA = "#F2F2F2";
// Note "day-wide" già rappresentate nella fascia attività: non vanno ripetute nella cella del pasto.
const NOTE_SOPPRESSE = new Set(["L/C a casa", "Tutti a casa"]);

const PASTO_PORTATE: Record<PastoTipo, Portata[]> = {
  Colazione: ["Colazione_Bere", "Colazione_Mangiare"],
  Pranzo: ["Primo", "Secondo", "Contorno", "Frutta_Dolce"],
  Merenda: ["Merenda"],
  Cena: ["Primo", "Secondo", "Contorno", "Frutta_Dolce"],
};
const ETICHETTA_RIGA: Record<Portata, string> = {
  Primo: "Primo",
  Secondo: "Secondo",
  Contorno: "Contorno",
  Frutta_Dolce: "Frutta/Dolce",
  Colazione_Bere: "Bere",
  Colazione_Mangiare: "Mangiare",
  Merenda: "Merenda",
};
const PASTI_TIPI: PastoTipo[] = ["Colazione", "Pranzo", "Merenda", "Cena"];

function nomeVisualizzato(nome: string): string {
  return nome.startsWith("Frutta - ") ? nome.slice("Frutta - ".length) : nome;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cella = any;

interface GruppoContenuto {
  rowSpan: number;
  testo: string | null;
}

function coloreGruppoAttivo(s: Servizio): string | undefined {
  const attivi = [s.partecipa_lc, s.partecipa_sg, s.partecipa_cambusa].filter(Boolean).length;
  if (attivi !== 1) return undefined;
  if (s.partecipa_sg) return COLORE_SG;
  if (s.partecipa_lc) return COLORE_LC;
  return undefined;
}

function coloreGruppoEscluso(s: Servizio): string | undefined {
  if (!s.partecipa_sg) return COLORE_SG;
  if (!s.partecipa_lc) return COLORE_LC;
  return undefined;
}

export async function esportaMenuPdf(campo: Campo): Promise<boolean> {
  const griglia = await caricaGriglia(campo.id);
  const ricette = await listRicette();
  const nomeRicetta = new Map(ricette.map((r) => [r.id, r.nome]));

  const giorniOrdinati = [...griglia.giorni].sort((a, b) => a.data.localeCompare(b.data));

  function contenutoServizio(servizio: Servizio, tipo: PastoTipo): GruppoContenuto[] {
    const slots = griglia.slots.filter((s) => s.servizio_id === servizio.id);
    const slotIds = new Set(slots.map((s) => s.id));
    const slotRicette = griglia.slotRicette.filter((sr) => slotIds.has(sr.servizio_slot_id));
    const gruppi = raggruppaSlot(slots, slotRicette, tipo);
    return gruppi.map((g) => ({
      rowSpan: g.portate.length,
      testo:
        g.ricetteIds.length > 0
          ? g.ricetteIds.map((id) => nomeVisualizzato(nomeRicetta.get(id) ?? "?")).join(" + ")
          : null,
    }));
  }

  type Blocco =
    | { modo: "vuoto" }
    | { modo: "notaSola"; testo: string }
    | { modo: "distribuito"; gruppi: GruppoContenuto[] }
    | { modo: "notaEMenu"; nota: string; colore: string | undefined; gruppi: GruppoContenuto[] }
    | {
        modo: "diviso";
        lati: { nota: string | null; colore: string | undefined; gruppi: GruppoContenuto[] }[];
      };

  function classificaBlocco(giorno: Giorno, tipo: PastoTipo): Blocco {
    const pasto = griglia.pasti.find((p) => p.giorno_id === giorno.id && p.tipo === tipo);
    if (!pasto) return { modo: "vuoto" };
    const servizi = griglia.servizi.filter((s) => s.pasto_id === pasto.id).sort((a, b) => a.ordine - b.ordine);
    if (servizi.length === 0) return { modo: "vuoto" };

    if (servizi.length > 1) {
      const lati = servizi.map((s) => ({
        nota: s.nota,
        colore: coloreGruppoAttivo(s),
        gruppi: contenutoServizio(s, tipo),
      }));
      return { modo: "diviso", lati };
    }

    const s = servizi[0];
    const gruppi = contenutoServizio(s, tipo);
    const haRicette = gruppi.some((g) => g.testo !== null);
    const notaVisibile = s.nota && !NOTE_SOPPRESSE.has(s.nota) ? s.nota : null;

    if (!haRicette && !notaVisibile) return { modo: "vuoto" };
    if (!haRicette && notaVisibile) return { modo: "notaSola", testo: notaVisibile };
    if (haRicette && !notaVisibile) return { modo: "distribuito", gruppi };
    return { modo: "notaEMenu", nota: notaVisibile as string, colore: coloreGruppoEscluso(s), gruppi };
  }

  function contenutoLatoDiviso(lato: { nota: string | null; colore: string | undefined; gruppi: GruppoContenuto[] }) {
    const righe: Cella[] = [];
    if (lato.nota) righe.push({ text: lato.nota, bold: true, fontSize: 9, margin: [0, 0, 0, 3] });
    for (const g of lato.gruppi) {
      if (g.testo) righe.push({ text: g.testo, fontSize: 9 });
    }
    if (righe.length === 0) righe.push({ text: "—", fontSize: 9, color: "#999999" });
    return { stack: righe, fillColor: lato.colore };
  }

  function grandeX(): Cella {
    return {
      stack: [
        {
          canvas: [
            { type: "line", x1: 6, y1: 6, x2: 110, y2: 70, lineWidth: 1.2, lineColor: "#bbbbbb" },
            { type: "line", x1: 110, y1: 6, x2: 6, y2: 70, lineWidth: 1.2, lineColor: "#bbbbbb" },
          ],
        },
      ],
    };
  }

  // Costruisce le N righe (una per portata) per un pasto, per un singolo giorno.
  function celleBloccoGiorno(blocco: Blocco, numeroRighe: number): Cella[] {
    const celle: Cella[] = new Array(numeroRighe).fill(null);

    if (blocco.modo === "vuoto") {
      celle[0] = { rowSpan: numeroRighe, ...grandeX() };
    } else if (blocco.modo === "notaSola") {
      celle[0] = {
        rowSpan: numeroRighe,
        stack: [{ text: blocco.testo, italics: true, fontSize: 11, alignment: "center" }],
        margin: [0, numeroRighe * 6, 0, 0],
      };
    } else if (blocco.modo === "notaEMenu") {
      const righe: Cella[] = [{ text: blocco.nota, bold: true, fontSize: 10, margin: [0, 0, 0, 4] }];
      for (const g of blocco.gruppi) {
        if (g.testo) righe.push({ text: g.testo, fontSize: 10 });
      }
      celle[0] = { rowSpan: numeroRighe, stack: righe, fillColor: blocco.colore };
    } else if (blocco.modo === "diviso") {
      celle[0] = {
        rowSpan: numeroRighe,
        stack: [
          {
            table: {
              widths: ["*", "*"],
              body: [blocco.lati.map((lato) => contenutoLatoDiviso(lato))],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: (i: number) => (i === 1 ? 0.75 : 0),
              vLineColor: () => "#999999",
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          },
        ],
      };
    } else {
      // distribuito: ogni gruppo occupa `rowSpan` righe consecutive
      let indice = 0;
      for (const g of blocco.gruppi) {
        celle[indice] = { rowSpan: g.rowSpan, text: g.testo ?? "", fontSize: 10 };
        indice += g.rowSpan;
      }
    }

    for (let i = 1; i < numeroRighe; i++) {
      if (celle[i] === null) celle[i] = {};
    }
    return celle;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any[][] = [];

  // --- Fascia di testata: titolo (rowSpan 5, colSpan 2) + attività + giorno/data/presenze ---
  body.push([
    { text: `MENÙ\n${campo.nome.toUpperCase()}`, bold: true, fontSize: 20, rowSpan: 5, colSpan: 2, alignment: "left" },
    {},
    ...giorniOrdinati.map((g) => ({ text: g.note_sg ?? "", fontSize: 9, fillColor: COLORE_SG })),
  ]);
  body.push([
    {},
    {},
    ...giorniOrdinati.map((g) => ({ text: g.note_lc ?? "", fontSize: 9, fillColor: COLORE_LC })),
  ]);
  body.push([
    {},
    {},
    ...giorniOrdinati.map((g) => ({ text: giornoSettimana(g.data), bold: true, fontSize: 10, fillColor: COLORE_TESTATA })),
  ]);
  body.push([
    {},
    {},
    ...giorniOrdinati.map((g) => ({ text: formattaData(g.data), bold: true, fontSize: 10, fillColor: COLORE_TESTATA })),
  ]);
  body.push([
    {},
    {},
    ...giorniOrdinati.map((g) => ({
      text: `${g.n_lc + g.n_sg + g.n_cambusa} pax`,
      fontSize: 9,
      fillColor: COLORE_TESTATA,
    })),
  ]);

  // --- Blocchi pasto ---
  for (const tipo of PASTI_TIPI) {
    const portate = PASTO_PORTATE[tipo];
    const numeroRighe = portate.length;

    const celleGiorniPerRiga: Cella[][] = giorniOrdinati.map((g) => {
      const blocco = classificaBlocco(g, tipo);
      return celleBloccoGiorno(blocco, numeroRighe);
    });

    for (let riga = 0; riga < numeroRighe; riga++) {
      const rigaTabella: Cella[] = [];
      if (tipo === "Merenda") {
        rigaTabella.push({ text: tipo, bold: true, fontSize: 11, colSpan: 2 }, {});
      } else {
        if (riga === 0) rigaTabella.push({ text: tipo, bold: true, fontSize: 11, rowSpan: numeroRighe });
        else rigaTabella.push({});
        rigaTabella.push({ text: ETICHETTA_RIGA[portate[riga]], fontSize: 9, italics: true });
      }
      for (const celleGiorno of celleGiorniPerRiga) {
        rigaTabella.push(celleGiorno[riga]);
      }
      body.push(rigaTabella);
    }
  }

  const docDefinition = {
    pageSize: "A3",
    pageOrientation: "landscape",
    pageMargins: [18, 18, 18, 18],
    content: [
      {
        table: {
          headerRows: 0,
          widths: [42, 55, ...giorniOrdinati.map(() => "*")],
          body,
        },
        layout: {
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          hLineColor: () => "#333333",
          vLineColor: () => "#333333",
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ],
    defaultStyle: { fontSize: 9 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const pdfDoc = pdfMake.createPdf(docDefinition);
  const base64 = await pdfDoc.getBase64();
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

  return salvaFileBinario(`Menu_${campo.nome.replace(/\s+/g, "")}.pdf`, "pdf", "PDF", bytes);
}
