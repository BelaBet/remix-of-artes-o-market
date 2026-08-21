create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated, service_role;

-- drop policies depending on the helpers
drop policy if exists "Artisans can insert their own products" on public.products;
drop policy if exists "Admins read the audit log" on public.admin_audit_log;
drop policy if exists "Admins manage all products" on public.products;
drop policy if exists "Admins manage all profiles" on public.profiles;
drop policy if exists "Admins manage all reviews" on public.reviews;
drop policy if exists "Admins read all favorites" on public.favorites;
drop policy if exists "Admins manage all roles" on public.user_roles;
drop policy if exists "Admins read all orders" on public.orders;
drop policy if exists "Admins read all order items" on public.order_items;
drop policy if exists "Admins update orders" on public.orders;
drop policy if exists "Admins manage order items" on public.order_items;
drop policy if exists "Buyers and selling artisans can view orders" on public.orders;
drop policy if exists "Buyers and selling artisans can view order items" on public.order_items;

alter function public.has_role(uuid, public.app_role) set schema private;
alter function public.is_order_buyer(uuid, uuid) set schema private;
alter function public.is_order_seller(uuid, uuid) set schema private;

alter function private.has_role(uuid, public.app_role) set search_path = public;
alter function private.is_order_buyer(uuid, uuid) set search_path = public;
alter function private.is_order_seller(uuid, uuid) set search_path = public;

revoke all on function private.has_role(uuid, public.app_role) from public, anon;
revoke all on function private.is_order_buyer(uuid, uuid) from public, anon;
revoke all on function private.is_order_seller(uuid, uuid) from public, anon;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function private.is_order_buyer(uuid, uuid) to authenticated, service_role;
grant execute on function private.is_order_seller(uuid, uuid) to authenticated, service_role;

-- recreate policies
create policy "Artisans can insert their own products" on public.products for insert to authenticated
  with check ((auth.uid() = artisan_user_id) and private.has_role(auth.uid(), 'artisan'::public.app_role));
create policy "Admins read the audit log" on public.admin_audit_log for select to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins manage all products" on public.products for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins manage all profiles" on public.profiles for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins manage all reviews" on public.reviews for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins read all favorites" on public.favorites for select to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins manage all roles" on public.user_roles for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins read all orders" on public.orders for select to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins read all order items" on public.order_items for select to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins update orders" on public.orders for update to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins manage order items" on public.order_items for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Buyers and selling artisans can view orders" on public.orders for select to authenticated
  using ((auth.uid() = buyer_user_id) or private.is_order_seller(id, auth.uid()));
create policy "Buyers and selling artisans can view order items" on public.order_items for select to authenticated
  using ((artisan_user_id = auth.uid()) or private.is_order_buyer(order_id, auth.uid()));