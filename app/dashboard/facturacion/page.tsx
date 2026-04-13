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
]

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const IVA_TIPOS = [21, 10, 4, 0]

type ReservaRaw = {
  id: string
  fecha: string
  cliente_nombre: string
  estado: string
  created_at: string
  servicios: { nombre: string; precio: number; iva: number | null } | null
}

type Factura = {
  numero: string
  fecha: string
  cliente: string
  servicio: string
  base: number
  iva_pct: number
  cuota_iva: number
  total: number
}

type FilaIva = {
  tipo: number
  base: number
  cuota: number
  total: number
}

type Gasto = {
  id: string
  fecha: string
  proveedor: string | null
  base_imponible: number
  iva_porcentaje: number
  cuota_iva: number
  total: number
  foto_url: string | null
}

type GastoDraft = {
  fecha: string
  proveedor: string
  base_imponible: string
  iva_porcentaje: string
  cuota_iva: string
  total: string
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isoMes(anio: number, mes: number) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}`
}

export default function Facturacion() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [cargando, setCargando] = useState(true)

  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())

  const [facturas, setFacturas] = useState<Factura[]>([])
  const [filaIva, setFilaIva] = useState<FilaIva[]>([])
  const [facturaAbierta, setFacturaAbierta] = useState<string | null>(null)

  // Trimestre activo según mes actual
  const trimestre = Math.floor(hoy.getMonth() / 3) + 1
  const [modal303, setModal303] = useState(false)
  const [modal130, setModal130] = useState(false)

  // Gastos
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [uploadModal, setUploadModal] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [gastoDraft, setGastoDraft] = useState<GastoDraft | null>(null)
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [ivaGastosTrimestre, setIvaGastosTrimestre] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const cargarFacturas = useCallback(async (nid: string, a: number, m: number) => {
    setCargando(true)
    const desde = `${isoMes(a, m)}-01`
    const hasta = new Date(a, m + 1, 0)
    const hastaStr = `${isoMes(a, m)}-${String(hasta.getDate()).padStart(2, '0')}`

    const { db } = await getSessionClient()
    const { data } = await db
      .from('reservas')
      .select('id, fecha, cliente_nombre, estado, created_at, servicios(nombre, precio, iva)')
      .eq('negocio_id', nid)
      .eq('estado', 'completada')
      .gte('fecha', desde)
      .lte('fecha', hastaStr)
      .order('fecha', { ascending: false })

    if (!data) { setCargando(false); return }

    const rows = data as unknown as ReservaRaw[]
    const fList: Factura[] = rows.map((r, i) => {
      const precio = r.servicios?.precio ?? 0
      const ivaPct = r.servicios?.iva ?? 21
      const base = precio / (1 + ivaPct / 100)
      const cuota = precio - base
      return {
        numero: `${a}${String(m + 1).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`,
        fecha: r.fecha,
        cliente: r.cliente_nombre,
        servicio: r.servicios?.nombre ?? '—',
        base,
        iva_pct: ivaPct,
        cuota_iva: cuota,
        total: precio,
      }
    })

    // Agrupar por tipo IVA
    const grupos: Record<number, { base: number; cuota: number }> = {}
    IVA_TIPOS.forEach(t => { grupos[t] = { base: 0, cuota: 0 } })
    fList.forEach(f => {
      if (!grupos[f.iva_pct]) grupos[f.iva_pct] = { base: 0, cuota: 0 }
      grupos[f.iva_pct].base += f.base
      grupos[f.iva_pct].cuota += f.cuota_iva
    })
    const filasIva: FilaIva[] = IVA_TIPOS
      .filter(t => grupos[t].base > 0)
      .map(t => ({
        tipo: t,
        base: grupos[t].base,
        cuota: grupos[t].cuota,
        total: grupos[t].base + grupos[t].cuota,
      }))

    setFacturas(fList)
    setFilaIva(filasIva)
    setCargando(false)
  }, [])

  const cargarGastos = useCallback(async (nid: string, a: number, m: number) => {
    const desde = `${isoMes(a, m)}-01`
    const hasta = new Date(a, m + 1, 0)
    const hastaStr = `${isoMes(a, m)}-${String(hasta.getDate()).padStart(2, '0')}`
    const { db } = await getSessionClient()
    const { data } = await db
      .from('gastos')
      .select('id, fecha, proveedor, base_imponible, iva_porcentaje, cuota_iva, total, foto_url')
      .eq('negocio_id', nid)
      .gte('fecha', desde)
      .lte('fecha', hastaStr)
      .order('fecha', { ascending: false })
    setGastos((data as Gasto[]) || [])
  }, [])

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { data: neg } = await db.from('negocios').select('id, nombre').eq('user_id', user.id).single()
      if (!neg) { window.location.href = '/onboarding'; return }
      setNegocioId(neg.id)
      setNegocioNombre(neg.nombre)
      await Promise.all([
        cargarFacturas(neg.id, anio, mes),
        cargarGastos(neg.id, anio, mes),
      ])
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (negocioId) {
      cargarFacturas(negocioId, anio, mes)
      cargarGastos(negocioId, anio, mes)
    }
  }, [negocioId, anio, mes, cargarFacturas, cargarGastos])

  function prevMes() {
    if (mes === 0) { setAnio(a => a - 1); setMes(11) } else setMes(m => m - 1)
  }
  function nextMes() {
    const esHoy = anio === hoy.getFullYear() && mes === hoy.getMonth()
    if (esHoy) return
    if (mes === 11) { setAnio(a => a + 1); setMes(0) } else setMes(m => m + 1)
  }

  const totalBase = filaIva.reduce((s, f) => s + f.base, 0)
  const totalCuota = filaIva.reduce((s, f) => s + f.cuota, 0)
  const totalTotal = filaIva.reduce((s, f) => s + f.total, 0)

  // Datos trimestre para modelos
  const trimestreLabel = `T${trimestre} ${hoy.getFullYear()}`
  const mesesTrimestre = [0,1,2].map(i => MESES[(trimestre - 1) * 3 + i]).join(', ')

  async function cargarIvaGastosTrimestre(nid: string, trim: number, a: number) {
    const mesInicio = (trim - 1) * 3
    const desde = `${a}-${String(mesInicio + 1).padStart(2, '0')}-01`
    const mesFinDate = new Date(a, mesInicio + 3, 0)
    const hasta = `${a}-${String(mesInicio + 3).padStart(2, '0')}-${String(mesFinDate.getDate()).padStart(2, '0')}`
    const { data } = await supabase
      .from('gastos')
      .select('cuota_iva')
      .eq('negocio_id', nid)
      .gte('fecha', desde)
      .lte('fecha', hasta)
    const total = ((data as any[]) || []).reduce((s: number, g: any) => s + (g.cuota_iva || 0), 0)
    setIvaGastosTrimestre(total)
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function manejarArchivo(file: File) {
    const MAX_MB = 10
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`El archivo es demasiado grande. Máximo ${MAX_MB}MB.`)
      return
    }
    const tipo = file.type
    if (!tipo.startsWith('image/') && tipo !== 'application/pdf') {
      alert('Solo se aceptan imágenes (JPG, PNG, WEBP) o PDFs.')
      return
    }

    setArchivo(file)
    setGastoDraft(null)

    // Preview
    if (tipo.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setArchivoPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setArchivoPreview(null) // PDF — no image preview
    }

    // Analizar con Gemini Vision
    setAnalizando(true)
    try {
      const b64 = await fileToBase64(file)
      const mimeType = tipo === 'application/pdf' ? 'application/pdf' : tipo
      const GEMINI_KEY = 'AIzaSyBwszdn-eYK3UQN2SBmJNzhdPkgOgkilns'
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: b64 } },
                { text: 'Analiza este ticket o factura y extrae los datos fiscales. Responde SOLO con JSON válido, sin markdown ni explicaciones. Formato exacto: {"proveedor":"nombre del comercio","fecha":"YYYY-MM-DD","base_imponible":number,"iva_porcentaje":number,"cuota_iva":number,"total":number}. Para iva_porcentaje usa 21, 10, 4 o 0 según corresponda. Si no encuentras un dato usa null.' }
              ]
            }],
            generationConfig: { maxOutputTokens: 300, temperature: 0.1 },
          }),
        }
      )
      if (res.ok) {
        const json = await res.json()
        const rawText: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const clean = rawText.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        try {
          const parsed = JSON.parse(clean)
          const hoy2 = new Date().toISOString().split('T')[0]
          const total = parsed.total ?? 0
          const ivaPct = parsed.iva_porcentaje ?? 21
          const cuota = parsed.cuota_iva ?? parseFloat((total - total / (1 + ivaPct / 100)).toFixed(2))
          const base = parsed.base_imponible ?? parseFloat((total / (1 + ivaPct / 100)).toFixed(2))
          setGastoDraft({
            fecha: parsed.fecha ?? hoy2,
            proveedor: parsed.proveedor ?? '',
            base_imponible: String(base),
            iva_porcentaje: String(ivaPct),
            cuota_iva: String(cuota),
            total: String(total),
          })
        } catch {
          setGastoDraft({ fecha: new Date().toISOString().split('T')[0], proveedor: '', base_imponible: '', iva_porcentaje: '21', cuota_iva: '', total: '' })
        }
      }
    } catch {
      setGastoDraft({ fecha: new Date().toISOString().split('T')[0], proveedor: '', base_imponible: '', iva_porcentaje: '21', cuota_iva: '', total: '' })
    } finally {
      setAnalizando(false)
    }
  }

  function recalcularCuota(draft: GastoDraft, campo: 'total' | 'base_imponible' | 'iva_porcentaje', valor: string): GastoDraft {
    const d = { ...draft, [campo]: valor }
    const ivaPct = parseFloat(d.iva_porcentaje) || 0
    if (campo === 'total') {
      const total = parseFloat(valor) || 0
      const base = total / (1 + ivaPct / 100)
      return { ...d, base_imponible: base.toFixed(2), cuota_iva: (total - base).toFixed(2) }
    }
    if (campo === 'base_imponible' || campo === 'iva_porcentaje') {
      const base = parseFloat(d.base_imponible) || 0
      const cuota = base * ivaPct / 100
      return { ...d, cuota_iva: cuota.toFixed(2), total: (base + cuota).toFixed(2) }
    }
    return d
  }

  async function guardarGasto() {
    if (!gastoDraft || !negocioId || !archivo) return
    setGuardandoGasto(true)
    try {
      // 1. Upload file to Storage
      const ext = archivo.name.split('.').pop() ?? 'jpg'
      const path = `${negocioId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('facturas').upload(path, archivo)
      if (uploadErr) throw new Error(uploadErr.message)
      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)

      // 2. Insert into gastos
      const { error: dbErr } = await supabase.from('gastos').insert({
        negocio_id: negocioId,
        fecha: gastoDraft.fecha || new Date().toISOString().split('T')[0],
        proveedor: gastoDraft.proveedor || null,
        base_imponible: parseFloat(gastoDraft.base_imponible) || 0,
        iva_porcentaje: parseInt(gastoDraft.iva_porcentaje) || 0,
        cuota_iva: parseFloat(gastoDraft.cuota_iva) || 0,
        total: parseFloat(gastoDraft.total) || 0,
        foto_url: publicUrl,
      })
      if (dbErr) throw new Error(dbErr.message)

      // 3. Reload and close
      await cargarGastos(negocioId, anio, mes)
      setUploadModal(false)
      setArchivo(null)
      setArchivoPreview(null)
      setGastoDraft(null)
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setGuardandoGasto(false)
    }
  }

  async function eliminarGasto(gasto: Gasto) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', gasto.id)
    if (gasto.foto_url) {
      // Extract storage path from public URL
      const match = gasto.foto_url.match(/facturas\/(.+)$/)
      if (match) await supabase.storage.from('facturas').remove([match[1]])
    }
    setGastos(prev => prev.filter(g => g.id !== gasto.id))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF;
          --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --lila: #D4C5F9; --lila-dark: #6B4FD8;
          --green: #B8EDD4; --green-dark: #2E8A5E;
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: var(--white); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform 0.3s ease; }
        .sidebar-logo { padding: 20px 18px; border-bottom: 1px solid var(--border); }
        .sidebar-nav { padding: 12px 10px; flex: 1; overflow-y: auto; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--text2); text-decoration: none; margin-bottom: 2px; }
        .nav-item:hover { background: var(--bg); color: var(--text); }
        .nav-item.active { background: var(--blue-soft); color: var(--blue-dark); font-weight: 600; }
        .nav-item-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .sidebar-footer { padding: 16px 10px; border-top: 1px solid var(--border); }
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; }
        /* Navegación mes */
        .mes-nav { display: flex; align-items: center; gap: 12px; }
        .mes-nav-btn { background: var(--white); border: 1.5px solid var(--border); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; color: var(--text2); }
        .mes-nav-btn:hover:not(:disabled) { background: var(--bg); }
        .mes-nav-btn:disabled { opacity: 0.35; cursor: default; }
        .mes-label { font-size: 15px; font-weight: 700; color: var(--text); min-width: 160px; text-align: center; }
        /* Section */
        .section-block { margin-bottom: 32px; }
        .section-title { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
        .section-sub { font-size: 13px; color: var(--muted); margin-bottom: 14px; }
        /* Tabla IVA */
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
        .tabla { width: 100%; border-collapse: collapse; }
        .tabla th { padding: 11px 16px; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; text-align: right; border-bottom: 1px solid var(--border); background: var(--bg); }
        .tabla th:first-child { text-align: left; }
        .tabla td { padding: 13px 16px; font-size: 14px; color: var(--text2); text-align: right; border-bottom: 1px solid var(--border); }
        .tabla td:first-child { text-align: left; font-weight: 600; color: var(--text); }
        .tabla tr:last-child td { border-bottom: none; }
        .tabla .total-row td { background: var(--bg); font-weight: 700; color: var(--text); font-size: 14px; border-top: 2px solid var(--border); }
        .badge-iva { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 700; }
        .badge-21 { background: #EDE9FE; color: #6D28D9; }
        .badge-10 { background: #DBEAFE; color: #1D4ED8; }
        .badge-4  { background: #D1FAE5; color: #065F46; }
        .badge-0  { background: #F3F4F6; color: #6B7280; }
        .empty-state { padding: 48px; text-align: center; color: var(--muted); font-size: 14px; }
        /* Facturas */
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
        /* Detalle factura (expandible) */
        .factura-detalle { background: #FAFBFC; border-bottom: 1px solid var(--border); padding: 16px 20px; }
        .det-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 14px; }
        .det-item label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
        .det-item span { font-size: 13px; font-weight: 600; color: var(--text); }
        .det-totales { display: flex; flex-direction: column; gap: 4px; padding-top: 12px; border-top: 1px solid var(--border); }
        .det-linea { display: flex; justify-content: space-between; font-size: 13px; color: var(--text2); }
        .det-linea.bold { font-weight: 800; color: var(--text); font-size: 15px; }
        .btn-pdf { display: flex; align-items: center; gap: 6px; margin-top: 14px; padding: 9px 18px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        /* Modelos fiscales */
        .modelos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .modelo-card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 12px; }
        .modelo-badge { display: inline-flex; align-items: center; gap: 8px; }
        .modelo-num { font-size: 22px; font-weight: 900; color: var(--text); letter-spacing: -1px; }
        .modelo-nombre { font-size: 13px; font-weight: 600; color: var(--text2); }
        .modelo-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }
        .modelo-meta { font-size: 12px; color: var(--blue-dark); font-weight: 600; background: var(--blue-soft); padding: 4px 10px; border-radius: 8px; display: inline-block; }
        .btn-modelo { padding: 10px 18px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 6px; margin-top: auto; }
        .btn-modelo:hover { background: var(--bg); }
        /* Modal modelos */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal { background: var(--white); border-radius: 20px; width: 100%; max-width: 480px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .modal-title { font-size: 17px; font-weight: 800; color: var(--text); }
        .modal-close { background: none; border: none; cursor: pointer; font-size: 22px; color: var(--muted); padding: 4px; line-height: 1; }
        .modal-body { padding: 20px 24px; }
        .modal-aviso { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #92400E; line-height: 1.6; margin-bottom: 16px; }
        .modal-fila { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .modal-fila:last-child { border-bottom: none; }
        .modal-fila label { color: var(--text2); }
        .modal-fila span { font-weight: 700; color: var(--text); }
        .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
        .btn-cerrar { padding: 10px 24px; border-radius: 10px; background: var(--text); color: white; border: none; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        /* Gastos */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .btn-subir { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-subir:hover { background: #374151; }
        .gasto-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--border); transition: background 0.1s; }
        .gasto-row:last-child { border-bottom: none; }
        .gasto-row:hover { background: var(--bg); }
        .gasto-thumb { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
        .gasto-pdf-icon { width: 36px; height: 36px; border-radius: 8px; background: #FEF3C7; border: 1px solid #FDE68A; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .gasto-info { flex: 1; min-width: 0; }
        .gasto-proveedor { font-size: 14px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gasto-fecha { font-size: 12px; color: var(--muted); margin-top: 1px; }
        .gasto-iva { font-size: 12px; color: var(--muted); white-space: nowrap; }
        .gasto-total { font-size: 15px; font-weight: 800; color: var(--text); white-space: nowrap; }
        .gasto-del { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 16px; padding: 4px; border-radius: 6px; flex-shrink: 0; }
        .gasto-del:hover { background: #FEE2E2; color: #DC2626; }
        /* Upload modal */
        .drop-zone { border: 2px dashed var(--border); border-radius: 16px; padding: 32px 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bg); }
        .drop-zone.over { border-color: var(--lila-dark); background: rgba(212,197,249,0.08); }
        .drop-zone:hover { border-color: var(--lila-dark); }
        .drop-icon { font-size: 36px; margin-bottom: 10px; }
        .drop-text { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
        .drop-sub { font-size: 12px; color: var(--muted); }
        .preview-img { width: 100%; max-height: 200px; object-fit: contain; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); }
        .preview-pdf { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; }
        .preview-pdf-icon { font-size: 28px; }
        .preview-pdf-name { font-size: 13px; font-weight: 700; color: #92400E; word-break: break-all; }
        .analyzing { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 28px; }
        .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--lila-dark); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .extracted-form { display: flex; flex-direction: column; gap: 12px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .form-field { display: flex; flex-direction: column; gap: 4px; }
        .form-field label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .form-field input, .form-field select { padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; color: var(--text); outline: none; background: white; }
        .form-field input:focus, .form-field select:focus { border-color: var(--lila-dark); }
        .ai-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: rgba(212,197,249,0.3); border-radius: 100px; font-size: 11px; font-weight: 700; color: var(--lila-dark); margin-bottom: 8px; }
        .modal-actions { display: flex; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--border); }
        .btn-guardar-gasto { flex: 1; padding: 11px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-guardar-gasto:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-cancelar-gasto { padding: 11px 20px; background: none; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; color: var(--text2); cursor: pointer; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .modelos-grid { grid-template-columns: 1fr; }
          .det-grid { grid-template-columns: 1fr; }
          .tabla th, .tabla td { padding: 10px 12px; font-size: 13px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/facturacion' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
              <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Facturación</span>
            </div>
            <div className="mes-nav">
              <button className="mes-nav-btn" onClick={prevMes}>&#8249;</button>
              <span className="mes-label">{MESES[mes]} {anio}</span>
              <button className="mes-nav-btn" onClick={nextMes} disabled={anio === hoy.getFullYear() && mes === hoy.getMonth()}>&#8250;</button>
            </div>
            <NegocioSelector negocios={todosNegocios} activoId={negocioId??''} />
          </header>

          <main className="content">

            {/* ── 1. RESUMEN IVA ── */}
            <div className="section-block">
              <div className="section-title">Resumen IVA</div>
              <div className="section-sub">Ingresos del mes agrupados por tipo de IVA — reservas completadas</div>
              <div className="card">
                {cargando ? (
                  <div className="empty-state">Cargando...</div>
                ) : filaIva.length === 0 ? (
                  <div className="empty-state">No hay ingresos registrados en {MESES[mes].toLowerCase()} {anio}</div>
                ) : (
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Tipo IVA</th>
                        <th>Base imponible</th>
                        <th>Cuota IVA</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filaIva.map(f => (
                        <tr key={f.tipo}>
                          <td>
                            <span className={`badge-iva badge-${f.tipo}`}>{f.tipo}%</span>
                          </td>
                          <td>{fmt(f.base)} €</td>
                          <td>{fmt(f.cuota)} €</td>
                          <td style={{fontWeight:700, color:'var(--text)'}}>{fmt(f.total)} €</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td>Total</td>
                        <td>{fmt(totalBase)} €</td>
                        <td>{fmt(totalCuota)} €</td>
                        <td>{fmt(totalTotal)} €</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── 2. FACTURAS ── */}
            <div className="section-block">
              <div className="section-title">Facturas</div>
              <div className="section-sub">Facturas generadas a partir de reservas completadas</div>
              <div className="card">
                {cargando ? (
                  <div className="empty-state">Cargando...</div>
                ) : facturas.length === 0 ? (
                  <div className="empty-state">No hay facturas en {MESES[mes].toLowerCase()} {anio}</div>
                ) : facturas.map(f => (
                  <div key={f.numero}>
                    <div className="factura-row" onClick={() => setFacturaAbierta(facturaAbierta === f.numero ? null : f.numero)}>
                      <span className="factura-num">#{f.numero}</span>
                      <div className="factura-info">
                        <div className="factura-cliente">{f.cliente}</div>
                        <div className="factura-servicio">{f.servicio}</div>
                      </div>
                      <span className="factura-fecha">{new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                      <span className="factura-total">{fmt(f.total)} €</span>
                      <span className="factura-chevron">{facturaAbierta === f.numero ? '▲' : '▼'}</span>
                    </div>
                    {facturaAbierta === f.numero && (
                      <div className="factura-detalle">
                        <div className="det-grid">
                          <div className="det-item">
                            <label>Nº Factura</label>
                            <span>{f.numero}</span>
                          </div>
                          <div className="det-item">
                            <label>Fecha</label>
                            <span>{new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</span>
                          </div>
                          <div className="det-item">
                            <label>Cliente</label>
                            <span>{f.cliente}</span>
                          </div>
                          <div className="det-item">
                            <label>Servicio</label>
                            <span>{f.servicio}</span>
                          </div>
                          <div className="det-item">
                            <label>Emisor</label>
                            <span>{negocioNombre}</span>
                          </div>
                        </div>
                        <div className="det-totales">
                          <div className="det-linea">
                            <label>Base imponible</label>
                            <span>{fmt(f.base)} €</span>
                          </div>
                          <div className="det-linea">
                            <label>IVA ({f.iva_pct}%)</label>
                            <span>{fmt(f.cuota_iva)} €</span>
                          </div>
                          <div className="det-linea bold">
                            <label>Total</label>
                            <span>{fmt(f.total)} €</span>
                          </div>
                        </div>
                        <button className="btn-pdf" onClick={() => window.print()}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                          </svg>
                          Generar PDF
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. GASTOS ── */}
            <div className="section-block">
              <div className="section-header">
                <div>
                  <div className="section-title">Gastos</div>
                  <div className="section-sub">Tickets y facturas de proveedores — IVA soportado deducible</div>
                </div>
                <button className="btn-subir" onClick={() => { setUploadModal(true); setArchivo(null); setArchivoPreview(null); setGastoDraft(null) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Subir ticket
                </button>
              </div>
              <div className="card">
                {gastos.length === 0 ? (
                  <div className="empty-state">
                    <div style={{fontSize:'32px', marginBottom:'8px'}}>🧾</div>
                    No hay gastos registrados en {MESES[mes].toLowerCase()} {anio}
                    <div style={{marginTop:'12px'}}>
                      <button className="btn-subir" style={{margin:'0 auto'}} onClick={() => { setUploadModal(true); setArchivo(null); setArchivoPreview(null); setGastoDraft(null) }}>
                        + Subir primer ticket
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {gastos.map(g => (
                      <div key={g.id} className="gasto-row">
                        {g.foto_url ? (
                          g.foto_url.toLowerCase().includes('.pdf') ? (
                            <a href={g.foto_url} target="_blank" rel="noreferrer">
                              <div className="gasto-pdf-icon">📄</div>
                            </a>
                          ) : (
                            <a href={g.foto_url} target="_blank" rel="noreferrer">
                              <img src={g.foto_url} alt="" className="gasto-thumb" />
                            </a>
                          )
                        ) : (
                          <div className="gasto-pdf-icon">🧾</div>
                        )}
                        <div className="gasto-info">
                          <div className="gasto-proveedor">{g.proveedor || 'Sin proveedor'}</div>
                          <div className="gasto-fecha">{new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </div>
                        <div className="gasto-iva">IVA {g.iva_porcentaje}% · {fmt(g.cuota_iva)} €</div>
                        <div className="gasto-total">{fmt(g.total)} €</div>
                        <button className="gasto-del" onClick={() => eliminarGasto(g)} title="Eliminar">×</button>
                      </div>
                    ))}
                    <div style={{padding:'12px 16px', borderTop:'2px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg)'}}>
                      <span style={{fontSize:'13px', fontWeight:700, color:'var(--text2)'}}>Total IVA soportado</span>
                      <span style={{fontSize:'15px', fontWeight:800, color:'var(--text)'}}>
                        {fmt(gastos.reduce((s, g) => s + g.cuota_iva, 0))} €
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── 4. MODELOS FISCALES ── */}
            <div className="section-block">
              <div className="section-title">Modelos fiscales</div>
              <div className="section-sub">Declaraciones trimestrales — {trimestreLabel} ({mesesTrimestre})</div>
              <div className="modelos-grid">

                <div className="modelo-card">
                  <div>
                    <div className="modelo-badge">
                      <span className="modelo-num">303</span>
                    </div>
                    <div className="modelo-nombre">IVA trimestral</div>
                  </div>
                  <div className="modelo-desc">
                    Autoliquidación del IVA. Diferencia entre el IVA repercutido a clientes y el IVA soportado en compras.
                  </div>
                  <div className="modelo-meta">Presentación: hasta 20 días tras fin del trimestre</div>
                  <button className="btn-modelo" onClick={() => { setModal303(true); if (negocioId) cargarIvaGastosTrimestre(negocioId, trimestre, hoy.getFullYear()) }}>
                    <span>📋</span> Preparar modelo 303
                  </button>
                </div>

                <div className="modelo-card">
                  <div>
                    <div className="modelo-badge">
                      <span className="modelo-num">130</span>
                    </div>
                    <div className="modelo-nombre">IRPF trimestral</div>
                  </div>
                  <div className="modelo-desc">
                    Pago fraccionado del IRPF para autónomos en estimación directa. 20% del rendimiento neto del trimestre.
                  </div>
                  <div className="modelo-meta">Presentación: hasta 20 días tras fin del trimestre</div>
                  <button className="btn-modelo" onClick={() => setModal130(true)}>
                    <span>📋</span> Preparar modelo 130
                  </button>
                </div>

              </div>
            </div>

          </main>
        </div>
      </div>

      {/* ── MODAL SUBIR GASTO ── */}
      {uploadModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setUploadModal(false) } }}>
          <div className="modal" style={{maxWidth:'520px', maxHeight:'90vh', overflowY:'auto'}}>
            <div className="modal-header">
              <div className="modal-title">Subir ticket o factura</div>
              <button className="modal-close" onClick={() => setUploadModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{display:'flex', flexDirection:'column', gap:'16px'}}>

              {/* Drop zone or preview */}
              {!archivo ? (
                <div
                  className={`drop-zone ${dragOver ? 'over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) manejarArchivo(f) }}
                  onClick={() => document.getElementById('file-input-gasto')?.click()}
                >
                  <div className="drop-icon">📂</div>
                  <div className="drop-text">Arrastra aquí o haz clic para seleccionar</div>
                  <div className="drop-sub">JPG, PNG, WEBP o PDF · máx. 10 MB</div>
                  <input
                    id="file-input-gasto"
                    type="file"
                    accept="image/*,application/pdf"
                    style={{display:'none'}}
                    onChange={e => { const f = e.target.files?.[0]; if (f) manejarArchivo(f) }}
                  />
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  {archivoPreview ? (
                    <img src={archivoPreview} alt="Preview" className="preview-img" />
                  ) : (
                    <div className="preview-pdf">
                      <span className="preview-pdf-icon">📄</span>
                      <span className="preview-pdf-name">{archivo.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => { setArchivo(null); setArchivoPreview(null); setGastoDraft(null) }}
                    style={{alignSelf:'flex-start', padding:'5px 12px', background:'none', border:'1px solid var(--border)', borderRadius:'8px', fontFamily:'inherit', fontSize:'12px', fontWeight:600, color:'var(--text2)', cursor:'pointer'}}
                  >
                    ✕ Cambiar archivo
                  </button>
                </div>
              )}

              {/* Gemini analyzing */}
              {analizando && (
                <div className="analyzing">
                  <div className="spinner" />
                  <div style={{fontSize:'13px', fontWeight:700, color:'var(--text)'}}>Analizando con Gemini Vision...</div>
                  <div style={{fontSize:'12px', color:'var(--muted)'}}>Extrayendo importe, IVA, fecha y proveedor</div>
                </div>
              )}

              {/* Extracted data form */}
              {gastoDraft && !analizando && (
                <div className="extracted-form">
                  <div className="ai-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Datos extraídos por IA — revisa antes de guardar
                  </div>

                  <div className="form-row">
                    <div className="form-field" style={{gridColumn:'1/-1'}}>
                      <label>Proveedor</label>
                      <input
                        type="text"
                        value={gastoDraft.proveedor}
                        onChange={e => setGastoDraft(d => d ? { ...d, proveedor: e.target.value } : d)}
                        placeholder="Nombre del proveedor"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Fecha</label>
                      <input
                        type="date"
                        value={gastoDraft.fecha}
                        onChange={e => setGastoDraft(d => d ? { ...d, fecha: e.target.value } : d)}
                      />
                    </div>
                    <div className="form-field">
                      <label>IVA %</label>
                      <select
                        value={gastoDraft.iva_porcentaje}
                        onChange={e => setGastoDraft(d => d ? recalcularCuota(d, 'iva_porcentaje', e.target.value) : d)}
                      >
                        {[21, 10, 4, 0].map(v => <option key={v} value={v}>{v}%</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Total (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={gastoDraft.total}
                        onChange={e => setGastoDraft(d => d ? recalcularCuota(d, 'total', e.target.value) : d)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-field">
                      <label>Base imponible (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={gastoDraft.base_imponible}
                        onChange={e => setGastoDraft(d => d ? recalcularCuota(d, 'base_imponible', e.target.value) : d)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Cuota IVA (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={gastoDraft.cuota_iva}
                        onChange={e => setGastoDraft(d => d ? { ...d, cuota_iva: e.target.value } : d)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-field" style={{justifyContent:'flex-end', paddingTop:'20px'}}>
                      <div style={{fontSize:'12px', color:'var(--muted)', lineHeight:1.5}}>
                        Total = Base + Cuota IVA<br/>
                        Al editar el total se recalcula la base automáticamente.
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
            <div className="modal-actions">
              <button className="btn-cancelar-gasto" onClick={() => setUploadModal(false)}>Cancelar</button>
              <button
                className="btn-guardar-gasto"
                disabled={!gastoDraft || !archivo || guardandoGasto || analizando}
                onClick={guardarGasto}
              >
                {guardandoGasto ? 'Guardando...' : '💾 Guardar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MODELO 303 ── */}
      {modal303 && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal303(false) }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Modelo 303 — {trimestreLabel}</div>
              <button className="modal-close" onClick={() => setModal303(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-aviso">
                ⚠️ Estos datos son orientativos. El cálculo definitivo requiere incluir también el IVA soportado en gastos. Consulta con tu gestor antes de presentar.
              </div>
              <div className="modal-fila">
                <label>Trimestre</label>
                <span>{trimestreLabel} ({mesesTrimestre})</span>
              </div>
              <div className="modal-fila">
                <label>Base imponible total</label>
                <span>{fmt(totalBase)} €</span>
              </div>
              <div className="modal-fila">
                <label>IVA repercutido</label>
                <span>{fmt(totalCuota)} €</span>
              </div>
              <div className="modal-fila">
                <label>IVA soportado (gastos)</label>
                <span style={{color: ivaGastosTrimestre > 0 ? 'var(--text)' : 'var(--muted)'}}>
                  {ivaGastosTrimestre > 0 ? `${fmt(ivaGastosTrimestre)} €` : 'Sin gastos registrados'}
                </span>
              </div>
              <div className="modal-fila">
                <label>Resultado (IVA repercutido – soportado)</label>
                <span style={{fontWeight:800, color: totalCuota - ivaGastosTrimestre >= 0 ? 'var(--text)' : '#2E8A5E'}}>
                  {ivaGastosTrimestre > 0 ? `${fmt(totalCuota - ivaGastosTrimestre)} €` : '—'}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cerrar" onClick={() => setModal303(false)}>Cerrar</button>
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
              <div className="modal-aviso">
                ⚠️ Estos datos son orientativos. El modelo 130 requiere conocer los gastos deducibles del trimestre. Consulta con tu gestor antes de presentar.
              </div>
              <div className="modal-fila">
                <label>Trimestre</label>
                <span>{trimestreLabel} ({mesesTrimestre})</span>
              </div>
              <div className="modal-fila">
                <label>Ingresos del trimestre</label>
                <span>{fmt(totalBase)} €</span>
              </div>
              <div className="modal-fila">
                <label>Gastos deducibles</label>
                <span style={{color:'var(--muted)'}}>Introduce en tu programa de contabilidad</span>
              </div>
              <div className="modal-fila">
                <label>Rendimiento neto</label>
                <span>—</span>
              </div>
              <div className="modal-fila">
                <label>Retención (20%)</label>
                <span>—</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cerrar" onClick={() => setModal130(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
