-- Plan y créditos compartidos entre todos los negocios del mismo usuario
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'starter';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creditos_totales integer DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creditos_usados integer DEFAULT 0;

-- Migrar plan actual del primer negocio de cada usuario a profiles
UPDATE profiles p
SET plan = (
  SELECT n.plan FROM negocios n
  WHERE n.user_id = p.id
  ORDER BY n.created_at ASC
  LIMIT 1
)
WHERE p.plan IS NULL OR p.plan = 'starter';
