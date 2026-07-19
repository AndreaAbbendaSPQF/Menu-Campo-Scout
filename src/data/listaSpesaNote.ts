import { execute, select } from "../lib/db";
import { ListaSpesaNota } from "../types/domain";

export async function listNoteListaSpesa(campoId: number): Promise<ListaSpesaNota[]> {
  return select<ListaSpesaNota>("SELECT * FROM lista_spesa_note WHERE campo_id = ?", [campoId]);
}

export async function impostaNotaListaSpesa(campoId: number, ingredienteId: number, nota: string): Promise<void> {
  const esistente = await select<ListaSpesaNota>(
    "SELECT * FROM lista_spesa_note WHERE campo_id = ? AND ingrediente_id = ?",
    [campoId, ingredienteId]
  );
  const notaPulita = nota.trim() || null;
  if (esistente.length > 0) {
    await execute("UPDATE lista_spesa_note SET nota = ? WHERE campo_id = ? AND ingrediente_id = ?", [
      notaPulita,
      campoId,
      ingredienteId,
    ]);
  } else if (notaPulita !== null) {
    await execute("INSERT INTO lista_spesa_note (campo_id, ingrediente_id, nota) VALUES (?, ?, ?)", [
      campoId,
      ingredienteId,
      notaPulita,
    ]);
  }
}
