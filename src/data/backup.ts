import { getDb, select } from "../lib/db";
import { salvaFileTesto, scegliFileDaAprire } from "../lib/fileExport";

const TABELLE_IN_ORDINE_INSERIMENTO = [
  "categorie_merceologiche",
  "ingredienti",
  "campi",
  "ricette",
  "ricetta_portate",
  "ricetta_ingredienti",
  "giorni",
  "pasti",
  "servizi",
  "servizio_slot",
  "servizio_slot_ricette",
  "serate",
  "magazzino",
  "acquisti_vari",
  "lista_spesa_note",
];

const TABELLE_IN_ORDINE_ELIMINAZIONE = [...TABELLE_IN_ORDINE_INSERIMENTO].reverse();

export const BACKUP_VERSIONE = 1;

export interface FileBackup {
  versione: number;
  esportatoIl: string;
  dati: Record<string, Record<string, unknown>[]>;
}

export async function esportaBackup(): Promise<boolean> {
  const dati: Record<string, Record<string, unknown>[]> = {};
  for (const tabella of TABELLE_IN_ORDINE_INSERIMENTO) {
    dati[tabella] = await select<Record<string, unknown>>(`SELECT * FROM ${tabella}`);
  }
  const backup: FileBackup = {
    versione: BACKUP_VERSIONE,
    esportatoIl: new Date().toISOString(),
    dati,
  };
  return salvaFileTesto("Backup_CambusaScout.json", "json", "Backup JSON", JSON.stringify(backup, null, 2));
}

export async function scegliFileBackup(): Promise<string | null> {
  return scegliFileDaAprire("json", "Backup JSON");
}

export async function importaBackup(contenutoJson: string): Promise<void> {
  const backup = JSON.parse(contenutoJson) as FileBackup;
  if (!backup || typeof backup !== "object" || !backup.dati) {
    throw new Error("Il file selezionato non è un backup valido.");
  }

  const db = await getDb();
  await db.execute("PRAGMA foreign_keys = OFF");
  try {
    for (const tabella of TABELLE_IN_ORDINE_ELIMINAZIONE) {
      await db.execute(`DELETE FROM ${tabella}`);
    }
    for (const tabella of TABELLE_IN_ORDINE_INSERIMENTO) {
      const righe = backup.dati[tabella] ?? [];
      for (const riga of righe) {
        const colonne = Object.keys(riga);
        if (colonne.length === 0) continue;
        const placeholders = colonne.map(() => "?").join(", ");
        const valori = colonne.map((c) => riga[c]);
        await db.execute(
          `INSERT INTO ${tabella} (${colonne.join(", ")}) VALUES (${placeholders})`,
          valori
        );
      }
    }
  } finally {
    await db.execute("PRAGMA foreign_keys = ON");
  }
}
