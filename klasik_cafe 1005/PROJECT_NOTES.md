# KLASIK CAFE Project Notes

## Project
- **Course:** ELEC 3 school project
- **Type:** Small café website
- **Brand:** KLASIK CAFE
- **Primary color:** Logo blue (`#1E3382`); pale blue tints remain for backgrounds and borders
- **Technology:** Plain HTML, CSS, and vanilla JavaScript; no framework or backend

## Current Scope
The first version contains three connected pages:
- `index.html`: café homepage, featured menu, coffee and story sections, location, social links, and footer
- `login.html`: demo login form with client-side validation and password visibility toggle
- `signup.html`: demo registration form with client-side validation, terms checkbox, password visibility toggles, and a login link after success

Authentication is demonstration-only. There is no database, API, ordering, payment, cart, dashboard, or account persistence.

## Structure
- `klasik_cafe_logo_3_-removebg-preview.png`: shared brand logo used in the homepage header/footer and both account pages
- `css/style.css`: shared responsive design and page styles
- `js/script.js`: mobile navigation, image fallbacks, password toggles, demo links, and form validation
- `images/`: local image paths are used when assets are added; remote café photography is the current fallback. If both sources fail, a styled placeholder is shown.

## Current Behavior and Decisions
- Homepage navigation links scroll to sections; account links open the separate login and sign-up pages.
- The existing homepage remains the customer homepage and now includes an in-page customer order cart, drink customization modal, order history, reviews, and suggestions without replacing the original café design.
- The homepage menu area presents three featured products. The complete category-filtered menu is on `menu.html`, which loads the shared product catalog from `index.html` and retains drink customization and cart behavior.
- Product categories now support a nested structure so a main category such as Coffee can contain subcategories like Iced Coffee, Hot Coffee, and Espesyal for clearer organization in the admin panel and menu filtering.
- Order review and order history now live on separate pages: `orders.html` handles the active cart and place-order flow, while `order-history.html` shows previous orders.
- Each page includes a dedicated switch button so users can move between Order Review and Order History without mixing the two views.
- Product-card “View menu” labels are display-only for now; item-specific interactions can be added later.
- Signup requires all fields, a valid email and phone number, a password of at least eight characters, matching confirmation, and accepted terms.
- Login accepts a username or email, validates email formatting when the value contains `@`, and redirects the demo customer back to the homepage after successful login.
- Demo forms show success feedback only; they do not create or authenticate real accounts.
- The café location is listed by Google Maps as beside Chapel, Matimbubong, San Ildefonso, Bulacan. The directions link and embedded map use the supplied Google Maps location. Opening hours, contact number, social accounts, and menu details are sample content and should be confirmed before real use.
- Google Fonts, Unsplash image fallbacks, and the Google Maps embed require an internet connection; local images can replace the image fallbacks.

## Validation Performed
- `node --check js/script.js` completed without syntax errors.
- `node --check js/customer.js; node --check js/admin.js; node --check js/barista.js` completed without syntax errors after the dashboard additions.
- `node --check js/supabase.js` passed after Supabase authentication helper changes.

## Backend Setup Notes
- Added reusable Supabase connection scaffolding in `js/supabase.js`.
- Added SQL schema and seed files under `supabase/` for profiles, products, orders, reviews, suggestions, and café info.
- Auth flows in `js/script.js` now use the Supabase helper when configured while preserving the current demo fallback behavior when keys are unset.
- The Supabase project URL and public anon key have been entered in `js/supabase.js`; values are intentionally not copied into this notes file. The owner confirmed the schema and seed SQL ran successfully in Supabase.
- The schema hardens role assignment: new profiles are always `customer`, role changes are not available through the customer's profile update grant, and admin checks use a definer helper to avoid profile-policy recursion.
- Profile creation is handled by the database auth trigger; the browser no longer attempts an RLS-blocked profile upsert after signup.
- Supabase-backed customer/admin/barista data operations and server-side order total validation are not yet wired; existing dashboard persistence is still demo/local behavior.
- Seed data now skips café-info insertion when a café row already exists, avoiding an `ON CONFLICT(name)` error because the schema does not make that field unique.
- Menu focus: the homepage featured menu and full `menu.html` catalog load available products from Supabase when configured, share a reusable card renderer, retain the existing static fallback when Supabase is not configured, and use the database best-seller flags and available customization add-on prices.
- Public product and add-on read policies restrict non-admin access to available items only; rerun `supabase/schema.sql` to apply this policy update to the already-created database. Menu JavaScript syntax checks passed.
- Product ordering and other customer, admin, and barista data flows remain for later phases.
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

## New interface work – customer, admin, and barista dashboards
- Added mock customer dashboard pages and supporting data for menu browsing, drink customization, order tracking, customer reviews, and suggestions.
- Added separate mock admin dashboard with product management, review moderation, suggestion status management, and café information editing.
- Added separate mock barista dashboard to accept orders, advance status through the preparation flow, and preview receipt details for completed orders.
- The demo role links are available from the login page so visitors can move between customer, admin, and barista views without a backend or authentication system.
- LocalStorage is used to keep the temporary interface data in the browser while the static project remains backend-free.

## Next Steps / Known Limitations
- Confirm the sample phone number, opening hours, social links, and placeholder menu details before real use.
- Add actual photos under `images/` using the filenames referenced by the page markup.
- Keep any future system features out of this first phase unless the project scope is explicitly expanded.
- There are no automated tests or backend services in this static project.

## Session Maintenance
When project files, behavior, scope, or decisions change, update these notes during that work session so the next chat starts with accurate context. Record meaningful decisions, current behavior, validation performed, and remaining work; remove details that are no longer true.