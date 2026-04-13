-- Añadir soporte para horario partido (dos turnos por día)
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS hora_apertura2 time;
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS hora_cierre2   time;

-- También en horarios_especiales si existe
ALTER TABLE horarios_especiales ADD COLUMN IF NOT EXISTS hora_apertura2 time;
ALTER TABLE horarios_especiales ADD COLUMN IF NOT EXISTS hora_cierre2   time;
