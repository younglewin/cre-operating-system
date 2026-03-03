import { useState, useCallback, useRef } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Mail, Plus, Trash2, GripVertical, Sparkles, Image, Type,
  AlignLeft, Minus, BarChart2, Send, Eye, CheckCircle,
  Loader2, Search, X,
} from 'lucide-react'
import OpenAI from 'openai'
import { SUBJECT_PROPERTY } from '../lib/mockData'
import AudienceSelector from '../components/AudienceSelector'
import type { Contact } from '../types'

const GOLD  = '#C5963A'
const TEAL  = '#3B9CB5'
const SLATE = '#0F172A'
const NAVY  = '#1B2A4A'
const OFF   = '#F8FAFC'

// ── OpenAI client ─────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
})

// ── Block Types ───────────────────────────────────────────────
type EmailBlockType = 'header' | 'hero_image' | 'headline' | 'body_text' | 'metrics_row' | 'cta_button' | 'divider' | 'footer'

interface EmailBlock {
  id: string
  type: EmailBlockType
  content: Record<string, string>
}

const EMAIL_BLOCK_LIBRARY: { type: EmailBlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'header',      label: 'Header',        icon: <Type size={12} /> },
  { type: 'hero_image',  label: 'Hero Image',     icon: <Image size={12} /> },
  { type: 'headline',    label: 'Headline',       icon: <Type size={12} /> },
  { type: 'body_text',   label: 'Body Text',      icon: <AlignLeft size={12} /> },
  { type: 'metrics_row', label: 'Metrics Row',    icon: <BarChart2 size={12} /> },
  { type: 'cta_button',  label: 'CTA Button',     icon: <Mail size={12} /> },
  { type: 'divider',     label: 'Divider',        icon: <Minus size={12} /> },
  { type: 'footer',      label: 'Footer',         icon: <AlignLeft size={12} /> },
]

const DEFAULT_BLOCKS: EmailBlock[] = [
  { id: 'eb1', type: 'header',      content: { logo: 'YoungLewin Advisors', tagline: 'Multifamily Investment Sales' } },
  { id: 'eb2', type: 'hero_image',  content: { url: '', alt: 'Property photo', caption: '' } },
  { id: 'eb3', type: 'headline',    content: { text: `New Listing: ${SUBJECT_PROPERTY.name}` } },
  { id: 'eb4', type: 'body_text',   content: { text: `We are pleased to present an exclusive opportunity to acquire ${SUBJECT_PROPERTY.name}, a ${SUBJECT_PROPERTY.num_units}-unit multifamily asset located in the highly desirable Naples Island neighborhood of Long Beach, CA. Priced at $${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()}, this offering represents a compelling ${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}% cap rate in one of Southern California's most sought-after coastal submarkets.` } },
  { id: 'eb5', type: 'metrics_row', content: { m1_label: 'Asking Price', m1_value: `$${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()}`, m2_label: 'Cap Rate', m2_value: `${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}%`, m3_label: 'Total Units', m3_value: String(SUBJECT_PROPERTY.num_units), m4_label: 'GRM', m4_value: `${SUBJECT_PROPERTY.grm?.toFixed(2) ?? 'N/A'}`, m5_label: 'Price / Unit', m5_value: `$${(SUBJECT_PROPERTY.price_per_unit ?? 0).toLocaleString()}`, m6_label: 'Price / SF', m6_value: `$${(SUBJECT_PROPERTY.price_per_sf ?? 0).toLocaleString()}` } },
  { id: 'eb6', type: 'cta_button',  content: { text: 'Request the Offering Memorandum', url: '#', subtext: 'Sign the digital NDA to receive the full OM instantly.' } },
  { id: 'eb7', type: 'divider',     content: {} },
  { id: 'eb8', type: 'footer',      content: { name: 'Shane Young & Dan Lewin', title: 'YoungLewin Advisors', phone: '(310) 555-0100', email: 'info@younglewi n.com', license: 'CA DRE #00000000', unsubscribe: 'Unsubscribe' } },
]

// ── Sortable Email Block ──────────────────────────────────────
function SortableEmailBlock({
  block, onRemove, onEdit, isSelected, onSelect,
}: {
  block: EmailBlock
  onRemove: (id: string) => void
  onEdit: (id: string, key: string, value: string) => void
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const meta = EMAIL_BLOCK_LIBRARY.find(b => b.type === block.type)

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={() => onSelect(block.id)}
        style={{ border: `1px solid ${isSelected ? GOLD : 'rgba(197,150,58,0.12)'}`, backgroundColor: isSelected ? 'rgba(197,150,58,0.06)' : 'rgba(15,23,42,0.3)', marginBottom: 4, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px' }}>
          <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'rgba(248,250,252,0.25)', display: 'flex' }} onClick={e => e.stopPropagation()}>
            <GripVertical size={12} />
          </div>
          <span style={{ color: GOLD }}>{meta?.icon}</span>
          <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: isSelected ? OFF : 'rgba(248,250,252,0.55)' }}>{meta?.label}</span>
          <button onClick={e => { e.stopPropagation(); onRemove(block.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.4)', display: 'flex', padding: 2 }}>
            <Trash2 size={11} />
          </button>
        </div>

        {/* Inline edit fields when selected */}
        {isSelected && (
          <div style={{ padding: '0 9px 9px', borderTop: '1px solid rgba(197,150,58,0.1)' }}>
            {Object.entries(block.content).map(([key, value]) => (
              <div key={key} style={{ marginTop: 6 }}>
                <label style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.3)', display: 'block', marginBottom: 2 }}>{key.replace(/_/g, ' ')}</label>
                {value.length > 60 || key === 'text' ? (
                  <textarea value={value} onChange={e => onEdit(block.id, key, e.target.value)} rows={3} style={{ width: '100%', padding: '5px 7px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                ) : (
                  <input type="text" value={value} onChange={e => onEdit(block.id, key, e.target.value)} style={{ width: '100%', padding: '5px 7px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Email Block Preview Renderer ──────────────────────────────
function EmailBlockPreview({ block }: { block: EmailBlock }) {
  const c = block.content
  switch (block.type) {
    case 'header':
      return (
        <div style={{ backgroundColor: NAVY, padding: '16px 24px', borderBottom: `3px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: GOLD, letterSpacing: '0.05em' }}>{c.logo}</div>
            <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.5)', letterSpacing: '0.1em' }}>{c.tagline?.toUpperCase()}</div>
          </div>
        </div>
      )
    case 'hero_image':
      return (
        <div style={{ backgroundColor: `${NAVY}80`, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {c.url ? (
            <img src={c.url} alt={c.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Image size={28} style={{ color: 'rgba(248,250,252,0.2)', marginBottom: 6 }} />
              <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.3)' }}>Hero Image</div>
              <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.2)' }}>Use Unsplash picker →</div>
            </div>
          )}
        </div>
      )
    case 'headline':
      return (
        <div style={{ padding: '20px 24px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: OFF, lineHeight: 1.2 }}>{c.text}</div>
        </div>
      )
    case 'body_text':
      return (
        <div style={{ padding: '8px 24px 16px' }}>
          <div style={{ fontSize: 13, color: 'rgba(248,250,252,0.75)', lineHeight: 1.7 }}>{c.text}</div>
        </div>
      )
    case 'metrics_row':
      return (
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map(n => (
            c[`m${n}_label`] ? (
              <div key={n} style={{ padding: '10px 12px', backgroundColor: `${NAVY}80`, border: '1px solid rgba(197,150,58,0.15)', textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{c[`m${n}_label`]}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: n <= 2 ? GOLD : OFF }}>{c[`m${n}_value`]}</div>
              </div>
            ) : null
          ))}
        </div>
      )
    case 'cta_button':
      return (
        <div style={{ padding: '20px 24px', textAlign: 'center' }}>
          {c.subtext && <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.5)', marginBottom: 12 }}>{c.subtext}</div>}
          <a href={c.url} style={{ display: 'inline-block', padding: '13px 32px', backgroundColor: GOLD, color: SLATE, fontSize: 12, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {c.text}
          </a>
        </div>
      )
    case 'divider':
      return <div style={{ padding: '8px 24px' }}><div style={{ height: 1, backgroundColor: 'rgba(45,63,94,0.8)' }} /></div>
    case 'footer':
      return (
        <div style={{ backgroundColor: NAVY, padding: '16px 24px', borderTop: `1px solid rgba(197,150,58,0.2)` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 2 }}>{c.name}</div>
          <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.5)', marginBottom: 6 }}>{c.title}</div>
          <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)', marginBottom: 2 }}>{c.phone}  ·  {c.email}</div>
          <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.5)', marginBottom: 8 }}>{c.license}</div>
          <div style={{ height: 1, backgroundColor: 'rgba(45,63,94,0.6)', marginBottom: 8 }} />
          <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.4)', textAlign: 'center' }}>
            You received this email because you are a registered investor contact of YoungLewin Advisors. ·{' '}
            <span style={{ color: TEAL, cursor: 'pointer' }}>{c.unsubscribe}</span>
          </div>
        </div>
      )
    default:
      return null
  }
}

// ── Unsplash Image Picker ─────────────────────────────────────
interface UnsplashPhoto {
  id: string
  urls: { regular: string; thumb: string }
  alt_description: string
  user: { name: string }
}

function UnsplashPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [query, setQuery]   = useState('apartment building')
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
      if (!accessKey) {
        // Demo mode: show placeholder message
        setError('Add VITE_UNSPLASH_ACCESS_KEY to .env to enable live Unsplash search.')
        setPhotos([])
        setLoading(false)
        return
      }
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape&client_id=${accessKey}`)
      const data = await res.json()
      setPhotos(data.results ?? [])
    } catch {
      setError('Unsplash search failed. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 640, maxHeight: '80vh', backgroundColor: SLATE, border: `1px solid ${GOLD}30`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(197,150,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image size={14} style={{ color: GOLD }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: OFF }}>Unsplash Image Library</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,250,252,0.5)', display: 'flex' }}><X size={16} /></button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(197,150,58,0.1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Search Unsplash (e.g. apartment, coastal, luxury)"
              style={{ flex: 1, padding: '8px 12px', fontSize: 12, fontFamily: 'Inter', color: OFF, backgroundColor: NAVY, border: '1px solid rgba(197,150,58,0.2)', outline: 'none' }}
            />
            <button onClick={search} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', backgroundColor: GOLD, color: SLATE, display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={12} />} Search
            </button>
          </div>
          {error && <div style={{ marginTop: 8, fontSize: 10, color: '#F59E0B' }}>{error}</div>}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {photos.length === 0 && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(248,250,252,0.3)', fontSize: 12 }}>
              Search for images above. Add <code style={{ color: GOLD }}>VITE_UNSPLASH_ACCESS_KEY</code> to .env for live results.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {photos.map(photo => (
              <div
                key={photo.id}
                onClick={() => { onSelect(photo.urls.regular); onClose() }}
                style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', border: '1px solid rgba(197,150,58,0.1)' }}
              >
                <img src={photo.urls.thumb} alt={photo.alt_description} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '4px 6px', backgroundColor: `${NAVY}90`, fontSize: 8, color: 'rgba(248,250,252,0.5)' }}>
                  Photo by {photo.user.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AI Copywriter Panel ───────────────────────────────────────
function AICopywriterPanel({ onInsert }: { onInsert: (text: string) => void }) {
  const [prompt, setPrompt]   = useState('')
  const [result, setResult]   = useState('')
  const [loading, setLoading] = useState(false)
  const [tone, setTone]       = useState<'professional' | 'urgent' | 'conversational'>('professional')

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setResult('')
    try {
      const systemPrompt = `You are a top-tier commercial real estate copywriter for YoungLewin Advisors, a multifamily investment sales brokerage in Southern California. Write in a ${tone} tone. Be concise, data-driven, and compelling. Focus on the investment thesis. Never use clichés like "don't miss out". Output only the copy, no preamble.`

      const userPrompt = `Write email copy for: ${prompt}

Property context: ${SUBJECT_PROPERTY.name}, ${SUBJECT_PROPERTY.num_units} units, $${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()} asking price, ${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}% cap rate, ${SUBJECT_PROPERTY.address}.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
      })
      setResult(completion.choices[0]?.message?.content ?? '')
    } catch (err: unknown) {
      setResult(`Error: ${err instanceof Error ? err.message : 'OpenAI call failed'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 14, borderTop: '1px solid rgba(197,150,58,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Sparkles size={13} style={{ color: GOLD }} />
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: GOLD }}>AI Copywriter</span>
      </div>

      {/* Tone selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {(['professional', 'urgent', 'conversational'] as const).map(t => (
          <button key={t} onClick={() => setTone(t)} style={{ flex: 1, padding: '4px 0', fontSize: 8, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: `1px solid ${tone === t ? GOLD : 'rgba(197,150,58,0.2)'}`, backgroundColor: tone === t ? `${GOLD}18` : 'transparent', color: tone === t ? GOLD : 'rgba(248,250,252,0.4)', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="e.g. 'Write a subject line for a new listing email' or 'Write a 2-sentence investment thesis for this property'"
        rows={3}
        style={{ width: '100%', padding: '7px 9px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 7 }}
      />

      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        style={{ width: '100%', padding: '7px', fontSize: 10, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', backgroundColor: loading ? 'rgba(197,150,58,0.3)' : GOLD, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}
      >
        {loading ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Sparkles size={11} /> Generate Copy</>}
      </button>

      {result && (
        <div>
          <div style={{ padding: '9px 10px', backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(197,150,58,0.15)', fontSize: 10, color: 'rgba(248,250,252,0.8)', lineHeight: 1.6, marginBottom: 6, whiteSpace: 'pre-wrap' }}>
            {result}
          </div>
          <button
            onClick={() => onInsert(result)}
            style={{ width: '100%', padding: '6px', fontSize: 10, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: `1px solid ${TEAL}50`, backgroundColor: `${TEAL}12`, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          >
            <Plus size={10} /> Insert into Email
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tracking Stats Panel ──────────────────────────────────────
function TrackingStatsPanel() {
  const stats = [
    { label: 'Sent',      value: 47,  color: OFF },
    { label: 'Delivered', value: 45,  color: OFF },
    { label: 'Opened',    value: 28,  color: TEAL },
    { label: 'Clicked',   value: 12,  color: GOLD },
    { label: 'Open Rate', value: '62%', color: TEAL },
    { label: 'CTR',       value: '43%', color: GOLD },
  ]
  const recent = [
    { email: 'john.smith@equitygroup.com', action: 'opened', time: '2 min ago' },
    { email: 'mchen@westcoastcap.com',     action: 'clicked', time: '14 min ago' },
    { email: 'rdavis@privatemail.com',     action: 'opened', time: '1 hr ago' },
    { email: 'investor@fundco.com',        action: 'opened', time: '3 hrs ago' },
  ]
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
        {stats.map(s => (
          <div key={s.label} style={{ padding: '8px 10px', backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid rgba(197,150,58,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.35)', marginBottom: 8 }}>Recent Activity</div>
      {recent.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(45,63,94,0.5)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: r.action === 'clicked' ? GOLD : TEAL, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: OFF }}>{r.email}</div>
            <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.4)' }}>{r.action} · {r.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function EmailMarketingPage() {
  const [blocks, setBlocks]           = useState<EmailBlock[]>(DEFAULT_BLOCKS)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [subject, setSubject]         = useState(`New Listing: ${SUBJECT_PROPERTY.name} — ${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}% Cap`)
  const [previewText, setPreviewText] = useState(`${SUBJECT_PROPERTY.num_units} units · $${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()} · Naples Island, Long Beach`)
  const [activeTab, setActiveTab]     = useState<'blocks' | 'ai' | 'tracking'>('blocks')
  const [showUnsplash, setShowUnsplash] = useState(false)
  const [sending, setSending]         = useState(false)
  const [sent, setSent]               = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBlocks(items => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  const addBlock = (type: EmailBlockType) => {
    const defaults: Record<EmailBlockType, Record<string, string>> = {
      header:      { logo: 'YoungLewin Advisors', tagline: 'Multifamily Investment Sales' },
      hero_image:  { url: '', alt: 'Property photo', caption: '' },
      headline:    { text: 'New Headline' },
      body_text:   { text: 'Enter your email body text here.' },
      metrics_row: { m1_label: 'Asking Price', m1_value: `$${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()}`, m2_label: 'Cap Rate', m2_value: `${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}%`, m3_label: 'Total Units', m3_value: String(SUBJECT_PROPERTY.num_units), m4_label: 'GRM', m4_value: `${SUBJECT_PROPERTY.grm?.toFixed(2) ?? 'N/A'}`, m5_label: 'Price / Unit', m5_value: `$${(SUBJECT_PROPERTY.price_per_unit ?? 0).toLocaleString()}`, m6_label: 'Price / SF', m6_value: `$${(SUBJECT_PROPERTY.price_per_sf ?? 0).toLocaleString()}` },
      cta_button:  { text: 'Learn More', url: '#', subtext: '' },
      divider:     {},
      footer:      { name: 'Shane Young & Dan Lewin', title: 'YoungLewin Advisors', phone: '(310) 555-0100', email: 'info@younglewi n.com', license: 'CA DRE #00000000', unsubscribe: 'Unsubscribe' },
    }
    const newBlock: EmailBlock = { id: `eb${Date.now()}`, type, content: defaults[type] }
    setBlocks(prev => [...prev, newBlock])
    setSelectedId(newBlock.id)
  }

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const editBlock = (id: string, key: string, value: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, [key]: value } } : b))
  }

  const insertAICopy = (text: string) => {
    // Insert into the currently selected body_text or headline block, or add a new body_text block
    const target = blocks.find(b => b.id === selectedId && (b.type === 'body_text' || b.type === 'headline'))
    if (target) {
      editBlock(target.id, 'text', text)
    } else {
      const newBlock: EmailBlock = { id: `eb${Date.now()}`, type: 'body_text', content: { text } }
      setBlocks(prev => [...prev, newBlock])
      setSelectedId(newBlock.id)
    }
  }

  const handleUnsplashSelect = (url: string) => {
    const heroBlock = blocks.find(b => b.type === 'hero_image')
    if (heroBlock) {
      editBlock(heroBlock.id, 'url', url)
    }
  }

  const handleSend = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 2000))
    setSending(false)
    setSent(true)
  }

  const tabs = [
    { key: 'blocks',   label: 'Blocks',   icon: <AlignLeft size={11} /> },
    { key: 'ai',       label: 'AI Copy',  icon: <Sparkles size={11} /> },
    { key: 'tracking', label: 'Tracking', icon: <BarChart2 size={11} /> },
  ] as const

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: SLATE, fontFamily: 'Inter', overflow: 'hidden' }}>

      {/* Left Panel */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid rgba(197,150,58,0.2)', display: 'flex', flexDirection: 'column', backgroundColor: `${NAVY}50` }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(197,150,58,0.2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <Mail size={14} style={{ color: GOLD }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD }}>Email Marketing</span>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.35)' }}>Drag-and-drop · AI copy · Open/click tracking</div>
        </div>

        {/* Subject line */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(197,150,58,0.1)', flexShrink: 0 }}>
          <label style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.3)', display: 'block', marginBottom: 3 }}>Subject Line</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
          <label style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.3)', display: 'block', marginBottom: 3 }}>Preview Text</label>
          <input type="text" value={previewText} onChange={e => setPreviewText(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(197,150,58,0.1)', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '7px 4px', fontSize: 9, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', borderBottom: activeTab === tab.key ? `2px solid ${GOLD}` : '2px solid transparent', backgroundColor: 'transparent', color: activeTab === tab.key ? GOLD : 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'blocks' && (
            <div style={{ padding: 12 }}>
              {/* Audience Selector */}
              <AudienceSelector
                mode="email"
                onSelectionChange={(_contacts: Contact[]) => {
                  // Recipients are tracked internally; contacts feed into campaign send
                }}
              />
              {/* Add block */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.3)', marginBottom: 6 }}>Add Block</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {EMAIL_BLOCK_LIBRARY.map(b => (
                    <button key={b.type} onClick={() => addBlock(b.type)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 7px', fontSize: 9, fontWeight: 600, fontFamily: 'Inter', cursor: 'pointer', border: '1px solid rgba(197,150,58,0.15)', backgroundColor: 'rgba(15,23,42,0.3)', color: 'rgba(248,250,252,0.55)', textAlign: 'left' }}>
                      <span style={{ color: GOLD }}>{b.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unsplash button */}
              <button onClick={() => setShowUnsplash(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', fontSize: 10, fontWeight: 600, fontFamily: 'Inter', cursor: 'pointer', border: '1px solid rgba(59,156,181,0.3)', backgroundColor: 'rgba(59,156,181,0.08)', color: TEAL, marginBottom: 12 }}>
                <Image size={11} /> Browse Unsplash Images
              </button>

              {/* Block list */}
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.3)', marginBottom: 6 }}>
                Layout ({blocks.length} blocks)
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map(block => (
                    <SortableEmailBlock
                      key={block.id}
                      block={block}
                      onRemove={removeBlock}
                      onEdit={editBlock}
                      isSelected={selectedId === block.id}
                      onSelect={setSelectedId}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {activeTab === 'ai' && <AICopywriterPanel onInsert={insertAICopy} />}
          {activeTab === 'tracking' && <TrackingStatsPanel />}
        </div>

        {/* Send Footer */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(197,150,58,0.2)', flexShrink: 0 }}>
          {sent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', marginBottom: 8, backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 10, color: '#22C55E' }}>
              <CheckCircle size={11} /> Campaign sent — tracking active
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => previewRef.current?.scrollIntoView()} style={{ flex: 1, padding: '8px', fontSize: 10, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: `1px solid ${GOLD}40`, backgroundColor: 'transparent', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Eye size={11} /> Preview
            </button>
            <button onClick={handleSend} disabled={sending} style={{ flex: 2, padding: '8px', fontSize: 10, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', backgroundColor: GOLD, color: SLATE, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {sending ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : <><Send size={11} /> Send Campaign</>}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel — Email Preview */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#1a1a2e' }}>
        {/* Email client chrome */}
        <div style={{ maxWidth: 640, margin: '24px auto' }}>
          {/* Email header bar */}
          <div style={{ backgroundColor: '#0d0d1a', border: '1px solid rgba(197,150,58,0.15)', padding: '12px 16px', marginBottom: 0 }}>
            <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.3)', marginBottom: 4 }}>FROM: YoungLewin Advisors &lt;listings@younglewi n.com&gt;</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: OFF, marginBottom: 2 }}>{subject}</div>
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)' }}>{previewText}</div>
          </div>

          {/* Email body */}
          <div ref={previewRef} style={{ backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.15)', borderTop: 'none' }}>
            {blocks.map(block => <EmailBlockPreview key={block.id} block={block} />)}
          </div>
        </div>
      </div>

      {/* Unsplash Modal */}
      {showUnsplash && <UnsplashPicker onSelect={handleUnsplashSelect} onClose={() => setShowUnsplash(false)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
