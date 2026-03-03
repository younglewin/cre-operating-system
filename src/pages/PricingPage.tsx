import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, DollarSign, Settings2 } from 'lucide-react'
import { formatPrice, formatCapRate, formatGRM, formatPricePer } from '../lib/formatters'
import { SUBJECT_PROPERTY } from '../lib/mockData'

interface SensitivityRow {
  adjustment: number   // e.g. 30, 20, 10, 0, -10, -20, -30
  price: number
  cap_rate: number
  grm: number
  price_per_unit: number
  price_per_sf: number
}

interface Inputs {
  targetPrice: number
  noi: number
  grossRent: number
  numUnits: number
  buildingSf: number
}

function computeMatrix(inputs: Inputs, increment: number): SensitivityRow[] {
  // Build tiers from +3x to -3x increment (highest first → lowest last)
  const tiers = [3, 2, 1, 0, -1, -2, -3]
  return tiers.map(tier => {
    const pct = tier * increment          // e.g. +30, +20, +10, 0, -10, -20, -30
    const price = inputs.targetPrice * (1 + pct / 100)
    const cap_rate = inputs.noi > 0 ? (inputs.noi / price) * 100 : 0
    const grm = inputs.grossRent > 0 ? price / inputs.grossRent : 0
    const price_per_unit = inputs.numUnits > 0 ? price / inputs.numUnits : 0
    const price_per_sf = inputs.buildingSf > 0 ? price / inputs.buildingSf : 0
    return { adjustment: pct, price, cap_rate, grm, price_per_unit, price_per_sf }
  })
}

const INPUT_STYLE = {
  backgroundColor: 'rgba(15,23,42,0.7)',
  border: '1px solid rgba(197,150,58,0.3)',
  color: '#F8FAFC',
  padding: '8px 12px',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  width: '100%',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(248,250,252,0.4)',
  marginBottom: 6,
}

export default function PricingPage() {
  const [inputs, setInputs] = useState<Inputs>({
    targetPrice: SUBJECT_PROPERTY.price ?? 2950000,
    noi: Math.round((SUBJECT_PROPERTY.price ?? 2950000) * ((SUBJECT_PROPERTY.cap_rate ?? 4.85) / 100)),
    grossRent: SUBJECT_PROPERTY.grm
      ? Math.round((SUBJECT_PROPERTY.price ?? 2950000) / (SUBJECT_PROPERTY.grm ?? 13.2))
      : 223485,
    numUnits: SUBJECT_PROPERTY.num_units ?? 4,
    buildingSf: SUBJECT_PROPERTY.building_size_sf ?? 4800,
  })

  // Custom increment — default 10%
  const [increment, setIncrement] = useState(10)
  const [customInc, setCustomInc] = useState('')

  const matrix = useMemo(() => computeMatrix(inputs, increment), [inputs, increment])
  const targetRow = matrix.find(r => r.adjustment === 0)!

  const handleChange = (key: keyof Inputs, value: string) => {
    const num = parseFloat(value.replace(/,/g, ''))
    if (!isNaN(num)) setInputs(prev => ({ ...prev, [key]: num }))
  }

  // Chart data in ascending order (lowest → highest) for visual clarity
  const chartData = [...matrix].reverse().map(row => ({
    label: row.adjustment === 0 ? 'Target' : `${row.adjustment > 0 ? '+' : ''}${row.adjustment}%`,
    price: row.price,
    cap_rate: row.cap_rate,
    isBase: row.adjustment === 0,
  }))

  return (
    <div className="p-6 space-y-5 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700 tracking-tight" style={{ color: '#F8FAFC' }}>
            Pricing Sensitivity Matrix
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>
            7-tier analysis · ±{3 * increment}% of target price
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={16} style={{ color: '#C5963A' }} />
          <span className="text-sm font-500" style={{ color: '#C5963A' }}>
            {SUBJECT_PROPERTY.name}
          </span>
        </div>
      </div>

      {/* Input Controls */}
      <div style={{ backgroundColor: '#1B2A4A', border: '1px solid rgba(197,150,58,0.2)' }}>
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ backgroundColor: 'rgba(197,150,58,0.06)', borderBottom: '1px solid rgba(197,150,58,0.15)' }}>
          <Settings2 size={13} style={{ color: '#C5963A' }} />
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color: '#C5963A' }}>Inputs</span>
        </div>
        <div className="grid grid-cols-6 gap-4 p-4">
          {[
            { key: 'targetPrice' as keyof Inputs, label: 'Target Price ($)' },
            { key: 'noi' as keyof Inputs, label: 'Annual NOI ($)' },
            { key: 'grossRent' as keyof Inputs, label: 'Annual Gross Rent ($)' },
            { key: 'numUnits' as keyof Inputs, label: 'Number of Units' },
            { key: 'buildingSf' as keyof Inputs, label: 'Building SF' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={LABEL_STYLE}>{label}</label>
              <input
                type="text"
                defaultValue={inputs[key].toLocaleString()}
                onBlur={e => handleChange(key, e.target.value)}
                style={INPUT_STYLE}
              />
            </div>
          ))}

          {/* Custom Increment Selector */}
          <div>
            <label style={LABEL_STYLE}>Tier Increment (%)</label>
            <div className="flex gap-1">
              {[2, 5, 10].map(v => (
                <button
                  key={v}
                  onClick={() => { setIncrement(v); setCustomInc('') }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'Inter, sans-serif',
                    backgroundColor: increment === v && !customInc ? '#C5963A' : 'rgba(197,150,58,0.1)',
                    color: increment === v && !customInc ? '#0F172A' : '#C5963A',
                    border: `1px solid ${increment === v && !customInc ? '#C5963A' : 'rgba(197,150,58,0.3)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {v}%
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={50}
                placeholder="—"
                value={customInc}
                onChange={e => {
                  const v = e.target.value
                  setCustomInc(v)
                  const n = parseInt(v)
                  if (!isNaN(n) && n >= 1 && n <= 50) setIncrement(n)
                }}
                style={{ ...INPUT_STYLE, width: 52, textAlign: 'center', padding: '8px 4px' }}
                title="Custom %"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Matrix Table — Highest at top, Target in middle, Lowest at bottom */}
      <div style={{ border: '1px solid rgba(197,150,58,0.2)' }}>
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ backgroundColor: 'rgba(197,150,58,0.08)', borderBottom: '1px solid rgba(197,150,58,0.2)' }}>
          <DollarSign size={13} style={{ color: '#C5963A' }} />
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color: '#C5963A' }}>
            Sensitivity Matrix
          </span>
          <span className="text-xs ml-2" style={{ color: 'rgba(248,250,252,0.3)' }}>
            Highest price at top · Target in center · Lowest at bottom
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(197,150,58,0.2)' }}>
                {['Adjustment', 'Price', 'Cap Rate', 'GRM', '$/Unit', '$/SF', 'vs. Target'].map(h => (
                  <th key={h}
                    className="px-4 py-2.5 text-xs font-600 uppercase tracking-wider text-left"
                    style={{ color: 'rgba(248,250,252,0.4)', backgroundColor: '#1B2A4A' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => {
                const isBase = row.adjustment === 0
                const isAbove = row.adjustment > 0
                const priceDiff = row.price - targetRow.price

                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: isBase
                        ? '2px solid rgba(197,150,58,0.5)'
                        : '1px solid rgba(197,150,58,0.08)',
                      borderTop: isBase ? '2px solid rgba(197,150,58,0.5)' : undefined,
                      backgroundColor: isBase ? 'rgba(197,150,58,0.12)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isBase) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(27,42,74,0.5)'
                    }}
                    onMouseLeave={e => {
                      if (!isBase) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    {/* Adjustment badge */}
                    <td className="px-4 py-3 text-sm font-700">
                      <span
                        className="px-2 py-0.5 text-xs font-700"
                        style={{
                          backgroundColor: isBase
                            ? 'rgba(197,150,58,0.2)'
                            : isAbove
                            ? 'rgba(34,197,94,0.1)'
                            : 'rgba(239,68,68,0.1)',
                          color: isBase ? '#C5963A' : isAbove ? '#22C55E' : '#EF4444',
                          border: `1px solid ${isBase ? 'rgba(197,150,58,0.4)' : isAbove ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}
                      >
                        {isBase
                          ? 'TARGET (0%)'
                          : `${row.adjustment > 0 ? '+' : ''}${row.adjustment}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-700" style={{ color: '#F8FAFC' }}>
                      {formatPrice(row.price)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(248,250,252,0.8)' }}>
                      {formatCapRate(row.cap_rate)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(248,250,252,0.8)' }}>
                      {formatGRM(row.grm)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(248,250,252,0.8)' }}>
                      {formatPricePer(row.price_per_unit)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(248,250,252,0.8)' }}>
                      {formatPricePer(row.price_per_sf)}
                    </td>
                    <td className="px-4 py-3 text-sm font-600">
                      {isBase ? (
                        <span style={{ color: '#C5963A' }}>—</span>
                      ) : (
                        <span style={{ color: priceDiff > 0 ? '#22C55E' : '#EF4444' }}>
                          {priceDiff > 0 ? '+' : ''}{formatPrice(priceDiff)}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="p-4" style={{ backgroundColor: '#1B2A4A', border: '1px solid rgba(197,150,58,0.2)' }}>
        <div className="text-xs font-600 uppercase tracking-widest mb-4" style={{ color: 'rgba(248,250,252,0.5)' }}>
          Price Distribution Across Tiers
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,150,58,0.1)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(248,250,252,0.5)', fontSize: 11, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`}
              tick={{ fill: 'rgba(248,250,252,0.5)', fontSize: 10, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1B2A4A', border: '1px solid rgba(197,150,58,0.4)', borderRadius: 0, fontFamily: 'Inter', fontSize: 12 }}
              labelStyle={{ color: '#C5963A', fontWeight: 600 }}
              itemStyle={{ color: '#F8FAFC' }}
              formatter={(value: number | undefined) => [formatPrice(value ?? 0), 'Price' as const]}
            />
            <ReferenceLine x="Target" stroke="#C5963A" strokeDasharray="4 2" strokeWidth={1.5} />
            <Bar dataKey="price" radius={0}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isBase ? '#C5963A' : entry.cap_rate > (targetRow?.cap_rate ?? 0) ? '#3B9CB5' : 'rgba(197,150,58,0.4)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
