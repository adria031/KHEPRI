-- Sistema de créditos Khepria IA
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS creditos_totales integer DEFAULT 100;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS creditos_usados  integer DEFAULT 0;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS creditos_reset_date date DEFAULT CURRENT_DATE;

CREATE TABLE IF NOT EXISTS historial_creditos (
  id         uuid default gen_random_uuid() primary key,
  negocio_id uuid references negocios(id) ON DELETE CASCADE,
  cantidad   integer NOT NULL,
  concepto   text,
  created_at timestamptz default now()
);

ALTER TABLE historial_creditos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'historial_creditos' AND policyname = 'Owner manage historial_creditos'
  ) THEN
    CREATE POLICY "Owner manage historial_creditos" ON historial_creditos
      FOR ALL
      USING (
        negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
      )
      WITH CHECK (
        negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
      );
  END IF;
END
$$;

-- Permitir al propietario actualizar creditos_usados en su negocio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'negocios' AND policyname = 'Owner update creditos'
  ) THEN
    CREATE POLICY "Owner update creditos" ON negocios
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

-- Inicializar créditos según plan para negocios existentes (opcional — ejecutar manualmente)
-- UPDATE negocios SET creditos_totales = CASE
--   WHEN plan = 'starter' THEN 100
--   WHEN plan = 'basico'  THEN 300
--   WHEN plan = 'pro'     THEN 1000
--   WHEN plan = 'plus'    THEN 5000
--   WHEN plan = 'beta'    THEN 2000
--   ELSE 100
-- END WHERE creditos_totales = 100;
