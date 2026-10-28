-- Review and apply manually to the Voca Supabase project before enabling paid AI.
-- No end-user role may execute this RPC; only the server-side service_role key may.
CREATE TABLE IF NOT EXISTS public.ai_monthly_reservations (
  month_start date PRIMARY KEY,
  reserved_microusd bigint NOT NULL DEFAULT 0 CHECK (reserved_microusd >= 0)
);

CREATE TABLE IF NOT EXISTS public.ai_daily_reservations (
  usage_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('melody', 'transcription')),
  requests integer NOT NULL DEFAULT 0 CHECK (requests >= 0),
  PRIMARY KEY (usage_date, user_id, feature)
);

ALTER TABLE public.ai_monthly_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_daily_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_monthly_reservations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ai_daily_reservations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_ai_request(
  p_user_id uuid,
  p_feature text,
  p_cost_microusd bigint,
  p_month_cap_microusd bigint,
  p_daily_max integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  v_day date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF p_user_id IS NULL OR p_feature IS NULL OR p_feature NOT IN ('melody', 'transcription')
    OR p_cost_microusd IS NULL OR p_cost_microusd <= 0
    OR p_month_cap_microusd IS NULL OR p_month_cap_microusd <= 0
    OR p_daily_max IS NULL OR p_daily_max <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_monthly_reservations(month_start)
    VALUES (v_month) ON CONFLICT DO NOTHING;
  UPDATE public.ai_monthly_reservations
    SET reserved_microusd = reserved_microusd + p_cost_microusd
    WHERE month_start = v_month
      AND reserved_microusd <= p_month_cap_microusd - p_cost_microusd;
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO public.ai_daily_reservations(usage_date, user_id, feature)
    VALUES (v_day, p_user_id, p_feature) ON CONFLICT DO NOTHING;
  UPDATE public.ai_daily_reservations
    SET requests = requests + 1
    WHERE usage_date = v_day AND user_id = p_user_id AND feature = p_feature
      AND requests < p_daily_max;
  IF NOT FOUND THEN
    -- Raise to roll back the monthly reservation as well.
    RAISE EXCEPTION 'AI_DAILY_LIMIT';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_request(uuid,text,bigint,bigint,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_request(uuid,text,bigint,bigint,integer) TO service_role;

