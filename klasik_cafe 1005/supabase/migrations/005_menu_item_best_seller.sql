alter table public.menu_items
  add column if not exists best_seller boolean not null default false;
