-- Tabla lista de espera para la beta de Khepria
CREATE TABLE IF NOT EXISTS waitlist (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre       text,
  email        text        NOT NULL,
  tipo_negocio text,
  ciudad       text,
  created_at   timestamptz DEFAULT now()
);

-- Índice en email para evitar duplicados fácilmente
CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);

-- RLS: solo lectura/escritura pública (anon puede insertar)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_insert_anon"
  ON waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Solo service role puede leer todos
CREATE POLICY "waitlist_select_service"
  ON waitlist FOR SELECT
  TO service_role
  USING (true);
