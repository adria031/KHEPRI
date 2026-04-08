'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'adria.gaitan.sola@gmail.com'

// Precios estimados por plan (EUR/mes) — ajustar cuando se fijen
const PRECIO_PLAN: Record<string, number> = { basico: 29, pro: 59, agencia: 99 }
// Coste estimado Gemini por mensaje (USD) — gemini-1.5-flash ~$0.00015 / 1k tokens, ~800 tokens/msg
const COSTE_GEMINI_POR_MSG = 0.00012

type Negocio = {
  id: string
  nombre: string
  tipo: string
  plan: string
  ciudad: string
  created_at: string
  suspendido: boolean | null
  user_id: string
}

type Cliente = {
  id: string
  nombre: string
  ciudad: string | null
  created_at: string
  email: string | null
}

type Reserva = {
  negocio_id: string
  created_at: string
}

export default function Admin() {
  const [cargando, setCargando] = useState(true)
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [msgsPorNegocio, setMsgsPorNegocio] = useState<Record<string, number>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tabActiva, setTabActiva] = useState<'overview' | 'negocios' | 'clientes'>('overview')
  const [busqNeg, setBusqNeg] = useState('')
  const [busqCli, setBusqCli] = useState('')
  const [filtroPlan, setFiltroPlan] = useState('todos')
  const [cambiandoPlan, setCambiandoPlan] = useState<string | null>(null)
  const [planModal, setPlanModal] = useState<{ id: string; nombre: string; planActual: string } | null>(null)
  const [planNuevo, setPlanNuevo] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }
      if (user.email !== ADMIN_EMAIL) { window.location.href = '/dashboard'; return }

      // Cargar negocios con emails de los dueños
      const { data: negs } = await supabase
        .from('negocios')
        .select('id, nombre, tipo, plan, ciudad, created_at, suspendido, user_id')
        .order('created_at', { ascending: false })

      // Cargar clientes con emails desde profiles
      const { data: clis } = await supabase
        .from('clientes')
        .select('id, nombre, ciudad, created_at, user_id')
        .order('created_at', { ascending: false })

      // Cargar emails de clientes desde profiles
      let clientesConEmail: Cliente[] = []
      if (clis && clis.length > 0) {
        const userIds = clis.map((c: any) => c.user_id).filter(Boolean)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)
        const emailMap: Record<string, string> = {}
        if (profiles) profiles.forEach((p: any) => { emailMap[p.id] = p.email })
        clientesConEmail = clis.map((c: any) => ({
          id: c.id, nombre: c.nombre, ciudad: c.ciudad, created_at: c.created_at,
          email: emailMap[c.user_id] || null
        }))
      }

      // Estimar consumo Gemini: usar reservas como proxy de actividad
      // (cada reserva = ~3 mensajes promedio al chatbot)
      const { data: reservas } = await supabase
        .from('reservas')
        .select('negocio_id, created_at')

      const msgsMap: Record<string, number> = {}
      if (reservas) {
        reservas.forEach((r: any) => {
          msgsMap[r.negocio_id] = (msgsMap[r.negocio_id] || 0) + 3
        })
      }

      setNegocios((negs as Negocio[]) || [])
      setClientes(clientesConEmail)
      setMsgsPorNegocio(msgsMap)
      setCargando(false)
    })()
  }, [])

  async function cambiarPlan(negId: string, nuevoPlan: string) {
    setCambiandoPlan(negId)
    await supabase.from('negocios').update({ plan: nuevoPlan }).eq('id', negId)
    setNegocios(prev => prev.map(n => n.id === negId ? { ...n, plan: nuevoPlan } : n))
    setCambiandoPlan(null)
    setPlanModal(null)
  }

  async function toggleSuspender(neg: Negocio) {
    const nuevo = !neg.suspendido
    await supabase.from('negocios').update({ suspendido: nuevo }).eq('id', neg.id)
    setNegocios(prev => prev.map(n => n.id === neg.id ? { ...n, suspendido: nuevo } : n))
  }

  // ── Stats ──
  const totalNegocios = negocios.length
  const totalClientes = clientes.length
  const porPlan = { basico: 0, pro: 0, agencia: 0 }
  negocios.forEach(n => { if (n.plan in porPlan) porPlan[n.plan as keyof typeof porPlan]++ })
  const ingresosMes = Object.entries(porPlan).reduce((s, [p, c]) => s + (PRECIO_PLAN[p] || 0) * c, 0)
  const totalMsgs = Object.values(msgsPorNegocio).reduce((s, v) => s + v, 0)
  const costeGeminiTotal = (totalMsgs * COSTE_GEMINI_POR_MSG).toFixed(2)

  const negociosFiltrados = negocios.filter(n => {
    const matchPlan = filtroPlan === 'todos' || n.plan === filtroPlan
    const matchBusq = !busqNeg || n.nombre.toLowerCase().includes(busqNeg.toLowerCase()) || n.ciudad?.toLowerCase().includes(busqNeg.toLowerCase())
    return matchPlan && matchBusq
  })

  const clientesFiltrados = clientes.filter(c =>
    !busqCli || c.nombre?.toLowerCase().includes(busqCli.toLowerCase()) || c.email?.toLowerCase().includes(busqCli.toLowerCase())
  )

  function fmtFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function planBadge(plan: string) {
    const cfg: Record<string, { bg: string; color: string; label: string }> = {
      basico:  { bg: 'rgba(184,216,248,0.25)', color: '#1D4ED8', label: 'Básico' },
      pro:     { bg: 'rgba(212,197,249,0.25)', color: '#6B4FD8', label: 'Pro' },
      agencia: { bg: 'rgba(184,237,212,0.25)', color: '#2E8A5E', label: 'Agencia' },
    }
    const c = cfg[plan] || { bg: 'rgba(0,0,0,0.06)', color: '#6B7280', label: plan }
    return <span style={{ background: c.bg, color: c.color, fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{c.label}</span>
  }

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', fontFamily: 'Plus Jakarta Sans, sans-serif', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
            <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
            <circle cx="11" cy="11" r="2" fill="white"/>
          </svg>
        </div>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Cargando panel admin...</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0F172A; color: #F1F5F9; }

        /* ── Layout ── */
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: #1E293B; border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform 0.3s; }
        .sidebar-logo { padding: 20px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 10px; }
        .admin-badge { background: linear-gradient(135deg, #F59E0B, #EF4444); color: white; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 100px; letter-spacing: 0.5px; text-transform: uppercase; }
        .sidebar-nav { padding: 12px 10px; flex: 1; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 500; color: #94A3B8; cursor: pointer; margin-bottom: 2px; transition: all 0.2s; background: none; border: none; width: 100%; text-align: left; font-family: inherit; }
        .nav-item:hover { background: rgba(255,255,255,0.06); color: #F1F5F9; }
        .nav-item.active { background: rgba(251,191,36,0.12); color: #F59E0B; font-weight: 600; }
        .nav-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .sidebar-footer { padding: 16px 10px; border-top: 1px solid rgba(255,255,255,0.06); }
        .user-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.04); margin-bottom: 8px; }
        .user-av { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #F59E0B, #EF4444); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; flex-shrink: 0; }
        .user-name { font-size: 13px; font-weight: 600; color: #F1F5F9; }
        .user-sub { font-size: 11px; color: #64748B; }
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: #94A3B8; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .logout-btn:hover { background: rgba(239,68,68,0.1); color: #F87171; border-color: rgba(239,68,68,0.3); }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 40; }

        /* ── Main ── */
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: #1E293B; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; color: #94A3B8; font-size: 20px; }
        .topbar-title { font-size: 15px; font-weight: 700; color: #F1F5F9; }
        .topbar-sub { font-size: 12px; color: #64748B; margin-top: 1px; }
        .content { padding: 24px 28px; flex: 1; }

        /* ── Stats ── */
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
        .stat-card { background: #1E293B; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 18px; }
        .stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 12px; }
        .stat-label { font-size: 12px; color: #64748B; font-weight: 500; margin-bottom: 6px; }
        .stat-val { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #F1F5F9; margin-bottom: 4px; }
        .stat-sub { font-size: 12px; font-weight: 500; color: #64748B; }

        /* ── Planes breakdown ── */
        .planes-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
        .plan-box { background: #1E293B; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 18px; }
        .plan-box-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .plan-box-name { font-size: 14px; font-weight: 700; color: #F1F5F9; }
        .plan-box-count { font-size: 26px; font-weight: 800; color: #F1F5F9; }
        .plan-box-ing { font-size: 13px; color: #64748B; margin-top: 4px; }
        .plan-box-bar { height: 4px; border-radius: 100px; background: rgba(255,255,255,0.08); margin-top: 14px; overflow: hidden; }
        .plan-box-fill { height: 100%; border-radius: 100px; transition: width 0.5s; }

        /* ── Tables ── */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
        .section-title { font-size: 16px; font-weight: 700; color: #F1F5F9; }
        .section-count { font-size: 13px; color: #64748B; font-weight: 500; }
        .filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .search-input { padding: 8px 12px; background: #1E293B; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-family: inherit; font-size: 13px; color: #F1F5F9; outline: none; width: 200px; }
        .search-input::placeholder { color: #475569; }
        .search-input:focus { border-color: #F59E0B; }
        .filter-btn { padding: 7px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1E293B; font-family: inherit; font-size: 12px; font-weight: 600; color: #94A3B8; cursor: pointer; transition: all 0.2s; }
        .filter-btn.active { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); color: #F59E0B; }
        .table-wrap { background: #1E293B; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; margin-bottom: 28px; }
        table { width: 100%; border-collapse: collapse; }
        thead th { padding: 12px 16px; font-size: 11px; font-weight: 700; color: #475569; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06); }
        tbody td { padding: 13px 16px; font-size: 13px; color: #CBD5E1; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: rgba(255,255,255,0.02); }
        .cell-name { font-weight: 600; color: #F1F5F9; }
        .cell-sub { font-size: 11px; color: #475569; margin-top: 1px; }
        .suspended-row td { opacity: 0.45; }

        /* ── Action buttons ── */
        .btn-plan { padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); font-family: inherit; font-size: 11px; font-weight: 600; color: #94A3B8; cursor: pointer; transition: all 0.2s; }
        .btn-plan:hover { border-color: #F59E0B; color: #F59E0B; background: rgba(251,191,36,0.08); }
        .btn-suspend { padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); font-family: inherit; font-size: 11px; font-weight: 600; color: #94A3B8; cursor: pointer; transition: all 0.2s; }
        .btn-suspend:hover { border-color: #EF4444; color: #F87171; background: rgba(239,68,68,0.08); }
        .btn-reactivar { padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); font-family: inherit; font-size: 11px; font-weight: 600; color: #4ADE80; cursor: pointer; transition: all 0.2s; }
        .btn-reactivar:hover { background: rgba(34,197,94,0.15); }
        .suspended-badge { background: rgba(239,68,68,0.15); color: #F87171; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px; }
        .gemini-bar { height: 6px; background: rgba(212,197,249,0.15); border-radius: 3px; width: 80px; overflow: hidden; }
        .gemini-fill { height: 100%; background: linear-gradient(90deg, #D4C5F9, #6B4FD8); border-radius: 3px; }
        .gemini-val { font-size: 11px; color: #94A3B8; margin-top: 3px; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #1E293B; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 28px; width: 100%; max-width: 400px; }
        .modal h3 { font-size: 18px; font-weight: 800; color: #F1F5F9; margin-bottom: 6px; }
        .modal-sub { font-size: 13px; color: #64748B; margin-bottom: 20px; }
        .plan-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .plan-option { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border: 1.5px solid rgba(255,255,255,0.08); border-radius: 12px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02); }
        .plan-option.selected { border-color: #F59E0B; background: rgba(251,191,36,0.08); }
        .plan-option:hover { border-color: rgba(251,191,36,0.4); }
        .plan-option-name { font-size: 14px; font-weight: 700; color: #F1F5F9; }
        .plan-option-price { font-size: 12px; color: #64748B; margin-top: 1px; }
        .modal-btns { display: flex; gap: 8px; }
        .modal-btn-cancel { flex: 1; padding: 11px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; color: #94A3B8; cursor: pointer; }
        .modal-btn-confirm { flex: 1; padding: 11px; background: #F59E0B; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; color: #0F172A; cursor: pointer; transition: opacity 0.2s; }
        .modal-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Responsive ── */
        @media (max-width: 1024px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } .planes-row { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; } .hamburger { display: block; }
          .main { margin-left: 0; } .topbar { padding: 12px 16px; } .content { padding: 16px; }
          .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .search-input { width: 150px; }
          table { font-size: 12px; }
          thead th, tbody td { padding: 10px 12px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Plan modal ── */}
      {planModal && (
        <div className="modal-overlay" onClick={() => setPlanModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Cambiar plan</h3>
            <p className="modal-sub">{planModal.nombre}</p>
            <div className="plan-options">
              {[
                { id: 'basico', nombre: 'Básico', precio: `${PRECIO_PLAN.basico} €/mes` },
                { id: 'pro',    nombre: 'Pro',    precio: `${PRECIO_PLAN.pro} €/mes` },
                { id: 'agencia',nombre: 'Agencia',precio: `${PRECIO_PLAN.agencia} €/mes` },
              ].map(p => (
                <div
                  key={p.id}
                  className={`plan-option ${planNuevo === p.id ? 'selected' : ''}`}
                  onClick={() => setPlanNuevo(p.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div className="plan-option-name">{p.nombre}</div>
                    <div className="plan-option-price">{p.precio} estimado</div>
                  </div>
                  {planModal.planActual === p.id && (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Actual</span>
                  )}
                  {planNuevo === p.id && planModal.planActual !== p.id && (
                    <span style={{ fontSize: '16px' }}>✓</span>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-btns">
              <button className="modal-btn-cancel" onClick={() => setPlanModal(null)}>Cancelar</button>
              <button
                className="modal-btn-confirm"
                disabled={!planNuevo || planNuevo === planModal.planActual || cambiandoPlan === planModal.id}
                onClick={() => cambiarPlan(planModal.id, planNuevo)}
              >
                {cambiandoPlan === planModal.id ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg, #F59E0B, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#F1F5F9', letterSpacing: '-0.3px' }}>Khepria</div>
              <div className="admin-badge">Admin</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {([
              { id: 'overview', icon: '📊', label: 'Resumen' },
              { id: 'negocios', icon: '🏢', label: `Negocios (${totalNegocios})` },
              { id: 'clientes', icon: '👥', label: `Clientes (${totalClientes})` },
            ] as const).map(item => (
              <button
                key={item.id}
                className={`nav-item ${tabActiva === item.id ? 'active' : ''}`}
                onClick={() => { setTabActiva(item.id); setSidebarOpen(false) }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '12px 4px' }} />
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <button className="nav-item" style={{ width: '100%' }}>
                <span className="nav-icon">↩️</span>
                Volver al dashboard
              </button>
            </Link>
          </nav>

          <div className="sidebar-footer">
            <div className="user-row">
              <div className="user-av">A</div>
              <div>
                <div className="user-name">Adrián</div>
                <div className="user-sub">Super Admin</div>
              </div>
            </div>
            <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}>
              <span>🚪</span> Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
              <div>
                <div className="topbar-title">
                  {tabActiva === 'overview' && '📊 Resumen general'}
                  {tabActiva === 'negocios' && '🏢 Gestión de negocios'}
                  {tabActiva === 'clientes' && '👥 Gestión de clientes'}
                </div>
                <div className="topbar-sub">Panel de administrador · Khepria</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#475569', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                🟢 Activo · {new Date().toLocaleDateString('es-ES')}
              </span>
            </div>
          </header>

          <div className="content">

            {/* ══ OVERVIEW ══ */}
            {tabActiva === 'overview' && (
              <>
                {/* Stats principales */}
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.12)' }}>🏢</div>
                    <div className="stat-label">Negocios registrados</div>
                    <div className="stat-val">{totalNegocios}</div>
                    <div className="stat-sub">{negocios.filter(n => n.suspendido).length} suspendidos</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(184,216,248,0.12)' }}>👥</div>
                    <div className="stat-label">Clientes registrados</div>
                    <div className="stat-val">{totalClientes}</div>
                    <div className="stat-sub">usuarios finales</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(184,237,212,0.12)' }}>💰</div>
                    <div className="stat-label">Ingresos est. / mes</div>
                    <div className="stat-val">{ingresosMes.toLocaleString('es-ES')} €</div>
                    <div className="stat-sub">precios estimados</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(212,197,249,0.12)' }}>🤖</div>
                    <div className="stat-label">Coste API Gemini est.</div>
                    <div className="stat-val">${costeGeminiTotal}</div>
                    <div className="stat-sub">{totalMsgs.toLocaleString()} msgs estimados</div>
                  </div>
                </div>

                {/* Breakdown por plan */}
                <div style={{ marginBottom: '12px' }}>
                  <div className="section-title" style={{ marginBottom: '14px' }}>Distribución por plan</div>
                  <div className="planes-row">
                    {[
                      { id: 'basico',  nombre: 'Básico',  color: '#1D4ED8', fill: '#B8D8F8' },
                      { id: 'pro',     nombre: 'Pro',     color: '#6B4FD8', fill: '#D4C5F9' },
                      { id: 'agencia', nombre: 'Agencia', color: '#2E8A5E', fill: '#B8EDD4' },
                    ].map(p => {
                      const count = porPlan[p.id as keyof typeof porPlan]
                      const ing = (PRECIO_PLAN[p.id] * count).toLocaleString('es-ES')
                      const pct = totalNegocios > 0 ? Math.round((count / totalNegocios) * 100) : 0
                      return (
                        <div key={p.id} className="plan-box">
                          <div className="plan-box-top">
                            <div className="plan-box-name">{p.nombre}</div>
                            <span style={{ fontSize: '11px', fontWeight: 700, background: `${p.fill}20`, color: p.color, padding: '3px 8px', borderRadius: '6px' }}>
                              {PRECIO_PLAN[p.id]} €/mes est.
                            </span>
                          </div>
                          <div className="plan-box-count">{count}</div>
                          <div className="plan-box-ing">{ing} € ingresos est. · {pct}% del total</div>
                          <div className="plan-box-bar">
                            <div className="plan-box-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${p.fill}60, ${p.fill})` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Consumo Gemini por negocio */}
                <div className="section-header">
                  <div>
                    <div className="section-title">Consumo estimado Gemini por negocio</div>
                    <div className="section-count">Basado en actividad de reservas · $0.00012/msg</div>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Negocio</th>
                        <th>Plan</th>
                        <th>Msgs estimados</th>
                        <th>Actividad</th>
                        <th>Coste est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negocios
                        .slice()
                        .sort((a, b) => (msgsPorNegocio[b.id] || 0) - (msgsPorNegocio[a.id] || 0))
                        .slice(0, 10)
                        .map(n => {
                          const msgs = msgsPorNegocio[n.id] || 0
                          const coste = (msgs * COSTE_GEMINI_POR_MSG).toFixed(4)
                          const maxMsgs = Math.max(...Object.values(msgsPorNegocio), 1)
                          const pct = Math.round((msgs / maxMsgs) * 100)
                          return (
                            <tr key={n.id}>
                              <td>
                                <div className="cell-name">{n.nombre}</div>
                                <div className="cell-sub">{n.ciudad}</div>
                              </td>
                              <td>{planBadge(n.plan)}</td>
                              <td style={{ fontWeight: 600, color: '#F1F5F9' }}>{msgs.toLocaleString()}</td>
                              <td>
                                <div className="gemini-bar">
                                  <div className="gemini-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="gemini-val">{pct}% del máximo</div>
                              </td>
                              <td style={{ fontFamily: 'monospace', color: '#D4C5F9' }}>${coste}</td>
                            </tr>
                          )
                        })}
                      {negocios.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: '#475569', padding: '32px' }}>Sin negocios registrados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ NEGOCIOS ══ */}
            {tabActiva === 'negocios' && (
              <>
                <div className="section-header">
                  <div>
                    <div className="section-title">Todos los negocios</div>
                    <div className="section-count">{negociosFiltrados.length} de {totalNegocios} negocios</div>
                  </div>
                  <div className="filters">
                    <input
                      className="search-input"
                      placeholder="🔍 Buscar nombre o ciudad..."
                      value={busqNeg}
                      onChange={e => setBusqNeg(e.target.value)}
                    />
                    {(['todos', 'basico', 'pro', 'agencia'] as const).map(p => (
                      <button
                        key={p}
                        className={`filter-btn ${filtroPlan === p ? 'active' : ''}`}
                        onClick={() => setFiltroPlan(p)}
                      >
                        {p === 'todos' ? 'Todos' : p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Negocio</th>
                        <th>Tipo</th>
                        <th>Plan</th>
                        <th>Ciudad</th>
                        <th>Registro</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negociosFiltrados.map(n => (
                        <tr key={n.id} className={n.suspendido ? 'suspended-row' : ''}>
                          <td>
                            <div className="cell-name">{n.nombre}</div>
                          </td>
                          <td style={{ color: '#94A3B8' }}>{n.tipo?.replace(/^.+? /, '') || '—'}</td>
                          <td>{planBadge(n.plan)}</td>
                          <td style={{ color: '#94A3B8' }}>{n.ciudad || '—'}</td>
                          <td style={{ color: '#64748B', fontSize: '12px' }}>{fmtFecha(n.created_at)}</td>
                          <td>
                            {n.suspendido
                              ? <span className="suspended-badge">Suspendido</span>
                              : <span style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 600 }}>● Activo</span>
                            }
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                className="btn-plan"
                                onClick={() => { setPlanModal({ id: n.id, nombre: n.nombre, planActual: n.plan }); setPlanNuevo(n.plan) }}
                              >
                                📋 Plan
                              </button>
                              {n.suspendido
                                ? <button className="btn-reactivar" onClick={() => toggleSuspender(n)}>✓ Reactivar</button>
                                : <button className="btn-suspend" onClick={() => toggleSuspender(n)}>⛔ Suspender</button>
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                      {negociosFiltrados.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#475569', padding: '32px' }}>Sin resultados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ CLIENTES ══ */}
            {tabActiva === 'clientes' && (
              <>
                <div className="section-header">
                  <div>
                    <div className="section-title">Todos los clientes</div>
                    <div className="section-count">{clientesFiltrados.length} de {totalClientes} clientes</div>
                  </div>
                  <div className="filters">
                    <input
                      className="search-input"
                      placeholder="🔍 Buscar nombre o email..."
                      value={busqCli}
                      onChange={e => setBusqCli(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Email</th>
                        <th>Ciudad</th>
                        <th>Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(184,216,248,0.3), rgba(212,197,249,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#94A3B8', flexShrink: 0 }}>
                                {c.nombre?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="cell-name">{c.nombre || '—'}</div>
                            </div>
                          </td>
                          <td style={{ color: '#94A3B8', fontSize: '13px' }}>{c.email || '—'}</td>
                          <td style={{ color: '#64748B' }}>{c.ciudad || '—'}</td>
                          <td style={{ color: '#64748B', fontSize: '12px' }}>{fmtFecha(c.created_at)}</td>
                        </tr>
                      ))}
                      {clientesFiltrados.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#475569', padding: '32px' }}>Sin clientes registrados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
