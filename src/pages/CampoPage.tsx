import { useEffect, useState } from "react";
import { useCampo } from "../context/CampoContext";
import { useSaveFeedback } from "../context/SaveFeedbackContext";
import EditableNumberCell from "../components/EditableNumberCell";
import {
  AggiornamentoGiorno,
  aggiornaImpostazioniCampo,
  creaCampo,
  duplicaCampo,
  eliminaCampo,
  listGiorni,
  salvaGiorno,
} from "../data/campi";
import { formattaData, giornoSettimana } from "../lib/date";
import { Campo, Giorno } from "../types/domain";

interface FormState {
  nome: string;
  data_inizio: string;
  data_fine: string;
  coeff_lc: string;
  coeff_sg: string;
  coeff_cambusa: string;
  considera_magazzino: boolean;
}

function formDaCampo(c: Campo | null): FormState {
  if (!c) {
    return { nome: "", data_inizio: "", data_fine: "", coeff_lc: "0.8", coeff_sg: "0.9", coeff_cambusa: "1.0", considera_magazzino: true };
  }
  return {
    nome: c.nome,
    data_inizio: c.data_inizio,
    data_fine: c.data_fine,
    coeff_lc: String(c.coeff_lc),
    coeff_sg: String(c.coeff_sg),
    coeff_cambusa: String(c.coeff_cambusa),
    considera_magazzino: !!c.considera_magazzino,
  };
}

export default function CampoPage() {
  const { campi, campoAttivo, campoAttivoId, setCampoAttivoId, ricaricaCampi, caricato } = useCampo();
  const notificaSalvato = useSaveFeedback();
  const [modalitaNuovo, setModalitaNuovo] = useState(false);
  const [form, setForm] = useState<FormState>(formDaCampo(null));
  const [errore, setErrore] = useState<string | null>(null);
  const [giorni, setGiorni] = useState<Giorno[]>([]);
  const [duplicaAperto, setDuplicaAperto] = useState(false);
  const [duplicaForm, setDuplicaForm] = useState({ nome: "", data_inizio: "", data_fine: "" });

  useEffect(() => {
    setForm(formDaCampo(campoAttivo));
    setModalitaNuovo(false);
  }, [campoAttivo?.id]);

  useEffect(() => {
    if (campoAttivoId === null) {
      setGiorni([]);
      return;
    }
    listGiorni(campoAttivoId).then(setGiorni);
  }, [campoAttivoId]);

  function nuovoCampo() {
    setErrore(null);
    setModalitaNuovo(true);
    setForm(formDaCampo(null));
  }

  async function salvaImpostazioni() {
    if (!form.nome.trim()) return setErrore("Il nome del campo è obbligatorio");
    if (!form.data_inizio || !form.data_fine) return setErrore("Le date di inizio e fine sono obbligatorie");
    if (form.data_fine < form.data_inizio) return setErrore("La data di fine deve essere successiva alla data di inizio");

    const input = {
      nome: form.nome,
      data_inizio: form.data_inizio,
      data_fine: form.data_fine,
      coeff_lc: Number(form.coeff_lc),
      coeff_sg: Number(form.coeff_sg),
      coeff_cambusa: Number(form.coeff_cambusa),
      considera_magazzino: form.considera_magazzino,
    };
    setErrore(null);

    if (modalitaNuovo) {
      const id = await creaCampo(input);
      await ricaricaCampi();
      setCampoAttivoId(id);
      setModalitaNuovo(false);
    } else if (campoAttivoId !== null) {
      await aggiornaImpostazioniCampo(campoAttivoId, input);
      await ricaricaCampi();
      setGiorni(await listGiorni(campoAttivoId));
    }
    notificaSalvato();
  }

  async function elimina() {
    if (campoAttivoId === null) return;
    if (!confirm(`Eliminare definitivamente il campo "${campoAttivo?.nome}"? Verranno rimossi menù, giorni e acquisti collegati.`)) return;
    await eliminaCampo(campoAttivoId);
    await ricaricaCampi();
  }

  function aggiornaCampoGiorno(id: number, patch: Partial<AggiornamentoGiorno>) {
    setGiorni((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  async function persistiGiorno(g: Giorno) {
    await salvaGiorno(g.id, {
      coeff_giornaliero: g.coeff_giornaliero,
      n_lc: g.n_lc,
      n_sg: g.n_sg,
      n_cambusa: g.n_cambusa,
      note_lc: g.note_lc,
      note_sg: g.note_sg,
    });
    notificaSalvato();
  }

  async function committiCampoGiorno(id: number, patch: Partial<AggiornamentoGiorno>) {
    const attuale = giorni.find((g) => g.id === id);
    if (!attuale) return;
    const aggiornato = { ...attuale, ...patch };
    aggiornaCampoGiorno(id, patch);
    await persistiGiorno(aggiornato);
  }

  function apriDuplica() {
    if (!campoAttivo) return;
    setDuplicaForm({ nome: `${campoAttivo.nome} (copia)`, data_inizio: "", data_fine: "" });
    setDuplicaAperto(true);
  }

  async function confermaDuplica() {
    if (campoAttivoId === null) return;
    if (!duplicaForm.nome.trim() || !duplicaForm.data_inizio || !duplicaForm.data_fine) return;
    const nuovoId = await duplicaCampo(campoAttivoId, duplicaForm.nome, duplicaForm.data_inizio, duplicaForm.data_fine);
    await ricaricaCampi();
    setCampoAttivoId(nuovoId);
    setDuplicaAperto(false);
    notificaSalvato();
  }

  if (!caricato) return <div className="page">Caricamento...</div>;

  return (
    <div className="page">
      <h1>Impostazioni campo</h1>
      <p className="muted">
        Se hai più di un campo (es. anni diversi), usa "Seleziona" per scegliere quello su cui lavorare: menù,
        grammature e lista della spesa si riferiscono sempre al campo attivo.
      </p>
      <div className="two-columns">
        <div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campi.map((c) => (
                <tr key={c.id} className={c.id === campoAttivoId ? "riga-attiva" : ""}>
                  <td>{c.nome}</td>
                  <td>
                    {formattaData(c.data_inizio)} – {formattaData(c.data_fine)}
                  </td>
                  <td className="row-actions">
                    {c.id === campoAttivoId ? (
                      <span className="badge-attivo">Campo attivo</span>
                    ) : (
                      <button className="secondary" onClick={() => setCampoAttivoId(c.id)}>
                        Seleziona
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {campi.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    Nessun campo creato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <button className="secondary" onClick={nuovoCampo}>
            + Nuovo campo
          </button>
          {campoAttivo && (
            <button className="secondary" onClick={apriDuplica} style={{ marginLeft: 10 }}>
              Duplica campo attivo
            </button>
          )}

          {duplicaAperto && (
            <div className="form-panel" style={{ marginTop: 16 }}>
              <h2>Duplica "{campoAttivo?.nome}"</h2>
              <label>
                Nome nuovo campo
                <input value={duplicaForm.nome} onChange={(e) => setDuplicaForm({ ...duplicaForm, nome: e.target.value })} />
              </label>
              <label>
                Data inizio
                <input type="date" value={duplicaForm.data_inizio} onChange={(e) => setDuplicaForm({ ...duplicaForm, data_inizio: e.target.value })} />
              </label>
              <label>
                Data fine
                <input type="date" value={duplicaForm.data_fine} onChange={(e) => setDuplicaForm({ ...duplicaForm, data_fine: e.target.value })} />
              </label>
              <div className="form-actions">
                <button onClick={confermaDuplica}>Duplica</button>
                <button className="secondary" onClick={() => setDuplicaAperto(false)}>
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="form-panel">
          <h2>{modalitaNuovo ? "Nuovo campo" : "Impostazioni campo attivo"}</h2>
          {!modalitaNuovo && !campoAttivo ? (
            <p className="muted">Nessun campo selezionato. Creane uno nuovo.</p>
          ) : (
            <>
              <label>
                Nome
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </label>
              <label>
                Data inizio
                <input type="date" value={form.data_inizio} onChange={(e) => setForm({ ...form, data_inizio: e.target.value })} />
              </label>
              <label>
                Data fine
                <input type="date" value={form.data_fine} onChange={(e) => setForm({ ...form, data_fine: e.target.value })} />
              </label>
              <label>
                Coefficiente L/C
                <input value={form.coeff_lc} onChange={(e) => setForm({ ...form, coeff_lc: e.target.value })} />
              </label>
              <label>
                Coefficiente S/G
                <input value={form.coeff_sg} onChange={(e) => setForm({ ...form, coeff_sg: e.target.value })} />
              </label>
              <label>
                Coefficiente Cambusa
                <input value={form.coeff_cambusa} onChange={(e) => setForm({ ...form, coeff_cambusa: e.target.value })} />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.considera_magazzino}
                  onChange={(e) => setForm({ ...form, considera_magazzino: e.target.checked })}
                />
                Considera il magazzino nella lista della spesa
              </label>
              {errore && <div className="form-error">{errore}</div>}
              <div className="form-actions">
                <button onClick={salvaImpostazioni}>{modalitaNuovo ? "Crea campo" : "Salva modifiche"}</button>
                {!modalitaNuovo && (
                  <button className="danger" onClick={elimina}>
                    Elimina campo
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!modalitaNuovo && campoAttivo && giorni.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2>Giorni del campo</h2>
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Giorno</th>
                <th>Coeff. giornaliero</th>
                <th>L/C</th>
                <th>S/G</th>
                <th>Cambusa</th>
                <th>Note L/C</th>
                <th>Note S/G</th>
              </tr>
            </thead>
            <tbody>
              {giorni.map((g) => (
                <tr key={g.id}>
                  <td>
                    {giornoSettimana(g.data)} {formattaData(g.data)}
                  </td>
                  <td>
                    <EditableNumberCell
                      valore={g.coeff_giornaliero}
                      onCommit={(n) => committiCampoGiorno(g.id, { coeff_giornaliero: n })}
                    />
                  </td>
                  <td>
                    <EditableNumberCell valore={g.n_lc} onCommit={(n) => committiCampoGiorno(g.id, { n_lc: n })} />
                  </td>
                  <td>
                    <EditableNumberCell valore={g.n_sg} onCommit={(n) => committiCampoGiorno(g.id, { n_sg: n })} />
                  </td>
                  <td>
                    <EditableNumberCell
                      valore={g.n_cambusa}
                      onCommit={(n) => committiCampoGiorno(g.id, { n_cambusa: n })}
                    />
                  </td>
                  <td>
                    <input
                      value={g.note_lc ?? ""}
                      onChange={(e) => aggiornaCampoGiorno(g.id, { note_lc: e.target.value })}
                      onBlur={() => persistiGiorno(g)}
                    />
                  </td>
                  <td>
                    <input
                      value={g.note_sg ?? ""}
                      onChange={(e) => aggiornaCampoGiorno(g.id, { note_sg: e.target.value })}
                      onBlur={() => persistiGiorno(g)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
