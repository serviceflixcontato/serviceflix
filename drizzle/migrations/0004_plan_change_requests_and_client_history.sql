ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_slug text,
  ADD COLUMN IF NOT EXISTS pending_plan_name text,
  ADD COLUMN IF NOT EXISTS pending_price_cents integer,
  ADD COLUMN IF NOT EXISTS pending_requested_at timestamptz;

CREATE TABLE IF NOT EXISTS public.client_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'geral',
  title text NOT NULL,
  detail text,
  amount_cents integer,
  method text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.client_events TO authenticated;
GRANT ALL ON public.client_events TO service_role;

ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_events_select_own ON public.client_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY client_events_select_admin ON public.client_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS client_events_user_created_idx
  ON public.client_events (user_id, created_at DESC);