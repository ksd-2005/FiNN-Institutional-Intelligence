INSERT INTO companies (ticker, name, sector) VALUES
('ADANIENT', 'Adani Enterprises', 'Diversified'),
('ADANIPORTS', 'Adani Ports and SEZ', 'Ports'),
('AMBUJACEM', 'Ambuja Cements', 'Cement'),
('APOLLOHOSP', 'Apollo Hospitals Enterprise', 'Healthcare'),
('ASIANPAINT', 'Asian Paints', 'Paints'),
('ATGL', 'Adani Total Gas', 'Energy'),
('AUROPHARMA', 'Aurobindo Pharma', 'Pharma'),
('AXISBANK', 'Axis Bank', 'Banking'),
('BAJAJ-AUTO', 'Bajaj Auto', 'Automobile'),
('BAJFINANCE', 'Bajaj Finance', 'Financials'),
('BAJAJFINSV', 'Bajaj Finserv', 'Financials'),
('BEL', 'Bharat Electronics', 'Defence'),
('BHARTIARTL', 'Bharti Airtel', 'Telecom'),
('BOSCHLTD', 'Bosch', 'Auto components'),
('BPCL', 'Bharat Petroleum', 'Energy'),
('BRITANNIA', 'Britannia Industries', 'Food'),
('CIPLA', 'Cipla', 'Pharma'),
('COALINDIA', 'Coal India', 'Mining'),
('DABUR', 'Dabur India', 'Consumer goods'),
('DIVISLAB', 'Divi''s Laboratories', 'Pharma'),
('DLF', 'DLF', 'Real estate'),
('DMART', 'Avenue Supermarts', 'Retail'),
('DRREDDY', 'Dr. Reddy''s Laboratories', 'Pharma'),
('EICHERMOT', 'Eicher Motors', 'Automobile'),
('ETERNAL', 'Eternal (Zomato)', 'Internet'),
('FEDERALBNK', 'Federal Bank', 'Banking'),
('FUSIONCX', 'Fusion CX', 'Business services'),
('GAIL', 'GAIL India', 'Energy'),
('GODREJCP', 'Godrej Consumer Products', 'Consumer goods'),
('GRASIM', 'Grasim Industries', 'Materials'),
('HAVELLS', 'Havells India', 'Electricals'),
('HCLTECH', 'HCL Technologies', 'IT services'),
('HDFCBANK', 'HDFC Bank', 'Banking'),
('HDFCLIFE', 'HDFC Life Insurance', 'Insurance'),
('HEROMOTOCO', 'Hero MotoCorp', 'Automobile'),
('HINDALCO', 'Hindalco Industries', 'Metals'),
('HINDUNILVR', 'Hindustan Unilever', 'Consumer goods'),
('ICICIBANK', 'ICICI Bank', 'Banking'),
('INDIGO', 'InterGlobe Aviation', 'Airlines'),
('INDUSINDBK', 'IndusInd Bank', 'Banking'),
('INFY', 'Infosys', 'IT services'),
('IOC', 'Indian Oil Corporation', 'Energy'),
('IRCTC', 'Indian Railway Catering and Tourism', 'Travel'),
('ITC', 'ITC Ltd', 'Consumer goods'),
('JINDALSTEL', 'Jindal Steel & Power', 'Metals'),
('JSWENERGY', 'JSW Energy', 'Energy'),
('JSWSTEEL', 'JSW Steel', 'Metals'),
('KOTAKBANK', 'Kotak Mahindra Bank', 'Banking'),
('LT', 'Larsen & Toubro', 'Engineering'),
('M&M', 'Mahindra & Mahindra', 'Automobile'),
('MARICO', 'Marico', 'Consumer goods'),
('MARUTI', 'Maruti Suzuki India', 'Automobile'),
('MOTHERSON', 'Samvardhana Motherson', 'Auto components'),
('NESTLEIND', 'Nestle India', 'Food'),
('NHPC', 'NHPC', 'Power'),
('NTPC', 'NTPC', 'Power'),
('OLAELEC', 'Ola Electric Mobility', 'Electric vehicles'),
('ONGC', 'Oil and Natural Gas Corporation', 'Energy'),
('ORIANA', 'Oriana Power', 'Renewable energy'),
('PERSISTENT', 'Persistent Systems', 'IT services'),
('PIDILITIND', 'Pidilite Industries', 'Materials'),
('POLYCAB', 'Polycab India', 'Electricals'),
('POWERGRID', 'Power Grid Corporation of India', 'Power'),
('RECLTD', 'REC Ltd', 'Financials'),
('RELIANCE', 'Reliance Industries', 'Diversified'),
('SBILIFE', 'SBI Life Insurance', 'Insurance'),
('SBIN', 'State Bank of India', 'Banking'),
('SHRIRAMFIN', 'Shriram Finance', 'Financials'),
('SIEMENS', 'Siemens India', 'Engineering'),
('SOLARINDS', 'Solar Industries India', 'Defence'),
('SUNPHARMA', 'Sun Pharmaceutical Industries', 'Pharma'),
('TATACONSUM', 'Tata Consumer Products', 'Consumer goods'),
('TATAMOTORS', 'Tata Motors', 'Automobile'),
('TATAPOWER', 'Tata Power', 'Power'),
('TATASTEEL', 'Tata Steel', 'Metals'),
('TCS', 'Tata Consultancy Services', 'IT services'),
('TECHM', 'Tech Mahindra', 'IT services'),
('TITAN', 'Titan Company', 'Consumer'),
('TRENT', 'Trent', 'Retail'),
('ULTRACEMCO', 'UltraTech Cement', 'Cement'),
('UNOMINDA', 'Uno Minda', 'Auto components'),
('VEDL', 'Vedanta', 'Metals'),
('WIPRO', 'Wipro', 'IT services'),
('ZOMATO', 'Zomato', 'Internet')
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, sector = EXCLUDED.sector, updated_at = now();

-- Fictional profiles for the demo network. Addresses use example.com, a reserved
-- domain, so these records cannot accidentally reach real recipients.
WITH first_names(value, idx) AS (
  SELECT * FROM unnest(ARRAY[
    'Aarav','Aditi','Aditya','Aishwarya','Akash','Amrita','Ananya','Anil','Anushka','Arjun',
    'Bhavna','Charu','Deepak','Devika','Divya','Gaurav','Harsh','Ishita','Karan','Kavya'
  ]) WITH ORDINALITY
), family_names(value, idx) AS (
  SELECT * FROM unnest(ARRAY['Joshi','Kapoor','Malhotra','Menon','Mehta','Nair']) WITH ORDINALITY
), roles(role, company, sector, expertise, idx) AS (
  SELECT * FROM unnest(
    ARRAY['Business Unit Head','Product Director','Head of Operations','Finance Controller','VP Supply Chain','Plant Manager','Corporate Banking Director','Strategy Partner','Investor Relations Lead','Manufacturing Director','Renewables Investment Lead','Former CFO'],
    ARRAY['Infosys','Microsoft India','Tejas Networks','Asian Paints','Qualcomm India','Micron India','ICICI Bank','Mahindra & Mahindra','Titan Company','Dixon Technologies','Oriana Power','Fusion CX'],
    ARRAY['IT services','Technology','Telecom','Consumer','Semiconductors','Electronics','Financials','Automobile','Consumer','Electronics','Energy','Business services'],
    ARRAY['enterprise software and client operations','cloud products and enterprise procurement','network equipment and manufacturing scale-up','working capital and distribution economics','chip supply chains and vendor qualification','factory ramp-up and yield improvement','credit underwriting and capital structure','EV programs and auto component sourcing','jewellery retail and inventory turns','EMS operations and customer concentration','project finance and renewable EPC execution','margin levers and customer retention']
  ) WITH ORDINALITY
), generated AS (
  SELECT
    row_number() OVER (ORDER BY f.idx, l.idx)::int AS n,
    f.value || ' ' || l.value AS name,
    r.role, r.company, r.sector, r.expertise,
    CASE (row_number() OVER (ORDER BY f.idx, l.idx)::int - 1) % 3
      WHEN 0 THEN 'Worked together · first degree'
      WHEN 1 THEN 'Studied together · first degree'
      ELSE 'One connection away · warm introduction'
    END AS relationship,
    r.expertise AS bio
  FROM first_names f CROSS JOIN family_names l
  JOIN roles r ON r.idx = (((f.idx - 1) * 6 + l.idx - 1) % 12) + 1
)
INSERT INTO sample_network_contacts
  (id, name, role, company, sector, expertise, relationship, last_spoke, bio, email, synthetic)
SELECT
  'sample-' || lpad(n::text, 3, '0'), name, role, company, sector, expertise,
  relationship,
  make_date(2024 + ((n - 1) % 3), ((n - 1) % 12) + 1, 15),
  name || ' is a synthetic demo profile with experience in ' || bio || '. Career details and relationship history are invented for demonstration.',
  'sample.contact.' || lpad(n::text, 3, '0') || '@example.com',
  true
FROM generated
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, company = EXCLUDED.company,
  sector = EXCLUDED.sector, expertise = EXCLUDED.expertise,
  relationship = EXCLUDED.relationship, last_spoke = EXCLUDED.last_spoke,
  bio = EXCLUDED.bio, email = EXCLUDED.email, synthetic = true;
