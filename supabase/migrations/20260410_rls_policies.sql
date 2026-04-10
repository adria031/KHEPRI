-- Ensure all tables have proper RLS policies for CRUD operations

-- ── NEGOCIOS ──────────────────────────────────────────────────────────────
ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "negocios_select_owner"  ON negocios;
DROP POLICY IF EXISTS "negocios_select_public" ON negocios;
DROP POLICY IF EXISTS "negocios_insert_owner"  ON negocios;
DROP POLICY IF EXISTS "negocios_update_owner"  ON negocios;
DROP POLICY IF EXISTS "negocios_delete_owner"  ON negocios;

-- Public can read any negocio (needed for /negocio/[id] page)
CREATE POLICY "negocios_select_public" ON negocios
  FOR SELECT USING (true);

-- Owner can insert their own negocio
CREATE POLICY "negocios_insert_owner" ON negocios
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Owner can update their own negocio
CREATE POLICY "negocios_update_owner" ON negocios
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Owner can delete their own negocio
CREATE POLICY "negocios_delete_owner" ON negocios
  FOR DELETE USING (user_id = auth.uid());


-- ── SERVICIOS ─────────────────────────────────────────────────────────────
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicios_select_public" ON servicios;
DROP POLICY IF EXISTS "servicios_insert_owner"  ON servicios;
DROP POLICY IF EXISTS "servicios_update_owner"  ON servicios;
DROP POLICY IF EXISTS "servicios_delete_owner"  ON servicios;

CREATE POLICY "servicios_select_public" ON servicios
  FOR SELECT USING (true);

CREATE POLICY "servicios_insert_owner" ON servicios
  FOR INSERT WITH CHECK (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );

CREATE POLICY "servicios_update_owner" ON servicios
  FOR UPDATE
  USING  (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

CREATE POLICY "servicios_delete_owner" ON servicios
  FOR DELETE USING (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );


-- ── HORARIOS ──────────────────────────────────────────────────────────────
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "horarios_select_public" ON horarios;
DROP POLICY IF EXISTS "horarios_insert_owner"  ON horarios;
DROP POLICY IF EXISTS "horarios_update_owner"  ON horarios;
DROP POLICY IF EXISTS "horarios_delete_owner"  ON horarios;

CREATE POLICY "horarios_select_public" ON horarios
  FOR SELECT USING (true);

CREATE POLICY "horarios_insert_owner" ON horarios
  FOR INSERT WITH CHECK (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );

CREATE POLICY "horarios_update_owner" ON horarios
  FOR UPDATE
  USING  (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

CREATE POLICY "horarios_delete_owner" ON horarios
  FOR DELETE USING (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );


-- ── TRABAJADORES ──────────────────────────────────────────────────────────
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trabajadores_select_public" ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_insert_owner"  ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_update_owner"  ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_delete_owner"  ON trabajadores;

CREATE POLICY "trabajadores_select_public" ON trabajadores
  FOR SELECT USING (true);

CREATE POLICY "trabajadores_insert_owner" ON trabajadores
  FOR INSERT WITH CHECK (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );

CREATE POLICY "trabajadores_update_owner" ON trabajadores
  FOR UPDATE
  USING  (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

CREATE POLICY "trabajadores_delete_owner" ON trabajadores
  FOR DELETE USING (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );


-- ── PRODUCTOS ─────────────────────────────────────────────────────────────
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_select_public" ON productos;
DROP POLICY IF EXISTS "productos_insert_owner"  ON productos;
DROP POLICY IF EXISTS "productos_update_owner"  ON productos;
DROP POLICY IF EXISTS "productos_delete_owner"  ON productos;

CREATE POLICY "productos_select_public" ON productos
  FOR SELECT USING (true);

CREATE POLICY "productos_insert_owner" ON productos
  FOR INSERT WITH CHECK (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );

CREATE POLICY "productos_update_owner" ON productos
  FOR UPDATE
  USING  (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

CREATE POLICY "productos_delete_owner" ON productos
  FOR DELETE USING (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );


-- ── RESERVAS ──────────────────────────────────────────────────────────────
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservas_select_owner"  ON reservas;
DROP POLICY IF EXISTS "reservas_insert_public" ON reservas;
DROP POLICY IF EXISTS "reservas_update_owner"  ON reservas;
DROP POLICY IF EXISTS "reservas_delete_owner"  ON reservas;

-- Negocio owner can see their reservations; client can see their own
CREATE POLICY "reservas_select_owner" ON reservas
  FOR SELECT USING (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
    OR cliente_id = auth.uid()
    OR auth.uid() IS NULL  -- allow anon for widget/public booking
  );

-- Anyone can create a reservation (public booking)
CREATE POLICY "reservas_insert_public" ON reservas
  FOR INSERT WITH CHECK (true);

-- Negocio owner can update (confirm/cancel) reservations
CREATE POLICY "reservas_update_owner" ON reservas
  FOR UPDATE
  USING  (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

CREATE POLICY "reservas_delete_owner" ON reservas
  FOR DELETE USING (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );


-- ── PROFILES ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
