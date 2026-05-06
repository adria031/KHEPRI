-- Añadir columna confirmada_cliente a la tabla reservas
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS confirmada_cliente boolean DEFAULT false;

-- Índice para consultas por confirmada_cliente
CREATE INDEX IF NOT EXISTS reservas_confirmada_cliente_idx ON reservas (confirmada_cliente);
