-- CRE OPERATING SYSTEM - PHASE 1 SEED DATA
-- Long Beach, CA (Naples Island / 90803 / Belmont Shore)
-- Focused on 4-plex / multifamily for Mapbox testing

-- Step 1: Create a demo team
INSERT INTO teams (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'YoungLewin Advisors');

-- Step 2: Seed properties
-- Subject Property (is_om = true) — Naples Island 4-plex
-- Sale Comps (is_sale_comp = true) — recent closed sales
-- Rent Comps (is_rent_comp = true) — active rental listings

INSERT INTO properties (
  id, team_id, name, address, city, state, zip_code,
  property_type, year_built, lot_size_sf, building_size_sf, num_units,
  zoning, latitude, longitude,
  price, cap_rate, grm, price_per_sf, price_per_unit,
  is_om, is_sale_comp, is_rent_comp
) VALUES

-- ============================================================
-- SUBJECT PROPERTY — Naples Island Fourplex (The OM)
-- ============================================================
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Naples Island Fourplex',
  '5415 The Toledo, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1962, 5200, 4800, 4,
  'LBR-2', 33.7618, -118.1248,
  2950000, 4.85, 13.20, 614.58, 737500,
  true, false, false
),

-- ============================================================
-- SALE COMPS — Naples Island & Belmont Shore area
-- ============================================================
(
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '4-Unit | The Colonnade',
  '550 The Colonnade, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1958, 4800, 4400, 4,
  'LBR-2', 33.7601, -118.1189,
  2750000, 4.62, 13.75, 625.00, 687500,
  false, true, false
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '4-Unit | Ravenna Drive',
  '212 Ravenna Dr, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1965, 5000, 4600, 4,
  'LBR-2', 33.7638, -118.1215,
  3100000, 4.78, 13.10, 673.91, 775000,
  false, true, false
),
(
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '6-Unit | Appian Way',
  '310 Appian Way, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1971, 7200, 6800, 6,
  'LBR-3', 33.7655, -118.1302,
  4200000, 5.05, 12.80, 617.65, 700000,
  false, true, false
),
(
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '4-Unit | Lido Lane',
  '118 Lido Ln, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1955, 4600, 4200, 4,
  'LBR-2', 33.7580, -118.1175,
  2650000, 4.45, 14.20, 630.95, 662500,
  false, true, false
),
(
  '20000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '8-Unit | E 2nd St',
  '4820 E 2nd St, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1978, 9000, 8400, 8,
  'LBCNP-3', 33.7671, -118.1388,
  5400000, 5.15, 12.50, 642.86, 675000,
  false, true, false
),
(
  '20000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '4-Unit | Garibaldi Ave',
  '244 Garibaldi Ave, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1960, 4900, 4500, 4,
  'LBR-2', 33.7625, -118.1265,
  2880000, 4.70, 13.40, 640.00, 720000,
  false, true, false
),

-- ============================================================
-- RENT COMPS — Active rentals in the trade area
-- ============================================================
(
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Rental | 2BR/1BA Naples',
  '415 The Toledo, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1963, NULL, 900, 1,
  'LBR-2', 33.7610, -118.1230,
  NULL, NULL, NULL, NULL, NULL,
  false, false, true
),
(
  '30000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Rental | 2BR/1BA Belmont Shore',
  '215 Glendora Ave, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1957, NULL, 850, 1,
  'LBR-2', 33.7645, -118.1340,
  NULL, NULL, NULL, NULL, NULL,
  false, false, true
),
(
  '30000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Rental | 1BR/1BA E Broadway',
  '4912 E Broadway, Long Beach, CA 90803',
  'Long Beach', 'CA', '90803',
  'Multifamily', 1969, NULL, 700, 1,
  'LBR-1', 33.7698, -118.1412,
  NULL, NULL, NULL, NULL, NULL,
  false, false, true
),
(
  '30000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Rental | 3BR/2BA Belmont Heights',
  '3820 E 4th St, Long Beach, CA 90814',
  'Long Beach', 'CA', '90814',
  'Multifamily', 1975, NULL, 1200, 1,
  'LBR-3', 33.7718, -118.1520,
  NULL, NULL, NULL, NULL, NULL,
  false, false, true
),
(
  '30000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'Rental | 2BR/1BA Park Estates',
  '5120 E Stearns St, Long Beach, CA 90815',
  'Long Beach', 'CA', '90815',
  'Multifamily', 1982, NULL, 950, 1,
  'LBR-2', 33.7742, -118.1285,
  NULL, NULL, NULL, NULL, NULL,
  false, false, true
);

-- Step 3: Link sale comps to the subject via property_comps
INSERT INTO property_comps (property_id, comp_source, comp_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'property', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'property', '20000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', 'property', '20000000-0000-0000-0000-000000000006');
