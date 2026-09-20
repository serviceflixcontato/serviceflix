CREATE OR REPLACE FUNCTION public.generate_contract_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := 'S' || lpad((floor(random() * 100000000))::bigint::text, 8, '0') || 'X';
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.contract_acceptances WHERE contract_code = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_contract_code() FROM anon, authenticated, public;

ALTER TABLE public.contract_acceptances
  ADD COLUMN IF NOT EXISTS contract_code text;

UPDATE public.contract_acceptances
SET contract_code = public.generate_contract_code()
WHERE contract_code IS NULL;

ALTER TABLE public.contract_acceptances
  ALTER COLUMN contract_code SET DEFAULT public.generate_contract_code();

CREATE UNIQUE INDEX IF NOT EXISTS contract_acceptances_contract_code_key
  ON public.contract_acceptances (contract_code);