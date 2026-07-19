import { getDb, select } from "../lib/db";
import { getRicettaCompleta } from "./ricette";
import { Giorno, PASTO_SLOTS, Pasto, PastoTipo, Serata, Servizio, ServizioSlot, SlotRicetta } from "../types/domain";

export interface GrigliaData {
  giorni: Giorno[];
  pasti: Pasto[];
  servizi: Servizio[];
  slots: ServizioSlot[];
  slotRicette: SlotRicetta[];
  serate: Serata[];
}

export async function caricaGriglia(campoId: number): Promise<GrigliaData> {
  const [giorni, pasti, servizi, slots, slotRicette, serate] = await Promise.all([
    select<Giorno>("SELECT * FROM giorni WHERE campo_id = ? ORDER BY data", [campoId]),
    select<Pasto>(
      `SELECT p.* FROM pasti p JOIN giorni g ON g.id = p.giorno_id WHERE g.campo_id = ?`,
      [campoId]
    ),
    select<Servizio>(
      `SELECT s.* FROM servizi s JOIN pasti p ON p.id = s.pasto_id JOIN giorni g ON g.id = p.giorno_id
       WHERE g.campo_id = ? ORDER BY s.ordine`,
      [campoId]
    ),
    select<ServizioSlot>(
      `SELECT sl.* FROM servizio_slot sl
       JOIN servizi s ON s.id = sl.servizio_id
       JOIN pasti p ON p.id = s.pasto_id
       JOIN giorni g ON g.id = p.giorno_id
       WHERE g.campo_id = ?`,
      [campoId]
    ),
    select<SlotRicetta>(
      `SELECT sr.* FROM servizio_slot_ricette sr
       JOIN servizio_slot sl ON sl.id = sr.servizio_slot_id
       JOIN servizi s ON s.id = sl.servizio_id
       JOIN pasti p ON p.id = s.pasto_id
       JOIN giorni g ON g.id = p.giorno_id
       WHERE g.campo_id = ?`,
      [campoId]
    ),
    select<Serata>(
      `SELECT se.* FROM serate se JOIN giorni g ON g.id = se.giorno_id WHERE g.campo_id = ?`,
      [campoId]
    ),
  ]);
  return { giorni, pasti, servizi, slots, slotRicette, serate };
}

export async function aggiungiRicettaSlot(servizioId: number, pastoTipo: PastoTipo, ricettaId: number): Promise<void> {
  const ricetta = await getRicettaCompleta(ricettaId);
  if (!ricetta) throw new Error("Ricetta non trovata");
  const slotDisponibili = new Set(PASTO_SLOTS[pastoTipo]);
  const db = await getDb();
  const slots = await select<ServizioSlot>("SELECT * FROM servizio_slot WHERE servizio_id = ?", [servizioId]);
  for (const portata of ricetta.portate) {
    if (!slotDisponibili.has(portata)) continue;
    const slot = slots.find((s) => s.slot === portata);
    if (!slot) continue;
    await db.execute(
      "INSERT OR IGNORE INTO servizio_slot_ricette (servizio_slot_id, ricetta_id) VALUES (?, ?)",
      [slot.id, ricettaId]
    );
  }
}

export async function rimuoviRicettaSlot(servizioId: number, ricettaId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `DELETE FROM servizio_slot_ricette
     WHERE ricetta_id = ? AND servizio_slot_id IN (SELECT id FROM servizio_slot WHERE servizio_id = ?)`,
    [ricettaId, servizioId]
  );
}

export interface AggiornamentoServizio {
  partecipa_lc: boolean;
  partecipa_sg: boolean;
  partecipa_cambusa: boolean;
  nota: string | null;
}

export async function aggiornaServizio(id: number, input: AggiornamentoServizio): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE servizi SET partecipa_lc = ?, partecipa_sg = ?, partecipa_cambusa = ?, nota = ? WHERE id = ?",
    [input.partecipa_lc ? 1 : 0, input.partecipa_sg ? 1 : 0, input.partecipa_cambusa ? 1 : 0, input.nota, id]
  );
}

export async function dividiPasto(
  pastoId: number,
  pastoTipo: PastoTipo,
  spostaLc: boolean,
  spostaSg: boolean,
  spostaCambusa: boolean
): Promise<number> {
  const db = await getDb();
  const serviziEsistenti = await select<Servizio>("SELECT * FROM servizi WHERE pasto_id = ? ORDER BY ordine", [
    pastoId,
  ]);
  const principale = serviziEsistenti[0];
  const nuovoOrdine = serviziEsistenti.length;

  await db.execute("UPDATE servizi SET partecipa_lc = ?, partecipa_sg = ?, partecipa_cambusa = ? WHERE id = ?", [
    spostaLc ? 0 : principale.partecipa_lc,
    spostaSg ? 0 : principale.partecipa_sg,
    spostaCambusa ? 0 : principale.partecipa_cambusa,
    principale.id,
  ]);

  const risultato = await db.execute(
    "INSERT INTO servizi (pasto_id, partecipa_lc, partecipa_sg, partecipa_cambusa, ordine) VALUES (?, ?, ?, ?, ?)",
    [pastoId, spostaLc ? 1 : 0, spostaSg ? 1 : 0, spostaCambusa ? 1 : 0, nuovoOrdine]
  );
  const nuovoServizioId = risultato.lastInsertId ?? 0;
  for (const slot of PASTO_SLOTS[pastoTipo]) {
    await db.execute("INSERT INTO servizio_slot (servizio_id, slot) VALUES (?, ?)", [nuovoServizioId, slot]);
  }
  return nuovoServizioId;
}

export async function unisciPasto(pastoId: number): Promise<void> {
  const db = await getDb();
  const serviziEsistenti = await select<Servizio>("SELECT * FROM servizi WHERE pasto_id = ? ORDER BY ordine", [
    pastoId,
  ]);
  if (serviziEsistenti.length <= 1) return;
  const principale = serviziEsistenti[0];
  await db.execute(
    "UPDATE servizi SET partecipa_lc = 1, partecipa_sg = 1, partecipa_cambusa = 1, nota = NULL WHERE id = ?",
    [principale.id]
  );
  for (const s of serviziEsistenti.slice(1)) {
    await db.execute("DELETE FROM servizi WHERE id = ?", [s.id]);
  }
}

export async function listSerate(giornoId: number): Promise<Serata[]> {
  return select<Serata>("SELECT * FROM serate WHERE giorno_id = ? ORDER BY id", [giornoId]);
}

export async function aggiungiSerata(
  giornoId: number,
  ingredienteId: number,
  quantita: number,
  note?: string
): Promise<number> {
  const db = await getDb();
  const r = await db.execute("INSERT INTO serate (giorno_id, ingrediente_id, quantita, note) VALUES (?, ?, ?, ?)", [
    giornoId,
    ingredienteId,
    quantita,
    note?.trim() || null,
  ]);
  return r.lastInsertId ?? 0;
}

export async function aggiornaSerata(id: number, quantita: number, note: string | null): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE serate SET quantita = ?, note = ? WHERE id = ?", [quantita, note, id]);
}

export async function eliminaSerata(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM serate WHERE id = ?", [id]);
}
