import { PASTO_SLOTS, PastoTipo, Portata, ServizioSlot, SlotRicetta } from "../types/domain";

export interface GruppoSlot {
  portate: Portata[];
  servizioSlotIds: number[];
  ricetteIds: number[];
}

export function raggruppaSlot(slots: ServizioSlot[], slotRicette: SlotRicetta[], pastoTipo: PastoTipo): GruppoSlot[] {
  const ordine = PASTO_SLOTS[pastoTipo];
  const bySlot = new Map(slots.map((s) => [s.slot, s]));
  const ricetteBySlotId = new Map<number, number[]>();
  for (const sr of slotRicette) {
    const lista = ricetteBySlotId.get(sr.servizio_slot_id) ?? [];
    lista.push(sr.ricetta_id);
    ricetteBySlotId.set(sr.servizio_slot_id, lista);
  }

  const gruppi: GruppoSlot[] = [];
  for (const portata of ordine) {
    const row = bySlot.get(portata);
    if (!row) continue;
    const ricette = (ricetteBySlotId.get(row.id) ?? []).slice().sort((a, b) => a - b);
    const ultimo = gruppi[gruppi.length - 1];
    const stessaRicettaUnica =
      !!ultimo && ricette.length === 1 && ultimo.ricetteIds.length === 1 && ultimo.ricetteIds[0] === ricette[0];
    if (ultimo && stessaRicettaUnica) {
      ultimo.portate.push(portata);
      ultimo.servizioSlotIds.push(row.id);
    } else {
      gruppi.push({ portate: [portata], servizioSlotIds: [row.id], ricetteIds: ricette });
    }
  }
  return gruppi;
}

export const ETICHETTE_PORTATA: Record<Portata, string> = {
  Primo: "Primo",
  Secondo: "Secondo",
  Contorno: "Contorno",
  Frutta_Dolce: "Frutta/Dolce",
  Colazione_Bere: "Bere",
  Colazione_Mangiare: "Mangiare",
  Merenda: "Merenda",
};

export function etichettaGruppoPortate(portate: Portata[]): string {
  return portate.map((p) => ETICHETTE_PORTATA[p]).join(" + ");
}
