-- ============================================================
-- PHASE 1 REVISIONS — Migration
-- Run this in the Supabase SQL Editor for project:
-- siyakgunpyqsketgxyno
-- ============================================================

-- 1. Add unit_mix column to properties (JSONB for structured storage)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS unit_mix JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unit_sf INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- 2. Add unit_mix and photo_url to comparables table
ALTER TABLE comparables
  ADD COLUMN IF NOT EXISTS unit_mix JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unit_sf INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- 3. Update seed data with unit_mix and unit_sf for existing properties

-- Subject Property: Naples Island Fourplex
UPDATE properties SET
  unit_mix = '[{"type":"2BD/1BA","count":2},{"type":"1BD/1BA","count":2}]'::jsonb,
  unit_sf = 900
WHERE id = '10000000-0000-0000-0000-000000000001';

-- Sale Comp 1: The Colonnade
UPDATE properties SET
  unit_mix = '[{"type":"2BD/1BA","count":2},{"type":"1BD/1BA","count":2}]'::jsonb,
  unit_sf = 880
WHERE id = '20000000-0000-0000-0000-000000000001';

-- Sale Comp 2: Ravenna Drive
UPDATE properties SET
  unit_mix = '[{"type":"2BD/1BA","count":3},{"type":"1BD/1BA","count":1}]'::jsonb,
  unit_sf = 920
WHERE id = '20000000-0000-0000-0000-000000000002';

-- Sale Comp 3: Appian Way (6-unit)
UPDATE properties SET
  unit_mix = '[{"type":"2BD/1BA","count":4},{"type":"1BD/1BA","count":2}]'::jsonb,
  unit_sf = 950
WHERE id = '20000000-0000-0000-0000-000000000003';

-- Sale Comp 4: Lido Lane
UPDATE properties SET
  unit_mix = '[{"type":"2BD/1BA","count":2},{"type":"Studio","count":2}]'::jsonb,
  unit_sf = 820
WHERE id = '20000000-0000-0000-0000-000000000004';

-- Sale Comp 5: E 2nd St (8-unit)
UPDATE properties SET
  unit_mix = '[{"type":"2BD/1BA","count":4},{"type":"1BD/1BA","count":2},{"type":"Studio","count":2}]'::jsonb,
  unit_sf = 875
WHERE id = '20000000-0000-0000-0000-000000000005';

-- Sale Comp 6: Garibaldi Ave
UPDATE properties SET
  unit_mix = '[{"type":"2BD/1BA","count":2},{"type":"1BD/1BA","count":2}]'::jsonb,
  unit_sf = 900
WHERE id = '20000000-0000-0000-0000-000000000006';

-- Rent Comp 1: 2BR/1BA Naples
UPDATE properties SET unit_sf = 900
WHERE id = '30000000-0000-0000-0000-000000000001';

-- Rent Comp 2: 2BR/1BA Belmont Shore
UPDATE properties SET unit_sf = 850
WHERE id = '30000000-0000-0000-0000-000000000002';

-- Rent Comp 3: 1BR/1BA E Broadway
UPDATE properties SET unit_sf = 700
WHERE id = '30000000-0000-0000-0000-000000000003';

-- Rent Comp 4: 3BR/2BA Belmont Heights
UPDATE properties SET unit_sf = 1200
WHERE id = '30000000-0000-0000-0000-000000000004';

-- Rent Comp 5: 2BR/1BA Park Estates
UPDATE properties SET unit_sf = 950
WHERE id = '30000000-0000-0000-0000-000000000005';

-- 4. Create the comp-photos storage bucket
-- Note: Run this via the Supabase Storage UI or Management API
-- The bucket should be: comp-photos, public: true

-- 5. Storage RLS policies (run after bucket is created via API)
-- These are set via the Management API in the migration script
