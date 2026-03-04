import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, Download, CheckCircle, Loader2, FileText, AlertCircle, Info } from 'lucide-react'

type CompType = 'sale' | 'rent_building' | 'rent_unit'
type Step = 'type' | 'schema' | 'upload' | 'map' | 'preview' | 'done'
interface ColDef { key: string; label: string; required: boolean; type: string; description: string; example: string }

const SALE_COLS: ColDef[] = [
  { key:'address',        label:'Address',        required:true,  type:'text',    description:'Street address of the property',                     example:'1234 E 2nd St' },
  { key:'city',           label:'City',           required:true,  type:'text',    description:'City',                                               example:'Long Beach' },
  { key:'state',          label:'State',          required:true,  type:'text',    description:'2-letter state code',                                example:'CA' },
  { key:'zip_code',       label:'ZIP Code',       required:true,  type:'text',    description:'5-digit ZIP code',                                   example:'90803' },
  { key:'sale_price',     label:'Sale Price',     required:true,  type:'number',  description:'Closed sale price in dollars',                       example:'2850000' },
  { key:'close_date',     label:'Close Date',     required:true,  type:'date',    description:'Date the sale closed (YYYY-MM-DD)',                  example:'2025-11-15' },
  { key:'units',          label:'Units',          required:true,  type:'integer', description:'Total number of residential units',                  example:'4' },
  { key:'sqft',           label:'Sq Ft',          required:false, type:'integer', description:'Total gross building square footage',                example:'3800' },
  { key:'lot_sqft',       label:'Lot Sq Ft',      required:false, type:'integer', description:'Lot size in square feet',                            example:'5200' },
  { key:'year_built',     label:'Year Built',     required:false, type:'integer', description:'Year the building was constructed',                  example:'1962' },
  { key:'cap_rate',       label:'Cap Rate',       required:false, type:'decimal', description:'Capitalization rate at time of sale (decimal)',      example:'0.0485' },
  { key:'grm',            label:'GRM',            required:false, type:'decimal', description:'Gross rent multiplier',                              example:'14.2' },
  { key:'noi',            label:'NOI',            required:false, type:'number',  description:'Net operating income at time of sale',               example:'138225' },
  { key:'price_per_unit', label:'Price / Unit',   required:false, type:'number',  description:'Sale price divided by units (auto-derived if blank)',example:'712500' },
  { key:'price_per_sqft', label:'Price / Sq Ft',  required:false, type:'number',  description:'Sale price divided by sq ft (auto-derived if blank)',example:'750' },
  { key:'source',         label:'Source',         required:false, type:'text',    description:'Data source (CoStar, MLS, LoopNet, etc.)',           example:'CoStar' },
]

const RENT_BLDG_COLS: ColDef[] = [
  { key:'address',         label:'Address',         required:true,  type:'text',    description:'Street address of the building',                   example:'500 Termino Ave' },
  { key:'city',            label:'City',            required:true,  type:'text',    description:'City',                                             example:'Long Beach' },
  { key:'state',           label:'State',           required:true,  type:'text',    description:'2-letter state code',                              example:'CA' },
  { key:'zip_code',        label:'ZIP Code',        required:true,  type:'text',    description:'5-digit ZIP code',                                 example:'90803' },
  { key:'units',           label:'Total Units',     required:true,  type:'integer', description:'Total number of units in the building',            example:'12' },
  { key:'year_built',      label:'Year Built',      required:false, type:'integer', description:'Year the building was constructed',                example:'1975' },
  { key:'sqft',            label:'Bldg Sq Ft',      required:false, type:'integer', description:'Total gross building square footage',              example:'9600' },
  { key:'occupancy_pct',   label:'Occupancy %',     required:false, type:'decimal', description:'Current occupancy rate (0.00-1.00)',               example:'0.95' },
  { key:'avg_rent',        label:'Avg Rent / Unit', required:false, type:'number',  description:'Average monthly rent across all units',            example:'2200' },
  { key:'effective_gross', label:'Effective Gross', required:false, type:'number',  description:'Annual effective gross income',                    example:'285600' },
  { key:'parking',         label:'Parking',         required:false, type:'text',    description:'Parking type (Surface, Garage, Carport, Street)',  example:'Carport' },
  { key:'amenities',       label:'Amenities',       required:false, type:'text',    description:'Comma-separated amenity list',                     example:'Laundry Pool' },
  { key:'source',          label:'Source',          required:false, type:'text',    description:'Data source',                                      example:'CoStar' },
]

const RENT_UNIT_COLS: ColDef[] = [
  { key:'parent_address',  label:'Parent Address',  required:true,  type:'text',    description:'Street address of the parent building (must match an existing Rent Comp Building)', example:'500 Termino Ave' },
  { key:'unit_type',       label:'Unit Type',       required:true,  type:'text',    description:'Unit mix label (Studio, 1BR/1BA, 2BR/1BA, etc.)',  example:'2BR/1BA' },
  { key:'unit_sqft',       label:'Unit Sq Ft',      required:true,  type:'integer', description:'Square footage of this unit type',                 example:'850' },
  { key:'asking_rent',     label:'Asking Rent',     required:true,  type:'number',  description:'Current asking monthly rent',                      example:'2400' },
  { key:'effective_rent',  label:'Effective Rent',  required:false, type:'number',  description:'Effective monthly rent after concessions',         example:'2350' },
  { key:'beds',            label:'Beds',            required:false, type:'integer', description:'Number of bedrooms',                               example:'2' },
  { key:'baths',           label:'Baths',           required:false, type:'decimal', description:'Number of bathrooms',                              example:'1' },
  { key:'unit_count',      label:'Unit Count',      required:false, type:'integer', description:'Number of units of this type in the building',     example:'4' },
  { key:'concessions',     label:'Concessions',     required:false, type:'text',    description:'Current concession offers',                        example:'1 month free' },
  { key:'lease_term',      label:'Lease Term',      required:false, type:'text',    description:'Standard lease term',                              example:'12 months' },
  { key:'date_surveyed',   label:'Date Surveyed',   required:false, type:'date',    description:'Date this rent data was collected (YYYY-MM-DD)',   example:'2025-12-01' },
  { key:'furnished',       label:'Furnished',       required:false, type:'boolean', description:'Whether unit is furnished (true/false)',            example:'false' },
  { key:'source',          label:'Source',          required:false, type:'text',    description:'Data source',                                      example:'CoStar' },
]

const ALIASES: Record<string, string[]> = {
  address:['address','street','street address','property address','prop address','location'],
  city:['city','municipality'], state:['state','st','province'],
  zip_code:['zip','zip code','zip_code','postal','postal code'],
  sale_price:['sale price','sales price','sold price','close price','closing price','price','sale_price'],
  close_date:['close date','closing date','sold date','sale date','close_date','date sold'],
  units:['units','unit count','# units','number of units','total units','no. units'],
  sqft:['sqft','sq ft','building sqft','gross sqft','building sf','total sqft','bldg sqft','gba'],
  lot_sqft:['lot sqft','lot sf','lot size','land area','lot area'],
  year_built:['year built','yr built','built','year_built'],
  cap_rate:['cap rate','cap_rate','capitalization rate'],
  grm:['grm','gross rent multiplier','gross rent mult'],
  noi:['noi','net operating income','net income'],
  price_per_unit:['price per unit','$/unit','price/unit','ppu'],
  price_per_sqft:['price per sqft','price per sf','$/sqft','$/sf','ppsf'],
  source:['source','data source','provider'],
  avg_rent:['avg rent','average rent','avg monthly rent','mean rent'],
  occupancy_pct:['occupancy','occupancy %','occ %','occupancy rate','occ rate'],
  effective_gross:['effective gross','egi','effective gross income'],
  parking:['parking','parking type'], amenities:['amenities','features','building amenities'],
  parent_address:['parent address','building address','parent_address'],
  unit_type:['unit type','unit mix','type','floor plan','floorplan'],
  unit_sqft:['unit sqft','unit sf','unit size','apt sqft'],
  asking_rent:['asking rent','ask rent','list rent','market rent','rent'],
  effective_rent:['effective rent','eff rent','net rent'],
  beds:['beds','bedrooms','br','bd'], baths:['baths','bathrooms','ba'],
  unit_count:['unit count','# of units','count','units of type'],
  concessions:['concessions','concession','specials'],
  lease_term:['lease term','term','lease length'],
  date_surveyed:['date surveyed','survey date','date_surveyed','date'],
  furnished:['furnished','is furnished'],
}

const S: React.CSSProperties = { background:'rgba(27,42,74,0.6)', border:'1px solid rgba(248,250,252,0.1)', color:'#F8FAFC', borderRadius:4, padding:'6px 10px', width:'100%', fontSize:13 }
const L: React.CSSProperties = { color:'rgba(248,250,252,0.4)', fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:4 }

function autoMap(headers: string[], cols: ColDef[]): Record<string,string> {
  const m: Record<string,string> = {}
  headers.forEach(h => {
    const lower = h.toLowerCase().trim()
    for (const col of cols) {
      const alts = ALIASES[col.key] || [col.key]
      if (alts.includes(lower)) { m[col.key] = h; break }
    }
  })
  return m
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers:[], rows:[] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
  const rows = lines.slice(1).map(l => {
    const vals: string[] = []; let cur = '', inQ = false
    for (const ch of l) {
      if (ch==='"') { inQ=!inQ } else if (ch===',' && !inQ) { vals.push(cur.trim()); cur='' } else cur+=ch
    }
    vals.push(cur.trim())
    return vals.map(v => v.replace(/^"|"$/g,''))
  }).filter(r => r.some(v => v))
  return { headers, rows }
}

function getVal(row: string[], headers: string[], mapping: Record<string,string>, key: string): string {
  const h = mapping[key]; if (!h) return ''
  const idx = headers.indexOf(h); return idx >= 0 ? (row[idx]||'') : ''
}

function sampleCSV(type: CompType): string {
  if (type==='sale') return 'address,city,state,zip_code,sale_price,close_date,units,sqft,lot_sqft,year_built,cap_rate,grm,noi,price_per_unit,price_per_sqft,source\n1234 E 2nd St,Long Beach,CA,90803,2850000,2025-11-15,4,3800,5200,1962,0.0485,14.2,138225,712500,750,CoStar\n456 Termino Ave,Long Beach,CA,90803,3200000,2025-10-01,6,5400,6000,1958,0.0510,13.8,163200,533333,593,MLS'
  if (type==='rent_building') return 'address,city,state,zip_code,units,year_built,sqft,occupancy_pct,avg_rent,effective_gross,parking,amenities,source\n500 Termino Ave,Long Beach,CA,90803,12,1975,9600,0.95,2200,285600,Carport,Laundry Pool,CoStar'
  return 'parent_address,unit_type,unit_sqft,asking_rent,effective_rent,beds,baths,unit_count,concessions,lease_term,date_surveyed,furnished,source\n500 Termino Ave,Studio,450,1800,1800,0,1,2,,12 months,2025-12-01,false,CoStar\n500 Termino Ave,1BR/1BA,650,2200,2150,1,1,6,1 month free,12 months,2025-12-01,false,CoStar\n500 Termino Ave,2BR/1BA,850,2600,2550,2,1,4,,12 months,2025-12-01,false,CoStar'
}

function SchemaTable({ cols }: { cols: ColDef[] }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ background:'rgba(15,23,42,0.8)' }}>
            {['Column','Required','Type','Description','Example'].map(h=>(
              <th key={h} style={{ padding:'8px 12px', textAlign:'left', ...L, fontWeight:700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map(col=>(
            <tr key={col.key} style={{ borderTop:'1px solid rgba(248,250,252,0.05)' }}>
              <td style={{ padding:'7px 12px', color:'#C5963A', fontFamily:'monospace', fontSize:11 }}>{col.key}</td>
              <td style={{ padding:'7px 12px' }}>
                <span style={{ background:col.required?'rgba(239,68,68,0.15)':'rgba(248,250,252,0.06)', color:col.required?'#ef4444':'rgba(248,250,252,0.4)', border:`1px solid ${col.required?'rgba(239,68,68,0.3)':'rgba(248,250,252,0.1)'}`, borderRadius:3, padding:'1px 6px', fontSize:10, fontWeight:600 }}>
                  {col.required?'Required':'Optional'}
                </span>
              </td>
              <td style={{ padding:'7px 12px', color:'#3B9CB5', fontSize:11 }}>{col.type}</td>
              <td style={{ padding:'7px 12px', color:'rgba(248,250,252,0.6)', lineHeight:1.4 }}>{col.description}</td>
              <td style={{ padding:'7px 12px', color:'rgba(248,250,252,0.4)', fontFamily:'monospace', fontSize:11 }}>{col.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CompIngestionPage() {
  const [compType, setCompType] = useState<CompType>('sale')
  const [step, setStep] = useState<Step>('type')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted:number; skipped:number; errors:string[] }|null>(null)

  const cols = compType==='sale' ? SALE_COLS : compType==='rent_building' ? RENT_BLDG_COLS : RENT_UNIT_COLS

  const downloadSample = () => {
    const blob = new Blob([sampleCSV(compType)],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`sample_${compType}_comps.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const { headers:hdrs, rows:rws } = parseCSV(e.target?.result as string)
      setHeaders(hdrs); setRows(rws); setMapping(autoMap(hdrs, cols)); setStep('map')
    }
    reader.readAsText(file)
  }, [cols])

  const doImport = async () => {
    setLoading(true)
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const teamId = teamData?.id
    let inserted=0, skipped=0; const errors: string[] = []
    for (const row of rows) {
      const get = (k: string) => getVal(row,headers,mapping,k)
      try {
        if (compType==='sale') {
          const addr=get('address'); if (!addr) { skipped++; continue }
          const sp=parseFloat(get('sale_price').replace(/[^0-9.]/g,''))||null
          const u=parseInt(get('units'))||null, sf=parseInt(get('sqft'))||null
          const { error } = await supabase.from('comparables').insert({
            team_id:teamId, comp_type:'sale', address:addr, city:get('city')||null, state:get('state')||null,
            zip_code:get('zip_code')||null, sale_price:sp, close_date:get('close_date')||null, units:u, sqft:sf,
            lot_sqft:parseInt(get('lot_sqft'))||null, year_built:parseInt(get('year_built'))||null,
            cap_rate:parseFloat(get('cap_rate'))||null, grm:parseFloat(get('grm'))||null,
            noi:parseFloat(get('noi').replace(/[^0-9.]/g,''))||null,
            price_per_unit:sp&&u?Math.round(sp/u):(parseFloat(get('price_per_unit').replace(/[^0-9.]/g,''))||null),
            price_per_sqft:sp&&sf?Math.round(sp/sf):(parseFloat(get('price_per_sqft').replace(/[^0-9.]/g,''))||null),
            source:get('source')||'CSV Import',
          })
          if (error) { errors.push(`${addr}: ${error.message}`); skipped++ } else inserted++
        } else if (compType==='rent_building') {
          const addr=get('address'); if (!addr) { skipped++; continue }
          const { error } = await supabase.from('comparables').insert({
            team_id:teamId, comp_type:'rent', address:addr, city:get('city')||null, state:get('state')||null,
            zip_code:get('zip_code')||null, units:parseInt(get('units'))||null,
            year_built:parseInt(get('year_built'))||null, sqft:parseInt(get('sqft'))||null,
            occupancy_pct:parseFloat(get('occupancy_pct'))||null,
            avg_rent:parseFloat(get('avg_rent').replace(/[^0-9.]/g,''))||null,
            effective_gross:parseFloat(get('effective_gross').replace(/[^0-9.]/g,''))||null,
            parking:get('parking')||null, amenities:get('amenities')||null, source:get('source')||'CSV Import',
          })
          if (error) { errors.push(`${addr}: ${error.message}`); skipped++ } else inserted++
        } else {
          const pa=get('parent_address'); if (!pa) { skipped++; continue }
          const { data:parent } = await supabase.from('comparables').select('id').ilike('address',`%${pa}%`).eq('comp_type','rent').limit(1).single()
          if (!parent) { errors.push(`Unit: parent "${pa}" not found — import building first`); skipped++; continue }
          const { error } = await supabase.from('comparable_units').insert({
            parent_comp_id:parent.id, unit_type:get('unit_type')||'Unknown',
            unit_sqft:parseInt(get('unit_sqft'))||null,
            asking_rent:parseFloat(get('asking_rent').replace(/[^0-9.]/g,''))||null,
            effective_rent:parseFloat(get('effective_rent').replace(/[^0-9.]/g,''))||null,
            beds:parseInt(get('beds'))||null, baths:parseFloat(get('baths'))||null,
            unit_count:parseInt(get('unit_count'))||null, concessions:get('concessions')||null,
            lease_term:get('lease_term')||null, date_surveyed:get('date_surveyed')||null,
            furnished:get('furnished')==='true', source:get('source')||'CSV Import',
          })
          if (error) { errors.push(`Unit row: ${error.message}`); skipped++ } else inserted++
        }
      } catch (e: unknown) { errors.push(String(e)); skipped++ }
    }
    setResult({ inserted, skipped, errors }); setStep('done'); setLoading(false)
  }

  const STEPS: Step[] = ['type','schema','upload','map','preview','done']
  const STEP_LABELS = ['Type','Schema','Upload','Map','Preview','Done']

  const btnPrimary: React.CSSProperties = { background:'rgba(197,150,58,0.2)', border:'1px solid rgba(197,150,58,0.4)', color:'#C5963A', borderRadius:4, padding:'9px 24px', fontSize:13, cursor:'pointer', fontWeight:600 }
  const btnSecondary: React.CSSProperties = { background:'rgba(248,250,252,0.05)', border:'1px solid rgba(248,250,252,0.1)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'9px 20px', fontSize:13, cursor:'pointer' }

  return (
    <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <FileText size={22} color="#C5963A" />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:'#F8FAFC' }}>Comp Ingestion</div>
            <div style={{ fontSize:12, color:'rgba(248,250,252,0.4)' }}>Import sale comps or rent comps from CSV</div>
          </div>
        </div>
        <button onClick={downloadSample} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(248,250,252,0.06)', border:'1px solid rgba(248,250,252,0.12)', color:'rgba(248,250,252,0.7)', borderRadius:4, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:600 }}>
          <Download size={13} /> Sample CSV
        </button>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:28 }}>
        {STEP_LABELS.map((label,i) => {
          const key=STEPS[i], idx=STEPS.indexOf(step), active=key===step, done=idx>i
          return <div key={key} style={{ flex:1, textAlign:'center', padding:'7px 0', borderRadius:4, fontSize:11, fontWeight:600, background:active?'rgba(197,150,58,0.2)':done?'rgba(34,197,94,0.1)':'rgba(248,250,252,0.04)', color:active?'#C5963A':done?'#22c55e':'rgba(248,250,252,0.3)', border:`1px solid ${active?'rgba(197,150,58,0.4)':done?'rgba(34,197,94,0.3)':'rgba(248,250,252,0.07)'}` }}>{done?'✓ ':''}{label}</div>
        })}
      </div>

      {step==='type' && (
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#F8FAFC', marginBottom:16 }}>What type of comp are you importing?</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:24 }}>
            {([
              { key:'sale' as CompType,          label:'Sale Comp',            desc:'Closed multifamily sales — price, cap rate, GRM, NOI', icon:'🏢', cols:16 },
              { key:'rent_building' as CompType, label:'Rent Comp — Building', desc:'Building-level rent survey data (parent record)',       icon:'🏗️', cols:13 },
              { key:'rent_unit' as CompType,     label:'Rent Comp — Unit',     desc:'Unit-type rent data linked to a parent building',      icon:'🏠', cols:13 },
            ]).map(opt=>(
              <div key={opt.key} onClick={()=>setCompType(opt.key)} style={{ padding:20, borderRadius:8, cursor:'pointer', transition:'all 0.15s', background:compType===opt.key?'rgba(197,150,58,0.12)':'rgba(27,42,74,0.4)', border:`2px solid ${compType===opt.key?'rgba(197,150,58,0.5)':'rgba(248,250,252,0.08)'}` }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{opt.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#F8FAFC', marginBottom:6 }}>{opt.label}</div>
                <div style={{ fontSize:11, color:'rgba(248,250,252,0.5)', lineHeight:1.5, marginBottom:10 }}>{opt.desc}</div>
                <div style={{ fontSize:10, color:'rgba(248,250,252,0.3)' }}>{opt.cols} columns</div>
              </div>
            ))}
          </div>
          {compType==='rent_unit' && (
            <div style={{ background:'rgba(59,156,181,0.1)', border:'1px solid rgba(59,156,181,0.25)', borderRadius:6, padding:14, marginBottom:20, display:'flex', gap:10 }}>
              <Info size={16} color="#3B9CB5" style={{ flexShrink:0, marginTop:1 }} />
              <div style={{ fontSize:12, color:'rgba(248,250,252,0.7)', lineHeight:1.6 }}>
                <strong style={{ color:'#3B9CB5' }}>Relational Import:</strong> Unit rows reference a parent building via the <code style={{ color:'#C5963A' }}>parent_address</code> column. The parent building must already exist in the database. Import the Rent Comp Building file first, then import units.
              </div>
            </div>
          )}
          <button onClick={()=>setStep('schema')} style={btnPrimary}>View Schema &amp; Continue →</button>
        </div>
      )}

      {step==='schema' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#F8FAFC' }}>
              {compType==='sale'?'Sale Comp':compType==='rent_building'?'Rent Comp Building':'Rent Comp Unit'} — Column Reference ({cols.length} columns)
            </div>
            <button onClick={downloadSample} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(197,150,58,0.1)', border:'1px solid rgba(197,150,58,0.3)', color:'#C5963A', borderRadius:4, padding:'5px 12px', fontSize:11, cursor:'pointer' }}>
              <Download size={12} /> Download Sample CSV
            </button>
          </div>
          <div style={{ background:'#1B2A4A', border:'1px solid rgba(248,250,252,0.08)', borderRadius:8, overflow:'hidden', marginBottom:20 }}>
            <SchemaTable cols={cols} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setStep('type')} style={btnSecondary}>← Back</button>
            <button onClick={()=>setStep('upload')} style={btnPrimary}>Upload CSV →</button>
          </div>
        </div>
      )}

      {step==='upload' && (
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#F8FAFC', marginBottom:16 }}>Upload Your CSV File</div>
          <div onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f)}} onDragOver={e=>e.preventDefault()}
            style={{ border:'2px dashed rgba(197,150,58,0.3)', borderRadius:8, padding:60, textAlign:'center', cursor:'pointer', marginBottom:16 }}
            onClick={()=>document.getElementById('comp-csv-upload')?.click()}>
            <Upload size={36} color="rgba(197,150,58,0.5)" style={{ margin:'0 auto 14px' }} />
            <div style={{ color:'#F8FAFC', fontSize:14, fontWeight:600, marginBottom:6 }}>Drop CSV here or click to browse</div>
            <div style={{ color:'rgba(248,250,252,0.4)', fontSize:12 }}>Accepts .csv from CoStar, LoopNet, MLS, or your own format</div>
            <input id="comp-csv-upload" type="file" accept=".csv" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setStep('schema')} style={btnSecondary}>← Back</button>
            <button onClick={downloadSample} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(248,250,252,0.06)', border:'1px solid rgba(248,250,252,0.12)', color:'rgba(248,250,252,0.6)', borderRadius:4, padding:'9px 16px', fontSize:12, cursor:'pointer' }}>
              <Download size={13} /> Download Sample CSV Instead
            </button>
          </div>
        </div>
      )}

      {step==='map' && (
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#F8FAFC', marginBottom:6 }}>Map Your Columns</div>
          <div style={{ fontSize:12, color:'rgba(248,250,252,0.5)', marginBottom:16 }}>{headers.length} columns detected. Auto-matched fields are pre-filled.</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            {cols.map(col=>(
              <div key={col.key}>
                <label style={L}>{col.label}{col.required&&<span style={{ color:'#ef4444', marginLeft:4 }}>*</span>} <span style={{ color:'rgba(248,250,252,0.25)', fontWeight:400 }}>({col.type})</span></label>
                <select style={{ ...S, cursor:'pointer' }} value={mapping[col.key]||''} onChange={e=>setMapping(m=>({...m,[col.key]:e.target.value}))}>
                  <option value="">— skip —</option>
                  {headers.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                {mapping[col.key]&&<div style={{ fontSize:10, color:'#22c55e', marginTop:2 }}>✓ Mapped to "{mapping[col.key]}"</div>}
                {!mapping[col.key]&&col.required&&<div style={{ fontSize:10, color:'#ef4444', marginTop:2 }}>⚠ Required — please map this column</div>}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setStep('upload')} style={btnSecondary}>← Back</button>
            <button onClick={()=>setStep('preview')} style={btnPrimary}>Preview {rows.length} Rows →</button>
          </div>
        </div>
      )}

      {step==='preview' && (
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#F8FAFC', marginBottom:6 }}>Preview — First 8 Rows</div>
          <div style={{ fontSize:12, color:'rgba(248,250,252,0.5)', marginBottom:16 }}>Review the mapped data before importing to Supabase.</div>
          <div style={{ background:'#1B2A4A', border:'1px solid rgba(248,250,252,0.08)', borderRadius:8, overflow:'auto', marginBottom:20, maxHeight:360 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'rgba(15,23,42,0.8)', position:'sticky', top:0 }}>
                  {cols.filter(c=>mapping[c.key]).map(c=>(
                    <th key={c.key} style={{ padding:'8px 10px', textAlign:'left', ...L, fontWeight:700, whiteSpace:'nowrap' }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0,8).map((row,i)=>(
                  <tr key={i} style={{ borderTop:'1px solid rgba(248,250,252,0.05)' }}>
                    {cols.filter(c=>mapping[c.key]).map(c=>{
                      const v=getVal(row,headers,mapping,c.key)
                      return <td key={c.key} style={{ padding:'7px 10px', color:v?'#F8FAFC':'rgba(248,250,252,0.2)', whiteSpace:'nowrap' }}>{v||'—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setStep('map')} style={btnSecondary}>← Back</button>
            <button onClick={doImport} disabled={loading} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, ...btnPrimary, padding:'9px 0' }}>
              {loading?<><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> Importing {rows.length} rows...</>:`Import ${rows.length} Rows to Supabase →`}
            </button>
          </div>
        </div>
      )}

      {step==='done' && result && (
        <div style={{ textAlign:'center', padding:'40px 0' }}>
          <CheckCircle size={48} color="#22c55e" style={{ margin:'0 auto 16px' }} />
          <div style={{ fontSize:22, fontWeight:800, color:'#F8FAFC', marginBottom:8 }}>Import Complete</div>
          <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:24 }}>
            <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:6, padding:'12px 24px' }}>
              <div style={{ fontSize:28, fontWeight:800, color:'#22c55e' }}>{result.inserted}</div>
              <div style={{ fontSize:11, color:'rgba(248,250,252,0.4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Imported</div>
            </div>
            <div style={{ background:'rgba(248,250,252,0.05)', border:'1px solid rgba(248,250,252,0.1)', borderRadius:6, padding:'12px 24px' }}>
              <div style={{ fontSize:28, fontWeight:800, color:'rgba(248,250,252,0.5)' }}>{result.skipped}</div>
              <div style={{ fontSize:11, color:'rgba(248,250,252,0.4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Skipped</div>
            </div>
          </div>
          {result.errors.length>0 && (
            <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:6, padding:16, textAlign:'left', maxWidth:600, margin:'0 auto 20px', maxHeight:200, overflowY:'auto' }}>
              <div style={{ fontSize:11, color:'#ef4444', fontWeight:700, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <AlertCircle size={13} /> {result.errors.length} Error{result.errors.length>1?'s':''}
              </div>
              {result.errors.map((e,i)=><div key={i} style={{ fontSize:11, color:'rgba(248,250,252,0.5)', marginBottom:4, paddingLeft:8, borderLeft:'2px solid rgba(239,68,68,0.3)' }}>{e}</div>)}
            </div>
          )}
          <button onClick={()=>{ setStep('type'); setRows([]); setHeaders([]); setMapping({}); setResult(null) }} style={btnPrimary}>
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}
