'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'
import { descontarCreditos } from '../../lib/creditos'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReservaRaw = {
  id: string
  fecha: string
  hora: string
  estado: 'confirmada' | 'cancelada' | 'completada'
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string | null
  precio_total: number | null
  puntos_ganados: number | null
  servicios: { nombre: string; precio: number | null } | null
}

type ClienteAgrupado = {
  telefono: string
  nombre: string
  email: string | null
  reservas: ReservaRaw[]
  visitas: number
  cancelaciones: number
  gasto_total: number
  puntos_total: number
  servicio_frecuente: string
  primera_visita: string
  ultima_visita: string
  dias_desde_ultima: number
  nivel: 'Nuevo' | 'Habitual' | 'VIP' | 'Premium'
  media_dias: number | null
  prediccion: 'pronto' | 'riesgo' | null
  proxima_estimada: string | null
}

type AiResult = {
  frecuencia: string
  proxima_visita: string
  servicio_recomendado: string
  oferta_sugerida: string
}

type ServicioMin = { id: string; nombre: string; duracion_minutos: number | null; precio: number | null }
type TrabajadorMin = { id: string; nombre: string }

type Filtro = 'todos' | 'nuevos' | 'habituales' | 'vip' | 'sin_visita' | 'riesgo'
type Orden  = 'visitas' | 'reciente' | 'gasto' | 'sin_visita'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNivel(visitas: number): ClienteAgrupado['nivel'] {
  if (visitas >= 11) return 'Premium'
  if (visitas >= 6)  return 'VIP'
  if (visitas >= 2)  return 'Habitual'
  return 'Nuevo'
}

const NIVEL_CFG: Record<string, { color: string; bg: string; icon: string }> = {
  Premium: { color: '#C4860A', bg: 'rgba(196,134,10,0.12)',   icon: '⭐⭐⭐' },
  VIP:     { color: '#6B4FD8', bg: 'rgba(107,79,216,0.12)',   icon: '⭐⭐' },
  Habitual:{ color: '#1D4ED8', bg: 'rgba(29,78,216,0.12)',    icon: '⭐' },
  Nuevo:   { color: '#2E8A5E', bg: 'rgba(46,138,94,0.12)',    icon: '🌱' },
}

function avatarColor(key: string): { bg: string; color: string } {
  const palettes = [
    { bg: 'rgba(79,70,229,0.18)',  color: '#4F46E5' },
    { bg: 'rgba(16,185,129,0.18)', color: '#059669' },
    { bg: 'rgba(245,158,11,0.18)', color: '#D97706' },
    { bg: 'rgba(239,68,68,0.18)',  color: '#DC2626' },
    { bg: 'rgba(139,92,246,0.18)', color: '#7C3AED' },
    { bg: 'rgba(236,72,153,0.18)', color: '#BE185D' },
    { bg: 'rgba(6,182,212,0.18)',  color: '#0891B2' },
    { bg: 'rgba(34,197,94,0.18)',  color: '#16A34A' },
    { bg: 'rgba(249,115,22,0.18)', color: '#EA580C' },
    { bg: 'rgba(20,184,166,0.18)', color: '#0D9488' },
  ]
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xFFFFFFFF
  return palettes[Math.abs(hash) % palettes.length]
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function diasDesde(isoFecha: string): number {
  const [y, m, d] = isoFecha.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const now  = new Date(); now.setHours(0,0,0,0)
  return Math.floor((now.getTime() - then.getTime()) / 86400000)
}

function formatFechaCorta(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatFechaLarga(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function agruparClientes(reservas: ReservaRaw[]): ClienteAgrupado[] {
  const map: Record<string, ReservaRaw[]> = {}
  for (const r of reservas) {
    const key = r.cliente_telefono?.trim() || r.cliente_nombre?.trim() || 'sin-id'
    if (!map[key]) map[key] = []
    map[key].push(r)
  }

  return Object.entries(map).map(([tel, rs]) => {
    const noCancel = rs.filter(r => r.estado !== 'cancelada')
    const cancel   = rs.filter(r => r.estado === 'cancelada')
    const visitas  = noCancel.length

    const gasto_total  = noCancel.reduce((sum, r) => sum + (r.precio_total ?? r.servicios?.precio ?? 0), 0)
    const puntos_total = noCancel.reduce((sum, r) => sum + (r.puntos_ganados ?? 0), 0)

    const servicioCount: Record<string, number> = {}
    for (const r of noCancel) {
      const s = r.servicios?.nombre ?? 'Desconocido'
      servicioCount[s] = (servicioCount[s] ?? 0) + 1
    }
    const servicio_frecuente = Object.entries(servicioCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

    const fechas = rs.map(r => r.fecha).sort()
    const primera_visita = fechas[0] ?? ''
    const ultima_visita  = fechas[fechas.length - 1] ?? ''

    const latest = rs.reduce((a, b) => a.fecha > b.fecha ? a : b, rs[0])

    // Predicción próxima visita basada en media de intervalos entre visitas
    const visitFechas = noCancel.map(r => r.fecha).filter(Boolean).sort()
    let media_dias: number | null = null
    if (visitFechas.length >= 2) {
      const intervalos: number[] = []
      for (let i = 1; i < visitFechas.length; i++) {
        const diff = Math.floor((new Date(visitFechas[i]).getTime() - new Date(visitFechas[i-1]).getTime()) / 86400000)
        if (diff > 0) intervalos.push(diff)
      }
      if (intervalos.length > 0) {
        media_dias = Math.round(intervalos.reduce((s, x) => s + x, 0) / intervalos.length)
      }
    }
    const diasDesdeUlt = ultima_visita ? diasDesde(ultima_visita) : 999
    const prediccion: ClienteAgrupado['prediccion'] = (media_dias !== null && media_dias > 0)
      ? (diasDesdeUlt > 2 * media_dias ? 'riesgo' : diasDesdeUlt > media_dias ? 'pronto' : null)
      : null

    let proxima_estimada: string | null = null
    if (media_dias !== null && ultima_visita) {
      const [uy, um, ud] = ultima_visita.split('-').map(Number)
      const d = new Date(uy, um - 1, ud)
      d.setDate(d.getDate() + media_dias)
      proxima_estimada = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }

    return {
      telefono:         tel,
      nombre:           latest.cliente_nombre,
      email:            latest.cliente_email,
      reservas:         rs.sort((a, b) => b.fecha.localeCompare(a.fecha)),
      visitas,
      cancelaciones:    cancel.length,
      gasto_total,
      puntos_total,
      servicio_frecuente,
      primera_visita,
      ultima_visita,
      dias_desde_ultima: diasDesdeUlt,
      nivel:            getNivel(visitas),
      media_dias,
      prediccion,
      proxima_estimada,
    }
  })
}

function generarSlots(apertura: string, cierre: string, duracion = 30): string[] {
  const slots: string[] = []
  let [h, m] = apertura.split(':').map(Number)
  const [hc, mc] = cierre.split(':').map(Number)
  while (h * 60 + m + duracion <= hc * 60 + mc) {
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    m += duracion; if (m >= 60) { h++; m -= 60 }
  }
  return slots
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [negocio, setNegocio]             = useState<{ id: string; nombre: string; plan: string } | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [cargando, setCargando]           = useState(true)

  const [clientes, setClientes]           = useState<ClienteAgrupado[]>([])
  const [notas, setNotas]                 = useState<Record<string, string>>({})
  const [clienteActivo, setClienteActivo] = useState<ClienteAgrupado | null>(null)

  const [buscador, setBuscador]           = useState('')
  const [filtro, setFiltro]               = useState<Filtro>('todos')
  const [orden, setOrden]                 = useState<Orden>('reciente')

  const [notaLocal, setNotaLocal]         = useState('')
  const [editandoNota, setEditandoNota]   = useState(false)
  const [guardandoNota, setGuardandoNota] = useState(false)

  const [aiLoading, setAiLoading]         = useState(false)
  const [aiResult, setAiResult]           = useState<AiResult | null>(null)
  const [aiError, setAiError]             = useState<string | null>(null)

  // ─── Nueva reserva modal ──────────────────────────────────────────────────
  const [modalNueva, setModalNueva]         = useState(false)
  const [serviciosList, setServiciosList]   = useState<ServicioMin[]>([])
  const [trabajadoresList, setTrabajadores] = useState<TrabajadorMin[]>([])
  const [nuevaForm, setNuevaForm]           = useState({
    servicio_id: '', trabajador_id: '', fecha: hoyISO(), hora: '',
    cliente_nombre: '', cliente_telefono: '', cliente_email: '',
  })
  const [horasLibres, setHorasLibres]       = useState<string[]>([])
  const [nuevaError, setNuevaError]         = useState('')
  const [guardandoNueva, setGuardandoNueva] = useState(false)

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const f = params.get('filtro') as Filtro | null
    if (f && ['todos','nuevos','habituales','vip','sin_visita','riesgo'].includes(f)) setFiltro(f)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { session } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const { activo, todos } = await getNegocioActivo(session.user.id, session.access_token)
      setNegocio(activo as { id: string; nombre: string; plan: string })
      setTodosNegocios(todos)
    })()
  }, [])

  const cargarDatos = useCallback(async (negocioId: string) => {
    setCargando(true)
    const [{ data: reservas }, { data: notasData }] = await Promise.all([
      supabase.from('reservas')
        .select('id, fecha, hora, estado, cliente_nombre, cliente_telefono, cliente_email, precio_total, puntos_ganados, servicios(nombre, precio)')
        .eq('negocio_id', negocioId)
        .order('fecha', { ascending: false }),
      supabase.from('notas_clientes')
        .select('cliente_telefono, nota')
        .eq('negocio_id', negocioId),
    ])

    if (reservas) setClientes(agruparClientes(reservas as unknown as ReservaRaw[]))
    if (notasData) {
      const map: Record<string, string> = {}
      for (const n of notasData) map[n.cliente_telefono] = n.nota
      setNotas(map)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    if (negocio?.id) cargarDatos(negocio.id)
  }, [negocio?.id, cargarDatos])

  // ─── Load services/workers for nueva reserva modal ───────────────────────
  useEffect(() => {
    if (!negocio?.id) return
    ;(async () => {
      const [{ data: svcs }, { data: trabs }] = await Promise.all([
        supabase.from('servicios').select('id, nombre, duracion_minutos, precio').eq('negocio_id', negocio.id).eq('activo', true).order('nombre'),
        supabase.from('trabajadores').select('id, nombre').eq('negocio_id', negocio.id).eq('activo', true).order('nombre'),
      ])
      setServiciosList((svcs ?? []) as ServicioMin[])
      setTrabajadores((trabs ?? []) as TrabajadorMin[])
    })()
  }, [negocio?.id])

  // ─── Compute available hours ──────────────────────────────────────────────
  useEffect(() => {
    if (!negocio?.id || !nuevaForm.fecha || !modalNueva) return
    ;(async () => {
      const diasMap: Record<string, string> = { '0':'domingo','1':'lunes','2':'martes','3':'miercoles','4':'jueves','5':'viernes','6':'sabado' }
      const [y, m, d] = nuevaForm.fecha.split('-').map(Number)
      const diaSemana = diasMap[String(new Date(y, m - 1, d).getDay())]
      const duracion  = serviciosList.find(s => s.id === nuevaForm.servicio_id)?.duracion_minutos ?? 30

      const [{ data: horario }, { data: ocupadas }] = await Promise.all([
        supabase.from('horarios').select('*').eq('negocio_id', negocio.id).eq('dia', diaSemana).single(),
        supabase.from('reservas').select('hora, estado').eq('negocio_id', negocio.id).eq('fecha', nuevaForm.fecha).in('estado', ['confirmada', 'completada']),
      ])

      if (!horario?.abierto) { setHorasLibres([]); return }
      const todos   = generarSlots(horario.hora_apertura, horario.hora_cierre, duracion)
      const ocupSet = new Set((ocupadas ?? []).map(r => r.hora?.slice(0,5)))
      setHorasLibres(todos.filter(h => !ocupSet.has(h)))
    })()
  }, [negocio?.id, nuevaForm.fecha, nuevaForm.servicio_id, modalNueva, serviciosList])

  // ─── Filtering + sorting ─────────────────────────────────────────────────
  const clientesFiltrados = useMemo(() => {
    let list = [...clientes]

    if (buscador.trim()) {
      const q = buscador.toLowerCase().trim()
      list = list.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      )
    }

    switch (filtro) {
      case 'nuevos':     list = list.filter(c => c.nivel === 'Nuevo'); break
      case 'habituales': list = list.filter(c => c.nivel === 'Habitual'); break
      case 'vip':        list = list.filter(c => c.nivel === 'VIP' || c.nivel === 'Premium'); break
      case 'sin_visita': list = list.filter(c => c.dias_desde_ultima >= 30); break
      case 'riesgo':     list = list.filter(c => c.prediccion === 'riesgo'); break
    }

    switch (orden) {
      case 'visitas':    list.sort((a, b) => b.visitas - a.visitas); break
      case 'reciente':   list.sort((a, b) => b.ultima_visita.localeCompare(a.ultima_visita)); break
      case 'gasto':      list.sort((a, b) => b.gasto_total - a.gasto_total); break
      case 'sin_visita': list.sort((a, b) => b.dias_desde_ultima - a.dias_desde_ultima); break
    }

    return list
  }, [clientes, buscador, filtro, orden])

  const filtroContadores = useMemo(() => ({
    todos:      clientes.length,
    nuevos:     clientes.filter(c => c.nivel === 'Nuevo').length,
    habituales: clientes.filter(c => c.nivel === 'Habitual').length,
    vip:        clientes.filter(c => c.nivel === 'VIP' || c.nivel === 'Premium').length,
    sin_visita: clientes.filter(c => c.dias_desde_ultima >= 30).length,
    riesgo:     clientes.filter(c => c.prediccion === 'riesgo').length,
  }), [clientes])

  // ─── Nota handlers ────────────────────────────────────────────────────────
  async function guardarNota() {
    if (!negocio?.id || !clienteActivo) return
    setGuardandoNota(true)
    await supabase.from('notas_clientes').upsert(
      { negocio_id: negocio.id, cliente_telefono: clienteActivo.telefono, nota: notaLocal, updated_at: new Date().toISOString() },
      { onConflict: 'negocio_id,cliente_telefono' }
    )
    setNotas(prev => ({ ...prev, [clienteActivo.telefono]: notaLocal }))
    setEditandoNota(false)
    setGuardandoNota(false)
  }

  function abrirCliente(c: ClienteAgrupado) {
    setClienteActivo(c)
    setNotaLocal(notas[c.telefono] ?? '')
    setEditandoNota(false)
    setAiResult(null)
    setAiError(null)
  }

  // ─── AI analysis ─────────────────────────────────────────────────────────
  async function analizarCliente() {
    if (!negocio?.id || !clienteActivo) return
    setAiLoading(true)
    setAiError(null)

    const ok = await descontarCreditos(negocio.id, 3, 'analisis_cliente')
    if (!ok) {
      setAiError('No tienes créditos suficientes (necesitas 3).')
      setAiLoading(false)
      return
    }

    const historial = clienteActivo.reservas
      .map(r => `${r.fecha} ${r.hora?.slice(0,5)}: ${r.servicios?.nombre ?? 'Servicio desconocido'} (${r.estado})`)
      .join('\n')

    const prompt = `Eres un asistente inteligente para negocios de belleza, salud y bienestar. Analiza el historial de este cliente y responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin bloques de código.

Cliente: ${clienteActivo.nombre}
Teléfono: ${clienteActivo.telefono}
Visitas totales: ${clienteActivo.visitas}
Cancelaciones: ${clienteActivo.cancelaciones}
Servicio más frecuente: ${clienteActivo.servicio_frecuente}
Gasto total: ${clienteActivo.gasto_total.toFixed(2)}€
Primera visita: ${clienteActivo.primera_visita}
Última visita: ${clienteActivo.ultima_visita} (hace ${clienteActivo.dias_desde_ultima} días)
Historial:
${historial}

Responde con este JSON exacto:
{"frecuencia":"...","proxima_visita":"...","servicio_recomendado":"...","oferta_sugerida":"..."}`

    try {
      const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const json = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      setAiResult(json as AiResult)
    } catch {
      setAiError('Error al generar el análisis. Inténtalo de nuevo.')
    }
    setAiLoading(false)
  }

  // ─── Nueva reserva ────────────────────────────────────────────────────────
  function abrirModalNueva(c?: ClienteAgrupado) {
    setNuevaForm({
      servicio_id: '', trabajador_id: '', fecha: hoyISO(), hora: '',
      cliente_nombre: c?.nombre ?? '',
      cliente_telefono: c?.telefono ?? '',
      cliente_email: c?.email ?? '',
    })
    setNuevaError('')
    setModalNueva(true)
  }

  async function insertarReserva() {
    const { servicio_id, fecha, hora, cliente_nombre, cliente_telefono } = nuevaForm
    if (!servicio_id || !fecha || !hora || !cliente_nombre || !cliente_telefono) {
      setNuevaError('Rellena todos los campos obligatorios.')
      return
    }
    if (!negocio?.id) return
    setGuardandoNueva(true)
    const { error } = await supabase.from('reservas').insert({
      negocio_id: negocio.id,
      servicio_id,
      trabajador_id: nuevaForm.trabajador_id || null,
      cliente_nombre: cliente_nombre.trim(),
      cliente_telefono: cliente_telefono.trim(),
      cliente_email: nuevaForm.cliente_email.trim() || null,
      fecha,
      hora,
      estado: 'confirmada',
      confirmada_cliente: false,
    })
    if (error) { setNuevaError('Error al guardar la reserva.'); setGuardandoNueva(false); return }

    if (nuevaForm.cliente_email) {
      const svc = serviciosList.find(s => s.id === servicio_id)
      const trb = trabajadoresList.find(t => t.id === nuevaForm.trabajador_id)
      fetch('/api/confirmar-reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reserva: { id: 'nueva', cliente_nombre, cliente_email: nuevaForm.cliente_email, fecha, hora },
          negocio, servicio: svc, trabajador: trb ?? null,
        }),
      }).catch(() => {})
    }

    setModalNueva(false)
    await cargarDatos(negocio.id)
    setGuardandoNueva(false)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        .cli-page { display:flex; gap:0; height:calc(100vh - 60px); overflow:hidden; }
        .cli-left { flex:1; display:flex; flex-direction:column; overflow:hidden; background:#FAFBFC; }
        .cli-left.with-detail { flex:0 0 40%; border-right:1px solid rgba(0,0,0,0.07); }
        .cli-right { flex:0 0 60%; overflow-y:auto; background:#fff; animation:slideInRight .22s ease; }
        @keyframes slideInRight { from { transform:translateX(24px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        .cli-mobile-back { display:none; }
        .cli-header { padding:20px 20px 12px; border-bottom:1px solid rgba(0,0,0,0.07); }
        .cli-search { width:100%; padding:9px 12px 9px 34px; border:1.5px solid rgba(0,0,0,0.1); border-radius:10px; font-size:13px; background:#fff; outline:none; transition:border .15s; font-family:inherit; }
        .cli-search:focus { border-color:#4F46E5; }
        .cli-search-wrap { position:relative; }
        .cli-search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:14px; pointer-events:none; }
        .cli-filters { display:flex; gap:6px; margin-top:10px; flex-wrap:wrap; }
        .cli-filter-btn { padding:5px 10px; border-radius:8px; border:1.5px solid rgba(0,0,0,0.08); background:#fff; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; white-space:nowrap; font-family:inherit; }
        .cli-filter-btn.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
        .cli-sort { display:flex; gap:6px; margin-top:8px; align-items:center; }
        .cli-sort-label { font-size:11px; color:#9CA3AF; font-weight:600; }
        .cli-sort-btn { padding:4px 8px; border-radius:6px; border:1.5px solid rgba(0,0,0,0.08); background:#fff; font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; font-family:inherit; }
        .cli-sort-btn.active { background:#111827; color:#fff; border-color:#111827; }
        .cli-list { flex:1; overflow-y:auto; }
        .cli-card { padding:14px 20px; border-bottom:1px solid rgba(0,0,0,0.05); cursor:pointer; transition:background .1s; }
        .cli-card:hover { background:#F3F4FF; }
        .cli-card.active { background:#EEF2FF; border-left:3px solid #4F46E5; }
        .cli-card-top { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
        .cli-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; flex-shrink:0; }
        .cli-card-info { flex:1; min-width:0; }
        .cli-card-nombre { font-size:14px; font-weight:700; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cli-card-tel { font-size:12px; color:#6B7280; margin-top:1px; }
        .cli-card-meta { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .cli-badge { padding:3px 7px; border-radius:6px; font-size:11px; font-weight:700; }
        .cli-badge-alert { padding:3px 7px; border-radius:6px; font-size:10px; font-weight:700; }
        .cli-card-stats { font-size:11px; color:#9CA3AF; }
        .cli-empty { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:8px; padding:60px 20px; color:#9CA3AF; }

        .cli-detail { padding:28px 32px; max-width:700px; }
        .cli-detail-header { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
        .cli-detail-avatar { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:800; flex-shrink:0; }
        .cli-detail-name { font-size:22px; font-weight:800; color:#111827; letter-spacing:-0.5px; }
        .cli-detail-contact { font-size:13px; color:#6B7280; margin-top:4px; }
        .cli-stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
        .cli-stat-box { background:#F8FAFC; border:1px solid rgba(0,0,0,0.07); border-radius:14px; padding:14px 16px; }
        .cli-stat-val { font-size:22px; font-weight:800; color:#111827; letter-spacing:-0.5px; }
        .cli-stat-lbl { font-size:11px; color:#9CA3AF; font-weight:600; margin-top:2px; text-transform:uppercase; letter-spacing:0.3px; }
        .cli-section { margin-bottom:24px; }
        .cli-section-title { font-size:12px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; }
        .cli-info-row { display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid rgba(0,0,0,0.05); font-size:13px; }
        .cli-info-row:last-child { border-bottom:none; }
        .cli-info-label { color:#6B7280; }
        .cli-info-val { font-weight:600; color:#111827; }
        .cli-reserva-item { padding:10px 0; border-bottom:1px solid rgba(0,0,0,0.05); }
        .cli-reserva-item:last-child { border-bottom:none; }
        .cli-reserva-fecha { font-size:13px; font-weight:700; color:#111827; }
        .cli-reserva-svc { font-size:12px; color:#6B7280; margin-top:2px; }
        .cli-nota-box { background:#FFFBEB; border:1.5px solid #FDE68A; border-radius:12px; padding:14px 16px; }
        .cli-nota-text { font-size:13px; color:#92400E; line-height:1.6; white-space:pre-wrap; }
        .cli-nota-textarea { width:100%; min-height:90px; resize:vertical; border:1.5px solid rgba(0,0,0,0.1); border-radius:10px; padding:10px 12px; font-size:13px; font-family:inherit; outline:none; }
        .cli-nota-textarea:focus { border-color:#4F46E5; }
        .cli-btn { padding:9px 16px; border-radius:10px; border:none; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity .15s; }
        .cli-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .cli-btn-primary { background:#4F46E5; color:#fff; }
        .cli-btn-ghost { background:rgba(0,0,0,0.05); color:#374151; }
        .cli-btn-ai { background:linear-gradient(135deg,#B8D8F8,#D4C5F9); color:#1E3A5F; }
        .cli-btn-green { background:#22C55E; color:#fff; }
        .cli-ai-box { background:linear-gradient(135deg,rgba(184,216,248,0.2),rgba(212,197,249,0.2)); border:1.5px solid rgba(184,216,248,0.6); border-radius:14px; padding:18px; }
        .cli-ai-row { display:flex; gap:10px; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.05); font-size:13px; }
        .cli-ai-row:last-child { border-bottom:none; }
        .cli-ai-label { color:#6B4FD8; font-weight:700; flex-shrink:0; width:170px; }
        .cli-ai-val { color:#111827; line-height:1.5; }
        .cli-no-detail { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:12px; height:100%; color:#9CA3AF; padding:60px; text-align:center; }
        .cli-close-btn { margin-left:auto; padding:6px 10px; border-radius:8px; border:1.5px solid rgba(0,0,0,0.1); background:#fff; font-size:13px; cursor:pointer; font-family:inherit; }

        /* Modal nueva reserva */
        .cli-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:200; display:flex; align-items:flex-end; justify-content:center; padding:0; }
        @media (min-width:640px) { .cli-modal-overlay { align-items:center; padding:24px; } }
        .cli-modal-card { background:#fff; border-radius:20px 20px 0 0; width:100%; max-width:480px; padding:24px; max-height:90vh; overflow-y:auto; }
        @media (min-width:640px) { .cli-modal-card { border-radius:20px; } }
        .cli-modal-title { font-size:18px; font-weight:800; color:#111827; margin-bottom:20px; }
        .cli-form-group { margin-bottom:14px; }
        .cli-form-label { font-size:12px; font-weight:700; color:#374151; margin-bottom:5px; display:block; text-transform:uppercase; letter-spacing:0.3px; }
        .cli-form-input { width:100%; padding:9px 12px; border:1.5px solid rgba(0,0,0,0.1); border-radius:10px; font-size:13px; font-family:inherit; outline:none; }
        .cli-form-input:focus { border-color:#4F46E5; }
        .cli-form-input:disabled { background:#F9FAFB; color:#6B7280; }
        .cli-hours-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
        .cli-hour-btn { padding:7px; border-radius:8px; border:1.5px solid rgba(0,0,0,0.1); background:#fff; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .12s; }
        .cli-hour-btn.selected { background:#4F46E5; color:#fff; border-color:#4F46E5; }
        .cli-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:9px 12px; font-size:13px; color:#B91C1C; margin-bottom:12px; }

        @media (max-width:768px) {
          .cli-left { flex:1; width:100%; border-right:none; }
          .cli-left.with-detail { display:none; }
          .cli-right { flex:0 0 100%; width:100%; overflow-y:auto; }
          .cli-mobile-back { display:flex; align-items:center; gap:6px; padding:10px 0; margin-bottom:8px; background:none; border:none; font-size:14px; font-weight:700; color:#4F46E5; cursor:pointer; font-family:inherit; }
          .cli-stats-grid { grid-template-columns:repeat(2,1fr); }
          .cli-detail { padding:20px 16px; max-width:100%; }
          .cli-ai-label { width:auto; min-width:110px; }
          .cli-ai-row { flex-wrap:wrap; }
          .cli-sort { flex-wrap:wrap; }
        }
        @media (max-width:480px) {
          .cli-header { padding:16px 14px 10px; }
          .cli-detail { padding:16px 12px; }
          .cli-stat-val { font-size:18px; }
          .cli-filter-btn { font-size:11px; padding:4px 8px; }
        }
      `}</style>

      <div className="cli-page">
        {/* ── LEFT PANEL: Client list ── */}
        <div className={`cli-left${clienteActivo ? ' with-detail' : ''}`}>
          <div className="cli-header">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <div style={{ fontSize:'16px', fontWeight:800, color:'#111827' }}>
                Clientes <span style={{ fontSize:'13px', fontWeight:600, color:'#9CA3AF', marginLeft:'4px' }}>{clientesFiltrados.length}</span>
              </div>
              <button className="cli-btn cli-btn-green" style={{ padding:'7px 12px', fontSize:'12px' }} onClick={() => abrirModalNueva()}>
                + Nueva reserva
              </button>
            </div>
            <div className="cli-search-wrap">
              <span className="cli-search-icon">🔍</span>
              <input
                className="cli-search"
                placeholder="Buscar por nombre o teléfono…"
                value={buscador}
                onChange={e => setBuscador(e.target.value)}
              />
            </div>
            <div className="cli-filters">
              {([
                ['todos',      'Todos'],
                ['nuevos',     '🌱 Nuevos'],
                ['habituales', '⭐ Habituales'],
                ['vip',        '⭐⭐ VIP+'],
                ['sin_visita', '⏰ +30 días'],
                ['riesgo',     '🔴 En riesgo'],
              ] as [Filtro, string][]).map(([id, label]) => (
                <button key={id} className={`cli-filter-btn${filtro === id ? ' active' : ''}`} onClick={() => setFiltro(id)}>
                  {label} <span style={{ opacity: 0.7, fontWeight: 500 }}>({filtroContadores[id]})</span>
                </button>
              ))}
            </div>
            <div className="cli-sort">
              <span className="cli-sort-label">Orden:</span>
              {([
                ['visitas',    'Visitas'],
                ['reciente',   'Reciente'],
                ['gasto',      'Gasto'],
                ['sin_visita', 'Sin visita'],
              ] as [Orden, string][]).map(([id, label]) => (
                <button key={id} className={`cli-sort-btn${orden === id ? ' active' : ''}`} onClick={() => setOrden(id)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="cli-list">
            {cargando ? (
              <div className="cli-empty" style={{ fontSize:'13px' }}>Cargando clientes…</div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="cli-empty">
                <div style={{ fontSize:'32px' }}>👤</div>
                <div style={{ fontSize:'14px', fontWeight:600 }}>Sin clientes</div>
                <div style={{ fontSize:'12px' }}>Prueba otro filtro</div>
              </div>
            ) : clientesFiltrados.map(c => {
              const cfg   = NIVEL_CFG[c.nivel]
              const ac    = avatarColor(c.telefono || c.nombre)
              const isAct = clienteActivo?.telefono === c.telefono
              const inicial = (c.nombre?.[0] ?? '?').toUpperCase()
              return (
                <div key={c.telefono} className={`cli-card${isAct ? ' active' : ''}`} onClick={() => abrirCliente(c)}>
                  <div className="cli-card-top">
                    <div className="cli-avatar" style={{ background: ac.bg, color: ac.color }}>
                      {inicial}
                    </div>
                    <div className="cli-card-info">
                      <div className="cli-card-nombre">{c.nombre}</div>
                      <div className="cli-card-tel">{c.telefono}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{c.visitas} visitas</div>
                      <div style={{ fontSize:'11px', color:'#9CA3AF' }}>{c.gasto_total > 0 ? `${c.gasto_total.toFixed(0)}€` : ''}</div>
                    </div>
                  </div>
                  <div className="cli-card-meta">
                    <span className="cli-badge" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {c.nivel}
                    </span>
                    {c.prediccion === 'riesgo' && (
                      <span className="cli-badge-alert" style={{ background:'rgba(239,68,68,0.08)', color:'#DC2626' }}>
                        ⚠️ En riesgo
                      </span>
                    )}
                    {c.dias_desde_ultima >= 30 && c.prediccion !== 'riesgo' && (
                      <span className="cli-badge-alert" style={{ background:'rgba(239,68,68,0.1)', color:'#DC2626' }}>
                        🔴 Sin visita {c.dias_desde_ultima}d
                      </span>
                    )}
                    {c.cancelaciones === 0 && c.visitas >= 2 && (
                      <span className="cli-badge-alert" style={{ background:'rgba(34,197,94,0.1)', color:'#15803D' }}>
                        ✅ Fiel
                      </span>
                    )}
                    {c.prediccion === 'pronto' && (
                      <span className="cli-badge-alert" style={{ background:'rgba(34,197,94,0.1)', color:'#15803D' }}>
                        🔮 Vuelve pronto
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL: Client detail (only when selected) ── */}
        {clienteActivo && (() => {
            const c   = clienteActivo
            const cfg = NIVEL_CFG[c.nivel]
            const ac  = avatarColor(c.telefono || c.nombre)
            const tasa = c.reservas.length > 0 ? Math.round((c.cancelaciones / c.reservas.length) * 100) : 0
            const nota = notas[c.telefono]
            return (
          <div className="cli-right">
              <div className="cli-detail">
                {/* Mobile back button */}
                <button className="cli-mobile-back" onClick={() => setClienteActivo(null)}>← Volver</button>
                {/* Header */}
                <div className="cli-detail-header">
                  <div className="cli-detail-avatar" style={{ background: ac.bg, color: ac.color }}>
                    {(c.nombre?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                      <div className="cli-detail-name">{c.nombre}</div>
                      <span className="cli-badge" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon} {c.nivel}
                      </span>
                      {c.prediccion === 'riesgo' && (
                        <span className="cli-badge" style={{ background:'rgba(239,68,68,0.08)', color:'#DC2626', fontSize:'11px' }}>
                          ⚠️ En riesgo de pérdida
                        </span>
                      )}
                      {c.dias_desde_ultima >= 30 && c.prediccion !== 'riesgo' && (
                        <span className="cli-badge" style={{ background:'rgba(239,68,68,0.1)', color:'#DC2626', fontSize:'11px' }}>
                          🔴 Sin visita +{c.dias_desde_ultima}d
                        </span>
                      )}
                      {c.cancelaciones === 0 && c.visitas >= 2 && (
                        <span className="cli-badge" style={{ background:'rgba(34,197,94,0.1)', color:'#15803D', fontSize:'11px' }}>
                          ✅ Cliente fiel
                        </span>
                      )}
                      {c.prediccion === 'pronto' && (
                        <span className="cli-badge" style={{ background:'rgba(34,197,94,0.1)', color:'#15803D', fontSize:'11px' }}>
                          🔮 Podría volver pronto
                        </span>
                      )}
                    </div>
                    <div className="cli-detail-contact">
                      {c.telefono}
                      {c.email ? <span style={{ marginLeft:'10px' }}>{c.email}</span> : null}
                    </div>
                  </div>
                  <button className="cli-close-btn" onClick={() => setClienteActivo(null)}>✕</button>
                </div>

                {/* Stats grid */}
                <div className="cli-stats-grid">
                  <div className="cli-stat-box">
                    <div className="cli-stat-val">{c.visitas}</div>
                    <div className="cli-stat-lbl">Visitas</div>
                  </div>
                  <div className="cli-stat-box">
                    <div className="cli-stat-val">{c.gasto_total.toFixed(0)}€</div>
                    <div className="cli-stat-lbl">Gasto total</div>
                  </div>
                  <div className="cli-stat-box">
                    <div className="cli-stat-val">{c.dias_desde_ultima}d</div>
                    <div className="cli-stat-lbl">Desde última visita</div>
                  </div>
                </div>

                {/* Info rows */}
                <div className="cli-section">
                  <div className="cli-section-title">Información</div>
                  <div style={{ background:'#F8FAFC', borderRadius:'12px', padding:'4px 16px' }}>
                    {[
                      ['Puntos de fidelización', c.puntos_total > 0 ? `⭐ ${c.puntos_total} pts` : '—'],
                      ['Servicio más frecuente', c.servicio_frecuente],
                      ['Primera visita', c.primera_visita ? formatFechaCorta(c.primera_visita) : '—'],
                      ['Última visita', c.ultima_visita ? formatFechaLarga(c.ultima_visita) : '—'],
                      ['Días desde última visita', `${c.dias_desde_ultima} días`],
                      ['Tasa de cancelaciones', `${tasa}% (${c.cancelaciones} de ${c.reservas.length})`],
                    ].map(([label, val]) => (
                      <div key={label} className="cli-info-row">
                        <span className="cli-info-label">{label}</span>
                        <span className="cli-info-val">{val}</span>
                      </div>
                    ))}
                    {c.media_dias !== null && (
                      <div className="cli-info-row">
                        <span className="cli-info-label">Frecuencia media de visita</span>
                        <span className="cli-info-val">cada {c.media_dias} día{c.media_dias !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {c.proxima_estimada && (
                      <div className="cli-info-row">
                        <span className="cli-info-label">Próxima visita estimada</span>
                        <span className="cli-info-val" style={{ color: c.prediccion === 'riesgo' ? '#DC2626' : '#15803D', fontWeight: 700 }}>
                          {formatFechaCorta(c.proxima_estimada)}
                          {c.prediccion === 'riesgo' ? ' ⚠️' : c.prediccion === 'pronto' ? ' 🔮' : ''}
                        </span>
                      </div>
                    )}
                    {c.prediccion && (
                      <div className="cli-info-row">
                        <span className="cli-info-label">Estado de retención</span>
                        <span className="cli-info-val" style={{ color: c.prediccion === 'riesgo' ? '#DC2626' : '#15803D', fontWeight: 700 }}>
                          {c.prediccion === 'riesgo'
                            ? `⚠️ En riesgo — lleva ${c.dias_desde_ultima}d (2× su media)`
                            : `🔮 Podría volver pronto (media: ${c.media_dias}d)`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:'8px', marginBottom:'24px', flexWrap:'wrap' }}>
                  <button className="cli-btn cli-btn-green" onClick={() => abrirModalNueva(c)}>
                    📅 Nueva reserva
                  </button>
                  <button
                    className="cli-btn cli-btn-ai"
                    onClick={analizarCliente}
                    disabled={aiLoading}
                  >
                    {aiLoading ? '⏳ Analizando…' : '🤖 Analizar con IA (3 créditos)'}
                  </button>
                </div>

                {/* AI result */}
                {aiError && (
                  <div className="cli-error" style={{ marginBottom:'16px' }}>{aiError}</div>
                )}
                {aiResult && (
                  <div className="cli-section">
                    <div className="cli-section-title">Análisis IA</div>
                    <div className="cli-ai-box">
                      {[
                        ['📅 Frecuencia estimada', aiResult.frecuencia],
                        ['🔮 Próxima visita estimada', aiResult.proxima_visita],
                        ['💡 Servicio recomendado', aiResult.servicio_recomendado],
                        ['🎁 Oferta sugerida', aiResult.oferta_sugerida],
                      ].map(([label, val]) => (
                        <div key={label} className="cli-ai-row">
                          <span className="cli-ai-label">{label}</span>
                          <span className="cli-ai-val">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas internas */}
                <div className="cli-section">
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                    <div className="cli-section-title" style={{ margin:0 }}>Notas internas</div>
                    {!editandoNota && (
                      <button className="cli-btn cli-btn-ghost" style={{ padding:'5px 10px', fontSize:'12px' }}
                        onClick={() => { setNotaLocal(nota ?? ''); setEditandoNota(true) }}>
                        {nota ? '✏️ Editar' : '+ Añadir nota'}
                      </button>
                    )}
                  </div>
                  {editandoNota ? (
                    <div>
                      <textarea
                        className="cli-nota-textarea"
                        placeholder="Escribe notas privadas sobre este cliente…"
                        value={notaLocal}
                        onChange={e => setNotaLocal(e.target.value)}
                      />
                      <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
                        <button className="cli-btn cli-btn-primary" onClick={guardarNota} disabled={guardandoNota}>
                          {guardandoNota ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button className="cli-btn cli-btn-ghost" onClick={() => setEditandoNota(false)}>Cancelar</button>
                      </div>
                    </div>
                  ) : nota ? (
                    <div className="cli-nota-box">
                      <div className="cli-nota-text">{nota}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize:'13px', color:'#9CA3AF', fontStyle:'italic' }}>Sin notas todavía.</div>
                  )}
                </div>

                {/* Historial de reservas */}
                <div className="cli-section">
                  <div className="cli-section-title">Historial completo ({c.reservas.length})</div>
                  <div style={{ background:'#F8FAFC', borderRadius:'12px', padding:'4px 16px' }}>
                    {c.reservas.map(r => {
                      const estCfg: Record<string, { label: string; color: string }> = {
                        confirmada: { label: 'Confirmada', color: '#1D4ED8' },
                        completada: { label: 'Completada', color: '#2E8A5E' },
                        cancelada:  { label: 'Cancelada',  color: '#B5467A' },
                      }
                      const ec = estCfg[r.estado] ?? estCfg.confirmada
                      return (
                        <div key={r.id} className="cli-reserva-item">
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                              <div className="cli-reserva-fecha">{formatFechaCorta(r.fecha)} · {r.hora?.slice(0,5)}</div>
                              <div className="cli-reserva-svc">{r.servicios?.nombre ?? 'Servicio'}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <span style={{ fontSize:'11px', fontWeight:700, color: ec.color }}>{ec.label}</span>
                              {r.servicios?.precio ? (
                                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>{r.servicios.precio}€</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
            )
        })()}
      </div>

      {/* ── MODAL: Nueva reserva ── */}
      {modalNueva && (
        <div className="cli-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalNueva(false) }}>
          <div className="cli-modal-card">
            <div className="cli-modal-title">📅 Nueva reserva</div>

            {nuevaError && <div className="cli-error">{nuevaError}</div>}

            {/* Client fields — prefilled but editable */}
            <div className="cli-form-group">
              <label className="cli-form-label">Nombre *</label>
              <input className="cli-form-input" value={nuevaForm.cliente_nombre}
                onChange={e => setNuevaForm(p => ({ ...p, cliente_nombre: e.target.value }))} />
            </div>
            <div className="cli-form-group">
              <label className="cli-form-label">Teléfono *</label>
              <input className="cli-form-input" value={nuevaForm.cliente_telefono}
                onChange={e => setNuevaForm(p => ({ ...p, cliente_telefono: e.target.value }))} />
            </div>
            <div className="cli-form-group">
              <label className="cli-form-label">Email</label>
              <input className="cli-form-input" type="email" value={nuevaForm.cliente_email}
                onChange={e => setNuevaForm(p => ({ ...p, cliente_email: e.target.value }))} />
            </div>

            <div className="cli-form-group">
              <label className="cli-form-label">Servicio *</label>
              <select className="cli-form-input" value={nuevaForm.servicio_id}
                onChange={e => setNuevaForm(p => ({ ...p, servicio_id: e.target.value, hora: '' }))}>
                <option value="">Selecciona servicio</option>
                {serviciosList.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.precio ? ` — ${s.precio}€` : ''}</option>)}
              </select>
            </div>

            {trabajadoresList.length > 0 && (
              <div className="cli-form-group">
                <label className="cli-form-label">Profesional</label>
                <select className="cli-form-input" value={nuevaForm.trabajador_id}
                  onChange={e => setNuevaForm(p => ({ ...p, trabajador_id: e.target.value }))}>
                  <option value="">Sin preferencia</option>
                  {trabajadoresList.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
            )}

            <div className="cli-form-group">
              <label className="cli-form-label">Fecha *</label>
              <input className="cli-form-input" type="date" value={nuevaForm.fecha} min={hoyISO()}
                onChange={e => setNuevaForm(p => ({ ...p, fecha: e.target.value, hora: '' }))} />
            </div>

            {nuevaForm.fecha && nuevaForm.servicio_id && (
              <div className="cli-form-group">
                <label className="cli-form-label">Hora *</label>
                {horasLibres.length === 0 ? (
                  <div style={{ fontSize:'13px', color:'#9CA3AF', padding:'8px 0' }}>Sin horas disponibles este día</div>
                ) : (
                  <div className="cli-hours-grid">
                    {horasLibres.map(h => (
                      <button key={h} className={`cli-hour-btn${nuevaForm.hora === h ? ' selected' : ''}`}
                        onClick={() => setNuevaForm(p => ({ ...p, hora: h }))}>
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display:'flex', gap:'8px', marginTop:'20px' }}>
              <button className="cli-btn cli-btn-primary" style={{ flex:1 }} onClick={insertarReserva} disabled={guardandoNueva}>
                {guardandoNueva ? 'Guardando…' : 'Crear reserva'}
              </button>
              <button className="cli-btn cli-btn-ghost" onClick={() => setModalNueva(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
