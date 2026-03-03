import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatPrice, formatCapRate } from '../lib/formatters'
import { ExchangeScenario } from '../types'

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

interface ExchangeInputs {
  // Relinquished property
  salePrice: number
  adjustedBasis: number
  existingDebt: number
  // Market assumptions
  capRateKeep: number
  capRateExchange: number
  leverageRatio: number // LTV for exchange property
  interestRate: number
  // Exchange property
  exchangePropertyValue: number
}

function computeScenarios(inp: ExchangeInputs): {
  keep: ExchangeScenario
  exchange: ExchangeScenario
  taxLiability: number
  netEquity: number
} {
  // Capital gains estimate (simplified: 20% federal + 3.8% NIIT + ~9.3% CA)
  const capitalGain = inp.salePrice - inp.adjustedBasis
  const taxRate = 0.333 // ~33.3% blended CA rate
  const taxLiability = Math.max(0, capitalGain * taxRate)
  const grossEquity = inp.salePrice - inp.existingDebt
  const netEquityAfterTax = grossEquity - taxLiability

  // KEEP SCENARIO: Pay taxes, invest net equity at current cap rate (unlevered)
  const keepEquity = netEquityAfterTax
  const keepAnnualIncome = keepEquity * (inp.capRateKeep / 100)
  const keepROE = keepEquity > 0 ? (keepAnnualIncome / keepEquity) * 100 : 0

  // EXCHANGE SCENARIO: Roll full equity into replacement property, use leverage
  const exchangeEquity = grossEquity // No tax paid
  const replacementValue = exchangeEquity / (1 - inp.leverageRatio / 100)
  const replacementNOI = replacementValue * (inp.capRateExchange / 100)
  const annualDebtService =
    (replacementValue - exchangeEquity) * (inp.interestRate / 100)
  const cashFlow = replacementNOI - annualDebtService
  const exchangeROE = exchangeEquity > 0 ? (cashFlow / exchangeEquity) * 100 : 0

  return {
    keep: {
      label: 'Keep & Pay Tax',
      equity: keepEquity,
      leveraged_value: keepEquity,
      annual_income: keepAnnualIncome,
      roe: keepROE,
    },
    exchange: {
      label: '1031 Exchange',
      equity: exchangeEquity,
      leveraged_value: replacementValue,
      annual_income: cashFlow,
      roe: exchangeROE,
    },
    taxLiability,
    netEquity: netEquityAfterTax,
  }
}

export default function ExchangePage() {
  const [inputs, setInputs] = useState<ExchangeInputs>({
    salePrice: 2850000,
    adjustedBasis: 900000,
    existingDebt: 1200000,
    capRateKeep: 4.75,
    capRateExchange: 5.25,
    leverageRatio: 65,
    interestRate: 6.5,
    exchangePropertyValue: 4500000,
  })

  const results = useMemo(() => computeScenarios(inputs), [inputs])

  const handleChange = (key: keyof ExchangeInputs, value: string) => {
    const num = parseFloat(value.replace(/,/g, ''))
    if (!isNaN(num)) setInputs(prev => ({ ...prev, [key]: num }))
  }

  const chartData = [
    {
      name: 'Equity Deployed',
      keep: results.keep.equity,
      exchange: results.exchange.equity,
    },
    {
      name: 'Leveraged Value',
      keep: results.keep.leveraged_value,
      exchange: results.exchange.leveraged_value,
    },
    {
      name: 'Annual Income',
      keep: results.keep.annual_income,
      exchange: results.exchange.annual_income,
    },
  ]

  const roeDiff = results.exchange.roe - results.keep.roe
  const exchangeWins = roeDiff > 0

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700 tracking-tight" style={{ color: '#F8FAFC' }}>
            1031 Exchange Calculator
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>
            Keep vs. Exchange — Return on Equity Analysis
          </p>
        </div>
        <RefreshCw size={18} style={{ color: '#C5963A' }} />
      </div>

      {/* Input Grid */}
      <div
        className="grid grid-cols-4 gap-4 p-4"
        style={{
          backgroundColor: '#1B2A4A',
          border: '1px solid rgba(197,150,58,0.2)',
        }}
      >
        <div className="col-span-4">
          <div className="text-xs font-700 uppercase tracking-widest mb-3" style={{ color: '#C5963A' }}>
            Relinquished Property
          </div>
        </div>
        {[
          { key: 'salePrice' as keyof ExchangeInputs, label: 'Sale Price ($)' },
          { key: 'adjustedBasis' as keyof ExchangeInputs, label: 'Adjusted Basis ($)' },
          { key: 'existingDebt' as keyof ExchangeInputs, label: 'Existing Debt ($)' },
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

        <div className="col-span-4 mt-2">
          <div className="text-xs font-700 uppercase tracking-widest mb-3" style={{ color: '#3B9CB5' }}>
            Market & Financing Assumptions
          </div>
        </div>
        {[
          { key: 'capRateKeep' as keyof ExchangeInputs, label: 'Cap Rate — Keep (%)' },
          { key: 'capRateExchange' as keyof ExchangeInputs, label: 'Cap Rate — Exchange (%)' },
          { key: 'leverageRatio' as keyof ExchangeInputs, label: 'Exchange LTV (%)' },
          { key: 'interestRate' as keyof ExchangeInputs, label: 'Interest Rate (%)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-500 mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(248,250,252,0.5)' }}>
              {label}
            </label>
            <input
              type="text"
              defaultValue={inputs[key].toString()}
              onBlur={e => handleChange(key, e.target.value)}
              style={INPUT_STYLE}
            />
          </div>
        ))}
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-3 gap-4">
        {/* Tax Liability */}
        <div
          className="p-4"
          style={{
            backgroundColor: '#1B2A4A',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} style={{ color: '#EF4444' }} />
            <span className="text-xs font-600 uppercase tracking-wider" style={{ color: '#EF4444' }}>
              Tax Liability (Keep)
            </span>
          </div>
          <div className="text-2xl font-700" style={{ color: '#F8FAFC' }}>
            {formatPrice(results.taxLiability)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.4)' }}>
            ~33.3% blended CA rate on capital gain
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>
            Capital Gain: {formatPrice(inputs.salePrice - inputs.adjustedBasis)}
          </div>
        </div>

        {/* Keep ROE */}
        <div
          className="p-4"
          style={{
            backgroundColor: '#1B2A4A',
            border: `1px solid ${!exchangeWins ? 'rgba(197,150,58,0.5)' : 'rgba(197,150,58,0.2)'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2" style={{ backgroundColor: '#C5963A', borderRadius: '50%' }} />
            <span className="text-xs font-600 uppercase tracking-wider" style={{ color: '#C5963A' }}>
              Keep & Pay Tax — ROE
            </span>
          </div>
          <div className="text-2xl font-700" style={{ color: '#F8FAFC' }}>
            {formatCapRate(results.keep.roe)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.4)' }}>
            Net equity: {formatPrice(results.keep.equity)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>
            Annual income: {formatPrice(results.keep.annual_income)}
          </div>
        </div>

        {/* Exchange ROE */}
        <div
          className="p-4"
          style={{
            backgroundColor: '#1B2A4A',
            border: `1px solid ${exchangeWins ? 'rgba(59,156,181,0.5)' : 'rgba(59,156,181,0.2)'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2" style={{ backgroundColor: '#3B9CB5', borderRadius: '50%' }} />
            <span className="text-xs font-600 uppercase tracking-wider" style={{ color: '#3B9CB5' }}>
              1031 Exchange — ROE
            </span>
          </div>
          <div className="text-2xl font-700" style={{ color: '#F8FAFC' }}>
            {formatCapRate(results.exchange.roe)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.4)' }}>
            Gross equity: {formatPrice(results.exchange.equity)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>
            Replacement value: {formatPrice(results.exchange.leveraged_value)}
          </div>
        </div>
      </div>

      {/* Verdict Banner */}
      <div
        className="flex items-center justify-between p-4"
        style={{
          backgroundColor: exchangeWins ? 'rgba(59,156,181,0.1)' : 'rgba(197,150,58,0.1)',
          border: `1px solid ${exchangeWins ? 'rgba(59,156,181,0.4)' : 'rgba(197,150,58,0.4)'}`,
          borderLeft: `4px solid ${exchangeWins ? '#3B9CB5' : '#C5963A'}`,
        }}
      >
        <div className="flex items-center gap-3">
          <TrendingUp size={16} style={{ color: exchangeWins ? '#3B9CB5' : '#C5963A' }} />
          <div>
            <div className="text-sm font-700" style={{ color: '#F8FAFC' }}>
              {exchangeWins
                ? '1031 Exchange delivers superior ROE'
                : 'Keeping and paying tax delivers superior ROE'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(248,250,252,0.5)' }}>
              ROE differential: {Math.abs(roeDiff).toFixed(2)}% in favor of{' '}
              {exchangeWins ? 'Exchange' : 'Keep'}
            </div>
          </div>
        </div>
        <div
          className="text-lg font-800"
          style={{ color: exchangeWins ? '#3B9CB5' : '#C5963A' }}
        >
          {roeDiff > 0 ? '+' : ''}
          {roeDiff.toFixed(2)}%
        </div>
      </div>

      {/* Comparison Chart */}
      <div
        className="p-4"
        style={{
          backgroundColor: '#1B2A4A',
          border: '1px solid rgba(197,150,58,0.2)',
        }}
      >
        <div className="text-xs font-600 uppercase tracking-widest mb-4" style={{ color: 'rgba(248,250,252,0.5)' }}>
          Keep vs. Exchange — Capital Comparison
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,150,58,0.1)" vertical={false} />
            <XAxis
              dataKey="name"
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
              formatter={(value: number) => [formatPrice(value), '']}
            />
            <Legend
              wrapperStyle={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(248,250,252,0.6)' }}
            />
            <Bar dataKey="keep" name="Keep & Pay Tax" fill="#C5963A" radius={0} />
            <Bar dataKey="exchange" name="1031 Exchange" fill="#3B9CB5" radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-2 p-3 text-xs"
        style={{
          backgroundColor: 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
          color: 'rgba(248,250,252,0.4)',
        }}
      >
        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
        <span>
          This calculator provides estimates for informational purposes only. Tax liability uses a
          blended ~33.3% rate (20% federal + 3.8% NIIT + 9.3% CA). Consult a qualified CPA and
          1031 exchange intermediary before executing any exchange transaction.
        </span>
      </div>
    </div>
  )
}
