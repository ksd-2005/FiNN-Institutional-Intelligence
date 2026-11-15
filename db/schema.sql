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

CREATE INDEX IF NOT EXISTS exchange_announcements_filed_at_idx
  ON exchange_announcements (filed_at DESC);
CREATE INDEX IF NOT EXISTS exchange_announcements_company_key_idx
  ON exchange_announcements (company_key);
