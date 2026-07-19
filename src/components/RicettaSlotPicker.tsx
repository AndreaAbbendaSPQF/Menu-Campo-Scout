import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeForCompare } from "../lib/text";
import { Ricetta } from "../types/domain";

interface Props {
  ricetteAssegnate: Ricetta[];
  ricetteCompatibili: Ricetta[];
  onAssegna: (ricettaId: number) => void;
  onRimuovi: (ricettaId: number) => void;
}

export default function RicettaSlotPicker({ ricetteAssegnate, ricetteCompatibili, onAssegna, onRimuovi }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [aperto, setAperto] = useState(false);
  const [ricerca, setRicerca] = useState("");

  useEffect(() => {
    function onDocumentMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAperto(false);
      }
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  const assegnateIds = useMemo(() => new Set(ricetteAssegnate.map((r) => r.id)), [ricetteAssegnate]);

  const risultati = useMemo(() => {
    const target = normalizeForCompare(ricerca);
    return ricetteCompatibili.filter(
      (r) => !assegnateIds.has(r.id) && (!target || normalizeForCompare(r.nome).includes(target))
    );
  }, [ricerca, ricetteCompatibili, assegnateIds]);

  return (
    <div className="slot-cell" ref={containerRef}>
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
        className="slot-button"
        onClick={() => {
          setAperto((v) => !v);
          setRicerca("");
        }}
      >
        + Aggiungi
      </button>
      {aperto && (
        <div className="slot-dropdown">
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
        </div>
      )}
    </div>
  );
}
