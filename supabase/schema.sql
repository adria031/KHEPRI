-- ============================================================
-- KHEPRIA — SCHEMA COMPLETO
-- Estado: 2026-05-22
-- Fuente de verdad de todas las tablas, columnas, RLS y funciones.
-- NO ejecutar directamente en producción — usar las migraciones.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- EXTENSIONES
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- TABLA: profiles
-- Una fila por usuario auth (trigger on auth.users insert)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text,
  email       text,
  telefono    text,
  avatar_url  text,
  rol         text        DEFAULT 'cliente',
  puntos      integer     DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_owner"       ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- TABLA: negocios
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS negocios (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre                  text        NOT NULL,
  tipo                    text,
  descripcion             text,
  ciudad                  text,
  direccion               text,
  telefono                text,
  email                   text,
  website                 text,
  instagram               text,
  whatsapp                text,
  facebook                text,
  logo_url                text,
  fotos                   text[]      DEFAULT '{}',
  plan                    text        DEFAULT 'basico',
  activo                  boolean     DEFAULT true,
  horas_cancelacion       integer     DEFAULT 24,
  confirmacion_automatica boolean     DEFAULT true,
  mensaje_cancelacion     text,
  metodos_pago            text[]      DEFAULT ARRAY['efectivo'],
  creditos_totales        integer     DEFAULT 100,
  creditos_usados         integer     DEFAULT 0,
  creditos_reset_date     date        DEFAULT CURRENT_DATE,
  updated_at              timestamptz DEFAULT now(),
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "negocios_select_public" ON negocios;
DROP POLICY IF EXISTS "negocios_insert_owner"  ON negocios;
DROP POLICY IF EXISTS "negocios_update_owner"  ON negocios;
DROP POLICY IF EXISTS "negocios_delete_owner"  ON negocios;
DROP POLICY IF EXISTS "Owner update creditos"  ON negocios;
CREATE POLICY "negocios_select_public" ON negocios FOR SELECT USING (true);
CREATE POLICY "negocios_insert_owner"  ON negocios FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "negocios_update_owner"  ON negocios FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "negocios_delete_owner"  ON negocios FOR DELETE USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- TABLA: servicios
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id       uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  nombre           text        NOT NULL,
  descripcion      text,
  duracion         integer,
  precio           numeric,
  precio_descuento numeric,
  descuento_inicio date,
  descuento_fin    date,
  activo           boolean     DEFAULT true,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_servicios_negocio ON servicios (negocio_id);

ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "servicios_select_public" ON servicios;
DROP POLICY IF EXISTS "servicios_insert_owner"  ON servicios;
DROP POLICY IF EXISTS "servicios_update_owner"  ON servicios;
DROP POLICY IF EXISTS "servicios_delete_owner"  ON servicios;
DROP POLICY IF EXISTS "servicios_owner"         ON servicios;
CREATE POLICY "servicios_select_public" ON servicios FOR SELECT USING (true);
CREATE POLICY "servicios_insert_owner"  ON servicios FOR INSERT WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "servicios_update_owner"  ON servicios FOR UPDATE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "servicios_delete_owner"  ON servicios FOR DELETE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: horarios
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS horarios (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id    uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  dia_semana    integer     NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_apertura time,
  hora_cierre   time,
  hora_apertura2 time,
  hora_cierre2  time,
  abierto       boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_horarios_negocio ON horarios (negocio_id);

ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "horarios_select_public" ON horarios;
DROP POLICY IF EXISTS "horarios_insert_owner"  ON horarios;
DROP POLICY IF EXISTS "horarios_update_owner"  ON horarios;
DROP POLICY IF EXISTS "horarios_delete_owner"  ON horarios;
DROP POLICY IF EXISTS "horarios_owner"         ON horarios;
CREATE POLICY "horarios_select_public" ON horarios FOR SELECT USING (true);
CREATE POLICY "horarios_insert_owner"  ON horarios FOR INSERT WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "horarios_update_owner"  ON horarios FOR UPDATE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "horarios_delete_owner"  ON horarios FOR DELETE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: horarios_especiales
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS horarios_especiales (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id     uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  fecha          date        NOT NULL,
  abierto        boolean     NOT NULL DEFAULT false,
  hora_apertura  text,
  hora_cierre    text,
  hora_apertura2 time,
  hora_cierre2   time,
  nota           text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (negocio_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_horarios_especiales_negocio ON horarios_especiales (negocio_id, fecha);

ALTER TABLE horarios_especiales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "horarios_especiales_select_public" ON horarios_especiales;
DROP POLICY IF EXISTS "horarios_especiales_owner"         ON horarios_especiales;
CREATE POLICY "horarios_especiales_select_public" ON horarios_especiales FOR SELECT USING (true);
CREATE POLICY "horarios_especiales_owner" ON horarios_especiales FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: trabajadores
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trabajadores (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre      text        NOT NULL,
  email       text,
  telefono    text,
  rol         text        DEFAULT 'empleado',
  activo      boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trabajadores_negocio ON trabajadores (negocio_id);

ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trabajadores_select_public" ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_insert_owner"  ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_update_owner"  ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_delete_owner"  ON trabajadores;
DROP POLICY IF EXISTS "trabajadores_owner"         ON trabajadores;
CREATE POLICY "trabajadores_select_public" ON trabajadores FOR SELECT USING (true);
CREATE POLICY "trabajadores_insert_owner"  ON trabajadores FOR INSERT WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "trabajadores_update_owner"  ON trabajadores FOR UPDATE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "trabajadores_delete_owner"  ON trabajadores FOR DELETE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: reservas
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservas (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id           uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  servicio_id          uuid        REFERENCES servicios(id) ON DELETE SET NULL,
  servicios_ids        uuid[],
  trabajador_id        uuid        REFERENCES trabajadores(id) ON DELETE SET NULL,
  cliente_id           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  grupo_id             uuid,
  nombre_cliente       text,
  email_cliente        text,
  telefono_cliente     text,
  fecha                date        NOT NULL,
  hora                 time        NOT NULL,
  duracion             integer,
  duracion_total       integer,
  precio               numeric,
  precio_total         numeric,
  estado               text        DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','cancelada','completada','no_show')),
  confirmada_cliente   boolean     DEFAULT false,
  nota                 text,
  recordatorio_enviado boolean     DEFAULT false,
  puntos_ganados       integer     DEFAULT 0,
  created_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservas_negocio_fecha ON reservas (negocio_id, fecha);
CREATE INDEX IF NOT EXISTS reservas_grupo_id_idx      ON reservas (grupo_id);
CREATE INDEX IF NOT EXISTS reservas_confirmada_cliente_idx ON reservas (confirmada_cliente);

ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservas_select_owner"            ON reservas;
DROP POLICY IF EXISTS "reservas_insert_public"           ON reservas;
DROP POLICY IF EXISTS "reservas_update_owner"            ON reservas;
DROP POLICY IF EXISTS "reservas_delete_owner"            ON reservas;
DROP POLICY IF EXISTS "anon_select_reserva_by_id"        ON reservas;
DROP POLICY IF EXISTS "anon_update_reserva_confirmar"    ON reservas;
CREATE POLICY "reservas_select_owner" ON reservas FOR SELECT USING (
  negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  OR cliente_id = auth.uid()
  OR auth.uid() IS NULL
);
CREATE POLICY "reservas_insert_public" ON reservas FOR INSERT WITH CHECK (true);
CREATE POLICY "reservas_update_owner"  ON reservas FOR UPDATE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "reservas_delete_owner"  ON reservas FOR DELETE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "anon_select_reserva_by_id"     ON reservas FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_reserva_confirmar" ON reservas FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- TABLA: resenas
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resenas (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  reserva_id  uuid        REFERENCES reservas(id) ON DELETE SET NULL,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre      text,
  puntuacion  integer     CHECK (puntuacion BETWEEN 1 AND 5),
  comentario  text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX  IF NOT EXISTS idx_resenas_negocio_id ON resenas (negocio_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_resenas_reserva_id ON resenas (reserva_id) WHERE reserva_id IS NOT NULL;

ALTER TABLE resenas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resenas_select_public"        ON resenas;
DROP POLICY IF EXISTS "resenas_insert_public"        ON resenas;
DROP POLICY IF EXISTS "resenas_update_owner"         ON resenas;
DROP POLICY IF EXISTS "anon_insert_resenas"          ON resenas;
DROP POLICY IF EXISTS "anon_select_resenas_by_reserva" ON resenas;
CREATE POLICY "resenas_select_public" ON resenas FOR SELECT USING (true);
CREATE POLICY "resenas_insert_public" ON resenas FOR INSERT WITH CHECK (true);
CREATE POLICY "resenas_update_owner"  ON resenas FOR UPDATE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "anon_insert_resenas"   ON resenas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_resenas_by_reserva" ON resenas FOR SELECT TO anon USING (true);

-- ──────────────────────────────────────────────────────────────
-- TABLA: productos
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  descripcion text,
  precio      numeric,
  stock       integer     DEFAULT 0,
  activo      boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "productos_select_public" ON productos;
DROP POLICY IF EXISTS "productos_insert_owner"  ON productos;
DROP POLICY IF EXISTS "productos_update_owner"  ON productos;
DROP POLICY IF EXISTS "productos_delete_owner"  ON productos;
DROP POLICY IF EXISTS "productos_owner"         ON productos;
CREATE POLICY "productos_select_public" ON productos FOR SELECT USING (true);
CREATE POLICY "productos_insert_owner"  ON productos FOR INSERT WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "productos_update_owner"  ON productos FOR UPDATE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "productos_delete_owner"  ON productos FOR DELETE USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: caja
-- ──────────────────────────────────────────────────────────────
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

ALTER TABLE caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caja_owner" ON caja;
CREATE POLICY "caja_owner" ON caja FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: nominas
-- ──────────────────────────────────────────────────────────────
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

ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nominas_owner"              ON nominas;
DROP POLICY IF EXISTS "Owner gestiona sus nóminas" ON nominas;
CREATE POLICY "nominas_owner" ON nominas FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: chatbot_config
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_config (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE UNIQUE,
  activo      boolean     DEFAULT true,
  nombre_bot  text        DEFAULT 'Asistente',
  bienvenida  text,
  tono        text        DEFAULT 'profesional',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE chatbot_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chatbot_config_select_public" ON chatbot_config;
DROP POLICY IF EXISTS "chatbot_config_owner"         ON chatbot_config;
CREATE POLICY "chatbot_config_select_public" ON chatbot_config FOR SELECT USING (true);
CREATE POLICY "chatbot_config_owner" ON chatbot_config FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: favoritos
-- ──────────────────────────────────────────────────────────────
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
CREATE POLICY "Users manage favoritos" ON favoritos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- TABLA: historial_creditos
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_creditos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  cantidad    integer     NOT NULL,
  concepto    text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE historial_creditos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manage historial_creditos" ON historial_creditos;
CREATE POLICY "Owner manage historial_creditos" ON historial_creditos FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: historial_puntos
-- ──────────────────────────────────────────────────────────────
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
DROP POLICY IF EXISTS "historial_puntos_select_owner"  ON historial_puntos;
DROP POLICY IF EXISTS "historial_puntos_insert_service" ON historial_puntos;
CREATE POLICY "historial_puntos_select_owner"  ON historial_puntos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "historial_puntos_insert_service" ON historial_puntos FOR INSERT WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- TABLA: notas_clientes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notas_clientes (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id        uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_telefono  text        NOT NULL,
  nota              text        NOT NULL DEFAULT '',
  updated_at        timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  UNIQUE (negocio_id, cliente_telefono)
);
CREATE INDEX IF NOT EXISTS notas_clientes_negocio_idx ON notas_clientes (negocio_id);

ALTER TABLE notas_clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_clientes_negocio" ON notas_clientes;
CREATE POLICY "notas_clientes_negocio" ON notas_clientes FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: lista_espera
-- Clientes que quieren un hueco cuando se libere uno
-- ──────────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_lista_espera_negocio ON lista_espera (negocio_id, fecha_preferida);

ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lista_espera_owner"      ON lista_espera;
DROP POLICY IF EXISTS "lista_espera_insert_anon" ON lista_espera;
CREATE POLICY "lista_espera_owner" ON lista_espera FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
CREATE POLICY "lista_espera_insert_anon" ON lista_espera FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- TABLA: posts_marketing
-- Campañas y publicaciones de los negocios
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts_marketing (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id  uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  titulo      text        NOT NULL,
  contenido   text,
  imagen_url  text,
  tipo        text        DEFAULT 'oferta' CHECK (tipo IN ('oferta','noticia','evento','otro')),
  publicado   boolean     DEFAULT false,
  fecha_inicio date,
  fecha_fin    date,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_marketing_negocio ON posts_marketing (negocio_id, publicado);

ALTER TABLE posts_marketing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_marketing_select_public" ON posts_marketing;
DROP POLICY IF EXISTS "posts_marketing_owner"         ON posts_marketing;
CREATE POLICY "posts_marketing_select_public" ON posts_marketing FOR SELECT USING (publicado = true);
CREATE POLICY "posts_marketing_owner" ON posts_marketing FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- TABLA: waitlist (beta signup)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre       text,
  email        text        NOT NULL,
  tipo_negocio text,
  ciudad       text,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_insert_anon"    ON waitlist;
DROP POLICY IF EXISTS "waitlist_select_service" ON waitlist;
CREATE POLICY "waitlist_insert_anon"    ON waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "waitlist_select_service" ON waitlist FOR SELECT TO service_role USING (true);

-- ──────────────────────────────────────────────────────────────
-- TABLA: logs_actividad
-- Audit trail de acciones relevantes en el sistema
-- ──────────────────────────────────────────────────────────────
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
CREATE POLICY "logs_actividad_owner" ON logs_actividad FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())) WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- FUNCIÓN: crear_reserva
-- Inserta una reserva y devuelve su id; valida solapamiento
-- ──────────────────────────────────────────────────────────────
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
  -- Verificar solapamiento con mismo trabajador/negocio
  SELECT COUNT(*) INTO v_conflicto
  FROM reservas
  WHERE negocio_id    = p_negocio_id
    AND (p_trabajador_id IS NULL OR trabajador_id = p_trabajador_id)
    AND fecha         = p_fecha
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

-- ──────────────────────────────────────────────────────────────
-- FUNCIÓN: increment_puntos
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_puntos(p_user_id uuid, p_puntos integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET puntos = COALESCE(puntos, 0) + p_puntos WHERE id = p_user_id;
$$;

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: updated_at en negocios
-- ──────────────────────────────────────────────────────────────
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
