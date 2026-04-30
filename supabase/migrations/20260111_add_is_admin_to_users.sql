-- Add admin flag to users and prevent client-side tampering
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Restrict direct client edits of admin flag
REVOKE INSERT (is_admin) ON public.users FROM anon, authenticated;
REVOKE UPDATE (is_admin) ON public.users FROM anon, authenticated;
