import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRicetteCoinvolte, RicettaCoinvolta } from "../data/ingredienti";
import Popover from "./Popover";

export default function RicetteCoinvolteButton({ ingredienteId }: { ingredienteId: number }) {
  const bottoneRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [aperto, setAperto] = useState(false);
  const [caricamento, setCaricamento] = useState(false);
  const [ricette, setRicette] = useState<RicettaCoinvolta[] | null>(null);

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

  function vaiAllaRicetta(id: number) {
    setAperto(false);
    navigate("/ricette", { state: { apriRicettaId: id } });
  }

  return (
    <>
      <button type="button" ref={bottoneRef} className="secondary" onClick={toggle}>
        Ricette coinvolte
      </button>
      <Popover aperto={aperto} onChiudi={() => setAperto(false)} ancoraRef={bottoneRef}>
        {caricamento && <div className="autocomplete-item muted">Caricamento...</div>}
        {!caricamento && ricette?.length === 0 && (
          <div className="autocomplete-item muted">Nessuna ricetta usa questo ingrediente</div>
        )}
        {!caricamento &&
          ricette?.map((r) => (
            <div key={r.id} className="autocomplete-item autocomplete-link" onClick={() => vaiAllaRicetta(r.id)}>
              {r.nome}
            </div>
          ))}
      </Popover>
    </>
  );
}
