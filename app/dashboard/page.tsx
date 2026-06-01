'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, AreaChart, Area } from 'recharts'
import { supabase, getSessionClient } from '../lib/supabase'
import { getNegocioActivo, type NegMin } from '../lib/negocioActivo'
import { setNegocioActivo } from '../lib/negocio-activo'
import { DashboardShell } from './DashboardShell'
import { PLANES } from '../lib/planes'

const CHART_COLORS = ['#818CF8','#A78BFA','#34D399','#FBBF24','#F472B6','#38BDF8','#FB923C']

// Guard: return false on server, true after hydration — fixes ResponsiveContainer width=-1
function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => { setM(true) }, [])
  return m
}

const CHART_PLACEHOLDER = <div style={{ width: '100%', height: 250, minHeight: 250 }} />

function BarChartNoSSR({ data }: { data: { nombre: string; reservas: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return CHART_PLACEHOLDER
  return (
    <div style={{ width: '100%', height: 250, minHeight: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barSize={8} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
          <XAxis dataKey="nombre" tick={{ fontSize: 9, fontWeight: 600, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }} />
          <Bar dataKey="reservas" fill="#B8D8F8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PieChartNoSSR({ data }: { data: { name: string; value: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return CHART_PLACEHOLDER
  return (
    <div style={{ width: '100%', height: 250, minHeight: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [`${v} reservas`, n]} contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function AreaChartNoSSR({ data }: { data: { sem: string; actual: number; anterior: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return CHART_PLACEHOLDER
  return (
    <div style={{ width: '100%', height: 250, minHeight: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
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
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }} />
          <Area type="monotone" dataKey="anterior" name="Mes ant." stroke="#C4B5FD" strokeWidth={2} strokeDasharray="4 3" fill="url(#gradAnt)" dot={false} />
          <Area type="monotone" dataKey="actual" name="Este mes" stroke="#818CF8" strokeWidth={2.5} fill="url(#gradActual)" dot={{ fill: '#818CF8', r: 4, strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function BizBarChartNoSSR({ data }: { data: { nombre: string; reservas: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return CHART_PLACEHOLDER
  return (
    <div style={{ width: '100%', height: 250, minHeight: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
          <XAxis dataKey="nombre" tick={{ fontSize: 11, fontWeight: 600, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }} formatter={(v) => [`${v} reservas`, 'Mes actual']} />
          <Bar dataKey="reservas" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const DONUT_COLORS = ['#818CF8','#A78BFA','#34D399','#FBBF24','#F472B6','#38BDF8','#FB923C']

type CitaHoy = {
  id: string; hora: string; cliente_nombre: string; estado: string
  servicios: { nombre: string; precio: number } | null
  trabajadores: { nombre: string } | null
}
type BizStat = {
  id: string; nombre: string; plan: string
  reservasHoy: number; ingresosMes: number; creditosDisp: number; creditosTot: number
  reservasMes: number
}
type Notif = { id: string; tipo: string; mensaje: string; ts: Date }
type DiaBar  = { dia: string; reservas: number; isHoy: boolean }
type SemArea = { sem: string; actual: number; anterior: number }
type DonutSlice = { name: string; value: number }

const DIAS = ['L','M','X','J','V','S','D']

type ChecklistT = { logo: boolean; servicios: boolean; horarios: boolean; trabajadores: boolean; enlaceCompartido: boolean }

function calcularAlertaFiscal(): { dias: number; trimestre: string } | null {
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const year = hoy.getFullYear()
  const venc = [
    { fecha: new Date(year, 3, 20), t: 'T1 (ene–mar)' },
    { fecha: new Date(year, 6, 20), t: 'T2 (abr–jun)' },
    { fecha: new Date(year, 9, 20), t: 'T3 (jul–sep)' },
    { fecha: new Date(year + 1, 0, 30), t: 'T4 (oct–dic)' },
  ]
  for (const v of venc) {
    v.fecha.setHours(0,0,0,0)
    const dias = Math.ceil((v.fecha.getTime() - hoy.getTime()) / 86400000)
    if (dias >= 0 && dias <= 15) return { dias, trimestre: v.t }
  }
  return null
}

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
  const [reservasEnRiesgo, setReservasEnRiesgo] = useState(0)
  const [sinNegocio, setSinNegocio] = useState(false)

  // Charts
  const [barras7, setBarras7]   = useState<DiaBar[]>([])
  const [area4sem, setArea4sem] = useState<SemArea[]>([])
  const [donut, setDonut]       = useState<DonutSlice[]>([])

  const chartData = [
    { nombre: 'Lun', reservas: 4 },
    { nombre: 'Mar', reservas: 6 },
    { nombre: 'Mié', reservas: 3 },
    { nombre: 'Jue', reservas: 8 },
    { nombre: 'Vie', reservas: 10 },
    { nombre: 'Sáb', reservas: 12 },
    { nombre: 'Dom', reservas: 2 },
  ]

  // Agenda
  const [agenda, setAgenda] = useState<CitaHoy[]>([])

  // Métricas avanzadas
  const [horaPunta, setHoraPunta]       = useState('')
  const [servicioTop, setServicioTop]   = useState('')
  const [trabajadorTop, setTrabajadorTop] = useState('')

  // Plan y créditos IA
  const [planActual, setPlanActual] = useState<string>('starter')
  const [creditos, setCreditos] = useState<{ totales: number; usados: number; disponibles: number; pct: number } | null>(null)

  // Notificaciones realtime
  const [notifs, setNotifs] = useState<Notif[]>([])

  // Per-business stats (modo todos)
  const [bizStats, setBizStats] = useState<BizStat[]>([])

  // Predicciones y alertas
  const [alertaFiscal] = useState<{ dias: number; trimestre: string } | null>(calcularAlertaFiscal)
  const [clientesEnRiesgo, setClientesEnRiesgo] = useState(0)
  const [checklist, setChecklist] = useState<ChecklistT | null>(null)

  const hora = mounted ? new Date().getHours() : 12
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const fechaHoy = mounted ? new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { setCargando(false); return }
      const user = session.user

      const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id)
      if (!neg) { setSinNegocio(true); setCargando(false); return }
      setTodosNegocios(todosNegs)

      const modoTodos = localStorage.getItem('negocio_activo_id') === 'todos' && todosNegs.length > 1
      setNegocio(modoTodos ? null : neg)
      const ids = modoTodos ? todosNegs.map(n => n.id) : [neg.id]

      // Créditos y plan — se leen del perfil del usuario
      const { data: profileData } = await db
        .from('profiles')
        .select('plan, creditos_totales, creditos_usados')
        .eq('id', user.id)
        .single()

      let planFinal = profileData?.plan ?? ''
      if (!planFinal || planFinal === 'starter') {
        // profiles.plan vacío o en default → leer del primer negocio y sincronizar
        const { data: negPlan } = await db
          .from('negocios')
          .select('plan')
          .eq('user_id', user.id)
          .order('creado_en', { ascending: true })
          .single()
        if (negPlan?.plan && negPlan.plan !== 'starter') {
          planFinal = negPlan.plan
          await db.from('profiles').update({ plan: planFinal }).eq('id', user.id)
        } else {
          planFinal = planFinal || 'starter'
        }
      }

      // Corregir creditos_totales si no coincide con el plan
      const creditosCorrectos = PLANES[planFinal]?.creditos ?? 100
      const totales     = creditosCorrectos
      const usados      = profileData?.creditos_usados  ?? 0
      const disponibles = Math.max(0, totales - usados)
      const pct = totales > 0 ? Math.round((disponibles / totales) * 100) : 0
      if ((profileData?.creditos_totales ?? 0) !== creditosCorrectos) {
        db.from('profiles').update({ creditos_totales: creditosCorrectos }).eq('id', user.id)
      }
      setCreditos({ totales, usados, disponibles, pct })
      setPlanActual(planFinal)

      // Fechas de referencia (hora local, igual que el original)
      const now           = new Date()
      const hoyISO        = isoLocal(now)
      const inicioMes     = new Date(now.getFullYear(), now.getMonth(), 1)
      const inicioMesISO  = isoLocal(inicioMes)
      const inicioMesAnt  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const inicioMesAntISO = isoLocal(inicioMesAnt)
      const finMesAnt     = new Date(now.getFullYear(), now.getMonth(), 0)
      const finMesAntISO  = isoLocal(finMesAnt)
      const hace6         = new Date(now); hace6.setDate(now.getDate() - 6)
      const hace6ISO      = isoLocal(hace6)
      const inicioSem     = new Date(now); inicioSem.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      const inicioSemISO  = isoLocal(inicioSem)
      const inicioSemAnt  = new Date(inicioSem); inicioSemAnt.setDate(inicioSem.getDate() - 7)
      const inicioSemAntISO = isoLocal(inicioSemAnt)

      // Tres queries en paralelo — igual que el original que funcionaba
      const [rHoy, rPeriodo, rResenas] = await Promise.all([
        db.from('reservas')
          .select('id, hora, cliente_nombre, estado, servicios(nombre, precio), trabajadores(nombre)')
          .in('negocio_id', ids).eq('fecha', hoyISO).order('hora'),
        db.from('reservas')
          .select('negocio_id, fecha, hora, estado, cliente_nombre, cliente_telefono, precio_total, servicios(nombre, precio), trabajadores(nombre)')
          .in('negocio_id', ids).gte('fecha', inicioMesAntISO).order('fecha'),
        db.from('resenas').select('valoracion').in('negocio_id', ids),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hoyData: any[]    = rHoy.data    ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const periodData: any[] = rPeriodo.data ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resenasData: any[] = rResenas.data ?? []

      // Agenda + KPIs hoy
      setAgenda(hoyData as CitaHoy[])
      setReservasHoy(hoyData.length)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPendientes(hoyData.filter((r: any) => r.estado === 'confirmada' || r.estado === 'pendiente').length)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCompletadasHoy(hoyData.filter((r: any) => r.estado === 'completada').length)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCanceladasHoy(hoyData.filter((r: any) => r.estado === 'cancelada').length)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIngresosHoy(hoyData.filter((r: any) => r.estado === 'completada').reduce((s: number, r: any) => s + (r.precio_total || r.servicios?.precio || 0), 0))

      // KPIs mensuales
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resMesActual: any[] = periodData.filter((r: any) => r.fecha >= inicioMesISO && r.fecha <= hoyISO)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resMesAnt: any[]    = periodData.filter((r: any) => r.fecha >= inicioMesAntISO && r.fecha <= finMesAntISO)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIngresosMes(resMesActual.filter((r: any) => r.estado === 'completada').reduce((s: number, r: any) => s + (r.precio_total || r.servicios?.precio || 0), 0))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIngresosMesAnt(resMesAnt.filter((r: any) => r.estado === 'completada').reduce((s: number, r: any) => s + (r.precio_total || r.servicios?.precio || 0), 0))
      const totalMes = resMesActual.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setNoShows(resMesActual.filter((r: any) => r.estado === 'cancelada' || r.estado === 'no_show').length)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTasaExito(totalMes > 0 ? Math.round(resMesActual.filter((r: any) => r.estado === 'completada').length / totalMes * 100) : 0)

      // Clientes semana
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resSemActual = periodData.filter((r: any) => r.fecha >= inicioSemISO && r.fecha <= hoyISO)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resSemAntD   = periodData.filter((r: any) => r.fecha >= inicioSemAntISO && r.fecha < inicioSemISO)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClientesSem(new Set(resSemActual.map((r: any) => r.cliente_telefono).filter(Boolean)).size)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClientesSemAnt(new Set(resSemAntD.map((r: any) => r.cliente_telefono).filter(Boolean)).size)

      // Reseñas
      if (resenasData.length > 0) {
        setValoracion(Math.round(resenasData.reduce((s: number, r: { valoracion: number }) => s + (r.valoracion || 0), 0) / resenasData.length * 10) / 10)
      }
      setTotalResenas(resenasData.length)

      // BarChart 7 días (igual que el original)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res7 = periodData.filter((r: any) => r.fecha >= hace6ISO && r.fecha <= hoyISO)
      const dias7: DiaBar[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(hace6); d.setDate(hace6.getDate() + i)
        const dISO = isoLocal(d)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dias7.push({ dia: DIAS[d.getDay() === 0 ? 6 : d.getDay() - 1], reservas: res7.filter((r: any) => r.fecha === dISO).length, isHoy: dISO === hoyISO })
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
        const ingS = periodData.filter((r: any) => r.fecha >= iniSISO && r.fecha <= finSISO && r.estado === 'completada').reduce((s: number, r: any) => s + (r.precio_total || r.servicios?.precio || 0), 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ingA = periodData.filter((r: any) => r.fecha >= iniAISO && r.fecha <= finAISO && r.estado === 'completada').reduce((s: number, r: any) => s + (r.precio_total || r.servicios?.precio || 0), 0)
        area.push({ sem: w === 0 ? 'Esta sem.' : `Sem. -${w}`, actual: ingS, anterior: ingA })
      }
      setArea4sem(area)

      // Donut servicios
      const srvMap: Record<string, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resMesActual.forEach((r: any) => { const n = r.servicios?.nombre; if (n) srvMap[n] = (srvMap[n] || 0) + 1 })
      setDonut(Object.entries(srvMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })))

      // Métricas avanzadas
      const horaMap: Record<number, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res7.forEach((r: any) => { const h = parseInt(r.hora?.slice(0, 2) || '0', 10); horaMap[h] = (horaMap[h] || 0) + 1 })
      const hPunta = Object.entries(horaMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
      if (hPunta) setHoraPunta(`${hPunta[0]}:00 h`)
      const srvTop = Object.entries(srvMap).sort((a, b) => b[1] - a[1])[0]
      if (srvTop) setServicioTop(srvTop[0])
      const trbMap: Record<string, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resMesActual.forEach((r: any) => { const n = r.trabajadores?.nombre; if (n) trbMap[n] = (trbMap[n] || 0) + 1 })
      const trbTop = Object.entries(trbMap).sort((a, b) => b[1] - a[1])[0]
      if (trbTop) setTrabajadorTop(trbTop[0])

      // Reservas en riesgo hoy (feature añadida después)
      const statsPorTel: Record<string, { total: number; cancelaciones: number }> = {}
      for (const r of periodData) {
        const tel: string = r.cliente_telefono
        if (!tel) continue
        if (!statsPorTel[tel]) statsPorTel[tel] = { total: 0, cancelaciones: 0 }
        if (r.estado === 'completada') statsPorTel[tel].total++
        else if (r.estado === 'cancelada') statsPorTel[tel].cancelaciones++
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enRiesgo = hoyData.filter((r: any) => r.estado === 'confirmada' || r.estado === 'pendiente').filter((r: any) => {
        const tel: string = r.cliente_telefono
        if (!tel) return false
        const s = statsPorTel[tel]
        if (!s || s.total + s.cancelaciones <= 3) return false
        return s.total > 0 && (s.cancelaciones / s.total * 100) > 50
      })
      setReservasEnRiesgo(enRiesgo.length)

      // Per-business stats (modo todos)
      if (modoTodos) {
        const bs: BizStat[] = todosNegs.map(tn => {
          const negRes  = periodData.filter((r: { negocio_id: string }) => r.negocio_id === tn.id)
          const negHoy  = negRes.filter((r: { fecha: string }) => r.fecha === hoyISO)
          const negMes  = negRes.filter((r: { fecha: string }) => r.fecha >= inicioMesISO && r.fecha <= hoyISO)
          const negIng  = negMes.filter((r: { estado: string }) => r.estado === 'completada').reduce((s: number, r: { precio_total?: number; servicios?: { precio?: number } }) => s + (r.precio_total || r.servicios?.precio || 0), 0)
          return { id: tn.id, nombre: tn.nombre, plan: planFinal, reservasHoy: negHoy.length, ingresosMes: negIng, reservasMes: negMes.length, creditosDisp: disponibles, creditosTot: totales }
        })
        setBizStats(bs)
      }

      // Clientes VIP en riesgo (feature añadida después)
      const hace30ISO = isoLocal(new Date(now.getTime() - 30 * 86400000))
      const statRiesgo: Record<string, { visitas: number; ultima: string }> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of periodData.filter((x: any) => x.estado !== 'cancelada')) {
        const tel: string = r.cliente_telefono
        if (!tel) continue
        if (!statRiesgo[tel]) statRiesgo[tel] = { visitas: 0, ultima: '' }
        statRiesgo[tel].visitas++
        if (r.fecha > statRiesgo[tel].ultima) statRiesgo[tel].ultima = r.fecha
      }
      setClientesEnRiesgo(Object.values(statRiesgo).filter(c => c.visitas >= 6 && c.ultima < hace30ISO).length)

      // Checklist configuración
      try {
        const ya = localStorage.getItem(`checklist_ok_${neg.id}`)
        if (ya !== 'true') {
          const [{ data: negLogo }, { count: cSrv }, { count: cHor }, { count: cTrb }] = await Promise.all([
            db.from('negocios').select('logo_url').eq('id', neg.id).single(),
            db.from('servicios').select('id', { count: 'exact', head: true }).eq('negocio_id', neg.id).eq('activo', true),
            db.from('horarios').select('id', { count: 'exact', head: true }).eq('negocio_id', neg.id).eq('abierto', true),
            db.from('trabajadores').select('id', { count: 'exact', head: true }).eq('negocio_id', neg.id).eq('activo', true),
          ])
          const cl: ChecklistT = {
            logo: !!negLogo?.logo_url,
            servicios: (cSrv ?? 0) > 0,
            horarios: (cHor ?? 0) > 0,
            trabajadores: (cTrb ?? 0) > 0,
            enlaceCompartido: localStorage.getItem(`enlace_compartido_${neg.id}`) === 'true',
          }
          const done = Object.values(cl).filter(Boolean).length
          if (done >= 5) localStorage.setItem(`checklist_ok_${neg.id}`, 'true')
          else setChecklist(cl)
        }
      } catch { /* ignorar */ }

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

  const ahora  = mounted ? new Date().toTimeString().slice(0, 5) : '00:00'
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
        .kpi-val { font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 10px; }
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
        .db-chart-footer-val { font-size: 15px; font-weight: 800; color: #111827; letter-spacing: -0.3px; }

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
          .kpi-val { font-size: 22px; }
          .db-greet-title { font-size: 20px; }
        }

        /* ── Vista consolidada negocios ── */
        .biz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .biz-card { background: white; border: 1px solid #E8ECF0; border-radius: 16px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: box-shadow 0.2s, transform 0.2s; cursor: pointer; }
        .biz-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.09); transform: translateY(-2px); }
        .biz-card-av { width: 40px; height: 40px; border-radius: 11px; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #4F46E5; flex-shrink: 0; }
        .biz-card-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #F3F4F6; }
        .biz-card-row:last-child { border-bottom: none; padding-bottom: 0; }

        /* ── Créditos IA ── */
        .cr-bar-wrap { background: white; border: 1px solid #E8ECF0; border-radius: 16px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .cr-bar-icon { font-size: 22px; flex-shrink: 0; }
        .cr-bar-body { flex: 1; min-width: 0; }
        .cr-bar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .cr-bar-label { font-size: 13px; font-weight: 700; color: #111827; }
        .cr-bar-nums { font-size: 12px; color: #6B7280; font-weight: 600; }
        .cr-bar-track { height: 8px; border-radius: 100px; background: #F3F4F6; overflow: hidden; }
        .cr-bar-fill { height: 100%; border-radius: 100px; transition: width 0.6s ease; }
        .cr-bar-warn { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 3px 10px; background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 100px; font-size: 11px; font-weight: 700; color: #92400E; }
        .cr-bar-ok { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 3px 10px; background: #ECFDF5; border: 1px solid #6EE7B7; border-radius: 100px; font-size: 11px; font-weight: 700; color: #065F46; }

        /* ── Alerta fiscal ── */
        .db-fiscal { display:flex; align-items:center; gap:10px; border-radius:12px; padding:11px 16px; margin-bottom:16px; font-size:13px; font-weight:600; }
        .db-fiscal-yellow { background:rgba(254,243,199,0.8); border:1px solid #FDE68A; color:#92400E; }
        .db-fiscal-red { background:rgba(254,226,226,0.8); border:1px solid #FECACA; color:#991B1B; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.8} }

        /* ── Clientes en riesgo ── */
        .db-riesgo-widget { display:flex; align-items:center; gap:14px; background:linear-gradient(135deg,#FFF1F2,#FFF5F5); border:1px solid #FECACA; border-radius:14px; padding:16px 18px; margin-bottom:16px; }
        .db-riesgo-count { font-size:32px; font-weight:900; color:#DC2626; letter-spacing:-1px; line-height:1; }
        .db-riesgo-label { font-size:13px; font-weight:700; color:#991B1B; }
        .db-riesgo-sub { font-size:12px; color:#EF4444; margin-top:2px; }

        /* ── Checklist configuración ── */
        .db-checklist { background:white; border:1px solid #E8ECF0; border-radius:18px; padding:20px 22px; box-shadow:0 2px 8px rgba(0,0,0,0.04); margin-bottom:16px; }
        .db-cl-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .db-cl-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:800; color:#111827; }
        .db-cl-progress { height:7px; background:#F3F4F6; border-radius:100px; overflow:hidden; margin-bottom:14px; }
        .db-cl-fill { height:100%; border-radius:100px; transition:width 0.6s ease; background:linear-gradient(90deg,#34D399,#10B981); }
        .db-cl-items { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:8px; }
        .db-cl-item { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:10px; font-size:12.5px; font-weight:600; text-decoration:none; border:1.5px solid transparent; transition:all .15s; cursor:pointer; background:none; font-family:inherit; }
        .db-cl-item-done { color:#065F46; background:rgba(52,211,153,0.1); border-color:rgba(52,211,153,0.3); }
        .db-cl-item-todo { color:#4B5563; background:#F9FAFB; border-color:#E5E7EB; }
        .db-cl-item-todo:hover { border-color:#4F46E5; color:#4F46E5; background:#EEF2FF; }
        .db-cl-check { width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; }
        .db-cl-check-done { background:#10B981; color:white; }
        .db-cl-check-todo { background:#E5E7EB; }
        .db-cl-dismiss { font-size:11px; color:#9CA3AF; background:none; border:none; cursor:pointer; font-family:inherit; font-weight:600; padding:4px 8px; border-radius:6px; transition:color .15s; }
        .db-cl-dismiss:hover { color:#374151; background:#F3F4F6; }
      `}</style>

      {sinNegocio && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48 }}>🏪</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>Configura tu negocio para empezar</div>
          <div style={{ fontSize: 14, color: '#6B7280', maxWidth: 360 }}>Aún no tienes un negocio creado. Completa el proceso de configuración para acceder a tu dashboard.</div>
          <Link href="/onboarding" style={{ marginTop: 8, padding: '12px 28px', background: '#111827', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Crear mi negocio
          </Link>
        </div>
      )}

      {!sinNegocio && <div className="db-wrap">
        {/* Greeting */}
        <div className="db-greet">
          <div>
            <div className="db-greet-title">
              {negocio === null && todosNegocios.length > 1
                ? `Vista general — ${todosNegocios.length} negocios activos 🏢`
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

        {/* ── TEST CHART (diagnóstico — eliminar cuando funcione) ── */}
        {mounted && (
          <div style={{ width: '100%', height: 300, minHeight: 300, background: 'white', border: '2px solid red', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'red', fontWeight: 700, marginBottom: 8 }}>TEST CHART — si ves esto pero no la gráfica, el problema es Recharts</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[{ name: 'Lun', value: 4 }, { name: 'Mar', value: 6 }, { name: 'Mié', value: 3 }]}>
                <XAxis dataKey="name" />
                <YAxis />
                <Bar dataKey="value" fill="#B8D8F8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Resumen por negocio (modo todos) ── */}
        {negocio === null && bizStats.length > 1 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="db-section-title">Resumen por negocio</span>
              <span className="db-section-badge">{bizStats.length} activos</span>
            </div>
            <div className="biz-grid">
              {bizStats.map(b => {
                const ini = b.nombre.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
                const creditPct = b.creditosTot > 0 ? Math.round((b.creditosDisp / b.creditosTot) * 100) : 0
                return (
                  <div
                    key={b.id}
                    className="biz-card"
                    onClick={() => {
                      const neg = todosNegocios.find(n => n.id === b.id)
                      if (neg) {
                        setNegocioActivo(neg.id, planActual, neg.nombre)
                        window.location.reload()
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div className="biz-card-av">{ini}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.nombre}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: '#EEF2FF', color: '#4F46E5' }}>
                          {b.plan === 'pro' ? 'Pro' : b.plan === 'plus' || b.plan === 'agencia' ? 'Plus' : b.plan === 'basico' ? 'Básico' : 'Starter'}
                        </span>
                      </div>
                    </div>
                    <div className="biz-card-row">
                      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>📅 Reservas hoy</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: b.reservasHoy > 0 ? '#4F46E5' : '#111827' }}>{b.reservasHoy}</span>
                    </div>
                    <div className="biz-card-row">
                      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>💶 Ingresos mes</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>€{b.ingresosMes.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="biz-card-row">
                      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>⚡ Créditos</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: creditPct <= 20 ? '#EF4444' : '#111827' }}>{b.creditosDisp}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Gráfica comparativa */}
            {bizStats.some(b => b.reservasMes > 0) && (
              <div className="db-card" style={{ marginBottom: 20 }}>
                <div className="db-card-head">
                  <span className="db-section-title">Comparativa negocios</span>
                  <span className="db-section-badge">Reservas este mes</span>
                </div>
                <BizBarChartNoSSR data={bizStats.map(b => ({ nombre: b.nombre.split(' ')[0], reservas: b.reservasMes }))} />
              </div>
            )}
          </>
        )}

        {/* ── Créditos IA ── */}
        {creditos && (
          <div className="cr-bar-wrap">
            <div className="cr-bar-icon">⚡</div>
            <div className="cr-bar-body">
              <div className="cr-bar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="cr-bar-label">Créditos IA disponibles</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                    background: planActual === 'plus' ? 'linear-gradient(135deg,#D4C5F9,#B8D8F8)'
                      : planActual === 'pro' ? 'linear-gradient(135deg,#FDE68A,#FCA5A5)'
                      : planActual === 'basico' ? 'linear-gradient(135deg,#B8EDD4,#B8D8F8)'
                      : planActual === 'beta' ? 'linear-gradient(135deg,#D4C5F9,#B8EDD4)'
                      : '#F3F4F6',
                    color: planActual === 'plus' ? '#6B4FD8'
                      : planActual === 'pro' ? '#92400E'
                      : planActual === 'basico' ? '#065F46'
                      : planActual === 'beta' ? '#4F46E5'
                      : '#6B7280',
                  }}>
                    {planActual === 'plus' ? 'Plus' : planActual === 'pro' ? 'Pro' : planActual === 'basico' ? 'Básico' : planActual === 'beta' ? 'Beta' : 'Starter'}
                  </span>
                </div>
                <span className="cr-bar-nums">{creditos.disponibles} / {creditos.totales}</span>
              </div>
              <div className="cr-bar-track">
                <div
                  className="cr-bar-fill"
                  style={{
                    width: `${creditos.pct}%`,
                    background: creditos.pct > 50
                      ? 'linear-gradient(90deg,#34D399,#10B981)'
                      : creditos.pct > 20
                        ? 'linear-gradient(90deg,#FBBF24,#F59E0B)'
                        : 'linear-gradient(90deg,#F87171,#EF4444)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {creditos.pct <= 20 ? (
                  <span className="cr-bar-warn">⚠️ Quedan pocos créditos — renueva tu plan</span>
                ) : (
                  <span className="cr-bar-ok">✓ {creditos.pct}% disponible</span>
                )}
                {planActual !== 'plus' && planActual !== 'beta' && (
                  <Link href="/upgrade" style={{ fontSize: 12, fontWeight: 700, color: '#6B4FD8', textDecoration: 'none' }}>
                    Ver planes →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Nota dominio email ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(253,230,138,0.25)', border: '1px solid rgba(253,230,138,0.8)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>Los emails funcionarán completamente cuando verifiques el dominio <strong>khepria.app</strong> en <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" style={{ color: '#92400E', fontWeight: 700 }}>resend.com/domains</a></span>
        </div>

        {/* ── Alerta fiscal trimestral ── */}
        {alertaFiscal && mounted && (
          <div className={`db-fiscal ${alertaFiscal.dias <= 3 ? 'db-fiscal-red' : 'db-fiscal-yellow'}`}>
            <span>📋</span>
            <span>
              <strong>Alerta fiscal:</strong> el plazo del Modelo 303 {alertaFiscal.trimestre} vence{' '}
              {alertaFiscal.dias === 0 ? <strong>HOY</strong> : <><strong>en {alertaFiscal.dias} día{alertaFiscal.dias !== 1 ? 's' : ''}</strong></>}.
              {' '}Presenta la declaración trimestral de IVA antes del vencimiento.
            </span>
          </div>
        )}

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

        {/* ── Clientes VIP/Premium en riesgo ── */}
        {!cargando && clientesEnRiesgo > 0 && (
          <div className="db-riesgo-widget">
            <div>
              <div className="db-riesgo-count">{clientesEnRiesgo}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="db-riesgo-label">
                Cliente{clientesEnRiesgo > 1 ? 's' : ''} VIP/Premium sin visita en +30 días
              </div>
              <div className="db-riesgo-sub">Podrías perderlos — considera reactivarlos con una oferta personalizada</div>
            </div>
            <Link
              href="/dashboard/clientes?filtro=riesgo"
              style={{ padding: '9px 16px', background: '#EF4444', color: 'white', borderRadius: 10, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Ver clientes →
            </Link>
          </div>
        )}

        {/* ── Checklist configuración ── */}
        {checklist && (() => {
          const items: { key: keyof ChecklistT; label: string; href: string | null; icon: string }[] = [
            { key: 'logo',             label: 'Logo del negocio',    href: '/dashboard/configuracion', icon: '🖼️' },
            { key: 'servicios',        label: 'Servicios activos',   href: '/dashboard/servicios',     icon: '✂️' },
            { key: 'horarios',         label: 'Horarios definidos',  href: '/dashboard/horarios',      icon: '🕐' },
            { key: 'trabajadores',     label: 'Equipo añadido',      href: '/dashboard/trabajadores',  icon: '👥' },
            { key: 'enlaceCompartido', label: 'Enlace compartido',   href: null,                       icon: '🔗' },
          ]
          const done = items.filter(it => checklist[it.key]).length
          const pct  = Math.round((done / items.length) * 100)
          return (
            <div className="db-checklist">
              <div className="db-cl-head">
                <div>
                  <span className="db-cl-title">Configura tu negocio</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{done}/{items.length} completados</span>
                </div>
                <button className="db-cl-dismiss" onClick={() => setChecklist(null)}>Ocultar</button>
              </div>
              <div className="db-cl-progress">
                <div className="db-cl-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="db-cl-items">
                {items.map(it => {
                  const ok = checklist[it.key]
                  if (it.key === 'enlaceCompartido' && !ok) {
                    return (
                      <button
                        key={it.key}
                        className="db-cl-item db-cl-item-todo"
                        onClick={() => {
                          if (!negocio) return
                          navigator.clipboard?.writeText(`https://khepria.app/negocio/${negocio.id}`).catch(() => {})
                          localStorage.setItem(`enlace_compartido_${negocio.id}`, 'true')
                          setChecklist(prev => {
                            if (!prev) return prev
                            const next = { ...prev, enlaceCompartido: true }
                            const allDone = Object.values(next).filter(Boolean).length >= 5
                            if (allDone && negocio) localStorage.setItem(`checklist_ok_${negocio.id}`, 'true')
                            return allDone ? null : next
                          })
                        }}
                      >
                        <span className="db-cl-check db-cl-check-todo">·</span>
                        {it.icon} {it.label}
                      </button>
                    )
                  }
                  const El = ok ? 'span' : Link
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const props: any = ok ? {} : { href: it.href ?? '#' }
                  return (
                    <El key={it.key} {...props} className={`db-cl-item ${ok ? 'db-cl-item-done' : 'db-cl-item-todo'}`}>
                      <span className={`db-cl-check ${ok ? 'db-cl-check-done' : 'db-cl-check-todo'}`}>{ok ? '✓' : '·'}</span>
                      {it.icon} {it.label}
                    </El>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── Row 1: BarChart + Métricas rápidas ── */}
        <div className="db-row1">
          {/* BarChart reservas 7 días */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Reservas por día</span>
              <span className="db-section-badge">Últimos 28 días</span>
            </div>
            {(() => {
              const display = barras7.length > 0
                ? barras7.map(d => ({ nombre: d.dia, reservas: d.reservas }))
                : chartData
              return (
                <>
                  <BarChartNoSSR data={display} />
                  <div className="db-chart-footer">
                    <span className="db-chart-footer-label">Total 7 días</span>
                    <span className="db-chart-footer-val">
                      {barras7.length > 0 ? `${barras7.reduce((s, d) => s + d.reservas, 0)} reservas` : cargando ? 'Cargando…' : '0 reservas'}
                    </span>
                  </div>
                </>
              )
            })()}
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
            <div className="db-stat-row">
              <div className="db-stat-icon" style={{ background: '#FEF2F2' }}>🔴</div>
              <div>
                <div className="db-stat-label">Reservas en riesgo hoy</div>
                <div className="db-stat-val" style={{ color: reservasEnRiesgo > 0 ? '#DC2626' : '#111827' }}>
                  {cargando ? '—' : reservasEnRiesgo > 0 ? `${reservasEnRiesgo} cliente${reservasEnRiesgo > 1 ? 's' : ''} alto riesgo` : 'Sin riesgo detectado'}
                </div>
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
            {(() => {
              const donutData = donut.length > 0
                ? donut
                : chartData.map(d => ({ name: d.nombre, value: d.reservas }))
              return (
                <>
                  <PieChartNoSSR data={donutData} />
                  {donut.length > 0 && (
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
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* ── Row 3: AreaChart ingresos 4 semanas ── */}
        <div className="db-row3">
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-section-title">Ingresos — comparativa mensual</span>
              <span className="db-section-badge">Últimas 4 semanas</span>
            </div>
            {(() => {
              const areaData = area4sem.length > 0
                ? area4sem
                : chartData.map(d => ({ sem: d.nombre, actual: d.reservas * 10, anterior: Math.round(d.reservas * 8) }))
              return (
                <AreaChartNoSSR data={areaData} />
              )
            })()}
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
                    <div style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 800, color: '#111827' }}>€{ingresosMes.toLocaleString('es-ES')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Hoy</div>
                    <div style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 800, color: '#4F46E5' }}>€{ingresosHoy.toLocaleString('es-ES')}</div>
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
      </div>}
    </DashboardShell>
  )
}
