'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

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
        .select('id, fecha, estado, cliente_nombre, cliente_telefono, servicios(nombre,precio)')
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
    return (
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px' }}>{fmt(val)}{unit === '€' ? ' €' : ''}</span>
          {pctChange !== null && (
            <span style={{ fontSize:12, fontWeight:700, color: up ? '#2E8A5E' : dn ? '#DC2626' : '#9CA3AF', marginBottom:3 }}>
              {up ? '▲' : dn ? '▼' : '→'} {Math.abs(pctChange)}%
            </span>
          )}
        </div>
        <div style={{ fontSize:12, color:'var(--muted)' }}>Anterior: {fmt(valPrev)}{unit === '€' ? ' €' : ''}</div>
      </div>
    )
  }

  // ── KPI card ──────────────────────────────────────────────────────────────
  function KpiCard({ label, value, sub, color = '#111827' }: { label: string; value: string; sub?: string; color?: string }) {
    return (
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px', flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:800, color, letterSpacing:'-1px', marginBottom:4 }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:'var(--muted)' }}>{sub}</div>}
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
        .an-section { margin-bottom:28px; }
        .an-section-title { font-size:15px; font-weight:800; color:var(--text); margin-bottom:12px; }
        .an-card { background:white; border:1px solid var(--border); border-radius:16px; padding:20px; overflow:hidden; }
        .an-card-title { font-size:13px; font-weight:700; color:var(--text2); margin-bottom:14px; }
        .vip-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); }
        .vip-row:last-child { border-bottom:none; }
        .vip-badge { background:linear-gradient(135deg,#FDE9A2,#FED7AA); color:#92400E; font-size:11px; font-weight:800; padding:2px 8px; border-radius:100px; white-space:nowrap; }
        .stat-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px; }
        .stat-row:last-child { border-bottom:none; }
        @media (max-width:768px) {
          .an-grid4 { grid-template-columns:1fr 1fr; }
          .an-grid3 { grid-template-columns:1fr; }
          .an-grid2 { grid-template-columns:1fr; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px' }}>Analytics</div>
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
          {/* ── KPIs ── */}
          <div className="an-section">
            <div className="an-grid4" style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              <KpiCard label="Ingresos periodo" value={`${fmtEur(ingresos)} €`} sub={`${completadas.length} servicios completados`} color={K.greenDark} />
              <KpiCard label="Reservas completadas" value={String(completadas.length)} sub={`${reservas.length} totales · ${canceladas.length} canceladas`} />
              <KpiCard label="Tasa de ocupación" value={`${tasaOcupacion}%`} sub="Completadas / Total activas" color={tasaOcupacion >= 70 ? K.greenDark : tasaOcupacion >= 40 ? K.yellowDark : '#DC2626'} />
              <KpiCard label="Tasa cancelación" value={`${tasaCancelacion}%`} sub={`${canceladas.length} cancelaciones`} color={tasaCancelacion <= 10 ? K.greenDark : tasaCancelacion <= 25 ? K.yellowDark : '#DC2626'} />
            </div>
          </div>

          {/* ── Comparativas ── */}
          <div className="an-section">
            <div className="an-section-title">Comparativas</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
              <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Este mes vs mes anterior</div>
                <div style={{ display:'flex', gap:10 }}>
                  <ComparCard label="Ingresos mes" val={ingMes} valPrev={ingMesPrev} pctChange={pctMesIngresos} fmt={fmtEur} />
                  <ComparCard label="Reservas mes" val={resMes.length} valPrev={resMesPrev.length} pctChange={pctMesReservas} fmt={n => String(n)} unit="" />
                </div>
              </div>
              <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Esta semana vs semana anterior</div>
                <div style={{ display:'flex', gap:10 }}>
                  <ComparCard label="Ingresos semana" val={ingSemana} valPrev={ingSemPrev} pctChange={pctSemIngresos} fmt={fmtEur} />
                  <ComparCard label="Reservas semana" val={resSemana.length} valPrev={resSemPrev.length} pctChange={pctSemReservas} fmt={n => String(n)} unit="" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Gráficas: barras + dona ── */}
          <div className="an-section">
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
              {/* Reservas + ingresos por día */}
              <div className="an-card">
                <div className="an-card-title">Reservas e ingresos por día</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reservasPorDia} margin={{ top:4, right:4, bottom:0, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="r" orientation="left" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false} width={24} />
                    <YAxis yAxisId="i" orientation="right" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false} width={40} tickFormatter={v => `${v}€`} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar yAxisId="r" dataKey="reservas" fill={K.blue} radius={[4,4,0,0]} maxBarSize={28} />
                    <Bar yAxisId="i" dataKey="ingresos" fill={K.lila} radius={[4,4,0,0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={distribServs} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2}>
                          {distribServs.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={ingresosPorSemana} margin={{ top:4, right:16, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="semana" tick={{ fontSize:11, fill:'#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} tickLine={false} axisLine={false} width={48} tickFormatter={v => `${v}€`} />
                  <Tooltip formatter={(v: any) => [`${fmtEur(v)} €`, 'Ingresos']} />
                  <Line type="monotone" dataKey="ingresos" stroke={K.greenDark} strokeWidth={2.5} dot={{ fill:K.green, strokeWidth:0, r:4 }} activeDot={{ r:6 }} />
                </LineChart>
              </ResponsiveContainer>
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
                    <div style={{ fontSize:26, fontWeight:800, color:K.blueDark, marginBottom:6 }}>{horaPunta[0]}</div>
                    <div style={{ fontSize:13, color:'var(--text2)' }}>{horaPunta[1]} reservas en esa franja</div>
                  </>
                ) : <div style={{ color:'var(--muted)', fontSize:13 }}>Sin datos suficientes</div>}
              </div>
              <div className="an-card">
                <div className="an-card-title">📅 Día más ocupado</div>
                {diaPunta ? (
                  <>
                    <div style={{ fontSize:26, fontWeight:800, color:K.lilaDark, marginBottom:6 }}>{diaPunta.dia}</div>
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
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
                        <div style={{ fontSize:28, fontWeight:800, color:K.greenDark }}>{clientesStats.nuevos}</div>
                        <div style={{ fontSize:12, color:K.greenDark, fontWeight:600 }}>Nuevos</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>Primera visita</div>
                      </div>
                      <div style={{ flex:1, background:`${K.blue}40`, borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
                        <div style={{ fontSize:28, fontWeight:800, color:K.blueDark }}>{clientesStats.recurrentes}</div>
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
                  <div style={{ marginTop:10, padding:'8px 0 0', fontSize:12, color:'var(--muted)' }}>
                    Criterio VIP: más de 5 reservas completadas <strong>o</strong> más de 200 € gastados (histórico total)
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  )
}
