import { describe, expect, it } from "vitest";
import {
  aggregaTotaliPerIngrediente,
  calcolaDaComprare,
  calcolaGrammature,
  calcolaPersoneEquivalenti,
  calcolaQuantitaIngrediente,
  CampoCoefficienti,
  GiornoCalc,
  PastoCalc,
  raggruppaPerRicetta,
  RicetteMap,
  ServizioCalc,
} from "./calcolo";

const COEFFICIENTI: CampoCoefficienti = { coeffLc: 0.8, coeffSg: 0.9, coeffCambusa: 1.0 };

describe("calcolaPersoneEquivalenti", () => {
  it("somma le presenze pesate dei soli gruppi partecipanti", () => {
    const giorno: Pick<GiornoCalc, "nLc" | "nSg" | "nCambusa"> = { nLc: 10, nSg: 20, nCambusa: 5 };
    const risultato = calcolaPersoneEquivalenti(giorno, COEFFICIENTI, {
      partecipaLc: true,
      partecipaSg: true,
      partecipaCambusa: true,
    });
    expect(risultato).toBeCloseTo(10 * 0.8 + 20 * 0.9 + 5 * 1.0);
  });

  it("esclude i gruppi non partecipanti", () => {
    const giorno: Pick<GiornoCalc, "nLc" | "nSg" | "nCambusa"> = { nLc: 10, nSg: 20, nCambusa: 5 };
    const risultato = calcolaPersoneEquivalenti(giorno, COEFFICIENTI, {
      partecipaLc: false,
      partecipaSg: true,
      partecipaCambusa: false,
    });
    expect(risultato).toBeCloseTo(20 * 0.9);
  });
});

describe("calcolaQuantitaIngrediente", () => {
  it("applica la formula dose_base / dosi_persone * persone_equivalenti * coeff_giornaliero", () => {
    expect(calcolaQuantitaIngrediente(10, 5, 31, 1)).toBeCloseTo((10 / 5) * 31 * 1);
  });

  it("scala con il coefficiente giornaliero", () => {
    expect(calcolaQuantitaIngrediente(10, 5, 31, 0.5)).toBeCloseTo((10 / 5) * 31 * 0.5);
  });

  it("non arrotonda: preserva i decimali esatti", () => {
    const risultato = calcolaQuantitaIngrediente(1, 5, 7, 1);
    expect(risultato).toBeCloseTo((1 / 5) * 7 * 1, 10);
  });

  it("usa il numero di persone configurato dalla ricetta, non sempre 5", () => {
    // Ricetta dosata per 10 persone: la stessa quantità base vale la metà rispetto a una dosata per 5.
    expect(calcolaQuantitaIngrediente(10, 10, 31, 1)).toBeCloseTo((10 / 10) * 31 * 1);
    expect(calcolaQuantitaIngrediente(10, 10, 31, 1)).toBeCloseTo(calcolaQuantitaIngrediente(5, 5, 31, 1));
  });
});

describe("calcolaGrammature", () => {
  const giorni: GiornoCalc[] = [{ id: 1, data: "2026-08-25", coeffGiornaliero: 1, nLc: 10, nSg: 20, nCambusa: 5 }];
  const pasti: PastoCalc[] = [{ id: 1, giornoId: 1, tipo: "Pranzo" }];

  it("calcola la quantità scalata per un servizio unico", () => {
    const servizi: ServizioCalc[] = [
      {
        id: 1,
        pastoId: 1,
        partecipaLc: true,
        partecipaSg: true,
        partecipaCambusa: true,
        nota: null,
        ricetteAssegnate: [100],
      },
    ];
    const ricette: RicetteMap = new Map([[100, { nome: "Pasta al pesto", dosiPersone: 5, ingredienti: [{ ingredienteId: 1, quantitaPer5: 10 }] }]]);

    const righe = calcolaGrammature(giorni, pasti, servizi, ricette, COEFFICIENTI);

    expect(righe).toHaveLength(1);
    const personeEquivalenti = 10 * 0.8 + 20 * 0.9 + 5 * 1.0;
    expect(righe[0].quantita).toBeCloseTo((10 / 5) * personeEquivalenti * 1);
    expect(righe[0].ingredienteId).toBe(1);
    expect(righe[0].ricettaId).toBe(100);
  });

  it("calcola quantità indipendenti per un pasto sdoppiato in due servizi", () => {
    const servizi: ServizioCalc[] = [
      {
        id: 1,
        pastoId: 1,
        partecipaLc: true,
        partecipaSg: false,
        partecipaCambusa: true,
        nota: null,
        ricetteAssegnate: [100],
      },
      {
        id: 2,
        pastoId: 1,
        partecipaLc: false,
        partecipaSg: true,
        partecipaCambusa: false,
        nota: "Gita S/G",
        ricetteAssegnate: [200],
      },
    ];
    const ricette: RicetteMap = new Map([
      [100, { nome: "Pasta al pesto", dosiPersone: 5, ingredienti: [{ ingredienteId: 1, quantitaPer5: 10 }] }],
      [200, { nome: "Pranzo al sacco gita", dosiPersone: 5, ingredienti: [{ ingredienteId: 2, quantitaPer5: 5 }] }],
    ]);

    const righe = calcolaGrammature(giorni, pasti, servizi, ricette, COEFFICIENTI);

    expect(righe).toHaveLength(2);
    const rigaServizio1 = righe.find((r) => r.servizioId === 1)!;
    const rigaServizio2 = righe.find((r) => r.servizioId === 2)!;

    const personeServizio1 = 10 * 0.8 + 5 * 1.0;
    const personeServizio2 = 20 * 0.9;
    expect(rigaServizio1.quantita).toBeCloseTo((10 / 5) * personeServizio1 * 1);
    expect(rigaServizio2.quantita).toBeCloseTo((5 / 5) * personeServizio2 * 1);
  });

  it("non duplica le quantità per un piatto multiplo assegnato a più portate", () => {
    // Un piatto unico (es. Pranzo al sacco) copre Primo+Secondo+Contorno+Frutta_Dolce,
    // ma va calcolato una sola volta per servizio, non una volta per portata coperta.
    const servizi: ServizioCalc[] = [
      {
        id: 1,
        pastoId: 1,
        partecipaLc: true,
        partecipaSg: true,
        partecipaCambusa: true,
        nota: null,
        ricetteAssegnate: [300],
      },
    ];
    const ricette: RicetteMap = new Map([
      [300, { nome: "Pranzo al sacco gita", dosiPersone: 5, ingredienti: [{ ingredienteId: 1, quantitaPer5: 10 }] }],
    ]);

    const righe = calcolaGrammature(giorni, pasti, servizi, ricette, COEFFICIENTI);
    expect(righe).toHaveLength(1);
  });
});

describe("calcolaDaComprare", () => {
  it("sottrae il magazzino quando il flag è attivo", () => {
    expect(calcolaDaComprare(10, 4, true)).toBe(6);
  });

  it("non scende mai sotto zero", () => {
    expect(calcolaDaComprare(10, 15, true)).toBe(0);
  });

  it("ignora il magazzino quando il flag è disattivo", () => {
    expect(calcolaDaComprare(10, 4, false)).toBe(10);
  });
});

describe("aggregaTotaliPerIngrediente", () => {
  it("somma menù, serate e acquisti vari per lo stesso ingrediente", () => {
    const grammature = [
      { ingredienteId: 1, quantita: 5 },
      { ingredienteId: 2, quantita: 3 },
    ];
    const serate = [{ ingredienteId: 1, quantita: 2 }];
    const acquistiVari = [
      { ingredienteId: 1, quantita: 1 },
      { ingredienteId: 3, quantita: 7 },
    ];

    const totali = aggregaTotaliPerIngrediente(grammature, serate, acquistiVari);

    expect(totali.get(1)).toBe(8);
    expect(totali.get(2)).toBe(3);
    expect(totali.get(3)).toBe(7);
  });
});

describe("raggruppaPerRicetta", () => {
  it("somma le quantità dello stesso ingrediente per ricetta, ignorando le altre", () => {
    const grammature = [
      { ingredienteId: 1, ricettaId: 10, ricettaNome: "Pasta al sugo", quantita: 3 },
      { ingredienteId: 1, ricettaId: 11, ricettaNome: "Pasta al pesto", quantita: 4 },
      { ingredienteId: 1, ricettaId: 10, ricettaNome: "Pasta al sugo", quantita: 1 },
      { ingredienteId: 2, ricettaId: 12, ricettaNome: "Altra ricetta", quantita: 100 },
    ];

    const risultato = raggruppaPerRicetta(grammature, 1);

    expect(risultato).toHaveLength(2);
    const sugo = risultato.find((r) => r.ricettaId === 10)!;
    const pesto = risultato.find((r) => r.ricettaId === 11)!;
    expect(sugo.quantita).toBe(4);
    expect(pesto.quantita).toBe(4);
  });

  it("ordina per nome ricetta", () => {
    const grammature = [
      { ingredienteId: 1, ricettaId: 1, ricettaNome: "Zucchine saltate", quantita: 1 },
      { ingredienteId: 1, ricettaId: 2, ricettaNome: "American lurido", quantita: 1 },
    ];
    const risultato = raggruppaPerRicetta(grammature, 1);
    expect(risultato.map((r) => r.ricettaNome)).toEqual(["American lurido", "Zucchine saltate"]);
  });

  it("restituisce un array vuoto se l'ingrediente non è usato in nessuna ricetta", () => {
    const grammature = [{ ingredienteId: 2, ricettaId: 1, ricettaNome: "X", quantita: 1 }];
    expect(raggruppaPerRicetta(grammature, 1)).toEqual([]);
  });
});
