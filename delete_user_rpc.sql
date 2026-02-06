-- 1. Create a Secure Function to Delete the User (RPC)
-- This function runs with "security definer" privileges, meaning it can bypass RLS to delete from auth.users.
-- However, we restrict it strictly to deleting ONLY the currently logged-in user (auth.uid()).

CREATE OR REPLACE FUNCTION delete_own_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the user from the authentication table
  -- This will trigger ON DELETE CASCADE for all linked tables (profiles, predictions, etc.)
  -- IF the foreign keys were set up with ON DELETE CASCADE.
  DELETE FROM auth.users
  WHERE id = auth.uid();
END;
$$;

-- 2. Grant Permission
-- Allow any logged-in user to call this function.
GRANT EXECUTE ON FUNCTION delete_own_user() TO authenticated;

-- 3. Verify/Add Cascade Deletion for Profile (Optional but recommended)
-- This ensures that removing the user from auth.users also removes their profile.
-- Run this if your profile table wasn't created with ON DELETE CASCADE.
/*
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
*/
