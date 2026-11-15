CREATE TABLE IF NOT EXISTS companies (
  ticker TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'Other',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_name_search_idx ON companies (lower(name));

CREATE TABLE IF NOT EXISTS exchange_announcements (
  id TEXT PRIMARY KEY,
  filed_at TIMESTAMPTZ NOT NULL,
  company_key TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  tel TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, email, tel)
);

CREATE TABLE IF NOT EXISTS sample_network_contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  sector TEXT NOT NULL,
  expertise TEXT NOT NULL,
  relationship TEXT NOT NULL,
  last_spoke DATE NOT NULL,
  bio TEXT NOT NULL,
  email TEXT NOT NULL,
  synthetic BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_network_contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON user_contacts TO authenticated;
CREATE POLICY "Users can read their own contacts" ON user_contacts
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can add their own contacts" ON user_contacts
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS exchange_announcements_filed_at_idx
  ON exchange_announcements (filed_at DESC);
CREATE INDEX IF NOT EXISTS exchange_announcements_company_key_idx
  ON exchange_announcements (company_key);
