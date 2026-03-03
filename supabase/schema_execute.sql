-- CRE OPERATING SYSTEM - PHASE 1 SCHEMA
-- Project: cre-operating-system (siyakgunpyqsketgxyno)
-- Region: us-west-2 (Oregon)

-- 1. MULTI-TENANT TEAM STRUCTURE

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('Admin', 'Member')) NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

-- 2. CORE DATA TABLES

CREATE TABLE IF NOT EXISTS properties (
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

CREATE TABLE IF NOT EXISTS comparables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    sale_date DATE,
    sale_price BIGINT,
    cap_rate REAL,
    price_per_sf REAL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. POLYMORPHIC JUNCTION TABLE

CREATE TABLE IF NOT EXISTS property_comps (
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    comp_source TEXT NOT NULL CHECK (comp_source IN ('property', 'comparable')),
    comp_id UUID NOT NULL,
    PRIMARY KEY (property_id, comp_source, comp_id)
);

-- 4. ROW LEVEL SECURITY

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparables ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_comps ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_team_id() RETURNS UUID AS $$
DECLARE
    team_id_val UUID;
BEGIN
    SELECT team_id INTO team_id_val FROM team_members WHERE user_id = auth.uid() LIMIT 1;
    RETURN team_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view teams they are a member of"
    ON teams FOR SELECT
    USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view team members of their own team"
    ON team_members FOR SELECT
    USING (team_id = get_my_team_id());

CREATE POLICY "Team members can manage properties of their team"
    ON properties FOR ALL
    USING (team_id = get_my_team_id());

CREATE POLICY "Team members can manage comparables of their team"
    ON comparables FOR ALL
    USING (team_id = get_my_team_id());

CREATE POLICY "Team members can manage property_comps of their team"
    ON property_comps FOR ALL
    USING (property_id IN (SELECT id FROM properties WHERE team_id = get_my_team_id()));

-- 5. AUTH TRIGGER

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  INSERT INTO public.teams (name) VALUES (new.email || ' Team') RETURNING id INTO new_team_id;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (new_team_id, new.id, 'Admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. RPCs

CREATE OR REPLACE FUNCTION get_comp_feed(p_team_id UUID)
RETURNS TABLE(comp jsonb)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
      'id', p.id, 'source', 'property', 'name', p.name, 'address', p.address,
      'latitude', p.latitude, 'longitude', p.longitude, 'price', p.price,
      'cap_rate', p.cap_rate, 'grm', p.grm, 'price_per_sf', p.price_per_sf,
      'price_per_unit', p.price_per_unit, 'num_units', p.num_units,
      'year_built', p.year_built, 'building_size_sf', p.building_size_sf,
      'is_sale_comp', p.is_sale_comp, 'is_rent_comp', p.is_rent_comp
  )
  FROM properties p
  WHERE p.team_id = p_team_id AND (p.is_sale_comp = true OR p.is_rent_comp = true)
  UNION ALL
  SELECT jsonb_build_object(
      'id', c.id, 'source', 'comparable', 'name', c.name, 'address', c.address,
      'latitude', NULL, 'longitude', NULL, 'price', c.sale_price,
      'cap_rate', c.cap_rate, 'grm', NULL, 'price_per_sf', c.price_per_sf,
      'price_per_unit', NULL, 'num_units', NULL, 'year_built', NULL,
      'building_size_sf', NULL, 'is_sale_comp', true, 'is_rent_comp', false
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
      'id', p.id, 'source', 'property', 'name', p.name, 'address', p.address,
      'latitude', p.latitude, 'longitude', p.longitude, 'price', p.price,
      'cap_rate', p.cap_rate, 'grm', p.grm, 'price_per_sf', p.price_per_sf,
      'price_per_unit', p.price_per_unit, 'num_units', p.num_units,
      'year_built', p.year_built, 'building_size_sf', p.building_size_sf,
      'is_sale_comp', p.is_sale_comp, 'is_rent_comp', p.is_rent_comp
  )
  FROM properties p
  JOIN property_comps pc ON p.id = pc.comp_id AND pc.comp_source = 'property'
  WHERE pc.property_id = subject_id
  UNION ALL
  SELECT jsonb_build_object(
      'id', c.id, 'source', 'comparable', 'name', c.name, 'address', c.address,
      'latitude', NULL, 'longitude', NULL, 'price', c.sale_price,
      'cap_rate', c.cap_rate, 'grm', NULL, 'price_per_sf', c.price_per_sf,
      'price_per_unit', NULL, 'num_units', NULL, 'year_built', NULL,
      'building_size_sf', NULL, 'is_sale_comp', true, 'is_rent_comp', false
  )
  FROM comparables c
  JOIN property_comps pc ON c.id = pc.comp_id AND pc.comp_source = 'comparable'
  WHERE pc.property_id = subject_id;
END;
$$;
