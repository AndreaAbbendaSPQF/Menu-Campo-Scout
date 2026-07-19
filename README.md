# Cambusa Scout

App desktop per Windows per gestire la cambusa di un campo scout: ricettario, composizione del menù, calcolo automatico
delle grammature e della lista della spesa, magazzino e acquisti extra.

Stack: Tauri 2 + React + TypeScript, database SQLite locale (nessun cloud, nessun server).

## Avvio in modalità sviluppo

Prerequisiti: Node.js, Rust (toolchain `stable-x86_64-pc-windows-msvc`) e i C++ Build Tools di Visual Studio
(componente "Desktop development with C++"), oltre al runtime WebView2 (incluso in Windows 11).

```bash
npm install
npm run tauri dev
```

Si apre una finestra nativa con hot-reload sul frontend. Le modifiche al codice Rust (`src-tauri/`) richiedono una
ricompilazione automatica gestita da `tauri dev`.

## Test

```bash
npm run test
```

Esegue i test automatici del motore di calcolo (`src/lib/calcolo.test.ts`): scaling delle quantità, pasti sdoppiati,
piatti multipli, gestione magazzino, aggregazione della lista della spesa.

## Build dell'installer Windows

```bash
npm run tauri build
```

Genera l'installer in `src-tauri/target/release/bundle/`:

- `msi/CambusaScout_<versione>_x64_en-US.msi`
- `nsis/CambusaScout_<versione>_x64-setup.exe`

Uno dei due installer è sufficiente per la distribuzione: entrambi installano l'app con collegamento nel menù Avvio.

## Dove si trova il database

Il database SQLite (`cambusascout.db`) viene creato automaticamente alla prima esecuzione nella cartella dati
dell'applicazione:

```
%APPDATA%\eu.spqf.cambusascout\cambusascout.db
```

Sopravvive alla disinstallazione e reinstallazione dell'app (non viene toccato dal setup). Per ripartire da zero,
chiudere l'app ed eliminare manualmente questo file: al riavvio verrà ricreato vuoto (con i dati di esempio, vedi
sotto).

## Dati di esempio

Al primissimo avvio, se il database è completamente vuoto, l'app crea automaticamente qualche ingrediente, due
ricette (una multiportata) e un mini campo di 2 giorni per far capire come funziona l'app. Si possono rimuovere in
qualsiasi momento dalla sezione **Backup** del menù laterale, pulsante "Svuota dati di esempio" (compare solo se i
dati di esempio sono ancora presenti). Non tocca in alcun modo i dati reali inseriti dall'utente.

## Backup

Dalla sezione **Backup** del menù laterale:

- **Esporta backup**: genera un file JSON con l'intero database (ingredienti, ricette, campi, menù, magazzino,
  acquisti vari, impostazioni). Utile per una copia di sicurezza o per condividere i dati con un altro utente
  dell'app (basta scambiarsi questo file).
- **Importa backup**: seleziona un file di backup e lo ricarica, **sovrascrivendo completamente** i dati attuali.
  Richiede una conferma esplicita perché l'operazione non è reversibile.

## Struttura del progetto

```
src/                  Frontend React + TypeScript
  components/         Componenti UI riutilizzabili (autocomplete, picker ricette, ecc.)
  context/             React context (campo attivo, feedback di salvataggio)
  data/                Layer di accesso al database (una funzione per operazione, niente ORM)
  lib/                 Motore di calcolo, export Excel/PDF, utilità (date, testo, numeri)
  pages/               Una pagina per sezione dell'app
src-tauri/
  migrations/          Migrazioni SQL, applicate automaticamente all'avvio (tauri-plugin-sql)
  capabilities/        Permessi Tauri (filesystem, dialog, SQL)
```

## Logica di calcolo (riferimento rapido)

Le ricette sono dosate per un numero di persone configurabile (default 5 adulti "Cambusa"). Per ogni servizio di ogni
pasto:

```
persone_equivalenti = n_LC × coeff_LC + n_SG × coeff_SG + n_Cambusa × coeff_Cambusa
quantità_ingrediente = (dose_base / dosi_persone_ricetta) × persone_equivalenti × coeff_giornaliero(giorno)
```

Nessun arrotondamento sui dati interni: solo la visualizzazione a schermo è limitata a 3 decimali. Il motore di
calcolo puro (senza dipendenze dal database) è in `src/lib/calcolo.ts`, con relativi test in
`src/lib/calcolo.test.ts`.
