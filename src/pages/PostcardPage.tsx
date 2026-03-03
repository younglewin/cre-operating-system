import { useState } from 'react'
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from '@react-pdf/renderer'
import {
  Mail, Download, Send, Plus, Trash2, CheckCircle,
  Loader2,
} from 'lucide-react'
import { SUBJECT_PROPERTY } from '../lib/mockData'

const GOLD  = '#C5963A'
const TEAL  = '#3B9CB5'
const SLATE = '#0F172A'
const NAVY  = '#1B2A4A'
const OFF   = '#F8FAFC'

// ── PDF Styles (300 DPI, 6"×4" postcard = 1800×1200px @ 300dpi) ──
// react-pdf uses points (1pt = 1/72 inch); 6"×4" = 432pt × 288pt
const pdfStyles = StyleSheet.create({
  page: {
    width: 432,
    height: 288,
    fontFamily: 'Helvetica',
  },
  // ── FRONT ──────────────────────────────────────────────────
  frontPage: {
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  frontHeroBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 180,
    backgroundColor: '#1B2A4A',
  },
  frontGoldBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: '#C5963A',
  },
  frontBottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: '#C5963A',
  },
  frontBadge: {
    position: 'absolute',
    top: 14, left: 16,
    backgroundColor: '#C5963A',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  frontBadgeText: {
    fontSize: 6,
    color: '#0F172A',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  frontContent: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 108,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  frontAddress: {
    fontSize: 7,
    color: '#94A3B8',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  frontPropertyName: {
    fontSize: 14,
    color: '#F8FAFC',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  frontMetricsRow: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 8,
  },
  frontMetricBox: {
    flex: 1,
    paddingRight: 12,
  },
  frontMetricLabel: {
    fontSize: 5.5,
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  frontMetricValue: {
    fontSize: 11,
    color: '#F8FAFC',
    fontFamily: 'Helvetica-Bold',
  },
  frontMetricValueGold: {
    fontSize: 11,
    color: '#C5963A',
    fontFamily: 'Helvetica-Bold',
  },
  frontMetricValueTeal: {
    fontSize: 11,
    color: '#3B9CB5',
    fontFamily: 'Helvetica-Bold',
  },
  frontDivider: {
    height: 0.5,
    backgroundColor: '#2D3F5E',
    marginBottom: 7,
  },
  frontBrokerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frontBrokerName: {
    fontSize: 7,
    color: '#C5963A',
    fontFamily: 'Helvetica-Bold',
  },
  frontBrokerSub: {
    fontSize: 6,
    color: '#94A3B8',
  },
  frontCallToAction: {
    fontSize: 6.5,
    color: '#3B9CB5',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },

  // ── BACK ───────────────────────────────────────────────────
  backPage: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
  },
  backLeft: {
    width: 260,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRightWidth: 0.5,
    borderRightColor: '#2D3F5E',
  },
  backRight: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  backGoldBar: {
    height: 3,
    backgroundColor: '#C5963A',
    marginBottom: 10,
  },
  backSectionLabel: {
    fontSize: 5.5,
    color: '#C5963A',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  backHeadline: {
    fontSize: 10,
    color: '#F8FAFC',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    lineHeight: 1.3,
  },
  backBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 5,
  },
  backBulletDot: {
    width: 4,
    height: 4,
    backgroundColor: '#C5963A',
    marginTop: 2,
    flexShrink: 0,
  },
  backBulletText: {
    fontSize: 7,
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 1.4,
  },
  backDivider: {
    height: 0.5,
    backgroundColor: '#2D3F5E',
    marginVertical: 8,
  },
  backMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  backMetricLabel: {
    fontSize: 6.5,
    color: '#94A3B8',
  },
  backMetricValue: {
    fontSize: 6.5,
    color: '#F8FAFC',
    fontFamily: 'Helvetica-Bold',
  },
  backMetricValueGold: {
    fontSize: 6.5,
    color: '#C5963A',
    fontFamily: 'Helvetica-Bold',
  },
  // Contact section (right)
  backContactLabel: {
    fontSize: 5.5,
    color: '#C5963A',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  backFirmName: {
    fontSize: 9,
    color: '#F8FAFC',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  backFirmTagline: {
    fontSize: 6.5,
    color: '#3B9CB5',
    marginBottom: 10,
  },
  backContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 4,
  },
  backContactText: {
    fontSize: 6.5,
    color: '#CBD5E1',
  },
  backAddressBlock: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#1B2A4A',
    borderLeftWidth: 2,
    borderLeftColor: '#C5963A',
  },
  backAddressText: {
    fontSize: 6.5,
    color: '#94A3B8',
    lineHeight: 1.5,
  },
  backQRPlaceholder: {
    marginTop: 10,
    width: 50,
    height: 50,
    backgroundColor: '#1B2A4A',
    borderWidth: 0.5,
    borderColor: '#2D3F5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backQRText: {
    fontSize: 5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  backDisclaimer: {
    position: 'absolute',
    bottom: 6,
    left: 18,
    right: 14,
    fontSize: 4.5,
    color: '#475569',
    lineHeight: 1.4,
  },
})

// ── Postcard Data Interface ───────────────────────────────────
interface PostcardData {
  propertyName: string
  address: string
  city: string
  price: string
  capRate: string
  units: string
  yearBuilt: string
  pricePerUnit: string
  noi: string
  brokerName: string
  brokerPhone: string
  brokerEmail: string
  brokerLicense: string
  bullets: string[]
  callToAction: string
}

// ── PDF Document Component ────────────────────────────────────
function PostcardPDF({ data }: { data: PostcardData }) {
  return (
    <Document title={`${data.propertyName} — Postcard`} author="YoungLewin Advisors">

      {/* ── FRONT SIDE ── */}
      <Page size={[432, 288]} style={[pdfStyles.page, pdfStyles.frontPage]}>
        {/* Hero area (top 180pt) */}
        <View style={pdfStyles.frontHeroBg} />
        <View style={pdfStyles.frontGoldBar} />

        {/* Offering badge */}
        <View style={pdfStyles.frontBadge}>
          <Text style={pdfStyles.frontBadgeText}>FOR SALE — MULTIFAMILY</Text>
        </View>

        {/* Hero placeholder text (would be replaced by image in production) */}
        <View style={{ position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 8, color: '#2D3F5E', fontFamily: 'Helvetica-Bold', letterSpacing: 2 }}>PROPERTY PHOTO</Text>
        </View>

        {/* Content panel */}
        <View style={pdfStyles.frontContent}>
          <Text style={pdfStyles.frontAddress}>{data.address.toUpperCase()}</Text>
          <Text style={pdfStyles.frontPropertyName}>{data.propertyName}</Text>

          <View style={pdfStyles.frontMetricsRow}>
            <View style={pdfStyles.frontMetricBox}>
              <Text style={pdfStyles.frontMetricLabel}>ASKING PRICE</Text>
              <Text style={pdfStyles.frontMetricValueGold}>{data.price}</Text>
            </View>
            <View style={pdfStyles.frontMetricBox}>
              <Text style={pdfStyles.frontMetricLabel}>CAP RATE</Text>
              <Text style={pdfStyles.frontMetricValueTeal}>{data.capRate}</Text>
            </View>
            <View style={pdfStyles.frontMetricBox}>
              <Text style={pdfStyles.frontMetricLabel}>TOTAL UNITS</Text>
              <Text style={pdfStyles.frontMetricValue}>{data.units}</Text>
            </View>
            <View style={pdfStyles.frontMetricBox}>
              <Text style={pdfStyles.frontMetricLabel}>YEAR BUILT</Text>
              <Text style={pdfStyles.frontMetricValue}>{data.yearBuilt}</Text>
            </View>
          </View>

          <View style={pdfStyles.frontDivider} />

          <View style={pdfStyles.frontBrokerRow}>
            <View>
              <Text style={pdfStyles.frontBrokerName}>{data.brokerName}</Text>
              <Text style={pdfStyles.frontBrokerSub}>YoungLewin Advisors  ·  {data.brokerLicense}</Text>
            </View>
            <Text style={pdfStyles.frontCallToAction}>{data.callToAction}</Text>
          </View>
        </View>

        <View style={pdfStyles.frontBottomBar} />
      </Page>

      {/* ── BACK SIDE ── */}
      <Page size={[432, 288]} style={[pdfStyles.page, pdfStyles.backPage]}>

        {/* Left: Property Details */}
        <View style={pdfStyles.backLeft}>
          <View style={pdfStyles.backGoldBar} />
          <Text style={pdfStyles.backSectionLabel}>INVESTMENT OPPORTUNITY</Text>
          <Text style={pdfStyles.backHeadline}>{data.propertyName}{'\n'}{data.city}</Text>

          {data.bullets.map((bullet, i) => (
            <View key={i} style={pdfStyles.backBulletRow}>
              <View style={pdfStyles.backBulletDot} />
              <Text style={pdfStyles.backBulletText}>{bullet}</Text>
            </View>
          ))}

          <View style={pdfStyles.backDivider} />

          <Text style={pdfStyles.backSectionLabel}>FINANCIAL SUMMARY</Text>
          {[
            ['Asking Price',  data.price,        true],
            ['Cap Rate',      data.capRate,       true],
            ['Price / Unit',  data.pricePerUnit,  false],
            ['NOI',           data.noi,           false],
            ['Total Units',   data.units,         false],
            ['Year Built',    data.yearBuilt,     false],
          ].map(([label, value, isGold]) => (
            <View key={label as string} style={pdfStyles.backMetricRow}>
              <Text style={pdfStyles.backMetricLabel}>{label as string}</Text>
              <Text style={isGold ? pdfStyles.backMetricValueGold : pdfStyles.backMetricValue}>{value as string}</Text>
            </View>
          ))}
        </View>

        {/* Right: Broker Contact */}
        <View style={pdfStyles.backRight}>
          <View style={[pdfStyles.backGoldBar, { marginBottom: 10 }]} />
          <Text style={pdfStyles.backContactLabel}>EXCLUSIVELY LISTED BY</Text>
          <Text style={pdfStyles.backFirmName}>YoungLewin Advisors</Text>
          <Text style={pdfStyles.backFirmTagline}>Multifamily Investment Sales</Text>

          <View style={pdfStyles.backContactRow}>
            <Text style={{ fontSize: 7, color: GOLD }}>✆</Text>
            <Text style={pdfStyles.backContactText}>{data.brokerPhone}</Text>
          </View>
          <View style={pdfStyles.backContactRow}>
            <Text style={{ fontSize: 7, color: GOLD }}>✉</Text>
            <Text style={pdfStyles.backContactText}>{data.brokerEmail}</Text>
          </View>

          <View style={pdfStyles.backAddressBlock}>
            <Text style={pdfStyles.backAddressText}>{data.address}</Text>
            <Text style={[pdfStyles.backAddressText, { color: GOLD, marginTop: 2 }]}>{data.price}  ·  {data.capRate} Cap</Text>
          </View>

          <View style={pdfStyles.backQRPlaceholder}>
            <Text style={pdfStyles.backQRText}>QR CODE{'\n'}LISTING PAGE</Text>
          </View>

          <Text style={{ fontSize: 5.5, color: '#475569', marginTop: 8 }}>{data.brokerLicense}</Text>
        </View>

        {/* Disclaimer */}
        <Text style={pdfStyles.backDisclaimer}>
          This postcard is for informational purposes only. All information is from sources deemed reliable but not guaranteed. Subject to errors, omissions, and prior sale. YoungLewin Advisors. CA DRE #00000000.
        </Text>
      </Page>
    </Document>
  )
}

// ── Mailing List Entry ────────────────────────────────────────
interface MailingEntry {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
}

// ── Main Page ─────────────────────────────────────────────────
export default function PostcardPage() {
  const defaultData: PostcardData = {
    propertyName: SUBJECT_PROPERTY.name,
    address:      SUBJECT_PROPERTY.address,
    city:         `${SUBJECT_PROPERTY.city}, ${SUBJECT_PROPERTY.state}`,
    price:        `$${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()}`,
    capRate:      `${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}%`,
    units:        String(SUBJECT_PROPERTY.num_units),
    yearBuilt:    String(SUBJECT_PROPERTY.year_built ?? 'N/A'),
    pricePerUnit: `$${(SUBJECT_PROPERTY.price_per_unit ?? 0).toLocaleString()}`,
    noi:          `$${((SUBJECT_PROPERTY as unknown as Record<string, number>).noi ?? 0).toLocaleString()}`,
    brokerName:   'Shane Young & Dan Lewin',
    brokerPhone:  '(310) 555-0100',
    brokerEmail:  'info@younglewi n.com',
    brokerLicense:'CA DRE #00000000',
    bullets: [
      `${SUBJECT_PROPERTY.num_units}-unit multifamily in Naples Island, Long Beach`,
      `${SUBJECT_PROPERTY.cap_rate?.toFixed(2)}% going-in cap rate`,
      `Priced at $${(SUBJECT_PROPERTY.price_per_unit ?? 0).toLocaleString()}/unit`,
      'Ideal 1031 exchange or value-add play',
      'Strong coastal rental demand — 98% occupancy submarket',
    ],
    callToAction: 'CALL FOR DETAILS →',
  }

  const [data, setData] = useState<PostcardData>(defaultData)
  const [mailingList, setMailingList] = useState<MailingEntry[]>([
    { id: '1', name: 'John Smith',  address: '123 Main St',    city: 'Los Angeles',  state: 'CA', zip: '90001' },
    { id: '2', name: 'Maria Chen',  address: '456 Ocean Ave',  city: 'Long Beach',   state: 'CA', zip: '90802' },
    { id: '3', name: 'Robert Davis',address: '789 Wilshire Bl',city: 'Beverly Hills', state: 'CA', zip: '90210' },
  ])
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [lobKey, setLobKey]       = useState('')
  const [activeTab, setActiveTab] = useState<'design' | 'list' | 'send'>('design')

  const updateData = (key: keyof PostcardData, value: string) => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const updateBullet = (i: number, value: string) => {
    setData(prev => {
      const bullets = [...prev.bullets]
      bullets[i] = value
      return { ...prev, bullets }
    })
  }

  const addBullet = () => setData(prev => ({ ...prev, bullets: [...prev.bullets, 'New bullet point'] }))
  const removeBullet = (i: number) => setData(prev => ({ ...prev, bullets: prev.bullets.filter((_, idx) => idx !== i) }))

  const addMailingEntry = () => {
    setMailingList(prev => [...prev, { id: Date.now().toString(), name: '', address: '', city: '', state: 'CA', zip: '' }])
  }

  const removeMailingEntry = (id: string) => setMailingList(prev => prev.filter(e => e.id !== id))

  const handleSendViaLob = async () => {
    if (!lobKey) { alert('Please enter your Lob.com API key first.'); return }
    setSending(true)
    // Simulate Lob API call
    await new Promise(r => setTimeout(r, 2000))
    setSending(false)
    setSent(true)
  }

  const tabs = [
    { key: 'design', label: 'Design' },
    { key: 'list',   label: `Mailing List (${mailingList.length})` },
    { key: 'send',   label: 'Send via Lob' },
  ] as const

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: SLATE, fontFamily: 'Inter', overflow: 'hidden' }}>

      {/* Left Panel — Controls */}
      <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid rgba(197,150,58,0.2)', display: 'flex', flexDirection: 'column', backgroundColor: `${NAVY}50` }}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(197,150,58,0.2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Mail size={15} style={{ color: GOLD }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD }}>Direct Mail Postcards</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)' }}>300-DPI print-ready PDF · 6"×4" full-bleed · Lob.com delivery</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(197,150,58,0.15)', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '8px 4px', fontSize: 9, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', borderBottom: activeTab === tab.key ? `2px solid ${GOLD}` : '2px solid transparent', backgroundColor: 'transparent', color: activeTab === tab.key ? GOLD : 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {/* Design Tab */}
          {activeTab === 'design' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'propertyName', label: 'Property Name' },
                { key: 'address',      label: 'Address' },
                { key: 'city',         label: 'City, State' },
                { key: 'price',        label: 'Asking Price' },
                { key: 'capRate',      label: 'Cap Rate' },
                { key: 'units',        label: 'Total Units' },
                { key: 'yearBuilt',    label: 'Year Built' },
                { key: 'pricePerUnit', label: 'Price / Unit' },
                { key: 'noi',          label: 'NOI' },
                { key: 'brokerName',   label: 'Broker Name(s)' },
                { key: 'brokerPhone',  label: 'Phone' },
                { key: 'brokerEmail',  label: 'Email' },
                { key: 'brokerLicense',label: 'DRE License' },
                { key: 'callToAction', label: 'Call to Action' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.35)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input
                    type="text"
                    value={data[key as keyof PostcardData] as string}
                    onChange={e => updateData(key as keyof PostcardData, e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: 11, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              {/* Bullets */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.35)' }}>Bullet Points</label>
                  <button onClick={addBullet} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', fontSize: 9, fontFamily: 'Inter', cursor: 'pointer', border: `1px solid ${GOLD}40`, backgroundColor: 'transparent', color: GOLD }}>
                    <Plus size={9} /> Add
                  </button>
                </div>
                {data.bullets.map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                    <input
                      type="text"
                      value={b}
                      onChange={e => updateBullet(i, e.target.value)}
                      style={{ flex: 1, padding: '6px 8px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', outline: 'none' }}
                    />
                    <button onClick={() => removeBullet(i)} style={{ padding: '0 6px', background: 'none', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mailing List Tab */}
          {activeTab === 'list' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.5)' }}>{mailingList.length} recipients</div>
                <button onClick={addMailingEntry} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 10, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: `1px solid ${GOLD}50`, backgroundColor: `${GOLD}12`, color: GOLD, textTransform: 'uppercase' }}>
                  <Plus size={10} /> Add
                </button>
              </div>
              {mailingList.map((entry, i) => (
                <div key={entry.id} style={{ padding: '10px 12px', marginBottom: 6, border: '1px solid rgba(197,150,58,0.15)', backgroundColor: 'rgba(15,23,42,0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(248,250,252,0.3)' }}>#{i + 1}</span>
                    <button onClick={() => removeMailingEntry(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', display: 'flex' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {[
                    { key: 'name', placeholder: 'Full Name' },
                    { key: 'address', placeholder: 'Street Address' },
                    { key: 'city', placeholder: 'City' },
                  ].map(({ key, placeholder }) => (
                    <input
                      key={key}
                      type="text"
                      placeholder={placeholder}
                      value={entry[key as keyof MailingEntry]}
                      onChange={e => setMailingList(prev => prev.map(m => m.id === entry.id ? { ...m, [key]: e.target.value } : m))}
                      style={{ width: '100%', padding: '5px 8px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.15)', outline: 'none', marginBottom: 4, boxSizing: 'border-box' }}
                    />
                  ))}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input type="text" placeholder="ST" value={entry.state} onChange={e => setMailingList(prev => prev.map(m => m.id === entry.id ? { ...m, state: e.target.value } : m))} style={{ width: 40, padding: '5px 6px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.15)', outline: 'none' }} />
                    <input type="text" placeholder="ZIP" value={entry.zip} onChange={e => setMailingList(prev => prev.map(m => m.id === entry.id ? { ...m, zip: e.target.value } : m))} style={{ flex: 1, padding: '5px 8px', fontSize: 10, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.15)', outline: 'none' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Send Tab */}
          {activeTab === 'send' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', border: '1px solid rgba(59,156,181,0.2)', backgroundColor: 'rgba(59,156,181,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: TEAL, marginBottom: 6 }}>Lob.com Integration</div>
                <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.5)', lineHeight: 1.6 }}>
                  Lob.com handles print, postage, and delivery. Enter your API key to send physical postcards to your mailing list directly from this dashboard.
                </div>
              </div>

              <div>
                <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(248,250,252,0.35)', display: 'block', marginBottom: 4 }}>Lob.com API Key</label>
                <input
                  type="password"
                  placeholder="test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={lobKey}
                  onChange={e => setLobKey(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 11, fontFamily: 'Inter', color: OFF, backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.3)', marginTop: 4 }}>Get your key at lob.com/dashboard</div>
              </div>

              <div style={{ padding: '10px 12px', border: '1px solid rgba(197,150,58,0.15)', backgroundColor: 'rgba(27,42,74,0.4)' }}>
                <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.35)', marginBottom: 6 }}>SEND SUMMARY</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(248,250,252,0.6)' }}>Recipients</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: OFF }}>{mailingList.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(248,250,252,0.6)' }}>Postcard Size</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: OFF }}>6" × 4"</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(248,250,252,0.6)' }}>Est. Cost (Lob)</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>${(mailingList.length * 0.85).toFixed(2)}</span>
                </div>
              </div>

              {sent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 11, color: '#22C55E' }}>
                  <CheckCircle size={13} /> {mailingList.length} postcards queued for print & delivery via Lob.com
                </div>
              )}

              <button
                onClick={handleSendViaLob}
                disabled={sending || !lobKey}
                style={{ width: '100%', padding: '11px', fontSize: 12, fontWeight: 700, fontFamily: 'Inter', cursor: lobKey ? 'pointer' : 'not-allowed', border: 'none', backgroundColor: lobKey ? TEAL : 'rgba(59,156,181,0.3)', color: OFF, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {sending ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending to Lob…</> : <><Send size={14} /> Send {mailingList.length} Postcards via Lob</>}
              </button>
            </div>
          )}
        </div>

        {/* Download Footer */}
        <div style={{ padding: 14, borderTop: '1px solid rgba(197,150,58,0.2)', flexShrink: 0 }}>
          <PDFDownloadLink
            document={<PostcardPDF data={data} />}
            fileName={`${data.propertyName.replace(/[^a-zA-Z0-9]/g, '_')}_Postcard_YoungLewin.pdf`}
          >
            {({ loading }) => (
              <button
                style={{ width: '100%', padding: '10px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter', cursor: 'pointer', border: 'none', backgroundColor: GOLD, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF…</> : <><Download size={13} /> Download Print-Ready PDF</>}
              </button>
            )}
          </PDFDownloadLink>
          <div style={{ marginTop: 6, fontSize: 9, color: 'rgba(248,250,252,0.3)', textAlign: 'center' }}>
            300 DPI · 6"×4" full-bleed · Front + Back · CMYK-ready
          </div>
        </div>
      </div>

      {/* Right Panel — Visual Preview */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        <div style={{ width: '100%', maxWidth: 700 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: OFF, marginBottom: 4 }}>Postcard Preview</div>
          <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', marginBottom: 24 }}>6" × 4" · 300 DPI · Full-bleed · Front & Back</div>

          {/* FRONT preview */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.35)', marginBottom: 8 }}>Front Side</div>
            <div style={{ backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', overflow: 'hidden', position: 'relative' }}>
              {/* Gold top bar */}
              <div style={{ height: 4, backgroundColor: GOLD }} />
              {/* Hero area */}
              <div style={{ height: 180, backgroundColor: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, left: 14, backgroundColor: GOLD, padding: '3px 10px', fontSize: 9, fontWeight: 700, color: SLATE, letterSpacing: '0.1em' }}>FOR SALE — MULTIFAMILY</div>
                <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.2)', letterSpacing: '0.15em', fontWeight: 700 }}>PROPERTY PHOTO</div>
              </div>
              {/* Content */}
              <div style={{ padding: '14px 20px 16px' }}>
                <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', marginBottom: 3, letterSpacing: '0.05em' }}>{data.address.toUpperCase()}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: OFF, marginBottom: 10 }}>{data.propertyName}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                  {[['ASKING PRICE', data.price, GOLD], ['CAP RATE', data.capRate, TEAL], ['TOTAL UNITS', data.units, OFF], ['YEAR BUILT', data.yearBuilt, OFF]].map(([label, value, color]) => (
                    <div key={label as string}>
                      <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.7)', marginBottom: 2 }}>{label as string}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: color as string }}>{value as string}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, backgroundColor: 'rgba(45,63,94,0.8)', marginBottom: 10 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>{data.brokerName}</div>
                    <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.7)' }}>YoungLewin Advisors · {data.brokerLicense}</div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TEAL }}>{data.callToAction}</div>
                </div>
              </div>
              <div style={{ height: 4, backgroundColor: GOLD }} />
            </div>
          </div>

          {/* BACK preview */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.35)', marginBottom: 8 }}>Back Side</div>
            <div style={{ backgroundColor: SLATE, border: '1px solid rgba(197,150,58,0.2)', display: 'flex', overflow: 'hidden' }}>
              {/* Left */}
              <div style={{ flex: 1, padding: '16px 20px', borderRight: '1px solid rgba(45,63,94,0.8)' }}>
                <div style={{ height: 3, backgroundColor: GOLD, marginBottom: 10 }} />
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD, marginBottom: 6 }}>INVESTMENT OPPORTUNITY</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: OFF, marginBottom: 10, lineHeight: 1.3 }}>{data.propertyName}<br />{data.city}</div>
                {data.bullets.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 5, height: 5, backgroundColor: GOLD, flexShrink: 0, marginTop: 4 }} />
                    <span style={{ fontSize: 10, color: 'rgba(203,213,225,0.9)', lineHeight: 1.4 }}>{b}</span>
                  </div>
                ))}
                <div style={{ height: 1, backgroundColor: 'rgba(45,63,94,0.8)', margin: '10px 0' }} />
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: GOLD, marginBottom: 6 }}>FINANCIAL SUMMARY</div>
                {[['Asking Price', data.price, true], ['Cap Rate', data.capRate, true], ['Price / Unit', data.pricePerUnit, false], ['NOI', data.noi, false]].map(([l, v, g]) => (
                  <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)' }}>{l as string}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: g ? GOLD : OFF }}>{v as string}</span>
                  </div>
                ))}
              </div>
              {/* Right */}
              <div style={{ width: 180, padding: '16px 16px', flexShrink: 0 }}>
                <div style={{ height: 3, backgroundColor: GOLD, marginBottom: 10 }} />
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD, marginBottom: 8 }}>EXCLUSIVELY LISTED BY</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: OFF, marginBottom: 2 }}>YoungLewin Advisors</div>
                <div style={{ fontSize: 10, color: TEAL, marginBottom: 10 }}>Multifamily Investment Sales</div>
                <div style={{ fontSize: 10, color: 'rgba(203,213,225,0.8)', marginBottom: 4 }}>{data.brokerPhone}</div>
                <div style={{ fontSize: 10, color: 'rgba(203,213,225,0.8)', marginBottom: 12 }}>{data.brokerEmail}</div>
                <div style={{ padding: '8px 10px', backgroundColor: `${NAVY}80`, borderLeft: `2px solid ${GOLD}` }}>
                  <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', lineHeight: 1.5 }}>{data.address}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, marginTop: 3 }}>{data.price} · {data.capRate} Cap</div>
                </div>
                <div style={{ marginTop: 12, width: 56, height: 56, backgroundColor: `${NAVY}80`, border: '1px solid rgba(45,63,94,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.5)', textAlign: 'center', lineHeight: 1.4 }}>QR CODE<br />LISTING</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
