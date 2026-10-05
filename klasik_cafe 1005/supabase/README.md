# KLASIK CAFE Supabase setup

This project is still built as a static HTML/CSS/JavaScript website, but it is prepared to connect to Supabase.

## 1) Create a Supabase project
1. Go to https://supabase.com and sign in.
2. Click New project.
3. Create a database name and password.
4. Wait for the project to finish creating.

## 2) Get your project URL and anon key
1. Open your project dashboard.
2. Go to Project Settings.
3. Open API.
4. Copy the Project URL.
5. Copy the anon/public key.

## 3) Add your keys to the project
Open `js/supabase.js` and replace:

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

with your actual project values.

## 4) Run the database schema
In the Supabase SQL editor, paste the contents of `supabase/schema.sql` and run it.

## 5) Run the seed data
In the SQL editor, paste the contents of `supabase/seed.sql` and run it.

## 6) Configure authentication
1. Open Authentication in the Supabase dashboard.
2. Enable Email sign in.
3. Choose whether you want email confirmation.
4. Add your site domain if needed.

## 7) Create the first admin account
1. Sign up normally through the site or the Supabase Auth UI.
2. Confirm the email if needed.
3. Open the Supabase dashboard.
4. Go to Table Editor > profiles.
5. Update that user row and set `role` to `admin`.
6. Repeat for a barista account and set `role` to `barista`.

## 8) Test the customer flow
1. Sign up for a customer account.
2. Log in with email or username.
3. Browse the menu.
4. Add items to the cart.
5. Place an order.
6. Check that the order appears in the order history.

## 9) Test the barista flow
1. Log in as a barista.
2. Open the barista dashboard.
3. Confirm the queued orders appear.
4. Advance the status from Pending to Accepted, Preparing, Ready, and Completed.

## 10) Test the admin flow
1. Log in as the admin account.
2. Add, edit, and delete products.
3. Mark products unavailable.
4. Review customer comments.
5. Update suggestion status.
6. Update café information.

## Notes
- Do not place a service-role key in browser JavaScript.
- The frontend remains static HTML/CSS/JS; Supabase is used for data persistence.
- If your Supabase project is not configured, the website falls back to the existing demo/local behavior so the page does not break.
