create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  username text not null unique,
  email text not null unique,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'barista', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  main_category text not null,
  subcategory text,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image text,
  available boolean not null default true,
  is_best_seller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  price numeric(10,2) not null check (price >= 0),
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Preparing', 'Ready', 'Completed')),
  total numeric(10,2) not null check (total >= 0),
  special_request text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  total_price numeric(10,2) not null check (total_price >= 0),
  size text,
  milk text,
  sweetness text,
  ice text,
  special_request text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  suggestion text not null,
  status text not null default 'New' check (status in ('New', 'Reviewing', 'Resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cafe_info (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'KLASIK CAFE',
  address text not null default 'Beside Chapel, Matimbubong, San Ildefonso, Bulacan',
  hours text not null default 'Mon-Sun: 7:00 AM - 9:00 PM',
  phone text not null default '+63 912 345 6789',
  facebook text default 'facebook.com/klasikcafe',
  instagram text default '@klasikcafe',
  tiktok text default '@klasikcafe',
  description text default 'A neighborhood coffee haven known for handcrafted drinks and warm hospitality.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_products_main_category on public.products(main_category);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_reviews_customer on public.reviews(customer_id);
create index if not exists idx_suggestions_customer on public.suggestions(customer_id);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.addons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.suggestions enable row level security;
alter table public.cafe_info enable row level security;

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = required_role
  );
$$;

revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to anon, authenticated;
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, phone) on public.profiles to authenticated;

drop policy if exists "profiles are viewable by owner or admins" on public.profiles;
drop policy if exists "profiles can update their own record" on public.profiles;
drop policy if exists "public profile insert is limited to the current user" on public.profiles;
drop policy if exists "guests can read available products" on public.products;
drop policy if exists "admins can manage products" on public.products;
drop policy if exists "guests can read available add-ons" on public.addons;
drop policy if exists "admins can manage add-ons" on public.addons;
drop policy if exists "customers can create their own orders" on public.orders;
drop policy if exists "customers can read their own orders" on public.orders;
drop policy if exists "baristas and admins can read all orders" on public.orders;
drop policy if exists "baristas and admins can update order status" on public.orders;
drop policy if exists "customers can create their own order items through their order" on public.order_items;
drop policy if exists "customers can read order items for their orders" on public.order_items;
drop policy if exists "baristas and admins can read all order items" on public.order_items;
drop policy if exists "guests can read reviews" on public.reviews;
drop policy if exists "customers can create their own reviews" on public.reviews;
drop policy if exists "admins can delete reviews" on public.reviews;
drop policy if exists "guests can read suggestions" on public.suggestions;
drop policy if exists "customers can create their own suggestions" on public.suggestions;
drop policy if exists "customers can read their own suggestions" on public.suggestions;
drop policy if exists "admins can manage suggestions" on public.suggestions;
drop policy if exists "guests can read cafe information" on public.cafe_info;
drop policy if exists "admins can manage cafe information" on public.cafe_info;

create policy "profiles are viewable by owner or admins" on public.profiles
  for select using (
    auth.uid() = id
    or public.has_role('admin')
  );

create policy "profiles can update their own record" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "guests can read available products" on public.products
  for select using (available = true);

create policy "admins can manage products" on public.products
  for all using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "guests can read available add-ons" on public.addons
  for select using (available = true);

create policy "admins can manage add-ons" on public.addons
  for all using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "customers can create their own orders" on public.orders
  for insert with check (auth.uid() = customer_id);

create policy "customers can read their own orders" on public.orders
  for select using (auth.uid() = customer_id);

create policy "baristas and admins can read all orders" on public.orders
  for select using (public.has_role('barista') or public.has_role('admin'));

create policy "baristas and admins can update order status" on public.orders
  for update using (public.has_role('barista') or public.has_role('admin'))
  with check (public.has_role('barista') or public.has_role('admin'));

create policy "customers can create their own order items through their order" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "customers can read order items for their orders" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "baristas and admins can read all order items" on public.order_items
  for select using (public.has_role('barista') or public.has_role('admin'));

create policy "guests can read reviews" on public.reviews
  for select using (true);

create policy "customers can create their own reviews" on public.reviews
  for insert with check (auth.uid() = customer_id);

create policy "admins can delete reviews" on public.reviews
  for delete using (public.has_role('admin'));

create policy "customers can create their own suggestions" on public.suggestions
  for insert with check (auth.uid() = customer_id);

create policy "customers can read their own suggestions" on public.suggestions
  for select using (auth.uid() = customer_id or public.has_role('admin'));

create policy "admins can manage suggestions" on public.suggestions
  for all using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "guests can read cafe information" on public.cafe_info
  for select using (true);

create policy "admins can manage cafe information" on public.cafe_info
  for all using (public.has_role('admin'))
  with check (public.has_role('admin'));

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, username, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'username', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'customer'
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    username = excluded.username,
    email = excluded.email,
    phone = excluded.phone;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_products_updated_at on public.products;
drop trigger if exists set_orders_updated_at on public.orders;
drop trigger if exists set_suggestions_updated_at on public.suggestions;
drop trigger if exists set_cafe_info_updated_at on public.cafe_info;

create trigger set_products_updated_at
before update on public.products
for each row execute procedure public.update_updated_at();

create trigger set_orders_updated_at
before update on public.orders
for each row execute procedure public.update_updated_at();

create trigger set_suggestions_updated_at
before update on public.suggestions
for each row execute procedure public.update_updated_at();

create trigger set_cafe_info_updated_at
before update on public.cafe_info
for each row execute procedure public.update_updated_at();
