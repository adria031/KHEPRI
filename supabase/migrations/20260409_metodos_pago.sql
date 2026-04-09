ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS metodos_pago text[] DEFAULT '{"efectivo"}';
