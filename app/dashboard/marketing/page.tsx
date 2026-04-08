'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
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
      <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
    </div>
  )
}

const navItems = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { icon: '🏪', label: 'Mi negocio', href: '/dashboard/mi-negocio' },
  { icon: '📅', label: 'Reservas', href: '/dashboard/reservas' },
  { icon: '🔧', label: 'Servicios', href: '/dashboard/servicios' },
  { icon: '⏰', label: 'Horarios', href: '/dashboard/horarios' },
  { icon: '🛍️', label: 'Productos', href: '/dashboard/productos' },
  { icon: '👥', label: 'Equipo', href: '/dashboard/equipo' },
  { icon: '🤖', label: 'Chatbot IA', href: '/dashboard/chatbot' },
  { icon: '🧾', label: 'Facturación', href: '/dashboard/facturacion' },
  { icon: '📱', label: 'Marketing', href: '/dashboard/marketing' },
  { icon: '⭐', label: 'Reseñas', href: '/dashboard/resenas' },
]

const tips = [
  { icon: '📸', titulo: 'Añade fotos de calidad', desc: 'Los negocios con 5+ fotos reciben un 80% más de visitas. Sube imágenes del local, el equipo y los trabajos realizados.', color: 'rgba(184,216,248,0.2)', border: 'rgba(184,216,248,0.5)' },
  { icon: '⭐', titulo: 'Responde a las reseñas', desc: 'Responder a reseñas (positivas y negativas) genera confianza y mejora tu posicionamiento en búsquedas.', color: 'rgba(253,233,162,0.3)', border: 'rgba(253,233,162,0.7)' },
  { icon: '🕐', titulo: 'Mantén los horarios actualizados', desc: 'El 60% de los clientes comprueban el horario antes de reservar. Indica festivos y vacaciones con antelación.', color: 'rgba(184,237,212,0.2)', border: 'rgba(184,237,212,0.5)' },
  { icon: '💬', titulo: 'Activa el WhatsApp', desc: 'Los negocios con WhatsApp visible reciben hasta 3 veces más contactos directos de nuevos clientes.', color: 'rgba(184,237,212,0.2)', border: 'rgba(184,237,212,0.5)' },
  { icon: '🔧', titulo: 'Completa todos los servicios', desc: 'Añade duración y precio a cada servicio. Los clientes que ven precios claros reservan un 40% más.', color: 'rgba(212,197,249,0.2)', border: 'rgba(212,197,249,0.5)' },
  { icon: '📱', titulo: 'Comparte tu enlace en redes', desc: 'Pega tu enlace de reserva en la bio de Instagram y Facebook para convertir seguidores en clientes.', color: 'rgba(251,207,232,0.2)', border: 'rgba(251,207,232,0.5)' },
]

export default function Marketing() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [qrDescargando, setQrDescargando] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }
      const { data } = await supabase.from('negocios').select('id, nombre').eq('user_id', user.id).single()
      if (data) { setNegocioId(data.id); setNegocioNombre(data.nombre) }
    })()
  }, [])

  const qrRef = useRef<SVGSVGElement>(null)
  const urlPublica = negocioId ? `${typeof window !== 'undefined' ? window.location.origin : 'https://khepri.app'}/negocio/${negocioId}` : ''

  async function copiarEnlace() {
    if (!urlPublica) return
    await navigator.clipboard.writeText(urlPublica)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function compartirWhatsApp() {
    const msg = encodeURIComponent(`¡Reserva en ${negocioNombre} fácil y rápido! 📅\n${urlPublica}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  function descargarQR() {
    if (!qrRef.current || !urlPublica) return
    setQrDescargando(true)
    const svg = qrRef.current
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      const a = document.createElement('a')
      a.download = `qr-${negocioNombre.toLowerCase().replace(/\s+/g, '-')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
      setQrDescargando(false)
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }

  function imprimirQR() {
    if (!qrRef.current || !urlPublica) return
    const svg = qrRef.current.outerHTML
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head><title>QR ${negocioNombre}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        svg { width: 280px; height: 280px; }
        h2 { font-size: 22px; font-weight: bold; margin: 16px 0 6px; text-align: center; }
        p { font-size: 13px; color: #6B7280; text-align: center; word-break: break-all; max-width: 320px; }
      </style></head>
      <body onload="window.print()">${svg}<h2>${negocioNombre}</h2><p>${urlPublica}</p></body></html>
    `)
    win.document.close()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF;
          --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --green-dark: #2E8A5E;
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: var(--white); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform 0.3s ease; }
        .sidebar-logo { padding: 20px 18px; border-bottom: 1px solid var(--border); }
        .sidebar-nav { padding: 12px 10px; flex: 1; overflow-y: auto; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--text2); text-decoration: none; margin-bottom: 2px; transition: all 0.2s; }
        .nav-item:hover { background: var(--bg); color: var(--text); }
        .nav-item.active { background: var(--blue-soft); color: var(--blue-dark); font-weight: 600; }
        .nav-item-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .sidebar-footer { padding: 16px 10px; border-top: 1px solid var(--border); }
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 30; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; max-width: 900px; }

        .sec-title { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 12px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; padding: 22px; margin-bottom: 20px; }

        /* Enlace */
        .enlace-row { display: flex; align-items: center; gap: 10px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; }
        .enlace-url { flex: 1; font-size: 14px; color: var(--text2); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .btn-copiar { padding: 8px 16px; background: var(--text); color: white; border: none; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s; }
        .btn-copiar.ok { background: #2E8A5E; }
        .btns-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-outline { padding: 10px 18px; background: white; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; transition: border-color 0.15s; }
        .btn-outline:hover { border-color: var(--text); }
        .btn-outline.wa { border-color: rgba(37,211,102,0.4); color: #128C7E; }
        .btn-outline.wa:hover { background: rgba(37,211,102,0.06); border-color: #25D366; }

        /* QR */
        .qr-wrap { display: flex; align-items: flex-start; gap: 28px; flex-wrap: wrap; }
        .qr-img-box { background: white; border: 1.5px solid var(--border); border-radius: 16px; padding: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .qr-img-box img { display: block; width: 200px; height: 200px; border-radius: 4px; }
        .qr-placeholder { width: 200px; height: 200px; background: var(--bg); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 13px; }
        .qr-info { flex: 1; min-width: 200px; }
        .qr-desc { font-size: 14px; color: var(--text2); line-height: 1.6; margin-bottom: 16px; }
        .qr-btns { display: flex; flex-direction: column; gap: 8px; }

        /* Stats */
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 4px; }
        .stat-box { background: var(--bg); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
        .stat-box-icon { font-size: 24px; margin-bottom: 10px; }
        .stat-box-val { font-size: 28px; font-weight: 800; color: var(--text); letter-spacing: -1px; margin-bottom: 3px; }
        .stat-box-label { font-size: 13px; color: var(--text2); font-weight: 500; margin-bottom: 2px; }
        .stat-box-sub { font-size: 11px; color: var(--muted); }
        .mock-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #C4860A; background: rgba(253,233,162,0.4); padding: 3px 8px; border-radius: 100px; margin-top: 12px; }

        /* Tips */
        .tips-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .tip-card { border-radius: 14px; padding: 18px; border: 1.5px solid; }
        .tip-icon { font-size: 24px; margin-bottom: 10px; }
        .tip-titulo { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 5px; }
        .tip-desc { font-size: 13px; color: var(--text2); line-height: 1.55; }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; } .hamburger { display: flex; }
          .main { margin-left: 0; } .topbar { padding: 12px 16px; } .content { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .tips-grid { grid-template-columns: 1fr; }
          .qr-wrap { flex-direction: column; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/marketing' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-item-icon">{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout}><span>🚪</span> Cerrar sesión</button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Marketing</span>
          </header>

          <main className="content">

            {/* ── 1. ENLACE DE RESERVA ── */}
            <div className="sec-title">🔗 Tu enlace de reserva</div>
            <div className="card">
              <div style={{fontSize:'13px', color:'var(--muted)', marginBottom:'12px'}}>
                Comparte este enlace para que tus clientes puedan ver tu perfil y reservar online.
              </div>
              <div className="enlace-row">
                <span className="enlace-url">{urlPublica || 'Cargando...'}</span>
                <button
                  className={`btn-copiar ${copiado ? 'ok' : ''}`}
                  onClick={copiarEnlace}
                  disabled={!urlPublica}
                >
                  {copiado ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="btns-row">
                <Link href={urlPublica || '#'} target="_blank" className="btn-outline" style={{pointerEvents: urlPublica ? 'auto' : 'none'}}>
                  👁️ Ver mi perfil
                </Link>
                <button className="btn-outline wa" onClick={compartirWhatsApp} disabled={!urlPublica}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.008-1.371l-.36-.213-3.732.973.999-3.63-.234-.374A9.818 9.818 0 1112 21.818z"/>
                  </svg>
                  Compartir por WhatsApp
                </button>
              </div>
            </div>

            {/* ── 2. CÓDIGO QR ── */}
            <div className="sec-title">📱 Código QR</div>
            <div className="card">
              <div className="qr-wrap">
                <div className="qr-img-box">
                  {urlPublica
                    ? <QRCodeSVG ref={qrRef} value={urlPublica} size={200} bgColor="#ffffff" fgColor="#111827" level="M" />
                    : <div className="qr-placeholder">Cargando...</div>
                  }
                </div>
                <div className="qr-info">
                  <p className="qr-desc">
                    Imprime este código QR y ponlo en la entrada de tu local, en tarjetas de visita o en el mostrador. Tus clientes podrán escanearlo con el móvil y reservar al instante.
                  </p>
                  <div className="qr-btns">
                    <button className="btn-outline" onClick={descargarQR} disabled={!urlPublica || qrDescargando}>
                      {qrDescargando ? '⏳ Descargando...' : '⬇️ Descargar PNG'}
                    </button>
                    <button className="btn-outline" onClick={imprimirQR} disabled={!urlPublica}>
                      🖨️ Imprimir QR
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. ESTADÍSTICAS ── */}
            <div className="sec-title">📊 Estadísticas del perfil</div>
            <div className="card">
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-box-icon">👁️</div>
                  <div className="stat-box-val">—</div>
                  <div className="stat-box-label">Visitas al perfil</div>
                  <div className="stat-box-sub">Este mes</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-icon">📅</div>
                  <div className="stat-box-val">—</div>
                  <div className="stat-box-label">Reservas este mes</div>
                  <div className="stat-box-sub">Desde tu perfil</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-icon">📈</div>
                  <div className="stat-box-val">—</div>
                  <div className="stat-box-label">Tasa de conversión</div>
                  <div className="stat-box-sub">Visitas → Reservas</div>
                </div>
              </div>
              <div className="mock-badge">
                🚧 Analíticas detalladas próximamente
              </div>
            </div>

            {/* ── 4. CONSEJOS ── */}
            <div className="sec-title">💡 Consejos para mejorar tu perfil</div>
            <div className="tips-grid">
              {tips.map((tip, i) => (
                <div key={i} className="tip-card" style={{background: tip.color, borderColor: tip.border}}>
                  <div className="tip-icon">{tip.icon}</div>
                  <div className="tip-titulo">{tip.titulo}</div>
                  <div className="tip-desc">{tip.desc}</div>
                </div>
              ))}
            </div>

          </main>
        </div>
      </div>
    </>
  )
}
