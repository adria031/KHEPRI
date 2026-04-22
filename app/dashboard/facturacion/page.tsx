'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

/*
  Ejecutar en Supabase SQL Editor (una sola vez):
  CREATE TABLE IF NOT EXISTS facturas (
    id uuid default gen_random_uuid() primary key,
    negocio_id uuid references negocios(id),
    numero text,
    fecha date,
    cliente_nombre text,
    cliente_nif text,
    concepto text,
    base_imponible numeric,
    iva numeric,
    irpf numeric,
    total numeric,
    created_at timestamptz default now()
  );
*/

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const IVA_TIPOS = [21, 10, 4, 0]

type ReservaRaw = {
  id: string; fecha: string; cliente_nombre: string; estado: string; created_at: string
  servicios: { nombre: string; precio: number; iva: number | null } | null
}
type FacturaAuto = {
  numero: string; fecha: string; cliente: string; servicio: string
  base: number; iva_pct: number; cuota_iva: number; total: number
}
type FilaIva = { tipo: number; base: number; cuota: number; total: number }
type Gasto = {
  id: string; fecha: string; proveedor: string | null
  base_imponible: number; iva_porcentaje: number; cuota_iva: number; total: number; foto_url: string | null
}
type GastoDraft = {
  fecha: string; proveedor: string; base_imponible: string
  iva_porcentaje: string; cuota_iva: string; total: string
}
type FacturaOficial = {
  id: string; numero: string; fecha: string
  cliente_nombre: string; cliente_nif: string | null; concepto: string | null
  base_imponible: number; iva: number; irpf: number; total: number
}
type DatosTrim = {
  baseIngresos: number; ivaRepercutido: number
  totalGastoBase: number; ivaSoportado: number
  retenciones: number; totalIngresos: number; totalGastos: number
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function isoMes(a: number, m: number) { return `${a}-${String(m + 1).padStart(2, '0')}` }

export default function Facturacion() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [negocioDatos, setNegocioDatos] = useState<{direccion:string|null;ciudad:string|null;codigo_postal:string|null;telefono:string|null}>({direccion:null,ciudad:null,codigo_postal:null,telefono:null})
  const [cargando, setCargando] = useState(true)

  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())

  const [facturasAuto, setFacturasAuto] = useState<FacturaAuto[]>([])
  const [filaIva, setFilaIva] = useState<FilaIva[]>([])
  const [facturaAbierta, setFacturaAbierta] = useState<string | null>(null)

  // Trimestre seleccionable
  const [trim, setTrim] = useState(Math.floor(hoy.getMonth() / 3) + 1)
  const [trimAno, setTrimAno] = useState(hoy.getFullYear())
  const [datosTrim, setDatosTrim] = useState<DatosTrim | null>(null)
  const [cargandoTrim, setCargandoTrim] = useState(false)

  // Modales
  const [modal303, setModal303] = useState(false)
  const [modal130, setModal130] = useState(false)
  const [modal111, setModal111] = useState(false)

  // Gastos
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [uploadModal, setUploadModal] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [gastoDraft, setGastoDraft] = useState<GastoDraft | null>(null)
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Facturas oficiales
  const [facturaModal, setFacturaModal] = useState(false)
  const [facturasOficiales, setFacturasOficiales] = useState<FacturaOficial[]>([])
  const [facturaForm, setFacturaForm] = useState({
    cliente_nombre: '', cliente_nif: '', concepto: '',
    iva_pct: '21', irpf_pct: '0', total: '',
    fecha: hoy.toISOString().split('T')[0],
  })
  const [guardandoFactura, setGuardandoFactura] = useState(false)

  // ── Data loaders ─────────────────────────────────────────────────────────────

  const cargarFacturasAuto = useCallback(async (nid: string, a: number, m: number) => {
    setCargando(true)
    const desde = `${isoMes(a, m)}-01`
    const hastaDate = new Date(a, m + 1, 0)
    const hasta = `${isoMes(a, m)}-${String(hastaDate.getDate()).padStart(2, '0')}`
    const { db } = await getSessionClient()
    const { data } = await db
      .from('reservas')
      .select('id, fecha, cliente_nombre, estado, created_at, servicios(nombre, precio, iva)')
      .eq('negocio_id', nid).eq('estado', 'completada')
      .gte('fecha', desde).lte('fecha', hasta)
      .order('fecha', { ascending: false })
    if (!data) { setCargando(false); return }
    const rows = data as unknown as ReservaRaw[]
    const fList: FacturaAuto[] = rows.map((r, i) => {
      const precio = r.servicios?.precio ?? 0
      const ivaPct = r.servicios?.iva ?? 21
      const base = precio / (1 + ivaPct / 100)
      const cuota = precio - base
      return {
        numero: `${a}${String(m + 1).padStart(2,'0')}${String(i + 1).padStart(4,'0')}`,
        fecha: r.fecha, cliente: r.cliente_nombre,
        servicio: r.servicios?.nombre ?? '—',
        base, iva_pct: ivaPct, cuota_iva: cuota, total: precio,
      }
    })
    const grupos: Record<number, { base: number; cuota: number }> = {}
    IVA_TIPOS.forEach(t => { grupos[t] = { base: 0, cuota: 0 } })
    fList.forEach(f => {
      if (!grupos[f.iva_pct]) grupos[f.iva_pct] = { base: 0, cuota: 0 }
      grupos[f.iva_pct].base += f.base
      grupos[f.iva_pct].cuota += f.cuota_iva
    })
    setFacturasAuto(fList)
    setFilaIva(IVA_TIPOS.filter(t => grupos[t].base > 0).map(t => ({
      tipo: t, base: grupos[t].base, cuota: grupos[t].cuota, total: grupos[t].base + grupos[t].cuota,
    })))
    setCargando(false)
  }, [])

  const cargarGastos = useCallback(async (nid: string, a: number, m: number) => {
    const desde = `${isoMes(a, m)}-01`
    const hastaDate = new Date(a, m + 1, 0)
    const hasta = `${isoMes(a, m)}-${String(hastaDate.getDate()).padStart(2,'0')}`
    const { db } = await getSessionClient()
    const { data } = await db
      .from('gastos').select('id, fecha, proveedor, base_imponible, iva_porcentaje, cuota_iva, total, foto_url')
      .eq('negocio_id', nid).gte('fecha', desde).lte('fecha', hasta)
      .order('fecha', { ascending: false })
    setGastos((data as Gasto[]) || [])
  }, [])

  const cargarFacturasOficiales = useCallback(async (nid: string) => {
    const { data } = await supabase
      .from('facturas').select('*').eq('negocio_id', nid).order('numero', { ascending: false })
    setFacturasOficiales((data as FacturaOficial[]) || [])
  }, [])

  async function cargarDatosTrimestre(nid: string, t: number, a: number) {
    setCargandoTrim(true)
    const mesInicio = (t - 1) * 3
    const desde = `${a}-${String(mesInicio + 1).padStart(2,'0')}-01`
    const mesFin = mesInicio + 3
    const ultimoDia = new Date(a, mesFin, 0)
    const hasta = `${a}-${String(mesFin).padStart(2,'0')}-${String(ultimoDia.getDate()).padStart(2,'0')}`

    const [resRes, gasRes, nomRes] = await Promise.all([
      supabase.from('reservas').select('servicios(precio, iva)')
        .eq('negocio_id', nid).eq('estado','completada').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('gastos').select('base_imponible, cuota_iva')
        .eq('negocio_id', nid).gte('fecha', desde).lte('fecha', hasta),
      supabase.from('nominas').select('salario_bruto, irpf')
        .eq('negocio_id', nid).gte('mes', desde).lte('mes', hasta),
    ])

    let baseIngresos = 0, ivaRepercutido = 0
    for (const r of ((resRes.data || []) as any[])) {
      const precio = r.servicios?.precio ?? 0
      const ivaPct = r.servicios?.iva ?? 21
      const base = precio / (1 + ivaPct / 100)
      baseIngresos += base
      ivaRepercutido += precio - base
    }
    let totalGastoBase = 0, ivaSoportado = 0
    for (const g of ((gasRes.data || []) as any[])) {
      totalGastoBase += g.base_imponible || 0
      ivaSoportado += g.cuota_iva || 0
    }
    let retenciones = 0
    for (const n of ((nomRes.data || []) as any[])) {
      retenciones += (n.salario_bruto * n.irpf / 100) || 0
    }
    setDatosTrim({
      baseIngresos, ivaRepercutido,
      totalGastoBase, ivaSoportado, retenciones,
      totalIngresos: baseIngresos + ivaRepercutido,
      totalGastos: totalGastoBase + ivaSoportado,
    })
    setCargandoTrim(false)
  }

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const { activo, todos } = await getNegocioActivo(session.user.id, session.access_token)
      if (!activo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todos); setNegocio(activo)
      const { data: neg } = await db.from('negocios').select('id,nombre,direccion,ciudad,codigo_postal,telefono').eq('id', activo.id).single()
      if (!neg) { window.location.href = '/onboarding'; return }
      setNegocioId(neg.id); setNegocioNombre(neg.nombre)
      setNegocioDatos({ direccion: neg.direccion, ciudad: neg.ciudad, codigo_postal: neg.codigo_postal, telefono: neg.telefono })
      await Promise.all([
        cargarFacturasAuto(neg.id, anio, mes),
        cargarGastos(neg.id, anio, mes),
        cargarFacturasOficiales(neg.id),
      ])
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (negocioId) {
      cargarFacturasAuto(negocioId, anio, mes)
      cargarGastos(negocioId, anio, mes)
    }
  }, [negocioId, anio, mes, cargarFacturasAuto, cargarGastos])

  function prevMes() { if (mes === 0) { setAnio(a => a - 1); setMes(11) } else setMes(m => m - 1) }
  function nextMes() {
    if (anio === hoy.getFullYear() && mes === hoy.getMonth()) return
    if (mes === 11) { setAnio(a => a + 1); setMes(0) } else setMes(m => m + 1)
  }

  const totalBase = filaIva.reduce((s, f) => s + f.base, 0)
  const totalCuota = filaIva.reduce((s, f) => s + f.cuota, 0)
  const totalTotal = filaIva.reduce((s, f) => s + f.total, 0)

  const trimestreLabel = `T${trim} ${trimAno}`
  const mesesTrimestre = [0,1,2].map(i => MESES[(trim - 1) * 3 + i]).join(', ')

  // ── PDF generators ───────────────────────────────────────────────────────────

  async function generarFacturaAutoPDF(f: FacturaAuto) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, mL = 14, mR = 196
    const dir = [negocioDatos.direccion, negocioDatos.codigo_postal, negocioDatos.ciudad].filter(Boolean).join(', ')
    let y = 0

    doc.setFillColor(17,24,39); doc.rect(0,0,W,26,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16)
    doc.text('FACTURA', mL, 16)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text(`Nº ${f.numero}`, mR, 16, { align:'right' })
    y = 34

    doc.setFillColor(247,249,252); doc.setDrawColor(229,231,235)
    doc.roundedRect(mL, y, 85, 30, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('EMISOR', mL+4, y+7)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(negocioNombre, mL+4, y+15)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    if (dir) doc.text(dir, mL+4, y+22)
    if (negocioDatos.telefono) doc.text(`Tel: ${negocioDatos.telefono}`, mL+4, y+28)

    doc.setFillColor(247,249,252)
    doc.roundedRect(111, y, 85, 30, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('CLIENTE', 115, y+7)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(f.cliente, 115, y+15)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    doc.text(`Fecha: ${new Date(f.fecha+'T12:00').toLocaleDateString('es-ES')}`, 115, y+22)
    y += 40

    doc.setFillColor(17,24,39); doc.rect(mL,y,mR-mL,8,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('DESCRIPCIÓN', mL+3, y+5.5)
    doc.text('BASE', mR-70, y+5.5, {align:'right'})
    doc.text('IVA', mR-35, y+5.5, {align:'right'})
    doc.text('TOTAL', mR-3, y+5.5, {align:'right'})
    y += 8

    doc.setFillColor(255,255,255); doc.rect(mL,y,mR-mL,10,'F')
    doc.setTextColor(17,24,39); doc.setFont('helvetica','normal'); doc.setFontSize(9)
    doc.text(f.servicio, mL+3, y+7)
    doc.text(`${fmt(f.base)} €`, mR-70, y+7, {align:'right'})
    doc.text(`${f.iva_pct}% (${fmt(f.cuota_iva)} €)`, mR-35, y+7, {align:'right'})
    doc.setFont('helvetica','bold')
    doc.text(`${fmt(f.total)} €`, mR-3, y+7, {align:'right'})
    y += 18

    doc.setFillColor(184,237,212); doc.rect(mL,y,mR-mL,11,'F')
    doc.setTextColor(46,138,94); doc.setFont('helvetica','bold'); doc.setFontSize(11)
    doc.text('TOTAL FACTURA', mL+3, y+7.5)
    doc.text(`${fmt(f.total)} €`, mR-3, y+7.5, {align:'right'})

    doc.setFillColor(247,249,252); doc.rect(0,285,W,12,'F')
    doc.setTextColor(153,153,153); doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.text(`Generado con Khepria · ${new Date().toLocaleDateString('es-ES')} · Factura nº ${f.numero}`, 105, 292, {align:'center'})

    doc.save(`factura-${f.numero}.pdf`)
  }

  async function generarFacturaOficialPDF(f: FacturaOficial) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit:'mm', format:'a4' })
    const W = 210, mL = 14, mR = 196
    const dir = [negocioDatos.direccion, negocioDatos.codigo_postal, negocioDatos.ciudad].filter(Boolean).join(', ')
    const ivaCuota = +(f.base_imponible * f.iva / 100).toFixed(2)
    const irpfCuota = +(f.base_imponible * f.irpf / 100).toFixed(2)
    let y = 0

    doc.setFillColor(17,24,39); doc.rect(0,0,W,26,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16)
    doc.text('FACTURA', mL, 16)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text(`Nº ${f.numero}  ·  ${new Date(f.fecha+'T12:00').toLocaleDateString('es-ES')}`, mR, 16, {align:'right'})
    y = 34

    doc.setFillColor(247,249,252); doc.setDrawColor(229,231,235)
    doc.roundedRect(mL,y,85,34,3,3,'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('EMISOR', mL+4, y+7)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(negocioNombre, mL+4, y+15)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    if (dir) doc.text(dir, mL+4, y+22)
    if (negocioDatos.telefono) doc.text(`Tel: ${negocioDatos.telefono}`, mL+4, y+29)

    doc.setFillColor(247,249,252)
    doc.roundedRect(111,y,85,34,3,3,'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('DESTINATARIO', 115, y+7)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(f.cliente_nombre, 115, y+15)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    if (f.cliente_nif) doc.text(`NIF/CIF: ${f.cliente_nif}`, 115, y+22)
    y += 44

    doc.setFillColor(17,24,39); doc.rect(mL,y,mR-mL,8,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('CONCEPTO', mL+3, y+5.5)
    doc.text('BASE', mR-80, y+5.5, {align:'right'})
    doc.text('IVA', mR-50, y+5.5, {align:'right'})
    doc.text('IRPF', mR-22, y+5.5, {align:'right'})
    doc.text('TOTAL', mR-3, y+5.5, {align:'right'})
    y += 8
    doc.setFillColor(255,255,255); doc.rect(mL,y,mR-mL,10,'F')
    doc.setTextColor(17,24,39); doc.setFont('helvetica','normal'); doc.setFontSize(9)
    doc.text(f.concepto || 'Servicios profesionales', mL+3, y+7)
    doc.text(`${fmt(f.base_imponible)} €`, mR-80, y+7, {align:'right'})
    doc.text(`${f.iva}% (${fmt(ivaCuota)} €)`, mR-50, y+7, {align:'right'})
    doc.text(f.irpf > 0 ? `−${f.irpf}% (${fmt(irpfCuota)} €)` : '—', mR-22, y+7, {align:'right'})
    doc.setFont('helvetica','bold')
    doc.text(`${fmt(f.total)} €`, mR-3, y+7, {align:'right'})
    y += 18

    const rowsDet: [string, string][] = [
      ['Base imponible', `${fmt(f.base_imponible)} €`],
      [`IVA (${f.iva}%)`, `${fmt(ivaCuota)} €`],
      ...(f.irpf > 0 ? [[`Retención IRPF (${f.irpf}%)`, `−${fmt(irpfCuota)} €`] as [string,string]] : []),
    ]
    rowsDet.forEach(([l,v], i) => {
      const ry = y + i * 8
      doc.setFillColor(i%2===0?255:250,i%2===0?255:250,i%2===0?255:252)
      doc.rect(mR-90, ry, 90, 8, 'F')
      doc.setTextColor(75,85,99); doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text(l, mR-87, ry+5.5)
      doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
      doc.text(v, mR-3, ry+5.5, {align:'right'})
    })
    y += rowsDet.length * 8 + 2

    doc.setFillColor(184,237,212); doc.rect(mR-90,y,90,11,'F')
    doc.setTextColor(46,138,94); doc.setFont('helvetica','bold'); doc.setFontSize(11)
    doc.text('TOTAL', mR-87, y+7.5)
    doc.text(`${fmt(f.total)} €`, mR-3, y+7.5, {align:'right'})

    doc.setFillColor(247,249,252); doc.rect(0,285,W,12,'F')
    doc.setTextColor(153,153,153); doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.text(`Generado con Khepria · Factura nº ${f.numero} · ${new Date().toLocaleDateString('es-ES')}`, 105, 292, {align:'center'})

    doc.save(`factura-${f.numero}.pdf`)
  }

  async function generarPDF303() {
    if (!datosTrim) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit:'mm', format:'a4' })
    const W = 210, mL = 14, mR = 196
    const d = datosTrim
    const resultado = d.ivaRepercutido - d.ivaSoportado
    let y = 0

    // Header oficial
    doc.setFillColor(17,24,39); doc.rect(0,0,W,32,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11)
    doc.text('AGENCIA TRIBUTARIA', mL, 11)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('Administración Electrónica de la AEAT', mL, 18)
    doc.setFontSize(18); doc.setFont('helvetica','bold')
    doc.text('MODELO 303', mR, 14, {align:'right'})
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('Autoliquidación IVA — Régimen General', mR, 21, {align:'right'})
    doc.setFontSize(8)
    doc.text('Ejercicio 2026', mR, 28, {align:'right'})
    y = 40

    // Identificación
    doc.setFillColor(247,249,252); doc.setDrawColor(229,231,235)
    doc.roundedRect(mL, y, mR-mL, 22, 3, 3, 'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('IDENTIFICACIÓN DEL DECLARANTE', mL+4, y+7)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(negocioNombre, mL+4, y+15)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    doc.text(`Período: ${trimestreLabel} (${mesesTrimestre})`, mR-4, y+9, {align:'right'})
    doc.text('NIF: ________________  ·  Régimen: General', mR-4, y+17, {align:'right'})
    y += 30

    const seccion = (titulo: string) => {
      doc.setFillColor(29,78,216); doc.rect(mL, y, mR-mL, 7, 'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
      doc.text(titulo, mL+3, y+5)
      y += 7
    }
    const fila = (label: string, val: string, bold=false, color=[17,24,39] as [number,number,number]) => {
      doc.setFillColor(255,255,255); doc.rect(mL, y, mR-mL, 9, 'F')
      doc.setDrawColor(229,231,235); doc.line(mL, y+9, mR, y+9)
      doc.setTextColor(75,85,99); doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text(label, mL+3, y+6)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setTextColor(...color)
      doc.text(val, mR-3, y+6, {align:'right'})
      y += 9
    }

    seccion('SECCIÓN 1 — IVA DEVENGADO (repercutido a clientes)')
    fila('Base imponible total (ventas/prestaciones)', `${fmt(d.baseIngresos)} €`)
    fila('Cuota IVA repercutida (21% / 10% / 4%)', `${fmt(d.ivaRepercutido)} €`)
    y += 4

    seccion('SECCIÓN 2 — IVA DEDUCIBLE (soportado en gastos)')
    fila('Base imponible gastos deducibles', `${fmt(d.totalGastoBase)} €`)
    fila('Cuota IVA soportada', `${fmt(d.ivaSoportado)} €`)
    y += 4

    seccion('RESULTADO DE LA AUTOLIQUIDACIÓN')
    fila('IVA repercutido (Sec. 1)', `${fmt(d.ivaRepercutido)} €`)
    fila('IVA deducible (Sec. 2)', `${fmt(d.ivaSoportado)} €`)

    doc.setFillColor(resultado >= 0 ? 254 : 184, resultado >= 0 ? 226 : 237, resultado >= 0 ? 226 : 212)
    doc.rect(mL, y, mR-mL, 13, 'F')
    doc.setTextColor(resultado >= 0 ? 220 : 46, resultado >= 0 ? 38 : 138, resultado >= 0 ? 38 : 94)
    doc.setFont('helvetica','bold'); doc.setFontSize(12)
    doc.text(resultado >= 0 ? 'RESULTADO A INGRESAR' : 'RESULTADO A DEVOLVER', mL+3, y+9)
    doc.text(`${fmt(Math.abs(resultado))} €`, mR-3, y+9, {align:'right'})
    y += 22

    // Aviso
    doc.setFillColor(255,251,235); doc.setDrawColor(253,230,138)
    doc.roundedRect(mL, y, mR-mL, 16, 3, 3, 'FD')
    doc.setTextColor(146,64,14); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
    doc.text('⚠  AVISO LEGAL', mL+4, y+7)
    doc.setFont('helvetica','normal')
    doc.text('Este documento es orientativo. Verifique los datos con su gestor antes de presentar en Sede Electrónica AEAT.', mL+4, y+13)
    y += 24

    // Firma
    doc.setDrawColor(180,180,180)
    doc.line(mL, y+22, mL+72, y+22)
    doc.setTextColor(120,120,120); doc.setFontSize(8); doc.setFont('helvetica','normal')
    doc.text('Firma del declarante', mL+36, y+27, {align:'center'})

    doc.setFillColor(247,249,252); doc.rect(0,285,W,12,'F')
    doc.setTextColor(153,153,153); doc.setFontSize(7)
    doc.text(`Generado con Khepria · Modelo 303 · ${trimestreLabel} · ${new Date().toLocaleDateString('es-ES')}`, 105, 292, {align:'center'})

    doc.save(`modelo-303-${trimestreLabel.replace(' ','-')}.pdf`)
  }

  async function generarPDF130() {
    if (!datosTrim) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit:'mm', format:'a4' })
    const W = 210, mL = 14, mR = 196
    const d = datosTrim
    const rendNeto = Math.max(0, d.baseIngresos - d.totalGastoBase)
    const irpf20 = rendNeto * 0.20
    const resultado = irpf20  // sin retenciones previas en trimestres anteriores (simplificado)
    let y = 0

    doc.setFillColor(17,24,39); doc.rect(0,0,W,32,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11)
    doc.text('AGENCIA TRIBUTARIA', mL, 11)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('Administración Electrónica de la AEAT', mL, 18)
    doc.setFontSize(18); doc.setFont('helvetica','bold')
    doc.text('MODELO 130', mR, 14, {align:'right'})
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('Pago fraccionado IRPF — Autónomos estimación directa', mR, 21, {align:'right'})
    doc.setFontSize(8); doc.text('Ejercicio 2026', mR, 28, {align:'right'})
    y = 40

    doc.setFillColor(247,249,252); doc.setDrawColor(229,231,235)
    doc.roundedRect(mL,y,mR-mL,22,3,3,'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('IDENTIFICACIÓN DEL DECLARANTE', mL+4, y+7)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(negocioNombre, mL+4, y+15)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    doc.text(`Período: ${trimestreLabel} (${mesesTrimestre})`, mR-4, y+9, {align:'right'})
    doc.text('NIF: ________________  ·  Estimación directa', mR-4, y+17, {align:'right'})
    y += 30

    const seccion = (t: string) => {
      doc.setFillColor(29,78,216); doc.rect(mL,y,mR-mL,7,'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
      doc.text(t, mL+3, y+5); y += 7
    }
    const fila = (l: string, v: string) => {
      doc.setFillColor(255,255,255); doc.rect(mL,y,mR-mL,9,'F')
      doc.setDrawColor(229,231,235); doc.line(mL,y+9,mR,y+9)
      doc.setTextColor(75,85,99); doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text(l, mL+3, y+6)
      doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
      doc.text(v, mR-3, y+6, {align:'right'}); y += 9
    }

    seccion('APARTADO 1 — ACTIVIDADES ECONÓMICAS')
    fila('Ingresos del trimestre (base imponible ventas)', `${fmt(d.baseIngresos)} €`)
    fila('Gastos deducibles del trimestre', `${fmt(d.totalGastoBase)} €`)
    y += 4

    seccion('APARTADO 2 — CÁLCULO DEL PAGO FRACCIONADO')
    fila('Rendimiento neto (ingresos − gastos)', `${fmt(rendNeto)} €`)
    fila('20% del rendimiento neto', `${fmt(irpf20)} €`)
    y += 4

    seccion('RESULTADO')
    doc.setFillColor(resultado > 0 ? 254 : 184, resultado > 0 ? 226 : 237, resultado > 0 ? 226 : 212)
    doc.rect(mL,y,mR-mL,13,'F')
    doc.setTextColor(resultado > 0 ? 220 : 46, resultado > 0 ? 38 : 138, resultado > 0 ? 38 : 94)
    doc.setFont('helvetica','bold'); doc.setFontSize(12)
    doc.text('IMPORTE A INGRESAR', mL+3, y+9)
    doc.text(`${fmt(Math.max(0, resultado))} €`, mR-3, y+9, {align:'right'})
    y += 22

    doc.setFillColor(235,242,255); doc.setDrawColor(184,216,248)
    doc.roundedRect(mL,y,mR-mL,18,3,3,'FD')
    doc.setTextColor(29,78,216); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('Referencia 2026', mL+4, y+7)
    doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99); doc.setFontSize(8)
    doc.text(`SMI 2026: 1.184 €/mes  ·  Período: ${mesesTrimestre}  ·  Tasa: 20% rendimiento neto`, mL+4, y+14)
    y += 26

    doc.setFillColor(255,251,235); doc.setDrawColor(253,230,138)
    doc.roundedRect(mL,y,mR-mL,16,3,3,'FD')
    doc.setTextColor(146,64,14); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
    doc.text('⚠  AVISO LEGAL', mL+4, y+7)
    doc.setFont('helvetica','normal')
    doc.text('Documento orientativo. Deducciones adicionales y retenciones de ejercicios anteriores requieren consulta con gestor.', mL+4, y+13)

    doc.setFillColor(247,249,252); doc.rect(0,285,W,12,'F')
    doc.setTextColor(153,153,153); doc.setFontSize(7)
    doc.text(`Generado con Khepria · Modelo 130 · ${trimestreLabel} · ${new Date().toLocaleDateString('es-ES')}`, 105, 292, {align:'center'})

    doc.save(`modelo-130-${trimestreLabel.replace(' ','-')}.pdf`)
  }

  async function generarPDF111() {
    if (!datosTrim) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit:'mm', format:'a4' })
    const W = 210, mL = 14, mR = 196
    const d = datosTrim
    let y = 0

    doc.setFillColor(17,24,39); doc.rect(0,0,W,32,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11)
    doc.text('AGENCIA TRIBUTARIA', mL, 11)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('Administración Electrónica de la AEAT', mL, 18)
    doc.setFontSize(18); doc.setFont('helvetica','bold')
    doc.text('MODELO 111', mR, 14, {align:'right'})
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('Retenciones IRPF — Rendimientos del Trabajo', mR, 21, {align:'right'})
    doc.setFontSize(8); doc.text('Ejercicio 2026', mR, 28, {align:'right'})
    y = 40

    doc.setFillColor(247,249,252); doc.setDrawColor(229,231,235)
    doc.roundedRect(mL,y,mR-mL,22,3,3,'FD')
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(153,153,153)
    doc.text('IDENTIFICACIÓN DEL RETENEDOR', mL+4, y+7)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
    doc.text(negocioNombre, mL+4, y+15)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(75,85,99)
    doc.text(`Período: ${trimestreLabel} (${mesesTrimestre})`, mR-4, y+9, {align:'right'})
    doc.text('NIF: ________________', mR-4, y+17, {align:'right'})
    y += 30

    doc.setFillColor(29,78,216); doc.rect(mL,y,mR-mL,7,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('RENDIMIENTOS DEL TRABAJO PERSONAL', mL+3, y+5); y += 7

    const fila = (l: string, v: string) => {
      doc.setFillColor(255,255,255); doc.rect(mL,y,mR-mL,9,'F')
      doc.setDrawColor(229,231,235); doc.line(mL,y+9,mR,y+9)
      doc.setTextColor(75,85,99); doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text(l, mL+3, y+6)
      doc.setFont('helvetica','bold'); doc.setTextColor(17,24,39)
      doc.text(v, mR-3, y+6, {align:'right'}); y += 9
    }

    // Estimated bruto from retenciones (retenciones/irpf_avg ≈ bruto)
    const brutoEstimado = d.retenciones > 0 ? d.retenciones / 0.15 : 0 // 15% avg estimation
    fila('Número de perceptores', `${d.retenciones > 0 ? '(ver nóminas)' : '0'}`)
    fila('Importe retribuciones íntegras (estimado)', `${fmt(brutoEstimado)} €`)
    fila('Importe retenciones e ingresos a cuenta (IRPF)', `${fmt(d.retenciones)} €`)
    y += 4

    doc.setFillColor(29,78,216); doc.rect(mL,y,mR-mL,7,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('RESULTADO', mL+3, y+5); y += 7

    doc.setFillColor(254,226,226); doc.rect(mL,y,mR-mL,13,'F')
    doc.setTextColor(220,38,38); doc.setFont('helvetica','bold'); doc.setFontSize(12)
    doc.text('TOTAL A INGRESAR', mL+3, y+9)
    doc.text(`${fmt(d.retenciones)} €`, mR-3, y+9, {align:'right'})
    y += 22

    doc.setFillColor(255,251,235); doc.setDrawColor(253,230,138)
    doc.roundedRect(mL,y,mR-mL,16,3,3,'FD')
    doc.setTextColor(146,64,14); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
    doc.text('⚠  AVISO LEGAL', mL+4, y+7)
    doc.setFont('helvetica','normal')
    doc.text('Las retenciones se calculan a partir de las nóminas registradas en Khepria. Verifique con su gestor antes de presentar.', mL+4, y+13)

    doc.setFillColor(247,249,252); doc.rect(0,285,W,12,'F')
    doc.setTextColor(153,153,153); doc.setFontSize(7)
    doc.text(`Generado con Khepria · Modelo 111 · ${trimestreLabel} · ${new Date().toLocaleDateString('es-ES')}`, 105, 292, {align:'center'})

    doc.save(`modelo-111-${trimestreLabel.replace(' ','-')}.pdf`)
  }

  function exportarCSV() {
    if (!datosTrim) return
    const d = datosTrim
    const rendNeto = Math.max(0, d.baseIngresos - d.totalGastoBase)
    const rows = [
      ['Concepto', 'Importe (€)'],
      ['--- INGRESOS ---', ''],
      ['Ingresos brutos (con IVA)', d.totalIngresos.toFixed(2)],
      ['Base imponible ingresos', d.baseIngresos.toFixed(2)],
      ['IVA repercutido', d.ivaRepercutido.toFixed(2)],
      ['--- GASTOS ---', ''],
      ['Gastos totales (con IVA)', d.totalGastos.toFixed(2)],
      ['Base imponible gastos', d.totalGastoBase.toFixed(2)],
      ['IVA soportado (deducible)', d.ivaSoportado.toFixed(2)],
      ['--- MODELOS FISCALES ---', ''],
      ['M.303 — IVA a pagar (rep. − sop.)', (d.ivaRepercutido - d.ivaSoportado).toFixed(2)],
      ['M.130 — Rendimiento neto', rendNeto.toFixed(2)],
      ['M.130 — IRPF a pagar (20%)', (rendNeto * 0.20).toFixed(2)],
      ['M.111 — Retenciones trabajadores', d.retenciones.toFixed(2)],
      ['--- REFERENCIA ---', ''],
      ['Período', trimestreLabel],
      ['Meses', mesesTrimestre],
      ['Generado', new Date().toLocaleDateString('es-ES')],
      ['Generado con', 'Khepria'],
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `khepria-gestor-${trimestreLabel.replace(' ','-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  async function guardarFacturaOficial() {
    if (!negocioId || !facturaForm.cliente_nombre || !facturaForm.total) return
    setGuardandoFactura(true)
    const total = parseFloat(facturaForm.total) || 0
    const ivaPct = parseFloat(facturaForm.iva_pct) || 0
    const irpfPct = parseFloat(facturaForm.irpf_pct) || 0
    const base = +(total / (1 + ivaPct / 100)).toFixed(2)

    // Next numero
    const { count } = await supabase.from('facturas').select('*', { count:'exact', head:true }).eq('negocio_id', negocioId)
    const siguiente = (count || 0) + 1
    const numero = `${trimAno}-${String(siguiente).padStart(4,'0')}`

    const { data, error } = await supabase.from('facturas').insert({
      negocio_id: negocioId, numero, fecha: facturaForm.fecha,
      cliente_nombre: facturaForm.cliente_nombre,
      cliente_nif: facturaForm.cliente_nif || null,
      concepto: facturaForm.concepto || null,
      base_imponible: base, iva: ivaPct, irpf: irpfPct, total,
    }).select().single()

    if (!error && data) {
      setFacturasOficiales(prev => [data as FacturaOficial, ...prev])
      setFacturaModal(false)
      setFacturaForm({ cliente_nombre:'', cliente_nif:'', concepto:'', iva_pct:'21', irpf_pct:'0', total:'', fecha: hoy.toISOString().split('T')[0] })
    } else if (error) {
      alert(`Error al guardar: ${error.message}`)
    }
    setGuardandoFactura(false)
  }

  // ── Gastos handlers (unchanged) ───────────────────────────────────────────

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function manejarArchivo(file: File) {
    if (file.size > 10 * 1024 * 1024) { alert('Máximo 10MB.'); return }
    const tipo = file.type
    if (!tipo.startsWith('image/') && tipo !== 'application/pdf') { alert('Solo imágenes o PDF.'); return }
    setArchivo(file); setGastoDraft(null)
    if (tipo.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setArchivoPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else { setArchivoPreview(null) }
    setAnalizando(true)
    try {
      const b64 = await fileToBase64(file)
      const res = await fetch('/api/gemini', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: tipo, data: b64 } },
            { text: 'Extrae datos fiscales de este ticket/factura. Solo JSON: {"proveedor":"","fecha":"YYYY-MM-DD","base_imponible":number,"iva_porcentaje":number,"cuota_iva":number,"total":number}' }
          ]}],
          generationConfig: { maxOutputTokens:200, temperature:0.1 },
        }),
      })
      if (res.ok) {
        const json = await res.json()
        const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const clean = raw.trim().replace(/^```(?:json)?\n?/,'').replace(/\n?```$/,'')
        try {
          const p = JSON.parse(clean)
          const total = p.total ?? 0; const ivaPct = p.iva_porcentaje ?? 21
          const cuota = p.cuota_iva ?? +(total - total/(1+ivaPct/100)).toFixed(2)
          const base = p.base_imponible ?? +(total/(1+ivaPct/100)).toFixed(2)
          setGastoDraft({ fecha: p.fecha ?? hoy.toISOString().split('T')[0], proveedor: p.proveedor ?? '', base_imponible: String(base), iva_porcentaje: String(ivaPct), cuota_iva: String(cuota), total: String(total) })
        } catch { setGastoDraft({ fecha: hoy.toISOString().split('T')[0], proveedor:'', base_imponible:'', iva_porcentaje:'21', cuota_iva:'', total:'' }) }
      }
    } catch { setGastoDraft({ fecha: hoy.toISOString().split('T')[0], proveedor:'', base_imponible:'', iva_porcentaje:'21', cuota_iva:'', total:'' }) }
    finally { setAnalizando(false) }
  }

  function recalcularCuota(draft: GastoDraft, campo: 'total'|'base_imponible'|'iva_porcentaje', valor: string): GastoDraft {
    const d = { ...draft, [campo]: valor }
    const ivaPct = parseFloat(d.iva_porcentaje) || 0
    if (campo === 'total') {
      const total = parseFloat(valor) || 0; const base = total / (1+ivaPct/100)
      return { ...d, base_imponible: base.toFixed(2), cuota_iva: (total-base).toFixed(2) }
    }
    const base = parseFloat(d.base_imponible) || 0; const cuota = base * ivaPct / 100
    return { ...d, cuota_iva: cuota.toFixed(2), total: (base+cuota).toFixed(2) }
  }

  async function guardarGasto() {
    if (!gastoDraft || !negocioId || !archivo) return
    setGuardandoGasto(true)
    try {
      const ext = archivo.name.split('.').pop() ?? 'jpg'
      const path = `${negocioId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('facturas').upload(path, archivo)
      if (uploadErr) throw new Error(uploadErr.message)
      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('gastos').insert({
        negocio_id: negocioId, fecha: gastoDraft.fecha || hoy.toISOString().split('T')[0],
        proveedor: gastoDraft.proveedor || null,
        base_imponible: parseFloat(gastoDraft.base_imponible)||0,
        iva_porcentaje: parseInt(gastoDraft.iva_porcentaje)||0,
        cuota_iva: parseFloat(gastoDraft.cuota_iva)||0,
        total: parseFloat(gastoDraft.total)||0, foto_url: publicUrl,
      })
      if (dbErr) throw new Error(dbErr.message)
      await cargarGastos(negocioId, anio, mes)
      setUploadModal(false); setArchivo(null); setArchivoPreview(null); setGastoDraft(null)
    } catch (e: any) { alert(`Error: ${e.message}`) }
    finally { setGuardandoGasto(false) }
  }

  async function eliminarGasto(gasto: Gasto) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', gasto.id)
    if (gasto.foto_url) {
      const match = gasto.foto_url.match(/facturas\/(.+)$/)
      if (match) await supabase.storage.from('facturas').remove([match[1]])
    }
    setGastos(prev => prev.filter(g => g.id !== gasto.id))
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF;
          --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --lila: #D4C5F9; --lila-dark: #6B4FD8;
          --green: #B8EDD4; --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2);
          --red: rgba(254,226,226,0.5); --red-dark: #DC2626;
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .content { padding: 24px 28px; flex: 1; }
        .section-block { margin-bottom: 32px; }
        .section-title { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
        .section-sub { font-size: 13px; color: var(--muted); margin-bottom: 14px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .mes-nav { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .mes-nav-btn { background: var(--white); border: 1.5px solid var(--border); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; color: var(--text2); }
        .mes-nav-btn:hover:not(:disabled) { background: var(--bg); }
        .mes-nav-btn:disabled { opacity: 0.35; cursor: default; }
        .mes-label { font-size: 15px; font-weight: 700; color: var(--text); min-width: 160px; text-align: center; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
        .tabla { width: 100%; border-collapse: collapse; }
        .tabla th { padding: 11px 16px; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; text-align: right; border-bottom: 1px solid var(--border); background: var(--bg); }
        .tabla th:first-child { text-align: left; }
        .tabla td { padding: 13px 16px; font-size: 14px; color: var(--text2); text-align: right; border-bottom: 1px solid var(--border); }
        .tabla td:first-child { text-align: left; font-weight: 600; color: var(--text); }
        .tabla tr:last-child td { border-bottom: none; }
        .tabla .total-row td { background: var(--bg); font-weight: 700; color: var(--text); border-top: 2px solid var(--border); }
        .badge-iva { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 700; }
        .badge-21 { background: #EDE9FE; color: #6D28D9; }
        .badge-10 { background: #DBEAFE; color: #1D4ED8; }
        .badge-4  { background: #D1FAE5; color: #065F46; }
        .badge-0  { background: #F3F4F6; color: #6B7280; }
        .empty-state { padding: 48px; text-align: center; color: var(--muted); font-size: 14px; }
        .factura-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
        .factura-row:last-child { border-bottom: none; }
        .factura-row:hover { background: var(--bg); }
        .factura-num { font-size: 12px; font-weight: 700; color: var(--muted); font-family: monospace; white-space: nowrap; }
        .factura-info { flex: 1; min-width: 0; }
        .factura-cliente { font-size: 14px; font-weight: 700; color: var(--text); }
        .factura-servicio { font-size: 12px; color: var(--muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .factura-fecha { font-size: 12px; color: var(--muted); white-space: nowrap; }
        .factura-total { font-size: 15px; font-weight: 800; color: var(--text); white-space: nowrap; }
        .factura-chevron { color: var(--muted); font-size: 16px; }
        .factura-detalle { background: #FAFBFC; border-bottom: 1px solid var(--border); padding: 16px 20px; }
        .det-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 14px; }
        .det-item label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
        .det-item span { font-size: 13px; font-weight: 600; color: var(--text); }
        .det-totales { display: flex; flex-direction: column; gap: 4px; padding-top: 12px; border-top: 1px solid var(--border); }
        .det-linea { display: flex; justify-content: space-between; font-size: 13px; color: var(--text2); }
        .det-linea.bold { font-weight: 800; color: var(--text); font-size: 15px; }
        .btn-pdf { display: flex; align-items: center; gap: 6px; margin-top: 14px; padding: 9px 18px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .modelos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .modelo-card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 10px; }
        .modelo-num { font-size: 22px; font-weight: 900; color: var(--text); letter-spacing: -1px; }
        .modelo-nombre { font-size: 13px; font-weight: 600; color: var(--text2); }
        .modelo-desc { font-size: 12px; color: var(--muted); line-height: 1.5; flex: 1; }
        .modelo-meta { font-size: 11px; color: var(--blue-dark); font-weight: 600; background: var(--blue-soft); padding: 4px 10px; border-radius: 8px; display: inline-block; }
        .btn-modelo { padding: 9px 16px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .btn-modelo:hover { background: var(--bg); }
        .trim-selector { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
        .trim-select { padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; color: var(--text); outline: none; background: white; }
        .btn-cargar-trim { padding: 9px 18px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .datos-trim-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
        .dt-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; }
        .dt-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .dt-val { font-size: 18px; font-weight: 800; color: var(--text); }
        .dt-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
        .modal { background: var(--white); border-radius: 20px; width: 100%; max-width: 520px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; }
        .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .modal-title { font-size: 17px; font-weight: 800; color: var(--text); }
        .modal-close { background: none; border: none; cursor: pointer; font-size: 22px; color: var(--muted); }
        .modal-body { padding: 20px 24px; }
        .modal-aviso { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #92400E; line-height: 1.6; margin-bottom: 16px; }
        .modal-fila { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .modal-fila:last-child { border-bottom: none; }
        .modal-fila label { color: var(--text2); }
        .modal-fila span { font-weight: 700; color: var(--text); }
        .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
        .btn-primary { padding: 10px 24px; border-radius: 10px; background: var(--text); color: white; border: none; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-secondary { padding: 10px 20px; border-radius: 10px; background: none; border: 1.5px solid var(--border); font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text2); cursor: pointer; }
        .btn-subir { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .gasto-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--border); transition: background 0.1s; }
        .gasto-row:last-child { border-bottom: none; }
        .gasto-row:hover { background: var(--bg); }
        .gasto-thumb { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
        .gasto-pdf-icon { width: 36px; height: 36px; border-radius: 8px; background: #FEF3C7; border: 1px solid #FDE68A; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .gasto-info { flex: 1; min-width: 0; }
        .gasto-proveedor { font-size: 14px; font-weight: 700; color: var(--text); }
        .gasto-fecha { font-size: 12px; color: var(--muted); margin-top: 1px; }
        .gasto-iva { font-size: 12px; color: var(--muted); white-space: nowrap; }
        .gasto-total { font-size: 15px; font-weight: 800; color: var(--text); white-space: nowrap; }
        .gasto-del { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 16px; padding: 4px; border-radius: 6px; }
        .gasto-del:hover { background: #FEE2E2; color: #DC2626; }
        .drop-zone { border: 2px dashed var(--border); border-radius: 16px; padding: 32px 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bg); }
        .drop-zone.over { border-color: var(--lila-dark); background: rgba(212,197,249,0.08); }
        .drop-zone:hover { border-color: var(--lila-dark); }
        .preview-img { width: 100%; max-height: 200px; object-fit: contain; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); }
        .preview-pdf { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; }
        .analyzing { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 28px; }
        .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--lila-dark); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        .form-field label { font-size: 12px; font-weight: 700; color: var(--text2); }
        .form-field input, .form-field select { padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; }
        .form-field input:focus, .form-field select:focus { border-color: var(--blue-dark); }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .kit-card { background: linear-gradient(135deg, rgba(184,216,248,0.2), rgba(184,237,212,0.2)); border: 1px solid rgba(184,216,248,0.4); border-radius: 18px; padding: 22px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .resultado-pagar { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #92400E; margin-top: 12px; }
        .resultado-devolver { background: #D1FAE5; border: 1px solid #6EE7B7; border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #065F46; margin-top: 12px; }
        @media (max-width: 768px) {
          .content { padding: 16px; }
          .modelos-grid { grid-template-columns: 1fr; }
          .datos-trim-grid { grid-template-columns: 1fr 1fr; }
          .det-grid { grid-template-columns: 1fr; }
          .grid2 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Nav mes ── */}
      <div className="mes-nav">
        <button className="mes-nav-btn" onClick={prevMes}>‹</button>
        <span className="mes-label">{MESES[mes]} {anio}</span>
        <button className="mes-nav-btn" onClick={nextMes} disabled={anio === hoy.getFullYear() && mes === hoy.getMonth()}>›</button>
      </div>

      {/* ── 1. RESUMEN IVA ── */}
      <div className="section-block">
        <div className="section-title">Resumen IVA</div>
        <div className="section-sub">Ingresos del mes agrupados por tipo de IVA — reservas completadas</div>
        <div className="card">
          {cargando ? <div className="empty-state">Cargando...</div>
          : filaIva.length === 0 ? <div className="empty-state">Sin ingresos en {MESES[mes].toLowerCase()} {anio}</div>
          : (
            <table className="tabla">
              <thead><tr><th>Tipo IVA</th><th>Base imponible</th><th>Cuota IVA</th><th>Total</th></tr></thead>
              <tbody>
                {filaIva.map(f => (
                  <tr key={f.tipo}>
                    <td><span className={`badge-iva badge-${f.tipo}`}>{f.tipo}%</span></td>
                    <td>{fmt(f.base)} €</td><td>{fmt(f.cuota)} €</td>
                    <td style={{fontWeight:700, color:'var(--text)'}}>{fmt(f.total)} €</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total</td><td>{fmt(totalBase)} €</td><td>{fmt(totalCuota)} €</td><td>{fmt(totalTotal)} €</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── 2. FACTURAS AUTOMÁTICAS ── */}
      <div className="section-block">
        <div className="section-title">Facturas automáticas</div>
        <div className="section-sub">Generadas a partir de reservas completadas</div>
        <div className="card">
          {cargando ? <div className="empty-state">Cargando...</div>
          : facturasAuto.length === 0 ? <div className="empty-state">Sin facturas en {MESES[mes].toLowerCase()} {anio}</div>
          : facturasAuto.map(f => (
            <div key={f.numero}>
              <div className="factura-row" onClick={() => setFacturaAbierta(facturaAbierta === f.numero ? null : f.numero)}>
                <span className="factura-num">#{f.numero}</span>
                <div className="factura-info">
                  <div className="factura-cliente">{f.cliente}</div>
                  <div className="factura-servicio">{f.servicio}</div>
                </div>
                <span className="factura-fecha">{new Date(f.fecha+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}</span>
                <span className="factura-total">{fmt(f.total)} €</span>
                <span className="factura-chevron">{facturaAbierta === f.numero ? '▲' : '▼'}</span>
              </div>
              {facturaAbierta === f.numero && (
                <div className="factura-detalle">
                  <div className="det-grid">
                    <div className="det-item"><label>Nº Factura</label><span>{f.numero}</span></div>
                    <div className="det-item"><label>Fecha</label><span>{new Date(f.fecha+'T00:00:00').toLocaleDateString('es-ES')}</span></div>
                    <div className="det-item"><label>Cliente</label><span>{f.cliente}</span></div>
                    <div className="det-item"><label>Servicio</label><span>{f.servicio}</span></div>
                    <div className="det-item"><label>Emisor</label><span>{negocioNombre}</span></div>
                  </div>
                  <div className="det-totales">
                    <div className="det-linea"><label>Base imponible</label><span>{fmt(f.base)} €</span></div>
                    <div className="det-linea"><label>IVA ({f.iva_pct}%)</label><span>{fmt(f.cuota_iva)} €</span></div>
                    <div className="det-linea bold"><label>Total</label><span>{fmt(f.total)} €</span></div>
                  </div>
                  <button className="btn-pdf" onClick={() => generarFacturaAutoPDF(f)}>📄 Descargar PDF</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. FACTURAS OFICIALES ── */}
      <div className="section-block">
        <div className="section-header">
          <div>
            <div className="section-title">Facturas oficiales</div>
            <div className="section-sub">Facturación manual con campos AEAT obligatorios y numeración correlativa</div>
          </div>
          <button className="btn-subir" onClick={() => setFacturaModal(true)}>+ Nueva factura</button>
        </div>
        <div className="card">
          {facturasOficiales.length === 0 ? (
            <div className="empty-state">
              <div style={{fontSize:'32px', marginBottom:'8px'}}>🧾</div>
              Sin facturas oficiales. Pulsa "+ Nueva factura" para crear la primera.
            </div>
          ) : facturasOficiales.map(f => (
            <div key={f.id} className="factura-row" style={{cursor:'default'}}>
              <span className="factura-num" style={{minWidth:80}}>#{f.numero}</span>
              <div className="factura-info">
                <div className="factura-cliente">{f.cliente_nombre}</div>
                <div className="factura-servicio">{f.cliente_nif ? `NIF: ${f.cliente_nif}` : ''}{f.concepto ? ` · ${f.concepto}` : ''}</div>
              </div>
              <span className="factura-fecha">{new Date(f.fecha+'T12:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}</span>
              <span style={{fontSize:'11px', background:'var(--blue-soft)', color:'var(--blue-dark)', padding:'2px 8px', borderRadius:'100px', fontWeight:700, whiteSpace:'nowrap'}}>IVA {f.iva}%{f.irpf > 0 ? ` | IRPF −${f.irpf}%` : ''}</span>
              <span className="factura-total">{fmt(f.total)} €</span>
              <button className="btn-pdf" style={{margin:0, padding:'7px 12px', fontSize:'12px'}} onClick={() => generarFacturaOficialPDF(f)}>📄 PDF</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. GASTOS ── */}
      <div className="section-block">
        <div className="section-header">
          <div>
            <div className="section-title">Gastos</div>
            <div className="section-sub">Tickets y facturas de proveedores — IVA soportado deducible</div>
          </div>
          <button className="btn-subir" onClick={() => { setUploadModal(true); setArchivo(null); setArchivoPreview(null); setGastoDraft(null) }}>
            ⬆ Subir ticket
          </button>
        </div>
        <div className="card">
          {gastos.length === 0 ? (
            <div className="empty-state">
              <div style={{fontSize:'32px', marginBottom:'8px'}}>🧾</div>
              Sin gastos en {MESES[mes].toLowerCase()} {anio}
            </div>
          ) : (
            <>
              {gastos.map(g => (
                <div key={g.id} className="gasto-row">
                  {g.foto_url ? (
                    g.foto_url.toLowerCase().includes('.pdf')
                      ? <a href={g.foto_url} target="_blank" rel="noreferrer"><div className="gasto-pdf-icon">📄</div></a>
                      : <a href={g.foto_url} target="_blank" rel="noreferrer"><img src={g.foto_url} alt="" className="gasto-thumb" /></a>
                  ) : <div className="gasto-pdf-icon">🧾</div>}
                  <div className="gasto-info">
                    <div className="gasto-proveedor">{g.proveedor || 'Sin proveedor'}</div>
                    <div className="gasto-fecha">{new Date(g.fecha+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}</div>
                  </div>
                  <div className="gasto-iva">IVA {g.iva_porcentaje}% · {fmt(g.cuota_iva)} €</div>
                  <div className="gasto-total">{fmt(g.total)} €</div>
                  <button className="gasto-del" onClick={() => eliminarGasto(g)}>×</button>
                </div>
              ))}
              <div style={{padding:'12px 16px', borderTop:'2px solid var(--border)', display:'flex', justifyContent:'space-between', background:'var(--bg)'}}>
                <span style={{fontSize:'13px', fontWeight:700, color:'var(--text2)'}}>Total IVA soportado</span>
                <span style={{fontSize:'15px', fontWeight:800}}>{fmt(gastos.reduce((s,g) => s + g.cuota_iva, 0))} €</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 5. MODELOS FISCALES ── */}
      <div className="section-block">
        <div className="section-title">Modelos fiscales AEAT 2026</div>
        <div className="section-sub">Declaraciones trimestrales con PDF oficial descargable</div>

        {/* Selector trimestre */}
        <div className="trim-selector">
          <select className="trim-select" value={trim} onChange={e => setTrim(Number(e.target.value))}>
            <option value={1}>T1 — Ene, Feb, Mar</option>
            <option value={2}>T2 — Abr, May, Jun</option>
            <option value={3}>T3 — Jul, Ago, Sep</option>
            <option value={4}>T4 — Oct, Nov, Dic</option>
          </select>
          <select className="trim-select" value={trimAno} onChange={e => setTrimAno(Number(e.target.value))}>
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="btn-cargar-trim" onClick={() => { if (negocioId) cargarDatosTrimestre(negocioId, trim, trimAno) }} disabled={cargandoTrim}>
            {cargandoTrim ? 'Cargando...' : '📊 Cargar datos del trimestre'}
          </button>
        </div>

        {/* Resumen trimestre */}
        {datosTrim && (
          <div className="datos-trim-grid" style={{marginBottom:18}}>
            <div className="dt-card">
              <div className="dt-label">Ingresos (base)</div>
              <div className="dt-val">{fmt(datosTrim.baseIngresos)} €</div>
              <div className="dt-sub">IVA repercutido: {fmt(datosTrim.ivaRepercutido)} €</div>
            </div>
            <div className="dt-card">
              <div className="dt-label">Gastos (base)</div>
              <div className="dt-val">{fmt(datosTrim.totalGastoBase)} €</div>
              <div className="dt-sub">IVA soportado: {fmt(datosTrim.ivaSoportado)} €</div>
            </div>
            <div className="dt-card">
              <div className="dt-label">Retenciones trabajadores</div>
              <div className="dt-val">{fmt(datosTrim.retenciones)} €</div>
              <div className="dt-sub">IRPF nóminas del trimestre</div>
            </div>
          </div>
        )}

        <div className="modelos-grid">
          {/* Modelo 303 */}
          <div className="modelo-card">
            <div>
              <div className="modelo-num">303</div>
              <div className="modelo-nombre">IVA trimestral</div>
            </div>
            <div className="modelo-desc">
              IVA repercutido (ventas) − IVA soportado (gastos) = resultado a pagar o devolver.
            </div>
            {datosTrim && (
              <div className={datosTrim.ivaRepercutido - datosTrim.ivaSoportado >= 0 ? 'resultado-pagar' : 'resultado-devolver'} style={{fontSize:'13px', padding:'10px 12px'}}>
                <span>{datosTrim.ivaRepercutido - datosTrim.ivaSoportado >= 0 ? 'A pagar' : 'A devolver'}</span>
                <span>{fmt(Math.abs(datosTrim.ivaRepercutido - datosTrim.ivaSoportado))} €</span>
              </div>
            )}
            <div className="modelo-meta">Plazo: hasta el día 20 del mes siguiente al trimestre</div>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
              <button className="btn-modelo" onClick={() => { setModal303(true); if (negocioId && !datosTrim) cargarDatosTrimestre(negocioId, trim, trimAno) }}>
                📋 Ver resumen
              </button>
              {datosTrim && (
                <button className="btn-modelo" style={{background:'var(--text)', color:'white', border:'none'}} onClick={generarPDF303}>
                  📄 Descargar Modelo 303
                </button>
              )}
            </div>
          </div>

          {/* Modelo 130 */}
          <div className="modelo-card">
            <div>
              <div className="modelo-num">130</div>
              <div className="modelo-nombre">IRPF trimestral</div>
            </div>
            <div className="modelo-desc">
              Pago fraccionado IRPF autónomos. 20% del rendimiento neto (ingresos − gastos).
            </div>
            {datosTrim && (
              <div className="resultado-pagar" style={{fontSize:'13px', padding:'10px 12px'}}>
                <span>A ingresar (20%)</span>
                <span>{fmt(Math.max(0, datosTrim.baseIngresos - datosTrim.totalGastoBase) * 0.20)} €</span>
              </div>
            )}
            <div className="modelo-meta">Solo autónomos en estimación directa</div>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
              <button className="btn-modelo" onClick={() => { setModal130(true); if (negocioId && !datosTrim) cargarDatosTrimestre(negocioId, trim, trimAno) }}>
                📋 Ver resumen
              </button>
              {datosTrim && (
                <button className="btn-modelo" style={{background:'var(--text)', color:'white', border:'none'}} onClick={generarPDF130}>
                  📄 Descargar Modelo 130
                </button>
              )}
            </div>
          </div>

          {/* Modelo 111 */}
          <div className="modelo-card">
            <div>
              <div className="modelo-num">111</div>
              <div className="modelo-nombre">Retenciones IRPF trabajadores</div>
            </div>
            <div className="modelo-desc">
              Suma de retenciones IRPF de todos los trabajadores del trimestre. Calculado desde nóminas registradas.
            </div>
            {datosTrim && (
              <div className="resultado-pagar" style={{fontSize:'13px', padding:'10px 12px'}}>
                <span>Retenciones a ingresar</span>
                <span>{fmt(datosTrim.retenciones)} €</span>
              </div>
            )}
            <div className="modelo-meta">Solo si tienes trabajadores contratados</div>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
              <button className="btn-modelo" onClick={() => { setModal111(true); if (negocioId && !datosTrim) cargarDatosTrimestre(negocioId, trim, trimAno) }}>
                📋 Ver resumen
              </button>
              {datosTrim && (
                <button className="btn-modelo" style={{background:'var(--text)', color:'white', border:'none'}} onClick={generarPDF111}>
                  📄 Descargar Modelo 111
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. KIT PARA GESTOR ── */}
      <div className="section-block">
        <div className="section-title">Kit para gestor</div>
        <div className="section-sub">Exporta todos los datos del trimestre en un clic para enviárselos a tu gestor</div>
        <div className="kit-card">
          <div>
            <div style={{fontSize:'15px', fontWeight:800, color:'var(--text)', marginBottom:4}}>Exportar datos trimestrales</div>
            <div style={{fontSize:'13px', color:'var(--text2)', lineHeight:1.6}}>
              CSV con ingresos, gastos, IVA repercutido/soportado, diferencia IVA, IRPF estimado y retenciones.<br/>
              {!datosTrim && <span style={{color:'var(--muted)'}}>Carga primero los datos del trimestre con el botón de arriba.</span>}
            </div>
          </div>
          <button
            onClick={exportarCSV}
            disabled={!datosTrim}
            style={{padding:'12px 24px', background: datosTrim ? 'var(--text)' : 'var(--muted)', color:'white', border:'none', borderRadius:'12px', fontFamily:'inherit', fontSize:'14px', fontWeight:700, cursor: datosTrim ? 'pointer' : 'not-allowed', whiteSpace:'nowrap', flexShrink:0}}
          >
            📊 Exportar para gestor
          </button>
        </div>
      </div>

      {/* ── MODAL MODELO 303 ── */}
      {modal303 && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal303(false) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Modelo 303 — {trimestreLabel}</div>
              <button className="modal-close" onClick={() => setModal303(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-aviso">⚠️ Datos orientativos. Verifica con tu gestor antes de presentar en la Sede Electrónica AEAT.</div>
              {cargandoTrim ? <div style={{textAlign:'center', padding:'20px', color:'var(--muted)'}}>Cargando datos...</div> : datosTrim ? (<>
                <div className="modal-fila"><label>Período</label><span>{trimestreLabel} ({mesesTrimestre})</span></div>
                <div className="modal-fila"><label>Base imponible ingresos</label><span>{fmt(datosTrim.baseIngresos)} €</span></div>
                <div className="modal-fila"><label>IVA repercutido (ventas)</label><span>{fmt(datosTrim.ivaRepercutido)} €</span></div>
                <div className="modal-fila"><label>Base gastos deducibles</label><span>{fmt(datosTrim.totalGastoBase)} €</span></div>
                <div className="modal-fila"><label>IVA soportado (gastos)</label><span style={{color:'var(--green-dark)'}}>{fmt(datosTrim.ivaSoportado)} €</span></div>
                {(() => {
                  const res = datosTrim.ivaRepercutido - datosTrim.ivaSoportado
                  return (
                    <div className={res >= 0 ? 'resultado-pagar' : 'resultado-devolver'}>
                      <span>{res >= 0 ? 'IVA a ingresar' : 'IVA a devolver'}</span>
                      <span>{fmt(Math.abs(res))} €</span>
                    </div>
                  )
                })()}
              </>) : <div style={{textAlign:'center', padding:'20px', color:'var(--muted)'}}>Pulsa "Cargar datos del trimestre" en la pantalla principal.</div>}
            </div>
            <div className="modal-footer">
              {datosTrim && <button className="btn-primary" onClick={() => { generarPDF303(); setModal303(false) }}>📄 Descargar Modelo 303</button>}
              <button className="btn-secondary" onClick={() => setModal303(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MODELO 130 ── */}
      {modal130 && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal130(false) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Modelo 130 — {trimestreLabel}</div>
              <button className="modal-close" onClick={() => setModal130(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-aviso">⚠️ Solo autónomos en estimación directa. Gastos adicionales no registrados en Khepria reducirán el pago. Consulta con tu gestor.</div>
              {cargandoTrim ? <div style={{textAlign:'center', padding:'20px', color:'var(--muted)'}}>Cargando datos...</div> : datosTrim ? (<>
                <div className="modal-fila"><label>Período</label><span>{trimestreLabel} ({mesesTrimestre})</span></div>
                <div className="modal-fila"><label>Ingresos (base imponible)</label><span>{fmt(datosTrim.baseIngresos)} €</span></div>
                <div className="modal-fila"><label>Gastos deducibles</label><span>{fmt(datosTrim.totalGastoBase)} €</span></div>
                <div className="modal-fila"><label>Rendimiento neto</label><span>{fmt(Math.max(0, datosTrim.baseIngresos - datosTrim.totalGastoBase))} €</span></div>
                <div className="modal-fila"><label>Tipo (20%)</label><span>20%</span></div>
                <div className="resultado-pagar">
                  <span>Pago fraccionado IRPF</span>
                  <span>{fmt(Math.max(0, datosTrim.baseIngresos - datosTrim.totalGastoBase) * 0.20)} €</span>
                </div>
              </>) : <div style={{textAlign:'center', padding:'20px', color:'var(--muted)'}}>Pulsa "Cargar datos del trimestre" en la pantalla principal.</div>}
            </div>
            <div className="modal-footer">
              {datosTrim && <button className="btn-primary" onClick={() => { generarPDF130(); setModal130(false) }}>📄 Descargar Modelo 130</button>}
              <button className="btn-secondary" onClick={() => setModal130(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MODELO 111 ── */}
      {modal111 && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal111(false) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Modelo 111 — {trimestreLabel}</div>
              <button className="modal-close" onClick={() => setModal111(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-aviso">⚠️ Retenciones calculadas a partir de las nóminas registradas en Khepria. Verifica con tu gestor antes de presentar.</div>
              {cargandoTrim ? <div style={{textAlign:'center', padding:'20px', color:'var(--muted)'}}>Cargando datos...</div> : datosTrim ? (<>
                <div className="modal-fila"><label>Período</label><span>{trimestreLabel} ({mesesTrimestre})</span></div>
                <div className="modal-fila"><label>Retenciones IRPF trabajadores</label><span>{fmt(datosTrim.retenciones)} €</span></div>
                <div className="resultado-pagar">
                  <span>Total a ingresar</span>
                  <span>{fmt(datosTrim.retenciones)} €</span>
                </div>
                {datosTrim.retenciones === 0 && (
                  <div style={{marginTop:12, fontSize:13, color:'var(--muted)', textAlign:'center'}}>Sin retenciones registradas en nóminas de este trimestre.</div>
                )}
              </>) : <div style={{textAlign:'center', padding:'20px', color:'var(--muted)'}}>Pulsa "Cargar datos del trimestre" en la pantalla principal.</div>}
            </div>
            <div className="modal-footer">
              {datosTrim && <button className="btn-primary" onClick={() => { generarPDF111(); setModal111(false) }}>📄 Descargar Modelo 111</button>}
              <button className="btn-secondary" onClick={() => setModal111(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVA FACTURA OFICIAL ── */}
      {facturaModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setFacturaModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Nueva factura oficial</div>
              <button className="modal-close" onClick={() => setFacturaModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Cliente *</label>
                <input type="text" placeholder="Nombre o razón social" value={facturaForm.cliente_nombre} onChange={e => setFacturaForm(f => ({...f, cliente_nombre: e.target.value}))} />
              </div>
              <div className="grid2">
                <div className="form-field">
                  <label>NIF/CIF cliente</label>
                  <input type="text" placeholder="12345678A" value={facturaForm.cliente_nif} onChange={e => setFacturaForm(f => ({...f, cliente_nif: e.target.value}))} />
                </div>
                <div className="form-field">
                  <label>Fecha</label>
                  <input type="date" value={facturaForm.fecha} onChange={e => setFacturaForm(f => ({...f, fecha: e.target.value}))} />
                </div>
              </div>
              <div className="form-field">
                <label>Concepto</label>
                <input type="text" placeholder="Descripción del servicio" value={facturaForm.concepto} onChange={e => setFacturaForm(f => ({...f, concepto: e.target.value}))} />
              </div>
              <div className="grid2">
                <div className="form-field">
                  <label>IVA %</label>
                  <select value={facturaForm.iva_pct} onChange={e => setFacturaForm(f => ({...f, iva_pct: e.target.value}))}>
                    {[21,10,4,0].map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Retención IRPF %</label>
                  <select value={facturaForm.irpf_pct} onChange={e => setFacturaForm(f => ({...f, irpf_pct: e.target.value}))}>
                    {[0,7,15,19].map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Total (€, IVA incluido) *</label>
                <input type="number" step="0.01" placeholder="0.00" value={facturaForm.total} onChange={e => setFacturaForm(f => ({...f, total: e.target.value}))} />
              </div>
              {facturaForm.total && parseFloat(facturaForm.total) > 0 && (() => {
                const total = parseFloat(facturaForm.total)
                const ivaPct = parseFloat(facturaForm.iva_pct)
                const irpfPct = parseFloat(facturaForm.irpf_pct)
                const base = total / (1 + ivaPct/100)
                const ivaCuota = total - base
                const irpfCuota = base * irpfPct / 100
                return (
                  <div style={{background:'var(--bg)', borderRadius:12, padding:14, fontSize:13, display:'flex', flexDirection:'column', gap:6}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><span style={{color:'var(--text2)'}}>Base imponible</span><strong>{fmt(base)} €</strong></div>
                    <div style={{display:'flex', justifyContent:'space-between'}}><span style={{color:'var(--text2)'}}>IVA ({ivaPct}%)</span><strong>{fmt(ivaCuota)} €</strong></div>
                    {irpfPct > 0 && <div style={{display:'flex', justifyContent:'space-between'}}><span style={{color:'var(--red-dark)'}}>Retención IRPF (−{irpfPct}%)</span><strong style={{color:'var(--red-dark)'}}>−{fmt(irpfCuota)} €</strong></div>}
                    <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--border)', paddingTop:6, fontWeight:800}}><span>Total factura</span><span>{fmt(total)} €</span></div>
                  </div>
                )
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setFacturaModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarFacturaOficial} disabled={guardandoFactura || !facturaForm.cliente_nombre || !facturaForm.total}>
                {guardandoFactura ? 'Guardando...' : '💾 Guardar factura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SUBIR GASTO ── */}
      {uploadModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setUploadModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Subir ticket o factura</div>
              <button className="modal-close" onClick={() => setUploadModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{display:'flex', flexDirection:'column', gap:16}}>
              {!archivo ? (
                <div
                  className={`drop-zone ${dragOver ? 'over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) manejarArchivo(f) }}
                  onClick={() => document.getElementById('file-input-gasto')?.click()}
                >
                  <div style={{fontSize:36, marginBottom:10}}>📂</div>
                  <div style={{fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:4}}>Arrastra aquí o haz clic para seleccionar</div>
                  <div style={{fontSize:12, color:'var(--muted)'}}>JPG, PNG, WEBP o PDF · máx. 10 MB</div>
                  <input id="file-input-gasto" type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={e => { const f = e.target.files?.[0]; if (f) manejarArchivo(f) }} />
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {archivoPreview
                    ? <img src={archivoPreview} alt="Preview" className="preview-img" />
                    : <div className="preview-pdf"><span style={{fontSize:28}}>📄</span><span style={{fontSize:13, fontWeight:700, color:'#92400E'}}>{archivo.name}</span></div>
                  }
                  <button onClick={() => { setArchivo(null); setArchivoPreview(null); setGastoDraft(null) }} style={{alignSelf:'flex-start', padding:'5px 12px', background:'none', border:'1px solid var(--border)', borderRadius:8, fontFamily:'inherit', fontSize:12, fontWeight:600, color:'var(--text2)', cursor:'pointer'}}>
                    ✕ Cambiar archivo
                  </button>
                </div>
              )}
              {analizando && (
                <div className="analyzing">
                  <div className="spinner" />
                  <div style={{fontSize:13, fontWeight:700}}>Analizando con Gemini Vision...</div>
                  <div style={{fontSize:12, color:'var(--muted)'}}>Extrayendo importe, IVA, fecha y proveedor</div>
                </div>
              )}
              {gastoDraft && !analizando && (
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  <div style={{display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', background:'rgba(212,197,249,0.3)', borderRadius:100, fontSize:11, fontWeight:700, color:'var(--lila-dark)'}}>
                    ✨ Datos extraídos por IA — revisa antes de guardar
                  </div>
                  <div className="form-field" style={{margin:0}}>
                    <label>Proveedor</label>
                    <input type="text" value={gastoDraft.proveedor} onChange={e => setGastoDraft(d => d ? {...d, proveedor: e.target.value} : d)} />
                  </div>
                  <div className="grid2">
                    <div className="form-field" style={{margin:0}}>
                      <label>Fecha</label>
                      <input type="date" value={gastoDraft.fecha} onChange={e => setGastoDraft(d => d ? {...d, fecha: e.target.value} : d)} />
                    </div>
                    <div className="form-field" style={{margin:0}}>
                      <label>IVA %</label>
                      <select value={gastoDraft.iva_porcentaje} onChange={e => setGastoDraft(d => d ? recalcularCuota(d,'iva_porcentaje',e.target.value) : d)}>
                        {[21,10,4,0].map(v => <option key={v} value={v}>{v}%</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="form-field" style={{margin:0}}>
                      <label>Total (€)</label>
                      <input type="number" step="0.01" value={gastoDraft.total} onChange={e => setGastoDraft(d => d ? recalcularCuota(d,'total',e.target.value) : d)} />
                    </div>
                    <div className="form-field" style={{margin:0}}>
                      <label>Base imponible (€)</label>
                      <input type="number" step="0.01" value={gastoDraft.base_imponible} onChange={e => setGastoDraft(d => d ? recalcularCuota(d,'base_imponible',e.target.value) : d)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{display:'flex', gap:8, padding:'16px 24px', borderTop:'1px solid var(--border)'}}>
              <button className="btn-secondary" onClick={() => setUploadModal(false)}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={!gastoDraft || !archivo || guardandoGasto || analizando}
                onClick={guardarGasto}
                style={{flex:1}}
              >
                {guardandoGasto ? 'Guardando...' : '💾 Guardar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
