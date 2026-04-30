-- Ensure history conversation links are nulled when conversations are deleted.

ALTER TABLE public.palm_readings
    DROP CONSTRAINT IF EXISTS palm_readings_conversation_id_fkey;
ALTER TABLE public.palm_readings
    ADD CONSTRAINT palm_readings_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE public.face_readings
    DROP CONSTRAINT IF EXISTS face_readings_conversation_id_fkey;
ALTER TABLE public.face_readings
    ADD CONSTRAINT face_readings_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE public.qimen_charts
    DROP CONSTRAINT IF EXISTS qimen_charts_conversation_id_fkey;
ALTER TABLE public.qimen_charts
    ADD CONSTRAINT qimen_charts_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE public.daliuren_divinations
    DROP CONSTRAINT IF EXISTS daliuren_divinations_conversation_id_fkey;
ALTER TABLE public.daliuren_divinations
    ADD CONSTRAINT daliuren_divinations_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;
