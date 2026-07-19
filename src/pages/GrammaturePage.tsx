import { useEffect, useMemo, useState } from "react";
import { useCampo } from "../context/CampoContext";
import { useSaveFeedback } from "../context/SaveFeedbackContext";
import { caricaDatiCalcolo, DatiCalcolo } from "../data/calcoloDati";
import { calcolaGrammature, RigaGrammatura } from "../lib/calcolo";
import { formattaData, giornoSettimana } from "../lib/date";
import { formattaQuantita } from "../lib/numero";
import { esportaGrammatureExcel, RigaGrammaturaExport } from "../lib/exportExcel";
import { PastoTipo } from "../types/domain";

const PASTI_TIPI: PastoTipo[] = ["Colazione", "Pranzo", "Merenda", "Cena"];

export default function GrammaturePage() {
  const { campoAttivo, campoAttivoId } = useCampo();
  const notificaSalvato = useSaveFeedback();
  const [dati, setDati] = useState<DatiCalcolo | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [filtroGiorno, setFiltroGiorno] = useState<number | "tutti">("tutti");

  useEffect(() => {
    if (campoAttivoId === null || !campoAttivo) {
      setDati(null);
      setCaricato(true);
      return;
    }
    setCaricato(false);
    caricaDatiCalcolo(campoAttivoId, {
      coeffLc: campoAttivo.coeff_lc,
      coeffSg: campoAttivo.coeff_sg,
      coeffCambusa: campoAttivo.coeff_cambusa,
    }).then((d) => {
      setDati(d);
      setCaricato(true);
    });
  }, [campoAttivoId, campoAttivo?.coeff_lc, campoAttivo?.coeff_sg, campoAttivo?.coeff_cambusa]);

  const grammature = useMemo(() => {
    if (!dati) return [];
    return calcolaGrammature(dati.giorni, dati.pasti, dati.servizi, dati.ricette, dati.coefficienti);
  }, [dati]);

  const grammaturePerGiorno = useMemo(() => {
    const map = new Map<number, RigaGrammatura[]>();
    for (const r of grammature) {
      const lista = map.get(r.giornoId) ?? [];
      lista.push(r);
      map.set(r.giornoId, lista);
    }
    return map;
  }, [grammature]);

  if (campoAttivoId === null || !campoAttivo) {
    return (
      <div className="page">
        <h1>Grammature</h1>
        <p className="muted">Nessun campo attivo. Seleziona un campo in "Impostazioni campo".</p>
      </div>
    );
  }

  if (!caricato || !dati) return <div className="page">Caricamento...</div>;

  const giorniVisibili = dati.giorni.filter((g) => filtroGiorno === "tutti" || g.id === filtroGiorno);

  async function esportaExcel() {
    if (!dati || !campoAttivo) return;
    const righeExport: RigaGrammaturaExport[] = [];
    const giorniOrdinati = [...dati.giorni].sort((a, b) => a.data.localeCompare(b.data));
    for (const giorno of giorniOrdinati) {
      const etichettaGiorno = `${giornoSettimana(giorno.data)} ${formattaData(giorno.data)}`;
      const righeGiorno = grammaturePerGiorno.get(giorno.id) ?? [];
      for (const tipo of PASTI_TIPI) {
        const pasto = dati.pasti.find((p) => p.giornoId === giorno.id && p.tipo === tipo);
        if (!pasto) continue;
        const righePasto = righeGiorno.filter((r) => r.pastoId === pasto.id);
        const serviziPasto = dati.servizi.filter((s) => s.pastoId === pasto.id);
        for (const r of righePasto) {
          const ing = dati.ingredienti.get(r.ingredienteId);
          const categoria = ing ? dati.categorie.find((c) => c.id === ing.categoria_id) : undefined;
          const servizio = serviziPasto.find((s) => s.id === r.servizioId);
          const etichettaPasto =
            serviziPasto.length > 1 ? `${tipo} — ${servizio?.nota || "Campo"}` : tipo;
          righeExport.push({
            giorno: etichettaGiorno,
            pasto: etichettaPasto,
            portata: dati.etichettePortate.get(`${r.servizioId}-${r.ricettaId}`) ?? "",
            piatto: r.ricettaNome,
            categoria: categoria?.nome ?? "",
            ingrediente: ing?.nome ?? "?",
            um: ing?.unita_misura ?? "",
            quantita: r.quantita,
          });
        }
      }
      for (const s of dati.serate.filter((s) => s.giornoId === giorno.id)) {
        const ing = dati.ingredienti.get(s.ingredienteId);
        const categoria = ing ? dati.categorie.find((c) => c.id === ing.categoria_id) : undefined;
        righeExport.push({
          giorno: etichettaGiorno,
          pasto: "Serate/Totem",
          portata: "",
          piatto: "",
          categoria: categoria?.nome ?? "",
          ingrediente: ing?.nome ?? "?",
          um: ing?.unita_misura ?? "",
          quantita: s.quantita,
        });
      }
    }
    try {
      const salvato = await esportaGrammatureExcel(righeExport, `Grammature_${campoAttivo.nome.replace(/\s+/g, "")}.xlsx`);
      if (salvato) notificaSalvato();
    } catch (e) {
      alert("Errore durante l'esportazione: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="page">
      <h1>Grammature — {campoAttivo.nome}</h1>
      <div className="field-block" style={{ maxWidth: 260, marginBottom: 20 }}>
        <label>
          Filtra per giorno
          <select value={filtroGiorno} onChange={(e) => setFiltroGiorno(e.target.value === "tutti" ? "tutti" : Number(e.target.value))}>
            <option value="tutti">Tutti i giorni</option>
            {dati.giorni.map((g) => (
              <option key={g.id} value={g.id}>
                {giornoSettimana(g.data)} {formattaData(g.data)}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary" onClick={esportaExcel} style={{ marginTop: 10 }}>
          Esporta Excel
        </button>
      </div>

      {giorniVisibili.map((giorno) => {
        const righeGiorno = grammaturePerGiorno.get(giorno.id) ?? [];
        const serateGiorno = dati.serate.filter((s) => s.giornoId === giorno.id);

        return (
          <div key={giorno.id} className="grammature-giorno">
            <h2>
              {giornoSettimana(giorno.data)} {formattaData(giorno.data)}
            </h2>
            {PASTI_TIPI.map((tipo) => {
              const pasto = dati.pasti.find((p) => p.giornoId === giorno.id && p.tipo === tipo);
              if (!pasto) return null;
              const serviziPasto = dati.servizi.filter((s) => s.pastoId === pasto.id);
              const righePasto = righeGiorno.filter((r) => r.pastoId === pasto.id);
              if (righePasto.length === 0) return null;

              return (
                <div key={tipo} className="grammature-pasto">
                  <h3>{tipo}</h3>
                  {serviziPasto.map((servizio) => {
                    const righeServizio = righePasto.filter((r) => r.servizioId === servizio.id);
                    if (righeServizio.length === 0) return null;
                    const ricetteIds = Array.from(new Set(righeServizio.map((r) => r.ricettaId)));

                    return (
                      <div key={servizio.id} className="grammature-servizio">
                        {serviziPasto.length > 1 && (
                          <div className="grammature-servizio-label">
                            Servizio {servizio.nota ? `— ${servizio.nota}` : ""}
                          </div>
                        )}
                        {ricetteIds.map((ricettaId) => {
                          const righeRicetta = righeServizio.filter((r) => r.ricettaId === ricettaId);
                          const etichetta = dati.etichettePortate.get(`${servizio.id}-${ricettaId}`) ?? "";
                          return (
                            <div key={ricettaId} className="grammature-piatto">
                              <div className="grammature-piatto-titolo">
                                {etichetta && <span className="muted">{etichetta} — </span>}
                                {righeRicetta[0].ricettaNome}
                              </div>
                              <table className="data-table compact">
                                <thead>
                                  <tr>
                                    <th>Categoria</th>
                                    <th>Ingrediente</th>
                                    <th>U.M.</th>
                                    <th>Quantità</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {righeRicetta.map((r) => {
                                    const ing = dati.ingredienti.get(r.ingredienteId);
                                    const categoria = ing ? dati.categorie.find((c) => c.id === ing.categoria_id) : null;
                                    return (
                                      <tr key={r.ingredienteId}>
                                        <td>{categoria?.nome ?? "—"}</td>
                                        <td>{ing?.nome ?? "?"}</td>
                                        <td>{ing?.unita_misura}</td>
                                        <td>{formattaQuantita(r.quantita)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {serateGiorno.length > 0 && (
              <div className="grammature-pasto">
                <h3>Serate / Totem</h3>
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th>U.M.</th>
                      <th>Quantità</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serateGiorno.map((s, idx) => {
                      const ing = dati.ingredienti.get(s.ingredienteId);
                      return (
                        <tr key={idx}>
                          <td>{ing?.nome ?? "?"}</td>
                          <td>{ing?.unita_misura}</td>
                          <td>{formattaQuantita(s.quantita)}</td>
                          <td>{s.note ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
