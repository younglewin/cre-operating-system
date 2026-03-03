import { useState, useMemo } from 'react'
import {
  CheckCircle,
  PlusCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  ChevronUp,
  ChevronDown,
  MapPin,
} from 'lucide-react'
import DualCompsMap from '../components/DualCompsMap'
import { CompFeedItem } from '../types'
import {
  formatPrice,
  formatCapRate,
  formatGRM,
  formatPricePer,
  formatDistance,
  calculateDistance,
} from '../lib/formatters'
import {
  SUBJECT_PROPERTY,
  ALL_COMPS,
  ACTIVE_COMP_IDS_DEFAULT,
} from '../lib/mockData'

type SortKey = 'distance' | 'price' | 'cap_rate' | 'grm' | 'price_per_unit'
type SortDir = 'asc' | 'desc'

const CELL_STYLE = 'px-3 py-2.5 text-xs whitespace-nowrap'
const HEADER_STYLE = `${CELL_STYLE} font-600 uppercase tracking-wider cursor-pointer select-none`

// Compute distance for each comp from subject
function withDistance(comps: CompFeedItem[]): CompFeedItem[] {
  if (!SUBJECT_PROPERTY.latitude || !SUBJECT_PROPERTY.longitude) return comps
  return comps.map(c => ({
    ...c,
    distance_miles:
      c.latitude != null && c.longitude != null
        ? calculateDistance(
            SUBJECT_PROPERTY.latitude!,
            SUBJECT_PROPERTY.longitude!,
            c.latitude,
            c.longitude
          )
        : undefined,
  }))
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="ml-1 opacity-20">↕</span>
  return sortDir === 'asc' ? (
    <ChevronUp size={10} className="inline ml-1" />
  ) : (
    <ChevronDown size={10} className="inline ml-1" />
  )
}

export default function CompsPage() {
  const [activeCompIds, setActiveCompIds] = useState<Set<string>>(
    new Set(ACTIVE_COMP_IDS_DEFAULT)
  )
  const [oneMileOnly, setOneMileOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('distance')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const allCompsWithDist = useMemo(() => withDistance(ALL_COMPS), [])

  // Active comp set (top panel)
  const activeComps = useMemo(
    () => allCompsWithDist.filter(c => activeCompIds.has(c.id)),
    [allCompsWithDist, activeCompIds]
  )

  // Market database (bottom panel) — excludes active comps
  const marketComps = useMemo(() => {
    let comps = allCompsWithDist.filter(c => !activeCompIds.has(c.id))
    if (oneMileOnly) {
      comps = comps.filter(c => c.distance_miles != null && c.distance_miles <= 1)
    }
    return [...comps].sort((a, b) => {
      const aVal = a[sortKey] ?? Infinity
      const bVal = b[sortKey] ?? Infinity
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [allCompsWithDist, activeCompIds, oneMileOnly, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Optimistic add
  const handleAdd = (comp: CompFeedItem) => {
    setActiveCompIds(prev => new Set([...prev, comp.id]))
    setHighlightedId(comp.id)
    setTimeout(() => setHighlightedId(null), 2000)
  }

  // Remove from active set
  const handleRemove = (id: string) => {
    setActiveCompIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const compTableHeaders: { key: SortKey; label: string }[] = [
    { key: 'distance', label: 'Distance' },
    { key: 'price', label: 'Price' },
    { key: 'cap_rate', label: 'Cap Rate' },
    { key: 'grm', label: 'GRM' },
    { key: 'price_per_unit', label: '$/Unit' },
  ]

  const renderCompRow = (comp: CompFeedItem, isActive: boolean) => {
    const isSale = comp.is_sale_comp
    const typeColor = isSale ? '#C5963A' : '#3B9CB5'
    const isHighlighted = highlightedId === comp.id
    const hasMissingGeo = comp.latitude == null || comp.longitude == null

    return (
      <tr
        key={comp.id}
        className="border-b transition-colors duration-300"
        style={{
          borderColor: 'rgba(197,150,58,0.08)',
          backgroundColor: isHighlighted
            ? 'rgba(197,150,58,0.1)'
            : 'transparent',
        }}
        onMouseEnter={e => {
          if (!isHighlighted)
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(27,42,74,0.5)'
        }}
        onMouseLeave={e => {
          if (!isHighlighted)
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
        }}
      >
        {/* Type badge */}
        <td className={CELL_STYLE}>
          <span
            className="px-1.5 py-0.5 text-xs font-600 tracking-wide"
            style={{
              backgroundColor: `${typeColor}20`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
            }}
          >
            {isSale ? 'SALE' : 'RENT'}
          </span>
        </td>

        {/* Name & Address */}
        <td className={CELL_STYLE} style={{ maxWidth: '180px' }}>
          <div className="font-500 truncate" style={{ color: '#F8FAFC' }}>
            {comp.name}
          </div>
          <div className="text-xs truncate mt-0.5" style={{ color: 'rgba(248,250,252,0.4)' }}>
            {comp.address}
          </div>
        </td>

        {/* Distance */}
        <td className={CELL_STYLE} style={{ color: 'rgba(248,250,252,0.7)' }}>
          {hasMissingGeo ? (
            <span className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
              <AlertTriangle size={10} />
              N/A
            </span>
          ) : (
            formatDistance(comp.distance_miles)
          )}
        </td>

        {/* Price */}
        <td className={CELL_STYLE} style={{ color: '#F8FAFC', fontWeight: 600 }}>
          {isSale ? formatPrice(comp.price) : `${formatPrice(comp.price)}/mo`}
        </td>

        {/* Cap Rate */}
        <td className={CELL_STYLE} style={{ color: 'rgba(248,250,252,0.7)' }}>
          {isSale ? formatCapRate(comp.cap_rate) : '—'}
        </td>

        {/* GRM */}
        <td className={CELL_STYLE} style={{ color: 'rgba(248,250,252,0.7)' }}>
          {isSale ? formatGRM(comp.grm) : '—'}
        </td>

        {/* $/Unit */}
        <td className={CELL_STYLE} style={{ color: 'rgba(248,250,252,0.7)' }}>
          {formatPricePer(comp.price_per_unit)}
        </td>

        {/* Units */}
        <td className={CELL_STYLE} style={{ color: 'rgba(248,250,252,0.7)' }}>
          {comp.num_units ?? '—'}
        </td>

        {/* Action */}
        <td className={CELL_STYLE}>
          {isActive ? (
            <button
              onClick={() => handleRemove(comp.id)}
              className="flex items-center gap-1 text-xs font-500 px-2 py-1 transition-all"
              style={{
                color: '#C5963A',
                border: '1px solid rgba(197,150,58,0.4)',
                backgroundColor: 'rgba(197,150,58,0.1)',
              }}
            >
              <CheckCircle size={11} />
              Added ✓
            </button>
          ) : (
            <button
              onClick={() => handleAdd(comp)}
              className="flex items-center gap-1 text-xs font-500 px-2 py-1 transition-all"
              style={{
                color: 'rgba(248,250,252,0.6)',
                border: '1px solid rgba(248,250,252,0.15)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#F8FAFC'
                el.style.borderColor = 'rgba(197,150,58,0.5)'
                el.style.backgroundColor = 'rgba(197,150,58,0.1)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = 'rgba(248,250,252,0.6)'
                el.style.borderColor = 'rgba(248,250,252,0.15)'
                el.style.backgroundColor = 'transparent'
              }}
            >
              <PlusCircle size={11} />
              Add
            </button>
          )}
        </td>
      </tr>
    )
  }

  const tableHead = (showAction = true) => (
    <thead>
      <tr style={{ borderBottom: '1px solid rgba(197,150,58,0.2)' }}>
        <th className={HEADER_STYLE} style={{ color: 'rgba(248,250,252,0.4)', width: '60px' }}>
          Type
        </th>
        <th className={HEADER_STYLE} style={{ color: 'rgba(248,250,252,0.4)' }}>
          Property
        </th>
        {compTableHeaders.map(({ key, label }) => (
          <th
            key={key}
            className={HEADER_STYLE}
            style={{ color: 'rgba(248,250,252,0.4)' }}
            onClick={() => handleSort(key)}
          >
            {label}
            <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
          </th>
        ))}
        <th className={HEADER_STYLE} style={{ color: 'rgba(248,250,252,0.4)' }}>
          Units
        </th>
        {showAction && (
          <th className={HEADER_STYLE} style={{ color: 'rgba(248,250,252,0.4)' }}>
            Action
          </th>
        )}
      </tr>
    </thead>
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Map */}
      <div className="flex-1 min-w-0 relative" style={{ borderRight: '1px solid rgba(197,150,58,0.2)' }}>
        <DualCompsMap
          subject={SUBJECT_PROPERTY}
          comps={allCompsWithDist}
          activeCompIds={activeCompIds}
          onCompClick={comp => {
            if (!activeCompIds.has(comp.id)) handleAdd(comp)
          }}
        />
      </div>

      {/* Right: Split Table */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: '620px', flexShrink: 0, backgroundColor: '#0F172A' }}
      >
        {/* === TOP PANEL: Active Comp Set === */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            flex: '0 0 auto',
            maxHeight: '45%',
            borderBottom: '2px solid rgba(197,150,58,0.3)',
          }}
        >
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
            style={{
              backgroundColor: 'rgba(197,150,58,0.08)',
              borderBottom: '1px solid rgba(197,150,58,0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2"
                style={{ backgroundColor: '#C5963A', borderRadius: '50%' }}
              />
              <span className="text-xs font-700 uppercase tracking-widest" style={{ color: '#C5963A' }}>
                Active Comp Set
              </span>
              <span
                className="text-xs px-1.5 py-0.5 font-600"
                style={{
                  backgroundColor: 'rgba(197,150,58,0.2)',
                  color: '#C5963A',
                  border: '1px solid rgba(197,150,58,0.3)',
                }}
              >
                {activeComps.length}
              </span>
            </div>
            <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>
              Subject: {SUBJECT_PROPERTY.name}
            </div>
          </div>

          {/* Active Comps Table */}
          <div className="overflow-auto flex-1">
            {activeComps.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-24 gap-2"
                style={{ color: 'rgba(248,250,252,0.3)' }}
              >
                <MapPin size={20} style={{ color: 'rgba(197,150,58,0.4)' }} />
                <span className="text-xs">No comps in active set. Add from Market Database below.</span>
              </div>
            ) : (
              <table className="w-full border-collapse">
                {tableHead(true)}
                <tbody>
                  {activeComps.map(comp => renderCompRow(comp, true))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* === BOTTOM PANEL: Market Database === */}
        <div className="flex flex-col overflow-hidden flex-1">
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
            style={{
              backgroundColor: 'rgba(59,156,181,0.06)',
              borderBottom: '1px solid rgba(59,156,181,0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2"
                style={{ backgroundColor: '#3B9CB5', borderRadius: '50%' }}
              />
              <span className="text-xs font-700 uppercase tracking-widest" style={{ color: '#3B9CB5' }}>
                Market Database
              </span>
              <span
                className="text-xs px-1.5 py-0.5 font-600"
                style={{
                  backgroundColor: 'rgba(59,156,181,0.15)',
                  color: '#3B9CB5',
                  border: '1px solid rgba(59,156,181,0.3)',
                }}
              >
                {marketComps.length}
              </span>
            </div>

            {/* 1-Mile Toggle */}
            <button
              onClick={() => setOneMileOnly(v => !v)}
              className="flex items-center gap-1.5 text-xs font-500 px-2 py-1 transition-all"
              style={{
                color: oneMileOnly ? '#3B9CB5' : 'rgba(248,250,252,0.5)',
                border: `1px solid ${oneMileOnly ? 'rgba(59,156,181,0.5)' : 'rgba(248,250,252,0.15)'}`,
                backgroundColor: oneMileOnly ? 'rgba(59,156,181,0.1)' : 'transparent',
              }}
            >
              {oneMileOnly ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              1-Mile Radius
            </button>
          </div>

          {/* Market Comps Table */}
          <div className="overflow-auto flex-1">
            {marketComps.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-24 gap-2"
                style={{ color: 'rgba(248,250,252,0.3)' }}
              >
                <span className="text-xs">
                  {oneMileOnly
                    ? 'No comps within 1-mile radius.'
                    : 'All comps have been added to the active set.'}
                </span>
              </div>
            ) : (
              <table className="w-full border-collapse">
                {tableHead(true)}
                <tbody>
                  {marketComps.map(comp => renderCompRow(comp, false))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
