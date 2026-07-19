import { useEffect, useMemo, useState } from "react";
import { useCampo } from "../context/CampoContext";
import { useSaveFeedback } from "../context/SaveFeedbackContext";
import {
  aggiornaAcquistoVario,
  aggiungiAcquistoVario,
  eliminaAcquistoVario,
  listAcquistiVari,
} from "../data/acquistiVari";
import { listCategorie } from "../data/categorie";
import { listIngredienti } from "../data/ingredienti";
import EditableNumberCell from "../components/EditableNumberCell";
import IngredienteAutocomplete from "../components/IngredienteAutocomplete";
import { AcquistoVario, CategoriaMerceologica, Ingrediente } from "../types/domain";

export default function AcquistiVariPage() {
  const { campoAttivo, campoAttivoId } = useCampo();
  const notificaSalvato = useSaveFeedback();
  const [righe, setRighe] = useState<AcquistoVario[]>([]);
  const [ingredienti, setIngredienti] = useState<Ingrediente[]>([]);
  const [categorie, setCategorie] = useState<CategoriaMerceologica[]>([]);
  const [caricato, setCaricato] = useState(false);

  async function ricarica() {
    if (campoAttivoId === null) {
      setRighe([]);
      setCaricato(true);
      return;
    }
    const [r, i, c] = await Promise.all([listAcquistiVari(campoAttivoId), listIngredienti(), listCategorie()]);
    setRighe(r);
    setIngredienti(i);
    setCategorie(c);
    setCaricato(true);
  }

  useEffect(() => {
    setCaricato(false);
    ricarica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campoAttivoId]);

  const ingredientiById = useMemo(() => {
    const map = new Map<number, Ingrediente>();
    for (const i of ingredienti) map.set(i.id, i);
    return map;
  }, [ingredienti]);

  async function aggiungi(ingredienteId: number) {
    if (campoAttivoId === null) return;
    await aggiungiAcquistoVario(campoAttivoId, ingredienteId, 0);
    await ricarica();
    notificaSalvato();
  }

  async function aggiorna(id: number, quantita: number, note: string | null) {
    await aggiornaAcquistoVario(id, quantita, note);
    await ricarica();
    notificaSalvato();
  }

  async function rimuovi(id: number) {
    await eliminaAcquistoVario(id);
    await ricarica();
    notificaSalvato();
  }

  if (campoAttivoId === null) {
    return (
      <div className="page">
        <h1>Acquisti vari</h1>
        <p className="muted">Nessun campo attivo. Seleziona un campo in "Impostazioni campo".</p>
      </div>
    );
  }

  if (!caricato) return <div className="page">Caricamento...</div>;

  return (
    <div className="page">
      <h1>Acquisti vari — {campoAttivo?.nome}</h1>
      <p className="muted">
        Roba che non c'entra col menù: bevande, detersivi, stoviglie. Confluisce nella lista della spesa.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Ingrediente</th>
            <th>U.M.</th>
            <th>Quantità</th>
            <th>Note</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => {
            const ing = ingredientiById.get(r.ingrediente_id);
            return (
              <tr key={r.id}>
                <td>{ing?.nome ?? "?"}</td>
                <td>{ing?.unita_misura}</td>
                <td>
                  <EditableNumberCell valore={r.quantita} onCommit={(n) => aggiorna(r.id, n, r.note)} />
                </td>
                <td>
                  <input
                    className="lista-spesa-nota-input"
                    defaultValue={r.note ?? ""}
                    onBlur={(e) => aggiorna(r.id, r.quantita, e.target.value.trim() || null)}
                  />
                </td>
                <td>
                  <button className="danger" onClick={() => rimuovi(r.id)}>
                    Elimina
                  </button>
                </td>
              </tr>
            );
          })}
          {righe.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Nessun acquisto aggiunto.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ marginTop: 16, maxWidth: 360 }}>
        <IngredienteAutocomplete
          ingredienti={ingredienti}
          categorie={categorie}
          onSelect={(ing) => aggiungi(ing.id)}
          onIngredienteCreato={(ing) => setIngredienti((prev) => [...prev, ing])}
          placeholder="+ aggiungi ingrediente..."
        />
      </div>
    </div>
  );
}
