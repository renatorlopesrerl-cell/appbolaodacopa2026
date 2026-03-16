
-- Add missing columns to 'profiles' table safely
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{"matchStart": true, "matchEnd": true}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light';

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- If policies are missing, recreate them (this is idempotent for DROP IF EXISTS)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
