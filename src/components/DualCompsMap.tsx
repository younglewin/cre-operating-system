import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { X, MapPin, AlertTriangle } from 'lucide-react'
import { CompFeedItem, Property } from '../types'
import { formatPrice, formatCapRate, formatGRM, formatPricePer, formatNumber } from '../lib/formatters'

// Mapbox public token — replace with your own in .env
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

// Brand colors
const COLOR_GOLD = '#C5963A'
const COLOR_TEAL = '#3B9CB5'
const COLOR_NAVY = '#1B2A4A'
const COLOR_OFF_WHITE = '#F8FAFC'
const COLOR_ACTIVE_RING = '#1B2A4A'

// 1 mile in meters
const ONE_MILE_METERS = 1609.34

interface DualCompsMapProps {
  subject: Property
  comps: CompFeedItem[]
  activeCompIds: Set<string>
  onCompClick?: (comp: CompFeedItem) => void
}

// Generate a GeoJSON circle polygon for the trade area ring
function createCircleGeoJSON(
  center: [number, number],
  radiusMeters: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dx = (radiusMeters / 111320) * Math.cos(angle)
    const dy = (radiusMeters / (111320 * Math.cos((center[1] * Math.PI) / 180))) * Math.sin(angle)
    coords.push([center[0] + dy, center[1] + dx])
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  }
}

export default function DualCompsMap({
  subject,
  comps,
  activeCompIds,
  onCompClick,
}: DualCompsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const [drawerComp, setDrawerComp] = useState<CompFeedItem | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [missingToken, setMissingToken] = useState(false)

  // Build GeoJSON from comps
  const buildCompsGeoJSON = useCallback(
    (comps: CompFeedItem[], activeIds: Set<string>): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: comps
        .filter(c => c.latitude != null && c.longitude != null)
        .map(c => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [c.longitude!, c.latitude!],
          },
          properties: {
            id: c.id,
            name: c.name,
            address: c.address,
            price: c.price,
            cap_rate: c.cap_rate,
            grm: c.grm,
            price_per_sf: c.price_per_sf,
            price_per_unit: c.price_per_unit,
            num_units: c.num_units,
            year_built: c.year_built,
            building_size_sf: c.building_size_sf,
            is_sale_comp: c.is_sale_comp,
            is_rent_comp: c.is_rent_comp,
            is_active: activeIds.has(c.id),
            fill_color: c.is_sale_comp ? COLOR_GOLD : COLOR_TEAL,
          },
        })),
    }),
    []
  )

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return
    if (!MAPBOX_TOKEN) {
      setMissingToken(true)
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [subject.longitude ?? -118.115, subject.latitude ?? 33.755],
      zoom: 13.5,
      attributionControl: false,
    })

    mapRef.current = map

    map.on('load', () => {
      setMapLoaded(true)

      // --- Trade Area: 1-mile dashed circle ---
      const circleGeoJSON = createCircleGeoJSON(
        [subject.longitude!, subject.latitude!],
        ONE_MILE_METERS
      )

      map.addSource('trade-area', {
        type: 'geojson',
        data: circleGeoJSON,
      })

      map.addLayer({
        id: 'trade-area-fill',
        type: 'fill',
        source: 'trade-area',
        paint: {
          'fill-color': COLOR_NAVY,
          'fill-opacity': 0.06,
        },
      })

      map.addLayer({
        id: 'trade-area-border',
        type: 'line',
        source: 'trade-area',
        paint: {
          'line-color': COLOR_NAVY,
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.8,
        },
      })

      // --- Subject Property Pin ---
      map.addSource('subject', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [subject.longitude!, subject.latitude!],
              },
              properties: {
                name: subject.name,
                address: subject.address,
                price: subject.price,
                cap_rate: subject.cap_rate,
              },
            },
          ],
        },
      })

      // Subject outer glow
      map.addLayer({
        id: 'subject-glow',
        type: 'circle',
        source: 'subject',
        paint: {
          'circle-radius': 22,
          'circle-color': COLOR_NAVY,
          'circle-opacity': 0.3,
          'circle-blur': 0.8,
        },
      })

      // Subject pin body
      map.addLayer({
        id: 'subject-pin',
        type: 'circle',
        source: 'subject',
        paint: {
          'circle-radius': 14,
          'circle-color': COLOR_NAVY,
          'circle-stroke-color': COLOR_GOLD,
          'circle-stroke-width': 3,
        },
      })

      // --- Comp Pins ---
      const compsGeoJSON = buildCompsGeoJSON(comps, activeCompIds)

      map.addSource('comps', {
        type: 'geojson',
        data: compsGeoJSON,
      })

      // Comp base circle
      map.addLayer({
        id: 'comps-circle',
        type: 'circle',
        source: 'comps',
        paint: {
          'circle-radius': 9,
          'circle-color': ['get', 'fill_color'],
          'circle-stroke-color': COLOR_OFF_WHITE,
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
      })

      // Active ring overlay
      map.addLayer({
        id: 'comps-active-ring',
        type: 'circle',
        source: 'comps',
        filter: ['==', ['get', 'is_active'], true],
        paint: {
          'circle-radius': 13,
          'circle-color': 'transparent',
          'circle-stroke-color': COLOR_ACTIVE_RING,
          'circle-stroke-width': 3,
          'circle-opacity': 0,
        },
      })

      // --- Hover Popup ---
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 20,
        maxWidth: '240px',
      })
      popupRef.current = popup

      map.on('mouseenter', 'comps-circle', e => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as Record<string, unknown>
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]

        const isSale = props.is_sale_comp as boolean
        const typeLabel = isSale ? 'SALE COMP' : 'RENT COMP'
        const typeColor = isSale ? COLOR_GOLD : COLOR_TEAL

        const priceLabel = isSale ? 'Sale Price' : 'Monthly Rent'
        const priceVal = isSale
          ? formatPrice(props.price as number)
          : `${formatPrice(props.price as number)}/mo`

        popup
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: Inter, sans-serif; min-width: 180px;">
              <div style="font-size:9px; font-weight:700; letter-spacing:0.1em; color:${typeColor}; margin-bottom:6px;">${typeLabel}</div>
              <div style="font-size:12px; font-weight:600; color:#F8FAFC; margin-bottom:2px;">${props.name}</div>
              <div style="font-size:10px; color:rgba(248,250,252,0.5); margin-bottom:8px;">${props.address}</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <div>
                  <div style="font-size:9px; color:rgba(248,250,252,0.4);">${priceLabel}</div>
                  <div style="font-size:11px; font-weight:600; color:#F8FAFC;">${priceVal}</div>
                </div>
                ${isSale && props.cap_rate ? `
                <div>
                  <div style="font-size:9px; color:rgba(248,250,252,0.4);">Cap Rate</div>
                  <div style="font-size:11px; font-weight:600; color:#F8FAFC;">${formatCapRate(props.cap_rate as number)}</div>
                </div>` : ''}
                ${props.num_units ? `
                <div>
                  <div style="font-size:9px; color:rgba(248,250,252,0.4);">Units</div>
                  <div style="font-size:11px; font-weight:600; color:#F8FAFC;">${props.num_units}</div>
                </div>` : ''}
                ${props.year_built ? `
                <div>
                  <div style="font-size:9px; color:rgba(248,250,252,0.4);">Year Built</div>
                  <div style="font-size:11px; font-weight:600; color:#F8FAFC;">${props.year_built}</div>
                </div>` : ''}
              </div>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseleave', 'comps-circle', () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })

      // Click to open drawer
      map.on('click', 'comps-circle', e => {
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as Record<string, unknown>
        const comp = comps.find(c => c.id === (props.id as string))
        if (comp) {
          setDrawerComp(comp)
          onCompClick?.(comp)
        }
      })

      // Subject hover
      map.on('mouseenter', 'subject-pin', e => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as Record<string, unknown>
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        popup
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: Inter, sans-serif;">
              <div style="font-size:9px; font-weight:700; letter-spacing:0.1em; color:${COLOR_GOLD}; margin-bottom:6px;">SUBJECT PROPERTY</div>
              <div style="font-size:12px; font-weight:600; color:#F8FAFC; margin-bottom:2px;">${props.name}</div>
              <div style="font-size:10px; color:rgba(248,250,252,0.5); margin-bottom:8px;">${props.address}</div>
              <div style="font-size:9px; color:rgba(248,250,252,0.4);">Asking Price</div>
              <div style="font-size:13px; font-weight:700; color:#C5963A;">${formatPrice(props.price as number)}</div>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseleave', 'subject-pin', () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id, MAPBOX_TOKEN])

  // Update comps layer when comps or activeCompIds change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const source = map.getSource('comps') as mapboxgl.GeoJSONSource | undefined
    if (!source) return
    source.setData(buildCompsGeoJSON(comps, activeCompIds))
  }, [comps, activeCompIds, mapLoaded, buildCompsGeoJSON])

  if (missingToken) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ backgroundColor: '#1B2A4A', color: 'rgba(248,250,252,0.5)' }}
      >
        <MapPin size={32} style={{ color: '#C5963A' }} />
        <div className="text-sm font-600" style={{ color: '#F8FAFC' }}>Mapbox Token Required</div>
        <div className="text-xs text-center max-w-xs" style={{ color: 'rgba(248,250,252,0.5)' }}>
          Add <code className="text-xs px-1" style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A' }}>VITE_MAPBOX_TOKEN</code> to your <code>.env</code> file to enable the interactive map.
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 flex flex-col gap-2 px-3 py-2 text-xs"
        style={{
          backgroundColor: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(197,150,58,0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {[
          { color: COLOR_NAVY, border: COLOR_GOLD, label: 'Subject Property' },
          { color: COLOR_GOLD, border: COLOR_OFF_WHITE, label: 'Sale Comp' },
          { color: COLOR_TEAL, border: COLOR_OFF_WHITE, label: 'Rent Comp' },
        ].map(({ color, border, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 flex-shrink-0"
              style={{
                borderRadius: '50%',
                backgroundColor: color,
                border: `2px solid ${border}`,
              }}
            />
            <span style={{ color: 'rgba(248,250,252,0.7)' }}>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1 pt-1" style={{ borderTop: '1px solid rgba(197,150,58,0.15)' }}>
          <div
            className="w-3 h-3 flex-shrink-0"
            style={{
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: `3px solid ${COLOR_NAVY}`,
            }}
          />
          <span style={{ color: 'rgba(248,250,252,0.7)' }}>Active Comp</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className="h-0.5 w-2" style={{ backgroundColor: COLOR_NAVY, opacity: 0.8 }} />
            ))}
          </div>
          <span style={{ color: 'rgba(248,250,252,0.7)' }}>1-Mile Radius</span>
        </div>
      </div>

      {/* Comp Details Drawer */}
      {drawerComp && (
        <div
          className="absolute top-0 right-0 h-full w-72 overflow-y-auto"
          style={{
            backgroundColor: '#1B2A4A',
            borderLeft: '1px solid rgba(197,150,58,0.3)',
            zIndex: 10,
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'rgba(197,150,58,0.2)' }}
          >
            <div>
              <div
                className="text-xs font-700 tracking-widest uppercase"
                style={{ color: drawerComp.is_sale_comp ? COLOR_GOLD : COLOR_TEAL }}
              >
                {drawerComp.is_sale_comp ? 'Sale Comp' : 'Rent Comp'}
              </div>
              <div className="text-sm font-600 mt-0.5" style={{ color: '#F8FAFC' }}>
                Comp Details
              </div>
            </div>
            <button
              onClick={() => setDrawerComp(null)}
              className="p-1 transition-colors"
              style={{ color: 'rgba(248,250,252,0.5)' }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = '#F8FAFC')}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(248,250,252,0.5)')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Property Name & Address */}
            <div>
              <div className="text-sm font-600" style={{ color: '#F8FAFC' }}>
                {drawerComp.name}
              </div>
              <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>
                {drawerComp.address}
              </div>
            </div>

            {/* Metrics Grid */}
            <div
              className="grid grid-cols-2 gap-3 p-3"
              style={{
                backgroundColor: 'rgba(15,23,42,0.5)',
                border: '1px solid rgba(197,150,58,0.1)',
              }}
            >
              {drawerComp.is_sale_comp && [
                { label: 'Sale Price', value: formatPrice(drawerComp.price) },
                { label: 'Cap Rate', value: formatCapRate(drawerComp.cap_rate) },
                { label: 'GRM', value: formatGRM(drawerComp.grm) },
                { label: '$/Unit', value: formatPricePer(drawerComp.price_per_unit) },
                { label: '$/SF', value: formatPricePer(drawerComp.price_per_sf) },
                { label: 'Units', value: drawerComp.num_units?.toString() ?? 'N/A' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{label}</div>
                  <div className="text-sm font-600 mt-0.5" style={{ color: '#F8FAFC' }}>{value}</div>
                </div>
              ))}

              {drawerComp.is_rent_comp && [
                { label: 'Monthly Rent', value: `${formatPrice(drawerComp.price)}/mo` },
                { label: '$/SF', value: formatPricePer(drawerComp.price_per_sf) },
                { label: 'Units', value: drawerComp.num_units?.toString() ?? 'N/A' },
                { label: 'Year Built', value: drawerComp.year_built?.toString() ?? 'N/A' },
                { label: 'Bldg SF', value: formatNumber(drawerComp.building_size_sf) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{label}</div>
                  <div className="text-sm font-600 mt-0.5" style={{ color: '#F8FAFC' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Missing geocode warning */}
            {(drawerComp.latitude == null || drawerComp.longitude == null) && (
              <div
                className="flex items-center gap-2 p-2 text-xs"
                style={{
                  backgroundColor: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#F59E0B',
                }}
              >
                <AlertTriangle size={12} />
                <span>No geocode — distance unavailable</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
