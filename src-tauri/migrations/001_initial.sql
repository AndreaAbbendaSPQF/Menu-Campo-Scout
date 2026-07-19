-- Cambusa Scout - schema iniziale

CREATE TABLE categorie_merceologiche (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  ordine INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categorie_merceologiche (nome, ordine) VALUES
  ('Carne e Latticini', 1),
  ('Frutta e Verdura - Fresco', 2),
  ('Frutta e Verdura - Gelo', 3),
  ('Frutta e Verdura - Confezionato', 4),
  ('Varie', 5),
  ('Pulizia', 6),
  ('Utensileria e stoviglie', 7);

CREATE TABLE ingredienti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  nome_normalizzato TEXT NOT NULL UNIQUE,
  unita_misura TEXT NOT NULL CHECK (unita_misura IN ('Kg','g','Lt','mL','Pz','Mt')),
  categoria_id INTEGER NOT NULL REFERENCES categorie_merceologiche(id),
  gelo INTEGER NOT NULL DEFAULT 0,
  note TEXT
);

CREATE TABLE ricette (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  note TEXT,
  piatto_unico INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ricetta_portate (
  ricetta_id INTEGER NOT NULL REFERENCES ricette(id) ON DELETE CASCADE,
  portata TEXT NOT NULL CHECK (portata IN ('Primo','Secondo','Contorno','Frutta_Dolce','Colazione_Bere','Colazione_Mangiare','Merenda')),
  PRIMARY KEY (ricetta_id, portata)
);

CREATE TABLE ricetta_ingredienti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ricetta_id INTEGER NOT NULL REFERENCES ricette(id) ON DELETE CASCADE,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredienti(id),
  quantita_per_5 REAL NOT NULL
);

CREATE TABLE campi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  data_inizio TEXT NOT NULL,
  data_fine TEXT NOT NULL,
  coeff_lc REAL NOT NULL DEFAULT 0.8,
  coeff_sg REAL NOT NULL DEFAULT 0.9,
  coeff_cambusa REAL NOT NULL DEFAULT 1.0,
  considera_magazzino INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE giorni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campo_id INTEGER NOT NULL REFERENCES campi(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  coeff_giornaliero REAL NOT NULL DEFAULT 1.0,
  n_lc INTEGER NOT NULL DEFAULT 0,
  n_sg INTEGER NOT NULL DEFAULT 0,
  n_cambusa INTEGER NOT NULL DEFAULT 0,
  note_lc TEXT,
  note_sg TEXT,
  UNIQUE(campo_id, data)
);

CREATE TABLE pasti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  giorno_id INTEGER NOT NULL REFERENCES giorni(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('Colazione','Pranzo','Merenda','Cena')),
  UNIQUE(giorno_id, tipo)
);

CREATE TABLE servizi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pasto_id INTEGER NOT NULL REFERENCES pasti(id) ON DELETE CASCADE,
  partecipa_lc INTEGER NOT NULL DEFAULT 1,
  partecipa_sg INTEGER NOT NULL DEFAULT 1,
  partecipa_cambusa INTEGER NOT NULL DEFAULT 1,
  nota TEXT,
  ordine INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE servizio_slot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servizio_id INTEGER NOT NULL REFERENCES servizi(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('Primo','Secondo','Contorno','Frutta_Dolce','Colazione_Bere','Colazione_Mangiare','Merenda')),
  ricetta_id INTEGER REFERENCES ricette(id),
  UNIQUE(servizio_id, slot)
);

CREATE TABLE serate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  giorno_id INTEGER NOT NULL REFERENCES giorni(id) ON DELETE CASCADE,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredienti(id),
  quantita REAL NOT NULL,
  note TEXT
);

CREATE TABLE magazzino (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingrediente_id INTEGER NOT NULL UNIQUE REFERENCES ingredienti(id),
  quantita REAL NOT NULL DEFAULT 0,
  note TEXT
);

CREATE TABLE acquisti_vari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campo_id INTEGER NOT NULL REFERENCES campi(id) ON DELETE CASCADE,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredienti(id),
  quantita REAL NOT NULL,
  note TEXT
);

CREATE TABLE lista_spesa_note (
  campo_id INTEGER NOT NULL REFERENCES campi(id) ON DELETE CASCADE,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredienti(id),
  nota TEXT,
  PRIMARY KEY (campo_id, ingrediente_id)
);

CREATE INDEX idx_ricetta_ingredienti_ricetta ON ricetta_ingredienti(ricetta_id);
CREATE INDEX idx_giorni_campo ON giorni(campo_id);
CREATE INDEX idx_pasti_giorno ON pasti(giorno_id);
CREATE INDEX idx_servizi_pasto ON servizi(pasto_id);
CREATE INDEX idx_servizio_slot_servizio ON servizio_slot(servizio_id);
CREATE INDEX idx_serate_giorno ON serate(giorno_id);
CREATE INDEX idx_acquisti_campo ON acquisti_vari(campo_id);
