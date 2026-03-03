/**
 * AudienceSelector.tsx
 * Universal audience filtering component for Direct Mail and Email campaigns.
 * Filters the contacts database by: Tags, Zip Code, City, Unit Count range.
 */
import { useState, useEffect, useCallback } from 'react'
import { Users, Filter, X, Tag, MapPin, Building2, ChevronDown, ChevronUp, Check, Search } from 'lucide-react'
import type { Contact } from '../types'

// ── Mock contacts for demo mode ────────────────────────────────
const DEMO_CONTACTS: Contact[] = [
  { id: '1', team_id: 'demo', first_name: 'Michael', last_name: 'Chen', email: 'mchen@investco.com', phone: '562-555-0101', company: 'Chen Capital Group', city: 'Long Beach', state: 'CA', zip: '90803', unit_count_min: 4, unit_count_max: 20, tags: ['buyer', 'multifamily', 'cash'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '2', team_id: 'demo', first_name: 'Sarah', last_name: 'Martinez', email: 'smartinez@realty.com', phone: '562-555-0102', company: 'Martinez Investments', city: 'Long Beach', state: 'CA', zip: '90803', unit_count_min: 2, unit_count_max: 8, tags: ['buyer', '1031-exchange'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '3', team_id: 'demo', first_name: 'David', last_name: 'Park', email: 'dpark@parkre.com', phone: '310-555-0103', company: 'Park Real Estate', city: 'Belmont Shore', state: 'CA', zip: '90803', unit_count_min: 10, unit_count_max: 50, tags: ['buyer', 'institutional'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '4', team_id: 'demo', first_name: 'Jennifer', last_name: 'Williams', email: 'jwilliams@wb.com', phone: '562-555-0104', company: 'Williams Brothers LLC', city: 'Naples Island', state: 'CA', zip: '90803', unit_count_min: 4, unit_count_max: 12, tags: ['buyer', 'value-add'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '5', team_id: 'demo', first_name: 'Robert', last_name: 'Thompson', email: 'rthompson@tg.com', phone: '310-555-0105', company: 'Thompson Group', city: 'Seal Beach', state: 'CA', zip: '90740', unit_count_min: 20, unit_count_max: 100, tags: ['buyer', 'institutional', '1031-exchange'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '6', team_id: 'demo', first_name: 'Lisa', last_name: 'Anderson', email: 'landerson@gmail.com', phone: '562-555-0106', city: 'Long Beach', state: 'CA', zip: '90802', unit_count_min: 2, unit_count_max: 6, tags: ['buyer', 'first-time'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '7', team_id: 'demo', first_name: 'James', last_name: 'Wilson', email: 'jwilson@wre.com', phone: '562-555-0107', company: 'Wilson Real Estate', city: 'Long Beach', state: 'CA', zip: '90804', unit_count_min: 6, unit_count_max: 24, tags: ['seller', 'multifamily'], is_buyer: false, is_seller: true, is_active: true, created_at: '2024-01-01' },
  { id: '8', team_id: 'demo', first_name: 'Patricia', last_name: 'Brown', email: 'pbrown@pb.com', phone: '562-555-0108', company: 'Brown Properties', city: 'Signal Hill', state: 'CA', zip: '90755', unit_count_min: 4, unit_count_max: 16, tags: ['seller', 'buyer', 'value-add'], is_buyer: true, is_seller: true, is_active: true, created_at: '2024-01-01' },
  { id: '9', team_id: 'demo', first_name: 'Christopher', last_name: 'Davis', email: 'cdavis@cd.com', phone: '310-555-0109', company: 'Davis Capital', city: 'Lakewood', state: 'CA', zip: '90712', unit_count_min: 8, unit_count_max: 40, tags: ['buyer', '1031-exchange', 'cash'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '10', team_id: 'demo', first_name: 'Amanda', last_name: 'Garcia', email: 'agarcia@ag.com', phone: '562-555-0110', company: 'Garcia Investments', city: 'Long Beach', state: 'CA', zip: '90806', unit_count_min: 2, unit_count_max: 10, tags: ['buyer', 'multifamily'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '11', team_id: 'demo', first_name: 'Kevin', last_name: 'Lee', email: 'klee@kl.com', phone: '562-555-0111', company: 'Lee Holdings', city: 'Long Beach', state: 'CA', zip: '90807', unit_count_min: 4, unit_count_max: 20, tags: ['buyer', 'value-add', 'cash'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
  { id: '12', team_id: 'demo', first_name: 'Michelle', last_name: 'Taylor', email: 'mtaylor@mt.com', phone: '310-555-0112', company: 'Taylor Family Trust', city: 'Torrance', state: 'CA', zip: '90503', unit_count_min: 10, unit_count_max: 30, tags: ['buyer', '1031-exchange'], is_buyer: true, is_seller: false, is_active: true, created_at: '2024-01-01' },
]

const ALL_TAGS = ['buyer', 'seller', 'multifamily', 'cash', '1031-exchange', 'institutional', 'value-add', 'first-time']
const ALL_CITIES = ['Long Beach', 'Belmont Shore', 'Naples Island', 'Seal Beach', 'Signal Hill', 'Lakewood', 'Torrance']
const ALL_ZIPS = ['90803', '90802', '90804', '90806', '90807', '90740', '90755', '90712', '90503']

export interface AudienceSelectorProps {
  onSelectionChange: (selected: Contact[]) => void
  mode?: 'email' | 'mail'
  className?: string
}

export default function AudienceSelector({ onSelectionChange, mode = 'email', className = '' }: AudienceSelectorProps) {
  const [contacts] = useState<Contact[]>(DEMO_CONTACTS)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedZips, setSelectedZips] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [unitMin, setUnitMin] = useState<string>('')
  const [unitMax, setUnitMax] = useState<string>('')
  const [buyerOnly, setBuyerOnly] = useState(false)
  const [sellerOnly, setSellerOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [listOpen, setListOpen] = useState(true)

  const filteredContacts = useCallback(() => {
    return contacts.filter(c => {
      if (!c.is_active) return false
      if (buyerOnly && !c.is_buyer) return false
      if (sellerOnly && !c.is_seller) return false
      if (selectedTags.length > 0 && !selectedTags.some(t => c.tags.includes(t))) return false
      if (selectedZips.length > 0 && !selectedZips.includes(c.zip ?? '')) return false
      if (selectedCities.length > 0 && !selectedCities.includes(c.city ?? '')) return false
      if (unitMin && (c.unit_count_max ?? 0) < parseInt(unitMin)) return false
      if (unitMax && (c.unit_count_min ?? 999) > parseInt(unitMax)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase()
        if (!fullName.includes(q) && !(c.email ?? '').toLowerCase().includes(q) && !(c.company ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [contacts, selectedTags, selectedZips, selectedCities, unitMin, unitMax, buyerOnly, sellerOnly, searchQuery])

  useEffect(() => {
    const filtered = filteredContacts()
    // Auto-select all filtered contacts
    const newIds = new Set(filtered.map(c => c.id))
    setSelectedIds(newIds)
    onSelectionChange(filtered.filter(c => newIds.has(c.id)))
  }, [filteredContacts, onSelectionChange])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const toggleZip = (zip: string) => {
    setSelectedZips(prev => prev.includes(zip) ? prev.filter(z => z !== zip) : [...prev, zip])
  }

  const toggleCity = (city: string) => {
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city])
  }

  const toggleContact = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const filtered = filteredContacts()
      onSelectionChange(filtered.filter(c => next.has(c.id)))
      return next
    })
  }

  const selectAll = () => {
    const filtered = filteredContacts()
    const newIds = new Set(filtered.map(c => c.id))
    setSelectedIds(newIds)
    onSelectionChange(filtered)
  }

  const clearAll = () => {
    setSelectedIds(new Set())
    onSelectionChange([])
  }

  const clearFilters = () => {
    setSelectedTags([])
    setSelectedZips([])
    setSelectedCities([])
    setUnitMin('')
    setUnitMax('')
    setBuyerOnly(false)
    setSellerOnly(false)
    setSearchQuery('')
  }

  const filtered = filteredContacts()
  const selectedCount = filtered.filter(c => selectedIds.has(c.id)).length
  const hasFilters = selectedTags.length > 0 || selectedZips.length > 0 || selectedCities.length > 0 || unitMin || unitMax || buyerOnly || sellerOnly

  const tagColors: Record<string, string> = {
    'buyer': 'bg-teal-900/50 text-teal-300 border-teal-700',
    'seller': 'bg-amber-900/50 text-amber-300 border-amber-700',
    'multifamily': 'bg-blue-900/50 text-blue-300 border-blue-700',
    'cash': 'bg-green-900/50 text-green-300 border-green-700',
    '1031-exchange': 'bg-purple-900/50 text-purple-300 border-purple-700',
    'institutional': 'bg-red-900/50 text-red-300 border-red-700',
    'value-add': 'bg-orange-900/50 text-orange-300 border-orange-700',
    'first-time': 'bg-pink-900/50 text-pink-300 border-pink-700',
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#C5963A]" />
          <span className="text-sm font-semibold text-white">Audience Targeting</span>
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#C5963A] text-[#0F172A]">
            {selectedCount} {mode === 'mail' ? 'Recipients' : 'Contacts'}
          </span>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-white transition-colors">
            <X size={12} />
            Clear Filters
          </button>
        )}
      </div>

      {/* Filters Panel */}
      <div className="bg-[#1E2D4F] border border-[#2D3F5E] rounded">
        <button
          onClick={() => setFiltersOpen(p => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-white hover:bg-[#243352] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#C5963A]" />
            <span>Filters</span>
            {hasFilters && <span className="w-2 h-2 rounded-full bg-[#C5963A]" />}
          </div>
          {filtersOpen ? <ChevronUp size={14} className="text-[#94A3B8]" /> : <ChevronDown size={14} className="text-[#94A3B8]" />}
        </button>

        {filtersOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-[#2D3F5E]">
            {/* Search */}
            <div className="pt-3">
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Name, email, or company..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0F172A] border border-[#2D3F5E] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#C5963A]"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                <Tag size={11} className="inline mr-1" />
                Contact Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 text-xs border rounded transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-[#C5963A] text-[#0F172A] border-[#C5963A] font-semibold'
                        : (tagColors[tag] ?? 'bg-[#0F172A] text-[#94A3B8] border-[#2D3F5E] hover:border-[#C5963A]')
                    }`}
                  >
                    {selectedTags.includes(tag) && <Check size={9} className="inline mr-0.5" />}
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                <MapPin size={11} className="inline mr-1" />
                City
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CITIES.map(city => (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={`px-2 py-0.5 text-xs border transition-all ${
                      selectedCities.includes(city)
                        ? 'bg-[#C5963A] text-[#0F172A] border-[#C5963A] font-semibold'
                        : 'bg-[#0F172A] text-[#94A3B8] border-[#2D3F5E] hover:border-[#C5963A]'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* Zip Code */}
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Zip Code
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ZIPS.map(zip => (
                  <button
                    key={zip}
                    onClick={() => toggleZip(zip)}
                    className={`px-2 py-0.5 text-xs border font-mono transition-all ${
                      selectedZips.includes(zip)
                        ? 'bg-[#C5963A] text-[#0F172A] border-[#C5963A] font-semibold'
                        : 'bg-[#0F172A] text-[#94A3B8] border-[#2D3F5E] hover:border-[#C5963A]'
                    }`}
                  >
                    {zip}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit Count */}
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                <Building2 size={11} className="inline mr-1" />
                Unit Count Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={unitMin}
                  onChange={e => setUnitMin(e.target.value)}
                  placeholder="Min"
                  className="w-20 px-2 py-1.5 bg-[#0F172A] border border-[#2D3F5E] text-white text-xs focus:outline-none focus:border-[#C5963A]"
                />
                <span className="text-[#94A3B8] text-xs">to</span>
                <input
                  type="number"
                  value={unitMax}
                  onChange={e => setUnitMax(e.target.value)}
                  placeholder="Max"
                  className="w-20 px-2 py-1.5 bg-[#0F172A] border border-[#2D3F5E] text-white text-xs focus:outline-none focus:border-[#C5963A]"
                />
                <span className="text-[#94A3B8] text-xs">units</span>
              </div>
            </div>

            {/* Buyer / Seller toggle */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={buyerOnly}
                  onChange={e => { setBuyerOnly(e.target.checked); if (e.target.checked) setSellerOnly(false) }}
                  className="accent-[#C5963A]"
                />
                <span className="text-xs text-[#94A3B8]">Buyers Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sellerOnly}
                  onChange={e => { setSellerOnly(e.target.checked); if (e.target.checked) setBuyerOnly(false) }}
                  className="accent-[#C5963A]"
                />
                <span className="text-xs text-[#94A3B8]">Sellers Only</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="bg-[#1E2D4F] border border-[#2D3F5E] rounded">
        <button
          onClick={() => setListOpen(p => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-white hover:bg-[#243352] transition-colors"
        >
          <span>{filtered.length} contacts match · {selectedCount} selected</span>
          <div className="flex items-center gap-3">
            <button
              onClick={e => { e.stopPropagation(); selectAll() }}
              className="text-xs text-[#C5963A] hover:text-white transition-colors"
            >
              Select All
            </button>
            <button
              onClick={e => { e.stopPropagation(); clearAll() }}
              className="text-xs text-[#94A3B8] hover:text-white transition-colors"
            >
              Clear
            </button>
            {listOpen ? <ChevronUp size={14} className="text-[#94A3B8]" /> : <ChevronDown size={14} className="text-[#94A3B8]" />}
          </div>
        </button>

        {listOpen && (
          <div className="border-t border-[#2D3F5E] max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#94A3B8]">
                No contacts match the current filters.
              </div>
            ) : (
              filtered.map(contact => (
                <label
                  key={contact.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-[#2D3F5E] last:border-0 ${
                    selectedIds.has(contact.id) ? 'bg-[#243352]' : 'hover:bg-[#1B2A4A]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => toggleContact(contact.id)}
                    className="accent-[#C5963A] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {contact.first_name} {contact.last_name}
                      </span>
                      {contact.is_buyer && (
                        <span className="px-1.5 py-0 text-[10px] bg-teal-900/50 text-teal-300 border border-teal-700 rounded">B</span>
                      )}
                      {contact.is_seller && (
                        <span className="px-1.5 py-0 text-[10px] bg-amber-900/50 text-amber-300 border border-amber-700 rounded">S</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#94A3B8] truncate">{contact.company ?? contact.email ?? ''}</span>
                      {contact.city && (
                        <span className="text-xs text-[#475569]">· {contact.city}, {contact.zip}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 flex-shrink-0 max-w-[120px]">
                    {contact.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className={`px-1.5 py-0 text-[9px] border rounded ${tagColors[tag] ?? 'bg-[#0F172A] text-[#94A3B8] border-[#2D3F5E]'}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {contact.tags.length > 2 && (
                      <span className="text-[9px] text-[#475569]">+{contact.tags.length - 2}</span>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#C5963A]/10 border border-[#C5963A]/30 rounded">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-[#C5963A]" />
            <span className="text-sm font-semibold text-white">
              {selectedCount} {mode === 'mail' ? 'recipients' : 'contacts'} selected
            </span>
          </div>
          <span className="text-xs text-[#94A3B8]">
            {mode === 'mail'
              ? `Est. postage: $${(selectedCount * 0.68).toFixed(2)}`
              : `Est. send: ${selectedCount} emails`}
          </span>
        </div>
      )}
    </div>
  )
}
