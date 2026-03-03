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
