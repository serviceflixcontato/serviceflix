CREATE TABLE public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'encanador',
  phone text,
  email text,
  address text,
  cpf text,
  document_notes text,
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_providers TO authenticated;
GRANT ALL ON public.service_providers TO service_role;

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY providers_admin_all ON public.service_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.work_orders ADD COLUMN provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders ADD COLUMN provider_name text;
ALTER TABLE public.work_orders ADD COLUMN provider_role text;
ALTER TABLE public.work_orders ADD COLUMN provider_photo_url text;