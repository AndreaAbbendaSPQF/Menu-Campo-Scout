export type UnitaMisura = "Kg" | "g" | "Lt" | "mL" | "Pz" | "Mt";

export type Portata =
  | "Primo"
  | "Secondo"
  | "Contorno"
  | "Frutta_Dolce"
  | "Colazione_Bere"
  | "Colazione_Mangiare"
  | "Merenda";

export const PORTATE: { value: Portata; label: string }[] = [
  { value: "Primo", label: "Primo" },
  { value: "Secondo", label: "Secondo" },
  { value: "Contorno", label: "Contorno" },
  { value: "Frutta_Dolce", label: "Frutta/Dolce" },
  { value: "Colazione_Bere", label: "Colazione - Bere" },
  { value: "Colazione_Mangiare", label: "Colazione - Mangiare" },
  { value: "Merenda", label: "Merenda" },
];

export const UNITA_MISURA: UnitaMisura[] = ["Kg", "g", "Lt", "mL", "Pz", "Mt"];

export interface CategoriaMerceologica {
  id: number;
  nome: string;
  ordine: number;
}

export interface Ingrediente {
  id: number;
  nome: string;
  nome_normalizzato: string;
  unita_misura: UnitaMisura;
  categoria_id: number;
  gelo: number;
  note: string | null;
}

export interface Ricetta {
  id: number;
  nome: string;
  note: string | null;
  piatto_unico: number;
  dosi_persone: number;
}

export interface RicettaPortata {
  ricetta_id: number;
  portata: Portata;
}

export interface RicettaIngrediente {
  id: number;
  ricetta_id: number;
  ingrediente_id: number;
  quantita_per_5: number;
}

export interface RicettaCompleta extends Ricetta {
  portate: Portata[];
  ingredienti: RicettaIngrediente[];
}

export type PastoTipo = "Colazione" | "Pranzo" | "Merenda" | "Cena";

export const PASTO_SLOTS: Record<PastoTipo, Portata[]> = {
  Colazione: ["Colazione_Bere", "Colazione_Mangiare"],
  Pranzo: ["Primo", "Secondo", "Contorno", "Frutta_Dolce"],
  Merenda: ["Merenda"],
  Cena: ["Primo", "Secondo", "Contorno", "Frutta_Dolce"],
};

export interface Campo {
  id: number;
  nome: string;
  data_inizio: string;
  data_fine: string;
  coeff_lc: number;
  coeff_sg: number;
  coeff_cambusa: number;
  considera_magazzino: number;
}

export interface Giorno {
  id: number;
  campo_id: number;
  data: string;
  coeff_giornaliero: number;
  n_lc: number;
  n_sg: number;
  n_cambusa: number;
  note_lc: string | null;
  note_sg: string | null;
}

export interface Pasto {
  id: number;
  giorno_id: number;
  tipo: PastoTipo;
}

export interface Servizio {
  id: number;
  pasto_id: number;
  partecipa_lc: number;
  partecipa_sg: number;
  partecipa_cambusa: number;
  nota: string | null;
  ordine: number;
}

export interface ServizioSlot {
  id: number;
  servizio_id: number;
  slot: Portata;
}

export interface SlotRicetta {
  id: number;
  servizio_slot_id: number;
  ricetta_id: number;
}

export interface Serata {
  id: number;
  giorno_id: number;
  ingrediente_id: number;
  quantita: number;
  note: string | null;
}

export interface MagazzinoRiga {
  id: number;
  ingrediente_id: number;
  quantita: number;
  note: string | null;
}

export interface AcquistoVario {
  id: number;
  campo_id: number;
  ingrediente_id: number;
  quantita: number;
  note: string | null;
}

export interface ListaSpesaNota {
  campo_id: number;
  ingrediente_id: number;
  nota: string | null;
}
