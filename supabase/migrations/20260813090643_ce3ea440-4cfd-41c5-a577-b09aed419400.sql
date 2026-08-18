update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where email in ('gerebcovdima@gmail.com','starx228@gmail.com');

insert into public.organizations (name, type, contact_person, email, phone, municipality, status)
select 'Administracja Systemu', 'admin', 'Administrator', 'admin@system.local', null, 'Nowa Dęba', 'active'
where not exists (select 1 from public.organizations where email = 'admin@system.local');

insert into public.app_users (id, organization_id, active)
select u.id, (select id from public.organizations where email='admin@system.local'), true
from auth.users u
where u.email in ('gerebcovdima@gmail.com','starx228@gmail.com')
on conflict (id) do update set organization_id = excluded.organization_id, active = true;

insert into public.user_roles (user_id, role)
select u.id, 'super_admin'::app_role from auth.users u
where u.email in ('gerebcovdima@gmail.com','starx228@gmail.com')
on conflict (user_id, role) do nothing;