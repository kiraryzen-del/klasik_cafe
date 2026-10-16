-- Keep checkout customization prices authoritative in the database.
insert into public.menu_addons (slug, name, price, is_available)
values
  ('large-size-upgrade', 'Large Size Upgrade', 25, true),
  ('oreo', 'Oreo', 15, true),
  ('biscoff', 'Biscoff', 25, true),
  ('cold-foam', 'Cold Foam', 15, true),
  ('seasalt-cream', 'Seasalt Cream', 15, true),
  ('extra-shot', 'Extra Shot', 25, true),
  ('sauces-syrup', 'Sauces Syrup', 15, true),
  ('oat-milk-substitute', 'Oat Milk Substitute', 25, true)
on conflict (slug) do update
set name = excluded.name,
    price = excluded.price,
    is_available = true;

update public.menu_addons
set is_available = false
where slug in ('caramel', 'vanilla', 'whipped-cream');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

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

  select status into v_current_status
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_current_status = 'Pending' then
    if p_status <> 'Accepted' then
      raise exception 'Pending orders must be confirmed before they can advance';
    end if;
    if not public.is_staff(array['barista']) then
      raise exception 'Only a bartender can confirm a pending order';
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

grant execute on function public.update_order_status(uuid, text) to authenticated;
