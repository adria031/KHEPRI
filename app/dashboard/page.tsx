'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, Cell, AreaChart, Area,
  PieChart, Pie, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getSessionClient, supabase } from '../lib/supabase'
import { getNegocioActivo, type NegMin } from '../lib/negocioActivo'
import { DashboardShell } from './DashboardShell'

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const DONUT_COLORS = ['#818CF8','#A78BFA','#34D399','#FBBF24','#F472B6','#38BDF8','#FB923C']

type CitaHoy = {
  id: string; hora: string; cliente_nombre: string; estado: string
  servicios: { nombre: string; precio: number } | null
  trabajadores: { nombre: string } | null
}
type Notif = { id: string; tipo: string; mensaje: string; ts: Date }
type DiaBar  = { dia: string; reservas: number; isHoy: boolean }
type SemArea = { sem: string; actual: number; anterior: number }
type DonutSlice = { name: string; value: number }

const DIAS = ['L','M','X','J','V','S','D']

function Skeleton({ w = '100%', h = 20, r = 8 }: { w?: string|number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#F3F4F6 25%,#E5E7EB 50%,#F3F4F6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
}

function KpiCard({
  icon, label, value, sub, subColor, loading,
}: {
  icon: string; label: string; value: string; sub: string
  subColor?: string; loading?: boolean
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      {loading ? <Skeleton h={32} w="70%" r={6} /> : <div className="kpi-val">{value}</div>}
      <span className="kpi-sub" style={{ color: subColor ?? '#9CA3AF', background: subColor ? `${subColor}18` : '#F3F4F6' }}>
        {sub}
      </span>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltipBar({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#4F46E5' }}>{payload[0].value} reservas</div>
    </div>
  )
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltipArea({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name === 'actual' ? 'Este mes' : 'Mes ant.'}: <b>€{p.value}</b>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [mounted, setMounted] = useState(false)
  const [cargando, setCargando] = useState(true)

  // KPIs
  const [ingresosMes, setIngresosMes]       = useState(0)
  const [ingresosMesAnt, setIngresosMesAnt] = useState(0)
  const [ingresosHoy, setIngresosHoy]       = useState(0)
  const [reservasHoy, setReservasHoy]       = useState(0)
  const [pendientes, setPendientes]         = useState(0)
  const [completadasHoy, setCompletadasHoy] = useState(0)
  const [canceladasHoy, setCanceladasHoy]   = useState(0)
  const [clientesSem, setClientesSem]       = useState(0)
  const [clientesSemAnt, setClientesSemAnt] = useState(0)
  const [valoracion, setValoracion]         = useState(0)
  const [totalResenas, setTotalResenas]     = useState(0)
  const [noShows, setNoShows]               = useState(0)
  const [tasaExito, setTasaExito]           = useState(0)

  // Charts
  const [barras7, setBarras7]   = useState<DiaBar[]>([])
  const [area4sem, setArea4sem] = useState<SemArea[]>([])
  const [donut, setDonut]       = useState<DonutSlice[]>([])

  // Agenda
  const [agenda, setAgenda] = useState<CitaHoy[]>([])

  // Métricas avanzadas
  const [horaPunta, setHoraPunta]       = useState('')
  const [servicioTop, setServicioTop]   = useState('')
  const [trabajadorTop, setTrabajadorTop] = useState('')

  // Notificaciones realtime
  const [notifs, setNotifs] = useState<Notif[]>([])

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => { setMounted(true) }, [])

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
      const ids = modoTodos ? todosNegs.map(n => n.id) : [neg.id]

      const now = new Date()
      const hoyISO          = isoLocal(now)
      const inicioMes       = new Date(now.getFullYear(), now.getMonth(), 1)
      const inicioMesISO    = isoLocal(inicioMes)
      const inicioMesAnt    = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const inicioMesAntISO = isoLocal(inicioMesAnt)
      const finMesAnt       = new Date(now.getFullYear(), now.getMonth(), 0)
      const finMesAntISO    = isoLocal(finMesAnt)
      const hace6           = new Date(now); hace6.setDate(now.getDate() - 6)
      const hace6ISO        = isoLocal(hace6)
      const inicioSem       = new Date(now); inicioSem.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      const inicioSemISO    = isoLocal(inicioSem)
      const inicioSemAnt    = new Date(inicioSem); inicioSemAnt.setDate(inicioSem.getDate() - 7)
      const inicioSemAntISO = isoLocal(inicioSemAnt)

      const [rHoy, rPeriodo, rResenas] = await Promise.all([
        db.from('reservas')
          .select('id, hora, cliente_nombre, estado, servicios(nombre, precio), trabajadores(nombre)')
          .in('negocio_id', ids).eq('fecha', hoyISO).order('hora'),
        db.from('reservas')
          .select('fecha, hora, estado, cliente_nombre, cliente_telefono, servicios(nombre, precio), trabajadores(nombre)')
          .in('negocio_id', ids).gte('fecha', inicioMesAntISO).order('fecha'),
        db.from('resenas').select('valoracion').in('negocio_id', ids),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hoyData: any[]    = rHoy.data    || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const periodData: any[] = rPeriodo.data || []
      const resenasData       = rResenas.data || []

      setAgenda(hoyData as CitaHoy[])
      setReservasHoy(hoyData.length)
      setPendientes(hoyData.filter((r: { estado: string }) => r.estado === 'confirmada' || r.estado === 'pendiente').length)
      setCompletadasHoy(hoyData.filter((r: { estado: string }) => r.estado === 'completada').length)
      setCanceladasHoy(hoyData.filter((r: { estado: string }) => r.estado === 'cancelada').length)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIngresosHoy(hoyData.filter((r: any) => r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0))

      const resMesActual = periodData.filter((r: { fecha: string }) => r.fecha >= inicioMesISO && r.fecha <= hoyISO)
      const resMesAnt    = periodData.filter((r: { fecha: string }) => r.fecha >= inicioMesAntISO && r.fecha <= finMesAntISO)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIngresosMes(resMesActual.filter((r: any) => r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIngresosMesAnt(resMesAnt.filter((r: any) => r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0))

      const totalMes = resMesActual.length
      setNoShows(resMesActual.filter((r: { estado: string }) => r.estado === 'cancelada' || r.estado === 'no_show').length)
      setTasaExito(totalMes > 0 ? Math.round(resMesActual.filter((r: { estado: string }) => r.estado === 'completada').length / totalMes * 100) : 0)

      const resSemActual = periodData.filter((r: { fecha: string }) => r.fecha >= inicioSemISO && r.fecha <= hoyISO)
      const resSemAntD   = periodData.filter((r: { fecha: string }) => r.fecha >= inicioSemAntISO && r.fecha < inicioSemISO)
      setClientesSem(new Set(resSemActual.map((r: { cliente_telefono: string }) => r.cliente_telefono).filter(Boolean)).size)
      setClientesSemAnt(new Set(resSemAntD.map((r: { cliente_telefono: string }) => r.cliente_telefono).filter(Boolean)).size)

      if (resenasData.length > 0) {
        setValoracion(Math.round(resenasData.reduce((s: number, r: { valoracion: number }) => s + (r.valoracion || 0), 0) / resenasData.length * 10) / 10)
      }
      setTotalResenas(resenasData.length)

      // BarChart 7 días
      const res7 = periodData.filter((r: { fecha: string }) => r.fecha >= hace6ISO && r.fecha <= hoyISO)
      const dias7: DiaBar[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(hace6); d.setDate(hace6.getDate() + i)
        const dISO = isoLocal(d)
        dias7.push({ dia: DIAS[d.getDay() === 0 ? 6 : d.getDay() - 1], reservas: res7.filter((r: { fecha: string }) => r.fecha === dISO).length, isHoy: dISO === hoyISO })
      }
      setBarras7(dias7)

      // AreaChart 4 semanas
      const area: SemArea[] = []
      for (let w = 3; w >= 0; w--) {
        const iniS = new Date(now); iniS.setDate(now.getDate() - ((now.getDay() + 6) % 7) - w * 7)
        const finS = new Date(iniS); finS.setDate(iniS.getDate() + 6)
        const iniA = new Date(iniS); iniA.setMonth(iniA.getMonth() - 1)
        const finA = new Date(finS); finA.setMonth(finA.getMonth() - 1)
        const [iniSISO, finSISO, iniAISO, finAISO] = [isoLocal(iniS), isoLocal(finS), isoLocal(iniA), isoLocal(finA)]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ingS = periodData.filter((r: any) => r.fecha >= iniSISO && r.fecha <= finSISO && r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ingA = periodData.filter((r: any) => r.fecha >= iniAISO && r.fecha <= finAISO && r.estado === 'completada').reduce((s: number, r: any) => s + (r.servicios?.precio || 0), 0)
        area.push({ sem: w === 0 ? 'Esta sem.' : `Sem. -${w}`, actual: ingS, anterior: ingA })
      }
      setArea4sem(area)

      // Donut servicios este mes
      const srvMap: Record<string, number> = {}
      resMesActual.forEach((r: { servicios?: { nombre?: string } | null }) => {
        const n = r.servicios?.nombre; if (n) srvMap[n] = (srvMap[n] || 0) + 1
      })
      setDonut(Object.entries(srvMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })))

      // Métricas avanzadas
      const horaMap: Record<number, number> = {}
      res7.forEach((r: { hora?: string }) => { const h = parseInt(r.hora?.slice(0, 2) || '0', 10); horaMap[h] = (horaMap[h] || 0) + 1 })
      const hPunta = Object.entries(horaMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
      if (hPunta) setHoraPunta(`${hPunta[0]}:00 h`)

      const srvTop = Object.entries(srvMap).sort((a, b) => b[1] - a[1])[0]
      if (srvTop) setServicioTop(srvTop[0])

      const trbMap: Record<string, number> = {}
      resMesActual.forEach((r: { trabajadores?: { nombre?: string } | null }) => { const n = r.trabajadores?.nombre; if (n) trbMap[n] = (trbMap[n] || 0) + 1 })
      const trbTop = Object.entries(trbMap).sort((a, b) => b[1] - a[1])[0]
      if (trbTop) setTrabajadorTop(trbTop[0])

      setCargando(false)
    })()
  }, [])

  // Realtime
  useEffect(() => {
    if (!negocio) return
    const ch = supabase.channel('db_dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservas', filter: `negocio_id=eq.${negocio.id}` }, (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = p.new as any
        setNotifs(prev => [{ id: r.id, tipo: 'reserva', mensaje: `Nueva reserva — ${r.cliente_nombre || 'cliente'} · ${r.fecha}`, ts: new Date() }, ...prev.slice(0, 9)])
        setReservasHoy(x => x + 1); setPendientes(x => x + 1)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reservas', filter: `negocio_id=eq.${negocio.id}` }, (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = p.new as any
        if (r.estado === 'cancelada') setNotifs(prev => [{ id: r.id + '_c', tipo: 'cancelacion', mensaje: `Cancelación — ${r.cliente_nombre || 'cliente'} · ${r.fecha}`, ts: new Date() }, ...prev.slice(0, 9)])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resenas', filter: `negocio_id=eq.${negocio.id}` }, (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = p.new as any
        setNotifs(prev => [{ id: r.id, tipo: 'resena', mensaje: `Nueva reseña ${r.valoracion}★ — ${(r.comentario || '').slice(0, 35)}`, ts: new Date() }, ...prev.slice(0, 9)])
        setTotalResenas(x => x + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [negocio])

  const ahora  = new Date().toTimeString().slice(0, 5)
  const proxima = agenda.find(c => c.hora >= ahora && (c.estado === 'confirmada' || c.estado === 'pendiente'))

  const pct = (a: number, b: number) => b === 0 ? null : Math.round((a - b) / b * 100)
  const ingPct = pct(ingresosMes, ingresosMesAnt)
  const cliPct = pct(clientesSem, clientesSemAnt)

  const estadoStyle: Record<string, { bg: string; color: string }> = {
    confirmada: { bg: '#EEF2FF', color: '#4F46E5' },
    completada: { bg: '#ECFDF5', color: '#059669' },
    cancelada:  { bg: '#FFF1F2', color: '#E11D48' },
    pendiente:  { bg: '#FFFBEB', color: '#D97706' },
    no_show:    { bg: '#FEF2F2', color: '#DC2626' },
  }

  const notifIcon: Record<string, string> = { reserva: '📅', cancelacion: '❌', resena: '⭐' }

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

        .db-wrap { animation: fadeUp 0.35s ease; }

        /* ── Greeting ── */
        .db-greet { margin-bottom: 28px; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .db-greet-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.8px; line-height: 1.2; }
        .db-greet-sub { font-size: 13px; color: #6B7280; margin-top: 4px; text-transform: capitalize; }
        .db-greet-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: white; border: 1px solid #E5E7EB; border-radius: 100px; font-size: 13px; font-weight: 600; color: #374151; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }

        /* ── KPI cards ── */
        .db-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        .kpi-card {
          background: white; border: 1px solid #E8ECF0; border-radius: 18px;
          padding: 22px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .kpi-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.09); transform: translateY(-2px); }
        .kpi-icon { font-size: 24px; margin-bottom: 14px; line-height: 1; }
        .kpi-label { font-size: 12px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .kpi-val { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 800; color: #111827; letter-spacing: -1.5px; line-height: 1; margin-bottom: 10px; }
        .kpi-sub { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 100px; }

        /* ── Section label ── */
        .db-section-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: #111827; letter-spacing: -0.3px; }
        .db-section-badge { font-size: 11px; background: #F3F4F6; color: #6B7280; padding: 3px 9px; border-radius: 100px; font-weight: 600; }

        /* ── Cards ── */
        .db-card {
          background: white; border: 1px solid #E8ECF0; border-radius: 18px;
          padding: 22px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .db-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .db-card-link { font-size: 12.5px; color: #4F46E5; font-weight: 600; text-decoration: none; }
        .db-card-link:hover { text-decoration: underline; }

        /* ── Grid layouts ── */
        .db-row1 { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; margin-bottom: 16px; }
        .db-row2 { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; margin-bottom: 16px; }
        .db-row3 { margin-bottom: 16px; }
        .db-row4 { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; margin-bottom: 0; }

        /* ── Bar chart ── */
        .db-chart-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #F0F2F5; }
        .db-chart-footer-label { font-size: 12px; color: #9CA3AF; }
        .db-chart-footer-val { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: #111827; }

        /* ── Stat mini rows ── */
        .db-stat-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #F3F4F6; }
        .db-stat-row:last-child { border-bottom: none; padding-bottom: 0; }
        .db-stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .db-stat-label { font-size: 12px; color: #9CA3AF; font-weight: 500; }
        .db-stat-val { font-size: 14px; font-weight: 800; color: #111827; }
        .db-stat-right { margin-left: auto; text-align: right; }

        /* ── Timeline ── */
        .db-timeline { position: relative; }
        .db-tl-item { display: flex; gap: 14px; padding: 0 0 18px; position: relative; }
        .db-tl-item:last-child { padding-bottom: 0; }
        .db-tl-line { display: flex; flex-direction: column; align-items: center; width: 16px; flex-shrink: 0; }
        .db-tl-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; border: 2px solid white; box-shadow: 0 0 0 2px currentColor; }
        .db-tl-seg { flex: 1; width: 2px; background: #F0F2F5; margin-top: 4px; }
        .db-tl-hora { font-size: 13px; font-weight: 800; color: #6B7280; min-width: 42px; padding-top: 1px; }
        .db-tl-content { flex: 1; }
        .db-tl-nombre { font-size: 13.5px; font-weight: 700; color: #111827; margin-bottom: 2px; }
        .db-tl-srv { font-size: 12px; color: #9CA3AF; }
        .db-tl-badge { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 100px; white-space: nowrap; margin-left: auto; align-self: flex-start; flex-shrink: 0; }

        /* ── Proxima cita highlight ── */
        .db-next { background: linear-gradient(135deg, #EEF2FF, #F5F3FF); border: 1px solid #DDD6FE; border-radius: 14px; padding: 14px 16px; margin-bottom: 18px; display: flex; align-items: center; gap: 12px; }
        .db-next-label { font-size: 11px; font-weight: 700; color: #7C3AED; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .db-next-val { font-size: 14px; font-weight: 800; color: #4F46E5; }
        .db-next-sub { font-size: 12px; color: #7C3AED; opacity: 0.8; }

        /* ── Donut ── */
        .db-legend-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
        .db-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .db-legend-name { font-size: 12px; color: #374151; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .db-legend-pct { font-size: 12px; font-weight: 700; color: #111827; }

        /* ── Notificaciones ── */
        .db-notif { display: flex; align-items: flex-start; gap: 10px; padding: 11px 0; border-bottom: 1px solid #F3F4F6; }
        .db-notif:last-child { border-bottom: none; }
        .db-notif-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .db-notif-msg { font-size: 12.5px; color: #374151; font-weight: 500; line-height: 1.4; }
        .db-notif-time { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
        .db-empty-state { text-align: center; padding: 28px 16px; }
        .db-empty-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.4; }
        .db-empty-txt { font-size: 13px; color: #9CA3AF; }

        /* ── Estado pills ── */
        .db-estado { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 100px; }
        .db-estado::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

        /* ── Comparativa ── */
        .db-comp-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
        .db-comp-row:last-child { border-bottom: none; }
        .db-comp-label { font-size: 12.5px; color: #374151; font-weight: 500; }
        .db-comp-vals { display: flex; align-items: center; gap: 14px; }
        .db-comp-actual { font-size: 14px; font-weight: 800; color: #111827; }
        .db-comp-ant { font-size: 12px; color: #9CA3AF; font-weight: 500; }

        /* Responsive */
        @media (max-width: 1200px) {
          .db-kpis { grid-template-columns: repeat(2, 1fr); }
          .db-row1, .db-row2, .db-row4 { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .db-kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .kpi-val { font-size: 24px; }
          .db-greet-title { font-size: 20px; }
        }
      `}</style>

      <div className="db-wrap">
        {/* Greeting */}
        <div className="db-greet">
          <div>
            <div className="db-greet-title">
              {negocio === null && todosNegocios.length > 1
                ? `${saludo}, vista global 🏢`
                : `${saludo}, ${negocio?.nombre ?? 'bienvenido'} 👋`}
            </div>
            <div className="db-greet-sub">{fechaHoy}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {notifs.length > 0 && (
              <div className="db-greet-pill">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                {notifs.length} nueva{notifs.length > 1 ? 's' : ''}
              </div>
            )}
            <Link href="/dashboard/reservas" className="db-greet-pill" style={{ textDecoration: 'none', background: '#111827', color: 'white', borderColor: '#111827' }}>
              + Nueva reserva
            </Link>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="db-kpis">
          <KpiCard
            icon="💶" label="Ingresos este mes"
            value={`€${ingresosMes.toLocaleString('es-ES')}`}
            sub={ingPct === null ? 'Sin datos anteriores' : ingPct >= 0 ? `▲ +${ingPct}% vs mes ant.` : `▼ ${ingPct}% vs mes ant.`}
            subColor={ingPct === null ? undefined : ingPct >= 0 ? '#059669' : '#E11D48'}
            loading={cargando}
          />
          <KpiCard
            icon="📅" label="Reservas hoy"
            value={String(reservasHoy)}
            sub={cargando ? '—' : `${completadasHoy} hecho · ${pendientes} pendiente · ${canceladasHoy} cancel.`}
            subColor={reservasHoy > 0 ? '#4F46E5' : undefined}
            loading={cargando}
          />
          <KpiCard
            icon="👥" label="Clientes semana"
            value={String(clientesSem)}
            sub={cliPct === null ? 'Sin datos' : cliPct >= 0 ? `▲ +${cliPct}% vs semana ant.` : `▼ ${cliPct}% vs semana ant.`}
            subColor={cliPct === null ? undefined : cliPct >= 0 ? '#059669' : '#E11D48'}
            loading={cargando}
          />
          <KpiCard
            icon="⭐" label="Valoración media"
            value={totalResenas > 0 ? `${valoracion}/5` : '—'}
            sub={totalResenas > 0 ? `${totalResenas} reseñas · Tasa éxito ${tasaExito}%` : 'Sin reseñas todavía'}
            subColor={valoracion >= 4 ? '#D97706' : undefined}
            loading={cargando}
          />
        </div>

        {/* ── Row 1: BarChart + Métricas rápidas ── */}
        <div className="db-row1">
          {/* BarChart reservas 7 días */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Reservas por día</span>
              <span className="db-section-badge">Últimos 7 días</span>
            </div>
            {mounted && barras7.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barras7} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fontWeight: 600, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 6 }} />
                    <Bar dataKey="reservas" radius={[6, 6, 0, 0]}>
                      {barras7.map((entry, i) => (
                        <Cell key={i} fill={entry.isHoy ? '#4F46E5' : '#C7D2FE'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="db-chart-footer">
                  <span className="db-chart-footer-label">Total 7 días</span>
                  <span className="db-chart-footer-val">{barras7.reduce((s, d) => s + d.reservas, 0)} reservas</span>
                </div>
              </>
            ) : (
              <div className="db-empty-state"><div className="db-empty-icon">📊</div><div className="db-empty-txt">{cargando ? 'Cargando datos…' : 'Sin reservas estos 7 días'}</div></div>
            )}
          </div>

          {/* Métricas avanzadas */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Métricas clave</span>
            </div>
            <div className="db-stat-row">
              <div className="db-stat-icon" style={{ background: '#EEF2FF' }}>⏰</div>
              <div>
                <div className="db-stat-label">Hora punta</div>
                <div className="db-stat-val">{cargando ? '—' : horaPunta || 'Sin datos'}</div>
              </div>
            </div>
            <div className="db-stat-row">
              <div className="db-stat-icon" style={{ background: '#ECFDF5' }}>🔧</div>
              <div>
                <div className="db-stat-label">Servicio más popular</div>
                <div className="db-stat-val" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cargando ? '—' : servicioTop || 'Sin datos'}</div>
              </div>
            </div>
            <div className="db-stat-row">
              <div className="db-stat-icon" style={{ background: '#FFF7ED' }}>👤</div>
              <div>
                <div className="db-stat-label">Trabajador top del mes</div>
                <div className="db-stat-val" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cargando ? '—' : trabajadorTop || 'Sin datos'}</div>
              </div>
            </div>
            <div className="db-stat-row">
              <div className="db-stat-icon" style={{ background: '#FEF2F2' }}>❌</div>
              <div>
                <div className="db-stat-label">Cancelaciones este mes</div>
                <div className="db-stat-val">{cargando ? '—' : noShows}</div>
              </div>
            </div>
            <div className="db-stat-row">
              <div className="db-stat-icon" style={{ background: '#F5F3FF' }}>✅</div>
              <div>
                <div className="db-stat-label">Tasa de éxito</div>
                <div className="db-stat-val">{cargando ? '—' : `${tasaExito}%`}</div>
              </div>
              <div className="db-stat-right">
                {!cargando && (
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: '#F0F2F5', overflow: 'hidden' }}>
                    <div style={{ width: `${tasaExito}%`, height: '100%', background: tasaExito >= 70 ? '#10B981' : tasaExito >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 3 }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Agenda del día + Donut servicios ── */}
        <div className="db-row2">
          {/* Agenda */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Agenda de hoy</span>
              <Link href="/dashboard/reservas" className="db-card-link">Ver todas →</Link>
            </div>

            {/* Próxima cita destacada */}
            {proxima && (
              <div className="db-next">
                <div style={{ fontSize: 28 }}>⏱️</div>
                <div>
                  <div className="db-next-label">Próxima cita</div>
                  <div className="db-next-val">{proxima.hora?.slice(0, 5)} — {proxima.cliente_nombre}</div>
                  {proxima.servicios?.nombre && <div className="db-next-sub">{proxima.servicios.nombre}</div>}
                </div>
              </div>
            )}

            {agenda.length === 0 ? (
              <div className="db-empty-state">
                <div className="db-empty-icon">📅</div>
                <div className="db-empty-txt">{cargando ? 'Cargando agenda…' : 'No hay citas para hoy'}</div>
              </div>
            ) : (
              <div className="db-timeline">
                {agenda.map((cita, i) => {
                  const st = estadoStyle[cita.estado] ?? estadoStyle.confirmada
                  const esProxima = cita.id === proxima?.id
                  return (
                    <div key={cita.id} className="db-tl-item" style={esProxima ? { background: '#FAFBFF', margin: '0 -22px', padding: '10px 22px 10px', borderRadius: 0 } : {}}>
                      <div className="db-tl-line">
                        <div className="db-tl-dot" style={{ color: st.color, background: st.bg }} />
                        {i < agenda.length - 1 && <div className="db-tl-seg" />}
                      </div>
                      <span className="db-tl-hora">{cita.hora?.slice(0, 5)}</span>
                      <div className="db-tl-content">
                        <div className="db-tl-nombre">{cita.cliente_nombre}</div>
                        {cita.servicios?.nombre && <div className="db-tl-srv">{cita.servicios.nombre}{cita.trabajadores?.nombre ? ` · ${cita.trabajadores.nombre}` : ''}</div>}
                      </div>
                      <span className="db-tl-badge" style={{ background: st.bg, color: st.color }}>{cita.estado}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Donut servicios */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Servicios del mes</span>
              <span className="db-section-badge">Top 6</span>
            </div>
            {mounted && donut.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={donut} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                      {donut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any, n: any) => [`${v} reservas`, n]}
                      contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 4 }}>
                  {donut.map((item, i) => {
                    const total = donut.reduce((s, d) => s + d.value, 0)
                    return (
                      <div key={i} className="db-legend-item">
                        <div className="db-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="db-legend-name">{item.name}</span>
                        <span className="db-legend-pct">{Math.round(item.value / total * 100)}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="db-empty-state"><div className="db-empty-icon">🍩</div><div className="db-empty-txt">{cargando ? 'Cargando…' : 'Sin servicios reservados este mes'}</div></div>
            )}
          </div>
        </div>

        {/* ── Row 3: AreaChart ingresos 4 semanas ── */}
        <div className="db-row3">
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Ingresos — comparativa mensual</span>
              <span className="db-section-badge">Últimas 4 semanas</span>
            </div>
            {mounted && area4sem.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={area4sem} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAnt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4B5FD" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#C4B5FD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="sem" tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<CustomTooltipArea />} />
                  <Area type="monotone" dataKey="anterior" name="anterior" stroke="#C4B5FD" strokeWidth={2} strokeDasharray="4 3" fill="url(#gradAnt)" dot={false} />
                  <Area type="monotone" dataKey="actual" name="actual" stroke="#818CF8" strokeWidth={2.5} fill="url(#gradActual)" dot={{ fill: '#818CF8', r: 4, strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="db-empty-state"><div className="db-empty-icon">📈</div><div className="db-empty-txt">{cargando ? 'Cargando…' : 'Sin datos de ingresos'}</div></div>
            )}
            {!cargando && (
              <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F2F5', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 3, background: '#818CF8', borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Este mes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 3, background: '#C4B5FD', borderRadius: 2, backgroundImage: 'repeating-linear-gradient(90deg,#C4B5FD,#C4B5FD 4px,transparent 4px,transparent 7px)' }} />
                  <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Mes anterior</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Total este mes</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#111827' }}>€{ingresosMes.toLocaleString('es-ES')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Hoy</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#4F46E5' }}>€{ingresosHoy.toLocaleString('es-ES')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 4: Notificaciones realtime + Comparativa ── */}
        <div className="db-row4">
          {/* Notificaciones */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Actividad en tiempo real</span>
              {notifs.length > 0 && (
                <span style={{ fontSize: 11, background: '#ECFDF5', color: '#059669', padding: '3px 9px', borderRadius: 100, fontWeight: 700 }}>
                  {notifs.length} nueva{notifs.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="db-empty-state">
                <div className="db-empty-icon">🔔</div>
                <div className="db-empty-txt">Sin actividad reciente · Las nuevas reservas y reseñas aparecerán aquí en tiempo real</div>
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id} className="db-notif">
                  <div className="db-notif-icon" style={{ background: n.tipo === 'reserva' ? '#EEF2FF' : n.tipo === 'cancelacion' ? '#FFF1F2' : '#FFFBEB' }}>
                    {notifIcon[n.tipo] ?? '🔔'}
                  </div>
                  <div>
                    <div className="db-notif-msg">{n.mensaje}</div>
                    <div className="db-notif-time">{n.ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comparativa rápida */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Resumen del mes</span>
            </div>
            <div className="db-comp-row">
              <span className="db-comp-label">💶 Ingresos</span>
              <div className="db-comp-vals">
                <span className="db-comp-ant">€{ingresosMesAnt.toLocaleString('es-ES')} mes ant.</span>
                <span className="db-comp-actual">€{ingresosMes.toLocaleString('es-ES')}</span>
              </div>
            </div>
            <div className="db-comp-row">
              <span className="db-comp-label">📅 Reservas</span>
              <div className="db-comp-vals">
                <span className="db-comp-ant">{completadasHoy} completadas hoy</span>
                <span className="db-comp-actual">{reservasHoy} hoy</span>
              </div>
            </div>
            <div className="db-comp-row">
              <span className="db-comp-label">⭐ Reseñas</span>
              <div className="db-comp-vals">
                <span className="db-comp-ant">{totalResenas} total</span>
                <span className="db-comp-actual">{valoracion > 0 ? `${valoracion}/5` : '—'}</span>
              </div>
            </div>
            <div className="db-comp-row">
              <span className="db-comp-label">✅ Tasa éxito</span>
              <div className="db-comp-vals">
                <span className="db-comp-ant">{noShows} cancelaciones</span>
                <span className="db-comp-actual">{tasaExito}%</span>
              </div>
            </div>
            <div className="db-comp-row">
              <span className="db-comp-label">👥 Clientes</span>
              <div className="db-comp-vals">
                <span className="db-comp-ant">{clientesSemAnt} sem. ant.</span>
                <span className="db-comp-actual">{clientesSem} esta sem.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
