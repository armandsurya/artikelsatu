
-- Enhance redirects table for Module 3

ALTER TABLE public.redirects
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS hits BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_hit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS preserve_query BOOLEAN NOT NULL DEFAULT true;

-- Case-insensitive unique index on normalized source path
DROP INDEX IF EXISTS redirects_source_unique_idx;
CREATE UNIQUE INDEX redirects_source_unique_idx
  ON public.redirects ((lower(source)));

CREATE INDEX IF NOT EXISTS redirects_active_idx ON public.redirects (active) WHERE active = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_redirects_updated_at ON public.redirects;
CREATE TRIGGER trg_redirects_updated_at
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Atomic hit-increment RPC (callable by anon for public hit counting)
CREATE OR REPLACE FUNCTION public.increment_redirect_hit(_source TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.redirects
    SET hits = hits + 1, last_hit_at = now()
    WHERE lower(source) = lower(_source);
$$;

REVOKE ALL ON FUNCTION public.increment_redirect_hit(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_redirect_hit(TEXT) TO anon, authenticated;

-- Ensure anon can SELECT active redirects (needed for SSR + client enforcement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='redirects' AND policyname='Public can read active redirects'
  ) THEN
    CREATE POLICY "Public can read active redirects"
      ON public.redirects FOR SELECT
      TO anon, authenticated
      USING (active = true);
  END IF;
END $$;

GRANT SELECT ON public.redirects TO anon;
