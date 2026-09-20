ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city_uf text;

CREATE TABLE IF NOT EXISTS public.contract_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  contract_version text NOT NULL DEFAULT '1.0',
  plan_slug text NOT NULL,
  plan_name text NOT NULL,
  monthly_price_cents integer,
  periodicity text NOT NULL DEFAULT 'Mensal',
  payment_method text NOT NULL DEFAULT 'A definir',
  service_address text NOT NULL,
  full_name text NOT NULL,
  cpf_cnpj text NOT NULL,
  email text,
  phone text,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  accept_ip text,
  user_agent text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.contract_acceptances TO authenticated;
GRANT ALL ON public.contract_acceptances TO service_role;

ALTER TABLE public.contract_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_insert_own" ON public.contract_acceptances
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_select_own" ON public.contract_acceptances
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "contracts_select_admin" ON public.contract_acceptances
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "contracts_update_admin" ON public.contract_acceptances
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER contract_acceptances_updated_at
  BEFORE UPDATE ON public.contract_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "subs_update_own" ON public.subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS contract_acceptances_user_idx ON public.contract_acceptances(user_id);