# KLASIK CAFE Supabase setup

The Supabase integration is optional until credentials are configured. Without them, the existing website continues to use its browser-based demo behavior. The migrations in this repository define the expected project schema; check the current Supabase schema before running migrations against a project that already contains tables or users.

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com/) and wait for its database to finish provisioning.
2. Open **SQL Editor** in the Supabase dashboard.
3. Run `migrations/001_initial_schema.sql` first, followed by `migrations/002_seed_existing_menu.sql`, `migrations/003_order_workflow_and_customizations.sql`, `migrations/003_username_availability.sql`, `migrations/004_admin_catalog_storage_and_order_status.sql`, and `migrations/005_menu_item_best_seller.sql`, in that order. Apply migrations 004 and 005 to existing projects too. Migration 004 enables customer visibility for unavailable products/add-ons, configures the product image bucket, creates admin-only persistent store settings, allows admins to accept orders, and collapses any Add-ons subcategories into the main category without deleting products. Migration 005 adds the Best Seller flag used by the menu and admin controls.
4. In **Project Settings → API**, copy the project URL and the **publishable key** (or legacy `anon` key).
5. In the project root, copy `.env.example` to `.env` and fill in:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

   These are public browser credentials. Never put a database password, secret API key, or `service_role` key in `.env` or frontend code. `.env` is ignored by Git.

## 2. Start the website

From the project root:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite. For a production build, run `npm.cmd run build`; all existing HTML pages are included under `dist/`.

## 3. Enable customer authentication

In **Authentication → Providers**, enable Email. Configure email confirmation and the allowed redirect/site URLs to match where the website is hosted. Supabase signup creates a `profiles` row through the migration trigger; the role is always `customer` at signup. Supabase login uses email (the legacy form label may still mention username).

The sign-up form checks username availability using the `is_username_available` function from migration `003_username_availability.sql`. Apply that migration in SQL Editor on an existing Supabase project to enable a clear “That username has already been used” message before signup.

To grant the first admin role, register and confirm your own account, then find its email under **Authentication → Users**. In SQL Editor, run this query with the same email:

```sql
update public.profiles as p
set role = 'admin'
from auth.users as u
where p.id = u.id
  and lower(u.email) = lower('your-confirmed-email@example.com');
```

Confirm that one row was updated. Then sign out and sign back in before opening `admin.html`.

The Admin dashboard can invite admin and barista accounts through the `admin-create-staff` Edge Function. Invitations are sent by email; recipients choose their own passwords. The function verifies the caller's session and admin role before assigning a staff role. Its `verify_jwt = false` setting in `supabase/config.toml` lets unauthenticated CORS preflight requests reach the function; the function itself still validates the caller's bearer token and admin role. Deploy or redeploy it from the project root after installing/logging into the Supabase CLI and linking this project:

```powershell
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy admin-create-staff
```

If invitations still fail the CORS check, confirm that the function redeployed with this config and that the page's origin is listed in `allowedOrigins` in `supabase/functions/admin-create-staff/index.ts`. For a deployed website, set the `APP_ORIGIN` Edge Function secret to its exact origin (for example `https://cafe.example.com`). Local Vite origins on port 5173 and Live Server origins on ports 5500 and 5501 are allowed for development. Supabase supplies its URL, anon key, and service-role key to deployed Edge Functions; never add the service-role key to `.env`, frontend code, or a public repository. Set the Supabase project's **Authentication → URL Configuration → Site URL** to the website location so invitation links return to the site.

After linking the project, configure the production origin with:

```powershell
npx supabase secrets set APP_ORIGIN=https://cafe.example.com
```

The function requires the `profiles` sign-up trigger to create each invited user's profile before assigning the requested role. If the profile cannot be created or promoted, the function attempts to remove the incomplete invitation and returns an error.

## 4. Catalog import and existing browser data

`002_seed_existing_menu.sql` is derived from the existing homepage catalog: 72 product cards, the existing parent/subcategory groups, their names, descriptions, displayed prices, and image paths, plus the four separately priced customization add-ons. Catalog rows use stable source keys, skip a matching pre-existing product name in the same category (and add-on name), and use `ON CONFLICT DO NOTHING`; re-running the seed does not duplicate or overwrite catalog rows. The cafe-info insert also leaves an existing singleton record unchanged. The seed treats the homepage cards as available because those cards do not encode an availability flag.

The integration does not clear or overwrite existing LocalStorage data. In Supabase mode, the active cart uses the new `klasikCafeSupabaseCart` key; an existing `klasikCafeCustomerCart` is retained and shown as needing review. Customer order/review/suggestion histories from demo mode are not automatically attributed to an account because their owner cannot be verified. The Admin page has an optional browser-data backup and a separate, opt-in import for legacy menu products; inspect the data before importing it.

The SQL seed reflects the existing page content, including its currently generic social links and displayed contact/hours. Verify business details in the Admin page before publishing. Database category/item/add-on and cafe settings are admin-only; baristas can read relevant orders and change their status through a database function. Customers see saved order status the next time their order history is loaded.

## 5. Security and behavior

- RLS is enabled on all nine tables. Public reads are limited to menu, cafe details, and approved reviews; customers can read their own profiles, orders, reviews, and suggestions.
- Signup cannot select a privileged role. Only an explicitly promoted admin can manage catalog/settings; admin and barista roles can process orders.
- Checkout calls `place_order`; PostgreSQL looks up current menu/add-on prices and validates item availability, quantities, and add-ons rather than trusting browser totals.
- No payment provider or live payment flow is included.
- Migration 004 makes unavailable menu products and customization add-ons visible to anonymous customers. The `place_order` database function still rejects unavailable products and add-ons. Product images are stored in the public `menu-images` bucket; only admins can upload, update, or delete objects. Apply migration 004 before using those features with Supabase.
- Do not run unreviewed destructive SQL against a project containing records. These migrations are designed to create missing objects, preserve existing records, and avoid destructive table/data resets.

## 6. Existing LocalStorage data

The Admin page's **Download browser data backup** control exports the existing `klasikCafe*` browser keys as a JSON file. Its **Import legacy menu products** action is opt-in and only handles recognized legacy products; it does not delete browser keys or database rows. Orders, reviews, and suggestions from demo mode require a human to verify ownership before any manual migration.
