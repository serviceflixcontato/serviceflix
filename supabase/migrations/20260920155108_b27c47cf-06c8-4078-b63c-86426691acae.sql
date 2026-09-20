ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS reward_method text,
  ADD COLUMN IF NOT EXISTS reward_pix_key text,
  ADD COLUMN IF NOT EXISTS reward_bank_details text,
  ADD COLUMN IF NOT EXISTS reward_chosen_at timestamptz;

CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := 'VC' || lpad((floor(random() * 1000000))::int::text, 6, '0') || 'SF';
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vouchers WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE DEFAULT public.generate_voucher_code(),
  amount_cents integer NOT NULL DEFAULT 0,
  balance_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'disponivel',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_voucher_code() TO authenticated, service_role;

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vouchers_select_own ON public.vouchers;
CREATE POLICY vouchers_select_own ON public.vouchers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vouchers_select_admin ON public.vouchers;
CREATE POLICY vouchers_select_admin ON public.vouchers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS vouchers_updated_at ON public.vouchers;
CREATE TRIGGER vouchers_updated_at BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS voucher_id uuid REFERENCES public.vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_discount_cents integer NOT NULL DEFAULT 0;