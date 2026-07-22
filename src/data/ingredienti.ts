import { execute, select } from "../lib/db";
import { normalizeForCompare } from "../lib/text";
import { fattoreConversione, unitaCompatibili } from "../lib/unitaMisura";
import { Ingrediente, UnitaMisura } from "../types/domain";

export async function listIngredienti(): Promise<Ingrediente[]> {
  return select<Ingrediente>("SELECT * FROM ingredienti ORDER BY nome COLLATE NOCASE");
}

export async function findIngredienteByName(nome: string): Promise<Ingrediente | null> {
  const rows = await select<Ingrediente>(
    "SELECT * FROM ingredienti WHERE nome_normalizzato = ?",
    [normalizeForCompare(nome)]
  );
  return rows[0] ?? null;
}

export interface NuovoIngrediente {
  nome: string;
  unita_misura: UnitaMisura;
  categoria_id: number;
  gelo: boolean;
  note?: string;
}

export class IngredienteDuplicatoError extends Error {
  constructor(nome: string) {
    super(`Esiste già un ingrediente chiamato "${nome}"`);
  }
}

export async function creaIngrediente(input: NuovoIngrediente): Promise<number> {
  const esistente = await findIngredienteByName(input.nome);
  if (esistente) throw new IngredienteDuplicatoError(esistente.nome);

  const result = await execute(
    `INSERT INTO ingredienti (nome, nome_normalizzato, unita_misura, categoria_id, gelo, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.nome.trim(),
      normalizeForCompare(input.nome),
      input.unita_misura,
      input.categoria_id,
      input.gelo ? 1 : 0,
      input.note?.trim() || null,
    ]
  );
  return result.lastInsertId;
}

export class UnitaMisuraIncompatibileError extends Error {
  constructor(numRicette: number) {
    super(
      `Questo ingrediente è già usato in ${numRicette} ricetta/e con un'unità di misura non compatibile con quella selezionata. Le quantità non possono essere riscalate automaticamente.`
    );
  }
}

export async function aggiornaIngrediente(id: number, input: NuovoIngrediente): Promise<void> {
  const esistente = await findIngredienteByName(input.nome);
  if (esistente && esistente.id !== id) throw new IngredienteDuplicatoError(esistente.nome);

  const attuale = await select<Ingrediente>("SELECT * FROM ingredienti WHERE id = ?", [id]);
  const unitaAttuale = attuale[0]?.unita_misura;
  const cambioUnita = unitaAttuale && unitaAttuale !== input.unita_misura;

  let fattore: number | null = null;
  if (cambioUnita) {
    const usiRicette = await select<{ n: number }>(
      "SELECT COUNT(*) as n FROM ricetta_ingredienti WHERE ingrediente_id = ?",
      [id]
    );
    if (usiRicette[0].n > 0) {
      if (!unitaCompatibili(unitaAttuale, input.unita_misura)) {
        throw new UnitaMisuraIncompatibileError(usiRicette[0].n);
      }
      fattore = fattoreConversione(unitaAttuale, input.unita_misura);
    }
  }

  await execute(
    `UPDATE ingredienti
     SET nome = ?, nome_normalizzato = ?, unita_misura = ?, categoria_id = ?, gelo = ?, note = ?
     WHERE id = ?`,
    [
      input.nome.trim(),
      normalizeForCompare(input.nome),
      input.unita_misura,
      input.categoria_id,
      input.gelo ? 1 : 0,
      input.note?.trim() || null,
      id,
    ]
  );

  if (fattore !== null && fattore !== 1) {
    await execute("UPDATE ricetta_ingredienti SET quantita_per_5 = quantita_per_5 * ? WHERE ingrediente_id = ?", [
      fattore,
      id,
    ]);
  }
}

export interface UsoIngrediente {
  ricette: number;
  magazzino: number;
  serate: number;
  acquisti: number;
}

export async function usoIngrediente(id: number): Promise<UsoIngrediente> {
  const [ricette, magazzino, serate, acquisti] = await Promise.all([
    select<{ n: number }>("SELECT COUNT(*) as n FROM ricetta_ingredienti WHERE ingrediente_id = ?", [id]),
    select<{ n: number }>("SELECT COUNT(*) as n FROM magazzino WHERE ingrediente_id = ?", [id]),
    select<{ n: number }>("SELECT COUNT(*) as n FROM serate WHERE ingrediente_id = ?", [id]),
    select<{ n: number }>("SELECT COUNT(*) as n FROM acquisti_vari WHERE ingrediente_id = ?", [id]),
  ]);
  return {
    ricette: ricette[0].n,
    magazzino: magazzino[0].n,
    serate: serate[0].n,
    acquisti: acquisti[0].n,
  };
}

export interface RicettaCoinvolta {
  id: number;
  nome: string;
}

export async function listRicetteCoinvolte(ingredienteId: number): Promise<RicettaCoinvolta[]> {
  return select<RicettaCoinvolta>(
    `SELECT DISTINCT r.id, r.nome FROM ricetta_ingredienti ri
     JOIN ricette r ON r.id = ri.ricetta_id
     WHERE ri.ingrediente_id = ?
     ORDER BY r.nome COLLATE NOCASE`,
    [ingredienteId]
  );
}

export async function eliminaIngrediente(id: number): Promise<void> {
  const uso = await usoIngrediente(id);
  const totale = uso.ricette + uso.magazzino + uso.serate + uso.acquisti;
  if (totale > 0) {
    throw new Error(
      "Impossibile eliminare: l'ingrediente è usato in " +
        [
          uso.ricette && `${uso.ricette} ricetta/e`,
          uso.magazzino && "magazzino",
          uso.serate && "serate",
          uso.acquisti && "acquisti vari",
        ]
          .filter(Boolean)
          .join(", ")
    );
  }
  await execute("DELETE FROM ingredienti WHERE id = ?", [id]);
}
