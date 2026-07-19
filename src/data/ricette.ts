import { getDb } from "../lib/db";
import { select } from "../lib/db";
import { Portata, Ricetta, RicettaCompleta, RicettaIngrediente, RicettaPortata } from "../types/domain";

export async function listRicette(): Promise<Ricetta[]> {
  return select<Ricetta>("SELECT * FROM ricette ORDER BY nome COLLATE NOCASE");
}

export async function listTutteRicettaIngredienti(): Promise<RicettaIngrediente[]> {
  return select<RicettaIngrediente>("SELECT * FROM ricetta_ingredienti");
}

export interface RicettaConPortate extends Ricetta {
  portate: Portata[];
}

export async function listRicetteConPortate(): Promise<RicettaConPortate[]> {
  const [ricette, portate] = await Promise.all([
    listRicette(),
    select<RicettaPortata>("SELECT * FROM ricetta_portate"),
  ]);
  const portatePerRicetta = new Map<number, Portata[]>();
  for (const p of portate) {
    const lista = portatePerRicetta.get(p.ricetta_id) ?? [];
    lista.push(p.portata);
    portatePerRicetta.set(p.ricetta_id, lista);
  }
  return ricette.map((r) => ({ ...r, portate: portatePerRicetta.get(r.id) ?? [] }));
}

export async function listRicetteByPortata(portata: Portata): Promise<Ricetta[]> {
  return select<Ricetta>(
    `SELECT r.* FROM ricette r
     JOIN ricetta_portate rp ON rp.ricetta_id = r.id
     WHERE rp.portata = ?
     ORDER BY r.nome COLLATE NOCASE`,
    [portata]
  );
}

export async function getRicettaCompleta(id: number): Promise<RicettaCompleta | null> {
  const ricette = await select<Ricetta>("SELECT * FROM ricette WHERE id = ?", [id]);
  if (ricette.length === 0) return null;
  const [portate, ingredienti] = await Promise.all([
    select<RicettaPortata>("SELECT * FROM ricetta_portate WHERE ricetta_id = ?", [id]),
    select<RicettaIngrediente>("SELECT * FROM ricetta_ingredienti WHERE ricetta_id = ?", [id]),
  ]);
  return { ...ricette[0], portate: portate.map((p) => p.portata), ingredienti };
}

export interface RicettaIngredienteInput {
  ingrediente_id: number;
  quantita_per_5: number;
}

export interface NuovaRicetta {
  nome: string;
  note?: string;
  portate: Portata[];
  ingredienti: RicettaIngredienteInput[];
  dosi_persone: number;
}

export async function salvaRicetta(id: number | null, input: NuovaRicetta): Promise<number> {
  const db = await getDb();
  const piattoUnico = input.portate.length > 1 ? 1 : 0;

  let recordId: number;
  if (id === null) {
    const result = await db.execute(
      "INSERT INTO ricette (nome, note, piatto_unico, dosi_persone) VALUES (?, ?, ?, ?)",
      [input.nome.trim(), input.note?.trim() || null, piattoUnico, input.dosi_persone]
    );
    recordId = result.lastInsertId ?? 0;
  } else {
    recordId = id;
    await db.execute(
      "UPDATE ricette SET nome = ?, note = ?, piatto_unico = ?, dosi_persone = ? WHERE id = ?",
      [input.nome.trim(), input.note?.trim() || null, piattoUnico, input.dosi_persone, recordId]
    );
    await db.execute("DELETE FROM ricetta_portate WHERE ricetta_id = ?", [recordId]);
    await db.execute("DELETE FROM ricetta_ingredienti WHERE ricetta_id = ?", [recordId]);
  }

  for (const portata of input.portate) {
    await db.execute("INSERT INTO ricetta_portate (ricetta_id, portata) VALUES (?, ?)", [recordId, portata]);
  }
  for (const ing of input.ingredienti) {
    await db.execute(
      "INSERT INTO ricetta_ingredienti (ricetta_id, ingrediente_id, quantita_per_5) VALUES (?, ?, ?)",
      [recordId, ing.ingrediente_id, ing.quantita_per_5]
    );
  }

  return recordId;
}

export async function duplicaRicetta(id: number): Promise<number> {
  const completa = await getRicettaCompleta(id);
  if (!completa) throw new Error("Ricetta non trovata");
  return salvaRicetta(null, {
    nome: `${completa.nome} (copia)`,
    note: completa.note ?? undefined,
    portate: completa.portate,
    dosi_persone: completa.dosi_persone,
    ingredienti: completa.ingredienti.map((i) => ({
      ingrediente_id: i.ingrediente_id,
      quantita_per_5: i.quantita_per_5,
    })),
  });
}

export interface UsoRicetta {
  slotAssegnati: number;
}

export async function usoRicetta(id: number): Promise<UsoRicetta> {
  const rows = await select<{ n: number }>(
    "SELECT COUNT(*) as n FROM servizio_slot_ricette WHERE ricetta_id = ?",
    [id]
  );
  return { slotAssegnati: rows[0].n };
}

export async function eliminaRicetta(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM servizio_slot_ricette WHERE ricetta_id = ?", [id]);
  await db.execute("DELETE FROM ricette WHERE id = ?", [id]);
}
