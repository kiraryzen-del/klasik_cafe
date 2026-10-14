-- Idempotent import of all 72 existing index.html product cards.
-- Catalog cards have no root-level availability flag; preserve them as available.
-- Stable source keys and legacy-row matching avoid duplicate imports and overwrites.

insert into public.menu_categories (slug, name, parent_id, sort_order)
values
  ('coffee', 'Coffee', null, 1),
  ('non-coffee', 'Non Coffee', null, 2),
  ('matcha', 'Matcha Series', null, 3),
  ('pastries', 'Pastries', null, 4),
  ('snacks', 'Snacks', null, 5),
  ('pasta', 'Pasta', null, 6),
  ('add-ons', 'Add-ons', null, 7)
on conflict (slug) do nothing;

insert into public.menu_categories (slug, name, parent_id, sort_order)
select v.slug, v.name, parent.id, v.sort_order
from (values
  ('coffee-iced-coffee', 'Iced Coffee', 'coffee', 1),
  ('coffee-hot-coffee', 'Hot Coffee', 'coffee', 2),
  ('coffee-espesyal', 'Espesyal', 'coffee', 3),
  ('noncoffee-non-coffee', 'Non Coffee', 'non-coffee', 1),
  ('noncoffee-espesyal', 'Espesyal', 'non-coffee', 2),
  ('pastries-smores', 'Smores Series', 'pastries', 1),
  ('pastries-cookies', 'Cookies', 'pastries', 2),
  ('pastries-cheesecakes', 'Cheesecakes', 'pastries', 3)
) as v(slug, name, parent_slug, sort_order)
join public.menu_categories as parent on parent.slug = v.parent_slug
on conflict (slug) do nothing;

insert into public.cafe_info (
  singleton, name, address, opening_hours, phone, facebook, instagram, tiktok, description
)
values (
  true,
  'KLASIK CAFE',
  'Beside Chapel, Matimbubong, San Ildefonso, Bulacan',
  'Monday – Sunday 8:00 AM – 9:00 PM',
  '0912-345-6789',
  'https://www.facebook.com/',
  'https://www.instagram.com/',
  'https://www.tiktok.com/',
  'Your classic coffee experience. Made with care in San Ildefonso.'
)
on conflict (singleton) do nothing;

insert into public.menu_items (source_key, category_id, sort_order, name, description, price, image_path, is_available)
select v.source_key, c.id, v.sort_order, v.name, v.description, v.price, v.image_path, true
from (values
  ('homepage-3dcb08041abb79f284c1059bb45cf68c', 1, 'coffee-iced-coffee', 'Amerikano', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/amerikano.jpg'),
  ('homepage-fb768f40bd16bc722bf07d077b6727d3', 2, 'coffee-iced-coffee', 'Cafe Latte', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/tresletches.jpg'),
  ('homepage-db0c5856e9d353a40ce51bf70733736a', 3, 'coffee-iced-coffee', 'Caramel Latte', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/caramelmacchiato.jpg'),
  ('homepage-22dd5cdd3b3a8becb8f7093d07073c89', 4, 'coffee-iced-coffee', 'Dirty Matcha', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/matcha something.jpg'),
  ('homepage-bdcc6b1153e1ea309b339be0fc370acd', 5, 'coffee-iced-coffee', 'Dirty Strawberry', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/strawbmatcha.jpg'),
  ('homepage-3f1bfae73ea4514179838d888982069c', 6, 'coffee-iced-coffee', 'French Vanilla', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/seasaltlatte.jpg'),
  ('homepage-1ecb6544da8af8099888d9c7bcb91b4e', 7, 'coffee-iced-coffee', 'Hazelnut Latte', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/klasikpremium.jpg'),
  ('homepage-89e83330454deabacd0fba2453041d96', 8, 'coffee-iced-coffee', 'Iced Mocha', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/amerikano.jpg'),
  ('homepage-1b6569d4ea4aa73dae3bc7d46fb645c9', 9, 'coffee-iced-coffee', 'Oreo Latte', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/icedmocha.jpg'),
  ('homepage-5e7809405276721b5110c00fe42573b7', 10, 'coffee-iced-coffee', 'Spanish Latte', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/caramelmacchiato.jpg'),
  ('homepage-bb0ca4527ae5d2eae5bda91a18229d55', 11, 'coffee-iced-coffee', 'Tres Letches', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/tresletches.jpg'),
  ('homepage-67a7ebef6e05897b7cb54c5f36eb52e5', 12, 'coffee-hot-coffee', 'Spanish Latte', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/latte.jpg'),
  ('homepage-c662198c317ad6b2abb9d8ad4775bb28', 13, 'coffee-hot-coffee', 'Hot Mocha', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/caramelmacchiato.jpg'),
  ('homepage-2f285a059c79c9c20bd41d0ae38f36a6', 14, 'coffee-hot-coffee', 'White Mocha', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/tresletches.jpg'),
  ('homepage-a74417423d8293baf041c720cdfa2ae4', 15, 'coffee-hot-coffee', 'Vanilla Latte', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/minasalatte.jpg'),
  ('homepage-c2ebc88a177dfb9ea0d07f621f2c4d7d', 16, 'coffee-hot-coffee', 'Hot Matcha', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/manggoklasikmilk.jpg'),
  ('homepage-b3cb08f6af582d66db6dc3a440e079b4', 17, 'coffee-hot-coffee', 'Hot Choco', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/coffee/tresletches.jpg'),
  ('homepage-56d4e8d312258418330db02d62a377c8', 18, 'coffee-espesyal', 'Biscoff Latte', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/seasaltlatte.jpg'),
  ('homepage-1abdae25e51de7677c166cb4b9d7dba4', 19, 'coffee-espesyal', 'Barista Drink', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/amerikano.jpg'),
  ('homepage-7478e92957157ab16a4d0540c703371c', 20, 'coffee-espesyal', 'Caramel Macchiato', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/minasalatte.jpg'),
  ('homepage-a2fcfc962ffda2bcffbd51864586ef31', 21, 'coffee-espesyal', 'Hazelnut Mocha', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/manggoklasikmilk.jpg'),
  ('homepage-9144096bc80d47335b5f9649bc57a389', 22, 'coffee-espesyal', 'Nutella Latte', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/seasaltmatcha.jpg'),
  ('homepage-9f27b50066cd10963c4f8da748d48036', 23, 'coffee-espesyal', 'Salted Caramel & Foam', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/seasaltlatte.jpg'),
  ('homepage-f8bd13dcb7b1e40320579fa40b3e3efa', 24, 'coffee-espesyal', 'Seasalt Latte', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/strawbmatcha.jpg'),
  ('homepage-a17d3dd0d753a2cf070faeafb5ca035a', 25, 'coffee-espesyal', 'White Mocha', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/manggoklasikmilk.jpg'),
  ('homepage-d2c49eee7e870847215454dfbd527da9', 26, 'coffee-espesyal', 'Klasik Specials', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/coffee/matcha something.jpg'),
  ('homepage-ceda16c7b1faeda8006135cb04a6a46a', 27, 'noncoffee-non-coffee', 'Blueberry Milk', 'Smooth espresso combined with steamed milk.', 79::numeric, 'images/products/coffee/blueberrymilk.jpg'),
  ('homepage-2eb6fc9149e3c6d8950cc1ccde44b99f', 28, 'noncoffee-non-coffee', 'Biscoff Milk', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/biscoffmilk.jpg'),
  ('homepage-f58a7dbcf6881380d151542c6dc6df08', 29, 'noncoffee-non-coffee', 'Chocolate Milk', 'Smooth espresso combined with steamed milk.', 79::numeric, 'images/products/coffee/tresletches.jpg'),
  ('homepage-055207f1440d264f90d069f090f8dd01', 30, 'noncoffee-non-coffee', 'Nutella Milk', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/klasikpremium.jpg'),
  ('homepage-548e41689a8d55e23acb6de0ee68d5a1', 31, 'noncoffee-non-coffee', 'Manggo Milk', 'Smooth espresso combined with steamed milk.', 79::numeric, 'images/products/coffee/manggoklasikmilk.jpg'),
  ('homepage-8f96230e60f139a7eba7125f26aefe28', 32, 'noncoffee-non-coffee', 'Oreo Milk', 'Smooth espresso combined with steamed milk.', 79::numeric, 'images/products/coffee/tresletches.jpg'),
  ('homepage-afb565ce1378bf25970d21690b3f6478', 33, 'noncoffee-non-coffee', 'Strawberry Latte', 'Smooth espresso combined with steamed milk.', 79::numeric, 'images/products/coffee/strawbmatcha.jpg'),
  ('homepage-d0810880a83db8919f51599cd8017043', 34, 'noncoffee-espesyal', 'Biscoff Oreo', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/biscoffmilk.jpg'),
  ('homepage-6bf2a912a2ff1740b41ac26f7a1c68e2', 35, 'noncoffee-espesyal', 'Blueberry Oreo', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/blueberrymilk.jpg'),
  ('homepage-7f5bcb29b19d01800546cd2455c7944a', 36, 'noncoffee-espesyal', 'Caramel Oreo', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/caramelmacchiato.jpg'),
  ('homepage-03dc36936cceb1f1bfa568fd723950ea', 37, 'noncoffee-espesyal', 'Chocolate Oreo', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/tresletches.jpg'),
  ('homepage-bbe8ad7090e74eb6d39b249a2b241035', 38, 'noncoffee-espesyal', 'Choco Berry', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/klasikpremium.jpg'),
  ('homepage-797a7b66992585ff7e8a2e8e5ce244a1', 39, 'noncoffee-espesyal', 'Nutella Oreo', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/tresletches.jpg'),
  ('homepage-8d1a6a40a2921c5a261e31c75fc802e8', 40, 'noncoffee-espesyal', 'Manggo Graham', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/manggoklasikmilk.jpg'),
  ('homepage-3204dd1f6545ced265718a8561c6c316', 41, 'noncoffee-espesyal', 'Strawberry Oreo', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/strawbmatcha.jpg'),
  ('homepage-a2637030ba1d3864692d0590036d2069', 42, 'noncoffee-espesyal', 'Strawberry Nutella', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/ubecloudlatte.jpg'),
  ('homepage-d13c6dcd469a4aa09c5adbd597dde562', 43, 'noncoffee-espesyal', 'Strawberry Biscoff', 'Smooth espresso combined with steamed milk.', 99::numeric, 'images/products/coffee/ubematcha.jpg'),
  ('homepage-ad8546ad9b2f72f91fdd8f9a39b1aa2b', 44, 'matcha', 'Matcha Latte', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/matchalatte.jpg'),
  ('homepage-bcc4758159ad9b07458d1ab6c8e5b602', 45, 'matcha', 'Biscoff Matcha', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/biscoffmatcha.jpg'),
  ('homepage-a6dbe7cf0f37834b8b96b03facb53567', 46, 'matcha', 'Blueberry Matcha', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/seasaltmatcha.jpg'),
  ('homepage-0ea990de05eb21e586b612946fbd984d', 47, 'matcha', 'Caramel Matcha', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/strawbmatcha.jpg'),
  ('homepage-81b0fe230f46309f449f0f5e9c2ec465', 48, 'matcha', 'Choco Matcha', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/ubecloudlatte.jpg'),
  ('homepage-21b2e510b27ca883ca2063bbc2511823', 49, 'matcha', 'Manggo Matcha', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/manggoklasikmilk.jpg'),
  ('homepage-3cfbc6bc22637e9c672642d8c8c82e40', 50, 'matcha', 'Oreo Matcha', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/ubecloudlatte.jpg'),
  ('homepage-ba0d87d9c0c82c20550d0c3bde36f28c', 51, 'matcha', 'Strawberry Matcha', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/strawbmatcha.jpg'),
  ('homepage-859126a3b73ea8bb16bb5247bfd64a20', 52, 'matcha', 'Seasalt Matcha', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/matcha something.jpg'),
  ('homepage-e8a2c88eba124f4cc57da58e24a294e7', 53, 'matcha', 'Pure Matcha Milk No Sweet', 'Smooth espresso combined with steamed milk.', 89::numeric, 'images/products/coffee/matchalatte.jpg'),
  ('homepage-99eff2c9a9fd1fe7b448c15f557906f2', 54, 'pastries-cookies', 'OG Smores', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/smores/ogsmores.jpg'),
  ('homepage-240822d0f2678290a85e56780fc35c98', 55, 'pastries-cookies', 'Matcha Smores', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/smores/matchasmores.jpg'),
  ('homepage-b195da76f1a526835be97adca17cc8bd', 56, 'pastries-cookies', 'Red Velvet Smores', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/smores/redvelvet.jpg'),
  ('homepage-aa16a30a07adea2a39723648df24ee58', 57, 'pastries-cookies', 'Double Choco Smores', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/smores/doublechoco.jpg'),
  ('homepage-9e2938bf71e380661a68d7a1b48864a5', 58, 'pastries-cheesecakes', 'Blueberry Cheesecake', 'Creamy cheesecake with blueberry topping.', 150::numeric, 'images/products/cheesecake/blueberrycheesecake.jpg'),
  ('homepage-86e7332955fb53e00d10ddbd042a442b', 59, 'pastries-cheesecakes', 'Strawberry Cheesecake', 'Creamy cheesecake with strawberry topping.', 150::numeric, 'images/products/cheesecake/strawbcheesecake.jpg'),
  ('homepage-8caa848fe2515a44e9529ddc06c07287', 60, 'pastries-smores', 'OG Smores', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/smores/ogsmores.jpg'),
  ('homepage-64d650228a4fc16050ae0533dca9b587', 61, 'pastries-smores', 'Matcha Smores', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/smores/matchasmores.jpg'),
  ('homepage-6748ac9353abe87e6596ee84e2db139b', 62, 'pastries-smores', 'Red Velvet Smores', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/smores/redvelvet.jpg'),
  ('homepage-283f2c58ccc369106907dc2a28bb0d65', 63, 'pastries-smores', 'Double Choco Smores', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/smores/doublechoco.jpg'),
  ('homepage-ce85a0416caaf04b444fc73065066c07', 64, 'snacks', 'French Fries', 'Crispy golden fries served as a savory café snack.', 80::numeric, 'images/products//snacks/fries.jpg'),
  ('homepage-39344b3113efcd1e26d96797bac9eff3', 65, 'snacks', 'Double Cheese Sausage', 'A savory sausage snack filled with double cheese.', 100::numeric, 'images/products//snacks/doublecheesesausage.jpg'),
  ('homepage-2d290072aa427f86791ba379648b28fc', 66, 'pasta', 'Creamy Chicken Pasta', 'A sample creamy pasta with chicken, served warm.', 180::numeric, 'images/products/cake.jpg'),
  ('homepage-34c7aa224eb729e17da2c87bce94d835', 67, 'add-ons', 'Classic Latte', 'Smooth espresso combined with steamed milk.', 120::numeric, 'images/products/latte.jpg'),
  ('homepage-25f1b6c2dd85b4d328709c8e0f8504c9', 68, 'add-ons', 'Iced Americano', 'Fresh espresso served over ice.', 100::numeric, 'images/products/americano.jpg'),
  ('homepage-3a44c930de25de2e949460166ce9635d', 69, 'add-ons', 'Spanish Latte', 'Rich espresso combined with sweetened milk.', 130::numeric, 'images/products/spanish-latte.jpg'),
  ('homepage-1a2357b34e869cd86428f7f34862de9f', 70, 'add-ons', 'Caramel Macchiato', 'Espresso with creamy milk and caramel flavor.', 140::numeric, 'images/products/caramelmacchiato.jpg'),
  ('homepage-21cb4bd733ac181d0f453318cec3afdb', 71, 'add-ons', 'Butter Croissant', 'Fresh and buttery baked pastry.', 90::numeric, 'images/products/croissant.jpg'),
  ('homepage-b96ffa1f6eab75d9f14e43e082c8a996', 72, 'add-ons', 'Chocolate Cake', 'Soft chocolate cake with a rich chocolate flavor.', 150::numeric, 'images/products/cake.jpg')
) as v(source_key, sort_order, category_slug, name, description, price, image_path)
join public.menu_categories as c on c.slug = v.category_slug
where not exists (
  select 1
  from public.menu_items as existing
  where existing.category_id = c.id
    and lower(existing.name) = lower(v.name)
)
on conflict (source_key) do nothing;

insert into public.menu_addons (slug, name, price, is_available)
select v.slug, v.name, v.price, true
from (values
  ('extra-shot', 'Extra Shot', 30, true),
  ('caramel', 'Caramel', 20, true),
  ('vanilla', 'Vanilla', 20, true),
  ('whipped-cream', 'Whipped Cream', 20, true)
) as v(slug, name, price, is_available)
where not exists (
  select 1
  from public.menu_addons as existing
  where lower(existing.name) = lower(v.name)
)
on conflict (slug) do nothing;
