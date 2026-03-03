-- ============================================================
-- V1.2 MIGRATION: Debt Modeling + Rent Roll Parser
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Add Debt Model columns to properties ──────────────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS ltv              numeric(5,4),   -- e.g. 0.65 = 65%
  ADD COLUMN IF NOT EXISTS interest_rate    numeric(6,4),   -- e.g. 0.0675 = 6.75%
  ADD COLUMN IF NOT EXISTS amortization_yrs integer,        -- e.g. 30
  ADD COLUMN IF NOT EXISTS io_period_yrs    integer DEFAULT 0, -- Interest-Only years
  ADD COLUMN IF NOT EXISTS noi              numeric(14,2),  -- Net Operating Income
  ADD COLUMN IF NOT EXISTS gross_scheduled_income numeric(14,2),
  ADD COLUMN IF NOT EXISTS vacancy_rate     numeric(5,4) DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS operating_expenses numeric(14,2),
  -- Computed / stored for reporting
  ADD COLUMN IF NOT EXISTS loan_amount      numeric(14,2),
  ADD COLUMN IF NOT EXISTS annual_debt_service numeric(14,2),
  ADD COLUMN IF NOT EXISTS dscr             numeric(6,3),
  ADD COLUMN IF NOT EXISTS cash_on_cash     numeric(6,4),
  ADD COLUMN IF NOT EXISTS equity_invested  numeric(14,2);

-- ── 2. rent_rolls table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS rent_rolls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  property_id       uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number       text NOT NULL,
  unit_type         text,                   -- e.g. "2BD/1BA"
  unit_sf           integer,
  tenant_name       text,
  lease_start       date,
  lease_end         date,
  monthly_rent      numeric(10,2),
  market_rent       numeric(10,2),          -- for vacancy/loss analysis
  is_vacant         boolean DEFAULT false,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Updated_at trigger for rent_rolls
CREATE OR REPLACE FUNCTION update_rent_rolls_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_rent_rolls_updated_at ON rent_rolls;
CREATE TRIGGER trg_rent_rolls_updated_at
  BEFORE UPDATE ON rent_rolls
  FOR EACH ROW EXECUTE FUNCTION update_rent_rolls_updated_at();

-- ── 3. RLS on rent_rolls ─────────────────────────────────────
ALTER TABLE rent_rolls ENABLE ROW LEVEL SECURITY;

-- Team members can read their team's rent rolls
CREATE POLICY "rent_rolls_team_select"
  ON rent_rolls FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team members can insert rent rolls for their team
CREATE POLICY "rent_rolls_team_insert"
  ON rent_rolls FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team members can update rent rolls for their team
CREATE POLICY "rent_rolls_team_update"
  ON rent_rolls FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team members can delete rent rolls for their team
CREATE POLICY "rent_rolls_team_delete"
  ON rent_rolls FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ── 4. RPC: get_rent_roll_summary(property_id) ───────────────
-- Returns GPR, effective gross income, occupancy rate
CREATE OR REPLACE FUNCTION get_rent_roll_summary(p_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_units     integer;
  v_occupied_units  integer;
  v_gpr             numeric;
  v_actual_income   numeric;
  v_occupancy_rate  numeric;
BEGIN
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE NOT is_vacant)::integer,
    COALESCE(SUM(market_rent), 0),
    COALESCE(SUM(CASE WHEN NOT is_vacant THEN monthly_rent ELSE 0 END), 0)
  INTO v_total_units, v_occupied_units, v_gpr, v_actual_income
  FROM rent_rolls
  WHERE property_id = p_property_id;

  IF v_total_units = 0 THEN
    RETURN jsonb_build_object(
      'total_units', 0, 'occupied_units', 0,
      'gpr_monthly', 0, 'gpr_annual', 0,
      'actual_income_monthly', 0, 'actual_income_annual', 0,
      'occupancy_rate', 0
    );
  END IF;

  v_occupancy_rate := v_occupied_units::numeric / v_total_units;

  RETURN jsonb_build_object(
    'total_units',             v_total_units,
    'occupied_units',          v_occupied_units,
    'gpr_monthly',             v_gpr,
    'gpr_annual',              v_gpr * 12,
    'actual_income_monthly',   v_actual_income,
    'actual_income_annual',    v_actual_income * 12,
    'occupancy_rate',          ROUND(v_occupancy_rate, 4)
  );
END;
$$;

-- ── 5. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rent_rolls_property_id ON rent_rolls(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_rolls_team_id ON rent_rolls(team_id);
