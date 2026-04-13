'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { NegocioSelector } from '../NegocioSelector'

function KhepriLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
    </div>
  )
}

const navItems = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { icon: '🏪', label: 'Mi negocio', href: '/dashboard/mi-negocio' },
  { icon: '📅', label: 'Reservas', href: '/dashboard/reservas' },
  { icon: '🔧', label: 'Servicios', href: '/dashboard/servicios' },
  { icon: '⏰', label: 'Horarios', href: '/dashboard/horarios' },
  { icon: '🛍️', label: 'Productos', href: '/dashboard/productos' },
  { icon: '👥', label: 'Equipo', href: '/dashboard/equipo' },
  { icon: '🤖', label: 'Chatbot IA', href: '/dashboard/chatbot' },
  { icon: '🧾', label: 'Facturación', href: '/dashboard/facturacion' },
  { icon: '📱', label: 'Marketing', href: '/dashboard/marketing' },
  { icon: '⭐', label: 'Reseñas', href: '/dashboard/resenas' },
  { icon: '💰', label: 'Caja', href: '/dashboard/caja' },
  { icon: '💸', label: 'Nóminas', href: '/dashboard/nominas' },
]

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBwszdn-eYK3UQN2SBmJNzhdPkgOgkilns'

const CONTRATOS = [
  { id: 'indefinido',  label: 'Indefinido' },
  { id: 'temporal',    label: 'Temporal' },
  { id: 'practicas',   label: 'Prácticas' },
  { id: 'autonomo',    label: 'Autónomo' },
  { id: 'parcial',     label: 'Tiempo parcial' },
]

// Tasas SS España 2024 (simplificadas)
const SS_EMP_DEFAULT  = 29.9  // contingencias + desempleo + FOGASA + FP
const SS_TRAB_DEFAULT = 6.35  // contingencias + desempleo + FP

type Trabajador = { id: string; nombre: string; especialidad: string; foto_url: string | null }
type Nomina = {
  id: string; trabajador_id: string; mes: string
  salario_bruto: number; irpf: number; ss_trabajador: number; ss_empresa: number; salario_neto: number
  tipo_contrato?: string; horas_semana?: number
}

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function labelMes(iso: string) {
  return new Date(iso + 'T12:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

export default function Nominas() {
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId, setNegocioId]       = useState<string | null>(null)
  const [cargando, setCargando]         = useState(true)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [nominas, setNominas]           = useState<Nomina[]>([])
  const [mes, setMes]                   = useState(mesActual())

  // Form
  const [modal, setModal]               = useState(false)
  const [editando, setEditando]         = useState<Nomina | null>(null)
  const [form, setForm] = useState({
    trabajador_id: '',
    salario_bruto: '',
    tipo_contrato: 'indefinido',
    horas_semana: '40',
    irpf: '15',
    ss_trabajador: String(SS_TRAB_DEFAULT),
    ss_empresa: String(SS_EMP_DEFAULT),
  })
  const [guardando, setGuardando]       = useState(false)
  const [apiError, setApiError]         = useState('')

  // IA
  const [iaLoading, setIaLoading]       = useState(false)
  const [iaResult, setIaResult]         = useState('')
  const [iaError, setIaError]           = useState('')
  const [iaTarget, setIaTarget]         = useState<string | null>(null) // nomina.id

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo, todos } = await getNegocioActivo(user.id, session.access_token)
      if (!activo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todos)
      setNegocioId(activo.id)
      const { data: tr } = await db.from('trabajadores').select('id,nombre,especialidad,foto_url').eq('negocio_id', activo.id).eq('activo', true).order('nombre')
      setTrabajadores(tr || [])
      setCargando(false)
    })()
  }, [])

  const cargarNominas = useCallback(async () => {
    if (!negocioId) return
    const desde = mes
    const hasta = new Date(new Date(mes).getFullYear(), new Date(mes).getMonth() + 1, 0).toISOString().slice(0, 10)
    const { data } = await supabase
      .from('nominas')
      .select('*')
      .eq('negocio_id', negocioId)
      .gte('mes', desde)
      .lte('mes', hasta)
      .order('mes')
    setNominas((data || []) as Nomina[])
  }, [negocioId, mes])

  useEffect(() => { cargarNominas() }, [cargarNominas])

  // Cálculos automáticos
  const bruto       = parseFloat(form.salario_bruto) || 0
  const irpfPct     = parseFloat(form.irpf) || 0
  const ssTrabPct   = parseFloat(form.ss_trabajador) || 0
  const ssEmpPct    = parseFloat(form.ss_empresa) || 0
  const dedIRPF     = +(bruto * irpfPct / 100).toFixed(2)
  const dedSSTrab   = +(bruto * ssTrabPct / 100).toFixed(2)
  const neto        = +(bruto - dedIRPF - dedSSTrab).toFixed(2)
  const cuotaEmp    = +(bruto * ssEmpPct / 100).toFixed(2)
  const costeTotal  = +(bruto + cuotaEmp).toFixed(2)

  function abrirModal(n?: Nomina) {
    if (n) {
      setEditando(n)
      setForm({
        trabajador_id: n.trabajador_id,
        salario_bruto: String(n.salario_bruto),
        tipo_contrato: (n as any).tipo_contrato || 'indefinido',
        horas_semana: String((n as any).horas_semana || 40),
        irpf: String(n.irpf),
        ss_trabajador: String(n.ss_trabajador),
        ss_empresa: String(n.ss_empresa),
      })
    } else {
      setEditando(null)
      setForm({ trabajador_id: trabajadores[0]?.id || '', salario_bruto: '', tipo_contrato: 'indefinido', horas_semana: '40', irpf: '15', ss_trabajador: String(SS_TRAB_DEFAULT), ss_empresa: String(SS_EMP_DEFAULT) })
    }
    setApiError('')
    setModal(true)
  }

  async function guardar() {
    if (!form.trabajador_id || !form.salario_bruto) { setApiError('Selecciona trabajador e introduce el salario bruto.'); return }
    if (bruto <= 0) { setApiError('El salario bruto debe ser mayor que 0.'); return }
    setGuardando(true); setApiError('')

    const datos = {
      negocio_id: negocioId,
      trabajador_id: form.trabajador_id,
      mes,
      salario_bruto: bruto,
      irpf: irpfPct,
      ss_trabajador: ssTrabPct,
      ss_empresa: ssEmpPct,
      salario_neto: neto,
      tipo_contrato: form.tipo_contrato,
      horas_semana: parseInt(form.horas_semana),
    }

    if (editando) {
      const { error } = await supabase.from('nominas').update(datos).eq('id', editando.id)
      if (error) { setApiError(error.message); setGuardando(false); return }
      setNominas(prev => prev.map(n => n.id === editando.id ? { ...n, ...datos } : n))
    } else {
      const { data, error } = await supabase.from('nominas').insert(datos).select().single()
      if (error) { setApiError(error.message); setGuardando(false); return }
      if (data) setNominas(prev => [...prev, data as Nomina])
    }
    setModal(false); setGuardando(false)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta nómina?')) return
    const { error } = await supabase.from('nominas').delete().eq('id', id)
    if (!error) setNominas(prev => prev.filter(n => n.id !== id))
  }

  async function analizarConIA(n: Nomina) {
    setIaTarget(n.id); setIaLoading(true); setIaResult(''); setIaError('')
    const trab = trabajadores.find(t => t.id === n.trabajador_id)
    const prompt = `Eres un asesor laboral español experto en nóminas y costes salariales. Analiza esta nómina y responde en español, de forma clara y práctica, máximo 300 palabras:

Trabajador: ${trab?.nombre || 'Empleado'} (${trab?.especialidad || ''})
Mes: ${labelMes(n.mes)}
Tipo contrato: ${(n as any).tipo_contrato || 'indefinido'}
Horas/semana: ${(n as any).horas_semana || 40}h
Salario bruto: €${n.salario_bruto.toFixed(2)}
IRPF aplicado: ${n.irpf}% (€${(n.salario_bruto * n.irpf / 100).toFixed(2)})
SS trabajador: ${n.ss_trabajador}% (€${(n.salario_bruto * n.ss_trabajador / 100).toFixed(2)})
Salario neto: €${n.salario_neto.toFixed(2)}
Cuota SS empresa: ${n.ss_empresa}% (€${(n.salario_bruto * n.ss_empresa / 100).toFixed(2)})
Coste total empresa: €${(n.salario_bruto * (1 + n.ss_empresa / 100)).toFixed(2)}

Por favor proporciona:
1. Resumen del coste real empresa vs neto que recibe el trabajador (ratio)
2. Si el IRPF es adecuado para este salario (tramos 2024)
3. Una sugerencia concreta para optimizar el coste laboral
4. Comparativa breve: ¿saldría más económico como autónomo?`

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      })
      const json = await res.json()
      const texto = json.candidates?.[0]?.content?.parts?.[0]?.text
      if (!texto) throw new Error('Respuesta vacía de la IA')
      setIaResult(texto)
    } catch (e: any) {
      setIaError(e.message || 'Error al conectar con la IA')
    }
    setIaLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

  // Totales del mes
  const totalBruto  = nominas.reduce((s, n) => s + n.salario_bruto, 0)
  const totalNeto   = nominas.reduce((s, n) => s + n.salario_neto, 0)
  const totalCoste  = nominas.reduce((s, n) => s + n.salario_bruto * (1 + n.ss_empresa / 100), 0)

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #F7F9FC; --white: #FFFFFF; --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2); --lila: #D4C5F9; --green: #B8EDD4; --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2); --yellow: #FDE9A2; --red: rgba(254,226,226,0.5); --red-dark: #DC2626; --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08); }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: var(--white); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform 0.3s ease; }
        .sidebar-logo { padding: 20px 18px; border-bottom: 1px solid var(--border); }
        .sidebar-nav { padding: 12px 10px; flex: 1; overflow-y: auto; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--text2); text-decoration: none; margin-bottom: 2px; transition: all 0.2s; }
        .nav-item:hover { background: var(--bg); color: var(--text); }
        .nav-item.active { background: var(--blue-soft); color: var(--blue-dark); font-weight: 600; }
        .nav-item-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .sidebar-footer { padding: 16px 10px; border-top: 1px solid var(--border); }
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; gap: 12px; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .page-sub { font-size: 14px; color: var(--muted); margin-top: 2px; }

        /* Mes selector */
        .mes-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .mes-input { padding: 9px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; }
        .mes-input:focus { border-color: var(--blue-dark); }
        .btn-nuevo { background: var(--text); color: white; border: none; padding: 10px 18px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }

        /* Resumen */
        .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .res-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 16px 20px; }
        .res-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .res-val { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
        .res-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }

        /* Tarjetas nómina */
        .nominas-grid { display: grid; gap: 14px; }
        .nomina-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .nomina-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; }
        .nomina-trab { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; background: var(--blue-soft); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; overflow: hidden; }
        .trab-name { font-size: 15px; font-weight: 700; color: var(--text); }
        .trab-rol { font-size: 12px; color: var(--muted); }
        .contrato-badge { padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; background: var(--blue-soft); color: var(--blue-dark); }
        .nomina-actions { display: flex; gap: 6px; }
        .btn-icon { background: var(--bg); border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
        .btn-icon:hover { background: rgba(0,0,0,0.08); }

        /* Desglose */
        .desglose { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .desglose-col { background: var(--bg); border-radius: 12px; padding: 12px 14px; }
        .desglose-title { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .desglose-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .desglose-label { color: var(--text2); }
        .desglose-val { font-weight: 600; color: var(--text); }
        .desglose-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; padding-top: 8px; margin-top: 6px; border-top: 1px solid var(--border); }
        .neto-val { color: var(--green-dark); }
        .coste-val { color: var(--red-dark); }

        /* IA */
        .btn-ia { margin-top: 12px; width: 100%; padding: 10px; background: linear-gradient(135deg, #D4C5F9, #B8D8F8); color: #3730A3; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-ia:disabled { opacity: 0.6; cursor: not-allowed; }
        .ia-result { margin-top: 12px; background: linear-gradient(135deg, rgba(212,197,249,0.15), rgba(184,216,248,0.15)); border: 1px solid rgba(212,197,249,0.4); border-radius: 12px; padding: 14px; font-size: 13px; line-height: 1.7; color: var(--text); white-space: pre-wrap; }
        .ia-error { margin-top: 10px; background: var(--red); color: var(--red-dark); padding: 10px; border-radius: 8px; font-size: 13px; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
        .modal { background: white; border-radius: 20px; padding: 28px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 20px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .field input, .field select { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; -webkit-appearance: none; }
        .field input:focus, .field select:focus { border-color: var(--blue-dark); }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .calc-box { background: var(--bg); border-radius: 12px; padding: 14px; margin: 14px 0; }
        .calc-title { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .calc-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
        .calc-label { color: var(--text2); }
        .calc-val { font-weight: 600; }
        .calc-sep { border: none; border-top: 1px solid var(--border); margin: 6px 0; }
        .calc-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; }
        .modal-btns { display: flex; gap: 10px; margin-top: 20px; }
        .btn-primary { flex: 1; padding: 12px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-secondary { flex: 1; padding: 12px; background: transparent; color: var(--text2); border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
        .error-msg { background: var(--red); color: var(--red-dark); padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-top: 10px; }
        .empty { text-align: center; padding: 60px 20px; background: var(--white); border: 1px solid var(--border); border-radius: 16px; color: var(--muted); font-size: 14px; }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .resumen { grid-template-columns: 1fr; gap: 10px; }
          .desglose { grid-template-columns: 1fr; }
          .grid2 { grid-template-columns: 1fr; }
          .grid3 { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/nominas' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-item-icon">{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout}><span>🚪</span> Cerrar sesión</button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Nóminas</span>
            </div>
            <NegocioSelector negocios={todosNegocios} activoId={negocioId ?? ''} />
          </header>

          <main className="content">
            <div className="page-header">
              <div>
                <div className="page-title">Gestión de nóminas</div>
                <div className="page-sub">Coste real por trabajador con análisis IA</div>
              </div>
              <button className="btn-nuevo" onClick={() => abrirModal()} disabled={trabajadores.length === 0}>
                + Nueva nómina
              </button>
            </div>

            {cargando ? (
              <div style={{textAlign:'center', padding:'60px', color:'var(--muted)'}}>Cargando...</div>
            ) : (
              <>
                {/* Selector de mes */}
                <div className="mes-row">
                  <label style={{fontSize:'13px', fontWeight:600, color:'var(--text2)'}}>Mes:</label>
                  <input
                    type="month"
                    className="mes-input"
                    value={mes.slice(0, 7)}
                    onChange={e => setMes(e.target.value + '-01')}
                  />
                  <span style={{fontSize:'13px', color:'var(--muted)'}}>{nominas.length} nóminas · {labelMes(mes)}</span>
                </div>

                {/* Resumen del mes */}
                {nominas.length > 0 && (
                  <div className="resumen">
                    <div className="res-card">
                      <div className="res-label">Masa salarial bruta</div>
                      <div className="res-val">{fmt(totalBruto)}</div>
                      <div className="res-sub">{nominas.length} trabajador{nominas.length !== 1 ? 'es' : ''}</div>
                    </div>
                    <div className="res-card">
                      <div className="res-label">Total neto a pagar</div>
                      <div className="res-val" style={{color:'var(--green-dark)'}}>{fmt(totalNeto)}</div>
                      <div className="res-sub">{((totalNeto / totalBruto) * 100).toFixed(1)}% del bruto</div>
                    </div>
                    <div className="res-card">
                      <div className="res-label">Coste total empresa</div>
                      <div className="res-val" style={{color:'var(--red-dark)'}}>{fmt(totalCoste)}</div>
                      <div className="res-sub">×{(totalCoste / totalBruto).toFixed(2)} sobre el bruto</div>
                    </div>
                  </div>
                )}

                {/* Lista nóminas */}
                {trabajadores.length === 0 ? (
                  <div className="empty">
                    <div style={{fontSize:'40px', marginBottom:'12px'}}>👥</div>
                    <div style={{fontWeight:700, color:'var(--text)', marginBottom:'6px'}}>Sin trabajadores</div>
                    Añade trabajadores en la sección Equipo antes de gestionar nóminas.
                  </div>
                ) : nominas.length === 0 ? (
                  <div className="empty">
                    <div style={{fontSize:'40px', marginBottom:'12px'}}>💸</div>
                    <div style={{fontWeight:700, color:'var(--text)', marginBottom:'6px'}}>Sin nóminas este mes</div>
                    Pulsa "+ Nueva nómina" para añadir la nómina del mes.
                  </div>
                ) : (
                  <div className="nominas-grid">
                    {nominas.map(n => {
                      const trab = trabajadores.find(t => t.id === n.trabajador_id)
                      const coste = +(n.salario_bruto * (1 + n.ss_empresa / 100)).toFixed(2)
                      const isIaOpen = iaTarget === n.id
                      return (
                        <div key={n.id} className="nomina-card">
                          <div className="nomina-header">
                            <div className="nomina-trab">
                              <div className="avatar">
                                {trab?.foto_url
                                  ? <img src={trab.foto_url} alt={trab.nombre} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                  : '👤'}
                              </div>
                              <div>
                                <div className="trab-name">{trab?.nombre || 'Trabajador'}</div>
                                <div className="trab-rol">{trab?.especialidad || ''}</div>
                              </div>
                            </div>
                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                              <span className="contrato-badge">{CONTRATOS.find(c => c.id === (n as any).tipo_contrato)?.label || 'Indefinido'}</span>
                              <div className="nomina-actions">
                                <button className="btn-icon" onClick={() => abrirModal(n)} title="Editar">✏️</button>
                                <button className="btn-icon" onClick={() => eliminar(n.id)} title="Eliminar">🗑️</button>
                              </div>
                            </div>
                          </div>

                          <div className="desglose">
                            {/* Columna trabajador */}
                            <div className="desglose-col">
                              <div className="desglose-title">Trabajador</div>
                              <div className="desglose-row">
                                <span className="desglose-label">Salario bruto</span>
                                <span className="desglose-val">{fmt(n.salario_bruto)}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label">IRPF ({n.irpf}%)</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)'}}>−{fmt(+(n.salario_bruto * n.irpf / 100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label">SS ({n.ss_trabajador}%)</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)'}}>−{fmt(+(n.salario_bruto * n.ss_trabajador / 100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-total">
                                <span>Neto</span>
                                <span className="neto-val">{fmt(n.salario_neto)}</span>
                              </div>
                            </div>

                            {/* Columna empresa */}
                            <div className="desglose-col">
                              <div className="desglose-title">Empresa</div>
                              <div className="desglose-row">
                                <span className="desglose-label">Salario bruto</span>
                                <span className="desglose-val">{fmt(n.salario_bruto)}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label">SS empresa ({n.ss_empresa}%)</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)'}}>+{fmt(+(n.salario_bruto * n.ss_empresa / 100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label">Horas/semana</span>
                                <span className="desglose-val">{(n as any).horas_semana || 40}h</span>
                              </div>
                              <div className="desglose-total">
                                <span>Coste total</span>
                                <span className="coste-val">{fmt(coste)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Botón IA */}
                          <button
                            className="btn-ia"
                            onClick={() => isIaOpen && iaResult ? (setIaTarget(null), setIaResult('')) : analizarConIA(n)}
                            disabled={iaLoading && isIaOpen}
                          >
                            {iaLoading && isIaOpen ? '⏳ Analizando...' : isIaOpen && iaResult ? '✕ Cerrar análisis' : '✨ Analizar con IA — coste real y optimización'}
                          </button>
                          {isIaOpen && iaResult && <div className="ia-result">{iaResult}</div>}
                          {isIaOpen && iaError && <div className="ia-error">{iaError}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modal nueva / editar nómina */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">{editando ? 'Editar nómina' : 'Nueva nómina'}</div>

            <div className="field">
              <label>Trabajador *</label>
              <select value={form.trabajador_id} onChange={e => setForm({...form, trabajador_id: e.target.value})}>
                {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.especialidad ? ` — ${t.especialidad}` : ''}</option>)}
              </select>
            </div>

            <div className="grid2">
              <div className="field">
                <label>Tipo de contrato</label>
                <select value={form.tipo_contrato} onChange={e => setForm({...form, tipo_contrato: e.target.value})}>
                  {CONTRATOS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Horas/semana</label>
                <input type="number" min="1" max="40" value={form.horas_semana} onChange={e => setForm({...form, horas_semana: e.target.value})} />
              </div>
            </div>

            <div className="field">
              <label>Salario bruto mensual (€) *</label>
              <input type="number" placeholder="0.00" min="0" step="0.01" value={form.salario_bruto} onChange={e => setForm({...form, salario_bruto: e.target.value})} />
            </div>

            <div className="grid3">
              <div className="field">
                <label>IRPF %</label>
                <input type="number" min="0" max="50" step="0.5" value={form.irpf} onChange={e => setForm({...form, irpf: e.target.value})} />
              </div>
              <div className="field">
                <label>SS trabajador %</label>
                <input type="number" min="0" max="15" step="0.05" value={form.ss_trabajador} onChange={e => setForm({...form, ss_trabajador: e.target.value})} />
              </div>
              <div className="field">
                <label>SS empresa %</label>
                <input type="number" min="0" max="40" step="0.1" value={form.ss_empresa} onChange={e => setForm({...form, ss_empresa: e.target.value})} />
              </div>
            </div>

            {/* Preview cálculo */}
            {bruto > 0 && (
              <div className="calc-box">
                <div className="calc-title">Vista previa del cálculo</div>
                <div className="calc-row"><span className="calc-label">Salario bruto</span><span className="calc-val">{fmt(bruto)}</span></div>
                <div className="calc-row"><span className="calc-label">− IRPF ({irpfPct}%)</span><span className="calc-val" style={{color:'var(--red-dark)'}}>−{fmt(dedIRPF)}</span></div>
                <div className="calc-row"><span className="calc-label">− SS trabajador ({ssTrabPct}%)</span><span className="calc-val" style={{color:'var(--red-dark)'}}>−{fmt(dedSSTrab)}</span></div>
                <hr className="calc-sep" />
                <div className="calc-total"><span style={{color:'var(--green-dark)'}}>Neto trabajador</span><span style={{color:'var(--green-dark)'}}>{fmt(neto)}</span></div>
                <div style={{marginTop:'10px', paddingTop:'10px', borderTop:'1px solid var(--border)'}}>
                  <div className="calc-row"><span className="calc-label">+ SS empresa ({ssEmpPct}%)</span><span className="calc-val" style={{color:'var(--red-dark)'}}>+{fmt(cuotaEmp)}</span></div>
                  <div className="calc-total" style={{marginTop:'6px'}}><span style={{color:'var(--red-dark)'}}>Coste total empresa</span><span style={{color:'var(--red-dark)'}}>{fmt(costeTotal)}</span></div>
                </div>
                <div style={{marginTop:'10px', background:'rgba(184,216,248,0.2)', borderRadius:'8px', padding:'8px 10px', fontSize:'12px', color:'var(--blue-dark)', fontWeight:600}}>
                  💡 Por cada €{fmt(neto)} que recibe el trabajador, la empresa paga {fmt(costeTotal)} ({((costeTotal / neto - 1) * 100).toFixed(1)}% más)
                </div>
              </div>
            )}

            {apiError && <div className="error-msg">{apiError}</div>}
            <div className="modal-btns">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar nómina'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
