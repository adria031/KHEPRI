'use client'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NegocioMapa = {
  id: string
  nombre: string
  tipo: string
  ciudad: string | null
  direccion: string | null
  logo_url: string | null
  lat: number | null
  lng: number | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox://styles/mapbox/light-v11'

const tipoConfig: Record<string, { emoji: string; color: string; bg: string }> = {
  peluqueria:  { emoji: '💈', color: '#1D4ED8', bg: '#DBEAFE' },
  barberia:    { emoji: '✂️', color: '#1D4ED8', bg: '#DBEAFE' },
  estetica:    { emoji: '💅', color: '#BE185D', bg: '#FCE7F3' },
  spa:         { emoji: '🧖', color: '#7C3AED', bg: '#EDE9FE' },
  clinica:     { emoji: '🏥', color: '#065F46', bg: '#D1FAE5' },
  yoga:        { emoji: '🧘', color: '#065F46', bg: '#D1FAE5' },
  gimnasio:    { emoji: '🏋️', color: '#92400E', bg: '#FEF3C7' },
  dentista:    { emoji: '🦷', color: '#92400E', bg: '#FEF3C7' },
  veterinaria: { emoji: '🐾', color: '#065F46', bg: '#D1FAE5' },
  restaurante: { emoji: '🍕', color: '#BE185D', bg: '#FCE7F3' },
}
const tipoDefault = { emoji: '🏪', color: '#374151', bg: '#F3F4F6' }

const categorias = [
  { id: 'todos',       label: 'Todos',       emoji: '✨' },
  { id: 'peluqueria',  label: 'Peluquería',  emoji: '💈' },
  { id: 'estetica',    label: 'Estética',    emoji: '💅' },
  { id: 'spa',         label: 'Spa',         emoji: '🧖' },
  { id: 'clinica',     label: 'Clínica',     emoji: '🏥' },
  { id: 'yoga',        label: 'Yoga',        emoji: '🧘' },
  { id: 'gimnasio',    label: 'Gimnasio',    emoji: '🏋️' },
  { id: 'dentista',    label: 'Dentista',    emoji: '🦷' },
  { id: 'veterinaria', label: 'Veterinaria', emoji: '🐾' },
  { id: 'restaurante', label: 'Restaurante', emoji: '🍕' },
]

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
function normTipo(tipo: string): string {
  const t = norm(tipo || '')
  if (t.includes('peluq') || t.includes('barber')) return 'peluqueria'
  if (t.includes('estet') || t.includes('beauty')) return 'estetica'
  if (t.includes('spa')   || t.includes('masaj'))  return 'spa'
  if (t.includes('clinic')|| t.includes('medic'))  return 'clinica'
  if (t.includes('yoga')  || t.includes('pilates'))return 'yoga'
  if (t.includes('gimnas'))                         return 'gimnasio'
  if (t.includes('dentis')|| t.includes('dental')) return 'dentista'
  if (t.includes('veterin'))                        return 'veterinaria'
  if (t.includes('restaur')|| t.includes('cafet')) return 'restaurante'
  return t
}

// ─── GeoJSON builder ──────────────────────────────────────────────────────────

function buildGeoJSON(
  negocios: NegocioMapa[],
  valPorNeg: Record<string, number>,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = negocios
    .filter(n => n.lat != null && n.lng != null)
    .map(n => {
      const tipo = normTipo(n.tipo || '')
      const cfg = tipoConfig[tipo] || tipoDefault
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [n.lng!, n.lat!] },
        properties: {
          id:     n.id,
          nombre: n.nombre,
          tipo:   n.tipo || 'Negocio',
          tipo_norm: tipo,
          ciudad: n.ciudad || '',
          logo_url: n.logo_url || '',
          rating: valPorNeg[n.id] ?? null,
          color:  cfg.color,
          bg:     cfg.bg,
          emoji:  cfg.emoji,
        },
      }
    })
  return { type: 'FeatureCollection', features }
}

// ─── Popup HTML ───────────────────────────────────────────────────────────────

function buildPopupHtml(props: Record<string, unknown>): string {
  const tipo = props.tipo_norm as string
  const cfg  = tipoConfig[tipo] || tipoDefault
  const nombre = props.nombre as string
  const ciudad = props.ciudad as string
  const rating = props.rating as number | null
  const logoUrl = props.logo_url as string
  const id     = props.id as string

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${nombre}" style="width:44px;height:44px;border-radius:12px;object-fit:cover;flex-shrink:0;" />`
    : `<div style="width:44px;height:44px;border-radius:12px;background:${cfg.bg};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${cfg.emoji}</div>`

  const starsHtml = rating != null
    ? `<div style="display:flex;align-items:center;gap:4px;margin-bottom:10px;">
        <span style="color:#FBBF24;font-size:13px;">★</span>
        <span style="font-size:13px;font-weight:800;color:#92400E;">${rating}</span>
        <span style="font-size:11px;color:#9CA3AF;">/ 5</span>
      </div>`
    : ''

  return `
    <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;width:220px;padding:2px 0;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        ${logoHtml}
        <div style="min-width:0;flex:1;">
          <div style="font-weight:800;font-size:14px;color:#0F172A;line-height:1.3;margin-bottom:3px;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nombre}</div>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;
                       background:${cfg.bg};color:${cfg.color};">${props.tipo}</span>
        </div>
      </div>
      ${starsHtml}
      ${ciudad ? `<div style="font-size:12px;color:#64748B;margin-bottom:10px;">📍 ${ciudad}</div>` : ''}
      <a href="/negocio/${id}"
         style="display:block;text-align:center;padding:10px;background:#0F172A;color:white;
                border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;
                transition:background 0.15s;">
        Ver perfil →
      </a>
    </div>`
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapaNegocios({
  negocios,
  valPorNeg = {},
  userPos   = null,
}: {
  negocios:   NegocioMapa[]
  valPorNeg?: Record<string, number>
  userPos?:   { lat: number; lng: number } | null
}) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<mapboxgl.Map | null>(null)
  const mapLoadedRef    = useRef(false)
  const userMarkerRef   = useRef<mapboxgl.Marker | null>(null)
  const popupRef        = useRef<mapboxgl.Popup | null>(null)
  const latestDataRef   = useRef<GeoJSON.FeatureCollection | null>(null)
  const markersRef      = useRef<mapboxgl.Marker[]>([])

  const [filtroTipo,  setFiltroTipo]  = useState('todos')
  const [busqueda,    setBusqueda]    = useState('')
  const [localizando, setLocalizando] = useState(false)
  const [mapReady,    setMapReady]    = useState(false)
  const [userMarked,  setUserMarked]  = useState(false)
  const [tokenError,  setTokenError]  = useState(false)

  // ── Filtered list ──────────────────────────────────────────────────────────
  const negociosFiltrados = useMemo(() => negocios.filter(n => {
    const matchTipo = filtroTipo === 'todos' || normTipo(n.tipo || '') === filtroTipo
    const q = norm(busqueda)
    const matchQ = !q || norm(n.nombre).includes(q) || norm(n.ciudad || '').includes(q)
    return matchTipo && matchQ
  }), [negocios, filtroTipo, busqueda])

  // ── GeoJSON ────────────────────────────────────────────────────────────────
  const geojson = useMemo(
    () => buildGeoJSON(negociosFiltrados, valPorNeg),
    [negociosFiltrados, valPorNeg],
  )

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateSource = useCallback((data: GeoJSON.FeatureCollection) => {
    latestDataRef.current = data
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    const src = map.getSource('businesses') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(data)
  }, [])

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1200 })
  }, [])

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    if (!TOKEN) {
      console.error('[MapaNegocios] NEXT_PUBLIC_MAPBOX_TOKEN no está configurado')
      setTokenError(true)
      return
    }

    mapboxgl.accessToken = TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:  STYLE,
      center: [-3.7038, 40.4168],
      zoom:   6,
      attributionControl: false,
    })

    mapRef.current = map

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      mapLoadedRef.current = true

      const initialData = latestDataRef.current || { type: 'FeatureCollection', features: [] }

      // ── Source ──
      map.addSource('businesses', {
        type: 'geojson',
        data: initialData as GeoJSON.FeatureCollection,
        cluster:        true,
        clusterMaxZoom: 14,
        clusterRadius:  50,
      })

      // ── Cluster: shadow ──
      map.addLayer({
        id:     'clusters-shadow',
        type:   'circle',
        source: 'businesses',
        filter: ['has', 'point_count'],
        paint:  {
          'circle-color':   'rgba(29,78,216,0.15)',
          'circle-radius':  ['step', ['get', 'point_count'], 30, 10, 36, 50, 44],
          'circle-blur':    0.5,
        },
      })

      // ── Cluster: circle ──
      map.addLayer({
        id:     'clusters',
        type:   'circle',
        source: 'businesses',
        filter: ['has', 'point_count'],
        paint:  {
          'circle-color':         '#1D4ED8',
          'circle-radius':        ['step', ['get', 'point_count'], 22, 10, 28, 50, 36],
          'circle-stroke-width':  3,
          'circle-stroke-color':  '#fff',
        },
      })

      // ── Cluster: count label ──
      map.addLayer({
        id:     'cluster-count',
        type:   'symbol',
        source: 'businesses',
        filter: ['has', 'point_count'],
        layout: {
          'text-field':             ['get', 'point_count_abbreviated'],
          'text-font':              ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size':              13,
          'text-allow-overlap':     true,
        },
        paint: { 'text-color': '#fff' },
      })

      setMapReady(true)

      // ── HTML markers for individual points ──
      function createMarkerEl(props: Record<string, unknown>): HTMLDivElement {
        const color   = props.color as string
        const bg      = props.bg as string
        const nombre  = props.nombre as string
        const logoUrl = props.logo_url as string
        const initial = (nombre?.[0] ?? '?').toUpperCase()

        // Wrapper: fixed size, holds position stable — Mapbox only touches this element
        const wrapper = document.createElement('div')
        wrapper.style.cssText = 'width:48px;height:48px;cursor:pointer;position:relative;'

        // Pulse ring (always visible, low opacity)
        const ring = document.createElement('div')
        ring.style.cssText = `
          position:absolute;inset:-6px;border-radius:50%;
          border:2px solid ${color};opacity:0;
          transition:opacity 0.2s,transform 0.3s;
          pointer-events:none;
        `
        wrapper.appendChild(ring)

        // Inner circle — this is the only element that scales on hover
        const inner = document.createElement('div')
        inner.style.cssText = `
          width:48px;height:48px;border-radius:50%;
          border:2.5px solid ${color};background:${bg};
          overflow:hidden;
          box-shadow:0 2px 14px rgba(0,0,0,0.14);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;font-weight:800;color:${color};
          font-family:'Plus Jakarta Sans',system-ui,sans-serif;
          transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                     box-shadow 0.2s,border-color 0.2s;
          transform-origin:center center;
          user-select:none;position:relative;z-index:1;
        `

        if (logoUrl) {
          const img = document.createElement('img')
          img.src = logoUrl
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
          img.onerror = () => { img.remove(); inner.textContent = initial }
          inner.appendChild(img)
        } else {
          inner.textContent = initial
        }

        wrapper.appendChild(inner)

        wrapper.onmouseenter = () => {
          inner.style.transform = 'scale(1.22)'
          inner.style.boxShadow = `0 0 0 3px ${bg}, 0 8px 28px rgba(0,0,0,0.22)`
          inner.style.borderColor = color
          ring.style.opacity = '0.5'
          ring.style.transform = 'scale(1.1)'
        }
        wrapper.onmouseleave = () => {
          inner.style.transform = 'scale(1)'
          inner.style.boxShadow = '0 2px 14px rgba(0,0,0,0.14)'
          inner.style.borderColor = color
          ring.style.opacity = '0'
          ring.style.transform = 'scale(1)'
        }

        return wrapper
      }

      function renderMarkers() {
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []
        const features = map.querySourceFeatures('businesses', {
          filter: ['!', ['has', 'point_count']],
        })
        const seen = new Set<string>()
        features.forEach(feat => {
          const props = feat.properties as Record<string, unknown>
          const id = props?.id as string
          if (!id || seen.has(id)) return
          seen.add(id)
          const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number]
          const wrapper = createMarkerEl(props)
          wrapper.addEventListener('click', () => {
            popupRef.current?.remove()
            popupRef.current = new mapboxgl.Popup({
              closeButton: true, closeOnClick: false,
              maxWidth: '260px', className: 'khepria-mapbox-popup', offset: [0, -28],
            })
              .setLngLat(coords)
              .setHTML(buildPopupHtml(props))
              .addTo(map)
          })
          const marker = new mapboxgl.Marker({ element: wrapper, anchor: 'center' })
            .setLngLat(coords)
            .addTo(map)
          markersRef.current.push(marker)
        })
      }

      // Re-render markers after each map movement/zoom/data update
      map.on('idle', renderMarkers)

      // ── Click: cluster → zoom ──
      map.on('click', 'clusters', e => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        if (!feats.length) return
        const clusterId = feats[0].properties?.cluster_id
        ;(map.getSource('businesses') as mapboxgl.GeoJSONSource)
          .getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return
            map.easeTo({
              center: (feats[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom ?? 10,
              duration: 600,
            })
          })
      })

      // ── Cursor on clusters ──
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
    })

    return () => {
      popupRef.current?.remove()
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current    = null
      mapLoadedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update data when filter/search changes ─────────────────────────────────
  useEffect(() => { updateSource(geojson) }, [geojson, updateSource])

  // ── User position marker ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userPos) return

    userMarkerRef.current?.remove()

    const el = document.createElement('div')
    el.style.cssText = `
      width:22px;height:22px;border-radius:50%;
      background:#1D4ED8;border:3px solid white;
      box-shadow:0 0 0 7px rgba(29,78,216,0.18),0 2px 8px rgba(0,0,0,0.2);
    `
    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userPos.lng, userPos.lat])
      .setPopup(new mapboxgl.Popup({ offset: 14 }).setHTML('<b style="font-family:sans-serif;font-size:13px;">📍 Estás aquí</b>'))
      .addTo(map)

    setUserMarked(true)

    return () => { userMarkerRef.current?.remove() }
  }, [userPos])

  // Fly to user once marker is placed
  useEffect(() => {
    if (userMarked && userPos && mapRef.current) {
      mapRef.current.flyTo({ center: [userPos.lng, userPos.lat], zoom: 13, duration: 1200 })
      setUserMarked(false)
    }
  }, [userMarked, userPos])

  // ── Geolocation ────────────────────────────────────────────────────────────
  function centrarEnMi() {
    if (userPos && mapRef.current) {
      flyTo(userPos.lng, userPos.lat, 13)
      return
    }
    setLocalizando(true)
    navigator.geolocation?.getCurrentPosition(
      p => {
        setLocalizando(false)
        flyTo(p.coords.longitude, p.coords.latitude, 13)
      },
      () => setLocalizando(false),
      { timeout: 8000 },
    )
  }

  // ── Search result click ────────────────────────────────────────────────────
  function focusNegocio(n: NegocioMapa) {
    setBusqueda('')
    if (n.lat != null && n.lng != null) {
      flyTo(n.lng, n.lat, 16)
    }
  }

  const searchResults = useMemo(() =>
    busqueda.length > 0
      ? negociosFiltrados.filter(n => n.lat != null && n.lng != null).slice(0, 6)
      : [],
    [busqueda, negociosFiltrados],
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  if (tokenError) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', gap: '12px' }}>
        <span style={{ fontSize: '40px' }}>🗺️</span>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Mapa no disponible</div>
        <div style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', maxWidth: '260px' }}>
          Falta configurar <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '6px', fontSize: '12px' }}>NEXT_PUBLIC_MAPBOX_TOKEN</code> en las variables de entorno.
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Popup styles */}
      <style>{`
        .khepria-mapbox-popup .mapboxgl-popup-content {
          border-radius: 18px !important;
          padding: 16px !important;
          box-shadow: 0 8px 40px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08) !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
        }
        .khepria-mapbox-popup .mapboxgl-popup-tip { display: none !important; }
        .khepria-mapbox-popup .mapboxgl-popup-close-button {
          font-size: 20px !important;
          color: #9CA3AF !important;
          top: 8px !important; right: 10px !important;
          line-height: 1 !important;
        }
        .khepria-mapbox-popup .mapboxgl-popup-close-button:hover { color: #374151 !important; }
        .mapboxgl-ctrl-bottom-left { bottom: 6px !important; left: 6px !important; }
        .mapboxgl-ctrl-attrib { border-radius: 8px !important; font-size: 10px !important; }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        padding: '10px 14px 0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        {/* Search + locate */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
            background: '#F7F9FC', border: '1.5px solid rgba(0,0,0,0.08)',
            borderRadius: '12px', padding: '9px 13px',
          }}>
            <span style={{ fontSize: '14px', opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar negocio en el mapa..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '14px', color: '#0F172A', outline: 'none' }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
            )}
          </div>
          <button
            onClick={centrarEnMi}
            title="Usar mi ubicación"
            style={{
              width: '44px', height: '44px', flexShrink: 0,
              background: localizando ? '#EFF6FF' : 'white',
              border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', transition: 'all 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            {localizando ? '⏳' : '📍'}
          </button>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '10px' }}>
          {categorias.map(cat => {
            const active = filtroTipo === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setFiltroTipo(cat.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '6px 12px', borderRadius: '100px', flexShrink: 0,
                  border: `1.5px solid ${active ? '#1D4ED8' : 'rgba(0,0,0,0.08)'}`,
                  background: active ? '#1D4ED8' : 'white',
                  color: active ? 'white' : '#4B5563',
                  fontFamily: 'inherit', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            )
          })}
        </div>

        {/* Counter */}
        <div style={{ padding: '4px 0 8px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
            {negociosFiltrados.filter(n => n.lat != null && n.lng != null).length} negocio
            {negociosFiltrados.filter(n => n.lat != null && n.lng != null).length !== 1 ? 's' : ''} en el mapa
            {filtroTipo !== 'todos' && ` · ${categorias.find(c => c.id === filtroTipo)?.label}`}
            {!mapReady && <span style={{ marginLeft: 8, color: '#B8D8F8' }}>● Cargando mapa…</span>}
          </span>
        </div>
      </div>

      {/* ── Search dropdown ── */}
      {searchResults.length > 0 && (
        <div style={{
          position: 'absolute', top: 130, left: 14, right: 14, zIndex: 20,
          background: 'white', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          border: '1px solid rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {searchResults.map(n => {
            const cfg = tipoConfig[normTipo(n.tipo || '')] || tipoDefault
            return (
              <button
                key={n.id}
                onClick={() => focusNegocio(n)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', background: 'none', border: 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: cfg.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '18px', flexShrink: 0, overflow: 'hidden',
                }}>
                  {n.logo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={n.logo_url} alt={n.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : cfg.emoji}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>{n.ciudad || n.tipo}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#94A3B8' }}>›</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Map container ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', marginTop: '130px' }}
      />

      {/* ── Zoom controls ── */}
      <div style={{
        position: 'absolute', bottom: 28, right: 14, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        {[{ label: '+', action: () => mapRef.current?.zoomIn() }, { label: '−', action: () => mapRef.current?.zoomOut() }]
          .map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              style={{
                width: '38px', height: '38px', background: 'white',
                border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px',
                fontSize: '20px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#374151',
                transition: 'box-shadow 0.2s',
              }}
            >
              {btn.label}
            </button>
          ))}
      </div>
    </div>
  )
}
