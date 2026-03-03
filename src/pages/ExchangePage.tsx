import { useState, useRef, useMemo } from 'react'
import { Plus, Trash2, Download, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CurrentSituation {
  salePrice: number
  adjustedBasis: number
  existingDebt: number
  annualNOI: number
  currentPropTaxRate: number
  assessedValue: number
  costOfSalePercent: number
}

interface Upleg {
  id: string
  name: string
  address: string
  purchasePrice: number
  downPayment: number
  interestRate: number
  amortYears: number
  projectedNOI: number
}

interface CurrentCalc {
  grossEquity: number
  costOfSale: number
  netProceedsBeforeTax: number
  capitalGain: number
  taxLiability: number
  netEquityAfterTax: number
  annualPropTax: number
  annualDebtService: number
  annualCashFlow: number
  coc: number
}

interface UplegCalc {
  equity: number
  loanAmount: number
  annualDebtService: number
  annualCashFlow: number
  leveragedValue: number
  coc: number
  deltaCashFlow: number
  deltaROE: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLENDED_TAX_RATE = 0.331

// ─── Math ─────────────────────────────────────────────────────────────────────

function calcADS(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const r = annualRate / 100 / 12
  const n = years * 12
  const monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return monthly * 12
}

function computeCurrent(cs: CurrentSituation): CurrentCalc {
  const grossEquity = cs.salePrice - cs.existingDebt
  const costOfSale = cs.salePrice * (cs.costOfSalePercent / 100)
  const netProceedsBeforeTax = grossEquity - costOfSale
  const capitalGain = Math.max(0, cs.salePrice - cs.adjustedBasis - costOfSale)
  const taxLiability = capitalGain * BLENDED_TAX_RATE
  const netEquityAfterTax = netProceedsBeforeTax - taxLiability
  const annualPropTax = cs.assessedValue * (cs.currentPropTaxRate / 100)
  const ads = calcADS(cs.existingDebt, 6.5, 30)
  const annualCashFlow = cs.annualNOI - annualPropTax - ads
  const coc = netEquityAfterTax > 0 ? (annualCashFlow / netEquityAfterTax) * 100 : 0
  return { grossEquity, costOfSale, netProceedsBeforeTax, capitalGain, taxLiability, netEquityAfterTax, annualPropTax, annualDebtService: ads, annualCashFlow, coc }
}

function computeUpleg(upleg: Upleg, exchangeEquity: number, currentCalc: CurrentCalc): UplegCalc {
  const equity = Math.min(upleg.downPayment, exchangeEquity)
  const loanAmount = Math.max(0, upleg.purchasePrice - equity)
  const ads = calcADS(loanAmount, upleg.interestRate, upleg.amortYears)
  const annualCashFlow = upleg.projectedNOI - ads
  const coc = equity > 0 ? (annualCashFlow / equity) * 100 : 0
  return { equity, loanAmount, annualDebtService: ads, annualCashFlow, leveragedValue: upleg.purchasePrice, coc, deltaCashFlow: annualCashFlow - currentCalc.annualCashFlow, deltaROE: coc - currentCalc.coc }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const IS: React.CSSProperties = { backgroundColor: 'rgba(15,23,42,0.7)', border: '1px solid rgba(197,150,58,0.3)', color: '#F8FAFC', padding: '7px 10px', fontSize: 12, fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%' }
const LS: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(248,250,252,0.4)', marginBottom: 4 }
const COLORS = ['#C5963A', '#3B9CB5', '#22C55E', '#A855F7', '#F97316']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtP(n: number) { return `$${Math.round(n).toLocaleString()}` }
function fmtPct(n: number) { return `${n.toFixed(2)}%` }

function NumInput({ label, value, onChange, prefix = '', suffix = '', step = 1 }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; step?: number }) {
  return (
    <div>
      <label style={LS}>{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(248,250,252,0.4)', fontSize: 12, pointerEvents: 'none' }}>{prefix}</span>}
        <input type="number" step={step} value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ ...IS, paddingLeft: prefix ? 18 : 10, paddingRight: suffix ? 28 : 10 }} />
        {suffix && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(248,250,252,0.4)', fontSize: 12, pointerEvents: 'none' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function DeltaBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const pos = value > 0.005
  const neg = value < -0.005
  const neu = !pos && !neg
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter', backgroundColor: neu ? 'rgba(248,250,252,0.06)' : pos ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: neu ? 'rgba(248,250,252,0.4)' : pos ? '#22C55E' : '#EF4444', border: `1px solid ${neu ? 'rgba(248,250,252,0.1)' : pos ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
      {neu ? <Minus size={10} /> : pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {neu ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`}
    </span>
  )
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CS: CurrentSituation = { salePrice: 2950000, adjustedBasis: 900000, existingDebt: 1200000, annualNOI: 143075, currentPropTaxRate: 1.1, assessedValue: 650000, costOfSalePercent: 4.0 }
function newUpleg(i: number): Upleg { return { id: `upleg-${Date.now()}-${i}`, name: `Replacement Property ${i + 1}`, address: '', purchasePrice: 4500000, downPayment: 1650000, interestRate: 6.75, amortYears: 30, projectedNOI: 225000 } }

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExchangePage() {
  const [cs, setCs] = useState<CurrentSituation>(DEFAULT_CS)
  const [uplegs, setUplegs] = useState<Upleg[]>([newUpleg(0)])
  const exportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const cc = useMemo(() => computeCurrent(cs), [cs])
  const xEq = cc.netProceedsBeforeTax
  const ucs = useMemo(() => uplegs.map(u => computeUpleg(u, xEq, cc)), [uplegs, xEq, cc])

  const updateCS = (k: keyof CurrentSituation, v: number) => setCs(p => ({ ...p, [k]: v }))
  const updateU = (id: string, k: keyof Upleg, v: string | number) => setUplegs(p => p.map(u => u.id === id ? { ...u, [k]: v } : u))
  const addUpleg = () => { if (uplegs.length < 4) setUplegs(p => [...p, newUpleg(p.length)]) }
  const removeUpleg = (id: string) => setUplegs(p => p.filter(u => u.id !== id))

  const allKeys = ['Keep & Pay Tax', ...uplegs.map((u, i) => u.name || `Upleg ${i + 1}`)]
  const chartData = [
    { name: 'Equity Deployed', 'Keep & Pay Tax': cc.netEquityAfterTax, ...Object.fromEntries(uplegs.map((u, i) => [u.name || `Upleg ${i + 1}`, ucs[i].equity])) },
    { name: 'Leveraged Value', 'Keep & Pay Tax': cs.salePrice, ...Object.fromEntries(uplegs.map((u, i) => [u.name || `Upleg ${i + 1}`, ucs[i].leveragedValue])) },
    { name: 'Annual Cash Flow', 'Keep & Pay Tax': cc.annualCashFlow, ...Object.fromEntries(uplegs.map((u, i) => [u.name || `Upleg ${i + 1}`, ucs[i].annualCashFlow])) },
  ]

  const handleExport = async () => {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#0F172A', useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save('1031-exchange-analysis.pdf')
    } catch (err) { console.error('Export failed:', err) }
    finally { setExporting(false) }
  }

  const compRows = [
    { label: 'Gross Equity', current: fmtP(cc.grossEquity), vals: ucs.map(uc => fmtP(uc.equity)) },
    { label: 'Cost of Sale', current: `-${fmtP(cc.costOfSale)}`, vals: ucs.map(() => '—') },
    { label: 'Tax Liability', current: `-${fmtP(cc.taxLiability)}`, vals: ucs.map(() => '$0 (deferred)'), highlight: true },
    { label: 'Net Equity Deployed', current: fmtP(cc.netEquityAfterTax), vals: ucs.map(uc => fmtP(uc.equity)), bold: true },
    { label: 'Leveraged Value', current: fmtP(cs.salePrice), vals: ucs.map(uc => fmtP(uc.leveragedValue)) },
    { label: 'Loan Amount', current: fmtP(cs.existingDebt), vals: ucs.map(uc => fmtP(uc.loanAmount)) },
    { label: 'Annual Debt Service', current: `-${fmtP(cc.annualDebtService)}`, vals: ucs.map(uc => `-${fmtP(uc.annualDebtService)}`) },
    { label: 'Annual Prop Tax', current: `-${fmtP(cc.annualPropTax)}`, vals: ucs.map(() => 'Reassessed') },
    { label: 'Annual NOI', current: fmtP(cs.annualNOI), vals: uplegs.map(u => fmtP(u.projectedNOI)) },
    { label: 'Annual Cash Flow', current: fmtP(cc.annualCashFlow), vals: ucs.map(uc => fmtP(uc.annualCashFlow)), bold: true },
    { label: 'Cash-on-Cash ROE', current: fmtPct(cc.coc), vals: ucs.map(uc => fmtPct(uc.coc)), bold: true, highlight: true },
  ]

  const best = ucs.reduce((b: { uc: UplegCalc; i: number } | null, uc, i) => uc.coc > (b ? ucs[b.i].coc : -Infinity) ? { uc, i } : b, null)
  const keepWins = !best || cc.coc >= best.uc.coc
  const winner = keepWins ? 'Keep & Pay Tax' : (uplegs[best!.i].name || `Upleg ${best!.i + 1}`)
  const diff = keepWins ? (best ? cc.coc - best.uc.coc : 0) : best!.uc.coc - cc.coc
  const gc = `200px repeat(${uplegs.length + 1}, 1fr)`

  return (
    <div className="p-6 space-y-5 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700 tracking-tight" style={{ color: '#F8FAFC' }}>1031 Exchange Calculator</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>Current Situation vs. Up to 4 Replacement Properties — Cash-on-Cash &amp; ROE Analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setCs(DEFAULT_CS); setUplegs([newUpleg(0)]) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, backgroundColor: 'rgba(197,150,58,0.1)', color: '#C5963A', border: '1px solid rgba(197,150,58,0.3)', cursor: 'pointer', fontFamily: 'Inter' }}>
            <RefreshCw size={13} /> Reset
          </button>
          <button onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, backgroundColor: exporting ? 'rgba(197,150,58,0.3)' : '#C5963A', color: '#0F172A', border: 'none', cursor: exporting ? 'wait' : 'pointer', fontFamily: 'Inter' }}>
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Current Situation */}
      <div style={{ backgroundColor: '#1B2A4A', border: '1px solid rgba(197,150,58,0.2)' }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: 'rgba(197,150,58,0.06)', borderBottom: '1px solid rgba(197,150,58,0.15)' }}>
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color: '#C5963A' }}>Current Situation — Relinquished Property</span>
        </div>
        <div className="grid grid-cols-4 gap-4 p-4">
          <NumInput label="Sale Price ($)" value={cs.salePrice} onChange={v => updateCS('salePrice', v)} prefix="$" />
          <NumInput label="Adjusted Basis ($)" value={cs.adjustedBasis} onChange={v => updateCS('adjustedBasis', v)} prefix="$" />
          <NumInput label="Existing Debt ($)" value={cs.existingDebt} onChange={v => updateCS('existingDebt', v)} prefix="$" />
          <NumInput label="Annual NOI ($)" value={cs.annualNOI} onChange={v => updateCS('annualNOI', v)} prefix="$" />
          <NumInput label="Prop 13 Assessed Value ($)" value={cs.assessedValue} onChange={v => updateCS('assessedValue', v)} prefix="$" />
          <NumInput label="Current Prop Tax Rate (%)" value={cs.currentPropTaxRate} onChange={v => updateCS('currentPropTaxRate', v)} suffix="%" step={0.01} />
          <NumInput label="Cost of Sale (%)" value={cs.costOfSalePercent} onChange={v => updateCS('costOfSalePercent', v)} suffix="%" step={0.1} />
        </div>
      </div>

      {/* Upleg Inputs */}
      <div style={{ border: '1px solid rgba(59,156,181,0.3)' }}>
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(59,156,181,0.06)', borderBottom: '1px solid rgba(59,156,181,0.2)' }}>
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color: '#3B9CB5' }}>Replacement Properties (Uplegs) — {uplegs.length} of 4</span>
          {uplegs.length < 4 && (
            <button onClick={addUpleg} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11, fontWeight: 700, backgroundColor: 'rgba(59,156,181,0.15)', color: '#3B9CB5', border: '1px solid rgba(59,156,181,0.4)', cursor: 'pointer', fontFamily: 'Inter' }}>
              <Plus size={12} /> Add Upleg
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${uplegs.length}, 1fr)` }}>
          {uplegs.map((upleg, idx) => (
            <div key={upleg.id} style={{ padding: 16, borderRight: idx < uplegs.length - 1 ? '1px solid rgba(59,156,181,0.15)' : 'none' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-700 uppercase tracking-wider" style={{ color: '#3B9CB5' }}>Upleg {idx + 1}</span>
                {uplegs.length > 1 && <button onClick={() => removeUpleg(upleg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', padding: 2 }}><Trash2 size={13} /></button>}
              </div>
              <div className="space-y-3">
                <div>
                  <label style={LS}>Property Name</label>
                  <input type="text" value={upleg.name} placeholder="e.g. 12-Unit Belmont Shore" onChange={e => updateU(upleg.id, 'name', e.target.value)} style={IS} />
                </div>
                <div>
                  <label style={LS}>Address</label>
                  <input type="text" value={upleg.address} placeholder="Street, City, State" onChange={e => updateU(upleg.id, 'address', e.target.value)} style={IS} />
                </div>
                <NumInput label="Purchase Price ($)" value={upleg.purchasePrice} onChange={v => updateU(upleg.id, 'purchasePrice', v)} prefix="$" />
                <NumInput label="Down Payment ($)" value={upleg.downPayment} onChange={v => updateU(upleg.id, 'downPayment', v)} prefix="$" />
                <div>
                  <label style={LS}>New Loan Amount ($)</label>
                  <div style={{ ...IS, color: 'rgba(248,250,252,0.5)', backgroundColor: 'rgba(15,23,42,0.3)' }}>${Math.max(0, upleg.purchasePrice - upleg.downPayment).toLocaleString()}</div>
                </div>
                <NumInput label="Interest Rate (%)" value={upleg.interestRate} onChange={v => updateU(upleg.id, 'interestRate', v)} suffix="%" step={0.125} />
                <NumInput label="Amort. Years" value={upleg.amortYears} onChange={v => updateU(upleg.id, 'amortYears', v)} />
                <NumInput label="Projected NOI ($)" value={upleg.projectedNOI} onChange={v => updateU(upleg.id, 'projectedNOI', v)} prefix="$" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-Side Comparison (exportable) */}
      <div ref={exportRef} style={{ border: '1px solid rgba(197,150,58,0.2)', backgroundColor: '#0F172A' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(197,150,58,0.08)', borderBottom: '1px solid rgba(197,150,58,0.2)' }}>
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color: '#C5963A' }}>Side-by-Side Comparison</span>
          <span className="text-xs ml-2" style={{ color: 'rgba(248,250,252,0.3)' }}>~{(BLENDED_TAX_RATE * 100).toFixed(1)}% blended CA rate (20% fed + 3.8% NIIT + 9.3% CA)</span>
        </div>

        {/* Column Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: gc, borderBottom: '1px solid rgba(197,150,58,0.2)' }}>
          <div style={{ padding: '10px 12px', backgroundColor: '#1B2A4A' }} />
          <div style={{ padding: '10px 12px', backgroundColor: '#1B2A4A', borderLeft: '1px solid rgba(197,150,58,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C5963A', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Keep &amp; Pay Tax</div>
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter', marginTop: 2 }}>Current Situation</div>
          </div>
          {uplegs.map((u, i) => (
            <div key={u.id} style={{ padding: '10px 12px', backgroundColor: '#1B2A4A', borderLeft: '1px solid rgba(59,156,181,0.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3B9CB5', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{u.name || `Upleg ${i + 1}`}</div>
              <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter', marginTop: 2 }}>{u.address || '1031 Exchange'}</div>
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {compRows.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: gc, borderBottom: '1px solid rgba(197,150,58,0.06)', backgroundColor: row.highlight ? 'rgba(197,150,58,0.04)' : 'transparent' }}>
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(248,250,252,0.5)', fontFamily: 'Inter', display: 'flex', alignItems: 'center' }}>{row.label}</div>
            <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: row.bold ? 700 : 400, color: row.highlight ? '#C5963A' : '#F8FAFC', fontFamily: 'Inter', borderLeft: '1px solid rgba(197,150,58,0.1)', display: 'flex', alignItems: 'center' }}>{row.current}</div>
            {row.vals.map((val, i) => (
              <div key={i} style={{ padding: '8px 12px', fontSize: 12, fontWeight: row.bold ? 700 : 400, color: row.highlight ? '#3B9CB5' : '#F8FAFC', fontFamily: 'Inter', borderLeft: '1px solid rgba(59,156,181,0.1)', display: 'flex', alignItems: 'center' }}>{val}</div>
            ))}
          </div>
        ))}

        {/* Delta Cash Flow */}
        <div style={{ display: 'grid', gridTemplateColumns: gc, borderTop: '2px solid rgba(197,150,58,0.3)', backgroundColor: 'rgba(27,42,74,0.5)' }}>
          <div style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.6)', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Δ Cash Flow vs. Keep</div>
          <div style={{ padding: '10px 12px', borderLeft: '1px solid rgba(197,150,58,0.1)', display: 'flex', alignItems: 'center' }}><DeltaBadge value={0} suffix="/yr" /></div>
          {ucs.map((uc, i) => (
            <div key={i} style={{ padding: '10px 12px', borderLeft: '1px solid rgba(59,156,181,0.1)', display: 'flex', alignItems: 'center' }}><DeltaBadge value={uc.deltaCashFlow / 1000} suffix="K/yr" /></div>
          ))}
        </div>

        {/* Delta ROE */}
        <div style={{ display: 'grid', gridTemplateColumns: gc, borderTop: '1px solid rgba(197,150,58,0.15)', backgroundColor: 'rgba(27,42,74,0.5)' }}>
          <div style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.6)', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Δ ROE vs. Keep</div>
          <div style={{ padding: '10px 12px', borderLeft: '1px solid rgba(197,150,58,0.1)', display: 'flex', alignItems: 'center' }}><DeltaBadge value={0} /></div>
          {ucs.map((uc, i) => (
            <div key={i} style={{ padding: '10px 12px', borderLeft: '1px solid rgba(59,156,181,0.1)', display: 'flex', alignItems: 'center' }}><DeltaBadge value={uc.deltaROE} /></div>
          ))}
        </div>

        {/* Verdict */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: keepWins ? 'rgba(197,150,58,0.1)' : 'rgba(59,156,181,0.1)', borderTop: `2px solid ${keepWins ? '#C5963A' : '#3B9CB5'}` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: keepWins ? '#C5963A' : '#3B9CB5', fontFamily: 'Inter' }}>{winner} delivers superior ROE</div>
            <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.5)', fontFamily: 'Inter', marginTop: 2 }}>ROE differential: {fmtPct(diff)} in favor of {winner}</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: keepWins ? '#C5963A' : '#3B9CB5', fontFamily: 'Inter' }}>{keepWins ? '' : '+'}{fmtPct(diff)}</div>
        </div>

        {/* Chart */}
        <div style={{ padding: 16, borderTop: '1px solid rgba(197,150,58,0.15)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter', marginBottom: 12 }}>Capital Comparison</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(248,250,252,0.5)', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fill: 'rgba(248,250,252,0.5)', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1B2A4A', border: '1px solid rgba(197,150,58,0.4)', borderRadius: 0, fontFamily: 'Inter', fontSize: 12 }} formatter={(value: number | undefined) => [`$${Math.round(value ?? 0).toLocaleString()}`, '' as const]} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter', color: 'rgba(248,250,252,0.6)' }} />
              {allKeys.map((key, i) => <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={0} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Disclaimer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(197,150,58,0.1)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertTriangle size={12} style={{ color: '#C5963A', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 10, color: 'rgba(248,250,252,0.35)', fontFamily: 'Inter', lineHeight: 1.5, margin: 0 }}>
            This calculator provides estimates for informational purposes only. Tax liability uses a blended ~{(BLENDED_TAX_RATE * 100).toFixed(1)}% rate (20% federal long-term CG + 3.8% NIIT + 9.3% CA). Property tax reassessment on exchange properties is not modeled. Consult a qualified CPA and 1031 exchange intermediary before executing any exchange transaction.
          </p>
        </div>
      </div>
    </div>
  )
}
