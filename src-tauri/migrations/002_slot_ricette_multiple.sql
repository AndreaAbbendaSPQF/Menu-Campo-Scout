-- Consente più ricette per slot (es. più bevande a colazione, più frutti a merenda)

CREATE TABLE servizio_slot_ricette (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servizio_slot_id INTEGER NOT NULL REFERENCES servizio_slot(id) ON DELETE CASCADE,
  ricetta_id INTEGER NOT NULL REFERENCES ricette(id),
  UNIQUE(servizio_slot_id, ricetta_id)
);

INSERT INTO servizio_slot_ricette (servizio_slot_id, ricetta_id)
  SELECT id, ricetta_id FROM servizio_slot WHERE ricetta_id IS NOT NULL;

ALTER TABLE servizio_slot DROP COLUMN ricetta_id;

CREATE INDEX idx_slot_ricette_slot ON servizio_slot_ricette(servizio_slot_id);
