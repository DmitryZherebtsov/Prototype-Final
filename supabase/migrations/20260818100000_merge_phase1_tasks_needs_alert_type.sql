-- Phase 1 merge: alert_type on alerts, tasks + needs tables, RLS, seed data

-- ---------------------------------------------------------------------------
-- 1. Alert type (for animated map pins)
-- ---------------------------------------------------------------------------

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS alert_type text NOT NULL DEFAULT 'general'
  CHECK (alert_type IN ('flood','evacuation','infrastructure','power','weather','security','general'));

-- Backfill existing alerts by title keywords
UPDATE public.alerts SET alert_type = 'flood'
  WHERE alert_type = 'general' AND (
    title ILIKE '%podtopien%' OR title ILIKE '%powód%' OR title ILIKE '%woda%'
  );

UPDATE public.alerts SET alert_type = 'evacuation'
  WHERE alert_type = 'general' AND (
    title ILIKE '%ewakuac%' OR title ILIKE '%zbiórk%' OR title ILIKE '%uchodźc%'
  );

UPDATE public.alerts SET alert_type = 'power'
  WHERE alert_type = 'general' AND (
    title ILIKE '%prąd%' OR title ILIKE '%zasilan%' OR title ILIKE '%energi%'
  );

UPDATE public.alerts SET alert_type = 'weather'
  WHERE alert_type = 'general' AND (
    title ILIKE '%meteorolog%' OR title ILIKE '%wiatr%' OR title ILIKE '%pogod%'
  );

UPDATE public.alerts SET alert_type = 'infrastructure'
  WHERE alert_type = 'general' AND (
    title ILIKE '%droga%' OR title ILIKE '%most%' OR title ILIKE '%dk%'
  );

UPDATE public.alerts SET alert_type = 'security'
  WHERE alert_type = 'general' AND (
    title ILIKE '%pożar%' OR title ILIKE '%skażen%' OR title ILIKE '%bezpiecze%'
  );

-- ---------------------------------------------------------------------------
-- 2. Tasks table
-- ---------------------------------------------------------------------------

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','completed')),
  assigned_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  related_alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  municipality text NOT NULL,
  deadline date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Needs table
-- ---------------------------------------------------------------------------

CREATE TABLE public.needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('human','material','logistics')),
  description text NOT NULL,
  quantity text NOT NULL,
  urgency text NOT NULL CHECK (urgency IN ('urgent','medium','low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','satisfied')),
  municipality text NOT NULL,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER needs_updated_at
  BEFORE UPDATE ON public.needs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Helper: who can manage tasks globally (admin / coordinators)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_manage_tasks(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_verified(_user_id) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','municipality','emergency')
  )
$$;

REVOKE ALL ON FUNCTION public.can_manage_tasks(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_tasks(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.needs TO authenticated;
GRANT ALL ON public.needs TO service_role;

-- ---------------------------------------------------------------------------
-- 6. RLS — tasks
-- ---------------------------------------------------------------------------

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified read tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_verified(auth.uid()));

CREATE POLICY "verified create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_verified(auth.uid())
    AND created_by = public.my_org(auth.uid())
  );

CREATE POLICY "assigned or coordinator update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    assigned_organization_id = public.my_org(auth.uid())
    OR created_by = public.my_org(auth.uid())
    OR public.can_manage_tasks(auth.uid())
  )
  WITH CHECK (
    assigned_organization_id = public.my_org(auth.uid())
    OR created_by = public.my_org(auth.uid())
    OR public.can_manage_tasks(auth.uid())
  );

CREATE POLICY "admins delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- 7. RLS — needs
-- ---------------------------------------------------------------------------

ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified read needs" ON public.needs
  FOR SELECT TO authenticated
  USING (public.is_verified(auth.uid()));

CREATE POLICY "own org insert needs" ON public.needs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_verified(auth.uid())
    AND organization_id = public.my_org(auth.uid())
  );

CREATE POLICY "verified update needs" ON public.needs
  FOR UPDATE TO authenticated
  USING (public.is_verified(auth.uid()))
  WITH CHECK (public.is_verified(auth.uid()));

CREATE POLICY "own org or admin delete needs" ON public.needs
  FOR DELETE TO authenticated
  USING (
    organization_id = public.my_org(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- ---------------------------------------------------------------------------
-- 8. Realtime
-- ---------------------------------------------------------------------------

ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.needs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.needs;

-- ---------------------------------------------------------------------------
-- 9. Seed organizations from crisis-platform (skip if email exists)
-- ---------------------------------------------------------------------------

INSERT INTO public.organizations (name, type, contact_person, email, phone, municipality, status)
SELECT v.name, v.type, v.contact_person, v.email, v.phone, v.municipality, v.status
FROM (VALUES
  ('Fundacja Q', 'ngo_humanitarian', 'Marcin Kurnik', 'kontakt@fundacjaq.pl', '+48 15 846 23 11', 'Nowa Dęba', 'active'),
  ('Komenda Powiatowa PSP Tarnobrzeg', 'emergency', 'Krzysztof Malinowski', 'kp.tarnobrzeg@psp.gov.pl', '+48 15 823 41 00', 'Tarnobrzeg', 'active'),
  ('Caritas Diecezji Sandomierskiej', 'ngo_humanitarian', 'Monika Jabłońska', 'caritas@diecezja.sandomierz.pl', '+48 15 832 44 21', 'Baranów Sandomierski', 'active'),
  ('Lokalna Grupa Wolontariatu "Razem"', 'ngo_local', 'Paweł Nowak', 'razem.wolontariat@gmail.com', '+48 604 312 788', 'Nowa Dęba', 'active'),
  ('Ochotnicza Straż Pożarna Chmielów', 'emergency', 'Tomasz Zieliński', 'osp.chmielow@gmail.com', '+48 691 220 034', 'Nowa Dęba', 'pending'),
  ('Stowarzyszenie "Wspólny Dom"', 'ngo_local', 'Katarzyna Sikora', 'kontakt@wspolnydom.org.pl', '+48 512 887 340', 'Tarnobrzeg', 'pending')
) AS v(name, type, contact_person, email, phone, municipality, status)
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations o WHERE o.email = v.email
);

-- ---------------------------------------------------------------------------
-- 10. Seed additional alerts from crisis-platform (by title, skip duplicates)
-- ---------------------------------------------------------------------------

INSERT INTO public.alerts (title, description, severity, municipality, latitude, longitude, status, alert_type, created_at, updated_at)
SELECT v.title, v.description, v.severity, v.municipality, v.latitude, v.longitude, v.status, v.alert_type, v.created_at::timestamptz, v.updated_at::timestamptz
FROM (VALUES
  ('Podtopienia w centrum miasta', 'Woda zalewa ulice Mickiewicza i Kościuszki. Utrudniony ruch kołowy, ryzyko podtopień piwnic.', 'high', 'Nowa Dęba', 50.4229, 21.7511, 'active', 'flood', '2024-08-15T06:30:00Z', '2024-08-15T06:30:00Z'),
  ('Ewakuacja mieszkańców — ul. Leśna', 'Konieczna ewakuacja 47 osób z budynków przy ul. Leśnej z powodu zagrożenia osunięciem skarpy.', 'critical', 'Nowa Dęba', 50.431, 21.743, 'active', 'evacuation', '2024-08-15T07:15:00Z', '2024-08-15T08:00:00Z'),
  ('Przerwa w dostawie prądu — dzielnica północna', 'Awaria sieci energetycznej obejmuje ok. 800 gospodarstw domowych. Szacowany czas naprawy: 6h.', 'medium', 'Nowa Dęba', 50.438, 21.76, 'updated', 'power', '2024-08-15T05:00:00Z', '2024-08-15T09:00:00Z'),
  ('Punkt zbiórki dla ewakuowanych — OSP Nowa Dęba', 'Uruchomiono punkt zbiórki i noclegowy przy ul. Strażackiej 3. Pojemność: 120 osób.', 'low', 'Nowa Dęba', 50.42, 21.755, 'active', 'evacuation', '2024-08-15T08:30:00Z', '2024-08-15T08:30:00Z'),
  ('Zablokowana droga krajowa nr 9', 'DK9 zablokowana przez powalone drzewo na odcinku Nowa Dęba–Tarnobrzeg. Objazdami przez Chmielów.', 'medium', 'Nowa Dęba', 50.415, 21.77, 'active', 'infrastructure', '2024-08-15T09:00:00Z', '2024-08-15T09:00:00Z'),
  ('Zagrożenie skażeniem wody pitnej', 'Badania próbek wody wykazały podwyższony poziom zanieczyszczeń w ujęciu przy ul. Wodociągowej.', 'critical', 'Baranów Sandomierski', 50.5071, 21.5428, 'active', 'security', '2024-08-15T04:00:00Z', '2024-08-15T10:00:00Z'),
  ('Pożar składowiska odpadów', 'Pożar na terenie składowiska przy ul. Przemysłowej. Straż pożarna na miejscu, zalecana ewakuacja w promieniu 500m.', 'high', 'Tarnobrzeg', 50.5732, 21.6804, 'active', 'security', '2024-08-15T11:00:00Z', '2024-08-15T11:00:00Z'),
  ('Uszkodzony most na rzece Trześniówka', 'Most drogowy wykazuje uszkodzenia strukturalne po przejściu fali powodziowej. Ruch wstrzymany.', 'high', 'Nowa Dęba', 50.426, 21.748, 'cancelled', 'infrastructure', '2024-08-14T20:00:00Z', '2024-08-15T06:00:00Z')
) AS v(title, description, severity, municipality, latitude, longitude, status, alert_type, created_at, updated_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.alerts a WHERE a.title = v.title
);

-- ---------------------------------------------------------------------------
-- 11. Seed tasks (resolve org IDs by email)
-- ---------------------------------------------------------------------------

INSERT INTO public.tasks (title, description, priority, status, assigned_organization_id, created_by, municipality, deadline, created_at)
SELECT
  v.title,
  v.description,
  v.priority,
  v.status,
  (SELECT id FROM public.organizations WHERE email = v.assigned_email),
  (SELECT id FROM public.organizations WHERE email = v.created_by_email),
  v.municipality,
  v.deadline::date,
  v.created_at::timestamptz
FROM (VALUES
  ('Zorganizowanie transportu dla ewakuowanych', 'Zabrać 47 osób z ul. Leśnej do punktu zbiórki przy OSP.', 'high', 'in_progress', 'razem.wolontariat@gmail.com', 'urzad@nowadeba.pl', 'Nowa Dęba', '2024-08-15', '2024-08-15T07:30:00Z'),
  ('Dostarczenie worków z piaskiem — ul. Mickiewicza', 'Zabezpieczyć piwnice przy użyciu 500 worków z magazynu gminy.', 'high', 'completed', 'urzad@nowadeba.pl', 'urzad@nowadeba.pl', 'Nowa Dęba', '2024-08-15', '2024-08-15T06:45:00Z'),
  ('Uruchomienie punktu psychologicznego w OSP', 'Fundacja Q ma delegować 2 psychologów do punktu zbiórki.', 'medium', 'new', 'kontakt@fundacjaq.pl', 'urzad@nowadeba.pl', 'Nowa Dęba', '2024-08-15', '2024-08-15T08:45:00Z'),
  ('Dystrybucja wody pitnej — Baranów Sandomierski', 'Caritas dostarcza 800 butelek wody do punktów dystrybucji.', 'high', 'in_progress', 'caritas@diecezja.sandomierz.pl', 'caritas@diecezja.sandomierz.pl', 'Baranów Sandomierski', '2024-08-15', '2024-08-15T09:00:00Z'),
  ('Inspekcja mostu na Trześniówce', 'Komisja techniczna UG ma ocenić stan uszkodzeń i zabezpieczyć teren.', 'medium', 'completed', 'urzad@nowadeba.pl', 'urzad@nowadeba.pl', 'Nowa Dęba', '2024-08-14', '2024-08-14T21:00:00Z'),
  ('Koordynacja wolontariuszy przy ewakuacji', 'Razem wysyła 10 wolontariuszy do wsparcia ewakuacji i obsługi punktu.', 'high', 'in_progress', 'razem.wolontariat@gmail.com', 'kontakt@fundacjaq.pl', 'Nowa Dęba', '2024-08-15', '2024-08-15T08:00:00Z'),
  ('Przygotowanie raportu sytuacyjnego do godz. 18:00', 'Urząd Gminy zbiera dane od wszystkich organizacji i wysyła raport do Podkarpackiego UW.', 'medium', 'new', 'urzad@nowadeba.pl', 'urzad@nowadeba.pl', 'Nowa Dęba', '2024-08-15', '2024-08-15T10:30:00Z')
) AS v(title, description, priority, status, assigned_email, created_by_email, municipality, deadline, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks t WHERE t.title = v.title
)
AND (SELECT id FROM public.organizations WHERE email = v.assigned_email) IS NOT NULL
AND (SELECT id FROM public.organizations WHERE email = v.created_by_email) IS NOT NULL;

-- Link tasks to alerts where titles match
UPDATE public.tasks t
SET related_alert_id = a.id
FROM public.alerts a
WHERE t.related_alert_id IS NULL
  AND (
    (t.title ILIKE '%transport%' AND a.title ILIKE '%Ewakuacja%' AND t.municipality = a.municipality)
    OR (t.title ILIKE '%worków z piaskiem%' AND a.title ILIKE '%Podtopienia w centrum%')
    OR (t.title ILIKE '%psychologicznego%' AND a.title ILIKE '%Punkt zbiórki%')
    OR (t.title ILIKE '%wody pitnej%' AND a.title ILIKE '%skażeniem wody%')
    OR (t.title ILIKE '%mostu%' AND a.title ILIKE '%most na rzece%')
    OR (t.title ILIKE '%wolontariuszy%' AND a.title ILIKE '%Ewakuacja%')
  );

-- ---------------------------------------------------------------------------
-- 12. Seed needs
-- ---------------------------------------------------------------------------

INSERT INTO public.needs (organization_id, category, description, quantity, urgency, status, municipality, created_at)
SELECT
  (SELECT id FROM public.organizations WHERE email = v.org_email),
  v.category,
  v.description,
  v.quantity,
  v.urgency,
  v.status,
  v.municipality,
  v.created_at::timestamptz
FROM (VALUES
  ('kontakt@fundacjaq.pl', 'human', 'Tłumacze języka ukraińskiego', '2 osoby', 'urgent', 'open', 'Nowa Dęba', '2024-08-15T08:00:00Z'),
  ('urzad@nowadeba.pl', 'material', 'Dodatkowe agregaty prądotwórcze', '3 szt.', 'urgent', 'open', 'Nowa Dęba', '2024-08-15T07:30:00Z'),
  ('caritas@diecezja.sandomierz.pl', 'logistics', 'Pojazd do transportu żywności', '1 szt.', 'medium', 'satisfied', 'Baranów Sandomierski', '2024-08-15T06:00:00Z'),
  ('razem.wolontariat@gmail.com', 'material', 'Latarki i baterie', '50 szt.', 'medium', 'open', 'Nowa Dęba', '2024-08-15T09:15:00Z'),
  ('kp.tarnobrzeg@psp.gov.pl', 'human', 'Dodatkowi strażacy z sąsiednich jednostek', '10 osób', 'urgent', 'open', 'Tarnobrzeg', '2024-08-15T11:05:00Z'),
  ('kontakt@fundacjaq.pl', 'material', 'Materace lub karimat do punktu noclegowego', '60 szt.', 'low', 'open', 'Nowa Dęba', '2024-08-15T10:00:00Z')
) AS v(org_email, category, description, quantity, urgency, status, municipality, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.description = v.description AND n.municipality = v.municipality
)
AND (SELECT id FROM public.organizations WHERE email = v.org_email) IS NOT NULL;
