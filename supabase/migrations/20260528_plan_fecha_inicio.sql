-- Añade fecha de inicio del plan a profiles para calcular renovaciones mensuales individuales
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_fecha_inicio date DEFAULT CURRENT_DATE;
