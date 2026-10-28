-- REVIEW ONLY. Requires explicit approval before applying to any remote DB.
-- Add missing current instruments without removing legacy enum values or data.
ALTER TYPE public.instrument_type ADD VALUE IF NOT EXISTS 'guitar';
ALTER TYPE public.instrument_type ADD VALUE IF NOT EXISTS 'strings';
ALTER TYPE public.instrument_type ADD VALUE IF NOT EXISTS 'brass';
ALTER TYPE public.instrument_type ADD VALUE IF NOT EXISTS 'organ';
ALTER TYPE public.instrument_type ADD VALUE IF NOT EXISTS 'voice';
ALTER TYPE public.instrument_type ADD VALUE IF NOT EXISTS 'memo';

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS last_save_id uuid;

CREATE OR REPLACE FUNCTION public.save_project_snapshot(
  p_project_id uuid, p_tracks jsonb, p_tempo integer,
  p_expected_revision bigint, p_save_id uuid
) RETURNS bigint
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_project public.projects%ROWTYPE;
BEGIN
  -- Serialize saves per project; ownership is checked as well as enforced by RLS.
  SELECT * INTO v_project FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROJECT_NOT_FOUND' USING ERRCODE = '42501'; END IF;
  IF p_save_id IS NULL THEN RAISE EXCEPTION 'INVALID_SAVE'; END IF;
  IF v_project.last_save_id = p_save_id THEN RETURN v_project.revision; END IF;
  IF p_expected_revision IS NULL OR v_project.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'PROJECT_CONFLICT' USING ERRCODE = '40001';
  END IF;
  IF p_tempo IS NULL OR p_tempo NOT BETWEEN 40 AND 240
    OR p_tracks IS NULL OR jsonb_typeof(p_tracks) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_SNAPSHOT';
  END IF;
  IF jsonb_array_length(p_tracks) > 128 THEN RAISE EXCEPTION 'TOO_MANY_TRACKS'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_tracks) AS t
    WHERE t->>'id' IS NULL OR t->>'instrument_type' IS NULL
      OR t->>'instrument_type' = 'memo' -- no durable audio storage yet
      OR jsonb_typeof(t->'midi_data'->'notes') IS DISTINCT FROM 'array'
      OR (t->'midi_data'->>'duration') IS NULL
      OR (t->'midi_data'->>'duration')::numeric NOT BETWEEN 0.001 AND 3600) THEN
    RAISE EXCEPTION 'INVALID_TRACK';
  END IF;
  -- Do not move tracks belonging to another project, even on an ID collision.
  IF EXISTS (SELECT 1 FROM public.tracks AS existing
    JOIN jsonb_array_elements(p_tracks) AS t ON existing.id = (t->>'id')::uuid
    WHERE existing.project_id <> p_project_id) THEN
    RAISE EXCEPTION 'TRACK_ID_CONFLICT' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.tracks(id, project_id, instrument_type, midi_data, is_muted)
    SELECT (t->>'id')::uuid, p_project_id,
      (t->>'instrument_type')::public.instrument_type, t->'midi_data',
      COALESCE((t->>'is_muted')::boolean, false)
    FROM jsonb_array_elements(p_tracks) AS t
    ON CONFLICT (id) DO UPDATE SET instrument_type = EXCLUDED.instrument_type,
      midi_data = EXCLUDED.midi_data, is_muted = EXCLUDED.is_muted
      WHERE public.tracks.project_id = p_project_id;
  -- Only remove tracks deliberately absent from the owner's complete snapshot.
  -- Any error rolls back inserts, removals, tempo and revision together.
  DELETE FROM public.tracks WHERE project_id = p_project_id
    AND id NOT IN (SELECT (t->>'id')::uuid FROM jsonb_array_elements(p_tracks) AS t);
  UPDATE public.projects SET tempo = p_tempo, revision = revision + 1, last_save_id = p_save_id
    WHERE id = p_project_id RETURNING revision INTO v_project.revision;
  RETURN v_project.revision;
END;
$$;
REVOKE ALL ON FUNCTION public.save_project_snapshot(uuid,jsonb,integer,bigint,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_project_snapshot(uuid,jsonb,integer,bigint,uuid) TO authenticated;
