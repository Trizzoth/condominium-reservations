-- Validación en servidor para incidencias (entraban directo por RLS sin límites).
ALTER TABLE incidents
ADD CONSTRAINT incidents_title_len CHECK (char_length(title) BETWEEN 3 AND 120),
ADD CONSTRAINT incidents_desc_len CHECK (description IS NULL OR char_length(description) <= 2000),
ADD CONSTRAINT incidents_photo_len CHECK (photo_url IS NULL OR char_length(photo_url) <= 500);
