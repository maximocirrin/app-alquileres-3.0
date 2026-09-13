BEGIN;

CREATE TABLE IF NOT EXISTS private.api_rate_limits (
  rate_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  expires_at timestamptz NOT NULL
);

-- The private schema is not exposed by PostgREST and browser roles have no
-- privileges, but RLS is enabled as an additional fail-closed boundary.
ALTER TABLE private.api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON private.api_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count integer;
BEGIN
  IF length(p_key) <> 64 OR p_limit < 1 OR p_limit > 10000
     OR p_window_seconds < 1 OR p_window_seconds > 2592000 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.api_rate_limits AS limits (
    rate_key, window_started_at, request_count, expires_at
  ) VALUES (
    p_key, now(), 1, now() + pg_catalog.make_interval(secs => p_window_seconds)
  )
  ON CONFLICT (rate_key) DO UPDATE
  SET window_started_at = CASE WHEN limits.expires_at <= now() THEN now() ELSE limits.window_started_at END,
      request_count = CASE WHEN limits.expires_at <= now() THEN 1 ELSE limits.request_count + 1 END,
      expires_at = CASE
        WHEN limits.expires_at <= now() THEN now() + pg_catalog.make_interval(secs => p_window_seconds)
        ELSE limits.expires_at
      END
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text, integer, integer) TO service_role;

COMMIT;
