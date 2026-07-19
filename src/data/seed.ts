import { execute, getDb, select } from "../lib/db";
import { creaCampo } from "./campi";
import { salvaRicetta } from "./ricette";

export const SEED_CAMPO_NOME = "Campo di esempio";
const SEED_INGREDIENTI = ["Pasta (esempio)", "Pomodoro (esempio)", "Formaggio (esempio)", "Olio (esempio)"];
const SEED_RICETTE = ["Pasta al pomodoro (esempio)", "Pasta e formaggio (esempio)"];

function normalizzaBase(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export async function datiCompletamenteVuoti(): Promise<boolean> {
  const [ingredienti, ricette, campi] = await Promise.all([
    select<{ n: number }>("SELECT COUNT(*) as n FROM ingredienti"),
    select<{ n: number }>("SELECT COUNT(*) as n FROM ricette"),
    select<{ n: number }>("SELECT COUNT(*) as n FROM campi"),
  ]);
  return ingredienti[0].n === 0 && ricette[0].n === 0 && campi[0].n === 0;
}

export async function esisteCampoEsempio(): Promise<boolean> {
  const rows = await select<{ n: number }>("SELECT COUNT(*) as n FROM campi WHERE nome = ?", [SEED_CAMPO_NOME]);
  return rows[0].n > 0;
}

export async function inserisciDatiEsempio(): Promise<void> {
  const db = await getDb();
  const categorie = await select<{ id: number; nome: string }>("SELECT id, nome FROM categorie_merceologiche");
  const categoriaId = (nome: string) => categorie.find((c) => c.nome === nome)?.id ?? categorie[0].id;

  const idIngrediente: Record<string, number> = {};
  const specificheIngredienti: [string, string, string][] = [
    ["Pasta (esempio)", "Kg", "Varie"],
    ["Pomodoro (esempio)", "Kg", "Frutta e Verdura - Fresco"],
    ["Formaggio (esempio)", "Kg", "Carne e Latticini"],
    ["Olio (esempio)", "Lt", "Varie"],
  ];
  for (const [nome, unita, categoria] of specificheIngredienti) {
    const result = await db.execute(
      "INSERT INTO ingredienti (nome, nome_normalizzato, unita_misura, categoria_id, gelo, note) VALUES (?, ?, ?, ?, 0, NULL)",
      [nome, normalizzaBase(nome), unita, categoriaId(categoria)]
    );
    idIngrediente[nome] = result.lastInsertId ?? 0;
  }

  await salvaRicetta(null, {
    nome: "Pasta al pomodoro (esempio)",
    note: "Ricetta di esempio",
    portate: ["Primo"],
    dosi_persone: 5,
    ingredienti: [
      { ingrediente_id: idIngrediente["Pasta (esempio)"], quantita_per_5: 0.5 },
      { ingrediente_id: idIngrediente["Pomodoro (esempio)"], quantita_per_5: 0.3 },
      { ingrediente_id: idIngrediente["Olio (esempio)"], quantita_per_5: 0.05 },
    ],
  });

  await salvaRicetta(null, {
    nome: "Pasta e formaggio (esempio)",
    note: "Ricetta di esempio (piatto multiplo)",
    portate: ["Primo", "Secondo"],
    dosi_persone: 5,
    ingredienti: [
      { ingrediente_id: idIngrediente["Pasta (esempio)"], quantita_per_5: 0.4 },
      { ingrediente_id: idIngrediente["Formaggio (esempio)"], quantita_per_5: 0.2 },
      { ingrediente_id: idIngrediente["Olio (esempio)"], quantita_per_5: 0.03 },
    ],
  });

  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  const formatta = (d: Date) => d.toISOString().slice(0, 10);

  await creaCampo({
    nome: SEED_CAMPO_NOME,
    data_inizio: formatta(oggi),
    data_fine: formatta(domani),
    coeff_lc: 0.8,
    coeff_sg: 0.9,
    coeff_cambusa: 1.0,
    considera_magazzino: true,
  });
}

export async function svuotaDatiEsempio(): Promise<void> {
  await execute("DELETE FROM campi WHERE nome = ?", [SEED_CAMPO_NOME]);
  for (const nome of SEED_RICETTE) {
    await execute("DELETE FROM servizio_slot_ricette WHERE ricetta_id IN (SELECT id FROM ricette WHERE nome = ?)", [
      nome,
    ]);
    await execute("DELETE FROM ricette WHERE nome = ?", [nome]);
  }
  for (const nome of SEED_INGREDIENTI) {
    await execute(
      "DELETE FROM ingredienti WHERE nome = ? AND id NOT IN (SELECT ingrediente_id FROM ricetta_ingredienti)",
      [nome]
    );
  }
}
