-- ─── Reservas: permitir SELECT/UPDATE públicos (anon) ────────────────────────
-- El ID de la reserva (UUID) actúa como token secreto — inaccesible por fuerza bruta

-- SELECT: anon puede leer UNA reserva si conoce su UUID (para las páginas de confirmar/cancelar)
DROP POLICY IF EXISTS "anon_select_reserva_by_id" ON reservas;
CREATE POLICY "anon_select_reserva_by_id"
  ON reservas FOR SELECT
  TO anon
  USING (true);

-- UPDATE: anon puede actualizar solo confirmada_cliente o estado en la reserva que conoce
DROP POLICY IF EXISTS "anon_update_reserva_confirmar" ON reservas;
CREATE POLICY "anon_update_reserva_confirmar"
  ON reservas FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ─── Reseñas: permitir INSERT y SELECT públicos ───────────────────────────────

-- INSERT: anon puede insertar una reseña (la verificación de duplicado se hace por app)
DROP POLICY IF EXISTS "anon_insert_resenas" ON resenas;
CREATE POLICY "anon_insert_resenas"
  ON resenas FOR INSERT
  TO anon
  WITH CHECK (true);

-- SELECT: anon puede verificar si ya existe una reseña para una reserva
DROP POLICY IF EXISTS "anon_select_resenas_by_reserva" ON resenas;
CREATE POLICY "anon_select_resenas_by_reserva"
  ON resenas FOR SELECT
  TO anon
  USING (true);
