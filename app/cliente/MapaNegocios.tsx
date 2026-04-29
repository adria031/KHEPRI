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
const STYLE  = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox://styles/mapbox/light-v11'

const tipoConfig: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  peluqueria:  { emoji: '💈', color: '#1D4ED8', bg: '#DBEAFE', border: '#B8D8F8' },
  barberia:    { emoji: '✂️', color: '#1D4ED8', bg: '#DBEAFE', border: '#B8D8F8' },
  estetica:    { emoji: '💅', color: '#7C3AED', bg: '#EDE9FE', border: '#D4C5F9' },
  spa:         { emoji: '🧖', color: '#059669', bg: '#D1FAE5', border: '#B8EDD4' },
  clinica:     { emoji: '🏥', color: '#D97706', bg: '#FEF3C7', border: '#FDE9A2' },
  yoga:        { emoji: '🧘', color: '#059669', bg: '#D1FAE5', border: '#B8EDD4' },
  gimnasio:    { emoji: '🏋️', color: '#D97706', bg: '#FEF3C7', border: '#FDE9A2' },
  dentista:    { emoji: '🦷', color: '#D97706', bg: '#FEF3C7', border: '#FDE9A2' },
  veterinaria: { emoji: '🐾', color: '#059669', bg: '#D1FAE5', border: '#B8EDD4' },
  restaurante: { emoji: '🍕', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
}
const tipoDefault = { emoji: '🏪', color: '#475569', bg: '#F3F4F6', border: '#E2E8F0' }

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
  abiertoMap: Record<string, boolean>,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = negocios
    .filter(n => n.lat != null && n.lng != null)
    .map(n => {
      const tipo = normTipo(n.tipo || '')
      const cfg  = tipoConfig[tipo] || tipoDefault
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [n.lng!, n.lat!] },
        properties: {
          id:        n.id,
          nombre:    n.nombre,
          tipo:      n.tipo || 'Negocio',
          tipo_norm: tipo,
          ciudad:    n.ciudad || '',
          logo_url:  n.logo_url || '',
          rating:    valPorNeg[n.id] ?? null,
          abierto:   abiertoMap[n.id] ?? false,
          color:     cfg.color,
          bg:        cfg.bg,
          border:    cfg.border,
          emoji:     cfg.emoji,
        },
      }
    })
  return { type: 'FeatureCollection', features }
}

// ─── Popup HTML ───────────────────────────────────────────────────────────────

function buildPopupHtml(props: Record<string, unknown>): string {
  const tipo    = props.tipo_norm as string
  const cfg     = tipoConfig[tipo] || tipoDefault
  const nombre  = props.nombre  as string
  const ciudad  = props.ciudad  as string
  const rating  = props.rating  as number | null
  const logoUrl = props.logo_url as string
  const id      = props.id      as string
  const abierto = props.abierto as boolean

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${nombre}" style="width:44px;height:44px;border-radius:12px;object-fit:cover;flex-shrink:0;" />`
    : `<div style="width:44px;height:44px;border-radius:12px;background:${cfg.bg};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${cfg.emoji}</div>`

  const starsHtml = rating != null
    ? `<div style="display:flex;align-items:center;gap:2px;margin-bottom:8px;">
        ${Array.from({ length: 5 }).map((_, i) =>
          `<span style="color:${i < Math.round(rating) ? '#FBBF24' : '#E5E7EB'};font-size:15px;">★</span>`
        ).join('')}
        <span style="font-size:12px;font-weight:700;color:#92400E;margin-left:4px;">${rating}</span>
      </div>`
    : ''

  const abiertoHtml = abierto
    ? `<div style="margin-bottom:10px;">
        <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;
                     border-radius:100px;background:#D1FAE5;color:#065F46;
                     font-size:11px;font-weight:700;">
          <span style="width:6px;height:6px;border-radius:50%;background:#34D399;display:inline-block;
                       box-shadow:0 0 0 3px rgba(52,211,153,0.3);"></span>
          Abierto ahora
        </span>
      </div>`
    : ''

  return `
    <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;width:220px;padding:2px 0;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        ${logoHtml}
        <div style="min-width:0;flex:1;">
          <div style="font-weight:800;font-size:14px;color:#0F172A;line-height:1.3;margin-bottom:4px;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nombre}</div>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;
                       background:${cfg.bg};color:${cfg.color};">${props.tipo}</span>
        </div>
      </div>
      ${abiertoHtml}
      ${starsHtml}
      ${ciudad ? `<div style="font-size:12px;color:#64748B;margin-bottom:10px;">📍 ${ciudad}</div>` : ''}
      <a href="/negocio/${id}"
         style="display:block;text-align:center;padding:10px;background:#0F172A;color:white;
                border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">
        Ver perfil →
      </a>
    </div>`
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapaNegocios({
  negocios,
  valPorNeg  = {},
  userPos    = null,
  abiertoMap = {},
}: {
  negocios:    NegocioMapa[]
  valPorNeg?:  Record<string, number>
  userPos?:    { lat: number; lng: number } | null
  abiertoMap?: Record<string, boolean>
}) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<mapboxgl.Map | null>(null)
  const mapLoadedRef  = useRef(false)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const popupRef      = useRef<mapboxgl.Popup | null>(null)
  const latestDataRef = useRef<GeoJSON.FeatureCollection | null>(null)
  const markersRef    = useRef<mapboxgl.Marker[]>([])
  const geolocateRef  = useRef<mapboxgl.GeolocateControl | null>(null)

  const [filtroTipo,  setFiltroTipo]  = useState('todos')
  const [busqueda,    setBusqueda]    = useState('')
  const [localizando, setLocalizando] = useState(false)
  const [mapReady,    setMapReady]    = useState(false)
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
    () => buildGeoJSON(negociosFiltrados, valPorNeg, abiertoMap),
    [negociosFiltrados, valPorNeg, abiertoMap],
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
      setTokenError(true)
      return
    }

    mapboxgl.accessToken = TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:     STYLE,
      center:    [-3.7038, 40.4168],
      zoom:      6,
      attributionControl: false,
    })
    mapRef.current = map

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')

    // ── GeolocateControl ──
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions:   { enableHighAccuracy: true, timeout: 8000 },
      trackUserLocation: false,
      showAccuracyCircle: false,
      fitBoundsOptions:  { zoom: 13, duration: 1200 },
    })
    map.addControl(geolocate, 'bottom-right')
    geolocateRef.current = geolocate
    ;(geolocate as mapboxgl.GeolocateControl & { on: (e: string, cb: () => void) => void })
      .on('geolocate', () => setLocalizando(false))
    ;(geolocate as mapboxgl.GeolocateControl & { on: (e: string, cb: () => void) => void })
      .on('error', () => setLocalizando(false))

    map.on('load', () => {
      mapLoadedRef.current = true
      const initialData = latestDataRef.current || { type: 'FeatureCollection', features: [] }

      // ── Source ──
      map.addSource('businesses', {
        type:           'geojson',
        data:           initialData as GeoJSON.FeatureCollection,
        cluster:        true,
        clusterMaxZoom: 14,
        clusterRadius:  50,
      })

      // ── Cluster shadow ──
      map.addLayer({
        id:     'clusters-shadow',
        type:   'circle',
        source: 'businesses',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color':  'rgba(99,102,241,0.12)',
          'circle-radius': ['step', ['get', 'point_count'], 32, 10, 38, 50, 46],
          'circle-blur':   0.6,
        },
      })

      // ── Cluster circle — pastel by count ──
      map.addLayer({
        id:     'clusters',
        type:   'circle',
        source: 'businesses',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            '#93C5FD',   // blue-300  1-9
            10, '#A78BFA', // purple-400  10-49
            50, '#6EE7B7', // green-300   50+
          ],
          'circle-radius':       ['step', ['get', 'point_count'], 22, 10, 28, 50, 36],
          'circle-stroke-width': 3,
          'circle-stroke-color': 'white',
        },
      })

      // ── Cluster count ──
      map.addLayer({
        id:     'cluster-count',
        type:   'symbol',
        source: 'businesses',
        filter: ['has', 'point_count'],
        layout: {
          'text-field':         ['get', 'point_count_abbreviated'],
          'text-font':          ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size':          13,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': 'white' },
      })

      setMapReady(true)

      // ── HTML markers for individual points ──
      function createMarkerEl(props: Record<string, unknown>): HTMLDivElement {
        const border = (props.border as string) || '#E2E8F0'
        const emoji  = (props.emoji  as string) || '🏪'

        const wrapper = document.createElement('div')
        wrapper.style.cssText = 'width:44px;height:44px;cursor:pointer;'

        const inner = document.createElement('div')
        inner.style.cssText = `
          width:44px;height:44px;border-radius:50%;
          background:white;border:3px solid ${border};
          display:flex;align-items:center;justify-content:center;
          font-size:20px;
          box-shadow:0 4px 12px rgba(0,0,0,0.15);
          cursor:pointer;
          transition:transform 0.2s ease,box-shadow 0.2s ease;
        `
        inner.textContent = emoji
        wrapper.appendChild(inner)

        wrapper.onmouseenter = () => {
          inner.style.transform  = 'scale(1.1)'
          inner.style.boxShadow  = '0 6px 20px rgba(0,0,0,0.22)'
        }
        wrapper.onmouseleave = () => {
          inner.style.transform  = 'scale(1)'
          inner.style.boxShadow  = '0 4px 12px rgba(0,0,0,0.15)'
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
          const id    = props?.id as string
          if (!id || seen.has(id)) return
          seen.add(id)
          const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number]
          const el = createMarkerEl(props)
          el.addEventListener('click', () => {
            popupRef.current?.remove()
            popupRef.current = new mapboxgl.Popup({
              closeButton:  true,
              closeOnClick: false,
              maxWidth:    '260px',
              className:   'khepria-mapbox-popup',
              offset:      [0, -28],
            })
              .setLngLat(coords)
              .setHTML(buildPopupHtml(props))
              .addTo(map)
          })
          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat(coords)
            .addTo(map)
          markersRef.current.push(marker)
        })
      }

      map.on('idle', renderMarkers)

      // ── Cluster click → zoom ──
      map.on('click', 'clusters', e => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        if (!feats.length) return
        const clusterId = feats[0].properties?.cluster_id
        ;(map.getSource('businesses') as mapboxgl.GeoJSONSource)
          .getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return
            map.easeTo({
              center:   (feats[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom:     zoom ?? 10,
              duration: 600,
            })
          })
      })
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })

      // ── Auto-trigger geolocation ──
      setTimeout(() => {
        setLocalizando(true)
        geolocate.trigger()
      }, 1000)
    })

    return () => {
      popupRef.current?.remove()
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current      = null
      mapLoadedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update data when filter/search/abierto changes ─────────────────────────
  useEffect(() => { updateSource(geojson) }, [geojson, updateSource])

  // ── User position marker (from parent prop) ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userPos) return

    userMarkerRef.current?.remove()

    const el = document.createElement('div')
    el.style.cssText = 'position:relative;width:24px;height:24px;'

    const pulse = document.createElement('div')
    pulse.className = 'khepria-user-pulse'
    el.appendChild(pulse)

    const dot = document.createElement('div')
    dot.style.cssText = `
      position:absolute;inset:5px;border-radius:50%;
      background:#1D4ED8;border:2.5px solid white;
      box-shadow:0 2px 8px rgba(29,78,216,0.4);
    `
    el.appendChild(dot)

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([userPos.lng, userPos.lat])
      .setPopup(new mapboxgl.Popup({ offset: 14 }).setHTML(
        '<b style="font-family:sans-serif;font-size:13px;">📍 Estás aquí</b>'
      ))
      .addTo(map)

    map.flyTo({ center: [userPos.lng, userPos.lat], zoom: 13, duration: 1200 })

    return () => { userMarkerRef.current?.remove() }
  }, [userPos])

  // ── Centrar en mi posición ─────────────────────────────────────────────────
  function centrarEnMi() {
    if (userPos && mapRef.current) {
      flyTo(userPos.lng, userPos.lat, 13)
      return
    }
    setLocalizando(true)
    geolocateRef.current?.trigger()
  }

  // ── Search result click ────────────────────────────────────────────────────
  function focusNegocio(n: NegocioMapa) {
    setBusqueda('')
    if (n.lat != null && n.lng != null) flyTo(n.lng, n.lat, 16)
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

      {/* ── Global styles ── */}
      <style>{`
        @keyframes khepria-user-pulse {
          0%   { transform: scale(1);   opacity: 0.75; }
          70%  { transform: scale(3);   opacity: 0; }
          100% { transform: scale(3);   opacity: 0; }
        }
        .khepria-user-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(29,78,216,0.4);
          animation: khepria-user-pulse 2s ease-out infinite;
        }
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
        .mapboxgl-ctrl-bottom-left  { bottom: 6px !important; left: 6px !important; }
        .mapboxgl-ctrl-attrib       { border-radius: 8px !important; font-size: 10px !important; }
        .mapboxgl-ctrl-geolocate    { display: none !important; }
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
              border: `1.5px solid ${localizando ? '#93C5FD' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: '12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            {!mapReady && <span style={{ marginLeft: 8, color: '#B8D8F8' }}>● Cargando…</span>}
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
