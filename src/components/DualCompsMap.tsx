import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { X, MapPin, AlertTriangle, Upload, ImageIcon, Loader2 } from 'lucide-react'
import type { CompFeedItem, Property } from '../types'
import { formatPrice, formatCapRate, formatGRM, formatPricePer, formatNumber } from '../lib/formatters'
import { supabase } from '../lib/supabase'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

const COLOR_GOLD = '#C5963A'
const COLOR_TEAL = '#3B9CB5'
const COLOR_NAVY = '#1B2A4A'
const COLOR_OFF_WHITE = '#F8FAFC'
const COLOR_ACTIVE_RING = '#1B2A4A'
const ONE_MILE_METERS = 1609.34

interface DualCompsMapProps {
  subject: Property
  comps: CompFeedItem[]
  activeCompIds: Set<string>
  onCompClick?: (comp: CompFeedItem) => void
  onPhotoUploaded?: (compId: string, url: string) => void
}

function createCircleGeoJSON(center: [number, number], radiusMeters: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dx = (radiusMeters / 111320) * Math.cos(angle)
    const dy = (radiusMeters / (111320 * Math.cos((center[1] * Math.PI) / 180))) * Math.sin(angle)
    coords.push([center[0] + dy, center[1] + dx])
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
}

export default function DualCompsMap({ subject, comps, activeCompIds, onCompClick, onPhotoUploaded }: DualCompsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const [drawerComp, setDrawerComp] = useState<CompFeedItem | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [missingToken, setMissingToken] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Track photo URLs locally for optimistic UI
  const [localPhotos, setLocalPhotos] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const buildCompsGeoJSON = useCallback(
    (comps: CompFeedItem[], activeIds: Set<string>): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: comps
        .filter(c => c.latitude != null && c.longitude != null)
        .map(c => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [c.longitude!, c.latitude!] },
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
            unit_mix: c.unit_mix ?? null,
            unit_sf: c.unit_sf ?? null,
            is_active: activeIds.has(c.id),
            fill_color: c.is_sale_comp ? COLOR_GOLD : COLOR_TEAL,
          },
        })),
    }),
    []
  )

  useEffect(() => {
    if (!mapContainer.current) return
    if (!MAPBOX_TOKEN) { setMissingToken(true); return }

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

      // Trade area
      const circleGeoJSON = createCircleGeoJSON([subject.longitude!, subject.latitude!], ONE_MILE_METERS)
      map.addSource('trade-area', { type: 'geojson', data: circleGeoJSON })
      map.addLayer({ id: 'trade-area-fill', type: 'fill', source: 'trade-area', paint: { 'fill-color': COLOR_NAVY, 'fill-opacity': 0.06 } })
      map.addLayer({ id: 'trade-area-border', type: 'line', source: 'trade-area', paint: { 'line-color': COLOR_NAVY, 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.8 } })

      // Subject pin
      map.addSource('subject', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [subject.longitude!, subject.latitude!] }, properties: { name: subject.name, address: subject.address, price: subject.price, cap_rate: subject.cap_rate } }] },
      })
      map.addLayer({ id: 'subject-glow', type: 'circle', source: 'subject', paint: { 'circle-radius': 22, 'circle-color': COLOR_NAVY, 'circle-opacity': 0.3, 'circle-blur': 0.8 } })
      map.addLayer({ id: 'subject-pin', type: 'circle', source: 'subject', paint: { 'circle-radius': 14, 'circle-color': COLOR_NAVY, 'circle-stroke-color': COLOR_GOLD, 'circle-stroke-width': 3 } })

      // Comp pins
      const compsGeoJSON = buildCompsGeoJSON(comps, activeCompIds)
      map.addSource('comps', { type: 'geojson', data: compsGeoJSON })
      map.addLayer({ id: 'comps-circle', type: 'circle', source: 'comps', paint: { 'circle-radius': 9, 'circle-color': ['get', 'fill_color'], 'circle-stroke-color': COLOR_OFF_WHITE, 'circle-stroke-width': 1.5, 'circle-opacity': 0.9 } })
      map.addLayer({ id: 'comps-active-ring', type: 'circle', source: 'comps', filter: ['==', ['get', 'is_active'], true], paint: { 'circle-radius': 13, 'circle-color': 'transparent', 'circle-stroke-color': COLOR_ACTIVE_RING, 'circle-stroke-width': 3, 'circle-opacity': 0 } })

      // Popup
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 20, maxWidth: '260px' })
      popupRef.current = popup

      map.on('mouseenter', 'comps-circle', e => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as Record<string, unknown>
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        const isSale = props.is_sale_comp as boolean
        const typeColor = isSale ? COLOR_GOLD : COLOR_TEAL

        popup.setLngLat(coords).setHTML(`
          <div style="font-family: Inter, sans-serif; min-width: 190px;">
            <div style="font-size:9px; font-weight:700; letter-spacing:0.1em; color:${typeColor}; margin-bottom:6px;">${isSale ? 'SALE COMP' : 'RENT COMP'}</div>
            <div style="font-size:12px; font-weight:600; color:#F8FAFC; margin-bottom:2px;">${props.name}</div>
            <div style="font-size:10px; color:rgba(248,250,252,0.5); margin-bottom:8px;">${props.address}</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 8px;">
              <div>
                <div style="font-size:9px; color:rgba(248,250,252,0.4);">${isSale ? 'Sale Price' : 'Monthly Rent'}</div>
                <div style="font-size:11px; font-weight:600; color:#F8FAFC;">${isSale ? formatPrice(props.price as number) : `${formatPrice(props.price as number)}/mo`}</div>
              </div>
              ${isSale && props.cap_rate ? `<div><div style="font-size:9px; color:rgba(248,250,252,0.4);">Cap Rate</div><div style="font-size:11px; font-weight:600; color:#F8FAFC;">${formatCapRate(props.cap_rate as number)}</div></div>` : ''}
              ${props.num_units ? `<div><div style="font-size:9px; color:rgba(248,250,252,0.4);">Units</div><div style="font-size:11px; font-weight:600; color:#F8FAFC;">${props.num_units}</div></div>` : ''}
              ${props.year_built ? `<div><div style="font-size:9px; color:rgba(248,250,252,0.4);">Year Built</div><div style="font-size:11px; font-weight:600; color:#F8FAFC;">${props.year_built}</div></div>` : ''}
              ${isSale && props.unit_mix ? `<div style="grid-column:1/-1"><div style="font-size:9px; color:rgba(248,250,252,0.4);">Unit Mix</div><div style="font-size:11px; font-weight:600; color:${COLOR_GOLD};">${props.unit_mix}</div></div>` : ''}
              ${!isSale && props.unit_sf ? `<div><div style="font-size:9px; color:rgba(248,250,252,0.4);">Unit SF</div><div style="font-size:11px; font-weight:600; color:${COLOR_TEAL};">${props.unit_sf} SF</div></div>` : ''}
            </div>
          </div>
        `).addTo(map)
      })

      map.on('mouseleave', 'comps-circle', () => { map.getCanvas().style.cursor = ''; popup.remove() })

      map.on('click', 'comps-circle', e => {
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as Record<string, unknown>
        const comp = comps.find(c => c.id === (props.id as string))
        if (comp) { setDrawerComp(comp); onCompClick?.(comp) }
      })

      map.on('mouseenter', 'subject-pin', e => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as Record<string, unknown>
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        popup.setLngLat(coords).setHTML(`
          <div style="font-family: Inter, sans-serif;">
            <div style="font-size:9px; font-weight:700; letter-spacing:0.1em; color:${COLOR_GOLD}; margin-bottom:6px;">SUBJECT PROPERTY</div>
            <div style="font-size:12px; font-weight:600; color:#F8FAFC; margin-bottom:2px;">${props.name}</div>
            <div style="font-size:10px; color:rgba(248,250,252,0.5); margin-bottom:8px;">${props.address}</div>
            <div style="font-size:9px; color:rgba(248,250,252,0.4);">Asking Price</div>
            <div style="font-size:13px; font-weight:700; color:#C5963A;">${formatPrice(props.price as number)}</div>
          </div>
        `).addTo(map)
      })

      map.on('mouseleave', 'subject-pin', () => { map.getCanvas().style.cursor = ''; popup.remove() })
    })

    return () => { map.remove(); mapRef.current = null; setMapLoaded(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id, MAPBOX_TOKEN])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const source = map.getSource('comps') as mapboxgl.GeoJSONSource | undefined
    if (!source) return
    source.setData(buildCompsGeoJSON(comps, activeCompIds))
  }, [comps, activeCompIds, mapLoaded, buildCompsGeoJSON])

  // ── Photo Upload ──────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !drawerComp) return
    setUploading(true)
    setUploadError(null)

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${drawerComp.id}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('comp-photos')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('comp-photos').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      // Update the properties table photo_url
      await supabase.from('properties').update({ photo_url: publicUrl }).eq('id', drawerComp.id)

      // Optimistic local update
      setLocalPhotos(prev => ({ ...prev, [drawerComp.id]: publicUrl }))
      setDrawerComp(prev => prev ? { ...prev, photo_url: publicUrl } : null)
      onPhotoUploaded?.(drawerComp.id, publicUrl)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (missingToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ backgroundColor: '#1B2A4A', color: 'rgba(248,250,252,0.5)' }}>
        <MapPin size={32} style={{ color: '#C5963A' }} />
        <div className="text-sm font-600" style={{ color: '#F8FAFC' }}>Mapbox Token Required</div>
        <div className="text-xs text-center max-w-xs" style={{ color: 'rgba(248,250,252,0.5)' }}>
          Add <code className="text-xs px-1" style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A' }}>VITE_MAPBOX_TOKEN</code> to your <code>.env</code> file to enable the interactive map.
        </div>
      </div>
    )
  }

  const drawerPhotoUrl = drawerComp ? (localPhotos[drawerComp.id] ?? drawerComp.photo_url) : null

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 px-3 py-2 text-xs" style={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(197,150,58,0.2)', backdropFilter: 'blur(8px)' }}>
        {[
          { color: COLOR_NAVY, border: COLOR_GOLD, label: 'Subject Property' },
          { color: COLOR_GOLD, border: COLOR_OFF_WHITE, label: 'Sale Comp' },
          { color: COLOR_TEAL, border: COLOR_OFF_WHITE, label: 'Rent Comp' },
        ].map(({ color, border, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-3 h-3 flex-shrink-0" style={{ borderRadius: '50%', backgroundColor: color, border: `2px solid ${border}` }} />
            <span style={{ color: 'rgba(248,250,252,0.7)' }}>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1 pt-1" style={{ borderTop: '1px solid rgba(197,150,58,0.15)' }}>
          <div className="w-3 h-3 flex-shrink-0" style={{ borderRadius: '50%', backgroundColor: 'transparent', border: `3px solid ${COLOR_NAVY}` }} />
          <span style={{ color: 'rgba(248,250,252,0.7)' }}>Active Comp</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">{[0, 1, 2].map(i => <div key={i} className="h-0.5 w-2" style={{ backgroundColor: COLOR_NAVY, opacity: 0.8 }} />)}</div>
          <span style={{ color: 'rgba(248,250,252,0.7)' }}>1-Mile Radius</span>
        </div>
      </div>

      {/* Comp Details Drawer */}
      {drawerComp && (
        <div className="absolute top-0 right-0 h-full w-80 overflow-y-auto" style={{ backgroundColor: '#1B2A4A', borderLeft: '1px solid rgba(197,150,58,0.3)', zIndex: 10 }}>
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
            <div>
              <div className="text-xs font-700 tracking-widest uppercase" style={{ color: drawerComp.is_sale_comp ? COLOR_GOLD : COLOR_TEAL }}>
                {drawerComp.is_sale_comp ? 'Sale Comp' : 'Rent Comp'}
              </div>
              <div className="text-sm font-600 mt-0.5" style={{ color: '#F8FAFC' }}>Comp Details</div>
            </div>
            <button onClick={() => setDrawerComp(null)} className="p-1 transition-colors" style={{ color: 'rgba(248,250,252,0.5)' }} onMouseEnter={e => ((e.target as HTMLElement).style.color = '#F8FAFC')} onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(248,250,252,0.5)')}>
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* ── Photo Section ── */}
            <div>
              {drawerPhotoUrl ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={drawerPhotoUrl}
                    alt={drawerComp.name}
                    style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', border: '1px solid rgba(197,150,58,0.2)' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 10, fontWeight: 600, backgroundColor: 'rgba(15,23,42,0.85)', color: '#C5963A', border: '1px solid rgba(197,150,58,0.4)', cursor: 'pointer', fontFamily: 'Inter', backdropFilter: 'blur(4px)' }}
                  >
                    <Upload size={10} /> Replace
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', border: '1px dashed rgba(197,150,58,0.3)', backgroundColor: 'rgba(197,150,58,0.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(197,150,58,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(197,150,58,0.04)' }}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={22} style={{ color: '#C5963A', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.5)', fontFamily: 'Inter' }}>Uploading…</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={22} style={{ color: 'rgba(197,150,58,0.4)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#C5963A', fontFamily: 'Inter' }}>Upload Photo</div>
                        <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.35)', fontFamily: 'Inter', marginTop: 2 }}>Click to select JPG, PNG, or WEBP</div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {uploadError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', marginTop: 4, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 10, color: '#EF4444', fontFamily: 'Inter' }}>
                  <AlertTriangle size={10} /> {uploadError}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileSelect} />
            </div>

            {/* Property Name & Address */}
            <div>
              <div className="text-sm font-600" style={{ color: '#F8FAFC' }}>{drawerComp.name}</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(248,250,252,0.5)' }}>{drawerComp.address}</div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 p-3" style={{ backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid rgba(197,150,58,0.1)' }}>
              {drawerComp.is_sale_comp && [
                { label: 'Sale Price', value: formatPrice(drawerComp.price) },
                { label: 'Cap Rate', value: formatCapRate(drawerComp.cap_rate) },
                { label: 'GRM', value: formatGRM(drawerComp.grm) },
                { label: '$/Unit', value: formatPricePer(drawerComp.price_per_unit) },
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

              {drawerComp.is_rent_comp && [
                { label: 'Monthly Rent', value: `${formatPrice(drawerComp.price)}/mo`, highlight: false },
                { label: 'Unit SF', value: drawerComp.unit_sf ? `${drawerComp.unit_sf} SF` : 'N/A', highlight: true },
                { label: '$/SF/Mo', value: formatPricePer(drawerComp.price_per_sf), highlight: false },
                { label: 'Year Built', value: drawerComp.year_built?.toString() ?? 'N/A', highlight: false },
                { label: 'Bldg SF', value: formatNumber(drawerComp.building_size_sf), highlight: false },
                { label: 'Units', value: drawerComp.num_units?.toString() ?? 'N/A', highlight: false },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{label}</div>
                  <div className="text-sm font-600 mt-0.5" style={{ color: highlight ? COLOR_TEAL : '#F8FAFC' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Unit Mix — Sale Comps only */}
            {drawerComp.is_sale_comp && drawerComp.unit_mix && (
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(197,150,58,0.06)', border: '1px solid rgba(197,150,58,0.2)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.4)', fontFamily: 'Inter', marginBottom: 4 }}>Unit Mix</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#C5963A', fontFamily: 'Inter' }}>{drawerComp.unit_mix}</div>
              </div>
            )}

            {/* Missing geocode warning */}
            {(drawerComp.latitude == null || drawerComp.longitude == null) && (
              <div className="flex items-center gap-2 p-2 text-xs" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}>
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
