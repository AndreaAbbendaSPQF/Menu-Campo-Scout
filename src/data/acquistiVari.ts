import { execute, select } from "../lib/db";
import { AcquistoVario } from "../types/domain";

export async function listAcquistiVari(campoId: number): Promise<AcquistoVario[]> {
  return select<AcquistoVario>("SELECT * FROM acquisti_vari WHERE campo_id = ? ORDER BY id", [campoId]);
}

export async function aggiungiAcquistoVario(
  campoId: number,
  ingredienteId: number,
  quantita: number,
  note?: string
): Promise<number> {
  const result = await execute(
    "INSERT INTO acquisti_vari (campo_id, ingrediente_id, quantita, note) VALUES (?, ?, ?, ?)",
    [campoId, ingredienteId, quantita, note?.trim() || null]
  );
  return result.lastInsertId;
}

export async function aggiornaAcquistoVario(id: number, quantita: number, note: string | null): Promise<void> {
  await execute("UPDATE acquisti_vari SET quantita = ?, note = ? WHERE id = ?", [quantita, note, id]);
}

export async function eliminaAcquistoVario(id: number): Promise<void> {
  await execute("DELETE FROM acquisti_vari WHERE id = ?", [id]);
}
