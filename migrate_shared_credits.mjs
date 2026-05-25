-- Run this in the Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan             text    DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS creditos_totales integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS creditos_usados  integer DEFAULT 0;

-- Migrate existing data: copy plan from first negocio per user, sum creditos_usados
UPDATE profiles p
SET
  plan             = n.plan,
  creditos_totales = n.creditos_totales,
  creditos_usados  = (
    SELECT COALESCE(SUM(creditos_usados), 0)
    FROM negocios
    WHERE user_id = p.id
  )
FROM (
  SELECT DISTINCT ON (user_id) user_id, plan, creditos_totales
  FROM negocios
  ORDER BY user_id, created_at
) n
WHERE n.user_id = p.id;
