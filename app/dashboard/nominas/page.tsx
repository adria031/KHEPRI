'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

type Trabajador = {
  id: string; nombre: string; especialidad: string; foto_url: string | null
  salario_anual: number | null; num_pagas: number | null
  complementos: { plus_transporte?: number; plus_productividad?: number; dietas?: number; otros?: number; otros_descripcion?: string } | null
}
type Nomina = {
  id: string; trabajador_id: string; mes: string
  salario_bruto: number; irpf: number; ss_trabajador: number; ss_empresa: number
  salario_neto: number; horas_semana?: number
}
type ContratoForm = {
  tipo: 'indefinido' | 'temporal' | 'parcial' | 'formacion'
  fecha_inicio: string; jornada_horas: string; salario_anual: string
  duracion_meses: string; puesto: string; dni: string; direccion: string
}

const TIPO_CONTRATO = {
  indefinido: 'Contrato indefinido ordinario',
  temporal: 'Contrato de duración determinada',
  parcial: 'Contrato a tiempo parcial indefinido',
  formacion: 'Contrato de formación en alternancia',
}

const CONTRATO_FORM_VACIO: ContratoForm = {
  tipo: 'indefinido', fecha_inicio: new Date().toISOString().slice(0,10),
  jornada_horas: '40', salario_anual: '', duracion_meses: '',
  puesto: '', dni: '', direccion: '',
}

type NominaForm = {
  trabajador_id: string
  salario_mensual: string
  comp_transporte: string; comp_productividad: string; comp_dietas: string; comp_otros: string; comp_otros_desc: string
  irpf_pct: string; ss_trab_pct: string; ss_emp_pct: string
  anticipo: string; deduccion_otros: string; deduccion_otros_desc: string
}

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function labelMes(iso: string) {
  return new Date(iso + 'T12:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}
function fmtEur(n: number) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) }
function fmtN(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' }

function irpfTasa(anual: number): number {
  if (anual > 300000) return 47
  if (anual > 60000) return 45
  if (anual > 35200) return 37
  if (anual > 20200) return 30
  if (anual > 12450) return 24
  return 19
}

const FORM_VACIO: NominaForm = {
  trabajador_id: '', salario_mensual: '',
  comp_transporte: '', comp_productividad: '', comp_dietas: '', comp_otros: '', comp_otros_desc: '',
  irpf_pct: '', ss_trab_pct: '6.35', ss_emp_pct: '31.40',
  anticipo: '', deduccion_otros: '', deduccion_otros_desc: '',
}

const FAQ_SUGERENCIAS = [
  '¿Cuánto me cuesta contratar a alguien por 20.000€ al año?',
  '¿Qué bonificaciones hay para nuevas contrataciones?',
  '¿Cuándo tengo que pagar la Seguridad Social?',
  '¿Qué es la pluriactividad?',
  '¿Cuándo debo dar de alta a un trabajador en la SS?',
]

export default function Nominas() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [mes, setMes] = useState(mesActual())

  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Nomina | null>(null)
  const [form, setForm] = useState<NominaForm>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [apiError, setApiError] = useState('')

  type ChatMsg = { role: 'user' | 'ai'; text: string }
  const [chatInput, setChatInput] = useState('')
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  const [contratoModal, setContratoModal] = useState(false)
  const [contratoTrabId, setContratoTrabId] = useState('')
  const [contratoForm, setContratoForm] = useState<ContratoForm>(CONTRATO_FORM_VACIO)

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const { activo, todos } = await getNegocioActivo(session.user.id, session.access_token)
      if (!activo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todos); setNegocio(activo); setNegocioId(activo.id)
      const { data: tr } = await db.from('trabajadores')
        .select('id,nombre,especialidad,foto_url,salario_anual,num_pagas,complementos')
        .eq('negocio_id', activo.id).eq('activo', true).order('nombre')
      setTrabajadores((tr || []) as Trabajador[])
      setCargando(false)
    })()
  }, [])

  const cargarNominas = useCallback(async () => {
    if (!negocioId) return
    const desde = mes
    const hasta = new Date(new Date(mes).getFullYear(), new Date(mes).getMonth() + 1, 0).toISOString().slice(0, 10)
    const { data } = await supabase.from('nominas').select('*').eq('negocio_id', negocioId).gte('mes', desde).lte('mes', hasta).order('mes')
    setNominas((data || []) as Nomina[])
  }, [negocioId, mes])

  useEffect(() => { cargarNominas() }, [cargarNominas])

  // ── Live calculations ──────────────────────────────────────────────────────
  const baseMensual       = parseFloat(form.salario_mensual) || 0
  const compTransporte    = parseFloat(form.comp_transporte) || 0
  const compProductividad = parseFloat(form.comp_productividad) || 0
  const compDietas        = parseFloat(form.comp_dietas) || 0
  const compOtros         = parseFloat(form.comp_otros) || 0
  const totalComps        = compTransporte + compProductividad + compDietas + compOtros
  const totalDevengado    = +(baseMensual + totalComps).toFixed(2)
  const irpfPct           = parseFloat(form.irpf_pct) || 0
  const ssTrabPct         = parseFloat(form.ss_trab_pct) || 0
  const ssEmpPct          = parseFloat(form.ss_emp_pct) || 0
  const irpfEur           = +(totalDevengado * irpfPct / 100).toFixed(2)
  const ssTrabEur         = +(totalDevengado * ssTrabPct / 100).toFixed(2)
  const ssEmpEur          = +(totalDevengado * ssEmpPct / 100).toFixed(2)
  const anticipoNum       = parseFloat(form.anticipo) || 0
  const deduccionOtros    = parseFloat(form.deduccion_otros) || 0
  const totalDeducciones  = +(irpfEur + ssTrabEur + anticipoNum + deduccionOtros).toFixed(2)
  const liquidoNeto       = +(totalDevengado - totalDeducciones).toFixed(2)

  function workerData(tid: string): Partial<NominaForm> {
    const t = trabajadores.find(x => x.id === tid)
    if (!t) return {}
    const numPagas = t.num_pagas || 14
    const anual = t.salario_anual || 0
    const mensual = anual > 0 ? +(anual / numPagas).toFixed(2) : 0
    const comp = t.complementos || {}
    return {
      salario_mensual: mensual > 0 ? String(mensual) : '',
      comp_transporte: comp.plus_transporte ? String(comp.plus_transporte) : '',
      comp_productividad: comp.plus_productividad ? String(comp.plus_productividad) : '',
      comp_dietas: comp.dietas ? String(comp.dietas) : '',
      comp_otros: comp.otros ? String(comp.otros) : '',
      comp_otros_desc: comp.otros_descripcion || '',
      irpf_pct: anual > 0 ? String(irpfTasa(anual)) : '',
    }
  }

  function abrirModal(n?: Nomina) {
    if (n) {
      setEditando(n)
      const bruto = n.salario_bruto || 0
      const irpfPctCalc = bruto > 0 ? +((n.irpf / bruto) * 100).toFixed(2) : 0
      const ssTrabPctCalc = bruto > 0 ? +((n.ss_trabajador / bruto) * 100).toFixed(2) : 6.35
      const ssEmpPctCalc = bruto > 0 ? +((n.ss_empresa / bruto) * 100).toFixed(2) : 31.40
      setForm({
        ...FORM_VACIO,
        trabajador_id: n.trabajador_id,
        salario_mensual: String(bruto),
        irpf_pct: String(irpfPctCalc),
        ss_trab_pct: String(ssTrabPctCalc),
        ss_emp_pct: String(ssEmpPctCalc),
      })
    } else {
      setEditando(null)
      const first = trabajadores[0]
      setForm({ ...FORM_VACIO, trabajador_id: first?.id || '', ...(first ? workerData(first.id) : {}) })
    }
    setApiError(''); setModal(true)
  }

  async function guardar(conPDF = false) {
    if (!form.trabajador_id || baseMensual <= 0) { setApiError('Selecciona trabajador e introduce el salario.'); return }
    setGuardando(true); setApiError('')
    const t = trabajadores.find(x => x.id === form.trabajador_id)
    const datos = {
      negocio_id: negocioId, trabajador_id: form.trabajador_id, mes,
      salario_bruto: totalDevengado,
      irpf: irpfEur,
      ss_trabajador: ssTrabEur,
      ss_empresa: ssEmpEur,
      salario_neto: liquidoNeto,
      horas_semana: t?.num_pagas || 14,
    }
    let saved: Nomina
    if (editando) {
      const { error } = await supabase.from('nominas').update(datos).eq('id', editando.id)
      if (error) { setApiError(error.message); setGuardando(false); return }
      saved = { ...editando, ...datos }
      setNominas(prev => prev.map(n => n.id === editando.id ? saved : n))
    } else {
      const { data, error } = await supabase.from('nominas').insert(datos).select().single()
      if (error) { setApiError(error.message); setGuardando(false); return }
      saved = data as Nomina
      setNominas(prev => [...prev, saved])
    }
    if (conPDF) {
      await generarPDF(saved, {
        baseMensual, totalDevengado, irpfPct, irpfEur, ssTrabPct, ssTrabEur, ssEmpPct, ssEmpEur,
        anticipoNum, deduccionOtros, deduccionOtrosDesc: form.deduccion_otros_desc,
        totalDeducciones, liquidoNeto,
        compTransporte, compProductividad, compDietas, compOtros, compOtrosDesc: form.comp_otros_desc,
      })
    }
    setModal(false); setGuardando(false)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta nómina?')) return
    const { error } = await supabase.from('nominas').delete().eq('id', id)
    if (!error) setNominas(prev => prev.filter(n => n.id !== id))
  }

  async function generarPDF(n: Nomina, opts?: {
    baseMensual?: number; totalDevengado?: number
    irpfPct?: number; irpfEur?: number
    ssTrabPct?: number; ssTrabEur?: number
    ssEmpPct?: number; ssEmpEur?: number
    anticipoNum?: number; deduccionOtros?: number; deduccionOtrosDesc?: string
    totalDeducciones?: number; liquidoNeto?: number
    compTransporte?: number; compProductividad?: number
    compDietas?: number; compOtros?: number; compOtrosDesc?: string
  }) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const trab = trabajadores.find(t => t.id === n.trabajador_id)
    const mesLabel = labelMes(n.mes)
    const np = (n as any).horas_semana || 14
    const W = 210, mL = 14, mR = 196
    let y = 0

    const bruto = n.salario_bruto || 0
    const _base          = opts?.baseMensual ?? bruto
    const _devengado     = opts?.totalDevengado ?? bruto
    const _irpfPct       = opts?.irpfPct ?? (bruto > 0 ? +((n.irpf / bruto) * 100).toFixed(1) : 0)
    const _irpfEur       = opts?.irpfEur ?? n.irpf
    const _ssTrabPct     = opts?.ssTrabPct ?? (bruto > 0 ? +((n.ss_trabajador / bruto) * 100).toFixed(2) : 6.35)
    const _ssTrabEur     = opts?.ssTrabEur ?? n.ss_trabajador
    const _ssEmpPct      = opts?.ssEmpPct ?? (bruto > 0 ? +((n.ss_empresa / bruto) * 100).toFixed(2) : 31.40)
    const _ssEmpEur      = opts?.ssEmpEur ?? n.ss_empresa
    const _anticipo      = opts?.anticipoNum ?? 0
    const _dedOtros      = opts?.deduccionOtros ?? 0
    const _dedOtrosDesc  = opts?.deduccionOtrosDesc ?? ''
    const _totalDed      = opts?.totalDeducciones ?? (n.irpf + n.ss_trabajador)
    const _neto          = opts?.liquidoNeto ?? n.salario_neto
    const _cTransporte   = opts?.compTransporte ?? 0
    const _cProductividad= opts?.compProductividad ?? 0
    const _cDietas       = opts?.compDietas ?? 0
    const _cOtros        = opts?.compOtros ?? 0
    const _cOtrosDesc    = opts?.compOtrosDesc ?? ''

    // Cabecera
    doc.setFillColor(124, 58, 237); doc.rect(0, 0, W, 22, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text('Khepria', mL, 13)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('RECIBO DE SALARIO — BORRADOR ORIENTATIVO', 105, 9, { align: 'center' })
    doc.setFontSize(8)
    doc.text(mesLabel.toUpperCase(), 105, 16, { align: 'center' })
    y = 30

    // Empresa / Trabajador
    doc.setFillColor(247, 249, 252); doc.setDrawColor(229, 231, 235)
    doc.roundedRect(mL, y, 85, 32, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(153, 153, 153)
    doc.text('EMPRESA', mL + 4, y + 7)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39)
    doc.text(negocio?.nombre || '—', mL + 4, y + 15)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
    doc.text(`Período: ${mesLabel}`, mL + 4, y + 22)
    doc.text(`Nº pagas: ${np}`, mL + 4, y + 28)

    doc.setFillColor(247, 249, 252); doc.roundedRect(111, y, 85, 32, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(153, 153, 153)
    doc.text('TRABAJADOR', 115, y + 7)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39)
    doc.text(trab?.nombre || '—', 115, y + 15)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
    doc.text(`Categoría: ${trab?.especialidad || '—'}`, 115, y + 22)
    y += 42

    // Helpers
    const seccion = (titulo: string) => {
      doc.setFillColor(124, 58, 237); doc.rect(mL, y, mR - mL, 8, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.text(titulo, mL + 3, y + 5.5); doc.text('IMPORTE', mR - 3, y + 5.5, { align: 'right' })
      y += 8
    }
    const fila = (label: string, val: string, alt = false) => {
      doc.setFillColor(alt ? 250 : 255, alt ? 250 : 255, alt ? 252 : 255)
      doc.rect(mL, y, mR - mL, 8, 'F')
      doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
      doc.text(label, mL + 3, y + 5.5)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39)
      doc.text(val, mR - 3, y + 5.5, { align: 'right' })
      y += 8
    }
    const totalRow = (label: string, val: string, fg: [number,number,number], bg: [number,number,number]) => {
      doc.setFillColor(...bg); doc.rect(mL, y, mR - mL, 10, 'F')
      doc.setTextColor(...fg); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.text(label, mL + 3, y + 7); doc.text(val, mR - 3, y + 7, { align: 'right' })
      y += 14
    }

    // DEVENGOS
    seccion('DEVENGOS')
    fila(`Salario base mensual (${np} pagas)`, fmtN(_base), false)
    if (_cTransporte   > 0) fila('Plus transporte', fmtN(_cTransporte), true)
    if (_cProductividad> 0) fila('Plus productividad', fmtN(_cProductividad), false)
    if (_cDietas       > 0) fila('Dietas', fmtN(_cDietas), true)
    if (_cOtros        > 0) fila(_cOtrosDesc ? `Otros: ${_cOtrosDesc}` : 'Otros complementos', fmtN(_cOtros), false)
    totalRow('TOTAL DEVENGADO', fmtN(_devengado), [29, 78, 216], [235, 242, 255])

    // DEDUCCIONES
    seccion('DEDUCCIONES')
    fila(`Retención IRPF (${_irpfPct}%)`, fmtN(_irpfEur), false)
    fila(`SS trabajador — Contingencias comunes (${_ssTrabPct}%)`, fmtN(_ssTrabEur), true)
    if (_anticipo > 0) fila('Anticipo a cuenta', fmtN(_anticipo), false)
    if (_dedOtros > 0) fila(_dedOtrosDesc || 'Otras deducciones', fmtN(_dedOtros), true)
    totalRow('TOTAL DEDUCCIONES', fmtN(_totalDed), [220, 38, 38], [255, 235, 235])

    // LÍQUIDO
    doc.setFillColor(184, 237, 212); doc.rect(mL, y, mR - mL, 14, 'F')
    doc.setTextColor(46, 138, 94); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text('LÍQUIDO A PERCIBIR', mL + 3, y + 9)
    doc.text(fmtN(_neto), mR - 3, y + 9, { align: 'right' })
    y += 18

    // SS empresa (informativo)
    doc.setFillColor(249, 250, 251); doc.setDrawColor(229, 231, 235)
    doc.roundedRect(mL, y, mR - mL, 12, 2, 2, 'FD')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128)
    doc.text(`Cuota empresa Seguridad Social (${_ssEmpPct}%): ${fmtN(_ssEmpEur)} — No se deduce al trabajador`, mL + 4, y + 7.5)
    y += 18

    // Aviso legal
    doc.setFillColor(255, 251, 235); doc.setDrawColor(253, 211, 77)
    doc.roundedRect(mL, y, mR - mL, 16, 2, 2, 'FD')
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(146, 64, 14)
    doc.text('⚠ DOCUMENTO ORIENTATIVO', mL + 4, y + 7)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 60, 0)
    doc.text('Verifica con tu gestor o asesor laboral antes de entregar. Los porcentajes son estimaciones orientativas.', mL + 4, y + 13)
    y += 22

    // Firmas
    doc.setDrawColor(180, 180, 180)
    doc.line(mL, y + 20, mL + 72, y + 20)
    doc.line(mR - 72, y + 20, mR, y + 20)
    doc.setTextColor(120, 120, 120); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('Firma y sello empresa', mL + 36, y + 25, { align: 'center' })
    doc.text('Firma trabajador/a', mR - 36, y + 25, { align: 'center' })

    // Pie
    doc.setFillColor(247, 249, 252); doc.rect(0, 285, W, 12, 'F')
    doc.setDrawColor(229, 231, 235); doc.line(0, 285, W, 285)
    doc.setTextColor(153, 153, 153); doc.setFontSize(7)
    doc.text(`Generado con Khepria · ${new Date().toLocaleDateString('es-ES')} · Documento orientativo — verificar con gestor laboral`, 105, 292, { align: 'center' })

    doc.save(`nomina-${(trab?.nombre || 'trabajador').toLowerCase().replace(/\s+/g, '-')}-${n.mes}.pdf`)
  }

  async function enviarChat(texto?: string) {
    const msg = (texto || chatInput).trim()
    if (!msg || chatLoading) return
    setChatMsgs(prev => [...prev, { role: 'user', text: msg }])
    setChatInput('')
    setChatLoading(true)
    const prompt = `Eres un asesor laboral español experto en nóminas, Seguridad Social, IRPF y contratación. Responde en español, de forma clara y práctica, máximo 250 palabras. No uses markdown complejo.

Al finalizar cualquier respuesta sobre cálculos o importes, añade siempre: "Para cálculos oficiales consulta con tu gestor."

Pregunta: ${msg}`
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, generationConfig: { maxOutputTokens: 500, temperature: 0.4 } }),
      })
      const d = await res.json()
      setChatMsgs(prev => [...prev, { role: 'ai', text: d.text || 'Sin respuesta de la IA.' }])
    } catch {
      setChatMsgs(prev => [...prev, { role: 'ai', text: 'Error al conectar con la IA. Inténtalo de nuevo.' }])
    }
    setChatLoading(false)
  }

  function abrirContratoModal(trabId: string) {
    const t = trabajadores.find(x => x.id === trabId)
    setContratoTrabId(trabId)
    setContratoForm({
      ...CONTRATO_FORM_VACIO,
      puesto: t?.especialidad || '',
      salario_anual: t?.salario_anual ? String(t.salario_anual) : '',
    })
    setContratoModal(true)
  }

  async function generarContratoPDF() {
    const trab = trabajadores.find(x => x.id === contratoTrabId)
    if (!trab) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit:'mm', format:'a4' })
    const W=210, mL=14, mR=196
    let y=0

    const tipoLabel = TIPO_CONTRATO[contratoForm.tipo]
    const salAnual = parseFloat(contratoForm.salario_anual)||0
    const salMensual = salAnual>0 ? (salAnual/12).toFixed(2) : '—'
    const fechaInicioLabel = contratoForm.fecha_inicio
      ? new Date(contratoForm.fecha_inicio+'T12:00').toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})
      : '—'

    // ── CABECERA ──
    doc.setFillColor(124,58,237); doc.rect(0,0,W,28,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(14)
    doc.text('CONTRATO DE TRABAJO', mL, 13)
    doc.setFontSize(8); doc.setFont('helvetica','normal')
    doc.text('Generado con Khepria · khepria.app', mL, 21)
    doc.setFontSize(9); doc.setFont('helvetica','bold')
    doc.text(tipoLabel.toUpperCase(), mR, 12, {align:'right'})
    doc.setFontSize(8); doc.setFont('helvetica','normal')
    doc.text(`Art. 15 ET — ${new Date().getFullYear()}`, mR, 20, {align:'right'})
    y = 36

    // ── PARTES ──
    const seccion = (t: string) => {
      doc.setFillColor(29,78,216); doc.rect(mL,y,mR-mL,7,'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
      doc.text(t, mL+3, y+5); y+=7
    }
    const fila = (l: string, v: string, alt=false) => {
      doc.setFillColor(alt?250:255,alt?250:255,alt?252:255); doc.rect(mL,y,mR-mL,8,'F')
      doc.setDrawColor(229,231,235); doc.line(mL,y+8,mR,y+8)
      doc.setTextColor(100,116,139); doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
      doc.text(l, mL+3, y+5.5)
      doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
      doc.text(v||'—', mR-3, y+5.5, {align:'right'}); y+=8
    }

    seccion('I. IDENTIFICACIÓN DE LAS PARTES')
    fila('EMPRESA', negocio?.nombre||'—')
    fila('NIF empresa', '____________________', true)
    fila('Domicilio empresa', '____________________')
    y+=4
    fila('TRABAJADOR/A', trab.nombre, true)
    fila('DNI / NIE', contratoForm.dni||'____________________')
    fila('Domicilio trabajador/a', contratoForm.direccion||'____________________', true)
    y+=6

    seccion('II. OBJETO Y CONDICIONES DEL CONTRATO')
    fila('Modalidad contractual', tipoLabel)
    fila('Categoría / Puesto de trabajo', contratoForm.puesto||trab.especialidad||'____________________', true)
    fila('Fecha de inicio', fechaInicioLabel)
    if (contratoForm.tipo==='temporal'||contratoForm.tipo==='formacion') {
      const meses = parseInt(contratoForm.duracion_meses)||0
      fila('Duración', meses>0?`${meses} mes${meses!==1?'es':''}`:'____________________', true)
      const fin = contratoForm.fecha_inicio&&meses>0
        ? new Date(new Date(contratoForm.fecha_inicio+'T12:00').setMonth(new Date(contratoForm.fecha_inicio+'T12:00').getMonth()+meses)).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})
        : '____________________'
      fila('Fecha prevista de finalización', fin)
    }
    y+=6

    seccion('III. JORNADA Y RETRIBUCIÓN')
    fila('Jornada semanal', `${contratoForm.jornada_horas||40} horas/semana`)
    fila('Distribución horaria', 'Según cuadrante del negocio', true)
    fila('Salario bruto anual', salAnual>0?`${salAnual.toLocaleString('es-ES',{minimumFractionDigits:2})} €`:'____________________')
    fila('Salario bruto mensual', salAnual>0?`${parseFloat(salMensual).toLocaleString('es-ES',{minimumFractionDigits:2})} €`:'____________________', true)
    fila('Número de pagas', '14 (12 ordinarias + 2 extraordinarias)')
    fila('Forma de pago', 'Transferencia bancaria', true)
    y+=6

    seccion('IV. PERÍODO DE PRUEBA')
    fila('Duración del período de prueba',
      contratoForm.tipo==='formacion'?'No aplica':
      contratoForm.tipo==='temporal'?'Máximo 1 mes':
      '6 meses (técnicos titulados) / 2 meses (resto)')
    y+=6

    seccion('V. CONVENIO COLECTIVO')
    fila('Convenio aplicable', 'Según actividad principal del negocio')
    fila('Grupo profesional', '____________________', true)
    y+=6

    seccion('VI. CLÁUSULAS ADICIONALES')
    const clausulas = [
      'Ambas partes se someten a la legislación laboral española vigente y al convenio colectivo aplicable.',
      'El trabajador/a se compromete a guardar confidencialidad sobre los datos de clientes.',
      'Cualquier modificación sustancial deberá formalizarse por escrito con 15 días de preaviso.',
      'En caso de despido, se estará a lo dispuesto en el Estatuto de los Trabajadores.',
    ]
    clausulas.forEach((c, i) => {
      doc.setFillColor(i%2===0?255:250,i%2===0?255:250,i%2===0?255:252); doc.rect(mL,y,mR-mL,7,'F')
      doc.setTextColor(75,85,99); doc.setFont('helvetica','normal'); doc.setFontSize(7.5)
      doc.text(`${i+1}. ${c}`, mL+3, y+4.5, {maxWidth:mR-mL-6}); y+=7
    })
    y+=8

    // ── FIRMAS ──
    doc.setDrawColor(180,180,180)
    const midX=W/2
    doc.line(mL,y+16,mL+72,y+16); doc.line(midX+8,y+16,mR,y+16)
    doc.setTextColor(120,120,120); doc.setFont('helvetica','normal'); doc.setFontSize(8)
    doc.text(`Empresa: ${negocio?.nombre||''}`, mL+36, y+21, {align:'center'})
    doc.text(`Trabajador/a: ${trab.nombre}`, midX+8+36, y+21, {align:'center'})
    y+=28

    // ── AVISO LEGAL ──
    doc.setFillColor(255,251,235); doc.setDrawColor(253,230,138)
    doc.roundedRect(mL,y,mR-mL,16,3,3,'FD')
    doc.setTextColor(146,64,14); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
    doc.text('⚠  AVISO LEGAL', mL+4, y+7)
    doc.setFont('helvetica','normal')
    doc.text('Documento orientativo generado con Khepria. Debe ser revisado y firmado por un gestor laboral antes de su entrega.', mL+4, y+13)

    // ── PIE ──
    doc.setFillColor(247,249,252); doc.rect(0,285,W,12,'F')
    doc.setTextColor(153,153,153); doc.setFontSize(7)
    doc.text(`Generado con Khepria · ${tipoLabel} · ${trab.nombre} · ${new Date().toLocaleDateString('es-ES')}`, 105, 292, {align:'center'})

    doc.save(`contrato-${(trab.nombre).toLowerCase().replace(/\s+/g,'-')}-${contratoForm.tipo}.pdf`)
    setContratoModal(false)
  }

  const totalBruto = nominas.reduce((s, n) => s + n.salario_bruto, 0)
  const totalNeto  = nominas.reduce((s, n) => s + n.salario_neto, 0)

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #F7F9FC; --white: #FFFFFF; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2); --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2); --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08); }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .page-title { font-size: clamp(18px,4vw,22px); font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .page-sub { font-size: 14px; color: var(--muted); margin-top: 2px; }
        .mes-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .mes-input { padding: 9px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; }
        .mes-input:focus { border-color: var(--blue-dark); }
        .btn-nuevo { background: var(--text); color: white; border: none; padding: 10px 18px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .aviso-legal { background: #FFF7ED; border: 1.5px solid #FED7AA; border-radius: 14px; padding: 14px 18px; margin-bottom: 22px; display: flex; gap: 12px; align-items: flex-start; }
        .aviso-icon { font-size: 22px; flex-shrink: 0; line-height: 1; }
        .aviso-title { font-size: 14px; font-weight: 800; color: #92400E; margin-bottom: 4px; }
        .aviso-text { font-size: 13px; color: #78350F; line-height: 1.6; }
        .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .res-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 16px 20px; }
        .res-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .res-val { font-size: clamp(16px,4vw,22px); font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
        .res-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
        .nominas-grid { display: grid; gap: 12px; }
        .nomina-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--blue-soft); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; overflow: hidden; }
        .trab-name { font-size: 15px; font-weight: 700; color: var(--text); }
        .trab-rol { font-size: 12px; color: var(--muted); }
        .nomina-sal { margin-left: auto; text-align: right; }
        .sal-bruto { font-size: 12px; color: var(--muted); margin-bottom: 2px; }
        .sal-neto { font-size: 18px; font-weight: 800; color: var(--green-dark); }
        .sal-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }
        .nomina-btns { display: flex; gap: 6px; flex-shrink: 0; }
        .btn-icon { background: var(--bg); border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
        .btn-icon:hover { background: rgba(0,0,0,0.08); }
        .btn-pdf { padding: 7px 12px; background: var(--text); color: white; border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
        .modal { background: white; border-radius: 20px; padding: 28px; width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto; }
        .modal-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 16px; }
        .section-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
        .field { margin-bottom: 12px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 5px; }
        .field input, .field select { width: 100%; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; -webkit-appearance: none; }
        .field input:focus, .field select:focus { border-color: var(--blue-dark); }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .grid2-calc { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }
        .calc-result { font-size: 13px; color: var(--text2); padding-bottom: 11px; white-space: nowrap; }
        .desglose-devengado { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        .desglose-neto { background: #F0FDF4; border: 1px solid #A7F3D0; border-radius: 12px; padding: 14px 16px; margin: 12px 0; }
        .desglose-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .desglose-total { display: flex; justify-content: space-between; padding-top: 10px; margin-top: 8px; border-top: 1px solid #A7F3D0; }
        .modal-btns { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
        .btn-primary { flex: 1; min-width: 120px; padding: 11px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-pdf-modal { flex: 1; min-width: 140px; padding: 11px; background: #1D4ED8; color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-pdf-modal:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-secondary { flex: 1; min-width: 100px; padding: 11px; background: transparent; color: var(--text2); border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .error-msg { background: rgba(254,226,226,0.5); color: #DC2626; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-top: 10px; }
        .empty { text-align: center; padding: 52px 20px; background: var(--white); border: 1px solid var(--border); border-radius: 16px; color: var(--muted); font-size: 14px; }
        .chat-wrap { margin-top: 28px; background: white; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .chat-head { padding: 16px 20px; border-bottom: 1px solid var(--border); background: linear-gradient(135deg,rgba(212,197,249,0.12),rgba(184,216,248,0.12)); }
        .chat-title { font-size: 15px; font-weight: 800; color: var(--text); }
        .chat-sub { font-size: 13px; color: var(--muted); margin-top: 2px; }
        .chat-faq { padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid var(--border); }
        .faq-btn { padding: 6px 12px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 100px; font-family: inherit; font-size: 12px; font-weight: 600; color: var(--text2); cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .faq-btn:hover { background: rgba(212,197,249,0.2); border-color: rgba(167,139,250,0.4); color: #5B21B6; }
        .chat-msgs { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto; }
        .chat-input-row { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px; }
        .chat-input { flex: 1; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: var(--bg); }
        .chat-input:focus { border-color: var(--blue-dark); }
        .chat-send { padding: 11px 18px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .contratos-section { margin-top: 28px; }
        .contratos-grid { display: grid; gap: 10px; }
        .contrato-worker-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
        .btn-contrato { padding: 7px 14px; background: #1D4ED8; color: white; border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .btn-contrato:hover { background: #1e40af; }
        @media (max-width: 768px) {
          .resumen { grid-template-columns: 1fr 1fr; }
          .grid2 { grid-template-columns: 1fr; }
          .chat-faq { display: none; }
        }
        @media (max-width: 480px) {
          .resumen { grid-template-columns: 1fr; }
          .modal { max-width: calc(100vw - 24px) !important; padding: 18px !important; }
          .modal-btns { flex-direction: column; }
        }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Nóminas</div>
          <div className="page-sub">Borradores orientativos · edita, calcula y descarga PDF</div>
        </div>
        <button className="btn-nuevo" onClick={() => abrirModal()} disabled={trabajadores.length === 0}>
          + Nueva nómina
        </button>
      </div>

      {/* Aviso legal prominente */}
      <div className="aviso-legal">
        <span className="aviso-icon">⚠️</span>
        <div>
          <div className="aviso-title">Documento orientativo — Verifica con tu gestor antes de entregar.</div>
          <div className="aviso-text">Los porcentajes de IRPF y Seguridad Social son estimativos. Edita todos los campos antes de imprimir y revisa con tu asesor laboral.</div>
        </div>
      </div>

      {cargando ? (
        <div style={{textAlign:'center', padding:'60px', color:'var(--muted)'}}>Cargando...</div>
      ) : (
        <>
          {/* Selector de mes */}
          <div className="mes-row">
            <label style={{fontSize:'13px', fontWeight:600, color:'var(--text2)'}}>Mes:</label>
            <input type="month" className="mes-input" value={mes.slice(0, 7)} onChange={e => setMes(e.target.value + '-01')} />
            <span style={{fontSize:'13px', color:'var(--muted)'}}>{nominas.length} nómina{nominas.length !== 1 ? 's' : ''} · {labelMes(mes)}</span>
          </div>

          {/* KPIs */}
          {nominas.length > 0 && (
            <div className="resumen">
              <div className="res-card">
                <div className="res-label">Masa salarial bruta</div>
                <div className="res-val">{fmtEur(totalBruto)}</div>
                <div className="res-sub">{nominas.length} trabajador{nominas.length !== 1 ? 'es' : ''}</div>
              </div>
              <div className="res-card">
                <div className="res-label">Líquido total neto</div>
                <div className="res-val" style={{color:'var(--green-dark)'}}>{fmtEur(totalNeto)}</div>
                <div className="res-sub">suma netos estimados</div>
              </div>
              <div className="res-card">
                <div className="res-label">Salario medio bruto</div>
                <div className="res-val">{nominas.length > 0 ? fmtEur(+(totalBruto / nominas.length).toFixed(2)) : '—'}</div>
                <div className="res-sub">por trabajador</div>
              </div>
            </div>
          )}

          {/* Lista */}
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
              Pulsa "+ Nueva nómina" para añadir un borrador editable.
            </div>
          ) : (
            <div className="nominas-grid">
              {nominas.map(n => {
                const trab = trabajadores.find(t => t.id === n.trabajador_id)
                const np = (n as any).horas_semana || 14
                const irpfPctCard = n.salario_bruto > 0 ? +((n.irpf / n.salario_bruto) * 100).toFixed(1) : 0
                const ssTrabPctCard = n.salario_bruto > 0 ? +((n.ss_trabajador / n.salario_bruto) * 100).toFixed(1) : 0
                return (
                  <div key={n.id} className="nomina-card">
                    <div className="avatar">
                      {trab?.foto_url
                        ? <img src={trab.foto_url} alt={trab.nombre} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        : '👤'}
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div className="trab-name">{trab?.nombre || 'Trabajador'}</div>
                      <div className="trab-rol">{trab?.especialidad || ''}</div>
                      <div style={{fontSize:11, color:'var(--muted)', marginTop:2}}>
                        IRPF {irpfPctCard}% · SS {ssTrabPctCard}% · {np} pagas
                      </div>
                    </div>
                    <div className="nomina-sal">
                      <div className="sal-bruto">Bruto: {fmtEur(n.salario_bruto)}</div>
                      <div className="sal-neto">{fmtEur(n.salario_neto)}</div>
                      <div className="sal-sub">neto estimado</div>
                    </div>
                    <div className="nomina-btns">
                      <button className="btn-pdf" onClick={() => generarPDF(n)}>📄 PDF</button>
                      <button className="btn-icon" onClick={() => abrirModal(n)} title="Editar">✏️</button>
                      <button className="btn-icon" onClick={() => eliminar(n.id)} title="Eliminar">🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Contratos laborales */}
          <div className="contratos-section">
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
              <div>
                <div style={{fontSize:16, fontWeight:800, color:'var(--text)'}}>Contratos laborales</div>
                <div style={{fontSize:13, color:'var(--muted)', marginTop:2}}>Genera contratos SEPE en PDF para cada trabajador</div>
              </div>
            </div>
            {trabajadores.length === 0 ? (
              <div className="empty">
                <div style={{fontSize:36, marginBottom:10}}>📋</div>
                <div style={{fontWeight:700, color:'var(--text)', marginBottom:6}}>Sin trabajadores</div>
                Añade trabajadores en la sección Equipo para generar contratos.
              </div>
            ) : (
              <div className="contratos-grid">
                {trabajadores.map(t => (
                  <div key={t.id} className="contrato-worker-card">
                    <div className="avatar">
                      {t.foto_url
                        ? <img src={t.foto_url} alt={t.nombre} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        : '👤'}
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:15, fontWeight:700, color:'var(--text)'}}>{t.nombre}</div>
                      <div style={{fontSize:12, color:'var(--muted)'}}>{t.especialidad || 'Sin especialidad'}</div>
                      {t.salario_anual && (
                        <div style={{fontSize:12, color:'var(--text2)', marginTop:2}}>{fmtEur(t.salario_anual)} / año</div>
                      )}
                    </div>
                    <button className="btn-contrato" onClick={() => abrirContratoModal(t.id)}>
                      📝 Generar contrato
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat IA */}
          <div className="chat-wrap">
            <div className="chat-head">
              <div className="chat-title">✨ Asesor laboral IA</div>
              <div className="chat-sub">Preguntas frecuentes sobre contratos, SS, IRPF y bonificaciones</div>
            </div>
            <div className="chat-faq">
              {FAQ_SUGERENCIAS.map(q => (
                <button key={q} className="faq-btn" onClick={() => enviarChat(q)}>{q}</button>
              ))}
            </div>
            {chatMsgs.length > 0 && (
              <div className="chat-msgs">
                {chatMsgs.map((m, i) => (
                  <div key={i} style={{display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'}}>
                    <div style={{
                      maxWidth:'82%', padding:'10px 14px',
                      borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: m.role === 'user' ? '#111827' : 'rgba(212,197,249,0.18)',
                      color: m.role === 'user' ? 'white' : 'var(--text)',
                      fontSize:'13px', lineHeight:'1.6', whiteSpace:'pre-wrap'
                    }}>{m.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{display:'flex', justifyContent:'flex-start'}}>
                    <div style={{padding:'10px 14px', borderRadius:'14px 14px 14px 4px', background:'rgba(212,197,249,0.18)', fontSize:'13px', color:'var(--muted)'}}>
                      Pensando...
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="chat-input-row">
              <input type="text" className="chat-input" placeholder="¿Cuánto cuesta contratar? ¿Qué bonificaciones hay?..."
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChat()} />
              <button className="chat-send" onClick={() => enviarChat()} disabled={chatLoading || !chatInput.trim()}>Enviar</button>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL NÓMINA ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">{editando ? 'Editar nómina' : 'Nueva nómina'} — {labelMes(mes)}</div>

            {/* Aviso en modal */}
            <div style={{background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#92400E', marginBottom:14, lineHeight:1.5}}>
              ⚠️ <strong>Documento orientativo.</strong> Verifica con tu gestor antes de entregar.
            </div>

            {/* Trabajador */}
            <div className="field">
              <label>Trabajador *</label>
              <select value={form.trabajador_id} onChange={e => {
                const tid = e.target.value
                setForm(f => ({ ...f, trabajador_id: tid, ...workerData(tid) }))
              }}>
                {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.especialidad ? ` — ${t.especialidad}` : ''}</option>)}
              </select>
            </div>

            {/* DEVENGOS */}
            <div className="section-label">💰 Devengos</div>
            <div className="field">
              <label>Salario base mensual (€) *</label>
              <input type="number" step="0.01" min="0" placeholder="Ej: 1500" value={form.salario_mensual}
                onChange={e => setForm(f => ({...f, salario_mensual:e.target.value}))} />
            </div>
            <div className="grid2">
              <div className="field">
                <label>Plus transporte (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.comp_transporte}
                  onChange={e => setForm(f => ({...f, comp_transporte:e.target.value}))} />
              </div>
              <div className="field">
                <label>Plus productividad (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.comp_productividad}
                  onChange={e => setForm(f => ({...f, comp_productividad:e.target.value}))} />
              </div>
              <div className="field">
                <label>Dietas (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.comp_dietas}
                  onChange={e => setForm(f => ({...f, comp_dietas:e.target.value}))} />
              </div>
              <div className="field">
                <label>Otros complementos (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.comp_otros}
                  onChange={e => setForm(f => ({...f, comp_otros:e.target.value}))} />
              </div>
            </div>
            {parseFloat(form.comp_otros) > 0 && (
              <div className="field">
                <label>Descripción otros complementos</label>
                <input type="text" placeholder="Ej: plus nocturnidad" value={form.comp_otros_desc}
                  onChange={e => setForm(f => ({...f, comp_otros_desc:e.target.value}))} />
              </div>
            )}

            {baseMensual > 0 && (
              <div className="desglose-devengado">
                <span style={{fontSize:13, fontWeight:700, color:'#1D4ED8'}}>Total devengado</span>
                <strong style={{fontSize:16, color:'#1D4ED8'}}>{fmtEur(totalDevengado)}</strong>
              </div>
            )}

            {/* DEDUCCIONES */}
            <div className="section-label">📉 Deducciones</div>
            <div className="grid2">
              <div className="field">
                <label>IRPF %</label>
                <input type="number" step="0.01" min="0" max="50" placeholder="Ej: 15.00" value={form.irpf_pct}
                  onChange={e => setForm(f => ({...f, irpf_pct:e.target.value}))} />
              </div>
              <div style={{display:'flex', alignItems:'flex-end', paddingBottom:12}}>
                <span style={{fontSize:13, color:'var(--text2)', fontWeight:600}}>→ {fmtEur(irpfEur)}</span>
              </div>
              <div className="field">
                <label>SS trabajador %</label>
                <input type="number" step="0.01" min="0" max="20" value={form.ss_trab_pct}
                  onChange={e => setForm(f => ({...f, ss_trab_pct:e.target.value}))} />
              </div>
              <div style={{display:'flex', alignItems:'flex-end', paddingBottom:12}}>
                <span style={{fontSize:13, color:'var(--text2)', fontWeight:600}}>→ {fmtEur(ssTrabEur)}</span>
              </div>
              <div className="field">
                <label>SS empresa % <span style={{fontWeight:400, color:'var(--muted)'}}>· informativo</span></label>
                <input type="number" step="0.01" min="0" max="50" value={form.ss_emp_pct}
                  onChange={e => setForm(f => ({...f, ss_emp_pct:e.target.value}))} />
              </div>
              <div style={{display:'flex', alignItems:'flex-end', paddingBottom:12}}>
                <span style={{fontSize:13, color:'var(--muted)', fontWeight:600}}>→ {fmtEur(ssEmpEur)}</span>
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Anticipo (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.anticipo}
                  onChange={e => setForm(f => ({...f, anticipo:e.target.value}))} />
              </div>
              <div className="field">
                <label>Otras deducciones (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.deduccion_otros}
                  onChange={e => setForm(f => ({...f, deduccion_otros:e.target.value}))} />
              </div>
            </div>
            {parseFloat(form.deduccion_otros) > 0 && (
              <div className="field">
                <label>Descripción otras deducciones</label>
                <input type="text" placeholder="Ej: embargo, préstamo..." value={form.deduccion_otros_desc}
                  onChange={e => setForm(f => ({...f, deduccion_otros_desc:e.target.value}))} />
              </div>
            )}

            {/* RESULTADO EN VIVO */}
            {baseMensual > 0 && (
              <div className="desglose-neto">
                <div className="desglose-row">
                  <span style={{color:'#6B7280'}}>Total devengado</span>
                  <span style={{fontWeight:600}}>{fmtEur(totalDevengado)}</span>
                </div>
                <div className="desglose-row">
                  <span style={{color:'#6B7280'}}>Total deducciones</span>
                  <span style={{fontWeight:600, color:'#DC2626'}}>−{fmtEur(totalDeducciones)}</span>
                </div>
                <div className="desglose-total">
                  <span style={{color:'#065F46', fontWeight:800, fontSize:14}}>Líquido neto</span>
                  <strong style={{color:'#065F46', fontSize:22}}>{fmtEur(liquidoNeto)}</strong>
                </div>
              </div>
            )}

            {apiError && <div className="error-msg">{apiError}</div>}
            <div className="modal-btns">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={() => guardar(false)} disabled={guardando || baseMensual <= 0}>
                {guardando ? 'Guardando...' : '💾 Guardar'}
              </button>
              <button className="btn-pdf-modal" onClick={() => guardar(true)} disabled={guardando || baseMensual <= 0}>
                {guardando ? 'Generando...' : '📄 Guardar y PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL CONTRATO ── */}
      {contratoModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setContratoModal(false) }}>
          <div className="modal">
            <div className="modal-title">📝 Generar contrato SEPE</div>
            <div style={{background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#1D4ED8', marginBottom:14}}>
              Trabajador: <strong>{trabajadores.find(x => x.id === contratoTrabId)?.nombre}</strong>
            </div>

            <div className="field">
              <label>Tipo de contrato *</label>
              <select value={contratoForm.tipo} onChange={e => setContratoForm(f => ({...f, tipo: e.target.value as ContratoForm['tipo']}))}>
                <option value="indefinido">Contrato indefinido ordinario</option>
                <option value="temporal">Contrato de duración determinada</option>
                <option value="parcial">Contrato a tiempo parcial indefinido</option>
                <option value="formacion">Contrato de formación en alternancia</option>
              </select>
            </div>

            <div className="section-label">👤 Datos del trabajador/a</div>
            <div className="grid2">
              <div className="field">
                <label>DNI / NIE</label>
                <input type="text" placeholder="12345678A" value={contratoForm.dni}
                  onChange={e => setContratoForm(f => ({...f, dni: e.target.value}))} />
              </div>
              <div className="field">
                <label>Puesto / Categoría</label>
                <input type="text" placeholder="Ej: Esteticista" value={contratoForm.puesto}
                  onChange={e => setContratoForm(f => ({...f, puesto: e.target.value}))} />
              </div>
            </div>
            <div className="field">
              <label>Dirección trabajador/a</label>
              <input type="text" placeholder="Calle, número, ciudad" value={contratoForm.direccion}
                onChange={e => setContratoForm(f => ({...f, direccion: e.target.value}))} />
            </div>

            <div className="section-label">📅 Condiciones laborales</div>
            <div className="grid2">
              <div className="field">
                <label>Fecha de inicio</label>
                <input type="date" value={contratoForm.fecha_inicio}
                  onChange={e => setContratoForm(f => ({...f, fecha_inicio: e.target.value}))} />
              </div>
              <div className="field">
                <label>Jornada semanal (horas)</label>
                <input type="number" min="1" max="40" placeholder="40" value={contratoForm.jornada_horas}
                  onChange={e => setContratoForm(f => ({...f, jornada_horas: e.target.value}))} />
              </div>
              <div className="field">
                <label>Salario bruto anual (€)</label>
                <input type="number" step="0.01" min="0" placeholder="Ej: 20000" value={contratoForm.salario_anual}
                  onChange={e => setContratoForm(f => ({...f, salario_anual: e.target.value}))} />
              </div>
              {(contratoForm.tipo === 'temporal' || contratoForm.tipo === 'formacion') && (
                <div className="field">
                  <label>Duración (meses)</label>
                  <input type="number" min="1" max="36" placeholder="Ej: 6" value={contratoForm.duracion_meses}
                    onChange={e => setContratoForm(f => ({...f, duracion_meses: e.target.value}))} />
                </div>
              )}
            </div>

            <div style={{background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#92400E', marginTop:8}}>
              ⚠️ <strong>Documento orientativo.</strong> Revisa y firma con un gestor laboral antes de entregar.
            </div>

            <div className="modal-btns">
              <button className="btn-secondary" onClick={() => setContratoModal(false)}>Cancelar</button>
              <button className="btn-pdf-modal" onClick={generarContratoPDF}>📄 Generar contrato PDF</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
