CREATE OR REPLACE FUNCTION public.generate_request_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := 'OS' || lpad((floor(random() * 1000000))::int::text, 6, '0') || 'SF';
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.service_requests WHERE request_code = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS request_code text;

UPDATE public.service_requests
SET request_code = 'OS' || lpad((floor(random() * 1000000))::int::text, 6, '0') || 'SF'
WHERE request_code IS NULL;

ALTER TABLE public.service_requests ALTER COLUMN request_code SET DEFAULT public.generate_request_code();

CREATE UNIQUE INDEX IF NOT EXISTS service_requests_request_code_key ON public.service_requests (request_code);

GRANT EXECUTE ON FUNCTION public.generate_request_code() TO authenticated, service_role;