-- Numero di adulti su cui è dosata la ricetta (default 5, come da convenzione originale)

ALTER TABLE ricette ADD COLUMN dosi_persone INTEGER NOT NULL DEFAULT 5;
