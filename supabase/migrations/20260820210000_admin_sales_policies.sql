-- Super-admin sales dashboard security.
-- The UI is not the security boundary: these policies enforce admin access in Postgres.

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;

create policy "admins can manage orders"
on public.orders
for all
to authenticated
using (public.has_role('admin'::public.app_role, auth.uid()))
with check (public.has_role('admin'::public.app_role, auth.uid()));

create policy "admins can read order items"
on public.order_items
for select
to authenticated
using (public.has_role('admin'::public.app_role, auth.uid()));

create policy "admins can read profiles"
on public.profiles
for select
to authenticated
using (public.has_role('admin'::public.app_role, auth.uid()));
