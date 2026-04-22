'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'




type Reserva = {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  fecha: string
  hora: string
  estado: 'confirmada' | 'cancelada' | 'completada'
  servicio_id: string
  trabajador_id: string | null
  puntos_ganados: number | null
  servicios: { nombre: string } | null
  trabajadores: { nombre: string } | null
}

type ClienteStat = { total: number; cancelaciones: number; tasa: number }

type EsperaEntry = {
  id: string
  cliente_nombre: string
  cliente_telefono: string | null
  cliente_email: string | null
  fecha: string
  created_at: string
  servicios: { nombre: string } | null
}

type Horario = {
  dia: string
  abierto: boolean
  hora_apertura: string
  hora_cierre: string
  hora_apertura2: string | null
  hora_cierre2: string | null
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CAB = ['L','M','X','J','V','S','D']
const DIAS_NOMBRE = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function dateToISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatFechaLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(y, m-1, d)
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const manana = new Date(hoy); manana.setDate(hoy.getDate()+1)
  if (fecha.getTime() === hoy.getTime()) return 'Hoy'
  if (fecha.getTime() === manana.getTime()) return 'Mañana'
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

function generarSlots(apertura: string, cierre: string): string[] {
  const slots: string[] = []
  let [h, m] = apertura.split(':').map(Number)
  const [hc, mc] = cierre.split(':').map(Number)
  while (h * 60 + m < hc * 60 + mc) {
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    m += 30
    if (m >= 60) { h++; m -= 60 }
  }
  return slots
}

const estadoConfig = {
  confirmada:  { label: 'Confirmada',  bg: 'rgba(184,216,248,0.3)',  color: '#1D4ED8' },
  completada:  { label: 'Completada',  bg: 'rgba(184,237,212,0.3)',  color: '#2E8A5E' },
  cancelada:   { label: 'Cancelada',   bg: 'rgba(251,207,232,0.3)',  color: '#B5467A' },
}

const WORKER_COLORS_RES = ['#818CF8','#34D399','#FBBF24','#F472B6','#38BDF8','#FB923C','#A78BFA','#F87171']

export default function Reservas() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<{id: string, nombre: string, plan: string} | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [colorMap, setColorMap] = useState<Record<string, string>>({})
  const [fecha, setFecha] = useState(hoyISO())
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [reservasMes, setReservasMes] = useState<Record<string, number>>({})
  const [calMes, setCalMes] = useState(() => new Date().getMonth())
  const [calAnio, setCalAnio] = useState(() => new Date().getFullYear())
  const [vista, setVista] = useState<'calendario' | 'dia' | 'espera' | 'stats'>('calendario')
  const [listaEspera, setListaEspera] = useState<EsperaEntry[]>([])
  const [cargandoEspera, setCargandoEspera] = useState(false)
  const [clienteStats, setClienteStats] = useState<Record<string, ClienteStat>>({})
  // Estadísticas históricas
  const [statsHistoricos, setStatsHistoricos] = useState({ horaPunta: '', diaPunta: '', mesPunta: '' })
  const [cancelacionesSem, setCancelacionesSem] = useState(0)
  const [serviciosSinReservar, setServiciosSinReservar] = useState<string[]>([])

  useEffect(() => {
    ;(async () => {
      const { session } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo: data, todos: todosNegs } = await getNegocioActivo(user.id, session.access_token)
      setTodosNegocios(todosNegs)
      if (data) setNegocio(data)
    })()
  }, [])

  // Cargar trabajadores para colorMap
  useEffect(() => {
    if (!negocio) return
    supabase.from('trabajadores')
      .select('id,color')
      .eq('negocio_id', negocio.id)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        ;(data || []).forEach((t: { id: string; color: string | null }, idx: number) => {
          map[t.id] = t.color || WORKER_COLORS_RES[idx % WORKER_COLORS_RES.length]
        })
        setColorMap(map)
      })
  }, [negocio])

  // Cargar horarios
  useEffect(() => {
    if (!negocio) return
    supabase.from('horarios')
      .select('dia,abierto,hora_apertura,hora_cierre,hora_apertura2,hora_cierre2')
      .eq('negocio_id', negocio.id)
      .then(({ data }) => { if (data) setHorarios(data as Horario[]) })
  }, [negocio])

  // Cargar estadísticas históricas de clientes para badge de riesgo
  useEffect(() => {
    if (!negocio) return
    supabase
      .from('reservas')
      .select('cliente_telefono, estado')
      .eq('negocio_id', negocio.id)
      .in('estado', ['completada', 'cancelada'])
      .then(({ data }) => {
        const stats: Record<string, ClienteStat> = {}
        for (const r of data || []) {
          const tel = r.cliente_telefono
          if (!tel) continue
          if (!stats[tel]) stats[tel] = { total: 0, cancelaciones: 0, tasa: 0 }
          if (r.estado === 'completada') stats[tel].total++
          else if (r.estado === 'cancelada') stats[tel].cancelaciones++
        }
        for (const tel in stats) {
          const s = stats[tel]
          s.tasa = s.total > 0 ? Math.round(s.cancelaciones / s.total * 100) : 0
        }
        setClienteStats(stats)
      })
  }, [negocio])

  // Estadísticas históricas: hora punta, día punta, mes con más ingresos
  useEffect(() => {
    if (!negocio) return
    const hace6 = new Date(); hace6.setMonth(hace6.getMonth() - 6)
    const desde = dateToISO(hace6)
    supabase
      .from('reservas')
      .select('hora, fecha, servicios(precio)')
      .eq('negocio_id', negocio.id)
      .neq('estado', 'cancelada')
      .gte('fecha', desde)
      .then(({ data }) => {
        if (!data?.length) return
        const DIAS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
        const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        const porHora: Record<number, number> = {}
        const porDia:  Record<number, number> = {}
        const porMes:  Record<number, number> = {}
        for (const r of data) {
          const h = parseInt((r.hora as string ?? '00').slice(0, 2), 10)
          porHora[h] = (porHora[h] ?? 0) + 1
          const [ry, rm, rd] = (r.fecha as string).split('-').map(Number)
          const dow = new Date(ry, rm - 1, rd).getDay()
          porDia[dow] = (porDia[dow] ?? 0) + 1
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const precio = ((Array.isArray(r.servicios) ? r.servicios[0] : r.servicios) as any)?.precio ?? 0
          porMes[rm - 1] = (porMes[rm - 1] ?? 0) + precio
        }
        const top = (obj: Record<number, number>) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0]
        const hTop = top(porHora)
        const dTop = top(porDia)
        const mTop = top(porMes)
        setStatsHistoricos({
          horaPunta: hTop !== undefined ? `${hTop}:00 h` : '',
          diaPunta:  dTop !== undefined ? DIAS_ES[Number(dTop)] : '',
          mesPunta:  mTop !== undefined ? MESES_ES[Number(mTop)] : '',
        })
      })
  }, [negocio])

  // Cancelaciones esta semana
  useEffect(() => {
    if (!negocio) return
    const now = new Date()
    const inicioSem = new Date(now)
    inicioSem.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    inicioSem.setHours(0, 0, 0, 0)
    supabase
      .from('reservas')
      .select('id')
      .eq('negocio_id', negocio.id)
      .eq('estado', 'cancelada')
      .gte('fecha', dateToISO(inicioSem))
      .then(({ data }) => setCancelacionesSem(data?.length ?? 0))
  }, [negocio])

  // Servicios sin reservar en los últimos 30 días
  useEffect(() => {
    if (!negocio) return
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    const desde30 = dateToISO(hace30)
    Promise.all([
      supabase.from('servicios').select('id,nombre').eq('negocio_id', negocio.id).eq('activo', true),
      supabase.from('reservas').select('servicio_id').eq('negocio_id', negocio.id).gte('fecha', desde30).neq('estado', 'cancelada'),
    ]).then(([{ data: srvs }, { data: recientes }]) => {
      const reservadosSet = new Set((recientes || []).map((r: { servicio_id: string }) => r.servicio_id))
      const sin = (srvs || [])
        .filter((s: { id: string }) => !reservadosSet.has(s.id))
        .map((s: { nombre: string }) => s.nombre)
      setServiciosSinReservar(sin)
    })
  }, [negocio])

  // Cargar conteo de reservas del mes para el calendario
  useEffect(() => {
    if (!negocio) return
    const inicio = `${calAnio}-${String(calMes+1).padStart(2,'0')}-01`
    const ultimoDia = new Date(calAnio, calMes+1, 0).getDate()
    const fin = `${calAnio}-${String(calMes+1).padStart(2,'0')}-${String(ultimoDia).padStart(2,'0')}`
    getSessionClient().then(({ db }) => {
      db.from('reservas')
        .select('fecha,estado')
        .eq('negocio_id', negocio.id)
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .neq('estado', 'cancelada')
        .then(({ data }) => {
          const counts: Record<string, number> = {}
          for (const r of (data || [])) counts[r.fecha] = (counts[r.fecha] || 0) + 1
          setReservasMes(counts)
        })
    })
  }, [negocio, calMes, calAnio])

  // Cargar lista de espera
  useEffect(() => {
    if (vista !== 'espera' || !negocio) return
    setCargandoEspera(true)
    supabase
      .from('lista_espera')
      .select('id, cliente_nombre, cliente_telefono, cliente_email, fecha, created_at, servicios(nombre)')
      .eq('negocio_id', negocio.id)
      .order('fecha', { ascending: true })
      .then(({ data }) => {
        setListaEspera((data as unknown as EsperaEntry[]) || [])
        setCargandoEspera(false)
      })
  }, [vista, negocio])

  // Cargar reservas del día seleccionado
  const cargarReservas = useCallback(async () => {
    if (!negocio) return
    setCargando(true)
    const { db } = await getSessionClient()
    const { data } = await db
      .from('reservas')
      .select('*, servicios(nombre), trabajadores(nombre)')
      .eq('negocio_id', negocio.id)
      .eq('fecha', fecha)
      .order('hora')
    setReservas((data as Reserva[]) || [])
    setCargando(false)
  }, [negocio, fecha])

  useEffect(() => {
    if (vista === 'dia') cargarReservas()
  }, [cargarReservas, vista])

  function seleccionarDia(iso: string) {
    setFecha(iso)
    // Sync calendar to show the month of selected day
    const [y, m] = iso.split('-').map(Number)
    setCalMes(m - 1)
    setCalAnio(y)
    setVista('dia')
  }

  function badgeRiesgo(telefono: string | null) {
    if (!telefono) return null
    const s = clienteStats[telefono]
    if (!s) return null
    const totalHist = s.total + s.cancelaciones
    if (totalHist <= 3) return null
    if (s.tasa > 50) return <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',background:'#FEE2E2',color:'#DC2626',whiteSpace:'nowrap'}}>🔴 Alto riesgo</span>
    if (s.tasa > 25) return <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',background:'#FEF3C7',color:'#D97706',whiteSpace:'nowrap'}}>🟡 Riesgo medio</span>
    return <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',background:'#ECFDF5',color:'#059669',whiteSpace:'nowrap'}}>🟢 Fiable</span>
  }

  function getSlotsDelDia() {
    const [y, m, d] = fecha.split('-').map(Number)
    const diaNombre = DIAS_NOMBRE[new Date(y, m-1, d).getDay()]
    const h = horarios.find(h => h.dia === diaNombre)
    if (!h || !h.abierto) return []
    const s1 = h.hora_apertura && h.hora_cierre ? generarSlots(h.hora_apertura, h.hora_cierre) : []
    const s2 = h.hora_apertura2 && h.hora_cierre2 ? generarSlots(h.hora_apertura2, h.hora_cierre2) : []
    return [...s1, ...s2].map(hora => ({
      hora,
      reserva: reservas.find(r => r.hora.slice(0,5) === hora) || null
    }))
  }

  async function cambiarEstado(id: string, estado: 'confirmada' | 'cancelada' | 'completada') {
    setActualizando(id)
    const { error } = await supabase.from('reservas').update({ estado }).eq('id', id)
    if (!error) {
      const prevEstado = reservas.find(r => r.id === id)?.estado
      const tel = reservas.find(r => r.id === id)?.cliente_telefono ?? null
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado } : r))
      // Update month count
      if (estado === 'cancelada') {
        setReservasMes(prev => ({ ...prev, [fecha]: Math.max(0, (prev[fecha] || 1) - 1) }))
      } else if (estado === 'confirmada') {
        setReservasMes(prev => ({ ...prev, [fecha]: (prev[fecha] || 0) + 1 }))
      }
      // Update client stats for risk badge
      if (tel) {
        setClienteStats(prev => {
          const s = prev[tel] ?? { total: 0, cancelaciones: 0, tasa: 0 }
          let { total, cancelaciones } = s
          // Undo previous state contribution
          if (prevEstado === 'completada') total = Math.max(0, total - 1)
          if (prevEstado === 'cancelada') cancelaciones = Math.max(0, cancelaciones - 1)
          // Apply new state
          if (estado === 'completada') total++
          if (estado === 'cancelada') cancelaciones++
          const tasa = total > 0 ? Math.round(cancelaciones / total * 100) : 0
          return { ...prev, [tel]: { total, cancelaciones, tasa } }
        })
      }
    }
    setActualizando(null)
  }


  const confirmadas = reservas.filter(r => r.estado === 'confirmada').length
  const completadas = reservas.filter(r => r.estado === 'completada').length
  const slots = vista === 'dia' ? getSlotsDelDia() : []
  const slotsLibres = slots.filter(s => !s.reserva).length

  // Ocupación y huecos entre reservas
  const slotsOcupados = slots.filter(s => s.reserva && s.reserva.estado !== 'cancelada').length
  const ocupacionPct = slots.length > 0 ? Math.round(slotsOcupados / slots.length * 100) : 0

  function detectarHuecos() {
    const ocupados = slots.map(s => !!(s.reserva && s.reserva.estado !== 'cancelada'))
    if (ocupados.filter(Boolean).length < 2) return 0
    const primerOc = ocupados.findIndex(Boolean)
    const ultimoOc = ocupados.length - 1 - [...ocupados].reverse().findIndex(Boolean)
    let huecos = 0; let i = primerOc + 1
    while (i <= ultimoOc) {
      if (!ocupados[i]) {
        let gapSize = 0
        while (i <= ultimoOc && !ocupados[i]) { gapSize++; i++ }
        if (i <= ultimoOc && gapSize * 30 > 30) huecos++
      } else { i++ }
    }
    return huecos
  }
  const huecosEntreCitas = detectarHuecos()

  // Sugerencias automáticas
  const sugerencias: { icon: string; msg: string; color: string; bg: string }[] = []
  if (slots.length > 0 && ocupacionPct < 50) {
    sugerencias.push({ icon: '💡', msg: 'Ocupación baja hoy. Considera activar un descuento para atraer más clientes.', color: '#D97706', bg: 'rgba(253,230,138,0.15)' })
  }
  if (cancelacionesSem >= 3) {
    sugerencias.push({ icon: '⚠️', msg: `Alta tasa de cancelaciones esta semana (${cancelacionesSem}). Revisa tu política de cancelación.`, color: '#DC2626', bg: 'rgba(254,202,202,0.2)' })
  }
  for (const srv of serviciosSinReservar) {
    sugerencias.push({ icon: '🔧', msg: `El servicio "${srv}" lleva más de 30 días sin reservarse. Considera destacarlo o ajustar el precio.`, color: '#6B4FD8', bg: 'rgba(212,197,249,0.15)' })
  }

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF; --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --lila: #D4C5F9; --lila-dark: #6B4FD8; --lila-soft: rgba(212,197,249,0.2);
          --green: #B8EDD4; --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2);
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
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
        .user-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--bg); margin-bottom: 8px; cursor: pointer; text-decoration: none; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--blue-dark); flex-shrink: 0; }
        .user-name { font-size: 13px; font-weight: 600; color: var(--text); }
        .user-plan { font-size: 11px; color: var(--muted); }
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .topbar-title { font-size: 16px; font-weight: 700; color: var(--text); }
        .content { padding: 24px 28px; flex: 1; }
        .page-header { margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
        .page-header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); margin-bottom: 4px; }
        .page-header p { font-size: 14px; color: var(--text2); }
        .nav-fecha { background: none; border: 1.5px solid var(--border); border-radius: 10px; width: 36px; height: 36px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text2); transition: all 0.15s; }
        .nav-fecha:hover { background: var(--bg); }
        .stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
        .stat-mini { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; flex: 1; }
        .stat-mini-val { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .stat-mini-label { font-size: 12px; color: var(--text2); margin-top: 2px; }
        .reservas-lista { display: flex; flex-direction: column; gap: 10px; }
        .reserva-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 16px; transition: box-shadow 0.2s; }
        .reserva-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .reserva-hora { font-size: 18px; font-weight: 800; color: var(--text); min-width: 56px; letter-spacing: -0.5px; }
        .reserva-info { flex: 1; }
        .reserva-cliente { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
        .reserva-detalle { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .reserva-estado { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 100px; white-space: nowrap; }
        .reserva-actions { display: flex; gap: 8px; }
        .btn-completar { padding: 8px 14px; background: var(--green-soft); color: var(--green-dark); border: 1.5px solid rgba(184,237,212,0.6); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-completar:hover { background: rgba(184,237,212,0.5); }
        .btn-cancelar { padding: 8px 14px; background: rgba(251,207,232,0.2); color: #B5467A; border: 1.5px solid rgba(251,207,232,0.5); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-cancelar:hover { background: rgba(251,207,232,0.4); }
        .btn-restaurar { padding: 8px 14px; background: var(--blue-soft); color: var(--blue-dark); border: 1.5px solid rgba(184,216,248,0.6); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
        .empty-state-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-state-title { font-size: 16px; font-weight: 700; color: var(--text2); margin-bottom: 6px; }
        /* Calendario */
        .cal-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .cal-mes-label { font-size: 16px; font-weight: 800; color: var(--text); }
        .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; }
        .cal-cab { text-align: center; font-size: 12px; font-weight: 700; color: var(--muted); padding: 6px 0; }
        .cal-dia { aspect-ratio: 1; border-radius: 10px; border: 1.5px solid var(--border); background: var(--white); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 2px; transition: all 0.15s; font-family: inherit; }
        .cal-dia:hover { background: var(--bg); border-color: #CBD5E1; }
        .cal-dia.hoy { border-color: var(--lila-dark); background: var(--lila-soft); }
        .cal-dia.seleccionado { border-color: var(--blue-dark); background: var(--blue-soft); }
        .cal-dia.vacio { border: none; cursor: default; background: transparent; }
        .cal-num { font-size: 13px; font-weight: 600; color: var(--text); }
        .cal-dia.hoy .cal-num { color: var(--lila-dark); font-weight: 800; }
        .cal-dia.seleccionado .cal-num { color: var(--blue-dark); font-weight: 800; }
        .cal-badge { font-size: 10px; font-weight: 700; background: var(--blue-dark); color: white; border-radius: 100px; padding: 1px 5px; line-height: 1.5; }
        /* Worker color bar */
        .worker-bar { width: 4px; border-radius: 2px; align-self: stretch; flex-shrink: 0; min-height: 36px; }
        /* Slots */
        .slot-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--white); margin-bottom: 6px; }
        .slot-row.ocupado { background: rgba(184,216,248,0.08); border-color: rgba(184,216,248,0.4); }
        .slot-hora-label { font-size: 15px; font-weight: 800; color: var(--text); min-width: 50px; letter-spacing: -0.5px; }
        .slot-libre-label { font-size: 13px; color: var(--muted); font-weight: 500; font-style: italic; }
        .tab-btn { padding: 8px 18px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.15s; }
        .tab-btn.active { background: var(--blue-dark); color: white; border-color: var(--blue-dark); }
        /* Ocupación */
        .ocu-bar-wrap { height: 6px; border-radius: 3px; background: rgba(0,0,0,0.07); overflow: hidden; margin-top: 6px; }
        .ocu-bar { height: 100%; border-radius: 3px; transition: width 0.4s; }
        /* Huecos banner */
        .hueco-banner { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; background: rgba(184,216,248,0.12); border: 1px solid rgba(184,216,248,0.4); font-size: 13px; color: #1D4ED8; font-weight: 600; }
        /* Sugerencias */
        .sug-card { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(0,0,0,0.06); }
        .sug-icon { font-size: 20px; flex-shrink: 0; line-height: 1; }
        .sug-msg { font-size: 13px; font-weight: 600; line-height: 1.5; }
        /* Stats panel */
        .stat-hist-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 20px; margin-bottom: 14px; }
        .stat-hist-title { font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 14px; letter-spacing: -0.3px; }
        .stat-hist-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .stat-hist-row:last-child { border-bottom: none; padding-bottom: 0; }
        .stat-hist-ico { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .stat-hist-label { font-size: 12px; color: var(--muted); font-weight: 500; }
        .stat-hist-val { font-size: 15px; font-weight: 800; color: var(--text); text-transform: capitalize; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; } .hamburger { display: flex; }
          .main { margin-left: 0; } .topbar { padding: 12px 16px; } .content { padding: 16px; }
          .reserva-card { flex-wrap: wrap; }
          .reserva-actions { width: 100%; }
          .stats-row { gap: 8px; }
        }
      `}</style>

            <div className="page-header">
              <div>
                <h1>Reservas</h1>
                <p>Gestiona las citas de tu negocio</p>
              </div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                <button className={`tab-btn ${vista==='calendario'?'active':''}`} onClick={() => setVista('calendario')}>📅 Calendario</button>
                <button className={`tab-btn ${vista==='dia'?'active':''}`} onClick={() => setVista('dia')}>📋 Día</button>
                <button className={`tab-btn ${vista==='espera'?'active':''}`} onClick={() => setVista('espera')}>⏳ Espera</button>
                <button className={`tab-btn ${vista==='stats'?'active':''}`} onClick={() => setVista('stats')}>📊 Stats</button>
              </div>
            </div>

            {/* ── VISTA CALENDARIO ── */}
            {vista === 'calendario' && (
              <div className="cal-card">
                <div className="cal-nav">
                  <button className="nav-fecha" onClick={() => {
                    if (calMes === 0) { setCalMes(11); setCalAnio(y => y-1) } else setCalMes(m => m-1)
                  }}>‹</button>
                  <span className="cal-mes-label">{MESES[calMes]} {calAnio}</span>
                  <button className="nav-fecha" onClick={() => {
                    if (calMes === 11) { setCalMes(0); setCalAnio(y => y+1) } else setCalMes(m => m+1)
                  }}>›</button>
                </div>

                {/* Cabecera días semana */}
                <div className="cal-grid" style={{marginBottom:'4px'}}>
                  {DIAS_CAB.map(d => <div key={d} className="cal-cab">{d}</div>)}
                </div>

                {/* Días */}
                <div className="cal-grid">
                  {(() => {
                    const primerDia = new Date(calAnio, calMes, 1)
                    const diasEnMes = new Date(calAnio, calMes+1, 0).getDate()
                    let offset = primerDia.getDay() - 1
                    if (offset < 0) offset = 6
                    const celdas: (number|null)[] = [...Array(offset).fill(null), ...Array.from({length:diasEnMes},(_,i)=>i+1)]
                    while (celdas.length % 7 !== 0) celdas.push(null)
                    const hoy = hoyISO()
                    return celdas.map((dia, i) => {
                      if (!dia) return <div key={`v-${i}`} className="cal-dia vacio" />
                      const iso = `${calAnio}-${String(calMes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                      const count = reservasMes[iso] || 0
                      const esHoy = iso === hoy
                      const esSel = iso === fecha
                      return (
                        <button
                          key={iso}
                          className={`cal-dia ${esHoy?'hoy':''} ${esSel?'seleccionado':''}`}
                          onClick={() => seleccionarDia(iso)}
                        >
                          <span className="cal-num">{dia}</span>
                          {count > 0 && <span className="cal-badge">{count}</span>}
                        </button>
                      )
                    })
                  })()}
                </div>

                {/* Leyenda */}
                <div style={{display:'flex',gap:'16px',marginTop:'16px',paddingTop:'14px',borderTop:'1px solid var(--border)',fontSize:'12px',color:'var(--muted)'}}>
                  <span style={{display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'12px',height:'12px',borderRadius:'3px',background:'var(--lila-soft)',border:'1.5px solid var(--lila-dark)',display:'inline-block'}}/>Hoy</span>
                  <span style={{display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'12px',height:'12px',borderRadius:'3px',background:'var(--blue-soft)',border:'1.5px solid var(--blue-dark)',display:'inline-block'}}/>Seleccionado</span>
                  <span style={{display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'14px',height:'14px',borderRadius:'100px',background:'var(--blue-dark)',display:'inline-block'}}/>Reservas</span>
                </div>
              </div>
            )}

            {/* ── VISTA DÍA ── */}
            {vista === 'dia' && (
              <>
                {/* Navegación de fecha */}
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
                  <button className="nav-fecha" onClick={() => {
                    const d = new Date(fecha); d.setDate(d.getDate()-1); setFecha(dateToISO(d))
                  }}>‹</button>
                  <span style={{fontSize:'15px',fontWeight:700,color:'var(--text)',textTransform:'capitalize',flex:1}}>{formatFechaLabel(fecha)}</span>
                  <button className="nav-fecha" onClick={() => {
                    const d = new Date(fecha); d.setDate(d.getDate()+1); setFecha(dateToISO(d))
                  }}>›</button>
                  {fecha !== hoyISO() && (
                    <button className="nav-fecha" style={{width:'auto',padding:'0 12px',fontSize:'13px',fontWeight:600,fontFamily:'inherit'}} onClick={() => setFecha(hoyISO())}>Hoy</button>
                  )}
                </div>

                {/* Estadísticas del día */}
                <div className="stats-row" style={{marginBottom:'12px'}}>
                  <div className="stat-mini">
                    <div className="stat-mini-val">{reservas.length}</div>
                    <div className="stat-mini-label">Total reservas</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-val" style={{color:'#1D4ED8'}}>{confirmadas}</div>
                    <div className="stat-mini-label">Confirmadas</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-val" style={{color:'#2E8A5E'}}>{completadas}</div>
                    <div className="stat-mini-label">Completadas</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-val" style={{color: ocupacionPct >= 80 ? '#2E8A5E' : ocupacionPct >= 50 ? '#D97706' : '#9CA3AF'}}>
                      {slots.length > 0 ? `${ocupacionPct}%` : '—'}
                    </div>
                    <div className="stat-mini-label">Ocupación</div>
                    {slots.length > 0 && (
                      <div className="ocu-bar-wrap">
                        <div className="ocu-bar" style={{
                          width: `${ocupacionPct}%`,
                          background: ocupacionPct >= 80 ? '#2E8A5E' : ocupacionPct >= 50 ? '#F59E0B' : '#CBD5E1'
                        }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner huecos entre citas */}
                {huecosEntreCitas > 0 && (
                  <div className="hueco-banner" style={{marginBottom:'12px'}}>
                    <span style={{fontSize:'20px'}}>🕐</span>
                    <span>
                      Tienes <strong>{huecosEntreCitas} hueco{huecosEntreCitas > 1 ? 's' : ''} libre{huecosEntreCitas > 1 ? 's' : ''}</strong> de más de 30 min hoy —{' '}
                      <a href={negocio?.id ? `/negocio/${negocio.id}/reservar` : '#'} target="_blank" rel="noreferrer" style={{color:'#1D4ED8',textDecoration:'underline'}}>comparte tu enlace de reserva</a>
                    </span>
                  </div>
                )}

                {/* Sugerencias del día */}
                {sugerencias.length > 0 && (
                  <div style={{marginBottom:'16px'}}>
                    {sugerencias.map((s, i) => (
                      <div key={i} className="sug-card" style={{background: s.bg, borderColor: `${s.color}30`}}>
                        <span className="sug-icon">{s.icon}</span>
                        <span className="sug-msg" style={{color: s.color}}>{s.msg}</span>
                      </div>
                    ))}
                  </div>
                )}

                {cargando ? (
                  <div style={{textAlign:'center',padding:'40px',color:'var(--muted)',fontSize:'14px'}}>Cargando...</div>
                ) : slots.length === 0 && reservas.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <div className="empty-state-title">Sin horario este día</div>
                    <div style={{fontSize:'13px'}}>El negocio no tiene horario configurado para este día</div>
                  </div>
                ) : slots.length > 0 ? (
                  /* Vista con slots (horarios configurados) */
                  <div>
                    {slots.map(({ hora, reserva: r }) => {
                      if (!r) {
                        return (
                          <div key={hora} className="slot-row">
                            <span className="slot-hora-label">{hora}</span>
                            <span className="slot-libre-label">Libre</span>
                          </div>
                        )
                      }
                      const cfg = estadoConfig[r.estado] || estadoConfig.confirmada
                      return (
                        <div key={hora} className="slot-row ocupado">
                          {r.trabajador_id && <div className="worker-bar" style={{background: colorMap[r.trabajador_id] || '#CBD5E1'}} />}
                          <span className="slot-hora-label">{hora}</span>
                          <div className="reserva-info">
                            <div className="reserva-cliente" style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                              {r.cliente_nombre}
                              {badgeRiesgo(r.cliente_telefono)}
                            </div>
                            <div className="reserva-detalle">
                              {r.servicios?.nombre && <span>🔧 {r.servicios.nombre}</span>}
                              {r.trabajadores?.nombre && <span>👤 {r.trabajadores.nombre}</span>}
                              {r.cliente_telefono && <span>📞 {r.cliente_telefono}</span>}
                              {r.estado === 'completada' && r.puntos_ganados ? <span style={{color:'#92400E',fontWeight:700}}>⭐ +{r.puntos_ganados} pts</span> : null}
                            </div>
                          </div>
                          <span className="reserva-estado" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                          <div className="reserva-actions">
                            {r.estado === 'confirmada' && (
                              <>
                                <button className="btn-completar" disabled={actualizando===r.id} onClick={() => cambiarEstado(r.id,'completada')}>✓ Completada</button>
                                <button className="btn-cancelar" disabled={actualizando===r.id} onClick={() => cambiarEstado(r.id,'cancelada')}>Cancelar</button>
                              </>
                            )}
                            {(r.estado === 'cancelada' || r.estado === 'completada') && (
                              <button className="btn-restaurar" disabled={actualizando===r.id} onClick={() => cambiarEstado(r.id,'confirmada')}>Restaurar</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Sin horarios → lista simple de reservas */
                  reservas.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📅</div>
                      <div className="empty-state-title">Sin reservas este día</div>
                    </div>
                  ) : (
                    <div className="reservas-lista">
                      {reservas.map(r => {
                        const cfg = estadoConfig[r.estado] || estadoConfig.confirmada
                        return (
                          <div key={r.id} className="reserva-card" style={r.trabajador_id ? {borderLeft: `4px solid ${colorMap[r.trabajador_id] || '#CBD5E1'}`} : {}}>
                            <div className="reserva-hora">{r.hora?.slice(0,5)}</div>
                            <div className="reserva-info">
                              <div className="reserva-cliente" style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                                {r.cliente_nombre}
                                {badgeRiesgo(r.cliente_telefono)}
                              </div>
                              <div className="reserva-detalle">
                                {r.servicios?.nombre && <span>🔧 {r.servicios.nombre}</span>}
                                {r.trabajadores?.nombre && <span>👤 {r.trabajadores.nombre}</span>}
                                {r.cliente_telefono && <span>📞 {r.cliente_telefono}</span>}
                                {r.estado === 'completada' && r.puntos_ganados ? <span style={{color:'#92400E',fontWeight:700}}>⭐ +{r.puntos_ganados} pts</span> : null}
                              </div>
                            </div>
                            <span className="reserva-estado" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                            <div className="reserva-actions">
                              {r.estado === 'confirmada' && (
                                <>
                                  <button className="btn-completar" disabled={actualizando===r.id} onClick={() => cambiarEstado(r.id,'completada')}>✓ Completada</button>
                                  <button className="btn-cancelar" disabled={actualizando===r.id} onClick={() => cambiarEstado(r.id,'cancelada')}>Cancelar</button>
                                </>
                              )}
                              {(r.estado === 'cancelada' || r.estado === 'completada') && (
                                <button className="btn-restaurar" disabled={actualizando===r.id} onClick={() => cambiarEstado(r.id,'confirmada')}>Restaurar</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                )}
              </>
            )}

            {/* ── VISTA ESTADÍSTICAS ── */}
            {vista === 'stats' && (
              <>
                {/* Históricos */}
                <div className="stat-hist-card">
                  <div className="stat-hist-title">📈 Estadísticas históricas (últimos 6 meses)</div>
                  <div className="stat-hist-row">
                    <div className="stat-hist-ico" style={{background:'#EEF2FF'}}>⏰</div>
                    <div>
                      <div className="stat-hist-label">Hora punta</div>
                      <div className="stat-hist-val">{statsHistoricos.horaPunta || '—'}</div>
                    </div>
                  </div>
                  <div className="stat-hist-row">
                    <div className="stat-hist-ico" style={{background:'#F0FDF4'}}>📅</div>
                    <div>
                      <div className="stat-hist-label">Día más ocupado de la semana</div>
                      <div className="stat-hist-val">{statsHistoricos.diaPunta || '—'}</div>
                    </div>
                  </div>
                  <div className="stat-hist-row">
                    <div className="stat-hist-ico" style={{background:'#FFFBEB'}}>💶</div>
                    <div>
                      <div className="stat-hist-label">Mes con más ingresos</div>
                      <div className="stat-hist-val">{statsHistoricos.mesPunta || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Sugerencias globales */}
                <div className="stat-hist-card">
                  <div className="stat-hist-title">💡 Sugerencias inteligentes</div>
                  {cancelacionesSem >= 3 && (
                    <div className="sug-card" style={{background:'rgba(254,202,202,0.2)',borderColor:'rgba(220,38,38,0.2)'}}>
                      <span className="sug-icon">⚠️</span>
                      <span className="sug-msg" style={{color:'#DC2626'}}>
                        Alta tasa de cancelaciones esta semana ({cancelacionesSem}). Revisa tu política de cancelación en <a href="/dashboard/mi-negocio" style={{color:'#DC2626',textDecoration:'underline'}}>Mi negocio</a>.
                      </span>
                    </div>
                  )}
                  {serviciosSinReservar.map((srv, i) => (
                    <div key={i} className="sug-card" style={{background:'rgba(212,197,249,0.15)',borderColor:'rgba(107,79,216,0.2)'}}>
                      <span className="sug-icon">🔧</span>
                      <span className="sug-msg" style={{color:'#6B4FD8'}}>
                        El servicio <strong>"{srv}"</strong> lleva más de 30 días sin reservarse. Considera destacarlo o ajustar el precio.
                      </span>
                    </div>
                  ))}
                  {cancelacionesSem < 3 && serviciosSinReservar.length === 0 && (
                    <div style={{textAlign:'center',padding:'20px',color:'var(--muted)',fontSize:'13px'}}>
                      <div style={{fontSize:'32px',marginBottom:'8px'}}>✅</div>
                      Todo en orden. Sin alertas activas.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── VISTA LISTA DE ESPERA ── */}
            {vista === 'espera' && (
              <>
                <div style={{fontSize:'14px',color:'var(--text2)',marginBottom:'16px'}}>
                  Clientes apuntados a la lista de espera. Se les notifica automáticamente cuando se cancela una cita.
                </div>

                {cargandoEspera ? (
                  <div style={{textAlign:'center',padding:'40px',color:'var(--muted)',fontSize:'14px'}}>Cargando...</div>
                ) : listaEspera.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">⏳</div>
                    <div className="empty-state-title">Sin entradas en lista de espera</div>
                    <div style={{fontSize:'13px'}}>Cuando un horario esté completo, los clientes podrán apuntarse</div>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {listaEspera.map(e => (
                      <div key={e.id} className="reserva-card" style={{alignItems:'flex-start'}}>
                        <div style={{fontSize:'28px',lineHeight:1,flexShrink:0,marginTop:'2px'}}>⏳</div>
                        <div className="reserva-info">
                          <div className="reserva-cliente">{e.cliente_nombre}</div>
                          <div className="reserva-detalle">
                            {e.servicios?.nombre && <span>🔧 {e.servicios.nombre}</span>}
                            <span>📅 {new Date(e.fecha+'T00:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})}</span>
                            {e.cliente_telefono && <span>📞 {e.cliente_telefono}</span>}
                            {e.cliente_email && <span>✉️ {e.cliente_email}</span>}
                          </div>
                        </div>
                        <button
                          className="btn-cancelar"
                          onClick={async () => {
                            await supabase.from('lista_espera').delete().eq('id', e.id)
                            setListaEspera(prev => prev.filter(x => x.id !== e.id))
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
    </DashboardShell>
  )
}
