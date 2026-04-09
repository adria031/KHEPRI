'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { NegocioSelector } from '../NegocioSelector'

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
  { icon: '📅', label: 'Reservas', href: '/dashboard/reservas', active: true },
  { icon: '🔧', label: 'Servicios', href: '/dashboard/servicios' },
  { icon: '⏰', label: 'Horarios', href: '/dashboard/horarios' },
  { icon: '🛍️', label: 'Productos', href: '/dashboard/productos' },
  { icon: '👥', label: 'Equipo', href: '/dashboard/equipo' },
  { icon: '🤖', label: 'Chatbot IA', href: '/dashboard/chatbot' },
  { icon: '🧾', label: 'Facturación', href: '/dashboard/facturacion' },
  { icon: '📱', label: 'Marketing', href: '/dashboard/marketing' },
  { icon: '⭐', label: 'Reseñas', href: '/dashboard/resenas' },
  { icon: '💰', label: 'Caja', href: '/dashboard/caja' },
]

const planLabel: Record<string, string> = {
  basico: 'Plan Básico', pro: 'Plan Pro', agencia: 'Plan Agencia'
}

type Reserva = {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  fecha: string
  hora: string
  estado: 'confirmada' | 'cancelada' | 'completada'
  servicio_id: string
  trabajador_id: string | null
  servicios: { nombre: string } | null
  trabajadores: { nombre: string } | null
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatFechaLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(y, m-1, d)
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const manana = new Date(hoy); manana.setDate(hoy.getDate()+1)
  if (fecha.getTime() === hoy.getTime()) return 'Hoy'
  if (fecha.getTime() === manana.getTime()) return 'Mañana'
  return fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

const estadoConfig = {
  confirmada:  { label: 'Confirmada',  bg: 'rgba(184,216,248,0.3)',  color: '#1D4ED8' },
  completada:  { label: 'Completada',  bg: 'rgba(184,237,212,0.3)',  color: '#2E8A5E' },
  cancelada:   { label: 'Cancelada',   bg: 'rgba(251,207,232,0.3)',  color: '#B5467A' },
}

export default function Reservas() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<{id: string, nombre: string, plan: string} | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [fecha, setFecha] = useState(hoyISO())
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/auth'; return }
      const { activo: data, todos: todosNegs } = await getNegocioActivo(user.id)
      setTodosNegocios(todosNegs)
      if (data) setNegocio(data)
    })
  }, [])

  const cargarReservas = useCallback(async () => {
    if (!negocio) return
    setCargando(true)
    const { data } = await supabase
      .from('reservas')
      .select('*, servicios(nombre), trabajadores(nombre)')
      .eq('negocio_id', negocio.id)
      .eq('fecha', fecha)
      .order('hora')
    setReservas((data as Reserva[]) || [])
    setCargando(false)
  }, [negocio, fecha])

  useEffect(() => { cargarReservas() }, [cargarReservas])

  async function cambiarEstado(id: string, estado: 'confirmada' | 'cancelada' | 'completada') {
    setActualizando(id)
    await supabase.from('reservas').update({ estado }).eq('id', id)
    setReservas(prev => prev.map(r => r.id === id ? { ...r, estado } : r))
    setActualizando(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const confirmadas = reservas.filter(r => r.estado === 'confirmada').length
  const completadas = reservas.filter(r => r.estado === 'completada').length

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF; --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --lila: #D4C5F9; --lila-dark: #6B4FD8; --lila-soft: rgba(212,197,249,0.2);
          --green: #B8EDD4; --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2);
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
        .content { padding: 24px 28px; flex: 1; }
        .page-header { margin-bottom: 20px; }
        .page-header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); margin-bottom: 4px; }
        .page-header p { font-size: 14px; color: var(--text2); }
        .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .fecha-input { padding: 9px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); background: var(--white); cursor: pointer; outline: none; }
        .fecha-input:focus { border-color: var(--blue-dark); }
        .fecha-label { font-size: 14px; font-weight: 700; color: var(--text); background: var(--white); border: 1.5px solid var(--border); border-radius: 10px; padding: 9px 16px; }
        .nav-fecha { background: none; border: 1.5px solid var(--border); border-radius: 10px; width: 36px; height: 38px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text2); }
        .stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
        .stat-mini { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; flex: 1; }
        .stat-mini-val { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .stat-mini-label { font-size: 12px; color: var(--text2); margin-top: 2px; }
        .reservas-lista { display: flex; flex-direction: column; gap: 10px; }
        .reserva-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 16px; transition: box-shadow 0.2s; }
        .reserva-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .reserva-hora { font-size: 18px; font-weight: 800; color: var(--text); min-width: 56px; letter-spacing: -0.5px; }
        .reserva-info { flex: 1; }
        .reserva-cliente { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
        .reserva-detalle { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .reserva-estado { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 100px; white-space: nowrap; }
        .reserva-actions { display: flex; gap: 8px; }
        .btn-completar { padding: 8px 14px; background: var(--green-soft); color: var(--green-dark); border: 1.5px solid rgba(184,237,212,0.6); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-completar:hover { background: rgba(184,237,212,0.5); }
        .btn-cancelar { padding: 8px 14px; background: rgba(251,207,232,0.2); color: #B5467A; border: 1.5px solid rgba(251,207,232,0.5); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-cancelar:hover { background: rgba(251,207,232,0.4); }
        .btn-restaurar { padding: 8px 14px; background: var(--blue-soft); color: var(--blue-dark); border: 1.5px solid rgba(184,216,248,0.6); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
        .empty-state-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-state-title { font-size: 16px; font-weight: 700; color: var(--text2); margin-bottom: 6px; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; } .hamburger { display: flex; }
          .main { margin-left: 0; } .topbar { padding: 12px 16px; } .content { padding: 16px; }
          .reserva-card { flex-wrap: wrap; }
          .reserva-actions { width: 100%; }
          .stats-row { gap: 8px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className={`nav-item ${'active' in item && item.active ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
              <span className="topbar-title">Reservas</span>
            </div>
            <NegocioSelector negocios={todosNegocios} activoId={negocio?.id??''} />
          </header>

          <main className="content">
            <div className="page-header">
              <h1>Reservas</h1>
              <p>Gestiona las citas de tu negocio</p>
            </div>

            {/* Navegación de fecha */}
            <div className="toolbar">
              <button className="nav-fecha" onClick={() => {
                const d = new Date(fecha); d.setDate(d.getDate()-1)
                setFecha(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
              }}>‹</button>
              <span className="fecha-label">{formatFechaLabel(fecha)}</span>
              <button className="nav-fecha" onClick={() => {
                const d = new Date(fecha); d.setDate(d.getDate()+1)
                setFecha(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
              }}>›</button>
              <input type="date" className="fecha-input" value={fecha} onChange={e => setFecha(e.target.value)} />
              {fecha !== hoyISO() && (
                <button className="nav-fecha" style={{width:'auto', padding:'0 12px', fontSize:'13px', fontWeight:600, fontFamily:'inherit'}} onClick={() => setFecha(hoyISO())}>Hoy</button>
              )}
            </div>

            {/* Estadísticas del día */}
            <div className="stats-row">
              <div className="stat-mini">
                <div className="stat-mini-val">{reservas.length}</div>
                <div className="stat-mini-label">Total reservas</div>
              </div>
              <div className="stat-mini">
                <div className="stat-mini-val" style={{color:'#1D4ED8'}}>{confirmadas}</div>
                <div className="stat-mini-label">Confirmadas</div>
              </div>
              <div className="stat-mini">
                <div className="stat-mini-val" style={{color:'#2E8A5E'}}>{completadas}</div>
                <div className="stat-mini-label">Completadas</div>
              </div>
            </div>

            {/* Lista de reservas */}
            {cargando ? (
              <div style={{textAlign:'center', padding:'40px', color:'var(--muted)', fontSize:'14px'}}>Cargando...</div>
            ) : reservas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-title">Sin reservas este día</div>
                <div style={{fontSize:'13px'}}>No hay citas para {formatFechaLabel(fecha).toLowerCase()}</div>
              </div>
            ) : (
              <div className="reservas-lista">
                {reservas.map(r => {
                  const cfg = estadoConfig[r.estado] || estadoConfig.confirmada
                  return (
                    <div key={r.id} className="reserva-card">
                      <div className="reserva-hora">{r.hora?.slice(0,5)}</div>
                      <div className="reserva-info">
                        <div className="reserva-cliente">{r.cliente_nombre}</div>
                        <div className="reserva-detalle">
                          {r.servicios?.nombre && <span>🔧 {r.servicios.nombre}</span>}
                          {r.trabajadores?.nombre && <span>👤 {r.trabajadores.nombre}</span>}
                          {r.cliente_telefono && <span>📞 {r.cliente_telefono}</span>}
                        </div>
                      </div>
                      <span className="reserva-estado" style={{background: cfg.bg, color: cfg.color}}>{cfg.label}</span>
                      <div className="reserva-actions">
                        {r.estado === 'confirmada' && (
                          <>
                            <button
                              className="btn-completar"
                              disabled={actualizando === r.id}
                              onClick={() => cambiarEstado(r.id, 'completada')}
                            >
                              ✓ Completada
                            </button>
                            <button
                              className="btn-cancelar"
                              disabled={actualizando === r.id}
                              onClick={() => cambiarEstado(r.id, 'cancelada')}
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                        {(r.estado === 'cancelada' || r.estado === 'completada') && (
                          <button
                            className="btn-restaurar"
                            disabled={actualizando === r.id}
                            onClick={() => cambiarEstado(r.id, 'confirmada')}
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
