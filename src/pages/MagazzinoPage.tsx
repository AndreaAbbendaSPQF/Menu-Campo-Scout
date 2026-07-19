import { useEffect, useMemo, useState } from "react";
import { listCategorie } from "../data/categorie";
import { listIngredienti } from "../data/ingredienti";
import { impostaQuantitaMagazzino, listMagazzino } from "../data/magazzino";
import { useSaveFeedback } from "../context/SaveFeedbackContext";
import EditableNumberCell from "../components/EditableNumberCell";
import { normalizeForCompare } from "../lib/text";
import { CategoriaMerceologica, Ingrediente, MagazzinoRiga } from "../types/domain";

interface RigaMagazzino {
  ingrediente: Ingrediente;
  categoriaNome: string;
  categoriaOrdine: number;
  quantita: number;
  note: string;
}

export default function MagazzinoPage() {
  const notificaSalvato = useSaveFeedback();
  const [ingredienti, setIngredienti] = useState<Ingrediente[]>([]);
  const [categorie, setCategorie] = useState<CategoriaMerceologica[]>([]);
  const [magazzino, setMagazzino] = useState<MagazzinoRiga[]>([]);
  const [ricerca, setRicerca] = useState("");
  const [vediTutto, setVediTutto] = useState(false);
  const [caricato, setCaricato] = useState(false);

  async function ricarica() {
    const [i, c, m] = await Promise.all([listIngredienti(), listCategorie(), listMagazzino()]);
    setIngredienti(i);
    setCategorie(c);
    setMagazzino(m);
    setCaricato(true);
  }

  useEffect(() => {
    ricarica();
  }, []);

  const righe = useMemo<RigaMagazzino[]>(() => {
    const magazzinoByIngrediente = new Map(magazzino.map((m) => [m.ingrediente_id, m]));
    const categorieById = new Map(categorie.map((c) => [c.id, c]));
    return ingredienti.map((ing) => {
      const riga = magazzinoByIngrediente.get(ing.id);
      const categoria = categorieById.get(ing.categoria_id);
      return {
        ingrediente: ing,
        categoriaNome: categoria?.nome ?? "Varie",
        categoriaOrdine: categoria?.ordine ?? 999,
        quantita: riga?.quantita ?? 0,
        note: riga?.note ?? "",
      };
    });
  }, [ingredienti, magazzino, categorie]);

  const filtrate = useMemo(() => {
    const target = normalizeForCompare(ricerca);
    // Una ricerca attiva cerca sempre su tutta l'anagrafica (anche a quantità 0),
    // così si trova un ingrediente anche la prima volta che lo si mette a magazzino.
    const lista = target
      ? righe.filter((r) => r.ingrediente.nome_normalizzato.includes(target))
      : righe.filter((r) => vediTutto || r.quantita > 0);
    return [...lista].sort(
      (a, b) => a.categoriaOrdine - b.categoriaOrdine || a.ingrediente.nome.localeCompare(b.ingrediente.nome, "it")
    );
  }, [righe, ricerca, vediTutto]);

  async function salvaQuantita(ingredienteId: number, quantita: number, noteAttuali: string) {
    await impostaQuantitaMagazzino(ingredienteId, quantita, noteAttuali || null);
    await ricarica();
    notificaSalvato();
  }

  async function salvaNote(ingredienteId: number, quantitaAttuale: number, note: string) {
    await impostaQuantitaMagazzino(ingredienteId, quantitaAttuale, note || null);
    await ricarica();
    notificaSalvato();
  }

  if (!caricato) return <div className="page">Caricamento...</div>;

  let categoriaCorrente = "";

  return (
    <div className="page">
      <h1>Magazzino</h1>
      <p className="muted">Magazzino condiviso tra tutti i campi. Le quantità si aggiornano subito.</p>
      <div className="magazzino-filtri">
        <input
          className="search-input"
          placeholder="Cerca ingrediente..."
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
        />
        <label className="checkbox-label">
          <input type="checkbox" checked={vediTutto} onChange={(e) => setVediTutto(e.target.checked)} />
          Vedi tutto (anche a quantità 0)
        </label>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Ingrediente</th>
            <th>U.M.</th>
            <th>Quantità</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {filtrate.map((r) => {
            const mostraCategoria = r.categoriaNome !== categoriaCorrente;
            categoriaCorrente = r.categoriaNome;
            return (
              <tr key={r.ingrediente.id} className={mostraCategoria ? "categoria-inizio" : ""}>
                <td>{mostraCategoria ? r.categoriaNome : ""}</td>
                <td>{r.ingrediente.nome}</td>
                <td>{r.ingrediente.unita_misura}</td>
                <td>
                  <EditableNumberCell
                    valore={r.quantita}
                    onCommit={(n) => salvaQuantita(r.ingrediente.id, n, r.note)}
                  />
                </td>
                <td>
                  <input
                    className="lista-spesa-nota-input"
                    defaultValue={r.note}
                    onBlur={(e) => salvaNote(r.ingrediente.id, r.quantita, e.target.value.trim())}
                  />
                </td>
              </tr>
            );
          })}
          {filtrate.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                {!ricerca.trim() && !vediTutto
                  ? 'Nessun materiale a magazzino. Spunta "Vedi tutto" per vedere tutti gli ingredienti.'
                  : "Nessun ingrediente trovato."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
