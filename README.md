# Alerty PL

Platforma koordynacji kryzysowej dla samorządów, służb i organizacji pozarządowych.

## Status merge (sierpień 2026)

Scalono funkcje z prototypu `crisis-platform/` z bazą `alerty-PL` (TanStack Router, Supabase, ciemny motyw domyślny):

- Zadania (`/tasks`), potrzeby (`/needs`), typ alertu, animowane pinezki mapy
- Warstwy mapy: alerty / potrzeby / zasoby
- Dashboard i panel admina z widokiem zadań i potrzeb
- Nawigacja: widok publiczny vs panel organizacji, motyw jasny/ciemny

**Odłożone:** Tablica koordynacji (`/feed`) — trasa przekierowuje do panelu; tabela `feed_posts` w Supabase pozostaje.

---

Crisis Coordination Platform — Lovable Prompt

Project Overview

Build a crisis coordination web app for Polish NGOs, local government units, and emergency services. The core problem: during crises (floods, refugee emergencies), organizations communicate across fragmented channels — Teams, WhatsApp, Messenger, Telegram, SMS — causing outdated and contradictory information. This tool is a single verified hub for alerts, resource tracking, and coordination.

Pilot location: Gmina Nowa Dęba, Poland (~30 verified organizations)
Scale: Architecture must support multiple municipalities from day one

Tech Stack

Layer Technology Frontend React + Vite + Tailwind CSS + Framer Motion + React Router v6 Backend Supabase (auth, database, realtime) Maps Leaflet.js + react-leaflet + OpenStreetMap (no API key needed) Deployment Vercel

User Roles

Role Who What they can do Super Admin Foundation administrator Full access: manage users, orgs, municipalities, all alerts Municipality Coordinator Local government rep Create/cancel alerts for their gmina Emergency Services Police, fire, military Create/cancel alerts NGO Humanitarian Large humanitarian orgs Manage resources, view all alerts NGO Local Local community orgs Manage own resources, view alerts Public Anyone Read-only: alert feed + map, no login required

Important: All roles above Public require manual approval by Super Admin after registration. No automatic access.

Pages & Routes

GET / — Public Alert Feed

No login required.

List of all crisis alerts, ordered by severity then timestamp

Each alert card shows: title, severity badge, municipality name, short description, status pill (Aktywny / Zaktualizowany / Odwołany), time ago

Color-coded severity: green (Niski) / amber (Średni) / red (Wysoki) / black (Krytyczny)

Cancelled alerts appear greyed out at the bottom

Realtime: new alerts appear without page refresh via Supabase subscription

Link to /map prominently displayed: "Pokaż na mapie →"

Mobile-first layout, high contrast, large text

GET /map — Public Interactive Alert Map

No login required.

Full-page map built with Leaflet.js + OpenStreetMap

Default center: Poland (lat: 52.0, lng: 19.0, zoom: 6)

Each alert = colored map pin matching severity:

🟢 Green — Niski

🟡 Amber — Średni

🔴 Red — Wysoki

⚫ Black — Krytyczny

Clicking a pin opens a popup with: title, severity badge, municipality, short description, status, timestamp

Cancelled alerts = greyed-out pins (still visible, not alarming)

Map auto-fits bounds to show all active alerts on load

Realtime: pins appear/disappear without refresh

Desktop layout: map on left (70%), scrollable alert list on right (30%) — clicking an alert in the list pans map to that pin

Mobile layout: full-width map, collapsible alert list below

Implementation notes:

Use react-leaflet: MapContainer, TileLayer, Marker, Popup

Fix Leaflet default icon issue in React using L.Icon with explicit image paths from leaflet/dist/images/

Use L.divIcon with inline SVG colored circles for severity pins (not default blue markers)

TileLayer URL: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

GET /login — Login

Email + password form

If account status is pending → show message: "Twoje konto oczekuje na weryfikację przez administratora." — do not grant access

If status is rejected → show: "Twoje konto zostało odrzucone. Skontaktuj się z administratorem."

GET /register — Organization Registration

Form fields:

Organization name

Organization type (dropdown: NGO humanitarna / NGO lokalna / Samorząd / Służby mundurowe)

Contact person full name

Email

Phone number

Municipality (gmina)

After submit → status set to pending, user sees confirmation screen.
No sensitive data: no PESEL, passport number, health status, or origin.

GET /dashboard — Main Dashboard (login required)

Role-aware overview panel:

Active alerts in user's municipality (with severity colors)

Quick summary of own organization's resources (how many available)

Last 5 posts from coordination feed

Quick action buttons based on role (e.g. "Dodaj zasób", "Utwórz alert" for authorized roles)

GET /alerts — Alert Management (login required, authorized roles only)

List view:

All alerts with status, severity, municipality, creator, timestamp

Filter by: municipality, severity, status

Create alert form:

Title, description, severity selector, municipality

Map picker: click on the map to set lat/lng coordinates — shows a preview pin in real time

Submit → alert appears instantly on public feed and map

Per-alert actions:

"Zaktualizuj alert" — edit description, changes status to updated

"Odwołaj alert" — one click with confirmation dialog → status set to cancelled, pin greys out on map

GET /resources — Resource Registry (login required)

Add resource form:

Category: Ludzkie / Materialne / Logistyczne

Description (free text)

Quantity

Availability window: Dostępne w ciągu 24h / 48h / 72h / tygodnia

Resource list:

Shows all verified organizations' resources

Filter by: category, availability window, municipality

Each row has status badge: Dostępny / Niedostępny

Own organization's resources have: "Oznacz jako niedostępny" button (one click, no form)

GET /feed — Coordination Feed (login required)

Structured activity log — not a chat.

Post form:

Text content

Tag selector: Aktualizacja zasobów / Sytuacja / Zapytanie / Informacja

Municipality auto-filled from user's org

Feed list:

Chronological, newest first

Each post shows: organization name, tag badge, municipality, content, timestamp

Posts with tag Zapytanie can be marked "Oznacz jako rozwiązane" by any verified user

Resolved posts appear collapsed with a green checkmark

GET /organizations — Organization Directory (login required)

Table/card list of all verified organizations

Each entry: name, type badge, municipality, contact person, email, phone

Search by name

Filter by: municipality, organization type

GET /admin — Admin Panel (Super Admin only)

Pending verifications tab:

List of organizations awaiting approval

Each row: org name, type, municipality, contact person, email, registration date

Action buttons: "Zatwierdź" / "Odrzuć"

User management tab:

All active users with their org and role

Ability to deactivate accounts

All alerts tab:

Global view of all alerts across all municipalities

Can cancel any alert

Database Schema

organizations (
  id uuid PRIMARY KEY,
  name text,
  type text CHECK (type IN ('ngo_humanitarian','ngo_local','municipality','emergency','admin')),
  contact_person text,
  email text,
  phone text,
  municipality text,
  status text CHECK (status IN ('pending','active','rejected')),
  created_at timestamptz DEFAULT now()
)

users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  organization_id uuid REFERENCES organizations,
  role text,
  created_at timestamptz DEFAULT now()
)

alerts (
  id uuid PRIMARY KEY,
  title text,
  description text,
  severity text CHECK (severity IN ('low','medium','high','critical')),
  municipality text,
  latitude float,
  longitude float,
  status text CHECK (status IN ('active','updated','cancelled')),
  created_by uuid REFERENCES users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

resources (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  category text CHECK (category IN ('human','material','logistics')),
  description text,
  quantity text,
  availability_window text CHECK (availability_window IN ('24h','48h','72h','1week')),
  status text CHECK (status IN ('available','unavailable')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

feed_posts (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  user_id uuid REFERENCES users,
  content text,
  tag text CHECK (tag IN ('resource_update','situation_update','request','info')),
  municipality text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)


Polish UI Labels (use exactly as written)

English Polish Alerts Alerty Map Mapa alertów Resources Zasoby Organizations Organizacje Coordination feed Tablica koordynacji Pending verification Oczekuje na weryfikację Cancel alert Odwołaj alert Update alert Zaktualizuj alert Available within 24h Dostępne w ciągu 24h Mark as resolved Oznacz jako rozwiązane Approve Zatwierdź Reject Odrzuć Show on map Pokaż na mapie Severity: Low Niski Severity: Medium Średni Severity: High Wysoki Severity: Critical Krytyczny Status: Active Aktywny Status: Updated Zaktualizowany Status: Cancelled Odwołany Available Dostępny Unavailable Niedostępny

Design Rules

Crisis tool aesthetic: clean, functional, zero decoration — every element earns its place

Severity colors used consistently across alert cards, map pins, and badges

Mobile-first: field workers operate on phones in stressful conditions — large tap targets, high contrast, minimal scrolling

Framer Motion: subtle fade/slide transitions only — no decorative animations

Map page desktop: split view (map 70% / list 30%)

Map page mobile: full-width map, collapsible list below

All UI text in Polish

What NOT to Build in MVP

No WhatsApp / Messenger / Telegram / Teams API integrations

No offline / low-connectivity mode

No file uploads or attachments

No push notifications

No citizen resource request forms (public pages are read-only)

No map view on pages other than /map

Build Order

/ public alert feed + /map interactive alert map

/login + /register + pending verification flow

/admin approval panel

/dashboard role-aware home

/alerts create, update, cancel + map coordinate picker

/resources registry

/feed coordination log

/organizations directory

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c26efed9-232f-483c-8d34-878227a556b8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
