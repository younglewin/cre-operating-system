import { useState } from 'react'
import { FileText, Download, Settings, BarChart2, Image, Users, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { generateOM } from '../lib/generateOM'
import { SUBJECT_PROPERTY, SALE_COMPS, RENT_COMPS } from '../lib/mockData'

const GOLD  = '#C5963A'
const TEAL  = '#3B9CB5'
const SLATE = '#0F172A'
const NAVY  = '#1B2A4A'
const OFF   = '#F8FAFC'

interface SlideToggle {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  enabled: boolean
}

export default function OMGeneratorPage() {
  const [docType, setDocType]     = useState<'om' | 'bov'>('om')
  const [generating, setGenerating] = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [slides, setSlides]       = useState<SlideToggle[]>([
    { id: 'cover',      label: 'Cover Slide',          icon: <Image size={13} />,    description: 'Hero image, property name, key metrics, NDA disclaimer', enabled: true },
    { id: 'exec',       label: 'Executive Summary',    icon: <FileText size={13} />, description: 'Investment highlights, property details table', enabled: true },
    { id: 'financials', label: 'Financial Analysis',   icon: <BarChart2 size={13} />,description: 'Pro forma income/expense, DSCR, CoC, NOI', enabled: true },
    { id: 'unitmix',    label: 'Unit Mix & Rents',     icon: <Settings size={13} />, description: 'Unit type table, rent comp market survey', enabled: true },
    { id: 'compchart',  label: 'Comp Charts',          icon: <BarChart2 size={13} />,description: 'Bar charts: Subject vs. Market Avg (Price/Unit, Cap Rate)', enabled: true },
    { id: 'comptable',  label: 'Comp Sales Table',     icon: <FileText size={13} />, description: 'Full comparable sales table with unit mix', enabled: true },
    { id: 'photos',     label: 'Photo Grid',           icon: <Image size={13} />,    description: 'Comp property photos from Supabase Storage', enabled: true },
    { id: 'bios',       label: 'Broker Bios',          icon: <Users size={13} />,    description: 'Shane Young & Dan Lewin bios and contact info', enabled: true },
    { id: 'disclaimer', label: 'Disclaimer',           icon: <FileText size={13} />, description: 'Confidentiality notice and legal disclaimer', enabled: true },
  ])

  const toggleSlide = (id: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setDone(false)
    setError(null)
    try {
      await generateOM({
        property: SUBJECT_PROPERTY,
        saleComps: SALE_COMPS,
        rentComps: RENT_COMPS,
        type: docType,
      })
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const enabledCount = slides.filter(s => s.enabled).length

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: SLATE, fontFamily: 'Inter', overflow: 'hidden' }}>

      {/* Left Panel — Configuration */}
      <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid rgba(197,150,58,0.2)', overflowY: 'auto', backgroundColor: `${NAVY}60` }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(197,150,58,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <FileText size={16} style={{ color: GOLD }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD }}>OM / BOV Generator</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)' }}>Institutional-grade PPTX — powered by pptxgenjs</div>
        </div>

        <div style={{ padding: 20 }}>

          {/* Document Type */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.4)', marginBottom: 10 }}>Document Type</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['om', 'bov'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  style={{
                    flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 700,
                    fontFamily: 'Inter', cursor: 'pointer', border: `1px solid ${docType === t ? GOLD : 'rgba(197,150,58,0.2)'}`,
                    backgroundColor: docType === t ? `${GOLD}18` : 'transparent',
                    color: docType === t ? GOLD : 'rgba(248,250,252,0.5)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}
                >
                  {t === 'om' ? 'Offering Memo' : 'BOV'}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Property */}
          <div style={{ marginBottom: 20, padding: '12px 14px', border: '1px solid rgba(197,150,58,0.2)', backgroundColor: 'rgba(15,23,42,0.5)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.35)', marginBottom: 8 }}>Subject Property</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: OFF, marginBottom: 2 }}>{SUBJECT_PROPERTY.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.5)', marginBottom: 8 }}>{SUBJECT_PROPERTY.address}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <div style={{ fontSize: 8, color: 'rgba(248,250,252,0.35)' }}>PRICE</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: 'rgba(248,250,252,0.35)' }}>CAP RATE</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{SUBJECT_PROPERTY.cap_rate?.toFixed(2)}%</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: 'rgba(248,250,252,0.35)' }}>UNITS</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: OFF }}>{SUBJECT_PROPERTY.num_units}</div>
              </div>
            </div>
          </div>

          {/* Comp data summary */}
          <div style={{ marginBottom: 20, padding: '10px 14px', border: '1px solid rgba(59,156,181,0.2)', backgroundColor: 'rgba(59,156,181,0.05)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEAL, marginBottom: 8 }}>Comp Data Loaded</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontSize: 8, color: 'rgba(248,250,252,0.35)' }}>SALE COMPS</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>{SALE_COMPS.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: 'rgba(248,250,252,0.35)' }}>RENT COMPS</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEAL }}>{RENT_COMPS.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: 'rgba(248,250,252,0.35)' }}>PHOTOS</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: OFF }}>{[...SALE_COMPS, ...RENT_COMPS].filter(c => c.photo_url).length}</div>
              </div>
            </div>
          </div>

          {/* Slide Toggles */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.4)', marginBottom: 10 }}>
              Slides ({enabledCount}/{slides.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {slides.map((slide, i) => (
                <div
                  key={slide.id}
                  onClick={() => toggleSlide(slide.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
                    cursor: 'pointer',
                    border: `1px solid ${slide.enabled ? 'rgba(197,150,58,0.25)' : 'rgba(197,150,58,0.08)'}`,
                    backgroundColor: slide.enabled ? 'rgba(197,150,58,0.06)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{
                      width: 14, height: 14, border: `1px solid ${slide.enabled ? GOLD : 'rgba(197,150,58,0.3)'}`,
                      backgroundColor: slide.enabled ? GOLD : 'transparent', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {slide.enabled && <CheckCircle size={9} style={{ color: SLATE }} />}
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(248,250,252,0.35)' }}>{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{ color: slide.enabled ? GOLD : 'rgba(248,250,252,0.3)' }}>{slide.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: slide.enabled ? OFF : 'rgba(248,250,252,0.35)' }}>{slide.label}</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.3)', lineHeight: 1.4 }}>{slide.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Right Panel — Preview & Generate */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Preview Card */}
        <div style={{ width: '100%', maxWidth: 720 }}>

          {/* Document preview header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: OFF, marginBottom: 4 }}>
              {docType === 'om' ? 'Offering Memorandum' : 'Broker Opinion of Value'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(248,250,252,0.45)' }}>
              {enabledCount} slides · YoungLewin Advisors brand · pptxgenjs · PPTX format
            </div>
          </div>

          {/* Slide deck preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {slides.filter(s => s.enabled).map((slide, i) => (
              <div key={slide.id} style={{ padding: '14px 16px', backgroundColor: `${NAVY}80`, border: '1px solid rgba(197,150,58,0.15)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, color: 'rgba(248,250,252,0.25)', fontWeight: 700 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ color: GOLD, marginBottom: 6 }}>{slide.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: OFF, marginBottom: 2 }}>{slide.label}</div>
                <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.35)', lineHeight: 1.4 }}>{slide.description}</div>
                {/* Mini slide preview bar */}
                <div style={{ marginTop: 10, height: 3, backgroundColor: 'rgba(197,150,58,0.1)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', backgroundColor: GOLD, opacity: 0.4 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Market averages preview */}
          <div style={{ padding: '16px 20px', border: '1px solid rgba(59,156,181,0.2)', backgroundColor: 'rgba(59,156,181,0.05)', marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEAL, marginBottom: 12 }}>
              Comp Chart Data Preview — Subject vs. Market Average
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {(() => {
                const validComps = SALE_COMPS.filter(c => c.price != null)
                const avgPrice     = validComps.length ? validComps.reduce((s, c) => s + (c.price ?? 0), 0) / validComps.length : 0
                const avgCapRate   = validComps.length ? validComps.reduce((s, c) => s + (c.cap_rate ?? 0), 0) / validComps.length : 0
                const avgPriceUnit = validComps.length ? validComps.reduce((s, c) => s + (c.price_per_unit ?? 0), 0) / validComps.length : 0
                return [
                  { label: 'Subject Price',    subj: `$${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()}`,         avg: `$${Math.round(avgPrice).toLocaleString()}` },
                  { label: 'Cap Rate',         subj: `${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}%`,                  avg: `${avgCapRate.toFixed(2)}%` },
                  { label: 'Price / Unit',     subj: `$${(SUBJECT_PROPERTY.price_per_unit ?? 0).toLocaleString()}`, avg: `$${Math.round(avgPriceUnit).toLocaleString()}` },
                  { label: 'Comps Used',       subj: `${SALE_COMPS.length} Sale`,                                  avg: `${RENT_COMPS.length} Rent` },
                ].map(({ label, subj, avg }) => (
                  <div key={label}>
                    <div style={{ fontSize: 8, color: 'rgba(248,250,252,0.35)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>{subj}</div>
                    <div style={{ fontSize: 10, color: TEAL }}>Avg: {avg}</div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#EF4444' }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Success */}
          {done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 16, backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#22C55E' }}>
              <CheckCircle size={14} /> PPTX downloaded successfully — check your Downloads folder.
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || enabledCount === 0}
            style={{
              width: '100%', padding: '14px 0', fontSize: 13, fontWeight: 800,
              fontFamily: 'Inter', cursor: generating ? 'wait' : 'pointer',
              border: 'none', backgroundColor: generating ? 'rgba(197,150,58,0.4)' : GOLD,
              color: SLATE, textTransform: 'uppercase', letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: enabledCount === 0 ? 0.5 : 1,
            }}
          >
            {generating ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating {enabledCount}-Slide {docType.toUpperCase()}…</>
            ) : (
              <><Download size={16} /> Generate & Download {docType.toUpperCase()} ({enabledCount} Slides)</>
            )}
          </button>

          <div style={{ marginTop: 12, fontSize: 10, color: 'rgba(248,250,252,0.3)', textAlign: 'center' }}>
            File will be saved as: <span style={{ color: 'rgba(248,250,252,0.5)', fontFamily: 'monospace' }}>{SUBJECT_PROPERTY.name.replace(/[^a-zA-Z0-9]/g, '_')}_{docType.toUpperCase()}_YoungLewin.pptx</span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
