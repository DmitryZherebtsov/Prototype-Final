-- Phase 8+: expanded demo dataset (alerts, resources, tasks, needs, feed)
-- Idempotent — safe to run multiple times (skips duplicates by title/description).

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------

INSERT INTO public.organizations (name, type, contact_person, email, phone, municipality, status)
SELECT v.name, v.type, v.contact_person, v.email, v.phone, v.municipality, v.status
FROM (VALUES
  ('PCK Nowa Dęba', 'ngo_local', 'Joanna Wiśniewska', 'pck@nowadeba.pl', '+48 15 846 28 90', 'Nowa Dęba', 'active'),
  ('Centrum Pomocy Społecznej Tarnobrzeg', 'municipality', 'Robert Kaczmarek', 'cps@tarnobrzeg.pl', '+48 15 823 55 10', 'Tarnobrzeg', 'active'),
  ('WOPR Stalowa Wola', 'emergency', 'Damian Lis', 'wopr.stalowawola@gmail.com', '+48 601 445 220', 'Stalowa Wola', 'active'),
  ('Parafia pw. św. Barbary — Gorzyce', 'ngo_local', 'Ks. Adam Biel', 'parafia.gorzyce@op.pl', '+48 15 846 31 02', 'Gorzyce', 'active'),
  ('Klub Sportowy „Iskra” Grębów', 'ngo_local', 'Michał Orzech', 'iskra.grebow@gmail.com', '+48 602 118 903', 'Grębów', 'active')
) AS v(name, type, contact_person, email, phone, municipality, status)
WHERE NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.email = v.email);

-- ---------------------------------------------------------------------------
-- Alerts (public map + feed)
-- ---------------------------------------------------------------------------

INSERT INTO public.alerts (title, description, severity, municipality, latitude, longitude, status, alert_type, created_at, updated_at)
SELECT v.title, v.description, v.severity, v.municipality, v.latitude, v.longitude, v.status, v.alert_type, v.created_at::timestamptz, v.updated_at::timestamptz
FROM (VALUES
  ('Osunięcie skarpy przy DK 19 — Gorzyce', 'Ruch wahadłowy wprowadzony. Geolog ocenia stabilność zbocza. Unikać postoju w strefie zagrożenia.', 'high', 'Gorzyce', 50.398, 21.828, 'active', 'infrastructure', '2024-08-15T12:00:00Z', '2024-08-15T12:00:00Z'),
  ('Ewakuacja domu kultury — Stalowa Wola', 'Zalana piwnica i ryzyko pęknięcia ściany nośnej. 35 osób przeniesiono do hali MOSiR.', 'critical', 'Stalowa Wola', 50.561, 22.068, 'active', 'evacuation', '2024-08-15T11:30:00Z', '2024-08-15T13:00:00Z'),
  ('Silne opady — podtopienia parkingów', 'Woda stoi na parkingu przy urzędzie miejskim. Pompownia mobilna w drodze.', 'medium', 'Stalowa Wola', 50.569, 22.058, 'updated', 'flood', '2024-08-15T10:00:00Z', '2024-08-15T12:30:00Z'),
  ('Ostrzeżenie przed burzami z gradem', 'IMGW: burze z opadami do 40 mm/h i gradem do 2 cm. Zabezpieczyć okna i pojazdy.', 'low', 'Grębów', 50.568, 21.865, 'active', 'weather', '2024-08-15T14:00:00Z', '2024-08-15T14:00:00Z'),
  ('Utrata łączności GSM — rejon Bojanów', 'Operator zgłasza awarię stacji bazowej. Komunikacja radiowa PSP utrzymana.', 'medium', 'Bojanów', 50.432, 21.948, 'active', 'infrastructure', '2024-08-15T13:15:00Z', '2024-08-15T13:15:00Z'),
  ('Wyciek gazu — ul. Szkolna Tarnobrzeg', 'Ewakuacja 12 mieszkań. Straż gazowa zabezpieczyła teren. Trwa naprawa.', 'critical', 'Tarnobrzeg', 50.578, 21.692, 'active', 'security', '2024-08-15T15:00:00Z', '2024-08-15T15:20:00Z'),
  ('Punkt ciepłej posiłku — hala PCK', 'Od 16:00 gorący posiłek dla ewakuowanych i wolontariuszy. Potrzebni kucharze.', 'low', 'Nowa Dęba', 50.424, 21.758, 'active', 'general', '2024-08-15T15:30:00Z', '2024-08-15T15:30:00Z'),
  ('Zalane piwnice — os. Słoneczne', 'Piwnice 8 budynków wymagają odwodnienia. Prośba o pompy i węże.', 'high', 'Nowa Dęba', 50.419, 21.744, 'active', 'flood', '2024-08-15T14:45:00Z', '2024-08-15T16:00:00Z'),
  ('Przerwa w dostawie wody — Baranów', 'Zawór główny wymieniony. Przywrócono ciśnienie w 80% sieci.', 'medium', 'Baranów Sandomierski', 50.511, 21.538, 'updated', 'infrastructure', '2024-08-15T08:00:00Z', '2024-08-15T14:00:00Z'),
  ('Utonięcie w zbiorniku retencyjnym — odwołano', 'Fałszywy alarm — ćwiczenia WOPR zakończone. Brak zagrożenia.', 'high', 'Stalowa Wola', 50.555, 22.042, 'cancelled', 'security', '2024-08-14T18:00:00Z', '2024-08-15T07:00:00Z'),
  ('Zalanie boiska — KS Iskra Grębów', 'Boisko i szatnie pod wodą. Treningi odwołane do odwołania wody.', 'low', 'Grębów', 50.562, 21.878, 'active', 'flood', '2024-08-15T16:10:00Z', '2024-08-15T16:10:00Z'),
  ('Brak prądu — rejon stacji PKP Tarnobrzeg', 'Awaria linii SN. Pociągi kursują z opóźnieniem. Szacowany czas naprawy 3h.', 'high', 'Tarnobrzeg', 50.581, 21.671, 'active', 'power', '2024-08-15T16:30:00Z', '2024-08-15T16:30:00Z')
) AS v(title, description, severity, municipality, latitude, longitude, status, alert_type, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM public.alerts a WHERE a.title = v.title);

-- Backfill alert_type on legacy rows still marked general
UPDATE public.alerts SET alert_type = 'flood'
  WHERE alert_type = 'general' AND title ILIKE '%podtopien%';
UPDATE public.alerts SET alert_type = 'evacuation'
  WHERE alert_type = 'general' AND (title ILIKE '%uchodźc%' OR title ILIKE '%zbiórk%');
UPDATE public.alerts SET alert_type = 'weather'
  WHERE alert_type = 'general' AND title ILIKE '%meteorolog%';

-- ---------------------------------------------------------------------------
-- Resources
-- ---------------------------------------------------------------------------

INSERT INTO public.resources (organization_id, category, description, quantity, availability_window, status)
SELECT
  (SELECT id FROM public.organizations WHERE email = v.org_email),
  v.category, v.description, v.quantity, v.availability_window, v.status
FROM (VALUES
  ('kontakt@fundacjaq.pl', 'human', 'Zespół psychologów kryzysowych', '4 osoby', '24h', 'available'),
  ('kontakt@fundacjaq.pl', 'material', 'Koce termiczne', '200 szt.', '48h', 'available'),
  ('urzad@nowadeba.pl', 'logistics', 'Ciężarówka z pompką', '1 szt.', '24h', 'available'),
  ('urzad@nowadeba.pl', 'material', 'Worki z piaskiem', '1200 szt.', '24h', 'available'),
  ('osp@nowadeba.pl', 'human', 'Strażacy ochotnicy', '18 osób', '24h', 'available'),
  ('osp@nowadeba.pl', 'logistics', 'Ponton ratowniczy', '1 szt.', '48h', 'available'),
  ('kp.tarnobrzeg@psp.gov.pl', 'human', 'Zespół ratownictwa chemicznego', '6 osób', '24h', 'available'),
  ('kp.tarnobrzeg@psp.gov.pl', 'material', 'Agregat prądotwórczy 40 kVA', '2 szt.', '24h', 'available'),
  ('caritas@diecezja.sandomierz.pl', 'material', 'Paczki żywnościowe', '350 szt.', '72h', 'available'),
  ('caritas@diecezja.sandomierz.pl', 'logistics', 'Bus chłodniczy', '1 szt.', '48h', 'unavailable'),
  ('razem.wolontariat@gmail.com', 'human', 'Wolontariusze terenowi', '25 osób', '24h', 'available'),
  ('wopr.stalowawola@gmail.com', 'human', 'Ratownicy wodni', '8 osób', '24h', 'available'),
  ('wopr.stalowawola@gmail.com', 'logistics', 'Skuter wodny', '1 szt.', '48h', 'available'),
  ('pck@nowadeba.pl', 'material', 'Łóżka polowe', '40 szt.', '48h', 'available'),
  ('cps@tarnobrzeg.pl', 'human', 'Pracownicy socjalni', '5 osób', '72h', 'available'),
  ('kontakt@pomocpodkarpacie.pl', 'material', 'Butelki wody 1,5 l', '500 szt.', '24h', 'available')
) AS v(org_email, category, description, quantity, availability_window, status)
WHERE NOT EXISTS (
  SELECT 1 FROM public.resources r
  JOIN public.organizations o ON o.id = r.organization_id
  WHERE o.email = v.org_email AND r.description = v.description
)
AND (SELECT id FROM public.organizations WHERE email = v.org_email) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

INSERT INTO public.tasks (title, description, priority, status, assigned_organization_id, created_by, municipality, deadline, created_at)
SELECT v.title, v.description, v.priority, v.status,
  (SELECT id FROM public.organizations WHERE email = v.assigned_email),
  (SELECT id FROM public.organizations WHERE email = v.created_by_email),
  v.municipality, v.deadline::date, v.created_at::timestamptz
FROM (VALUES
  ('Zabezpieczenie osuwiska — Gorzyce', 'Ustawić taśmy i monitoring geologiczny przy DK 19.', 'high', 'in_progress', 'urzad@nowadeba.pl', 'urzad@nowadeba.pl', 'Gorzyce', '2024-08-16', '2024-08-15T12:30:00Z'),
  ('Transport ewakuowanych do MOSiR Stalowa Wola', '3 busy gminnych — 2 kursy. Lista osób u CPS.', 'high', 'in_progress', 'cps@tarnobrzeg.pl', 'wopr.stalowawola@gmail.com', 'Stalowa Wola', '2024-08-15', '2024-08-15T11:45:00Z'),
  ('Uruchomienie punktu ciepłej posiłki PCK', 'Przygotować 120 porcji obiadu. Koordynacja z Caritas.', 'medium', 'new', 'pck@nowadeba.pl', 'urzad@nowadeba.pl', 'Nowa Dęba', '2024-08-15', '2024-08-15T15:45:00Z'),
  ('Odwodnienie piwnic os. Słoneczne', '2 pompy + węże z magazynu OSP. Rotacja co 4h.', 'high', 'new', 'osp@nowadeba.pl', 'urzad@nowadeba.pl', 'Nowa Dęba', '2024-08-15', '2024-08-15T15:00:00Z'),
  ('Patrol ratowniczy WOPR — zbiornik', 'Patrol do odwołania alertu. Raport co 2h.', 'medium', 'completed', 'wopr.stalowawola@gmail.com', 'wopr.stalowawola@gmail.com', 'Stalowa Wola', '2024-08-15', '2024-08-15T07:30:00Z'),
  ('Dystrybucja koców termicznych', '200 kocy do punktów noclegowych w Nowa Dęba i Tarnobrzeg.', 'medium', 'in_progress', 'kontakt@fundacjaq.pl', 'kontakt@fundacjaq.pl', 'Nowa Dęba', '2024-08-16', '2024-08-15T13:00:00Z'),
  ('Wsparcie przy wycieku gazu — ul. Szkolna', 'Pomoc w ewakuacji i transport seniorów do CPS.', 'high', 'in_progress', 'cps@tarnobrzeg.pl', 'kp.tarnobrzeg@psp.gov.pl', 'Tarnobrzeg', '2024-08-15', '2024-08-15T15:10:00Z'),
  ('Rejestracja wolontariuszy — zmiana wieczorna', 'Przyjąć 15 osób na zmianę 18–24. Briefing o 17:45.', 'low', 'new', 'razem.wolontariat@gmail.com', 'kontakt@fundacjaq.pl', 'Nowa Dęba', '2024-08-15', '2024-08-15T16:00:00Z'),
  ('Odprowadzenie wody z boiska Iskra', 'Wynajęta pompa — potrzebny operator i prąd.', 'low', 'new', 'iskra.grebow@gmail.com', 'iskra.grebow@gmail.com', 'Grębów', '2024-08-17', '2024-08-15T16:20:00Z'),
  ('Aktualizacja mapy zasobów — powiat', 'Uzupełnić rejestr o nowe agregaty i busy.', 'low', 'new', 'urzad@nowadeba.pl', 'urzad@nowadeba.pl', 'Nowa Dęba', '2024-08-16', '2024-08-15T17:00:00Z')
) AS v(title, description, priority, status, assigned_email, created_by_email, municipality, deadline, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.title = v.title)
AND (SELECT id FROM public.organizations WHERE email = v.assigned_email) IS NOT NULL
AND (SELECT id FROM public.organizations WHERE email = v.created_by_email) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Needs (with coordinates where useful for map layer)
-- ---------------------------------------------------------------------------

INSERT INTO public.needs (organization_id, category, description, quantity, urgency, status, municipality, latitude, longitude, created_at)
SELECT
  (SELECT id FROM public.organizations WHERE email = v.org_email),
  v.category, v.description, v.quantity, v.urgency, v.status, v.municipality,
  v.latitude, v.longitude, v.created_at::timestamptz
FROM (VALUES
  ('osp@nowadeba.pl', 'material', 'Pompy ssące do odwodnienia piwnic', '4 szt.', 'urgent', 'open', 'Nowa Dęba', 50.419, 21.744, '2024-08-15T14:50:00Z'),
  ('pck@nowadeba.pl', 'human', 'Kucharze na punkt posiłkowy', '6 osób', 'medium', 'open', 'Nowa Dęba', 50.424, 21.758, '2024-08-15T15:35:00Z'),
  ('wopr.stalowawola@gmail.com', 'logistics', 'Bus do ewakuacji z MOSiR', '2 szt.', 'urgent', 'open', 'Stalowa Wola', 50.561, 22.068, '2024-08-15T11:40:00Z'),
  ('cps@tarnobrzeg.pl', 'material', 'Leki podstawowe dla seniorów', '200 opak.', 'medium', 'open', 'Tarnobrzeg', 50.578, 21.692, '2024-08-15T15:25:00Z'),
  ('parafia.gorzyce@op.pl', 'material', 'Koce i śpiwory dla rodzin z dziećmi', '30 kompletów', 'medium', 'open', 'Gorzyce', 50.398, 21.828, '2024-08-15T12:15:00Z'),
  ('iskra.grebow@gmail.com', 'logistics', 'Pompa do odwodnienia boiska', '1 szt.', 'low', 'open', 'Grębów', 50.562, 21.878, '2024-08-15T16:15:00Z'),
  ('kontakt@pomocpodkarpacie.pl', 'human', 'Ratownicy z certyfikatem KPP', '8 osób', 'urgent', 'open', 'Nowa Dęba', 50.422, 21.751, '2024-08-15T13:00:00Z'),
  ('kp.tarnobrzeg@psp.gov.pl', 'material', 'Detektory gazu przenośne', '5 szt.', 'urgent', 'satisfied', 'Tarnobrzeg', 50.573, 21.680, '2024-08-15T15:05:00Z'),
  ('razem.wolontariat@gmail.com', 'human', 'Tłumacze ukraińskiego — zmiana nocna', '3 osoby', 'medium', 'open', 'Nowa Dęba', 50.431, 21.743, '2024-08-15T17:10:00Z'),
  ('caritas@diecezja.sandomierz.pl', 'material', 'Mleko modyfikowane dla niemowląt', '40 opak.', 'urgent', 'open', 'Baranów Sandomierski', 50.507, 21.543, '2024-08-15T09:30:00Z')
) AS v(org_email, category, description, quantity, urgency, status, municipality, latitude, longitude, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.needs n WHERE n.description = v.description AND n.municipality = v.municipality
)
AND (SELECT id FROM public.organizations WHERE email = v.org_email) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Feed posts (coordination log — table kept for future /feed redesign)
-- ---------------------------------------------------------------------------

INSERT INTO public.feed_posts (organization_id, content, tag, municipality, resolved, created_at)
SELECT
  (SELECT id FROM public.organizations WHERE email = v.org_email),
  v.content, v.tag, v.municipality, v.resolved, v.created_at::timestamptz
FROM (VALUES
  ('urzad@nowadeba.pl', 'Sytuacja w centrum stabilna. Poziom wody spada o ok. 3 cm/h. Prosimy o raporty z terenu do 18:00.', 'situation_update', 'Nowa Dęba', false, '2024-08-15T16:00:00Z'),
  ('kontakt@fundacjaq.pl', 'Potrzebujemy 2 dodatkowych tłumaczy na punkt zbiórki — pilne do 20:00.', 'request', 'Nowa Dęba', false, '2024-08-15T16:45:00Z'),
  ('kp.tarnobrzeg@psp.gov.pl', 'Wyciek gazu przy ul. Szkolnej opanowany. Ewakuowanym zapewniono transport do CPS.', 'situation_update', 'Tarnobrzeg', false, '2024-08-15T15:30:00Z'),
  ('razem.wolontariat@gmail.com', 'Zarejestrowano 42 wolontariuszy na dziś. Kolejna zmiana od 18:00 — prosimy o zgłoszenia.', 'info', 'Nowa Dęba', false, '2024-08-15T17:00:00Z'),
  ('caritas@diecezja.sandomierz.pl', 'Dostarczono 350 paczek żywnościowych do Baranowa i okolic. Magazyn uzupełniony.', 'resource_update', 'Baranów Sandomierski', true, '2024-08-15T14:00:00Z'),
  ('wopr.stalowawola@gmail.com', 'Fałszywy alarm na zbiorniku — ćwiczenia zakończone. Brak zagrożenia dla ludności.', 'info', 'Stalowa Wola', true, '2024-08-15T07:15:00Z'),
  ('osp@nowadeba.pl', 'Zapytanie: kto może pożyczyć dodatkowy agregat 10 kVA na os. Słoneczne?', 'request', 'Nowa Dęba', false, '2024-08-15T15:50:00Z'),
  ('cps@tarnobrzeg.pl', 'Przy CPS przyjęto 23 osoby z ewakuacji w Stalowej Woli. Zapewniono posiłki i opiekę.', 'situation_update', 'Tarnobrzeg', false, '2024-08-15T12:00:00Z')
) AS v(org_email, content, tag, municipality, resolved, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.feed_posts f
  JOIN public.organizations o ON o.id = f.organization_id
  WHERE o.email = v.org_email AND f.content = v.content
)
AND (SELECT id FROM public.organizations WHERE email = v.org_email) IS NOT NULL;
