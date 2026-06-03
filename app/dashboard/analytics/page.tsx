'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

// ── Chart helper ─────────────────────────────────────────────────────────────
function ChartBox({ height, children }: { height: number; children: (width: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => { if (ref.current) setWidth(ref.current.offsetWidth) }, [])
  return <div ref={ref} style={{ width: '100%', height }}>{width > 0 && children(width)}</div>
}

// ── Palette ──────────────────────────────────────────────────────────────────
const K = {
  blue:   '#B8D8F8', blueDark: '#1D4ED8',
  lila:   '#D4C5F9', lilaDark: '#6B4FD8',
  green:  '#B8EDD4', greenDark: '#2E8A5E',
  yellow: '#FDE9A2', yellowDark: '#C4860A',
  pink:   '#FBCFE8', orange: '#FED7AA',
  indigo: '#C7D2FE', mint: '#A7F3D0',
}
const PIE_COLORS = [K.blue, K.lila, K.green, K.yellow, K.pink, K.orange, K.indigo, K.mint]

// ── Types ─────────────────────────────────────────────────────────────────────
type ReservaRaw = {
  id: string; fecha: string; created_at: string; estado: string
  cliente_nombre: string; cliente_telefono: string | null
  hora: string | null
  servicios: { nombre: string; precio: number } | null
  trabajadores: { nombre: string } | null
}
type Periodo = '7d' | '30d' | '90d' | '180d' | '365d'

// ── Helpers ───────────────────────────────────────────────────────────────────
const DIAS_ES  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DIAS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function isoDate(d: Date) { return d.toISOString().split('T')[0] }
function fmtEur(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits:2, maximumFractionDigits:2 }) }
function fmtK(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(Math.round(n)) }
function pct(a: number, b: number) { if (b === 0) return null; return +((a - b) / b * 100).toFixed(1) }
function periodoLabel(p: Periodo) {
  return { '7d':'Últimos 7 días', '30d':'Últimos 30 días', '90d':'Últimos 3 meses', '180d':'Últimos 6 meses', '365d':'Último año' }[p]
}
function periodoDesde(p: Periodo): string {
  const dias = { '7d':7, '30d':30, '90d':90, '180d':180, '365d':365 }[p]
  return isoDate(addDays(new Date(), -dias))
}
function periodoAnteriorDesde(p: Periodo): string {
  const dias = { '7d':7, '30d':30, '90d':90, '180d':180, '365d':365 }[p]
  return isoDate(addDays(new Date(), -dias * 2))
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [descuentoActivado, setDescuentoActivado] = useState<string[]>([])
  const [activandoDescuento, setActivandoDescuento] = useState<string | null>(null)
  const [modalDescuento, setModalDescuento] = useState<{ dia: string; diaCorto: string } | null>(null)
  const [pctDescuentoModal, setPctDescuentoModal] = useState(15)
  const [guardandoDescuento, setGuardandoDescuento] = useState(false)

  // ── Raw data ─────────────────────────────────────────────────────────────
  const [reservas, setReservas] = useState<ReservaRaw[]>([])
  const [reservasPrev, setReservasPrev] = useState<ReservaRaw[]>([])
  const [reservasAll, setReservasAll] = useState<ReservaRaw[]>([]) // for VIP (all-time)

  // ── Computed ─────────────────────────────────────────────────────────────
  // KPIs
  const completadas   = reservas.filter(r => r.estado === 'completada')
  const canceladas    = reservas.filter(r => r.estado === 'cancelada')
  const activas       = reservas.filter(r => r.estado !== 'cancelada')
  const ingresos      = completadas.reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
  const tasaOcupacion = activas.length > 0 ? Math.round(completadas.length / activas.length * 100) : 0
  const tasaCancelacion = reservas.length > 0 ? Math.round(canceladas.length / reservas.length * 100) : 0

  const completadasPrev = reservasPrev.filter(r => r.estado === 'completada')
  const ingresosPrev    = completadasPrev.reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
  const pctIngresos     = pct(ingresos, ingresosPrev)
  const pctReservas     = pct(completadas.length, completadasPrev.length)

  // Esta semana vs anterior
  const hoy = new Date()
  const inicioSemana = isoDate(addDays(hoy, -hoy.getDay()))
  const inicioSemPrev = isoDate(addDays(hoy, -hoy.getDay() - 7))
  const finSemPrev    = isoDate(addDays(hoy, -hoy.getDay() - 1))
  const resSemana     = completadas.filter(r => r.fecha >= inicioSemana)
  const resSemPrev    = reservasPrev.filter(r => r.estado === 'completada' && r.fecha >= inicioSemPrev && r.fecha <= finSemPrev)
  const ingSemana     = resSemana.reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
  const ingSemPrev    = resSemPrev.reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
  const pctSemReservas = pct(resSemana.length, resSemPrev.length)
  const pctSemIngresos = pct(ingSemana, ingSemPrev)

  // Este mes vs anterior
  const mesActual  = hoy.toISOString().slice(0, 7)
  const mesPrev    = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().slice(0, 7)
  const resMes     = completadas.filter(r => r.fecha.startsWith(mesActual))
  const resMesPrev = [...completadas, ...completadasPrev].filter(r => r.fecha.startsWith(mesPrev))
  const ingMes     = resMes.reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
  const ingMesPrev = resMesPrev.reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
  const pctMesReservas = pct(resMes.length, resMesPrev.length)
  const pctMesIngresos = pct(ingMes, ingMesPrev)

  // Reservas por día (bar chart)
  const reservasPorDia = (() => {
    const dias = parseInt(periodo) || 30
    const n = Math.min(dias, 30)
    return Array.from({ length: n }, (_, i) => {
      const d = isoDate(addDays(hoy, -(n - 1 - i)))
      const dayReservas = completadas.filter(r => r.fecha === d)
      const dayIngresos = dayReservas.reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
      const dt = new Date(d + 'T12:00')
      return { fecha: n <= 14 ? DIAS_ES[dt.getDay()] + ' ' + dt.getDate() : dt.getDate() + '/' + (dt.getMonth()+1), reservas: dayReservas.length, ingresos: +dayIngresos.toFixed(2) }
    })
  })()

  // Ingresos por semana (line chart, last 8 weeks)
  const ingresosPorSemana = (() => {
    return Array.from({ length: 8 }, (_, i) => {
      const inicioW = isoDate(addDays(hoy, -(7 - hoy.getDay()) - (7 - i) * 7 + 7))
      const finW    = isoDate(addDays(new Date(inicioW), 6))
      const todas   = [...reservas, ...reservasPrev]
      const ingW    = todas.filter(r => r.estado === 'completada' && r.fecha >= inicioW && r.fecha <= finW)
        .reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
      return { semana: `S${8 - i}`, ingresos: +ingW.toFixed(2) }
    }).reverse()
  })()

  // Distribución servicios (pie chart)
  const distribServs = (() => {
    const cnt: Record<string, number> = {}
    completadas.forEach(r => { const n = r.servicios?.nombre ?? 'Sin servicio'; cnt[n] = (cnt[n] || 0) + 1 })
    const total = Object.values(cnt).reduce((s, v) => s + v, 0)
    return Object.entries(cnt)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round(value / total * 100) : 0 }))
  })()

  // Servicios más reservados
  const topServicios = distribServs.slice(0, 5)

  // Hora punta
  const horaPunta = (() => {
    const cnt: Record<string, number> = {}
    completadas.forEach(r => {
      if (!r.hora) return
      const h = parseInt(r.hora.slice(0, 2))
      const franja = `${String(h).padStart(2,'0')}:00–${String(h+1).padStart(2,'0')}:00`
      cnt[franja] = (cnt[franja] || 0) + 1
    })
    const entries = Object.entries(cnt).sort((a, b) => b[1] - a[1])
    return entries[0] ?? null
  })()

  // Día semana más ocupado
  const diaPunta = (() => {
    const cnt = [0,0,0,0,0,0,0]
    completadas.forEach(r => { try { cnt[new Date(r.fecha+'T12:00').getDay()]++ } catch {} })
    const max = Math.max(...cnt)
    const idx = cnt.indexOf(max)
    return max > 0 ? { dia: DIAS_FULL[idx], count: max } : null
  })()

  // Top trabajador
  const topTrabajador = (() => {
    const stats: Record<string, { count: number; ingresos: number }> = {}
    completadas.forEach(r => {
      const n = r.trabajadores?.nombre ?? 'Sin asignar'
      if (!stats[n]) stats[n] = { count: 0, ingresos: 0 }
      stats[n].count++
      stats[n].ingresos += r.servicios?.precio ?? 0
    })
    const entries = Object.entries(stats).sort((a, b) => b[1].ingresos - a[1].ingresos)
    return entries[0] ?? null
  })()

  // Clientes nuevos vs recurrentes
  const clientesStats = (() => {
    const first: Record<string, string> = {}
    const allSorted = [...completadas].sort((a, b) => a.fecha.localeCompare(b.fecha))
    allSorted.forEach(r => {
      const k = r.cliente_telefono || r.cliente_nombre
      if (!first[k]) first[k] = r.fecha
    })
    const nuevosCutoff = isoDate(addDays(hoy, -parseInt(periodo)))
    let nuevos = 0, recurrentes = 0
    Object.values(first).forEach(f => { if (f >= nuevosCutoff) nuevos++; else recurrentes++ })
    return { nuevos, recurrentes }
  })()

  // VIP clients (from all-time data)
  const clientesVip = (() => {
    const stats: Record<string, { nombre: string; reservas: number; ingresos: number }> = {}
    reservasAll.filter(r => r.estado === 'completada').forEach(r => {
      const k = r.cliente_telefono || r.cliente_nombre
      if (!stats[k]) stats[k] = { nombre: r.cliente_nombre, reservas: 0, ingresos: 0 }
      stats[k].reservas++
      stats[k].ingresos += r.servicios?.precio ?? 0
    })
    return Object.values(stats)
      .filter(c => c.reservas > 5 || c.ingresos > 200)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10)
  })()

  // Mapa de calor (días × horas, basado en histórico total)
  const HORAS_MAPA = [8,9,10,11,12,13,14,15,16,17,18,19,20]
  const mapa90Desde = isoDate(addDays(hoy, -90))
  const mapaCalor: Record<number, Record<number, number>> = {}
  for (let d = 0; d < 7; d++) {
    mapaCalor[d] = {}
    HORAS_MAPA.forEach(h => { mapaCalor[d][h] = 0 })
  }
  reservasAll.filter(r => r.estado !== 'cancelada' && r.fecha >= mapa90Desde).forEach(r => {
    try {
      const dia = new Date(r.fecha + 'T12:00').getDay()
      if (r.hora) {
        const h = parseInt(r.hora.slice(0, 2))
        if (HORAS_MAPA.includes(h)) mapaCalor[dia][h] = (mapaCalor[dia][h] || 0) + 1
      }
    } catch {}
  })
  const mapaCalorMax = Math.max(1, ...Object.values(mapaCalor).flatMap(row => Object.values(row)))
  const mejorDiaHora = (() => {
    let best = { dia: 0, hora: 0, count: 0 }
    for (let d = 0; d < 7; d++) {
      HORAS_MAPA.forEach(h => { if (mapaCalor[d][h] > best.count) best = { dia: d, hora: h, count: mapaCalor[d][h] } })
    }
    return best
  })()

  // Forecasting básico (media últimos 3 meses)
  const forecasting = (() => {
    const meses: Record<string, { reservas: number; ingresos: number }> = {}
    reservasAll.filter(r => r.estado === 'completada').forEach(r => {
      const m = r.fecha.slice(0, 7)
      if (!meses[m]) meses[m] = { reservas: 0, ingresos: 0 }
      meses[m].reservas++
      meses[m].ingresos += r.servicios?.precio ?? 0
    })
    const keys = Object.keys(meses).sort().slice(-3)
    const mediaReservas = keys.length > 0 ? Math.round(keys.reduce((s, m) => s + meses[m].reservas, 0) / keys.length) : 0
    const mediaIngresos = keys.length > 0 ? keys.reduce((s, m) => s + meses[m].ingresos, 0) / keys.length : 0
    const tendencia = keys.length >= 2
      ? meses[keys[keys.length - 1]].ingresos - meses[keys[0]].ingresos
      : 0
    return { mediaReservas, mediaIngresos, tendencia, meses, keys }
  })()

  // Análisis de clientes: frecuencia, próxima visita, en riesgo
  const analisisClientes = (() => {
    const clientMap: Record<string, { nombre: string; fechas: string[] }> = {}
    reservasAll.filter(r => r.estado === 'completada').forEach(r => {
      const k = r.cliente_telefono || r.cliente_nombre
      if (!clientMap[k]) clientMap[k] = { nombre: r.cliente_nombre, fechas: [] }
      clientMap[k].fechas.push(r.fecha)
    })
    const hoyStr = isoDate(hoy)
    const results: Array<{
      nombre: string; ultimaVisita: string; diasDesde: number
      frecuenciaMedia: number; proximaEstimada: string
      estado: 'ok' | 'pronto' | 'atrasado' | 'perdido'
    }> = []
    Object.values(clientMap).forEach(c => {
      const fechas = [...new Set(c.fechas)].sort()
      if (fechas.length < 2) return
      const gaps: number[] = []
      for (let i = 1; i < fechas.length; i++) {
        gaps.push((new Date(fechas[i]).getTime() - new Date(fechas[i-1]).getTime()) / 86400000)
      }
      const frecuenciaMedia = Math.max(1, Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length))
      const ultimaVisita = fechas[fechas.length - 1]
      const diasDesde = Math.round((new Date(hoyStr).getTime() - new Date(ultimaVisita).getTime()) / 86400000)
      const proximaEstimada = isoDate(addDays(new Date(ultimaVisita), frecuenciaMedia))
      const estado: 'ok' | 'pronto' | 'atrasado' | 'perdido' =
        diasDesde < frecuenciaMedia * 0.9 ? 'ok'
        : diasDesde < frecuenciaMedia * 1.2 ? 'pronto'
        : diasDesde < frecuenciaMedia * 2   ? 'atrasado'
        : 'perdido'
      results.push({ nombre: c.nombre, ultimaVisita, diasDesde, frecuenciaMedia, proximaEstimada, estado })
    })
    return results.sort((a, b) => a.diasDesde - b.diasDesde)
  })()
  const clientesEnRiesgo = analisisClientes.filter(c => c.estado === 'atrasado' || c.estado === 'perdido').slice(0, 8)
  const proximasVisitas = analisisClientes
    .filter(c => (c.estado === 'pronto' || c.estado === 'ok') && c.proximaEstimada >= isoDate(hoy) && c.proximaEstimada <= isoDate(addDays(hoy, 21)))
    .sort((a, b) => a.proximaEstimada.localeCompare(b.proximaEstimada))
    .slice(0, 6)

  // Días flojos (por debajo del 70% de la media)
  const diasFlojos = (() => {
    const cntDia = [0,0,0,0,0,0,0]
    reservasAll.filter(r => r.estado === 'completada').forEach(r => {
      try { cntDia[new Date(r.fecha + 'T12:00').getDay()]++ } catch {}
    })
    const total = cntDia.reduce((s, v) => s + v, 0)
    if (total === 0) return []
    const mediaDia = total / 7
    return cntDia.map((count, idx) => ({
      dia: DIAS_FULL[idx], diaCorto: DIAS_ES[idx], count,
      esFlojo: count < mediaDia * 0.5,
      pct: Math.round(count / total * 100),
    })).filter(d => d.esFlojo)
  })()

  // No-shows (clientes con alta tasa de cancelación)
  const noShowClientes = (() => {
    const stats: Record<string, { nombre: string; cancelaciones: number; total: number }> = {}
    reservasAll.forEach(r => {
      const k = r.cliente_telefono || r.cliente_nombre
      if (!stats[k]) stats[k] = { nombre: r.cliente_nombre, cancelaciones: 0, total: 0 }
      stats[k].total++
      if (r.estado === 'cancelada') stats[k].cancelaciones++
    })
    return Object.values(stats)
      .filter(c => c.total >= 3 && c.cancelaciones / c.total >= 0.4)
      .sort((a, b) => b.cancelaciones / b.total - a.cancelaciones / a.total)
      .slice(0, 8)
      .map(c => ({ ...c, tasa: Math.round(c.cancelaciones / c.total * 100) }))
  })()

  // Alerta fiscal trimestral — vencimientos AEAT reales
  const alertaFiscal = (() => {
    const now = new Date()
    const y = now.getFullYear()
    const todayMs = new Date(y, now.getMonth(), now.getDate()).getTime()
    // T1→20 abr, T2→20 jul, T3→20 oct, T4→30 ene (año siguiente)
    const deadlines = [
      { t: 4, d: new Date(y,   0, 30), label: '30 enero' },
      { t: 1, d: new Date(y,   3, 20), label: '20 abril' },
      { t: 2, d: new Date(y,   6, 20), label: '20 julio' },
      { t: 3, d: new Date(y,   9, 20), label: '20 octubre' },
      { t: 4, d: new Date(y+1, 0, 30), label: '30 enero' },
    ]
    const proximo = deadlines.find(dl => dl.d.getTime() >= todayMs) ?? deadlines[deadlines.length - 1]
    const diasHasta = Math.ceil((proximo.d.getTime() - todayMs) / 86400000)
    const trimActual = Math.floor(now.getMonth() / 3) + 1
    const inicioTrimActual = new Date(y, (trimActual - 1) * 3, 1)
    const finTrimActual    = new Date(y, trimActual * 3, 0)
    const ingTrimestre = reservasAll
      .filter(r => r.estado === 'completada' && r.fecha >= isoDate(inicioTrimActual) && r.fecha <= isoDate(finTrimActual))
      .reduce((s, r) => s + (r.servicios?.precio ?? 0), 0)
    return {
      trimestre: proximo.t, diasHasta, ingTrimestre,
      deadline: isoDate(proximo.d), deadlineLabel: proximo.label,
      urgente: diasHasta <= 3,
      aviso:   diasHasta > 3 && diasHasta <= 15,
    }
  })()

  // Reservas de hoy con predicción no-show por historial de cancelaciones
  const reservasHoyConRiesgo = (() => {
    const hoyStr = isoDate(hoy)
    const hoyRes = reservasAll
      .filter(r => r.fecha === hoyStr && r.estado === 'confirmada')
      .sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''))
    const clientStats: Record<string, { total: number; cancel: number }> = {}
    reservasAll.forEach(r => {
      const k = r.cliente_telefono || r.cliente_nombre
      if (!clientStats[k]) clientStats[k] = { total: 0, cancel: 0 }
      clientStats[k].total++
      if (r.estado === 'cancelada') clientStats[k].cancel++
    })
    return hoyRes.map(r => {
      const k = r.cliente_telefono || r.cliente_nombre
      const s = clientStats[k] ?? { total: 1, cancel: 0 }
      const tasa = s.total > 1 ? s.cancel / s.total : 0
      const riesgo: 'alto' | 'medio' | 'bajo' = tasa > 0.5 ? 'alto' : tasa > 0.25 ? 'medio' : 'bajo'
      return { ...r, tasa: Math.round(tasa * 100), riesgo, totalHist: s.total }
    })
  })()

  // Forecasting vs mes actual
  const forecastVsMes = (() => {
    const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
    const diaActual = Math.max(1, hoy.getDate())
    const proyeccionIngMes = Math.round((ingMes / diaActual) * diasEnMes)
    const proyeccionResMes = Math.round((resMes.length / diaActual) * diasEnMes)
    const diffIng = forecasting.mediaIngresos - proyeccionIngMes
    const diffRes = forecasting.mediaReservas - proyeccionResMes
    const pctIng  = proyeccionIngMes > 0 ? Math.round(diffIng / proyeccionIngMes * 100) : 0
    return { proyeccionIngMes, proyeccionResMes, diffIng, diffRes, pctIng }
  })()

  // ── Data loaders ──────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async (nid: string, p: Periodo) => {
    setCargando(true)
    const desde     = periodoDesde(p)
    const desdePrev = periodoAnteriorDesde(p)

    const [{ data: curr }, { data: prev }, { data: all }] = await Promise.all([
      supabase.from('reservas')
        .select('id, fecha, created_at, estado, cliente_nombre, cliente_telefono, hora, servicios(nombre,precio), trabajadores(nombre)')
        .eq('negocio_id', nid).gte('fecha', desde).order('fecha'),
      supabase.from('reservas')
        .select('id, fecha, created_at, estado, cliente_nombre, cliente_telefono, hora, servicios(nombre,precio), trabajadores(nombre)')
        .eq('negocio_id', nid).gte('fecha', desdePrev).lt('fecha', desde).order('fecha'),
      supabase.from('reservas')
        .select('id, fecha, estado, cliente_nombre, cliente_telefono, hora, servicios(nombre,precio)')
        .eq('negocio_id', nid).order('fecha'),
    ])
    setReservas((curr || []) as unknown as ReservaRaw[])
    setReservasPrev((prev || []) as unknown as ReservaRaw[])
    setReservasAll((all || []) as unknown as ReservaRaw[])
    setCargando(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { session } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const { activo, todos } = await getNegocioActivo(session.user.id, session.access_token)
      if (!activo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todos); setNegocio(activo); setNegocioId(activo.id)
      await cargarDatos(activo.id, periodo)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (negocioId) cargarDatos(negocioId, periodo)
  }, [negocioId, periodo, cargarDatos])

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportarCSV() {
    const rows = [
      ['Fecha', 'Estado', 'Cliente', 'Teléfono', 'Servicio', 'Precio (€)', 'Trabajador'],
      ...reservas.map(r => [
        r.fecha, r.estado, r.cliente_nombre, r.cliente_telefono ?? '',
        r.servicios?.nombre ?? '', String(r.servicios?.precio ?? 0),
        r.trabajadores?.nombre ?? '',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `analytics-${negocio?.nombre?.toLowerCase().replace(/\s+/g,'-')}-${periodoDesde(periodo)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Comparativa card ──────────────────────────────────────────────────────
  function ComparCard({ label, val, valPrev, pctChange, fmt = fmtEur, unit = '€' }: {
    label: string; val: number; valPrev: number; pctChange: number | null; fmt?: (n:number) => string; unit?: string
  }) {
    const up = pctChange !== null && pctChange > 0
    const dn = pctChange !== null && pctChange < 0
    const suffix = unit === '€' ? ' €' : ''
    return (
      <div style={{ border:'1px solid var(--border)', borderRadius:12, padding:'12px', flex:1, minWidth:0, overflow:'hidden' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:5, marginBottom:3, flexWrap:'wrap' }}>
          <span style={{ fontSize:'clamp(14px,3.5vw,20px)', fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', whiteSpace:'nowrap' }}>{fmt(val)}{suffix}</span>
          {pctChange !== null && (
            <span style={{ fontSize:11, fontWeight:700, color: up ? '#2E8A5E' : dn ? '#DC2626' : '#9CA3AF', whiteSpace:'nowrap' }}>
              {up ? '▲' : dn ? '▼' : '→'}{Math.abs(pctChange)}%
            </span>
          )}
        </div>
        <div style={{ fontSize:'clamp(10px,2.5vw,12px)', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Ant: {fmt(valPrev)}{suffix}</div>
      </div>
    )
  }

  // ── KPI card ──────────────────────────────────────────────────────────────
  function KpiCard({ label, value, sub, color = '#111827' }: { label: string; value: string; sub?: string; color?: string }) {
    return (
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px', width:'100%', minWidth:0, overflow:'hidden' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</div>
        <div style={{ fontSize:'clamp(18px,4.5vw,28px)', fontWeight:800, color, letterSpacing:'-1px', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</div>
        {sub && <div style={{ fontSize:'clamp(10px,2.5vw,12px)', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</div>}
      </div>
    )
  }

  // ── Custom tooltip ────────────────────────────────────────────────────────
  function BarTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
        <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color }}>{p.name === 'reservas' ? 'Reservas' : 'Ingresos'}: {p.name === 'ingresos' ? fmtEur(p.value) + ' €' : p.value}</div>
        ))}
      </div>
    )
  }

  function PieTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const d = payload[0]
    return (
      <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
        <div style={{ fontWeight:700 }}>{d.name}</div>
        <div style={{ color:'var(--text2)' }}>{d.value} reservas ({d.payload.pct}%)</div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        :root { --border: rgba(0,0,0,0.08); --bg: #F7F9FC; --text: #111827; --text2: #4B5563; --muted: #9CA3AF; }
        .an-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .an-grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .an-grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        /* KPIs: 4 cols PC, 2×2 mobile */
        .kpis-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .an-section { margin-bottom:28px; }
        .an-section-title { font-size:clamp(13px,3.5vw,15px); font-weight:800; color:var(--text); margin-bottom:12px; }
        .an-card { background:white; border:1px solid var(--border); border-radius:16px; padding:20px; overflow:hidden; }
        .an-card-title { font-size:clamp(12px,2.5vw,13px); font-weight:700; color:var(--text2); margin-bottom:14px; }
        /* Scroll wrappers */
        .an-chart-wrap { overflow-x:auto; width:100%; -webkit-overflow-scrolling:touch; }
        .an-chart-wrap > div { min-width:300px; }
        .an-table-wrap { overflow-x:auto; width:100%; -webkit-overflow-scrolling:touch; }
        .an-table-inner { min-width:480px; }
        /* Responsive grids */
        .an-charts-row { display:grid; grid-template-columns:2fr 1fr; gap:16px; }
        .an-2col-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .an-compar-row { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        /* Inner ComparCards row */
        .an-compar-cards { display:flex; gap:10px; }
        .vip-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); white-space:nowrap; }
        .vip-row:last-child { border-bottom:none; }
        .vip-badge { background:linear-gradient(135deg,#FDE9A2,#FED7AA); color:#92400E; font-size:11px; font-weight:800; padding:2px 8px; border-radius:100px; white-space:nowrap; }
        .stat-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); font-size:clamp(11px,2.5vw,13px); }
        .stat-row:last-child { border-bottom:none; }
        @media (max-width:768px) {
          .kpis-grid { grid-template-columns:1fr 1fr; gap:12px; }
          .an-grid4 { grid-template-columns:1fr 1fr; }
          .an-grid3 { grid-template-columns:1fr; }
          .an-grid2 { grid-template-columns:1fr; }
          .an-charts-row { grid-template-columns:1fr; }
          .an-2col-row { grid-template-columns:1fr; }
          /* an-compar-row stays 2 cols on mobile */
          .an-card { padding:14px 12px; }
        }
        @media (max-width:480px) {
          .kpis-grid { grid-template-columns:1fr 1fr; gap:10px; }
          .an-grid4 { grid-template-columns:1fr 1fr; gap:10px; }
          .an-grid3 { grid-template-columns:1fr; }
          .an-grid2 { grid-template-columns:1fr; }
          /* Stack ComparCards vertically on very small screens */
          .an-compar-cards { flex-direction:column; gap:6px; }
          .an-compar-row { gap:8px; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:'clamp(18px,4vw,22px)', fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px' }}>Analytics</div>
          <div style={{ fontSize:14, color:'var(--muted)', marginTop:2 }}>Métricas reales · {periodoLabel(periodo)}</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', background:'white', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            {(['7d','30d','90d','180d','365d'] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} style={{
                padding:'8px 14px', border:'none', fontFamily:'inherit', fontSize:12, fontWeight:700,
                cursor:'pointer', background: periodo === p ? '#111827' : 'transparent',
                color: periodo === p ? 'white' : 'var(--text2)',
                transition:'all 0.15s',
              }}>
                {p === '7d' ? '7d' : p === '30d' ? '30d' : p === '90d' ? '3m' : p === '180d' ? '6m' : '1a'}
              </button>
            ))}
          </div>
          <button onClick={exportarCSV} style={{ padding:'9px 16px', background:'var(--text)', color:'white', border:'none', borderRadius:10, fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            📊 Exportar CSV
          </button>
        </div>
      </div>

      {cargando ? (
        <div style={{ textAlign:'center', padding:'80px 0', color:'var(--muted)', fontSize:14 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
          Calculando métricas...
        </div>
      ) : (
        <>
          {/* ── Banner alerta fiscal AEAT ── */}
          {(alertaFiscal.urgente || alertaFiscal.aviso) && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:12, padding:'14px 18px', borderRadius:14, marginBottom:20,
              background: alertaFiscal.urgente ? '#FEF2F2' : '#FFFBEB',
              border: `1.5px solid ${alertaFiscal.urgente ? '#FECACA' : '#FDE68A'}`,
            }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{alertaFiscal.urgente ? '🚨' : '⚠️'}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color: alertaFiscal.urgente ? '#DC2626' : '#92400E', marginBottom:2 }}>
                  {alertaFiscal.urgente
                    ? `¡Vence en ${alertaFiscal.diasHasta} día${alertaFiscal.diasHasta !== 1 ? 's' : ''}! Declaración T${alertaFiscal.trimestre} AEAT`
                    : `Faltan ${alertaFiscal.diasHasta} días — Declaración T${alertaFiscal.trimestre} AEAT`}
                </div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>
                  Vencimiento: {alertaFiscal.deadlineLabel} ({alertaFiscal.deadline}) · Ingresos trimestrales: {fmtEur(alertaFiscal.ingTrimestre)} €
                </div>
              </div>
            </div>
          )}

          {/* ── KPIs ── */}
          <div className="an-section">
            <div className="kpis-grid">
              <KpiCard label="Ingresos periodo" value={`${fmtEur(ingresos)} €`} sub={`${completadas.length} servicios completados`} color={K.greenDark} />
              <KpiCard label="Reservas completadas" value={String(completadas.length)} sub={`${reservas.length} totales · ${canceladas.length} cancel.`} />
              <KpiCard label="Tasa ocupación" value={`${tasaOcupacion}%`} sub="Completadas / Total activas" color={tasaOcupacion >= 70 ? K.greenDark : tasaOcupacion >= 40 ? K.yellowDark : '#DC2626'} />
              <KpiCard label="Tasa cancelación" value={`${tasaCancelacion}%`} sub={`${canceladas.length} cancelaciones`} color={tasaCancelacion <= 10 ? K.greenDark : tasaCancelacion <= 25 ? K.yellowDark : '#DC2626'} />
            </div>
          </div>

          {/* ── Predicciones & Alertas ── */}
          <div className="an-section">
            <div className="an-section-title">🤖 Predicciones & Alertas</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

              {/* Alerta fiscal urgente */}
              {(alertaFiscal.urgente || alertaFiscal.aviso) && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', background: alertaFiscal.urgente ? '#FEF2F2' : '#FFFBEB', border:`1.5px solid ${alertaFiscal.urgente ? '#FECACA' : '#FDE68A'}`, borderRadius:12 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{alertaFiscal.urgente ? '🚨' : '⚠️'}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color: alertaFiscal.urgente ? '#DC2626' : '#92400E' }}>
                      {alertaFiscal.urgente
                        ? `¡Solo ${alertaFiscal.diasHasta} día${alertaFiscal.diasHasta !== 1 ? 's' : ''} para declaración T${alertaFiscal.trimestre}!`
                        : `${alertaFiscal.diasHasta} días para declaración T${alertaFiscal.trimestre} AEAT`}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
                      Vence el {alertaFiscal.deadlineLabel} · {fmtEur(alertaFiscal.ingTrimestre)} € registrados este trimestre
                    </div>
                  </div>
                </div>
              )}

              {/* Predicción demanda */}
              {diaPunta && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', background:'rgba(184,216,248,0.2)', border:'1px solid rgba(184,216,248,0.6)', borderRadius:12 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>📅</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#111827' }}>
                      Tu día más ocupado es el <strong>{diaPunta.dia}</strong> — considera añadir más disponibilidad
                    </div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
                      {diaPunta.count} reservas en el periodo{horaPunta ? ` · Hora punta: ${horaPunta[0]} (${horaPunta[1]} reservas)` : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Forecasting */}
              {forecasting.keys.length > 0 && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', background:'rgba(184,237,212,0.2)', border:'1px solid rgba(184,237,212,0.6)', borderRadius:12 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>📈</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:5 }}>
                      Previsión próximo mes (media {forecasting.keys.length} meses)
                    </div>
                    <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, color:'var(--text2)' }}>
                        Reservas: <strong style={{ color:'#111827' }}>{forecasting.mediaReservas}</strong>
                        {forecastVsMes.diffRes !== 0 && (
                          <span style={{ marginLeft:6, fontWeight:700, color: forecastVsMes.diffRes >= 0 ? K.greenDark : '#DC2626' }}>
                            {forecastVsMes.diffRes >= 0 ? '▲' : '▼'} {Math.abs(forecastVsMes.diffRes)} vs hoy
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize:13, color:'var(--text2)' }}>
                        Ingresos: <strong style={{ color:'#111827' }}>{fmtEur(forecasting.mediaIngresos)} €</strong>
                        {forecastVsMes.diffIng !== 0 && (
                          <span style={{ marginLeft:6, fontWeight:700, color: forecastVsMes.diffIng >= 0 ? K.greenDark : '#DC2626' }}>
                            {forecastVsMes.diffIng >= 0 ? '▲' : '▼'} {fmtEur(Math.abs(forecastVsMes.diffIng))} € vs hoy
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* No-shows de hoy */}
              {reservasHoyConRiesgo.filter(r => r.riesgo === 'alto').length > 0 && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:12 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>🔴</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#DC2626' }}>
                      {reservasHoyConRiesgo.filter(r => r.riesgo === 'alto').length} reserva{reservasHoyConRiesgo.filter(r => r.riesgo === 'alto').length > 1 ? 's' : ''} de hoy con alto riesgo de no-show ({'>'}50% cancelaciones históricas)
                    </div>
                    <div style={{ fontSize:12, color:'#991B1B', marginTop:2 }}>
                      {reservasHoyConRiesgo.filter(r => r.riesgo === 'alto').map(r => r.cliente_nombre).join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Días flojos */}
              {diasFlojos.length > 0 && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', background:'rgba(212,197,249,0.15)', border:'1px solid rgba(212,197,249,0.6)', borderRadius:12 }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>📉</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:6 }}>
                      Días con poca demanda — un descuento puede llenar los huecos
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {diasFlojos.map((d, i) => (
                        <button key={i}
                          onClick={() => setModalDescuento({ dia: d.dia, diaCorto: d.diaCorto })}
                          style={{ padding:'5px 12px', background:'rgba(212,197,249,0.4)', border:'1px solid rgba(109,40,217,0.25)', borderRadius:100, fontSize:12, fontWeight:700, color:K.lilaDark, cursor:'pointer', fontFamily:'inherit' }}>
                          {d.dia} ({d.pct}%) → Activar descuento
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sin alertas */}
              {!diaPunta && forecasting.keys.length === 0 && diasFlojos.length === 0 && !alertaFiscal.urgente && !alertaFiscal.aviso && reservasHoyConRiesgo.filter(r => r.riesgo === 'alto').length === 0 && (
                <div style={{ padding:'20px', textAlign:'center', color:'var(--muted)', fontSize:13, background:'white', border:'1px solid var(--border)', borderRadius:12 }}>
                  Sin alertas activas · Las predicciones aparecerán con más datos históricos
                </div>
              )}
            </div>
          </div>

          {/* ── Reservas de hoy — predicción no-show ── */}
          {reservasHoyConRiesgo.length > 0 && (
            <div className="an-section">
              <div className="an-section-title">📅 Reservas de hoy — Predicción asistencia</div>
              <div className="an-card">
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12, padding:'8px 12px', background:`${K.blue}20`, borderRadius:10 }}>
                  Riesgo calculado por historial real de cancelaciones de cada cliente
                </div>
                {reservasHoyConRiesgo.map((r, i) => {
                  const badge = r.riesgo === 'alto'
                    ? { bg:'#FEE2E2', color:'#DC2626', icon:'🔴', label:'Alto riesgo' }
                    : r.riesgo === 'medio'
                    ? { bg:'#FEF3C7', color:'#D97706', icon:'🟡', label:'Riesgo medio' }
                    : { bg:'rgba(34,197,94,0.1)', color:'#15803D', icon:'🟢', label:'Fiable' }
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < reservasHoyConRiesgo.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--muted)', width:42, flexShrink:0 }}>{r.hora?.slice(0,5) ?? '--:--'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.cliente_nombre}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{r.servicios?.nombre ?? 'Servicio'}{r.totalHist > 1 ? ` · ${r.tasa}% cancel.` : ''}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:800, padding:'3px 9px', borderRadius:100, background:badge.bg, color:badge.color, flexShrink:0, whiteSpace:'nowrap' }}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Comparativas ── */}
          <div className="an-section">
            <div className="an-section-title">Comparativas</div>
            <div className="an-compar-row">
              <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:'16px 14px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Este mes vs anterior</div>
                <div className="an-compar-cards">
                  <ComparCard label="Ingresos mes" val={ingMes} valPrev={ingMesPrev} pctChange={pctMesIngresos} fmt={fmtEur} />
                  <ComparCard label="Reservas mes" val={resMes.length} valPrev={resMesPrev.length} pctChange={pctMesReservas} fmt={n => String(n)} unit="" />
                </div>
              </div>
              <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:'16px 14px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Esta semana vs anterior</div>
                <div className="an-compar-cards">
                  <ComparCard label="Ingresos sem." val={ingSemana} valPrev={ingSemPrev} pctChange={pctSemIngresos} fmt={fmtEur} />
                  <ComparCard label="Reservas sem." val={resSemana.length} valPrev={resSemPrev.length} pctChange={pctSemReservas} fmt={n => String(n)} unit="" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Gráficas: barras + dona ── */}
          <div className="an-section">
            <div className="an-charts-row">
              {/* Reservas + ingresos por día */}
              <div className="an-card">
                <div className="an-card-title">Reservas e ingresos por día</div>
                <div className="an-chart-wrap">
                <ChartBox height={220}>{(w) => (
                  <BarChart width={w} height={220} data={reservasPorDia} margin={{ top:4, right:4, bottom:0, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="r" orientation="left" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false} width={24} />
                    <YAxis yAxisId="i" orientation="right" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false} width={40} tickFormatter={v => `${v}€`} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar yAxisId="r" dataKey="reservas" fill={K.blue} radius={[4,4,0,0]} maxBarSize={28} />
                    <Bar yAxisId="i" dataKey="ingresos" fill={K.lila} radius={[4,4,0,0]} maxBarSize={28} />
                  </BarChart>
                )}</ChartBox>
                </div>
                <div style={{ display:'flex', gap:16, marginTop:8, justifyContent:'center' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text2)' }}><span style={{ width:10, height:10, borderRadius:2, background:K.blue, display:'inline-block' }}/>Reservas</span>
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text2)' }}><span style={{ width:10, height:10, borderRadius:2, background:K.lila, display:'inline-block' }}/>Ingresos</span>
                </div>
              </div>

              {/* Dona servicios */}
              <div className="an-card">
                <div className="an-card-title">Distribución servicios</div>
                {distribServs.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)', fontSize:13 }}>Sin datos</div>
                ) : (
                  <>
                    <ChartBox height={160}>{(w) => (
                      <PieChart width={w} height={160}>
                        <Pie data={distribServs} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2}>
                          {distribServs.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    )}</ChartBox>
                    <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:4 }}>
                      {distribServs.slice(0, 4).map((s, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:PIE_COLORS[i % PIE_COLORS.length], flexShrink:0 }}/>
                          <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text2)' }}>{s.name}</span>
                          <span style={{ fontWeight:700, color:'var(--text)', flexShrink:0 }}>{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Línea ingresos por semana ── */}
          <div className="an-section">
            <div className="an-card">
              <div className="an-card-title">Ingresos por semana (últimas 8 semanas)</div>
              <div className="an-chart-wrap">
              <ChartBox height={180}>{(w) => (
                <LineChart width={w} height={180} data={ingresosPorSemana} margin={{ top:4, right:16, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="semana" tick={{ fontSize:11, fill:'#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} tickLine={false} axisLine={false} width={48} tickFormatter={v => `${v}€`} />
                  <Tooltip formatter={(v: any) => [`${fmtEur(v)} €`, 'Ingresos']} />
                  <Line type="monotone" dataKey="ingresos" stroke={K.greenDark} strokeWidth={2.5} dot={{ fill:K.green, strokeWidth:0, r:4 }} activeDot={{ r:6 }} />
                </LineChart>
              )}</ChartBox>
              </div>
            </div>
          </div>

          {/* ── Top stats: hora punta | día | trabajador ── */}
          <div className="an-section">
            <div className="an-section-title">Insights del negocio</div>
            <div className="an-grid3">
              <div className="an-card">
                <div className="an-card-title">⏰ Hora punta del día</div>
                {horaPunta ? (
                  <>
                    <div style={{ fontSize:'clamp(18px,4vw,26px)', fontWeight:800, color:K.blueDark, marginBottom:6 }}>{horaPunta[0]}</div>
                    <div style={{ fontSize:13, color:'var(--text2)' }}>{horaPunta[1]} reservas en esa franja</div>
                  </>
                ) : <div style={{ color:'var(--muted)', fontSize:13 }}>Sin datos suficientes</div>}
              </div>
              <div className="an-card">
                <div className="an-card-title">📅 Día más ocupado</div>
                {diaPunta ? (
                  <>
                    <div style={{ fontSize:'clamp(18px,4vw,26px)', fontWeight:800, color:K.lilaDark, marginBottom:6 }}>{diaPunta.dia}</div>
                    <div style={{ fontSize:13, color:'var(--text2)' }}>{diaPunta.count} reservas en el periodo</div>
                  </>
                ) : <div style={{ color:'var(--muted)', fontSize:13 }}>Sin datos suficientes</div>}
              </div>
              <div className="an-card">
                <div className="an-card-title">🏆 Profesional top (ingresos)</div>
                {topTrabajador ? (
                  <>
                    <div style={{ fontSize:20, fontWeight:800, color:K.greenDark, marginBottom:4 }}>{topTrabajador[0]}</div>
                    <div style={{ fontSize:13, color:'var(--text2)' }}>{topTrabajador[1].count} reservas · {fmtEur(topTrabajador[1].ingresos)} €</div>
                  </>
                ) : <div style={{ color:'var(--muted)', fontSize:13 }}>Sin datos suficientes</div>}
              </div>
            </div>
          </div>

          {/* ── Servicios top + nuevos vs recurrentes ── */}
          <div className="an-section">
            <div className="an-2col-row">
              <div className="an-card">
                <div className="an-card-title">🔧 Servicios más reservados</div>
                {topServicios.length === 0
                  ? <div style={{ color:'var(--muted)', fontSize:13 }}>Sin datos</div>
                  : topServicios.map((s, i) => (
                    <div key={i} className="stat-row">
                      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:PIE_COLORS[i % PIE_COLORS.length], flexShrink:0 }}/>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <span style={{ fontSize:12, color:'var(--muted)' }}>{s.value} reservas</span>
                        <span style={{ fontSize:11, fontWeight:700, background:PIE_COLORS[i % PIE_COLORS.length], padding:'2px 7px', borderRadius:100 }}>{s.pct}%</span>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="an-card">
                <div className="an-card-title">👥 Clientes nuevos vs recurrentes</div>
                {clientesStats.nuevos + clientesStats.recurrentes === 0
                  ? <div style={{ color:'var(--muted)', fontSize:13 }}>Sin datos</div>
                  : (<>
                    <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                      <div style={{ flex:1, background:`${K.green}40`, borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
                        <div style={{ fontSize:'clamp(20px,5vw,28px)', fontWeight:800, color:K.greenDark }}>{clientesStats.nuevos}</div>
                        <div style={{ fontSize:12, color:K.greenDark, fontWeight:600 }}>Nuevos</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>Primera visita</div>
                      </div>
                      <div style={{ flex:1, background:`${K.blue}40`, borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
                        <div style={{ fontSize:'clamp(20px,5vw,28px)', fontWeight:800, color:K.blueDark }}>{clientesStats.recurrentes}</div>
                        <div style={{ fontSize:12, color:K.blueDark, fontWeight:600 }}>Recurrentes</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>Más de 1 visita</div>
                      </div>
                    </div>
                    {(() => {
                      const total = clientesStats.nuevos + clientesStats.recurrentes
                      const pctNuevos = Math.round(clientesStats.nuevos / total * 100)
                      return (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)', marginBottom:4 }}>
                            <span>Nuevos {pctNuevos}%</span><span>Recurrentes {100 - pctNuevos}%</span>
                          </div>
                          <div style={{ height:8, background:'#F3F4F6', borderRadius:100, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pctNuevos}%`, background:`linear-gradient(90deg,${K.green},${K.blue})`, borderRadius:100 }} />
                          </div>
                        </div>
                      )
                    })()}
                  </>)
                }
              </div>
            </div>
          </div>

          {/* ── VIP Clients ── */}
          <div className="an-section">
            <div className="an-section-title">⭐ Clientes VIP</div>
            <div className="an-card">
              {clientesVip.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)', fontSize:13 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>⭐</div>
                  Aún no hay clientes VIP (más de 5 reservas completadas o más de 200 € gastados)
                </div>
              ) : (
                <>
                  <div className="an-table-wrap"><div className="an-table-inner">
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'6px 0 10px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                    {['Cliente','Reservas','Gastado','Estado'].map(h => (
                      <span key={h} style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</span>
                    ))}
                  </div>
                  {clientesVip.map((c, i) => (
                    <div key={i} className="vip-row">
                      <div style={{ flex:2, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</div>
                      </div>
                      <div style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text2)' }}>{c.reservas}</div>
                      <div style={{ flex:1, fontSize:13, fontWeight:600, color:K.greenDark }}>{fmtEur(c.ingresos)} €</div>
                      <div style={{ flex:1 }}>
                        <span className="vip-badge">
                          {c.reservas > 5 && c.ingresos > 200 ? '🌟 TOP' : c.reservas > 5 ? '⭐ Fiel' : '💎 Premium'}
                        </span>
                      </div>
                    </div>
                  ))}
                  </div></div>
                  <div style={{ marginTop:10, padding:'8px 0 0', fontSize:12, color:'var(--muted)' }}>
                    Criterio VIP: más de 5 reservas completadas <strong>o</strong> más de 200 € gastados (histórico total)
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Mapa de calor demanda ── */}
          <div className="an-section">
            <div className="an-section-title">🔥 Mapa de demanda — Días × Horas</div>
            <div className="an-card" style={{ overflowX:'auto' }}>
              {mejorDiaHora.count > 0 && (
                <div style={{ fontSize:13, color:'var(--text2)', marginBottom:14, padding:'8px 12px', background:`${K.yellow}50`, borderRadius:10, display:'inline-block' }}>
                  Tu momento más ocupado: <strong>{DIAS_FULL[mejorDiaHora.dia]} a las {String(mejorDiaHora.hora).padStart(2,'0')}:00</strong> ({mejorDiaHora.count} reservas)
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:`64px repeat(${HORAS_MAPA.length},1fr)`, gap:3, minWidth:600 }}>
                <div style={{ fontSize:10, color:'var(--muted)', paddingBottom:6 }}></div>
                {HORAS_MAPA.map(h => (
                  <div key={h} style={{ fontSize:10, color:'var(--muted)', textAlign:'center', paddingBottom:6 }}>{String(h).padStart(2,'0')}h</div>
                ))}
                {[0,1,2,3,4,5,6].map(d => (
                  <>
                    <div key={`l${d}`} style={{ fontSize:11, color:'var(--text2)', display:'flex', alignItems:'center', paddingRight:6 }}>{DIAS_ES[d]}</div>
                    {HORAS_MAPA.map(h => {
                      const v = mapaCalor[d][h] || 0
                      const intensity = mapaCalorMax > 0 ? v / mapaCalorMax : 0
                      const bg = intensity === 0
                        ? '#F3F4F6'
                        : `rgba(29,78,216,${0.1 + intensity * 0.85})`
                      const fg = intensity > 0.5 ? 'white' : intensity > 0.2 ? '#1D4ED8' : 'transparent'
                      return (
                        <div key={h} style={{ height:32, borderRadius:6, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:fg, transition:'opacity 0.2s' }} title={`${DIAS_FULL[d]} ${String(h).padStart(2,'0')}:00 — ${v} reservas`}>
                          {v > 0 ? v : ''}
                        </div>
                      )
                    })}
                  </>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, fontSize:11, color:'var(--muted)' }}>
                <span>Menos</span>
                {[0.05,0.25,0.5,0.75,1].map((i,idx) => (
                  <div key={idx} style={{ width:18, height:12, borderRadius:3, background:`rgba(29,78,216,${0.1 + i * 0.85})` }}/>
                ))}
                <span>Más</span>
              </div>
            </div>
          </div>

          {/* ── Forecasting básico ── */}
          <div className="an-section">
            <div className="an-section-title">📈 Previsión próximo mes</div>
            <div className="an-grid3">
              <div className="an-card">
                <div className="an-card-title">Reservas previstas</div>
                <div style={{ fontSize:'clamp(24px,6vw,36px)', fontWeight:800, color:K.blueDark, letterSpacing:'-1px', marginBottom:4 }}>{forecasting.mediaReservas}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>Media {forecasting.keys.length} meses</span>
                  {forecastVsMes.diffRes !== 0 && (
                    <span style={{ fontSize:12, fontWeight:700, color: forecastVsMes.diffRes >= 0 ? K.greenDark : '#DC2626' }}>
                      {forecastVsMes.diffRes >= 0 ? '▲' : '▼'} {Math.abs(forecastVsMes.diffRes)} vs mes actual
                    </span>
                  )}
                </div>
              </div>
              <div className="an-card">
                <div className="an-card-title">Ingresos previstos</div>
                <div style={{ fontSize:'clamp(20px,5vw,28px)', fontWeight:800, color:K.greenDark, letterSpacing:'-0.5px', marginBottom:4 }}>{fmtEur(forecasting.mediaIngresos)} €</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>Media mensual</span>
                  {forecastVsMes.diffIng !== 0 && (
                    <span style={{ fontSize:12, fontWeight:700, color: forecastVsMes.diffIng >= 0 ? K.greenDark : '#DC2626' }}>
                      {forecastVsMes.diffIng >= 0 ? '▲' : '▼'} {fmtEur(Math.abs(forecastVsMes.diffIng))} € vs mes actual
                    </span>
                  )}
                </div>
              </div>
              <div className="an-card">
                <div className="an-card-title">Tendencia</div>
                <div style={{ fontSize:'clamp(18px,4vw,24px)', fontWeight:800, letterSpacing:'-0.5px', marginBottom:6, color: forecasting.tendencia >= 0 ? K.greenDark : '#DC2626' }}>
                  {forecasting.tendencia >= 0 ? '▲' : '▼'} {fmtEur(Math.abs(forecasting.tendencia))} €
                </div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Primer al último mes analizado</div>
              </div>
            </div>
            {forecasting.keys.length > 0 && (
              <div className="an-card" style={{ marginTop:14 }}>
                <div className="an-card-title">Ingresos por mes (histórico)</div>
                <div className="an-chart-wrap">
                <ChartBox height={160}>{(w) => (
                  <BarChart width={w} height={160} data={Object.entries(forecasting.meses).sort((a,b) => a[0].localeCompare(b[0])).map(([m, v]) => ({ mes: m.slice(5), reservas: v.reservas, ingresos: +v.ingresos.toFixed(2) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="mes" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false} width={42} tickFormatter={v => `${v}€`} />
                    <Tooltip formatter={(v: any, name: any) => [name === 'ingresos' ? `${fmtEur(v)} €` : v, name === 'ingresos' ? 'Ingresos' : 'Reservas']} />
                    <Bar dataKey="ingresos" fill={K.green} radius={[4,4,0,0]} maxBarSize={32} />
                  </BarChart>
                )}</ChartBox>
                </div>
              </div>
            )}
          </div>

          {/* ── Próximas visitas estimadas ── */}
          {proximasVisitas.length > 0 && (
            <div className="an-section">
              <div className="an-section-title">🗓️ Clientes con visita estimada próxima (21 días)</div>
              <div className="an-card">
                <div className="an-table-wrap"><div className="an-table-inner">
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'0 0 10px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                  {['Cliente','Última visita','Frecuencia media','Próxima estimada'].map(h => (
                    <span key={h} style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</span>
                  ))}
                </div>
                {proximasVisitas.map((c, i) => (
                  <div key={i} className="vip-row">
                    <div style={{ flex:2, fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</div>
                    <div style={{ flex:1, fontSize:12, color:'var(--text2)' }}>{c.ultimaVisita}</div>
                    <div style={{ flex:1, fontSize:12, color:'var(--muted)' }}>cada {c.frecuenciaMedia}d</div>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:K.blueDark, background:`${K.blue}50`, padding:'2px 8px', borderRadius:100 }}>{c.proximaEstimada}</span>
                    </div>
                  </div>
                ))}
                </div></div>
              </div>
            </div>
          )}

          {/* ── Clientes en riesgo ── */}
          {clientesEnRiesgo.length > 0 && (
            <div className="an-section">
              <div className="an-section-title">⚠️ Clientes en riesgo de perder</div>
              <div className="an-card">
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:14, padding:'8px 12px', background:`${K.yellow}40`, borderRadius:10 }}>
                  Clientes que no regresan según su patrón habitual. Considera enviarles un recordatorio o descuento.
                </div>
                <div className="an-table-wrap"><div className="an-table-inner">
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'0 0 10px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                  {['Cliente','Última visita','Días sin venir','Estado'].map(h => (
                    <span key={h} style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</span>
                  ))}
                </div>
                {clientesEnRiesgo.map((c, i) => (
                  <div key={i} className="vip-row">
                    <div style={{ flex:2, fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</div>
                    <div style={{ flex:1, fontSize:12, color:'var(--text2)' }}>{c.ultimaVisita}</div>
                    <div style={{ flex:1, fontSize:12, fontWeight:700, color: c.diasDesde > c.frecuenciaMedia * 2 ? '#DC2626' : '#D97706' }}>{c.diasDesde}d</div>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, background: c.estado === 'perdido' ? '#FEE2E2' : '#FEF3C7', color: c.estado === 'perdido' ? '#DC2626' : '#D97706' }}>
                        {c.estado === 'perdido' ? '🔴 Perdido' : '🟡 En riesgo'}
                      </span>
                    </div>
                  </div>
                ))}
                </div></div>
              </div>
            </div>
          )}

          {/* ── Días flojos con descuentos automáticos ── */}
          {diasFlojos.length > 0 && (
            <div className="an-section">
              <div className="an-section-title">📉 Días flojos — Activa descuentos automáticos</div>
              <div className="an-card">
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:14, padding:'8px 12px', background:`${K.blue}30`, borderRadius:10 }}>
                  Estos días tienen menos del 50% de ocupación respecto a la media. Un descuento puntual puede llenar huecos.
                </div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {diasFlojos.map((d, i) => {
                    const activado = descuentoActivado.includes(d.dia)
                    const activando = activandoDescuento === d.dia
                    return (
                      <div key={i} style={{ flex:1, minWidth:160, background:'#F9FAFB', borderRadius:12, padding:'16px', border:'1px solid var(--border)' }}>
                        <div style={{ fontSize:'clamp(16px,4vw,20px)', fontWeight:800, color:K.lilaDark, marginBottom:4 }}>{d.dia}</div>
                        <div style={{ fontSize:13, color:'var(--text2)', marginBottom:6 }}>{d.count} reservas ({d.pct}% del total)</div>
                        <div style={{ fontSize:11, color:'var(--muted)', background:`${K.lila}40`, padding:'5px 8px', borderRadius:8, marginBottom:10 }}>
                          💡 Los {d.dia.toLowerCase()}s tienes poca demanda — considera un descuento
                        </div>
                        <button
                          disabled={activado}
                          onClick={() => { if (!activado) setModalDescuento({ dia: d.dia, diaCorto: d.diaCorto }) }}
                          style={{
                            width:'100%', padding:'8px 12px', border:'none', borderRadius:9,
                            fontFamily:'inherit', fontSize:12, fontWeight:700, cursor: activado ? 'default' : 'pointer',
                            background: activado ? 'rgba(34,197,94,0.15)' : K.green,
                            color: activado ? '#15803D' : K.greenDark,
                            transition:'all 0.15s',
                          }}
                        >
                          {activado ? '✅ Descuento activado' : '🏷️ Activar descuento'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── No-shows ── */}
          {noShowClientes.length > 0 && (
            <div className="an-section">
              <div className="an-section-title">🚫 Clientes con alta tasa de cancelación</div>
              <div className="an-card">
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:14, padding:'8px 12px', background:`${K.pink}40`, borderRadius:10 }}>
                  Clientes que cancelan el 40% o más de sus reservas. Considera solicitarles prepago o depósito.
                </div>
                <div className="an-table-wrap"><div className="an-table-inner">
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'0 0 10px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                  {['Cliente','Reservas','Canceladas','Tasa cancelación'].map(h => (
                    <span key={h} style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</span>
                  ))}
                </div>
                {noShowClientes.map((c, i) => (
                  <div key={i} className="vip-row">
                    <div style={{ flex:2, fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</div>
                    <div style={{ flex:1, fontSize:12, color:'var(--text2)' }}>{c.total}</div>
                    <div style={{ flex:1, fontSize:12, color:'var(--text2)' }}>{c.cancelaciones}</div>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, fontWeight:800, color: c.tasa >= 70 ? '#DC2626' : '#D97706' }}>{c.tasa}%</span>
                    </div>
                  </div>
                ))}
                </div></div>
              </div>
            </div>
          )}

          {/* ── Alerta fiscal trimestral AEAT ── */}
          <div className="an-section">
            <div className="an-section-title">🧾 Vencimientos fiscales AEAT</div>
            <div className="an-card">
              {/* Próximo vencimiento */}
              <div style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, marginBottom:16,
                background: alertaFiscal.urgente ? '#FEF2F2' : alertaFiscal.aviso ? '#FFFBEB' : '#F0FDF4',
                border: `1px solid ${alertaFiscal.urgente ? '#FECACA' : alertaFiscal.aviso ? '#FDE68A' : '#BBF7D0'}`,
              }}>
                <span style={{ fontSize:28, flexShrink:0 }}>{alertaFiscal.urgente ? '🚨' : alertaFiscal.aviso ? '⚠️' : '✅'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:800, color: alertaFiscal.urgente ? '#DC2626' : alertaFiscal.aviso ? '#92400E' : '#15803D', marginBottom:2 }}>
                    T{alertaFiscal.trimestre} — Vence el {alertaFiscal.deadlineLabel}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>
                    {alertaFiscal.urgente
                      ? `¡Solo faltan ${alertaFiscal.diasHasta} días! Presenta tu declaración`
                      : alertaFiscal.aviso
                      ? `Faltan ${alertaFiscal.diasHasta} días — Revisa tus cuentas`
                      : `Faltan ${alertaFiscal.diasHasta} días — En plazo`}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:K.greenDark }}>{fmtEur(alertaFiscal.ingTrimestre)} €</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>Ingresos trimestre</div>
                </div>
              </div>
              {/* Calendario de vencimientos */}
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Calendario AEAT {hoy.getFullYear()}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                {[
                  { t: 1, label: 'T1', fecha: '20 abril',   desc: 'Ene–Mar' },
                  { t: 2, label: 'T2', fecha: '20 julio',   desc: 'Abr–Jun' },
                  { t: 3, label: 'T3', fecha: '20 octubre', desc: 'Jul–Sep' },
                  { t: 4, label: 'T4', fecha: '30 enero',   desc: 'Oct–Dic' },
                ].map(item => {
                  const esSiguiente = item.t === alertaFiscal.trimestre
                  return (
                    <div key={item.t} style={{ padding:'10px 12px', borderRadius:10, border:`1px solid ${esSiguiente ? '#6366F1' : 'var(--border)'}`, background: esSiguiente ? '#F5F3FF' : 'transparent' }}>
                      <div style={{ fontSize:13, fontWeight:800, color: esSiguiente ? K.lilaDark : 'var(--text)' }}>{item.label} — {item.fecha}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{item.desc}{esSiguiente ? ' ← próximo' : ''}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal descuento día flojo ── */}
      {modalDescuento && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={() => setModalDescuento(null)}
        >
          <div
            style={{ background:'white', borderRadius:'24px 24px 0 0', padding:'24px 20px 40px', width:'100%', maxWidth:480 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:4 }}>🏷️ Activar descuento</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20, lineHeight:1.6 }}>
              Crea un descuento para los <strong>{modalDescuento.dia.toLowerCase()}s</strong> — ese día tiene menos del 50% de ocupación histórica.
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:8 }}>Porcentaje de descuento</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[10, 15, 20, 25, 30].map(p => (
                  <button key={p} onClick={() => setPctDescuentoModal(p)} style={{
                    padding:'8px 16px', border:`1.5px solid ${pctDescuentoModal === p ? '#111827' : 'rgba(0,0,0,0.12)'}`,
                    borderRadius:10, fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer',
                    background: pctDescuentoModal === p ? '#111827' : 'white',
                    color: pctDescuentoModal === p ? 'white' : '#374151', transition:'all 0.15s',
                  }}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding:'12px 14px', background:'rgba(184,237,212,0.2)', border:'1px solid rgba(184,237,212,0.5)', borderRadius:12, marginBottom:20, fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
              Se aplicará un <strong>{pctDescuentoModal}% de descuento</strong> en todos los servicios los <strong>{modalDescuento.dia.toLowerCase()}s</strong>.
            </div>
            <button
              disabled={guardandoDescuento}
              onClick={async () => {
                setGuardandoDescuento(true)
                try {
                  await supabase.from('descuentos').upsert({
                    negocio_id: negocioId,
                    dia_semana: modalDescuento.diaCorto.toLowerCase(),
                    porcentaje: pctDescuentoModal,
                    activo: true,
                    nombre: `Descuento ${modalDescuento.dia}`,
                  })
                } catch { /* tabla descuentos opcional */ }
                setDescuentoActivado(prev => [...prev, modalDescuento.dia])
                setGuardandoDescuento(false)
                setModalDescuento(null)
              }}
              style={{ width:'100%', padding:'13px', background:'#111827', color:'white', border:'none', borderRadius:12, fontFamily:'inherit', fontSize:15, fontWeight:700, cursor: guardandoDescuento ? 'not-allowed' : 'pointer', opacity: guardandoDescuento ? 0.6 : 1, marginBottom:10, transition:'opacity 0.15s' }}
            >
              {guardandoDescuento ? 'Activando...' : `✅ Activar ${pctDescuentoModal}% los ${modalDescuento.dia.toLowerCase()}s`}
            </button>
            <button
              onClick={() => setModalDescuento(null)}
              style={{ width:'100%', padding:'13px', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:12, fontFamily:'inherit', fontSize:15, fontWeight:700, cursor:'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
