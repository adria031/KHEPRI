'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSessionClient } from '../lib/supabase'
import { getNegocioActivo, type NegMin } from '../lib/negocioActivo'
import { DashboardShell } from './DashboardShell'

const planLabel: Record<string, string> = {
  basico: 'Plan Básico', pro: 'Plan Pro', agencia: 'Plan Plus', plus: 'Plan Plus',
}

type ReservaHoy = {
  id: string; hora: string; cliente_nombre: string; estado: string
  servicios: { nombre: string } | null
}

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const ACCESOS = [
  { icon: '🏪', label: 'Mi negocio',    href: '/dashboard/mi-negocio',   color: '#EFF6FF', border: '#BFDBFE' },
  { icon: '📅', label: 'Reservas',      href: '/dashboard/reservas',      color: '#F5F3FF', border: '#DDD6FE' },
  { icon: '🔧', label: 'Servicios',     href: '/dashboard/servicios',     color: '#ECFDF5', border: '#A7F3D0' },
  { icon: '⏰', label: 'Horarios',      href: '/dashboard/horarios',      color: '#FFF7ED', border: '#FED7AA' },
  { icon: '🛍️', label: 'Productos',    href: '/dashboard/productos',     color: '#FDF2F8', border: '#FBCFE8' },
  { icon: '👥', label: 'Equipo',        href: '/dashboard/equipo',        color: '#F0FDF4', border: '#BBF7D0' },
  { icon: '📱', label: 'Marketing',     href: '/dashboard/marketing',     color: '#FFF1F2', border: '#FECDD3' },
  { icon: '⭐', label: 'Reseñas',       href: '/dashboard/resenas',       color: '#FFFBEB', border: '#FDE68A' },
  { icon: '💰', label: 'Caja',          href: '/dashboard/caja',          color: '#F0FDF4', border: '#86EFAC' },
]

export default function Dashboard() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [reservasHoy, setReservasHoy] = useState<number | null>(null)
  const [ingresosHoy, setIngresosHoy] = useState<number | null>(null)
  const [clientesSemana, setClientesSemana] = useState<number | null>(null)
  const [valoracion, setValoracion] = useState<number | null>(null)
  const [citasHoy, setCitasHoy] = useState<ReservaHoy[]>([])
  const [barrasSemana, setBarrasSemana] = useState<number[]>([])
  const [valoresSemana, setValoresSemana] = useState<number[]>([])
  const [diasSemana, setDiasSemana] = useState<string[]>([])
  const [ingresosSemana, setIngresosSemana] = useState(0)
  const [hoyIdx, setHoyIdx] = useState(6)

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    (async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user

      const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id, session.access_token)
      if (!neg) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todosNegs)

      const modoTodos = localStorage.getItem('negocio_activo_id') === 'todos' && todosNegs.length > 1
      setNegocio(modoTodos ? null : neg)

      // IDs a consultar: todos los negocios o solo el activo
      const ids = modoTodos ? todosNegs.map(n => n.id) : [neg.id]

      const hoy = new Date()
      const hoyISO = isoLocal(hoy)
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
      const lunesISO = isoLocal(lunes)
      const hace6 = new Date(hoy); hace6.setDate(hoy.getDate() - 6)
      const hace6ISO = isoLocal(hace6)
      const hoyDia = (hoy.getDay() + 6) % 7 // 0=Mon...6=Sun

      const [r1, r2, r3, r4] = await Promise.all([
        db.from('reservas').select('estado, servicios(precio)').in('negocio_id', ids).eq('fecha', hoyISO),
        db.from('reservas').select('fecha, estado, cliente_telefono, servicios(precio)').in('negocio_id', ids).gte('fecha', hace6ISO).lte('fecha', hoyISO),
        db.from('reservas').select('id, hora, cliente_nombre, estado, servicios(nombre)').in('negocio_id', ids).eq('fecha', hoyISO).order('hora').limit(6),
        db.from('resenas').select('valoracion').in('negocio_id', ids),
      ])

      const resHoy = r1.data; const resSemana = r2.data; const citasData = r3.data; const resenasData = r4.data

      setReservasHoy(resHoy?.length ?? 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ingHoy = (resHoy || []).filter((r: any) => r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0)
      setIngresosHoy(ingHoy)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resDesdeLunes = (resSemana || []).filter((r: any) => r.fecha >= lunesISO)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tels = new Set(resDesdeLunes.map((r: any) => r.cliente_telefono).filter(Boolean))
      setClientesSemana(tels.size)

      if (resenasData && resenasData.length > 0) {
        const avg = resenasData.reduce((s, r) => s + (r.valoracion || 0), 0) / resenasData.length
        setValoracion(Math.round(avg * 10) / 10)
      }

      setCitasHoy((citasData as unknown as ReservaHoy[]) || [])

      const diasCortos = ['L','M','X','J','V','S','D']
      const porDia: number[] = []
      const labDias: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(hace6); d.setDate(hace6.getDate() + i)
        const dISO = isoLocal(d)
        labDias.push(diasCortos[d.getDay() === 0 ? 6 : d.getDay() - 1])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ing = (resSemana || []).filter((r: any) => r.fecha === dISO && r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0)
        porDia.push(ing)
      }
      setDiasSemana(labDias)
      setValoresSemana(porDia)
      setIngresosSemana(porDia.reduce((s, v) => s + v, 0))
      const maxVal = Math.max(...porDia, 1)
      setBarrasSemana(porDia.map(v => v > 0 ? Math.max(Math.round((v / maxVal) * 100), 8) : 0))
      setHoyIdx(hoyDia)
    })()
  }, [])

  const estadoColor: Record<string, { bg: string; color: string }> = {
    confirmada: { bg: '#EEF2FF', color: '#4F46E5' },
    completada: { bg: '#ECFDF5', color: '#059669' },
    cancelada:  { bg: '#FFF1F2', color: '#E11D48' },
  }

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        .db-greeting { margin-bottom: 28px; }
        .db-greeting-saludo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: var(--ds-text); margin-bottom: 3px; }
        .db-greeting-fecha { font-size: 13px; color: var(--ds-muted); text-transform: capitalize; }

        /* KPI cards */
        .db-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .db-kpi {
          background: var(--ds-white); border: 1px solid var(--ds-border);
          border-radius: 16px; padding: 20px 18px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .db-kpi:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .db-kpi-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 14px; }
        .db-kpi-val { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: var(--ds-text); margin-bottom: 4px; line-height: 1; }
        .db-kpi-label { font-size: 12px; color: var(--ds-muted); font-weight: 500; margin-bottom: 6px; }
        .db-kpi-sub { font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 100px; display: inline-block; }
        .db-kpi-sub.green { background: #ECFDF5; color: #059669; }
        .db-kpi-sub.muted { background: var(--ds-bg); color: var(--ds-muted); }
        .db-kpi-sub.blue { background: #EEF2FF; color: #4F46E5; }
        .db-kpi-sub.yellow { background: #FFFBEB; color: #D97706; }

        /* Main grid */
        .db-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 18px; margin-bottom: 18px; }
        .db-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

        /* Card */
        .db-card {
          background: var(--ds-white); border: 1px solid var(--ds-border);
          border-radius: 16px; padding: 22px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .db-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .db-card-title { font-size: 14px; font-weight: 700; color: var(--ds-text); }
        .db-card-link { font-size: 12.5px; color: #4F46E5; font-weight: 600; text-decoration: none; }
        .db-card-link:hover { text-decoration: underline; }
        .db-card-badge { font-size: 11px; background: var(--ds-bg); color: var(--ds-muted); padding: 3px 9px; border-radius: 100px; font-weight: 600; }

        /* Chart */
        .db-chart { display: flex; align-items: flex-end; gap: 6px; height: 130px; }
        .db-chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .db-chart-bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 100%; }
        .db-chart-bar { width: 100%; border-radius: 5px 5px 0 0; min-height: 2px; transition: all 0.4s; }
        .db-chart-label { font-size: 10px; color: var(--ds-muted); font-weight: 600; }
        .db-chart-total { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--ds-border); }
        .db-chart-total-label { font-size: 12px; color: var(--ds-muted); }
        .db-chart-total-val { font-size: 15px; font-weight: 800; color: var(--ds-text); letter-spacing: -0.5px; }

        /* Citas */
        .db-cita { display: flex; align-items: center; gap: 12px; padding: 11px 0; }
        .db-cita + .db-cita { border-top: 1px solid var(--ds-border); }
        .db-cita-hora { font-size: 14px; font-weight: 800; color: var(--ds-text); min-width: 48px; letter-spacing: -0.5px; }
        .db-cita-info { flex: 1; }
        .db-cita-nombre { font-size: 13.5px; font-weight: 600; color: var(--ds-text); margin-bottom: 2px; }
        .db-cita-servicio { font-size: 11.5px; color: var(--ds-muted); }
        .db-cita-badge { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 100px; white-space: nowrap; }
        .db-empty { text-align: center; padding: 28px 0; color: var(--ds-muted); font-size: 13px; }
        .db-empty-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.5; }

        /* Quick access */
        .db-accesos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .db-acceso {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 14px 8px; border-radius: 12px; text-decoration: none;
          border: 1px solid; transition: all 0.2s;
        }
        .db-acceso:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .db-acceso-icon { font-size: 22px; line-height: 1; }
        .db-acceso-label { font-size: 11px; font-weight: 600; color: var(--ds-text2); text-align: center; }

        /* Responsive */
        @media (max-width: 1100px) { .db-kpis { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 900px) { .db-grid { grid-template-columns: 1fr; } .db-grid2 { grid-template-columns: 1fr; } }
        @media (max-width: 600px) { .db-kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; } .db-kpi-val { font-size: 22px; } .db-accesos { grid-template-columns: repeat(3, 1fr); } }
      `}</style>

      {/* Greeting */}
      <div className="db-greeting">
        <div className="db-greeting-saludo">
          {negocio === null && todosNegocios.length > 1
            ? `${saludo} — Vista consolidada 🏢`
            : `${saludo}, ${negocio?.nombre || 'bienvenido'} 👋`}
        </div>
        <div className="db-greeting-fecha">
          {negocio === null && todosNegocios.length > 1
            ? `${fechaHoy} · ${todosNegocios.length} negocios`
            : fechaHoy}
        </div>
      </div>

      {/* KPIs */}
      <div className="db-kpis">
        <div className="db-kpi">
          <div className="db-kpi-icon" style={{ background: '#EEF2FF' }}>💶</div>
          <div className="db-kpi-label">Ingresos hoy</div>
          <div className="db-kpi-val">{ingresosHoy === null ? '—' : `€${ingresosHoy}`}</div>
          <span className={`db-kpi-sub ${ingresosHoy ? 'green' : 'muted'}`}>
            {ingresosHoy === 0 ? 'Sin ingresos hoy' : 'Citas completadas'}
          </span>
        </div>
        <div className="db-kpi">
          <div className="db-kpi-icon" style={{ background: '#F5F3FF' }}>📅</div>
          <div className="db-kpi-label">Reservas hoy</div>
          <div className="db-kpi-val">{reservasHoy === null ? '—' : reservasHoy}</div>
          <span className={`db-kpi-sub ${reservasHoy ? 'blue' : 'muted'}`}>
            {reservasHoy === 0 ? 'Sin reservas hoy' : 'Citas programadas'}
          </span>
        </div>
        <div className="db-kpi">
          <div className="db-kpi-icon" style={{ background: '#ECFDF5' }}>👥</div>
          <div className="db-kpi-label">Clientes semana</div>
          <div className="db-kpi-val">{clientesSemana === null ? '—' : clientesSemana}</div>
          <span className={`db-kpi-sub ${clientesSemana ? 'green' : 'muted'}`}>
            {clientesSemana === 0 ? 'Sin clientes nuevos' : 'Esta semana'}
          </span>
        </div>
        <div className="db-kpi">
          <div className="db-kpi-icon" style={{ background: '#FFFBEB' }}>⭐</div>
          <div className="db-kpi-label">Valoración media</div>
          <div className="db-kpi-val">{valoracion === null ? '—' : valoracion}</div>
          <span className={`db-kpi-sub ${valoracion ? 'yellow' : 'muted'}`}>
            {valoracion === null ? 'Sin reseñas' : 'Sobre 5 puntos'}
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="db-grid">
        {/* Chart */}
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Ingresos esta semana</span>
            <span className="db-card-badge">Últimos 7 días</span>
          </div>
          {barrasSemana.length === 0 ? (
            <div className="db-empty"><div className="db-empty-icon">📈</div>Sin datos aún</div>
          ) : (
            <>
              <div className="db-chart">
                {barrasSemana.map((h, i) => {
                  const isToday = i === hoyIdx
                  return (
                    <div key={i} className="db-chart-col">
                      <div className="db-chart-bar-wrap" title={`€${valoresSemana[i] ?? 0}`}>
                        <div
                          className="db-chart-bar"
                          style={{
                            height: `${h || 2}%`,
                            background: isToday
                              ? 'linear-gradient(180deg, #4F46E5 0%, #7C3AED 100%)'
                              : h > 0
                              ? 'linear-gradient(180deg, #A5B4FC 0%, #C4B5FD 100%)'
                              : '#F0F2F5',
                            opacity: h > 0 ? 1 : 0.5,
                          }}
                        />
                      </div>
                      <span className="db-chart-label" style={{ color: isToday ? '#4F46E5' : undefined, fontWeight: isToday ? 800 : 600 }}>
                        {diasSemana[i]}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="db-chart-total">
                <span className="db-chart-total-label">Total esta semana</span>
                <span className="db-chart-total-val">€{ingresosSemana}</span>
              </div>
            </>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Accesos rápidos</span>
          </div>
          <div className="db-accesos">
            {ACCESOS.map((a) => (
              <Link key={a.href} href={a.href} className="db-acceso" style={{ background: a.color, borderColor: a.border }}>
                <span className="db-acceso-icon">{a.icon}</span>
                <span className="db-acceso-label">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Second grid */}
      <div className="db-grid2">
        {/* Citas de hoy */}
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Citas de hoy</span>
            <Link href="/dashboard/reservas" className="db-card-link">Ver todas →</Link>
          </div>
          {citasHoy.length === 0 ? (
            <div className="db-empty">
              <div className="db-empty-icon">📅</div>
              No tienes citas hoy
            </div>
          ) : (
            <div>
              {citasHoy.map((r) => {
                const cfg = estadoColor[r.estado] ?? estadoColor.confirmada
                return (
                  <div key={r.id} className="db-cita">
                    <span className="db-cita-hora">{r.hora?.slice(0, 5)}</span>
                    <div className="db-cita-info">
                      <div className="db-cita-nombre">{r.cliente_nombre}</div>
                      {r.servicios?.nombre && <div className="db-cita-servicio">{r.servicios.nombre}</div>}
                    </div>
                    <span className="db-cita-badge" style={{ background: cfg.bg, color: cfg.color }}>{r.estado}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Actividad</span>
            <span className="db-card-badge">0 nuevas</span>
          </div>
          <div className="db-empty">
            <div className="db-empty-icon">🔔</div>
            Sin notificaciones recientes
          </div>
          {/* Plan actual */}
          <div style={{ marginTop: '20px', padding: '14px', background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', borderRadius: '12px', border: '1px solid #DDD6FE' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Tu plan actual</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#4F46E5', marginBottom: '4px' }}>{planLabel[negocio?.plan ?? ''] ?? 'Plan Básico'}</div>
            <div style={{ fontSize: '12px', color: '#6D28D9', opacity: 0.8 }}>Gestión completa de tu negocio</div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
