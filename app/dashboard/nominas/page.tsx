'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'



const GEMINI_URL = '/api/gemini'

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

// IRPF 2024 — retención estimada sobre bruto anual (tramos estatales + autonómicos medios)
function calcularIRPFAuto(brutoMensual: number): number {
  const anual = brutoMensual * 12
  const base = Math.max(0, anual - 5550) // mínimo personal básico
  let cuota = 0
  if (base <= 12450)       cuota = base * 0.19
  else if (base <= 20200)  cuota = 2365.5  + (base - 12450) * 0.24
  else if (base <= 35200)  cuota = 4225.5  + (base - 20200) * 0.30
  else if (base <= 60000)  cuota = 8725.5  + (base - 35200) * 0.37
  else if (base <= 300000) cuota = 17901.5 + (base - 60000) * 0.45
  else                     cuota = 125901.5 + (base - 300000) * 0.47
  return Math.max(2, Math.round((cuota / anual) * 1000) / 10)
}

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
  const [negocio, setNegocio] = useState<NegMin | null>(null)
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

  // IA por nómina
  const [iaLoading, setIaLoading]       = useState(false)
  const [iaResult, setIaResult]         = useState('')
  const [iaError, setIaError]           = useState('')
  const [iaTarget, setIaTarget]         = useState<string | null>(null) // nomina.id

  // Chat IA general
  type ChatMsg = { role: 'user' | 'ai'; text: string }
  const [chatInput, setChatInput]       = useState('')
  const [chatMsgs, setChatMsgs]         = useState<ChatMsg[]>([])
  const [chatLoading, setChatLoading]   = useState(false)

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


  function generarPDF(n: Nomina) {
    const trab = trabajadores.find(t => t.id === n.trabajador_id)
    const coste = +(n.salario_bruto * (1 + n.ss_empresa / 100)).toFixed(2)
    const dedIRPF = +(n.salario_bruto * n.irpf / 100).toFixed(2)
    const dedSS = +(n.salario_bruto * n.ss_trabajador / 100).toFixed(2)
    const cuotaEmp = +(n.salario_bruto * n.ss_empresa / 100).toFixed(2)
    const mesLabel = labelMes(n.mes)
    const fmt2 = (v: number) => v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Nómina ${trab?.nombre} — ${mesLabel}</title>
<style>
  body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 32px; background: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .logo span { color: #4F46E5; }
  .doc-title { font-size: 13px; color: #666; text-align: right; }
  .doc-title strong { display: block; font-size: 18px; color: #111; margin-bottom: 2px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .info-box { background: #f7f9fc; border-radius: 8px; padding: 14px 16px; }
  .info-label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .info-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
  .info-val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #111; color: white; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
  .amount { text-align: right; font-weight: 600; }
  .neg { color: #DC2626; }
  .pos { color: #2E8A5E; }
  .total-row td { font-size: 15px; font-weight: 900; background: #f7f9fc; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #999; }
  .firma { border-top: 1px solid #333; padding-top: 8px; margin-top: 40px; font-size: 12px; color: #666; width: 200px; }
  @media print { body { padding: 16px; } }
</style></head><body>
  <div class="header">
    <div class="logo">Khe<span>pria</span></div>
    <div class="doc-title"><strong>NÓMINA</strong>${mesLabel}</div>
  </div>
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Empresa / Negocio</div>
      <div class="info-row"><span>Nombre</span><span class="info-val">${negocio?.nombre || '—'}</span></div>
      <div class="info-row"><span>Mes</span><span class="info-val">${mesLabel}</span></div>
    </div>
    <div class="info-box">
      <div class="info-label">Trabajador</div>
      <div class="info-row"><span>Nombre</span><span class="info-val">${trab?.nombre || '—'}</span></div>
      <div class="info-row"><span>Especialidad</span><span class="info-val">${trab?.especialidad || '—'}</span></div>
      <div class="info-row"><span>Tipo contrato</span><span class="info-val">${CONTRATOS.find(c => c.id === (n as any).tipo_contrato)?.label || 'Indefinido'}</span></div>
      <div class="info-row"><span>Jornada</span><span class="info-val">${(n as any).horas_semana || 40}h/semana</span></div>
    </div>
  </div>
  <table>
    <tr><th>Concepto</th><th style="text-align:right">Importe</th></tr>
    <tr><td>Salario bruto</td><td class="amount">${fmt2(n.salario_bruto)}</td></tr>
    <tr><td class="neg">— Retención IRPF (${n.irpf}%)</td><td class="amount neg">−${fmt2(dedIRPF)}</td></tr>
    <tr><td class="neg">— Seg. Social trabajador (${n.ss_trabajador}%)</td><td class="amount neg">−${fmt2(dedSS)}</td></tr>
    <tr class="total-row"><td class="pos">TOTAL NETO A PERCIBIR</td><td class="amount pos">${fmt2(n.salario_neto)}</td></tr>
  </table>
  <table>
    <tr><th colspan="2">Costes empresa</th></tr>
    <tr><td>Salario bruto</td><td class="amount">${fmt2(n.salario_bruto)}</td></tr>
    <tr><td class="neg">+ Seg. Social empresa (${n.ss_empresa}%)</td><td class="amount neg">+${fmt2(cuotaEmp)}</td></tr>
    <tr class="total-row"><td class="neg">COSTE TOTAL EMPRESA</td><td class="amount neg">${fmt2(coste)}</td></tr>
  </table>
  <div class="footer">
    <span>Generado por Khepria · ${new Date().toLocaleDateString('es-ES')}</span>
    <span>Documento de carácter informativo</span>
  </div>
  <div class="firma">Firma y sello empresa</div>
</body></html>`
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.onload = () => w.print()
  }

  async function enviarChat() {
    const texto = chatInput.trim()
    if (!texto || chatLoading) return
    setChatMsgs(prev => [...prev, { role: 'user', text: texto }])
    setChatInput('')
    setChatLoading(true)

    const contexto = nominas.length > 0
      ? `El negocio tiene ${nominas.length} trabajador(es) este mes. Masa salarial bruta: ${fmt(totalBruto)}. Coste total empresa: ${fmt(totalCoste)}.`
      : 'Aún no hay nóminas registradas este mes.'

    const prompt = `Eres un asesor laboral español experto en nóminas, Seguridad Social, IRPF y contratación. Responde en español, de forma clara y práctica, máximo 250 palabras. No uses markdown complejo, solo texto plano con saltos de línea si necesitas estructura.

Contexto del negocio: ${contexto}

Pregunta: ${texto}`

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      })
      const json = await res.json()
      const respuesta = json.candidates?.[0]?.content?.parts?.[0]?.text
      setChatMsgs(prev => [...prev, { role: 'ai', text: respuesta || 'Sin respuesta de la IA.' }])
    } catch {
      setChatMsgs(prev => [...prev, { role: 'ai', text: 'Error al conectar con la IA. Inténtalo de nuevo.' }])
    }
    setChatLoading(false)
  }

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

  // Totales del mes
  const totalBruto  = nominas.reduce((s, n) => s + n.salario_bruto, 0)
  const totalNeto   = nominas.reduce((s, n) => s + n.salario_neto, 0)
  const totalCoste  = nominas.reduce((s, n) => s + n.salario_bruto * (1 + n.ss_empresa / 100), 0)

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
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

                          {/* Botones acción */}
                          <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
                            <button
                              className="btn-ia"
                              style={{flex:1}}
                              onClick={() => isIaOpen && iaResult ? (setIaTarget(null), setIaResult('')) : analizarConIA(n)}
                              disabled={iaLoading && isIaOpen}
                            >
                              {iaLoading && isIaOpen ? '⏳ Analizando...' : isIaOpen && iaResult ? '✕ Cerrar análisis' : '✨ Analizar con IA'}
                            </button>
                            <button
                              onClick={() => generarPDF(n)}
                              style={{padding:'10px 14px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:'10px', fontFamily:'inherit', fontSize:'13px', fontWeight:600, color:'var(--text2)', cursor:'pointer', whiteSpace:'nowrap'}}
                            >
                              📄 PDF
                            </button>
                          </div>
                          {isIaOpen && iaResult && <div className="ia-result">{iaResult}</div>}
                          {isIaOpen && iaError && <div className="ia-error">{iaError}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Chat IA laboral */}
                <div style={{marginTop:'28px', background:'white', border:'1px solid var(--border)', borderRadius:'16px', overflow:'hidden'}}>
                  <div style={{padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'linear-gradient(135deg,rgba(212,197,249,0.15),rgba(184,216,248,0.15))'}}>
                    <div style={{fontSize:'15px', fontWeight:800, color:'var(--text)'}}>✨ Asesor laboral IA</div>
                    <div style={{fontSize:'13px', color:'var(--muted)', marginTop:'2px'}}>Pregunta sobre contratos, SS, IRPF, bonificaciones...</div>
                  </div>

                  {chatMsgs.length > 0 && (
                    <div style={{padding:'16px 20px', display:'flex', flexDirection:'column', gap:'10px', maxHeight:'320px', overflowY:'auto'}}>
                      {chatMsgs.map((m, i) => (
                        <div key={i} style={{display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'}}>
                          <div style={{
                            maxWidth:'80%', padding:'10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: m.role === 'user' ? '#111827' : 'rgba(212,197,249,0.2)',
                            color: m.role === 'user' ? 'white' : 'var(--text)',
                            fontSize:'13px', lineHeight:'1.6', whiteSpace:'pre-wrap'
                          }}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div style={{display:'flex', justifyContent:'flex-start'}}>
                          <div style={{padding:'10px 14px', borderRadius:'14px 14px 14px 4px', background:'rgba(212,197,249,0.2)', fontSize:'13px', color:'var(--muted)'}}>
                            Pensando...
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{padding:'12px 16px', borderTop: chatMsgs.length > 0 ? '1px solid var(--border)' : 'none', display:'flex', gap:'8px'}}>
                    <input
                      type="text"
                      placeholder="¿Cuánto cuesta contratar a alguien por 1.400€? ¿Qué bonificaciones hay?"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChat()}
                      style={{flex:1, padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', color:'var(--text)', outline:'none', background:'var(--bg)'}}
                    />
                    <button
                      onClick={enviarChat}
                      disabled={chatLoading || !chatInput.trim()}
                      style={{padding:'11px 18px', background:'#111827', color:'white', border:'none', borderRadius:'10px', fontFamily:'inherit', fontSize:'13px', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', opacity: chatLoading || !chatInput.trim() ? 0.5 : 1}}
                    >
                      Enviar
                    </button>
                  </div>
                </div>

              </>
            )}

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
                <label style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <span>IRPF %</span>
                  {bruto > 0 && (
                    <span
                      onClick={() => setForm({...form, irpf: String(calcularIRPFAuto(bruto))})}
                      style={{fontSize:'11px', fontWeight:700, color:'var(--blue-dark)', cursor:'pointer', textDecoration:'underline'}}
                    >
                      Auto ({calcularIRPFAuto(bruto)}%)
                    </span>
                  )}
                </label>
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
    </DashboardShell>
  )
}
