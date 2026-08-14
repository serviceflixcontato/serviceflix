CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  client_type TEXT NOT NULL DEFAULT 'residencia',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_slug TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  monthly_price_cents INTEGER,
  started_at DATE,
  next_billing_date DATE,
  contract_number TEXT,
  contract_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "subs_insert_own" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  description TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal',
  preferred_date DATE,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests_select_own" ON public.service_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "requests_insert_own" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "requests_update_own" ON public.service_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  request_id UUID REFERENCES public.service_requests ON DELETE SET NULL,
  os_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  technician TEXT,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  hours_spent NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'agendada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "os_select_own" ON public.work_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT 'Mensalidade',
  amount_cents INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente',
  method TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contact_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'residencia',
  plan_interest TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_leads TO anon, authenticated;
GRANT ALL ON public.contact_leads TO service_role;
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_insert_public" ON public.contact_leads FOR INSERT TO anon, authenticated WITH CHECK (true);