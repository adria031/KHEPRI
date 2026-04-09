-- ============================================================
-- Reseñas: añadir reserva_id para vincular con la cita
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Columna reserva_id en resenas
ALTER TABLE resenas
  ADD COLUMN IF NOT EXISTS reserva_id uuid REFERENCES reservas(id) ON DELETE SET NULL;

-- 2. Índice único para evitar que la misma cita tenga más de una reseña
CREATE UNIQUE INDEX IF NOT EXISTS idx_resenas_reserva_id
  ON resenas (reserva_id)
  WHERE reserva_id IS NOT NULL;

-- 3. Índice para consultas por negocio (ya puede existir)
CREATE INDEX IF NOT EXISTS idx_resenas_negocio_id
  ON resenas (negocio_id);

-- Para verificar:
-- SELECT id, negocio_id, reserva_id, cliente_nombre, valoracion FROM resenas LIMIT 10;
