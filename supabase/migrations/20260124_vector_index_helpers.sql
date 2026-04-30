CREATE OR REPLACE FUNCTION public.check_vector_index_exists(p_dim INT DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND (
              (p_dim IS NOT NULL AND indexname = 'knowledge_entries_vector_' || p_dim || '_idx')
              OR
              (p_dim IS NULL AND indexname LIKE 'knowledge_entries_vector_%_idx')
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_vector_index_dimensions()
RETURNS INT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        array_agg(
            SUBSTRING(indexname FROM 'knowledge_entries_vector_(\d+)_idx')::int
        ),
        ARRAY[]::INT[]
    )
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname ~ '^knowledge_entries_vector_\d+_idx$';
$$;

REVOKE ALL ON FUNCTION public.check_vector_index_exists(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_vector_index_exists(INT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_vector_index_dimensions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vector_index_dimensions() TO service_role;
