import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listCategorie } from "../data/categorie";
import { listIngredienti } from "../data/ingredienti";
import {
  duplicaRicetta,
  eliminaRicetta,
  getRicettaCompleta,
  listRicetteConPortate,
  RicettaConPortate,
  salvaRicetta,
  usoRicetta,
} from "../data/ricette";
import { normalizeForCompare } from "../lib/text";
import IngredienteAutocomplete from "../components/IngredienteAutocomplete";
import { useSaveFeedback } from "../context/SaveFeedbackContext";
import { CategoriaMerceologica, Ingrediente, PORTATE, Portata } from "../types/domain";

function etichettaPortate(portate: Portata[]): string {
  if (portate.length === 0) return "—";
  return portate.map((p) => PORTATE.find((def) => def.value === p)?.label ?? p).join(" + ");
}

interface RigaIngrediente {
  ingrediente_id: number;
  quantita_per_5: string;
}

interface FormState {
  id: number | null;
  nome: string;
  note: string;
  portate: Portata[];
  righe: RigaIngrediente[];
  dosiPersone: string;
}

const FORM_VUOTO: FormState = { id: null, nome: "", note: "", portate: [], righe: [], dosiPersone: "5" };

export default function RicettePage() {
  const [ricette, setRicette] = useState<RicettaConPortate[]>([]);
  const [ingredienti, setIngredienti] = useState<Ingrediente[]>([]);
  const [categorie, setCategorie] = useState<CategoriaMerceologica[]>([]);
  const [ricerca, setRicerca] = useState("");
  const [form, setForm] = useState<FormState>(FORM_VUOTO);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricato, setCaricato] = useState(false);
  const notificaSalvato = useSaveFeedback();

  async function ricaricaListe() {
    const [r, i, c] = await Promise.all([listRicetteConPortate(), listIngredienti(), listCategorie()]);
    setRicette(r);
    setIngredienti(i);
    setCategorie(c);
    setCaricato(true);
  }

  useEffect(() => {
    ricaricaListe();
  }, []);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const apriRicettaId = (location.state as { apriRicettaId?: number } | null)?.apriRicettaId;
    if (apriRicettaId) {
      apriModifica(apriRicettaId);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const filtrate = useMemo(() => {
    if (!ricerca.trim()) return ricette;
    const target = normalizeForCompare(ricerca);
    return ricette.filter((r) => normalizeForCompare(r.nome).includes(target));
  }, [ricerca, ricette]);

  const ingredienteById = useMemo(() => {
    const map = new Map<number, Ingrediente>();
    for (const i of ingredienti) map.set(i.id, i);
    return map;
  }, [ingredienti]);

  function nuova() {
    setErrore(null);
    setForm(FORM_VUOTO);
  }

  async function apriModifica(id: number) {
    setErrore(null);
    const completa = await getRicettaCompleta(id);
    if (!completa) return;
    setForm({
      id: completa.id,
      nome: completa.nome,
      note: completa.note ?? "",
      portate: completa.portate,
      righe: completa.ingredienti.map((i) => ({
        ingrediente_id: i.ingrediente_id,
        quantita_per_5: String(i.quantita_per_5),
      })),
      dosiPersone: String(completa.dosi_persone),
    });
  }

  function togglePortata(p: Portata) {
    setForm((f) => ({
      ...f,
      portate: f.portate.includes(p) ? f.portate.filter((x) => x !== p) : [...f.portate, p],
    }));
  }

  function aggiungiRiga(ing: Ingrediente) {
    setForm((f) => {
      if (f.righe.some((r) => r.ingrediente_id === ing.id)) return f;
      return { ...f, righe: [...f.righe, { ingrediente_id: ing.id, quantita_per_5: "" }] };
    });
  }

  function rimuoviRiga(ingredienteId: number) {
    setForm((f) => ({ ...f, righe: f.righe.filter((r) => r.ingrediente_id !== ingredienteId) }));
  }

  function aggiornaQuantita(ingredienteId: number, valore: string) {
    setForm((f) => ({
      ...f,
      righe: f.righe.map((r) => (r.ingrediente_id === ingredienteId ? { ...r, quantita_per_5: valore } : r)),
    }));
  }

  async function salva() {
    if (!form.nome.trim()) return setErrore("Il nome della ricetta è obbligatorio");
    if (form.portate.length === 0) return setErrore("Seleziona almeno una portata coperta");
    if (form.righe.length === 0) return setErrore("Aggiungi almeno un ingrediente");
    const dosiPersone = Number(form.dosiPersone);
    if (!form.dosiPersone || !Number.isInteger(dosiPersone) || dosiPersone <= 0) {
      return setErrore("Il numero di persone deve essere un intero positivo");
    }
    for (const r of form.righe) {
      if (!r.quantita_per_5 || Number.isNaN(Number(r.quantita_per_5))) {
        return setErrore("Inserisci una quantità valida per ogni ingrediente");
      }
    }
    setErrore(null);
    await salvaRicetta(form.id, {
      nome: form.nome,
      note: form.note,
      portate: form.portate,
      dosi_persone: dosiPersone,
      ingredienti: form.righe.map((r) => ({
        ingrediente_id: r.ingrediente_id,
        quantita_per_5: Number(r.quantita_per_5),
      })),
    });
    setForm(FORM_VUOTO);
    await ricaricaListe();
    notificaSalvato();
  }

  async function elimina(id: number) {
    const uso = await usoRicetta(id);
    const messaggio =
      uso.slotAssegnati > 0
        ? `Questa ricetta è assegnata a ${uso.slotAssegnati} pasto/i nel menù. Eliminandola verrà rimossa da quei pasti. Continuare?`
        : "Eliminare definitivamente questa ricetta?";
    if (!confirm(messaggio)) return;
    await eliminaRicetta(id);
    if (form.id === id) setForm(FORM_VUOTO);
    await ricaricaListe();
  }

  async function duplica(id: number) {
    await duplicaRicetta(id);
    await ricaricaListe();
  }

  if (!caricato) return <div className="page">Caricamento...</div>;

  return (
    <div className="page">
      <h1>Ricette</h1>
      <div className="two-columns">
        <div>
          <input
            className="search-input"
            placeholder="Cerca ricetta..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Portate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrate.map((r) => (
                <tr key={r.id}>
                  <td>{r.nome}</td>
                  <td>{etichettaPortate(r.portate)}</td>
                  <td className="row-actions">
                    <button onClick={() => apriModifica(r.id)}>Modifica</button>
                    <button onClick={() => duplica(r.id)}>Duplica</button>
                    <button className="danger" onClick={() => elimina(r.id)}>
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
              {filtrate.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    Nessuna ricetta trovata.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <button className="secondary" onClick={nuova}>
            + Nuova ricetta
          </button>
        </div>

        <div className="form-panel">
          <h2>{form.id === null ? "Nuova ricetta" : "Modifica ricetta"}</h2>
          <label>
            Nome
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label>
            Note
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>

          <label>
            Dosi per numero di persone (Cambusa)
            <input
              className="qty-input"
              value={form.dosiPersone}
              onChange={(e) => setForm({ ...form, dosiPersone: e.target.value })}
            />
          </label>

          <div className="field-block">
            <div className="field-label">Portate coperte</div>
            <div className="checkbox-grid">
              {PORTATE.map((p) => (
                <label key={p.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.portate.includes(p.value)}
                    onChange={() => togglePortata(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="field-block">
            <div className="field-label">Ingredienti (dosi per {form.dosiPersone || "5"} adulti)</div>
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Quantità</th>
                  <th>U.M.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.righe.map((r) => {
                  const ing = ingredienteById.get(r.ingrediente_id);
                  return (
                    <tr key={r.ingrediente_id}>
                      <td>{ing?.nome ?? "?"}</td>
                      <td>
                        <input
                          className="qty-input"
                          value={r.quantita_per_5}
                          onChange={(e) => aggiornaQuantita(r.ingrediente_id, e.target.value)}
                        />
                      </td>
                      <td>{ing?.unita_misura}</td>
                      <td>
                        <button className="danger" onClick={() => rimuoviRiga(r.ingrediente_id)}>
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <IngredienteAutocomplete
              ingredienti={ingredienti}
              categorie={categorie}
              onSelect={aggiungiRiga}
              onIngredienteCreato={(ing) => setIngredienti((prev) => [...prev, ing])}
              placeholder="Aggiungi ingrediente..."
            />
          </div>

          {errore && <div className="form-error">{errore}</div>}
          <div className="form-actions">
            <button onClick={salva}>{form.id === null ? "Crea ricetta" : "Salva modifiche"}</button>
            <button className="secondary" onClick={nuova}>
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
