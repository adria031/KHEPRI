'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type NegocioMapa = {
  id: string
  nombre: string
  tipo: string
  ciudad: string | null
  logo_url: string | null
  lat: number
  lng: number
}

const tipoConfig: Record<string, { emoji: string; bg: string }> = {
  peluqueria:  { emoji: '💈', bg: '#B8D8F8' },
  barberia:    { emoji: '✂️', bg: '#B8D8F8' },
  estetica:    { emoji: '💅', bg: '#FBCFE8' },
  spa:         { emoji: '💆', bg: '#D4C5F9' },
  clinica:     { emoji: '🏥', bg: '#B8EDD4' },
  yoga:        { emoji: '🧘', bg: '#B8EDD4' },
  gimnasio:    { emoji: '🏋️', bg: '#FDE68A' },
  dentista:    { emoji: '🦷', bg: '#FDE68A' },
  veterinaria: { emoji: '🐾', bg: '#B8EDD4' },
  restaurante: { emoji: '🍕', bg: '#FBCFE8' },
}
const tipoDefault = { emoji: '🏪', bg: '#E5E7EB' }

function crearIcono(tipo: string, logoUrl: string | null) {
  const cfg = tipoConfig[tipo?.toLowerCase()] || tipoDefault
  const inner = logoUrl
    ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="font-size:17px;line-height:1;">${cfg.emoji}</span>`
  return L.divIcon({
    html: `<div style="
      width:40px;height:40px;border-radius:50%;
      background:${logoUrl ? '#fff' : cfg.bg};
      border:3px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,0.2);
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;
    ">${inner}</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  })
}

export default function MapaNegocios({ negocios }: { negocios: NegocioMapa[] }) {
  return (
    <MapContainer
      center={[40.4168, -3.7038]}
      zoom={6}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {negocios.map(neg => (
        <Marker
          key={neg.id}
          position={[neg.lat, neg.lng]}
          icon={crearIcono(neg.tipo, neg.logo_url)}
        >
          <Popup>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: '160px', padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {neg.logo_url
                  ? <img src={neg.logo_url} alt={neg.nombre} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: (tipoConfig[neg.tipo?.toLowerCase()] || tipoDefault).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      {(tipoConfig[neg.tipo?.toLowerCase()] || tipoDefault).emoji}
                    </div>
                }
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#111827', lineHeight: 1.2 }}>{neg.nombre}</div>
                  {neg.ciudad && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>📍 {neg.ciudad}</div>}
                </div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: (tipoConfig[neg.tipo?.toLowerCase()] || tipoDefault).bg, color: '#4B5563', display: 'inline-block', marginBottom: '10px' }}>
                {neg.tipo}
              </div>
              <a
                href={`/negocio/${neg.id}`}
                style={{ display: 'block', textAlign: 'center', padding: '8px 12px', background: '#111827', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
              >
                Ver perfil →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
