// CRE Operating System - Shared Types

export type PropertyType = 'Multifamily' | 'Mixed-Use' | 'Commercial' | 'Land' | 'SFR' | 'Industrial'
export type CompSource = 'property' | 'comparable'
export type TeamRole = 'Admin' | 'Member'

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface TeamMember {
  team_id: string
  user_id: string
  role: TeamRole
  headshot_url?: string
  phone?: string
  email?: string
  title?: string
  license_number?: string
  bio?: string
}

export interface Contact {
  id: string
  team_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  unit_count_min?: number
  unit_count_max?: number
  tags: string[]
  notes?: string
  is_buyer: boolean
  is_seller: boolean
  is_active: boolean
  created_at: string
}

export interface Property {
  id: string
  team_id: string
  name: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  property_type?: PropertyType
  year_built?: number
  lot_size_sf?: number
  building_size_sf?: number
  num_units?: number
  zoning?: string
  latitude?: number
  longitude?: number
  price?: number
  cap_rate?: number
  grm?: number
  price_per_sf?: number
  price_per_unit?: number
  is_om: boolean
  is_sale_comp: boolean
  is_rent_comp: boolean
  // V1.1 — Photo & unit data
  unit_mix?: string
  unit_sf?: number
  photo_url?: string
  // V1.2 — Debt model
  apn?: string
  noi?: number
  gross_scheduled_income?: number
  vacancy_rate?: number
  operating_expenses?: number
  ltv?: number
  interest_rate?: number
  amortization_yrs?: number
  io_period_yrs?: number
  loan_amount?: number
  annual_debt_service?: number
  dscr?: number
  cash_on_cash?: number
  equity_invested?: number
  // Phase 2 — Demographics & Market Overview
  population?: number
  median_age?: number
  median_hh_income?: number
  median_property_value?: number
  renter_occupied_pct?: number
  avg_commute_min?: number
  market_description?: string
  location_highlights?: string[]
  investment_highlights?: string[]
  property_amenities?: string[]
  // Phase 2 — Expense detail
  gross_sf?: number
  lot_sf?: number
  rent_increase_pct?: number
  other_income?: number
  vacancy_loss_pct?: number
  management_fee_pct?: number
  property_tax?: number
  insurance?: number
  repairs_maintenance?: number
  utilities?: number
  landscaping?: number
  pest_control?: number
  trash?: number
  reserves?: number
  created_at: string
  updated_at: string
}

export interface Comparable {
  id: string
  team_id: string
  name: string
  address: string
  sale_date?: string
  sale_price?: number
  cap_rate?: number
  price_per_sf?: number
  created_at: string
}

export interface PropertyComp {
  property_id: string
  comp_source: CompSource
  comp_id: string
}

// Unified comp feed item (returned by RPCs)
export interface CompFeedItem {
  id: string
  source: CompSource
  name: string
  address: string
  latitude?: number
  longitude?: number
  price?: number
  cap_rate?: number
  grm?: number
  price_per_sf?: number
  price_per_unit?: number
  num_units?: number
  year_built?: number
  building_size_sf?: number
  is_sale_comp: boolean
  is_rent_comp: boolean
  unit_mix?: string        // e.g. "2x 2BD/1BA, 2x 1BD/1BA" — sale comps
  unit_sf?: number          // avg unit square footage — rent comps
  photo_url?: string        // Supabase Storage public URL
  monthly_rent?: number     // rent comps
  unit_type?: string        // rent comps unit type label
  // Computed client-side
  distance_miles?: number
}

// Financial calculator types
export interface SensitivityRow {
  adjustment: number
  price: number
  cap_rate: number
  grm: number
  price_per_unit: number
  price_per_sf: number
}

export interface ExchangeScenario {
  label: string
  equity: number
  leveraged_value: number
  annual_income: number
  roe: number
}
