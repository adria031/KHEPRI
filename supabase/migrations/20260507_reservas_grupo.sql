-- Añadir grupo_id para vincular reservas múltiples de una misma sesión
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS grupo_id uuid;

-- Añadir precio_total para guardar el total de la sesión
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS precio_total numeric;

-- Índices
CREATE INDEX IF NOT EXISTS reservas_grupo_id_idx ON reservas (grupo_id);
