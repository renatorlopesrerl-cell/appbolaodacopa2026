-- Fix relationship errors in API by adding Foreign Keys
-- Allows PostgREST to join profiles(name, avatar, is_pro)

ALTER TABLE public.league_rankings
  ADD CONSTRAINT fk_league_rankings_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.brazil_league_rankings
  ADD CONSTRAINT fk_brazil_league_rankings_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
