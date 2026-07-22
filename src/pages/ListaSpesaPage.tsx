import { useEffect, useMemo, useState } from "react";
import { useCampo } from "../context/CampoContext";
import { useSaveFeedback } from "../context/SaveFeedbackContext";
import { caricaDatiCalcolo, DatiCalcolo } from "../data/calcoloDati";
import { impostaNotaListaSpesa } from "../data/listaSpesaNote";
import {
  aggregaTotaliPerIngrediente,
  calcolaDaComprare,
  calcolaGrammature,
  raggruppaPerRicetta,
  RigaImpiegoRicetta,
} from "../lib/calcolo";
import { formattaQuantita } from "../lib/numero";
import { esportaListaSpesaExcel } from "../lib/exportExcel";
import ImpiegoIngredienteButton from "../components/ImpiegoIngredienteButton";

interface RigaListaSpesa {
  ingredienteId: number;
  categoriaNome: string;
  categoriaOrdine: number;
  nome: string;
  unitaMisura: string;
  totale: number;
  magazzino: number;
  daComprare: number;
  nota: string;
}

export default function ListaSpesaPage() {
  const { campoAttivo, campoAttivoId } = useCampo();
  const notificaSalvato = useSaveFeedback();
  const [dati, setDati] = useState<DatiCalcolo | null>(null);
  const [caricato, setCaricato] = useState(false);

  async function ricarica() {
    if (campoAttivoId === null || !campoAttivo) {
      setDati(null);
      setCaricato(true);
      return;
    }
    setCaricato(false);
    const d = await caricaDatiCalcolo(campoAttivoId, {
      coeffLc: campoAttivo.coeff_lc,
      coeffSg: campoAttivo.coeff_sg,
      coeffCambusa: campoAttivo.coeff_cambusa,
    });
    setDati(d);
    setCaricato(true);
  }

  useEffect(() => {
    ricarica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campoAttivoId, campoAttivo?.coeff_lc, campoAttivo?.coeff_sg, campoAttivo?.coeff_cambusa]);

  const grammature = useMemo(() => {
    if (!dati) return [];
    return calcolaGrammature(dati.giorni, dati.pasti, dati.servizi, dati.ricette, dati.coefficienti);
  }, [dati]);

  const impiegoPerIngrediente = useMemo(() => {
    const mappa = new Map<number, RigaImpiegoRicetta[]>();
    for (const r of grammature) {
      if (!mappa.has(r.ingredienteId)) {
        mappa.set(r.ingredienteId, raggruppaPerRicetta(grammature, r.ingredienteId));
      }
    }
    return mappa;
  }, [grammature]);

  const righe = useMemo<RigaListaSpesa[]>(() => {
    if (!dati || !campoAttivo) return [];
    const totali = aggregaTotaliPerIngrediente(grammature, dati.serate, dati.acquistiVari);
    const considerareMagazzino = !!campoAttivo.considera_magazzino;

    const risultato: RigaListaSpesa[] = [];
    for (const [ingredienteId, totale] of totali) {
      if (totale === 0) continue;
      const ing = dati.ingredienti.get(ingredienteId);
      if (!ing) continue;
      const categoria = dati.categorie.find((c) => c.id === ing.categoria_id);
      const magazzino = dati.magazzino.get(ingredienteId) ?? 0;
      risultato.push({
        ingredienteId,
        categoriaNome: categoria?.nome ?? "Varie",
        categoriaOrdine: categoria?.ordine ?? 999,
        nome: ing.nome,
        unitaMisura: ing.unita_misura,
        totale,
        magazzino,
        daComprare: calcolaDaComprare(totale, magazzino, considerareMagazzino),
        nota: dati.noteListaSpesa.get(ingredienteId) ?? "",
      });
    }
    risultato.sort((a, b) => a.categoriaOrdine - b.categoriaOrdine || a.nome.localeCompare(b.nome, "it"));
    return risultato;
  }, [dati, campoAttivo, grammature]);

  async function salvaNota(ingredienteId: number, nota: string) {
    if (campoAttivoId === null) return;
    await impostaNotaListaSpesa(campoAttivoId, ingredienteId, nota);
    notificaSalvato();
  }

  if (campoAttivoId === null || !campoAttivo) {
    return (
      <div className="page">
        <h1>Lista spesa</h1>
        <p className="muted">Nessun campo attivo. Seleziona un campo in "Impostazioni campo".</p>
      </div>
    );
  }

  if (!caricato || !dati) return <div className="page">Caricamento...</div>;

  let categoriaCorrente = "";

  async function esportaExcel() {
    try {
      const salvato = await esportaListaSpesaExcel(
        righe.map((r) => ({
          categoria: r.categoriaNome,
          ingrediente: r.nome,
          um: r.unitaMisura,
          totale: r.totale,
          magazzino: r.magazzino,
          daComprare: r.daComprare,
          note: r.nota,
        })),
        `ListaSpesa_${campoAttivo!.nome.replace(/\s+/g, "")}.xlsx`
      );
      if (salvato) notificaSalvato();
    } catch (e) {
      alert("Errore durante l'esportazione: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="page">
      <h1>Lista spesa — {campoAttivo.nome}</h1>
      <p className="muted">
        {campoAttivo.considera_magazzino
          ? "Il magazzino viene scalato dal totale per calcolare quanto comprare."
          : "Il magazzino non viene scalato (flag disattivato in Impostazioni campo): \"Da comprare\" coincide con il totale."}
      </p>
      <button className="secondary" onClick={esportaExcel} style={{ marginBottom: 16 }}>
        Esporta Excel
      </button>
      <table className="data-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Ingrediente</th>
            <th>U.M.</th>
            <th>Totale</th>
            <th>Magazzino</th>
            <th>Da comprare</th>
            <th></th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => {
            const mostraCategoria = r.categoriaNome !== categoriaCorrente;
            categoriaCorrente = r.categoriaNome;
            return (
              <tr key={r.ingredienteId} className={mostraCategoria ? "categoria-inizio" : ""}>
                <td>{mostraCategoria ? r.categoriaNome : ""}</td>
                <td>{r.nome}</td>
                <td>{r.unitaMisura}</td>
                <td>{formattaQuantita(r.totale)}</td>
                <td>{formattaQuantita(r.magazzino)}</td>
                <td>
                  <strong>{formattaQuantita(r.daComprare)}</strong>
                </td>
                <td>
                  <ImpiegoIngredienteButton
                    impiego={impiegoPerIngrediente.get(r.ingredienteId) ?? []}
                    unitaMisura={r.unitaMisura}
                  />
                </td>
                <td>
                  <input
                    className="lista-spesa-nota-input"
                    defaultValue={r.nota}
                    onBlur={(e) => salvaNota(r.ingredienteId, e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
          {righe.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                Nessun ingrediente nel campo: componi il menù o aggiungi serate/acquisti vari.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
