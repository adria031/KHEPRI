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

type Movimiento = {
  id: string
  tipo: 'ingreso' | 'gasto'
  concepto: string
  importe: number
  created_at: string
}

function isoHoy() {
  return new Date().toLocaleDateString('en-CA')
}

export default function Caja() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [fecha, setFecha] = useState(isoHoy())

  // Formulario nuevo movimiento
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>('ingreso')
  const [concepto, setConcepto] = useState('')
  const [importe, setImporte] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Arqueo
  const [arqueoOpen, setArqueoOpen] = useState(false)
  const [efectivoReal, setEfectivoReal] = useState('')

  useEffect(() => {
    ;(async () => {
      const { session } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo, todos } = await getNegocioActivo(user.id, session.access_token)
      if (!activo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todos)
      setNegocioId(activo.id)
      setCargando(false)
    })()
  }, [])

  useEffect(() => {
    if (!negocioId) return
    cargarMovimientos()
  }, [negocioId, fecha])

  async function cargarMovimientos() {
    const { db } = await getSessionClient()
    const { data } = await db
      .from('caja')
      .select('*')
      .eq('negocio_id', negocioId)
      .eq('fecha', fecha)
      .order('created_at', { ascending: true })
    setMovimientos((data || []) as Movimiento[])
  }

  async function añadirMovimiento() {
    if (!concepto.trim() || !importe) { setError('Rellena concepto e importe.'); return }
    const imp = parseFloat(importe)
    if (isNaN(imp) || imp <= 0) { setError('El importe debe ser mayor que 0.'); return }
    if (!negocioId) return
    setGuardando(true); setError('')

    const { data, error: err } = await supabase
      .from('caja')
      .insert({ negocio_id: negocioId, fecha, tipo, concepto: concepto.trim(), importe: imp })
      .select()
      .single()

    if (err) { setError(err.message); setGuardando(false); return }
    if (data) setMovimientos(prev => [...prev, data as Movimiento])
    setConcepto(''); setImporte('')
    setGuardando(false)
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('caja').delete().eq('id', id)
    if (error) {
      console.error('[caja] eliminar error:', error.message, error.details, error.hint)
    } else {
      setMovimientos(prev => prev.filter(m => m.id !== id))
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.importe, 0)
  const totalGastos   = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.importe, 0)
  const balance       = totalIngresos - totalGastos
  const efectivoEsperado = balance
  const diferencia    = arqueoOpen && efectivoReal !== '' ? parseFloat(efectivoReal) - efectivoEsperado : null

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #F7F9FC; --white: #FFFFFF; --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2); --lila: #D4C5F9; --green: #B8EDD4; --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2); --yellow: #FDE9A2; --red: rgba(254,226,226,0.5); --red-dark: #DC2626; --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08); }
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
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; gap: 12px; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; max-width: 900px; }
        .page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 4px; }
        .page-sub { font-size: 14px; color: var(--muted); margin-bottom: 24px; }

        /* Resumen */
        .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .resumen-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 18px 20px; }
        .resumen-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .resumen-valor { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .resumen-valor.ingreso { color: var(--green-dark); }
        .resumen-valor.gasto { color: var(--red-dark); }
        .resumen-valor.balance.pos { color: var(--green-dark); }
        .resumen-valor.balance.neg { color: var(--red-dark); }

        /* Controles fecha */
        .controles { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .fecha-input { padding: 9px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: var(--white); }
        .fecha-input:focus { border-color: var(--blue-dark); }
        .btn-arqueo { padding: 9px 18px; background: var(--white); border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .btn-arqueo:hover { background: var(--bg); }

        /* Formulario añadir */
        .add-form { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 24px; }
        .add-form-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
        .tipo-btns { display: flex; gap: 8px; margin-bottom: 14px; }
        .tipo-btn { flex: 1; padding: 9px; border-radius: 10px; border: 1.5px solid var(--border); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; background: var(--white); color: var(--text2); transition: all 0.15s; }
        .tipo-btn.ingreso.active { background: var(--green-soft); border-color: var(--green-dark); color: var(--green-dark); }
        .tipo-btn.gasto.active { background: var(--red); border-color: var(--red-dark); color: var(--red-dark); }
        .add-row { display: grid; grid-template-columns: 1fr 140px auto; gap: 10px; align-items: flex-end; }
        .field label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); margin-bottom: 5px; }
        .field input { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: var(--white); -webkit-appearance: none; }
        .field input:focus { border-color: var(--blue-dark); }
        .btn-add { padding: 10px 20px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; height: 42px; }
        .btn-add:disabled { background: var(--muted); cursor: not-allowed; }
        .error-msg { background: var(--red); color: var(--red-dark); padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-top: 12px; }

        /* Lista movimientos */
        .lista { background: var(--white); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .lista-header { padding: 16px 20px; border-bottom: 1px solid var(--border); font-size: 15px; font-weight: 700; }
        .mov-row { display: flex; align-items: center; padding: 13px 20px; border-bottom: 1px solid var(--border); gap: 12px; }
        .mov-row:last-child { border-bottom: none; }
        .mov-badge { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        .mov-badge.ingreso { background: var(--green-soft); }
        .mov-badge.gasto { background: var(--red); }
        .mov-concepto { flex: 1; font-size: 14px; font-weight: 500; color: var(--text); }
        .mov-hora { font-size: 12px; color: var(--muted); }
        .mov-importe { font-size: 15px; font-weight: 700; min-width: 90px; text-align: right; }
        .mov-importe.ingreso { color: var(--green-dark); }
        .mov-importe.gasto { color: var(--red-dark); }
        .btn-del { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 16px; padding: 4px; border-radius: 6px; line-height: 1; }
        .btn-del:hover { background: var(--red); color: var(--red-dark); }
        .empty-lista { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 14px; }

        /* Modal arqueo */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border-radius: 20px; padding: 28px; width: 100%; max-width: 420px; }
        .modal-title { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
        .modal-sub { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
        .arqueo-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .arqueo-row:last-of-type { border-bottom: none; }
        .arqueo-label { color: var(--text2); font-weight: 500; }
        .arqueo-val { font-weight: 700; }
        .diferencia-pos { color: var(--green-dark); }
        .diferencia-neg { color: var(--red-dark); }
        .field-arqueo { margin: 16px 0; }
        .field-arqueo label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .field-arqueo input { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 16px; color: var(--text); outline: none; -webkit-appearance: none; }
        .field-arqueo input:focus { border-color: var(--blue-dark); }
        .modal-btns { display: flex; gap: 10px; margin-top: 20px; }
        .btn-primary { flex: 1; padding: 12px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-secondary { flex: 1; padding: 12px; background: transparent; color: var(--text2); border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .resumen { grid-template-columns: 1fr; gap: 10px; }
          .add-row { grid-template-columns: 1fr; }
          .btn-add { width: 100%; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/caja' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
            <div className="topbar-left">
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Caja</span>
            </div>
            <NegocioSelector negocios={todosNegocios} activoId={negocioId ?? ''} />
          </header>

          <main className="content">
            <div className="page-title">Gestión de caja</div>
            <div className="page-sub">Registra ingresos y gastos en efectivo del día</div>

            {cargando ? (
              <div style={{textAlign:'center', padding:'60px', color:'var(--muted)'}}>Cargando...</div>
            ) : (
              <>
                {/* Controles */}
                <div className="controles">
                  <input
                    type="date"
                    className="fecha-input"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                  />
                  <button className="btn-arqueo" onClick={() => { setEfectivoReal(''); setArqueoOpen(true) }}>
                    🧾 Arqueo de caja
                  </button>
                </div>

                {/* Resumen */}
                <div className="resumen">
                  <div className="resumen-card">
                    <div className="resumen-label">Ingresos</div>
                    <div className="resumen-valor ingreso">{fmt(totalIngresos)}</div>
                  </div>
                  <div className="resumen-card">
                    <div className="resumen-label">Gastos</div>
                    <div className="resumen-valor gasto">{fmt(totalGastos)}</div>
                  </div>
                  <div className="resumen-card">
                    <div className="resumen-label">Balance del día</div>
                    <div className={`resumen-valor balance ${balance >= 0 ? 'pos' : 'neg'}`}>{fmt(balance)}</div>
                  </div>
                </div>

                {/* Formulario añadir */}
                <div className="add-form">
                  <div className="add-form-title">Añadir movimiento</div>
                  <div className="tipo-btns">
                    <button
                      className={`tipo-btn ingreso ${tipo === 'ingreso' ? 'active' : ''}`}
                      onClick={() => setTipo('ingreso')}
                    >
                      ↑ Ingreso
                    </button>
                    <button
                      className={`tipo-btn gasto ${tipo === 'gasto' ? 'active' : ''}`}
                      onClick={() => setTipo('gasto')}
                    >
                      ↓ Gasto
                    </button>
                  </div>
                  <div className="add-row">
                    <div className="field">
                      <label>Concepto</label>
                      <input
                        type="text"
                        placeholder="Ej: Venta producto, Compra material..."
                        value={concepto}
                        onChange={e => setConcepto(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && añadirMovimiento()}
                      />
                    </div>
                    <div className="field">
                      <label>Importe (€)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={importe}
                        onChange={e => setImporte(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && añadirMovimiento()}
                      />
                    </div>
                    <button className="btn-add" onClick={añadirMovimiento} disabled={guardando}>
                      {guardando ? '...' : '+ Añadir'}
                    </button>
                  </div>
                  {error && <div className="error-msg">{error}</div>}
                </div>

                {/* Lista */}
                <div className="lista">
                  <div className="lista-header">
                    Movimientos del {new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    <span style={{color:'var(--muted)', fontWeight:500, fontSize:'13px', marginLeft:'8px'}}>({movimientos.length} registros)</span>
                  </div>
                  {movimientos.length === 0 ? (
                    <div className="empty-lista">Sin movimientos para este día.<br/>Añade el primer registro arriba.</div>
                  ) : (
                    movimientos.map(m => (
                      <div key={m.id} className="mov-row">
                        <div className={`mov-badge ${m.tipo}`}>{m.tipo === 'ingreso' ? '↑' : '↓'}</div>
                        <div style={{flex:1}}>
                          <div className="mov-concepto">{m.concepto}</div>
                          <div className="mov-hora">{new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className={`mov-importe ${m.tipo}`}>
                          {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.importe)}
                        </div>
                        <button className="btn-del" onClick={() => eliminar(m.id)} title="Eliminar">✕</button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modal arqueo */}
      {arqueoOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setArqueoOpen(false) }}>
          <div className="modal">
            <div className="modal-title">🧾 Arqueo de caja</div>
            <div className="modal-sub">Cierre del día {new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</div>

            <div className="arqueo-row">
              <span className="arqueo-label">Total ingresos</span>
              <span className="arqueo-val" style={{color:'var(--green-dark)'}}>{fmt(totalIngresos)}</span>
            </div>
            <div className="arqueo-row">
              <span className="arqueo-label">Total gastos</span>
              <span className="arqueo-val" style={{color:'var(--red-dark)'}}>{fmt(totalGastos)}</span>
            </div>
            <div className="arqueo-row">
              <span className="arqueo-label">Efectivo esperado en caja</span>
              <span className="arqueo-val">{fmt(efectivoEsperado)}</span>
            </div>

            <div className="field-arqueo">
              <label>Efectivo real contado (€)</label>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={efectivoReal}
                onChange={e => setEfectivoReal(e.target.value)}
                autoFocus
              />
            </div>

            {diferencia !== null && (
              <div style={{
                background: Math.abs(diferencia) < 0.01 ? 'rgba(184,237,212,0.3)' : diferencia > 0 ? 'rgba(184,237,212,0.3)' : 'rgba(254,226,226,0.5)',
                border: `1px solid ${Math.abs(diferencia) < 0.01 ? 'var(--green)' : diferencia > 0 ? 'var(--green)' : '#FCA5A5'}`,
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{fontSize:'14px', fontWeight:600, color: Math.abs(diferencia) < 0.01 ? 'var(--green-dark)' : diferencia > 0 ? 'var(--green-dark)' : 'var(--red-dark)'}}>
                  {Math.abs(diferencia) < 0.01 ? '✓ Caja cuadrada' : diferencia > 0 ? '⚠ Sobrante' : '⚠ Faltante'}
                </span>
                <span style={{fontSize:'16px', fontWeight:800, color: Math.abs(diferencia) < 0.01 ? 'var(--green-dark)' : diferencia > 0 ? 'var(--green-dark)' : 'var(--red-dark)'}}>
                  {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
                </span>
              </div>
            )}

            <div className="modal-btns">
              <button className="btn-secondary" onClick={() => setArqueoOpen(false)}>Cerrar</button>
              <button className="btn-primary" onClick={() => { setArqueoOpen(false) }}>Confirmar cierre</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
