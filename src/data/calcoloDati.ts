import { caricaGriglia } from "./menu";
import { listRicette, listTutteRicettaIngredienti } from "./ricette";
import { listIngredienti } from "./ingredienti";
import { listCategorie } from "./categorie";
import { listAcquistiVari } from "./acquistiVari";
import { listMagazzino } from "./magazzino";
import { listNoteListaSpesa } from "./listaSpesaNote";
import { etichettaGruppoPortate, raggruppaSlot } from "../lib/portate";
import { CampoCoefficienti, GiornoCalc, PastoCalc, RicetteMap, ServizioCalc } from "../lib/calcolo";
import { CategoriaMerceologica, Ingrediente, PastoTipo, ServizioSlot, SlotRicetta } from "../types/domain";

export interface DatiCalcolo {
  giorni: GiornoCalc[];
  pasti: PastoCalc[];
  servizi: ServizioCalc[];
  ricette: RicetteMap;
  coefficienti: CampoCoefficienti;
  serate: { ingredienteId: number; quantita: number; giornoId: number; note: string | null }[];
  acquistiVari: { ingredienteId: number; quantita: number; note: string | null }[];
  magazzino: Map<number, number>;
  noteListaSpesa: Map<number, string>;
  ingredienti: Map<number, Ingrediente>;
  categorie: CategoriaMerceologica[];
  etichettePortate: Map<string, string>;
}

function ricetteAssegnateServizio(
  slotsServizio: ServizioSlot[],
  slotRicetteServizio: SlotRicetta[],
  pastoTipo: PastoTipo,
  servizioId: number,
  etichettePortate: Map<string, string>
): number[] {
  const gruppi = raggruppaSlot(slotsServizio, slotRicetteServizio, pastoTipo);
  const viste = new Set<number>();
  const ordine: number[] = [];
  for (const g of gruppi) {
    const etichetta = etichettaGruppoPortate(g.portate);
    for (const ricettaId of g.ricetteIds) {
      etichettePortate.set(`${servizioId}-${ricettaId}`, etichetta);
      if (!viste.has(ricettaId)) {
        viste.add(ricettaId);
        ordine.push(ricettaId);
      }
    }
  }
  return ordine;
}

export async function caricaDatiCalcolo(campoId: number, coefficienti: CampoCoefficienti): Promise<DatiCalcolo> {
  const [griglia, ricetteList, ricettaIngredienti, ingredientiList, categorie, acquistiVariRows, magazzinoRows, noteRows] =
    await Promise.all([
      caricaGriglia(campoId),
      listRicette(),
      listTutteRicettaIngredienti(),
      listIngredienti(),
      listCategorie(),
      listAcquistiVari(campoId),
      listMagazzino(),
      listNoteListaSpesa(campoId),
    ]);

  const ricetteMap: RicetteMap = new Map();
  for (const r of ricetteList) {
    ricetteMap.set(r.id, { nome: r.nome, dosiPersone: r.dosi_persone, ingredienti: [] });
  }
  for (const ri of ricettaIngredienti) {
    const r = ricetteMap.get(ri.ricetta_id);
    if (r) r.ingredienti.push({ ingredienteId: ri.ingrediente_id, quantitaPer5: ri.quantita_per_5 });
  }

  const pastiCalc: PastoCalc[] = griglia.pasti.map((p) => ({ id: p.id, giornoId: p.giorno_id, tipo: p.tipo }));
  const pastoTipoById = new Map(pastiCalc.map((p) => [p.id, p.tipo]));
  const etichettePortate = new Map<string, string>();

  const servizi: ServizioCalc[] = griglia.servizi.map((s) => {
    const slotsServizio = griglia.slots.filter((sl) => sl.servizio_id === s.id);
    const slotIdsServizio = new Set(slotsServizio.map((sl) => sl.id));
    const slotRicetteServizio = griglia.slotRicette.filter((sr) => slotIdsServizio.has(sr.servizio_slot_id));
    const tipo = pastoTipoById.get(s.pasto_id) ?? "Pranzo";
    return {
      id: s.id,
      pastoId: s.pasto_id,
      partecipaLc: !!s.partecipa_lc,
      partecipaSg: !!s.partecipa_sg,
      partecipaCambusa: !!s.partecipa_cambusa,
      nota: s.nota,
      ricetteAssegnate: ricetteAssegnateServizio(slotsServizio, slotRicetteServizio, tipo, s.id, etichettePortate),
    };
  });

  const giorni: GiornoCalc[] = griglia.giorni.map((g) => ({
    id: g.id,
    data: g.data,
    coeffGiornaliero: g.coeff_giornaliero,
    nLc: g.n_lc,
    nSg: g.n_sg,
    nCambusa: g.n_cambusa,
  }));

  const ingredientiMap = new Map(ingredientiList.map((i) => [i.id, i]));
  const magazzinoMap = new Map(magazzinoRows.map((m) => [m.ingrediente_id, m.quantita]));
  const noteMap = new Map(noteRows.filter((n) => n.nota).map((n) => [n.ingrediente_id, n.nota as string]));

  return {
    giorni,
    pasti: pastiCalc,
    servizi,
    ricette: ricetteMap,
    coefficienti,
    serate: griglia.serate.map((s) => ({
      ingredienteId: s.ingrediente_id,
      quantita: s.quantita,
      giornoId: s.giorno_id,
      note: s.note,
    })),
    acquistiVari: acquistiVariRows.map((a) => ({ ingredienteId: a.ingrediente_id, quantita: a.quantita, note: a.note })),
    magazzino: magazzinoMap,
    noteListaSpesa: noteMap,
    ingredienti: ingredientiMap,
    categorie,
    etichettePortate,
  };
}
