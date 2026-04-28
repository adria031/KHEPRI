-- Habilitar RLS en tabla favoritos y crear política para que cada usuario gestione solo los suyos
ALTER TABLE IF EXISTS favoritos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'favoritos' AND policyname = 'Users manage favoritos'
  ) THEN
    CREATE POLICY "Users manage favoritos" ON favoritos
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
