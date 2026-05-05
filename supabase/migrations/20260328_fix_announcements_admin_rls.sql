CREATE POLICY announcements_admin_select ON public.announcements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY announcements_admin_insert ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY announcements_admin_update ON public.announcements
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY announcements_admin_delete ON public.announcements
  FOR DELETE TO authenticated
  USING (true);