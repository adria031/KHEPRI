-- ============================================================
-- Política de reservas — migración
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS horas_cancelacion      integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS confirmacion_automatica boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS mensaje_cancelacion     text;

-- Para verificar:
-- SELECT id, nombre, horas_cancelacion, confirmacion_automatica, mensaje_cancelacion FROM negocios LIMIT 5;
