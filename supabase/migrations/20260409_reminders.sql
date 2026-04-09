-- ============================================================
-- Recordatorios automáticos de citas — migración
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Columna para evitar envíos duplicados
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS recordatorio_enviado boolean DEFAULT false;

-- 2. Índice para que la query del cron sea rápida
CREATE INDEX IF NOT EXISTS idx_reservas_recordatorio
  ON reservas (fecha, estado, recordatorio_enviado)
  WHERE recordatorio_enviado = false;

-- 3. Activar extensiones necesarias
--    Dashboard → Database → Extensions → habilitar: pg_cron, pg_net
--    (o ejecutar si tienes permisos de superusuario):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4. Programar el cron (ejecutar DESPUÉS de activar las extensiones)
--    Reemplaza YOUR_CRON_SECRET con el mismo valor que pongas en los secrets de la Edge Function.
--    Reemplaza fpotjljbukpbuehtjxvb con tu project ref si es diferente.

SELECT cron.schedule(
  'send-appointment-reminders',        -- nombre único del job
  '0 * * * *',                         -- cada hora en punto
  $$
  SELECT net.http_post(
    url     := 'https://fpotjljbukpbuehtjxvb.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
                 'Content-Type',   'application/json',
                 'Authorization',  'Bearer YOUR_CRON_SECRET'
               ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Para verificar que el job está registrado:
-- SELECT * FROM cron.job;

-- Para ver el historial de ejecuciones:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Para eliminar el job si necesitas recrearlo:
-- SELECT cron.unschedule('send-appointment-reminders');
