ALTER TABLE negocios ADD COLUMN IF NOT EXISTS whatsapp_token text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS whatsapp_phone_id text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS whatsapp_activo boolean DEFAULT false;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS instagram_token text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS instagram_activo boolean DEFAULT false;
