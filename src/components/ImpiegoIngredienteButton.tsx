import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RigaImpiegoRicetta } from "../lib/calcolo";
import { formattaQuantita } from "../lib/numero";
import Popover from "./Popover";

interface Props {
  impiego: RigaImpiegoRicetta[];
  unitaMisura: string;
}

export default function ImpiegoIngredienteButton({ impiego, unitaMisura }: Props) {
  const bottoneRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [aperto, setAperto] = useState(false);

  function vaiAllaRicetta(id: number) {
    setAperto(false);
    navigate("/ricette", { state: { apriRicettaId: id } });
  }

  return (
    <>
      <button type="button" ref={bottoneRef} className="secondary" onClick={() => setAperto((v) => !v)}>
        Impiego
      </button>
      <Popover aperto={aperto} onChiudi={() => setAperto(false)} ancoraRef={bottoneRef}>
        {impiego.length === 0 && <div className="autocomplete-item muted">Nessuna ricetta usa questo ingrediente</div>}
        {impiego.map((r) => (
          <div key={r.ricettaId} className="autocomplete-item autocomplete-link" onClick={() => vaiAllaRicetta(r.ricettaId)}>
            {r.ricettaNome} <span className="muted">{formattaQuantita(r.quantita)} {unitaMisura}</span>
          </div>
        ))}
      </Popover>
    </>
  );
}
