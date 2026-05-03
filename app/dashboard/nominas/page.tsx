'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

type Trabajador = { id: string; nombre: string; especialidad: string; foto_url: string | null }
type Nomina = {
  id: string; trabajador_id: string; mes: string
  salario_bruto: number; irpf: number; ss_trabajador: number; ss_empresa: number
  salario_neto: number; tipo_contrato?: string; horas_semana?: number
}

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function labelMes(iso: string) {
  return new Date(iso + 'T12:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}
function fmtEur(n: number) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) }

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

  // Form nueva nómina
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Nomina | null>(null)
  const [form, setForm] = useState({ trabajador_id: '', salario_anual: '', num_pagas: '14', num_pagas_custom: '' })
  const [guardando, setGuardando] = useState(false)
  const [apiError, setApiError] = useState('')

  // Chat IA laboral
  type ChatMsg = { role: 'user' | 'ai'; text: string }
  const [chatInput, setChatInput] = useState('')
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const { activo, todos } = await getNegocioActivo(session.user.id, session.access_token)
      if (!activo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todos); setNegocio(activo); setNegocioId(activo.id)
      const { data: tr } = await db.from('trabajadores').select('id,nombre,especialidad,foto_url').eq('negocio_id', activo.id).eq('activo', true).order('nombre')
      setTrabajadores(tr || [])
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

  // Derived values for the form
  const pagas = form.num_pagas === 'custom' ? parseInt(form.num_pagas_custom) || 14 : parseInt(form.num_pagas) || 14
  const anual = parseFloat(form.salario_anual) || 0
  const mensual = pagas > 0 && anual > 0 ? +(anual / pagas).toFixed(2) : 0

  function abrirModal(n?: Nomina) {
    if (n) {
      setEditando(n)
      // horas_semana was repurposed as num_pagas
      const np = (n as any).horas_semana || 14
      setForm({ trabajador_id: n.trabajador_id, salario_anual: String(+(n.salario_bruto * np).toFixed(2)), num_pagas: String(np), num_pagas_custom: '' })
    } else {
      setEditando(null)
      setForm({ trabajador_id: trabajadores[0]?.id || '', salario_anual: '', num_pagas: '14', num_pagas_custom: '' })
    }
    setApiError(''); setModal(true)
  }

  async function guardar() {
    if (!form.trabajador_id || !form.salario_anual) { setApiError('Selecciona trabajador e introduce el salario.'); return }
    if (mensual <= 0) { setApiError('El salario debe ser mayor que 0.'); return }
    setGuardando(true); setApiError('')
    const datos = {
      negocio_id: negocioId, trabajador_id: form.trabajador_id, mes,
      salario_bruto: mensual, irpf: 0, ss_trabajador: 0, ss_empresa: 0,
      salario_neto: mensual, horas_semana: pagas,
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

  async function generarPDF(n: Nomina) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const trab = trabajadores.find(t => t.id === n.trabajador_id)
    const mesLabel = labelMes(n.mes)
    const numPagas = (n as any).horas_semana || 14
    const f = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
    const W = 210, mL = 14, mR = 196
    let y = 0

    // Cabecera
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, 22, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text('KHEPRIA', mL, 13)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('RECIBO DE SALARIO — BORRADOR ORIENTATIVO', 105, 9, { align: 'center' })
    doc.setFontSize(8)
    doc.text(mesLabel.toUpperCase(), 105, 16, { align: 'center' })
    y = 30

    // Empresa / trabajador
    doc.setFillColor(247, 249, 252); doc.setDrawColor(229, 231, 235)
    doc.roundedRect(mL, y, 85, 32, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(153, 153, 153)
    doc.text('EMPRESA', mL + 4, y + 7)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39)
    doc.text(negocio?.nombre || '—', mL + 4, y + 15)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
    doc.text(`Período: ${mesLabel}`, mL + 4, y + 22)
    doc.text('CIF/NIF: ________________', mL + 4, y + 28)

    doc.setFillColor(247, 249, 252); doc.roundedRect(111, y, 85, 32, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(153, 153, 153)
    doc.text('TRABAJADOR', 115, y + 7)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39)
    doc.text(trab?.nombre || '—', 115, y + 15)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
    doc.text(`DNI: ________________`, 115, y + 22)
    doc.text(`Nº afiliación SS: ________________`, 115, y + 28)
    y += 42

    // Devengos
    doc.setFillColor(17, 24, 39); doc.rect(mL, y, mR - mL, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text('DEVENGOS', mL + 3, y + 5.5)
    doc.text('IMPORTE', mR - 3, y + 5.5, { align: 'right' })
    y += 8

    const devengos = [
      [`Salario base mensual (${numPagas} pagas)`, f(n.salario_bruto)],
      ['Complementos salariales', '_______________'],
      ['Pagas extraordinarias (prorrateadas)', '_______________'],
      ['Horas extraordinarias', '_______________'],
    ]
    devengos.forEach(([label, val], i) => {
      doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252)
      doc.rect(mL, y, mR - mL, 9, 'F')
      doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text(label, mL + 3, y + 6)
      doc.setFont('helvetica', 'bold')
      doc.text(val, mR - 3, y + 6, { align: 'right' })
      y += 9
    })
    doc.setFillColor(235, 242, 255); doc.rect(mL, y, mR - mL, 10, 'F')
    doc.setTextColor(29, 78, 216); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('TOTAL DEVENGADO', mL + 3, y + 7); doc.text(f(n.salario_bruto), mR - 3, y + 7, { align: 'right' })
    y += 16

    // Deducciones (en blanco)
    doc.setFillColor(17, 24, 39); doc.rect(mL, y, mR - mL, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text('DEDUCCIONES — A COMPLETAR POR GESTOR/ASESOR LABORAL', mL + 3, y + 5.5)
    y += 8

    const deducciones = [
      'Retención IRPF (____ %)',
      'Cotización SS trabajador — Contingencias comunes (____ %)',
      'Cotización SS trabajador — Desempleo (____ %)',
      'Cotización SS trabajador — Formación profesional (____ %)',
    ]
    deducciones.forEach((label, i) => {
      doc.setFillColor(255, 252, 240)
      doc.rect(mL, y, mR - mL, 9, 'F')
      doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text(label, mL + 3, y + 6)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(153, 153, 153)
      doc.text('_______________', mR - 3, y + 6, { align: 'right' })
      y += 9
    })
    doc.setFillColor(184, 237, 212); doc.rect(mL, y, mR - mL, 11, 'F')
    doc.setTextColor(46, 138, 94); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('LÍQUIDO A PERCIBIR (pendiente de calcular)', mL + 3, y + 7.5)
    doc.text('_______________', mR - 3, y + 7.5, { align: 'right' })
    y += 18

    // Aviso legal
    doc.setFillColor(255, 251, 235); doc.setDrawColor(253, 211, 77)
    doc.roundedRect(mL, y, mR - mL, 22, 3, 3, 'FD')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(146, 64, 14)
    doc.text('⚠ AVISO IMPORTANTE', mL + 4, y + 8)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 60, 0)
    const avisoLines = doc.splitTextToSize(
      'Este documento es ORIENTATIVO. Los campos de IRPF y Seguridad Social deben ser calculados y supervisados por tu gestor o asesor laboral. Por seguridad y privacidad, Khepria no realiza estos cálculos automáticamente. Documento orientativo — revisar con gestor.',
      mR - mL - 8
    )
    avisoLines.forEach((line: string, i: number) => doc.text(line, mL + 4, y + 15 + i * 5))
    y += 30

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
    doc.text(`Generado con Khepria · ${new Date().toLocaleDateString('es-ES')} · Documento orientativo — revisar con gestor laboral`, 105, 292, { align: 'center' })

    doc.save(`nomina-borrador-${(trab?.nombre || 'trabajador').toLowerCase().replace(/\s+/g, '-')}-${n.mes}.pdf`)
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
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) throw new Error('API key no disponible')
      const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
      let respuesta = ''
      for (const model of models) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 500, temperature: 0.4 } }) }
        )
        if (!res.ok) continue
        const d = await res.json()
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) { respuesta = text; break }
      }
      setChatMsgs(prev => [...prev, { role: 'ai', text: respuesta || 'Sin respuesta de la IA.' }])
    } catch {
      setChatMsgs(prev => [...prev, { role: 'ai', text: 'Error al conectar con la IA. Inténtalo de nuevo.' }])
    }
    setChatLoading(false)
  }

  const totalBruto = nominas.reduce((s, n) => s + n.salario_bruto, 0)

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #F7F9FC; --white: #FFFFFF; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2); --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2); --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08); }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .content { padding: 24px 28px; flex: 1; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .page-sub { font-size: 14px; color: var(--muted); margin-top: 2px; }
        .mes-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .mes-input { padding: 9px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; }
        .mes-input:focus { border-color: var(--blue-dark); }
        .btn-nuevo { background: var(--text); color: white; border: none; padding: 10px 18px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        /* Aviso */
        .aviso-legal { background: #FFF7ED; border: 1.5px solid #FED7AA; border-radius: 14px; padding: 14px 18px; margin-bottom: 22px; display: flex; gap: 12px; align-items: flex-start; }
        .aviso-icon { font-size: 22px; flex-shrink: 0; line-height: 1; }
        .aviso-title { font-size: 14px; font-weight: 800; color: #92400E; margin-bottom: 4px; }
        .aviso-text { font-size: 13px; color: #78350F; line-height: 1.6; }
        /* KPIs */
        .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .res-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 16px 20px; }
        .res-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .res-val { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
        .res-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
        /* Cards */
        .nominas-grid { display: grid; gap: 12px; }
        .nomina-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--blue-soft); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; overflow: hidden; }
        .trab-name { font-size: 15px; font-weight: 700; color: var(--text); }
        .trab-rol { font-size: 12px; color: var(--muted); }
        .nomina-sal { margin-left: auto; text-align: right; }
        .sal-label { font-size: 11px; color: var(--muted); }
        .sal-val { font-size: 18px; font-weight: 800; color: var(--text); }
        .sal-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }
        .nomina-btns { display: flex; gap: 6px; flex-shrink: 0; }
        .btn-icon { background: var(--bg); border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
        .btn-icon:hover { background: rgba(0,0,0,0.08); }
        .btn-pdf { padding: 7px 12px; background: var(--text); color: white; border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
        .modal { background: white; border-radius: 20px; padding: 28px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 20px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .field input, .field select { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; -webkit-appearance: none; }
        .field input:focus, .field select:focus { border-color: var(--blue-dark); }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .desglose-box { background: #F0FDF4; border: 1px solid #A7F3D0; border-radius: 12px; padding: 12px 14px; margin: 12px 0; }
        .desglose-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .modal-btns { display: flex; gap: 10px; margin-top: 20px; }
        .btn-primary { flex: 1; padding: 12px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-secondary { flex: 1; padding: 12px; background: transparent; color: var(--text2); border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
        .error-msg { background: rgba(254,226,226,0.5); color: #DC2626; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-top: 10px; }
        .empty { text-align: center; padding: 52px 20px; background: var(--white); border: 1px solid var(--border); border-radius: 16px; color: var(--muted); font-size: 14px; }
        /* Chat */
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
        @media (max-width: 768px) {
          .content { padding: 16px; }
          .resumen { grid-template-columns: 1fr 1fr; }
          .grid2 { grid-template-columns: 1fr; }
          .nomina-card { flex-wrap: wrap; }
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
          <div className="page-sub">Borradores orientativos · IRPF y SS con tu gestor</div>
        </div>
        <button className="btn-nuevo" onClick={() => abrirModal()} disabled={trabajadores.length === 0}>
          + Nueva nómina
        </button>
      </div>

      {/* Aviso legal prominente */}
      <div className="aviso-legal">
        <span className="aviso-icon">⚠️</span>
        <div>
          <div className="aviso-title">Por seguridad y privacidad, los cálculos de IRPF y Seguridad Social no se realizan automáticamente.</div>
          <div className="aviso-text">Estos valores deben ser calculados y supervisados por tu gestor o asesor laboral. Los PDFs generados son borradores orientativos con los campos de deducciones en blanco para que los complete tu gestor.</div>
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
                <div className="res-label">Salario medio/mes</div>
                <div className="res-val">{nominas.length > 0 ? fmtEur(+(totalBruto / nominas.length).toFixed(2)) : '—'}</div>
                <div className="res-sub">por trabajador</div>
              </div>
              <div className="res-card">
                <div className="res-label">IRPF + SS</div>
                <div className="res-val" style={{color:'var(--muted)'}}>— pendiente</div>
                <div className="res-sub">Consultar con gestor</div>
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
              Pulsa "+ Nueva nómina" para añadir un borrador de nómina.
            </div>
          ) : (
            <div className="nominas-grid">
              {nominas.map(n => {
                const trab = trabajadores.find(t => t.id === n.trabajador_id)
                const np = (n as any).horas_semana || 14
                return (
                  <div key={n.id} className="nomina-card">
                    <div className="avatar">
                      {trab?.foto_url
                        ? <img src={trab.foto_url} alt={trab.nombre} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        : '👤'}
                    </div>
                    <div>
                      <div className="trab-name">{trab?.nombre || 'Trabajador'}</div>
                      <div className="trab-rol">{trab?.especialidad || ''}</div>
                    </div>
                    <div className="nomina-sal">
                      <div className="sal-label">Salario bruto</div>
                      <div className="sal-val">{fmtEur(n.salario_bruto)}</div>
                      <div className="sal-sub">{np} pagas · {fmtEur(+(n.salario_bruto * np).toFixed(2))}/año</div>
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

          {/* Asesor IA laboral */}
          <div className="chat-wrap">
            <div className="chat-head">
              <div className="chat-title">✨ Asesor laboral IA</div>
              <div className="chat-sub">Preguntas frecuentes sobre contratos, SS, IRPF y bonificaciones</div>
            </div>

            {/* Sugerencias FAQ */}
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
              <input
                type="text"
                className="chat-input"
                placeholder="¿Cuánto cuesta contratar? ¿Qué bonificaciones hay?..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChat()}
              />
              <button className="chat-send" onClick={() => enviarChat()} disabled={chatLoading || !chatInput.trim()}>
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
            <div className="modal-title">{editando ? 'Editar nómina' : 'Nueva nómina'} — {labelMes(mes)}</div>

            <div style={{background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#92400E', marginBottom:16, lineHeight:1.5}}>
              ⚠️ Introduce el salario anual acordado. Los cálculos de IRPF y SS los completará tu gestor en el PDF generado.
            </div>

            <div className="field">
              <label>Trabajador *</label>
              <select value={form.trabajador_id} onChange={e => setForm({...form, trabajador_id: e.target.value})}>
                {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.especialidad ? ` — ${t.especialidad}` : ''}</option>)}
              </select>
            </div>

            <div className="grid2">
              <div className="field">
                <label>Salario bruto ANUAL (€) *</label>
                <input type="number" placeholder="Ej: 20000" min="0" step="0.01" value={form.salario_anual} onChange={e => setForm({...form, salario_anual: e.target.value})} />
              </div>
              <div className="field">
                <label>Número de pagas</label>
                <select value={form.num_pagas} onChange={e => setForm({...form, num_pagas: e.target.value})}>
                  <option value="12">12 pagas</option>
                  <option value="14">14 pagas</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
            </div>

            {form.num_pagas === 'custom' && (
              <div className="field">
                <label>Número de pagas (personalizado)</label>
                <input type="number" min="1" max="24" placeholder="Ej: 16" value={form.num_pagas_custom} onChange={e => setForm({...form, num_pagas_custom: e.target.value})} />
              </div>
            )}

            {mensual > 0 && (
              <div className="desglose-box">
                <div style={{fontWeight:700, color:'#065F46', fontSize:12, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px'}}>Cálculo automático</div>
                <div className="desglose-row">
                  <span style={{color:'#047857'}}>Salario anual bruto</span>
                  <strong>{fmtEur(anual)}</strong>
                </div>
                <div className="desglose-row">
                  <span style={{color:'#047857'}}>Número de pagas</span>
                  <strong>{pagas}</strong>
                </div>
                <div className="desglose-row" style={{paddingTop:8, marginTop:4, borderTop:'1px solid #A7F3D0', fontSize:15}}>
                  <span style={{color:'#065F46', fontWeight:700}}>Salario por paga</span>
                  <strong style={{color:'#065F46'}}>{fmtEur(mensual)}</strong>
                </div>
              </div>
            )}

            {apiError && <div className="error-msg">{apiError}</div>}
            <div className="modal-btns">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando || mensual <= 0}>{guardando ? 'Guardando...' : 'Guardar nómina'}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
