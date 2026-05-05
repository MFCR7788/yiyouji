CREATE OR REPLACE FUNCTION public.batch_update_vectors_as_service(
  p_records JSONB,
  p_user_id uuid,
  p_limit INTEGER,
  p_force BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_record JSONB;
  v_source_id TEXT;
  v_content TEXT;
  v_embedding vector(1536);
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN;
  END IF;

  FOR v_record IN SELECT jsonb_array_elements(p_records) LOOP
    v_source_id := (v_record ->> 'source_id')::TEXT;
    v_content := (v_record ->> 'content')::TEXT;
    v_embedding := (v_record ->> 'embedding')::vector(1536);

    UPDATE public.knowledge_base_vectors
    SET content = v_content,
        embedding = v_embedding,
        updated_at = NOW()
    WHERE source_id = v_source_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.batch_update_vectors_as_service(jsonb, uuid, integer, boolean) TO authenticated, service_role;