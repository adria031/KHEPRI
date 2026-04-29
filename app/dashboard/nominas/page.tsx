'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'




const CONTRATOS = [
  { id: 'indefinido',  label: 'Indefinido' },
  { id: 'temporal',    label: 'Temporal' },
  { id: 'practicas',   label: 'Prácticas' },
  { id: 'autonomo',    label: 'Autónomo' },
  { id: 'parcial',     label: 'Tiempo parcial' },
]

// ── Tasas oficiales España 2026 ──────────────────────────────────────────────
const SS_EMP_DEFAULT  = 31.4  // 23.60 + 5.50 + 0.20 + 0.60 + 1.50 = 31.40%
const SS_TRAB_DEFAULT = 6.35  // contingencias 4.70% + desempleo 1.55% + FP 0.10%
const SMI_2026        = 1184  // €/mes en 14 pagas (16.576 €/año)
const AUTONOMO_TARIFA_PLANA = 80   // €/mes primer año tarifa plana 2026
const AUTONOMO_BASE_MINIMA  = 230  // €/mes base mínima aprox. (cuota mínima cotización)

// ── Bases de cotización SS 2026 ───────────────────────────────────────────────
const BASE_SS_MIN = 1381.20   // base mínima mensual 2026
const BASE_SS_MAX = 4909.50   // base máxima mensual 2026

function baseCotizacion(brutoMensual: number): number {
  return Math.max(BASE_SS_MIN, Math.min(brutoMensual, BASE_SS_MAX))
}

// ── Desglose SS trabajador 2026 ───────────────────────────────────────────────
const SS_TRAB_DESGLOSE = [
  { label: 'Contingencias comunes', pct: 4.70 },
  { label: 'Desempleo',             pct: 1.55 },
  { label: 'Formación profesional', pct: 0.10 },
]

// ── Desglose SS empresa 2026 ──────────────────────────────────────────────────
const SS_EMP_DESGLOSE = [
  { label: 'Contingencias comunes', pct: 23.60 },
  { label: 'Desempleo',             pct: 5.50  },
  { label: 'FOGASA',                pct: 0.20  },
  { label: 'Formación profesional', pct: 0.60  },
  { label: 'Accidentes de trabajo', pct: 1.50  },
]

// IRPF 2026 — retención estimada sobre bruto anual (tramos estatales vigentes)
// Mínimo personal y familiar básico: 5.550 €
function calcularIRPFAuto(brutoMensual: number): number {
  const anual = brutoMensual * 12
  if (anual <= 0) return 0
  const base = Math.max(0, anual - 5550) // mínimo personal básico 2026
  let cuota = 0
  if      (base <= 12450)   cuota = base * 0.19
  else if (base <= 20200)   cuota = 2365.50  + (base - 12450)  * 0.24
  else if (base <= 35200)   cuota = 4225.50  + (base - 20200)  * 0.30
  else if (base <= 60000)   cuota = 8725.50  + (base - 35200)  * 0.37
  else if (base <= 300000)  cuota = 17901.50 + (base - 60000)  * 0.45
  else                      cuota = 125901.50 + (base - 300000) * 0.47
  // Retención mensual efectiva (%)
  return Math.max(2, Math.round((cuota / anual) * 1000) / 10)
}

// Detalle IRPF mensual (euros, no %)
function irpfMensual(brutoMensual: number): number {
  return +(brutoMensual * calcularIRPFAuto(brutoMensual) / 100).toFixed(2)
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
      setNegocio(activo)
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

  // Cálculos automáticos (SS aplica sobre base cotización, no salario bruto)
  const bruto       = parseFloat(form.salario_bruto) || 0
  const irpfPct     = parseFloat(form.irpf) || 0
  const ssTrabPct   = parseFloat(form.ss_trabajador) || 0
  const ssEmpPct    = parseFloat(form.ss_empresa) || 0
  const baseSS      = bruto > 0 ? baseCotizacion(bruto) : 0   // base clamped
  const dedIRPF     = +(bruto * irpfPct / 100).toFixed(2)
  const dedSSTrab   = +(baseSS * ssTrabPct / 100).toFixed(2)
  const neto        = +(bruto - dedIRPF - dedSSTrab).toFixed(2)
  const cuotaEmp    = +(baseSS * ssEmpPct / 100).toFixed(2)
  const costeTotal  = +(bruto + cuotaEmp).toFixed(2)
  // Desglose SS trabajador y empresa (en euros)
  const ssTrabDesglose = SS_TRAB_DESGLOSE.map(d => ({ ...d, euros: +(baseSS * d.pct / 100).toFixed(2) }))
  const ssEmpDesglose  = SS_EMP_DESGLOSE.map(d => ({ ...d, euros: +(baseSS * d.pct / 100).toFixed(2) }))

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

  // Auto-recalcular IRPF cuando cambia el bruto
  function onBrutoChange(val: string) {
    const b = parseFloat(val) || 0
    setForm(f => ({ ...f, salario_bruto: val, irpf: b > 0 ? String(calcularIRPFAuto(b)) : f.irpf }))
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
      const response = await fetch(
        '/api/gemini',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) { console.error('[nominas] Gemini sin texto:', data); throw new Error('Respuesta vacía de la IA') }
      setIaResult(text)
    } catch (e: any) {
      console.error('[nominas] analizarConIA error:', e)
      setIaError(e.message || 'Error al conectar con la IA')
    }
    setIaLoading(false)
  }


  async function generarPDF(n: Nomina) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const trab = trabajadores.find(t => t.id === n.trabajador_id)
    const coste = +(n.salario_bruto * (1 + n.ss_empresa / 100)).toFixed(2)
    const dedIRPF = +(n.salario_bruto * n.irpf / 100).toFixed(2)
    const dedSS = +(n.salario_bruto * n.ss_trabajador / 100).toFixed(2)
    const cuotaEmp = +(n.salario_bruto * n.ss_empresa / 100).toFixed(2)
    const mesLabel = labelMes(n.mes)
    const contratoLabel = CONTRATOS.find(c => c.id === (n as any).tipo_contrato)?.label || 'Indefinido'
    const f = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
    const W = 210, mL = 14, mR = 196
    let y = 0

    // ── Cabecera ──────────────────────────────────────────────────────────────
    doc.setFillColor(17, 24, 39)
    doc.rect(0, 0, W, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('KHEPRIA', mL, 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('RECIBO DE SALARIO', 105, 9, { align: 'center' })
    doc.setFontSize(8)
    doc.text(mesLabel.toUpperCase(), 105, 16, { align: 'center' })
    doc.text('Página 1 de 1', mR, 14, { align: 'right' })

    y = 30

    // ── Datos empresa / trabajador ────────────────────────────────────────────
    // Empresa
    doc.setFillColor(247, 249, 252)
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(mL, y, 85, 32, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(153, 153, 153)
    doc.text('EMPRESA', mL + 4, y + 7)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39)
    doc.text(negocio?.nombre || '—', mL + 4, y + 15)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
    doc.text(`Período: ${mesLabel}`, mL + 4, y + 22)
    doc.text('CIF/NIF: ________________', mL + 4, y + 28)

    // Trabajador
    doc.setFillColor(247, 249, 252)
    doc.roundedRect(111, y, 85, 32, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(153, 153, 153)
    doc.text('TRABAJADOR', 115, y + 7)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39)
    doc.text(trab?.nombre || '—', 115, y + 15)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
    doc.text(`Categoría: ${trab?.especialidad || '—'}`, 115, y + 22)
    doc.text(`Contrato: ${contratoLabel} · ${(n as any).horas_semana || 40}h/sem`, 115, y + 28)

    y += 42

    // ── Tabla devengos / deducciones ──────────────────────────────────────────
    doc.setFillColor(17, 24, 39)
    doc.rect(mL, y, mR - mL, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text('DEVENGOS Y DEDUCCIONES — TRABAJADOR', mL + 3, y + 5.5)
    doc.text('IMPORTE', mR - 3, y + 5.5, { align: 'right' })
    y += 8

    const rowsTrab: [string, string, number, number, number][] = [
      ['Salario base mensual', f(n.salario_bruto), 17, 24, 39],
      [`Retención IRPF (${n.irpf}%)  [tramos 2026]`, '−' + f(dedIRPF), 220, 38, 38],
      [`Seg. Social trabajador (${n.ss_trabajador}%)`, '−' + f(dedSS), 220, 38, 38],
    ]
    rowsTrab.forEach(([label, val, r, g, b], i) => {
      const ry = y + i * 9
      doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252)
      doc.rect(mL, ry, mR - mL, 9, 'F')
      doc.setTextColor(r, g, b); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text(label, mL + 3, ry + 6)
      doc.setFont('helvetica', 'bold')
      doc.text(val, mR - 3, ry + 6, { align: 'right' })
    })
    y += rowsTrab.length * 9

    // Total neto
    doc.setFillColor(184, 237, 212)
    doc.rect(mL, y, mR - mL, 11, 'F')
    doc.setTextColor(46, 138, 94); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('LÍQUIDO A PERCIBIR', mL + 3, y + 7.5)
    doc.text(f(n.salario_neto), mR - 3, y + 7.5, { align: 'right' })
    y += 18

    // ── Tabla coste empresa ───────────────────────────────────────────────────
    doc.setFillColor(17, 24, 39)
    doc.rect(mL, y, mR - mL, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text('COSTE TOTAL PARA LA EMPRESA', mL + 3, y + 5.5)
    doc.text('IMPORTE', mR - 3, y + 5.5, { align: 'right' })
    y += 8

    const rowsEmp: [string, string, number, number, number][] = [
      ['Salario bruto', f(n.salario_bruto), 17, 24, 39],
      [`Cuota Seg. Social empresa (${n.ss_empresa}%)`, '+' + f(cuotaEmp), 220, 38, 38],
    ]
    rowsEmp.forEach(([label, val, r, g, b], i) => {
      const ry = y + i * 9
      doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252)
      doc.rect(mL, ry, mR - mL, 9, 'F')
      doc.setTextColor(r, g, b); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text(label, mL + 3, ry + 6)
      doc.setFont('helvetica', 'bold')
      doc.text(val, mR - 3, ry + 6, { align: 'right' })
    })
    y += rowsEmp.length * 9

    doc.setFillColor(254, 226, 226)
    doc.rect(mL, y, mR - mL, 11, 'F')
    doc.setTextColor(220, 38, 38); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('COSTE TOTAL EMPRESA', mL + 3, y + 7.5)
    doc.text(f(coste), mR - 3, y + 7.5, { align: 'right' })
    y += 18

    // ── Referencia SMI 2026 ───────────────────────────────────────────────────
    doc.setFillColor(235, 242, 255)
    doc.setDrawColor(184, 216, 248)
    doc.roundedRect(mL, y, mR - mL, 18, 3, 3, 'FD')
    doc.setTextColor(29, 78, 216); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text('Referencia 2026', mL + 4, y + 7)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99); doc.setFontSize(8)
    const ratio = n.salario_neto > 0 ? ((coste / n.salario_neto - 1) * 100).toFixed(1) : '0'
    doc.text(`SMI 2026: ${f(SMI_2026)}/mes (14 pagas)  ·  Por cada ${f(n.salario_neto)} neto, la empresa desembolsa ${f(coste)} (+${ratio}%)`, mL + 4, y + 13)
    y += 26

    // ── Firmas ────────────────────────────────────────────────────────────────
    doc.setDrawColor(180, 180, 180)
    doc.line(mL, y + 22, mL + 72, y + 22)
    doc.line(mR - 72, y + 22, mR, y + 22)
    doc.setTextColor(120, 120, 120); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('Firma y sello empresa', mL + 36, y + 27, { align: 'center' })
    doc.text('Firma trabajador', mR - 36, y + 27, { align: 'center' })

    // ── Pie ───────────────────────────────────────────────────────────────────
    doc.setFillColor(247, 249, 252)
    doc.rect(0, 285, W, 12, 'F')
    doc.setDrawColor(229, 231, 235)
    doc.line(0, 285, W, 285)
    doc.setTextColor(153, 153, 153); doc.setFontSize(7)
    doc.text(`Generado con Khepria · ${new Date().toLocaleDateString('es-ES')} · Documento informativo conforme a plantillas SEPE 2026`, 105, 292, { align: 'center' })

    const filename = `nomina-${(trab?.nombre || 'trabajador').toLowerCase().replace(/\s+/g, '-')}-${n.mes}.pdf`
    doc.save(filename)
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
      const response = await fetch(
        '/api/gemini',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) console.error('[nominas] chat Gemini sin texto:', data)
      setChatMsgs(prev => [...prev, { role: 'ai', text: text || 'Sin respuesta de la IA.' }])
    } catch (e) {
      console.error('[nominas] enviarChat error:', e)
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
          .page-header { flex-wrap: wrap; gap: 10px; }
        }
        @media (max-width: 480px) {
          .grid3 { grid-template-columns: 1fr !important; }
          .modal { max-width: calc(100vw - 24px) !important; padding: 18px !important; }
          .modal-btns { flex-direction: column; }
          .modal-btns button { width: 100%; }
          .nomina-card { padding: 14px; }
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
                      const baseSSCard = baseCotizacion(n.salario_bruto)
                      const coste = +(n.salario_bruto + baseSSCard * n.ss_empresa / 100).toFixed(2)
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
                                <span className="desglose-label" style={{fontSize:11, color:'var(--muted)'}}>Cont. comunes 4.70%</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)', fontSize:11}}>−{fmt(+(baseSSCard*4.70/100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label" style={{fontSize:11, color:'var(--muted)'}}>Desempleo 1.55% + FP 0.10%</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)', fontSize:11}}>−{fmt(+(baseSSCard*1.65/100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label" style={{fontWeight:600}}>SS trabajador ({n.ss_trabajador}%)</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)', fontWeight:700}}>−{fmt(+(baseSSCard * n.ss_trabajador / 100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-total">
                                <span>💰 Neto</span>
                                <span className="neto-val">{fmt(n.salario_neto)}</span>
                              </div>
                            </div>

                            {/* Columna empresa */}
                            <div className="desglose-col">
                              <div className="desglose-title">Empresa (base {fmt(baseSSCard)})</div>
                              <div className="desglose-row">
                                <span className="desglose-label" style={{fontSize:11, color:'var(--muted)'}}>Cont. comunes 23.60%</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)', fontSize:11}}>+{fmt(+(baseSSCard*23.60/100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label" style={{fontSize:11, color:'var(--muted)'}}>Desempleo 5.50%</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)', fontSize:11}}>+{fmt(+(baseSSCard*5.50/100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label" style={{fontSize:11, color:'var(--muted)'}}>FOGASA 0.20% + FP 0.60% + AT 1.50%</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)', fontSize:11}}>+{fmt(+(baseSSCard*2.30/100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-row">
                                <span className="desglose-label" style={{fontWeight:600}}>SS empresa ({n.ss_empresa}%)</span>
                                <span className="desglose-val" style={{color:'var(--red-dark)', fontWeight:700}}>+{fmt(+(baseSSCard * n.ss_empresa / 100).toFixed(2))}</span>
                              </div>
                              <div className="desglose-total">
                                <span>🏢 Coste total</span>
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
              <input type="number" placeholder="0.00" min="0" step="0.01" value={form.salario_bruto} onChange={e => onBrutoChange(e.target.value)} />
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

            {/* Preview cálculo con desglose SS completo */}
            {bruto > 0 && (
              <div className="calc-box">
                <div className="calc-title">Nómina completa — base cotización {fmt(baseSS)}{baseSS !== bruto ? ` (ajustada de ${fmt(bruto)})` : ''}</div>
                <div className="calc-row"><span className="calc-label">Salario bruto</span><span className="calc-val">{fmt(bruto)}</span></div>
                <div className="calc-row"><span className="calc-label" style={{color:'var(--muted)', fontSize:12}}>Base cotización SS (min {fmt(BASE_SS_MIN)} / max {fmt(BASE_SS_MAX)})</span><span className="calc-val" style={{fontSize:12}}>{fmt(baseSS)}</span></div>
                <hr className="calc-sep" />
                {/* SS Trabajador desglosada */}
                <div style={{fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', margin:'6px 0 4px'}}>SS Trabajador (sobre {fmt(baseSS)})</div>
                {ssTrabDesglose.map(d => (
                  <div key={d.label} className="calc-row" style={{fontSize:12}}>
                    <span className="calc-label">{d.label} ({d.pct}%)</span>
                    <span className="calc-val" style={{color:'var(--red-dark)'}}>−{fmt(d.euros)}</span>
                  </div>
                ))}
                <div className="calc-row">
                  <span className="calc-label" style={{fontWeight:700}}>Total SS trabajador ({ssTrabPct}%)</span>
                  <span className="calc-val" style={{color:'var(--red-dark)', fontWeight:700}}>−{fmt(dedSSTrab)}</span>
                </div>
                <hr className="calc-sep" />
                <div className="calc-row"><span className="calc-label">− IRPF retención ({irpfPct}%)</span><span className="calc-val" style={{color:'var(--red-dark)'}}>−{fmt(dedIRPF)}</span></div>
                <hr className="calc-sep" />
                <div className="calc-total"><span style={{color:'var(--green-dark)'}}>💰 Salario neto</span><span style={{color:'var(--green-dark)'}}>{fmt(neto)}</span></div>
                <div style={{marginTop:'12px', paddingTop:'10px', borderTop:'1px solid var(--border)'}}>
                  <div style={{fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 4px'}}>SS Empresa (sobre {fmt(baseSS)})</div>
                  {ssEmpDesglose.map(d => (
                    <div key={d.label} className="calc-row" style={{fontSize:12}}>
                      <span className="calc-label">{d.label} ({d.pct}%)</span>
                      <span className="calc-val" style={{color:'var(--red-dark)'}}>+{fmt(d.euros)}</span>
                    </div>
                  ))}
                  <div className="calc-row">
                    <span className="calc-label" style={{fontWeight:700}}>Total SS empresa ({ssEmpPct}%)</span>
                    <span className="calc-val" style={{color:'var(--red-dark)', fontWeight:700}}>+{fmt(cuotaEmp)}</span>
                  </div>
                  <hr className="calc-sep" />
                  <div className="calc-total" style={{marginTop:'4px'}}><span style={{color:'var(--red-dark)'}}>🏢 Coste total empresa</span><span style={{color:'var(--red-dark)'}}>{fmt(costeTotal)}</span></div>
                </div>
                <div style={{marginTop:'10px', background:'rgba(184,216,248,0.2)', borderRadius:'8px', padding:'8px 10px', fontSize:'12px', color:'var(--blue-dark)', fontWeight:600}}>
                  💡 Por cada {fmt(neto)} que recibe el trabajador, la empresa paga {fmt(costeTotal)} ({((costeTotal / neto - 1) * 100).toFixed(1)}% más)
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
