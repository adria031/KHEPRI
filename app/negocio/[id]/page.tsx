'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

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

const diasLabels: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
}
const diasOrden = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

type Negocio = {
  id: string; nombre: string; tipo: string; descripcion: string;
  telefono: string; direccion: string; ciudad: string; codigo_postal: string;
  instagram: string; whatsapp: string; facebook: string;
  logo_url: string; fotos: string[]
}
type Horario = { dia: string; abierto: boolean; hora_apertura: string; hora_cierre: string; hora_apertura2: string; hora_cierre2: string }
type Servicio = { id: string; nombre: string; duracion: number; precio: number; iva: number }

export default function FichaNegocio() {
  const params = useParams()
  const id = params?.id as string
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [fotoActiva, setFotoActiva] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('negocios').select('*').eq('id', id).single(),
      supabase.from('horarios').select('*').eq('negocio_id', id),
      supabase.from('servicios').select('*').eq('negocio_id', id).eq('activo', true)
    ]).then(([{ data: neg }, { data: hor }, { data: ser }]) => {
      if (neg) setNegocio(neg)
      if (hor) setHorarios(hor)
      if (ser) setServicios(ser)
      setCargando(false)
    })
  }, [id])

  function abrirGPS() {
    if (!negocio) return
    const dir = encodeURIComponent(`${negocio.direccion}, ${negocio.ciudad}`)
    window.open(`https://maps.google.com/?q=${dir}`, '_blank')
  }

  function formatHora(h: string) {
    if (!h) return ''
    return h.slice(0, 5)
  }

  function horarioTexto(h: Horario) {
    if (!h.abierto) return 'Cerrado'
    if (h.hora_apertura2) return `${formatHora(h.hora_apertura)}-${formatHora(h.hora_cierre)} / ${formatHora(h.hora_apertura2)}-${formatHora(h.hora_cierre2)}`
    return `${formatHora(h.hora_apertura)} - ${formatHora(h.hora_cierre)}`
  }

  const hoyDia = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][new Date().getDay()]
  const horarioHoy = horarios.find(h => h.dia === hoyDia)

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Cargando...</div>
        </div>
      </div>
    )
  }

  if (!negocio) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>Negocio no encontrado</div>
          <Link href="/cliente" style={{ color: '#1D4ED8', textDecoration: 'none', fontSize: '14px' }}>← Volver al inicio</Link>
        </div>
      </div>
    )
  }

  const fotos = negocio.fotos || []

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #F7F9FC !important; color: #111827 !important; font-family: 'Plus Jakarta Sans', sans-serif; }
        .topnav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 12px 48px; display: flex; align-items: center; justify-content: space-between; }
        .btn-cita { background: #111827; color: white; border: none; padding: 11px 22px; border-radius: 100px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn-cita:hover { background: #374151; }
        .hero { position: relative; height: 340px; background: #EDF2F8; overflow: hidden; }
        .hero img { width: 100%; height: 100%; object-fit: cover; }
        .hero-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 80px; background: linear-gradient(135deg, rgba(184,216,248,0.3), rgba(212,197,249,0.3)); }
        .fotos-nav { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; }
        .foto-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.5); border: none; cursor: pointer; padding: 0; }
        .foto-dot.active { background: white; }
        .foto-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.85); border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; }
        .foto-btn-l { left: 12px; }
        .foto-btn-r { right: 12px; }
        .container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
        .profile-header { display: flex; align-items: flex-start; gap: 20px; padding: 24px 0; border-bottom: 1px solid rgba(0,0,0,0.08); margin-bottom: 24px; }
        .logo-wrap { width: 72px; height: 72px; border-radius: 16px; border: 2px solid rgba(0,0,0,0.08); overflow: hidden; background: #F7F9FC; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; margin-top: -36px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .logo-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .profile-info { flex: 1; }
        .negocio-tipo { font-size: 12px; font-weight: 600; color: #1D4ED8; background: rgba(184,216,248,0.3); padding: 3px 10px; border-radius: 100px; display: inline-block; margin-bottom: 6px; }
        .negocio-nombre { font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 6px; }
        .negocio-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .meta-item { font-size: 13px; color: #4B5563; display: flex; align-items: center; gap: 4px; }
        .badge-abierto { background: rgba(184,237,212,0.4); color: #2E8A5E; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 700; }
        .badge-cerrado { background: rgba(0,0,0,0.06); color: #9CA3AF; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 700; }
        .grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; padding-bottom: 48px; }
        .section { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 18px; padding: 22px; margin-bottom: 16px; }
        .section-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 14px; }
        .descripcion { font-size: 14px; color: #4B5563; line-height: 1.7; }
        .servicio-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .servicio-row:last-child { border-bottom: none; }
        .servicio-nombre { font-size: 14px; font-weight: 600; color: #111827; }
        .servicio-dur { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
        .servicio-precio { font-size: 15px; font-weight: 800; color: #111827; }
        .horario-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .horario-row:last-child { border-bottom: none; }
        .horario-dia { font-size: 13px; font-weight: 600; color: #111827; }
        .horario-dia.hoy { color: #1D4ED8; }
        .horario-hora { font-size: 13px; color: #4B5563; }
        .horario-hora.cerrado { color: #9CA3AF; }
        .redes { display: flex; gap: 10px; flex-wrap: wrap; }
        .red-btn { display: flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 100px; border: 1.5px solid rgba(0,0,0,0.08); background: white; font-family: inherit; font-size: 13px; font-weight: 600; color: #111827; cursor: pointer; text-decoration: none; transition: all 0.2s; }
        .red-btn:hover { background: #F7F9FC; }
        .sticky-card { position: sticky; top: 80px; }
        .cita-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 18px; padding: 22px; margin-bottom: 16px; }
        .cita-card-title { font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 6px; }
        .cita-card-sub { font-size: 13px; color: #9CA3AF; margin-bottom: 18px; }
        .btn-pedir-cita { display: block; width: 100%; padding: 14px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; margin-bottom: 10px; }
        .btn-pedir-cita:hover { background: #374151; }
        .btn-whatsapp { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #25D366; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
        .ubicacion-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 18px; overflow: hidden; }
        .mapa-mini { background: #EDF2F8; height: 140px; display: flex; align-items: center; justify-content: center; font-size: 36px; position: relative; }
        .mapa-grid-bg { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px); background-size: 24px 24px; }
        .ubicacion-info { padding: 16px; }
        .ubicacion-dir { font-size: 13px; color: #4B5563; margin-bottom: 12px; line-height: 1.5; }
        .btn-gps { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 11px; background: #1D4ED8; color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        @media (max-width: 768px) {
          .topnav { padding: 12px 20px; }
          .hero { height: 240px; }
          .grid { grid-template-columns: 1fr; }
          .sticky-card { position: static; }
          .negocio-nombre { font-size: 22px; }
          .container { padding: 0 16px; }
          .foto-btn { width: 44px; height: 44px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav className="topnav">
        <Link href="/cliente" style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <Link href={`/negocio/${id}/reservar`} className="btn-cita">📅 Pedir cita</Link>
      </nav>

      {/* HERO FOTOS */}
      <div className="hero">
        {fotos.length > 0 ? (
          <>
            <img src={fotos[fotoActiva]} alt="Foto del local" />
            {fotos.length > 1 && (
              <>
                <button className="foto-btn foto-btn-l" onClick={() => setFotoActiva(i => (i - 1 + fotos.length) % fotos.length)}>‹</button>
                <button className="foto-btn foto-btn-r" onClick={() => setFotoActiva(i => (i + 1) % fotos.length)}>›</button>
                <div className="fotos-nav">
                  {fotos.map((_, i) => (
                    <button key={i} className={`foto-dot ${i === fotoActiva ? 'active' : ''}`} onClick={() => setFotoActiva(i)} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="hero-placeholder">🏪</div>
        )}
      </div>

      <div className="container">
        {/* HEADER */}
        <div className="profile-header">
          <div className="logo-wrap">
            {negocio.logo_url ? <img src={negocio.logo_url} alt="Logo" /> : <span>🏪</span>}
          </div>
          <div className="profile-info">
            <div className="negocio-tipo">{negocio.tipo}</div>
            <div className="negocio-nombre">{negocio.nombre}</div>
            <div className="negocio-meta">
              {negocio.ciudad && <span className="meta-item">📍 {negocio.ciudad}</span>}
              {negocio.telefono && <span className="meta-item">📞 {negocio.telefono}</span>}
              {horarioHoy && (
                <span className={horarioHoy.abierto ? 'badge-abierto' : 'badge-cerrado'}>
                  {horarioHoy.abierto ? '🟢 Abierto ahora' : '🔴 Cerrado ahora'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid">
          {/* COLUMNA IZQUIERDA */}
          <div>
            {/* DESCRIPCION */}
            {negocio.descripcion && (
              <div className="section">
                <div className="section-title">Sobre nosotros</div>
                <div className="descripcion">{negocio.descripcion}</div>
              </div>
            )}

            {/* SERVICIOS */}
            {servicios.length > 0 && (
              <div className="section">
                <div className="section-title">Servicios y precios</div>
                {servicios.map(s => (
                  <div key={s.id} className="servicio-row">
                    <div>
                      <div className="servicio-nombre">{s.nombre}</div>
                      <div className="servicio-dur">⏱ {s.duracion} min</div>
                    </div>
                    <div className="servicio-precio">€{s.precio.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* HORARIOS */}
            {horarios.length > 0 && (
              <div className="section">
                <div className="section-title">Horario</div>
                {diasOrden.map(dia => {
                  const h = horarios.find(x => x.dia === dia)
                  const esHoy = dia === hoyDia
                  return (
                    <div key={dia} className="horario-row">
                      <span className={`horario-dia ${esHoy ? 'hoy' : ''}`}>
                        {esHoy ? '→ ' : ''}{diasLabels[dia]}
                      </span>
                      <span className={`horario-hora ${!h || !h.abierto ? 'cerrado' : ''}`}>
                        {h ? horarioTexto(h) : 'Cerrado'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* REDES */}
            {(negocio.instagram || negocio.whatsapp || negocio.facebook) && (
              <div className="section">
                <div className="section-title">Encuéntranos en</div>
                <div className="redes">
                  {negocio.instagram && (
                    <a href={`https://instagram.com/${negocio.instagram.replace('@','')}`} target="_blank" className="red-btn">
                      📸 Instagram
                    </a>
                  )}
                  {negocio.whatsapp && (
                    <a href={`https://wa.me/${negocio.whatsapp.replace(/\s+/g,'').replace('+','')}`} target="_blank" className="red-btn">
                      💬 WhatsApp
                    </a>
                  )}
                  {negocio.facebook && (
                    <a href={negocio.facebook.startsWith('http') ? negocio.facebook : `https://${negocio.facebook}`} target="_blank" className="red-btn">
                      👤 Facebook
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA */}
          <div className="sticky-card">
            {/* PEDIR CITA */}
            <div className="cita-card" id="pedir-cita">
              <div className="cita-card-title">Reservar cita</div>
              <div className="cita-card-sub">Elige servicio, día y hora</div>
              <Link href={`/negocio/${id}/reservar`} className="btn-pedir-cita">📅 Pedir cita online</Link>
              {negocio.whatsapp && (
                <a href={`https://wa.me/${negocio.whatsapp.replace(/\s+/g,'').replace('+','')}`} target="_blank" className="btn-whatsapp">
                  💬 Reservar por WhatsApp
                </a>
              )}
            </div>

            {/* UBICACION */}
            {(negocio.direccion || negocio.ciudad) && (
              <div className="ubicacion-card">
                <div className="mapa-mini">
                  <div className="mapa-grid-bg"></div>
                  <span style={{position:'relative', fontSize:'36px'}}>📍</span>
                </div>
                <div className="ubicacion-info">
                  <div className="ubicacion-dir">
                    {negocio.direccion && <div>{negocio.direccion}</div>}
                    {negocio.ciudad && <div>{negocio.ciudad}{negocio.codigo_postal ? `, ${negocio.codigo_postal}` : ''}</div>}
                  </div>
                  <button className="btn-gps" onClick={abrirGPS}>
                    🗺️ Cómo llegar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}