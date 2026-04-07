'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Suspense } from 'react'

const MapaNegocios = dynamic(() => import('./MapaNegocios'), { ssr: false, loading: () => (
  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EDF2F8', color: '#9CA3AF', fontSize: '14px', fontWeight: 600 }}>Cargando mapa...</div>
) })

const categorias = [
  { id: 'todos', label: 'Todos', emoji: '✨' },
  { id: 'peluqueria', label: 'Peluquería', emoji: '💈' },
  { id: 'estetica', label: 'Estética', emoji: '💅' },
  { id: 'spa', label: 'Spa', emoji: '💆' },
  { id: 'clinica', label: 'Clínica', emoji: '🏥' },
  { id: 'yoga', label: 'Yoga', emoji: '🧘' },
  { id: 'gimnasio', label: 'Gimnasio', emoji: '🏋️' },
  { id: 'dentista', label: 'Dentista', emoji: '🦷' },
  { id: 'veterinaria', label: 'Veterinaria', emoji: '🐾' },
  { id: 'restaurante', label: 'Restaurante', emoji: '🍕' },
]

const tipoConfig: Record<string, { emoji: string; bg: string }> = {
  peluqueria:   { emoji: '💈', bg: 'rgba(184,216,248,0.3)' },
  barberia:     { emoji: '✂️', bg: 'rgba(184,216,248,0.3)' },
  estetica:     { emoji: '💅', bg: 'rgba(251,207,232,0.3)' },
  spa:          { emoji: '💆', bg: 'rgba(212,197,249,0.3)' },
  clinica:      { emoji: '🏥', bg: 'rgba(184,237,212,0.3)' },
  yoga:         { emoji: '🧘', bg: 'rgba(184,237,212,0.3)' },
  gimnasio:     { emoji: '🏋️', bg: 'rgba(253,233,162,0.3)' },
  dentista:     { emoji: '🦷', bg: 'rgba(253,233,162,0.3)' },
  veterinaria:  { emoji: '🐾', bg: 'rgba(184,237,212,0.3)' },
  restaurante:  { emoji: '🍕', bg: 'rgba(251,207,232,0.3)' },
}
const tipoDefault = { emoji: '🏪', bg: 'rgba(184,216,248,0.2)' }

type Negocio = { id: string; nombre: string; tipo: string; ciudad: string; logo_url: string | null; fotos: string[] | null; lat: number | null; lng: number | null }

const reservasMock = [
  { id: 1, negocio: 'Barber Co.', servicio: 'Corte + Barba', fecha: 'Mañana', hora: '10:30', emoji: '💈', color: '#B8D8F8' },
  { id: 2, negocio: 'Spa Zen', servicio: 'Masaje relajante', fecha: 'Vie 4 Abr', hora: '17:00', emoji: '💆', color: '#D4C5F9' },
]

const tabs = [
  { id: 'inicio', icon: '🏠', label: 'Inicio' },
  { id: 'mapa', icon: '🗺️', label: 'Mapa' },
  { id: 'reservas', icon: '📅', label: 'Reservas' },
  { id: 'favoritos', icon: '❤️', label: 'Favoritos' },
  { id: 'perfil', icon: '👤', label: 'Perfil' },
]

function KhepriLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>Khepri</span>
    </div>
  )
}

function ClienteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabActiva = (searchParams.get('tab') || 'inicio') as string
  const [categoriaActiva, setCategoriaActiva] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('Usuario')
  const [favs, setFavs] = useState<string[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [cargandoNegocios, setCargandoNegocios] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/auth'; return }
      if (user.user_metadata?.nombre) setNombreUsuario(user.user_metadata.nombre.split(' ')[0])
    })
    supabase.from('negocios').select('id,nombre,tipo,ciudad,logo_url,fotos,lat,lng').then(({ data }) => {
      if (data) setNegocios(data)
      setCargandoNegocios(false)
    })
  }, [])

  const irTab = useCallback((tab: string) => {
    router.push(`/cliente?tab=${tab}`)
  }, [router])

  const negociosFiltrados = negocios.filter(n => {
    const matchCat = categoriaActiva === 'todos' || n.tipo?.toLowerCase() === categoriaActiva
    const matchBusq = n.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (n.ciudad || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (n.tipo || '').toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  const toggleFav = (id: string) => setFavs(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#111827' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #F7F9FC !important; color: #111827 !important; color-scheme: light only !important; }

        .topnav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 14px 48px; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.08); }
        .topnav-links { display: flex; gap: 28px; }
        .topnav-links a { color: #111827; text-decoration: none; font-size: 14px; font-weight: 500; }
        .topnav-links a.active { color: #1D4ED8; font-weight: 700; }
        .topnav-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #1D4ED8; text-decoration: none; }

        .hero { background: #ffffff; border-bottom: 1px solid rgba(0,0,0,0.08); padding: 28px 48px; }
        .greeting { font-size: 13px; color: #9CA3AF; font-weight: 500; margin-bottom: 4px; }
        .htitle { font-size: clamp(20px, 3vw, 30px); font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 18px; }
        .searchbar { display: flex; align-items: center; gap: 10px; background: #F7F9FC; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 14px; padding: 12px 16px; }
        .searchbar input { flex: 1; border: none; background: transparent; font-family: inherit; font-size: 15px; color: #111827; outline: none; }
        .searchbar input::placeholder { color: #9CA3AF; }

        .cats { padding: 16px 48px 0; display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; }
        .cats::-webkit-scrollbar { display: none; }
        .cat { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 100px; border: 1.5px solid rgba(0,0,0,0.08); background: #ffffff; font-size: 13px; font-weight: 600; color: #4B5563; white-space: nowrap; flex-shrink: 0; text-decoration: none; }
        .cat.active { background: #1D4ED8; border-color: #1D4ED8; color: white; }

        .content { padding: 24px 48px 100px; }
        .sec-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .sec-title { font-size: 17px; font-weight: 800; color: #111827; }
        .sec-link { font-size: 13px; color: #1D4ED8; font-weight: 600; text-decoration: none; }

        .res-scroll { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; margin-bottom: 28px; }
        .res-scroll::-webkit-scrollbar { display: none; }
        .res-card { background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 16px; min-width: 200px; flex-shrink: 0; }

        .neg-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .neg-card { background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 18px; padding: 16px; }
        .neg-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
        .neg-icon { width: 50px; height: 50px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .fav-link { font-size: 20px; text-decoration: none; padding: 10px; margin: -10px; display: inline-block; line-height: 1; }

        .leaflet-popup-content-wrapper { border-radius: 14px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important; border: 1px solid rgba(0,0,0,0.08) !important; }
        .leaflet-popup-tip { display: none !important; }
        .leaflet-popup-content { margin: 12px 14px !important; }

        .res-full { background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
        .perfil-head { display: flex; align-items: center; gap: 16px; background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 18px; padding: 20px; margin-bottom: 16px; }
        .perfil-av { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg,#B8D8F8,#D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; color: #1D4ED8; flex-shrink: 0; }
        .perfil-menu { background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden; margin-bottom: 12px; }
        .perfil-item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid rgba(0,0,0,0.08); text-decoration: none; }
        .perfil-item:last-child { border-bottom: none; }

        .botnav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #ffffff; border-top: 1px solid rgba(0,0,0,0.08); z-index: 100; }
        .botnav-inner { display: flex; align-items: center; padding: 6px 0 max(6px, env(safe-area-inset-bottom)); }
        .botnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 4px; text-decoration: none; }
        .botnav-icon { font-size: 22px; line-height: 1; }
        .botnav-label { font-size: 10px; font-weight: 600; color: #9CA3AF; }
        .botnav-item.active .botnav-label { color: #1D4ED8; }
        .botnav-dot { width: 4px; height: 4px; border-radius: 50%; background: #1D4ED8; margin: 1px auto 0; }

        @media (max-width: 1024px) { .neg-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 768px) {
          .topnav { padding: 12px 20px; }
          .topnav-links { display: none; }
          .hero { padding: 16px 20px; }
          .cats { padding: 12px 20px 0; }
          .content { padding: 16px 20px 100px; }
          .neg-grid { grid-template-columns: 1fr; }
          .botnav { display: block; }
        }
        @media (max-width: 480px) { .searchbar input { font-size: 16px; } }
      `}</style>

      {/* TOP NAV */}
      <div className="topnav">
        <Link href="/" style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <div className="topnav-links">
          {tabs.slice(0,4).map(t => (
            <Link key={t.id} href={`/cliente?tab=${t.id}`} className={tabActiva === t.id ? 'active' : ''}>
              {t.label}
            </Link>
          ))}
        </div>
        <Link href="/cliente?tab=perfil" className="topnav-avatar">
          {nombreUsuario.charAt(0).toUpperCase()}
        </Link>
      </div>

      {/* MAIN */}
      <div style={{paddingTop:'62px', minHeight:'100vh', background:'#F7F9FC'}}>

        {/* ── INICIO ── */}
        {tabActiva === 'inicio' && (
          <>
            <div className="hero">
              <div className="greeting">{saludo} 👋</div>
              <div className="htitle">Hola, {nombreUsuario}. ¿Qué buscas hoy?</div>
              <div className="searchbar">
                <span style={{fontSize:'16px'}}>🔍</span>
                <input placeholder="Buscar negocios, servicios..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                {busqueda && <Link href="#" style={{color:'#9CA3AF', fontSize:'14px', textDecoration:'none'}} onClick={() => setBusqueda('')}>✕</Link>}
              </div>
            </div>

            <div className="cats">
              {categorias.map(cat => (
                <a key={cat.id} href="#" className={`cat ${categoriaActiva === cat.id ? 'active' : ''}`} onClick={e => { e.preventDefault(); setCategoriaActiva(cat.id) }}>
                  {cat.emoji} {cat.label}
                </a>
              ))}
            </div>

            <div className="content">
              {reservasMock.length > 0 && !busqueda && categoriaActiva === 'todos' && (
                <>
                  <div className="sec-header">
                    <span className="sec-title">Tus próximas citas</span>
                    <Link href="/cliente?tab=reservas" className="sec-link">Ver todas →</Link>
                  </div>
                  <div className="res-scroll">
                    {reservasMock.map(r => (
                      <div key={r.id} className="res-card">
                        <div style={{fontSize:'22px', marginBottom:'8px'}}>{r.emoji}</div>
                        <div style={{fontSize:'13px', fontWeight:700, color:'#111827', marginBottom:'2px'}}>{r.negocio}</div>
                        <div style={{fontSize:'12px', color:'#9CA3AF', marginBottom:'8px'}}>{r.servicio}</div>
                        <div style={{fontSize:'11px', fontWeight:600, padding:'4px 9px', borderRadius:'7px', background: r.color+'40', color:'#111827', display:'inline-flex', alignItems:'center', gap:'4px'}}>
                          📅 {r.fecha} · {r.hora}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="sec-header">
                <span className="sec-title">
                  {busqueda ? `"${busqueda}"` : categoriaActiva === 'todos' ? 'Cerca de ti' : categorias.find(c => c.id === categoriaActiva)?.label}
                </span>
                <Link href="/cliente?tab=mapa" className="sec-link">Ver mapa →</Link>
              </div>

              {cargandoNegocios ? (
                <div style={{textAlign:'center', padding:'60px 20px', color:'#9CA3AF', fontSize:'14px'}}>Cargando negocios...</div>
              ) : negociosFiltrados.length === 0 ? (
                <div style={{textAlign:'center', padding:'60px 20px'}}>
                  <div style={{fontSize:'48px', marginBottom:'12px'}}>🔍</div>
                  <div style={{fontSize:'16px', fontWeight:700, color:'#111827', marginBottom:'6px'}}>Sin resultados</div>
                  <div style={{fontSize:'13px', color:'#9CA3AF'}}>Prueba con otro término</div>
                </div>
              ) : (
                <div className="neg-grid">
                  {negociosFiltrados.map(n => {
                    const cfg = tipoConfig[n.tipo?.toLowerCase()] || tipoDefault
                    const imagen = n.logo_url || (n.fotos && n.fotos[0]) || null
                    return (
                      <Link key={n.id} href={`/negocio/${n.id}`} style={{textDecoration:'none'}}>
                        <div className="neg-card">
                          <div className="neg-top">
                            <div className="neg-icon" style={{background: cfg.bg, overflow:'hidden', padding: imagen ? 0 : undefined}}>
                              {imagen
                                ? <img src={imagen} alt={n.nombre} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'13px'}} />
                                : cfg.emoji}
                            </div>
                            <a href="#" className="fav-link" onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(n.id) }}>
                              {favs.includes(n.id) ? '❤️' : '🤍'}
                            </a>
                          </div>
                          <div style={{fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'3px'}}>{n.nombre}</div>
                          <div style={{fontSize:'12px', color:'#9CA3AF', marginBottom:'8px', lineHeight:1.4}}>
                            {n.ciudad ? `📍 ${n.ciudad}` : n.tipo}
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap'}}>
                            <span style={{fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'100px', background: cfg.bg, color:'#4B5563'}}>
                              {n.tipo}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── MAPA ── */}
        {tabActiva === 'mapa' && (
          <div style={{display:'flex', flexDirection:'column', height:'calc(100vh - 62px)'}}>
            <div style={{padding:'16px 20px 12px', background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.08)', flexShrink:0}}>
              <div style={{fontSize:'18px', fontWeight:800, color:'#111827', marginBottom:'2px'}}>Mapa de negocios</div>
              <div style={{fontSize:'13px', color:'#9CA3AF'}}>
                {negocios.filter(n => n.lat && n.lng).length} negocios en el mapa
              </div>
            </div>
            <div style={{flex:1, position:'relative'}}>
              <MapaNegocios
                negocios={negocios
                  .filter(n => n.lat != null && n.lng != null)
                  .map(n => ({ id: n.id, nombre: n.nombre, tipo: n.tipo, ciudad: n.ciudad, logo_url: n.logo_url, lat: n.lat!, lng: n.lng! }))
                }
              />
            </div>
          </div>
        )}

        {/* ── RESERVAS ── */}
        {tabActiva === 'reservas' && (
          <div className="content">
            <div style={{fontSize:'22px', fontWeight:800, color:'#111827', marginBottom:'4px'}}>Mis reservas</div>
            <div style={{fontSize:'14px', color:'#9CA3AF', marginBottom:'16px'}}>Tus citas próximas</div>
            {reservasMock.map(r => (
              <div key={r.id} className="res-full">
                <div style={{width:'46px', height:'46px', borderRadius:'12px', background: r.color+'40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0}}>{r.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'2px'}}>{r.negocio}</div>
                  <div style={{fontSize:'13px', color:'#9CA3AF', marginBottom:'4px'}}>{r.servicio}</div>
                  <div style={{fontSize:'12px', fontWeight:600, color:'#1D4ED8'}}>📅 {r.fecha} · {r.hora}</div>
                </div>
                <span style={{fontSize:'18px', color:'#9CA3AF'}}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* ── FAVORITOS ── */}
        {tabActiva === 'favoritos' && (
          <div className="content">
            <div style={{fontSize:'22px', fontWeight:800, color:'#111827', marginBottom:'4px'}}>Mis favoritos</div>
            <div style={{fontSize:'14px', color:'#9CA3AF', marginBottom:'16px'}}>Negocios guardados</div>
            {favs.length === 0 ? (
              <div style={{textAlign:'center', padding:'60px 20px'}}>
                <div style={{fontSize:'48px', marginBottom:'12px'}}>❤️</div>
                <div style={{fontSize:'16px', fontWeight:700, color:'#111827', marginBottom:'6px'}}>Sin favoritos</div>
                <div style={{fontSize:'13px', color:'#9CA3AF'}}>Pulsa el corazón para guardar</div>
              </div>
            ) : (
              <div className="neg-grid">
                {negocios.filter(n => favs.includes(n.id)).map(n => {
                  const cfg = tipoConfig[n.tipo?.toLowerCase()] || tipoDefault
                  const imagen = n.logo_url || (n.fotos && n.fotos[0]) || null
                  return (
                    <Link key={n.id} href={`/negocio/${n.id}`} style={{textDecoration:'none'}}>
                      <div className="neg-card">
                        <div className="neg-top">
                          <div className="neg-icon" style={{background: cfg.bg, overflow:'hidden', padding: imagen ? 0 : undefined}}>
                            {imagen
                              ? <img src={imagen} alt={n.nombre} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'13px'}} />
                              : cfg.emoji}
                          </div>
                          <a href="#" className="fav-link" onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(n.id) }}>❤️</a>
                        </div>
                        <div style={{fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'3px'}}>{n.nombre}</div>
                        <div style={{fontSize:'12px', color:'#9CA3AF', marginBottom:'8px'}}>
                          {n.ciudad ? `📍 ${n.ciudad}` : n.tipo}
                        </div>
                        <span style={{fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'100px', background: cfg.bg, color:'#4B5563'}}>
                          {n.tipo}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PERFIL ── */}
        {tabActiva === 'perfil' && (
          <div className="content">
            <div className="perfil-head">
              <div className="perfil-av">{nombreUsuario.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{fontSize:'19px', fontWeight:800, color:'#111827', marginBottom:'3px'}}>{nombreUsuario}</div>
                <div style={{fontSize:'13px', color:'#9CA3AF'}}>Cliente de Khepri</div>
              </div>
            </div>
            <div className="perfil-menu">
              {[
                { icon: '📅', label: 'Mis reservas', bg: 'rgba(184,216,248,0.3)', tab: 'reservas' },
                { icon: '❤️', label: 'Mis favoritos', bg: 'rgba(251,207,232,0.3)', tab: 'favoritos' },
                { icon: '⭐', label: 'Mis reseñas', bg: 'rgba(253,233,162,0.3)', tab: '' },
                { icon: '🎁', label: 'Mis puntos y cupones', bg: 'rgba(184,237,212,0.3)', tab: '' },
                { icon: '🔔', label: 'Notificaciones', bg: 'rgba(212,197,249,0.3)', tab: '' },
                { icon: '⚙️', label: 'Configuración', bg: 'rgba(0,0,0,0.06)', tab: '' },
              ].map((item, i) => (
                <Link key={i} href={item.tab ? `/cliente?tab=${item.tab}` : '#'} className="perfil-item" style={{textDecoration:'none'}}>
                  <div style={{width:'34px', height:'34px', borderRadius:'9px', background: item.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0}}>{item.icon}</div>
                  <span style={{fontSize:'14px', fontWeight:600, color:'#111827', flex:1}}>{item.label}</span>
                  <span style={{color:'#9CA3AF', fontSize:'18px'}}>›</span>
                </Link>
              ))}
            </div>
            <a
              href="/"
              style={{display:'block', width:'100%', padding:'14px', background:'rgba(239,68,68,0.08)', color:'#DC2626', borderRadius:'14px', fontSize:'15px', fontWeight:700, textAlign:'center', textDecoration:'none'}}
              onClick={async (e) => { e.preventDefault(); await supabase.auth.signOut(); window.location.href = '/' }}
            >
              Cerrar sesión
            </a>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="botnav">
        <div className="botnav-inner">
          {tabs.map(tab => (
            <Link key={tab.id} href={`/cliente?tab=${tab.id}`} className={`botnav-item ${tabActiva === tab.id ? 'active' : ''}`}>
              <span className="botnav-icon">{tab.icon}</span>
              <span className="botnav-label">{tab.label}</span>
              {tabActiva === tab.id && <div className="botnav-dot"></div>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Cliente() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', background:'#F7F9FC', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Plus Jakarta Sans, sans-serif', color:'#9CA3AF'}}>Cargando...</div>}>
      <ClienteContent />
    </Suspense>
  )
}