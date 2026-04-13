-- ============================================================
-- KHEPRIA — SQL COMPLETO
-- Ejecutar de una vez en Supabase → SQL Editor
-- Crea tablas faltantes, añade columnas, UUID defaults y RLS
-- ============================================================

-- ── 1. COLUMNAS FALTANTES EN negocios ───────────────────────
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS plan                    text      DEFAULT 'basico';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS descripcion             text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS instagram               text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS whatsapp                text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS facebook                text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS logo_url                text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS fotos                   text[]    DEFAULT '{}';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS horas_cancelacion       integer   DEFAULT 24;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS confirmacion_automatica boolean   DEFAULT true;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS mensaje_cancelacion     text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS metodos_pago            text[]    DEFAULT ARRAY['efectivo'];

-- ── 2. COLUMNAS FALTANTES EN servicios ──────────────────────
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS precio_descuento numeric;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS descuento_inicio  date;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS descuento_fin     date;

-- ── 3. COLUMNAS FALTANTES EN reservas ───────────────────────
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS recordatorio_enviado boolean DEFAULT false;

-- ── 4. CREAR TABLA caja (si no existe) ──────────────────────
CREATE TABLE IF NOT EXISTS caja (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  fecha       date        NOT NULL,
  tipo        text        NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
  concepto    text        NOT NULL,
  importe     numeric     NOT NULL CHECK (importe > 0),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_caja_negocio_fecha ON caja (negocio_id, fecha);

-- ── 5. CREAR TABLA nominas (si no existe) ───────────────────
CREATE TABLE IF NOT EXISTS nominas (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id     uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  trabajador_id  uuid        REFERENCES trabajadores(id) ON DELETE SET NULL,
  mes            date        NOT NULL,
  salario_bruto  numeric     NOT NULL,
  irpf           numeric     NOT NULL DEFAULT 15,
  ss_trabajador  numeric     NOT NULL DEFAULT 6.35,
  ss_empresa     numeric     NOT NULL DEFAULT 29.9,
  salario_neto   numeric     NOT NULL,
  tipo_contrato  text,
  horas_semana   integer     DEFAULT 40,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nominas_negocio_mes ON nominas (negocio_id, mes);

-- ── 6. CREAR TABLA horarios_especiales (si no existe) ───────
CREATE TABLE IF NOT EXISTS horarios_especiales (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id    uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  fecha         date        NOT NULL,
  abierto       boolean     NOT NULL DEFAULT false,
  hora_apertura text,
  hora_cierre   text,
  hora_apertura2 text,
  hora_cierre2  text,
  nota          text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (negocio_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_horarios_especiales_negocio ON horarios_especiales (negocio_id, fecha);

-- ── 7. CREAR TABLA chatbot_config (si no existe) ────────────
CREATE TABLE IF NOT EXISTS chatbot_config (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE UNIQUE,
  activo      boolean     DEFAULT true,
  nombre_bot  text        DEFAULT 'Asistente',
  bienvenida  text,
  tono        text        DEFAULT 'profesional',
  created_at  timestamptz DEFAULT now()
);

-- ── 8. CREAR TABLA clientes (si no existe) ──────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre      text        NOT NULL,
  ciudad      text,
  created_at  timestamptz DEFAULT now()
);

-- ── 9. gen_random_uuid() EN TABLAS EXISTENTES ───────────────
-- Solo afecta filas nuevas, no las existentes
ALTER TABLE negocios           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE servicios          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE horarios           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE trabajadores       ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE productos          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE reservas           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE profiles           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE resenas             ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ── 10. RLS — NEGOCIOS ──────────────────────────────────────
ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "negocios_select_public"  ON negocios;
DROP POLICY IF EXISTS "negocios_insert_owner"   ON negocios;
DROP POLICY IF EXISTS "negocios_update_owner"   ON negocios;
DROP POLICY IF EXISTS "negocios_delete_owner"   ON negocios;
CREATE POLICY "negocios_select_public" ON negocios FOR SELECT USING (true);
CREATE POLICY "negocios_insert_owner"  ON negocios FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "negocios_update_owner"  ON negocios FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "negocios_delete_owner"  ON negocios FOR DELETE USING (user_id = auth.uid());

-- ── 11. RLS — SERVICIOS ─────────────────────────────────────
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "servicios_select_public" ON servicios;
DROP POLICY IF EXISTS "servicios_owner"         ON servicios;
CREATE POLICY "servicios_select_public" ON servicios FOR SELECT USING (true);
CREATE POLICY "servicios_owner" ON servicios FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 12. RLS — HORARIOS ──────────────────────────────────────
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "horarios_select_public" ON horarios;
DROP POLICY IF EXISTS "horarios_owner"         ON horarios;
CREATE POLICY "horarios_select_public" ON horarios FOR SELECT USING (true);
CREATE POLICY "horarios_owner" ON horarios FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 13. RLS — TRABAJADORES ──────────────────────────────────
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trabajadores_select_public" ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_owner"         ON trabajadores;
CREATE POLICY "trabajadores_select_public" ON trabajadores FOR SELECT USING (true);
CREATE POLICY "trabajadores_owner" ON trabajadores FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 14. RLS — PRODUCTOS ─────────────────────────────────────
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "productos_select_public" ON productos;
DROP POLICY IF EXISTS "productos_owner"         ON productos;
CREATE POLICY "productos_select_public" ON productos FOR SELECT USING (true);
CREATE POLICY "productos_owner" ON productos FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 15. RLS — RESERVAS ──────────────────────────────────────
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservas_select_owner"  ON reservas;
DROP POLICY IF EXISTS "reservas_insert_public" ON reservas;
DROP POLICY IF EXISTS "reservas_update_owner"  ON reservas;
DROP POLICY IF EXISTS "reservas_delete_owner"  ON reservas;
CREATE POLICY "reservas_insert_public" ON reservas FOR INSERT WITH CHECK (true);
CREATE POLICY "reservas_select_owner"  ON reservas FOR SELECT USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);
CREATE POLICY "reservas_update_owner"  ON reservas FOR UPDATE USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);
CREATE POLICY "reservas_delete_owner"  ON reservas FOR DELETE USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 16. RLS — PROFILES ──────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_owner" ON profiles;
CREATE POLICY "profiles_owner" ON profiles FOR ALL
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── 17. RLS — RESENAS ───────────────────────────────────────
ALTER TABLE resenas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resenas_select_public" ON resenas;
DROP POLICY IF EXISTS "resenas_insert_public" ON resenas;
DROP POLICY IF EXISTS "resenas_update_owner"  ON resenas;
CREATE POLICY "resenas_select_public" ON resenas FOR SELECT USING (true);
CREATE POLICY "resenas_insert_public" ON resenas FOR INSERT WITH CHECK (true);
CREATE POLICY "resenas_update_owner"  ON resenas FOR UPDATE USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 18. RLS — CAJA ──────────────────────────────────────────
ALTER TABLE caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caja_owner" ON caja;
CREATE POLICY "caja_owner" ON caja FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 19. RLS — NOMINAS ───────────────────────────────────────
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nominas_owner"                   ON nominas;
DROP POLICY IF EXISTS "Owner gestiona sus nóminas"      ON nominas;
CREATE POLICY "nominas_owner" ON nominas FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 20. RLS — HORARIOS_ESPECIALES ───────────────────────────
ALTER TABLE horarios_especiales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "horarios_especiales_select_public" ON horarios_especiales;
DROP POLICY IF EXISTS "horarios_especiales_owner"         ON horarios_especiales;
CREATE POLICY "horarios_especiales_select_public" ON horarios_especiales FOR SELECT USING (true);
CREATE POLICY "horarios_especiales_owner" ON horarios_especiales FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 21. RLS — CHATBOT_CONFIG ────────────────────────────────
ALTER TABLE chatbot_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chatbot_config_select_public" ON chatbot_config;
DROP POLICY IF EXISTS "chatbot_config_owner"         ON chatbot_config;
CREATE POLICY "chatbot_config_select_public" ON chatbot_config FOR SELECT USING (true);
CREATE POLICY "chatbot_config_owner" ON chatbot_config FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 22. RLS — CLIENTES ──────────────────────────────────────
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_owner" ON clientes;
CREATE POLICY "clientes_owner" ON clientes FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 23. COLUMNAS FALTANTES EN resenas ───────────────────────
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS reserva_id uuid REFERENCES reservas(id) ON DELETE SET NULL;

-- ── 24. ÍNDICES DE RENDIMIENTO ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reservas_negocio_fecha    ON reservas (negocio_id, fecha);
CREATE INDEX IF NOT EXISTS idx_servicios_negocio         ON servicios (negocio_id);
CREATE INDEX IF NOT EXISTS idx_trabajadores_negocio      ON trabajadores (negocio_id);
CREATE INDEX IF NOT EXISTS idx_horarios_negocio          ON horarios (negocio_id);
CREATE INDEX IF NOT EXISTS idx_resenas_negocio_id        ON resenas (negocio_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_resenas_reserva_id ON resenas (reserva_id) WHERE reserva_id IS NOT NULL;
