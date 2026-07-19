import { useEffect, useState } from "react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { esportaBackup, importaBackup, scegliFileBackup } from "../data/backup";
import { esisteCampoEsempio, svuotaDatiEsempio } from "../data/seed";
import { useCampo } from "../context/CampoContext";

export default function BackupPage() {
  const { ricaricaCampi } = useCampo();
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [haDatiEsempio, setHaDatiEsempio] = useState(false);

  useEffect(() => {
    esisteCampoEsempio().then(setHaDatiEsempio);
  }, []);

  async function esporta() {
    setMessaggio(null);
    setErrore(null);
    setInCorso(true);
    try {
      const salvato = await esportaBackup();
      if (salvato) setMessaggio("Backup esportato correttamente.");
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore durante l'esportazione del backup");
    } finally {
      setInCorso(false);
    }
  }

  async function importa() {
    setMessaggio(null);
    setErrore(null);
    const percorso = await scegliFileBackup();
    if (!percorso) return;
    if (
      !confirm(
        "Importare questo backup sovrascriverà TUTTI i dati attuali dell'app (ingredienti, ricette, campi, menù, magazzino, acquisti). L'operazione non è reversibile. Continuare?"
      )
    ) {
      return;
    }
    setInCorso(true);
    try {
      const contenuto = await readTextFile(percorso);
      await importaBackup(contenuto);
      setMessaggio("Backup importato correttamente. Riavvia l'app per vedere i dati aggiornati in tutte le schermate.");
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore durante l'importazione del backup");
    } finally {
      setInCorso(false);
    }
  }

  async function svuotaEsempio() {
    if (!confirm('Eliminare il campo, le ricette e gli ingredienti di esempio? I tuoi dati reali non vengono toccati.')) {
      return;
    }
    setInCorso(true);
    try {
      await svuotaDatiEsempio();
      await ricaricaCampi();
      setHaDatiEsempio(false);
      setMessaggio("Dati di esempio rimossi.");
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore durante la rimozione dei dati di esempio");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="page">
      <h1>Backup</h1>
      <p className="muted">
        "Esporta backup" salva <strong>tutto il database</strong> (ingredienti, ricette, campi, menù, magazzino,
        acquisti vari, impostazioni) in un unico file JSON. Serve sia come copia di sicurezza sia per condividere i
        dati con un altro utente dell'app: basta scambiarsi il file (email, chiavetta, cloud) e farlo importare
        dall'altra persona con "Importa backup" sulla sua installazione. Attenzione: l'importazione sostituisce
        interamente i dati esistenti in quell'installazione, quindi chi riceve il file perde ciò che aveva prima
        (da qui la conferma esplicita).
      </p>
      <div className="form-panel" style={{ maxWidth: 480 }}>
        <button onClick={esporta} disabled={inCorso}>
          Esporta backup
        </button>
        <button className="danger" onClick={importa} disabled={inCorso}>
          Importa backup
        </button>
        {messaggio && <div style={{ color: "var(--color-primary)", fontSize: 13 }}>{messaggio}</div>}
        {errore && <div className="form-error">{errore}</div>}
      </div>

      {haDatiEsempio && (
        <div className="form-panel" style={{ maxWidth: 480, marginTop: 20 }}>
          <h2>Dati di esempio</h2>
          <p className="muted">
            Sono presenti ingredienti, ricette e un campo di esempio per capire come funziona l'app. Puoi rimuoverli
            quando vuoi: non toccano i tuoi dati reali.
          </p>
          <button className="secondary" onClick={svuotaEsempio} disabled={inCorso}>
            Svuota dati di esempio
          </button>
        </div>
      )}
    </div>
  );
}
