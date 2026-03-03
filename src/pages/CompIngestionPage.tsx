import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, Table2, CheckCircle, XCircle, AlertCircle,
  ChevronRight, RefreshCw, Download, Trash2, Play, Eye, X,
  ArrowRight, Database, Zap, MapPin, DollarSign
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CsvRow { [key: string]: string }

interface FieldMapping {
  csvColumn: string
  dbField: string
  transform?: 'number' | 'date' | 'text' | 'latlon'
}

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

// ─── DB Field Definitions ─────────────────────────────────────────────────────
const COMP_DB_FIELDS = [
  { key: 'skip',             label: '— Skip —',          type: 'skip' },
  // Core
  { key: 'address',          label: 'Address',            type: 'text' },
  { key: 'city',             label: 'City',               type: 'text' },
  { key: 'state',            label: 'State',              type: 'text' },
  { key: 'zip_code',         label: 'Zip Code',           type: 'text' },
  { key: 'latitude',         label: 'Latitude',           type: 'number' },
  { key: 'longitude',        label: 'Longitude',          type: 'number' },
  // Property
  { key: 'name',             label: 'Property Name',      type: 'text' },
  { key: 'property_type',    label: 'Property Type',      type: 'text' },
  { key: 'num_units',        label: '# Units',            type: 'number' },
  { key: 'year_built',       label: 'Year Built',         type: 'number' },
  { key: 'building_sf',      label: 'Building SF',        type: 'number' },
  { key: 'lot_sf',           label: 'Lot SF',             type: 'number' },
  { key: 'stories',          label: 'Stories',            type: 'number' },
  // Financials
  { key: 'price',            label: 'Sale Price',         type: 'number' },
  { key: 'price_per_unit',   label: 'Price/Unit',         type: 'number' },
  { key: 'price_per_sf',     label: 'Price/SF',           type: 'number' },
  { key: 'cap_rate',         label: 'Cap Rate (%)',        type: 'number' },
  { key: 'grm',              label: 'GRM',                type: 'number' },
  { key: 'noi',              label: 'NOI',                type: 'number' },
  { key: 'gross_income',     label: 'Gross Income',       type: 'number' },
  // Rent
  { key: 'avg_rent',         label: 'Avg Rent/Unit',      type: 'number' },
  { key: 'avg_rent_per_sf',  label: 'Avg Rent/SF',        type: 'number' },
  // Sale
  { key: 'close_date',       label: 'Close Date',         type: 'date' },
  { key: 'days_on_market',   label: 'Days on Market',     type: 'number' },
  { key: 'comp_type',        label: 'Comp Type (sale/rent)', type: 'text' },
  { key: 'source',           label: 'Source',             type: 'text' },
  { key: 'notes',            label: 'Notes',              type: 'text' },
]

// ─── Auto-Detect Column Mapping ───────────────────────────────────────────────
const FIELD_ALIASES: Record<string, string[]> = {
  address:       ['address', 'street', 'property address', 'addr'],
  city:          ['city', 'municipality'],
  state:         ['state', 'st'],
  zip_code:      ['zip', 'zip code', 'postal', 'postal code'],
  latitude:      ['lat', 'latitude'],
  longitude:     ['lon', 'lng', 'longitude', 'long'],
  name:          ['name', 'property name', 'building name'],
  property_type: ['type', 'property type', 'asset type', 'asset class'],
  num_units:     ['units', 'num units', '# units', 'unit count', 'number of units'],
  year_built:    ['year built', 'yr built', 'built', 'year'],
  building_sf:   ['building sf', 'bldg sf', 'gla', 'gross sf', 'building sqft', 'sqft'],
  lot_sf:        ['lot sf', 'lot size', 'land sf', 'lot sqft'],
  price:         ['price', 'sale price', 'sold price', 'close price', 'sales price'],
  price_per_unit:['price/unit', 'ppu', 'price per unit'],
  price_per_sf:  ['price/sf', 'ppsf', 'price per sf', 'price per sqft'],
  cap_rate:      ['cap rate', 'cap', 'capitalization rate', 'cap%'],
  grm:           ['grm', 'gross rent multiplier'],
  noi:           ['noi', 'net operating income'],
  gross_income:  ['gross income', 'gpi', 'gross potential income', 'egi'],
  avg_rent:      ['avg rent', 'average rent', 'rent', 'monthly rent'],
  avg_rent_per_sf:['rent/sf', 'rent per sf', 'avg rent/sf'],
  close_date:    ['close date', 'sale date', 'sold date', 'recording date', 'date'],
  days_on_market:['dom', 'days on market', 'days'],
  comp_type:     ['comp type', 'type', 'category'],
  source:        ['source', 'data source', 'mls', 'costar'],
  notes:         ['notes', 'comments', 'remarks'],
}

function autoDetectMapping(csvColumns: string[]): FieldMapping[] {
  return csvColumns.map(col => {
    const colLower = col.toLowerCase().trim()
    for (const [dbField, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some(a => colLower === a || colLower.includes(a))) {
        const fieldDef = COMP_DB_FIELDS.find(f => f.key === dbField)
        return { csvColumn: col, dbField, transform: fieldDef?.type as FieldMapping['transform'] }
      }
    }
    return { csvColumn: col, dbField: 'skip', transform: 'text' }
  })
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current.trim()); current = ''
      } else {
        current += line[i]
      }
    }
    result.push(current.trim())
    return result
  }
  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line)
    const row: CsvRow = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  }).filter(r => Object.values(r).some(v => v))
  return { headers, rows }
}

// ─── Transform Value ──────────────────────────────────────────────────────────
function transformValue(val: string, type?: string): string | number | null {
  if (!val || val.trim() === '' || val === 'N/A' || val === '-') return null
  if (type === 'number') {
    const cleaned = val.replace(/[$,%\s]/g, '')
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }
  if (type === 'date') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
  }
  return val.trim() || null
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step, current }: { step: number; current: number }) {
  const steps = ['Upload CSV', 'Map Columns', 'Preview', 'Import']
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const num = i + 1
        const done = num < current
        const active = num === current
        return (
          <div key={num} className="flex items-center">
            <div className="flex items-center gap-2 px-3 py-2">
              <div
                className="w-6 h-6 flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: done ? '#22c55e' : active ? '#C5963A' : 'rgba(248,250,252,0.08)',
                  color: done || active ? '#0F172A' : 'rgba(248,250,252,0.3)',
                }}
              >
                {done ? <CheckCircle size={12} /> : num}
              </div>
              <span className="text-xs font-medium" style={{ color: active ? '#F8FAFC' : 'rgba(248,250,252,0.35)' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={12} style={{ color: 'rgba(248,250,252,0.2)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompIngestionPage() {
  const [step, setStep] = useState(1)
  const [csvText, setCsvText] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [compType, setCompType] = useState<'sale' | 'rent'>('sale')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setCsvText(text)
      const { headers: h, rows: r } = parseCsv(text)
      setHeaders(h)
      setRows(r)
      setMappings(autoDetectMapping(h))
      setStep(2)
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
  }, [])

  const updateMapping = (csvCol: string, dbField: string) => {
    const fieldDef = COMP_DB_FIELDS.find(f => f.key === dbField)
    setMappings(ms => ms.map(m =>
      m.csvColumn === csvCol ? { ...m, dbField, transform: fieldDef?.type as FieldMapping['transform'] } : m
    ))
  }

  const mappedCount = mappings.filter(m => m.dbField !== 'skip').length

  const buildRecord = (row: CsvRow): Record<string, unknown> => {
    const rec: Record<string, unknown> = { comp_type: compType }
    for (const m of mappings) {
      if (m.dbField === 'skip') continue
      const val = row[m.csvColumn] ?? ''
      rec[m.dbField] = transformValue(val, m.transform)
    }
    // Auto-derive price_per_unit if not mapped
    if (!rec.price_per_unit && rec.price && rec.num_units) {
      const p = rec.price as number, u = rec.num_units as number
      if (p && u) rec.price_per_unit = Math.round(p / u)
    }
    return rec
  }

  const runImport = async () => {
    setImporting(true)
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const teamId = teamData?.id
    const errors: string[] = []
    let imported = 0
    let skipped = 0

    for (let i = 0; i < rows.length; i++) {
      const rec = buildRecord(rows[i])
      if (!rec.address && !rec.name) { skipped++; continue }
      const { error } = await supabase.from('comparables').insert({ ...rec, team_id: teamId })
      if (error) { errors.push(`Row ${i + 2}: ${error.message}`); skipped++ }
      else imported++
    }

    setResult({ total: rows.length, imported, skipped, errors })
    setStep(4)
    setImporting(false)
  }

  const reset = () => {
    setStep(1); setCsvText(''); setHeaders([]); setRows([])
    setMappings([]); setResult(null)
  }

  // ── Step 1: Upload ──────────────────────────────────────────────────────────
  const renderUpload = () => (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-12">
      <div className="w-full max-w-2xl">
        {/* Drop Zone */}
        <div
          className="border-2 border-dashed flex flex-col items-center justify-center py-16 cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? '#C5963A' : 'rgba(197,150,58,0.25)',
            backgroundColor: dragOver ? 'rgba(197,150,58,0.05)' : 'rgba(27,42,74,0.3)',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={40} style={{ color: dragOver ? '#C5963A' : 'rgba(248,250,252,0.2)' }} />
          <div className="mt-4 text-sm font-semibold" style={{ color: dragOver ? '#C5963A' : 'rgba(248,250,252,0.6)' }}>
            Drop your CSV file here
          </div>
          <div className="mt-1 text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>
            or click to browse — CoStar, LoopNet, MLS, or custom exports
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Comp Type */}
        <div className="mt-6 flex items-center gap-4">
          <span className="text-xs font-semibold" style={{ color: 'rgba(248,250,252,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9px' }}>Comp Type</span>
          {(['sale', 'rent'] as const).map(t => (
            <button
              key={t}
              onClick={() => setCompType(t)}
              className="px-4 py-2 text-xs font-semibold capitalize transition-all"
              style={{
                backgroundColor: compType === t ? (t === 'sale' ? 'rgba(197,150,58,0.2)' : 'rgba(59,156,181,0.2)') : 'rgba(248,250,252,0.05)',
                color: compType === t ? (t === 'sale' ? '#C5963A' : '#3B9CB5') : 'rgba(248,250,252,0.4)',
                border: `1px solid ${compType === t ? (t === 'sale' ? 'rgba(197,150,58,0.4)' : 'rgba(59,156,181,0.4)') : 'rgba(248,250,252,0.08)'}`,
              }}
            >
              {t === 'sale' ? '🏷 Sale Comp' : '🏠 Rent Comp'}
            </button>
          ))}
        </div>

        {/* Format Guide */}
        <div className="mt-6 p-4" style={{ backgroundColor: 'rgba(27,42,74,0.5)', border: '1px solid rgba(248,250,252,0.06)' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: 'rgba(248,250,252,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Supported Column Names (auto-detected)</div>
          <div className="grid grid-cols-3 gap-1 text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>
            {['Address', 'City', 'Zip Code', 'Sale Price', '# Units', 'Cap Rate', 'GRM', 'Year Built', 'Close Date', 'NOI', 'Avg Rent', 'Source'].map(f => (
              <div key={f} className="flex items-center gap-1">
                <CheckCircle size={9} style={{ color: '#22c55e' }} /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Step 2: Map Columns ─────────────────────────────────────────────────────
  const renderMapping = () => (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>Column Mapping</div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.4)' }}>
            {rows.length} rows detected · {mappedCount} of {headers.length} columns mapped
          </div>
        </div>
        <button
          onClick={() => setStep(3)}
          disabled={mappedCount === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
          style={{ backgroundColor: mappedCount > 0 ? '#C5963A' : 'rgba(197,150,58,0.3)', color: '#0F172A' }}
        >
          Preview <ArrowRight size={12} />
        </button>
      </div>

      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4 px-3 py-2 text-xs font-semibold" style={{ color: 'rgba(248,250,252,0.3)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <div>CSV Column</div>
          <div>Maps To</div>
          <div>Sample Values</div>
        </div>

        {mappings.map(m => {
          const isMapped = m.dbField !== 'skip'
          const samples = rows.slice(0, 3).map(r => r[m.csvColumn]).filter(Boolean)
          return (
            <div
              key={m.csvColumn}
              className="grid grid-cols-3 gap-4 px-3 py-2 items-center"
              style={{
                backgroundColor: isMapped ? 'rgba(27,42,74,0.6)' : 'rgba(248,250,252,0.02)',
                border: `1px solid ${isMapped ? 'rgba(197,150,58,0.15)' : 'rgba(248,250,252,0.04)'}`,
              }}
            >
              {/* CSV Column */}
              <div className="flex items-center gap-2">
                {isMapped
                  ? <CheckCircle size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
                  : <XCircle size={12} style={{ color: 'rgba(248,250,252,0.2)', flexShrink: 0 }} />
                }
                <span className="text-xs font-medium truncate" style={{ color: isMapped ? '#F8FAFC' : 'rgba(248,250,252,0.4)' }}>
                  {m.csvColumn}
                </span>
              </div>

              {/* DB Field Selector */}
              <select
                className="text-xs border-none outline-none px-2 py-1"
                style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: isMapped ? '#C5963A' : 'rgba(248,250,252,0.3)', width: '100%' }}
                value={m.dbField}
                onChange={e => updateMapping(m.csvColumn, e.target.value)}
              >
                {COMP_DB_FIELDS.map(f => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>

              {/* Sample Values */}
              <div className="text-xs truncate" style={{ color: 'rgba(248,250,252,0.35)' }}>
                {samples.slice(0, 2).join(' · ') || '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Step 3: Preview ─────────────────────────────────────────────────────────
  const renderPreview = () => {
    const activeMappings = mappings.filter(m => m.dbField !== 'skip')
    const previewRows = rows.slice(0, 10)
    return (
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>Import Preview</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.4)' }}>
              Showing first {Math.min(10, rows.length)} of {rows.length} rows · {activeMappings.length} fields mapped
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 px-3 py-2 text-xs" style={{ color: 'rgba(248,250,252,0.5)', border: '1px solid rgba(248,250,252,0.1)' }}>
              ← Back
            </button>
            <button
              onClick={runImport}
              disabled={importing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              style={{ backgroundColor: '#C5963A', color: '#0F172A' }}
            >
              {importing ? <><RefreshCw size={12} className="animate-spin" /> Importing...</> : <><Play size={12} /> Import {rows.length} Comps</>}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'rgba(27,42,74,0.8)' }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</th>
                {activeMappings.map(m => (
                  <th key={m.csvColumn} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#C5963A', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {COMP_DB_FIELDS.find(f => f.key === m.dbField)?.label ?? m.dbField}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(248,250,252,0.04)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(27,42,74,0.2)' }}>
                  <td className="px-3 py-2" style={{ color: 'rgba(248,250,252,0.25)' }}>{i + 1}</td>
                  {activeMappings.map(m => {
                    const raw = row[m.csvColumn] ?? ''
                    const transformed = transformValue(raw, m.transform)
                    const isEmpty = transformed === null || transformed === ''
                    return (
                      <td key={m.csvColumn} className="px-3 py-2 whitespace-nowrap" style={{ color: isEmpty ? 'rgba(248,250,252,0.2)' : '#F8FAFC' }}>
                        {isEmpty ? '—' : String(transformed)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Step 4: Result ──────────────────────────────────────────────────────────
  const renderResult = () => (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-12">
      <div className="w-full max-w-lg">
        {/* Status */}
        <div className="flex flex-col items-center mb-8">
          {result && result.imported > 0
            ? <CheckCircle size={48} style={{ color: '#22c55e' }} />
            : <AlertCircle size={48} style={{ color: '#ef4444' }} />
          }
          <div className="text-xl font-bold mt-4" style={{ color: '#F8FAFC' }}>
            {result?.imported === result?.total ? 'Import Complete!' : 'Import Finished with Errors'}
          </div>
        </div>

        {/* Stats */}
        {result && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Rows', value: result.total, color: '#F8FAFC' },
              { label: 'Imported', value: result.imported, color: '#22c55e' },
              { label: 'Skipped', value: result.skipped, color: result.skipped > 0 ? '#ef4444' : 'rgba(248,250,252,0.3)' },
            ].map(s => (
              <div key={s.label} className="text-center py-4" style={{ backgroundColor: 'rgba(27,42,74,0.5)', border: '1px solid rgba(248,250,252,0.06)' }}>
                <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Errors */}
        {result && result.errors.length > 0 && (
          <div className="p-4 mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: '#ef4444' }}>Errors ({result.errors.length})</div>
            {result.errors.slice(0, 5).map((e, i) => (
              <div key={i} className="text-xs mb-1" style={{ color: 'rgba(248,250,252,0.5)' }}>{e}</div>
            ))}
            {result.errors.length > 5 && <div className="text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>+{result.errors.length - 5} more errors</div>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={reset} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold" style={{ border: '1px solid rgba(197,150,58,0.3)', color: '#C5963A' }}>
            <Upload size={12} /> Import Another File
          </button>
          <a href="#/comps" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold" style={{ backgroundColor: '#C5963A', color: '#0F172A' }}>
            <MapPin size={12} /> View in Deal Engine
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#F8FAFC' }}>Comp Ingestion</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.4)' }}>Import comps from CoStar, LoopNet, MLS, or any CSV source</p>
        </div>
        {step > 1 && (
          <button onClick={reset} className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>
            <Trash2 size={12} /> Start Over
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
        <StepIndicator step={step} current={step} />
      </div>

      {/* Content */}
      {step === 1 && renderUpload()}
      {step === 2 && renderMapping()}
      {step === 3 && renderPreview()}
      {step === 4 && renderResult()}
    </div>
  )
}
