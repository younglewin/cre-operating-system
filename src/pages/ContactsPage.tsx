import { useState, useEffect, useRef } from 'react'
import {
  Users, Plus, Search, X, Phone, Mail, MapPin, Building2,
  Tag, Edit3, Trash2, Save, RefreshCw, Upload, Copy,
  Zap, CheckCircle, Briefcase, ArrowRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type PhoneType   = 'Mobile' | 'Landline' | 'Work' | 'Home' | 'Fax'
type EmailType   = 'Work' | 'Personal' | 'Other'
type AddrType    = 'Mailing' | 'Property' | 'Office' | 'Home'
type FieldStatus = 'Primary' | 'Good' | 'Bad' | 'Unknown'

interface PhoneEntry   { value: string; type: PhoneType;  status: FieldStatus }
interface EmailEntry   { value: string; type: EmailType;  status: FieldStatus }
interface AddressEntry { street: string; city: string; state: string; zip: string; type: AddrType; status: FieldStatus }
interface LinkedProperty {
  id?: string; address: string; city?: string; state?: string
  zip_code?: string; apn?: string; relationship: string; notes?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  company?: string
  contact_type: string
  lead_status: string
  lead_source?: string
  phone?: string
  email?: string
  phones?: PhoneEntry[]
  emails?: EmailEntry[]
  addresses?: AddressEntry[]
  tags?: string[]
  notes?: string
  created_at: string
  linked_properties?: LinkedProperty[]
  active_deals?: { id: string; title: string; stage: string; value?: number }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CONTACT_TYPES  = ['Buyer','Seller','Broker','Investor','Lender','Attorney','Tenant','Vendor','Other']
const LEAD_STATUSES  = ['New','Contacted','Qualified','Negotiating','Closed','Dead']
const LEAD_SOURCES   = ['Direct','Referral','Zillow','LoopNet','CoStar','Facebook','Google','Cold Call','Email Campaign','Postcard','Zapier','Other']
const PHONE_TYPES: PhoneType[]   = ['Mobile','Landline','Work','Home','Fax']
const EMAIL_TYPES: EmailType[]   = ['Work','Personal','Other']
const ADDR_TYPES: AddrType[]     = ['Mailing','Property','Office','Home']
const FIELD_STATUSES: FieldStatus[] = ['Primary','Good','Bad','Unknown']
const RELATIONSHIPS  = ['Owner','Buyer','Seller','Tenant','Guarantor','Heir','LLC Member','Trust Beneficiary','Other']

const TYPE_COLORS: Record<string,string> = {
  Buyer:'#3B9CB5', Seller:'#C5963A', Broker:'#8B5CF6', Investor:'#22c55e',
  Lender:'#F59E0B', Attorney:'#EC4899', Tenant:'#6366F1', Vendor:'#94A3B8', Other:'#64748B',
}
const STATUS_COLORS: Record<string,string> = {
  New:'#3B9CB5', Contacted:'#C5963A', Qualified:'#22c55e',
  Negotiating:'#8B5CF6', Closed:'#22c55e', Dead:'#64748B',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emptyPhone    = (): PhoneEntry   => ({ value:'', type:'Mobile',  status:'Unknown' })
const emptyEmail    = (): EmailEntry   => ({ value:'', type:'Work',    status:'Unknown' })
const emptyAddress  = (): AddressEntry => ({ street:'', city:'', state:'CA', zip:'', type:'Mailing', status:'Unknown' })
const emptyLinked   = (): LinkedProperty => ({ address:'', city:'', state:'CA', zip_code:'', apn:'', relationship:'Owner' })

function StatusDot({ status }: { status: string }) {
  const c: Record<string,string> = { Primary:'#22c55e', Good:'#3B9CB5', Bad:'#ef4444', Unknown:'#94A3B8' }
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c[status] ?? '#94A3B8' }} />
}

function parseCsvFile(text: string): Record<string,string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_'))
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    const row: Record<string,string> = {}
    headers.forEach((h,i) => { row[h] = (vals[i]??'').trim() })
    return row
  }).filter(r => Object.values(r).some(v => v))
}

// ─── Multi-Value Row ──────────────────────────────────────────────────────────
function FieldRow<T extends { type: string; status: string }>({
  entry, typeOptions, onUpdate, onRemove, children
}: {
  entry: T; typeOptions: string[]
  onUpdate: (u: Partial<T>) => void; onRemove: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <StatusDot status={entry.status} />
      <div className="flex-1">{children}</div>
      <select className="text-xs px-2 py-1 w-24" value={entry.type} onChange={e => onUpdate({ type: e.target.value } as Partial<T>)}>
        {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select className="text-xs px-2 py-1 w-24" value={entry.status} onChange={e => onUpdate({ status: e.target.value } as Partial<T>)}>
        {FIELD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={onRemove} className="p-1" style={{ color:'rgba(248,250,252,0.3)' }}><X size={12}/></button>
    </div>
  )
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
function ContactForm({ initial, onSave, onCancel }: {
  initial?: Partial<Contact>; onSave: (d: Partial<Contact>) => Promise<void>; onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<Contact>>({
    first_name:'', last_name:'', company:'', contact_type:'Buyer',
    lead_status:'New', lead_source:'Direct', notes:'', tags:[],
    phones:[emptyPhone()], emails:[emptyEmail()], addresses:[], linked_properties:[],
    ...initial,
  })
  const [saving, setSaving]   = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [propSearch, setPropSearch] = useState('')
  const [propResults, setPropResults] = useState<{id:string;address:string;city:string}[]>([])
  const [autoResults, setAutoResults] = useState<{id:string;address:string;city:string}[]>([])
  const [autoLoading, setAutoLoading] = useState(false)
  const [tab, setTab] = useState<'basic'|'contact'|'address'|'properties'|'notes'>('basic')

  const set = (k: keyof Contact, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const updatePhone = (i: number, u: Partial<PhoneEntry>) =>
    set('phones', (form.phones??[]).map((p,idx) => idx===i ? {...p,...u} : p))
  const removePhone = (i: number) => set('phones', (form.phones??[]).filter((_,idx) => idx!==i))

  const updateEmail = (i: number, u: Partial<EmailEntry>) =>
    set('emails', (form.emails??[]).map((e,idx) => idx===i ? {...e,...u} : e))
  const removeEmail = (i: number) => set('emails', (form.emails??[]).filter((_,idx) => idx!==i))

  const updateAddr = (i: number, u: Partial<AddressEntry>) =>
    set('addresses', (form.addresses??[]).map((a,idx) => idx===i ? {...a,...u} : a))
  const removeAddr = (i: number) => set('addresses', (form.addresses??[]).filter((_,idx) => idx!==i))

  const updateProp = (i: number, u: Partial<LinkedProperty>) =>
    set('linked_properties', (form.linked_properties??[]).map((p,idx) => idx===i ? {...p,...u} : p))
  const removeProp = (i: number) => set('linked_properties', (form.linked_properties??[]).filter((_,idx) => idx!==i))

  const searchProps = async (q: string) => {
    if (!q || q.length < 2) { setPropResults([]); return }
    const { data } = await supabase.from('properties').select('id,address,city').ilike('address',`%${q}%`).limit(8)
    setPropResults(data ?? [])
  }

  const runAutoSuggest = async () => {
    setAutoLoading(true)
    const name = `${form.first_name??''} ${form.last_name??''}`.trim()
    const { data } = await supabase.from('properties').select('id,address,city')
      .or(`owner_name.ilike.%${name}%,mailing_address.ilike.%${name}%`).limit(10)
    setAutoResults(data ?? [])
    setAutoLoading(false)
  }

  const addLinked = (p: {id:string;address:string;city:string}) => {
    if (!(form.linked_properties??[]).some(x => x.id===p.id))
      set('linked_properties', [...(form.linked_properties??[]), { id:p.id, address:p.address, city:p.city, state:'CA', relationship:'Owner' }])
    setPropResults([]); setPropSearch('')
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !(form.tags??[]).includes(t)) set('tags', [...(form.tags??[]), t])
    setTagInput('')
  }

  const TABS = [
    {key:'basic',label:'Basic Info'},{key:'contact',label:'Phone & Email'},
    {key:'address',label:'Addresses'},{key:'properties',label:'Linked Properties'},{key:'notes',label:'Notes & Tags'},
  ] as const

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor:'rgba(197,150,58,0.15)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-xs font-medium transition-all"
            style={{ color:tab===t.key?'#F8FAFC':'rgba(248,250,252,0.4)', borderBottom:tab===t.key?'2px solid #C5963A':'2px solid transparent', backgroundColor:tab===t.key?'rgba(197,150,58,0.05)':'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Basic */}
        {tab==='basic' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>First Name *</label>
                <input className="w-full px-3 py-2 text-sm" value={form.first_name??''} onChange={e=>set('first_name',e.target.value)} placeholder="First" />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Last Name</label>
                <input className="w-full px-3 py-2 text-sm" value={form.last_name??''} onChange={e=>set('last_name',e.target.value)} placeholder="Last" />
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Company / Entity</label>
              <input className="w-full px-3 py-2 text-sm" value={form.company??''} onChange={e=>set('company',e.target.value)} placeholder="Company, LLC, Trust..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Type</label>
                <select className="w-full px-3 py-2 text-sm" value={form.contact_type??'Buyer'} onChange={e=>set('contact_type',e.target.value)}>
                  {CONTACT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Status</label>
                <select className="w-full px-3 py-2 text-sm" value={form.lead_status??'New'} onChange={e=>set('lead_status',e.target.value)}>
                  {LEAD_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Source</label>
                <select className="w-full px-3 py-2 text-sm" value={form.lead_source??'Direct'} onChange={e=>set('lead_source',e.target.value)}>
                  {LEAD_SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Phone & Email */}
        {tab==='contact' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Phone Numbers</label>
                <button onClick={()=>set('phones',[...(form.phones??[]),emptyPhone()])} className="flex items-center gap-1 text-xs" style={{ color:'#C5963A' }}>
                  <Plus size={11}/> Add Phone
                </button>
              </div>
              {(form.phones??[]).map((p,i) => (
                <FieldRow key={i} entry={p} typeOptions={PHONE_TYPES} onUpdate={u=>updatePhone(i,u)} onRemove={()=>removePhone(i)}>
                  <input className="w-full px-2 py-1 text-sm" value={p.value} onChange={e=>updatePhone(i,{value:e.target.value})} placeholder="(555) 000-0000" />
                </FieldRow>
              ))}
              {(form.phones??[]).length===0 && <div className="text-xs py-2" style={{ color:'rgba(248,250,252,0.25)' }}>No phone numbers added</div>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Email Addresses</label>
                <button onClick={()=>set('emails',[...(form.emails??[]),emptyEmail()])} className="flex items-center gap-1 text-xs" style={{ color:'#C5963A' }}>
                  <Plus size={11}/> Add Email
                </button>
              </div>
              {(form.emails??[]).map((e,i) => (
                <FieldRow key={i} entry={e} typeOptions={EMAIL_TYPES} onUpdate={u=>updateEmail(i,u)} onRemove={()=>removeEmail(i)}>
                  <input className="w-full px-2 py-1 text-sm" value={e.value} onChange={ev=>updateEmail(i,{value:ev.target.value})} placeholder="email@example.com" type="email" />
                </FieldRow>
              ))}
              {(form.emails??[]).length===0 && <div className="text-xs py-2" style={{ color:'rgba(248,250,252,0.25)' }}>No email addresses added</div>}
            </div>
          </div>
        )}

        {/* Addresses */}
        {tab==='address' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Mailing & Physical Addresses</label>
              <button onClick={()=>set('addresses',[...(form.addresses??[]),emptyAddress()])} className="flex items-center gap-1 text-xs" style={{ color:'#C5963A' }}>
                <Plus size={11}/> Add Address
              </button>
            </div>
            {(form.addresses??[]).map((a,i) => (
              <div key={i} className="mb-3 p-3" style={{ backgroundColor:'rgba(27,42,74,0.5)',border:'1px solid rgba(248,250,252,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={a.status}/>
                    <select className="text-xs px-2 py-1" style={{ backgroundColor:'rgba(197,150,58,0.1)',color:'#C5963A',border:'none' }} value={a.type} onChange={e=>updateAddr(i,{type:e.target.value as AddrType})}>
                      {ADDR_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    <select className="text-xs px-2 py-1" style={{ backgroundColor:'rgba(248,250,252,0.06)',color:'rgba(248,250,252,0.6)',border:'none' }} value={a.status} onChange={e=>updateAddr(i,{status:e.target.value as FieldStatus})}>
                      {FIELD_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button onClick={()=>removeAddr(i)} style={{ color:'rgba(248,250,252,0.25)' }}><X size={12}/></button>
                </div>
                <input className="w-full px-2 py-1.5 text-sm mb-1.5" value={a.street} onChange={e=>updateAddr(i,{street:e.target.value})} placeholder="Street address" />
                <div className="grid grid-cols-3 gap-1.5">
                  <input className="px-2 py-1.5 text-sm" value={a.city} onChange={e=>updateAddr(i,{city:e.target.value})} placeholder="City" />
                  <input className="px-2 py-1.5 text-sm" value={a.state} onChange={e=>updateAddr(i,{state:e.target.value})} placeholder="ST" maxLength={2} />
                  <input className="px-2 py-1.5 text-sm" value={a.zip} onChange={e=>updateAddr(i,{zip:e.target.value})} placeholder="ZIP" maxLength={10} />
                </div>
              </div>
            ))}
            {(form.addresses??[]).length===0 && <div className="text-xs py-3" style={{ color:'rgba(248,250,252,0.25)' }}>No addresses added yet</div>}
          </div>
        )}

        {/* Linked Properties */}
        {tab==='properties' && (
          <div>
            {/* Search DB */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Search & Link Existing Properties</label>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5" style={{ color:'rgba(248,250,252,0.3)' }}/>
                <input className="w-full pl-8 pr-3 py-2 text-sm" value={propSearch} onChange={e=>{setPropSearch(e.target.value);searchProps(e.target.value)}} placeholder="Search by address..." />
                {propResults.length>0 && (
                  <div className="absolute top-full left-0 right-0 z-10 shadow-lg" style={{ backgroundColor:'#1B2A4A',border:'1px solid rgba(197,150,58,0.3)' }}>
                    {propResults.map(p=>(
                      <button key={p.id} onClick={()=>addLinked(p)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left" style={{ borderBottom:'1px solid rgba(248,250,252,0.04)' }}>
                        <Building2 size={11} style={{ color:'#C5963A' }}/> <span style={{ color:'#F8FAFC' }}>{p.address}</span> <span style={{ color:'rgba(248,250,252,0.4)' }}>{p.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Suggest */}
            <div className="mb-4 p-3" style={{ backgroundColor:'rgba(59,156,181,0.08)',border:'1px solid rgba(59,156,181,0.2)' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold" style={{ color:'#3B9CB5' }}>Auto-Suggest (Public Record Match)</div>
                <button onClick={runAutoSuggest} disabled={autoLoading||!form.first_name}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor:'rgba(59,156,181,0.2)',color:'#3B9CB5',border:'1px solid rgba(59,156,181,0.3)' }}>
                  {autoLoading ? <RefreshCw size={11} className="animate-spin"/> : <Zap size={11}/>}
                  {autoLoading ? 'Searching...' : 'Find by Name'}
                </button>
              </div>
              <div className="text-xs" style={{ color:'rgba(248,250,252,0.4)' }}>Searches DB for properties owned by "{form.first_name} {form.last_name}"</div>
              {autoResults.length>0 && (
                <div className="mt-2 space-y-1">
                  {autoResults.map(p=>(
                    <div key={p.id} className="flex items-center justify-between px-2 py-1.5" style={{ backgroundColor:'rgba(27,42,74,0.6)' }}>
                      <span className="text-xs" style={{ color:'#F8FAFC' }}>{p.address}, {p.city}</span>
                      <button onClick={()=>addLinked(p)} className="text-xs px-2 py-0.5" style={{ backgroundColor:'rgba(59,156,181,0.2)',color:'#3B9CB5' }}>+ Link</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual list */}
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Linked Properties ({(form.linked_properties??[]).length})</label>
              <button onClick={()=>set('linked_properties',[...(form.linked_properties??[]),emptyLinked()])} className="flex items-center gap-1 text-xs" style={{ color:'#C5963A' }}>
                <Plus size={11}/> Add Manually
              </button>
            </div>
            {(form.linked_properties??[]).map((p,i)=>(
              <div key={i} className="mb-2 p-3" style={{ backgroundColor:'rgba(27,42,74,0.5)',border:'1px solid rgba(197,150,58,0.12)' }}>
                <div className="flex items-center justify-between mb-2">
                  <select className="text-xs px-2 py-1" style={{ backgroundColor:'rgba(197,150,58,0.1)',color:'#C5963A',border:'1px solid rgba(197,150,58,0.2)' }} value={p.relationship} onChange={e=>updateProp(i,{relationship:e.target.value})}>
                    {RELATIONSHIPS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                  <button onClick={()=>removeProp(i)} style={{ color:'rgba(248,250,252,0.25)' }}><X size={12}/></button>
                </div>
                {p.id ? (
                  <div className="text-xs" style={{ color:'#F8FAFC' }}>{p.address}, {p.city} <span style={{ color:'#22c55e',fontSize:'9px' }}>● Linked to DB</span></div>
                ) : (
                  <>
                    <input className="w-full px-2 py-1.5 text-sm mb-1.5" value={p.address} onChange={e=>updateProp(i,{address:e.target.value})} placeholder="Street address" />
                    <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                      <input className="px-2 py-1.5 text-sm" value={p.city??''} onChange={e=>updateProp(i,{city:e.target.value})} placeholder="City" />
                      <input className="px-2 py-1.5 text-sm" value={p.state??'CA'} onChange={e=>updateProp(i,{state:e.target.value})} placeholder="ST" maxLength={2} />
                      <input className="px-2 py-1.5 text-sm" value={p.zip_code??''} onChange={e=>updateProp(i,{zip_code:e.target.value})} placeholder="ZIP" />
                    </div>
                    <input className="w-full px-2 py-1.5 text-sm" value={p.apn??''} onChange={e=>updateProp(i,{apn:e.target.value})} placeholder="APN (optional)" />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notes & Tags */}
        {tab==='notes' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Notes</label>
              <textarea className="w-full px-3 py-2 text-sm" rows={5} value={form.notes??''} onChange={e=>set('notes',e.target.value)} placeholder="Investment criteria, preferences, history..." style={{ resize:'vertical' }} />
            </div>
            <div>
              <label className="block text-xs mb-2" style={{ color:'rgba(248,250,252,0.5)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(form.tags??[]).map(t=>(
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 text-xs" style={{ backgroundColor:'rgba(197,150,58,0.15)',color:'#C5963A',border:'1px solid rgba(197,150,58,0.3)' }}>
                    {t}<button onClick={()=>set('tags',(form.tags??[]).filter(x=>x!==t))} style={{ color:'rgba(197,150,58,0.6)' }}><X size={10}/></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 px-3 py-1.5 text-sm" value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag()}}} placeholder="Add tag and press Enter..." />
                <button onClick={addTag} className="px-3 py-1.5 text-xs" style={{ backgroundColor:'rgba(197,150,58,0.15)',color:'#C5963A',border:'1px solid rgba(197,150,58,0.3)' }}>Add</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0" style={{ borderColor:'rgba(197,150,58,0.15)' }}>
        <button onClick={onCancel} className="px-4 py-2 text-xs" style={{ color:'rgba(248,250,252,0.4)',border:'1px solid rgba(248,250,252,0.1)' }}>Cancel</button>
        <button onClick={async()=>{setSaving(true);await onSave(form);setSaving(false)}} disabled={saving||!form.first_name}
          className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold" style={{ backgroundColor:'#C5963A',color:'#0F172A' }}>
          {saving?<><RefreshCw size={11} className="animate-spin"/> Saving...</>:<><Save size={11}/> Save Contact</>}
        </button>
      </div>
    </div>
  )
}

// ─── Contact Drawer ───────────────────────────────────────────────────────────
function ContactDrawer({ contact, onClose, onEdit, onDelete }: {
  contact: Contact; onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
  const phones    = contact.phones ?? (contact.phone ? [{value:contact.phone,type:'Mobile' as PhoneType,status:'Unknown' as FieldStatus}] : [])
  const emails    = contact.emails ?? (contact.email ? [{value:contact.email,type:'Work' as EmailType,status:'Unknown' as FieldStatus}] : [])
  const addresses = contact.addresses ?? []

  return (
    <>
      <div className="fixed inset-0 z-30" style={{ backgroundColor:'rgba(0,0,0,0.5)' }} onClick={onClose}/>
      <div className="fixed right-0 top-0 h-full z-40 overflow-y-auto flex flex-col" style={{ width:'420px',backgroundColor:'#1B2A4A',borderLeft:'1px solid rgba(197,150,58,0.25)' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor:'rgba(197,150,58,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center text-sm font-bold" style={{ backgroundColor:TYPE_COLORS[contact.contact_type]??'#64748B',color:'#0F172A' }}>
              {contact.first_name?.[0]}{contact.last_name?.[0]}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color:'#F8FAFC' }}>{contact.first_name} {contact.last_name}</div>
              {contact.company && <div className="text-xs" style={{ color:'rgba(248,250,252,0.5)' }}>{contact.company}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5" style={{ color:'#C5963A' }}><Edit3 size={14}/></button>
            <button onClick={onDelete} className="p-1.5" style={{ color:'#ef4444' }}><Trash2 size={14}/></button>
            <button onClick={onClose} className="p-1.5" style={{ color:'rgba(248,250,252,0.4)' }}><X size={14}/></button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 px-5 py-3 border-b flex-shrink-0" style={{ borderColor:'rgba(248,250,252,0.06)' }}>
          <span className="px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor:`${TYPE_COLORS[contact.contact_type]??'#64748B'}22`,color:TYPE_COLORS[contact.contact_type]??'#64748B' }}>{contact.contact_type}</span>
          <span className="px-2 py-0.5 text-xs" style={{ backgroundColor:`${STATUS_COLORS[contact.lead_status]??'#64748B'}22`,color:STATUS_COLORS[contact.lead_status]??'#64748B' }}>{contact.lead_status}</span>
          {contact.lead_source && <span className="px-2 py-0.5 text-xs" style={{ backgroundColor:'rgba(248,250,252,0.06)',color:'rgba(248,250,252,0.4)' }}>{contact.lead_source}</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {phones.length>0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color:'rgba(248,250,252,0.4)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Phone Numbers</div>
              {phones.map((p,i)=>(
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <StatusDot status={p.status}/><Phone size={11} style={{ color:'rgba(248,250,252,0.3)' }}/>
                  <span className="text-sm flex-1" style={{ color:'#F8FAFC' }}>{p.value}</span>
                  <span className="text-xs px-1.5 py-0.5" style={{ backgroundColor:'rgba(248,250,252,0.06)',color:'rgba(248,250,252,0.4)',fontSize:'9px' }}>{p.type}</span>
                  <button onClick={()=>navigator.clipboard.writeText(p.value)} className="p-1" style={{ color:'rgba(248,250,252,0.3)' }}><Copy size={10}/></button>
                </div>
              ))}
            </div>
          )}

          {emails.length>0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color:'rgba(248,250,252,0.4)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Email Addresses</div>
              {emails.map((e,i)=>(
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <StatusDot status={e.status}/><Mail size={11} style={{ color:'rgba(248,250,252,0.3)' }}/>
                  <span className="text-sm flex-1 truncate" style={{ color:'#F8FAFC' }}>{e.value}</span>
                  <span className="text-xs px-1.5 py-0.5" style={{ backgroundColor:'rgba(248,250,252,0.06)',color:'rgba(248,250,252,0.4)',fontSize:'9px' }}>{e.type}</span>
                  <button onClick={()=>navigator.clipboard.writeText(e.value)} className="p-1" style={{ color:'rgba(248,250,252,0.3)' }}><Copy size={10}/></button>
                </div>
              ))}
            </div>
          )}

          {addresses.length>0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color:'rgba(248,250,252,0.4)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Addresses</div>
              {addresses.map((a,i)=>(
                <div key={i} className="flex items-start gap-2 mb-2 p-2" style={{ backgroundColor:'rgba(27,42,74,0.5)' }}>
                  <StatusDot status={a.status}/><MapPin size={11} style={{ color:'rgba(248,250,252,0.3)',marginTop:2 }}/>
                  <div className="flex-1">
                    <div className="text-sm" style={{ color:'#F8FAFC' }}>{a.street}</div>
                    <div className="text-xs" style={{ color:'rgba(248,250,252,0.5)' }}>{a.city}, {a.state} {a.zip}</div>
                  </div>
                  <span className="text-xs px-1.5 py-0.5" style={{ backgroundColor:'rgba(248,250,252,0.06)',color:'rgba(248,250,252,0.4)',fontSize:'9px' }}>{a.type}</span>
                </div>
              ))}
            </div>
          )}

          {(contact.linked_properties??[]).length>0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color:'rgba(248,250,252,0.4)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Linked Properties</div>
              {(contact.linked_properties??[]).map((p,i)=>(
                <div key={i} className="flex items-center gap-2 mb-1.5 p-2" style={{ backgroundColor:'rgba(197,150,58,0.06)',border:'1px solid rgba(197,150,58,0.12)' }}>
                  <Building2 size={11} style={{ color:'#C5963A' }}/>
                  <div className="flex-1"><div className="text-xs font-medium" style={{ color:'#F8FAFC' }}>{p.address}</div>{p.city&&<div className="text-xs" style={{ color:'rgba(248,250,252,0.4)' }}>{p.city}, {p.state}</div>}</div>
                  <span className="text-xs px-1.5 py-0.5" style={{ backgroundColor:'rgba(197,150,58,0.15)',color:'#C5963A',fontSize:'9px' }}>{p.relationship}</span>
                </div>
              ))}
            </div>
          )}

          {(contact.active_deals??[]).length>0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color:'rgba(248,250,252,0.4)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Active Deals</div>
              {(contact.active_deals??[]).map(d=>(
                <div key={d.id} className="flex items-center gap-2 mb-1.5 p-2" style={{ backgroundColor:'rgba(59,156,181,0.06)',border:'1px solid rgba(59,156,181,0.12)' }}>
                  <Briefcase size={11} style={{ color:'#3B9CB5' }}/><span className="text-xs flex-1" style={{ color:'#F8FAFC' }}>{d.title}</span>
                  <span className="text-xs px-1.5 py-0.5" style={{ backgroundColor:'rgba(59,156,181,0.15)',color:'#3B9CB5',fontSize:'9px' }}>{d.stage}</span>
                </div>
              ))}
            </div>
          )}

          {contact.notes && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color:'rgba(248,250,252,0.4)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Notes</div>
              <div className="text-sm p-3" style={{ backgroundColor:'rgba(27,42,74,0.4)',color:'rgba(248,250,252,0.7)',lineHeight:'1.6' }}>{contact.notes}</div>
            </div>
          )}

          {(contact.tags??[]).length>0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color:'rgba(248,250,252,0.4)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {(contact.tags??[]).map(t=><span key={t} className="px-2 py-0.5 text-xs" style={{ backgroundColor:'rgba(197,150,58,0.12)',color:'#C5963A',border:'1px solid rgba(197,150,58,0.25)' }}>{t}</span>)}
              </div>
            </div>
          )}

          {/* Skip Trace */}
          <div className="p-3" style={{ backgroundColor:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold" style={{ color:'#8B5CF6' }}>Skip Trace</div>
                <div className="text-xs mt-0.5" style={{ color:'rgba(248,250,252,0.4)' }}>Enrich contact with public records data</div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor:'rgba(139,92,246,0.2)',color:'#8B5CF6',border:'1px solid rgba(139,92,246,0.3)' }}
                onClick={()=>alert('Skip Trace integration: BatchSkipTracing / PropStream API — coming in Phase 4')}>
                <Zap size={11}/> Run Skip Trace
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────
function CsvImportModal({ onClose, onImport }: {
  onClose: () => void; onImport: (c: Partial<Contact>[]) => Promise<void>
}) {
  const [rows, setRows]       = useState<Record<string,string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const FIELD_MAP: Record<string, keyof Contact> = {
    first_name:'first_name', firstname:'first_name', 'first name':'first_name',
    last_name:'last_name', lastname:'last_name', 'last name':'last_name',
    company:'company', organization:'company',
    phone:'phone', mobile:'phone', cell:'phone',
    email:'email', type:'contact_type', contact_type:'contact_type',
    status:'lead_status', lead_status:'lead_status',
    source:'lead_source', lead_source:'lead_source',
    notes:'notes', comments:'notes', tags:'tags',
  }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCsvFile(e.target?.result as string)
      if (parsed.length>0) { setHeaders(Object.keys(parsed[0])); setRows(parsed) }
    }
    reader.readAsText(file)
  }

  const runImport = async () => {
    setImporting(true)
    const contacts: Partial<Contact>[] = rows.map(row => {
      const c: Partial<Contact> = { lead_status:'New', contact_type:'Buyer' }
      for (const [k,v] of Object.entries(row)) {
        const f = FIELD_MAP[k.toLowerCase().trim()]
        if (f && v) (c as Record<string,unknown>)[f] = f==='tags' ? v.split(',').map(t=>t.trim()) : v
      }
      return c
    }).filter(c => c.first_name||c.email||c.phone)
    await onImport(contacts)
    setDone(true); setImporting(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ backgroundColor:'rgba(0,0,0,0.7)' }} onClick={onClose}/>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl flex flex-col" style={{ backgroundColor:'#1B2A4A',border:'1px solid rgba(197,150,58,0.3)',maxHeight:'80vh' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor:'rgba(197,150,58,0.2)' }}>
            <div className="text-sm font-semibold" style={{ color:'#F8FAFC' }}>Import Contacts from CSV</div>
            <button onClick={onClose} style={{ color:'rgba(248,250,252,0.4)' }}><X size={14}/></button>
          </div>
          {done ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle size={40} style={{ color:'#22c55e' }}/>
              <div className="text-sm font-semibold" style={{ color:'#F8FAFC' }}>Import Complete!</div>
              <div className="text-xs" style={{ color:'rgba(248,250,252,0.4)' }}>{rows.length} contacts imported</div>
              <button onClick={onClose} className="mt-2 px-5 py-2 text-xs font-semibold" style={{ backgroundColor:'#C5963A',color:'#0F172A' }}>Done</button>
            </div>
          ) : rows.length===0 ? (
            <div className="flex flex-col items-center justify-center py-16 mx-5 my-5 cursor-pointer"
              style={{ border:'2px dashed rgba(197,150,58,0.25)',backgroundColor:'rgba(27,42,74,0.3)' }}
              onClick={()=>fileRef.current?.click()}>
              <Upload size={32} style={{ color:'rgba(197,150,58,0.5)' }}/>
              <div className="mt-3 text-sm" style={{ color:'rgba(248,250,252,0.5)' }}>Drop CSV or click to browse</div>
              <div className="mt-1 text-xs" style={{ color:'rgba(248,250,252,0.3)' }}>Columns: first_name, last_name, phone, email, company, type, source, tags</div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto px-5 py-3">
                <div className="text-xs mb-2" style={{ color:'rgba(248,250,252,0.4)' }}>{rows.length} contacts ready to import</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr style={{ backgroundColor:'rgba(27,42,74,0.8)' }}>{headers.slice(0,6).map(h=><th key={h} className="px-3 py-2 text-left font-semibold" style={{ color:'#C5963A',fontSize:'9px',textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
                    <tbody>{rows.slice(0,8).map((r,i)=><tr key={i} style={{ borderBottom:'1px solid rgba(248,250,252,0.04)' }}>{headers.slice(0,6).map(h=><td key={h} className="px-3 py-2" style={{ color:'#F8FAFC' }}>{r[h]||'—'}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0" style={{ borderColor:'rgba(248,250,252,0.06)' }}>
                <button onClick={onClose} className="px-4 py-2 text-xs" style={{ color:'rgba(248,250,252,0.4)',border:'1px solid rgba(248,250,252,0.1)' }}>Cancel</button>
                <button onClick={runImport} disabled={importing} className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold" style={{ backgroundColor:'#C5963A',color:'#0F172A' }}>
                  {importing?<><RefreshCw size={11} className="animate-spin"/> Importing...</>:`Import ${rows.length} Contacts`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts]       = useState<Contact[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tagFilter, setTagFilter]     = useState('All')
  const [selected, setSelected]       = useState<Contact|null>(null)
  const [editing, setEditing]         = useState<Contact|null>(null)
  const [showForm, setShowForm]       = useState(false)
  const [showCsv, setShowCsv]         = useState(false)
  const [teamId, setTeamId]           = useState<string|null>(null)
  const [allTags, setAllTags]         = useState<string[]>([])

  useEffect(()=>{ loadContacts() },[])

  const loadContacts = async () => {
    setLoading(true)
    const { data: td } = await supabase.from('teams').select('id').limit(1).single()
    setTeamId(td?.id ?? null)
    const { data } = await supabase.from('contacts').select('*').order('created_at',{ascending:false})
    const list = (data??[]) as Contact[]
    setContacts(list)
    const tags = new Set<string>()
    list.forEach(c=>(c.tags??[]).forEach(t=>tags.add(t)))
    setAllTags(Array.from(tags).sort())
    setLoading(false)
  }

  const saveContact = async (data: Partial<Contact>) => {
    const { data: td } = await supabase.from('teams').select('id').limit(1).single()
    const primaryPhone = (data.phones??[])[0]?.value ?? data.phone ?? null
    const primaryEmail = (data.emails??[])[0]?.value ?? data.email ?? null
    const record = { ...data, team_id:td?.id, phone:primaryPhone, email:primaryEmail, phones:data.phones??[], emails:data.emails??[], addresses:data.addresses??[], tags:data.tags??[] }
    if (editing?.id) await supabase.from('contacts').update(record).eq('id',editing.id)
    else await supabase.from('contacts').insert(record)
    setEditing(null); setShowForm(false)
    await loadContacts()
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id',id)
    setSelected(null); await loadContacts()
  }

  const importContacts = async (newContacts: Partial<Contact>[]) => {
    const { data: td } = await supabase.from('teams').select('id').limit(1).single()
    const records = newContacts.map(c=>({ ...c, team_id:td?.id, phones:c.phone?[{value:c.phone,type:'Mobile',status:'Unknown'}]:[], emails:c.email?[{value:c.email,type:'Work',status:'Unknown'}]:[], addresses:[], tags:c.tags??[] }))
    await supabase.from('contacts').insert(records)
    await loadContacts()
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const ms = !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || (c.company??'').toLowerCase().includes(q) || (c.phone??'').includes(q) || (c.email??'').toLowerCase().includes(q)
    return ms && (typeFilter==='All'||c.contact_type===typeFilter) && (statusFilter==='All'||c.lead_status===statusFilter) && (tagFilter==='All'||(c.tags??[]).includes(tagFilter))
  })

  const getPhone = (c: Contact) => (c.phones??[])[0]?.value ?? c.phone ?? ''
  const getEmail = (c: Contact) => (c.emails??[])[0]?.value ?? c.email ?? ''

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor:'#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor:'rgba(197,150,58,0.15)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color:'#F8FAFC' }}>Contacts</h1>
          <p className="text-xs mt-0.5" style={{ color:'rgba(248,250,252,0.4)' }}>{contacts.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowCsv(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
            style={{ color:'rgba(248,250,252,0.6)',border:'1px solid rgba(248,250,252,0.12)',backgroundColor:'rgba(248,250,252,0.04)' }}>
            <Upload size={12}/> Import CSV
          </button>
          <button onClick={()=>{setEditing(null);setShowForm(true)}} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold" style={{ backgroundColor:'#C5963A',color:'#0F172A' }}>
            <Plus size={12}/> New Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor:'rgba(248,250,252,0.06)' }}>
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2.5 top-2.5" style={{ color:'rgba(248,250,252,0.3)' }}/>
          <input className="w-full pl-8 pr-3 py-2 text-xs" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, company, phone, email..." />
        </div>
        <select className="text-xs px-2 py-2 w-28" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="All">All Types</option>
          {CONTACT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className="text-xs px-2 py-2 w-28" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="All">All Status</option>
          {LEAD_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {allTags.length>0 && (
          <select className="text-xs px-2 py-2 w-28" value={tagFilter} onChange={e=>setTagFilter(e.target.value)}>
            <option value="All">All Tags</option>
            {allTags.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-2" style={{ color:'rgba(248,250,252,0.3)' }}>
            <RefreshCw size={16} className="animate-spin"/> Loading contacts...
          </div>
        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Users size={24} style={{ color:'rgba(248,250,252,0.15)' }}/>
            <div className="text-xs" style={{ color:'rgba(248,250,252,0.3)' }}>No contacts found</div>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0" style={{ backgroundColor:'#0F172A',zIndex:1 }}>
              <tr style={{ borderBottom:'1px solid rgba(197,150,58,0.15)' }}>
                {['Name','Type','Status','Phone','Email','Tags','Source',''].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color:'rgba(248,250,252,0.35)',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} className="cursor-pointer transition-colors" style={{ borderBottom:'1px solid rgba(248,250,252,0.04)' }}
                  onClick={()=>setSelected(c)}
                  onMouseEnter={e=>(e.currentTarget.style.backgroundColor='rgba(197,150,58,0.04)')}
                  onMouseLeave={e=>(e.currentTarget.style.backgroundColor='transparent')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor:TYPE_COLORS[c.contact_type]??'#64748B',color:'#0F172A' }}>
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color:'#F8FAFC' }}>{c.first_name} {c.last_name}</div>
                        {c.company && <div style={{ color:'rgba(248,250,252,0.4)' }}>{c.company}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs" style={{ backgroundColor:`${TYPE_COLORS[c.contact_type]??'#64748B'}22`,color:TYPE_COLORS[c.contact_type]??'#64748B' }}>{c.contact_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs" style={{ backgroundColor:`${STATUS_COLORS[c.lead_status]??'#64748B'}22`,color:STATUS_COLORS[c.lead_status]??'#64748B' }}>{c.lead_status}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color:'rgba(248,250,252,0.6)' }}>{getPhone(c)||'—'}</td>
                  <td className="px-4 py-3" style={{ color:'rgba(248,250,252,0.6)' }}><span className="truncate max-w-[160px] block">{getEmail(c)||'—'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags??[]).slice(0,2).map(t=><span key={t} className="px-1.5 py-0.5 text-xs" style={{ backgroundColor:'rgba(197,150,58,0.1)',color:'#C5963A',fontSize:'9px' }}>{t}</span>)}
                      {(c.tags??[]).length>2 && <span style={{ color:'rgba(248,250,252,0.3)',fontSize:'9px' }}>+{(c.tags??[]).length-2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color:'rgba(248,250,252,0.35)' }}>{c.lead_source??'—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={e=>{e.stopPropagation();setEditing(c);setShowForm(true)}} className="p-1" style={{ color:'rgba(248,250,252,0.25)' }}><Edit3 size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New/Edit Form */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-30" style={{ backgroundColor:'rgba(0,0,0,0.5)' }} onClick={()=>{setShowForm(false);setEditing(null)}}/>
          <div className="fixed right-0 top-0 h-full z-40 flex flex-col" style={{ width:'520px',backgroundColor:'#1B2A4A',borderLeft:'1px solid rgba(197,150,58,0.25)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor:'rgba(197,150,58,0.2)' }}>
              <div className="text-sm font-semibold" style={{ color:'#F8FAFC' }}>{editing?`Edit: ${editing.first_name} ${editing.last_name}`:'New Contact'}</div>
              <button onClick={()=>{setShowForm(false);setEditing(null)}} style={{ color:'rgba(248,250,252,0.4)' }}><X size={14}/></button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ContactForm initial={editing??undefined} onSave={saveContact} onCancel={()=>{setShowForm(false);setEditing(null)}}/>
            </div>
          </div>
        </>
      )}

      {/* Detail Drawer */}
      {selected && !showForm && (
        <ContactDrawer contact={selected} onClose={()=>setSelected(null)}
          onEdit={()=>{setEditing(selected);setSelected(null);setShowForm(true)}}
          onDelete={()=>deleteContact(selected.id)}/>
      )}

      {/* CSV Import */}
      {showCsv && <CsvImportModal onClose={()=>setShowCsv(false)} onImport={importContacts}/>}
    </div>
  )
}
