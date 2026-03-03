-- ============================================================
-- Phase 3 Revisions: Contact Schema + Rent Comp Relational
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── 1. Update contacts table: replace flat phone/email with JSONB arrays ────

-- Add new JSONB columns for unlimited multi-value fields
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS phones      JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emails      JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addresses   JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_property_ids UUID[] DEFAULT '{}';

-- Migrate existing flat phone/email into the new JSONB arrays (safe, non-destructive)
UPDATE contacts
SET phones = jsonb_build_array(
  jsonb_build_object(
    'value', phone,
    'type', 'Mobile',
    'status', 'Unknown'
  )
)
WHERE phone IS NOT NULL AND phone != '' AND (phones IS NULL OR phones = '[]'::jsonb);

UPDATE contacts
SET emails = jsonb_build_array(
  jsonb_build_object(
    'value', email,
    'type', 'Work',
    'status', 'Primary'
  )
)
WHERE email IS NOT NULL AND email != '' AND (emails IS NULL OR emails = '[]'::jsonb);

-- ─── 2. contact_properties junction table (property linking) ─────────────────

CREATE TABLE IF NOT EXISTS contact_properties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  -- For properties not yet in the DB (added on-the-fly)
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip_code      TEXT,
  apn           TEXT,
  relationship  TEXT DEFAULT 'Owner',  -- Owner, Buyer, Tenant, Guarantor, etc.
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_properties_contact ON contact_properties(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_properties_property ON contact_properties(property_id);

-- RLS
ALTER TABLE contact_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_access_contact_properties" ON contact_properties;
CREATE POLICY "team_access_contact_properties" ON contact_properties
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ─── 3. Rent comp parent-child: rent_properties + rent_units ─────────────────

-- Parent: the physical property (address-level record)
CREATE TABLE IF NOT EXISTS rent_properties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  address       TEXT NOT NULL,
  city          TEXT,
  state         TEXT DEFAULT 'CA',
  zip_code      TEXT,
  latitude      NUMERIC(10,6),
  longitude     NUMERIC(10,6),
  year_built    INT,
  total_units   INT,
  property_type TEXT DEFAULT 'Multifamily',
  source        TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_properties_address
  ON rent_properties(LOWER(TRIM(address)), LOWER(TRIM(COALESCE(city,''))), LOWER(TRIM(COALESCE(zip_code,''))));

-- Child: individual unit type rent records
CREATE TABLE IF NOT EXISTS rent_units (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_property_id  UUID NOT NULL REFERENCES rent_properties(id) ON DELETE CASCADE,
  team_id           UUID REFERENCES teams(id) ON DELETE CASCADE,
  unit_type         TEXT,          -- e.g. "2BD/1BA", "Studio", "1BD/1BA"
  bedrooms          INT,
  bathrooms         NUMERIC(3,1),
  unit_sf           INT,
  avg_rent          NUMERIC(10,2),
  rent_per_sf       NUMERIC(8,4),
  cap_rate          NUMERIC(6,4),
  grm               NUMERIC(8,4),
  vacancy_rate      NUMERIC(6,4),
  notes             TEXT,
  source            TEXT,
  close_date        DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rent_units_property ON rent_units(rent_property_id);

-- RLS
ALTER TABLE rent_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_access_rent_properties" ON rent_properties;
CREATE POLICY "team_access_rent_properties" ON rent_properties
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

ALTER TABLE rent_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_access_rent_units" ON rent_units;
CREATE POLICY "team_access_rent_units" ON rent_units
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- ─── 4. deal_contacts junction table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'Principal',  -- Principal, Buyer, Seller, Broker, Attorney, etc.
  team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal    ON deal_contacts(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_contact ON deal_contacts(contact_id);

ALTER TABLE deal_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_access_deal_contacts" ON deal_contacts;
CREATE POLICY "team_access_deal_contacts" ON deal_contacts
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- ─── 5. Helpful RPC: find contacts by name/address for auto-suggest ───────────

CREATE OR REPLACE FUNCTION search_contacts_by_name_or_address(
  p_team_id UUID,
  p_query   TEXT
)
RETURNS TABLE (
  id           UUID,
  first_name   TEXT,
  last_name    TEXT,
  company      TEXT,
  contact_type TEXT,
  phone        TEXT,
  email        TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT id, first_name, last_name, company, contact_type, phone, email
  FROM contacts
  WHERE team_id = p_team_id
    AND (
      LOWER(first_name || ' ' || COALESCE(last_name,'')) ILIKE '%' || LOWER(p_query) || '%'
      OR LOWER(COALESCE(company,'')) ILIKE '%' || LOWER(p_query) || '%'
      OR LOWER(COALESCE(phone,'')) ILIKE '%' || LOWER(p_query) || '%'
      OR LOWER(COALESCE(email,'')) ILIKE '%' || LOWER(p_query) || '%'
    )
  ORDER BY last_name, first_name
  LIMIT 20;
$$;
