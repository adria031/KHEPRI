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

CREATE POLICY "Owner gestiona sus nóminas" ON nominas
  USING (
    negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
  );
