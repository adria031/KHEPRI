-- ============================================================
-- Recordatorios automáticos — migración completa
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Columna para evitar envíos duplicados
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS recordatorio_enviado boolean DEFAULT false;

-- 2. Índice parcial para que la query del cron sea rápida
CREATE INDEX IF NOT EXISTS idx_reservas_recordatorio
  ON reservas (fecha, estado, recordatorio_enviado)
  WHERE recordatorio_enviado = false;

-- ============================================================
-- 3. Activar extensiones (Dashboard → Database → Extensions)
--    Habilitar: pg_cron  y  pg_net
--    O ejecutar si tienes permisos de superusuario:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- ============================================================

-- 4. Programar el cron cada hora en punto
--    ⚠️  Sustituir YOUR_CRON_SECRET por el valor real
--        (el mismo que configures en los Secrets de la Edge Function)
--    ⚠️  Si tu project ref es distinto de fpotjljbukpbuehtjxvb, cámbialo también

SELECT cron.schedule(
  'recordatorio-reservas',            -- nombre único del job
  '0 * * * *',                        -- cada hora en punto
  $$
  SELECT net.http_post(
    url     := 'https://fpotjljbukpbuehtjxvb.supabase.co/functions/v1/recordatorio-reservas',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer YOUR_CRON_SECRET'
               ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Comandos útiles ──────────────────────────────────────────
-- Ver jobs registrados:
--   SELECT * FROM cron.job;
--
-- Ver historial de ejecuciones:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- Eliminar el job para recrearlo:
--   SELECT cron.unschedule('recordatorio-reservas');
--
-- Comprobar registros pendientes de recordatorio:
--   SELECT id, fecha, hora, cliente_nombre, cliente_email, recordatorio_enviado
--   FROM reservas
--   WHERE recordatorio_enviado = false
--     AND estado = 'confirmada'
--   ORDER BY fecha;
