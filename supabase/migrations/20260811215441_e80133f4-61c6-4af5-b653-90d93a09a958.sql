
CREATE TYPE public.app_role AS ENUM ('super_admin','municipality','emergency','ngo_humanitarian','ngo_local');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('ngo_humanitarian','ngo_local','municipality','emergency','admin')),
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text,
  municipality text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_users (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  municipality text NOT NULL,
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','updated','cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('human','material','logistics')),
  description text NOT NULL,
  quantity text,
  availability_window text NOT NULL CHECK (availability_window IN ('24h','48h','72h','1week')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','unavailable')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  content text NOT NULL,
  tag text NOT NULL CHECK (tag IN ('resource_update','situation_update','request','info')),
  municipality text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT INSERT ON public.organizations TO anon;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
GRANT ALL ON public.app_users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT SELECT ON public.alerts TO anon;
GRANT ALL ON public.alerts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_verified(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users u
    JOIN public.organizations o ON o.id = u.organization_id
    WHERE u.id = _user_id AND u.active AND o.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.my_org(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.app_users WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.can_manage_alerts(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_verified(_user_id) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','municipality','emergency')
  )
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can register an organization" ON public.organizations FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
CREATE POLICY "verified members read organizations" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_verified(auth.uid()) OR id = public.my_org(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins update organizations" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins delete organizations" ON public.organizations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "insert own app_user" ON public.app_users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "read app_users" ON public.app_users FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_verified(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins update app_users" ON public.app_users FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role <> 'super_admin');
CREATE POLICY "read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_verified(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "public read alerts" ON public.alerts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "authorized create alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.can_manage_alerts(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "authorized update alerts" ON public.alerts FOR UPDATE TO authenticated
  USING (public.can_manage_alerts(auth.uid())) WITH CHECK (public.can_manage_alerts(auth.uid()));
CREATE POLICY "admins delete alerts" ON public.alerts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "verified read resources" ON public.resources FOR SELECT TO authenticated USING (public.is_verified(auth.uid()));
CREATE POLICY "own org insert resources" ON public.resources FOR INSERT TO authenticated
  WITH CHECK (public.is_verified(auth.uid()) AND organization_id = public.my_org(auth.uid()));
CREATE POLICY "own org update resources" ON public.resources FOR UPDATE TO authenticated
  USING (organization_id = public.my_org(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (organization_id = public.my_org(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "own org delete resources" ON public.resources FOR DELETE TO authenticated
  USING (organization_id = public.my_org(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "verified read feed" ON public.feed_posts FOR SELECT TO authenticated USING (public.is_verified(auth.uid()));
CREATE POLICY "verified create feed" ON public.feed_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_verified(auth.uid()) AND user_id = auth.uid() AND organization_id = public.my_org(auth.uid()));
CREATE POLICY "verified resolve feed" ON public.feed_posts FOR UPDATE TO authenticated
  USING (public.is_verified(auth.uid())) WITH CHECK (public.is_verified(auth.uid()));
CREATE POLICY "admins delete feed" ON public.feed_posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

INSERT INTO public.organizations (name, type, contact_person, email, phone, municipality, status) VALUES
  ('Urząd Gminy Nowa Dęba','municipality','Anna Kowalska','urzad@nowadeba.pl','+48 15 846 26 71','Nowa Dęba','active'),
  ('OSP Nowa Dęba','emergency','Marek Wójcik','osp@nowadeba.pl','+48 15 846 20 10','Nowa Dęba','active'),
  ('Fundacja Pomoc Podkarpacie','ngo_humanitarian','Ewa Nowak','kontakt@pomocpodkarpacie.pl','+48 17 852 11 22','Nowa Dęba','active');

INSERT INTO public.alerts (title, description, severity, municipality, latitude, longitude, status) VALUES
  ('Podtopienia w rejonie ul. Rzeszowskiej','Woda zalała drogę dojazdową. Potrzebne worki z piaskiem i pompy.','high','Nowa Dęba',50.4270,21.7960,'active'),
  ('Punkt zbiórki dla uchodźców','Uruchomiono punkt recepcyjny w hali sportowej. Potrzebni wolontariusze.','medium','Nowa Dęba',50.4315,21.8020,'updated'),
  ('Ostrzeżenie meteorologiczne – silny wiatr','Prognozowane porywy wiatru do 90 km/h w całym powiecie.','low','Tarnobrzeg',50.5730,21.6790,'active'),
  ('Awaria zasilania szpitala','Przywrócono zasilanie podstawowe. Alert odwołany.','critical','Stalowa Wola',50.5820,22.0530,'cancelled');
