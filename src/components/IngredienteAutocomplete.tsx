import { useMemo, useRef, useState } from "react";
import { normalizeForCompare } from "../lib/text";
import { creaIngrediente, IngredienteDuplicatoError } from "../data/ingredienti";
import { CategoriaMerceologica, Ingrediente, UNITA_MISURA, UnitaMisura } from "../types/domain";
import Popover from "./Popover";

interface Props {
  ingredienti: Ingrediente[];
  categorie: CategoriaMerceologica[];
  onSelect: (ingrediente: Ingrediente) => void;
  onIngredienteCreato: (ingrediente: Ingrediente) => void;
  placeholder?: string;
}

export default function IngredienteAutocomplete({
  ingredienti,
  categorie,
  onSelect,
  onIngredienteCreato,
  placeholder,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [testo, setTesto] = useState("");
  const [aperto, setAperto] = useState(false);
  const [creazioneAttiva, setCreazioneAttiva] = useState(false);
  const [nuovaUnita, setNuovaUnita] = useState<UnitaMisura>("Kg");
  const [nuovaCategoria, setNuovaCategoria] = useState<number | "">("");
  const [nuovoGelo, setNuovoGelo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const risultati = useMemo(() => {
    if (!testo.trim()) return [];
    const target = normalizeForCompare(testo);
    return ingredienti
      .filter((i) => i.nome_normalizzato.includes(target))
      .slice(0, 8);
  }, [testo, ingredienti]);

  const matchEsatto = ingredienti.some((i) => i.nome_normalizzato === normalizeForCompare(testo));

  function selezionaIngrediente(ing: Ingrediente) {
    onSelect(ing);
    setTesto("");
    setAperto(false);
    setCreazioneAttiva(false);
  }

  function apriCreazione() {
    setCreazioneAttiva(true);
    setNuovaCategoria(categorie[0]?.id ?? "");
  }

  async function confermaCreazione() {
    if (!testo.trim() || nuovaCategoria === "") return;
    setErrore(null);
    try {
      const id = await creaIngrediente({
        nome: testo.trim(),
        unita_misura: nuovaUnita,
        categoria_id: nuovaCategoria,
        gelo: nuovoGelo,
      });
      const creato: Ingrediente = {
        id,
        nome: testo.trim(),
        nome_normalizzato: normalizeForCompare(testo),
        unita_misura: nuovaUnita,
        categoria_id: nuovaCategoria,
        gelo: nuovoGelo ? 1 : 0,
        note: null,
      };
      onIngredienteCreato(creato);
      onSelect(creato);
      setTesto("");
      setAperto(false);
      setCreazioneAttiva(false);
      setNuovoGelo(false);
    } catch (e) {
      setErrore(e instanceof IngredienteDuplicatoError ? e.message : "Errore durante la creazione");
    }
  }

  return (
    <div className="autocomplete">
      <input
        ref={inputRef}
        type="text"
        value={testo}
        placeholder={placeholder ?? "Cerca ingrediente..."}
        onChange={(e) => {
          setTesto(e.target.value);
          setAperto(true);
          setCreazioneAttiva(false);
        }}
        onFocus={() => setAperto(true)}
      />
      <Popover aperto={aperto && !!testo.trim()} onChiudi={() => setAperto(false)} ancoraRef={inputRef}>
        {risultati.map((ing) => (
          <div key={ing.id} className="autocomplete-item" onClick={() => selezionaIngrediente(ing)}>
            {ing.nome} <span className="muted">({ing.unita_misura})</span>
          </div>
        ))}
        {!matchEsatto && !creazioneAttiva && (
          <div className="autocomplete-item autocomplete-create" onClick={apriCreazione}>
            + Crea nuovo ingrediente "{testo.trim()}"
          </div>
        )}
        {creazioneAttiva && (
          <div className="autocomplete-create-form">
            <label>
              Unità di misura
              <select value={nuovaUnita} onChange={(e) => setNuovaUnita(e.target.value as UnitaMisura)}>
                {UNITA_MISURA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria merceologica
              <select value={nuovaCategoria} onChange={(e) => setNuovaCategoria(Number(e.target.value))}>
                {categorie.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={nuovoGelo} onChange={(e) => setNuovoGelo(e.target.checked)} />
              Surgelato (Gelo)
            </label>
            {errore && <div className="form-error">{errore}</div>}
            <button type="button" onClick={confermaCreazione}>
              Crea "{testo.trim()}"
            </button>
          </div>
        )}
      </Popover>
    </div>
  );
}
