'use client'
import { useState, useEffect } from 'react'
import {
  getAdminNegocios, adminCambiarPlan, adminAnadirCreditos, adminToggleActivo,
  getAdminNegocioFicha, type NegocioAdmin, type NegocioFicha,
} from '../actions'

const CREDITOS_POR_PLAN: Record<string, number> = {
  starter: 100, basico: 300, pro: 1000, plus: 5000, beta: 2000,
}
const PLAN_PRECIOS: Record<string, string> = {
  starter: 'Gratis · 100 cr', basico: '29,99 €/mes · 300 cr',
  pro: '59,99 €/mes · 1.000 cr', plus: '99,99 €/mes · 5.000 cr', beta: 'Gratis · 2.000 cr',
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function planBadge(plan: string | null | undefined) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    starter: { bg: '#F0FDF4', color: '#16A34A', label: 'Starter' },
    basico:  { bg: '#EFF6FF', color: '#1D4ED8', label: 'Básico'  },
    pro:     { bg: '#F5F3FF', color: '#7C3AED', label: 'Pro'     },
    plus:    { bg: '#FFFBEB', color: '#D97706', label: 'Plus'    },
    beta:    { bg: '#F3F4F6', color: '#6B7280', label: 'Beta'    },
  }
  const c = cfg[plan ?? 'starter'] ?? { bg: '#F3F4F6', color: '#6B7280', label: plan ?? '—' }
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '8px', whiteSpace: 'nowrap' as const }}>
      {c.label}
    </span>
  )
}

type PlanModal     = { negId: string; userId: string; nombre: string; planActual: string }
type CreditosModal = { negId: string; userId: string; nombre: string; disponibles: number; totales: number }

const CSS = `
  .ng-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
  .ng-filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .ng-search { padding:8px 12px; background:white; border:1.5px solid #E5E7EB; border-radius:10px; font-family:inherit; font-size:13px; color:#111827; outline:none; width:220px; }
  .ng-search:focus { border-color:#6366F1; }
  .f-btn { padding:6px 11px; border-radius:8px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; }
  .f-btn.act { background:rgba(99,102,241,0.08); border-color:rgba(99,102,241,0.3); color:#4F46E5; }
  .act-btn { padding:7px 13px; border-radius:9px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:700; color:#374151; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.15s; }
  .act-btn:hover { border-color:#6366F1; color:#4F46E5; background:rgba(99,102,241,0.04); }
  .tbl-wrap { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); overflow:hidden; box-shadow:0 1px 6px rgba(0,0,0,0.04); overflow-x:auto; }
  table { width:100%; border-collapse:collapse; min-width:700px; }
  thead th { padding:10px 14px; font-size:11px; font-weight:700; color:#9CA3AF; text-align:left; text-transform:uppercase; letter-spacing:0.4px; background:#FAFAFA; border-bottom:1px solid rgba(0,0,0,0.06); white-space:nowrap; }
  tbody td { padding:11px 14px; font-size:13px; color:#374151; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover td { background:#F9F9FF; }
  .cell-name { font-weight:600; color:#111827; }
  .cell-sub { font-size:11px; color:#9CA3AF; margin-top:1px; }
  .btn-xs { padding:4px 9px; border-radius:7px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:11px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
  .btn-xs:hover { border-color:#6366F1; color:#4F46E5; }
  .btn-xs.green { border-color:#D1FAE5; color:#059669; }
  .btn-xs.green:hover { background:rgba(5,150,105,0.06); border-color:#059669; }
  .btn-xs.red { border-color:#FEE2E2; color:#DC2626; }
  .btn-xs.red:hover { background:rgba(220,38,38,0.06); }
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(2px); }
  .modal { background:white; border-radius:22px; padding:28px; width:100%; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
  .modal h3 { font-family:'Syne',sans-serif; font-size:19px; font-weight:800; color:#111827; margin-bottom:5px; }
  .modal-sub { font-size:13px; color:#6B7280; margin-bottom:20px; }
  .plan-opts { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
  .plan-opt { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1.5px solid #E5E7EB; border-radius:12px; cursor:pointer; transition:all 0.15s; background:white; }
  .plan-opt.sel { border-color:#6366F1; background:rgba(99,102,241,0.04); }
  .plan-opt:hover { border-color:#A5B4FC; }
  .modal-btns { display:flex; gap:8px; }
  .btn-cancel { flex:1; padding:11px; background:#F3F4F6; border:none; border-radius:11px; font-family:inherit; font-size:14px; font-weight:600; color:#374151; cursor:pointer; }
  .btn-confirm { flex:1; padding:11px; background:linear-gradient(135deg,#4F46E5,#7C3AED); border:none; border-radius:11px; font-family:inherit; font-size:14px; font-weight:700; color:white; cursor:pointer; }
  .btn-confirm:disabled { opacity:0.45; cursor:not-allowed; }
  .detalle-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.05); font-size:13px; }
  .detalle-row:last-child { border-bottom:none; }
  .drawer-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.25); z-index:300; backdrop-filter:blur(2px); }
  .drawer { position:fixed; top:0; right:0; bottom:0; width:460px; max-width:100vw; background:white; z-index:301; box-shadow:-8px 0 40px rgba(0,0,0,0.12); display:flex; flex-direction:column; overflow:hidden; }
  .drawer-head { padding:20px 22px 16px; border-bottom:1px solid rgba(0,0,0,0.06); display:flex; align-items:flex-start; gap:12px; flex-shrink:0; }
  .drawer-body { flex:1; overflow-y:auto; padding:20px 22px; }
  .drawer-kpis { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px; }
  .drawer-kpi { background:#F7F9FF; border-radius:12px; padding:12px 14px; }
  .drawer-kpi-val { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#111827; letter-spacing:-0.5px; line-height:1; margin-bottom:3px; }
  .drawer-kpi-label { font-size:11px; color:#9CA3AF; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; }
  .mes-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .mes-bar-track { flex:1; height:7px; background:#F1F5F9; border-radius:100px; overflow:hidden; }
  tbody tr { cursor:pointer; }
  @media(max-width:600px){ .drawer { width:100vw; } .drawer-kpis { grid-template-columns:1fr 1fr; } }
`

export default function NegociosPage() {
  const [cargando,    setCargando]    = useState(true)
  const [negocios,    setNegocios]    = useState<NegocioAdmin[]>([])
  const [debugError,  setDebugError]  = useState<string | null>(null)
  const [busq,        setBusq]        = useState('')
  const [filtroPlan,  setFiltroPlan]  = useState('todos')

  const [planModal,     setPlanModal]     = useState<PlanModal | null>(null)
  const [planNuevo,     setPlanNuevo]     = useState('')
  const [cambiandoPlan, setCambiandoPlan] = useState(false)

  const [creditosModal, setCreditosModal] = useState<CreditosModal | null>(null)
  const [creditosExtra, setCreditosExtra] = useState('')
  const [anadiendoCred, setAnadiendoCred] = useState(false)

  const [detalleModal, setDetalleModal] = useState<NegocioAdmin | null>(null)
  const [bloqueando,   setBloqueando]   = useState<string | null>(null)

  const [fichaneg,     setFichaneg]     = useState<NegocioAdmin | null>(null)
  const [fichaData,    setFichaData]    = useState<NegocioFicha | null>(null)
  const [fichaCargando,setFichaCargando]= useState(false)

  function abrirFicha(n: NegocioAdmin) {
    setFichaData(null); setFichaneg(n); setFichaCargando(true)
    getAdminNegocioFicha(n.id).then(d => { setFichaData(d); setFichaCargando(false) }).catch(() => setFichaCargando(false))
  }

  useEffect(() => {
    getAdminNegocios()
      .then(({ data, error }) => {
        if (error) setDebugError(error)
        setNegocios(data)
        setCargando(false)
      })
      .catch(e => { setDebugError(String(e)); setCargando(false) })
  }, [])

  async function cambiarPlan() {
    if (!planModal || !planNuevo) return
    setCambiandoPlan(true)
    const creditos = CREDITOS_POR_PLAN[planNuevo] ?? 100
    await adminCambiarPlan(planModal.negId, planModal.userId, planNuevo, creditos)
    setNegocios(prev => prev.map(n => n.id === planModal.negId
      ? { ...n, plan: planNuevo, creditos_totales: creditos, creditos_usados: 0 } : n))
    setCambiandoPlan(false)
    setPlanModal(null)
    setPlanNuevo('')
  }

  async function anadirCreditos() {
    if (!creditosModal || !creditosExtra) return
    const extra = parseInt(creditosExtra)
    if (isNaN(extra) || extra <= 0) return
    setAnadiendoCred(true)
    const nuevoTotal = creditosModal.totales + extra
    await adminAnadirCreditos(creditosModal.negId, creditosModal.userId, nuevoTotal)
    setNegocios(prev => prev.map(n => n.id === creditosModal.negId ? { ...n, creditos_totales: nuevoTotal } : n))
    setAnadiendoCred(false)
    setCreditosModal(null)
    setCreditosExtra('')
  }

  async function toggleActivo(n: NegocioAdmin) {
    setBloqueando(n.id)
    const nuevo = !n.activo
    await adminToggleActivo(n.id, nuevo)
    setNegocios(prev => prev.map(x => x.id === n.id ? { ...x, activo: nuevo } : x))
    setBloqueando(null)
  }

  const filtrados = negocios.filter(n => {
    const matchPlan = filtroPlan === 'todos' || (n.plan ?? 'starter') === filtroPlan
    const matchBusq = !busq ||
      n.nombre.toLowerCase().includes(busq.toLowerCase()) ||
      (n.ciudad ?? '').toLowerCase().includes(busq.toLowerCase()) ||
      (n.owner_email ?? '').toLowerCase().includes(busq.toLowerCase())
    return matchPlan && matchBusq
  })

  return (
    <>
      <style>{CSS}</style>

      {planModal && (
        <div className="overlay" onClick={() => setPlanModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Cambiar plan</h3>
            <p className="modal-sub">{planModal.nombre}</p>
            <div className="plan-opts">
              {(['starter','basico','pro','plus','beta'] as const).map(p => (
                <div key={p} className={`plan-opt ${planNuevo === p ? 'sel' : ''}`} onClick={() => setPlanNuevo(p)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{p}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{PLAN_PRECIOS[p]}</div>
                  </div>
                  {planModal.planActual === p && <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Actual</span>}
                  {planNuevo === p && planModal.planActual !== p && <span style={{ color: '#4F46E5', fontSize: 16 }}>✓</span>}
                </div>
              ))}
            </div>
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setPlanModal(null)}>Cancelar</button>
              <button className="btn-confirm" disabled={!planNuevo || planNuevo === planModal.planActual || cambiandoPlan} onClick={cambiarPlan}>
                {cambiandoPlan ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {creditosModal && (
        <div className="overlay" onClick={() => setCreditosModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3>Añadir créditos</h3>
            <p className="modal-sub">{creditosModal.nombre} · {creditosModal.disponibles} / {creditosModal.totales} disponibles</p>
            <input
              type="number" min="1" placeholder="Cantidad a añadir" value={creditosExtra}
              onChange={e => setCreditosExtra(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 11, fontFamily: 'inherit', fontSize: 16, outline: 'none', marginBottom: 16 }}
            />
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setCreditosModal(null)}>Cancelar</button>
              <button className="btn-confirm" disabled={!creditosExtra || anadiendoCred} onClick={anadirCreditos}>
                {anadiendoCred ? 'Añadiendo…' : '+ Añadir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleModal && (
        <div className="overlay" onClick={() => setDetalleModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <h3>{detalleModal.nombre}</h3>
            <p className="modal-sub" style={{ marginBottom: 16 }}>{detalleModal.tipo || '—'} · {detalleModal.ciudad || '—'}</p>
            <div>
              {([
                ['Plan',        planBadge(detalleModal.plan)],
                ['Estado',      <span key="est" style={{ fontSize:13, fontWeight:700, color: detalleModal.activo !== false ? '#16A34A' : '#DC2626' }}>{detalleModal.activo !== false ? 'Activo' : 'Inactivo'}</span>],
                ['Email propietario', detalleModal.owner_email ?? '—'],
                ['Nombre propietario', detalleModal.owner_nombre ?? '—'],
                ['Créditos', `${(detalleModal.creditos_totales ?? 0) - (detalleModal.creditos_usados ?? 0)} / ${detalleModal.creditos_totales ?? 0}`],
                ['Registro', fmtFecha(detalleModal.updated_at)],
                ['ID', <span key="id" style={{ fontSize:11, color:'#9CA3AF', fontFamily:'monospace' }}>{detalleModal.id}</span>],
              ] as [string, React.ReactNode][]).map(([label, value], i) => (
                <div key={i} className="detalle-row">
                  <span style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 600 }}>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <button className="btn-cancel" style={{ width: '100%', marginTop: 18 }} onClick={() => setDetalleModal(null)}>Cerrar</button>
          </div>
        </div>
      )}

      <div className="admin-content">
        <div className="page-title">Negocios</div>
        <div className="page-sub">{filtrados.length} de {negocios.length} negocios</div>

        {debugError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#DC2626', marginBottom: 6, fontSize: 13 }}>⚠ Error al cargar (debug):</div>
            <pre style={{ fontSize: 11, color: '#991B1B', overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>{debugError}</pre>
          </div>
        )}

        <div className="ng-header">
          <div className="ng-filters">
            <input className="ng-search" placeholder="🔍 Nombre, email o ciudad…" value={busq} onChange={e => setBusq(e.target.value)}/>
            {(['todos','starter','basico','pro','plus','beta'] as const).map(p => (
              <button key={p} className={`f-btn ${filtroPlan === p ? 'act' : ''}`} onClick={() => setFiltroPlan(p)}>
                {p === 'todos' ? 'Todos' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button className="act-btn" onClick={() => exportCSV(
            filtrados.map(n => ({
              nombre: n.nombre, ciudad: n.ciudad, tipo: n.tipo, plan: n.plan, activo: n.activo,
              creditos_disponibles: (n.creditos_totales ?? 0) - (n.creditos_usados ?? 0),
              creditos_totales: n.creditos_totales, email: n.owner_email, creado: n.updated_at,
            })), 'negocios.csv')}>
            📥 Exportar CSV
          </button>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>Cargando negocios…</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Negocio</th><th>Email</th><th>Plan</th><th>Créditos</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filtrados.map(n => {
                  const credTot  = n.creditos_totales ?? 0
                  const credUsd  = n.creditos_usados  ?? 0
                  const credDis  = credTot - credUsd
                  const credBajo = credTot > 0 && credDis < credTot * 0.1
                  const activo   = n.activo !== false
                  return (
                    <tr key={n.id} onClick={() => abrirFicha(n)}>
                      <td>
                        <div className="cell-name">{n.nombre}</div>
                        <div className="cell-sub">{n.tipo || '—'} · {n.ciudad || '—'}</div>
                      </td>
                      <td style={{ fontSize: 12, color: '#6B7280' }}>{n.owner_email || '—'}</td>
                      <td>{planBadge(n.plan)}</td>
                      <td>
                        <span style={{ fontSize: 12, color: credBajo ? '#DC2626' : '#6B7280', fontWeight: credBajo ? 700 : 400 }}>
                          {credBajo ? '⚠ ' : ''}{credDis} / {credTot}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7,
                          background: activo ? '#F0FDF4' : '#FEF2F2', color: activo ? '#16A34A' : '#DC2626',
                        }}>
                          {activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtFecha(n.updated_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                          <button className="btn-xs" onClick={() => { setPlanModal({ negId: n.id, userId: n.user_id, nombre: n.nombre, planActual: n.plan ?? 'starter' }); setPlanNuevo(n.plan ?? '') }}>
                            📋 Plan
                          </button>
                          <button className="btn-xs green" onClick={() => setCreditosModal({ negId: n.id, userId: n.user_id, nombre: n.nombre, disponibles: credDis, totales: credTot })}>
                            ⚡ Créditos
                          </button>
                          <button className={`btn-xs ${activo ? 'red' : 'green'}`} disabled={bloqueando === n.id} onClick={() => toggleActivo(n)}>
                            {bloqueando === n.id ? '…' : activo ? '🔒 Bloquear' : '🔓 Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtrados.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Drawer ficha negocio ── */}
      {fichaneg && (
        <>
          <div className="drawer-backdrop" onClick={() => setFichaneg(null)} />
          <div className="drawer">
            {/* Header */}
            <div className="drawer-head">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: '#111827' }}>{fichaneg.nombre}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                    background: fichaneg.activo !== false ? '#F0FDF4' : '#FEF2F2',
                    color: fichaneg.activo !== false ? '#16A34A' : '#DC2626',
                  }}>
                    {fichaneg.activo !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{fichaneg.tipo || '—'} · {fichaneg.ciudad || '—'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {planBadge(fichaneg.plan)}
                  <a
                    href={`/negocio/${fichaneg.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', background: '#EEF2FF', padding: '3px 10px', borderRadius: 8, textDecoration: 'none' }}
                  >
                    🔗 Ver ficha pública
                  </a>
                </div>
              </div>
              <button
                onClick={() => setFichaneg(null)}
                style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#6B7280', flexShrink: 0 }}
              >✕</button>
            </div>

            {/* Body */}
            <div className="drawer-body">
              {fichaCargando ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 13 }}>Cargando datos…</div>
              ) : fichaData?.error ? (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#991B1B' }}>
                  {fichaData.error}
                </div>
              ) : fichaData ? (
                <>
                  {/* KPIs */}
                  <div className="drawer-kpis">
                    <div className="drawer-kpi">
                      <div className="drawer-kpi-val">{fichaData.totalIngresos.toFixed(0)} €</div>
                      <div className="drawer-kpi-label">Ingresos totales</div>
                    </div>
                    <div className="drawer-kpi">
                      <div className="drawer-kpi-val">{fichaData.totalReservas}</div>
                      <div className="drawer-kpi-label">Reservas</div>
                    </div>
                    <div className="drawer-kpi">
                      <div className="drawer-kpi-val">{(fichaneg.creditos_totales ?? 0) - (fichaneg.creditos_usados ?? 0)}</div>
                      <div className="drawer-kpi-label">Créditos disp.</div>
                    </div>
                  </div>

                  {/* Ingresos por mes */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Ingresos últimos 6 meses
                    </div>
                    {(() => {
                      const maxIng = Math.max(...fichaData.meses.map(m => m.ingresos), 1)
                      return fichaData.meses.map((m, i) => (
                        <div key={i} className="mes-row">
                          <div style={{ width: 32, fontSize: 11, color: '#9CA3AF', fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{m.label}</div>
                          <div className="mes-bar-track">
                            <div style={{ height: '100%', width: `${(m.ingresos / maxIng) * 100}%`, background: 'linear-gradient(90deg,#6366F1,#8B5CF6)', borderRadius: 100, minWidth: m.ingresos > 0 ? 4 : 0 }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', width: 64, textAlign: 'right', flexShrink: 0 }}>
                            {m.ingresos > 0 ? `${m.ingresos.toFixed(0)} €` : '—'}
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', width: 28, textAlign: 'right', flexShrink: 0 }}>{m.reservas > 0 ? `×${m.reservas}` : ''}</div>
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Info del negocio */}
                  <div style={{ background: '#F7F9FF', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Info del negocio</div>
                    {[
                      ['Email propietario', fichaneg.owner_email ?? '—'],
                      ['Nombre propietario', fichaneg.owner_nombre ?? '—'],
                      ['Créditos', `${(fichaneg.creditos_totales ?? 0) - (fichaneg.creditos_usados ?? 0)} / ${fichaneg.creditos_totales ?? 0}`],
                      ['Última actividad', fmtFecha(fichaneg.updated_at)],
                      ['ID', fichaneg.id],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: 12 }}>
                        <span style={{ color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
                        <span style={{ color: '#374151', fontFamily: label === 'ID' ? 'monospace' : 'inherit', fontSize: label === 'ID' ? 10 : 12 }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Acciones rápidas */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    <button className="btn-xs" onClick={() => { setPlanModal({ negId: fichaneg.id, userId: fichaneg.user_id, nombre: fichaneg.nombre, planActual: fichaneg.plan ?? 'starter' }); setPlanNuevo(fichaneg.plan ?? '') }}>
                      📋 Cambiar plan
                    </button>
                    <button className="btn-xs green" onClick={() => setCreditosModal({ negId: fichaneg.id, userId: fichaneg.user_id, nombre: fichaneg.nombre, disponibles: (fichaneg.creditos_totales ?? 0) - (fichaneg.creditos_usados ?? 0), totales: fichaneg.creditos_totales ?? 0 })}>
                      ⚡ Añadir créditos
                    </button>
                    <button className={`btn-xs ${fichaneg.activo !== false ? 'red' : 'green'}`} onClick={() => toggleActivo(fichaneg)}>
                      {fichaneg.activo !== false ? '🔒 Bloquear' : '🔓 Activar'}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}
    </>
  )
}
