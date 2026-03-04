import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Users, Plus, Search, Phone, Mail, MapPin, Building2,
  Upload, Download, Loader2, CheckCircle, Star
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type PhoneEntry   = { value: string; type: string; status: string }
type EmailEntry   = { value: string; type: string; status: string }
type AddressEntry = { value: string; city: string; state: string; zip: string; type: string; status: string }
type LinkedProperty = { id?: string; address: string; city?: string; state?: string; zip_code?: string; apn?: string; relationship: string; notes?: string; is_db_property?: boolean }
type DBProperty   = { id: string; address: string; city?: string; state?: string; zip_code?: string }

interface Contact {
  id: string; first_name: string; last_name: string; company?: string
  contact_type?: string; status?: string; city?: string; state?: string; zip_code?: string
  phone?: string; email?: string; phones?: PhoneEntry[]; emails?: EmailEntry[]
  addresses?: AddressEntry[]; tags?: string[]; notes?: string; created_at?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CONTACT_TYPES  = ['Buyer','Seller','Broker','Lender','Attorney','Investor','Tenant','Vendor','Other']
const PHONE_TYPES    = ['Mobile','Landline','Work','Home','Other']
const EMAIL_TYPES    = ['Work','Personal','Other']
const ADDRESS_TYPES  = ['Mailing','Property','Office','Other']
const FIELD_STATUSES = ['Primary','Good','Bad','Unknown']
const RELATIONSHIP_TYPES = ['Owner','Buyer','Tenant','Guarantor','Investor','LLC Member','Trust Beneficiary','Other']

const S: React.CSSProperties = { background:'rgba(27,42,74,0.6)', border:'1px solid rgba(248,250,252,0.1)', color:'#F8FAFC', borderRadius:4, padding:'6px 10px', width:'100%', fontSize:13 }
const L: React.CSSProperties = { color:'rgba(248,250,252,0.4)', fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:4 }

const TYPE_COLORS: Record<string,string> = { Buyer:'#3B9CB5', Seller:'#C5963A', Broker:'#8b5cf6', Lender:'#22c55e', Attorney:'#f59e0b', Investor:'#1B2A4A', Tenant:'#64748b', Vendor:'#ec4899', Other:'#475569' }
const STATUS_COLORS: Record<string,string> = { Active:'#22c55e', Inactive:'#64748b', Lead:'#C5963A', 'Do Not Contact':'#ef4444' }

function getPhone(c: Contact) { return c.phones?.[0]?.value || c.phone || '' }
function getEmail(c: Contact) { return c.emails?.[0]?.value || c.email || '' }

// ─── Badges ───────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type?: string }) {
  const c = TYPE_COLORS[type||'Other']||'#475569'
  return <span style={{ background:`${c}22`, color:c, border:`1px solid ${c}44`, borderRadius:3, padding:'1px 7px', fontSize:10, fontWeight:600 }}>{type||'Other'}</span>
}
function StatusBadge({ status }: { status?: string }) {
  const c = STATUS_COLORS[status||'Active']||'#64748b'
  return <span style={{ background:`${c}22`, color:c, border:`1px solid ${c}44`, borderRadius:3, padding:'1px 7px', fontSize:10, fontWeight:600 }}>{status||'Active'}</span>
}

// ─── PhoneArray ───────────────────────────────────────────────────────────────
function PhoneArray({ phones, onChange }: { phones: PhoneEntry[]; onChange: (v: PhoneEntry[]) => void }) {
  const add = () => onChange([...phones, { value:'', type:'Mobile', status:'Primary' }])
  const rm  = (i: number) => onChange(phones.filter((_,idx) => idx!==i))
  const up  = (i: number, f: string, v: string) => onChange(phones.map((p,idx) => idx===i ? {...p,[f]:v} : p))
  return (
    <div>
      {phones.map((p,i) => (
        <div key={i} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
          <input style={{ ...S, flex:2 }} placeholder="Phone number" value={p.value} onChange={e=>up(i,'value',e.target.value)} />
          <select style={{ ...S, flex:1, cursor:'pointer' }} value={p.type} onChange={e=>up(i,'type',e.target.value)}>
            {PHONE_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <select style={{ ...S, flex:1, cursor:'pointer' }} value={p.status} onChange={e=>up(i,'status',e.target.value)}>
            {FIELD_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={()=>rm(i)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:18, padding:'0 4px', lineHeight:1 }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ background:'none', border:'1px dashed rgba(248,250,252,0.2)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'4px 12px', fontSize:11, cursor:'pointer', width:'100%' }}>+ Add Phone</button>
    </div>
  )
}

// ─── EmailArray ───────────────────────────────────────────────────────────────
function EmailArray({ emails, onChange }: { emails: EmailEntry[]; onChange: (v: EmailEntry[]) => void }) {
  const add = () => onChange([...emails, { value:'', type:'Work', status:'Primary' }])
  const rm  = (i: number) => onChange(emails.filter((_,idx) => idx!==i))
  const up  = (i: number, f: string, v: string) => onChange(emails.map((e,idx) => idx===i ? {...e,[f]:v} : e))
  return (
    <div>
      {emails.map((e,i) => (
        <div key={i} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
          <input style={{ ...S, flex:3 }} placeholder="Email address" type="email" value={e.value} onChange={ev=>up(i,'value',ev.target.value)} />
          <select style={{ ...S, flex:1, cursor:'pointer' }} value={e.type} onChange={ev=>up(i,'type',ev.target.value)}>
            {EMAIL_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <select style={{ ...S, flex:1, cursor:'pointer' }} value={e.status} onChange={ev=>up(i,'status',ev.target.value)}>
            {FIELD_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={()=>rm(i)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:18, padding:'0 4px', lineHeight:1 }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ background:'none', border:'1px dashed rgba(248,250,252,0.2)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'4px 12px', fontSize:11, cursor:'pointer', width:'100%' }}>+ Add Email</button>
    </div>
  )
}

// ─── AddressArray ─────────────────────────────────────────────────────────────
function AddressArray({ addresses, onChange }: { addresses: AddressEntry[]; onChange: (v: AddressEntry[]) => void }) {
  const add = () => onChange([...addresses, { value:'', city:'', state:'CA', zip:'', type:'Mailing', status:'Primary' }])
  const rm  = (i: number) => onChange(addresses.filter((_,idx) => idx!==i))
  const up  = (i: number, f: string, v: string) => onChange(addresses.map((a,idx) => idx===i ? {...a,[f]:v} : a))
  return (
    <div>
      {addresses.map((a,i) => (
        <div key={i} style={{ border:'1px solid rgba(248,250,252,0.08)', borderRadius:6, padding:10, marginBottom:8 }}>
          <div style={{ display:'flex', gap:6, marginBottom:6 }}>
            <input style={{ ...S, flex:3 }} placeholder="Street address" value={a.value} onChange={e=>up(i,'value',e.target.value)} />
            <select style={{ ...S, flex:1, cursor:'pointer' }} value={a.type} onChange={e=>up(i,'type',e.target.value)}>
              {ADDRESS_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select style={{ ...S, flex:1, cursor:'pointer' }} value={a.status} onChange={e=>up(i,'status',e.target.value)}>
              {FIELD_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={()=>rm(i)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:18, padding:'0 4px', lineHeight:1 }}>×</button>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input style={{ ...S, flex:2 }} placeholder="City" value={a.city} onChange={e=>up(i,'city',e.target.value)} />
            <input style={{ ...S, flex:1 }} placeholder="State" value={a.state} onChange={e=>up(i,'state',e.target.value)} />
            <input style={{ ...S, flex:1 }} placeholder="ZIP" value={a.zip} onChange={e=>up(i,'zip',e.target.value)} />
          </div>
        </div>
      ))}
      <button onClick={add} style={{ background:'none', border:'1px dashed rgba(248,250,252,0.2)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'4px 12px', fontSize:11, cursor:'pointer', width:'100%' }}>+ Add Address</button>
    </div>
  )
}

// ─── PropertyLinker ───────────────────────────────────────────────────────────
function PropertyLinker({ linked, onChange, dbProperties, autoSuggestions }: {
  linked: LinkedProperty[]; onChange: (v: LinkedProperty[]) => void
  dbProperties: DBProperty[]; autoSuggestions: DBProperty[]
}) {
  const [search, setSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [newP, setNewP] = useState<LinkedProperty>({ address:'', city:'', state:'CA', zip_code:'', apn:'', relationship:'Owner' })

  const filtered = dbProperties.filter(p =>
    p.address.toLowerCase().includes(search.toLowerCase()) ||
    (p.city||'').toLowerCase().includes(search.toLowerCase())
  ).slice(0,8)

  const linkDB = (p: DBProperty) => {
    if (linked.find(l=>l.id===p.id)) return
    onChange([...linked, { id:p.id, address:p.address, city:p.city, state:p.state, zip_code:p.zip_code, relationship:'Owner', is_db_property:true }])
    setSearch(''); setShowDrop(false)
  }
  const addNew = () => {
    if (!newP.address.trim()) return
    onChange([...linked, { ...newP }])
    setNewP({ address:'', city:'', state:'CA', zip_code:'', apn:'', relationship:'Owner' })
    setAddingNew(false)
  }
  const rm = (i: number) => onChange(linked.filter((_,idx)=>idx!==i))
  const upRel = (i: number, rel: string) => onChange(linked.map((l,idx)=>idx===i?{...l,relationship:rel}:l))

  return (
    <div>
      {linked.map((p,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(27,42,74,0.5)', border:'1px solid rgba(248,250,252,0.08)', borderRadius:4, padding:'6px 10px', marginBottom:6 }}>
          <Building2 size={13} color={p.is_db_property?'#3B9CB5':'#C5963A'} />
          <div style={{ flex:1, fontSize:12, color:'#F8FAFC' }}>{p.address}{p.city?`, ${p.city}`:''}</div>
          <select style={{ ...S, width:120, fontSize:11, cursor:'pointer' }} value={p.relationship} onChange={e=>upRel(i,e.target.value)}>
            {RELATIONSHIP_TYPES.map(r=><option key={r}>{r}</option>)}
          </select>
          <button onClick={()=>rm(i)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:18, padding:'0 2px', lineHeight:1 }}>×</button>
        </div>
      ))}

      {autoSuggestions.length > 0 && (
        <div style={{ background:'rgba(197,150,58,0.08)', border:'1px solid rgba(197,150,58,0.2)', borderRadius:6, padding:10, marginBottom:10 }}>
          <div style={{ fontSize:10, color:'#C5963A', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            ★ Public Record Match — Properties with same owner name/address
          </div>
          {autoSuggestions.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ flex:1, fontSize:12, color:'#F8FAFC' }}>{p.address}{p.city?`, ${p.city}`:''}</span>
              <button onClick={()=>linkDB(p)} disabled={!!linked.find(l=>l.id===p.id)}
                style={{ background:linked.find(l=>l.id===p.id)?'rgba(34,197,94,0.15)':'rgba(197,150,58,0.2)', border:'none', color:linked.find(l=>l.id===p.id)?'#22c55e':'#C5963A', borderRadius:3, padding:'3px 10px', fontSize:11, cursor:'pointer' }}>
                {linked.find(l=>l.id===p.id)?'✓ Linked':'+ Link'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ position:'relative', marginBottom:8 }}>
        <input style={{ ...S, paddingLeft:30 }} placeholder="Search existing properties to link..."
          value={search} onFocus={()=>setShowDrop(true)}
          onChange={e=>{ setSearch(e.target.value); setShowDrop(true) }} />
        <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'rgba(248,250,252,0.3)' }} />
        {showDrop && search && filtered.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#1B2A4A', border:'1px solid rgba(248,250,252,0.12)', borderRadius:4, zIndex:50, maxHeight:200, overflowY:'auto' }}>
            {filtered.map(p => (
              <div key={p.id} onClick={()=>linkDB(p)} style={{ padding:'8px 12px', cursor:'pointer', fontSize:12, borderBottom:'1px solid rgba(248,250,252,0.06)' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(197,150,58,0.1)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <div style={{ color:'#F8FAFC' }}>{p.address}</div>
                {p.city && <div style={{ color:'rgba(248,250,252,0.4)', fontSize:11 }}>{p.city}, {p.state}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {!addingNew ? (
        <button onClick={()=>setAddingNew(true)} style={{ background:'none', border:'1px dashed rgba(248,250,252,0.2)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'4px 12px', fontSize:11, cursor:'pointer', width:'100%' }}>
          + Add New Property On-the-Fly
        </button>
      ) : (
        <div style={{ border:'1px solid rgba(197,150,58,0.3)', borderRadius:6, padding:10 }}>
          <div style={{ fontSize:11, color:'#C5963A', fontWeight:600, marginBottom:8 }}>New Property</div>
          <div style={{ display:'flex', gap:6, marginBottom:6 }}>
            <input style={{ ...S, flex:2 }} placeholder="Street address *" value={newP.address} onChange={e=>setNewP(p=>({...p,address:e.target.value}))} />
            <select style={{ ...S, flex:1, cursor:'pointer' }} value={newP.relationship} onChange={e=>setNewP(p=>({...p,relationship:e.target.value}))}>
              {RELATIONSHIP_TYPES.map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:6, marginBottom:6 }}>
            <input style={{ ...S, flex:2 }} placeholder="City" value={newP.city} onChange={e=>setNewP(p=>({...p,city:e.target.value}))} />
            <input style={{ ...S, flex:1 }} placeholder="State" value={newP.state} onChange={e=>setNewP(p=>({...p,state:e.target.value}))} />
            <input style={{ ...S, flex:1 }} placeholder="ZIP" value={newP.zip_code} onChange={e=>setNewP(p=>({...p,zip_code:e.target.value}))} />
          </div>
          <div style={{ display:'flex', gap:6, marginBottom:6 }}>
            <input style={{ ...S, flex:1 }} placeholder="APN (optional)" value={newP.apn} onChange={e=>setNewP(p=>({...p,apn:e.target.value}))} />
            <input style={{ ...S, flex:2 }} placeholder="Notes (optional)" value={newP.notes} onChange={e=>setNewP(p=>({...p,notes:e.target.value}))} />
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={addNew} style={{ flex:1, background:'rgba(197,150,58,0.2)', border:'1px solid rgba(197,150,58,0.4)', color:'#C5963A', borderRadius:4, padding:'5px 0', fontSize:12, cursor:'pointer' }}>Add Property</button>
            <button onClick={()=>setAddingNew(false)} style={{ flex:1, background:'rgba(248,250,252,0.05)', border:'1px solid rgba(248,250,252,0.1)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'5px 0', fontSize:12, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────
const CSV_COLS = ['first_name','last_name','company','contact_type','phone','email','city','state','zip_code','status','tags','notes']
const CSV_ALIASES: Record<string,string[]> = {
  first_name:['first_name','first name','firstname','fname'],
  last_name:['last_name','last name','lastname','lname','surname'],
  company:['company','company name','firm','organization'],
  contact_type:['contact_type','type','contact type','role'],
  phone:['phone','phone number','mobile','cell','telephone'],
  email:['email','email address','e-mail'],
  city:['city'], state:['state','st'],
  zip_code:['zip','zip_code','postal','postal code'],
  status:['status'], tags:['tags','labels'], notes:['notes','comments','memo'],
}

function CSVImportModal({ onClose, onImported, teamId }: { onClose: ()=>void; onImported: ()=>void; teamId: string }) {
  const [step, setStep] = useState<'upload'|'map'|'preview'|'done'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string,string>>({})
  const [result, setResult] = useState<{ inserted:number; skipped:number; errors:string[] }|null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(l=>l.trim())
      if (lines.length < 2) return
      const hdrs = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''))
      const rws  = lines.slice(1).map(l=>l.split(',').map(v=>v.trim().replace(/^"|"$/g,'')))
      setHeaders(hdrs); setRows(rws)
      const auto: Record<string,string> = {}
      hdrs.forEach(h => {
        const lower = h.toLowerCase()
        for (const [col,alts] of Object.entries(CSV_ALIASES)) {
          if (alts.includes(lower)) { auto[col]=h; break }
        }
      })
      setMapping(auto); setStep('map')
    }
    reader.readAsText(file)
  }

  const downloadSample = () => {
    const csv = 'first_name,last_name,company,contact_type,phone,email,city,state,zip_code,status,tags,notes\nJohn,Smith,Smith Capital LLC,Buyer,(310) 555-0100,jsmith@smithcap.com,Long Beach,CA,90803,Active,buyer;multifamily,Looking for 4-8 unit buildings\nMaria,Garcia,,Seller,(562) 555-0200,mgarcia@email.com,Naples,CA,90803,Active,seller;motivated,Owns 4-plex on 2nd St'
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='contacts_sample.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async () => {
    setLoading(true)
    let inserted=0, skipped=0; const errors: string[] = []
    for (const row of rows) {
      const get = (col: string) => { const h=mapping[col]; if(!h) return ''; const idx=headers.indexOf(h); return idx>=0?(row[idx]||''):'' }
      const fn = get('first_name')
      if (!fn) { skipped++; continue }
      const phone=get('phone'), email=get('email')
      const tags = get('tags') ? get('tags').split(';').map(t=>t.trim()).filter(Boolean) : []
      const record = {
        team_id:teamId, first_name:fn, last_name:get('last_name')||null,
        company:get('company')||null, contact_type:get('contact_type')||'Other',
        phone:phone||null, email:email||null,
        city:get('city')||null, state:get('state')||null, zip_code:get('zip_code')||null,
        status:get('status')||'Active', tags, notes:get('notes')||null,
        phones:phone?[{value:phone,type:'Mobile',status:'Primary'}]:[],
        emails:email?[{value:email,type:'Work',status:'Primary'}]:[],
        addresses:[],
      }
      const { error } = await supabase.from('contacts').insert(record)
      if (error) { errors.push(`${fn}: ${error.message}`); skipped++ } else inserted++
    }
    setResult({ inserted, skipped, errors }); setStep('done'); setLoading(false)
    if (inserted>0) onImported()
  }

  const stepKeys = ['upload','map','preview','done']
  const stepLabels = ['Upload','Map Columns','Preview','Done']

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#0F172A', border:'1px solid rgba(248,250,252,0.12)', borderRadius:8, width:640, maxHeight:'85vh', overflowY:'auto', padding:28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#F8FAFC' }}>Import Contacts from CSV</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(248,250,252,0.4)', cursor:'pointer', fontSize:20 }}>×</button>
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {stepLabels.map((s,i) => {
            const active = stepKeys[i]===step, done = stepKeys.indexOf(step)>i
            return <div key={s} style={{ flex:1, textAlign:'center', padding:'6px 0', borderRadius:4, fontSize:11, fontWeight:600,
              background:active?'rgba(197,150,58,0.2)':done?'rgba(34,197,94,0.1)':'rgba(248,250,252,0.05)',
              color:active?'#C5963A':done?'#22c55e':'rgba(248,250,252,0.3)',
              border:`1px solid ${active?'rgba(197,150,58,0.4)':done?'rgba(34,197,94,0.3)':'rgba(248,250,252,0.08)'}`
            }}>{done?'✓ ':''}{s}</div>
          })}
        </div>

        {step==='upload' && (
          <div>
            <div onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f)}} onDragOver={e=>e.preventDefault()}
              style={{ border:'2px dashed rgba(197,150,58,0.3)', borderRadius:8, padding:40, textAlign:'center', cursor:'pointer' }}
              onClick={()=>document.getElementById('csv-contacts-upload')?.click()}>
              <Upload size={32} color="rgba(197,150,58,0.5)" style={{ margin:'0 auto 12px' }} />
              <div style={{ color:'#F8FAFC', fontSize:14, marginBottom:6 }}>Drop CSV here or click to browse</div>
              <div style={{ color:'rgba(248,250,252,0.4)', fontSize:12 }}>Any CSV with contact data</div>
              <input id="csv-contacts-upload" type="file" accept=".csv" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}} />
            </div>
            <button onClick={downloadSample} style={{ marginTop:12, background:'none', border:'1px solid rgba(248,250,252,0.15)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'7px 16px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <Download size={13} /> Download Sample CSV
            </button>
          </div>
        )}

        {step==='map' && (
          <div>
            <div style={{ fontSize:12, color:'rgba(248,250,252,0.5)', marginBottom:16 }}>Map your CSV columns. Auto-detected fields are pre-filled.</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              {CSV_COLS.map(col => (
                <div key={col}>
                  <label style={L}>{col.replace(/_/g,' ')}</label>
                  <select style={{ ...S, cursor:'pointer' }} value={mapping[col]||''} onChange={e=>setMapping(m=>({...m,[col]:e.target.value}))}>
                    <option value="">— skip —</option>
                    {headers.map(h=><option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={()=>setStep('preview')} style={{ width:'100%', background:'rgba(197,150,58,0.2)', border:'1px solid rgba(197,150,58,0.4)', color:'#C5963A', borderRadius:4, padding:'8px 0', fontSize:13, cursor:'pointer', fontWeight:600 }}>
              Preview ({rows.length} rows) →
            </button>
          </div>
        )}

        {step==='preview' && (
          <div>
            <div style={{ fontSize:12, color:'rgba(248,250,252,0.5)', marginBottom:12 }}>First 5 rows after mapping:</div>
            <div style={{ overflowX:'auto', marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr>{['First Name','Last Name','Company','Type','Phone','Email'].map(h=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:'left', color:'rgba(248,250,252,0.4)', borderBottom:'1px solid rgba(248,250,252,0.08)' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {rows.slice(0,5).map((row,i) => {
                    const get = (col: string) => { const h=mapping[col]; return h?(row[headers.indexOf(h)]||''):'' }
                    return (
                      <tr key={i} style={{ borderBottom:'1px solid rgba(248,250,252,0.05)' }}>
                        {['first_name','last_name','company','contact_type','phone','email'].map(col=>(
                          <td key={col} style={{ padding:'6px 8px', color:'#F8FAFC' }}>{get(col)||<span style={{ color:'rgba(248,250,252,0.2)' }}>—</span>}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setStep('map')} style={{ flex:1, background:'rgba(248,250,252,0.05)', border:'1px solid rgba(248,250,252,0.1)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'8px 0', fontSize:13, cursor:'pointer' }}>← Back</button>
              <button onClick={doImport} disabled={loading} style={{ flex:2, background:'rgba(197,150,58,0.2)', border:'1px solid rgba(197,150,58,0.4)', color:'#C5963A', borderRadius:4, padding:'8px 0', fontSize:13, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading?<><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> Importing...</>:`Import ${rows.length} Contacts`}
              </button>
            </div>
          </div>
        )}

        {step==='done' && result && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <CheckCircle size={40} color="#22c55e" style={{ margin:'0 auto 12px' }} />
            <div style={{ fontSize:18, fontWeight:700, color:'#F8FAFC', marginBottom:8 }}>Import Complete</div>
            <div style={{ fontSize:13, color:'rgba(248,250,252,0.6)', marginBottom:16 }}>{result.inserted} imported · {result.skipped} skipped</div>
            {result.errors.length>0 && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:6, padding:12, textAlign:'left', marginBottom:16 }}>
                <div style={{ fontSize:11, color:'#ef4444', fontWeight:600, marginBottom:6 }}>Errors:</div>
                {result.errors.slice(0,5).map((e,i)=><div key={i} style={{ fontSize:11, color:'rgba(248,250,252,0.5)' }}>{e}</div>)}
              </div>
            )}
            <button onClick={onClose} style={{ background:'rgba(197,150,58,0.2)', border:'1px solid rgba(197,150,58,0.4)', color:'#C5963A', borderRadius:4, padding:'8px 24px', fontSize:13, cursor:'pointer', fontWeight:600 }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Contact Form Modal ───────────────────────────────────────────────────────
function ContactFormModal({ contact, onClose, onSaved, teamId, dbProperties }: {
  contact?: Contact|null; onClose: ()=>void; onSaved: ()=>void; teamId: string; dbProperties: DBProperty[]
}) {
  const isEdit = !!contact?.id
  const [form, setForm] = useState({
    first_name:contact?.first_name||'', last_name:contact?.last_name||'',
    company:contact?.company||'', contact_type:contact?.contact_type||'Buyer',
    city:contact?.city||'', state:contact?.state||'CA', zip_code:contact?.zip_code||'',
    status:contact?.status||'Active', notes:contact?.notes||'', tags:(contact?.tags||[]).join(', '),
  })
  const [phones, setPhones] = useState<PhoneEntry[]>(
    contact?.phones?.length ? contact.phones : contact?.phone ? [{value:contact.phone,type:'Mobile',status:'Primary'}] : [{value:'',type:'Mobile',status:'Primary'}]
  )
  const [emails, setEmails] = useState<EmailEntry[]>(
    contact?.emails?.length ? contact.emails : contact?.email ? [{value:contact.email,type:'Work',status:'Primary'}] : [{value:'',type:'Work',status:'Primary'}]
  )
  const [addresses, setAddresses] = useState<AddressEntry[]>(contact?.addresses||[])
  const [linkedProps, setLinkedProps] = useState<LinkedProperty[]>([])
  const [autoSuggestions, setAutoSuggestions] = useState<DBProperty[]>([])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'basic'|'contact'|'properties'>('basic')

  useEffect(() => {
    if (!form.last_name && !form.company) return
    const suggestions = dbProperties.filter(p =>
      (form.last_name && p.address.toLowerCase().includes(form.last_name.toLowerCase())) ||
      (form.company && p.address.toLowerCase().includes(form.company.toLowerCase()))
    ).slice(0,5)
    setAutoSuggestions(suggestions)
  }, [form.last_name, form.company, dbProperties])

  const save = async () => {
    if (!form.first_name.trim()) return
    setSaving(true)
    const tags = form.tags.split(',').map(t=>t.trim()).filter(Boolean)
    const primaryPhone = phones.find(p=>p.value)?.value||null
    const primaryEmail = emails.find(e=>e.value)?.value||null
    const record = {
      team_id:teamId, first_name:form.first_name, last_name:form.last_name||null,
      company:form.company||null, contact_type:form.contact_type,
      city:form.city||null, state:form.state||null, zip_code:form.zip_code||null,
      status:form.status, notes:form.notes||null, tags,
      phone:primaryPhone, email:primaryEmail,
      phones:phones.filter(p=>p.value), emails:emails.filter(e=>e.value), addresses:addresses.filter(a=>a.value),
    }
    if (isEdit) await supabase.from('contacts').update(record).eq('id',contact!.id)
    else await supabase.from('contacts').insert(record)
    setSaving(false); onSaved(); onClose()
  }

  const tabs = [{key:'basic',label:'Basic Info'},{key:'contact',label:'Phone & Email & Address'},{key:'properties',label:'Linked Properties'}]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#0F172A', border:'1px solid rgba(248,250,252,0.12)', borderRadius:8, width:660, maxHeight:'90vh', overflowY:'auto', padding:28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#F8FAFC' }}>{isEdit?'Edit Contact':'New Contact'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(248,250,252,0.4)', cursor:'pointer', fontSize:20 }}>×</button>
        </div>
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid rgba(248,250,252,0.08)', paddingBottom:0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key as typeof tab)}
              style={{ background:'none', border:'none', borderBottom:tab===t.key?'2px solid #C5963A':'2px solid transparent', color:tab===t.key?'#C5963A':'rgba(248,250,252,0.5)', padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==='basic' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div><label style={L}>First Name *</label><input style={S} value={form.first_name} onChange={e=>setForm(f=>({...f,first_name:e.target.value}))} placeholder="First name" /></div>
            <div><label style={L}>Last Name</label><input style={S} value={form.last_name} onChange={e=>setForm(f=>({...f,last_name:e.target.value}))} placeholder="Last name" /></div>
            <div style={{ gridColumn:'1 / -1' }}><label style={L}>Company / Entity</label><input style={S} value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} placeholder="Company or LLC name" /></div>
            <div><label style={L}>Contact Type</label><select style={{ ...S, cursor:'pointer' }} value={form.contact_type} onChange={e=>setForm(f=>({...f,contact_type:e.target.value}))}>{CONTACT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={L}>Status</label><select style={{ ...S, cursor:'pointer' }} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{['Active','Inactive','Lead','Do Not Contact'].map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label style={L}>City</label><input style={S} value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="City" /></div>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}><label style={L}>State</label><input style={S} value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))} placeholder="CA" /></div>
              <div style={{ flex:1 }}><label style={L}>ZIP</label><input style={S} value={form.zip_code} onChange={e=>setForm(f=>({...f,zip_code:e.target.value}))} placeholder="90803" /></div>
            </div>
            <div style={{ gridColumn:'1 / -1' }}><label style={L}>Tags (comma separated)</label><input style={S} value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="buyer, multifamily, 1031" /></div>
            <div style={{ gridColumn:'1 / -1' }}><label style={L}>Notes</label><textarea style={{ ...S, minHeight:72, resize:'vertical' }} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Internal notes..." /></div>
          </div>
        )}

        {tab==='contact' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#F8FAFC', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><Phone size={13} color="#C5963A" /> Phone Numbers</div>
              <PhoneArray phones={phones} onChange={setPhones} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#F8FAFC', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><Mail size={13} color="#3B9CB5" /> Email Addresses</div>
              <EmailArray emails={emails} onChange={setEmails} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#F8FAFC', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><MapPin size={13} color="#8b5cf6" /> Mailing Addresses</div>
              <AddressArray addresses={addresses} onChange={setAddresses} />
            </div>
          </div>
        )}

        {tab==='properties' && (
          <div>
            <div style={{ fontSize:12, color:'rgba(248,250,252,0.5)', marginBottom:16 }}>Link properties to this contact. Search existing database properties or add new ones on-the-fly.</div>
            <PropertyLinker linked={linkedProps} onChange={setLinkedProps} dbProperties={dbProperties} autoSuggestions={autoSuggestions} />
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginTop:24, paddingTop:16, borderTop:'1px solid rgba(248,250,252,0.08)' }}>
          <button onClick={onClose} style={{ flex:1, background:'rgba(248,250,252,0.05)', border:'1px solid rgba(248,250,252,0.1)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'9px 0', fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving||!form.first_name.trim()} style={{ flex:2, background:'rgba(197,150,58,0.2)', border:'1px solid rgba(197,150,58,0.4)', color:'#C5963A', borderRadius:4, padding:'9px 0', fontSize:13, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {saving?<><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> Saving...</>:isEdit?'Save Changes':'Create Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contact Detail Drawer ────────────────────────────────────────────────────
function ContactDrawer({ contact, onClose, onEdit, onSkipTrace }: { contact: Contact; onClose: ()=>void; onEdit: ()=>void; onSkipTrace: ()=>void }) {
  const phones = contact.phones?.length ? contact.phones : contact.phone ? [{value:contact.phone,type:'Mobile',status:'Primary'}] : []
  const emails = contact.emails?.length ? contact.emails : contact.email ? [{value:contact.email,type:'Work',status:'Primary'}] : []
  return (
    <div style={{ position:'fixed', right:0, top:0, bottom:0, width:380, background:'#0F172A', borderLeft:'1px solid rgba(248,250,252,0.1)', zIndex:100, overflowY:'auto', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(197,150,58,0.2)', border:'2px solid rgba(197,150,58,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#C5963A' }}>
            {contact.first_name[0]}{(contact.last_name||'')[0]||''}
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#F8FAFC' }}>{contact.first_name} {contact.last_name}</div>
            {contact.company && <div style={{ fontSize:12, color:'rgba(248,250,252,0.5)' }}>{contact.company}</div>}
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(248,250,252,0.4)', cursor:'pointer', fontSize:20 }}>×</button>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        <TypeBadge type={contact.contact_type} />
        <StatusBadge status={contact.status} />
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button onClick={onEdit} style={{ flex:1, background:'rgba(197,150,58,0.15)', border:'1px solid rgba(197,150,58,0.3)', color:'#C5963A', borderRadius:4, padding:'7px 0', fontSize:12, cursor:'pointer', fontWeight:600 }}>Edit</button>
        <button onClick={onSkipTrace} style={{ flex:1, background:'rgba(59,156,181,0.15)', border:'1px solid rgba(59,156,181,0.3)', color:'#3B9CB5', borderRadius:4, padding:'7px 0', fontSize:12, cursor:'pointer', fontWeight:600 }}>Skip Trace</button>
      </div>
      {phones.length>0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ ...L, marginBottom:8 }}>Phone Numbers</div>
          {phones.map((p,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <Phone size={13} color="#C5963A" />
              <span style={{ fontSize:13, color:'#F8FAFC', flex:1 }}>{p.value}</span>
              <span style={{ fontSize:10, color:'rgba(248,250,252,0.4)', background:'rgba(248,250,252,0.06)', borderRadius:3, padding:'1px 6px' }}>{p.type}</span>
              <span style={{ fontSize:10, color:p.status==='Primary'?'#22c55e':p.status==='Bad'?'#ef4444':'rgba(248,250,252,0.4)', background:'rgba(248,250,252,0.06)', borderRadius:3, padding:'1px 6px' }}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
      {emails.length>0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ ...L, marginBottom:8 }}>Email Addresses</div>
          {emails.map((e,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <Mail size={13} color="#3B9CB5" />
              <span style={{ fontSize:13, color:'#F8FAFC', flex:1 }}>{e.value}</span>
              <span style={{ fontSize:10, color:'rgba(248,250,252,0.4)', background:'rgba(248,250,252,0.06)', borderRadius:3, padding:'1px 6px' }}>{e.type}</span>
              <span style={{ fontSize:10, color:e.status==='Primary'?'#22c55e':e.status==='Bad'?'#ef4444':'rgba(248,250,252,0.4)', background:'rgba(248,250,252,0.06)', borderRadius:3, padding:'1px 6px' }}>{e.status}</span>
            </div>
          ))}
        </div>
      )}
      {(contact.city||contact.state) && (
        <div style={{ marginBottom:16 }}>
          <div style={{ ...L, marginBottom:8 }}>Location</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <MapPin size={13} color="#8b5cf6" />
            <span style={{ fontSize:13, color:'#F8FAFC' }}>{[contact.city,contact.state,contact.zip_code].filter(Boolean).join(', ')}</span>
          </div>
        </div>
      )}
      {contact.tags && contact.tags.length>0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ ...L, marginBottom:8 }}>Tags</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {contact.tags.map(tag => (
              <span key={tag} style={{ background:'rgba(27,42,74,0.8)', border:'1px solid rgba(248,250,252,0.12)', borderRadius:3, padding:'2px 8px', fontSize:11, color:'rgba(248,250,252,0.6)' }}>{tag}</span>
            ))}
          </div>
        </div>
      )}
      {contact.notes && (
        <div style={{ marginBottom:16 }}>
          <div style={{ ...L, marginBottom:8 }}>Notes</div>
          <div style={{ fontSize:12, color:'rgba(248,250,252,0.6)', lineHeight:1.6, background:'rgba(27,42,74,0.4)', borderRadius:4, padding:10 }}>{contact.notes}</div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [selected, setSelected] = useState<Contact|null>(null)
  const [editing, setEditing] = useState<Contact|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showCSV, setShowCSV] = useState(false)
  const [skipTraceContact, setSkipTraceContact] = useState<Contact|null>(null)
  const [teamId, setTeamId] = useState('')
  const [dbProperties, setDbProperties] = useState<DBProperty[]>([])
  const [allTags, setAllTags] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const tid = teamData?.id||''
    setTeamId(tid)
    const { data } = await supabase.from('contacts').select('*').eq('team_id',tid).order('last_name',{ascending:true})
    const list = (data||[]) as Contact[]
    setContacts(list)
    const tags = new Set<string>()
    list.forEach(c=>(c.tags||[]).forEach(t=>tags.add(t)))
    setAllTags(Array.from(tags).sort())
    const { data: props } = await supabase.from('properties').select('id,address,city,state,zip_code').eq('team_id',tid).order('address')
    setDbProperties((props||[]) as DBProperty[])
    setLoading(false)
  }, [])

  useEffect(()=>{ load() },[load])

  useEffect(()=>{
    if (!loading && contacts.length===0 && teamId) {
      seedContacts(teamId).then(load)
    }
  },[loading,contacts.length,teamId,load])

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${c.first_name} ${c.last_name} ${c.company||''} ${getPhone(c)} ${getEmail(c)}`.toLowerCase().includes(q)
    const matchType   = !typeFilter   || c.contact_type===typeFilter
    const matchStatus = !statusFilter || c.status===statusFilter
    const matchTag    = !tagFilter    || (c.tags||[]).includes(tagFilter)
    return matchSearch && matchType && matchStatus && matchTag
  })

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Users size={22} color="#C5963A" />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:'#F8FAFC' }}>Contact Manager</div>
            <div style={{ fontSize:12, color:'rgba(248,250,252,0.4)' }}>{contacts.length} contacts</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowCSV(true)} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(248,250,252,0.06)', border:'1px solid rgba(248,250,252,0.12)', color:'rgba(248,250,252,0.7)', borderRadius:4, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            <Upload size={13} /> Import CSV
          </button>
          <button onClick={()=>{ setEditing(null); setShowForm(true) }} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(197,150,58,0.2)', border:'1px solid rgba(197,150,58,0.4)', color:'#C5963A', borderRadius:4, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            <Plus size={13} /> New Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:2, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'rgba(248,250,252,0.3)' }} />
          <input style={{ ...S, paddingLeft:32 }} placeholder="Search contacts..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select style={{ ...S, flex:1, minWidth:130, cursor:'pointer' }} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {CONTACT_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <select style={{ ...S, flex:1, minWidth:130, cursor:'pointer' }} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['Active','Inactive','Lead','Do Not Contact'].map(s=><option key={s}>{s}</option>)}
        </select>
        <select style={{ ...S, flex:1, minWidth:130, cursor:'pointer' }} value={tagFilter} onChange={e=>setTagFilter(e.target.value)}>
          <option value="">All Tags</option>
          {allTags.map(t=><option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:'#1B2A4A', border:'1px solid rgba(248,250,252,0.08)', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'rgba(15,23,42,0.8)' }}>
              {['Contact','Type','Phone','Email','Location','Tags','Status'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', ...L, fontWeight:700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'rgba(248,250,252,0.3)' }}>
                <Loader2 size={20} style={{ animation:'spin 1s linear infinite', margin:'0 auto' }} />
              </td></tr>
            ) : filtered.length===0 ? (
              <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'rgba(248,250,252,0.3)', fontSize:13 }}>No contacts found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} onClick={()=>setSelected(c)}
                style={{ borderTop:'1px solid rgba(248,250,252,0.05)', cursor:'pointer', transition:'background 0.12s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(248,250,252,0.03)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td style={{ padding:'10px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(197,150,58,0.15)', border:'1px solid rgba(197,150,58,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#C5963A', flexShrink:0 }}>
                      {c.first_name[0]}{(c.last_name||'')[0]||''}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#F8FAFC' }}>{c.first_name} {c.last_name}</div>
                      {c.company && <div style={{ fontSize:11, color:'rgba(248,250,252,0.4)' }}>{c.company}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding:'10px 14px' }}><TypeBadge type={c.contact_type} /></td>
                <td style={{ padding:'10px 14px', fontSize:12, color:'rgba(248,250,252,0.7)' }}>{getPhone(c)||<span style={{ color:'rgba(248,250,252,0.2)' }}>—</span>}</td>
                <td style={{ padding:'10px 14px', fontSize:12, color:'rgba(248,250,252,0.7)' }}>{getEmail(c)||<span style={{ color:'rgba(248,250,252,0.2)' }}>—</span>}</td>
                <td style={{ padding:'10px 14px', fontSize:12, color:'rgba(248,250,252,0.5)' }}>{[c.city,c.state].filter(Boolean).join(', ')||<span style={{ color:'rgba(248,250,252,0.2)' }}>—</span>}</td>
                <td style={{ padding:'10px 14px' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {(c.tags||[]).slice(0,3).map(tag=>(
                      <span key={tag} style={{ background:'rgba(27,42,74,0.8)', border:'1px solid rgba(248,250,252,0.1)', borderRadius:3, padding:'1px 6px', fontSize:10, color:'rgba(248,250,252,0.5)' }}>{tag}</span>
                    ))}
                    {(c.tags||[]).length>3 && <span style={{ fontSize:10, color:'rgba(248,250,252,0.3)' }}>+{(c.tags||[]).length-3}</span>}
                  </div>
                </td>
                <td style={{ padding:'10px 14px' }}><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <ContactDrawer contact={selected} onClose={()=>setSelected(null)}
          onEdit={()=>{ setEditing(selected); setShowForm(true); setSelected(null) }}
          onSkipTrace={()=>{ setSkipTraceContact(selected); setSelected(null) }} />
      )}

      {/* Skip Trace Modal */}
      {skipTraceContact && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#0F172A', border:'1px solid rgba(248,250,252,0.12)', borderRadius:8, width:440, padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#F8FAFC' }}>Skip Trace</div>
              <button onClick={()=>setSkipTraceContact(null)} style={{ background:'none', border:'none', color:'rgba(248,250,252,0.4)', cursor:'pointer', fontSize:20 }}>×</button>
            </div>
            <div style={{ background:'rgba(59,156,181,0.1)', border:'1px solid rgba(59,156,181,0.2)', borderRadius:6, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:13, color:'#F8FAFC', fontWeight:600, marginBottom:4 }}>{skipTraceContact.first_name} {skipTraceContact.last_name}</div>
              {skipTraceContact.company && <div style={{ fontSize:12, color:'rgba(248,250,252,0.5)' }}>{skipTraceContact.company}</div>}
            </div>
            <div style={{ fontSize:12, color:'rgba(248,250,252,0.5)', marginBottom:20, lineHeight:1.6 }}>
              Skip tracing will search public records and data providers to find current contact information. Results will be added to this contact's profile.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setSkipTraceContact(null)} style={{ flex:1, background:'rgba(248,250,252,0.05)', border:'1px solid rgba(248,250,252,0.1)', color:'rgba(248,250,252,0.5)', borderRadius:4, padding:'8px 0', fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button onClick={()=>{ alert('Connect your BatchSkipTracing or PropStream API key in Settings to enable skip tracing.'); setSkipTraceContact(null) }}
                style={{ flex:2, background:'rgba(59,156,181,0.2)', border:'1px solid rgba(59,156,181,0.4)', color:'#3B9CB5', borderRadius:4, padding:'8px 0', fontSize:13, cursor:'pointer', fontWeight:600 }}>
                Run Skip Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      {showForm && (
        <ContactFormModal contact={editing} onClose={()=>setShowForm(false)} onSaved={load} teamId={teamId} dbProperties={dbProperties} />
      )}

      {/* CSV Import Modal */}
      {showCSV && (
        <CSVImportModal onClose={()=>setShowCSV(false)} onImported={load} teamId={teamId} />
      )}
    </div>
  )
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seedContacts(teamId: string) {
  const contacts = [
    { first_name:'Michael', last_name:'Chen', company:'Chen Capital Partners LLC', contact_type:'Buyer', city:'Los Angeles', state:'CA', zip_code:'90025', status:'Active', tags:['buyer','multifamily','1031'], phone:'(310) 555-0101', email:'mchen@chencapital.com', phones:[{value:'(310) 555-0101',type:'Mobile',status:'Primary'}], emails:[{value:'mchen@chencapital.com',type:'Work',status:'Primary'}], addresses:[], notes:'Looking for 4-8 unit buildings in Long Beach, 1031 exchange buyer' },
    { first_name:'Jennifer', last_name:'Park', company:'Park Ventures Trust', contact_type:'Buyer', city:'Long Beach', state:'CA', zip_code:'90803', status:'Active', tags:['buyer','trust-buyer','naples'], phone:'(562) 555-0202', email:'jpark@parkventures.com', phones:[{value:'(562) 555-0202',type:'Mobile',status:'Primary'}], emails:[{value:'jpark@parkventures.com',type:'Work',status:'Primary'}], addresses:[], notes:'Prefers Naples Island and Belmont Shore' },
    { first_name:'Robert', last_name:'Martinez', company:'SoCal Holdings Corp', contact_type:'Seller', city:'Anaheim', state:'CA', zip_code:'92801', status:'Active', tags:['seller','motivated'], phone:'(714) 555-0303', email:'rmartinez@socalholdings.com', phones:[{value:'(714) 555-0303',type:'Mobile',status:'Primary'}], emails:[{value:'rmartinez@socalholdings.com',type:'Work',status:'Primary'}], addresses:[], notes:'Owns 3 properties in Long Beach, considering selling' },
    { first_name:'David', last_name:'Kim', company:null, contact_type:'Buyer', city:'Pasadena', state:'CA', zip_code:'91101', status:'Active', tags:['buyer','1031','multifamily'], phone:'(626) 555-0404', email:'dkim@gmail.com', phones:[{value:'(626) 555-0404',type:'Mobile',status:'Primary'}], emails:[{value:'dkim@gmail.com',type:'Personal',status:'Primary'}], addresses:[], notes:'1031 exchange deadline approaching, needs to close by Q2' },
    { first_name:'Sarah', last_name:'Thompson', company:'Thompson Realty Group', contact_type:'Broker', city:'Long Beach', state:'CA', zip_code:'90802', status:'Active', tags:['broker','co-op'], phone:'(562) 555-0505', email:'sthompson@thompsonrealty.com', phones:[{value:'(562) 555-0505',type:'Work',status:'Primary'}], emails:[{value:'sthompson@thompsonrealty.com',type:'Work',status:'Primary'}], addresses:[], notes:'Active co-op broker, good referral source' },
  ]
  for (const c of contacts) {
    await supabase.from('contacts').insert({ ...c, team_id:teamId })
  }
}
