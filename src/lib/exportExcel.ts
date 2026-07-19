import ExcelJS from "exceljs";
import { salvaFileBinario } from "./fileExport";

function arrotonda3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export interface RigaGrammaturaExport {
  giorno: string;
  pasto: string;
  portata: string;
  piatto: string;
  categoria: string;
  ingrediente: string;
  um: string;
  quantita: number;
}

const INTESTAZIONE_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF1EC" } };
const ALLINEA_DESTRA: Partial<ExcelJS.Alignment> = { horizontal: "right" };

export async function esportaGrammatureExcel(righe: RigaGrammaturaExport[], nomeFile: string): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Grammature");
  sheet.columns = [
    { header: "Giorno", key: "giorno", width: 18 },
    { header: "Pasto", key: "pasto", width: 20 },
    { header: "Portata", key: "portata", width: 18 },
    { header: "Piatto", key: "piatto", width: 26 },
    { header: "Categoria", key: "categoria", width: 24 },
    { header: "Ingrediente", key: "ingrediente", width: 26 },
    { header: "U.M.", key: "um", width: 8 },
    { header: "Quantità", key: "quantita", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = INTESTAZIONE_FILL;

  for (const r of righe) {
    const row = sheet.addRow({ ...r, quantita: arrotonda3(r.quantita) });
    const cella = row.getCell("quantita");
    cella.numFmt = "0.000";
    cella.alignment = ALLINEA_DESTRA;
  }
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return salvaFileBinario(nomeFile, "xlsx", "Excel", new Uint8Array(buffer));
}

export interface RigaListaSpesaExport {
  categoria: string;
  ingrediente: string;
  um: string;
  totale: number;
  magazzino: number;
  daComprare: number;
  note: string;
}

export async function esportaListaSpesaExcel(righe: RigaListaSpesaExport[], nomeFile: string): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lista spesa");
  sheet.columns = [
    { key: "categoria", width: 24 },
    { key: "ingrediente", width: 28 },
    { key: "um", width: 8 },
    { key: "totale", width: 12 },
    { key: "magazzino", width: 12 },
    { key: "daComprare", width: 14 },
    { key: "note", width: 32 },
  ];

  let categoriaCorrente = "";
  for (const r of righe) {
    if (r.categoria !== categoriaCorrente) {
      categoriaCorrente = r.categoria;
      const rigaTitolo = sheet.addRow([categoriaCorrente]);
      rigaTitolo.font = { bold: true, size: 12 };
      sheet.mergeCells(rigaTitolo.number, 1, rigaTitolo.number, 7);

      const rigaHeader = sheet.addRow([
        "Categoria",
        "Ingrediente",
        "U.M.",
        "Totale",
        "Magazzino",
        "Da comprare",
        "Note",
      ]);
      rigaHeader.font = { bold: true };
      rigaHeader.fill = INTESTAZIONE_FILL;
    }
    const row = sheet.addRow([
      r.categoria,
      r.ingrediente,
      r.um,
      arrotonda3(r.totale),
      arrotonda3(r.magazzino),
      arrotonda3(r.daComprare),
      r.note,
    ]);
    for (const indice of [4, 5, 6]) {
      const cella = row.getCell(indice);
      cella.numFmt = "0.000";
      cella.alignment = ALLINEA_DESTRA;
    }
  }
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return salvaFileBinario(nomeFile, "xlsx", "Excel", new Uint8Array(buffer));
}
