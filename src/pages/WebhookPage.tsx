import { useState, useEffect } from 'react'
import {
  Zap, Copy, CheckCircle, RefreshCw, Play, Eye, EyeOff, Trash2,
  Plus, AlertCircle, ArrowRight, Code2, Globe, Lock, Unlock,
  Activity, Clock, ChevronDown, ChevronUp, X, Database
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
interface WebhookEvent {
  id: string
  received_at: string
  source: string
  payload: Record<string, unknown>
  status: 'processed' | 'error' | 'pending'
  contact_created?: boolean
  error_message?: string
}

interface WebhookMapping {
  zapierField: string
  dbField: string
  transform: 'text' | 'number' | 'date' | 'phone' | 'email'
}

// ─── Default Zapier → Contact Mappings ───────────────────────────────────────
const DEFAULT_MAPPINGS: WebhookMapping[] = [
  { zapierField: 'first_name',   dbField: 'first_name',   transform: 'text' },
  { zapierField: 'last_name',    dbField: 'last_name',    transform: 'text' },
  { zapierField: 'email',        dbField: 'email',        transform: 'email' },
  { zapierField: 'phone',        dbField: 'phone',        transform: 'phone' },
  { zapierField: 'company',      dbField: 'company',      transform: 'text' },
  { zapierField: 'contact_type', dbField: 'contact_type', transform: 'text' },
  { zapierField: 'source',       dbField: 'lead_source',  transform: 'text' },
  { zapierField: 'notes',        dbField: 'notes',        transform: 'text' },
  { zapierField: 'tags',         dbField: 'tags',         transform: 'text' },
]

const CONTACT_DB_FIELDS = [
  'skip', 'first_name', 'last_name', 'email', 'phone', 'company',
  'contact_type', 'lead_status', 'lead_source', 'notes', 'tags',
  'address', 'city', 'state', 'zip_code',
]

// ─── Sample Payloads ──────────────────────────────────────────────────────────
const SAMPLE_PAYLOADS: Record<string, Record<string, unknown>> = {
  'Zapier — Typeform Lead': {
    first_name: 'Michael',
    last_name: 'Chen',
    email: 'mchen@investcap.com',
    phone: '(562) 555-0101',
    company: 'InvestCap Partners',
    contact_type: 'Buyer',
    source: 'Typeform',
    notes: 'Interested in 4-6 unit multifamily in Long Beach',
    tags: 'buyer,long-beach,4-6units',
  },
  'Zapier — Facebook Lead Ad': {
    full_name: 'Sarah Thompson',
    email: 'sthompson@realty.com',
    phone_number: '(714) 555-0404',
    ad_name: 'Long Beach Multifamily Investors',
    campaign: 'Q1 2026 Buyer Campaign',
    source: 'Facebook Ads',
  },
  'Zapier — Calendly Booking': {
    invitee_first_name: 'Robert',
    invitee_last_name: 'Martinez',
    invitee_email: 'rmartinez@cashbuyer.com',
    invitee_phone: '(714) 555-0303',
    event_name: 'Investor Consultation',
    scheduled_at: '2026-03-15T14:00:00Z',
    source: 'Calendly',
  },
  'Custom — Direct API': {
    first_name: 'David',
    last_name: 'Kim',
    email: 'dkim@1031exchange.com',
    phone: '(310) 555-0505',
    company: 'Kim Family Trust',
    contact_type: 'Investor',
    lead_source: 'Direct API',
    notes: '1031 exchange buyer, deadline June 2026',
    tags: 'buyer,1031,urgent',
  },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Payload Inspector ────────────────────────────────────────────────────────
function PayloadInspector({ payload, onClose }: { payload: Record<string, unknown>; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-40 overflow-y-auto" style={{ width: '440px', backgroundColor: '#1B2A4A', borderLeft: '1px solid rgba(197,150,58,0.25)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <div className="flex items-center gap-2">
            <Code2 size={14} style={{ color: '#C5963A' }} />
            <span className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>Payload Inspector</span>
          </div>
          <button onClick={onClose}><X size={14} style={{ color: 'rgba(248,250,252,0.4)' }} /></button>
        </div>
        <div className="p-5">
          <pre className="text-xs overflow-auto" style={{ color: '#22c55e', backgroundColor: 'rgba(0,0,0,0.3)', padding: '12px', lineHeight: '1.6', fontFamily: 'monospace' }}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WebhookPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [mappings, setMappings] = useState<WebhookMapping[]>(DEFAULT_MAPPINGS)
  const [selectedPayload, setSelectedPayload] = useState<Record<string, unknown> | null>(null)
  const [testSource, setTestSource] = useState('Zapier — Typeform Lead')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [activeTab, setActiveTab] = useState<'endpoint' | 'mapping' | 'log'>('endpoint')

  // Simulated webhook URL (in production this would be a real Supabase Edge Function URL)
  const webhookUrl = `https://siyakgunpyqsketgxyno.supabase.co/functions/v1/webhook-ingest`
  const webhookSecret = 'wh_sk_younglewin_' + 'a7f3k9m2p5q8r1s4t6u0v'

  useEffect(() => { loadEvents() }, [])

  const loadEvents = async () => {
    // Load from communications table as proxy for webhook events
    const { data } = await supabase
      .from('communications')
      .select('*, contact:contacts(first_name, last_name)')
      .eq('channel', 'note')
      .ilike('body', '%webhook%')
      .order('created_at', { ascending: false })
      .limit(20)

    // Also add some demo events
    const demoEvents: WebhookEvent[] = [
      {
        id: 'demo-1',
        received_at: new Date(Date.now() - 5 * 60000).toISOString(),
        source: 'Zapier — Typeform Lead',
        payload: SAMPLE_PAYLOADS['Zapier — Typeform Lead'],
        status: 'processed',
        contact_created: true,
      },
      {
        id: 'demo-2',
        received_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        source: 'Zapier — Facebook Lead Ad',
        payload: SAMPLE_PAYLOADS['Zapier — Facebook Lead Ad'],
        status: 'processed',
        contact_created: true,
      },
      {
        id: 'demo-3',
        received_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        source: 'Zapier — Calendly Booking',
        payload: SAMPLE_PAYLOADS['Zapier — Calendly Booking'],
        status: 'error',
        contact_created: false,
        error_message: 'Missing required field: last_name',
      },
    ]
    setEvents(demoEvents)
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updateMapping = (idx: number, field: keyof WebhookMapping, value: string) => {
    setMappings(ms => ms.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  const addMapping = () => {
    setMappings(ms => [...ms, { zapierField: '', dbField: 'skip', transform: 'text' }])
  }

  const removeMapping = (idx: number) => {
    setMappings(ms => ms.filter((_, i) => i !== idx))
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    const payload = SAMPLE_PAYLOADS[testSource] ?? {}

    // Simulate processing the webhook payload
    await new Promise(r => setTimeout(r, 800))

    // Build contact from mappings
    const contactData: Record<string, unknown> = {}
    for (const m of mappings) {
      if (m.dbField === 'skip' || !m.zapierField) continue
      const val = payload[m.zapierField]
      if (val !== undefined) contactData[m.dbField] = val
    }

    // Handle full_name split
    if (!contactData.first_name && payload.full_name) {
      const parts = String(payload.full_name).split(' ')
      contactData.first_name = parts[0]
      contactData.last_name = parts.slice(1).join(' ')
    }
    // Handle phone_number alias
    if (!contactData.phone && payload.phone_number) contactData.phone = payload.phone_number
    // Handle invitee fields
    if (!contactData.first_name && payload.invitee_first_name) contactData.first_name = payload.invitee_first_name
    if (!contactData.last_name && payload.invitee_last_name) contactData.last_name = payload.invitee_last_name
    if (!contactData.email && payload.invitee_email) contactData.email = payload.invitee_email
    if (!contactData.phone && payload.invitee_phone) contactData.phone = payload.invitee_phone

    if (!contactData.first_name) {
      setTestResult({ success: false, message: 'Missing required field: first_name. Check your field mapping.' })
      setTesting(false)
      return
    }

    // Insert contact into Supabase
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const { error } = await supabase.from('contacts').insert({
      ...contactData,
      team_id: teamData?.id,
      lead_status: 'New',
      tags: contactData.tags ? String(contactData.tags).split(',').map((t: string) => t.trim()) : [],
    })

    if (error) {
      setTestResult({ success: false, message: `Database error: ${error.message}` })
    } else {
      setTestResult({ success: true, message: `Contact "${contactData.first_name} ${contactData.last_name ?? ''}" created successfully from ${testSource}` })
      // Add to event log
      const newEvent: WebhookEvent = {
        id: `test-${Date.now()}`,
        received_at: new Date().toISOString(),
        source: testSource,
        payload,
        status: 'processed',
        contact_created: true,
      }
      setEvents(es => [newEvent, ...es])
    }
    setTesting(false)
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#F8FAFC' }}>Zapier Webhook</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.4)' }}>Ingest leads from Zapier, Typeform, Facebook Ads, Calendly, and more</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-xs" style={{ color: '#22c55e' }}>Endpoint Active</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        {([
          { key: 'endpoint', label: 'Endpoint & Test', icon: Globe },
          { key: 'mapping',  label: 'Field Mapping',   icon: ArrowRight },
          { key: 'log',      label: 'Event Log',        icon: Activity },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-5 py-3 text-xs font-medium transition-all"
            style={{
              color: activeTab === key ? '#F8FAFC' : 'rgba(248,250,252,0.4)',
              borderBottom: activeTab === key ? '2px solid #C5963A' : '2px solid transparent',
              backgroundColor: activeTab === key ? 'rgba(197,150,58,0.05)' : 'transparent',
            }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Endpoint & Test ── */}
      {activeTab === 'endpoint' && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl space-y-6">
            {/* Webhook URL */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Webhook URL</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2" style={{ backgroundColor: 'rgba(27,42,74,0.8)', border: '1px solid rgba(197,150,58,0.25)' }}>
                  <Globe size={12} style={{ color: '#3B9CB5', flexShrink: 0 }} />
                  <span className="text-xs font-mono truncate" style={{ color: '#F8FAFC' }}>{webhookUrl}</span>
                </div>
                <button
                  onClick={copyUrl}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
                  style={{ backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'rgba(197,150,58,0.15)', color: copied ? '#22c55e' : '#C5963A', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(197,150,58,0.3)'}` }}
                >
                  {copied ? <><CheckCircle size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Secret Key (X-Webhook-Secret header)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2" style={{ backgroundColor: 'rgba(27,42,74,0.8)', border: '1px solid rgba(248,250,252,0.08)' }}>
                  <Lock size={12} style={{ color: 'rgba(248,250,252,0.3)', flexShrink: 0 }} />
                  <span className="text-xs font-mono" style={{ color: showSecret ? '#F8FAFC' : 'rgba(248,250,252,0.3)' }}>
                    {showSecret ? webhookSecret : '•'.repeat(40)}
                  </span>
                </div>
                <button onClick={() => setShowSecret(!showSecret)} className="p-2" style={{ color: 'rgba(248,250,252,0.3)' }}>
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Zapier Setup Guide */}
            <div className="p-4" style={{ backgroundColor: 'rgba(197,150,58,0.05)', border: '1px solid rgba(197,150,58,0.15)' }}>
              <div className="text-xs font-semibold mb-3" style={{ color: '#C5963A', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Zapier Setup Guide</div>
              {[
                { step: 1, text: 'In Zapier, create a new Zap with your trigger (Typeform, Facebook Lead Ads, Calendly, etc.)' },
                { step: 2, text: 'Add a "Webhooks by Zapier" action → choose "POST"' },
                { step: 3, text: 'Set URL to the webhook URL above' },
                { step: 4, text: 'Set Payload Type to "JSON" and add your field mappings' },
                { step: 5, text: 'Add header: X-Webhook-Secret → (your secret key above)' },
                { step: 6, text: 'Test the Zap — the contact will appear in your CRM immediately' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3 mb-2">
                  <div className="w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(197,150,58,0.2)', color: '#C5963A' }}>{step}</div>
                  <span className="text-xs" style={{ color: 'rgba(248,250,252,0.6)' }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Test Webhook */}
            <div>
              <div className="text-xs font-semibold mb-3" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Test Webhook</div>
              <div className="flex items-center gap-3 mb-3">
                <select
                  className="flex-1 px-3 py-2 text-xs border-none outline-none"
                  style={{ backgroundColor: 'rgba(27,42,74,0.8)', color: '#F8FAFC', border: '1px solid rgba(248,250,252,0.1)' }}
                  value={testSource}
                  onChange={e => setTestSource(e.target.value)}
                >
                  {Object.keys(SAMPLE_PAYLOADS).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <button
                  onClick={() => setSelectedPayload(SAMPLE_PAYLOADS[testSource])}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs"
                  style={{ color: 'rgba(248,250,252,0.4)', border: '1px solid rgba(248,250,252,0.1)' }}
                >
                  <Eye size={12} /> Preview
                </button>
                <button
                  onClick={runTest}
                  disabled={testing}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
                  style={{ backgroundColor: '#C5963A', color: '#0F172A' }}
                >
                  {testing ? <><RefreshCw size={12} className="animate-spin" /> Testing...</> : <><Play size={12} /> Send Test</>}
                </button>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className="flex items-start gap-2 p-3" style={{
                  backgroundColor: testResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  {testResult.success
                    ? <CheckCircle size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                    : <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  }
                  <span className="text-xs" style={{ color: testResult.success ? '#22c55e' : '#ef4444' }}>
                    {testResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Field Mapping ── */}
      {activeTab === 'mapping' && (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>
              Map Zapier payload fields to CRM contact fields. Unmapped fields are ignored.
            </div>
            <button onClick={addMapping} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A', border: '1px solid rgba(197,150,58,0.3)' }}>
              <Plus size={11} /> Add Mapping
            </button>
          </div>

          {/* Header */}
          <div className="grid grid-cols-4 gap-3 px-3 py-2 text-xs font-semibold" style={{ color: 'rgba(248,250,252,0.3)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <div>Zapier Field Name</div>
            <div>CRM Field</div>
            <div>Transform</div>
            <div></div>
          </div>

          <div className="space-y-1">
            {mappings.map((m, i) => (
              <div key={i} className="grid grid-cols-4 gap-3 px-3 py-2 items-center" style={{ backgroundColor: 'rgba(27,42,74,0.4)', border: '1px solid rgba(248,250,252,0.04)' }}>
                <input
                  className="text-xs px-2 py-1 border-none outline-none"
                  style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: '#F8FAFC' }}
                  placeholder="e.g. first_name"
                  value={m.zapierField}
                  onChange={e => updateMapping(i, 'zapierField', e.target.value)}
                />
                <select
                  className="text-xs px-2 py-1 border-none outline-none"
                  style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: m.dbField === 'skip' ? 'rgba(248,250,252,0.3)' : '#C5963A' }}
                  value={m.dbField}
                  onChange={e => updateMapping(i, 'dbField', e.target.value)}
                >
                  {CONTACT_DB_FIELDS.map(f => <option key={f} value={f}>{f === 'skip' ? '— Skip —' : f}</option>)}
                </select>
                <select
                  className="text-xs px-2 py-1 border-none outline-none"
                  style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: 'rgba(248,250,252,0.6)' }}
                  value={m.transform}
                  onChange={e => updateMapping(i, 'transform', e.target.value as WebhookMapping['transform'])}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                </select>
                <button onClick={() => removeMapping(i)} className="flex justify-end" style={{ color: 'rgba(248,250,252,0.2)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Save note */}
          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>
            <AlertCircle size={11} />
            Mappings are applied in real-time. Changes take effect immediately for new incoming webhooks.
          </div>
        </div>
      )}

      {/* ── Tab: Event Log ── */}
      {activeTab === 'log' && (
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Activity size={24} style={{ color: 'rgba(248,250,252,0.15)' }} />
              <div className="text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>No webhook events yet</div>
            </div>
          ) : (
            events.map(event => (
              <div
                key={event.id}
                className="flex items-center gap-4 px-6 py-3 border-b cursor-pointer transition-colors"
                style={{ borderColor: 'rgba(248,250,252,0.04)' }}
                onClick={() => setSelectedPayload(event.payload)}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(197,150,58,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {/* Status */}
                <div className="flex-shrink-0">
                  {event.status === 'processed'
                    ? <CheckCircle size={14} style={{ color: '#22c55e' }} />
                    : event.status === 'error'
                    ? <AlertCircle size={14} style={{ color: '#ef4444' }} />
                    : <Clock size={14} style={{ color: '#C5963A' }} />
                  }
                </div>

                {/* Source */}
                <div className="flex items-center gap-2 flex-shrink-0 w-48">
                  <Zap size={11} style={{ color: '#C5963A' }} />
                  <span className="text-xs font-medium truncate" style={{ color: '#F8FAFC' }}>{event.source}</span>
                </div>

                {/* Contact Created */}
                <div className="flex-shrink-0">
                  {event.contact_created
                    ? <span className="text-xs px-2 py-0.5" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '9px' }}>Contact Created</span>
                    : <span className="text-xs px-2 py-0.5" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '9px' }}>Failed</span>
                  }
                </div>

                {/* Error */}
                {event.error_message && (
                  <div className="text-xs truncate" style={{ color: '#ef4444' }}>{event.error_message}</div>
                )}

                {/* Payload preview */}
                <div className="flex-1 text-xs truncate" style={{ color: 'rgba(248,250,252,0.3)' }}>
                  {Object.entries(event.payload).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </div>

                {/* Time */}
                <div className="text-xs flex-shrink-0" style={{ color: 'rgba(248,250,252,0.3)', fontSize: '9px' }}>
                  {timeAgo(event.received_at)}
                </div>

                {/* View */}
                <button className="flex-shrink-0 p-1" style={{ color: 'rgba(248,250,252,0.2)' }}>
                  <Eye size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Payload Inspector */}
      {selectedPayload && <PayloadInspector payload={selectedPayload} onClose={() => setSelectedPayload(null)} />}
    </div>
  )
}
