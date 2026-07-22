import { useEffect, useMemo, useState } from "react";
import {
  aggiornaIngrediente,
  creaIngrediente,
  eliminaIngrediente,
  IngredienteDuplicatoError,
  listIngredienti,
  UnitaMisuraIncompatibileError,
} from "../data/ingredienti";
import { listCategorie } from "../data/categorie";
import { normalizeForCompare } from "../lib/text";
import { useSaveFeedback } from "../context/SaveFeedbackContext";
import RicetteCoinvolteButton from "../components/RicetteCoinvolteButton";
import { CategoriaMerceologica, Ingrediente, UNITA_MISURA, UnitaMisura } from "../types/domain";

interface FormState {
  id: number | null;
  nome: string;
  unita_misura: UnitaMisura;
  categoria_id: number | "";
  gelo: boolean;
  note: string;
}

const FORM_VUOTO: FormState = { id: null, nome: "", unita_misura: "Kg", categoria_id: "", gelo: false, note: "" };

export default function IngredientiPage() {
  const [ingredienti, setIngredienti] = useState<Ingrediente[]>([]);
  const [categorie, setCategorie] = useState<CategoriaMerceologica[]>([]);
  const [ricerca, setRicerca] = useState("");
  const [form, setForm] = useState<FormState>(FORM_VUOTO);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricato, setCaricato] = useState(false);
  const notificaSalvato = useSaveFeedback();

  async function ricarica() {
    const [ings, cats] = await Promise.all([listIngredienti(), listCategorie()]);
    setIngredienti(ings);
    setCategorie(cats);
    setCaricato(true);
  }

  useEffect(() => {
    ricarica();
  }, []);

  const filtrati = useMemo(() => {
    if (!ricerca.trim()) return ingredienti;
    const target = normalizeForCompare(ricerca);
    return ingredienti.filter((i) => i.nome_normalizzato.includes(target));
  }, [ricerca, ingredienti]);

  const categoriaNome = (id: number) => categorie.find((c) => c.id === id)?.nome ?? "—";

  function modifica(ing: Ingrediente) {
    setErrore(null);
    setForm({
      id: ing.id,
      nome: ing.nome,
      unita_misura: ing.unita_misura,
      categoria_id: ing.categoria_id,
      gelo: !!ing.gelo,
      note: ing.note ?? "",
    });
  }

  function nuovo() {
    setErrore(null);
    setForm({ ...FORM_VUOTO, categoria_id: categorie[0]?.id ?? "" });
  }

  async function salva() {
    if (!form.nome.trim() || form.categoria_id === "") {
      setErrore("Nome e categoria sono obbligatori");
      return;
    }
    setErrore(null);
    try {
      const input = {
        nome: form.nome,
        unita_misura: form.unita_misura,
        categoria_id: form.categoria_id,
        gelo: form.gelo,
        note: form.note,
      };
      if (form.id === null) {
        await creaIngrediente(input);
      } else {
        await aggiornaIngrediente(form.id, input);
      }
      setForm(FORM_VUOTO);
      await ricarica();
      notificaSalvato();
    } catch (e) {
      if (e instanceof IngredienteDuplicatoError || e instanceof UnitaMisuraIncompatibileError) {
        setErrore(e.message);
      } else {
        setErrore("Errore durante il salvataggio");
      }
    }
  }

  async function elimina(id: number) {
    if (!confirm("Eliminare definitivamente questo ingrediente?")) return;
    try {
      await eliminaIngrediente(id);
      await ricarica();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore durante l'eliminazione");
    }
  }

  if (!caricato) return <div className="page">Caricamento...</div>;

  return (
    <div className="page">
      <h1>Anagrafica ingredienti</h1>
      <div className="two-columns">
        <div>
          <input
            className="search-input"
            placeholder="Cerca ingrediente..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>U.M.</th>
                <th>Categoria</th>
                <th>Gelo</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((ing) => (
                <tr key={ing.id}>
                  <td>{ing.nome}</td>
                  <td>{ing.unita_misura}</td>
                  <td>{categoriaNome(ing.categoria_id)}</td>
                  <td>{ing.gelo ? "❄" : ""}</td>
                  <td>
                    <RicetteCoinvolteButton ingredienteId={ing.id} />
                  </td>
                  <td className="row-actions">
                    <button onClick={() => modifica(ing)}>Modifica</button>
                    <button className="danger" onClick={() => elimina(ing.id)}>
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
              {filtrati.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Nessun ingrediente trovato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="form-panel">
          <h2>{form.id === null ? "Nuovo ingrediente" : "Modifica ingrediente"}</h2>
          <label>
            Nome
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label>
            Unità di misura
            <select
              value={form.unita_misura}
              onChange={(e) => setForm({ ...form, unita_misura: e.target.value as UnitaMisura })}
            >
              {UNITA_MISURA.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria merceologica
            <select
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: Number(e.target.value) })}
            >
              <option value="" disabled>
                Seleziona...
              </option>
              {categorie.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.gelo}
              onChange={(e) => setForm({ ...form, gelo: e.target.checked })}
            />
            Surgelato (Gelo)
          </label>
          <label>
            Note
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          {errore && <div className="form-error">{errore}</div>}
          <div className="form-actions">
            <button onClick={salva}>{form.id === null ? "Crea" : "Salva modifiche"}</button>
            <button className="secondary" onClick={nuovo}>
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
