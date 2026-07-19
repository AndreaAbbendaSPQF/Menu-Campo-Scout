import { execute, select } from "../lib/db";
import { normalizeForCompare } from "../lib/text";
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

export async function aggiornaIngrediente(id: number, input: NuovoIngrediente): Promise<void> {
  const esistente = await findIngredienteByName(input.nome);
  if (esistente && esistente.id !== id) throw new IngredienteDuplicatoError(esistente.nome);

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
