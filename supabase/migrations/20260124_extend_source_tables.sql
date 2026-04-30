CREATE OR REPLACE VIEW public.conversations_with_archive_status AS
SELECT
    c.*,
    EXISTS (
        SELECT 1 FROM public.archived_sources a
        WHERE a.source_type = 'conversation'
        AND a.source_id = c.id
    ) AS is_archived,
    (
        SELECT array_agg(kb_id)
        FROM public.archived_sources a
        WHERE a.source_type = 'conversation'
        AND a.source_id = c.id
    ) AS archived_kb_ids
FROM public.conversations c;

CREATE OR REPLACE VIEW public.ming_records_with_archive_status AS
SELECT
    r.*,
    EXISTS (
        SELECT 1 FROM public.archived_sources a
        WHERE a.source_type = 'record'
        AND a.source_id = r.id
    ) AS is_archived,
    (
        SELECT array_agg(kb_id)
        FROM public.archived_sources a
        WHERE a.source_type = 'record'
        AND a.source_id = r.id
    ) AS archived_kb_ids
FROM public.ming_records r;

ALTER VIEW public.conversations_with_archive_status SET (security_invoker = on);
ALTER VIEW public.ming_records_with_archive_status SET (security_invoker = on);
