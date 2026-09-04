CREATE TABLE public.plan_prices (
  slug text PRIMARY KEY,
  price_cents integer,
  price_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_prices TO anon;
GRANT SELECT, UPDATE ON public.plan_prices TO authenticated;
GRANT ALL ON public.plan_prices TO service_role;

ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_prices_select_public" ON public.plan_prices
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "plan_prices_update_admin" ON public.plan_prices
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER plan_prices_set_updated_at
  BEFORE UPDATE ON public.plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plan_prices (slug, price_cents, price_note) VALUES
  ('basico', 180000, NULL),
  ('master', 320000, NULL),
  ('premium', 590000, NULL),
  ('personalizado', NULL, 'Sob consulta');