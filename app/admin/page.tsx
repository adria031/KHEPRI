'use client'
import { useState, useEffect, useRef } from 'react'
import { getAdminDashboard, getAdminErroresIA, adminResolverErrorIA, type ErrorIA } from './actions'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts'

const PRECIOS: Record<string, number> = { starter: 0, basico: 29.99, pro: 59.99, plus: 99.99, beta: 0 }
const PLAN_COLORS: Record<string, string> = {
  starter: '#4ADE80', basico: '#60A5FA', pro: '#A78BFA', plus: '#FCD34D', beta: '#9CA3AF',
}
const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter', basico: 'Básico', pro: 'Pro', plus: 'Plus', beta: 'Beta',
}
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

type DashboardData = Awaited<ReturnType<typeof getAdminDashboard>>

export default function AdminDashboard() {
  const [datos,      setDatos]      = useState<DashboardData | null>(null)
  const [erroresIA,  setErroresIA]  = useState<ErrorIA[]>([])
  const [countdown,  setCountdown]  = useState(60)
  const barRef  = useRef<HTMLDivElement | null>(null)
  const lineRef = useRef<HTMLDivElement | null>(null)
  const [barW,  setBarW]  = useState(0)
  const [lineW, setLineW] = useState(0)

  useEffect(() => {
    const load = () => getAdminDashboard().then(d => { setDatos(d); setCountdown(60) }).catch(console.error)
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    getAdminErroresIA().then(({ data }) => setErroresIA(data))
  }, [])

  async function resolverError(id: string) {
    await adminResolverErrorIA(id)
    setErroresIA(prev => prev.filter(e => e.id !== id))
  }

  useEffect(() => {
    if (!datos) return
    const iv = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(iv)
  }, [datos])

  useEffect(() => {
    const update = () => {
      if (barRef.current)  setBarW(barRef.current.offsetWidth)
      if (lineRef.current) setLineW(lineRef.current.offsetWidth)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [datos])

  if (!datos) return (
    <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando datos…</p>
    </div>
  )

  const { negocios, totalClientes, totalWaitlist } = datos
  const ahora    = new Date()
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  const negsMes   = negocios.filter(n => n.updated_at.startsWith(mesActual)).length
  const mrr       = negocios.reduce((s, n) => s + (PRECIOS[n.plan ?? 'starter'] ?? 0), 0)

  const planCount: Record<string, number> = {}
  negocios.forEach(n => { const p = n.plan ?? 'starter'; planCount[p] = (planCount[p] ?? 0) + 1 })
  const totalNegs = negocios.length || 1

  const chartBar = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { mes: MESES[d.getMonth()], negocios: negocios.filter(n => n.updated_at.startsWith(prefix)).length }
  })

  const chartLine = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (11 - i), 1)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { mes: MESES[d.getMonth()], total: negocios.filter(n => n.updated_at.slice(0, 7) <= prefix).length }
  })

  return (
    <>
      <style>{`
        .db-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        .db-kpi { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); padding:18px; box-shadow:0 1px 6px rgba(0,0,0,0.04); }
        .db-kpi-icon { font-size:20px; margin-bottom:8px; }
        .db-kpi-label { font-size:11px; color:#6B7280; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px; }
        .db-kpi-val { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; color:#111827; letter-spacing:-1px; line-height:1; margin-bottom:3px; }
        .db-kpi-sub { font-size:11px; color:#9CA3AF; }
        .db-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        .db-card { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); padding:20px; box-shadow:0 1px 6px rgba(0,0,0,0.04); }
        .db-card-title { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:#111827; margin-bottom:14px; }
        .plan-bar-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .plan-bar-label { font-size:12px; font-weight:600; color:#374151; width:60px; flex-shrink:0; }
        .plan-bar-track { flex:1; height:8px; background:#F3F4F6; border-radius:100px; overflow:hidden; }
        .plan-bar-count { font-size:12px; font-weight:700; color:#374151; width:28px; text-align:right; flex-shrink:0; }
        @media(max-width:900px){ .db-kpi-grid{grid-template-columns:repeat(2,1fr);} .db-row{grid-template-columns:1fr;} }
      `}</style>
      <div className="admin-content">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Actualiza en {countdown}s · {negocios.length} negocios registrados</div>

        <div className="db-kpi-grid">
          {[
            { icon: '🆕', label: 'Negocios este mes',    value: negsMes,          sub: `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`,                 bg: '#EFF6FF' },
            { icon: '🏢', label: 'Total negocios',       value: negocios.length,  sub: `${negocios.filter(n => n.activo !== false).length} activos`,          bg: '#F5F3FF' },
            { icon: '👥', label: 'Clientes / perfiles',  value: totalClientes,    sub: 'En tabla profiles',                                                   bg: '#F0FDF4' },
            { icon: '📋', label: 'Waitlist',             value: totalWaitlist,    sub: 'En lista de espera',                                                  bg: '#FFFBEB' },
          ].map((k, i) => (
            <div key={i} className="db-kpi" style={{ background: k.bg }}>
              <div className="db-kpi-icon">{k.icon}</div>
              <div className="db-kpi-label">{k.label}</div>
              <div className="db-kpi-val">{k.value.toLocaleString()}</div>
              <div className="db-kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="db-row">
          <div className="db-card">
            <div className="db-card-title">💰 Ingresos estimados (MRR)</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, color: '#111827', letterSpacing: -1.5, margin: '8px 0 4px' }}>
              {mrr.toFixed(0)} €/mes
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Basado en planes de pago activos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(PRECIOS).filter(([, p]) => p > 0).map(([plan, precio]) => {
                const count = planCount[plan] ?? 0
                return count > 0 ? (
                  <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#6B7280' }}>{PLAN_LABELS[plan]} × {count}</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{(precio * count).toFixed(0)} €</span>
                  </div>
                ) : null
              })}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-title">📊 Negocios por plan</div>
            {(['beta', 'starter', 'basico', 'pro', 'plus'] as const).map(plan => {
              const count = planCount[plan] ?? 0
              const pct   = Math.round(count / totalNegs * 100)
              return (
                <div key={plan} className="plan-bar-row">
                  <span className="plan-bar-label">{PLAN_LABELS[plan]}</span>
                  <div className="plan-bar-track">
                    <div style={{ height: '100%', width: `${pct}%`, background: PLAN_COLORS[plan], borderRadius: 100 }}/>
                  </div>
                  <span className="plan-bar-count">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="db-row">
          <div className="db-card">
            <div className="db-card-title">Nuevos negocios (últimos 6 meses)</div>
            <div ref={barRef} style={{ width: '100%', height: 200 }}>
              {barW > 0 && (
                <BarChart width={barW} height={200} data={chartBar} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} formatter={v => [`${v}`, 'Nuevos']}/>
                  <Bar dataKey="negocios" fill="#6366F1" radius={[6, 6, 0, 0]}/>
                </BarChart>
              )}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-title">Crecimiento total (12 meses)</div>
            <div ref={lineRef} style={{ width: '100%', height: 200 }}>
              {lineW > 0 && (
                <LineChart width={lineW} height={200} data={chartLine} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} formatter={v => [`${v}`, 'Total']}/>
                  <Line type="monotone" dataKey="total" stroke="#8B5CF6" strokeWidth={2.5} dot={false}/>
                </LineChart>
              )}
            </div>
          </div>
        </div>
        {/* ── Errores IA ─────────────────────────────────────────────── */}
        <div className="db-card" style={{ marginBottom: 14 }}>
          <div className="db-card-title">
            🚨 Errores IA sin resolver
            <span style={{ marginLeft: 8, background: erroresIA.length > 0 ? '#FEE2E2' : '#F0FDF4', color: erroresIA.length > 0 ? '#DC2626' : '#16A34A', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
              {erroresIA.length}
            </span>
          </div>
          {erroresIA.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin errores pendientes ✓</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {erroresIA.map(e => (
                <div key={e.id} style={{ background: '#FFF7F7', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>{e.endpoint ?? '—'}</span>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(e.created_at).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', wordBreak: 'break-word' }}>{e.error_mensaje ?? '—'}</div>
                    {e.negocio_id && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>negocio: {e.negocio_id}</div>}
                  </div>
                  <button
                    onClick={() => resolverError(e.id)}
                    style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Resolver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
