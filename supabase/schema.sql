-- CRE OPERATING SYSTEM - PHASE 1 SCHEMA
-- LEAD ARCHITECT: MANUS
-- GENERATED ON: 2026-03-02

-- 1. MULTI-TENANT TEAM STRUCTURE
-- =================================

-- Teams table to hold team information
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Team members table with roles
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN (
        'Admin',
        'Member'
    )) NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

-- 2. CORE DATA TABLES
-- =================================

-- Properties table for core building data
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    property_type TEXT,
    year_built INT,
    lot_size_sf INT,
    building_size_sf INT,
    num_units INT,
    zoning TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    price BIGINT,
    cap_rate REAL,
    grm REAL,
    price_per_sf REAL,
    price_per_unit REAL,
    is_om BOOLEAN DEFAULT false,
    is_sale_comp BOOLEAN DEFAULT false,
    is_rent_comp BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Standalone comparables table
CREATE TABLE comparables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    sale_date DATE,
    sale_price BIGINT,
    cap_rate REAL,
    price_per_sf REAL,
    -- Add other relevant comp fields as needed
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. POLYMORPHIC JUNCTION TABLE
-- =================================

-- Junction table for property comps
CREATE TABLE property_comps (
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    comp_source TEXT NOT NULL CHECK (comp_source IN (
        'property',
        'comparable'
    )),
    comp_id UUID NOT NULL,
    PRIMARY KEY (property_id, comp_source, comp_id)
);

-- 4. ROW LEVEL SECURITY (RLS)
-- =================================

-- Enable RLS for all relevant tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparables ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_comps ENABLE ROW LEVEL SECURITY;

-- Function to get user's team ID
CREATE OR REPLACE FUNCTION get_my_team_id() RETURNS UUID AS $$
DECLARE
    team_id_val UUID;
BEGIN
    SELECT team_id INTO team_id_val FROM team_members WHERE user_id = auth.uid() LIMIT 1;
    RETURN team_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Users can view teams they are a member of" ON teams FOR SELECT USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can view team members of their own team" ON team_members FOR SELECT USING (team_id = get_my_team_id());
CREATE POLICY "Team members can manage properties of their team" ON properties FOR ALL USING (team_id = get_my_team_id());
CREATE POLICY "Team members can manage comparables of their team" ON comparables FOR ALL USING (team_id = get_my_team_id());
CREATE POLICY "Team members can manage property_comps of their team" ON property_comps FOR ALL USING (property_id IN (SELECT id FROM properties WHERE team_id = get_my_team_id()));

-- 5. AUTH TRIGGER FOR TEAM CREATION
-- =================================

-- Function to create a team for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Create a new team for the user
  INSERT INTO public.teams (name) VALUES (new.email || ' Team') RETURNING id INTO new_team_id;
  -- Add the user as an admin to their new team
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (new_team_id, new.id, 'Admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. RPCs (REMOTE PROCEDURE CALLS)
-- =================================

CREATE OR REPLACE FUNCTION get_comp_feed(p_team_id UUID)
RETURNS TABLE(comp jsonb)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
      'id', p.id,
      'source', 'property',
      'name', p.name,
      'address', p.address,
      'latitude', p.latitude,
      'longitude', p.longitude,
      'price', p.price,
      'cap_rate', p.cap_rate,
      'is_sale_comp', p.is_sale_comp,
      'is_rent_comp', p.is_rent_comp
  )
  FROM properties p
  WHERE p.team_id = p_team_id AND (p.is_sale_comp = true OR p.is_rent_comp = true)
  UNION ALL
  SELECT jsonb_build_object(
      'id', c.id,
      'source', 'comparable',
      'name', c.name,
      'address', c.address,
      'latitude', NULL, -- Comparables may not have lat/lng
      'longitude', NULL,
      'price', c.sale_price,
      'cap_rate', c.cap_rate,
      'is_sale_comp', true, -- Manual comps are assumed to be sale comps
      'is_rent_comp', false
  )
  FROM comparables c
  WHERE c.team_id = p_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_subject_comp_feed(subject_id UUID)
RETURNS TABLE(comp jsonb)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
      'id', p.id,
      'source', 'property',
      'name', p.name,
      'address', p.address,
      'latitude', p.latitude,
      'longitude', p.longitude,
      'price', p.price,
      'cap_rate', p.cap_rate,
      'is_sale_comp', p.is_sale_comp,
      'is_rent_comp', p.is_rent_comp
  )
  FROM properties p
  JOIN property_comps pc ON p.id = pc.comp_id AND pc.comp_source = 'property'
  WHERE pc.property_id = subject_id
  UNION ALL
  SELECT jsonb_build_object(
      'id', c.id,
      'source', 'comparable',
      'name', c.name,
      'address', c.address,
      'latitude', NULL,
      'longitude', NULL,
      'price', c.sale_price,
      'cap_rate', c.cap_rate,
      'is_sale_comp', true,
      'is_rent_comp', false
  )
  FROM comparables c
  JOIN property_comps pc ON c.id = pc.comp_id AND pc.comp_source = 'comparable'
  WHERE pc.property_id = subject_id;
END;
$$;

-- 7. SEED DATA (LONG BEACH, CA)
-- =================================

-- This will be run manually after a user and team are created.
-- Replace 'your_team_id_here' with the actual team_id.

-- INSERT INTO properties (team_id, name, address, city, state, zip_code, property_type, year_built, lot_size_sf, building_size_sf, num_units, zoning, latitude, longitude, price, cap_rate, grm, price_per_sf, price_per_unit, is_om, is_sale_comp, is_rent_comp)
-- VALUES
-- ('your_team_id_here', 'Naples Island Fourplex', '550 The Colonnade, Long Beach', 'Long Beach', 'CA', '90803', 'Multifamily', 1965, 4500, 4200, 4, 'LBR-1', 33.7553, -118.1150, 2850000, 4.75, 13.5, 678, 712500, true, false, false),
-- ('your_team_id_here', 'Belmont Shore Duplex', '215 Glendora Ave, Long Beach', 'Long Beach', 'CA', '90803', 'Multifamily', 1952, 3000, 2100, 2, 'LBR-1', 33.7601, -118.1445, 1600000, 4.25, 15.1, 762, 800000, false, true, false),
-- ('your_team_id_here', '4th Street Apartments', '2120 E 4th St, Long Beach', 'Long Beach', 'CA', '90814', 'Multifamily', 1988, 7500, 8500, 10, 'LBCNP-3', 33.7717, -118.1650, 5500000, 5.10, 12.8, 647, 550000, false, true, false),
-- ('your_team_id_here', 'East Village Lofts', '300 E 4th St, Long Beach', 'Long Beach', 'CA', '90802', 'Multifamily', 2005, 10000, 12000, 15, 'LBPD-30', 33.7718, -118.1880, 9750000, 4.90, 13.2, 812, 650000, false, true, false),
-- ('your_team_id_here', 'The Toledo', '4121 E The Toledo, Long Beach', 'Long Beach', 'CA', '90803', 'Multifamily', 1971, 6000, 5800, 6, 'LBR-2', 33.7633, -118.1432, 3500000, 4.5, 14.2, 603, 583333, false, false, true);

