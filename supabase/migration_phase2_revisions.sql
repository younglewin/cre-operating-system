-- ============================================================
-- Phase 2 Revisions Migration
-- Adds: headshot_url to team_members, demographics fields to
--       properties, contacts table with tags/zip for audience
--       selector, and letter_campaigns table for 8.5x11 mail
-- ============================================================

-- 1. Add headshot_url to team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS headshot_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Add demographics & market overview fields to properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS population INTEGER,
  ADD COLUMN IF NOT EXISTS median_age NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS median_hh_income INTEGER,
  ADD COLUMN IF NOT EXISTS median_property_value INTEGER,
  ADD COLUMN IF NOT EXISTS renter_occupied_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS avg_commute_min NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS market_description TEXT,
  ADD COLUMN IF NOT EXISTS location_highlights TEXT[],
  ADD COLUMN IF NOT EXISTS investment_highlights TEXT[],
  ADD COLUMN IF NOT EXISTS property_amenities TEXT[],
  ADD COLUMN IF NOT EXISTS grm NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS price_per_unit INTEGER,
  ADD COLUMN IF NOT EXISTS price_per_sf NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS gross_sf INTEGER,
  ADD COLUMN IF NOT EXISTS lot_sf INTEGER,
  ADD COLUMN IF NOT EXISTS zoning TEXT,
  ADD COLUMN IF NOT EXISTS apn TEXT,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS rent_increase_pct NUMERIC(5,2) DEFAULT 8.9,
  ADD COLUMN IF NOT EXISTS other_income INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacancy_loss_pct NUMERIC(5,2) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS management_fee_pct NUMERIC(5,2) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS property_tax INTEGER,
  ADD COLUMN IF NOT EXISTS insurance INTEGER,
  ADD COLUMN IF NOT EXISTS repairs_maintenance INTEGER,
  ADD COLUMN IF NOT EXISTS utilities INTEGER,
  ADD COLUMN IF NOT EXISTS landscaping INTEGER,
  ADD COLUMN IF NOT EXISTS pest_control INTEGER,
  ADD COLUMN IF NOT EXISTS trash INTEGER,
  ADD COLUMN IF NOT EXISTS reserves INTEGER;

-- 3. Create contacts table for audience selector
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'CA',
  zip TEXT,
  unit_count_min INTEGER,
  unit_count_max INTEGER,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_buyer BOOLEAN DEFAULT true,
  is_seller BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_team_select" ON contacts
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contacts_team_insert" ON contacts
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contacts_team_update" ON contacts
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contacts_team_delete" ON contacts
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- 4. Create letter_campaigns table (8.5x11 direct mail)
CREATE TABLE IF NOT EXISTS letter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  property_id UUID REFERENCES properties(id),
  subject_line TEXT,
  body_text TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  recipient_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  lob_campaign_id TEXT
);

ALTER TABLE letter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letter_campaigns_team_select" ON letter_campaigns
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "letter_campaigns_team_insert" ON letter_campaigns
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "letter_campaigns_team_update" ON letter_campaigns
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- 5. Update funnel_pages to add nda_required toggle (if table exists)
ALTER TABLE funnel_pages
  ADD COLUMN IF NOT EXISTS nda_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS bypass_message TEXT DEFAULT 'Enter your information below to instantly access the offering materials.';

-- 6. Add headshots bucket policy (bucket created via storage API)
-- Run separately: create bucket 'headshots' as public

-- 7. Seed demo contacts for Long Beach area (audience selector testing)
DO $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT id INTO v_team_id FROM teams LIMIT 1;

  IF v_team_id IS NOT NULL THEN
    INSERT INTO contacts (team_id, first_name, last_name, email, phone, company, city, state, zip, unit_count_min, unit_count_max, tags, is_buyer, is_seller) VALUES
    (v_team_id, 'Michael', 'Chen', 'mchen@investco.com', '562-555-0101', 'Chen Capital Group', 'Long Beach', 'CA', '90803', 4, 20, ARRAY['buyer','multifamily','cash'], true, false),
    (v_team_id, 'Sarah', 'Martinez', 'smartinez@realty.com', '562-555-0102', 'Martinez Investments', 'Long Beach', 'CA', '90803', 2, 8, ARRAY['buyer','1031-exchange'], true, false),
    (v_team_id, 'David', 'Park', 'dpark@parkre.com', '310-555-0103', 'Park Real Estate', 'Belmont Shore', 'CA', '90803', 10, 50, ARRAY['buyer','institutional'], true, false),
    (v_team_id, 'Jennifer', 'Williams', 'jwilliams@wb.com', '562-555-0104', 'Williams Brothers LLC', 'Naples Island', 'CA', '90803', 4, 12, ARRAY['buyer','value-add'], true, false),
    (v_team_id, 'Robert', 'Thompson', 'rthompson@tg.com', '310-555-0105', 'Thompson Group', 'Seal Beach', 'CA', '90740', 20, 100, ARRAY['buyer','institutional','1031-exchange'], true, false),
    (v_team_id, 'Lisa', 'Anderson', 'landerson@gmail.com', '562-555-0106', NULL, 'Long Beach', 'CA', '90802', 2, 6, ARRAY['buyer','first-time'], true, false),
    (v_team_id, 'James', 'Wilson', 'jwilson@wre.com', '562-555-0107', 'Wilson Real Estate', 'Long Beach', 'CA', '90804', 6, 24, ARRAY['seller','multifamily'], false, true),
    (v_team_id, 'Patricia', 'Brown', 'pbrown@pb.com', '562-555-0108', 'Brown Properties', 'Signal Hill', 'CA', '90755', 4, 16, ARRAY['seller','buyer','value-add'], true, true),
    (v_team_id, 'Christopher', 'Davis', 'cdavis@cd.com', '310-555-0109', 'Davis Capital', 'Lakewood', 'CA', '90712', 8, 40, ARRAY['buyer','1031-exchange','cash'], true, false),
    (v_team_id, 'Amanda', 'Garcia', 'agarcia@ag.com', '562-555-0110', 'Garcia Investments', 'Long Beach', 'CA', '90806', 2, 10, ARRAY['buyer','multifamily'], true, false),
    (v_team_id, 'Kevin', 'Lee', 'klee@kl.com', '562-555-0111', 'Lee Holdings', 'Long Beach', 'CA', '90807', 4, 20, ARRAY['buyer','value-add','cash'], true, false),
    (v_team_id, 'Michelle', 'Taylor', 'mtaylor@mt.com', '310-555-0112', 'Taylor Family Trust', 'Torrance', 'CA', '90503', 10, 30, ARRAY['buyer','1031-exchange'], true, false)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 8. Update the subject property seed data with full financial details
UPDATE properties SET
  grm = 14.52,
  price_per_unit = 737500,
  price_per_sf = 461.54,
  gross_sf = 6400,
  lot_sf = 5800,
  zoning = 'R-3',
  apn = '7243-021-015',
  year_built = 1962,
  population = 89000,
  median_age = 37.2,
  median_hh_income = 72000,
  median_property_value = 850000,
  renter_occupied_pct = 52.3,
  avg_commute_min = 28.5,
  market_description = 'Naples Island is one of Long Beach''s most coveted coastal neighborhoods, featuring canals, waterfront dining, and immediate beach access. The area commands premium rents driven by its walkability, proximity to CSULB, and limited multifamily supply.',
  location_highlights = ARRAY['0.3 miles to Alamitos Bay Beach', '1.2 miles to CSULB (27,000 students)', 'Walk Score 82 — Very Walkable', 'Belmont Shore retail corridor within 0.5 miles', 'Metro A Line (Blue) 1.8 miles'],
  investment_highlights = ARRAY['Below-market rents with 18-22% upside to market', 'Value-add opportunity: unit interiors unrenovated since 2008', 'Strong coastal rental demand driven by CSULB proximity', 'ADU potential on oversized 5,800 SF lot (verify with city)', 'All-electric building — no gas conversion costs'],
  property_amenities = ARRAY['On-site laundry', 'Covered parking (4 spaces)', 'Private patios/balconies on all units', 'Separately metered utilities', 'Recently re-roofed (2021)'],
  rent_increase_pct = 15.0,
  other_income = 4800,
  vacancy_loss_pct = 5.0,
  management_fee_pct = 6.0,
  property_tax = 36875,
  insurance = 8400,
  repairs_maintenance = 12000,
  utilities = 6000,
  landscaping = 3600,
  pest_control = 1200,
  trash = 2400,
  reserves = 6000
WHERE is_om = true;
