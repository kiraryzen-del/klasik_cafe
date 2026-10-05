insert into public.products (name, category, main_category, subcategory, description, price, image, available, is_best_seller)
values
  ('Amerikano', 'coffee', 'coffee', 'iced-coffee', 'Dark, smooth, and refreshing.', 120, 'images/products/coffee/amerikano.jpg', true, true),
  ('Classic Latte', 'coffee', 'coffee', 'hot-coffee', 'Smooth espresso with steamed milk.', 150, 'images/products/latte.jpg', true, true),
  ('Klasik Espesyal', 'coffee', 'coffee', 'espesyal', 'Our signature house espresso special.', 180, 'images/products/spanish-latte.jpg', true, true),
  ('Mocha Frappe', 'non-coffee', 'non-coffee', 'non-coffee', 'Chocolate and cold cream blend.', 170, 'images/products/icedmocha.jpg', true, false),
  ('Butter Croissant', 'pastries', 'pastries', 'smores', 'Buttery and flaky.', 90, 'images/products/croissant.jpg', true, false),
  ('Extra Shot', 'add-ons', 'add-ons', 'add-ons', 'Extra espresso boost.', 30, 'images/products/coffee.jpg', true, false)
on conflict (name) do nothing;

insert into public.addons (name, description, price, available)
values
  ('Extra Shot', 'Extra espresso boost.', 30, true),
  ('Vanilla', 'A smooth vanilla flavor.', 20, true),
  ('Whipped Cream', 'A cloud of creamy topping.', 20, true),
  ('Caramel', 'Sweet caramel finish.', 20, true)
on conflict (name) do nothing;

insert into public.cafe_info (name, address, hours, phone, facebook, instagram, tiktok, description)
select
  'KLASIK CAFE',
  'Beside Chapel, Matimbubong, San Ildefonso, Bulacan',
  'Mon-Sun: 7:00 AM - 9:00 PM',
  '+63 912 345 6789',
  'facebook.com/klasikcafe',
  '@klasikcafe',
  '@klasikcafe',
  'A neighborhood coffee haven known for handcrafted drinks and warm hospitality.'
where not exists (select 1 from public.cafe_info);
