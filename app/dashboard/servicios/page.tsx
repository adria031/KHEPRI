'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { dbMutation } from '../../lib/dbApi'
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

const tiposIVA = [
  { valor: 21, label: '21% General' },
  { valor: 10, label: '10% Reducido' },
  { valor: 4, label: '4% Superreducido' },
  { valor: 0, label: '0% Exento' },
]

type Servicio = {
  id?: string; nombre: string; duracion: number; precio: number; iva: number; activo: boolean
  precio_descuento: number | null; descuento_inicio: string | null; descuento_fin: string | null
}

function ofertaActiva(s: Servicio): boolean {
  if (!s.precio_descuento || !s.descuento_inicio || !s.descuento_fin) return false
  const hoy = new Date().toLocaleDateString('en-CA')
  return hoy >= s.descuento_inicio && hoy <= s.descuento_fin
}

export default function Servicios() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [form, setForm] = useState({ nombre: '', duracion: '30', precio: '', iva: '10', precio_descuento: '', descuento_inicio: '', descuento_fin: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id, session.access_token)
      if (!neg) return
      setTodosNegocios(todosNegs)
      setNegocioId(neg.id)
      const { data } = await db.from('servicios').select('*').eq('negocio_id', neg.id).order('nombre')
      setServicios(data || [])
      setCargando(false)
    })()
  }, [])

  function abrirModal(servicio?: Servicio) {
    if (servicio) {
      setEditando(servicio)
      setForm({
        nombre: servicio.nombre, duracion: String(servicio.duracion),
        precio: String(servicio.precio), iva: String(servicio.iva),
        precio_descuento: servicio.precio_descuento != null ? String(servicio.precio_descuento) : '',
        descuento_inicio: servicio.descuento_inicio || '',
        descuento_fin: servicio.descuento_fin || '',
      })
    } else {
      setEditando(null)
      setForm({ nombre: '', duracion: '30', precio: '', iva: '10', precio_descuento: '', descuento_inicio: '', descuento_fin: '' })
    }
    setError('')
    setModal(true)
  }

  async function guardar() {
    if (!form.nombre || !form.precio) { setError('Nombre y precio son obligatorios.'); return }
    setGuardando(true)
    const datos = {
      nombre: form.nombre, duracion: parseInt(form.duracion), precio: parseFloat(form.precio), iva: parseInt(form.iva),
      precio_descuento: form.precio_descuento ? parseFloat(form.precio_descuento) : null,
      descuento_inicio: form.descuento_inicio || null,
      descuento_fin: form.descuento_fin || null,
    }

    if (editando?.id) {
      const { data: upd, error } = await dbMutation({ op: 'update', table: 'servicios', id: editando.id, negocioId: negocioId!, data: datos })
      if (error || !upd) { setError(error || 'No se pudo guardar.'); setGuardando(false); return }
      setServicios(servicios.map(s => s.id === editando.id ? { ...s, ...datos } : s))
    } else {
      const { data, error } = await dbMutation({ op: 'insert', table: 'servicios', negocioId: negocioId!, data: { ...datos, negocio_id: negocioId, activo: true } })
      if (error || !data) { setError(error || 'No se pudo guardar.'); setGuardando(false); return }
      setServicios([...servicios, data as Servicio])
    }
    setModal(false)
    setGuardando(false)
  }

  async function toggleActivo(servicio: Servicio) {
    const { error } = await dbMutation({ op: 'update', table: 'servicios', id: servicio.id, negocioId: negocioId!, data: { activo: !servicio.activo } })
    if (error) return
    setServicios(servicios.map(s => s.id === servicio.id ? { ...s, activo: !s.activo } : s))
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return
    const { error } = await dbMutation({ op: 'delete', table: 'servicios', id, negocioId: negocioId! })
    if (error) { console.error('[servicios] delete:', error); return }
    setServicios(servicios.filter(s => s.id !== id))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #F7F9FC; --white: #FFFFFF; --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2); --lila: #D4C5F9; --green: #B8EDD4; --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2); --yellow: #FDE9A2; --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08); }
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
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .page-sub { font-size: 14px; color: var(--muted); margin-top: 2px; }
        .btn-nuevo { background: var(--text); color: white; border: none; padding: 10px 18px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .servicios-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .servicio-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 18px; }
        .servicio-card.inactivo { opacity: 0.5; }
        .servicio-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .servicio-nombre { font-size: 15px; font-weight: 700; color: var(--text); }
        .servicio-actions { display: flex; gap: 6px; }
        .btn-icon { background: var(--bg); border: none; border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; touch-action: manipulation; }
        @media (max-width: 768px) { .btn-icon { width: 44px; height: 44px; font-size: 18px; } }
        .servicio-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .tag { padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
        .tag-blue { background: var(--blue-soft); color: var(--blue-dark); }
        .tag-green { background: var(--green-soft); color: var(--green-dark); }
        .tag-lila { background: rgba(212,197,249,0.3); color: #6B4FD8; }
        .servicio-precio { font-size: 20px; font-weight: 800; color: var(--text); margin-bottom: 10px; letter-spacing: -0.5px; }
        .precio-original { font-size: 14px; font-weight: 600; color: var(--muted); text-decoration: line-through; margin-right: 6px; }
        .precio-oferta { font-size: 20px; font-weight: 800; color: #DC2626; letter-spacing: -0.5px; }
        .badge-oferta { display: inline-flex; align-items: center; gap: 4px; background: rgba(254,226,226,0.6); color: #DC2626; border: 1px solid #FCA5A5; border-radius: 100px; font-size: 11px; font-weight: 700; padding: 2px 8px; margin-left: 6px; vertical-align: middle; }
        .empty { text-align: center; padding: 60px 20px; background: var(--white); border: 1px solid var(--border); border-radius: 16px; }
        .empty-emoji { font-size: 48px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .empty-sub { font-size: 14px; color: var(--muted); }

        /* MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border-radius: 20px; padding: 28px; width: 100%; max-width: 440px; }
        .modal-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 20px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .field input, .field select { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; -webkit-appearance: none; }
        .field input:focus, .field select:focus { border-color: var(--blue-dark); }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .modal-btns { display: flex; gap: 10px; margin-top: 20px; }
        .btn-primary { flex: 1; padding: 12px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-secondary { flex: 1; padding: 12px; background: transparent; color: var(--text2); border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
        .error-msg { background: rgba(251,207,232,0.3); color: #B5467A; padding: 10px; border-radius: 8px; font-size: 13px; margin-top: 10px; text-align: center; }

        @media (max-width: 1024px) { .servicios-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .servicios-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/servicios' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
              <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Servicios</span>
            </div>
            <NegocioSelector negocios={todosNegocios} activoId={negocioId??''} />
          </header>

          <main className="content">
            <div className="page-header">
              <div>
                <div className="page-title">Mis servicios</div>
                <div className="page-sub">{servicios.length} servicios configurados</div>
              </div>
              <button className="btn-nuevo" onClick={() => abrirModal()}>+ Añadir servicio</button>
            </div>

            {cargando ? (
              <div style={{textAlign:'center', padding:'60px', color:'var(--muted)'}}>Cargando...</div>
            ) : servicios.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">🔧</div>
                <div className="empty-title">Sin servicios todavía</div>
                <div className="empty-sub">Añade tus primeros servicios para que los clientes puedan reservar</div>
              </div>
            ) : (
              <div className="servicios-grid">
                {servicios.map(s => (
                  <div key={s.id} className={`servicio-card ${!s.activo ? 'inactivo' : ''}`}>
                    <div className="servicio-header">
                      <div className="servicio-nombre">{s.nombre}</div>
                      <div className="servicio-actions">
                        <button className="btn-icon" onClick={() => abrirModal(s)} title="Editar">✏️</button>
                        <button className="btn-icon" onClick={() => toggleActivo(s)} title={s.activo ? 'Desactivar' : 'Activar'}>{s.activo ? '👁️' : '🙈'}</button>
                        <button className="btn-icon" onClick={() => eliminar(s.id!)} title="Eliminar">🗑️</button>
                      </div>
                    </div>
                    <div className="servicio-precio" style={{marginBottom:'10px'}}>
                      {ofertaActiva(s) ? (
                        <>
                          <span className="precio-original">€{s.precio.toFixed(2)}</span>
                          <span className="precio-oferta">€{s.precio_descuento!.toFixed(2)}</span>
                          <span className="badge-oferta">🏷 Oferta</span>
                        </>
                      ) : (
                        <>€{s.precio.toFixed(2)}{s.precio_descuento && <span className="badge-oferta" style={{opacity:0.5}}>descuento inactivo</span>}</>
                      )}
                    </div>
                    <div className="servicio-meta">
                      <span className="tag tag-blue">⏱ {s.duracion} min</span>
                      <span className="tag tag-lila">IVA {s.iva}%</span>
                      <span className="tag tag-green">Base: €{((ofertaActiva(s) ? s.precio_descuento! : s.precio) / (1 + s.iva/100)).toFixed(2)}</span>
                      {!s.activo && <span className="tag" style={{background:'rgba(0,0,0,0.06)', color:'var(--muted)'}}>Inactivo</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => { if(e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">{editando ? 'Editar servicio' : 'Nuevo servicio'}</div>
            <div className="field">
              <label>Nombre del servicio *</label>
              <input type="text" placeholder="Ej: Corte de pelo" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            </div>
            <div className="grid2">
              <div className="field">
                <label>Duración</label>
                <select value={form.duracion} onChange={e => setForm({...form, duracion: e.target.value})}>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hora</option>
                  <option value="90">1h 30min</option>
                  <option value="120">2 horas</option>
                  <option value="180">3 horas</option>
                </select>
              </div>
              <div className="field">
                <label>Precio total (con IVA) *</label>
                <input type="number" placeholder="0.00" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
              </div>
            </div>
            <div className="field">
              <label>Tipo de IVA incluido</label>
              <select value={form.iva} onChange={e => setForm({...form, iva: e.target.value})}>
                {tiposIVA.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
              </select>
            </div>
            {form.precio && (
              <div style={{background:'rgba(184,216,248,0.15)', border:'1px solid rgba(184,216,248,0.3)', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', color:'#1D4ED8', fontWeight:500}}>
                💶 Base imponible (sin IVA): <strong>€{(parseFloat(form.precio || '0') / (1 + parseInt(form.iva)/100)).toFixed(2)}</strong>
                &nbsp;·&nbsp; IVA ({form.iva}%): <strong>€{(parseFloat(form.precio || '0') - parseFloat(form.precio || '0') / (1 + parseInt(form.iva)/100)).toFixed(2)}</strong>
              </div>
            )}

            {/* ── DESCUENTO ── */}
            <div style={{borderTop:'1px solid rgba(0,0,0,0.07)', marginTop:'16px', paddingTop:'16px'}}>
              <div style={{fontSize:'13px', fontWeight:700, color:'#111827', marginBottom:'12px'}}>🏷 Precio con descuento <span style={{fontWeight:400, color:'#9CA3AF'}}>(opcional)</span></div>
              <div className="field">
                <label>Precio rebajado (€, con IVA)</label>
                <input
                  type="number" placeholder="0.00" min="0" step="0.01"
                  value={form.precio_descuento}
                  onChange={e => setForm({...form, precio_descuento: e.target.value})}
                />
              </div>
              <div className="grid2">
                <div className="field">
                  <label>Fecha inicio</label>
                  <input type="date" value={form.descuento_inicio} onChange={e => setForm({...form, descuento_inicio: e.target.value})} />
                </div>
                <div className="field">
                  <label>Fecha fin</label>
                  <input type="date" value={form.descuento_fin} onChange={e => setForm({...form, descuento_fin: e.target.value})} />
                </div>
              </div>
              {form.precio_descuento && form.precio && parseFloat(form.precio_descuento) >= parseFloat(form.precio) && (
                <div style={{background:'rgba(254,226,226,0.5)', color:'#DC2626', padding:'8px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600}}>
                  ⚠ El precio rebajado debe ser menor que el precio original.
                </div>
              )}
              {form.precio_descuento && form.precio && parseFloat(form.precio_descuento) < parseFloat(form.precio) && (
                <div style={{background:'rgba(184,237,212,0.3)', color:'#2E8A5E', padding:'8px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600}}>
                  Ahorro: €{(parseFloat(form.precio) - parseFloat(form.precio_descuento)).toFixed(2)} ({Math.round((1 - parseFloat(form.precio_descuento)/parseFloat(form.precio))*100)}% dto.)
                </div>
              )}
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="modal-btns">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}