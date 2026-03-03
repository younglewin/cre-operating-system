import { useState, useCallback } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Trash2, Eye, EyeOff, Shield, Mail,
  CheckCircle, Copy, ExternalLink, Settings, Loader2,
  Image, Type, List, Phone, Building2, Link2,
} from 'lucide-react'
import { SUBJECT_PROPERTY } from '../lib/mockData'

const GOLD  = '#C5963A'
const TEAL  = '#3B9CB5'
const SLATE = '#0F172A'
const NAVY  = '#1B2A4A'
const OFF   = '#F8FAFC'

// ── Block Types ───────────────────────────────────────────────
type BlockType = 'hero' | 'headline' | 'bullets' | 'metrics' | 'cta' | 'image' | 'contact' | 'map'

interface Block {
  id: string
  type: BlockType
  content: Record<string, string>
  visible: boolean
}

const BLOCK_LIBRARY: { type: BlockType; label: string; icon: React.ReactNode; defaultContent: Record<string, string> }[] = [
  { type: 'hero',     label: 'Hero Banner',       icon: <Image size={13} />,    defaultContent: { title: SUBJECT_PROPERTY.name, subtitle: SUBJECT_PROPERTY.address, badge: 'EXCLUSIVELY LISTED' } },
  { type: 'headline', label: 'Headline + Body',   icon: <Type size={13} />,     defaultContent: { heading: 'Investment Highlights', body: 'A rare opportunity to acquire a stabilized multifamily asset in one of Long Beach\'s most desirable coastal neighborhoods.' } },
  { type: 'metrics',  label: 'Key Metrics Grid',  icon: <Building2 size={13} />,defaultContent: { price: `$${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()}`, cap: `${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}%`, units: String(SUBJECT_PROPERTY.num_units), sf: `${SUBJECT_PROPERTY.building_size_sf?.toLocaleString()} SF` } },
  { type: 'bullets',  label: 'Bullet Points',     icon: <List size={13} />,     defaultContent: { items: 'Prime Naples Island location\nStabilized 4-unit asset\nStrong rental demand\n1031 exchange candidate\nValue-add repositioning potential' } },
  { type: 'cta',      label: 'NDA / CTA Button',  icon: <Shield size={13} />,   defaultContent: { heading: 'Request the Offering Memorandum', body: 'Sign the digital NDA to receive the full OM and access the data room instantly.', button: 'Sign NDA & Download OM' } },
  { type: 'image',    label: 'Property Photo',    icon: <Image size={13} />,    defaultContent: { url: '', caption: 'Property exterior' } },
  { type: 'contact',  label: 'Broker Contact',    icon: <Phone size={13} />,    defaultContent: { name: 'Shane Young & Dan Lewin', title: 'YoungLewin Advisors', phone: '(310) 555-0100', email: 'info@younglewi n.com' } },
  { type: 'map',      label: 'Location Map',      icon: <Link2 size={13} />,    defaultContent: { address: SUBJECT_PROPERTY.address } },
]

// ── Sortable Block Item ───────────────────────────────────────
function SortableBlock({
  block, onRemove, onToggle, onEdit,
}: {
  block: Block
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  onEdit: (id: string, key: string, value: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const [expanded, setExpanded] = useState(false)

  const meta = BLOCK_LIBRARY.find(b => b.type === block.type)

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{
        border: `1px solid ${block.visible ? 'rgba(197,150,58,0.25)' : 'rgba(197,150,58,0.08)'}`,
        backgroundColor: block.visible ? 'rgba(27,42,74,0.5)' : 'rgba(15,23,42,0.3)',
        marginBottom: 6,
        opacity: block.visible ? 1 : 0.5,
      }}>
        {/* Block header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
          <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'rgba(248,250,252,0.3)', display: 'flex' }} onClick={e => e.stopPropagation()}>
            <GripVertical size={14} />
          </div>
          <span style={{ color: GOLD }}>{meta?.icon}</span>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: block.visible ? OFF : 'rgba(248,250,252,0.4)' }}>{meta?.label}</span>
          <button onClick={e => { e.stopPropagation(); onToggle(block.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,250,252,0.4)', display: 'flex', padding: 2 }}>
            {block.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(block.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', display: 'flex', padding: 2 }}>
            <Trash2 size={13} />
          </button>
        </div>

        {/* Editable fields */}
        {expanded && (
          <div style={{ padding: '0 10px 10px', borderTop: '1px solid rgba(197,150,58,0.1)' }}>
            {Object.entries(block.content).map(([key, value]) => (
              <div key={key} style={{ marginTop: 8 }}>
                <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.35)', display: 'block', marginBottom: 3 }}>{key}</label>
                {value.includes('\n') ? (
                  <textarea
                    value={value}
                    onChange={e => onEdit(block.id, key, e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: '6px 8px', fontSize: 11, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={e => onEdit(block.id, key, e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: 11, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Live Preview Block Renderer ───────────────────────────────
function BlockPreview({ block }: { block: Block }) {
  if (!block.visible) return null
  const c = block.content

  switch (block.type) {
    case 'hero':
      return (
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${SLATE} 100%)`, padding: '40px 32px', textAlign: 'center', borderBottom: `3px solid ${GOLD}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: GOLD, marginBottom: 12 }}>{c.badge}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: OFF, marginBottom: 8 }}>{c.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(248,250,252,0.6)' }}>{c.subtitle}</div>
        </div>
      )
    case 'headline':
      return (
        <div style={{ padding: '28px 32px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: OFF, marginBottom: 12 }}>{c.heading}</div>
          <div style={{ fontSize: 12, color: 'rgba(248,250,252,0.65)', lineHeight: 1.7 }}>{c.body}</div>
        </div>
      )
    case 'metrics':
      return (
        <div style={{ padding: '20px 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[['Asking Price', c.price, GOLD], ['Cap Rate', c.cap, TEAL], ['Total Units', c.units, OFF], ['Building SF', c.sf, OFF]].map(([label, value, color]) => (
            <div key={label as string} style={{ padding: '12px 14px', backgroundColor: `${NAVY}80`, border: '1px solid rgba(197,150,58,0.15)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label as string}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: color as string }}>{value as string}</div>
            </div>
          ))}
        </div>
      )
    case 'bullets':
      return (
        <div style={{ padding: '20px 32px' }}>
          {c.items.split('\n').filter(Boolean).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, backgroundColor: GOLD, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.8)' }}>{item}</span>
            </div>
          ))}
        </div>
      )
    case 'cta':
      return (
        <div style={{ padding: '28px 32px', textAlign: 'center', backgroundColor: `${NAVY}60`, borderTop: '1px solid rgba(197,150,58,0.15)', borderBottom: '1px solid rgba(197,150,58,0.15)' }}>
          <Shield size={24} style={{ color: GOLD, marginBottom: 10 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: OFF, marginBottom: 8 }}>{c.heading}</div>
          <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.55)', marginBottom: 16 }}>{c.body}</div>
          <button style={{ padding: '12px 28px', backgroundColor: GOLD, color: SLATE, fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {c.button}
          </button>
        </div>
      )
    case 'contact':
      return (
        <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, backgroundColor: NAVY, border: `1px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={20} style={{ color: GOLD }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: OFF }}>{c.name}</div>
            <div style={{ fontSize: 11, color: GOLD }}>{c.title}</div>
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.5)', marginTop: 2 }}>{c.phone} · {c.email}</div>
          </div>
        </div>
      )
    default:
      return (
        <div style={{ padding: '16px 32px', fontSize: 11, color: 'rgba(248,250,252,0.4)', fontStyle: 'italic' }}>
          [{block.type} block]
        </div>
      )
  }
}

// ── NDA Submissions Panel ─────────────────────────────────────
interface NDASubmission {
  id: string
  first_name: string
  last_name: string
  email: string
  company?: string
  agreed_at: string
  om_sent_at?: string
}

function NDAPanel({ propertyId: _propertyId }: { propertyId: string }) {
  const [submissions] = useState<NDASubmission[]>([
    { id: '1', first_name: 'John', last_name: 'Smith', email: 'john.smith@equitygroup.com', company: 'Equity Group Partners', agreed_at: new Date(Date.now() - 86400000 * 2).toISOString(), om_sent_at: new Date(Date.now() - 86400000 * 2 + 3000).toISOString() },
    { id: '2', first_name: 'Maria', last_name: 'Chen', email: 'mchen@westcoastcap.com', company: 'West Coast Capital', agreed_at: new Date(Date.now() - 86400000).toISOString(), om_sent_at: new Date(Date.now() - 86400000 + 5000).toISOString() },
    { id: '3', first_name: 'Robert', last_name: 'Davis', email: 'rdavis@privatemail.com', company: undefined, agreed_at: new Date(Date.now() - 3600000).toISOString(), om_sent_at: undefined },
  ])
  const [sending, setSending] = useState<string | null>(null)

  const handleSendOM = async (sub: NDASubmission) => {
    setSending(sub.id)
    // Simulate sending
    await new Promise(r => setTimeout(r, 1500))
    setSending(null)
  }

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.4)', marginBottom: 12 }}>
        NDA Submissions ({submissions.length})
      </div>
      {submissions.map(sub => (
        <div key={sub.id} style={{ padding: '10px 12px', marginBottom: 6, border: '1px solid rgba(197,150,58,0.15)', backgroundColor: 'rgba(15,23,42,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: OFF }}>{sub.first_name} {sub.last_name}</div>
              {sub.company && <div style={{ fontSize: 10, color: GOLD }}>{sub.company}</div>}
              <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.45)', marginTop: 1 }}>{sub.email}</div>
              <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.3)', marginTop: 4 }}>
                Signed: {new Date(sub.agreed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {sub.om_sent_at ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#22C55E' }}>
                  <CheckCircle size={10} /> OM Sent
                </div>
              ) : (
                <button
                  onClick={() => handleSendOM(sub)}
                  disabled={sending === sub.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 9, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: `1px solid ${GOLD}50`, backgroundColor: `${GOLD}12`, color: GOLD, textTransform: 'uppercase' }}
                >
                  {sending === sub.id ? <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={9} />}
                  Send OM
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tracking Tokens Panel ─────────────────────────────────────
function TrackingPanel() {
  const [copied, setCopied] = useState<string | null>(null)

  const tokens = [
    { token: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', email: 'john.smith@equitygroup.com', opens: 3, last_opened: new Date(Date.now() - 7200000).toISOString() },
    { token: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1', email: 'mchen@westcoastcap.com', opens: 7, last_opened: new Date(Date.now() - 1800000).toISOString() },
    { token: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', email: 'rdavis@privatemail.com', opens: 0, last_opened: undefined },
  ]

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/track/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.4)', marginBottom: 12 }}>
        Read Tracking Tokens
      </div>
      {tokens.map(t => (
        <div key={t.token} style={{ padding: '10px 12px', marginBottom: 6, border: `1px solid ${t.opens > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(197,150,58,0.1)'}`, backgroundColor: 'rgba(15,23,42,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: OFF, fontWeight: 600 }}>{t.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.opens > 0 ? '#22C55E' : 'rgba(248,250,252,0.3)' }}>
                {t.opens} open{t.opens !== 1 ? 's' : ''}
              </span>
              <button onClick={() => copyToken(t.token)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === t.token ? '#22C55E' : 'rgba(248,250,252,0.4)', display: 'flex' }}>
                {copied === t.token ? <CheckCircle size={11} /> : <Copy size={11} />}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(248,250,252,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            /track/{t.token.slice(0, 20)}…
          </div>
          {t.last_opened && (
            <div style={{ fontSize: 9, color: '#22C55E', marginTop: 3 }}>
              Last opened: {new Date(t.last_opened).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function FunnelBuilderPage() {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 'b1', type: 'hero',     content: BLOCK_LIBRARY[0].defaultContent, visible: true },
    { id: 'b2', type: 'metrics',  content: BLOCK_LIBRARY[2].defaultContent, visible: true },
    { id: 'b3', type: 'headline', content: BLOCK_LIBRARY[1].defaultContent, visible: true },
    { id: 'b4', type: 'bullets',  content: BLOCK_LIBRARY[3].defaultContent, visible: true },
    { id: 'b5', type: 'cta',      content: BLOCK_LIBRARY[4].defaultContent, visible: true },
    { id: 'b6', type: 'contact',  content: BLOCK_LIBRARY[6].defaultContent, visible: true },
  ])
  const [activeTab, setActiveTab] = useState<'builder' | 'nda' | 'tracking'>('builder')
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished]   = useState(false)
  const [slug] = useState('naples-island-fourplex')

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

  const addBlock = (type: BlockType) => {
    const meta = BLOCK_LIBRARY.find(b => b.type === type)!
    setBlocks(prev => [...prev, { id: `b${Date.now()}`, type, content: { ...meta.defaultContent }, visible: true }])
  }

  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id))
  const toggleBlock = (id: string) => setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b))
  const editBlock   = (id: string, key: string, value: string) => setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, [key]: value } } : b))

  const handlePublish = async () => {
    setPublishing(true)
    await new Promise(r => setTimeout(r, 1500))
    setPublishing(false)
    setPublished(true)
  }

  const tabs = [
    { key: 'builder',  label: 'Page Builder', icon: <Settings size={12} /> },
    { key: 'nda',      label: 'NDA Submissions', icon: <Shield size={12} /> },
    { key: 'tracking', label: 'Read Tracking', icon: <Eye size={12} /> },
  ] as const

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: SLATE, fontFamily: 'Inter', overflow: 'hidden' }}>

      {/* Left Panel */}
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid rgba(197,150,58,0.2)', display: 'flex', flexDirection: 'column', backgroundColor: `${NAVY}50` }}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(197,150,58,0.2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Shield size={15} style={{ color: GOLD }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD }}>E-NDA Funnel Builder</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)' }}>Drag-and-drop · NDA gate · Read tracking</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(197,150,58,0.15)', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '8px 4px', fontSize: 9, fontWeight: 700,
                fontFamily: 'Inter', cursor: 'pointer', border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${GOLD}` : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.key ? GOLD : 'rgba(248,250,252,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {activeTab === 'builder' && (
            <>
              {/* Add Block Library */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.35)', marginBottom: 8 }}>Add Block</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {BLOCK_LIBRARY.map(b => (
                    <button
                      key={b.type}
                      onClick={() => addBlock(b.type)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px', fontSize: 10, fontWeight: 600, fontFamily: 'Inter', cursor: 'pointer', border: '1px solid rgba(197,150,58,0.2)', backgroundColor: 'rgba(15,23,42,0.4)', color: 'rgba(248,250,252,0.6)', textAlign: 'left' }}
                    >
                      <span style={{ color: GOLD }}>{b.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sortable Block List */}
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.35)', marginBottom: 8 }}>
                Page Blocks ({blocks.length})
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map(block => (
                    <SortableBlock key={block.id} block={block} onRemove={removeBlock} onToggle={toggleBlock} onEdit={editBlock} />
                  ))}
                </SortableContext>
              </DndContext>
            </>
          )}

          {activeTab === 'nda' && <NDAPanel propertyId={SUBJECT_PROPERTY.id} />}
          {activeTab === 'tracking' && <TrackingPanel />}
        </div>

        {/* Publish Footer */}
        <div style={{ padding: 14, borderTop: '1px solid rgba(197,150,58,0.2)', flexShrink: 0 }}>
          {published && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', marginBottom: 10, backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 10, color: '#22C55E' }}>
              <CheckCircle size={11} /> Live at /{slug}
              <button onClick={() => {}} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#22C55E', display: 'flex' }}>
                <ExternalLink size={11} />
              </button>
            </div>
          )}
          <button
            onClick={handlePublish}
            disabled={publishing}
            style={{ width: '100%', padding: '9px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', backgroundColor: GOLD, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {publishing ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</> : <><ExternalLink size={12} /> {published ? 'Update Page' : 'Publish Page'}</>}
          </button>
        </div>
      </div>

      {/* Right Panel — Live Preview */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#111827' }}>
        {/* Preview header bar */}
        <div style={{ padding: '8px 16px', backgroundColor: SLATE, borderBottom: '1px solid rgba(197,150,58,0.15)', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#EF4444', '#F59E0B', '#22C55E'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c }} />)}
          </div>
          <div style={{ flex: 1, padding: '3px 12px', backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(197,150,58,0.15)', fontSize: 10, color: 'rgba(248,250,252,0.4)', fontFamily: 'monospace' }}>
            younglewi n.com/listings/{slug}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.3)' }}>LIVE PREVIEW</div>
        </div>

        {/* Page preview */}
        <div style={{ maxWidth: 680, margin: '0 auto', backgroundColor: SLATE }}>
          {blocks.map(block => <BlockPreview key={block.id} block={block} />)}
          {blocks.filter(b => b.visible).length === 0 && (
            <div style={{ padding: '60px 32px', textAlign: 'center', color: 'rgba(248,250,252,0.3)', fontSize: 12 }}>
              Add blocks from the left panel to build your property page.
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
