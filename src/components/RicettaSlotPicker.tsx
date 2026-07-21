import { useMemo, useRef, useState } from "react";
import { normalizeForCompare } from "../lib/text";
import { Ricetta } from "../types/domain";
import Popover from "./Popover";

interface Props {
  ricetteAssegnate: Ricetta[];
  ricetteCompatibili: Ricetta[];
  onAssegna: (ricettaId: number) => void;
  onRimuovi: (ricettaId: number) => void;
}

export default function RicettaSlotPicker({ ricetteAssegnate, ricetteCompatibili, onAssegna, onRimuovi }: Props) {
  const bottoneRef = useRef<HTMLButtonElement>(null);
  const [aperto, setAperto] = useState(false);
  const [ricerca, setRicerca] = useState("");

  const assegnateIds = useMemo(() => new Set(ricetteAssegnate.map((r) => r.id)), [ricetteAssegnate]);

  const risultati = useMemo(() => {
    const target = normalizeForCompare(ricerca);
    return ricetteCompatibili.filter(
      (r) => !assegnateIds.has(r.id) && (!target || normalizeForCompare(r.nome).includes(target))
    );
  }, [ricerca, ricetteCompatibili, assegnateIds]);

  return (
    <div className="slot-cell">
      {ricetteAssegnate.map((r) => (
        <div key={r.id} className="slot-ricetta-assegnata">
          <span>{r.nome}</span>
          <button type="button" className="slot-ricetta-rimuovi" onClick={() => onRimuovi(r.id)}>
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        ref={bottoneRef}
        className="slot-button"
        onClick={() => {
          setAperto((v) => !v);
          setRicerca("");
        }}
      >
        + Aggiungi
      </button>
      <Popover aperto={aperto} onChiudi={() => setAperto(false)} ancoraRef={bottoneRef}>
        <input
          autoFocus
          className="search-input"
          placeholder="Cerca ricetta..."
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
        />
        {risultati.map((r) => (
          <div
            key={r.id}
            className="autocomplete-item"
            onClick={() => {
              onAssegna(r.id);
              setRicerca("");
            }}
          >
            {r.nome}
          </div>
        ))}
        {risultati.length === 0 && <div className="autocomplete-item muted">Nessuna ricetta trovata</div>}
      </Popover>
    </div>
  );
}
