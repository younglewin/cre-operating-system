import { useState, useEffect, useMemo } from 'react'
import {
  Users, Search, Plus, Filter, Phone, Mail, MapPin, Tag, ChevronRight,
  X, Edit2, Save, Zap, CheckCircle, AlertCircle, Clock, Star,
  Building2, DollarSign, TrendingUp, Download, Upload, MoreHorizontal,
  PhoneCall, MessageSquare, AtSign, Trash2, RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Contact, PhoneEntry, EmailEntry, InvestmentCriteria, ContactType, LeadStatus } from '../types'

// ─── Constants ───────────────────────────────────────────────────────────────
const CONTACT_TYPES: ContactType[] = ['Buyer', 'Seller', 'Investor', 'Broker', 'Lender', 'Vendor', 'Other']
const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Active', 'Under Contract', 'Closed', 'Dead']
const STATUS_COLORS: Record<LeadStatus, string> = {
  'New':              'rgba(59,156,181,0.15)',
  'Contacted':        'rgba(197,150,58,0.15)',
  'Qualified':        'rgba(59,156,181,0.25)',
  'Active':           'rgba(34,197,94,0.15)',
  'Under Contract':   'rgba(168,85,247,0.15)',
  'Closed':           'rgba(34,197,94,0.25)',
  'Dead':             'rgba(239,68,68,0.12)',
}
const STATUS_TEXT: Record<LeadStatus, string> = {
  'New':              '#3B9CB5',
  'Contacted':        '#C5963A',
  'Qualified':        '#3B9CB5',
  'Active':           '#22c55e',
  'Under Contract':   '#a855f7',
  'Closed':           '#22c55e',
  'Dead':             '#ef4444',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt$(n?: number) { return n ? `$${n.toLocaleString()}` : '—' }
function getInitials(c: Contact) {
  return `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase()
}
function getPrimaryPhone(c: Contact): string {
  if (c.phones && c.phones.length > 0) return c.phones[0].number
  return c.phone ?? '—'
}
function getPrimaryEmail(c: Contact): string {
  if (c.emails && c.emails.length > 0) return c.emails[0].address
  return c.email ?? '—'
}
function getConfidenceColor(score?: number) {
  if (!score) return '#6b7280'
  if (score >= 0.85) return '#22c55e'
  if (score >= 0.6) return '#C5963A'
  return '#ef4444'
}

// ─── Skip Trace Modal ─────────────────────────────────────────────────────────
function SkipTraceModal({ contact, onClose, onComplete }: {
  contact: Contact
  onClose: () => void
  onComplete: (updated: Contact) => void
}) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ phones: PhoneEntry[]; emails: EmailEntry[] } | null>(null)

  const runSkipTrace = async () => {
    setStatus('running')
    // Simulate skip trace (in production: call BatchSkipTracing / Spokeo API)
    await new Promise(r => setTimeout(r, 2200))
    const mockPhones: PhoneEntry[] = [
      { number: `(${Math.floor(Math.random()*900+100)}) 555-${Math.floor(Math.random()*9000+1000)}`, label: 'Mobile', line_type: 'Mobile', is_valid: true, confidence_score: 0.91 },
      { number: `(${Math.floor(Math.random()*900+100)}) 555-${Math.floor(Math.random()*9000+1000)}`, label: 'Home', line_type: 'Landline', is_valid: true, confidence_score: 0.74 },
    ]
    const mockEmails: EmailEntry[] = [
      { address: `${contact.first_name.toLowerCase()}.${contact.last_name.toLowerCase()}@gmail.com`, label: 'Personal', is_valid: true },
    ]
    setResult({ phones: mockPhones, emails: mockEmails })
    setStatus('done')
  }

  const applyResults = async () => {
    if (!result) return
    const { data } = await supabase
      .from('contacts')
      .update({
        phones: result.phones,
        emails: result.emails,
        last_skip_traced_at: new Date().toISOString(),
        skip_trace_provider: 'BatchSkipTracing',
        skip_trace_confidence: result.phones[0]?.confidence_score ?? 0.85,
      })
      .eq('id', contact.id)
      .select()
      .single()
    if (data) onComplete(data as Contact)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-[480px] rounded-none border" style={{ backgroundColor: '#1B2A4A', borderColor: 'rgba(197,150,58,0.3)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: '#C5963A' }} />
            <span className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>Skip Trace — {contact.first_name} {contact.last_name}</span>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: 'rgba(248,250,252,0.4)' }} /></button>
        </div>
        <div className="p-5 space-y-4">
          {status === 'idle' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'rgba(248,250,252,0.6)' }}>
                Run a skip trace to find current phone numbers and email addresses for this contact. Results will be merged into their profile.
              </p>
              <div className="p-3 rounded-none border" style={{ backgroundColor: 'rgba(197,150,58,0.05)', borderColor: 'rgba(197,150,58,0.2)' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#C5963A' }}>Contact Info</div>
                <div className="text-xs space-y-1" style={{ color: 'rgba(248,250,252,0.7)' }}>
                  <div>{contact.first_name} {contact.last_name}</div>
                  {contact.mailing_address && <div>{contact.mailing_address}</div>}
                  {contact.city && <div>{contact.city}, {contact.state} {contact.zip}</div>}
                </div>
              </div>
              <button
                onClick={runSkipTrace}
                className="w-full py-2.5 text-xs font-semibold tracking-wider uppercase transition-all"
                style={{ backgroundColor: '#C5963A', color: '#0F172A' }}
              >
                Run Skip Trace
              </button>
            </div>
          )}
          {status === 'running' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <RefreshCw size={24} className="animate-spin" style={{ color: '#C5963A' }} />
              <div className="text-sm" style={{ color: 'rgba(248,250,252,0.6)' }}>Searching public records...</div>
            </div>
          )}
          {status === 'done' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: '#22c55e' }} />
                <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Results Found</span>
              </div>
              {/* Phones */}
              <div>
                <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px' }}>Phone Numbers</div>
                {result.phones.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#F8FAFC' }}>{p.number}</div>
                      <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{p.label} · {p.line_type}</div>
                    </div>
                    <div className="text-xs font-semibold" style={{ color: getConfidenceColor(p.confidence_score) }}>
                      {Math.round((p.confidence_score ?? 0) * 100)}% conf.
                    </div>
                  </div>
                ))}
              </div>
              {/* Emails */}
              <div>
                <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px' }}>Email Addresses</div>
                {result.emails.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#F8FAFC' }}>{e.address}</div>
                      <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{e.label}</div>
                    </div>
                    <CheckCircle size={12} style={{ color: '#22c55e' }} />
                  </div>
                ))}
              </div>
              <button
                onClick={applyResults}
                className="w-full py-2.5 text-xs font-semibold tracking-wider uppercase"
                style={{ backgroundColor: '#C5963A', color: '#0F172A' }}
              >
                Apply to Contact Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Contact Detail Drawer ────────────────────────────────────────────────────
function ContactDrawer({ contact, onClose, onUpdate }: {
  contact: Contact
  onClose: () => void
  onUpdate: (c: Contact) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Contact>>(contact)
  const [showSkipTrace, setShowSkipTrace] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { data } = await supabase
      .from('contacts')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        company: form.company,
        contact_type: form.contact_type,
        lead_status: form.lead_status,
        mailing_address: form.mailing_address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        notes: form.notes,
        do_not_call: form.do_not_call,
        do_not_email: form.do_not_email,
      })
      .eq('id', contact.id)
      .select()
      .single()
    setSaving(false)
    if (data) { onUpdate(data as Contact); setEditing(false) }
  }

  const ic = contact.investment_criteria
  const phones = contact.phones ?? (contact.phone ? [{ number: contact.phone, label: 'Phone', is_valid: true }] : [])
  const emails = contact.emails ?? (contact.email ? [{ address: contact.email, label: 'Email', is_valid: true }] : [])

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-40 overflow-y-auto flex flex-col" style={{ width: '440px', backgroundColor: '#1B2A4A', borderLeft: '1px solid rgba(197,150,58,0.25)' }}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(197,150,58,0.2)', color: '#C5963A' }}>
              {getInitials(contact)}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>{contact.first_name} {contact.last_name}</div>
              <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{contact.company ?? contact.contact_type ?? 'Contact'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="p-1.5 transition-colors" style={{ color: 'rgba(248,250,252,0.4)' }}>
                <Edit2 size={14} />
              </button>
            ) : (
              <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#C5963A', color: '#0F172A' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            <button onClick={onClose} className="p-1.5" style={{ color: 'rgba(248,250,252,0.4)' }}><X size={14} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status Bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
            {editing ? (
              <select
                value={form.lead_status ?? 'New'}
                onChange={e => setForm(f => ({ ...f, lead_status: e.target.value as LeadStatus }))}
                className="text-xs px-2 py-1 border-none outline-none"
                style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
              >
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className="text-xs px-2 py-1 font-medium" style={{
                backgroundColor: STATUS_COLORS[contact.lead_status ?? 'New'],
                color: STATUS_TEXT[contact.lead_status ?? 'New'],
              }}>
                {contact.lead_status ?? 'New'}
              </span>
            )}
            {editing ? (
              <select
                value={form.contact_type ?? 'Buyer'}
                onChange={e => setForm(f => ({ ...f, contact_type: e.target.value as ContactType }))}
                className="text-xs px-2 py-1 border-none outline-none"
                style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
              >
                {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <span className="text-xs px-2 py-1" style={{ backgroundColor: 'rgba(59,156,181,0.15)', color: '#3B9CB5' }}>
                {contact.contact_type ?? 'Buyer'}
              </span>
            )}
            {contact.do_not_call && (
              <span className="text-xs px-2 py-1" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>DNC</span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
            <button
              onClick={() => setShowSkipTrace(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
              style={{ backgroundColor: 'rgba(197,150,58,0.1)', color: '#C5963A', border: '1px solid rgba(197,150,58,0.3)' }}
            >
              <Zap size={11} /> Skip Trace
            </button>
            {phones[0] && (
              <a href={`tel:${phones[0].number}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'rgba(59,156,181,0.1)', color: '#3B9CB5', border: '1px solid rgba(59,156,181,0.3)' }}>
                <PhoneCall size={11} /> Call
              </a>
            )}
            {emails[0] && (
              <a href={`mailto:${emails[0].address}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'rgba(59,156,181,0.1)', color: '#3B9CB5', border: '1px solid rgba(59,156,181,0.3)' }}>
                <AtSign size={11} /> Email
              </a>
            )}
          </div>

          {/* Contact Info */}
          <div className="px-5 py-4 space-y-4">
            {/* Phones */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Phone Numbers</div>
              {phones.length > 0 ? phones.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <Phone size={12} style={{ color: 'rgba(248,250,252,0.3)' }} />
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#F8FAFC' }}>{p.number}</div>
                      <div className="text-xs" style={{ color: 'rgba(248,250,252,0.35)' }}>{p.label}{p.line_type ? ` · ${p.line_type}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.confidence_score && (
                      <span className="text-xs" style={{ color: getConfidenceColor(p.confidence_score) }}>
                        {Math.round(p.confidence_score * 100)}%
                      </span>
                    )}
                    {p.is_valid ? <CheckCircle size={11} style={{ color: '#22c55e' }} /> : <AlertCircle size={11} style={{ color: '#ef4444' }} />}
                  </div>
                </div>
              )) : (
                <div className="text-xs py-2" style={{ color: 'rgba(248,250,252,0.3)' }}>No phones — run skip trace</div>
              )}
            </div>

            {/* Emails */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Email Addresses</div>
              {emails.length > 0 ? emails.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <Mail size={12} style={{ color: 'rgba(248,250,252,0.3)' }} />
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#F8FAFC' }}>{e.address}</div>
                      <div className="text-xs" style={{ color: 'rgba(248,250,252,0.35)' }}>{e.label}</div>
                    </div>
                  </div>
                  {e.is_valid ? <CheckCircle size={11} style={{ color: '#22c55e' }} /> : <AlertCircle size={11} style={{ color: '#ef4444' }} />}
                </div>
              )) : (
                <div className="text-xs py-2" style={{ color: 'rgba(248,250,252,0.3)' }}>No emails on file</div>
              )}
            </div>

            {/* Address */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Mailing Address</div>
              {editing ? (
                <div className="space-y-2">
                  <input className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                    placeholder="Street address" value={form.mailing_address ?? ''} onChange={e => setForm(f => ({ ...f, mailing_address: e.target.value }))} />
                  <div className="flex gap-2">
                    <input className="flex-1 px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                      placeholder="City" value={form.city ?? ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    <input className="w-12 px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                      placeholder="ST" value={form.state ?? ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                    <input className="w-20 px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                      placeholder="ZIP" value={form.zip ?? ''} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <MapPin size={12} style={{ color: 'rgba(248,250,252,0.3)', marginTop: 2 }} />
                  <div className="text-xs" style={{ color: 'rgba(248,250,252,0.7)' }}>
                    {contact.mailing_address ?? contact.address ?? '—'}
                    {contact.city && <div>{contact.city}, {contact.state} {contact.zip}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Tags</div>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5" style={{ backgroundColor: 'rgba(59,156,181,0.12)', color: '#3B9CB5', border: '1px solid rgba(59,156,181,0.25)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Investment Criteria */}
            {ic && (ic.min_price || ic.min_units || ic.target_cities?.length) && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Investment Criteria</div>
                <div className="p-3 space-y-2" style={{ backgroundColor: 'rgba(27,42,74,0.6)', border: '1px solid rgba(197,150,58,0.15)' }}>
                  {ic.asset_types && ic.asset_types.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 size={11} style={{ color: '#C5963A' }} />
                      <span className="text-xs" style={{ color: 'rgba(248,250,252,0.7)' }}>{ic.asset_types.join(', ')}</span>
                    </div>
                  )}
                  {(ic.min_price || ic.max_price) && (
                    <div className="flex items-center gap-2">
                      <DollarSign size={11} style={{ color: '#C5963A' }} />
                      <span className="text-xs" style={{ color: 'rgba(248,250,252,0.7)' }}>
                        {fmt$(ic.min_price)} – {fmt$(ic.max_price)}
                      </span>
                    </div>
                  )}
                  {(ic.min_units || ic.max_units) && (
                    <div className="flex items-center gap-2">
                      <Users size={11} style={{ color: '#C5963A' }} />
                      <span className="text-xs" style={{ color: 'rgba(248,250,252,0.7)' }}>
                        {ic.min_units}–{ic.max_units} units
                      </span>
                    </div>
                  )}
                  {ic.cap_rate_min && (
                    <div className="flex items-center gap-2">
                      <TrendingUp size={11} style={{ color: '#C5963A' }} />
                      <span className="text-xs" style={{ color: 'rgba(248,250,252,0.7)' }}>Min {ic.cap_rate_min}% cap rate</span>
                    </div>
                  )}
                  {ic.target_cities && ic.target_cities.length > 0 && (
                    <div className="flex items-center gap-2">
                      <MapPin size={11} style={{ color: '#C5963A' }} />
                      <span className="text-xs" style={{ color: 'rgba(248,250,252,0.7)' }}>{ic.target_cities.join(', ')}</span>
                    </div>
                  )}
                  {ic.notes && (
                    <div className="text-xs pt-1 border-t" style={{ color: 'rgba(248,250,252,0.5)', borderColor: 'rgba(248,250,252,0.06)' }}>
                      {ic.notes}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px' }}>Notes</div>
              {editing ? (
                <textarea
                  rows={4}
                  className="w-full px-2 py-1.5 text-xs border-none outline-none resize-none"
                  style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                  value={form.notes ?? ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              ) : (
                <p className="text-xs" style={{ color: 'rgba(248,250,252,0.6)' }}>{contact.notes ?? 'No notes'}</p>
              )}
            </div>

            {/* Skip Trace History */}
            {contact.last_skip_traced_at && (
              <div className="p-3" style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={11} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Skip Traced</span>
                </div>
                <div className="text-xs" style={{ color: 'rgba(248,250,252,0.5)' }}>
                  {new Date(contact.last_skip_traced_at).toLocaleDateString()} via {contact.skip_trace_provider}
                  {contact.skip_trace_confidence && ` · ${Math.round(contact.skip_trace_confidence * 100)}% confidence`}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSkipTrace && (
        <SkipTraceModal
          contact={contact}
          onClose={() => setShowSkipTrace(false)}
          onComplete={updated => { onUpdate(updated); setShowSkipTrace(false) }}
        />
      )}
    </>
  )
}

// ─── Add Contact Modal ────────────────────────────────────────────────────────
function AddContactModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Contact) => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', company: '', phone: '', email: '', contact_type: 'Buyer' as ContactType, lead_status: 'New' as LeadStatus, city: '', state: 'CA', zip: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.first_name || !form.last_name) return
    setSaving(true)
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const { data } = await supabase.from('contacts').insert({
      team_id: teamData?.id,
      first_name: form.first_name,
      last_name: form.last_name,
      company: form.company || null,
      phone: form.phone || null,
      email: form.email || null,
      phones: form.phone ? [{ number: form.phone, label: 'Mobile', is_valid: true }] : [],
      emails: form.email ? [{ address: form.email, label: 'Work', is_valid: true }] : [],
      contact_type: form.contact_type,
      lead_status: form.lead_status,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      notes: form.notes || null,
      tags: [],
      is_buyer: form.contact_type === 'Buyer',
      is_seller: form.contact_type === 'Seller',
      is_active: true,
    }).select().single()
    setSaving(false)
    if (data) { onAdd(data as Contact); onClose() }
  }

  const field = (label: string, key: keyof typeof form, placeholder?: string, half?: boolean) => (
    <div className={half ? 'flex-1' : 'w-full'}>
      <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      <input
        className="w-full px-2 py-1.5 text-xs border-none outline-none"
        style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-[480px] border" style={{ backgroundColor: '#1B2A4A', borderColor: 'rgba(197,150,58,0.3)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <span className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>Add Contact</span>
          <button onClick={onClose}><X size={16} style={{ color: 'rgba(248,250,252,0.4)' }} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-3">{field('First Name', 'first_name', 'First', true)}{field('Last Name', 'last_name', 'Last', true)}</div>
          {field('Company', 'company', 'Company / LLC')}
          <div className="flex gap-3">{field('Phone', 'phone', '(562) 555-0000', true)}{field('Email', 'email', 'email@domain.com', true)}</div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</label>
              <select className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                value={form.contact_type} onChange={e => setForm(f => ({ ...f, contact_type: e.target.value as ContactType }))}>
                {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</label>
              <select className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                value={form.lead_status} onChange={e => setForm(f => ({ ...f, lead_status: e.target.value as LeadStatus }))}>
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            {field('City', 'city', 'Long Beach', true)}
            {field('State', 'state', 'CA', true)}
            {field('ZIP', 'zip', '90803', true)}
          </div>
          {field('Notes', 'notes', 'Investment preferences, notes...')}
          <button onClick={save} disabled={saving || !form.first_name || !form.last_name}
            className="w-full py-2.5 text-xs font-semibold tracking-wider uppercase mt-2"
            style={{ backgroundColor: form.first_name && form.last_name ? '#C5963A' : 'rgba(197,150,58,0.3)', color: '#0F172A' }}>
            {saving ? 'Saving...' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<ContactType | 'All'>('All')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'All'>('All')
  const [filterTag, setFilterTag] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
    setContacts((data ?? []) as Contact[])
    setLoading(false)
  }

  // All unique tags across contacts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    contacts.forEach(c => (c.tags ?? []).forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [contacts])

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const name = `${c.first_name} ${c.last_name}`.toLowerCase()
      const searchMatch = !search || name.includes(search.toLowerCase()) ||
        (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
        getPrimaryPhone(c).includes(search) ||
        getPrimaryEmail(c).toLowerCase().includes(search.toLowerCase()) ||
        (c.city ?? '').toLowerCase().includes(search.toLowerCase())
      const typeMatch = filterType === 'All' || c.contact_type === filterType
      const statusMatch = filterStatus === 'All' || c.lead_status === filterStatus
      const tagMatch = !filterTag || (c.tags ?? []).includes(filterTag)
      return searchMatch && typeMatch && statusMatch && tagMatch
    })
  }, [contacts, search, filterType, filterStatus, filterTag])

  const updateContact = (updated: Contact) => {
    setContacts(cs => cs.map(c => c.id === updated.id ? updated : c))
    if (selectedContact?.id === updated.id) setSelectedContact(updated)
  }

  // Stats
  const buyers = contacts.filter(c => c.contact_type === 'Buyer' || c.is_buyer).length
  const sellers = contacts.filter(c => c.contact_type === 'Seller' || c.is_seller).length
  const skipTraced = contacts.filter(c => c.last_skip_traced_at).length
  const active = contacts.filter(c => c.lead_status === 'Active' || c.lead_status === 'Qualified').length

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0F172A' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#F8FAFC' }}>Contact Manager</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.4)' }}>CRM · Buyers, Sellers &amp; Investors</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: 'rgba(248,250,252,0.6)', border: '1px solid rgba(248,250,252,0.1)' }}>
            <Upload size={12} /> Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: '#C5963A', color: '#0F172A' }}
          >
            <Plus size={12} /> Add Contact
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-px border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        {[
          { label: 'Total', value: contacts.length, color: '#F8FAFC' },
          { label: 'Buyers', value: buyers, color: '#3B9CB5' },
          { label: 'Sellers', value: sellers, color: '#C5963A' },
          { label: 'Active', value: active, color: '#22c55e' },
          { label: 'Skip Traced', value: skipTraced, color: '#a855f7' },
        ].map(s => (
          <div key={s.label} className="flex-1 px-4 py-3" style={{ backgroundColor: 'rgba(27,42,74,0.4)' }}>
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'rgba(248,250,252,0.35)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(248,250,252,0.3)' }} />
          <input
            className="w-full pl-7 pr-3 py-1.5 text-xs border-none outline-none"
            style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: '#F8FAFC' }}
            placeholder="Search name, phone, email, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-2 py-1.5 text-xs border-none outline-none"
          style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: 'rgba(248,250,252,0.7)' }}
          value={filterType}
          onChange={e => setFilterType(e.target.value as ContactType | 'All')}
        >
          <option value="All">All Types</option>
          {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="px-2 py-1.5 text-xs border-none outline-none"
          style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: 'rgba(248,250,252,0.7)' }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as LeadStatus | 'All')}
        >
          <option value="All">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {allTags.length > 0 && (
          <select
            className="px-2 py-1.5 text-xs border-none outline-none"
            style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: 'rgba(248,250,252,0.7)' }}
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <div className="text-xs ml-auto" style={{ color: 'rgba(248,250,252,0.3)' }}>
          {filtered.length} of {contacts.length}
        </div>
      </div>

      {/* Contact Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={20} className="animate-spin" style={{ color: '#C5963A' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Users size={24} style={{ color: 'rgba(248,250,252,0.15)' }} />
            <div className="text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>No contacts found</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(248,250,252,0.06)' }}>
                {['Contact', 'Type / Status', 'Phone', 'Email', 'Location', 'Tags', 'Skip Trace', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left" style={{ color: 'rgba(248,250,252,0.3)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: 'rgba(27,42,74,0.5)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const phone = getPrimaryPhone(c)
                const email = getPrimaryEmail(c)
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid rgba(248,250,252,0.04)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(27,42,74,0.2)' }}
                    onClick={() => setSelectedContact(c)}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(197,150,58,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgba(27,42,74,0.2)')}
                  >
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A' }}>
                          {getInitials(c)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold" style={{ color: '#F8FAFC' }}>{c.first_name} {c.last_name}</div>
                          {c.company && <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{c.company}</div>}
                        </div>
                      </div>
                    </td>
                    {/* Type / Status */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className="text-xs px-1.5 py-0.5" style={{ backgroundColor: 'rgba(59,156,181,0.12)', color: '#3B9CB5' }}>
                          {c.contact_type ?? (c.is_buyer ? 'Buyer' : c.is_seller ? 'Seller' : 'Contact')}
                        </span>
                        <div>
                          <span className="text-xs px-1.5 py-0.5" style={{
                            backgroundColor: STATUS_COLORS[c.lead_status ?? 'New'],
                            color: STATUS_TEXT[c.lead_status ?? 'New'],
                          }}>
                            {c.lead_status ?? 'New'}
                          </span>
                        </div>
                      </div>
                    </td>
                    {/* Phone */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {phone !== '—' && <Phone size={11} style={{ color: 'rgba(248,250,252,0.25)' }} />}
                        <span className="text-xs font-mono" style={{ color: phone === '—' ? 'rgba(248,250,252,0.2)' : 'rgba(248,250,252,0.8)' }}>{phone}</span>
                        {c.phones && c.phones[0]?.is_valid === false && <AlertCircle size={10} style={{ color: '#ef4444' }} />}
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="text-xs truncate block" style={{ color: email === '—' ? 'rgba(248,250,252,0.2)' : 'rgba(248,250,252,0.7)' }}>{email}</span>
                    </td>
                    {/* Location */}
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'rgba(248,250,252,0.5)' }}>
                        {c.city ? `${c.city}, ${c.state}` : '—'}
                      </span>
                    </td>
                    {/* Tags */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {(c.tags ?? []).slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs px-1.5 py-0.5" style={{ backgroundColor: 'rgba(59,156,181,0.1)', color: '#3B9CB5', fontSize: '9px' }}>
                            {tag}
                          </span>
                        ))}
                        {(c.tags ?? []).length > 2 && (
                          <span className="text-xs" style={{ color: 'rgba(248,250,252,0.3)', fontSize: '9px' }}>+{c.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    {/* Skip Trace */}
                    <td className="px-4 py-3">
                      {c.last_skip_traced_at ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle size={11} style={{ color: '#22c55e' }} />
                          <span className="text-xs" style={{ color: '#22c55e', fontSize: '9px' }}>Traced</span>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedContact(c) }}
                          className="flex items-center gap-1 text-xs transition-colors"
                          style={{ color: 'rgba(197,150,58,0.5)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#C5963A')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(197,150,58,0.5)')}
                        >
                          <Zap size={11} /> Trace
                        </button>
                      )}
                    </td>
                    {/* Arrow */}
                    <td className="px-4 py-3">
                      <ChevronRight size={12} style={{ color: 'rgba(248,250,252,0.2)' }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedContact && (
        <ContactDrawer
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdate={updateContact}
        />
      )}

      {/* Add Contact Modal */}
      {showAdd && (
        <AddContactModal
          onClose={() => setShowAdd(false)}
          onAdd={c => setContacts(cs => [c, ...cs])}
        />
      )}
    </div>
  )
}
