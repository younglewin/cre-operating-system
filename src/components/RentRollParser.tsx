import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle,
  ChevronDown, RefreshCw, Download, Loader2, Info,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Brand tokens ─────────────────────────────────────────────
const NAVY   = '#1B2A4A'
const GOLD   = '#C5963A'
const TEAL   = '#3B9CB5'
const SLATE  = '#0F172A'
const OFF    = '#F8FAFC'

// ── Types ────────────────────────────────────────────────────
interface RawRow { [key: string]: string | number | null }

interface MappedRow {
  unit_number: string
  unit_type: string
  unit_sf: number | null
  tenant_name: string
  lease_start: string
  lease_end: string
  monthly_rent: number | null
  market_rent: number | null
  is_vacant: boolean
  notes: string
}

interface ColumnMapping {
  unit_number: string
  unit_type: string
  unit_sf: string
  tenant_name: string
  lease_start: string
  lease_end: string
  monthly_rent: string
  market_rent: string
  is_vacant: string
  notes: string
}

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  unit_number:  'Unit #',
  unit_type:    'Unit Type',
  unit_sf:      'Unit SF',
  tenant_name:  'Tenant Name',
  lease_start:  'Lease Start',
  lease_end:    'Lease End',
  monthly_rent: 'Monthly Rent',
  market_rent:  'Market Rent',
  is_vacant:    'Vacant?',
  notes:        'Notes',
}

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['unit_number', 'monthly_rent']

// ── Auto-mapping heuristics ───────────────────────────────────
const HEURISTICS: Record<keyof ColumnMapping, RegExp[]> = {
  unit_number:  [/unit\s*#?/i, /unit\s*no/i, /apt/i, /suite/i],
  unit_type:    [/type/i, /bed/i, /br/i, /layout/i, /floorplan/i],
  unit_sf:      [/sf/i, /sqft/i, /sq\s*ft/i, /size/i, /area/i],
  tenant_name:  [/tenant/i, /resident/i, /name/i, /occupant/i],
  lease_start:  [/start/i, /move\s*in/i, /from/i, /begin/i],
  lease_end:    [/end/i, /expir/i, /to\b/i, /thru/i],
  monthly_rent: [/rent/i, /monthly/i, /actual\s*rent/i, /contract/i],
  market_rent:  [/market/i, /asking/i, /scheduled/i],
  is_vacant:    [/vacant/i, /vacancy/i, /occupied/i, /status/i],
  notes:        [/note/i, /comment/i, /remark/i],
}

function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    unit_number: '', unit_type: '', unit_sf: '', tenant_name: '',
    lease_start: '', lease_end: '', monthly_rent: '', market_rent: '',
    is_vacant: '', notes: '',
  }
  for (const [field, patterns] of Object.entries(HEURISTICS) as [keyof ColumnMapping, RegExp[]][]) {
    for (const header of headers) {
      if (patterns.some(p => p.test(header))) {
        mapping[field] = header
        break
      }
    }
  }
  return mapping
}

// ── Parse helpers ─────────────────────────────────────────────
function parseNum(v: string | number | null): number | null {
  if (v == null || v === '') return null
  const s = String(v).replace(/[$,\s]/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseBool(v: string | number | null): boolean {
  if (v == null) return false
  const s = String(v).toLowerCase().trim()
  return ['vacant', 'yes', 'y', 'true', '1', 'v'].includes(s)
}

function parseDate(v: string | number | null): string {
  if (v == null || v === '') return ''
  // Excel serial number
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(v).trim()
  // Try to parse common date formats
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  return s
}

function applyMapping(rows: RawRow[], mapping: ColumnMapping): MappedRow[] {
  return rows.map(row => ({
    unit_number:  mapping.unit_number  ? String(row[mapping.unit_number]  ?? '').trim() : '',
    unit_type:    mapping.unit_type    ? String(row[mapping.unit_type]    ?? '').trim() : '',
    unit_sf:      mapping.unit_sf      ? parseNum(row[mapping.unit_sf])                 : null,
    tenant_name:  mapping.tenant_name  ? String(row[mapping.tenant_name]  ?? '').trim() : '',
    lease_start:  mapping.lease_start  ? parseDate(row[mapping.lease_start])             : '',
    lease_end:    mapping.lease_end    ? parseDate(row[mapping.lease_end])               : '',
    monthly_rent: mapping.monthly_rent ? parseNum(row[mapping.monthly_rent])             : null,
    market_rent:  mapping.market_rent  ? parseNum(row[mapping.market_rent])              : null,
    is_vacant:    mapping.is_vacant    ? parseBool(row[mapping.is_vacant])               : false,
    notes:        mapping.notes        ? String(row[mapping.notes]        ?? '').trim() : '',
  })).filter(r => r.unit_number !== '' || r.monthly_rent != null)
}

// ── GPR summary ───────────────────────────────────────────────
function calcGPR(rows: MappedRow[]) {
  const totalUnits = rows.length
  const vacantUnits = rows.filter(r => r.is_vacant).length
  const occupiedUnits = totalUnits - vacantUnits
  const gprMonthly = rows.reduce((s, r) => s + (r.market_rent ?? r.monthly_rent ?? 0), 0)
  const actualMonthly = rows.reduce((s, r) => s + (r.is_vacant ? 0 : (r.monthly_rent ?? 0)), 0)
  const occupancyRate = totalUnits > 0 ? occupiedUnits / totalUnits : 0
  return { totalUnits, vacantUnits, occupiedUnits, gprMonthly, gprAnnual: gprMonthly * 12, actualMonthly, actualAnnual: actualMonthly * 12, occupancyRate }
}

const fmt$ = (v: number) => `$${Math.round(v).toLocaleString()}`
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`

// ── Select component ──────────────────────────────────────────
function ColSelect({ value, onChange, headers }: { value: string; onChange: (v: string) => void; headers: string[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '5px 24px 5px 8px', fontSize: 11, fontFamily: 'Inter', color: value ? OFF : 'rgba(248,250,252,0.35)', backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', appearance: 'none', cursor: 'pointer', outline: 'none' }}
      >
        <option value="">— skip —</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <ChevronDown size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: 'rgba(248,250,252,0.4)', pointerEvents: 'none' }} />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
interface RentRollParserProps {
  propertyId?: string
  teamId?: string
  onImported?: (rows: MappedRow[], gpr: ReturnType<typeof calcGPR>) => void
}

export default function RentRollParser({ propertyId, teamId, onImported }: RentRollParserProps) {
  const [stage, setStage] = useState<'idle' | 'mapping' | 'preview' | 'importing' | 'done'>('idle')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({ unit_number: '', unit_type: '', unit_sf: '', tenant_name: '', lease_start: '', lease_end: '', monthly_rent: '', market_rent: '', is_vacant: '', notes: '' })
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── File parsing ──────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    setFileName(file.name)
    setImportError(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: null, raw: true })
        if (json.length === 0) { setImportError('The file appears to be empty.'); return }
        const hdrs = Object.keys(json[0])
        setHeaders(hdrs)
        setRawRows(json)
        setMapping(autoMap(hdrs))
        setStage('mapping')
      } catch (err) {
        setImportError('Could not parse file. Please upload a valid CSV or Excel file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  // ── Preview ───────────────────────────────────────────────
  const handlePreview = () => {
    const rows = applyMapping(rawRows, mapping)
    setMappedRows(rows)
    setStage('preview')
  }

  // ── Import to Supabase ────────────────────────────────────
  const handleImport = async () => {
    if (!propertyId || !teamId) {
      // Demo mode: just show success
      const gpr = calcGPR(mappedRows)
      setImportedCount(mappedRows.length)
      setStage('done')
      onImported?.(mappedRows, gpr)
      return
    }
    setStage('importing')
    setImportError(null)
    try {
      const payload = mappedRows.map(r => ({
        team_id: teamId,
        property_id: propertyId,
        unit_number: r.unit_number,
        unit_type: r.unit_type || null,
        unit_sf: r.unit_sf,
        tenant_name: r.tenant_name || null,
        lease_start: r.lease_start || null,
        lease_end: r.lease_end || null,
        monthly_rent: r.monthly_rent,
        market_rent: r.market_rent,
        is_vacant: r.is_vacant,
        notes: r.notes || null,
      }))

      const { error } = await supabase.from('rent_rolls').insert(payload)
      if (error) throw error

      const gpr = calcGPR(mappedRows)
      setImportedCount(mappedRows.length)
      setStage('done')
      onImported?.(mappedRows, gpr)
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
      setStage('preview')
    }
  }

  // ── Reset ─────────────────────────────────────────────────
  const reset = () => {
    setStage('idle'); setFileName(''); setHeaders([]); setRawRows([])
    setMappedRows([]); setImportError(null); setImportedCount(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const gpr = mappedRows.length > 0 ? calcGPR(mappedRows) : null

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: SLATE, fontFamily: 'Inter', color: OFF, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${GOLD}30`, backgroundColor: `${NAVY}80`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileSpreadsheet size={16} style={{ color: GOLD }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD }}>Rent Roll Parser</div>
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', marginTop: 1 }}>Upload CSV or Excel → Auto-map columns → Calculate GPR</div>
          </div>
        </div>
        {stage !== 'idle' && (
          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Inter', border: '1px solid rgba(248,250,252,0.15)', backgroundColor: 'transparent', color: 'rgba(248,250,252,0.5)' }}>
            <RefreshCw size={10} /> Reset
          </button>
        )}
      </div>

      <div style={{ padding: 20 }}>

        {/* ── STAGE: idle ── */}
        {stage === 'idle' && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? GOLD : 'rgba(197,150,58,0.3)'}`,
                backgroundColor: dragging ? `${GOLD}08` : 'rgba(15,23,42,0.4)',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = `${GOLD}06` }}
              onMouseLeave={e => { if (!dragging) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(15,23,42,0.4)' }}
            >
              <Upload size={28} style={{ color: dragging ? GOLD : 'rgba(197,150,58,0.4)', marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: dragging ? GOLD : OFF, marginBottom: 6 }}>
                {dragging ? 'Drop to upload' : 'Drag & drop your Rent Roll'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', marginBottom: 16 }}>
                Supports CSV, XLS, XLSX — any column order
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', border: `1px solid ${GOLD}50`, backgroundColor: `${GOLD}12`, color: GOLD, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <Upload size={12} /> Choose File
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }} onChange={handleFileInput} />

            {/* Sample format hint */}
            <div style={{ marginTop: 16, padding: '10px 14px', border: '1px solid rgba(59,156,181,0.2)', backgroundColor: `${TEAL}06` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Info size={11} style={{ color: TEAL }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: TEAL }}>Expected Column Headers (any order)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Unit #', 'Unit Type', 'Unit SF', 'Tenant Name', 'Lease Start', 'Lease End', 'Monthly Rent', 'Market Rent', 'Vacant?', 'Notes'].map(h => (
                  <span key={h} style={{ padding: '2px 7px', fontSize: 10, fontFamily: 'monospace', backgroundColor: 'rgba(59,156,181,0.1)', color: TEAL, border: '1px solid rgba(59,156,181,0.2)' }}>{h}</span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.3)', marginTop: 8 }}>The parser uses smart auto-detection — exact header names are not required.</div>
            </div>
          </div>
        )}

        {/* ── STAGE: mapping ── */}
        {stage === 'mapping' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', backgroundColor: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
              <FileSpreadsheet size={14} style={{ color: GOLD }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>{fileName}</div>
                <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)' }}>{rawRows.length} rows detected · {headers.length} columns</div>
              </div>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.4)', marginBottom: 12 }}>
              Map Your Columns → CRE OS Fields
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map(field => (
                <div key={field}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: REQUIRED_FIELDS.includes(field) ? GOLD : 'rgba(248,250,252,0.4)', fontFamily: 'Inter' }}>
                      {FIELD_LABELS[field]}
                    </label>
                    {REQUIRED_FIELDS.includes(field) && <span style={{ fontSize: 8, color: GOLD }}>★</span>}
                  </div>
                  <ColSelect value={mapping[field]} onChange={v => setMapping(prev => ({ ...prev, [field]: v }))} headers={headers} />
                </div>
              ))}
            </div>

            {importError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', marginBottom: 12, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#EF4444' }}>
                <AlertTriangle size={12} /> {importError}
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={!mapping.unit_number && !mapping.monthly_rent}
              style={{ width: '100%', padding: '10px', fontSize: 12, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', backgroundColor: GOLD, color: SLATE, letterSpacing: '0.05em', textTransform: 'uppercase' }}
            >
              Preview Import →
            </button>
          </div>
        )}

        {/* ── STAGE: preview ── */}
        {stage === 'preview' && gpr && (
          <div>
            {/* GPR Summary Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Total Units',     value: String(gpr.totalUnits),          color: OFF },
                { label: 'Occupancy',       value: fmtPct(gpr.occupancyRate),       color: gpr.occupancyRate >= 0.9 ? '#22C55E' : GOLD },
                { label: 'GPR (Annual)',    value: fmt$(gpr.gprAnnual),             color: GOLD },
                { label: 'Actual (Annual)', value: fmt$(gpr.actualAnnual),          color: TEAL },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '10px 12px', backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(197,150,58,0.15)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(248,250,252,0.4)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Vacancy loss */}
            {gpr.gprAnnual > gpr.actualAnnual && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 12, backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11 }}>
                <AlertTriangle size={11} style={{ color: '#EF4444', flexShrink: 0 }} />
                <span style={{ color: 'rgba(248,250,252,0.6)' }}>
                  Vacancy Loss: <strong style={{ color: '#EF4444' }}>{fmt$(gpr.gprAnnual - gpr.actualAnnual)}/yr</strong> ({gpr.vacantUnits} vacant unit{gpr.vacantUnits !== 1 ? 's' : ''})
                </span>
              </div>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto', marginBottom: 16, border: '1px solid rgba(197,150,58,0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(197,150,58,0.2)', backgroundColor: `${NAVY}80` }}>
                    {['Unit #', 'Type', 'SF', 'Tenant', 'Lease End', 'Rent/Mo', 'Market', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(248,250,252,0.4)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(197,150,58,0.06)', backgroundColor: row.is_vacant ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: OFF }}>{row.unit_number || '—'}</td>
                      <td style={{ padding: '7px 10px', color: 'rgba(248,250,252,0.7)' }}>{row.unit_type || '—'}</td>
                      <td style={{ padding: '7px 10px', color: 'rgba(248,250,252,0.7)' }}>{row.unit_sf ?? '—'}</td>
                      <td style={{ padding: '7px 10px', color: 'rgba(248,250,252,0.7)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.tenant_name || '—'}</td>
                      <td style={{ padding: '7px 10px', color: 'rgba(248,250,252,0.5)', fontSize: 10 }}>{row.lease_end || '—'}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 700, color: GOLD }}>{row.monthly_rent != null ? fmt$(row.monthly_rent) : '—'}</td>
                      <td style={{ padding: '7px 10px', color: 'rgba(248,250,252,0.5)' }}>{row.market_rent != null ? fmt$(row.market_rent) : '—'}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ padding: '2px 6px', fontSize: 9, fontWeight: 700, backgroundColor: row.is_vacant ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)', color: row.is_vacant ? '#EF4444' : '#22C55E', border: `1px solid ${row.is_vacant ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.25)'}` }}>
                          {row.is_vacant ? 'VACANT' : 'OCCUPIED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', marginBottom: 12, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#EF4444' }}>
                <AlertTriangle size={12} /> {importError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStage('mapping')} style={{ flex: 1, padding: '9px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: '1px solid rgba(197,150,58,0.3)', backgroundColor: 'transparent', color: GOLD, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ← Re-map
              </button>
              <button onClick={handleImport} style={{ flex: 2, padding: '9px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', backgroundColor: GOLD, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={13} />
                {propertyId ? `Import ${mappedRows.length} Units to Database` : `Confirm ${mappedRows.length} Units`}
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE: importing ── */}
        {stage === 'importing' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loader2 size={32} style={{ color: GOLD, animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: OFF }}>Importing Rent Roll…</div>
            <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', marginTop: 6 }}>Writing {mappedRows.length} units to database</div>
          </div>
        )}

        {/* ── STAGE: done ── */}
        {stage === 'done' && gpr && (
          <div>
            <div style={{ textAlign: 'center', padding: '24px 20px 20px', borderBottom: '1px solid rgba(197,150,58,0.15)', marginBottom: 20 }}>
              <CheckCircle size={32} style={{ color: '#22C55E', marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: OFF }}>{importedCount} Units Imported</div>
              <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', marginTop: 4 }}>Rent roll saved to database</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Units',          value: String(gpr.totalUnits),           color: OFF },
                { label: 'Occupancy Rate',        value: fmtPct(gpr.occupancyRate),        color: gpr.occupancyRate >= 0.9 ? '#22C55E' : GOLD },
                { label: 'GPR Monthly',           value: fmt$(gpr.gprMonthly),             color: GOLD },
                { label: 'GPR Annual',            value: fmt$(gpr.gprAnnual),              color: GOLD },
                { label: 'Actual Income Monthly', value: fmt$(gpr.actualMonthly),          color: TEAL },
                { label: 'Actual Income Annual',  value: fmt$(gpr.actualAnnual),           color: TEAL },
                { label: 'Vacancy Loss Monthly',  value: fmt$(gpr.gprMonthly - gpr.actualMonthly), color: gpr.gprMonthly > gpr.actualMonthly ? '#EF4444' : '#22C55E' },
                { label: 'Vacant Units',          value: String(gpr.vacantUnits),          color: gpr.vacantUnits > 0 ? '#EF4444' : '#22C55E' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '10px 12px', backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(197,150,58,0.12)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(248,250,252,0.4)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>

            <button onClick={reset} style={{ width: '100%', padding: '9px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: `1px solid ${GOLD}40`, backgroundColor: `${GOLD}10`, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Upload Another Rent Roll
            </button>
          </div>
        )}

      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
