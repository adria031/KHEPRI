-- ============================================================
-- FIX SCHEMA — Ejecutar en Supabase SQL Editor
-- Añade columnas faltantes, gen_random_uuid() defaults y RLS
-- ============================================================

-- ── 1. COLUMNAS FALTANTES EN negocios ───────────────────────
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS plan                   text    DEFAULT 'basico';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS descripcion            text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS instagram              text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS whatsapp               text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS facebook               text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS logo_url               text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS fotos                  text[]  DEFAULT '{}';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS horas_cancelacion      int     DEFAULT 24;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS confirmacion_automatica boolean DEFAULT true;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS mensaje_cancelacion    text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS metodos_pago           text[]  DEFAULT ARRAY['efectivo'];

-- ── 2. gen_random_uuid() EN TODAS LAS TABLAS ────────────────
ALTER TABLE negocios           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE servicios          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE horarios           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE trabajadores       ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE productos          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE reservas           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE profiles           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE clientes           ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE resenas             ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE caja                ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE nominas             ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE horarios_especiales ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ── 3. RLS — NEGOCIOS ───────────────────────────────────────
ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "negocios_select_public"  ON negocios;
DROP POLICY IF EXISTS "negocios_insert_owner"   ON negocios;
DROP POLICY IF EXISTS "negocios_update_owner"   ON negocios;
DROP POLICY IF EXISTS "negocios_delete_owner"   ON negocios;

CREATE POLICY "negocios_select_public"  ON negocios FOR SELECT USING (true);
CREATE POLICY "negocios_insert_owner"   ON negocios FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "negocios_update_owner"   ON negocios FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "negocios_delete_owner"   ON negocios FOR DELETE USING (user_id = auth.uid());

-- ── 4. RLS — SERVICIOS ──────────────────────────────────────
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "servicios_select_public" ON servicios;
DROP POLICY IF EXISTS "servicios_owner"         ON servicios;

CREATE POLICY "servicios_select_public" ON servicios FOR SELECT USING (true);
CREATE POLICY "servicios_owner" ON servicios FOR ALL USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
) WITH CHECK (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 5. RLS — HORARIOS ───────────────────────────────────────
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "horarios_select_public" ON horarios;
DROP POLICY IF EXISTS "horarios_owner"         ON horarios;

CREATE POLICY "horarios_select_public" ON horarios FOR SELECT USING (true);
CREATE POLICY "horarios_owner" ON horarios FOR ALL USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
) WITH CHECK (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 6. RLS — TRABAJADORES ───────────────────────────────────
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trabajadores_select_public" ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_owner"         ON trabajadores;

CREATE POLICY "trabajadores_select_public" ON trabajadores FOR SELECT USING (true);
CREATE POLICY "trabajadores_owner" ON trabajadores FOR ALL USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
) WITH CHECK (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 7. RLS — PRODUCTOS ──────────────────────────────────────
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "productos_select_public" ON productos;
DROP POLICY IF EXISTS "productos_owner"         ON productos;

CREATE POLICY "productos_select_public" ON productos FOR SELECT USING (true);
CREATE POLICY "productos_owner" ON productos FOR ALL USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
) WITH CHECK (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 8. RLS — RESERVAS ───────────────────────────────────────
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservas_select_owner"  ON reservas;
DROP POLICY IF EXISTS "reservas_insert_public" ON reservas;
DROP POLICY IF EXISTS "reservas_update_owner"  ON reservas;
DROP POLICY IF EXISTS "reservas_delete_owner"  ON reservas;

CREATE POLICY "reservas_select_owner"  ON reservas FOR SELECT USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  OR auth.uid() IS NULL  -- public can read their own if they know the id
);
CREATE POLICY "reservas_insert_public" ON reservas FOR INSERT WITH CHECK (true);
CREATE POLICY "reservas_update_owner"  ON reservas FOR UPDATE USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);
CREATE POLICY "reservas_delete_owner"  ON reservas FOR DELETE USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 9. RLS — PROFILES ───────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_owner" ON profiles;

CREATE POLICY "profiles_owner" ON profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── 10. RLS — RESENAS ───────────────────────────────────────
ALTER TABLE resenas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resenas_select_public" ON resenas;
DROP POLICY IF EXISTS "resenas_insert_public" ON resenas;
DROP POLICY IF EXISTS "resenas_update_owner"  ON resenas;

CREATE POLICY "resenas_select_public" ON resenas FOR SELECT USING (true);
CREATE POLICY "resenas_insert_public" ON resenas FOR INSERT WITH CHECK (true);
CREATE POLICY "resenas_update_owner"  ON resenas FOR UPDATE USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 11. RLS — CAJA ──────────────────────────────────────────
ALTER TABLE caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caja_owner" ON caja;

CREATE POLICY "caja_owner" ON caja FOR ALL USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
) WITH CHECK (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 12. RLS — NOMINAS ───────────────────────────────────────
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nominas_owner" ON nominas;

CREATE POLICY "nominas_owner" ON nominas FOR ALL USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
) WITH CHECK (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 13. RLS — HORARIOS_ESPECIALES ───────────────────────────
ALTER TABLE horarios_especiales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "horarios_especiales_select_public" ON horarios_especiales;
DROP POLICY IF EXISTS "horarios_especiales_owner"         ON horarios_especiales;

CREATE POLICY "horarios_especiales_select_public" ON horarios_especiales FOR SELECT USING (true);
CREATE POLICY "horarios_especiales_owner" ON horarios_especiales FOR ALL USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
) WITH CHECK (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
);

-- ── 14. RLS — CLIENTES ──────────────────────────────────────
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_owner" ON clientes;

CREATE POLICY "clientes_owner" ON clientes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
