// CRE Operating System - Shared Types
export type PropertyType = 'Multifamily' | 'Mixed-Use' | 'Commercial' | 'Land' | 'SFR' | 'Industrial'
export type CompSource = 'property' | 'comparable'
export type TeamRole = 'Admin' | 'Member'

// ─── Phase 3 CRM Types ───────────────────────────────────────────────────────
export type ContactType = 'Buyer' | 'Seller' | 'Investor' | 'Broker' | 'Lender' | 'Vendor' | 'Other'
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Active' | 'Under Contract' | 'Closed' | 'Dead'
export type DealStage = 'Prospecting' | 'Outreach' | 'Meeting Scheduled' | 'LOI / Offer' | 'Under Contract' | 'Due Diligence' | 'Closed Won' | 'Closed Lost'
export type CommChannel = 'email' | 'sms' | 'call' | 'note' | 'meeting'
export type TaskPriority = 'Low' | 'Normal' | 'High' | 'Urgent'

export interface PhoneEntry {
  number: string
  label: string
  line_type?: string
  is_valid: boolean
  confidence_score?: number
}

export interface EmailEntry {
  address: string
  label: string
  is_valid: boolean
}

export interface InvestmentCriteria {
  asset_types?: string[]
  min_price?: number
  max_price?: number
  min_units?: number
  max_units?: number
  target_zips?: string[]
  target_cities?: string[]
  cap_rate_min?: number
  notes?: string
}

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  full_name?: string
  headshot_url?: string
  phone?: string
  email?: string
  title?: string
  license_number?: string
  dre_license?: string
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
  phones?: PhoneEntry[]
  emails?: EmailEntry[]
  mailing_address?: string
  city?: string
  state?: string
  zip?: string
  contact_type?: ContactType
  lead_status?: LeadStatus
  tags: string[]
  investment_criteria?: InvestmentCriteria
  do_not_call?: boolean
  do_not_email?: boolean
  last_skip_traced_at?: string
  skip_trace_provider?: string
  skip_trace_confidence?: number
  lead_source?: string
  avatar_url?: string
  notes?: string
  is_buyer?: boolean
  is_seller?: boolean
  is_active?: boolean
  unit_count_min?: number
  unit_count_max?: number
  created_at: string
}

export interface Deal {
  id: string
  team_id: string
  property_id?: string
  contact_id?: string
  title: string
  stage: DealStage
  deal_type: 'Sale' | 'Lease' | 'Development' | 'Management'
  asking_price?: number
  offer_price?: number
  commission_pct?: number
  commission_est?: number
  probability?: number
  close_date_est?: string
  assigned_to?: string
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  property?: Property
  contact?: Contact
}

export interface Communication {
  id: string
  team_id: string
  contact_id?: string
  deal_id?: string
  channel: CommChannel
  direction: 'inbound' | 'outbound'
  subject?: string
  body: string
  from_address?: string
  to_address?: string
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'draft'
  read_at?: string
  created_at: string
  contact?: Contact
}

export interface Task {
  id: string
  team_id: string
  contact_id?: string
  deal_id?: string
  property_id?: string
  title: string
  description?: string
  due_date?: string
  priority: TaskPriority
  completed: boolean
  completed_at?: string
  assigned_to?: string
  created_at: string
  contact?: Contact
  deal?: Deal
}

export interface SkipTraceRequest {
  id: string
  team_id: string
  contact_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  provider?: string
  raw_result?: Record<string, unknown>
  phones_found?: PhoneEntry[]
  emails_found?: EmailEntry[]
  confidence_score?: number
  created_at: string
  completed_at?: string
}

export interface CompIngestionLog {
  id: string
  team_id: string
  source: 'MLS' | 'CoStar' | 'Manual' | 'CSV' | 'Zapier'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  records_total?: number
  records_imported?: number
  records_failed?: number
  error_log?: string
  created_at: string
}

export interface Entity {
  id: string
  team_id: string
  name: string
  entity_type: 'LLC' | 'LP' | 'Corp' | 'Trust' | 'Individual' | 'Other'
  ein?: string
  state_of_formation?: string
  registered_agent?: string
  address?: string
  notes?: string
  created_at: string
}

export interface BuyerMatch {
  contact: Contact
  score: number
  match_reasons: string[]
  mismatches: string[]
}

// ─── Phase 1 / 2 Types ──────────────────────────────────────────────────────
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
  unit_mix?: string
  unit_sf?: number
  photo_url?: string
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
  unit_mix?: string
  unit_sf?: number
  photo_url?: string
  monthly_rent?: number
  unit_type?: string
  distance_miles?: number
}

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
