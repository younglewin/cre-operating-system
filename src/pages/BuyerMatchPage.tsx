import { useState, useEffect, useMemo } from 'react'
import {
  Target, Users, Building2, DollarSign, TrendingUp, MapPin, Star,
  CheckCircle, XCircle, AlertCircle, ChevronRight, RefreshCw, Filter,
  Mail, Phone, Zap, Plus, Search
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Contact, Property, BuyerMatch } from '../types'

// ─── Scoring Engine ───────────────────────────────────────────────────────────
function scoreContact(contact: Contact, property: Property): BuyerMatch {
  const ic = contact.investment_criteria
  const reasons: string[] = []
  const mismatches: string[] = []
  let score = 0

  if (!ic) {
    return { contact, score: 10, match_reasons: ['No criteria on file'], mismatches: ['Investment criteria not set'] }
  }

  // Asset type match (20 pts)
  if (ic.asset_types && ic.asset_types.length > 0) {
    const propType = property.property_type ?? 'Multifamily'
    if (ic.asset_types.some(t => t === propType || (t === 'Multifamily' && propType === 'Multifamily'))) {
      score += 20
      reasons.push(`Asset type match: ${propType}`)
    } else {
      mismatches.push(`Asset type mismatch: wants ${ic.asset_types.join('/')}, property is ${propType}`)
    }
  } else {
    score += 10 // no preference = partial match
  }

  // Price range (25 pts)
  const price = property.price ?? 0
  if (price > 0) {
    const minOk = !ic.min_price || price >= ic.min_price
    const maxOk = !ic.max_price || price <= ic.max_price
    if (minOk && maxOk) {
      score += 25
      reasons.push(`Price in range: $${(price / 1_000_000).toFixed(2)}M`)
    } else if (!minOk) {
      mismatches.push(`Below min price: $${(ic.min_price! / 1_000_000).toFixed(2)}M`)
    } else {
      mismatches.push(`Above max price: $${(ic.max_price! / 1_000_000).toFixed(2)}M`)
    }
  }

  // Unit count (20 pts)
  const units = property.num_units ?? 0
  if (units > 0) {
    const minOk = !ic.min_units || units >= ic.min_units
    const maxOk = !ic.max_units || units <= ic.max_units
    if (minOk && maxOk) {
      score += 20
      reasons.push(`Unit count in range: ${units} units`)
    } else {
      mismatches.push(`Unit count out of range: ${units} units (wants ${ic.min_units ?? 0}–${ic.max_units ?? '∞'})`)
    }
  }

  // Cap rate (15 pts)
  const capRate = property.cap_rate ?? 0
  if (capRate > 0 && ic.cap_rate_min) {
    if (capRate >= ic.cap_rate_min) {
      score += 15
      reasons.push(`Cap rate meets minimum: ${capRate.toFixed(2)}% ≥ ${ic.cap_rate_min}%`)
    } else {
      mismatches.push(`Cap rate below minimum: ${capRate.toFixed(2)}% < ${ic.cap_rate_min}%`)
    }
  } else if (capRate > 0) {
    score += 8 // no cap rate preference
  }

  // Geographic match (20 pts)
  const propCity = property.city ?? ''
  const propZip = property.zip_code ?? ''
  const cityMatch = ic.target_cities && ic.target_cities.some(c => propCity.toLowerCase().includes(c.toLowerCase()))
  const zipMatch = ic.target_zips && ic.target_zips.includes(propZip)
  if (cityMatch || zipMatch) {
    score += 20
    reasons.push(`Geographic match: ${propCity}${zipMatch ? ` (${propZip})` : ''}`)
  } else if (ic.target_cities && ic.target_cities.length > 0) {
    mismatches.push(`Outside target area: ${ic.target_cities.join(', ')}`)
  } else {
    score += 10 // no geo preference
  }

  // Contact type / lead status bonus
  if (contact.contact_type === 'Buyer' || contact.is_buyer) {
    score = Math.min(score + 5, 100)
    reasons.push('Active buyer')
  }
  if (contact.lead_status === 'Active' || contact.lead_status === 'Qualified') {
    score = Math.min(score + 5, 100)
    reasons.push(`Lead status: ${contact.lead_status}`)
  }
  if (contact.last_skip_traced_at) {
    reasons.push('Skip traced — verified contact info')
  }

  return {
    contact,
    score: Math.min(Math.round(score), 100),
    match_reasons: reasons,
    mismatches,
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#C5963A'
  if (score >= 40) return '#3B9CB5'
  return 'rgba(248,250,252,0.3)'
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Strong Match'
  if (score >= 60) return 'Good Match'
  if (score >= 40) return 'Partial Match'
  return 'Weak Match'
}

function getPrimaryPhone(c: Contact): string {
  if (c.phones && c.phones.length > 0) return c.phones[0].number
  return c.phone ?? '—'
}

function getPrimaryEmail(c: Contact): string {
  if (c.emails && c.emails.length > 0) return c.emails[0].address
  return c.email ?? '—'
}

function getInitials(c: Contact) {
  return `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase()
}

function fmt$(n?: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({ match, rank }: { match: BuyerMatch; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const { contact, score, match_reasons, mismatches } = match
  const ic = contact.investment_criteria

  return (
    <div
      className="border transition-all"
      style={{
        backgroundColor: 'rgba(27,42,74,0.5)',
        borderColor: score >= 80 ? 'rgba(34,197,94,0.25)' : score >= 60 ? 'rgba(197,150,58,0.25)' : 'rgba(248,250,252,0.08)',
      }}
    >
      {/* Header Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <div className="w-6 text-center text-xs font-bold flex-shrink-0" style={{ color: 'rgba(248,250,252,0.3)' }}>
          #{rank}
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A' }}>
          {getInitials(contact)}
        </div>

        {/* Name / Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>{contact.first_name} {contact.last_name}</span>
            {contact.last_skip_traced_at && <Zap size={11} style={{ color: '#a855f7' }} />}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>
              {contact.contact_type ?? 'Buyer'}
            </span>
            {ic?.min_price && (
              <span className="text-xs" style={{ color: 'rgba(248,250,252,0.35)' }}>
                {fmt$(ic.min_price)} – {fmt$(ic.max_price)}
              </span>
            )}
            {ic?.target_cities && ic.target_cities.length > 0 && (
              <span className="text-xs" style={{ color: 'rgba(248,250,252,0.35)' }}>
                {ic.target_cities.slice(0, 2).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="text-xl font-bold" style={{ color: getScoreColor(score) }}>{score}</div>
          <div className="text-xs" style={{ color: getScoreColor(score), fontSize: '9px', fontWeight: 600 }}>{getScoreLabel(score)}</div>
        </div>

        {/* Score Bar */}
        <div className="w-24 flex-shrink-0">
          <div className="h-1.5 w-full" style={{ backgroundColor: 'rgba(248,250,252,0.08)' }}>
            <div className="h-full transition-all" style={{ width: `${score}%`, backgroundColor: getScoreColor(score) }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {getPrimaryPhone(contact) !== '—' && (
            <a href={`tel:${getPrimaryPhone(contact)}`} onClick={e => e.stopPropagation()}
              className="p-1.5 transition-colors" style={{ color: 'rgba(248,250,252,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#C5963A')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,250,252,0.3)')}>
              <Phone size={13} />
            </a>
          )}
          {getPrimaryEmail(contact) !== '—' && (
            <a href={`mailto:${getPrimaryEmail(contact)}`} onClick={e => e.stopPropagation()}
              className="p-1.5 transition-colors" style={{ color: 'rgba(248,250,252,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#3B9CB5')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,250,252,0.3)')}>
              <Mail size={13} />
            </a>
          )}
          <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} style={{ color: 'rgba(248,250,252,0.2)' }} />
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
          <div className="grid grid-cols-2 gap-4 mt-3">
            {/* Match Reasons */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Match Reasons</div>
              {match_reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1">
                  <CheckCircle size={11} style={{ color: '#22c55e', marginTop: 1, flexShrink: 0 }} />
                  <span className="text-xs" style={{ color: 'rgba(248,250,252,0.7)' }}>{r}</span>
                </div>
              ))}
            </div>
            {/* Mismatches */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Mismatches</div>
              {mismatches.length === 0 ? (
                <div className="text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>No mismatches</div>
              ) : mismatches.map((m, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1">
                  <XCircle size={11} style={{ color: '#ef4444', marginTop: 1, flexShrink: 0 }} />
                  <span className="text-xs" style={{ color: 'rgba(248,250,252,0.6)' }}>{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Investment Criteria Summary */}
          {ic && (
            <div className="mt-3 p-3" style={{ backgroundColor: 'rgba(197,150,58,0.05)', border: '1px solid rgba(197,150,58,0.15)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: '#C5963A', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Investment Criteria</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {ic.asset_types && <div><span style={{ color: 'rgba(248,250,252,0.4)' }}>Types: </span><span style={{ color: '#F8FAFC' }}>{ic.asset_types.join(', ')}</span></div>}
                {ic.min_price && <div><span style={{ color: 'rgba(248,250,252,0.4)' }}>Price: </span><span style={{ color: '#F8FAFC' }}>{fmt$(ic.min_price)}–{fmt$(ic.max_price)}</span></div>}
                {ic.min_units && <div><span style={{ color: 'rgba(248,250,252,0.4)' }}>Units: </span><span style={{ color: '#F8FAFC' }}>{ic.min_units}–{ic.max_units}</span></div>}
                {ic.cap_rate_min && <div><span style={{ color: 'rgba(248,250,252,0.4)' }}>Min Cap: </span><span style={{ color: '#F8FAFC' }}>{ic.cap_rate_min}%</span></div>}
                {ic.target_cities && <div className="col-span-2"><span style={{ color: 'rgba(248,250,252,0.4)' }}>Cities: </span><span style={{ color: '#F8FAFC' }}>{ic.target_cities.join(', ')}</span></div>}
              </div>
              {ic.notes && <div className="mt-2 text-xs" style={{ color: 'rgba(248,250,252,0.5)' }}>{ic.notes}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BuyerMatchPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [minScore, setMinScore] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [contactsRes, propsRes] = await Promise.all([
      supabase.from('contacts').select('*').order('first_name'),
      supabase.from('properties').select('id, name, address, city, zip_code, property_type, price, cap_rate, grm, num_units, price_per_unit, price_per_sf').order('name'),
    ])
    const contactList = (contactsRes.data ?? []) as Contact[]
    const propList = (propsRes.data ?? []) as Property[]
    setContacts(contactList)
    setProperties(propList)
    if (propList.length > 0) setSelectedPropertyId(propList[0].id)
    setLoading(false)
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  const matches = useMemo(() => {
    if (!selectedProperty) return []
    return contacts
      .filter(c => c.contact_type === 'Buyer' || c.contact_type === 'Investor' || c.is_buyer)
      .map(c => scoreContact(c, selectedProperty))
      .sort((a, b) => b.score - a.score)
  }, [contacts, selectedProperty])

  const filtered = matches.filter(m => {
    const name = `${m.contact.first_name} ${m.contact.last_name}`.toLowerCase()
    return m.score >= minScore && (!search || name.includes(search.toLowerCase()))
  })

  const strongMatches = matches.filter(m => m.score >= 80).length
  const goodMatches = matches.filter(m => m.score >= 60 && m.score < 80).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: '#0F172A' }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: '#C5963A' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#F8FAFC' }}>Buyer Match</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.4)' }}>CRM · AI-Scored Buyer Matching</p>
        </div>
      </div>

      {/* Property Selector */}
      <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs mb-1.5" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Match Buyers Against Property</label>
            <select
              className="w-full px-3 py-2 text-sm border-none outline-none"
              style={{ backgroundColor: 'rgba(27,42,74,0.8)', color: '#F8FAFC', border: '1px solid rgba(197,150,58,0.3)' }}
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
            >
              {properties.map(p => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
            </select>
          </div>
          {selectedProperty && (
            <div className="flex gap-3">
              {[
                { label: 'Price', value: fmt$(selectedProperty.price), color: '#C5963A' },
                { label: 'Cap Rate', value: selectedProperty.cap_rate ? `${selectedProperty.cap_rate.toFixed(2)}%` : '—', color: '#3B9CB5' },
                { label: 'Units', value: selectedProperty.num_units?.toString() ?? '—', color: '#F8FAFC' },
                { label: 'City', value: selectedProperty.city ?? '—', color: 'rgba(248,250,252,0.6)' },
              ].map(m => (
                <div key={m.label} className="text-center px-3 py-2" style={{ backgroundColor: 'rgba(27,42,74,0.5)', border: '1px solid rgba(248,250,252,0.06)' }}>
                  <div className="text-sm font-bold" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-xs" style={{ color: 'rgba(248,250,252,0.3)', fontSize: '9px' }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-px border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        {[
          { label: 'Total Buyers', value: matches.length, color: '#F8FAFC' },
          { label: 'Strong Match (80+)', value: strongMatches, color: '#22c55e' },
          { label: 'Good Match (60+)', value: goodMatches, color: '#C5963A' },
          { label: 'Avg Score', value: matches.length ? Math.round(matches.reduce((s, m) => s + m.score, 0) / matches.length) : 0, color: '#3B9CB5' },
        ].map(s => (
          <div key={s.label} className="flex-1 px-4 py-3" style={{ backgroundColor: 'rgba(27,42,74,0.4)' }}>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(248,250,252,0.3)' }} />
          <input
            className="pl-7 pr-3 py-1.5 text-xs border-none outline-none"
            style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: '#F8FAFC', width: '200px' }}
            placeholder="Search buyers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>Min Score:</span>
          {[0, 40, 60, 80].map(s => (
            <button
              key={s}
              onClick={() => setMinScore(s)}
              className="px-2.5 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: minScore === s ? 'rgba(197,150,58,0.15)' : 'rgba(248,250,252,0.05)',
                color: minScore === s ? '#C5963A' : 'rgba(248,250,252,0.4)',
                border: `1px solid ${minScore === s ? 'rgba(197,150,58,0.3)' : 'rgba(248,250,252,0.08)'}`,
              }}
            >
              {s === 0 ? 'All' : `${s}+`}
            </button>
          ))}
        </div>
        <div className="text-xs ml-auto" style={{ color: 'rgba(248,250,252,0.3)' }}>
          {filtered.length} buyers
        </div>
      </div>

      {/* Match List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Target size={24} style={{ color: 'rgba(248,250,252,0.15)' }} />
            <div className="text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>No buyers match this criteria</div>
          </div>
        ) : (
          filtered.map((match, i) => (
            <MatchCard key={match.contact.id} match={match} rank={i + 1} />
          ))
        )}
      </div>
    </div>
  )
}
