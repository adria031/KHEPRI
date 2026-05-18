-- Columnas nuevas en reservas
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS servicios_ids uuid[];
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS duracion_total integer;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS puntos_ganados integer DEFAULT 0;

-- Columna puntos en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS puntos integer DEFAULT 0;

-- Tabla historial_puntos
CREATE TABLE IF NOT EXISTS historial_puntos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) ON DELETE CASCADE,
  negocio_id uuid references negocios(id),
  reserva_id uuid references reservas(id),
  puntos integer,
  concepto text,
  created_at timestamptz default now()
);

-- RLS historial_puntos
ALTER TABLE historial_puntos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "historial_puntos_select_owner" ON historial_puntos;
DROP POLICY IF EXISTS "historial_puntos_insert_service" ON historial_puntos;
CREATE POLICY "historial_puntos_select_owner" ON historial_puntos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "historial_puntos_insert_service" ON historial_puntos FOR INSERT WITH CHECK (true);

-- Función para incrementar puntos (sin race conditions)
CREATE OR REPLACE FUNCTION increment_puntos(p_user_id uuid, p_puntos integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET puntos = COALESCE(puntos, 0) + p_puntos WHERE id = p_user_id;
$$;
