-- Tabla de caja diaria
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

-- RLS
ALTER TABLE caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Negocio owner puede gestionar su caja" ON caja
  USING (
    negocio_id IN (
      SELECT id FROM negocios WHERE user_id = auth.uid()
    )
  );
