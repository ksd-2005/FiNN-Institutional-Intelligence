# Supabase setup for FINN

The app can run without a database: ticker suggestions use the bundled local directory, and announcements are fetched live. Supabase adds a searchable ticker table and a shared cache of fetched filings, which helps later requests return faster and keeps recent history across Vercel function restarts.

## Connect the project

1. Create a Supabase project, then open **SQL Editor**.
2. Run `db/schema.sql`, then run `db/seed.sql` to load the bundled company directory.
3. In Supabase **Project Settings → API Keys**, copy the **Project URL** and create/copy a **Secret key**. Keep the secret key private; it bypasses row-level security and must only be used by server routes.
4. Put the values in your local `.env`:

   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SECRET_KEY=your-secret-key
   ```

5. Add the same two variables in Vercel under **Project → Settings → Environment Variables**. Enable them for Production and Preview, then redeploy.
6. Start the app locally again. `/api/tickers` reads the Supabase company table, and `/api/announcements` stores successful filing responses for reuse. If the database variables are missing or the service is temporarily unreachable, the bundled ticker directory and live exchange fetch remain available.

The client never receives the Supabase secret. The two tables have row-level security enabled and no public access policies; API routes use the secret key from the server environment.

## Optional account and contact sync

The app includes email sign-up/sign-in using Supabase Auth. To enable it:

1. In Supabase **Authentication → Providers**, enable Email. Configure the site URL and allowed redirect URLs for local development and your Vercel domain.
2. Copy the Project URL and publishable key and add them to local `.env` and Vercel's Environment Variables:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. Run the updated `db/schema.sql` in SQL Editor. The `user_contacts` table has row-level security so signed-in users can read and add only their own contacts.
4. Redeploy after setting the variables. Signed-out contacts stay in that browser tab; signing in syncs selected contacts to the account.

The publishable key is intended for browser use and must be paired with the table's row-level security policies. Keep `SUPABASE_SECRET_KEY` server-only; never put it in a `VITE_` variable.

## What is stored

- `companies`: ticker, company name and sector for autocomplete.
- `exchange_announcements`: dated filing payloads so a later request can use saved filings when exchange servers are unavailable.

- Portfolio holdings remain in the browser for this demo.
- Phone contacts stay in the current browser tab until sign-in. Signed-in users' selected contacts are also synced to their private Supabase account table.
- `sample_network_contacts`: 120 clearly labelled, fictional network profiles with reserved `example.com` email addresses for demo outreach. The Network page reads the seeded table; its API supplies the same fictional demo set if the database has not been connected.

Push alert preferences are stored in the browser. While Push is open, announcements are checked on the existing one-minute refresh and Yahoo Finance completed daily bars are checked every five minutes. Browser notifications require permission. Alerts while the site is closed need a separate Web Push subscription and scheduled server job; they are not part of this demo behavior.
