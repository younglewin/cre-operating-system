import { useState, useEffect, useRef } from 'react'
import {
  Plus, X, DollarSign, Building2, User, Calendar, ChevronRight,
  TrendingUp, Target, Edit2, Trash2, RefreshCw, MoreHorizontal,
  ArrowRight, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Deal, DealStage, Contact, Property } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES: DealStage[] = [
  'Prospecting',
  'Outreach',
  'Meeting Scheduled',
  'LOI / Offer',
  'Under Contract',
  'Due Diligence',
  'Closed Won',
  'Closed Lost',
]

const STAGE_COLORS: Record<DealStage, string> = {
  'Prospecting':        '#3B9CB5',
  'Outreach':           '#C5963A',
  'Meeting Scheduled':  '#a855f7',
  'LOI / Offer':        '#f59e0b',
  'Under Contract':     '#3b82f6',
  'Due Diligence':      '#6366f1',
  'Closed Won':         '#22c55e',
  'Closed Lost':        '#ef4444',
}

const STAGE_BG: Record<DealStage, string> = {
  'Prospecting':        'rgba(59,156,181,0.12)',
  'Outreach':           'rgba(197,150,58,0.12)',
  'Meeting Scheduled':  'rgba(168,85,247,0.12)',
  'LOI / Offer':        'rgba(245,158,11,0.12)',
  'Under Contract':     'rgba(59,130,246,0.12)',
  'Due Diligence':      'rgba(99,102,241,0.12)',
  'Closed Won':         'rgba(34,197,94,0.12)',
  'Closed Lost':        'rgba(239,68,68,0.1)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt$(n?: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}
function fmtComm(deal: Deal) {
  if (deal.commission_est) return fmt$(deal.commission_est)
  if (deal.commission_pct && deal.asking_price) return fmt$(deal.asking_price * deal.commission_pct / 100)
  return '—'
}
function daysUntil(dateStr?: string) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff
}

// ─── Deal Card ────────────────────────────────────────────────────────────────
function DealCard({ deal, onDragStart, onClick }: {
  deal: Deal
  onDragStart: (e: React.DragEvent, deal: Deal) => void
  onClick: (deal: Deal) => void
}) {
  const days = daysUntil(deal.close_date_est)
  const comm = fmtComm(deal)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, deal)}
      onClick={() => onClick(deal)}
      className="cursor-pointer transition-all"
      style={{
        backgroundColor: 'rgba(27,42,74,0.8)',
        border: '1px solid rgba(197,150,58,0.15)',
        padding: '12px',
        marginBottom: '6px',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(197,150,58,0.4)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(197,150,58,0.15)' }}
    >
      {/* Title */}
      <div className="text-xs font-semibold mb-1.5 leading-tight" style={{ color: '#F8FAFC' }}>
        {deal.title}
      </div>

      {/* Price */}
      {deal.asking_price && (
        <div className="flex items-center gap-1 mb-1.5">
          <DollarSign size={10} style={{ color: '#C5963A' }} />
          <span className="text-xs font-bold" style={{ color: '#C5963A' }}>{fmt$(deal.asking_price)}</span>
          {deal.deal_type && (
            <span className="text-xs ml-1" style={{ color: 'rgba(248,250,252,0.3)' }}>· {deal.deal_type}</span>
          )}
        </div>
      )}

      {/* Commission */}
      {comm !== '—' && (
        <div className="flex items-center gap-1 mb-2">
          <TrendingUp size={10} style={{ color: '#22c55e' }} />
          <span className="text-xs" style={{ color: '#22c55e' }}>{comm} est. commission</span>
        </div>
      )}

      {/* Contact */}
      {deal.contact && (
        <div className="flex items-center gap-1 mb-1">
          <User size={10} style={{ color: 'rgba(248,250,252,0.3)' }} />
          <span className="text-xs" style={{ color: 'rgba(248,250,252,0.6)' }}>
            {deal.contact.first_name} {deal.contact.last_name}
          </span>
        </div>
      )}

      {/* Close Date */}
      {deal.close_date_est && (
        <div className="flex items-center gap-1">
          <Calendar size={10} style={{ color: 'rgba(248,250,252,0.3)' }} />
          <span className="text-xs" style={{ color: days !== null && days < 0 ? '#ef4444' : days !== null && days < 14 ? '#f59e0b' : 'rgba(248,250,252,0.4)' }}>
            {days !== null && days < 0 ? `${Math.abs(days)}d overdue` : days !== null ? `${days}d to close` : new Date(deal.close_date_est).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Probability */}
      {deal.probability !== undefined && deal.probability !== null && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs" style={{ color: 'rgba(248,250,252,0.3)', fontSize: '9px' }}>Probability</span>
            <span className="text-xs font-medium" style={{ color: '#3B9CB5', fontSize: '9px' }}>{deal.probability}%</span>
          </div>
          <div className="h-0.5 w-full" style={{ backgroundColor: 'rgba(248,250,252,0.08)' }}>
            <div className="h-full" style={{ width: `${deal.probability}%`, backgroundColor: '#3B9CB5' }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add Deal Modal ───────────────────────────────────────────────────────────
function AddDealModal({ onClose, onAdd, contacts, properties }: {
  onClose: () => void
  onAdd: (d: Deal) => void
  contacts: Contact[]
  properties: Property[]
}) {
  const [form, setForm] = useState({
    title: '',
    stage: 'Prospecting' as DealStage,
    deal_type: 'Sale' as Deal['deal_type'],
    asking_price: '',
    commission_pct: '2.5',
    probability: '25',
    close_date_est: '',
    contact_id: '',
    property_id: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.title) return
    setSaving(true)
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const askingPrice = form.asking_price ? parseFloat(form.asking_price.replace(/[^0-9.]/g, '')) : null
    const commPct = form.commission_pct ? parseFloat(form.commission_pct) : null
    const commEst = askingPrice && commPct ? askingPrice * commPct / 100 : null
    const { data } = await supabase.from('deals').insert({
      team_id: teamData?.id,
      title: form.title,
      stage: form.stage,
      deal_type: form.deal_type,
      asking_price: askingPrice,
      commission_pct: commPct,
      commission_est: commEst,
      probability: form.probability ? parseInt(form.probability) : null,
      close_date_est: form.close_date_est || null,
      contact_id: form.contact_id || null,
      property_id: form.property_id || null,
      notes: form.notes || null,
    }).select().single()
    setSaving(false)
    if (data) { onAdd(data as Deal); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-[520px] border" style={{ backgroundColor: '#1B2A4A', borderColor: 'rgba(197,150,58,0.3)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <span className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>New Deal</span>
          <button onClick={onClose}><X size={16} style={{ color: 'rgba(248,250,252,0.4)' }} /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* Title */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deal Title *</label>
            <input className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
              placeholder="e.g. 4-plex Naples Island — Seller Rep" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          {/* Stage / Type */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage</label>
              <select className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as DealStage }))}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</label>
              <select className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                value={form.deal_type} onChange={e => setForm(f => ({ ...f, deal_type: e.target.value as Deal['deal_type'] }))}>
                {['Sale', 'Lease', 'Development', 'Management'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {/* Price / Commission */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Asking Price</label>
              <input className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                placeholder="2,500,000" value={form.asking_price} onChange={e => setForm(f => ({ ...f, asking_price: e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Commission %</label>
              <input className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                placeholder="2.5" value={form.commission_pct} onChange={e => setForm(f => ({ ...f, commission_pct: e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Probability %</label>
              <input className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                placeholder="25" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} />
            </div>
          </div>
          {/* Close Date */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Est. Close Date</label>
            <input type="date" className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
              value={form.close_date_est} onChange={e => setForm(f => ({ ...f, close_date_est: e.target.value }))} />
          </div>
          {/* Contact / Property */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact</label>
              <select className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}>
                <option value="">— Select Contact —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Property</label>
              <select className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                <option value="">— Select Property —</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</label>
            <textarea rows={2} className="w-full px-2 py-1.5 text-xs border-none outline-none resize-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
              placeholder="Deal notes, context..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={save} disabled={saving || !form.title}
            className="w-full py-2.5 text-xs font-semibold tracking-wider uppercase"
            style={{ backgroundColor: form.title ? '#C5963A' : 'rgba(197,150,58,0.3)', color: '#0F172A' }}>
            {saving ? 'Creating...' : 'Create Deal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Deal Detail Drawer ───────────────────────────────────────────────────────
function DealDrawer({ deal, onClose, onUpdate, onDelete }: {
  deal: Deal
  onClose: () => void
  onUpdate: (d: Deal) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Deal>>(deal)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { data } = await supabase.from('deals').update({
      title: form.title,
      stage: form.stage,
      asking_price: form.asking_price,
      commission_pct: form.commission_pct,
      probability: form.probability,
      close_date_est: form.close_date_est,
      notes: form.notes,
    }).eq('id', deal.id).select().single()
    setSaving(false)
    if (data) { onUpdate(data as Deal); setEditing(false) }
  }

  const deleteDeal = async () => {
    if (!confirm('Delete this deal?')) return
    await supabase.from('deals').delete().eq('id', deal.id)
    onDelete(deal.id)
    onClose()
  }

  const moveStage = async (stage: DealStage) => {
    const { data } = await supabase.from('deals').update({ stage }).eq('id', deal.id).select().single()
    if (data) onUpdate(data as Deal)
  }

  const comm = fmtComm(deal)
  const days = daysUntil(deal.close_date_est)

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-40 overflow-y-auto" style={{ width: '420px', backgroundColor: '#1B2A4A', borderLeft: '1px solid rgba(197,150,58,0.25)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>{deal.title}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 font-medium" style={{ backgroundColor: STAGE_BG[deal.stage], color: STAGE_COLORS[deal.stage] }}>
                {deal.stage}
              </span>
              <span className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{deal.deal_type}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="p-1.5" style={{ color: 'rgba(248,250,252,0.4)' }}><Edit2 size={14} /></button>
            ) : (
              <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#C5963A', color: '#0F172A' }}>
                {saving ? '...' : 'Save'}
              </button>
            )}
            <button onClick={deleteDeal} className="p-1.5" style={{ color: 'rgba(239,68,68,0.5)' }}><Trash2 size={14} /></button>
            <button onClick={onClose} className="p-1.5" style={{ color: 'rgba(248,250,252,0.4)' }}><X size={14} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3" style={{ backgroundColor: 'rgba(197,150,58,0.08)', border: '1px solid rgba(197,150,58,0.2)' }}>
              <div className="text-xs font-bold" style={{ color: '#C5963A' }}>{fmt$(deal.asking_price)}</div>
              <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px' }}>Asking Price</div>
            </div>
            <div className="p-3" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="text-xs font-bold" style={{ color: '#22c55e' }}>{comm}</div>
              <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px' }}>Est. Commission</div>
            </div>
            <div className="p-3" style={{ backgroundColor: 'rgba(59,156,181,0.08)', border: '1px solid rgba(59,156,181,0.2)' }}>
              <div className="text-xs font-bold" style={{ color: '#3B9CB5' }}>{deal.probability ?? '—'}%</div>
              <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px' }}>Probability</div>
            </div>
          </div>

          {/* Stage Pipeline */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Move Stage</div>
            <div className="flex flex-wrap gap-1">
              {STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => moveStage(s)}
                  className="text-xs px-2 py-1 transition-all"
                  style={{
                    backgroundColor: deal.stage === s ? STAGE_BG[s] : 'rgba(248,250,252,0.05)',
                    color: deal.stage === s ? STAGE_COLORS[s] : 'rgba(248,250,252,0.4)',
                    border: `1px solid ${deal.stage === s ? STAGE_COLORS[s] + '60' : 'rgba(248,250,252,0.08)'}`,
                    fontWeight: deal.stage === s ? 600 : 400,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Close Date */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Close Date</div>
            {editing ? (
              <input type="date" className="px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                value={form.close_date_est?.split('T')[0] ?? ''} onChange={e => setForm(f => ({ ...f, close_date_est: e.target.value }))} />
            ) : (
              <div className="flex items-center gap-2">
                <Calendar size={12} style={{ color: 'rgba(248,250,252,0.3)' }} />
                <span className="text-xs" style={{ color: days !== null && days < 0 ? '#ef4444' : days !== null && days < 14 ? '#f59e0b' : 'rgba(248,250,252,0.7)' }}>
                  {deal.close_date_est ? new Date(deal.close_date_est).toLocaleDateString() : '—'}
                  {days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`})`}
                </span>
              </div>
            )}
          </div>

          {/* Contact */}
          {deal.contact && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Contact</div>
              <div className="flex items-center gap-2 p-3" style={{ backgroundColor: 'rgba(27,42,74,0.6)', border: '1px solid rgba(248,250,252,0.06)' }}>
                <div className="w-7 h-7 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A' }}>
                  {deal.contact.first_name[0]}{deal.contact.last_name[0]}
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: '#F8FAFC' }}>{deal.contact.first_name} {deal.contact.last_name}</div>
                  <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{deal.contact.contact_type ?? 'Contact'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Notes</div>
            {editing ? (
              <textarea rows={4} className="w-full px-2 py-1.5 text-xs border-none outline-none resize-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            ) : (
              <p className="text-xs" style={{ color: 'rgba(248,250,252,0.6)' }}>{deal.notes ?? 'No notes'}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [dragOver, setDragOver] = useState<DealStage | null>(null)
  const dragDeal = useRef<Deal | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    const [dealsRes, contactsRes, propsRes] = await Promise.all([
      supabase.from('deals').select('*, contact:contacts(*)').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, first_name, last_name, contact_type').order('first_name'),
      supabase.from('properties').select('id, name').order('name'),
    ])
    // Seed demo deals if empty
    const rawDeals = (dealsRes.data ?? []) as Deal[]
    if (rawDeals.length === 0) {
      await seedDemoDeals()
      const { data } = await supabase.from('deals').select('*, contact:contacts(*)').order('created_at', { ascending: false })
      setDeals((data ?? []) as Deal[])
    } else {
      setDeals(rawDeals)
    }
    setContacts((contactsRes.data ?? []) as Contact[])
    setProperties((propsRes.data ?? []) as Property[])
    setLoading(false)
  }

  const seedDemoDeals = async () => {
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const { data: contactsData } = await supabase.from('contacts').select('id').limit(8)
    const cids = (contactsData ?? []).map((c: { id: string }) => c.id)
    const demos = [
      { title: '4-Plex Naples Island — Seller Rep', stage: 'LOI / Offer', deal_type: 'Sale', asking_price: 2850000, commission_pct: 2.5, probability: 65, close_date_est: '2026-04-15', contact_id: cids[0] ?? null },
      { title: '6-Unit Long Beach — Buyer Rep', stage: 'Under Contract', deal_type: 'Sale', asking_price: 3200000, commission_pct: 2.5, probability: 85, close_date_est: '2026-03-28', contact_id: cids[1] ?? null },
      { title: 'SB9 Duplex Signal Hill', stage: 'Meeting Scheduled', deal_type: 'Development', asking_price: 1800000, commission_pct: 3.0, probability: 40, close_date_est: '2026-05-30', contact_id: cids[2] ?? null },
      { title: '12-Unit Belmont Shore', stage: 'Outreach', deal_type: 'Sale', asking_price: 5400000, commission_pct: 2.0, probability: 20, close_date_est: '2026-06-30', contact_id: cids[3] ?? null },
      { title: 'ADU Portfolio — Property Mgmt', stage: 'Prospecting', deal_type: 'Management', asking_price: null, commission_pct: 8.0, probability: 15, close_date_est: null, contact_id: cids[4] ?? null },
      { title: '8-Unit 1031 Exchange — Buyer', stage: 'Due Diligence', deal_type: 'Sale', asking_price: 4100000, commission_pct: 2.5, probability: 90, close_date_est: '2026-03-20', contact_id: cids[5] ?? null },
      { title: '20-Unit Lakewood — Closed', stage: 'Closed Won', deal_type: 'Sale', asking_price: 6800000, commission_pct: 2.0, probability: 100, close_date_est: '2026-02-14', contact_id: cids[6] ?? null },
    ]
    for (const d of demos) {
      const commEst = d.asking_price && d.commission_pct ? d.asking_price * d.commission_pct / 100 : null
      await supabase.from('deals').insert({ ...d, team_id: teamData?.id, commission_est: commEst })
    }
  }

  const dealsByStage = (stage: DealStage) => deals.filter(d => d.stage === stage)

  const totalPipelineValue = deals
    .filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.asking_price ?? 0), 0)
  const totalCommission = deals
    .filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.commission_est ?? (d.asking_price && d.commission_pct ? d.asking_price * d.commission_pct / 100 : 0)), 0)
  const closedValue = deals.filter(d => d.stage === 'Closed Won').reduce((sum, d) => sum + (d.commission_est ?? 0), 0)

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    dragDeal.current = deal
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault()
    setDragOver(null)
    if (!dragDeal.current || dragDeal.current.stage === stage) return
    const updated = { ...dragDeal.current, stage }
    setDeals(ds => ds.map(d => d.id === updated.id ? updated : d))
    await supabase.from('deals').update({ stage }).eq('id', updated.id)
    if (selectedDeal?.id === updated.id) setSelectedDeal(updated)
    dragDeal.current = null
  }

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
          <h1 className="text-base font-semibold" style={{ color: '#F8FAFC' }}>Deal Pipeline</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.4)' }}>CRM · Active Deals &amp; Transactions</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#C5963A', color: '#0F172A' }}>
          <Plus size={12} /> New Deal
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-px border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        {[
          { label: 'Total Deals', value: deals.length.toString(), color: '#F8FAFC' },
          { label: 'Pipeline Value', value: fmt$(totalPipelineValue), color: '#C5963A' },
          { label: 'Est. Commission', value: fmt$(totalCommission), color: '#22c55e' },
          { label: 'Closed (YTD)', value: fmt$(closedValue), color: '#3B9CB5' },
          { label: 'Avg Probability', value: `${Math.round(deals.filter(d => d.probability).reduce((s, d) => s + (d.probability ?? 0), 0) / Math.max(deals.filter(d => d.probability).length, 1))}%`, color: '#a855f7' },
        ].map(s => (
          <div key={s.label} className="flex-1 px-4 py-3" style={{ backgroundColor: 'rgba(27,42,74,0.4)' }}>
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-px" style={{ minWidth: `${STAGES.length * 220}px` }}>
          {STAGES.map(stage => {
            const stageDeals = dealsByStage(stage)
            const stageValue = stageDeals.reduce((s, d) => s + (d.asking_price ?? 0), 0)
            const isOver = dragOver === stage

            return (
              <div
                key={stage}
                className="flex flex-col flex-shrink-0"
                style={{ width: '220px', backgroundColor: isOver ? 'rgba(197,150,58,0.05)' : 'transparent', transition: 'background-color 0.15s' }}
                onDragOver={e => { e.preventDefault(); setDragOver(stage) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, stage)}
              >
                {/* Column Header */}
                <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `2px solid ${STAGE_COLORS[stage]}40` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                      <span className="text-xs font-semibold" style={{ color: '#F8FAFC', fontSize: '10px' }}>{stage}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: STAGE_COLORS[stage], fontSize: '10px' }}>
                      {stageDeals.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>
                      {fmt$(stageValue)}
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2">
                  {stageDeals.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onDragStart={handleDragStart}
                      onClick={d => setSelectedDeal(d)}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-xs" style={{ color: 'rgba(248,250,252,0.15)', border: '1px dashed rgba(248,250,252,0.08)' }}>
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deal Drawer */}
      {selectedDeal && (
        <DealDrawer
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={d => { setDeals(ds => ds.map(x => x.id === d.id ? d : x)); setSelectedDeal(d) }}
          onDelete={id => setDeals(ds => ds.filter(d => d.id !== id))}
        />
      )}

      {/* Add Deal Modal */}
      {showAdd && (
        <AddDealModal
          onClose={() => setShowAdd(false)}
          onAdd={d => setDeals(ds => [d, ...ds])}
          contacts={contacts}
          properties={properties}
        />
      )}
    </div>
  )
}
