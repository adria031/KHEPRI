'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { dbMutation } from '../../lib/dbApi'
import { DashboardShell } from '../DashboardShell'

/*
  Ejecutar en Supabase SQL Editor (una sola vez):

  ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS dni text;
  ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS direccion text;

  CREATE TABLE IF NOT EXISTS contratos (
    id uuid default gen_random_uuid() primary key,
    negocio_id uuid references negocios(id),
    trabajador_id uuid references trabajadores(id),
    tipo_contrato text,
    fecha_inicio date,
    fecha_fin date,
    salario_bruto numeric,
    jornada text,
    categoria text,
    pdf_url text,
    created_at timestamptz default now()
  );
*/

const TIPOS_CONTRATO = [
  { id: 'indefinido',          label: 'Indefinido ordinario',                    art: 'Art. 15 ET' },
  { id: 'parcial',             label: 'A tiempo parcial',                        art: 'Art. 12 ET' },
  { id: 'temporal_produccion', label: 'Temporal — Circunstancias de producción', art: 'Art. 15.2 ET' },
  { id: 'formacion',           label: 'Formación y aprendizaje',                 art: 'Art. 11.2 ET' },
]

type Trabajador = {
  id: string; nombre: string; especialidad: string; foto_url: string | null
  email: string | null; telefono: string | null; activo: boolean
  dni: string | null; direccion: string | null
}
type FormState = {
  nombre: string; especialidad: string; foto_url: string | null
  email: string; telefono: string; dni: string; direccion: string
}
type Contrato = {
  id: string; trabajador_id: string; tipo_contrato: string
  fecha_inicio: string; fecha_fin: string | null
  salario_bruto: number; jornada: string; categoria: string | null; created_at: string
}
type NegocioDatos = {
  nombre: string; direccion: string|null; ciudad: string|null
  codigo_postal: string|null; telefono: string|null
}
type ContratoForm = {
  tipo: string; fecha_inicio: string; fecha_fin: string
  salario_bruto: string; jornada: string; horas_semana: string
  categoria: string; empresa_cif: string; empresa_representante: string
}

function iniciales(n: string) { return n.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) }
function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits:2, maximumFractionDigits:2 }) }
function fmtFecha(iso: string) {
  if (!iso) return '___/___/______'
  try { return new Date(iso+'T12:00').toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }) } catch { return iso }
}

export default function Equipo() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [negocioDatos, setNegocioDatos] = useState<NegocioDatos>({ nombre:'', direccion:null, ciudad:null, codigo_postal:null, telefono:null })
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [cargando, setCargando] = useState(true)

  // Modal trabajador
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Trabajador | null>(null)
  const [form, setForm] = useState<FormState>({ nombre:'', especialidad:'', foto_url:null, email:'', telefono:'', dni:'', direccion:'' })
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Contratos
  const [contratosTrab, setContratosTrab] = useState<Record<string, Contrato[]>>({})
  const [contratoModal, setContratoModal] = useState(false)
  const [trabajadorContrato, setTrabajadorContrato] = useState<Trabajador | null>(null)
  const [vistaContrato, setVistaContrato] = useState<string | null>(null) // trabajador id expanded
  const [contratoForm, setContratoForm] = useState<ContratoForm>({
    tipo:'indefinido', fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin:'',
    salario_bruto:'', jornada:'completa', horas_semana:'40',
    categoria:'', empresa_cif:'', empresa_representante:'',
  })
  const [guardandoContrato, setGuardandoContrato] = useState(false)

  // ── Data loaders ─────────────────────────────────────────────────────────────

  const cargarContratos = useCallback(async (nid: string) => {
    const { data } = await supabase
      .from('contratos').select('*').eq('negocio_id', nid).order('created_at', { ascending:false })
    const byTrab: Record<string, Contrato[]> = {}
    for (const c of (data || []) as Contrato[]) {
      if (!byTrab[c.trabajador_id]) byTrab[c.trabajador_id] = []
      byTrab[c.trabajador_id].push(c)
    }
    setContratosTrab(byTrab)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const { activo: neg, todos: todosNegs } = await getNegocioActivo(session.user.id, session.access_token)
      if (!neg) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todosNegs); setNegocio(neg); setNegocioId(neg.id)
      const { data: negData } = await db.from('negocios').select('nombre,direccion,ciudad,codigo_postal,telefono').eq('id', neg.id).single()
      if (negData) setNegocioDatos(negData as NegocioDatos)
      const { data } = await db.from('trabajadores').select('*').eq('negocio_id', neg.id).order('nombre')
      setTrabajadores((data || []) as Trabajador[])
      await cargarContratos(neg.id)
      setCargando(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Trabajador CRUD ───────────────────────────────────────────────────────────

  function abrirModal(t?: Trabajador) {
    if (t) {
      setEditando(t)
      setForm({ nombre:t.nombre, especialidad:t.especialidad||'', foto_url:t.foto_url,
        email:t.email||'', telefono:t.telefono||'', dni:(t as any).dni||'', direccion:(t as any).direccion||'' })
      setFotoPreview(t.foto_url)
    } else {
      setEditando(null)
      setForm({ nombre:'', especialidad:'', foto_url:null, email:'', telefono:'', dni:'', direccion:'' })
      setFotoPreview(null)
    }
    setFotoArchivo(null); setError(''); setModal(true)
  }

  function cerrarModal() { setModal(false); setFotoArchivo(null); setFotoPreview(null) }

  async function subirFoto(file: File): Promise<string | null> {
    if (!negocioId) return null
    const ext = file.name.split('.').pop()
    const path = `trabajadores/${negocioId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert:true })
    if (error) return null
    return supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!editando && !form.email.trim()) { setError('El email es obligatorio para enviar la invitación.'); return }
    setGuardando(true); setError('')
    let foto_url = form.foto_url
    if (fotoArchivo) { const url = await subirFoto(fotoArchivo); if (url) foto_url = url }
    const datos = {
      nombre: form.nombre.trim(), especialidad: form.especialidad.trim(), foto_url,
      email: form.email.trim() || null, telefono: form.telefono.trim() || null,
      dni: form.dni.trim() || null, direccion: form.direccion.trim() || null,
    }
    if (editando) {
      const { error: err } = await dbMutation({ op:'update', table:'trabajadores', id:editando.id, negocioId:negocioId!, data:datos })
      if (err) { setError(err); setGuardando(false); return }
      setTrabajadores(prev => prev.map(t => t.id === editando.id ? { ...t, ...datos } : t))
    } else {
      const { data, error: err } = await dbMutation({ op:'insert', table:'trabajadores', negocioId:negocioId!, data:{ ...datos, negocio_id:negocioId, activo:true } })
      if (err || !data) { setError(err || 'No se pudo guardar.'); setGuardando(false); return }
      setTrabajadores(prev => [...prev, data as Trabajador])
      if (datos.email) {
        try {
          await fetch('/api/invitar-empleado', { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ email:datos.email, nombreEmpleado:datos.nombre, nombreNegocio:negocio?.nombre||'tu negocio', negocioId }) })
        } catch (e: any) { setError(`Guardado, pero el email falló: ${e.message}`); setGuardando(false); return }
      }
    }
    setGuardando(false); cerrarModal()
  }

  async function toggleActivo(t: Trabajador) {
    const { error } = await dbMutation({ op:'update', table:'trabajadores', id:t.id, negocioId:negocioId!, data:{ activo:!t.activo } })
    if (!error) setTrabajadores(prev => prev.map(x => x.id === t.id ? { ...x, activo:!t.activo } : x))
  }

  async function eliminar(t: Trabajador) {
    if (!confirm(`¿Eliminar a ${t.nombre}? Esta acción no se puede deshacer.`)) return
    const { error } = await dbMutation({ op:'delete', table:'trabajadores', id:t.id, negocioId:negocioId! })
    if (!error) setTrabajadores(prev => prev.filter(x => x.id !== t.id))
  }

  // ── Contratos ─────────────────────────────────────────────────────────────────

  function abrirContratoModal(t: Trabajador) {
    setTrabajadorContrato(t)
    setContratoForm({
      tipo:'indefinido', fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin:'',
      salario_bruto:'', jornada:'completa', horas_semana:'40',
      categoria: t.especialidad || '', empresa_cif:'', empresa_representante:'',
    })
    setContratoModal(true)
  }

  async function guardarContrato() {
    if (!trabajadorContrato || !negocioId || !contratoForm.fecha_inicio || !contratoForm.salario_bruto) return
    setGuardandoContrato(true)
    const jornadaTexto = contratoForm.jornada === 'completa'
      ? 'Jornada completa (40 horas/semana)'
      : `Jornada parcial (${contratoForm.horas_semana} horas/semana)`

    const { data, error } = await supabase.from('contratos').insert({
      negocio_id: negocioId, trabajador_id: trabajadorContrato.id,
      tipo_contrato: contratoForm.tipo,
      fecha_inicio: contratoForm.fecha_inicio,
      fecha_fin: contratoForm.fecha_fin || null,
      salario_bruto: parseFloat(contratoForm.salario_bruto) || 0,
      jornada: jornadaTexto,
      categoria: contratoForm.categoria || null,
    }).select().single()

    if (!error && data) {
      setContratosTrab(prev => ({
        ...prev,
        [trabajadorContrato.id]: [data as Contrato, ...(prev[trabajadorContrato.id] || [])],
      }))
      // Auto-generate PDF and download
      await generarContratoPDF(data as Contrato, trabajadorContrato, contratoForm.empresa_cif, contratoForm.empresa_representante)
      setContratoModal(false)
    } else if (error) {
      alert(`Error: ${error.message}`)
    }
    setGuardandoContrato(false)
  }

  async function generarContratoPDF(
    c: Contrato, t: Trabajador,
    empresaCif = '', empresaRepresentante = ''
  ) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit:'mm', format:'a4' })
    const W = 210, mL = 14, mR = 196
    const tipoInfo = TIPOS_CONTRATO.find(x => x.id === c.tipo_contrato)
    const dir = [negocioDatos.direccion, negocioDatos.codigo_postal, negocioDatos.ciudad].filter(Boolean).join(', ')
    let y = 0

    // ── Cabecera SEPE ─────────────────────────────────────────────────────────
    doc.setFillColor(17,24,39); doc.rect(0,0,W,34,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9)
    doc.text('SERVICIO PÚBLICO DE EMPLEO ESTATAL (SEPE)', mL, 11)
    doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.text('Ministerio de Trabajo y Economía Social · España · 2026', mL, 17)
    doc.setFontSize(14); doc.setFont('helvetica','bold')
    doc.text('CONTRATO DE TRABAJO', 105, 14, {align:'center'})
    doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text(tipoInfo?.label?.toUpperCase() || c.tipo_contrato.toUpperCase(), 105, 21, {align:'center'})
    doc.setFontSize(8)
    doc.text(tipoInfo?.art || '', 105, 27, {align:'center'})
    doc.text(`Nº contrato: KH-${c.id.slice(0,8).toUpperCase()}`, mR, 11, {align:'right'})
    doc.text(`Fecha documento: ${fmtFecha(new Date().toISOString().split('T')[0])}`, mR, 17, {align:'right'})
    y = 42

    // ── Identificación empresa y trabajador ───────────────────────────────────
    // Empresa
    doc.setFillColor(247,249,252); doc.setDrawColor(229,231,235)
    doc.roundedRect(mL, y, 86, 36, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('EMPRESA / EMPLEADOR', mL+4, y+7)
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(negocioDatos.nombre || '—', mL+4, y+14)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    doc.text(`CIF: ${empresaCif || '_______________'}`, mL+4, y+21)
    if (dir) doc.text(dir.slice(0, 45), mL+4, y+27)
    if (empresaRepresentante) doc.text(`Rep.: ${empresaRepresentante}`, mL+4, y+33)

    // Trabajador
    doc.setFillColor(247,249,252)
    doc.roundedRect(112, y, 84, 36, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('TRABAJADOR/A', 116, y+7)
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(t.nombre, 116, y+14)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    doc.text(`DNI/NIE: ${(t as any).dni || '_______________'}`, 116, y+21)
    if ((t as any).direccion) doc.text(((t as any).direccion as string).slice(0, 38), 116, y+27)
    if (t.telefono) doc.text(`Tel: ${t.telefono}`, 116, y+33)
    y += 44

    // ── Sección tipo-específica ───────────────────────────────────────────────
    const seccion = (titulo: string) => {
      doc.setFillColor(29,78,216); doc.rect(mL, y, mR-mL, 7, 'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
      doc.text(titulo, mL+3, y+5); y += 7
    }
    const clausula = (num: string, texto: string) => {
      doc.setTextColor(29,78,216); doc.setFont('helvetica','bold'); doc.setFontSize(8)
      doc.text(`${num}.`, mL+2, y+5)
      doc.setTextColor(17,24,39); doc.setFont('helvetica','normal'); doc.setFontSize(8)
      const lines = doc.splitTextToSize(texto, mR - mL - 12)
      lines.forEach((line: string, i: number) => doc.text(line, mL+10, y+5+i*5))
      y += Math.max(9, lines.length * 5 + 4)
    }
    const campo = (label: string, value: string) => {
      doc.setFillColor(255,255,255); doc.rect(mL, y, mR-mL, 9, 'F')
      doc.setDrawColor(229,231,235); doc.line(mL, y+9, mR, y+9)
      doc.setTextColor(107,114,128); doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
      doc.text(label, mL+3, y+6)
      doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
      doc.text(value, mR-3, y+6, {align:'right'}); y += 9
    }

    seccion('CONDICIONES DE LA RELACIÓN LABORAL')
    campo('Fecha de inicio', fmtFecha(c.fecha_inicio))
    campo('Duración', c.tipo_contrato === 'indefinido' || c.tipo_contrato === 'parcial'
      ? 'INDEFINIDA' : c.fecha_fin ? `Hasta el ${fmtFecha(c.fecha_fin)}` : 'A determinar')
    campo('Jornada laboral', c.jornada)
    campo('Salario bruto mensual', `${fmt(c.salario_bruto)} € / mes (14 pagas)`)
    campo('Categoría profesional', c.categoria || t.especialidad || '—')
    campo('Centro de trabajo', dir || negocioDatos.nombre || '—')
    y += 4

    // Cláusulas específicas por tipo de contrato
    if (c.tipo_contrato === 'indefinido') {
      seccion('CLÁUSULAS ESPECÍFICAS — CONTRATO INDEFINIDO ORDINARIO')
      clausula('1ª', 'El presente contrato se formaliza con carácter INDEFINIDO, en virtud del artículo 15 del Estatuto de los Trabajadores (ET), Real Decreto Legislativo 2/2015, de 23 de octubre.')
      clausula('2ª', `PERÍODO DE PRUEBA: Se establece un período de prueba de ${c.categoria?.toLowerCase().includes('técnico') || (t.especialidad||'').toLowerCase().includes('técnico') ? 'seis (6)' : 'dos (2)'} meses, conforme al artículo 14 ET, durante el cual cualquiera de las partes podrá resolver el contrato sin preaviso ni indemnización.`)
      clausula('3ª', 'CATEGORÍA Y FUNCIONES: El trabajador/a desempeñará las funciones propias de su categoría profesional y aquellas otras funciones afines que le sean encomendadas dentro de su grupo profesional, conforme al convenio colectivo aplicable.')
      clausula('4ª', 'RETRIBUCIÓN: El salario indicado incluye la parte proporcional de pagas extraordinarias, que podrán abonarse prorrateadas mensualmente o en los meses de junio y diciembre. El salario no será en ningún caso inferior al Salario Mínimo Interprofesional vigente (SMI 2026: 1.184 €/mes).')
    } else if (c.tipo_contrato === 'parcial') {
      seccion('CLÁUSULAS ESPECÍFICAS — CONTRATO A TIEMPO PARCIAL')
      clausula('1ª', 'El presente contrato se formaliza a TIEMPO PARCIAL, en virtud del artículo 12 del Estatuto de los Trabajadores. La jornada ordinaria de trabajo en la actividad será inferior a la de un trabajador a tiempo completo comparable.')
      clausula('2ª', `DISTRIBUCIÓN DE LA JORNADA: ${c.jornada}. El horario específico de trabajo se concretará de mutuo acuerdo entre las partes, respetando en todo caso los descansos mínimos legales establecidos en el artículo 34 ET.`)
      clausula('3ª', 'HORAS COMPLEMENTARIAS: Queda prohibida la realización de horas extraordinarias. Las horas complementarias, si se pactan, no podrán superar el 30% de las ordinarias contratadas y deberán preavisarse con un mínimo de tres días de antelación.')
      clausula('4ª', 'EQUIPARACIÓN DE DERECHOS: El trabajador/a a tiempo parcial tendrá los mismos derechos que los trabajadores a tiempo completo, sin perjuicio de las particularidades que se deriven de la naturaleza de su contrato.')
    } else if (c.tipo_contrato === 'temporal_produccion') {
      seccion('CLÁUSULAS ESPECÍFICAS — CONTRATO TEMPORAL POR CIRCUNSTANCIAS DE PRODUCCIÓN')
      clausula('1ª', 'El presente contrato se formaliza al amparo del artículo 15.2 del Estatuto de los Trabajadores, en la modalidad de contrato por circunstancias de la producción, por un incremento ocasional e imprevisible de la actividad productiva.')
      clausula('2ª', `DURACIÓN: El contrato tendrá una duración máxima de seis (6) meses, ampliable hasta doce (12) meses por convenio sectorial. Fecha de inicio: ${fmtFecha(c.fecha_inicio)}${c.fecha_fin ? `. Fecha prevista de fin: ${fmtFecha(c.fecha_fin)}` : ''}.`)
      clausula('3ª', 'CAUSA DE TEMPORALIDAD: El contrato obedece a necesidades temporales relacionadas con el incremento de la demanda de servicios y de la actividad del centro de trabajo, sin que dicha necesidad tenga carácter estructural o permanente.')
      clausula('4ª', 'INDEMNIZACIÓN: A la finalización del contrato, el trabajador/a tendrá derecho a percibir una indemnización de doce días de salario por año de servicio, prorrateándose por meses los períodos de tiempo inferiores a un año.')
    } else if (c.tipo_contrato === 'formacion') {
      seccion('CLÁUSULAS ESPECÍFICAS — CONTRATO DE FORMACIÓN Y APRENDIZAJE')
      clausula('1ª', 'El presente contrato se celebra al amparo del artículo 11.2 del Estatuto de los Trabajadores. El trabajador/a deberá tener entre 16 y 30 años y carecer de la cualificación profesional reconocida por el sistema de formación para el empleo.')
      clausula('2ª', `DURACIÓN: Mínima de tres (3) meses, máxima de dos (2) años. Fecha de inicio: ${fmtFecha(c.fecha_inicio)}${c.fecha_fin ? `. Fecha de fin: ${fmtFecha(c.fecha_fin)}` : ''}. No se podrá celebrar un nuevo contrato con el mismo trabajador para la misma cualificación.`)
      clausula('3ª', 'FORMACIÓN TEÓRICA: El trabajador/a dedicará un mínimo del veinticinco por ciento (25%) de su tiempo a actividades formativas relacionadas con la cualificación profesional objeto del contrato. La empresa tiene la obligación de proporcionar la formación, directamente o a través de centros acreditados.')
      clausula('4ª', 'RETRIBUCIÓN: El salario no podrá ser inferior al setenta y cinco por ciento (75%) del salario del grupo profesional correspondiente durante el primer año, ni al ochenta y cinco por ciento (85%) durante el segundo año.')
    }

    y += 4

    // ── Cláusulas generales ───────────────────────────────────────────────────
    seccion('CLÁUSULAS GENERALES')
    clausula('G1', 'NORMATIVA APLICABLE: El presente contrato se rige por el Estatuto de los Trabajadores (RDLeg 2/2015), el Convenio Colectivo del sector aplicable, y la normativa de Seguridad Social vigente. Ambas partes quedan sujetas a la legislación laboral española.')
    clausula('G2', 'VACACIONES: El trabajador/a tendrá derecho a disfrutar de treinta (30) días naturales de vacaciones anuales retribuidas, o la parte proporcional si la relación laboral fuese inferior a un año (art. 38 ET).')
    clausula('G3', 'PROTECCIÓN DE DATOS: Los datos personales del trabajador/a serán tratados con arreglo al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales.')
    y += 4

    // ── Firma ─────────────────────────────────────────────────────────────────
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFillColor(247,249,252); doc.setDrawColor(229,231,235)
    doc.roundedRect(mL, y, mR-mL, 8, 2, 2, 'FD')
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text('FIRMAS DE LAS PARTES — Leído y conforme con el contenido del presente contrato', 105, y+5.5, {align:'center'})
    y += 14

    doc.setDrawColor(120,120,120)
    doc.line(mL, y+24, mL+82, y+24)
    doc.line(mR-82, y+24, mR, y+24)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
    doc.text('Firma y sello del empleador', mL+41, y+29, {align:'center'})
    doc.text('Firma del trabajador/a', mR-41, y+29, {align:'center'})
    doc.setFontSize(8); doc.setTextColor(120,120,120)
    doc.text(`${negocioDatos.nombre}`, mL+41, y+34, {align:'center'})
    doc.text(t.nombre, mR-41, y+34, {align:'center'})
    doc.text('Fecha: ___/___/______', mL+41, y+40, {align:'center'})
    doc.text('Fecha: ___/___/______', mR-41, y+40, {align:'center'})
    y += 50

    // ── Pie ───────────────────────────────────────────────────────────────────
    doc.setFillColor(247,249,252); doc.rect(0, 285, W, 12, 'F')
    doc.setDrawColor(229,231,235); doc.line(0, 285, W, 285)
    doc.setFontSize(6.5); doc.setTextColor(153,153,153)
    doc.text(`Generado con Khepria · Contrato ${tipoInfo?.label} · ${t.nombre} · Ref: KH-${c.id.slice(0,8).toUpperCase()} · ${new Date().toLocaleDateString('es-ES')}`, 105, 292, {align:'center'})

    const filename = `contrato-${c.tipo_contrato}-${t.nombre.toLowerCase().replace(/\s+/g,'-')}-${c.fecha_inicio}.pdf`
    doc.save(filename)
  }

  const activos = trabajadores.filter(t => t.activo).length

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF;
          --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2);
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .content { padding: 24px 28px; flex: 1; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .page-sub { font-size: 14px; color: var(--muted); margin-top: 2px; }
        .btn-nuevo { background: var(--text); color: white; border: none; padding: 10px 18px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .equipo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .trabajador-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: box-shadow 0.2s; }
        .trabajador-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .trabajador-card.inactivo { opacity: 0.55; }
        .card-top { padding: 20px 18px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
        .card-actions { position: absolute; top: 12px; right: 12px; display: flex; gap: 4px; }
        .btn-icon { background: var(--bg); border: none; border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
        .btn-icon:hover { background: rgba(0,0,0,0.08); }
        .avatar { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 12px; object-fit: cover; border: 3px solid rgba(0,0,0,0.06); }
        .avatar-placeholder { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 12px; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: var(--blue-dark); flex-shrink: 0; }
        .trabajador-nombre { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
        .trabajador-esp { font-size: 13px; color: var(--text2); margin-bottom: 10px; min-height: 18px; }
        .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px; }
        .badge-activo { background: var(--green-soft); color: var(--green-dark); }
        .badge-inactivo { background: rgba(0,0,0,0.06); color: var(--muted); }
        .card-footer { border-top: 1px solid var(--border); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--bg); }
        .btn-contratos { display: flex; align-items: center; gap: 5px; padding: 7px 12px; background: var(--white); border: 1.5px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; color: var(--text2); cursor: pointer; }
        .btn-contratos:hover { background: var(--blue-soft); color: var(--blue-dark); border-color: rgba(184,216,248,0.8); }
        .contratos-panel { border-top: 1px solid var(--border); padding: 14px; background: white; }
        .contrato-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--bg); border-radius: 10px; margin-bottom: 6px; }
        .contrato-tipo { font-size: 12px; font-weight: 700; color: var(--text); flex: 1; }
        .contrato-fecha { font-size: 11px; color: var(--muted); }
        .btn-dl { padding: 5px 10px; background: var(--text); color: white; border: none; border-radius: 7px; font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .empty { text-align: center; padding: 60px 20px; background: var(--white); border: 1px solid var(--border); border-radius: 16px; }
        .empty-emoji { font-size: 48px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .empty-sub { font-size: 14px; color: var(--muted); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
        .modal { background: white; border-radius: 20px; padding: 28px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 20px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .field input, .field select { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; -webkit-appearance: none; }
        .field input:focus, .field select:focus { border-color: var(--blue-dark); }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .section-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
        .foto-area { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .foto-preview { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); flex-shrink: 0; }
        .foto-preview-placeholder { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: var(--blue-dark); flex-shrink: 0; border: 2px solid var(--border); }
        .btn-foto { padding: 8px 14px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; }
        .btn-foto:hover { border-color: var(--blue-dark); color: var(--blue-dark); }
        .modal-btns { display: flex; gap: 10px; margin-top: 22px; }
        .btn-primary { flex: 1; padding: 12px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-secondary { flex: 1; padding: 12px; background: transparent; color: var(--text2); border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
        .error-msg { background: rgba(251,207,232,0.3); color: #B5467A; padding: 10px; border-radius: 8px; font-size: 13px; margin-top: 10px; text-align: center; }
        .tipo-card { border: 2px solid var(--border); border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: all 0.15s; }
        .tipo-card.selected { border-color: var(--blue-dark); background: var(--blue-soft); }
        .tipo-card:hover:not(.selected) { border-color: #9CA3AF; }
        .tipo-card-label { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
        .tipo-card-art { font-size: 11px; color: var(--muted); }
        .aviso-legal { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #92400E; line-height: 1.6; margin-top: 14px; }
        @media (max-width: 1024px) { .equipo-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
          .content { padding: 16px; }
          .equipo-grid { grid-template-columns: repeat(2, 1fr); }
          .grid2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) { .equipo-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Mi equipo</div>
          <div className="page-sub">
            {cargando ? 'Cargando...' : `${trabajadores.length} miembro${trabajadores.length !== 1 ? 's' : ''} · ${activos} activo${activos !== 1 ? 's' : ''}`}
          </div>
        </div>
        <button className="btn-nuevo" onClick={() => abrirModal()}>+ Añadir miembro</button>
      </div>

      {cargando ? (
        <div style={{textAlign:'center', padding:'60px', color:'var(--muted)', fontSize:'14px'}}>Cargando...</div>
      ) : trabajadores.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">👥</div>
          <div className="empty-title">Sin miembros en el equipo</div>
          <div className="empty-sub">Añade a los profesionales de tu negocio para asignarlos a reservas</div>
        </div>
      ) : (
        <div className="equipo-grid">
          {trabajadores.map(t => {
            const contratos = contratosTrab[t.id] || []
            const expandido = vistaContrato === t.id
            return (
              <div key={t.id} className={`trabajador-card ${!t.activo ? 'inactivo' : ''}`}>
                <div className="card-top">
                  <div className="card-actions">
                    <button className="btn-icon" onClick={() => abrirModal(t)} title="Editar">✏️</button>
                    <button className="btn-icon" onClick={() => toggleActivo(t)} title={t.activo ? 'Desactivar' : 'Activar'}>
                      {t.activo ? '👁️' : '🙈'}
                    </button>
                    <button className="btn-icon" onClick={() => eliminar(t)} title="Eliminar">🗑️</button>
                  </div>
                  {t.foto_url
                    ? <img src={t.foto_url} alt={t.nombre} className="avatar" />
                    : <div className="avatar-placeholder">{iniciales(t.nombre)}</div>
                  }
                  <div className="trabajador-nombre">{t.nombre}</div>
                  <div className="trabajador-esp">{t.especialidad || '—'}</div>
                  {t.email && <div style={{fontSize:'12px', color:'var(--muted)', marginBottom:8, wordBreak:'break-all'}}>{t.email}</div>}
                  <span className={`badge ${t.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Contratos footer */}
                <div className="card-footer">
                  <span style={{fontSize:11, color:'var(--muted)', fontWeight:600}}>
                    {contratos.length > 0 ? `${contratos.length} contrato${contratos.length !== 1 ? 's' : ''}` : 'Sin contratos'}
                  </span>
                  <div style={{display:'flex', gap:6}}>
                    {contratos.length > 0 && (
                      <button className="btn-contratos" onClick={() => setVistaContrato(expandido ? null : t.id)}>
                        {expandido ? '▲ Ocultar' : '📋 Ver contratos'}
                      </button>
                    )}
                    <button className="btn-contratos" style={{background:'var(--text)', color:'white', border:'none'}} onClick={() => abrirContratoModal(t)}>
                      + Contrato
                    </button>
                  </div>
                </div>

                {/* Panel contratos expandido */}
                {expandido && contratos.length > 0 && (
                  <div className="contratos-panel">
                    {contratos.map(c => {
                      const tipoInfo = TIPOS_CONTRATO.find(x => x.id === c.tipo_contrato)
                      return (
                        <div key={c.id} className="contrato-item">
                          <div style={{flex:1, minWidth:0}}>
                            <div className="contrato-tipo">{tipoInfo?.label || c.tipo_contrato}</div>
                            <div className="contrato-fecha">Inicio: {fmtFecha(c.fecha_inicio)}{c.fecha_fin ? ` · Fin: ${fmtFecha(c.fecha_fin)}` : ' · Indefinido'}</div>
                            <div className="contrato-fecha">{fmt(c.salario_bruto)} €/mes · {c.jornada}</div>
                          </div>
                          <button className="btn-dl" onClick={() => generarContratoPDF(c, t)}>
                            📄 PDF
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL TRABAJADOR ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="modal">
            <div className="modal-title">{editando ? 'Editar miembro' : 'Nuevo miembro'}</div>

            <div className="section-label">Información básica</div>
            <div className="field">
              <label>Nombre *</label>
              <input type="text" placeholder="Ej: Ana López" value={form.nombre}
                onChange={e => setForm(f => ({...f, nombre:e.target.value}))} autoComplete="off" />
            </div>
            <div className="field">
              <label>Especialidad <span style={{fontWeight:400, color:'var(--muted)'}}>· opcional</span></label>
              <input type="text" placeholder="Ej: Colorista, Masajista..." value={form.especialidad}
                onChange={e => setForm(f => ({...f, especialidad:e.target.value}))} autoComplete="off" />
            </div>
            <div className="grid2">
              <div className="field">
                <label>Teléfono <span style={{fontWeight:400, color:'var(--muted)'}}>· opc.</span></label>
                <input type="tel" placeholder="+34 600 000 000" value={form.telefono}
                  onChange={e => setForm(f => ({...f, telefono:e.target.value}))} />
              </div>
              <div className="field">
                <label>Email {!editando && <span style={{color:'#EF4444'}}>*</span>}</label>
                <input type="email" placeholder="email@ejemplo.com" value={form.email}
                  onChange={e => setForm(f => ({...f, email:e.target.value}))} />
              </div>
            </div>

            <div className="section-label">Datos para contratos SEPE</div>
            <div className="grid2">
              <div className="field">
                <label>DNI/NIE <span style={{fontWeight:400, color:'var(--muted)'}}>· opc.</span></label>
                <input type="text" placeholder="12345678A" value={form.dni}
                  onChange={e => setForm(f => ({...f, dni:e.target.value}))} />
              </div>
              <div className="field">
                <label>Dirección <span style={{fontWeight:400, color:'var(--muted)'}}>· opc.</span></label>
                <input type="text" placeholder="Calle, nº, ciudad" value={form.direccion}
                  onChange={e => setForm(f => ({...f, direccion:e.target.value}))} />
              </div>
            </div>

            <div className="section-label">Foto</div>
            <div className="foto-area">
              {fotoPreview
                ? <img src={fotoPreview} alt="Preview" className="foto-preview" />
                : <div className="foto-preview-placeholder">{form.nombre ? iniciales(form.nombre) : '👤'}</div>
              }
              <div>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setFotoArchivo(f); setFotoPreview(URL.createObjectURL(f)) } }} />
                <button className="btn-foto" onClick={() => fileRef.current?.click()}>
                  {fotoPreview ? '📷 Cambiar' : '📷 Subir foto'}
                </button>
                {fotoPreview && (
                  <button className="btn-foto" style={{marginTop:6, display:'block'}}
                    onClick={() => { setFotoPreview(null); setFotoArchivo(null); setForm(f => ({...f, foto_url:null})) }}>
                    🗑️ Quitar
                  </button>
                )}
              </div>
            </div>

            {!editando && (
              <div style={{fontSize:12, color:'var(--muted)', marginTop:4}}>
                Se enviará una invitación al email para que cree su cuenta.
              </div>
            )}

            {error && <div className="error-msg">{error}</div>}

            <div className="modal-btns">
              <button className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONTRATO ── */}
      {contratoModal && trabajadorContrato && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setContratoModal(false) }}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-title">Nuevo contrato — {trabajadorContrato.nombre}</div>

            <div className="section-label">Tipo de contrato SEPE 2026</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14}}>
              {TIPOS_CONTRATO.map(tipo => (
                <div
                  key={tipo.id}
                  className={`tipo-card ${contratoForm.tipo === tipo.id ? 'selected' : ''}`}
                  onClick={() => setContratoForm(f => ({...f, tipo:tipo.id}))}
                >
                  <div className="tipo-card-label">{tipo.label}</div>
                  <div className="tipo-card-art">{tipo.art}</div>
                </div>
              ))}
            </div>

            <div className="section-label">Datos empresa (para el contrato)</div>
            <div className="grid2">
              <div className="field">
                <label>CIF empresa <span style={{fontWeight:400, color:'var(--muted)'}}>· opc.</span></label>
                <input type="text" placeholder="A12345678" value={contratoForm.empresa_cif}
                  onChange={e => setContratoForm(f => ({...f, empresa_cif:e.target.value}))} />
              </div>
              <div className="field">
                <label>Representante <span style={{fontWeight:400, color:'var(--muted)'}}>· opc.</span></label>
                <input type="text" placeholder="Nombre del firmante" value={contratoForm.empresa_representante}
                  onChange={e => setContratoForm(f => ({...f, empresa_representante:e.target.value}))} />
              </div>
            </div>

            <div className="section-label">Condiciones laborales</div>
            <div className="grid2">
              <div className="field">
                <label>Fecha de inicio *</label>
                <input type="date" value={contratoForm.fecha_inicio}
                  onChange={e => setContratoForm(f => ({...f, fecha_inicio:e.target.value}))} />
              </div>
              {(contratoForm.tipo === 'temporal_produccion' || contratoForm.tipo === 'formacion') && (
                <div className="field">
                  <label>Fecha de fin</label>
                  <input type="date" value={contratoForm.fecha_fin}
                    onChange={e => setContratoForm(f => ({...f, fecha_fin:e.target.value}))} />
                </div>
              )}
            </div>

            <div className="grid2">
              <div className="field">
                <label>Jornada</label>
                <select value={contratoForm.jornada} onChange={e => setContratoForm(f => ({...f, jornada:e.target.value}))}>
                  <option value="completa">Completa (40 h/semana)</option>
                  <option value="parcial">Parcial</option>
                </select>
              </div>
              {contratoForm.jornada === 'parcial' && (
                <div className="field">
                  <label>Horas/semana</label>
                  <input type="number" min="1" max="39" value={contratoForm.horas_semana}
                    onChange={e => setContratoForm(f => ({...f, horas_semana:e.target.value}))} />
                </div>
              )}
            </div>

            <div className="grid2">
              <div className="field">
                <label>Salario bruto mensual (€) *</label>
                <input type="number" step="0.01" placeholder="1.184,00" value={contratoForm.salario_bruto}
                  onChange={e => setContratoForm(f => ({...f, salario_bruto:e.target.value}))} />
              </div>
              <div className="field">
                <label>Categoría profesional</label>
                <input type="text" placeholder="Ej: Oficial 1ª, Técnico..." value={contratoForm.categoria}
                  onChange={e => setContratoForm(f => ({...f, categoria:e.target.value}))} />
              </div>
            </div>

            {/* SMI 2026 check */}
            {contratoForm.salario_bruto && parseFloat(contratoForm.salario_bruto) > 0 && parseFloat(contratoForm.salario_bruto) < 1184 && contratoForm.jornada === 'completa' && (
              <div style={{background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#991B1B', marginBottom:10}}>
                ⚠️ El salario introducido ({fmt(parseFloat(contratoForm.salario_bruto))} €) es inferior al SMI 2026 (1.184 €/mes para jornada completa).
              </div>
            )}

            <div className="aviso-legal">
              ⚖️ <strong>Aviso legal:</strong> El PDF generado es un borrador orientativo basado en plantillas SEPE 2026. Antes de firmarlo, revísalo con un asesor laboral o gestoría. Khepria no asume responsabilidad por su uso directo.
            </div>

            <div className="modal-btns">
              <button className="btn-secondary" onClick={() => setContratoModal(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={guardarContrato}
                disabled={guardandoContrato || !contratoForm.fecha_inicio || !contratoForm.salario_bruto}
              >
                {guardandoContrato ? 'Generando...' : '📄 Guardar y descargar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
