-- Reglas configurables por área (antes globales fijas en código).
-- Los defaults replican las reglas vigentes (decisión David: 3–6h, 06:00–24:00, 3/semana).
ALTER TABLE common_areas
ADD COLUMN IF NOT EXISTS min_duration_hours integer NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_duration_hours integer NOT NULL DEFAULT 6,
ADD COLUMN IF NOT EXISTS open_hour text NOT NULL DEFAULT '06:00',
ADD COLUMN IF NOT EXISTS close_hour text NOT NULL DEFAULT '24:00',
ADD COLUMN IF NOT EXISTS max_per_week integer NOT NULL DEFAULT 3;
