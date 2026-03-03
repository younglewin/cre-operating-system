import { useState, useRef, useCallback } from 'react'
import {
  Upload, Download, ChevronRight, CheckCircle, AlertCircle,
  RefreshCw, X, Plus, Building2, Home, DollarSign,
  ArrowRight, Link2
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Schema Definitions ───────────────────────────────────────────────────────
const SALE_SCHEMA = [
  { key:'address',        label:'Address',          required:true,  type:'text',   hint:'Street address' },
  { key:'city',           label:'City',             required:true,  type:'text',   hint:'City name' },
  { key:'state',          label:'State',            required:false, type:'text',   hint:'Two-letter state code' },
  { key:'zip_code',       label:'ZIP Code',         required:false, type:'text',   hint:'5-digit ZIP' },
  { key:'sale_price',     label:'Sale Price',       required:true,  type:'number', hint:'Closed sale price in dollars' },
  { key:'close_date',     label:'Close Date',       required:true,  type:'date',   hint:'YYYY-MM-DD or MM/DD/YYYY' },
  { key:'units',          label:'Units',            required:true,  type:'number', hint:'Number of residential units' },
  { key:'sqft',           label:'Sq Ft',            required:false, type:'number', hint:'Total building square footage' },
  { key:'year_built',     label:'Year Built',       required:false, type:'number', hint:'Year constructed' },
  { key:'cap_rate',       label:'Cap Rate (%)',      required:false, type:'number', hint:'Cap rate at sale, e.g. 5.25' },
  { key:'grm',            label:'GRM',              required:false, type:'number', hint:'Gross rent multiplier' },
  { key:'price_per_unit', label:'Price / Unit',     required:false, type:'number', hint:'Auto-calculated if blank' },
  { key:'price_per_sqft', label:'Price / Sq Ft',   required:false, type:'number', hint:'Auto-calculated if blank' },
  { key:'noi',            label:'NOI',              required:false, type:'number', hint:'Net operating income at sale' },
  { key:'source',         label:'Source',           required:false, type:'text',   hint:'CoStar, LoopNet, MLS, etc.' },
  { key:'notes',          label:'Notes',            required:false, type:'text',   hint:'Additional notes' },
] as const

const RENT_BLDG_SCHEMA = [
  { key:'address',       label:'Address',          required:true,  type:'text',   hint:'Building street address' },
  { key:'city',          label:'City',             required:true,  type:'text',   hint:'City name' },
  { key:'state',         label:'State',            required:false, type:'text',   hint:'Two-letter state code' },
  { key:'zip_code',      label:'ZIP Code',         required:false, type:'text',   hint:'5-digit ZIP' },
  { key:'total_units',   label:'Total Units',      required:true,  type:'number', hint:'Total units in building' },
  { key:'year_built',    label:'Year Built',       required:false, type:'number', hint:'Year constructed' },
  { key:'sqft_building', label:'Building Sq Ft',   required:false, type:'number', hint:'Total building sq ft' },
  { key:'vacancy_rate',  label:'Vacancy Rate (%)', required:false, type:'number', hint:'Current vacancy, e.g. 5.0' },
  { key:'source',        label:'Source',           required:false, type:'text',   hint:'Data source' },
  { key:'notes',         label:'Notes',            required:false, type:'text',   hint:'Building notes' },
] as const

const RENT_UNIT_SCHEMA = [
  { key:'building_address', label:'Building Address', required:true,  type:'text',   hint:'Must match parent building address' },
  { key:'unit_type',        label:'Unit Type',        required:true,  type:'text',   hint:'Studio, 1BR/1BA, 2BR/1BA, etc.' },
  { key:'unit_number',      label:'Unit #',           required:false, type:'text',   hint:'Optional unit identifier' },
  { key:'sqft',             label:'Sq Ft',            required:false, type:'number', hint:'Unit square footage' },
  { key:'asking_rent',      label:'Asking Rent',      required:true,  type:'number', hint:'Monthly asking rent in dollars' },
  { key:'effective_rent',   label:'Effective Rent',   required:false, type:'number', hint:'Rent after concessions' },
  { key:'rent_per_sqft',    label:'Rent / Sq Ft',     required:false, type:'number', hint:'Auto-calculated if blank' },
  { key:'lease_date',       label:'Lease Date',       required:false, type:'date',   hint:'Date of lease or survey' },
  { key:'concessions',      label:'Concessions',      required:false, type:'text',   hint:'e.g. 1 month free' },
  { key:'notes',            label:'Notes',            required:false, type:'text',   hint:'Unit notes' },
] as const

type CompType = 'sale' | 'rent_building' | 'rent_unit'
type Step = 'type' | 'schema' | 'upload' | 'map' | 'preview' | 'done'

// ─── Alias Maps ───────────────────────────────────────────────────────────────
const SALE_ALIASES: Record<string,string> = {
  'property address':'address','street address':'address','addr':'address','address':'address',
  'city':'city','municipality':'city',
  'state':'state','st':'state',
  'zip':'zip_code','zip code':'zip_code','postal code':'zip_code','postal_code':'zip_code',
  'sale price':'sale_price','sold price':'sale_price','close price':'sale_price','sales price':'sale_price','price':'sale_price','transaction price':'sale_price',
  'close date':'close_date','sold date':'close_date','closing date':'close_date','transaction date':'close_date','recording date':'close_date',
  'units':'units','unit count':'units','# units':'units','number of units':'units','total units':'units','residential units':'units',
  'sqft':'sqft','sq ft':'sqft','square feet':'sqft','building size':'sqft','gla':'sqft','building sqft':'sqft','rentable sqft':'sqft',
  'year built':'year_built','yr built':'year_built','built':'year_built',
  'cap rate':'cap_rate','capitalization rate':'cap_rate','cap':'cap_rate',
  'grm':'grm','gross rent multiplier':'grm',
  'price per unit':'price_per_unit','ppu':'price_per_unit',
  'price per sqft':'price_per_sqft','price/sf':'price_per_sqft','price per sf':'price_per_sqft',
  'noi':'noi','net operating income':'noi',
  'source':'source','data source':'source',
  'notes':'notes','comments':'notes','remarks':'notes',
}
const RENT_BLDG_ALIASES: Record<string,string> = {
  'property address':'address','street address':'address','address':'address',
  'city':'city','state':'state','zip':'zip_code','zip code':'zip_code',
  'total units':'total_units','units':'total_units','unit count':'total_units',
  'year built':'year_built','yr built':'year_built',
  'building sqft':'sqft_building','building size':'sqft_building','sq ft':'sqft_building','sqft':'sqft_building',
  'vacancy':'vacancy_rate','vacancy rate':'vacancy_rate','vacancy %':'vacancy_rate',
  'source':'source','notes':'notes','comments':'notes',
}
const RENT_UNIT_ALIASES: Record<string,string> = {
  'building address':'building_address','property address':'building_address','address':'building_address',
  'unit type':'unit_type','type':'unit_type','bed/bath':'unit_type','floorplan':'unit_type',
  'unit':'unit_number','unit #':'unit_number','unit number':'unit_number',
  'sqft':'sqft','sq ft':'sqft','unit sqft':'sqft','unit size':'sqft',
  'asking rent':'asking_rent','rent':'asking_rent','asking':'asking_rent','list rent':'asking_rent',
  'effective rent':'effective_rent','net rent':'effective_rent',
  'rent/sqft':'rent_per_sqft','rent per sqft':'rent_per_sqft','rent/sf':'rent_per_sqft',
  'lease date':'lease_date','date':'lease_date','survey date':'lease_date',
  'concessions':'concessions','concession':'concessions',
  'notes':'notes','comments':'notes',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseCsv(text: string): Record<string,string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    const row: Record<string,string> = {}
    headers.forEach((h,i) => { row[h] = (vals[i]??'').trim() })
    return row
  }).filter(r => Object.values(r).some(v => v))
}

function autoMap(headers: string[], aliases: Record<string,string>): Record<string,string> {
  const m: Record<string,string> = {}
  headers.forEach(h => {
    const n = h.toLowerCase().trim()
    if (aliases[n]) m[h] = aliases[n]
    else if (aliases[n.replace(/_/g,' ')]) m[h] = aliases[n.replace(/_/g,' ')]
  })
  return m
}

function parseNum(v?: string): number|null {
  if (!v) return null
  const n = parseFloat(v.replace(/[$,%\s]/g,''))
  return isNaN(n) ? null : n
}

function parseDate(v?: string): string|null {
  if (!v) return null
  const mm = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mm) return `${mm[3]}-${mm[1].padStart(2,'0')}-${mm[2].padStart(2,'0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return null
}

function genSampleCsv(type: CompType): string {
  if (type==='sale') {
    return [SALE_SCHEMA.map(c=>c.key).join(','),
      '123 Appian Way,Long Beach,CA,90803,2850000,2025-11-15,4,3200,1965,5.25,13.2,712500,890.6,149625,CoStar,Naples Island 4-plex',
      '456 Belmont Ave,Long Beach,CA,90803,3100000,2025-10-01,6,4800,1972,5.10,12.8,516667,645.8,158100,LoopNet,Belmont Shore 6-unit',
    ].join('\n')
  }
  if (type==='rent_building') {
    return [RENT_BLDG_SCHEMA.map(c=>c.key).join(','),
      '100 Ocean Blvd,Long Beach,CA,90803,8,1968,6400,3.5,CoStar,Oceanfront 8-unit',
      '200 Alamitos Ave,Long Beach,CA,90803,12,1975,9600,5.0,LoopNet,Alamitos 12-unit',
    ].join('\n')
  }
  return [RENT_UNIT_SCHEMA.map(c=>c.key).join(','),
    '100 Ocean Blvd,1BR/1BA,101,750,2850,2800,3.80,2025-11-01,No concessions,Ocean view',
    '100 Ocean Blvd,2BR/1BA,201,1050,3600,3500,3.43,2025-11-01,1 month free,Top floor',
    '200 Alamitos Ave,Studio,,500,1950,1900,3.90,2025-10-15,No concessions,',
  ].join('\n')
}

function dlCsv(content: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content],{type:'text/csv'}))
  a.download = filename; a.click()
}

// ─── Schema Panel ─────────────────────────────────────────────────────────────
function SchemaPanel({ type }: { type: CompType }) {
  const schema = type==='sale' ? SALE_SCHEMA : type==='rent_building' ? RENT_BLDG_SCHEMA : RENT_UNIT_SCHEMA
  return (
    <table className="w-full text-xs">
      <thead><tr style={{ backgroundColor:'rgba(27,42,74,0.8)' }}>
        {['Column Key','Label','Required','Type','Description'].map(h=>(
          <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color:'#C5963A',fontSize:'9px',textTransform:'uppercase' }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {schema.map(col=>(
          <tr key={col.key} style={{ borderBottom:'1px solid rgba(248,250,252,0.04)' }}>
            <td className="px-3 py-2 font-mono" style={{ color:'#3B9CB5',fontSize:'10px' }}>{col.key}</td>
            <td className="px-3 py-2 font-medium" style={{ color:'#F8FAFC' }}>{col.label}</td>
            <td className="px-3 py-2">
              {col.required
                ? <span className="px-1.5 py-0.5" style={{ backgroundColor:'rgba(239,68,68,0.15)',color:'#ef4444',fontSize:'9px' }}>Required</span>
                : <span className="px-1.5 py-0.5" style={{ backgroundColor:'rgba(248,250,252,0.06)',color:'rgba(248,250,252,0.35)',fontSize:'9px' }}>Optional</span>}
            </td>
            <td className="px-3 py-2" style={{ color:'rgba(248,250,252,0.5)' }}>{col.type}</td>
            <td className="px-3 py-2" style={{ color:'rgba(248,250,252,0.4)' }}>{col.hint}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompIngestionPage() {
  const [step, setStep]         = useState<Step>('type')
  const [compType, setCompType] = useState<CompType>('sale')
  const [csvRows, setCsvRows]   = useState<Record<string,string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [mapping, setMapping]   = useState<Record<string,string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult]     = useState<{inserted:number;skipped:number;errors:string[]}|null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const aliasMap = compType==='sale' ? SALE_ALIASES : compType==='rent_building' ? RENT_BLDG_ALIASES : RENT_UNIT_ALIASES
  const schema   = compType==='sale' ? SALE_SCHEMA  : compType==='rent_building' ? RENT_BLDG_SCHEMA  : RENT_UNIT_SCHEMA
  const schemaKeys = schema.map(c=>c.key as string)
  const requiredKeys = schema.filter(c=>c.required).map(c=>c.key as string)
  const mappedKeys = Object.values(mapping)
  const missingRequired = requiredKeys.filter(k=>!mappedKeys.includes(k))

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const rows = parseCsv(e.target?.result as string)
      if (rows.length > 0) {
        const headers = Object.keys(rows[0])
        setCsvHeaders(headers); setCsvRows(rows)
        setMapping(autoMap(headers, aliasMap))
        setStep('map')
      }
    }
    reader.readAsText(file)
  }, [aliasMap])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) handleFile(f)
  }, [handleFile])

  const buildRow = (csvRow: Record<string,string>): Record<string,unknown> => {
    const row: Record<string,unknown> = {}
    for (const [csvCol, schemaKey] of Object.entries(mapping)) {
      const val = csvRow[csvCol]
      if (!val) continue
      const col = schema.find(c=>c.key===schemaKey)
      if (!col) continue
      if (col.type==='number') row[schemaKey] = parseNum(val)
      else if (col.type==='date') row[schemaKey] = parseDate(val)
      else row[schemaKey] = val
    }
    return row
  }

  const runImport = async () => {
    setImporting(true)
    const { data: td } = await supabase.from('teams').select('id').limit(1).single()
    const teamId = td?.id
    let inserted=0, skipped=0; const errors: string[] = []

    if (compType==='sale') {
      for (const csvRow of csvRows) {
        const row = buildRow(csvRow)
        // Auto-derive price_per_unit / price_per_sqft
        const price = row.sale_price as number|null
        const units = row.units as number|null
        const sqft  = row.sqft as number|null
        if (price && units && !row.price_per_unit) row.price_per_unit = Math.round(price/units)
        if (price && sqft  && !row.price_per_sqft) row.price_per_sqft = parseFloat((price/sqft).toFixed(2))
        row.team_id = teamId; row.comp_type = 'sale'
        if (!row.address || !row.sale_price) { skipped++; continue }
        const { error } = await supabase.from('comparables').insert(row)
        if (error) { errors.push(`${row.address}: ${error.message}`); skipped++ } else inserted++
      }
    } else if (compType==='rent_building') {
      for (const csvRow of csvRows) {
        const row = buildRow(csvRow)
        row.team_id = teamId; row.comp_type = 'rent'
        if (!row.address) { skipped++; continue }
        const { error } = await supabase.from('comparables').insert(row)
        if (error) { errors.push(`${row.address}: ${error.message}`); skipped++ } else inserted++
      }
    } else {
      // rent_unit: auto-link to parent building
      for (const csvRow of csvRows) {
        const row = buildRow(csvRow)
        if (!row.building_address || !row.asking_rent) { skipped++; continue }
        // Auto-calc rent/sqft
        const rent = row.asking_rent as number
        const sqft = row.sqft as number|null
        if (rent && sqft && !row.rent_per_sqft) row.rent_per_sqft = parseFloat((rent/sqft).toFixed(2))
        // Find parent
        const { data: parent } = await supabase.from('comparables')
          .select('id').ilike('address',`%${row.building_address}%`).limit(1).single()
        row.parent_comp_id = parent?.id ?? null
        row.team_id = teamId; row.comp_type = 'rent_unit'
        let error: {message:string}|null = null
        try {
          const res = await supabase.from('comparable_units').insert(row)
          error = res.error
        } catch(e) {
          error = { message: 'comparable_units table not yet created — run phase3_revisions.sql' }
        }
        if (error) { errors.push(`Unit at ${row.building_address}: ${error.message}`); skipped++ } else inserted++
      }
    }

    setResult({ inserted, skipped, errors })
    setImporting(false); setStep('done')
  }

  const STEPS: {key:Step;label:string}[] = [
    {key:'type',label:'1. Type'},{key:'schema',label:'2. Schema'},{key:'upload',label:'3. Upload'},
    {key:'map',label:'4. Map'},{key:'preview',label:'5. Preview'},{key:'done',label:'6. Done'},
  ]
  const stepIdx = STEPS.findIndex(s=>s.key===step)

  const reset = () => { setStep('type'); setCsvRows([]); setCsvHeaders([]); setMapping({}); setResult(null) }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor:'#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor:'rgba(197,150,58,0.15)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color:'#F8FAFC' }}>Comp Ingestion</h1>
          <p className="text-xs mt-0.5" style={{ color:'rgba(248,250,252,0.4)' }}>Import sale comps or rent comps from CoStar, LoopNet, MLS, or any CSV</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>dlCsv(genSampleCsv(compType),`sample_${compType}_comps.csv`)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
            style={{ color:'#3B9CB5',border:'1px solid rgba(59,156,181,0.3)',backgroundColor:'rgba(59,156,181,0.06)' }}>
            <Download size={12}/> Sample CSV
          </button>
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
            style={{ color:'rgba(248,250,252,0.4)',border:'1px solid rgba(248,250,252,0.1)' }}>
            <RefreshCw size={12}/> Reset
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center px-6 py-2 border-b flex-shrink-0" style={{ borderColor:'rgba(248,250,252,0.06)' }}>
        {STEPS.map((s,i)=>(
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer"
              style={{ color:i<=stepIdx?'#F8FAFC':'rgba(248,250,252,0.3)', borderBottom:s.key===step?'2px solid #C5963A':'2px solid transparent', backgroundColor:s.key===step?'rgba(197,150,58,0.08)':'transparent' }}
              onClick={()=>i<stepIdx&&setStep(s.key)}>
              {i<stepIdx?<CheckCircle size={10} style={{ color:'#22c55e' }}/>:<span style={{ color:i===stepIdx?'#C5963A':'rgba(248,250,252,0.3)' }}>{i+1}</span>}
              <span className="ml-1">{s.label}</span>
            </div>
            {i<STEPS.length-1&&<ChevronRight size={11} style={{ color:'rgba(248,250,252,0.15)' }}/>}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* Step 1: Type */}
        {step==='type' && (
          <div className="max-w-2xl">
            <div className="text-sm font-semibold mb-1" style={{ color:'#F8FAFC' }}>What type of comps are you importing?</div>
            <div className="text-xs mb-5" style={{ color:'rgba(248,250,252,0.4)' }}>
              For rent comps: import buildings first, then units. Units auto-link to their parent building by address.
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                {key:'sale' as CompType, icon:<DollarSign size={20}/>, label:'Sale Comps', desc:'Closed sales from CoStar, LoopNet, MLS'},
                {key:'rent_building' as CompType, icon:<Building2 size={20}/>, label:'Rent Comp Buildings', desc:'Building-level parent records'},
                {key:'rent_unit' as CompType, icon:<Home size={20}/>, label:'Rent Comp Units', desc:'Unit-level data linked to buildings'},
              ].map(opt=>(
                <div key={opt.key} className="p-4 cursor-pointer transition-all"
                  style={{ backgroundColor:compType===opt.key?'rgba(197,150,58,0.1)':'rgba(27,42,74,0.5)', border:compType===opt.key?'2px solid #C5963A':'2px solid rgba(248,250,252,0.08)' }}
                  onClick={()=>setCompType(opt.key)}>
                  <div className="mb-2" style={{ color:compType===opt.key?'#C5963A':'rgba(248,250,252,0.4)' }}>{opt.icon}</div>
                  <div className="text-sm font-semibold mb-1" style={{ color:'#F8FAFC' }}>{opt.label}</div>
                  <div className="text-xs" style={{ color:'rgba(248,250,252,0.4)' }}>{opt.desc}</div>
                </div>
              ))}
            </div>
            {(compType==='rent_building'||compType==='rent_unit') && (
              <div className="mb-5 p-3" style={{ backgroundColor:'rgba(59,156,181,0.08)',border:'1px solid rgba(59,156,181,0.2)' }}>
                <div className="flex items-start gap-2">
                  <Link2 size={13} style={{ color:'#3B9CB5',flexShrink:0,marginTop:1 }}/>
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color:'#3B9CB5' }}>Relational Model</div>
                    <div className="text-xs" style={{ color:'rgba(248,250,252,0.5)' }}>
                      Buildings → <code style={{ color:'#3B9CB5' }}>comparables</code> (comp_type='rent').
                      Units → <code style={{ color:'#3B9CB5' }}>comparable_units</code> linked via parent_comp_id.
                      Import buildings first, then units — the importer auto-matches by address.
                    </div>
                  </div>
                </div>
              </div>
            )}
            <button onClick={()=>setStep('schema')} className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold" style={{ backgroundColor:'#C5963A',color:'#0F172A' }}>
              Continue <ArrowRight size={12}/>
            </button>
          </div>
        )}

        {/* Step 2: Schema */}
        {step==='schema' && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ color:'#F8FAFC' }}>
                  {compType==='sale'?'Sale Comp':compType==='rent_building'?'Rent Comp Building':'Rent Comp Unit'} — Column Schema
                </div>
                <div className="text-xs mt-0.5" style={{ color:'rgba(248,250,252,0.4)' }}>
                  Column names don't need to match exactly — common aliases from CoStar, LoopNet, and MLS are auto-detected.
                </div>
              </div>
              <button onClick={()=>dlCsv(genSampleCsv(compType),`sample_${compType}_comps.csv`)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
                style={{ color:'#3B9CB5',border:'1px solid rgba(59,156,181,0.3)',backgroundColor:'rgba(59,156,181,0.06)' }}>
                <Download size={12}/> Download Sample CSV
              </button>
            </div>
            <div className="border mb-4" style={{ border:'1px solid rgba(248,250,252,0.08)' }}>
              <SchemaPanel type={compType}/>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={()=>setStep('type')} className="px-4 py-2 text-xs" style={{ color:'rgba(248,250,252,0.4)',border:'1px solid rgba(248,250,252,0.1)' }}>Back</button>
              <button onClick={()=>setStep('upload')} className="flex items-center gap-2 px-5 py-2 text-xs font-semibold" style={{ backgroundColor:'#C5963A',color:'#0F172A' }}>
                Upload CSV <ArrowRight size={12}/>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload */}
        {step==='upload' && (
          <div className="max-w-xl">
            <div className="text-sm font-semibold mb-4" style={{ color:'#F8FAFC' }}>Upload your CSV file</div>
            <div className="flex flex-col items-center justify-center py-16 cursor-pointer transition-all"
              style={{ border:`2px dashed ${dragOver?'#C5963A':'rgba(197,150,58,0.25)'}`, backgroundColor:dragOver?'rgba(197,150,58,0.05)':'rgba(27,42,74,0.3)' }}
              onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
              onDrop={handleDrop} onClick={()=>fileRef.current?.click()}>
              <Upload size={36} style={{ color:dragOver?'#C5963A':'rgba(197,150,58,0.4)' }}/>
              <div className="mt-3 text-sm font-medium" style={{ color:dragOver?'#C5963A':'rgba(248,250,252,0.5)' }}>
                {dragOver?'Drop to upload':'Drop CSV here or click to browse'}
              </div>
              <div className="mt-1 text-xs" style={{ color:'rgba(248,250,252,0.3)' }}>Accepts .csv from CoStar, LoopNet, MLS, or any spreadsheet</div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
            </div>
            <div className="mt-4">
              <button onClick={()=>setStep('schema')} className="px-4 py-2 text-xs" style={{ color:'rgba(248,250,252,0.4)',border:'1px solid rgba(248,250,252,0.1)' }}>Back</button>
            </div>
          </div>
        )}

        {/* Step 4: Map */}
        {step==='map' && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold" style={{ color:'#F8FAFC' }}>Map CSV Columns to Schema Fields</div>
                <div className="text-xs mt-0.5" style={{ color:'rgba(248,250,252,0.4)' }}>
                  {csvRows.length} rows · {Object.keys(mapping).length}/{csvHeaders.length} columns auto-mapped
                </div>
              </div>
              {missingRequired.length>0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ backgroundColor:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={12} style={{ color:'#ef4444' }}/>
                  <span className="text-xs" style={{ color:'#ef4444' }}>Missing: {missingRequired.join(', ')}</span>
                </div>
              )}
            </div>
            <div className="border mb-4 overflow-x-auto" style={{ border:'1px solid rgba(248,250,252,0.08)' }}>
              <table className="w-full text-xs">
                <thead><tr style={{ backgroundColor:'rgba(27,42,74,0.8)' }}>
                  {['CSV Column','Auto-Detected','Map To Field',''].map(h=>(
                    <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color:'#C5963A',fontSize:'9px',textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {csvHeaders.map(h=>(
                    <tr key={h} style={{ borderBottom:'1px solid rgba(248,250,252,0.04)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color:'#F8FAFC',fontSize:'10px' }}>{h}</td>
                      <td className="px-3 py-2">
                        {mapping[h]
                          ? <span className="flex items-center gap-1"><CheckCircle size={10} style={{ color:'#22c55e' }}/><span style={{ color:'#22c55e' }}>→ {mapping[h]}</span></span>
                          : <span style={{ color:'rgba(248,250,252,0.25)' }}>—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <select className="text-xs px-2 py-1 w-40" value={mapping[h]??''}
                          onChange={e=>{const m={...mapping};if(e.target.value)m[h]=e.target.value;else delete m[h];setMapping(m)}}>
                          <option value="">— Skip —</option>
                          {schemaKeys.map(k=><option key={k} value={k}>{k}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {mapping[h]&&<button onClick={()=>{const m={...mapping};delete m[h];setMapping(m)}} style={{ color:'rgba(248,250,252,0.3)' }}><X size={12}/></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={()=>setStep('upload')} className="px-4 py-2 text-xs" style={{ color:'rgba(248,250,252,0.4)',border:'1px solid rgba(248,250,252,0.1)' }}>Back</button>
              <button onClick={()=>setStep('preview')} disabled={missingRequired.length>0}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold"
                style={{ backgroundColor:missingRequired.length===0?'#C5963A':'rgba(197,150,58,0.3)',color:'#0F172A' }}>
                Preview <ArrowRight size={12}/>
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Preview */}
        {step==='preview' && (
          <div className="max-w-5xl">
            <div className="text-sm font-semibold mb-1" style={{ color:'#F8FAFC' }}>Preview — {csvRows.length} records</div>
            <div className="text-xs mb-3" style={{ color:'rgba(248,250,252,0.4)' }}>Showing first 10 rows after mapping.</div>
            <div className="overflow-x-auto border mb-4" style={{ border:'1px solid rgba(248,250,252,0.08)' }}>
              <table className="text-xs" style={{ minWidth:'800px' }}>
                <thead><tr style={{ backgroundColor:'rgba(27,42,74,0.8)' }}>
                  <th className="px-3 py-2 text-left" style={{ color:'rgba(248,250,252,0.3)',fontSize:'9px' }}>#</th>
                  {Object.values(mapping).map(k=>(
                    <th key={k} className="px-3 py-2 text-left font-semibold" style={{ color:'#C5963A',fontSize:'9px',textTransform:'uppercase' }}>{k}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {csvRows.slice(0,10).map((row,i)=>{
                    const mapped = buildRow(row)
                    return (
                      <tr key={i} style={{ borderBottom:'1px solid rgba(248,250,252,0.04)' }}>
                        <td className="px-3 py-2" style={{ color:'rgba(248,250,252,0.3)' }}>{i+1}</td>
                        {Object.values(mapping).map(k=>(
                          <td key={k} className="px-3 py-2" style={{ color:mapped[k]!=null?'#F8FAFC':'rgba(248,250,252,0.2)' }}>
                            {mapped[k]!=null?String(mapped[k]):'—'}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={()=>setStep('map')} className="px-4 py-2 text-xs" style={{ color:'rgba(248,250,252,0.4)',border:'1px solid rgba(248,250,252,0.1)' }}>Back</button>
              <button onClick={runImport} disabled={importing}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold" style={{ backgroundColor:'#C5963A',color:'#0F172A' }}>
                {importing?<><RefreshCw size={11} className="animate-spin"/> Importing...</>:<>Import {csvRows.length} Records <ArrowRight size={12}/></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Done */}
        {step==='done' && result && (
          <div className="max-w-xl">
            <div className="p-6 text-center" style={{ backgroundColor:'rgba(27,42,74,0.5)',border:'1px solid rgba(197,150,58,0.2)' }}>
              <CheckCircle size={40} className="mx-auto mb-3" style={{ color:'#22c55e' }}/>
              <div className="text-sm font-semibold mb-1" style={{ color:'#F8FAFC' }}>Import Complete</div>
              <div className="text-xs mb-4" style={{ color:'rgba(248,250,252,0.4)' }}>{result.inserted} inserted · {result.skipped} skipped</div>
              {result.errors.length>0 && (
                <div className="text-left mb-4 p-3" style={{ backgroundColor:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color:'#ef4444' }}>Errors ({result.errors.length})</div>
                  {result.errors.slice(0,5).map((e,i)=><div key={i} className="text-xs mb-1" style={{ color:'rgba(248,250,252,0.5)' }}>{e}</div>)}
                </div>
              )}
              <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold mx-auto" style={{ backgroundColor:'#C5963A',color:'#0F172A' }}>
                <Plus size={11}/> Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
