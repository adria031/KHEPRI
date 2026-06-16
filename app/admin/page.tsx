'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  AreaChart, Area,
  PieChart, Pie, Cell,
} from 'recharts'

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'adria.gaitan.sola@gmail.com'

const CREDITOS_POR_PLAN: Record<string, number> = {
  starter: 100, basico: 300, pro: 1000, plus: 5000, beta: 2000,
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ─── Types ────────────────────────────────────────────────────────────────────

type TabActiva = 'overview' | 'negocios' | 'usuarios' | 'waitlist' | 'reservas' | 'ia' | 'invitar' | 'actividad'

type NegProfile = { email?: string | null; nombre?: string | null }

type Negocio = {
  id: string; nombre: string; tipo: string | null; ciudad: string | null
  created_at: string; activo: boolean | null; user_id: string
  plan: string | null; creditos_totales: number | null; creditos_usados: number | null
  profiles?: NegProfile | null
}

type Perfil = {
  id: string; nombre?: string | null; email?: string | null; rol?: string | null
  plan?: string | null; creditos_totales?: number | null; creditos_usados?: number | null
  created_at: string
}

type WaitlistItem = {
  id: string; nombre?: string | null; email: string
  tipo_negocio?: string | null; ciudad?: string | null; created_at: string
}

type ReservaGlobal = {
  id: string; fecha: string; hora: string; estado: string; precio_total: number | null
  nombre_cliente?: string | null; email_cliente?: string | null
  negocios: { nombre: string } | null
  servicios: { nombre: string } | null
}

type LogItem = { id: string; created_at: string; tipo?: string | null; descripcion?: string | null; user_id?: string | null }
type ChartBar  = { mes: string; negocios: number }
type ChartArea = { dia: string; reservas: number }
type ChartPie  = { name: string; value: number; color: string }

type PlanModalData = { negId: string; userId: string; nombre: string; planActual: string }
type CreditosModalData = { negId: string; userId: string; nombre: string; actuales: number; totales: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
function fmtHace(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins === 1) return 'hace 1 min'
  return `hace ${mins} min`
}

function planBadge(plan: string | null | undefined) {
  const p = plan || 'starter'
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    starter: { bg: '#F0FDF4', color: '#16A34A', label: 'Starter' },
    basico:  { bg: '#EFF6FF', color: '#1D4ED8', label: 'Básico'  },
    pro:     { bg: '#F5F3FF', color: '#7C3AED', label: 'Pro'     },
    plus:    { bg: '#FFFBEB', color: '#D97706', label: 'Plus'    },
    agencia: { bg: '#FFFBEB', color: '#D97706', label: 'Plus'    },
    beta:    { bg: '#F3F4F6', color: '#6B7280', label: 'Beta'    },
  }
  const c = cfg[p] || { bg: '#F3F4F6', color: '#6B7280', label: p }
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '8px', whiteSpace: 'nowrap' as const }}>
      {c.label}
    </span>
  )
}

function estadoBadge(estado: string) {
  const cfg: Record<string, { bg: string; color: string }> = {
    pendiente:  { bg: '#FFFBEB', color: '#B45309' },
    confirmada: { bg: '#F0FDF4', color: '#16A34A' },
    completada: { bg: '#EFF6FF', color: '#1D4ED8' },
    cancelada:  { bg: '#FEF2F2', color: '#DC2626' },
    no_show:    { bg: '#F3F4F6', color: '#6B7280' },
  }
  const c = cfg[estado] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '8px', whiteSpace: 'nowrap' as const }}>
      {estado}
    </span>
  )
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()

  // ── PIN guard ─────────────────────────────────────────────────────────────
  const [pin,   setPin]   = useState('')
  const [pinOk, setPinOk] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin_pin_ok') === 'true') setPinOk(true)
  }, [])

  function verificarPin() {
    if (pin === process.env.NEXT_PUBLIC_ADMIN_PIN) {
      sessionStorage.setItem('admin_pin_ok', 'true')
      setPinOk(true)
    } else {
      alert('PIN incorrecto')
      setPin('')
    }
  }

  // ── UI state ──────────────────────────────────────────────────────────────
  const [cargando,    setCargando]    = useState(true)
  const [tabActiva,   setTabActiva]   = useState<TabActiva>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lastUpdate,  setLastUpdate]  = useState(new Date())

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const [totalNegocios,  setTotalNegocios]  = useState(0)
  const [totalPerfiles,  setTotalPerfiles]  = useState(0)
  const [totalReservas,  setTotalReservas]  = useState(0)
  const [ingresoEst,     setIngresoEst]     = useState(0)
  const [activos7d,      setActivos7d]      = useState(0)
  const [nuevos7d,       setNuevos7d]       = useState(0)
  const [totalWaitlist,  setTotalWaitlist]  = useState(0)

  // ── Negocios ──────────────────────────────────────────────────────────────
  const [negocios,   setNegocios]   = useState<Negocio[]>([])
  const [busqNeg,    setBusqNeg]    = useState('')
  const [filtroPlan, setFiltroPlan] = useState('todos')

  // ── Plan modal ────────────────────────────────────────────────────────────
  const [planModal,     setPlanModal]     = useState<PlanModalData | null>(null)
  const [planNuevo,     setPlanNuevo]     = useState('')
  const [cambiandoPlan, setCambiandoPlan] = useState(false)

  // ── Créditos modal ────────────────────────────────────────────────────────
  const [creditosModal,   setCreditosModal]   = useState<CreditosModalData | null>(null)
  const [creditosAnadir,  setCreditosAnadir]  = useState('')
  const [aniendoCreditos, setAniendoCreditos] = useState(false)

  // ── Usuarios ──────────────────────────────────────────────────────────────
  const [perfiles,  setPerfiles]  = useState<Perfil[]>([])
  const [busqPerf,  setBusqPerf]  = useState('')

  // ── Waitlist ──────────────────────────────────────────────────────────────
  const [waitlist,      setWaitlist]      = useState<WaitlistItem[]>([])
  const [waitlistError, setWaitlistError] = useState(false)

  // ── Reservas globales ─────────────────────────────────────────────────────
  const [reservasGlobales, setReservasGlobales] = useState<ReservaGlobal[]>([])
  const [filtroEstado,     setFiltroEstado]     = useState('todas')

  // ── IA metrics ────────────────────────────────────────────────────────────
  const [creditosConsumidosTotal, setCreditosConsumidosTotal] = useState(0)
  const [negsBajoCredito,         setNegsBajoCredito]         = useState<Negocio[]>([])
  const [usoConcepto,             setUsoConcepto]             = useState<{ concepto: string; total: number }[]>([])

  // ── Charts ────────────────────────────────────────────────────────────────
  const [chartBar,  setChartBar]  = useState<ChartBar[]>([])
  const [chartArea, setChartArea] = useState<ChartArea[]>([])
  const [chartPie,  setChartPie]  = useState<ChartPie[]>([])
  const barRef  = useRef<HTMLDivElement | null>(null)
  const areaRef = useRef<HTMLDivElement | null>(null)
  const [barW,  setBarW]  = useState(0)
  const [areaW, setAreaW] = useState(0)

  // ── Invitar ───────────────────────────────────────────────────────────────
  const [invitarEmail, setInvitarEmail] = useState('')
  const [invitando,    setInvitando]    = useState(false)
  const [inviteMsg,    setInviteMsg]    = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // ── Logs ──────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<LogItem[]>([])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || session.user.email !== ADMIN_EMAIL) {
      router.push('/dashboard'); return
    }

    const hace7d  = new Date(); hace7d.setDate(hace7d.getDate() - 7)
    const hace30d = new Date(); hace30d.setDate(hace30d.getDate() - 30)
    const hace7ISO  = hace7d.toISOString().split('T')[0]
    const hace30ISO = hace30d.toISOString().split('T')[0]

    const [
      { count: cNegs },
      { count: cPerfs },
      { count: cRes },
      { data: negsData },
      { data: perfsData },
      { data: res30Data },
      { data: resGlobData },
      { data: resCompletadas },
      { data: logsData },
      waitlistResult,
      historialResult,
    ] = await Promise.all([
      supabase.from('negocios').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('reservas').select('*', { count: 'exact', head: true }),
      supabase.from('negocios')
        .select('id, nombre, tipo, ciudad, created_at, activo, user_id, plan, creditos_totales, creditos_usados, profiles!user_id(email, nombre)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles')
        .select('id, nombre, email, rol, plan, creditos_totales, creditos_usados, created_at')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('reservas')
        .select('fecha')
        .gte('fecha', hace30ISO)
        .order('fecha'),
      supabase.from('reservas')
        .select('id, fecha, hora, estado, precio_total, nombre_cliente, email_cliente, negocios(nombre), servicios(nombre)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('reservas')
        .select('precio_total')
        .eq('estado', 'completada')
        .gte('fecha', hace30ISO),
      supabase.from('logs_actividad')
        .select('id, created_at, tipo, descripcion, user_id')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('waitlist')
        .select('id, nombre, email, tipo_negocio, ciudad, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('historial_creditos')
        .select('negocio_id, cantidad, concepto')
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    const negsArr = (negsData ?? []) as Negocio[]
    setNegocios(negsArr)
    setTotalNegocios(cNegs ?? 0)
    setTotalPerfiles(cPerfs ?? 0)
    setTotalReservas(cRes ?? 0)
    setPerfiles((perfsData ?? []) as Perfil[])
    setLogs((logsData ?? []) as LogItem[])
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (resGlobData ?? []) as any[]
      setReservasGlobales(raw.map(r => ({
        id: r.id, fecha: r.fecha, hora: r.hora, estado: r.estado,
        precio_total: r.precio_total, nombre_cliente: r.nombre_cliente, email_cliente: r.email_cliente,
        negocios: Array.isArray(r.negocios) ? (r.negocios[0] ?? null) : (r.negocios ?? null),
        servicios: Array.isArray(r.servicios) ? (r.servicios[0] ?? null) : (r.servicios ?? null),
      } as ReservaGlobal)))
    }

    // Ingresos estimados (reservas completadas 30d)
    const ingreso = ((resCompletadas ?? []) as { precio_total: number | null }[])
      .reduce((s, r) => s + (r.precio_total ?? 0), 0)
    setIngresoEst(ingreso)

    // Negocios activos últimos 7 días (con al menos 1 reserva)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const negActivos7d = new Set(
      ((resGlobData ?? []) as unknown as ReservaGlobal[])
        .filter(r => r.fecha >= hace7ISO)
        .map(r => (r.negocios as { nombre: string } | null)?.nombre)
        .filter(Boolean)
    ).size
    setActivos7d(negActivos7d)

    // Nuevos registros 7d (negocios + perfiles)
    const nuevosNegs  = negsArr.filter(n => n.created_at >= hace7d.toISOString()).length
    const nuevosPerfs = ((perfsData ?? []) as Perfil[]).filter(p => p.created_at >= hace7d.toISOString()).length
    setNuevos7d(nuevosNegs + nuevosPerfs)

    // Waitlist
    if (waitlistResult.error) {
      setWaitlistError(true)
    } else {
      const wl = (waitlistResult.data ?? []) as WaitlistItem[]
      setWaitlist(wl)
      setTotalWaitlist(wl.length)
    }

    // IA metrics
    const totalUsado = negsArr.reduce((s, n) => s + (n.creditos_usados ?? 0), 0)
    setCreditosConsumidosTotal(totalUsado)
    setNegsBajoCredito(negsArr.filter(n => {
      const tot = n.creditos_totales ?? 0
      const usd = n.creditos_usados  ?? 0
      return tot > 0 && (tot - usd) < tot * 0.1
    }))

    if (!historialResult.error && historialResult.data) {
      const byConcepto: Record<string, number> = {}
      for (const row of historialResult.data as { concepto: string; cantidad: number }[]) {
        byConcepto[row.concepto] = (byConcepto[row.concepto] ?? 0) + row.cantidad
      }
      setUsoConcepto(
        Object.entries(byConcepto)
          .map(([concepto, total]) => ({ concepto, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)
      )
    }

    // Charts
    const ahora = new Date()
    const bars: ChartBar[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      bars.push({ mes: MESES[d.getMonth()], negocios: negsArr.filter(n => n.created_at.startsWith(prefix)).length })
    }
    setChartBar(bars)

    const days: ChartArea[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      days.push({ dia: fmtFechaCorta(iso), reservas: (res30Data ?? []).filter((r: { fecha: string }) => r.fecha === iso).length })
    }
    setChartArea(days)

    const planCount: Record<string, number> = {}
    negsArr.forEach(n => { const p = n.plan || 'starter'; planCount[p] = (planCount[p] ?? 0) + 1 })
    const PIE_CFG: Record<string, { label: string; color: string }> = {
      starter: { label: 'Starter', color: '#4ADE80' },
      basico:  { label: 'Básico',  color: '#60A5FA' },
      pro:     { label: 'Pro',     color: '#A78BFA' },
      plus:    { label: 'Plus',    color: '#FCD34D' },
      agencia: { label: 'Plus',    color: '#FCD34D' },
      beta:    { label: 'Beta',    color: '#9CA3AF' },
    }
    setChartPie(Object.entries(planCount).map(([k, v]) => ({
      name: PIE_CFG[k]?.label ?? k, value: v, color: PIE_CFG[k]?.color ?? '#9CA3AF',
    })))

    setLastUpdate(new Date())
    setCargando(false)
  }, [router])

  useEffect(() => {
    cargarDatos()
    const iv = setInterval(cargarDatos, 60000)
    return () => clearInterval(iv)
  }, [cargarDatos])

  useEffect(() => {
    if (barRef.current)  setBarW(barRef.current.offsetWidth)
    if (areaRef.current) setAreaW(areaRef.current.offsetWidth)
  }, [tabActiva, chartBar, chartArea])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function cambiarPlan() {
    if (!planModal || !planNuevo) return
    setCambiandoPlan(true)
    const creditos = CREDITOS_POR_PLAN[planNuevo] ?? 100
    await Promise.all([
      supabase.from('negocios').update({ plan: planNuevo, creditos_totales: creditos, creditos_usados: 0 }).eq('id', planModal.negId),
      supabase.from('profiles').update({ plan: planNuevo, creditos_totales: creditos, creditos_usados: 0 }).eq('id', planModal.userId),
    ])
    setNegocios(prev => prev.map(n => n.id === planModal.negId ? { ...n, plan: planNuevo, creditos_totales: creditos, creditos_usados: 0 } : n))
    setCambiandoPlan(false)
    setPlanModal(null)
    setPlanNuevo('')
  }

  async function anadirCreditos() {
    if (!creditosModal || !creditosAnadir) return
    const extra = parseInt(creditosAnadir)
    if (isNaN(extra) || extra <= 0) return
    setAniendoCreditos(true)
    const nuevoTotal = creditosModal.totales + extra
    await Promise.all([
      supabase.from('negocios').update({ creditos_totales: nuevoTotal }).eq('id', creditosModal.negId),
      supabase.from('profiles').update({ creditos_totales: nuevoTotal }).eq('id', creditosModal.userId),
    ])
    setNegocios(prev => prev.map(n => n.id === creditosModal.negId ? { ...n, creditos_totales: nuevoTotal } : n))
    setAniendoCreditos(false)
    setCreditosModal(null)
    setCreditosAnadir('')
  }

  async function invitarEmpresa() {
    if (!invitarEmail.trim()) return
    setInvitando(true); setInviteMsg(null)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invitarEmail.trim() }),
      })
      if (res.ok) { setInviteMsg({ tipo: 'ok', texto: `Invitación enviada a ${invitarEmail.trim()}` }); setInvitarEmail('') }
      else { const d = await res.json(); setInviteMsg({ tipo: 'error', texto: d.error || 'Error al enviar' }) }
    } catch (e: unknown) { setInviteMsg({ tipo: 'error', texto: (e as Error).message }) }
    setInvitando(false)
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  const negociosFiltrados = negocios.filter(n => {
    const pf = n.profiles as NegProfile | null
    const matchPlan = filtroPlan === 'todos' || (n.plan || 'starter') === filtroPlan
    const matchBusq = !busqNeg ||
      n.nombre.toLowerCase().includes(busqNeg.toLowerCase()) ||
      (n.ciudad ?? '').toLowerCase().includes(busqNeg.toLowerCase()) ||
      (pf?.email ?? '').toLowerCase().includes(busqNeg.toLowerCase())
    return matchPlan && matchBusq
  })

  const perfilesFiltrados = perfiles.filter(p =>
    !busqPerf ||
    (p.nombre ?? '').toLowerCase().includes(busqPerf.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(busqPerf.toLowerCase())
  )

  const reservasFiltradas = filtroEstado === 'todas'
    ? reservasGlobales
    : reservasGlobales.filter(r => r.estado === filtroEstado)

  // ── TABS config ───────────────────────────────────────────────────────────

  const TABS: { id: TabActiva; icon: string; label: string }[] = [
    { id: 'overview',  icon: '📊', label: 'Resumen'                         },
    { id: 'negocios',  icon: '🏢', label: `Negocios (${totalNegocios})`     },
    { id: 'usuarios',  icon: '👥', label: `Usuarios (${totalPerfiles})`     },
    { id: 'waitlist',  icon: '📋', label: `Waitlist (${totalWaitlist})`     },
    { id: 'reservas',  icon: '📅', label: 'Reservas'                        },
    { id: 'ia',        icon: '🤖', label: 'Métricas IA'                     },
    { id: 'invitar',   icon: '📩', label: 'Invitar'                         },
    { id: 'actividad', icon: '🕐', label: 'Actividad'                       },
  ]

  // ── PIN screen ────────────────────────────────────────────────────────────

  if (!pinOk) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FF', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 320, width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#111827' }}>Panel Admin</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Introduce el PIN de acceso</p>
          <input
            type="password" value={pin} onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verificarPin()}
            placeholder="••••" maxLength={6} autoFocus
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 20, textAlign: 'center', letterSpacing: 8, marginBottom: 16, outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={verificarPin}
            style={{ width: '100%', padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Acceder →
          </button>
        </div>
      </div>
    </>
  )

  // ── Loading ───────────────────────────────────────────────────────────────

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', fontFamily: "'DM Sans',sans-serif", flexDirection: 'column', gap: 12 }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <p style={{ color: '#6B7280', fontSize: 14 }}>Cargando panel admin…</p>
    </div>
  )

  const mrr = negocios.reduce((s, n) => {
    const p = n.plan || 'starter'
    const PRECIOS: Record<string, number> = { starter: 0, basico: 29.99, pro: 59.99, plus: 99.99, agencia: 99.99, beta: 0 }
    return s + (PRECIOS[p] ?? 0)
  }, 0)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',sans-serif; background:#F7F9FF; color:#111827; }
        .layout { display:flex; min-height:100vh; }

        .sidebar { width:220px; background:white; border-right:1px solid rgba(0,0,0,0.07); display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:50; transition:transform 0.25s; }
        .sb-logo { padding:16px 14px; border-bottom:1px solid rgba(0,0,0,0.06); display:flex; align-items:center; gap:10px; }
        .sb-badge { background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; font-size:9px; font-weight:700; padding:2px 7px; border-radius:100px; letter-spacing:0.5px; text-transform:uppercase; }
        .sb-nav { padding:10px 8px; flex:1; overflow-y:auto; }
        .sb-item { display:flex; align-items:center; gap:9px; padding:9px 12px; border-radius:11px; font-size:13px; font-weight:500; color:#6B7280; cursor:pointer; margin-bottom:2px; transition:all 0.15s; background:none; border:none; width:100%; text-align:left; font-family:inherit; }
        .sb-item:hover { background:#F3F4F6; color:#111827; }
        .sb-item.active { background:rgba(99,102,241,0.08); color:#4F46E5; font-weight:700; }
        .sb-icon { font-size:14px; width:18px; text-align:center; flex-shrink:0; }
        .sb-footer { padding:14px 8px; border-top:1px solid rgba(0,0,0,0.06); }
        .sb-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:40; }

        .main { margin-left:220px; flex:1; display:flex; flex-direction:column; min-height:100vh; }
        .topbar { background:white; border-bottom:1px solid rgba(0,0,0,0.06); padding:12px 24px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; gap:12px; flex-wrap:wrap; }
        .hamburger { display:none; background:none; border:none; cursor:pointer; padding:6px; color:#6B7280; font-size:20px; }
        .content { padding:24px; flex:1; max-width:1200px; }

        .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        .kpi-card { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); padding:18px; box-shadow:0 1px 6px rgba(0,0,0,0.04); }
        .kpi-icon { font-size:20px; margin-bottom:8px; }
        .kpi-label { font-size:11px; color:#6B7280; font-weight:600; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.4px; }
        .kpi-val { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; color:#111827; letter-spacing:-1px; line-height:1; margin-bottom:3px; }
        .kpi-sub { font-size:11px; color:#9CA3AF; }

        .charts-grid { display:grid; grid-template-columns:1fr 1fr 200px; gap:14px; margin-bottom:24px; }
        .chart-card { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); padding:18px; box-shadow:0 1px 6px rgba(0,0,0,0.04); }
        .chart-title { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:#111827; margin-bottom:14px; }

        .sec-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px; }
        .sec-title { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:#111827; }
        .sec-count { font-size:12px; color:#6B7280; margin-top:2px; }
        .filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .s-input { padding:8px 12px; background:white; border:1.5px solid #E5E7EB; border-radius:10px; font-family:inherit; font-size:13px; color:#111827; outline:none; width:200px; }
        .s-input:focus { border-color:#6366F1; }
        .f-btn { padding:6px 11px; border-radius:8px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; }
        .f-btn.act { background:rgba(99,102,241,0.08); border-color:rgba(99,102,241,0.3); color:#4F46E5; }

        .tbl-wrap { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); overflow:hidden; margin-bottom:24px; box-shadow:0 1px 6px rgba(0,0,0,0.04); overflow-x:auto; }
        table { width:100%; border-collapse:collapse; min-width:600px; }
        thead th { padding:10px 14px; font-size:11px; font-weight:700; color:#9CA3AF; text-align:left; text-transform:uppercase; letter-spacing:0.4px; background:#FAFAFA; border-bottom:1px solid rgba(0,0,0,0.06); white-space:nowrap; }
        tbody td { padding:11px 14px; font-size:13px; color:#374151; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle; }
        tbody tr:last-child td { border-bottom:none; }
        tbody tr:nth-child(even) td { background:#FAFBFF; }
        tbody tr:hover td { background:#F5F3FF; }
        .cell-name { font-weight:600; color:#111827; }
        .cell-sub { font-size:11px; color:#9CA3AF; margin-top:1px; }

        .btn-xs { padding:4px 9px; border-radius:7px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:11px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
        .btn-xs:hover { border-color:#6366F1; color:#4F46E5; background:rgba(99,102,241,0.04); }
        .btn-xs.green { border-color:#D1FAE5; color:#059669; }
        .btn-xs.green:hover { background:rgba(5,150,105,0.06); border-color:#059669; }
        .btn-xs.red { border-color:#FEE2E2; color:#DC2626; }
        .btn-xs.red:hover { background:rgba(220,38,38,0.06); }

        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(2px); }
        .modal { background:white; border-radius:22px; padding:28px; width:100%; max-width:420px; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
        .modal h3 { font-family:'Syne',sans-serif; font-size:19px; font-weight:800; color:#111827; margin-bottom:5px; }
        .modal-sub { font-size:13px; color:#6B7280; margin-bottom:20px; }
        .plan-opts { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
        .plan-opt { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1.5px solid #E5E7EB; border-radius:12px; cursor:pointer; transition:all 0.15s; background:white; }
        .plan-opt.sel { border-color:#6366F1; background:rgba(99,102,241,0.04); }
        .plan-opt:hover { border-color:#A5B4FC; }
        .plan-opt-name { font-size:14px; font-weight:700; color:#111827; }
        .plan-opt-price { font-size:11px; color:#9CA3AF; margin-top:1px; }
        .modal-btns { display:flex; gap:8px; }
        .btn-cancel { flex:1; padding:11px; background:#F3F4F6; border:none; border-radius:11px; font-family:inherit; font-size:14px; font-weight:600; color:#374151; cursor:pointer; }
        .btn-confirm { flex:1; padding:11px; background:linear-gradient(135deg,#4F46E5,#7C3AED); border:none; border-radius:11px; font-family:inherit; font-size:14px; font-weight:700; color:white; cursor:pointer; }
        .btn-confirm:disabled { opacity:0.45; cursor:not-allowed; }

        .invite-card { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); padding:24px; margin-bottom:18px; max-width:560px; }
        .inv-input { flex:1; padding:10px 13px; border:1.5px solid #E5E7EB; border-radius:10px; font-family:inherit; font-size:14px; color:#111827; outline:none; }
        .inv-input:focus { border-color:#6366F1; }
        .inv-btn { padding:10px 20px; border-radius:10px; border:none; background:linear-gradient(135deg,#4F46E5,#7C3AED); color:white; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .inv-btn:disabled { opacity:0.45; cursor:not-allowed; }

        .log-item { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(0,0,0,0.05); }
        .log-item:last-child { border-bottom:none; }
        .log-dot { width:7px; height:7px; border-radius:50%; background:#6366F1; flex-shrink:0; margin-top:5px; }

        .action-bar { display:flex; gap:8px; flex-wrap:wrap; }
        .act-btn { padding:7px 13px; border-radius:9px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:700; color:#374151; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.15s; }
        .act-btn:hover { border-color:#6366F1; color:#4F46E5; background:rgba(99,102,241,0.04); }

        .alert-card { background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; margin-bottom:10px; }
        .ia-row { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:10px; background:#F9FAFB; border:1px solid rgba(0,0,0,0.05); margin-bottom:8px; }

        @media(max-width:1024px) { .kpi-grid { grid-template-columns:repeat(2,1fr); } .charts-grid { grid-template-columns:1fr; } }
        @media(max-width:768px) {
          .sidebar { transform:translateX(-100%); }
          .sidebar.open { transform:translateX(0); }
          .sb-overlay.open { display:block; }
          .hamburger { display:block; }
          .main { margin-left:0; }
          .topbar { padding:10px 14px; }
          .content { padding:14px; }
          .kpi-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
        }
      `}</style>

      {/* ── Plan modal ── */}
      {planModal && (
        <div className="overlay" onClick={() => setPlanModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Cambiar plan</h3>
            <p className="modal-sub">{planModal.nombre}</p>
            <div className="plan-opts">
              {([
                { id: 'starter', label: 'Starter', precio: 'Gratis · 100 créditos' },
                { id: 'basico',  label: 'Básico',  precio: '29,99 €/mes · 300 créditos' },
                { id: 'pro',     label: 'Pro',     precio: '59,99 €/mes · 1.000 créditos' },
                { id: 'plus',    label: 'Plus',    precio: '99,99 €/mes · 5.000 créditos' },
                { id: 'beta',    label: 'Beta',    precio: 'Gratis · 2.000 créditos' },
              ] as const).map(p => (
                <div key={p.id} className={`plan-opt ${planNuevo === p.id ? 'sel' : ''}`} onClick={() => setPlanNuevo(p.id)}>
                  <div style={{ flex: 1 }}>
                    <div className="plan-opt-name">{p.label}</div>
                    <div className="plan-opt-price">{p.precio}</div>
                  </div>
                  {planModal.planActual === p.id && <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Actual</span>}
                  {planNuevo === p.id && planModal.planActual !== p.id && <span style={{ color: '#4F46E5', fontSize: 16 }}>✓</span>}
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

      {/* ── Créditos modal ── */}
      {creditosModal && (
        <div className="overlay" onClick={() => setCreditosModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3>Añadir créditos</h3>
            <p className="modal-sub">{creditosModal.nombre} · Actuales: {creditosModal.actuales} / {creditosModal.totales}</p>
            <input
              type="number" min="1" placeholder="Cantidad a añadir" value={creditosAnadir}
              onChange={e => setCreditosAnadir(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 11, fontFamily: 'inherit', fontSize: 16, outline: 'none', marginBottom: 16 }}
            />
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setCreditosModal(null)}>Cancelar</button>
              <button className="btn-confirm" disabled={!creditosAnadir || aniendoCreditos} onClick={anadirCreditos}>
                {aniendoCreditos ? 'Añadiendo…' : '+ Añadir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        <div className={`sb-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sb-logo">
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#111827' }}>Khepria</div>
              <div className="sb-badge">Admin</div>
            </div>
          </div>

          <nav className="sb-nav">
            {TABS.map(t => (
              <button key={t.id} className={`sb-item ${tabActiva === t.id ? 'active' : ''}`}
                onClick={() => { setTabActiva(t.id); setSidebarOpen(false) }}>
                <span className="sb-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '10px 4px' }}/>
            <button className="sb-item" onClick={() => router.push('/dashboard')}>
              <span className="sb-icon">↩</span> Dashboard
            </button>
          </nav>

          <div className="sb-footer">
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
              style={{ width: '100%', padding: '9px 12px', background: 'none', border: '1.5px solid #E5E7EB', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="main">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: '#111827' }}>
                  {TABS.find(t => t.id === tabActiva)?.icon} {TABS.find(t => t.id === tabActiva)?.label}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Última actualización: {fmtHace(lastUpdate)}</div>
              </div>
            </div>
            <div className="action-bar">
              <button className="act-btn" onClick={() => exportCSV(
                negociosFiltrados.map(n => ({
                  nombre: n.nombre, ciudad: n.ciudad, plan: n.plan,
                  creditos_usados: n.creditos_usados, creditos_totales: n.creditos_totales,
                  email: (n.profiles as NegProfile | null)?.email ?? '', activo: n.activo, creado: n.created_at,
                })), 'negocios.csv')}>
                📥 Negocios CSV
              </button>
              <button className="act-btn" onClick={() => !waitlistError && exportCSV(
                waitlist.map(w => ({ nombre: w.nombre, email: w.email, tipo: w.tipo_negocio, ciudad: w.ciudad, fecha: w.created_at })),
                'waitlist.csv')}>
                📥 Waitlist CSV
              </button>
              <button className="act-btn" onClick={cargarDatos}>
                🔄 Actualizar
              </button>
            </div>
          </header>

          <div className="content">

            {/* ══ OVERVIEW ══ */}
            {tabActiva === 'overview' && (
              <>
                <div className="kpi-grid">
                  {[
                    { icon: '🏢', label: 'Negocios',         value: totalNegocios.toLocaleString(),        sub: `${negocios.filter(n => n.activo !== false).length} activos`,          bg: '#EFF6FF' },
                    { icon: '👥', label: 'Usuarios',          value: totalPerfiles.toLocaleString(),        sub: 'Perfiles registrados',                                                  bg: '#F0FDF4' },
                    { icon: '📅', label: 'Reservas totales',  value: totalReservas.toLocaleString(),        sub: 'Historial completo',                                                    bg: '#FAF5FF' },
                    { icon: '💰', label: 'Ingresos est. 30d', value: `${ingresoEst.toFixed(0)} €`,          sub: `MRR est. ${mrr.toFixed(0)} €`,                                         bg: '#FFFBEB' },
                    { icon: '⚡', label: 'Activos 7 días',    value: activos7d.toLocaleString(),            sub: 'Negocios con reservas',                                                 bg: '#F0FDF4' },
                    { icon: '🆕', label: 'Nuevos 7 días',     value: nuevos7d.toLocaleString(),             sub: 'Negocios + usuarios',                                                   bg: '#EFF6FF' },
                    { icon: '📋', label: 'Waitlist',           value: totalWaitlist.toLocaleString(),        sub: 'En lista de espera',                                                    bg: '#F5F3FF' },
                    { icon: '🤖', label: 'Créditos usados',   value: creditosConsumidosTotal.toLocaleString(), sub: `${negsBajoCredito.length} negocios con créditos bajos`,              bg: negsBajoCredito.length > 0 ? '#FEF2F2' : '#F8FAFC' },
                  ].map((k, i) => (
                    <div key={i} className="kpi-card" style={{ background: k.bg }}>
                      <div className="kpi-icon">{k.icon}</div>
                      <div className="kpi-label">{k.label}</div>
                      <div className="kpi-val">{k.value}</div>
                      <div className="kpi-sub">{k.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <div className="chart-title">Nuevos negocios (6 meses)</div>
                    <div ref={barRef} style={{ width: '100%', height: 180 }}>
                      {barW > 0 && (
                        <BarChart width={barW} height={180} data={chartBar} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                          <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} formatter={v => [`${v}`, 'Negocios']}/>
                          <Bar dataKey="negocios" fill="#6366F1" radius={[6,6,0,0]}/>
                        </BarChart>
                      )}
                    </div>
                  </div>
                  <div className="chart-card">
                    <div className="chart-title">Reservas últimos 30 días</div>
                    <div ref={areaRef} style={{ width: '100%', height: 180 }}>
                      {areaW > 0 && (
                        <AreaChart width={areaW} height={180} data={chartArea} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <defs>
                            <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={4}/>
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                          <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} formatter={v => [`${v}`, 'Reservas']}/>
                          <Area type="monotone" dataKey="reservas" stroke="#8B5CF6" strokeWidth={2} fill="url(#aG)"/>
                        </AreaChart>
                      )}
                    </div>
                  </div>
                  <div className="chart-card">
                    <div className="chart-title">Por plan</div>
                    {chartPie.length > 0 && (
                      <PieChart width={164} height={164}>
                        <Pie data={chartPie} cx={78} cy={72} innerRadius={44} outerRadius={68} paddingAngle={3} dataKey="value">
                          {chartPie.map((entry, idx) => <Cell key={idx} fill={entry.color}/>)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}/>
                      </PieChart>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                      {chartPie.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 3, background: p.color, flexShrink: 0 }}/>
                          <span style={{ color: '#6B7280' }}>{p.name}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#111827' }}>{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══ NEGOCIOS ══ */}
            {tabActiva === 'negocios' && (
              <>
                <div className="sec-header">
                  <div>
                    <div className="sec-title">Todos los negocios</div>
                    <div className="sec-count">{negociosFiltrados.length} de {totalNegocios}</div>
                  </div>
                  <div className="filters">
                    <input className="s-input" placeholder="🔍 Nombre, email o ciudad…" value={busqNeg} onChange={e => setBusqNeg(e.target.value)}/>
                    {(['todos','starter','basico','pro','plus','beta'] as const).map(p => (
                      <button key={p} className={`f-btn ${filtroPlan === p ? 'act' : ''}`} onClick={() => setFiltroPlan(p)}>
                        {p === 'todos' ? 'Todos' : p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Negocio</th><th>Propietario</th><th>Plan</th>
                        <th>Créditos</th><th>Estado</th><th>Registro</th><th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negociosFiltrados.map(n => {
                        const pf = n.profiles as NegProfile | null
                        const cred_tot = n.creditos_totales ?? 0
                        const cred_usd = n.creditos_usados  ?? 0
                        const cred_dis = cred_tot - cred_usd
                        const credBajo = cred_tot > 0 && cred_dis < cred_tot * 0.1
                        return (
                          <tr key={n.id}>
                            <td>
                              <div className="cell-name">{n.nombre}</div>
                              <div className="cell-sub">{n.tipo || '—'} · {n.ciudad || '—'}</div>
                            </td>
                            <td style={{ fontSize: 12, color: '#6B7280' }}>{pf?.email || '—'}</td>
                            <td>{planBadge(n.plan)}</td>
                            <td>
                              <span style={{ fontSize: 12, color: credBajo ? '#DC2626' : '#6B7280', fontWeight: credBajo ? 700 : 400 }}>
                                {credBajo ? '⚠ ' : ''}{cred_dis} / {cred_tot}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7,
                                background: n.activo !== false ? '#F0FDF4' : '#FEF2F2',
                                color: n.activo !== false ? '#16A34A' : '#DC2626',
                              }}>
                                {n.activo !== false ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtFecha(n.created_at)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                <button className="btn-xs" onClick={() => { setPlanModal({ negId: n.id, userId: n.user_id, nombre: n.nombre, planActual: n.plan || 'starter' }); setPlanNuevo(n.plan || '') }}>
                                  📋 Plan
                                </button>
                                <button className="btn-xs green" onClick={() => setCreditosModal({ negId: n.id, userId: n.user_id, nombre: n.nombre, actuales: cred_dis, totales: cred_tot })}>
                                  ⚡ Créditos
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {negociosFiltrados.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Sin resultados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ USUARIOS ══ */}
            {tabActiva === 'usuarios' && (
              <>
                <div className="sec-header">
                  <div>
                    <div className="sec-title">Usuarios y perfiles</div>
                    <div className="sec-count">{perfilesFiltrados.length} de {totalPerfiles}</div>
                  </div>
                  <div className="filters">
                    <input className="s-input" placeholder="🔍 Nombre o email…" value={busqPerf} onChange={e => setBusqPerf(e.target.value)}/>
                  </div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Plan</th><th>Créditos</th><th>Registro</th></tr>
                    </thead>
                    <tbody>
                      {perfilesFiltrados.map(p => {
                        const cTot = p.creditos_totales ?? 0
                        const cUsd = p.creditos_usados  ?? 0
                        return (
                          <tr key={p.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1E3A5F', flexShrink: 0 }}>
                                  {(p.nombre ?? p.email ?? '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="cell-name">{p.nombre || '—'}</div>
                              </div>
                            </td>
                            <td style={{ color: '#6B7280', fontSize: 12 }}>{p.email || '—'}</td>
                            <td>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 6 }}>
                                {p.rol || 'cliente'}
                              </span>
                            </td>
                            <td>{planBadge(p.plan)}</td>
                            <td style={{ fontSize: 12, color: '#6B7280' }}>{cTot > 0 ? `${cTot - cUsd} / ${cTot}` : '—'}</td>
                            <td style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtFecha(p.created_at)}</td>
                          </tr>
                        )
                      })}
                      {perfilesFiltrados.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Sin usuarios</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ WAITLIST ══ */}
            {tabActiva === 'waitlist' && (
              <>
                <div className="sec-header">
                  <div>
                    <div className="sec-title">Lista de espera</div>
                    <div className="sec-count">{waitlist.length} inscritos</div>
                  </div>
                  <button className="act-btn" onClick={() => exportCSV(
                    waitlist.map(w => ({ nombre: w.nombre, email: w.email, tipo: w.tipo_negocio, ciudad: w.ciudad, fecha: w.created_at })),
                    'waitlist.csv')}>
                    📥 Exportar CSV
                  </button>
                </div>

                {waitlistError ? (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, color: '#B45309', marginBottom: 6 }}>⚠ Acceso restringido</div>
                    <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                      La tabla <code>waitlist</code> tiene una política RLS que requiere <code>service_role</code>.
                      Aplica en Supabase: <code>CREATE POLICY &quot;admin_read_waitlist&quot; ON waitlist FOR SELECT USING (true);</code>
                    </p>
                  </div>
                ) : waitlist.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                    <p style={{ fontWeight: 600, color: '#374151' }}>Waitlist vacía</p>
                  </div>
                ) : (
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr><th>Nombre</th><th>Email</th><th>Tipo negocio</th><th>Ciudad</th><th>Fecha</th></tr>
                      </thead>
                      <tbody>
                        {waitlist.map(w => (
                          <tr key={w.id}>
                            <td className="cell-name">{w.nombre || '—'}</td>
                            <td style={{ color: '#6B7280', fontSize: 12 }}>{w.email}</td>
                            <td style={{ color: '#6B7280' }}>{w.tipo_negocio || '—'}</td>
                            <td style={{ color: '#6B7280' }}>{w.ciudad || '—'}</td>
                            <td style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtFecha(w.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ══ RESERVAS GLOBALES ══ */}
            {tabActiva === 'reservas' && (
              <>
                <div className="sec-header">
                  <div>
                    <div className="sec-title">Reservas recientes</div>
                    <div className="sec-count">{reservasFiltradas.length} mostradas</div>
                  </div>
                  <div className="filters">
                    {(['todas','pendiente','confirmada','completada','cancelada'] as const).map(e => (
                      <button key={e} className={`f-btn ${filtroEstado === e ? 'act' : ''}`} onClick={() => setFiltroEstado(e)}>
                        {e.charAt(0).toUpperCase() + e.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Negocio</th><th>Cliente</th><th>Servicio</th><th>Fecha</th><th>Estado</th><th>Precio</th></tr>
                    </thead>
                    <tbody>
                      {reservasFiltradas.map(r => (
                        <tr key={r.id}>
                          <td className="cell-name">{(r.negocios as { nombre: string } | null)?.nombre ?? '—'}</td>
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.nombre_cliente || '—'}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{r.email_cliente || ''}</div>
                          </td>
                          <td style={{ color: '#6B7280', fontSize: 12 }}>{(r.servicios as { nombre: string } | null)?.nombre ?? '—'}</td>
                          <td style={{ fontSize: 12, color: '#6B7280' }}>{fmtFecha(r.fecha)} {r.hora?.slice(0,5)}</td>
                          <td>{estadoBadge(r.estado)}</td>
                          <td style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                            {r.precio_total ? `${Number(r.precio_total).toFixed(2)} €` : '—'}
                          </td>
                        </tr>
                      ))}
                      {reservasFiltradas.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Sin reservas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ MÉTRICAS IA ══ */}
            {tabActiva === 'ia' && (
              <div style={{ maxWidth: 700 }}>
                <div className="sec-title" style={{ marginBottom: 20 }}>Métricas de IA y créditos</div>

                {/* KPIs IA */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { icon: '⚡', label: 'Créditos consumidos',  value: creditosConsumidosTotal.toLocaleString(), bg: '#F5F3FF', color: '#7C3AED' },
                    { icon: '🔴', label: 'Negocios crédito bajo', value: negsBajoCredito.length.toString(),         bg: '#FEF2F2', color: '#DC2626' },
                    { icon: '📊', label: 'Acciones registradas', value: usoConcepto.reduce((s,c)=>s+c.total,0).toLocaleString(), bg: '#EFF6FF', color: '#1D4ED8' },
                  ].map((k,i) => (
                    <div key={i} className="kpi-card" style={{ background: k.bg }}>
                      <div className="kpi-icon">{k.icon}</div>
                      <div className="kpi-label">{k.label}</div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Negocios con crédito bajo */}
                {negsBajoCredito.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>⚠ Créditos bajos (&lt;10%)</div>
                    {negsBajoCredito.map(n => {
                      const dis = (n.creditos_totales ?? 0) - (n.creditos_usados ?? 0)
                      const pct = n.creditos_totales ? Math.round(dis / n.creditos_totales * 100) : 0
                      return (
                        <div key={n.id} className="alert-card">
                          <span style={{ fontSize: 18 }}>🔴</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>{n.nombre}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{dis} / {n.creditos_totales} créditos ({pct}%)</div>
                          </div>
                          <button className="btn-xs" onClick={() => setCreditosModal({ negId: n.id, userId: n.user_id, nombre: n.nombre, actuales: dis, totales: n.creditos_totales ?? 0 })}>
                            ⚡ Añadir
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Uso por concepto */}
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '18px 20px', marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>Uso por tipo de acción</div>
                  {usoConcepto.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>
                      Sin datos (requiere acceso a historial_creditos)
                    </div>
                  ) : (
                    usoConcepto.map(({ concepto, total }) => {
                      const max = usoConcepto[0]?.total || 1
                      const pct = Math.round(total / max * 100)
                      return (
                        <div key={concepto} className="ia-row">
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', minWidth: 160 }}>{concepto}</span>
                          <div style={{ flex: 1, margin: '0 16px', height: 6, background: '#F3F4F6', borderRadius: 100, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366F1,#8B5CF6)', borderRadius: 100 }}/>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#6366F1', minWidth: 40, textAlign: 'right' }}>{total}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* ══ INVITAR ══ */}
            {tabActiva === 'invitar' && (
              <div style={{ maxWidth: 560 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>Invitar empresa</div>
                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.7 }}>
                  Envía una invitación por email con acceso gratuito de por vida (plan Beta · 2.000 créditos IA).
                </p>
                <div className="invite-card">
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 10 }}>Email de la empresa</div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: inviteMsg ? 14 : 0 }}>
                    <input className="inv-input" type="email" placeholder="empresa@ejemplo.com" value={invitarEmail}
                      onChange={e => { setInvitarEmail(e.target.value); setInviteMsg(null) }}
                      onKeyDown={e => e.key === 'Enter' && invitarEmpresa()}/>
                    <button className="inv-btn" onClick={invitarEmpresa} disabled={invitando || !invitarEmail.trim()}>
                      {invitando ? 'Enviando…' : '📩 Invitar'}
                    </button>
                  </div>
                  {inviteMsg && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: inviteMsg.tipo === 'ok' ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${inviteMsg.tipo === 'ok' ? '#BBF7D0' : '#FECACA'}`,
                      color: inviteMsg.tipo === 'ok' ? '#15803D' : '#DC2626',
                    }}>
                      {inviteMsg.tipo === 'ok' ? '✓ ' : '⚠ '}{inviteMsg.texto}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ ACTIVIDAD ══ */}
            {tabActiva === 'actividad' && (
              <div style={{ maxWidth: 680 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>Logs de actividad</div>
                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Últimas 20 acciones registradas.</p>
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '18px 22px' }}>
                  {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🕐</div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Sin actividad registrada</p>
                    </div>
                  ) : logs.map(log => (
                    <div key={log.id} className="log-item">
                      <div className="log-dot"/>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            {log.tipo && (
                              <span style={{ fontSize: 10, fontWeight: 700, background: '#F3F4F6', color: '#6B7280', padding: '2px 7px', borderRadius: 6, marginRight: 8, textTransform: 'uppercase' as const }}>
                                {log.tipo}
                              </span>
                            )}
                            <span style={{ fontSize: 13, color: '#374151' }}>{log.descripcion || 'Acción registrada'}</span>
                          </div>
                          <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{fmtFecha(log.created_at)}</span>
                        </div>
                        {log.user_id && <div style={{ fontSize: 11, color: '#D1D5DB', marginTop: 3 }}>uid: {log.user_id}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
