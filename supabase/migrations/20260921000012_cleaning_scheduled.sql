-- Limpieza programada: fecha objetivo por tarea (serie semanal crea N).
ALTER TABLE cleaning_tasks
ADD COLUMN IF NOT EXISTS scheduled_for timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_cleaning_scheduled ON cleaning_tasks(status, scheduled_for);
