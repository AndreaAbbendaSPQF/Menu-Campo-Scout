import { getDb, select } from "../lib/db";
import { enumerateDates } from "../lib/date";
import { Campo, Giorno, PASTO_SLOTS, Pasto, PastoTipo, Serata, Servizio, ServizioSlot, SlotRicetta } from "../types/domain";

type Db = Awaited<ReturnType<typeof getDb>>;

const PASTI_TIPI: PastoTipo[] = ["Colazione", "Pranzo", "Merenda", "Cena"];

async function creaStrutturaGiorno(db: Db, giornoId: number) {
  for (const tipo of PASTI_TIPI) {
    const pastoResult = await db.execute("INSERT INTO pasti (giorno_id, tipo) VALUES (?, ?)", [giornoId, tipo]);
    const pastoId = pastoResult.lastInsertId ?? 0;
    const servizioResult = await db.execute(
      "INSERT INTO servizi (pasto_id, partecipa_lc, partecipa_sg, partecipa_cambusa, ordine) VALUES (?, 1, 1, 1, 0)",
      [pastoId]
    );
    const servizioId = servizioResult.lastInsertId ?? 0;
    for (const slot of PASTO_SLOTS[tipo]) {
      await db.execute("INSERT INTO servizio_slot (servizio_id, slot) VALUES (?, ?)", [servizioId, slot]);
    }
  }
}

export async function listCampi(): Promise<Campo[]> {
  return select<Campo>("SELECT * FROM campi ORDER BY data_inizio DESC");
}

export async function getCampo(id: number): Promise<Campo | null> {
  const rows = await select<Campo>("SELECT * FROM campi WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export interface NuovoCampo {
  nome: string;
  data_inizio: string;
  data_fine: string;
  coeff_lc: number;
  coeff_sg: number;
  coeff_cambusa: number;
  considera_magazzino: boolean;
}

export async function creaCampo(input: NuovoCampo): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO campi (nome, data_inizio, data_fine, coeff_lc, coeff_sg, coeff_cambusa, considera_magazzino)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.nome.trim(),
      input.data_inizio,
      input.data_fine,
      input.coeff_lc,
      input.coeff_sg,
      input.coeff_cambusa,
      input.considera_magazzino ? 1 : 0,
    ]
  );
  const campoId = result.lastInsertId ?? 0;
  for (const data of enumerateDates(input.data_inizio, input.data_fine)) {
    const giornoResult = await db.execute("INSERT INTO giorni (campo_id, data) VALUES (?, ?)", [campoId, data]);
    await creaStrutturaGiorno(db, giornoResult.lastInsertId ?? 0);
  }
  return campoId;
}

async function rigeneraGiorni(db: Db, campoId: number, dataInizio: string, dataFine: string) {
  const nuoveDate = new Set(enumerateDates(dataInizio, dataFine));
  const giorniEsistenti = await select<Giorno>("SELECT * FROM giorni WHERE campo_id = ?", [campoId]);
  const dateEsistenti = new Set(giorniEsistenti.map((g) => g.data));

  for (const giorno of giorniEsistenti) {
    if (!nuoveDate.has(giorno.data)) {
      await db.execute("DELETE FROM giorni WHERE id = ?", [giorno.id]);
    }
  }
  for (const data of nuoveDate) {
    if (!dateEsistenti.has(data)) {
      const result = await db.execute("INSERT INTO giorni (campo_id, data) VALUES (?, ?)", [campoId, data]);
      await creaStrutturaGiorno(db, result.lastInsertId ?? 0);
    }
  }
}

export async function aggiornaImpostazioniCampo(id: number, input: NuovoCampo): Promise<void> {
  const db = await getDb();
  const campoAttuale = await getCampo(id);
  if (!campoAttuale) throw new Error("Campo non trovato");

  await db.execute(
    `UPDATE campi
     SET nome = ?, data_inizio = ?, data_fine = ?, coeff_lc = ?, coeff_sg = ?, coeff_cambusa = ?, considera_magazzino = ?
     WHERE id = ?`,
    [
      input.nome.trim(),
      input.data_inizio,
      input.data_fine,
      input.coeff_lc,
      input.coeff_sg,
      input.coeff_cambusa,
      input.considera_magazzino ? 1 : 0,
      id,
    ]
  );

  if (campoAttuale.data_inizio !== input.data_inizio || campoAttuale.data_fine !== input.data_fine) {
    await rigeneraGiorni(db, id, input.data_inizio, input.data_fine);
  }
}

export async function eliminaCampo(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM campi WHERE id = ?", [id]);
}

export async function listGiorni(campoId: number): Promise<Giorno[]> {
  return select<Giorno>("SELECT * FROM giorni WHERE campo_id = ? ORDER BY data", [campoId]);
}

export interface AggiornamentoGiorno {
  coeff_giornaliero: number;
  n_lc: number;
  n_sg: number;
  n_cambusa: number;
  note_lc: string | null;
  note_sg: string | null;
}

export async function salvaGiorno(id: number, input: AggiornamentoGiorno): Promise<void> {
  await getDb().then((db) =>
    db.execute(
      `UPDATE giorni SET coeff_giornaliero = ?, n_lc = ?, n_sg = ?, n_cambusa = ?, note_lc = ?, note_sg = ? WHERE id = ?`,
      [input.coeff_giornaliero, input.n_lc, input.n_sg, input.n_cambusa, input.note_lc, input.note_sg, id]
    )
  );
}

async function copiaGiorno(db: Db, giornoSorgente: Giorno, giornoDestId: number) {
  await db.execute(
    "UPDATE giorni SET coeff_giornaliero = ?, n_lc = ?, n_sg = ?, n_cambusa = ?, note_lc = ?, note_sg = ? WHERE id = ?",
    [
      giornoSorgente.coeff_giornaliero,
      giornoSorgente.n_lc,
      giornoSorgente.n_sg,
      giornoSorgente.n_cambusa,
      giornoSorgente.note_lc,
      giornoSorgente.note_sg,
      giornoDestId,
    ]
  );

  const pastiSorgente = await select<Pasto>("SELECT * FROM pasti WHERE giorno_id = ?", [giornoSorgente.id]);
  const pastiDest = await select<Pasto>("SELECT * FROM pasti WHERE giorno_id = ?", [giornoDestId]);

  for (const pastoSrc of pastiSorgente) {
    const pastoDest = pastiDest.find((p) => p.tipo === pastoSrc.tipo);
    if (!pastoDest) continue;

    const serviziSrc = await select<Servizio>("SELECT * FROM servizi WHERE pasto_id = ? ORDER BY ordine", [
      pastoSrc.id,
    ]);
    await db.execute("DELETE FROM servizi WHERE pasto_id = ?", [pastoDest.id]);

    for (const servSrc of serviziSrc) {
      const servResult = await db.execute(
        "INSERT INTO servizi (pasto_id, partecipa_lc, partecipa_sg, partecipa_cambusa, nota, ordine) VALUES (?, ?, ?, ?, ?, ?)",
        [pastoDest.id, servSrc.partecipa_lc, servSrc.partecipa_sg, servSrc.partecipa_cambusa, servSrc.nota, servSrc.ordine]
      );
      const servDestId = servResult.lastInsertId ?? 0;
      const slotsSrc = await select<ServizioSlot>("SELECT * FROM servizio_slot WHERE servizio_id = ?", [servSrc.id]);
      const slotsDest = await select<ServizioSlot>("SELECT * FROM servizio_slot WHERE servizio_id = ?", [servDestId]);
      for (const slotSrc of slotsSrc) {
        const slotDest = slotsDest.find((s) => s.slot === slotSrc.slot);
        if (!slotDest) continue;
        const ricetteSlotSrc = await select<SlotRicetta>(
          "SELECT * FROM servizio_slot_ricette WHERE servizio_slot_id = ?",
          [slotSrc.id]
        );
        for (const sr of ricetteSlotSrc) {
          await db.execute("INSERT INTO servizio_slot_ricette (servizio_slot_id, ricetta_id) VALUES (?, ?)", [
            slotDest.id,
            sr.ricetta_id,
          ]);
        }
      }
    }
  }

  const serateSrc = await select<Serata>("SELECT * FROM serate WHERE giorno_id = ?", [giornoSorgente.id]);
  for (const s of serateSrc) {
    await db.execute("INSERT INTO serate (giorno_id, ingrediente_id, quantita, note) VALUES (?, ?, ?, ?)", [
      giornoDestId,
      s.ingrediente_id,
      s.quantita,
      s.note,
    ]);
  }
}

export async function duplicaCampo(
  id: number,
  nuovoNome: string,
  nuovaDataInizio: string,
  nuovaDataFine: string
): Promise<number> {
  const sorgente = await getCampo(id);
  if (!sorgente) throw new Error("Campo non trovato");

  const nuovoCampoId = await creaCampo({
    nome: nuovoNome,
    data_inizio: nuovaDataInizio,
    data_fine: nuovaDataFine,
    coeff_lc: sorgente.coeff_lc,
    coeff_sg: sorgente.coeff_sg,
    coeff_cambusa: sorgente.coeff_cambusa,
    considera_magazzino: !!sorgente.considera_magazzino,
  });

  const db = await getDb();
  const giorniSorgente = await listGiorni(id);
  const giorniNuovi = await listGiorni(nuovoCampoId);
  const n = Math.min(giorniSorgente.length, giorniNuovi.length);
  for (let i = 0; i < n; i++) {
    await copiaGiorno(db, giorniSorgente[i], giorniNuovi[i].id);
  }

  return nuovoCampoId;
}
