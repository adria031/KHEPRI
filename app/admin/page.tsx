'use client'
// SQL RLS policies to apply once in Supabase:
// CREATE POLICY "Admin read all negocios" ON negocios FOR SELECT USING (true);
// CREATE POLICY "Admin read all profiles" ON profiles FOR SELECT USING (true);
// CREATE POLICY "Admin read all reservas" ON reservas FOR SELECT USING (true);

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  AreaChart, Area,
  PieChart, Pie, Cell,
} from 'recharts'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'adria.gaitan.sola@gmail.com'
const PRECIOS: Record<string, number> = { starter: 9.99, basico: 29.99, pro: 59.99, plus: 99.99, agencia: 99.99, beta: 0 }
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

type TabActiva = 'overview' | 'negocios' | 'clientes' | 'invitar' | 'actividad'

type NegocioProfile = {
  email?: string | null
  plan?: string | null
  creditos_totales?: number | null
  creditos_usados?: number | null
  created_at?: string | null
}

type Negocio = {
  id: string
  nombre: string
  tipo: string | null
  ciudad: string | null
  created_at: string
  suspendido: boolean | null
  user_id: string
  visible: boolean | null
  profiles?: NegocioProfile | null
}

type Cliente = {
  id: string
  nombre?: string | null
  email?: string | null
  created_at: string
}

type LogItem = {
  id: string
  created_at: string
  tipo?: string | null
  descripcion?: string | null
  user_id?: string | null
}

type ChartBar  = { mes: string; negocios: number }
type ChartArea = { dia: string; reservas: number }
type ChartPie  = { name: string; value: number; color: string }

type DetalleData = {
  negocio: Negocio
  totalRes: number
  res30d: number
  ingresoEst: number
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function planBadge(plan: string | null | undefined) {
  const p = plan || 'starter'
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    starter: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Starter' },
    basico:  { bg: '#EFF6FF', color: '#1D4ED8', label: 'Básico' },
    pro:     { bg: '#F5F3FF', color: '#6D28D9', label: 'Pro' },
    plus:    { bg: '#F0FDF4', color: '#15803D', label: 'Plus' },
    agencia: { bg: '#F0FDF4', color: '#15803D', label: 'Plus' },
    beta:    { bg: '#FFFBEB', color: '#B45309', label: 'Beta' },
  }
  const c = cfg[p] || { bg: '#F3F4F6', color: '#6B7280', label: p }
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '8px', whiteSpace: 'nowrap' as const }}>
      {c.label}
    </span>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [cargando,    setCargando]    = useState(true)
  const [tabActiva,   setTabActiva]   = useState<TabActiva>('overview')

  // ── PIN guard ─────────────────────────────────────────────────────────────
  const [pin,   setPin]   = useState('')
  const [pinOk, setPinOk] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin_pin_ok') === 'true') setPinOk(true)
  }, [])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // KPIs
  const [totalNegocios,  setTotalNegocios]  = useState(0)
  const [totalClientes,  setTotalClientes]  = useState(0)
  const [totalReservas,  setTotalReservas]  = useState(0)
  const [mrr,            setMrr]            = useState(0)

  // Charts
  const [chartBar,  setChartBar]  = useState<ChartBar[]>([])
  const [chartArea, setChartArea] = useState<ChartArea[]>([])
  const [chartPie,  setChartPie]  = useState<ChartPie[]>([])
  const barRef  = useRef<HTMLDivElement | null>(null)
  const areaRef = useRef<HTMLDivElement | null>(null)
  const [barW,  setBarW]  = useState(0)
  const [areaW, setAreaW] = useState(0)

  // Negocios
  const [negocios,   setNegocios]   = useState<Negocio[]>([])
  const [busqNeg,    setBusqNeg]    = useState('')
  const [filtroPlan, setFiltroPlan] = useState('todos')

  // Plan modal
  const [planModal,     setPlanModal]     = useState<{ id: string; nombre: string; planActual: string } | null>(null)
  const [planNuevo,     setPlanNuevo]     = useState('')
  const [cambiandoPlan, setCambiandoPlan] = useState(false)

  // Detalle modal
  const [detalle,        setDetalle]        = useState<DetalleData | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  // Clientes
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqCli,  setBusqCli]  = useState('')

  // Invitar
  const [invitarEmail, setInvitarEmail] = useState('')
  const [invitando,    setInvitando]    = useState(false)
  const [inviteMsg,    setInviteMsg]    = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // Logs
  const [logs, setLogs] = useState<LogItem[]>([])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) {
        router.push('/dashboard')
        return
      }

      const hace30 = new Date()
      hace30.setDate(hace30.getDate() - 30)
      const hace30ISO = hace30.toISOString().split('T')[0]

      // Parallel fetches
      const [
        { count: cNegs },
        { count: cClis },
        { count: cRes },
        { data: negsData },
        { data: cliData },
        { data: res30Data },
        { data: logsData },
      ] = await Promise.all([
        supabase.from('negocios').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tipo', 'cliente'),
        supabase.from('reservas').select('*', { count: 'exact', head: true }),
        supabase.from('negocios')
          .select('id, nombre, tipo, ciudad, created_at, suspendido, user_id, visible, profiles(email, plan, creditos_totales, creditos_usados, created_at)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles')
          .select('id, nombre, email, created_at')
          .eq('tipo', 'cliente')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('reservas')
          .select('fecha')
          .gte('fecha', hace30ISO)
          .order('fecha'),
        supabase.from('logs_actividad')
          .select('id, created_at, tipo, descripcion, user_id')
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      setTotalNegocios(cNegs ?? 0)
      setTotalClientes(cClis ?? 0)
      setTotalReservas(cRes ?? 0)
      setClientes((cliData ?? []) as Cliente[])
      setLogs((logsData ?? []) as LogItem[])

      const negsArr = (negsData ?? []) as Negocio[]
      setNegocios(negsArr)

      // MRR
      const mrrCalc = negsArr.reduce((acc, n) => {
        const plan = (n.profiles as NegocioProfile | null)?.plan || 'starter'
        return acc + (PRECIOS[plan] ?? 0)
      }, 0)
      setMrr(mrrCalc)

      // BarChart: negocios por mes (últimos 6 meses)
      const ahora = new Date()
      const bars: ChartBar[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const prefix = `${yy}-${mm}`
        const count = negsArr.filter(n => n.created_at.startsWith(prefix)).length
        bars.push({ mes: MESES[d.getMonth()], negocios: count })
      }
      setChartBar(bars)

      // AreaChart: reservas por día (últimos 30 días)
      const days: ChartArea[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const iso = d.toISOString().split('T')[0]
        const count = (res30Data ?? []).filter((r: { fecha: string }) => r.fecha === iso).length
        days.push({ dia: fmtFechaCorta(iso), reservas: count })
      }
      setChartArea(days)

      // PieChart: distribución por plan
      const planCount: Record<string, number> = {}
      negsArr.forEach(n => {
        const p = (n.profiles as NegocioProfile | null)?.plan || 'starter'
        planCount[p] = (planCount[p] ?? 0) + 1
      })
      const PIE_CFG: Record<string, { label: string; color: string }> = {
        starter: { label: 'Starter', color: '#93C5FD' },
        basico:  { label: 'Básico',  color: '#60A5FA' },
        pro:     { label: 'Pro',     color: '#A78BFA' },
        plus:    { label: 'Plus',    color: '#34D399' },
        agencia: { label: 'Plus',    color: '#34D399' },
        beta:    { label: 'Beta',    color: '#FBBF24' },
      }
      const pie: ChartPie[] = Object.entries(planCount).map(([k, v]) => ({
        name: PIE_CFG[k]?.label ?? k,
        value: v,
        color: PIE_CFG[k]?.color ?? '#9CA3AF',
      }))
      setChartPie(pie)

      setCargando(false)
    })()
  }, [])

  // Chart widths
  useEffect(() => {
    if (barRef.current)  setBarW(barRef.current.offsetWidth)
    if (areaRef.current) setAreaW(areaRef.current.offsetWidth)
  }, [tabActiva, chartBar, chartArea])

  async function cambiarPlan(negId: string, plan: string) {
    setCambiandoPlan(true)
    const neg = negocios.find(n => n.id === negId)
    await supabase.from('negocios').update({ plan }).eq('id', negId)
    if (neg?.user_id) {
      const profileUpdate: Record<string, unknown> = { plan }
      if (plan === 'beta') profileUpdate.creditos_totales = 2000
      await supabase.from('profiles').update(profileUpdate).eq('id', neg.user_id)
    }
    setNegocios(prev => prev.map(n =>
      n.id === negId
        ? { ...n, profiles: { ...(n.profiles as NegocioProfile ?? {}), plan } }
        : n
    ))
    setCambiandoPlan(false)
    setPlanModal(null)
  }

  async function verDetalle(neg: Negocio) {
    setLoadingDetalle(true)
    setDetalle(null)
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    const hace30ISO = hace30.toISOString().split('T')[0]
    const [{ count: total }, { count: rec30 }] = await Promise.all([
      supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('negocio_id', neg.id),
      supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('negocio_id', neg.id).gte('fecha', hace30ISO),
    ])
    const plan = (neg.profiles as NegocioProfile | null)?.plan || 'starter'
    setDetalle({
      negocio: neg,
      totalRes: total ?? 0,
      res30d: rec30 ?? 0,
      ingresoEst: (PRECIOS[plan] ?? 0) * 12,
    })
    setLoadingDetalle(false)
  }

  async function invitarEmpresa() {
    if (!invitarEmail.trim()) return
    setInvitando(true)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invitarEmail.trim() }),
      })
      if (res.ok) {
        setInviteMsg({ tipo: 'ok', texto: `Invitación enviada a ${invitarEmail.trim()}` })
        setInvitarEmail('')
      } else {
        const d = await res.json()
        setInviteMsg({ tipo: 'error', texto: d.error || 'Error al enviar' })
      }
    } catch (e: unknown) {
      setInviteMsg({ tipo: 'error', texto: (e as Error).message })
    } finally {
      setInvitando(false)
    }
  }

  const negociosFiltrados = negocios.filter(n => {
    const pf = n.profiles as NegocioProfile | null
    const matchPlan = filtroPlan === 'todos' || (pf?.plan || 'starter') === filtroPlan
    const email = pf?.email || ''
    const matchBusq = !busqNeg ||
      n.nombre.toLowerCase().includes(busqNeg.toLowerCase()) ||
      (n.ciudad ?? '').toLowerCase().includes(busqNeg.toLowerCase()) ||
      email.toLowerCase().includes(busqNeg.toLowerCase())
    return matchPlan && matchBusq
  })

  const clientesFiltrados = clientes.filter(c =>
    !busqCli ||
    (c.nombre ?? '').toLowerCase().includes(busqCli.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(busqCli.toLowerCase())
  )

  const arr = mrr * 12

  const TABS: { id: TabActiva; icon: string; label: string }[] = [
    { id: 'overview',   icon: '📊', label: 'Resumen' },
    { id: 'negocios',   icon: '🏢', label: `Negocios (${totalNegocios})` },
    { id: 'clientes',   icon: '👥', label: `Clientes (${totalClientes})` },
    { id: 'invitar',    icon: '📩', label: 'Invitar' },
    { id: 'actividad',  icon: '🕐', label: 'Actividad' },
  ]

  function verificarPin() {
    if (pin === process.env.NEXT_PUBLIC_ADMIN_PIN) {
      sessionStorage.setItem('admin_pin_ok', 'true')
      setPinOk(true)
    } else {
      alert('PIN incorrecto')
      setPin('')
    }
  }

  if (!pinOk) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FF', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 320, width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#111827' }}>Panel Admin</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Introduce el PIN de acceso</p>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verificarPin()}
            placeholder="••••"
            maxLength={6}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 20, textAlign: 'center', letterSpacing: 8, marginBottom: 16, outline: 'none', fontFamily: 'inherit' }}
            autoFocus
          />
          <button
            onClick={verificarPin}
            style={{ width: '100%', padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Acceder →
          </button>
        </div>
      </div>
    </>
  )

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', fontFamily: "'DM Sans', sans-serif", flexDirection: 'column', gap: '12px' }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
            <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
            <circle cx="11" cy="11" r="2" fill="white"/>
          </svg>
        </div>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Cargando panel admin…</p>
      </div>
    )
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',sans-serif; background:#F7F9FC; color:#111827; }
        .layout { display:flex; min-height:100vh; }

        /* ── Sidebar ── */
        .sidebar { width:230px; background:white; border-right:1px solid rgba(0,0,0,0.07); display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:50; transition:transform 0.25s; }
        .sb-logo { padding:18px 16px; border-bottom:1px solid rgba(0,0,0,0.06); display:flex; align-items:center; gap:10px; }
        .sb-badge { background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; font-size:9px; font-weight:700; padding:2px 7px; border-radius:100px; letter-spacing:0.5px; text-transform:uppercase; }
        .sb-nav { padding:10px 8px; flex:1; overflow-y:auto; }
        .sb-item { display:flex; align-items:center; gap:9px; padding:9px 12px; border-radius:11px; font-size:14px; font-weight:500; color:#6B7280; cursor:pointer; margin-bottom:2px; transition:all 0.15s; background:none; border:none; width:100%; text-align:left; font-family:inherit; }
        .sb-item:hover { background:#F3F4F6; color:#111827; }
        .sb-item.active { background:rgba(99,102,241,0.08); color:#4F46E5; font-weight:600; }
        .sb-icon { font-size:15px; width:19px; text-align:center; flex-shrink:0; }
        .sb-footer { padding:14px 8px; border-top:1px solid rgba(0,0,0,0.06); }
        .sb-user { display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:11px; background:#F9FAFB; margin-bottom:8px; }
        .sb-av { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#6366F1,#8B5CF6); display:flex; align-items:center; justifyContent:center; font-size:12px; font-weight:700; color:white; flex-shrink:0; }
        .sb-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:40; }

        /* ── Main ── */
        .main { margin-left:230px; flex:1; display:flex; flex-direction:column; min-height:100vh; }
        .topbar { background:white; border-bottom:1px solid rgba(0,0,0,0.06); padding:14px 28px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
        .hamburger { display:none; background:none; border:none; cursor:pointer; padding:6px; color:#6B7280; font-size:20px; }
        .content { padding:28px; flex:1; max-width:1100px; }

        /* ── KPI grid ── */
        .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
        .kpi-card { background:white; border-radius:18px; border:1px solid rgba(0,0,0,0.06); padding:20px; box-shadow:0 1px 8px rgba(0,0,0,0.04); }
        .kpi-icon { font-size:22px; margin-bottom:10px; }
        .kpi-label { font-size:12px; color:#6B7280; font-weight:500; margin-bottom:5px; }
        .kpi-val { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; color:#111827; letter-spacing:-1px; line-height:1; margin-bottom:4px; }
        .kpi-sub { font-size:12px; color:#9CA3AF; }

        /* ── Charts ── */
        .charts-grid { display:grid; grid-template-columns:1fr 1fr 220px; gap:16px; margin-bottom:28px; }
        .chart-card { background:white; border-radius:18px; border:1px solid rgba(0,0,0,0.06); padding:20px; box-shadow:0 1px 8px rgba(0,0,0,0.04); }
        .chart-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:#111827; margin-bottom:16px; }

        /* ── Section headers ── */
        .sec-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
        .sec-title { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:#111827; }
        .sec-count { font-size:13px; color:#6B7280; margin-top:2px; }
        .filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .s-input { padding:9px 13px; background:white; border:1.5px solid #E5E7EB; border-radius:10px; font-family:inherit; font-size:13px; color:#111827; outline:none; width:210px; }
        .s-input::placeholder { color:#9CA3AF; }
        .s-input:focus { border-color:#6366F1; }
        .f-btn { padding:7px 12px; border-radius:9px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; }
        .f-btn.act { background:rgba(99,102,241,0.08); border-color:rgba(99,102,241,0.3); color:#4F46E5; }

        /* ── Table ── */
        .tbl-wrap { background:white; border-radius:18px; border:1px solid rgba(0,0,0,0.06); overflow:hidden; margin-bottom:28px; box-shadow:0 1px 8px rgba(0,0,0,0.04); }
        table { width:100%; border-collapse:collapse; }
        thead th { padding:11px 16px; font-size:11px; font-weight:700; color:#9CA3AF; text-align:left; text-transform:uppercase; letter-spacing:0.5px; background:#FAFAFA; border-bottom:1px solid rgba(0,0,0,0.06); }
        tbody td { padding:12px 16px; font-size:13px; color:#374151; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle; }
        tbody tr:last-child td { border-bottom:none; }
        tbody tr:hover td { background:#FAFAFA; }
        .cell-name { font-weight:600; color:#111827; }
        .cell-sub { font-size:11px; color:#9CA3AF; margin-top:2px; }

        /* ── Action buttons ── */
        .btn-xs { padding:5px 10px; border-radius:7px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:11px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; }
        .btn-xs:hover { border-color:#6366F1; color:#4F46E5; background:rgba(99,102,241,0.04); }
        .btn-xs.green:hover { border-color:#16A34A; color:#16A34A; background:rgba(22,163,74,0.04); }

        /* ── Modals ── */
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(2px); }
        .modal { background:white; border-radius:22px; padding:28px; width:100%; max-width:420px; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
        .modal h3 { font-family:'Syne',sans-serif; font-size:19px; font-weight:800; color:#111827; margin-bottom:5px; }
        .modal-sub { font-size:13px; color:#6B7280; margin-bottom:20px; }
        .plan-opts { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
        .plan-opt { display:flex; align-items:center; gap:12px; padding:13px 16px; border:1.5px solid #E5E7EB; border-radius:12px; cursor:pointer; transition:all 0.15s; background:white; }
        .plan-opt.sel { border-color:#6366F1; background:rgba(99,102,241,0.04); }
        .plan-opt:hover { border-color:#A5B4FC; }
        .plan-opt-name { font-size:14px; font-weight:700; color:#111827; }
        .plan-opt-price { font-size:12px; color:#9CA3AF; margin-top:1px; }
        .modal-btns { display:flex; gap:8px; }
        .btn-cancel { flex:1; padding:12px; background:#F3F4F6; border:none; border-radius:11px; font-family:inherit; font-size:14px; font-weight:600; color:#374151; cursor:pointer; }
        .btn-confirm { flex:1; padding:12px; background:linear-gradient(135deg,#4F46E5,#7C3AED); border:none; border-radius:11px; font-family:inherit; font-size:14px; font-weight:700; color:white; cursor:pointer; transition:opacity 0.15s; }
        .btn-confirm:disabled { opacity:0.45; cursor:not-allowed; }

        /* ── Invite ── */
        .invite-card { background:white; border-radius:18px; border:1px solid rgba(0,0,0,0.06); padding:28px; margin-bottom:20px; box-shadow:0 1px 8px rgba(0,0,0,0.04); max-width:560px; }
        .inv-input { flex:1; padding:11px 14px; border:1.5px solid #E5E7EB; border-radius:11px; font-family:inherit; font-size:14px; color:#111827; outline:none; }
        .inv-input:focus { border-color:#6366F1; }
        .inv-btn { padding:11px 22px; border-radius:11px; border:none; background:linear-gradient(135deg,#4F46E5,#7C3AED); color:white; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit; white-space:nowrap; transition:opacity 0.15s; }
        .inv-btn:disabled { opacity:0.45; cursor:not-allowed; }

        /* ── Logs ── */
        .log-item { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(0,0,0,0.05); }
        .log-item:last-child { border-bottom:none; }
        .log-dot { width:8px; height:8px; border-radius:50%; background:#6366F1; flex-shrink:0; margin-top:5px; }

        /* ── Responsive ── */
        @media(max-width:1024px) {
          .kpi-grid { grid-template-columns:repeat(2,1fr); }
          .charts-grid { grid-template-columns:1fr; }
        }
        @media(max-width:768px) {
          .sidebar { transform:translateX(-100%); }
          .sidebar.open { transform:translateX(0); }
          .sb-overlay.open { display:block; }
          .hamburger { display:block; }
          .main { margin-left:0; }
          .topbar { padding:12px 16px; }
          .content { padding:16px; }
          .kpi-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .charts-grid { grid-template-columns:1fr; }
          table { font-size:12px; }
          thead th, tbody td { padding:9px 12px; }
        }
      `}</style>

      {/* ── Plan modal ── */}
      {planModal && (
        <div className="overlay" onClick={() => setPlanModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Cambiar plan</h3>
            <p className="modal-sub">{planModal.nombre}</p>
            <div className="plan-opts">
              {[
                { id: 'basico',  label: 'Básico',  precio: '29,99 €/mes' },
                { id: 'pro',     label: 'Pro',     precio: '59,99 €/mes' },
                { id: 'plus',    label: 'Plus',    precio: '99,99 €/mes' },
                { id: 'beta',    label: 'Beta',    precio: 'Gratis · 2.000 créditos IA' },
              ].map(p => (
                <div
                  key={p.id}
                  className={`plan-opt ${planNuevo === p.id ? 'sel' : ''}`}
                  onClick={() => setPlanNuevo(p.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div className="plan-opt-name">{p.label}</div>
                    <div className="plan-opt-price">{p.precio}</div>
                  </div>
                  {planModal.planActual === p.id && (
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>Actual</span>
                  )}
                  {planNuevo === p.id && planModal.planActual !== p.id && (
                    <span style={{ color: '#4F46E5', fontSize: '16px' }}>✓</span>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setPlanModal(null)}>Cancelar</button>
              <button
                className="btn-confirm"
                disabled={!planNuevo || planNuevo === planModal.planActual || cambiandoPlan}
                onClick={() => cambiarPlan(planModal.id, planNuevo)}
              >
                {cambiandoPlan ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detalle modal ── */}
      {(detalle || loadingDetalle) && (
        <div className="overlay" onClick={() => { setDetalle(null) }}>
          <div className="modal" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            {loadingDetalle ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#6B7280' }}>Cargando datos…</div>
            ) : detalle ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ marginBottom: '2px' }}>{detalle.negocio.nombre}</h3>
                    <p className="modal-sub" style={{ margin: 0 }}>{detalle.negocio.ciudad || '—'} · {fmtFecha(detalle.negocio.created_at)}</p>
                  </div>
                  {planBadge((detalle.negocio.profiles as NegocioProfile | null)?.plan)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Total reservas',     value: detalle.totalRes.toLocaleString() },
                    { label: 'Reservas (30 días)', value: detalle.res30d.toLocaleString() },
                    { label: 'Ingreso ARR est.',   value: `${detalle.ingresoEst.toFixed(2)} €` },
                    { label: 'Email',              value: (detalle.negocio.profiles as NegocioProfile | null)?.email || '—' },
                    { label: 'Créditos usados',    value: `${(detalle.negocio.profiles as NegocioProfile | null)?.creditos_usados ?? 0} / ${(detalle.negocio.profiles as NegocioProfile | null)?.creditos_totales ?? 0}` },
                    { label: 'Suspendido',         value: detalle.negocio.suspendido ? 'Sí' : 'No' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: '#F9FAFB', borderRadius: '11px', padding: '12px 14px', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>{item.label}</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', wordBreak: 'break-all' as const }}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <button className="btn-cancel" style={{ width: '100%' }} onClick={() => setDetalle(null)}>Cerrar</button>
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="layout">
        <div className={`sb-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sb-logo">
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '15px', color: '#111827', letterSpacing: '-0.3px' }}>Khepria</div>
              <div className="sb-badge">Admin</div>
            </div>
          </div>

          <nav className="sb-nav">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`sb-item ${tabActiva === t.id ? 'active' : ''}`}
                onClick={() => { setTabActiva(t.id); setSidebarOpen(false) }}
              >
                <span className="sb-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
            <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '10px 4px' }}/>
            <button className="sb-item" onClick={() => router.push('/dashboard')}>
              <span className="sb-icon">↩</span>
              Dashboard
            </button>
          </nav>

          <div className="sb-footer">
            <div className="sb-user">
              <div className="sb-av" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Adrián</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Super Admin</div>
              </div>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
              style={{ width: '100%', padding: '9px 12px', background: 'none', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="main">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  {TABS.find(t => t.id === tabActiva)?.icon} {TABS.find(t => t.id === tabActiva)?.label}
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '1px' }}>Panel de administrador · Khepria</div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#6B7280', background: '#F3F4F6', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
              🟢 {new Date().toLocaleDateString('es-ES')}
            </span>
          </header>

          <div className="content">

            {/* ══ OVERVIEW ══ */}
            {tabActiva === 'overview' && (
              <>
                {/* KPIs */}
                <div className="kpi-grid">
                  {[
                    { icon: '🏢', label: 'Total negocios',  value: totalNegocios.toLocaleString(), sub: `${negocios.filter(n=>n.suspendido).length} suspendidos`, bg: '#EFF6FF' },
                    { icon: '👥', label: 'Total clientes',  value: totalClientes.toLocaleString(), sub: 'Usuarios registrados', bg: '#F0FDF4' },
                    { icon: '📅', label: 'Total reservas',  value: totalReservas.toLocaleString(), sub: 'Historial completo', bg: '#FAF5FF' },
                    { icon: '💰', label: 'MRR / ARR',       value: `${mrr.toFixed(0)} €`, sub: `ARR est. ${arr.toFixed(0)} €/año`, bg: '#FFFBEB' },
                  ].map((k, i) => (
                    <div key={i} className="kpi-card" style={{ background: k.bg }}>
                      <div className="kpi-icon">{k.icon}</div>
                      <div className="kpi-label">{k.label}</div>
                      <div className="kpi-val">{k.value}</div>
                      <div className="kpi-sub">{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Charts */}
                <div className="charts-grid">
                  {/* BarChart: negocios por mes */}
                  <div className="chart-card">
                    <div className="chart-title">Nuevos negocios (6 meses)</div>
                    <div ref={barRef} style={{ width: '100%', height: '180px' }}>
                      {barW > 0 && (
                        <BarChart width={barW} height={180} data={chartBar} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false}/>
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                          <Tooltip
                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '13px', fontFamily: 'DM Sans' }}
                            formatter={(v) => [`${v}`, 'Negocios']}
                          />
                          <Bar dataKey="negocios" fill="#6366F1" radius={[6,6,0,0]}/>
                        </BarChart>
                      )}
                    </div>
                  </div>

                  {/* AreaChart: reservas por día */}
                  <div className="chart-card">
                    <div className="chart-title">Reservas últimos 30 días</div>
                    <div ref={areaRef} style={{ width: '100%', height: '180px' }}>
                      {areaW > 0 && (
                        <AreaChart width={areaW} height={180} data={chartArea} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={4}/>
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                          <Tooltip
                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '13px', fontFamily: 'DM Sans' }}
                            formatter={(v) => [`${v}`, 'Reservas']}
                          />
                          <Area type="monotone" dataKey="reservas" stroke="#8B5CF6" strokeWidth={2} fill="url(#areaGrad)"/>
                        </AreaChart>
                      )}
                    </div>
                  </div>

                  {/* PieChart: por plan */}
                  <div className="chart-card">
                    <div className="chart-title">Por plan</div>
                    {chartPie.length > 0 && (
                      <PieChart width={180} height={180}>
                        <Pie data={chartPie} cx={86} cy={80} innerRadius={48} outerRadius={76} paddingAngle={3} dataKey="value">
                          {chartPie.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color}/>
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px', fontFamily: 'DM Sans' }}
                          formatter={(v, name) => [`${v}`, name]}
                        />
                      </PieChart>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                      {chartPie.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px' }}>
                          <div style={{ width: '9px', height: '9px', borderRadius: '3px', background: p.color, flexShrink: 0 }}/>
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
                    <div className="sec-count">{negociosFiltrados.length} de {totalNegocios} negocios</div>
                  </div>
                  <div className="filters">
                    <input
                      className="s-input"
                      placeholder="🔍 Nombre, email o ciudad…"
                      value={busqNeg}
                      onChange={e => setBusqNeg(e.target.value)}
                    />
                    {(['todos','basico','pro','plus','beta'] as const).map(p => (
                      <button
                        key={p}
                        className={`f-btn ${filtroPlan === p ? 'act' : ''}`}
                        onClick={() => setFiltroPlan(p)}
                      >
                        {p === 'todos' ? 'Todos' : p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Negocio</th>
                        <th>Ciudad</th>
                        <th>Email dueño</th>
                        <th>Plan</th>
                        <th>Créditos</th>
                        <th>Registro</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negociosFiltrados.map(n => {
                        const pf = n.profiles as NegocioProfile | null
                        return (
                          <tr key={n.id}>
                            <td>
                              <div className="cell-name">{n.nombre}</div>
                              <div className="cell-sub">{n.tipo || '—'}</div>
                            </td>
                            <td style={{ color: '#6B7280' }}>{n.ciudad || '—'}</td>
                            <td style={{ color: '#6B7280', fontSize: '12px' }}>{pf?.email || '—'}</td>
                            <td>{planBadge(pf?.plan)}</td>
                            <td>
                              {pf?.creditos_usados != null || pf?.creditos_totales != null ? (
                                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                  {pf.creditos_usados ?? 0} / {pf.creditos_totales ?? 0}
                                </span>
                              ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                            </td>
                            <td style={{ fontSize: '12px', color: '#9CA3AF' }}>{fmtFecha(n.created_at)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  className="btn-xs"
                                  onClick={() => { setPlanModal({ id: n.id, nombre: n.nombre, planActual: pf?.plan || 'starter' }); setPlanNuevo(pf?.plan || '') }}
                                >
                                  📋 Plan
                                </button>
                                <button
                                  className="btn-xs green"
                                  onClick={() => verDetalle(n)}
                                >
                                  🔍 Detalle
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {negociosFiltrados.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>Sin resultados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ CLIENTES ══ */}
            {tabActiva === 'clientes' && (
              <>
                <div className="sec-header">
                  <div>
                    <div className="sec-title">Clientes registrados</div>
                    <div className="sec-count">{clientesFiltrados.length} de {totalClientes} clientes</div>
                  </div>
                  <div className="filters">
                    <input
                      className="s-input"
                      placeholder="🔍 Nombre o email…"
                      value={busqCli}
                      onChange={e => setBusqCli(e.target.value)}
                    />
                  </div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Email</th>
                        <th>Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#1E3A5F', flexShrink: 0 }}>
                                {(c.nombre ?? c.email ?? '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="cell-name">{c.nombre || '—'}</div>
                            </div>
                          </td>
                          <td style={{ color: '#6B7280', fontSize: '13px' }}>{c.email || '—'}</td>
                          <td style={{ fontSize: '12px', color: '#9CA3AF' }}>{fmtFecha(c.created_at)}</td>
                        </tr>
                      ))}
                      {clientesFiltrados.length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>Sin clientes registrados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ INVITAR ══ */}
            {tabActiva === 'invitar' && (
              <div style={{ maxWidth: '560px' }}>
                <div className="sec-title" style={{ marginBottom: '8px' }}>Invitar empresa</div>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px', lineHeight: '1.7' }}>
                  Envía una invitación por email. La empresa recibirá acceso gratuito de por vida con el plan Beta (2.000 créditos IA incluidos).
                </p>

                <div className="invite-card">
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Email de la empresa
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: inviteMsg ? '14px' : '0' }}>
                    <input
                      className="inv-input"
                      type="email"
                      placeholder="empresa@ejemplo.com"
                      value={invitarEmail}
                      onChange={e => { setInvitarEmail(e.target.value); setInviteMsg(null) }}
                      onKeyDown={e => e.key === 'Enter' && invitarEmpresa()}
                    />
                    <button
                      className="inv-btn"
                      onClick={invitarEmpresa}
                      disabled={invitando || !invitarEmail.trim()}
                    >
                      {invitando ? 'Enviando…' : '📩 Invitar'}
                    </button>
                  </div>
                  {inviteMsg && (
                    <div style={{
                      padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                      background: inviteMsg.tipo === 'ok' ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${inviteMsg.tipo === 'ok' ? '#BBF7D0' : '#FECACA'}`,
                      color: inviteMsg.tipo === 'ok' ? '#15803D' : '#DC2626',
                    }}>
                      {inviteMsg.tipo === 'ok' ? '✓ ' : '⚠ '}{inviteMsg.texto}
                    </div>
                  )}
                </div>

                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: '12px' }}>
                    Plan Beta — incluye
                  </div>
                  {[
                    'Acceso gratuito de por vida',
                    '2.000 créditos de IA incluidos',
                    'Agenda, clientes y reservas ilimitadas',
                    'Soporte prioritario directo',
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span>
                      {item}
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '14px', lineHeight: '1.6' }}>
                  El plan Beta también se puede asignar manualmente desde la tabla de Negocios → botón <strong style={{ color: '#6B7280' }}>📋 Plan</strong>.
                </p>
              </div>
            )}

            {/* ══ ACTIVIDAD ══ */}
            {tabActiva === 'actividad' && (
              <div style={{ maxWidth: '680px' }}>
                <div className="sec-title" style={{ marginBottom: '8px' }}>Logs de actividad</div>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>Últimas 20 acciones registradas en la plataforma.</p>

                <div style={{ background: 'white', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.06)', padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                  {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>🕐</div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Sin actividad registrada</p>
                      <p style={{ fontSize: '13px', marginTop: '4px' }}>La tabla logs_actividad está vacía o no existe</p>
                    </div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="log-item">
                        <div className="log-dot"/>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                            <div>
                              {log.tipo && (
                                <span style={{ fontSize: '10px', fontWeight: 700, background: '#F3F4F6', color: '#6B7280', padding: '2px 7px', borderRadius: '6px', marginRight: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>
                                  {log.tipo}
                                </span>
                              )}
                              <span style={{ fontSize: '13px', color: '#374151' }}>{log.descripcion || 'Acción registrada'}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#9CA3AF', flexShrink: 0 }}>{fmtFecha(log.created_at)}</span>
                          </div>
                          {log.user_id && (
                            <div style={{ fontSize: '11px', color: '#D1D5DB', marginTop: '3px' }}>uid: {log.user_id}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
