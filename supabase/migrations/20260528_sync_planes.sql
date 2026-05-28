-- Sincroniza el plan de profiles con el plan real del primer negocio del usuario
-- Solo actualiza usuarios que tienen un plan de pago en negocios
UPDATE profiles p
SET plan = (
  SELECT n.plan FROM negocios n
  WHERE n.user_id = p.id
  ORDER BY n.creado_en ASC
  LIMIT 1
)
WHERE p.id IN (
  SELECT user_id FROM negocios WHERE plan != 'starter'
);
