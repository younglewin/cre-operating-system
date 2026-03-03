import { Building2, TrendingUp, Map, RefreshCw, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SUBJECT_PROPERTY, ALL_COMPS } from '../lib/mockData'
import { formatPrice, formatCapRate, formatGRM } from '../lib/formatters'

const KPI_CARD_STYLE = {
  backgroundColor: '#1B2A4A',
  border: '1px solid rgba(197,150,58,0.2)',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const saleComps = ALL_COMPS.filter(c => c.is_sale_comp)
  const rentComps = ALL_COMPS.filter(c => c.is_rent_comp)

  const avgCapRate =
    saleComps.filter(c => c.cap_rate).reduce((sum, c) => sum + (c.cap_rate ?? 0), 0) /
    saleComps.filter(c => c.cap_rate).length

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-700 tracking-tight" style={{ color: '#F8FAFC' }}>
          Deal Engine Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>
          Long Beach, CA — Naples Island / 90803 Market
        </p>
      </div>

      {/* Subject Property Banner */}
      <div
        className="p-4 border-l-4"
        style={{
          backgroundColor: 'rgba(27,42,74,0.8)',
          border: '1px solid rgba(197,150,58,0.3)',
          borderLeft: '4px solid #C5963A',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-600 tracking-widest uppercase mb-1" style={{ color: '#C5963A' }}>
              Subject Property
            </div>
            <div className="text-lg font-700" style={{ color: '#F8FAFC' }}>
              {SUBJECT_PROPERTY.name}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'rgba(248,250,252,0.6)' }}>
              {SUBJECT_PROPERTY.address}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-800" style={{ color: '#F8FAFC' }}>
              {formatPrice(SUBJECT_PROPERTY.price)}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'rgba(248,250,252,0.5)' }}>
              {SUBJECT_PROPERTY.num_units} Units · {SUBJECT_PROPERTY.year_built} Built
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(197,150,58,0.15)' }}>
          {[
            { label: 'Cap Rate', value: formatCapRate(SUBJECT_PROPERTY.cap_rate) },
            { label: 'GRM', value: formatGRM(SUBJECT_PROPERTY.grm) },
            { label: '$/Unit', value: formatPrice(SUBJECT_PROPERTY.price_per_unit) },
            { label: '$/SF', value: formatPrice(SUBJECT_PROPERTY.price_per_sf) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{label}</div>
              <div className="text-sm font-600 mt-0.5" style={{ color: '#F8FAFC' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            icon: Building2,
            label: 'Sale Comps',
            value: saleComps.length.toString(),
            sub: 'In market database',
            color: '#C5963A',
          },
          {
            icon: Map,
            label: 'Rent Comps',
            value: rentComps.length.toString(),
            sub: 'Active rent data',
            color: '#3B9CB5',
          },
          {
            icon: TrendingUp,
            label: 'Avg Market Cap',
            value: formatCapRate(avgCapRate),
            sub: 'Sale comp average',
            color: '#C5963A',
          },
          {
            icon: RefreshCw,
            label: 'Subject Premium',
            value: formatCapRate((SUBJECT_PROPERTY.cap_rate ?? 0) - avgCapRate),
            sub: 'vs. market average',
            color: '#3B9CB5',
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="p-4" style={KPI_CARD_STYLE}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={14} style={{ color }} />
              <span className="text-xs font-500 uppercase tracking-wider" style={{ color: 'rgba(248,250,252,0.5)' }}>
                {label}
              </span>
            </div>
            <div className="text-2xl font-700" style={{ color: '#F8FAFC' }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.4)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            title: 'Deal Engine',
            desc: 'Interactive comps map with split-table UI. Add sale and rent comps to your active set.',
            path: '/comps',
            color: '#C5963A',
          },
          {
            title: 'Pricing Matrix',
            desc: '7-tier sensitivity analysis from -30% to +30% of target price with full underwriting metrics.',
            path: '/pricing',
            color: '#3B9CB5',
          },
          {
            title: '1031 Exchange',
            desc: 'Keep vs. Exchange ROE calculator. Model equity deployment across replacement scenarios.',
            path: '/exchange',
            color: '#C5963A',
          },
        ].map(({ title, desc, path, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="p-4 text-left group transition-all duration-150"
            style={{
              ...KPI_CARD_STYLE,
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = color
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(197,150,58,0.2)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-600" style={{ color: '#F8FAFC' }}>{title}</span>
              <ArrowRight size={14} style={{ color }} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(248,250,252,0.5)' }}>{desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
