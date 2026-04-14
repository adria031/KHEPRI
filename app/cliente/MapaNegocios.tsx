'use client'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NegocioMapa = {
  id: string
  nombre: string
  tipo: string
  ciudad: string | null
  logo_url: string | null
  lat: number
  lng: number
}

// ─── Config ───────────────────────────────────────────────────────────────────

const tipoConfig: Record<string, { emoji: string; bg: string; color: string }> = {
  peluqueria:  { emoji: '💈', bg: '#DBEAFE', color: '#1D4ED8' },
  barberia:    { emoji: '✂️', bg: '#DBEAFE', color: '#1D4ED8' },
  estetica:    { emoji: '💅', bg: '#FCE7F3', color: '#BE185D' },
  spa:         { emoji: '💆', bg: '#EDE9FE', color: '#7C3AED' },
  clinica:     { emoji: '🏥', bg: '#D1FAE5', color: '#065F46' },
  yoga:        { emoji: '🧘', bg: '#D1FAE5', color: '#065F46' },
  gimnasio:    { emoji: '🏋️', bg: '#FEF3C7', color: '#92400E' },
  dentista:    { emoji: '🦷', bg: '#FEF3C7', color: '#92400E' },
  veterinaria: { emoji: '🐾', bg: '#D1FAE5', color: '#065F46' },
  restaurante: { emoji: '🍕', bg: '#FCE7F3', color: '#BE185D' },
}
const tipoDefault = { emoji: '🏪', bg: '#F3F4F6', color: '#374151' }

function norm(s: string) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
function normTipo(tipo: string): string {
  const t = norm(tipo)
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

const categorias = [
  { id: 'todos',       label: 'Todos',      emoji: '✨' },
  { id: 'peluqueria',  label: 'Peluquería', emoji: '💈' },
  { id: 'estetica',    label: 'Estética',   emoji: '💅' },
  { id: 'spa',         label: 'Spa',        emoji: '💆' },
  { id: 'clinica',     label: 'Clínica',    emoji: '🏥' },
  { id: 'yoga',        label: 'Yoga',       emoji: '🧘' },
  { id: 'gimnasio',    label: 'Gimnasio',   emoji: '🏋️' },
  { id: 'dentista',    label: 'Dentista',   emoji: '🦷' },
  { id: 'veterinaria', label: 'Veterinaria',emoji: '🐾' },
  { id: 'restaurante', label: 'Restaurante',emoji: '🍕' },
]

// ─── Marker icon ──────────────────────────────────────────────────────────────

function crearIcono(tipo: string, logoUrl: string | null, activo = false): L.DivIcon {
  const cfg = tipoConfig[normTipo(tipo || '')] || tipoDefault
  const inner = logoUrl
    ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="font-size:18px;line-height:1;">${cfg.emoji}</span>`
  const size  = activo ? 48 : 40
  const ring  = activo ? `box-shadow:0 0 0 4px rgba(29,78,216,0.25),0 4px 14px rgba(0,0,0,0.25);` : `box-shadow:0 3px 10px rgba(0,0,0,0.18);`
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${logoUrl ? '#fff' : cfg.bg};
      border:3px solid ${activo ? '#1D4ED8' : 'white'};
      ${ring}
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;transition:transform 0.15s;
    ">${inner}</div>`,
    className: '',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
  })
}

function crearIconoUsuario(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#1D4ED8;border:3px solid white;
      box-shadow:0 0 0 6px rgba(29,78,216,0.2),0 2px 8px rgba(0,0,0,0.2);
    "></div>`,
    className: '',
    iconSize:   [20, 20],
    iconAnchor: [10, 10],
  })
}

function clusterIconCreate(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size  = count < 10 ? 38 : count < 50 ? 46 : 54
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:#1D4ED8;color:white;
      border:3px solid white;
      box-shadow:0 3px 12px rgba(29,78,216,0.4);
      display:flex;align-items:center;justify-content:center;
      font-family:'Plus Jakarta Sans',sans-serif;
      font-size:${count < 10 ? 14 : 12}px;font-weight:800;
    ">${count}</div>`,
    className: '',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
  })
}

// ─── Popup HTML ───────────────────────────────────────────────────────────────

function buildPopupHtml(neg: NegocioMapa, rating?: number): string {
  const cfg = tipoConfig[normTipo(neg.tipo || '')] || tipoDefault
  const logo = neg.logo_url
    ? `<img src="${neg.logo_url}" style="width:44px;height:44px;border-radius:12px;object-fit:cover;flex-shrink:0;" />`
    : `<div style="width:44px;height:44px;border-radius:12px;background:${cfg.bg};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${cfg.emoji}</div>`

  const stars = rating != null
    ? `<div style="display:flex;align-items:center;gap:3px;margin-bottom:12px;">
        <span style="color:#FBBF24;font-size:12px;">★★★★★</span>
        <span style="font-size:12px;font-weight:700;color:#92400E;">${rating}</span>
      </div>`
    : ''

  return `
    <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;width:210px;padding:4px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        ${logo}
        <div style="min-width:0;">
          <div style="font-weight:800;font-size:14px;color:#111827;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${neg.nombre}</div>
          ${neg.ciudad ? `<div style="font-size:11px;color:#9CA3AF;margin-top:2px;">📍 ${neg.ciudad}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;background:${cfg.bg};color:${cfg.color};">${neg.tipo || 'Negocio'}</span>
      </div>
      ${stars}
      <a href="/negocio/${neg.id}" style="display:block;text-align:center;padding:9px 12px;background:#111827;color:white;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">
        Ver perfil →
      </a>
    </div>`
}

// ─── ClusterLayer (inner component with map access) ───────────────────────────

function ClusterLayer({
  negocios,
  valPorNeg,
  userPos,
  focusId,
  onReady,
}: {
  negocios:  NegocioMapa[]
  valPorNeg: Record<string, number>
  userPos:   { lat: number; lng: number } | null
  focusId:   string | null
  onReady:   (flyTo: (lat: number, lng: number, zoom?: number) => void) => void
}) {
  const map         = useMap()
  const clusterRef  = useRef<L.MarkerClusterGroup | null>(null)
  const userRef     = useRef<L.Marker | null>(null)

  // Expose flyTo to parent
  useEffect(() => {
    onReady((lat, lng, zoom = 15) => map.flyTo([lat, lng], zoom, { duration: 1.2 }))
  }, [map, onReady])

  // Rebuild cluster when negocios change
  useEffect(() => {
    if (clusterRef.current) { map.removeLayer(clusterRef.current); clusterRef.current = null }

    const cluster = (L as any).markerClusterGroup({
      iconCreateFunction: clusterIconCreate,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
    }) as L.MarkerClusterGroup

    negocios.forEach(neg => {
      const activo  = neg.id === focusId
      const marker  = L.marker([neg.lat, neg.lng], { icon: crearIcono(neg.tipo, neg.logo_url, activo) })
      const rating  = valPorNeg[neg.id]
      marker.bindPopup(buildPopupHtml(neg, rating), {
        maxWidth: 240,
        className: 'khepria-popup',
      })
      if (activo) marker.openPopup()
      cluster.addLayer(marker)
    })

    map.addLayer(cluster)
    clusterRef.current = cluster

    return () => { if (clusterRef.current) map.removeLayer(clusterRef.current) }
  }, [map, negocios, valPorNeg, focusId])

  // User position marker
  useEffect(() => {
    if (userRef.current) { map.removeLayer(userRef.current); userRef.current = null }
    if (!userPos) return
    const m = L.marker([userPos.lat, userPos.lng], { icon: crearIconoUsuario(), zIndexOffset: 1000 })
    m.bindPopup('<div style="font-family:sans-serif;font-size:13px;font-weight:700;padding:2px 4px;">📍 Estás aquí</div>')
    m.addTo(map)
    userRef.current = m
    return () => { if (userRef.current) map.removeLayer(userRef.current) }
  }, [map, userPos])

  return null
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
  const [filtroTipo,  setFiltroTipo]  = useState('todos')
  const [busqueda,    setBusqueda]    = useState('')
  const [focusId,     setFocusId]     = useState<string | null>(null)
  const [localizando, setLocalizando] = useState(false)
  const flyToRef = useRef<((lat: number, lng: number, zoom?: number) => void) | null>(null)

  const negociosFiltrados = negocios.filter(n => {
    const matchTipo = filtroTipo === 'todos' || normTipo(n.tipo || '') === filtroTipo
    const q = norm(busqueda)
    const matchQ = !q || norm(n.nombre).includes(q)
    return matchTipo && matchQ
  })

  function centrarEnMi() {
    if (userPos && flyToRef.current) { flyToRef.current(userPos.lat, userPos.lng, 14); return }
    setLocalizando(true)
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setLocalizando(false)
        flyToRef.current?.(pos.coords.latitude, pos.coords.longitude, 14)
      },
      () => setLocalizando(false),
      { timeout: 8000 },
    )
  }

  const centro: [number, number] = userPos ? [userPos.lat, userPos.lng] : [40.4168, -3.7038]

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Barra de búsqueda + botón localizar ── */}
      <div style={{ padding: '10px 14px 0', background: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#F7F9FC', border: '1.5px solid rgba(0,0,0,0.09)', borderRadius: '12px', padding: '9px 13px' }}>
            <span style={{ fontSize: '15px' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar en el mapa..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '14px', color: '#111827', outline: 'none' }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '14px', padding: 0 }}>✕</button>
            )}
          </div>
          <button
            onClick={centrarEnMi}
            title="Mi ubicación"
            style={{ width: '42px', height: '42px', background: localizando ? '#EFF6FF' : 'white', border: '1.5px solid rgba(0,0,0,0.09)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, transition: 'background 0.2s' }}
          >
            {localizando ? '⏳' : '📍'}
          </button>
        </div>

        {/* Filtros tipo */}
        <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '10px' }}>
          {categorias.map(cat => {
            const active = filtroTipo === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setFiltroTipo(cat.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '100px', border: `1.5px solid ${active ? '#1D4ED8' : 'rgba(0,0,0,0.09)'}`, background: active ? '#1D4ED8' : 'white', color: active ? 'white' : '#4B5563', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}
              >
                {cat.emoji} {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contador */}
      <div style={{ padding: '4px 14px 6px', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>
          {negociosFiltrados.length} negocio{negociosFiltrados.length !== 1 ? 's' : ''} en el mapa
          {filtroTipo !== 'todos' && ` · ${categorias.find(c => c.id === filtroTipo)?.label}`}
        </span>
      </div>

      {/* Lista resultado búsqueda */}
      {busqueda && negociosFiltrados.length > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderRadius: '0 0 16px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '260px', overflowY: 'auto', marginTop: '116px' }}>
          {negociosFiltrados.slice(0, 6).map(n => {
            const cfg = tipoConfig[n.tipo?.toLowerCase()] || tipoDefault
            return (
              <button
                key={n.id}
                onClick={() => { setBusqueda(''); setFocusId(n.id); flyToRef.current?.(n.lat, n.lng, 16) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, overflow: 'hidden' }}>
                  {n.logo_url ? <img src={n.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : cfg.emoji}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{n.ciudad || n.tipo}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#9CA3AF' }}>›</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Mapa */}
      <div style={{ flex: 1, position: 'relative' }}>
        <style>{`
          .khepria-popup .leaflet-popup-content-wrapper {
            border-radius: 16px !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.14) !important;
            border: 1px solid rgba(0,0,0,0.07) !important;
            padding: 0 !important;
          }
          .khepria-popup .leaflet-popup-content {
            margin: 14px !important;
          }
          .khepria-popup .leaflet-popup-tip-container { display: none !important; }
          .khepria-popup .leaflet-popup-close-button {
            top: 8px !important; right: 8px !important;
            font-size: 18px !important; color: #9CA3AF !important;
          }
          .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large { background: transparent !important; }
          .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div { background: transparent !important; }
        `}</style>

        <MapContainer
          center={centro}
          zoom={userPos ? 13 : 6}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClusterLayer
            negocios={negociosFiltrados}
            valPorNeg={valPorNeg}
            userPos={userPos}
            focusId={focusId}
            onReady={fn => { flyToRef.current = fn }}
          />
        </MapContainer>

        {/* Zoom controls reposicionados */}
        <div style={{ position: 'absolute', bottom: '20px', right: '14px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[{ id: 'in', label: '+' }, { id: 'out', label: '−' }].map(btn => (
            <button
              key={btn.id}
              onClick={() => {
                const map = (document.querySelector('.leaflet-container') as any)?._leaflet_map
                if (map) btn.id === 'in' ? map.zoomIn() : map.zoomOut()
              }}
              style={{ width: '36px', height: '36px', background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', fontSize: '20px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#374151' }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
