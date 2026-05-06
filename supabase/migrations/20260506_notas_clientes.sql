CREATE TABLE IF NOT EXISTS notas_clientes (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id      uuid        REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_telefono text       NOT NULL,
  nota            text        NOT NULL DEFAULT '',
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (negocio_id, cliente_telefono)
);

CREATE INDEX IF NOT EXISTS notas_clientes_negocio_idx ON notas_clientes (negocio_id);

ALTER TABLE notas_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas_clientes_negocio"
  ON notas_clientes FOR ALL
  USING (
    negocio_id IN (
      SELECT id FROM negocios WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    negocio_id IN (
      SELECT id FROM negocios WHERE user_id = auth.uid()
    )
  );
