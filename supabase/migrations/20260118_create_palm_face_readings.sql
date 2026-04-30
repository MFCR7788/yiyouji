-- Phase 7: Palm and Face Reading Analysis Tables
-- Created: 2026-01-17

-- Palm readings table
CREATE TABLE public.palm_readings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    analysis_type text DEFAULT 'full'::text,
    hand_type text DEFAULT 'left'::text CHECK (hand_type = ANY (ARRAY['left'::text, 'right'::text, 'both'::text])),
    created_at timestamp with time zone DEFAULT now(),
    conversation_id uuid,
    CONSTRAINT palm_readings_pkey PRIMARY KEY (id),
    CONSTRAINT palm_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT palm_readings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);

-- Face readings table
CREATE TABLE public.face_readings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    analysis_type text DEFAULT 'full'::text,
    created_at timestamp with time zone DEFAULT now(),
    conversation_id uuid,
    CONSTRAINT face_readings_pkey PRIMARY KEY (id),
    CONSTRAINT face_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT face_readings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);

-- Enable RLS
ALTER TABLE public.palm_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_readings ENABLE ROW LEVEL SECURITY;

-- RLS policies for palm_readings
CREATE POLICY "Users can view their own palm readings"
    ON public.palm_readings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own palm readings"
    ON public.palm_readings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own palm readings"
    ON public.palm_readings FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for face_readings
CREATE POLICY "Users can view their own face readings"
    ON public.face_readings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own face readings"
    ON public.face_readings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own face readings"
    ON public.face_readings FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS palm_readings_user_id_idx ON public.palm_readings(user_id);
CREATE INDEX IF NOT EXISTS palm_readings_created_at_idx ON public.palm_readings(created_at DESC);
CREATE INDEX IF NOT EXISTS face_readings_user_id_idx ON public.face_readings(user_id);
CREATE INDEX IF NOT EXISTS face_readings_created_at_idx ON public.face_readings(created_at DESC);
