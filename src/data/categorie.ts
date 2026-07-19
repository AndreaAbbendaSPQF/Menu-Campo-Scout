import { select } from "../lib/db";
import { CategoriaMerceologica } from "../types/domain";

export async function listCategorie(): Promise<CategoriaMerceologica[]> {
  return select<CategoriaMerceologica>(
    "SELECT id, nome, ordine FROM categorie_merceologiche ORDER BY ordine"
  );
}
