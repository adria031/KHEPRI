'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
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
  { icon: '📅', label: 'Reservas', href: '/dashboard/reservas' },
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

type Resena = {
  id: string
  negocio_id: string
  cliente_nombre: string
  valoracion: number
  comentario: string
  respuesta: string | null
  created_at: string
}

function Estrellas({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= n ? '#FBBF24' : '#E5E7EB'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  )
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Resenas() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [resenas, setResenas] = useState<Resena[]>([])
  const [cargando, setCargando] = useState(true)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [textoRespuesta, setTextoRespuesta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState<number | 'todas'>('todas')

  useEffect(() => {
    (async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { data: neg } = await db.from('negocios').select('id').eq('user_id', user.id).single()
      if (!neg) { window.location.href = '/onboarding'; return }
      setNegocioId(neg.id)
      const { data } = await db
        .from('resenas')
        .select('*')
        .eq('negocio_id', neg.id)
        .order('created_at', { ascending: false })
      setResenas(data || [])
      setCargando(false)
    })()
  }, [])

  async function guardarRespuesta(id: string) {
    if (!textoRespuesta.trim()) return
    setGuardando(true)
    const { error } = await supabase
      .from('resenas')
      .update({ respuesta: textoRespuesta.trim() })
      .eq('id', id)
    if (!error) {
      setResenas(prev => prev.map(r => r.id === id ? { ...r, respuesta: textoRespuesta.trim() } : r))
    }
    setRespondiendo(null)
    setTextoRespuesta('')
    setGuardando(false)
  }

  async function eliminarRespuesta(id: string) {
    await supabase.from('resenas').update({ respuesta: null }).eq('id', id)
    setResenas(prev => prev.map(r => r.id === id ? { ...r, respuesta: null } : r))
  }

  function abrirRespuesta(r: Resena) {
    setRespondiendo(r.id)
    setTextoRespuesta(r.respuesta || '')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Estadísticas
  const total = resenas.length
  const media = total > 0 ? resenas.reduce((s, r) => s + r.valoracion, 0) / total : 0
  const distribucion = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: resenas.filter(r => r.valoracion === n).length,
    pct: total > 0 ? Math.round((resenas.filter(r => r.valoracion === n).length / total) * 100) : 0,
  }))

  const resenasFiltradas = filtro === 'todas' ? resenas : resenas.filter(r => r.valoracion === filtro)

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF;
          --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2);
          --yellow: #FBBF24;
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
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; position: sticky; top: 0; z-index: 30; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; }

        /* Estadísticas */
        .stats-header { display: grid; grid-template-columns: auto 1fr; gap: 20px; background: var(--white); border: 1px solid var(--border); border-radius: 18px; padding: 24px; margin-bottom: 20px; }
        .media-big { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 24px; border-right: 1px solid var(--border); min-width: 130px; }
        .media-num { font-size: 52px; font-weight: 800; color: var(--text); letter-spacing: -2px; line-height: 1; margin-bottom: 6px; }
        .media-sub { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 6px; }
        .distribucion { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
        .dist-row { display: flex; align-items: center; gap: 8px; }
        .dist-label { font-size: 12px; font-weight: 600; color: var(--text2); min-width: 14px; text-align: right; }
        .dist-bar-wrap { flex: 1; height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden; }
        .dist-bar { height: 100%; border-radius: 4px; background: #FBBF24; transition: width 0.4s ease; }
        .dist-count { font-size: 12px; color: var(--muted); min-width: 28px; text-align: right; }

        /* Filtros */
        .filtros { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
        .filtro-btn { padding: 7px 14px; border-radius: 100px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; }
        .filtro-btn.active { background: var(--text); color: white; border-color: var(--text); }

        /* Reseñas */
        .resenas-lista { display: flex; flex-direction: column; gap: 12px; }
        .resena-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .resena-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .resena-autor { font-size: 15px; font-weight: 700; color: var(--text); }
        .resena-fecha { font-size: 12px; color: var(--muted); white-space: nowrap; }
        .resena-comentario { font-size: 14px; color: var(--text2); line-height: 1.6; margin-bottom: 14px; }
        .respuesta-box { background: var(--bg); border-left: 3px solid #B8D8F8; border-radius: 0 10px 10px 0; padding: 12px 14px; margin-bottom: 10px; }
        .respuesta-label { font-size: 11px; font-weight: 700; color: var(--blue-dark); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .respuesta-texto { font-size: 13px; color: var(--text2); line-height: 1.5; }
        .resena-actions { display: flex; gap: 8px; }
        .btn-responder { padding: 7px 14px; background: var(--blue-soft); color: var(--blue-dark); border: 1.5px solid rgba(184,216,248,0.5); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-editar { padding: 7px 14px; background: var(--bg); color: var(--text2); border: 1.5px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-eliminar-resp { padding: 7px 14px; background: rgba(251,207,232,0.2); color: #B5467A; border: 1.5px solid rgba(251,207,232,0.5); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }

        /* Formulario respuesta */
        .respuesta-form { margin-top: 12px; }
        .respuesta-form textarea { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; resize: vertical; min-height: 80px; background: white; }
        .respuesta-form textarea:focus { border-color: var(--blue-dark); }
        .respuesta-form-btns { display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end; }
        .btn-cancelar { padding: 8px 16px; background: transparent; color: var(--text2); border: 1.5px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-guardar { padding: 8px 16px; background: var(--text); color: white; border: none; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-guardar:disabled { background: var(--muted); cursor: not-allowed; }

        .empty { text-align: center; padding: 60px 20px; background: var(--white); border: 1px solid var(--border); border-radius: 16px; }
        .empty-emoji { font-size: 48px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .empty-sub { font-size: 14px; color: var(--muted); }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; } .hamburger { display: flex; }
          .main { margin-left: 0; } .topbar { padding: 12px 16px; } .content { padding: 16px; }
          .stats-header { grid-template-columns: 1fr; }
          .media-big { border-right: none; border-bottom: 1px solid var(--border); padding: 0 0 18px; flex-direction: row; justify-content: flex-start; gap: 14px; min-width: unset; }
          .media-num { font-size: 40px; margin-bottom: 0; }
          .resena-header { flex-wrap: wrap; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/resenas' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
            <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Reseñas</span>
          </header>

          <main className="content">

            {/* ESTADÍSTICAS */}
            {!cargando && (
              <div className="stats-header">
                <div className="media-big">
                  <div className="media-num">{total === 0 ? '—' : media.toFixed(1)}</div>
                  <Estrellas n={Math.round(media)} size={18} />
                  <div className="media-sub">{total} reseña{total !== 1 ? 's' : ''}</div>
                </div>
                <div className="distribucion">
                  {distribucion.map(d => (
                    <div key={d.n} className="dist-row">
                      <span className="dist-label">{d.n}</span>
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="#FBBF24" style={{flexShrink:0}}>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <div className="dist-bar-wrap">
                        <div className="dist-bar" style={{width:`${d.pct}%`}} />
                      </div>
                      <span className="dist-count">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FILTROS */}
            {!cargando && total > 0 && (
              <div className="filtros">
                {(['todas', 5, 4, 3, 2, 1] as const).map(f => (
                  <button
                    key={f}
                    className={`filtro-btn ${filtro === f ? 'active' : ''}`}
                    onClick={() => setFiltro(f)}
                  >
                    {f === 'todas' ? 'Todas' : `${'⭐'.repeat(f)} ${f}`}
                  </button>
                ))}
              </div>
            )}

            {/* LISTA */}
            {cargando ? (
              <div style={{textAlign:'center', padding:'60px', color:'var(--muted)', fontSize:'14px'}}>Cargando...</div>
            ) : total === 0 ? (
              <div className="empty">
                <div className="empty-emoji">⭐</div>
                <div className="empty-title">Sin reseñas todavía</div>
                <div className="empty-sub">Las reseñas de tus clientes aparecerán aquí</div>
              </div>
            ) : resenasFiltradas.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">🔍</div>
                <div className="empty-title">Sin reseñas con {filtro} estrella{filtro !== 1 ? 's' : ''}</div>
                <div className="empty-sub"><button className="btn-editar" style={{marginTop:'8px'}} onClick={() => setFiltro('todas')}>Ver todas</button></div>
              </div>
            ) : (
              <div className="resenas-lista">
                {resenasFiltradas.map(r => (
                  <div key={r.id} className="resena-card">
                    <div className="resena-header">
                      <div>
                        <div className="resena-autor">{r.cliente_nombre}</div>
                        <div style={{marginTop:'4px'}}><Estrellas n={r.valoracion} /></div>
                      </div>
                      <span className="resena-fecha">{formatFecha(r.created_at)}</span>
                    </div>

                    {r.comentario && (
                      <p className="resena-comentario">"{r.comentario}"</p>
                    )}

                    {/* Respuesta existente */}
                    {r.respuesta && respondiendo !== r.id && (
                      <div className="respuesta-box">
                        <div className="respuesta-label">💬 Respuesta del negocio</div>
                        <div className="respuesta-texto">{r.respuesta}</div>
                      </div>
                    )}

                    {/* Formulario de respuesta */}
                    {respondiendo === r.id ? (
                      <div className="respuesta-form">
                        <textarea
                          placeholder="Escribe tu respuesta..."
                          value={textoRespuesta}
                          onChange={e => setTextoRespuesta(e.target.value)}
                          autoFocus
                        />
                        <div className="respuesta-form-btns">
                          <button className="btn-cancelar" onClick={() => { setRespondiendo(null); setTextoRespuesta('') }}>Cancelar</button>
                          <button className="btn-guardar" onClick={() => guardarRespuesta(r.id)} disabled={guardando || !textoRespuesta.trim()}>
                            {guardando ? 'Guardando...' : 'Publicar respuesta'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="resena-actions">
                        {r.respuesta ? (
                          <>
                            <button className="btn-editar" onClick={() => abrirRespuesta(r)}>✏️ Editar respuesta</button>
                            <button className="btn-eliminar-resp" onClick={() => eliminarRespuesta(r.id)}>Eliminar respuesta</button>
                          </>
                        ) : (
                          <button className="btn-responder" onClick={() => abrirRespuesta(r)}>💬 Responder</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
