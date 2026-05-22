-- ============================================================
-- KHEPRIA — Auditoría de schema 2026-05-22
-- Añade tablas/columnas/funciones ausentes en migraciones previas
-- ============================================================

-- ── 1. TABLA favoritos (CREATE, la RLS ya existe) ───────────
CREATE TABLE IF NOT EXISTS favoritos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, negocio_id)
);
CREATE INDEX IF NOT EXISTS idx_favoritos_user ON favoritos (user_id);
ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage favoritos" ON favoritos;
CREATE POLICY "Users manage favoritos" ON favoritos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 2. TABLA lista_espera ────────────────────────────────────
CREATE TABLE IF NOT EXISTS lista_espera (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id       uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  servicio_id      uuid        REFERENCES servicios(id) ON DELETE SET NULL,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_cliente   text,
  telefono_cliente text,
  email_cliente    text,
  fecha_preferida  date,
  hora_preferida   text,
  estado           text        DEFAULT 'esperando' CHECK (estado IN ('esperando','contactado','reservado','cancelado')),
  nota             text,
  created_at       timestamptz DEFAULT now()
);
-- Añadir columnas si la tabla ya existía sin ellas
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS servicio_id      uuid REFERENCES servicios(id) ON DELETE SET NULL;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS nombre_cliente   text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS telefono_cliente text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS email_cliente    text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS fecha_preferida  date;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS hora_preferida   text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS estado           text DEFAULT 'esperando';
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS nota             text;
CREATE INDEX IF NOT EXISTS idx_lista_espera_negocio ON lista_espera (negocio_id, fecha_preferida);
ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lista_espera_owner"       ON lista_espera;
DROP POLICY IF EXISTS "lista_espera_insert_anon" ON lista_espera;
CREATE POLICY "lista_espera_owner" ON lista_espera
  FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "lista_espera_insert_anon" ON lista_espera
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── 3. TABLA posts_marketing ─────────────────────────────────
CREATE TABLE IF NOT EXISTS posts_marketing (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id   uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  titulo       text        NOT NULL,
  contenido    text,
  imagen_url   text,
  tipo         text        DEFAULT 'oferta' CHECK (tipo IN ('oferta','noticia','evento','otro')),
  publicado    boolean     DEFAULT false,
  fecha_inicio date,
  fecha_fin    date,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_marketing_negocio ON posts_marketing (negocio_id, publicado);
ALTER TABLE posts_marketing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_marketing_select_public" ON posts_marketing;
DROP POLICY IF EXISTS "posts_marketing_owner"         ON posts_marketing;
CREATE POLICY "posts_marketing_select_public" ON posts_marketing FOR SELECT USING (publicado = true);
CREATE POLICY "posts_marketing_owner" ON posts_marketing
  FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 4. TABLA logs_actividad ──────────────────────────────────
CREATE TABLE IF NOT EXISTS logs_actividad (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  accion      text        NOT NULL,
  tabla       text,
  registro_id uuid,
  detalle     jsonb,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logs_actividad_negocio ON logs_actividad (negocio_id, created_at DESC);
ALTER TABLE logs_actividad ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_actividad_owner" ON logs_actividad;
CREATE POLICY "logs_actividad_owner" ON logs_actividad
  FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ── 5. FUNCIÓN crear_reserva ─────────────────────────────────
CREATE OR REPLACE FUNCTION crear_reserva(
  p_negocio_id       uuid,
  p_servicio_id      uuid,
  p_trabajador_id    uuid,
  p_nombre_cliente   text,
  p_email_cliente    text,
  p_telefono_cliente text,
  p_fecha            date,
  p_hora             time,
  p_duracion         integer,
  p_precio           numeric,
  p_nota             text DEFAULT NULL,
  p_cliente_id       uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conflicto integer;
  v_id        uuid;
BEGIN
  SELECT COUNT(*) INTO v_conflicto
  FROM reservas
  WHERE negocio_id  = p_negocio_id
    AND (p_trabajador_id IS NULL OR trabajador_id = p_trabajador_id)
    AND fecha       = p_fecha
    AND estado NOT IN ('cancelada')
    AND (
      hora < (p_hora + (p_duracion || ' minutes')::interval)::time
      AND (hora + (COALESCE(duracion, 30) || ' minutes')::interval)::time > p_hora
    );

  IF v_conflicto > 0 THEN
    RAISE EXCEPTION 'conflicto_horario' USING HINT = 'Ese horario ya está ocupado';
  END IF;

  INSERT INTO reservas (
    negocio_id, servicio_id, trabajador_id, cliente_id,
    nombre_cliente, email_cliente, telefono_cliente,
    fecha, hora, duracion, precio, nota, estado
  ) VALUES (
    p_negocio_id, p_servicio_id, p_trabajador_id, p_cliente_id,
    p_nombre_cliente, p_email_cliente, p_telefono_cliente,
    p_fecha, p_hora, p_duracion, p_precio, p_nota, 'pendiente'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── 6. TRIGGER updated_at en negocios ───────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_negocios_updated_at ON negocios;
CREATE TRIGGER trg_negocios_updated_at
  BEFORE UPDATE ON negocios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. Columna updated_at en negocios si no existe ──────────
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ── 8. TABLA historial_puntos (de 20260515 si no se aplicó) ─
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS servicios_ids   uuid[];
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS duracion_total  integer;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS puntos_ganados  integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS puntos          integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS historial_puntos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  negocio_id  uuid        REFERENCES negocios(id),
  reserva_id  uuid        REFERENCES reservas(id),
  puntos      integer,
  concepto    text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE historial_puntos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "historial_puntos_select_owner"   ON historial_puntos;
DROP POLICY IF EXISTS "historial_puntos_insert_service" ON historial_puntos;
CREATE POLICY "historial_puntos_select_owner"   ON historial_puntos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "historial_puntos_insert_service" ON historial_puntos FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION increment_puntos(p_user_id uuid, p_puntos integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET puntos = COALESCE(puntos, 0) + p_puntos WHERE id = p_user_id;
$$;

-- ── 9. Índices de rendimiento adicionales ────────────────────
CREATE INDEX IF NOT EXISTS idx_reservas_cliente_id   ON reservas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_trabajador   ON reservas (trabajador_id, fecha);
CREATE INDEX IF NOT EXISTS idx_historial_puntos_user ON historial_puntos (user_id);
