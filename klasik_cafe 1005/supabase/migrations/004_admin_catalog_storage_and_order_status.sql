-- Show all catalog items/options to customers; ordering still validates availability in place_order.
drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items
  for select to anon, authenticated using (true);

drop policy if exists menu_addons_public_read on public.menu_addons;
create policy menu_addons_public_read on public.menu_addons
  for select to anon, authenticated using (true);

create table if not exists public.store_settings (
  singleton boolean primary key default true check (singleton),
  theme text not null default 'Royal Blue' check (length(trim(theme)) between 1 and 80),
  mobile_menu_enabled boolean not null default true,
  auto_save_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.store_settings enable row level security;
drop policy if exists store_settings_admin_manage on public.store_settings;
create policy store_settings_admin_manage on public.store_settings
  for all to authenticated using (public.is_staff(array['admin']))
  with check (public.is_staff(array['admin']));
grant select, insert, update, delete on public.store_settings to authenticated;

-- Keep Add-ons as a single category and preserve products assigned to its children.
do $$
declare
  v_root_id uuid;
  v_child_ids uuid[];
begin
  select id into v_root_id
  from public.menu_categories
  where slug = 'add-ons' and parent_id is null;

  if v_root_id is null then
    return;
  end if;

  with recursive addon_categories as (
    select id
    from public.menu_categories
    where parent_id = v_root_id
    union all
    select child.id
    from public.menu_categories as child
    join addon_categories as parent on child.parent_id = parent.id
  )
  select array_agg(id) into v_child_ids from addon_categories;

  if v_child_ids is not null then
    update public.menu_items
    set category_id = v_root_id
    where category_id = any(v_child_ids);

    update public.menu_categories
    set parent_id = null
    where id = any(v_child_ids);

    delete from public.menu_categories
    where id = any(v_child_ids);
  end if;
end;
$$;

-- The product image uploader uses public URLs and an admin-only write policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists menu_images_admin_upload on storage.objects;
create policy menu_images_admin_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu-images' and public.is_staff(array['admin']));

drop policy if exists menu_images_admin_update on storage.objects;
create policy menu_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'menu-images' and public.is_staff(array['admin']))
  with check (bucket_id = 'menu-images' and public.is_staff(array['admin']));

drop policy if exists menu_images_admin_delete on storage.objects;
create policy menu_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu-images' and public.is_staff(array['admin']));

drop policy if exists menu_images_admin_select on storage.objects;
create policy menu_images_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'menu-images' and public.is_staff(array['admin']));

create or replace function public.update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_status text;
begin
  if not public.is_staff(array['admin', 'barista']) then
    raise exception 'Only authorized staff can update order status';
  end if;
  if p_status is null or p_status not in ('Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled') then
    raise exception 'Invalid order status';
  end if;

  select status into v_current_status
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_current_status = 'Pending' then
    if p_status <> 'Accepted' then
      raise exception 'Pending orders can only be accepted';
    end if;
  elsif v_current_status = 'Accepted' then
    if p_status not in ('Preparing', 'Cancelled') then
      raise exception 'Accepted orders can only be prepared or cancelled';
    end if;
  elsif v_current_status = 'Preparing' then
    if p_status not in ('Ready', 'Cancelled') then
      raise exception 'Preparing orders can only be marked ready or cancelled';
    end if;
  elsif v_current_status = 'Ready' then
    if p_status not in ('Completed', 'Cancelled') then
      raise exception 'Ready orders can only be completed or cancelled';
    end if;
  else
    raise exception 'This order is already in a final status';
  end if;

  update public.orders
  set status = p_status
  where id = p_order_id;
end;
$$;

revoke all on function public.update_order_status(uuid, text) from public;
grant execute on function public.update_order_status(uuid, text) to authenticated;
