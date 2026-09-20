-- Recreate the handle_new_user function to be safe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Attach the trigger to auth.users (drops first if it somehow exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for users who signed up while the trigger was missing
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;