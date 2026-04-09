ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS precio_descuento numeric,
  ADD COLUMN IF NOT EXISTS descuento_inicio date,
  ADD COLUMN IF NOT EXISTS descuento_fin    date;
