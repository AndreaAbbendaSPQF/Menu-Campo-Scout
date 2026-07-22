import { PastoTipo } from "../types/domain";

export interface CampoCoefficienti {
  coeffLc: number;
  coeffSg: number;
  coeffCambusa: number;
}

export interface GiornoCalc {
  id: number;
  data: string;
  coeffGiornaliero: number;
  nLc: number;
  nSg: number;
  nCambusa: number;
}

export interface PastoCalc {
  id: number;
  giornoId: number;
  tipo: PastoTipo;
}

export interface ServizioCalc {
  id: number;
  pastoId: number;
  partecipaLc: boolean;
  partecipaSg: boolean;
  partecipaCambusa: boolean;
  nota: string | null;
  ricetteAssegnate: number[];
}

export interface RicettaIngredienteCalc {
  ingredienteId: number;
  quantitaPer5: number;
}

export interface RicettaCalc {
  nome: string;
  dosiPersone: number;
  ingredienti: RicettaIngredienteCalc[];
}

export type RicetteMap = Map<number, RicettaCalc>;

export interface RigaGrammatura {
  giornoId: number;
  data: string;
  pastoId: number;
  pastoTipo: PastoTipo;
  servizioId: number;
  servizioNota: string | null;
  ricettaId: number;
  ricettaNome: string;
  ingredienteId: number;
  quantita: number;
}

export function calcolaPersoneEquivalenti(
  giorno: Pick<GiornoCalc, "nLc" | "nSg" | "nCambusa">,
  coefficienti: CampoCoefficienti,
  partecipazione: Pick<ServizioCalc, "partecipaLc" | "partecipaSg" | "partecipaCambusa">
): number {
  return (
    (partecipazione.partecipaLc ? giorno.nLc * coefficienti.coeffLc : 0) +
    (partecipazione.partecipaSg ? giorno.nSg * coefficienti.coeffSg : 0) +
    (partecipazione.partecipaCambusa ? giorno.nCambusa * coefficienti.coeffCambusa : 0)
  );
}

export function calcolaQuantitaIngrediente(
  doseBase: number,
  dosiPersone: number,
  personeEquivalenti: number,
  coeffGiornaliero: number
): number {
  return (doseBase / dosiPersone) * personeEquivalenti * coeffGiornaliero;
}

export function calcolaGrammature(
  giorni: GiornoCalc[],
  pasti: PastoCalc[],
  servizi: ServizioCalc[],
  ricette: RicetteMap,
  coefficienti: CampoCoefficienti
): RigaGrammatura[] {
  const giorniById = new Map(giorni.map((g) => [g.id, g]));
  const pastiById = new Map(pasti.map((p) => [p.id, p]));
  const righe: RigaGrammatura[] = [];

  for (const servizio of servizi) {
    const pasto = pastiById.get(servizio.pastoId);
    if (!pasto) continue;
    const giorno = giorniById.get(pasto.giornoId);
    if (!giorno) continue;

    const personeEquivalenti = calcolaPersoneEquivalenti(giorno, coefficienti, servizio);

    for (const ricettaId of servizio.ricetteAssegnate) {
      const ricetta = ricette.get(ricettaId);
      if (!ricetta) continue;
      for (const ing of ricetta.ingredienti) {
        const quantita = calcolaQuantitaIngrediente(
          ing.quantitaPer5,
          ricetta.dosiPersone,
          personeEquivalenti,
          giorno.coeffGiornaliero
        );
        righe.push({
          giornoId: giorno.id,
          data: giorno.data,
          pastoId: pasto.id,
          pastoTipo: pasto.tipo,
          servizioId: servizio.id,
          servizioNota: servizio.nota,
          ricettaId,
          ricettaNome: ricetta.nome,
          ingredienteId: ing.ingredienteId,
          quantita,
        });
      }
    }
  }

  return righe;
}

export interface RigaAssoluta {
  ingredienteId: number;
  quantita: number;
}

export function aggregaTotaliPerIngrediente(
  grammature: Pick<RigaGrammatura, "ingredienteId" | "quantita">[],
  serate: RigaAssoluta[],
  acquistiVari: RigaAssoluta[]
): Map<number, number> {
  const totali = new Map<number, number>();
  const aggiungi = (ingredienteId: number, quantita: number) => {
    totali.set(ingredienteId, (totali.get(ingredienteId) ?? 0) + quantita);
  };
  for (const r of grammature) aggiungi(r.ingredienteId, r.quantita);
  for (const s of serate) aggiungi(s.ingredienteId, s.quantita);
  for (const a of acquistiVari) aggiungi(a.ingredienteId, a.quantita);
  return totali;
}

export function calcolaDaComprare(totale: number, magazzino: number, considerareMagazzino: boolean): number {
  if (!considerareMagazzino) return totale;
  return Math.max(0, totale - magazzino);
}

export interface RigaImpiegoRicetta {
  ricettaId: number;
  ricettaNome: string;
  quantita: number;
}

export function raggruppaPerRicetta(
  grammature: Pick<RigaGrammatura, "ingredienteId" | "ricettaId" | "ricettaNome" | "quantita">[],
  ingredienteId: number
): RigaImpiegoRicetta[] {
  const totali = new Map<number, RigaImpiegoRicetta>();
  for (const r of grammature) {
    if (r.ingredienteId !== ingredienteId) continue;
    const esistente = totali.get(r.ricettaId);
    if (esistente) {
      esistente.quantita += r.quantita;
    } else {
      totali.set(r.ricettaId, { ricettaId: r.ricettaId, ricettaNome: r.ricettaNome, quantita: r.quantita });
    }
  }
  return Array.from(totali.values()).sort((a, b) => a.ricettaNome.localeCompare(b.ricettaNome, "it"));
}
