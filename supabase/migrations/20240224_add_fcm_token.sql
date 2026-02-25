-- Adiciona campo para token de notificação push
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fcm_token text;
