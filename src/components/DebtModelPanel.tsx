import { useState, useMemo } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react'

// ── Brand tokens ─────────────────────────────────────────────
const NAVY   = '#1B2A4A'
const GOLD   = '#C5963A'
const TEAL   = '#3B9CB5'
const SLATE  = '#0F172A'
const OFF    = '#F8FAFC'

// ── Math helpers ─────────────────────────────────────────────

/** Monthly payment for a fully-amortizing loan */
function calcMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (annualRate === 0) return principal / (termYears * 12)
  const r = annualRate / 12
  const n = termYears * 12
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}


interface DebtInputs {
  purchasePrice: number
  ltv: number           // 0–1
  interestRate: number  // 0–1
  amortYears: number
  ioPeriodYrs: number
  noi: number
  gsi: number           // Gross Scheduled Income
  vacancyRate: number   // 0–1
  opEx: number          // Operating Expenses
}

interface DebtOutputs {
  loanAmount: number
  equityInvested: number
  annualDebtService: number
  ioDebtService: number
  amortDebtService: number
  dscr: number
  cashOnCash: number
  annualCashFlow: number
  effectiveGrossIncome: number
  capRate: number
  breakEvenOccupancy: number
}

function calculate(inputs: DebtInputs): DebtOutputs {
  const { purchasePrice, ltv, interestRate, amortYears, ioPeriodYrs, noi, gsi, vacancyRate, opEx } = inputs

  const loanAmount = purchasePrice * ltv
  const equityInvested = purchasePrice - loanAmount
  const effectiveGrossIncome = gsi * (1 - vacancyRate)
  const computedNOI = noi > 0 ? noi : effectiveGrossIncome - opEx

  const ioDebtService = loanAmount * interestRate
  const amortDebtService = calcMonthlyPayment(loanAmount, interestRate, amortYears) * 12
  const annualDebtService = ioPeriodYrs > 0 ? ioDebtService : amortDebtService

  const annualCashFlow = computedNOI - annualDebtService
  const dscr = annualDebtService > 0 ? computedNOI / annualDebtService : 0
  const cashOnCash = equityInvested > 0 ? annualCashFlow / equityInvested : 0
  const capRate = purchasePrice > 0 ? computedNOI / purchasePrice : 0
  const breakEvenOccupancy = gsi > 0 ? (annualDebtService + opEx) / gsi : 0

  return {
    loanAmount,
    equityInvested,
    annualDebtService,
    ioDebtService,
    amortDebtService,
    dscr,
    cashOnCash,
    annualCashFlow,
    effectiveGrossIncome,
    capRate,
    breakEvenOccupancy,
  }
}

// ── Formatting ───────────────────────────────────────────────
const fmt$ = (v: number) => v == null || isNaN(v) ? '—' : `$${Math.round(v).toLocaleString()}`
const fmtPct = (v: number, dec = 2) => v == null || isNaN(v) ? '—' : `${(v * 100).toFixed(dec)}%`
const fmtX = (v: number) => v == null || isNaN(v) ? '—' : `${v.toFixed(2)}x`

// ── Sub-components ───────────────────────────────────────────
function InputRow({
  label, value, onChange, prefix = '', suffix = '', step = 0.01, min = 0, max, tooltip,
}: {
  label: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; min?: number; max?: number; tooltip?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(248,250,252,0.45)', fontFamily: 'Inter' }}>
          {label}
        </label>
        {tooltip && <span title={tooltip} style={{ cursor: 'help', display: 'inline-flex' }}><Info size={10} style={{ color: 'rgba(248,250,252,0.3)' }} /></span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(197,150,58,0.25)', backgroundColor: 'rgba(15,23,42,0.6)' }}>
        {prefix && <span style={{ padding: '0 8px', fontSize: 12, color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter', borderRight: '1px solid rgba(197,150,58,0.15)' }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ flex: 1, padding: '7px 10px', fontSize: 13, fontWeight: 600, color: OFF, backgroundColor: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter', width: 0 }}
        />
        {suffix && <span style={{ padding: '0 8px', fontSize: 12, color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter', borderLeft: '1px solid rgba(197,150,58,0.15)' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function MetricCard({
  label, value, sub, color = OFF, highlight = false, large = false,
}: {
  label: string; value: string; sub?: string; color?: string; highlight?: boolean; large?: boolean
}) {
  return (
    <div style={{
      padding: '10px 12px',
      backgroundColor: highlight ? `${GOLD}12` : 'rgba(15,23,42,0.5)',
      border: `1px solid ${highlight ? `${GOLD}40` : 'rgba(197,150,58,0.1)'}`,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: large ? 20 : 15, fontWeight: 700, color, fontFamily: 'Inter', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── DSCR color ────────────────────────────────────────────────
function dscrColor(dscr: number): string {
  if (dscr >= 1.25) return '#22C55E'
  if (dscr >= 1.0)  return GOLD
  return '#EF4444'
}

function dscrLabel(dscr: number): string {
  if (dscr >= 1.25) return 'Strong Coverage'
  if (dscr >= 1.0)  return 'Marginal Coverage'
  return 'Negative Coverage — Loan Risk'
}

// ── Main Component ────────────────────────────────────────────
interface DebtModelPanelProps {
  initialPrice?: number
  initialNOI?: number
  initialGSI?: number
  initialOpEx?: number
}

export default function DebtModelPanel({
  initialPrice = 2950000,
  initialNOI = 143075,
  initialGSI = 223800,
  initialOpEx = 80725,
}: DebtModelPanelProps) {
  const [price, setPrice]       = useState(initialPrice)
  const [ltv, setLtv]           = useState(65)           // stored as 0–100
  const [rate, setRate]         = useState(6.75)          // stored as 0–100
  const [amort, setAmort]       = useState(30)
  const [io, setIo]             = useState(0)
  const [noi, setNoi]           = useState(initialNOI)
  const [gsi, setGsi]           = useState(initialGSI)
  const [vacancy, setVacancy]   = useState(5)             // stored as 0–100
  const [opEx, setOpEx]         = useState(initialOpEx)
  const [useManualNOI, setUseManualNOI] = useState(true)

  const result = useMemo<DebtOutputs>(() => calculate({
    purchasePrice: price,
    ltv: ltv / 100,
    interestRate: rate / 100,
    amortYears: amort,
    ioPeriodYrs: io,
    noi: useManualNOI ? noi : 0,
    gsi,
    vacancyRate: vacancy / 100,
    opEx,
  }), [price, ltv, rate, amort, io, noi, gsi, vacancy, opEx, useManualNOI])

  const dscrC = dscrColor(result.dscr)

  return (
    <div style={{ backgroundColor: SLATE, fontFamily: 'Inter', color: OFF, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${GOLD}30`, backgroundColor: `${NAVY}80`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <TrendingUp size={16} style={{ color: GOLD }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD }}>Debt Underwriting Engine</div>
          <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', marginTop: 1 }}>LTV · Rate · Amortization · I/O · DSCR · Cash-on-Cash</div>
        </div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── DSCR Hero ── */}
        <div style={{ padding: '14px 16px', border: `2px solid ${dscrC}50`, backgroundColor: `${dscrC}08`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(248,250,252,0.4)', marginBottom: 4 }}>DSCR</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: dscrC, lineHeight: 1 }}>{fmtX(result.dscr)}</div>
            <div style={{ fontSize: 11, color: dscrC, marginTop: 4, fontWeight: 600 }}>{dscrLabel(result.dscr)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {result.dscr >= 1.25 ? (
              <CheckCircle size={28} style={{ color: '#22C55E' }} />
            ) : (
              <AlertTriangle size={28} style={{ color: result.dscr >= 1.0 ? GOLD : '#EF4444' }} />
            )}
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', marginTop: 4 }}>Min. lender req: 1.25x</div>
          </div>
        </div>

        {/* ── Key Outputs Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <MetricCard label="Loan Amount"       value={fmt$(result.loanAmount)}        sub={`${ltv}% LTV`}                     color={OFF} />
          <MetricCard label="Equity Invested"   value={fmt$(result.equityInvested)}    sub={`${(100 - ltv).toFixed(0)}% Down`} color={GOLD} highlight />
          <MetricCard label="Annual Debt Svc"   value={fmt$(result.annualDebtService)} sub={io > 0 ? `${io}yr I/O` : 'Amort'} color={OFF} />
          <MetricCard label="Annual Cash Flow"  value={fmt$(result.annualCashFlow)}    color={result.annualCashFlow >= 0 ? '#22C55E' : '#EF4444'} highlight={result.annualCashFlow >= 0} />
          <MetricCard label="Cash-on-Cash"      value={fmtPct(result.cashOnCash)}      color={result.cashOnCash >= 0.05 ? '#22C55E' : result.cashOnCash >= 0 ? GOLD : '#EF4444'} />
          <MetricCard label="Cap Rate"          value={fmtPct(result.capRate)}         color={TEAL} />
        </div>

        {/* ── I/O vs Amort comparison ── */}
        {io > 0 && (
          <div style={{ padding: '10px 14px', border: `1px solid ${TEAL}30`, backgroundColor: `${TEAL}08` }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEAL, marginBottom: 8 }}>I/O vs. Amortizing Comparison</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.4)' }}>I/O Annual Payment (Yrs 1–{io})</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEAL }}>{fmt$(result.ioDebtService)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.4)' }}>Amortizing Payment (Yr {io + 1}+)</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>{fmt$(result.amortDebtService)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.4)' }}>Annual Payment Increase</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>{fmt$(result.amortDebtService - result.ioDebtService)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.4)' }}>Break-Even Occupancy</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: OFF }}>{fmtPct(result.breakEvenOccupancy)}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Inputs ── */}
        <div style={{ border: `1px solid ${GOLD}20`, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD, marginBottom: 14 }}>Loan Parameters</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <InputRow label="Purchase Price"  value={price}  onChange={setPrice}  prefix="$" step={50000} tooltip="Total acquisition price" />
            <InputRow label="LTV"             value={ltv}    onChange={setLtv}    suffix="%" step={1} min={0} max={100} tooltip="Loan-to-Value ratio" />
            <InputRow label="Interest Rate"   value={rate}   onChange={setRate}   suffix="%" step={0.125} min={0} max={20} tooltip="Annual interest rate" />
            <InputRow label="Amortization"    value={amort}  onChange={setAmort}  suffix="yrs" step={1} min={1} max={40} tooltip="Loan amortization period" />
            <InputRow label="I/O Period"      value={io}     onChange={setIo}     suffix="yrs" step={1} min={0} max={10} tooltip="Interest-only period before amortization begins" />
          </div>
        </div>

        <div style={{ border: `1px solid ${GOLD}20`, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD }}>Income & Expense</div>
            <button
              onClick={() => setUseManualNOI(v => !v)}
              style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Inter', border: `1px solid ${useManualNOI ? GOLD : TEAL}50`, backgroundColor: useManualNOI ? `${GOLD}12` : `${TEAL}12`, color: useManualNOI ? GOLD : TEAL }}
            >
              {useManualNOI ? 'NOI: Manual' : 'NOI: Computed'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {useManualNOI ? (
              <div style={{ gridColumn: '1/-1' }}>
                <InputRow label="Net Operating Income (NOI)" value={noi} onChange={setNoi} prefix="$" step={1000} tooltip="Annual NOI — overrides GSI/vacancy/opex calculation" />
              </div>
            ) : (
              <>
                <InputRow label="Gross Sched. Income"  value={gsi}     onChange={setGsi}     prefix="$" step={1000} tooltip="Annual gross scheduled income (100% occupancy)" />
                <InputRow label="Vacancy Rate"         value={vacancy} onChange={setVacancy} suffix="%" step={0.5} min={0} max={50} tooltip="Estimated vacancy and credit loss" />
                <InputRow label="Operating Expenses"   value={opEx}    onChange={setOpEx}    prefix="$" step={1000} tooltip="Annual operating expenses (excl. debt service)" />
                <div style={{ padding: '8px 12px', backgroundColor: `${TEAL}10`, border: `1px solid ${TEAL}25` }}>
                  <div style={{ fontSize: 9, color: 'rgba(248,250,252,0.4)' }}>Computed NOI</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEAL }}>{fmt$(result.effectiveGrossIncome - opEx)}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', backgroundColor: 'rgba(197,150,58,0.04)', border: '1px solid rgba(197,150,58,0.1)' }}>
          <Info size={12} style={{ color: GOLD, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 10, color: 'rgba(248,250,252,0.35)', margin: 0, lineHeight: 1.5 }}>
            All projections are estimates for analysis purposes only. Actual loan terms, DSCR requirements, and cash flow will vary based on lender underwriting, market conditions, and property performance. Consult a licensed mortgage professional before making financing decisions.
          </p>
        </div>
      </div>
    </div>
  )
}
