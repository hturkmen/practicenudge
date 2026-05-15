-- Function to handle new user registration
-- Creates a firm and links the user as owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_firm_id UUID;
  firm_name TEXT;
BEGIN
  -- Get firm name from user metadata, fallback to email
  firm_name := COALESCE(
    NEW.raw_user_meta_data->>'firm_name',
    split_part(NEW.email, '@', 1) || '''s Firm'
  );

  -- Create the firm
  INSERT INTO public.firms (name, email)
  VALUES (firm_name, NEW.email)
  RETURNING id INTO new_firm_id;

  -- Link user to firm as owner
  INSERT INTO public.firm_users (firm_id, user_id, role)
  VALUES (new_firm_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow firm_users insert during registration (service role)
CREATE POLICY "Service role can insert firm users" ON firm_users
  FOR INSERT WITH CHECK (true);

-- Allow firms insert during registration (service role)
CREATE POLICY "Service role can insert firms" ON firms
  FOR INSERT WITH CHECK (true);
