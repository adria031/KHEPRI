'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const IVA_TIPOS = [21, 10, 4, 0]

type ReservaRaw = {
  id: string
  fecha: string
  cliente_nombre: string
  estado: string
  created_at: string
  servicios: { nombre: string; precio: number; iva: number | null } | null
}

type Factura = {
  numero: string
  fecha: string
  cliente: string
  servicio: string
  base: number
  iva_pct: number
  cuota_iva: number
  total: number
}

type FilaIva = {
  tipo: number
  base: number
  cuota: number
  total: number
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isoMes(anio: number, mes: number) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}`
}

export default function Facturacion() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [cargando, setCargando] = useState(true)

  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())

  const [facturas, setFacturas] = useState<Factura[]>([])
  const [filaIva, setFilaIva] = useState<FilaIva[]>([])
  const [facturaAbierta, setFacturaAbierta] = useState<string | null>(null)

  // Trimestre activo según mes actual
  const trimestre = Math.floor(hoy.getMonth() / 3) + 1
  const [modal303, setModal303] = useState(false)
  const [modal130, setModal130] = useState(false)

  const cargarFacturas = useCallback(async (nid: string, a: number, m: number) => {
    setCargando(true)
    const desde = `${isoMes(a, m)}-01`
    const hasta = new Date(a, m + 1, 0)
    const hastaStr = `${isoMes(a, m)}-${String(hasta.getDate()).padStart(2, '0')}`

    const { data } = await supabase
      .from('reservas')
      .select('id, fecha, cliente_nombre, estado, created_at, servicios(nombre, precio, iva)')
      .eq('negocio_id', nid)
      .eq('estado', 'completada')
      .gte('fecha', desde)
      .lte('fecha', hastaStr)
      .order('fecha', { ascending: false })

    if (!data) { setCargando(false); return }

    const rows = data as unknown as ReservaRaw[]
    const fList: Factura[] = rows.map((r, i) => {
      const precio = r.servicios?.precio ?? 0
      const ivaPct = r.servicios?.iva ?? 21
      const base = precio / (1 + ivaPct / 100)
      const cuota = precio - base
      return {
        numero: `${a}${String(m + 1).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`,
        fecha: r.fecha,
        cliente: r.cliente_nombre,
        servicio: r.servicios?.nombre ?? '—',
        base,
        iva_pct: ivaPct,
        cuota_iva: cuota,
        total: precio,
      }
    })

    // Agrupar por tipo IVA
    const grupos: Record<number, { base: number; cuota: number }> = {}
    IVA_TIPOS.forEach(t => { grupos[t] = { base: 0, cuota: 0 } })
    fList.forEach(f => {
      if (!grupos[f.iva_pct]) grupos[f.iva_pct] = { base: 0, cuota: 0 }
      grupos[f.iva_pct].base += f.base
      grupos[f.iva_pct].cuota += f.cuota_iva
    })
    const filasIva: FilaIva[] = IVA_TIPOS
      .filter(t => grupos[t].base > 0)
      .map(t => ({
        tipo: t,
        base: grupos[t].base,
        cuota: grupos[t].cuota,
        total: grupos[t].base + grupos[t].cuota,
      }))

    setFacturas(fList)
    setFilaIva(filasIva)
    setCargando(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }
      const { data: neg } = await supabase.from('negocios').select('id, nombre').eq('user_id', user.id).single()
      if (neg) {
        setNegocioId(neg.id)
        setNegocioNombre(neg.nombre)
        await cargarFacturas(neg.id, anio, mes)
      } else {
        setCargando(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (negocioId) cargarFacturas(negocioId, anio, mes)
  }, [negocioId, anio, mes, cargarFacturas])

  function prevMes() {
    if (mes === 0) { setAnio(a => a - 1); setMes(11) } else setMes(m => m - 1)
  }
  function nextMes() {
    const esHoy = anio === hoy.getFullYear() && mes === hoy.getMonth()
    if (esHoy) return
    if (mes === 11) { setAnio(a => a + 1); setMes(0) } else setMes(m => m + 1)
  }

  const totalBase = filaIva.reduce((s, f) => s + f.base, 0)
  const totalCuota = filaIva.reduce((s, f) => s + f.cuota, 0)
  const totalTotal = filaIva.reduce((s, f) => s + f.total, 0)

  // Datos trimestre para modelos
  const trimestreLabel = `T${trimestre} ${hoy.getFullYear()}`
  const mesesTrimestre = [0,1,2].map(i => MESES[(trimestre - 1) * 3 + i]).join(', ')

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
          --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --lila: #D4C5F9; --lila-dark: #6B4FD8;
          --green: #B8EDD4; --green-dark: #2E8A5E;
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: var(--white); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform 0.3s ease; }
        .sidebar-logo { padding: 20px 18px; border-bottom: 1px solid var(--border); }
        .sidebar-nav { padding: 12px 10px; flex: 1; overflow-y: auto; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--text2); text-decoration: none; margin-bottom: 2px; }
        .nav-item:hover { background: var(--bg); color: var(--text); }
        .nav-item.active { background: var(--blue-soft); color: var(--blue-dark); font-weight: 600; }
        .nav-item-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .sidebar-footer { padding: 16px 10px; border-top: 1px solid var(--border); }
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; }
        /* Navegación mes */
        .mes-nav { display: flex; align-items: center; gap: 12px; }
        .mes-nav-btn { background: var(--white); border: 1.5px solid var(--border); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; color: var(--text2); }
        .mes-nav-btn:hover:not(:disabled) { background: var(--bg); }
        .mes-nav-btn:disabled { opacity: 0.35; cursor: default; }
        .mes-label { font-size: 15px; font-weight: 700; color: var(--text); min-width: 160px; text-align: center; }
        /* Section */
        .section-block { margin-bottom: 32px; }
        .section-title { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
        .section-sub { font-size: 13px; color: var(--muted); margin-bottom: 14px; }
        /* Tabla IVA */
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
        .tabla { width: 100%; border-collapse: collapse; }
        .tabla th { padding: 11px 16px; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; text-align: right; border-bottom: 1px solid var(--border); background: var(--bg); }
        .tabla th:first-child { text-align: left; }
        .tabla td { padding: 13px 16px; font-size: 14px; color: var(--text2); text-align: right; border-bottom: 1px solid var(--border); }
        .tabla td:first-child { text-align: left; font-weight: 600; color: var(--text); }
        .tabla tr:last-child td { border-bottom: none; }
        .tabla .total-row td { background: var(--bg); font-weight: 700; color: var(--text); font-size: 14px; border-top: 2px solid var(--border); }
        .badge-iva { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 700; }
        .badge-21 { background: #EDE9FE; color: #6D28D9; }
        .badge-10 { background: #DBEAFE; color: #1D4ED8; }
        .badge-4  { background: #D1FAE5; color: #065F46; }
        .badge-0  { background: #F3F4F6; color: #6B7280; }
        .empty-state { padding: 48px; text-align: center; color: var(--muted); font-size: 14px; }
        /* Facturas */
        .factura-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
        .factura-row:last-child { border-bottom: none; }
        .factura-row:hover { background: var(--bg); }
        .factura-num { font-size: 12px; font-weight: 700; color: var(--muted); font-family: monospace; white-space: nowrap; }
        .factura-info { flex: 1; min-width: 0; }
        .factura-cliente { font-size: 14px; font-weight: 700; color: var(--text); }
        .factura-servicio { font-size: 12px; color: var(--muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .factura-fecha { font-size: 12px; color: var(--muted); white-space: nowrap; }
        .factura-total { font-size: 15px; font-weight: 800; color: var(--text); white-space: nowrap; }
        .factura-chevron { color: var(--muted); font-size: 16px; }
        /* Detalle factura (expandible) */
        .factura-detalle { background: #FAFBFC; border-bottom: 1px solid var(--border); padding: 16px 20px; }
        .det-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 14px; }
        .det-item label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
        .det-item span { font-size: 13px; font-weight: 600; color: var(--text); }
        .det-totales { display: flex; flex-direction: column; gap: 4px; padding-top: 12px; border-top: 1px solid var(--border); }
        .det-linea { display: flex; justify-content: space-between; font-size: 13px; color: var(--text2); }
        .det-linea.bold { font-weight: 800; color: var(--text); font-size: 15px; }
        .btn-pdf { display: flex; align-items: center; gap: 6px; margin-top: 14px; padding: 9px 18px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        /* Modelos fiscales */
        .modelos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .modelo-card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 12px; }
        .modelo-badge { display: inline-flex; align-items: center; gap: 8px; }
        .modelo-num { font-size: 22px; font-weight: 900; color: var(--text); letter-spacing: -1px; }
        .modelo-nombre { font-size: 13px; font-weight: 600; color: var(--text2); }
        .modelo-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }
        .modelo-meta { font-size: 12px; color: var(--blue-dark); font-weight: 600; background: var(--blue-soft); padding: 4px 10px; border-radius: 8px; display: inline-block; }
        .btn-modelo { padding: 10px 18px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 6px; margin-top: auto; }
        .btn-modelo:hover { background: var(--bg); }
        /* Modal modelos */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal { background: var(--white); border-radius: 20px; width: 100%; max-width: 480px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .modal-title { font-size: 17px; font-weight: 800; color: var(--text); }
        .modal-close { background: none; border: none; cursor: pointer; font-size: 22px; color: var(--muted); padding: 4px; line-height: 1; }
        .modal-body { padding: 20px 24px; }
        .modal-aviso { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #92400E; line-height: 1.6; margin-bottom: 16px; }
        .modal-fila { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .modal-fila:last-child { border-bottom: none; }
        .modal-fila label { color: var(--text2); }
        .modal-fila span { font-weight: 700; color: var(--text); }
        .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
        .btn-cerrar { padding: 10px 24px; border-radius: 10px; background: var(--text); color: white; border: none; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .modelos-grid { grid-template-columns: 1fr; }
          .det-grid { grid-template-columns: 1fr; }
          .tabla th, .tabla td { padding: 10px 12px; font-size: 13px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/facturacion' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
              <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Facturación</span>
            </div>
            <div className="mes-nav">
              <button className="mes-nav-btn" onClick={prevMes}>&#8249;</button>
              <span className="mes-label">{MESES[mes]} {anio}</span>
              <button className="mes-nav-btn" onClick={nextMes} disabled={anio === hoy.getFullYear() && mes === hoy.getMonth()}>&#8250;</button>
            </div>
          </header>

          <main className="content">

            {/* ── 1. RESUMEN IVA ── */}
            <div className="section-block">
              <div className="section-title">Resumen IVA</div>
              <div className="section-sub">Ingresos del mes agrupados por tipo de IVA — reservas completadas</div>
              <div className="card">
                {cargando ? (
                  <div className="empty-state">Cargando...</div>
                ) : filaIva.length === 0 ? (
                  <div className="empty-state">No hay ingresos registrados en {MESES[mes].toLowerCase()} {anio}</div>
                ) : (
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Tipo IVA</th>
                        <th>Base imponible</th>
                        <th>Cuota IVA</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filaIva.map(f => (
                        <tr key={f.tipo}>
                          <td>
                            <span className={`badge-iva badge-${f.tipo}`}>{f.tipo}%</span>
                          </td>
                          <td>{fmt(f.base)} €</td>
                          <td>{fmt(f.cuota)} €</td>
                          <td style={{fontWeight:700, color:'var(--text)'}}>{fmt(f.total)} €</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td>Total</td>
                        <td>{fmt(totalBase)} €</td>
                        <td>{fmt(totalCuota)} €</td>
                        <td>{fmt(totalTotal)} €</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── 2. FACTURAS ── */}
            <div className="section-block">
              <div className="section-title">Facturas</div>
              <div className="section-sub">Facturas generadas a partir de reservas completadas</div>
              <div className="card">
                {cargando ? (
                  <div className="empty-state">Cargando...</div>
                ) : facturas.length === 0 ? (
                  <div className="empty-state">No hay facturas en {MESES[mes].toLowerCase()} {anio}</div>
                ) : facturas.map(f => (
                  <div key={f.numero}>
                    <div className="factura-row" onClick={() => setFacturaAbierta(facturaAbierta === f.numero ? null : f.numero)}>
                      <span className="factura-num">#{f.numero}</span>
                      <div className="factura-info">
                        <div className="factura-cliente">{f.cliente}</div>
                        <div className="factura-servicio">{f.servicio}</div>
                      </div>
                      <span className="factura-fecha">{new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                      <span className="factura-total">{fmt(f.total)} €</span>
                      <span className="factura-chevron">{facturaAbierta === f.numero ? '▲' : '▼'}</span>
                    </div>
                    {facturaAbierta === f.numero && (
                      <div className="factura-detalle">
                        <div className="det-grid">
                          <div className="det-item">
                            <label>Nº Factura</label>
                            <span>{f.numero}</span>
                          </div>
                          <div className="det-item">
                            <label>Fecha</label>
                            <span>{new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</span>
                          </div>
                          <div className="det-item">
                            <label>Cliente</label>
                            <span>{f.cliente}</span>
                          </div>
                          <div className="det-item">
                            <label>Servicio</label>
                            <span>{f.servicio}</span>
                          </div>
                          <div className="det-item">
                            <label>Emisor</label>
                            <span>{negocioNombre}</span>
                          </div>
                        </div>
                        <div className="det-totales">
                          <div className="det-linea">
                            <label>Base imponible</label>
                            <span>{fmt(f.base)} €</span>
                          </div>
                          <div className="det-linea">
                            <label>IVA ({f.iva_pct}%)</label>
                            <span>{fmt(f.cuota_iva)} €</span>
                          </div>
                          <div className="det-linea bold">
                            <label>Total</label>
                            <span>{fmt(f.total)} €</span>
                          </div>
                        </div>
                        <button className="btn-pdf" onClick={() => window.print()}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                          </svg>
                          Generar PDF
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. MODELOS FISCALES ── */}
            <div className="section-block">
              <div className="section-title">Modelos fiscales</div>
              <div className="section-sub">Declaraciones trimestrales — {trimestreLabel} ({mesesTrimestre})</div>
              <div className="modelos-grid">

                <div className="modelo-card">
                  <div>
                    <div className="modelo-badge">
                      <span className="modelo-num">303</span>
                    </div>
                    <div className="modelo-nombre">IVA trimestral</div>
                  </div>
                  <div className="modelo-desc">
                    Autoliquidación del IVA. Diferencia entre el IVA repercutido a clientes y el IVA soportado en compras.
                  </div>
                  <div className="modelo-meta">Presentación: hasta 20 días tras fin del trimestre</div>
                  <button className="btn-modelo" onClick={() => setModal303(true)}>
                    <span>📋</span> Preparar modelo 303
                  </button>
                </div>

                <div className="modelo-card">
                  <div>
                    <div className="modelo-badge">
                      <span className="modelo-num">130</span>
                    </div>
                    <div className="modelo-nombre">IRPF trimestral</div>
                  </div>
                  <div className="modelo-desc">
                    Pago fraccionado del IRPF para autónomos en estimación directa. 20% del rendimiento neto del trimestre.
                  </div>
                  <div className="modelo-meta">Presentación: hasta 20 días tras fin del trimestre</div>
                  <button className="btn-modelo" onClick={() => setModal130(true)}>
                    <span>📋</span> Preparar modelo 130
                  </button>
                </div>

              </div>
            </div>

          </main>
        </div>
      </div>

      {/* ── MODAL MODELO 303 ── */}
      {modal303 && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal303(false) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Modelo 303 — {trimestreLabel}</div>
              <button className="modal-close" onClick={() => setModal303(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-aviso">
                ⚠️ Estos datos son orientativos. El cálculo definitivo requiere incluir también el IVA soportado en gastos. Consulta con tu gestor antes de presentar.
              </div>
              <div className="modal-fila">
                <label>Trimestre</label>
                <span>{trimestreLabel} ({mesesTrimestre})</span>
              </div>
              <div className="modal-fila">
                <label>Base imponible total</label>
                <span>{fmt(totalBase)} €</span>
              </div>
              <div className="modal-fila">
                <label>IVA repercutido</label>
                <span>{fmt(totalCuota)} €</span>
              </div>
              <div className="modal-fila">
                <label>IVA soportado (gastos)</label>
                <span style={{color:'var(--muted)'}}>Introduce en tu programa de contabilidad</span>
              </div>
              <div className="modal-fila">
                <label>Resultado (IVA repercutido – soportado)</label>
                <span>—</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cerrar" onClick={() => setModal303(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MODELO 130 ── */}
      {modal130 && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal130(false) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Modelo 130 — {trimestreLabel}</div>
              <button className="modal-close" onClick={() => setModal130(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-aviso">
                ⚠️ Estos datos son orientativos. El modelo 130 requiere conocer los gastos deducibles del trimestre. Consulta con tu gestor antes de presentar.
              </div>
              <div className="modal-fila">
                <label>Trimestre</label>
                <span>{trimestreLabel} ({mesesTrimestre})</span>
              </div>
              <div className="modal-fila">
                <label>Ingresos del trimestre</label>
                <span>{fmt(totalBase)} €</span>
              </div>
              <div className="modal-fila">
                <label>Gastos deducibles</label>
                <span style={{color:'var(--muted)'}}>Introduce en tu programa de contabilidad</span>
              </div>
              <div className="modal-fila">
                <label>Rendimiento neto</label>
                <span>—</span>
              </div>
              <div className="modal-fila">
                <label>Retención (20%)</label>
                <span>—</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cerrar" onClick={() => setModal130(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
