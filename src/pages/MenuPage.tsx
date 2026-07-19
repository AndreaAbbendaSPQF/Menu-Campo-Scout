import { useEffect, useMemo, useState } from "react";
import { useCampo } from "../context/CampoContext";
import { useSaveFeedback } from "../context/SaveFeedbackContext";
import {
  aggiornaServizio,
  aggiornaSerata,
  aggiungiRicettaSlot,
  aggiungiSerata,
  caricaGriglia,
  dividiPasto,
  eliminaSerata,
  GrigliaData,
  rimuoviRicettaSlot,
  unisciPasto,
} from "../data/menu";
import { listRicetteConPortate, RicettaConPortate } from "../data/ricette";
import { listIngredienti } from "../data/ingredienti";
import { listCategorie } from "../data/categorie";
import { formattaData, giornoSettimana } from "../lib/date";
import { ETICHETTE_PORTATA, raggruppaSlot } from "../lib/portate";
import RicettaSlotPicker from "../components/RicettaSlotPicker";
import IngredienteAutocomplete from "../components/IngredienteAutocomplete";
import EditableNumberCell from "../components/EditableNumberCell";
import { esportaMenuPdf } from "../lib/exportMenuPdf";
import {
  CategoriaMerceologica,
  Giorno,
  Ingrediente,
  Pasto,
  PastoTipo,
  Portata,
  Serata,
  Servizio,
} from "../types/domain";

const PASTI_TIPI: PastoTipo[] = ["Colazione", "Pranzo", "Merenda", "Cena"];

export default function MenuPage() {
  const { campoAttivo, campoAttivoId } = useCampo();
  const notificaSalvato = useSaveFeedback();
  const [griglia, setGriglia] = useState<GrigliaData | null>(null);
  const [ricette, setRicette] = useState<RicettaConPortate[]>([]);
  const [ingredienti, setIngredienti] = useState<Ingrediente[]>([]);
  const [categorie, setCategorie] = useState<CategoriaMerceologica[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [divisioneAperta, setDivisioneAperta] = useState<number | null>(null);
  const [gruppiDivisione, setGruppiDivisione] = useState({ lc: false, sg: false, cambusa: false });

  async function ricarica() {
    if (campoAttivoId === null) return;
    const [g, r, i, c] = await Promise.all([
      caricaGriglia(campoAttivoId),
      listRicetteConPortate(),
      listIngredienti(),
      listCategorie(),
    ]);
    setGriglia(g);
    setRicette(r);
    setIngredienti(i);
    setCategorie(c);
    setCaricato(true);
  }

  useEffect(() => {
    setCaricato(false);
    ricarica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campoAttivoId]);

  const ricetteById = useMemo(() => {
    const map = new Map<number, RicettaConPortate>();
    for (const r of ricette) map.set(r.id, r);
    return map;
  }, [ricette]);

  const ingredientiById = useMemo(() => {
    const map = new Map<number, Ingrediente>();
    for (const i of ingredienti) map.set(i.id, i);
    return map;
  }, [ingredienti]);

  function ricetteCompatibili(portata: Portata): RicettaConPortate[] {
    return ricette.filter((r) => r.portate.includes(portata));
  }

  async function assegna(servizioId: number, pastoTipo: PastoTipo, ricettaId: number) {
    await aggiungiRicettaSlot(servizioId, pastoTipo, ricettaId);
    await ricarica();
    notificaSalvato();
  }

  async function rimuovi(servizioId: number, ricettaId: number) {
    await rimuoviRicettaSlot(servizioId, ricettaId);
    await ricarica();
    notificaSalvato();
  }

  async function cambiaPartecipazione(servizio: Servizio, patch: Partial<Servizio>) {
    await aggiornaServizio(servizio.id, {
      partecipa_lc: !!(patch.partecipa_lc ?? servizio.partecipa_lc),
      partecipa_sg: !!(patch.partecipa_sg ?? servizio.partecipa_sg),
      partecipa_cambusa: !!(patch.partecipa_cambusa ?? servizio.partecipa_cambusa),
      nota: patch.nota !== undefined ? patch.nota : servizio.nota,
    });
    await ricarica();
    notificaSalvato();
  }

  function apriDivisione(pastoId: number) {
    setDivisioneAperta(pastoId);
    setGruppiDivisione({ lc: false, sg: false, cambusa: false });
  }

  async function confermaDivisione(pasto: Pasto) {
    const { lc, sg, cambusa } = gruppiDivisione;
    if (!lc && !sg && !cambusa) return;
    await dividiPasto(pasto.id, pasto.tipo, lc, sg, cambusa);
    setDivisioneAperta(null);
    await ricarica();
    notificaSalvato();
  }

  async function unisci(pastoId: number) {
    if (!confirm("Unire i servizi di questo pasto? Le ricette assegnate ai servizi secondari andranno perse.")) return;
    await unisciPasto(pastoId);
    await ricarica();
    notificaSalvato();
  }

  async function aggiungiRigaSerata(giornoId: number, ingredienteId: number) {
    await aggiungiSerata(giornoId, ingredienteId, 0);
    await ricarica();
    notificaSalvato();
  }

  async function rimuoviRigaSerata(id: number) {
    await eliminaSerata(id);
    await ricarica();
    notificaSalvato();
  }

  async function aggiornaRigaSerata(id: number, quantita: number, note: string | null) {
    await aggiornaSerata(id, quantita, note);
    await ricarica();
    notificaSalvato();
  }

  if (campoAttivoId === null) {
    return (
      <div className="page">
        <h1>Menù</h1>
        <p className="muted">
          Nessun campo attivo. Crea o seleziona un campo in "Impostazioni campo" per iniziare a comporre il menù.
        </p>
      </div>
    );
  }

  if (!caricato || !griglia) return <div className="page">Caricamento...</div>;

  const { giorni, pasti, servizi, slots, slotRicette, serate } = griglia;

  async function esportaPdf() {
    if (!campoAttivo) return;
    try {
      const salvato = await esportaMenuPdf(campoAttivo);
      if (salvato) notificaSalvato();
    } catch (e) {
      alert("Errore durante l'esportazione: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="page">
      <h1>Menù — {campoAttivo?.nome}</h1>
      <button className="secondary" onClick={esportaPdf} style={{ marginBottom: 12 }}>
        Esporta PDF
      </button>
      <div className="menu-grid-wrapper">
        <table className="menu-grid">
          <thead>
            <tr>
              <th className="menu-grid-corner"></th>
              {giorni.map((g) => (
                <th key={g.id} className="menu-grid-giorno-header">
                  <div className="menu-giorno-data">
                    {giornoSettimana(g.data)} {formattaData(g.data)}
                  </div>
                  <div className="menu-giorno-presenze">
                    L/C {g.n_lc} · S/G {g.n_sg} · Cambusa {g.n_cambusa}
                  </div>
                  {g.note_lc && <div className="menu-giorno-nota">L/C: {g.note_lc}</div>}
                  {g.note_sg && <div className="menu-giorno-nota">S/G: {g.note_sg}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PASTI_TIPI.map((tipo) => (
              <tr key={tipo}>
                <th className="menu-grid-pasto-label">{tipo}</th>
                {giorni.map((g) => {
                  const pasto = pasti.find((p) => p.giorno_id === g.id && p.tipo === tipo);
                  if (!pasto) return <td key={g.id}></td>;
                  const serviziPasto = servizi
                    .filter((s) => s.pasto_id === pasto.id)
                    .sort((a, b) => a.ordine - b.ordine);
                  return (
                    <td key={g.id} className="menu-grid-cell">
                      <div className="pasto-servizi">
                        {serviziPasto.map((servizio) => {
                          const slotServizio = slots.filter((s) => s.servizio_id === servizio.id);
                          const slotIdsServizio = new Set(slotServizio.map((s) => s.id));
                          const slotRicetteServizio = slotRicette.filter((sr) => slotIdsServizio.has(sr.servizio_slot_id));
                          const gruppi = raggruppaSlot(slotServizio, slotRicetteServizio, tipo);
                          return (
                            <div key={servizio.id} className="servizio-blocco">
                              {serviziPasto.length > 1 && (
                                <div className="servizio-partecipanti">
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={!!servizio.partecipa_lc}
                                      onChange={(e) => cambiaPartecipazione(servizio, { partecipa_lc: e.target.checked ? 1 : 0 })}
                                    />
                                    L/C
                                  </label>
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={!!servizio.partecipa_sg}
                                      onChange={(e) => cambiaPartecipazione(servizio, { partecipa_sg: e.target.checked ? 1 : 0 })}
                                    />
                                    S/G
                                  </label>
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={!!servizio.partecipa_cambusa}
                                      onChange={(e) => cambiaPartecipazione(servizio, { partecipa_cambusa: e.target.checked ? 1 : 0 })}
                                    />
                                    Cambusa
                                  </label>
                                </div>
                              )}
                              <input
                                className="servizio-nota-input"
                                placeholder="Nota (es. Gara cucina S/G)"
                                defaultValue={servizio.nota ?? ""}
                                onBlur={(e) => cambiaPartecipazione(servizio, { nota: e.target.value.trim() || null })}
                              />
                              {gruppi.map((gruppo, idx) => (
                                <div className="slot-row" key={idx}>
                                  <span className="slot-row-label">
                                    {gruppo.portate.map((p) => ETICHETTE_PORTATA[p]).join(" + ")}
                                  </span>
                                  <RicettaSlotPicker
                                    ricetteAssegnate={gruppo.ricetteIds
                                      .map((id) => ricetteById.get(id))
                                      .filter((r): r is RicettaConPortate => !!r)}
                                    ricetteCompatibili={ricetteCompatibili(gruppo.portate[0])}
                                    onAssegna={(id) => assegna(servizio.id, tipo, id)}
                                    onRimuovi={(id) => rimuovi(servizio.id, id)}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                      <div className="pasto-azioni">
                        {serviziPasto.length === 1 ? (
                          divisioneAperta === pasto.id ? (
                            <div className="divisione-form">
                              <div className="field-label">Sposta nel nuovo servizio:</div>
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={gruppiDivisione.lc}
                                  onChange={(e) => setGruppiDivisione({ ...gruppiDivisione, lc: e.target.checked })}
                                />
                                L/C
                              </label>
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={gruppiDivisione.sg}
                                  onChange={(e) => setGruppiDivisione({ ...gruppiDivisione, sg: e.target.checked })}
                                />
                                S/G
                              </label>
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={gruppiDivisione.cambusa}
                                  onChange={(e) => setGruppiDivisione({ ...gruppiDivisione, cambusa: e.target.checked })}
                                />
                                Cambusa
                              </label>
                              <div className="form-actions">
                                <button onClick={() => confermaDivisione(pasto)}>Conferma</button>
                                <button className="secondary" onClick={() => setDivisioneAperta(null)}>
                                  Annulla
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button className="secondary piccolo" onClick={() => apriDivisione(pasto.id)}>
                              Dividi pasto
                            </button>
                          )
                        ) : (
                          <button className="secondary piccolo" onClick={() => unisci(pasto.id)}>
                            Unisci pasto
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className="menu-grid-pasto-label">Serate / Totem</th>
              {giorni.map((g) => {
                const serateGiorno = serate.filter((s) => s.giorno_id === g.id);
                return (
                  <td key={g.id} className="menu-grid-cell">
                    <SerataEditor
                      giorno={g}
                      serate={serateGiorno}
                      ingredientiById={ingredientiById}
                      ingredienti={ingredienti}
                      categorie={categorie}
                      onAggiungiIngrediente={(ing) => setIngredienti((prev) => [...prev, ing])}
                      onAggiungi={(ingredienteId) => aggiungiRigaSerata(g.id, ingredienteId)}
                      onRimuovi={rimuoviRigaSerata}
                      onAggiorna={aggiornaRigaSerata}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SerataEditorProps {
  giorno: Giorno;
  serate: Serata[];
  ingredientiById: Map<number, Ingrediente>;
  ingredienti: Ingrediente[];
  categorie: CategoriaMerceologica[];
  onAggiungiIngrediente: (ing: Ingrediente) => void;
  onAggiungi: (ingredienteId: number) => void;
  onRimuovi: (id: number) => void;
  onAggiorna: (id: number, quantita: number, note: string | null) => void;
}

function SerataEditor({
  serate,
  ingredientiById,
  ingredienti,
  categorie,
  onAggiungiIngrediente,
  onAggiungi,
  onRimuovi,
  onAggiorna,
}: SerataEditorProps) {
  return (
    <div className="serata-editor">
      {serate.map((s) => (
        <div key={s.id} className="serata-riga">
          <span>{ingredientiById.get(s.ingrediente_id)?.nome ?? "?"}</span>
          <EditableNumberCell
            className="qty-input piccolo"
            valore={s.quantita}
            onCommit={(n) => onAggiorna(s.id, n, s.note)}
          />
          <span className="muted">{ingredientiById.get(s.ingrediente_id)?.unita_misura}</span>
          <input
            className="serata-nota-input"
            placeholder="Note"
            defaultValue={s.note ?? ""}
            onBlur={(e) => onAggiorna(s.id, s.quantita, e.target.value.trim() || null)}
          />
          <button className="danger piccolo" onClick={() => onRimuovi(s.id)}>
            ×
          </button>
        </div>
      ))}
      <IngredienteAutocomplete
        ingredienti={ingredienti}
        categorie={categorie}
        onSelect={(ing) => onAggiungi(ing.id)}
        onIngredienteCreato={onAggiungiIngrediente}
        placeholder="+ ingrediente..."
      />
    </div>
  );
}
