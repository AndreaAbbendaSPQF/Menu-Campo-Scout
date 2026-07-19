import { execute, select } from "../lib/db";
import { MagazzinoRiga } from "../types/domain";

export async function listMagazzino(): Promise<MagazzinoRiga[]> {
  return select<MagazzinoRiga>("SELECT * FROM magazzino");
}

export async function quantitaMagazzino(ingredienteId: number): Promise<number> {
  const rows = await select<MagazzinoRiga>("SELECT * FROM magazzino WHERE ingrediente_id = ?", [ingredienteId]);
  return rows[0]?.quantita ?? 0;
}

export async function impostaQuantitaMagazzino(ingredienteId: number, quantita: number, note?: string | null): Promise<void> {
  const esistente = await select<MagazzinoRiga>("SELECT * FROM magazzino WHERE ingrediente_id = ?", [ingredienteId]);
  if (esistente.length > 0) {
    await execute("UPDATE magazzino SET quantita = ?, note = ? WHERE ingrediente_id = ?", [
      quantita,
      note ?? esistente[0].note,
      ingredienteId,
    ]);
  } else {
    await execute("INSERT INTO magazzino (ingrediente_id, quantita, note) VALUES (?, ?, ?)", [
      ingredienteId,
      quantita,
      note ?? null,
    ]);
  }
}

export async function eliminaRigaMagazzino(id: number): Promise<void> {
  await execute("DELETE FROM magazzino WHERE id = ?", [id]);
}
