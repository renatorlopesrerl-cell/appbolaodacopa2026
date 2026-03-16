-- Trigger to remove user from leagues participants array automatically upon profile deletion
-- This ensures no "ghost" IDs remain in the leagues table when a user is hard deleted.

CREATE OR REPLACE FUNCTION public.remove_user_from_leagues()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the leagues table
  -- Remove the deleted user's ID from the 'participants' array column
  -- The operator '-' removes an element from a JSONB array by value (or key).
  -- Note: We assume 'participants' is a jsonb array of strings e.g. ["id1", "id2"].
  
  -- Step 1: Remove from participants list (Active members)
  UPDATE public.leagues
  SET participants = participants - OLD.id::text
  WHERE participants @> to_jsonb(OLD.id::text);

  -- Step 2: Remove from pending_requests list (Invited/Applying members)
  UPDATE public.leagues
  SET pending_requests = pending_requests - OLD.id::text
  WHERE pending_requests @> to_jsonb(OLD.id::text);

  RETURN OLD;
END;
$$;

-- Bind the trigger to the profiles table
-- Ideally, when a user is deleted from auth.users, it cascades to profiles.
-- The deletion of the profile row then triggers this cleanup in leagues.
DROP TRIGGER IF EXISTS on_profile_delete_cleanup_leagues ON public.profiles;

CREATE TRIGGER on_profile_delete_cleanup_leagues
BEFORE DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.remove_user_from_leagues();
