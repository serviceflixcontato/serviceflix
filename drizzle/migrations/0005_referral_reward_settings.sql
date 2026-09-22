CREATE TABLE public.referral_settings (
  id text PRIMARY KEY DEFAULT 'default',
  reward_cents integer NOT NULL DEFAULT 50000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_settings TO anon;
GRANT SELECT, UPDATE, INSERT ON public.referral_settings TO authenticated;
GRANT ALL ON public.referral_settings TO service_role;

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_settings_read_all" ON public.referral_settings
  FOR SELECT USING (true);

CREATE POLICY "referral_settings_admin_update" ON public.referral_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "referral_settings_admin_insert" ON public.referral_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.referral_settings (id, reward_cents) VALUES ('default', 50000)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER referral_settings_updated_at
  BEFORE UPDATE ON public.referral_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_referral_reward_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  cfg integer;
BEGIN
  IF NEW.reward_cents IS NULL OR NEW.reward_cents = 0 OR NEW.reward_cents = 50000 THEN
    SELECT reward_cents INTO cfg FROM public.referral_settings WHERE id = 'default';
    IF cfg IS NOT NULL THEN
      NEW.reward_cents = cfg;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER referrals_set_reward_default
  BEFORE INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_reward_default();
