'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

function KhepriLogo({ white = false }: { white?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: white ? '#fff' : '#111827' }}>Khepri</span>
    </div>
  )
}

const navItems = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard', active: true },
  { icon: '🏪', label: 'Mi negocio', href: '/dashboard/mi-negocio', active: false },
  { icon: '📅', label: 'Reservas', href: '/dashboard/reservas', active: false },
  { icon: '🔧', label: 'Servicios', href: '/dashboard/servicios', active: false },
  { icon: '⏰', label: 'Horarios', href: '/dashboard/horarios', active: false },
  { icon: '🛍️', label: 'Productos', href: '/dashboard/productos', active: false },
  { icon: '👥', label: 'Equipo', href: '/dashboard/equipo', active: false },
  { icon: '🤖', label: 'Chatbot IA', href: '/dashboard/chatbot', active: false },
  { icon: '🧾', label: 'Facturación', href: '/dashboard/facturacion', active: false },
  { icon: '📱', label: 'Marketing', href: '/dashboard/marketing', active: false },
  { icon: '⭐', label: 'Reseñas', href: '/dashboard/resenas', active: false },
]

const planLabel: Record<string, string> = {
  basico: 'Plan Básico',
  pro: 'Plan Pro',
  agencia: 'Plan Agencia'
}

type ReservaHoy = { id: string; hora: string; cliente_nombre: string; estado: string; servicios: { nombre: string } | null }

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [negocio, setNegocio] = useState<{ id: string; nombre: string; plan: string } | null>(null)
  const [reservasHoy, setReservasHoy] = useState<number | null>(null)
  const [ingresosHoy, setIngresosHoy] = useState<number | null>(null)
  const [clientesSemana, setClientesSemana] = useState<number | null>(null)
  const [citasHoy, setCitasHoy] = useState<ReservaHoy[]>([])
  const [barrasSemana, setBarrasSemana] = useState<number[]>([])
  const [diasSemana, setDiasSemana] = useState<string[]>([])
  const [ingresosSemana, setIngresosSemana] = useState(0)

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }

      const { data: neg } = await supabase.from('negocios').select('id, nombre, plan').eq('user_id', user.id).single()
      if (!neg) return
      setNegocio(neg)

      const hoy = new Date()
      const hoyISO = isoLocal(hoy)
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
      const lunesISO = isoLocal(lunes)
      const hace6 = new Date(hoy); hace6.setDate(hoy.getDate() - 6)
      const hace6ISO = isoLocal(hace6)

      const [{ data: resHoy }, { data: resSemana }, { data: citasData }] = await Promise.all([
        supabase.from('reservas').select('estado, servicios(precio)').eq('negocio_id', neg.id).eq('fecha', hoyISO),
        supabase.from('reservas').select('fecha, estado, cliente_telefono, servicios(precio)').eq('negocio_id', neg.id).gte('fecha', hace6ISO).lte('fecha', hoyISO),
        supabase.from('reservas').select('id, hora, cliente_nombre, estado, servicios(nombre)').eq('negocio_id', neg.id).eq('fecha', hoyISO).order('hora').limit(5),
      ])

      setReservasHoy(resHoy?.length ?? 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ingHoy = (resHoy || []).filter((r: any) => r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0)
      setIngresosHoy(ingHoy)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resDesdeLunes = (resSemana || []).filter((r: any) => r.fecha >= lunesISO)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tels = new Set(resDesdeLunes.map((r: any) => r.cliente_telefono).filter(Boolean))
      setClientesSemana(tels.size)

      setCitasHoy((citasData as unknown as ReservaHoy[]) || [])

      const diasCortos = ['D','L','M','X','J','V','S']
      const porDia: number[] = []
      const labDias: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(hace6); d.setDate(hace6.getDate() + i)
        const dISO = isoLocal(d)
        labDias.push(diasCortos[d.getDay()])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ing = (resSemana || []).filter((r: any) => r.fecha === dISO && r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0)
        porDia.push(ing)
      }
      setDiasSemana(labDias)
      setIngresosSemana(porDia.reduce((s, v) => s + v, 0))
      const maxVal = Math.max(...porDia, 1)
      setBarrasSemana(porDia.map(v => v > 0 ? Math.max(Math.round((v / maxVal) * 100), 8) : 0))
    })()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF; --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --lila: #D4C5F9; --lila-dark: #6B4FD8; --lila-soft: rgba(212,197,249,0.2);
          --green: #B8EDD4; --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2);
          --yellow: #FDE9A2; --yellow-dark: #C4860A; --pink: #FBCFE8;
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
        .user-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--bg); margin-bottom: 8px; cursor: pointer; text-decoration: none; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--blue-dark); flex-shrink: 0; }
        .user-name { font-size: 13px; font-weight: 600; color: var(--text); }
        .user-plan { font-size: 11px; color: var(--muted); }
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .topbar-title { font-size: 16px; font-weight: 700; color: var(--text); }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .notif-btn { position: relative; background: var(--bg); border: none; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; }
        .notif-badge { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #EF4444; border-radius: 50%; border: 2px solid white; }
        .btn-nuevo { background: var(--text); color: white; border: none; padding: 8px 16px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .content { padding: 24px 28px; flex: 1; }
        .greeting { margin-bottom: 24px; }
        .greeting h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
        .greeting p { font-size: 14px; color: var(--text2); margin-top: 2px; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .stat-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 18px; }
        .stat-card-label { font-size: 12px; color: var(--text2); font-weight: 500; margin-bottom: 8px; }
        .stat-card-val { font-size: 26px; font-weight: 800; letter-spacing: -1px; color: var(--text); margin-bottom: 4px; }
        .stat-card-sub { font-size: 12px; font-weight: 500; }
        .stat-card-sub.up { color: var(--green-dark); }
        .stat-card-sub.neutral { color: var(--muted); }
        .stat-card-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 12px; }
        .si-b{background:var(--blue-soft);} .si-l{background:var(--lila-soft);} .si-g{background:var(--green-soft);} .si-y{background:rgba(253,233,162,0.5);}
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .grid3 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .card-title { font-size: 15px; font-weight: 700; color: var(--text); }
        .card-link { font-size: 13px; color: var(--blue-dark); font-weight: 600; text-decoration: none; }
        .chart-bars { display: flex; align-items: flex-end; gap: 8px; height: 100px; margin-top: 8px; }
        .chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .chart-bar { width: 100%; border-radius: 4px 4px 0 0; background: var(--blue); transition: all 0.3s; opacity: 0.3; }
        .chart-label { font-size: 10px; color: var(--muted); font-weight: 600; }
        .accesos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .acceso { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 14px 10px; text-align: center; text-decoration: none; transition: all 0.2s; }
        .acceso:hover { background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.07); transform: translateY(-2px); }
        .acceso-icon { font-size: 22px; margin-bottom: 6px; }
        .acceso-label { font-size: 11px; font-weight: 600; color: var(--text2); }
        @media (max-width: 1024px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } .grid3 { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; } .hamburger { display: flex; }
          .main { margin-left: 0; } .topbar { padding: 12px 16px; } .content { padding: 16px; }
          .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } .stat-card-val { font-size: 22px; }
          .grid2 { grid-template-columns: 1fr; } .grid3 { grid-template-columns: 1fr; }
          .btn-nuevo span { display: none; }
        }
        @media (max-width: 480px) { .accesos { grid-template-columns: repeat(2, 1fr); } .greeting h2 { font-size: 18px; } }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className={`nav-item ${item.active ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer">
            <Link href="/dashboard/mi-negocio" className="user-card">
              <div className="user-avatar">{negocio?.nombre?.charAt(0).toUpperCase() || '?'}</div>
              <div>
                <div className="user-name">{negocio?.nombre || 'Mi negocio'}</div>
                <div className="user-plan">{planLabel[negocio?.plan || ''] || 'Plan Básico'}</div>
              </div>
            </Link>
            <button className="logout-btn" onClick={handleLogout}>
              <span>🚪</span> Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <span className="topbar-title">{negocio?.nombre || 'Dashboard'}</span>
            </div>
            <div className="topbar-right">
              <button className="notif-btn">🔔<span className="notif-badge"></span></button>
              <button className="btn-nuevo">+ <span>Nueva reserva</span></button>
            </div>
          </header>

          <main className="content">
            <div className="greeting">
              <h2>{saludo} 👋</h2>
              <p>Bienvenido a tu panel de {negocio?.nombre || 'tu negocio'}</p>
            </div>

            <div className="stat-grid">
              <div className="stat-card"><div className="stat-card-icon si-b">💶</div><div className="stat-card-label">Ingresos hoy</div><div className="stat-card-val">{ingresosHoy === null ? '—' : `€${ingresosHoy}`}</div><div className="stat-card-sub neutral">{ingresosHoy === 0 ? 'Sin ingresos hoy' : 'De citas completadas'}</div></div>
              <div className="stat-card"><div className="stat-card-icon si-l">📅</div><div className="stat-card-label">Reservas hoy</div><div className="stat-card-val">{reservasHoy === null ? '—' : reservasHoy}</div><div className="stat-card-sub neutral">{reservasHoy === 0 ? 'Sin reservas hoy' : 'Citas programadas'}</div></div>
              <div className="stat-card"><div className="stat-card-icon si-g">👥</div><div className="stat-card-label">Clientes nuevos</div><div className="stat-card-val">{clientesSemana === null ? '—' : clientesSemana}</div><div className="stat-card-sub neutral">Esta semana</div></div>
              <div className="stat-card"><div className="stat-card-icon si-y">⭐</div><div className="stat-card-label">Valoración media</div><div className="stat-card-val">—</div><div className="stat-card-sub neutral">Sin reseñas aún</div></div>
            </div>

            <div className="grid3">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Ingresos esta semana</span>
                  <span style={{fontSize:'13px', color:'var(--text2)'}}>Total: <strong>€{ingresosSemana}</strong></span>
                </div>
                <div className="chart-bars">
                  {barrasSemana.length === 0 ? (
                    <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:'13px'}}>Sin datos aún</div>
                  ) : barrasSemana.map((h, i) => (
                    <div key={i} className="chart-col">
                      <div className="chart-bar" style={{height:`${h || 2}%`, opacity: h > 0 ? 1 : 0.2}}></div>
                      <span className="chart-label">{diasSemana[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Notificaciones</span>
                  <span style={{fontSize:'11px', background:'var(--blue-soft)', color:'var(--blue-dark)', padding:'3px 8px', borderRadius:'100px', fontWeight:700}}>0 nuevas</span>
                </div>
                <div style={{textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:'13px'}}>Sin notificaciones</div>
              </div>
            </div>

            <div className="grid2">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Citas de hoy</span>
                  <Link href="/dashboard/reservas" className="card-link">Ver todas →</Link>
                </div>
                {citasHoy.length === 0 ? (
                  <div style={{textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:'13px'}}>No tienes citas hoy</div>
                ) : (
                  <div>
                    {citasHoy.map((r, i) => {
                      const estadoColor: Record<string, {bg:string, color:string}> = {
                        confirmada: {bg:'rgba(184,216,248,0.3)', color:'#1D4ED8'},
                        completada: {bg:'rgba(184,237,212,0.3)', color:'#2E8A5E'},
                        cancelada:  {bg:'rgba(251,207,232,0.3)', color:'#B5467A'},
                      }
                      const cfg = estadoColor[r.estado] || estadoColor.confirmada
                      return (
                        <div key={r.id} style={{display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom: i < citasHoy.length-1 ? '1px solid var(--border)' : 'none'}}>
                          <span style={{fontSize:'13px', fontWeight:800, color:'var(--text)', minWidth:'44px'}}>{r.hora?.slice(0,5)}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:'13px', fontWeight:600, color:'var(--text)'}}>{r.cliente_nombre}</div>
                            {r.servicios?.nombre && <div style={{fontSize:'12px', color:'var(--muted)'}}>{r.servicios.nombre}</div>}
                          </div>
                          <span style={{fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', background:cfg.bg, color:cfg.color, whiteSpace:'nowrap'}}>{r.estado}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title">Accesos rápidos</span></div>
                <div className="accesos">
                  {[
                    {icon:'🏪', label:'Mi negocio', href:'/dashboard/mi-negocio'},
                    {icon:'📅', label:'Reservas', href:'/dashboard/reservas'},
                    {icon:'🔧', label:'Servicios', href:'/dashboard/servicios'},
                    {icon:'⏰', label:'Horarios', href:'/dashboard/horarios'},
                    {icon:'🛍️', label:'Productos', href:'/dashboard/productos'},
                    {icon:'👥', label:'Equipo', href:'/dashboard/equipo'},
                    {icon:'🧾', label:'Facturas', href:'/dashboard/facturacion'},
                    {icon:'⭐', label:'Reseñas', href:'/dashboard/resenas'},
                  ].map((a, i) => (
                    <Link key={i} href={a.href} className="acceso">
                      <div className="acceso-icon">{a.icon}</div>
                      <div className="acceso-label">{a.label}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}