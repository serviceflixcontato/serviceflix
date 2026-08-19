CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  property_name text NOT NULL,
  property_type text NOT NULL DEFAULT 'condominio',
  address text NOT NULL,
  cnpj text,
  contact_phone text,
  contact_email text,
  notes text,
  status text NOT NULL DEFAULT 'pendente',
  reward_cents integer NOT NULL DEFAULT 50000,
  reward_status text NOT NULL DEFAULT 'aguardando',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_insert_own ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY referrals_select_own ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY referrals_select_admin ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY referrals_update_admin ON public.referrals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX referrals_referrer_idx ON public.referrals (referrer_id, created_at DESC);