import { UnitaMisura } from "../types/domain";

const FATTORE_BASE: Record<UnitaMisura, { famiglia: "massa" | "volume" | null; fattore: number }> = {
  Kg: { famiglia: "massa", fattore: 1000 },
  g: { famiglia: "massa", fattore: 1 },
  Lt: { famiglia: "volume", fattore: 1000 },
  mL: { famiglia: "volume", fattore: 1 },
  Pz: { famiglia: null, fattore: 1 },
  Mt: { famiglia: null, fattore: 1 },
};

export function unitaCompatibili(a: UnitaMisura, b: UnitaMisura): boolean {
  if (a === b) return true;
  const fa = FATTORE_BASE[a].famiglia;
  const fb = FATTORE_BASE[b].famiglia;
  return fa !== null && fa === fb;
}

export function fattoreConversione(daUnita: UnitaMisura, aUnita: UnitaMisura): number {
  return FATTORE_BASE[daUnita].fattore / FATTORE_BASE[aUnita].fattore;
}
