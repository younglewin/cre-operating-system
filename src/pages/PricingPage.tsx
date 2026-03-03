import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { TrendingUp, DollarSign } from 'lucide-react'
import { formatPrice, formatCapRate, formatGRM, formatPricePer } from '../lib/formatters'
import { SensitivityRow } from '../types'
import { SUBJECT_PROPERTY } from '../lib/mockData'

// 7 tiers: -30%, -20%, -10%, 0%, +10%, +20%, +30%
const TIERS = [-0.30, -0.20, -0.10, 0, 0.10, 0.20, 0.30]

interface Inputs {
  targetPrice: number
  noi: number
  grossRent: number
  numUnits: number
  buildingSf: number
}

function computeMatrix(inputs: Inputs): SensitivityRow[] {
  return TIERS.map(adj => {
    const price = inputs.targetPrice * (1 + adj)
    const cap_rate = inputs.noi > 0 ? (inputs.noi / price) * 100 : 0
    const grm = inputs.grossRent > 0 ? price / inputs.grossRent : 0
    const price_per_unit = inputs.numUnits > 0 ? price / inputs.numUnits : 0
    const price_per_sf = inputs.buildingSf > 0 ? price / inputs.buildingSf : 0
    return { adjustment: adj, price, cap_rate, grm, price_per_unit, price_per_sf }
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

export default function PricingPage() {
  const [inputs, setInputs] = useState<Inputs>({
    targetPrice: SUBJECT_PROPERTY.price ?? 2850000,
    noi: Math.round((SUBJECT_PROPERTY.price ?? 2850000) * ((SUBJECT_PROPERTY.cap_rate ?? 4.75) / 100)),
    grossRent: SUBJECT_PROPERTY.grm
      ? Math.round((SUBJECT_PROPERTY.price ?? 2850000) / (SUBJECT_PROPERTY.grm ?? 13.5))
      : 211111,
    numUnits: SUBJECT_PROPERTY.num_units ?? 4,
    buildingSf: SUBJECT_PROPERTY.building_size_sf ?? 4200,
  })

  const matrix = useMemo(() => computeMatrix(inputs), [inputs])
  const baseRow = matrix[3] // 0% adjustment

  const handleChange = (key: keyof Inputs, value: string) => {
    const num = parseFloat(value.replace(/,/g, ''))
    if (!isNaN(num)) setInputs(prev => ({ ...prev, [key]: num }))
  }

  const chartData = matrix.map(row => ({
    label: row.adjustment === 0 ? 'Target' : `${row.adjustment > 0 ? '+' : ''}${(row.adjustment * 100).toFixed(0)}%`,
    price: row.price,
    cap_rate: row.cap_rate,
    isBase: row.adjustment === 0,
  }))

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700 tracking-tight" style={{ color: '#F8FAFC' }}>
            Pricing Sensitivity Matrix
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>
            7-tier analysis · ±30% of target price
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
      <div
        className="grid grid-cols-5 gap-4 p-4"
        style={{
          backgroundColor: '#1B2A4A',
          border: '1px solid rgba(197,150,58,0.2)',
        }}
      >
        {[
          { key: 'targetPrice' as keyof Inputs, label: 'Target Price ($)', prefix: '$' },
          { key: 'noi' as keyof Inputs, label: 'Annual NOI ($)', prefix: '$' },
          { key: 'grossRent' as keyof Inputs, label: 'Annual Gross Rent ($)', prefix: '$' },
          { key: 'numUnits' as keyof Inputs, label: 'Number of Units', prefix: '' },
          { key: 'buildingSf' as keyof Inputs, label: 'Building SF', prefix: '' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-500 mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(248,250,252,0.5)' }}>
              {label}
            </label>
            <input
              type="text"
              defaultValue={inputs[key].toLocaleString()}
              onBlur={e => handleChange(key, e.target.value)}
              style={INPUT_STYLE}
            />
          </div>
        ))}
      </div>

      {/* Sensitivity Matrix Table */}
      <div style={{ border: '1px solid rgba(197,150,58,0.2)' }}>
        {/* Table Header */}
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(197,150,58,0.08)',
            borderBottom: '1px solid rgba(197,150,58,0.2)',
          }}
        >
          <DollarSign size={13} style={{ color: '#C5963A' }} />
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color: '#C5963A' }}>
            Sensitivity Matrix
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(197,150,58,0.2)' }}>
                {['Adjustment', 'Price', 'Cap Rate', 'GRM', '$/Unit', '$/SF', 'vs. Target'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-xs font-600 uppercase tracking-wider text-left"
                    style={{ color: 'rgba(248,250,252,0.4)', backgroundColor: '#1B2A4A' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => {
                const isBase = row.adjustment === 0
                const priceDiff = row.price - baseRow.price
                const isAbove = row.adjustment > 0
                const isBelow = row.adjustment < 0

                return (
                  <tr
                    key={i}
                    className="border-b transition-colors"
                    style={{
                      borderColor: 'rgba(197,150,58,0.08)',
                      backgroundColor: isBase
                        ? 'rgba(197,150,58,0.12)'
                        : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isBase)
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(27,42,74,0.5)'
                    }}
                    onMouseLeave={e => {
                      if (!isBase)
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    {/* Adjustment */}
                    <td className="px-4 py-3 text-sm font-700">
                      <span
                        style={{
                          color: isBase ? '#C5963A' : isAbove ? '#22C55E' : '#EF4444',
                        }}
                      >
                        {isBase
                          ? 'TARGET (0%)'
                          : `${row.adjustment > 0 ? '+' : ''}${(row.adjustment * 100).toFixed(0)}%`}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-sm font-700" style={{ color: '#F8FAFC' }}>
                      {formatPrice(row.price)}
                    </td>

                    {/* Cap Rate */}
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(248,250,252,0.8)' }}>
                      {formatCapRate(row.cap_rate)}
                    </td>

                    {/* GRM */}
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(248,250,252,0.8)' }}>
                      {formatGRM(row.grm)}
                    </td>

                    {/* $/Unit */}
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(248,250,252,0.8)' }}>
                      {formatPricePer(row.price_per_unit)}
                    </td>

                    {/* $/SF */}
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(248,250,252,0.8)' }}>
                      {formatPricePer(row.price_per_sf)}
                    </td>

                    {/* vs. Target */}
                    <td className="px-4 py-3 text-sm font-600">
                      {isBase ? (
                        <span style={{ color: '#C5963A' }}>—</span>
                      ) : (
                        <span style={{ color: priceDiff > 0 ? '#22C55E' : '#EF4444' }}>
                          {priceDiff > 0 ? '+' : ''}
                          {formatPrice(priceDiff)}
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

      {/* Chart */}
      <div
        className="p-4"
        style={{
          backgroundColor: '#1B2A4A',
          border: '1px solid rgba(197,150,58,0.2)',
        }}
      >
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
              contentStyle={{
                backgroundColor: '#1B2A4A',
                border: '1px solid rgba(197,150,58,0.4)',
                borderRadius: 0,
                fontFamily: 'Inter',
                fontSize: 12,
              }}
              labelStyle={{ color: '#C5963A', fontWeight: 600 }}
              itemStyle={{ color: '#F8FAFC' }}
              formatter={(value: number) => [formatPrice(value), 'Price']}
            />
            <ReferenceLine
              x="Target"
              stroke="#C5963A"
              strokeDasharray="4 2"
              strokeWidth={1.5}
            />
            <Bar dataKey="price" radius={0}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isBase ? '#C5963A' : entry.cap_rate > baseRow.cap_rate ? '#3B9CB5' : 'rgba(197,150,58,0.4)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
