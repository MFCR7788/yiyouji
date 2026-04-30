DROP POLICY IF EXISTS "Anyone can view anonymous mappings" ON public.community_anonymous_mapping;
DROP POLICY IF EXISTS "System can manage anonymous mappings" ON public.community_anonymous_mapping;
DROP POLICY IF EXISTS "Service role can read anonymous mappings" ON public.community_anonymous_mapping;
DROP POLICY IF EXISTS "Users can create own anonymous mappings" ON public.community_anonymous_mapping;
DROP POLICY IF EXISTS "Users can update own anonymous mappings" ON public.community_anonymous_mapping;
DROP POLICY IF EXISTS "Users can delete own anonymous mappings" ON public.community_anonymous_mapping;

CREATE POLICY "Service role can read anonymous mappings" ON public.community_anonymous_mapping
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Users can create own anonymous mappings" ON public.community_anonymous_mapping
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anonymous mappings" ON public.community_anonymous_mapping
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own anonymous mappings" ON public.community_anonymous_mapping
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_community_post_view_count(post_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.community_posts
  SET view_count = view_count + 1
  WHERE id = post_id
  RETURNING view_count INTO updated_count;

  RETURN updated_count;
END;
$$;
