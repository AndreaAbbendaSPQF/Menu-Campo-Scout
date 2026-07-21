import { useEffect, useRef, useState } from "react";
import { listRicetteCoinvolte, RicettaCoinvolta } from "../data/ingredienti";

export default function RicetteCoinvolteButton({ ingredienteId }: { ingredienteId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [aperto, setAperto] = useState(false);
  const [caricamento, setCaricamento] = useState(false);
  const [ricette, setRicette] = useState<RicettaCoinvolta[] | null>(null);

  useEffect(() => {
    function onDocumentMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAperto(false);
      }
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  async function toggle() {
    if (aperto) {
      setAperto(false);
      return;
    }
    setAperto(true);
    setCaricamento(true);
    const lista = await listRicetteCoinvolte(ingredienteId);
    setRicette(lista);
    setCaricamento(false);
  }

  return (
    <div className="autocomplete" ref={containerRef} style={{ display: "inline-block" }}>
      <button type="button" className="secondary" onClick={toggle}>
        Ricette coinvolte
      </button>
      {aperto && (
        <div className="autocomplete-dropdown" style={{ minWidth: 220 }}>
          {caricamento && <div className="autocomplete-item muted">Caricamento...</div>}
          {!caricamento && ricette?.length === 0 && (
            <div className="autocomplete-item muted">Nessuna ricetta usa questo ingrediente</div>
          )}
          {!caricamento && ricette?.map((r) => (
            <div key={r.id} className="autocomplete-item">
              {r.nome}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
