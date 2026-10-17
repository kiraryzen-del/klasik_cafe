# KLASIK CAFE Project Notes

## Project
- **Course:** ELEC 3 school project
- **Type:** Small café website
- **Brand:** KLASIK CAFE
- **Primary color:** Logo blue (`#1E3382`); pale blue tints remain for backgrounds and borders
- **Technology:** Semantic HTML, CSS, and vanilla JavaScript with Vite as a bundler and optional `@supabase/supabase-js` integration; no UI framework

## Current Scope
The project retains its existing homepage, login, sign-up, menu, customer, admin, barista, cart/order-review, and order-history pages. Supabase is optional and is activated only when the public project URL and publishable key are configured; without credentials, the original browser-based demo flows remain available.

## Structure
- `klasik_cafe_logo_3_-removebg-preview.png`: shared brand logo used in the homepage header/footer and both account pages
- `css/style.css`: shared responsive design and page styles
- `js/script.js`: mobile navigation, image fallbacks, password toggles, login/sign-up flows, and form validation
- `js/supabase-client.js`, `js/supabase-auth.js`, `js/supabase-data.js`: optional Supabase client, auth, and database operations
- `supabase/migrations/`: additive schema/RLS/RPC migration and source-derived existing catalog seed
- `supabase/README.md`: Supabase project, SQL Editor, environment, and staff-role setup
- `images/`: local image paths are used when assets are added; remote café photography is the current fallback. If both sources fail, a styled placeholder is shown.

## Current Behavior and Decisions
- Homepage navigation links scroll to sections; account links open the separate login and sign-up pages.
- The existing homepage and menu remain intact; the same cart, customization, order history, review, and suggestion features can use Supabase when configured without replacing the original café design.
- The homepage menu area presents three featured products. The complete category-filtered menu is on `menu.html`, which loads the shared product catalog from `index.html` and retains drink customization and cart behavior.
- Product categories now support a nested structure so a main category such as Coffee can contain subcategories like Iced Coffee, Hot Coffee, and Espesyal for clearer organization in the admin panel and menu filtering.
- Order review and order history now live on separate pages: `orders.html` handles the active cart and place-order flow, while `order-history.html` shows previous orders.
- Each page includes a dedicated switch button so users can move between Order Review and Order History without mixing the two views.
- Product-card “View menu” labels are display-only for now; item-specific interactions can be added later.
- Signup requires all fields, a valid email and phone number, a password of at least eight characters, matching confirmation, and accepted terms. In configured Supabase mode, Auth creates the user and a database trigger creates a customer profile.
- Login retains demo behavior without credentials and uses Supabase Auth by email when configured.
- The café location is listed by Google Maps as beside Chapel, Matimbubong, San Ildefonso, Bulacan. The directions link and embedded map use the supplied Google Maps location. Opening hours, contact number, social accounts, and menu details are sample content and should be confirmed before real use.
- Google Fonts, Unsplash image fallbacks, and the Google Maps embed require an internet connection; local images can replace the image fallbacks.

## Validation Performed
- `npm.cmd run build` passed after the Supabase integration; Vite emitted all nine existing HTML pages.
- `node --check` passed for every `js/*.js` file, and editor diagnostics found no issues in the changed integration scripts.
- Browser smoke test loaded all nine pages with HTTP 200 and no page-level JavaScript exceptions in no-credentials/demo mode.
- Supabase browser smoke test with no authenticated user confirmed a null signed-in user, preserved cart count, and no console errors on order review.
- Compared the migration seed to the source homepage in-browser: all 72 product cards matched names, descriptions, displayed prices, and image references; all 15 category labels matched after correcting the Smores Series label.
- Dependency installation completed with `npm.cmd install`; the reported npm audit had zero vulnerabilities.
- `node --check js/script.js` completed without syntax errors.
- `node --check js/customer.js; node --check js/admin.js; node --check js/barista.js` completed without syntax errors after the dashboard additions.
- Browser checks covered homepage rendering and its six menu cards, mobile navigation interaction, login and sign-up validation/success states, password visibility, and the post-sign-up login link.
- The homepage showed no horizontal overflow at the tested desktop viewport. Remote photo fallbacks loaded when the local image files were absent.
- The supplied `klasik_cafe_logo_3_-removebg-preview.png` is used in the brand locations across all three pages.
- Editor diagnostics reported no errors in the updated order review page, the new order history page, the customer script, and the customer stylesheet.
- Browser loading confirmed `menu.html` renders the shared catalog, category controls, cart badge, and Customize buttons. Editor diagnostics reported no errors in the homepage, menu page, menu loader, shared scripts, and styles.
- The homepage footer block was restored to the branded bottom section matching the original KLASIK CAFE contact and account links.
- Browser checks at desktop (1440px) and mobile (390px) confirmed the enlarged header logo, logo-blue location and customization accents, removed location numbering, and no horizontal overflow. The footer-bottom color remains unchanged; editor diagnostics found no errors in the updated homepage and stylesheets.
- The shared blue accents now match the logo's dominant `#1E3382` across the site; pale blue surfaces and the footer-bottom styling are retained. The homepage header logo is slightly larger, and the Location, Opening hours, and Say hello labels are larger, blue, and no longer numbered.
- Large headings continue to use the available Playfair Display serif, which complements the logo's classic serif lettering.
- Homepage follow-up styling uses blue for the hero headline emphasis with a subtle shadow for readability, keeps the menu button logo-blue, strengthens the scroll label background, restores sans-serif on location labels (retaining size/color), darkens location details, and matches the Featured items title font to the location labels. Browser checks confirmed the requested colors/fonts and no horizontal overflow; editor diagnostics found no stylesheet errors.
- Latest typography refinement restores the hero's blue emphasis without a solid backing and adds a subtle shadow for legibility; Featured items, Our menu, order headings, Create account, and Welcome back use bold sans-serif. Login/sign-up logos are enlarged to about twice their previous displayed size, with mobile sizing kept within the hero area.
- Browser checks confirmed the hero blue, bold heading fonts on the homepage, full menu, order review, login, and sign-up; account logos render about twice as large without mobile overlap or horizontal overflow. Editor diagnostics reported no issues in touched HTML/CSS.
- The menu page now opens on a Best sellers view showing the homepage's first three featured items, with an explicit Best sellers category selected. The existing category controls remain available for browsing the rest of the catalog, and Featured items keeps its bold emphasis. Browser validation confirmed three initial items, category switching to the full coffee selection and back, and no horizontal overflow; both changed JavaScript files pass `node --check` and diagnostics.
- The menu section heading now reads “Menu,” while Best sellers remains a main category button with no subcategory. Add-ons likewise has no subcategory chips; both main-category buttons filter their matching products directly. Browser checks confirmed the three-item default, Add-ons filtering, zero subcategory chips for those groups, and no desktop horizontal overflow; updated scripts pass syntax checks and diagnostics.
- Removed a stray `x` text node after a menu product card in the homepage catalog source. Verified the loaded menu and a filtered subcategory contain no stray text/grid child.
- The second `espesyal2` product group (starting with Biscoff Oreo) now normalizes under the Non Coffee main category, so the existing Non Coffee → Espesyal filter includes those products.
- Browser verification confirmed all 10 `espesyal2` drinks appear under Non Coffee → Espesyal, and the menu has no horizontal overflow at the tested mobile width. JavaScript syntax check and editor diagnostics passed.
- Removed Matcha Series subcategory chips; the main Matcha Series category button directly filters to its matcha products, consistent with the Best sellers and Add-ons category controls.
- Browser verification confirmed Matcha Series has no subcategory chips and its button directly displays all 10 matcha products; homepage diagnostics found no HTML errors.
- Added Blueberry Cheesecake and Strawberry Cheesecake to the Cheesecakes category. Cookies contains copies of all four Smores products (OG, Matcha, Red Velvet, and Double Choco) with their original product details.
- Browser validation confirmed the Cheesecakes filter shows both new items and Cookies shows all four Smores copies. Homepage HTML diagnostics reported no errors.
- The Cookies category was aligned to the exact four Smores entries (OG, Matcha, Red Velvet, Double Choco), including their original item names, prices, images, and descriptions; only their category label is Cookies. Browser check confirmed exactly four cookie items.
- Added Snacks and Pasta as main menu categories without subcategories. Snacks contains French Fries and Double Cheese Sausage; Pasta contains one sample item, Creamy Chicken Pasta.
- Browser verification confirmed the Snacks filter shows exactly French Fries and Double Cheese Sausage, with no horizontal overflow; homepage HTML diagnostics found no errors.

## Existing customer, admin, and barista dashboards
- The existing customer dashboard supports menu browsing, customization, order tracking, reviews, and suggestions.
- The existing admin dashboard supports product management, review moderation, suggestion status, and café information.
- The existing barista dashboard supports order queues, status progression, and receipt previews.
- Without Supabase credentials, the pages retain their existing demo roles and LocalStorage behavior. With credentials, access is controlled by Supabase Auth roles and database policies.
- Supabase mode uses a separate cart key and does not automatically clear or overwrite legacy keys. Legacy menu import is opt-in; anonymous demo order/review/suggestion records are not automatically assigned to an account.

## Supabase integration status
- Added nine PostgreSQL tables, RLS policies, profile creation, server-priced checkout, and staff-only order-status RPCs in `supabase/migrations/001_initial_schema.sql`.
- `supabase/migrations/002_seed_existing_menu.sql` contains the 72 existing homepage product cards, existing category hierarchy, four customization add-ons, and current homepage cafe details. Stable source keys, matching against existing names/categories, and conflict-do-nothing behavior avoid duplicate imports and preserve existing catalog rows.
- Customer Auth/profile, remote catalog/customization, checkout/order history, reviews/suggestions, cafe display, admin data management, and barista order-status paths use Supabase when configured.
- Signed-out Supabase pages now distinguish an absent session from an Auth error. Order/cart pages no longer emit "Auth session missing" during normal signed-out loads; checkout retains the cart and directs the customer to login.
- The multi-page Vite build includes all nine existing HTML pages. No pages or existing product data were removed.
- The owner has configured a live Supabase project and reported completing sign-up after resolving a profile-trigger/schema mismatch; the live schema and migration state have not been independently inspected. Verify the existing profile columns and Auth trigger before applying schema changes to avoid breaking existing users.
- Demo-mode LocalStorage order/review/suggestion data is preserved, not automatically migrated, because account ownership cannot be established safely.

## Next Steps / Known Limitations
- Verify the live profile schema and trigger against `supabase/migrations/001_initial_schema.sql`, ensure Email Auth confirmation is configured as intended, and manually promote the owner's confirmed account as described in `supabase/README.md`.
- Confirm the cafe phone, hours, social links, and placeholder menu details before publishing; the database seed intentionally follows existing page content.
- Local demo order/review/suggestion data needs owner verification before any manual migration. Existing cart data remains under its original key and is not silently imported into Supabase.
- Live Supabase signup was reported to reach email confirmation after resolving a database-trigger/schema mismatch; staff invitation, checkout, and order status still need live integration checks.
- The Admin dashboard now includes a Supabase-only staff invitation form for admin/barista roles. It calls a protected `admin-create-staff` Edge Function that verifies the caller's admin profile, sends email invitations, assigns roles server-side, and never exposes the service-role key to the browser. The first admin must be promoted manually in Supabase SQL Editor; deployment and APP_ORIGIN setup are documented in `supabase/README.md`.
- Validation for staff invitations: Vite production build, JavaScript syntax checks, and editor diagnostics passed; Deno was unavailable, and live Edge Function and invitation-email behavior still require deployment to the configured Supabase project.
- Signup now checks username availability through a narrowly scoped `is_username_available` RPC and displays a direct duplicate-username message. Existing Supabase projects must run `supabase/migrations/003_username_availability.sql` before this form check can work.
- Add real photos under `images/` when ready; existing references are preserved.

## Session Maintenance
When project files, behavior, scope, or decisions change, update these notes during that work session so the next chat starts with accurate context. Record meaningful decisions, current behavior, validation performed, and remaining work; remove details that are no longer true.

- The homepage header and intro landing screen use the owner's `public/videos/klasik_logo_vid.gif` animated logo. The header image remains inside the homepage link. Footer logos and logos on other pages remain still images. `npm.cmd run build` passed; the GIF was verified to contain 240 frames and an infinite-loop extension, and the built asset was checked.
- The shared sticky site header now uses a solid white background with no transparency or blur. `npm.cmd run build` passed after the change.