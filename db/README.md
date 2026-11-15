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

## What is stored

- `companies`: ticker, company name and sector for autocomplete.
- `exchange_announcements`: dated filing payloads so a later request can use saved filings when exchange servers are unavailable.

Portfolio holdings and phone contacts are still kept in the browser for this demo. They are not uploaded to Supabase.
