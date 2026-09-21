ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.service_providers(id),
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS provider_role text,
  ADD COLUMN IF NOT EXISTS provider_photo_url text;