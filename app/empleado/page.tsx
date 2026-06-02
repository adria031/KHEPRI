'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

type Reserva = {
  id: string
  fecha: string
  hora: string
  cliente_nombre: string
  cliente_telefono: string | null
  estado: string
  servicios: { nombre: string; precio: number; duracion: number } | null
}

type Trabajador = {
  id: string
  nombre: string
  especialidad: string | null
  email: string | null
  negocio_id: string
  foto_url: string | null
  telefono?: string | null
}

type Servicio = {
  id: string
  nombre: string
  precio: number
  duracion: number
}

type Nomina = {
  id: string
  mes: number | null
  anio: number | null
  bruto: number | null
  neto: number | null
  irpf: number | null
  ss: number | null
  pdf_url: string | null
  created_at: string
}

type Bloqueo = {
  id: string
  trabajador_id: string
  negocio_id: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  motivo: string | null
  dia_completo: boolean
  created_at: string
}

type VistaCalendario = 'mes' | 'semana' | 'dia'

type ChartPoint = { mes: string; citas: number }
type TabActiva = 'agenda' | 'calendario' | 'estadisticas' | 'nominas' | 'perfil'

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const COLORES_ESTADO: Record<string, { bg: string; color: string; label: string; dot: string }> = {
  pendiente:  { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente',  dot: '#F59E0B' },
  confirmada: { bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmada', dot: '#3B82F6' },
  completada: { bg: '#D1FAE5', color: '#065F46', label: 'Completada', dot: '#10B981' },
  cancelada:  { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelada',  dot: '#EF4444' },
}

const CAL_START = 8 * 60   // 8:00 in minutes from midnight
const CAL_END   = 21 * 60  // 21:00
const HOUR_PX   = 52       // pixels per hour

function hoyISO() {
  return new Date().toISOString().split('T')[0]
}
function enXDias(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function formatFecha(f: string) {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}
function avatarIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}
function fmt(n: number | null) {
  if (n === null || n === undefined) return '—'
  return n.toFixed(2).replace('.', ',') + ' €'
}

// Calendar helpers
function getLunesISO(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function diasEnMes(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }

function primerDiaSemana(y: number, m: number) {
  return (new Date(y, m, 1).getDay() + 6) % 7 // 0=Lu
}

function isoToDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(iso: string, n: number): string {
  const d = isoToDate(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDiaSemana(iso: string) {
  return isoToDate(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
}

function blockStyle(hora: string, duracion: number, color: string, bgColor: string) {
  const [h, m] = hora.slice(0, 5).split(':').map(Number)
  const start = h * 60 + m
  const top = Math.max(0, (start - CAL_START) / 60 * HOUR_PX)
  const height = Math.max(22, duracion / 60 * HOUR_PX)
  return {
    position: 'absolute' as const,
    top,
    height,
    left: 2,
    right: 2,
    background: bgColor,
    border: `1.5px solid ${color}`,
    borderRadius: 8,
    overflow: 'hidden',
    padding: '3px 6px',
    cursor: 'pointer',
  }
}

function bloqueoStyle(b: Bloqueo) {
  if (b.dia_completo) {
    return {
      position: 'absolute' as const,
      top: 0,
      height: (CAL_END - CAL_START) / 60 * HOUR_PX,
      left: 2,
      right: 2,
      background: 'rgba(156,163,175,0.25)',
      border: '1.5px dashed #9CA3AF',
      borderRadius: 8,
      padding: '4px 6px',
      cursor: 'default',
    }
  }
  const [h, m] = (b.hora_inicio || '08:00').slice(0, 5).split(':').map(Number)
  const [eh, em] = (b.hora_fin || '21:00').slice(0, 5).split(':').map(Number)
  const start = h * 60 + m
  const end = eh * 60 + em
  const top = Math.max(0, (start - CAL_START) / 60 * HOUR_PX)
  const height = Math.max(22, (end - start) / 60 * HOUR_PX)
  return {
    position: 'absolute' as const,
    top,
    height,
    left: 2,
    right: 2,
    background: 'rgba(156,163,175,0.2)',
    border: '1.5px dashed #9CA3AF',
    borderRadius: 8,
    padding: '3px 6px',
    cursor: 'default',
  }
}

export default function EmpleadoPage() {
  const [cargando,         setCargando]         = useState(true)
  const [trabajador,       setTrabajador]       = useState<Trabajador | null>(null)
  const [nombreNegocio,    setNombreNegocio]    = useState<string | null>(null)
  const [userEmail,        setUserEmail]        = useState('')
  const [reservasHoy,      setReservasHoy]      = useState<Reserva[]>([])
  const [reservasProximas, setReservasProximas] = useState<Reserva[]>([])
  const [actualizando,     setActualizando]     = useState<string | null>(null)
  const [tabActiva,        setTabActiva]        = useState<TabActiva>('agenda')
  const [notifBadge,       setNotifBadge]       = useState(0)

  // Estadísticas
  const [totalMes,         setTotalMes]         = useState(0)
  const [completadasMes,   setComplestadasMes]  = useState(0)
  const [servicioTop,      setServicioTop]      = useState('—')
  const [clientesUnicos,   setClientesUnicos]   = useState(0)
  const [chartData,        setChartData]        = useState<ChartPoint[]>([])
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [chartW, setChartW] = useState(0)

  // Nóminas
  const [nominas,          setNominas]          = useState<Nomina[]>([])

  // Servicios para nueva reserva
  const [servicios,        setServicios]        = useState<Servicio[]>([])

  // Modal nueva reserva
  const [showModal,        setShowModal]        = useState(false)
  const [nrServicioId,     setNrServicioId]     = useState('')
  const [nrCliente,        setNrCliente]        = useState('')
  const [nrTelefono,       setNrTelefono]       = useState('')
  const [nrFecha,          setNrFecha]          = useState(hoyISO())
  const [nrHora,           setNrHora]           = useState('10:00')
  const [guardandoNR,      setGuardandoNR]      = useState(false)
  const [errorNR,          setErrorNR]          = useState('')

  // Perfil editable
  const [pfNombre,         setPfNombre]         = useState('')
  const [pfTelefono,       setPfTelefono]       = useState('')
  const [pfPass1,          setPfPass1]          = useState('')
  const [pfPass2,          setPfPass2]          = useState('')
  const [guardandoPf,      setGuardandoPf]      = useState(false)
  const [msgPf,            setMsgPf]            = useState('')

  // Calendar
  const [vistaCalendario, setVistaCalendario] = useState<VistaCalendario>('mes')
  const [calMes,     setCalMes]     = useState(new Date().getMonth())
  const [calAnio,    setCalAnio]    = useState(new Date().getFullYear())
  const [semanaInicio, setSemanaInicio] = useState(() => getLunesISO(new Date()))
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)
  const [reservasCalendario, setReservasCalendario] = useState<Reserva[]>([])
  const [bloqueos,   setBloqueos]   = useState<Bloqueo[]>([])
  const [cargandoCal, setCargandoCal] = useState(false)

  // Modal bloqueo
  const [showBloqueo,       setShowBloqueo]       = useState(false)
  const [bloqueoFecha,      setBloqueoFecha]      = useState('')
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState('09:00')
  const [bloqueoHoraFin,    setBloqueoHoraFin]    = useState('18:00')
  const [bloqueoMotivo,     setBloqueoMotivo]     = useState('')
  const [bloqueoCompleto,   setBloqueoCompleto]   = useState(false)
  const [guardandoBloqueo,  setGuardandoBloqueo]  = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/auth'; return }

      const email = session.user.email ?? ''
      setUserEmail(email)

      const { data: trab } = await supabase
        .from('trabajadores')
        .select('id, nombre, especialidad, email, negocio_id, foto_url, telefono')
        .eq('email', email)
        .eq('activo', true)
        .limit(1)
        .maybeSingle()

      if (!trab) { window.location.href = '/auth'; return }
      setTrabajador(trab)
      setPfNombre(trab.nombre ?? '')
      setPfTelefono(trab.telefono ?? '')

      const { data: neg } = await supabase
        .from('negocios')
        .select('nombre')
        .eq('id', trab.negocio_id)
        .single()
      setNombreNegocio(neg?.nombre ?? null)

      const hoy       = hoyISO()
      const en7       = enXDias(7)
      const inicioMes = hoy.slice(0, 8) + '01'
      const hace6m    = new Date()
      hace6m.setMonth(hace6m.getMonth() - 5)
      hace6m.setDate(1)
      const hace6mISO = hace6m.toISOString().split('T')[0]

      const [
        { data: rHoy },
        { data: rProx },
        { data: rMes },
        { data: r6m },
        { data: svcData },
        { data: nominasData },
      ] = await Promise.all([
        supabase.from('reservas')
          .select('id, fecha, hora, cliente_nombre, cliente_telefono, estado, servicios(nombre, precio, duracion)')
          .eq('trabajador_id', trab.id)
          .eq('fecha', hoy)
          .neq('estado', 'cancelada')
          .order('hora'),
        supabase.from('reservas')
          .select('id, fecha, hora, cliente_nombre, cliente_telefono, estado, servicios(nombre, precio, duracion)')
          .eq('trabajador_id', trab.id)
          .gt('fecha', hoy)
          .lte('fecha', en7)
          .neq('estado', 'cancelada')
          .order('fecha').order('hora'),
        supabase.from('reservas')
          .select('id, estado, cliente_nombre, servicios(nombre)')
          .eq('trabajador_id', trab.id)
          .gte('fecha', inicioMes)
          .lte('fecha', hoy),
        supabase.from('reservas')
          .select('id, fecha, estado')
          .eq('trabajador_id', trab.id)
          .gte('fecha', hace6mISO)
          .lte('fecha', hoy),
        supabase.from('servicios')
          .select('id, nombre, precio, duracion')
          .eq('negocio_id', trab.negocio_id)
          .eq('activo', true)
          .order('nombre'),
        supabase.from('nominas')
          .select('id, mes, anio, bruto, neto, irpf, ss, pdf_url, created_at')
          .eq('trabajador_id', trab.id)
          .order('anio', { ascending: false })
          .order('mes', { ascending: false }),
      ])

      setReservasHoy((rHoy ?? []) as unknown as Reserva[])
      setReservasProximas((rProx ?? []) as unknown as Reserva[])
      setServicios((svcData ?? []) as Servicio[])
      setNominas((nominasData ?? []) as Nomina[])
      if (svcData && svcData.length > 0) setNrServicioId(svcData[0].id)

      if (rMes) {
        const completadas = rMes.filter(r => r.estado === 'completada').length
        const conteo: Record<string, number> = {}
        const clientes = new Set<string>()
        rMes.forEach(r => {
          const nom = (r.servicios as { nombre?: string } | null)?.nombre
          if (nom) conteo[nom] = (conteo[nom] ?? 0) + 1
          if (r.cliente_nombre) clientes.add(r.cliente_nombre.toLowerCase().trim())
        })
        const top = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
        setTotalMes(rMes.length)
        setComplestadasMes(completadas)
        setServicioTop(top)
        setClientesUnicos(clientes.size)
      }

      if (r6m) {
        const ahora = new Date()
        const puntos: ChartPoint[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
          const yy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const prefix = `${yy}-${mm}`
          const citas = r6m.filter(r => r.fecha.startsWith(prefix)).length
          puntos.push({ mes: MESES_ES[d.getMonth()], citas })
        }
        setChartData(puntos)
      }

      setCargando(false)
    })()
  }, [])

  // Chart width listener
  useEffect(() => {
    if (chartRef.current) setChartW(chartRef.current.offsetWidth)
  }, [chartData, tabActiva])

  // Supabase Realtime
  useEffect(() => {
    if (!trabajador?.id) return
    const channel = supabase
      .channel(`emp-reservas-${trabajador.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservas', filter: `trabajador_id=eq.${trabajador.id}` },
        (payload) => {
          setNotifBadge(prev => prev + 1)
          const nueva = payload.new as Reserva
          if (nueva?.fecha === hoyISO()) {
            setReservasHoy(prev =>
              [...prev, nueva].sort((a, b) => a.hora.localeCompare(b.hora))
            )
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [trabajador?.id])

  // Calendar data
  useEffect(() => {
    if (tabActiva !== 'calendario' || !trabajador) return
    setCargandoCal(true)
    const y = calAnio, m = calMes
    const inicio = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const fin = `${y}-${String(m + 1).padStart(2, '0')}-${String(diasEnMes(y, m)).padStart(2, '0')}`
    Promise.all([
      supabase.from('reservas')
        .select('id, fecha, hora, cliente_nombre, cliente_telefono, estado, servicios(nombre, precio, duracion)')
        .eq('trabajador_id', trabajador.id)
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('hora'),
      supabase.from('bloqueos_trabajador')
        .select('*')
        .eq('trabajador_id', trabajador.id)
        .gte('fecha', inicio)
        .lte('fecha', fin),
    ]).then(([{ data: rData }, { data: bData }]) => {
      setReservasCalendario((rData ?? []) as unknown as Reserva[])
      setBloqueos((bData ?? []) as Bloqueo[])
      setCargandoCal(false)
    })
  }, [tabActiva, calMes, calAnio, trabajador])

  async function completarReserva(id: string) {
    setActualizando(id)
    await supabase.from('reservas').update({ estado: 'completada' }).eq('id', id)
    setReservasHoy(prev => prev.map(r => r.id === id ? { ...r, estado: 'completada' } : r))
    setActualizando(null)
  }

  async function guardarNuevaReserva() {
    if (!trabajador) return
    if (!nrCliente.trim()) { setErrorNR('El nombre del cliente es obligatorio'); return }
    if (!nrFecha || !nrHora) { setErrorNR('Indica fecha y hora'); return }
    setGuardandoNR(true)
    setErrorNR('')
    const { error } = await supabase.from('reservas').insert({
      trabajador_id: trabajador.id,
      negocio_id: trabajador.negocio_id,
      servicio_id: nrServicioId || null,
      cliente_nombre: nrCliente.trim(),
      cliente_telefono: nrTelefono.trim() || null,
      fecha: nrFecha,
      hora: nrHora + ':00',
      estado: 'confirmada',
    })
    setGuardandoNR(false)
    if (error) { setErrorNR(error.message); return }
    setShowModal(false)
    setNrCliente('')
    setNrTelefono('')
    setNrFecha(hoyISO())
    setNrHora('10:00')
  }

  async function guardarPerfil() {
    if (!trabajador) return
    setGuardandoPf(true)
    setMsgPf('')
    if (pfPass1) {
      if (pfPass1 !== pfPass2) { setMsgPf('Las contraseñas no coinciden'); setGuardandoPf(false); return }
      if (pfPass1.length < 6) { setMsgPf('La contraseña debe tener al menos 6 caracteres'); setGuardandoPf(false); return }
    }
    await supabase.from('trabajadores').update({
      nombre: pfNombre.trim(),
      telefono: pfTelefono.trim() || null,
    }).eq('id', trabajador.id)
    if (pfPass1) {
      await supabase.auth.updateUser({ password: pfPass1 })
    }
    setTrabajador(prev => prev ? { ...prev, nombre: pfNombre.trim(), telefono: pfTelefono.trim() || null } : prev)
    setPfPass1('')
    setPfPass2('')
    setMsgPf('✓ Cambios guardados')
    setGuardandoPf(false)
  }

  async function guardarBloqueo() {
    if (!trabajador || !bloqueoFecha) return
    setGuardandoBloqueo(true)
    await supabase.from('bloqueos_trabajador').insert({
      trabajador_id: trabajador.id,
      negocio_id: trabajador.negocio_id,
      fecha: bloqueoFecha,
      hora_inicio: bloqueoCompleto ? null : bloqueoHoraInicio,
      hora_fin: bloqueoCompleto ? null : bloqueoHoraFin,
      motivo: bloqueoMotivo || null,
      dia_completo: bloqueoCompleto,
    })
    const { data } = await supabase.from('bloqueos_trabajador')
      .select('*').eq('trabajador_id', trabajador.id)
      .eq('fecha', bloqueoFecha)
    setBloqueos(prev => [
      ...prev.filter(b => b.fecha !== bloqueoFecha),
      ...(data as Bloqueo[] ?? []),
    ])
    setGuardandoBloqueo(false)
    setShowBloqueo(false)
    setBloqueoMotivo('')
    setBloqueoCompleto(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  const TABS: { id: TabActiva; label: string; icon: string }[] = [
    { id: 'agenda',       label: 'Agenda',      icon: '📅' },
    { id: 'calendario',   label: 'Calendario',  icon: '🗓' },
    { id: 'estadisticas', label: 'Stats',       icon: '📊' },
    { id: 'nominas',      label: 'Nóminas',     icon: '💶' },
    { id: 'perfil',       label: 'Perfil',      icon: '👤' },
  ]

  if (cargando) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F9FC', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:'40px', height:'40px', border:'3px solid #E5E7EB', borderTopColor:'#6366F1', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
          <p style={{ color:'#6B7280', fontSize:'14px' }}>Cargando agenda…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  const hoyLabel = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
  const hoy = hoyISO()

  // Build week days array for semana view
  const semanasDias = Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i))

  // Hours for timeline
  const timelineHours = Array.from({ length: (CAL_END - CAL_START) / 60 }, (_, i) => 8 + i)

  return (
    <div style={{ minHeight:'100vh', background:'#F7F9FC', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing:border-box; }
        .emp-page { max-width:860px; margin:0 auto; padding:0 24px 80px; display:flex; flex-direction:column; gap:18px; }
        .emp-card { background:white; border-radius:20px; border:1px solid rgba(0,0,0,0.06); padding:22px; }
        .emp-card-title { font-size:15px; font-weight:700; color:#111827; margin-bottom:14px; letter-spacing:-0.2px; }
        .tl-wrap { position:relative; padding-left:4px; }
        .tl-line { position:absolute; left:22px; top:18px; bottom:18px; width:2px; background:linear-gradient(to bottom,rgba(99,102,241,0.2),rgba(99,102,241,0.05)); border-radius:2px; }
        .tl-row { display:flex; gap:0; margin-bottom:10px; }
        .tl-row:last-child { margin-bottom:0; }
        .tl-left { width:46px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:3px; padding-top:3px; }
        .tl-time { font-size:13px; font-weight:800; color:#111827; line-height:1; }
        .tl-dot { width:11px; height:11px; border-radius:50%; border:2px solid white; flex-shrink:0; position:relative; z-index:1; }
        .tl-card { flex:1; border-radius:14px; padding:12px 14px; border:1.5px solid; }
        .prox-row { display:flex; align-items:center; gap:12px; padding:11px 14px; background:#F9FAFB; border-radius:12px; border:1px solid rgba(0,0,0,0.05); margin-bottom:8px; }
        .prox-row:last-child { margin-bottom:0; }
        .tab-bar { display:flex; gap:4px; overflow-x:auto; padding:0; scrollbar-width:none; }
        .tab-bar::-webkit-scrollbar { display:none; }
        .tab-btn { flex:1; min-width:80px; padding:10px 12px; border-radius:12px; border:none; background:transparent; font-family:inherit; font-size:13px; font-weight:600; color:#6B7280; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; transition:background 0.15s; }
        .tab-btn:hover { background:rgba(99,102,241,0.06); }
        .tab-btn.active { background:white; color:#4F46E5; box-shadow:0 1px 6px rgba(0,0,0,0.08); }
        .tab-icon { font-size:16px; }
        .form-label { font-size:12px; font-weight:700; color:#374151; margin-bottom:5px; display:block; letter-spacing:0.2px; }
        .form-input { width:100%; padding:11px 14px; border:1.5px solid #E5E7EB; border-radius:12px; font-size:14px; font-family:inherit; color:#111827; outline:none; background:white; transition:border-color 0.15s; }
        .form-input:focus { border-color:#6366F1; }
        .form-select { width:100%; padding:11px 14px; border:1.5px solid #E5E7EB; border-radius:12px; font-size:14px; font-family:inherit; color:#111827; outline:none; background:white; cursor:pointer; }
        .stat-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:100; display:flex; align-items:center; justify-content:center; padding:16px; }
        .modal { background:white; border-radius:24px; padding:28px; width:100%; max-width:440px; max-height:90vh; overflow-y:auto; }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; }
        .cal-cell { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; padding:4px 2px; cursor:pointer; border-radius:10px; transition:background 0.1s; position:relative; }
        .cal-cell:hover { background:rgba(99,102,241,0.06); }
        .cal-cell.hoy .cal-num { background:#4F46E5; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; }
        .cal-cell.otro-mes { opacity:0.3; }
        .cal-cell.seleccionado { background:rgba(99,102,241,0.1); }
        .cal-num { font-size:14px; font-weight:600; color:#111827; line-height:1; margin-bottom:3px; }
        .cal-dots { display:flex; gap:2px; flex-wrap:wrap; justify-content:center; }
        .cal-dot { width:5px; height:5px; border-radius:50%; }
        .vista-btn { padding:7px 14px; border-radius:9px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; }
        .vista-btn.active { background:rgba(99,102,241,0.08); border-color:rgba(99,102,241,0.3); color:#4F46E5; }
        .cal-nav-btn { padding:6px 10px; border-radius:8px; border:1.5px solid #E5E7EB; background:white; cursor:pointer; font-size:14px; color:#374151; font-family:inherit; }
        .timeline-wrap { position:relative; display:flex; }
        .timeline-hours { width:36px; flex-shrink:0; }
        .timeline-hour-label { height:52px; display:flex; align-items:flex-start; padding-top:2px; font-size:10px; color:#9CA3AF; font-weight:500; }
        .timeline-cols { flex:1; position:relative; overflow-x:auto; }
        .timeline-col-grid { display:grid; min-width:0; }
        .timeline-col { position:relative; border-left:1px solid rgba(0,0,0,0.04); }
        .timeline-hline { position:absolute; left:0; right:0; height:1px; background:rgba(0,0,0,0.05); }
        @media(max-width:640px){
          .emp-page { padding:0 16px 80px; gap:14px; }
          .stat-grid { grid-template-columns:repeat(2,1fr); }
          .emp-card { padding:16px; border-radius:16px; }
          .nav-negocio { display:none !important; }
          .tab-btn { min-width:60px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <div style={{ background:'white', borderBottom:'1px solid rgba(0,0,0,0.06)', padding:'0 24px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ maxWidth:'860px', margin:'0 auto', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="17" height="17" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontWeight:800, fontSize:'15px', letterSpacing:'-0.5px', color:'#111827' }}>Khepria</span>
            <span style={{ background:'#F3F4F6', color:'#6B7280', fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'6px' }}>Empleado</span>
            {nombreNegocio && (
              <span className="nav-negocio" style={{ fontSize:'13px', color:'#6B7280' }}>· {nombreNegocio}</span>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {notifBadge > 0 && (
              <button
                onClick={() => { setNotifBadge(0); setTabActiva('agenda') }}
                style={{ position:'relative', width:'36px', height:'36px', borderRadius:'10px', background:'#EEF2FF', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}
              >
                🔔
                <span style={{ position:'absolute', top:'-4px', right:'-4px', minWidth:'18px', height:'18px', background:'#EF4444', color:'white', borderRadius:'9px', fontSize:'10px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', border:'2px solid white' }}>
                  {notifBadge}
                </span>
              </button>
            )}
            <button onClick={cerrarSesion} style={{ padding:'8px 16px', background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.15)', borderRadius:'10px', fontSize:'13px', fontWeight:700, color:'#DC2626', cursor:'pointer', fontFamily:'inherit' }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="emp-page" style={{ paddingTop:'20px' }}>

        {/* ── BIENVENIDA ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:800, color:'#111827', letterSpacing:'-0.5px', marginBottom:'3px' }}>
              Hola, {trabajador?.nombre?.split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize:'13px', color:'#6B7280' }}>{hoyLabel}{trabajador?.especialidad && ` · ${trabajador.especialidad}`}</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
            <button
              onClick={() => { setShowModal(true); setErrorNR('') }}
              style={{ padding:'9px 16px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'white', border:'none', borderRadius:'12px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
            >
              + Nueva reserva
            </button>
            <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:800, color:'#1E3A5F', overflow:'hidden' }}>
              {trabajador?.foto_url
                ? <img src={trabajador.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : avatarIniciales(trabajador?.nombre ?? '?')
              }
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ background:'#F3F4F6', borderRadius:'16px', padding:'6px' }}>
          <div className="tab-bar">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab-btn${tabActiva === t.id ? ' active' : ''}`}
                onClick={() => setTabActiva(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════ TAB: AGENDA ══════════════ */}
        {tabActiva === 'agenda' && (
          <>
            {/* Agenda hoy */}
            <div className="emp-card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                <h2 className="emp-card-title" style={{ margin:0 }}>
                  Agenda de hoy
                  <span style={{ fontWeight:500, color:'#9CA3AF', marginLeft:'6px', fontSize:'13px' }}>
                    {reservasHoy.length} cita{reservasHoy.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                <span style={{ fontSize:'12px', fontWeight:600, color:'#6B7280', background:'#F3F4F6', padding:'4px 10px', borderRadius:'8px' }}>
                  {new Date().toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
                </span>
              </div>
              {reservasHoy.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'#9CA3AF' }}>
                  <div style={{ fontSize:'36px', marginBottom:'8px' }}>🎉</div>
                  <p style={{ fontSize:'14px', fontWeight:600, color:'#374151' }}>Sin citas hoy</p>
                  <p style={{ fontSize:'13px', marginTop:'4px' }}>¡Disfruta el día libre!</p>
                </div>
              ) : (
                <div className="tl-wrap">
                  {reservasHoy.length > 1 && <div className="tl-line"/>}
                  {reservasHoy.map(r => {
                    const est = COLORES_ESTADO[r.estado] ?? COLORES_ESTADO.pendiente
                    const completada = r.estado === 'completada'
                    const svc = r.servicios as { nombre?: string; duracion?: number; precio?: number } | null
                    return (
                      <div key={r.id} className="tl-row">
                        <div className="tl-left">
                          <span className="tl-time" style={{ color: completada ? '#9CA3AF' : '#111827' }}>{r.hora?.slice(0, 5)}</span>
                          <div className="tl-dot" style={{ background: est.dot, boxShadow:`0 0 0 3px ${est.dot}22` }}/>
                          {svc?.duracion && <span style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:500 }}>{svc.duracion}m</span>}
                        </div>
                        <div className="tl-card" style={{ background: completada ? '#F9FAFB' : 'white', borderColor: completada ? 'rgba(0,0,0,0.05)' : `${est.dot}30`, opacity: completada ? 0.75 : 1 }}>
                          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px' }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'3px' }}>{r.cliente_nombre}</p>
                              <p style={{ fontSize:'12px', color:'#6B7280', marginBottom:'6px' }}>
                                {svc?.nombre ?? 'Servicio'}
                                {r.cliente_telefono && ` · ${r.cliente_telefono}`}
                                {svc?.precio ? ` · ${svc.precio}€` : ''}
                              </p>
                              <span style={{ display:'inline-flex', background:est.bg, color:est.color, fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'6px' }}>{est.label}</span>
                            </div>
                            {r.estado !== 'completada' && r.estado !== 'cancelada' && (
                              <button
                                onClick={() => completarReserva(r.id)}
                                disabled={actualizando === r.id}
                                style={{ padding:'7px 12px', background:'#D1FAE5', color:'#065F46', border:'none', borderRadius:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}
                              >
                                {actualizando === r.id ? '…' : '✓ Hecho'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Próximos 7 días */}
            {reservasProximas.length > 0 && (
              <div className="emp-card">
                <h2 className="emp-card-title">Próximos 7 días
                  <span style={{ fontWeight:500, color:'#9CA3AF', marginLeft:'6px', fontSize:'13px' }}>
                    {reservasProximas.length} cita{reservasProximas.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                {reservasProximas.map(r => {
                  const est = COLORES_ESTADO[r.estado] ?? COLORES_ESTADO.pendiente
                  const svc = r.servicios as { nombre?: string } | null
                  return (
                    <div key={r.id} className="prox-row">
                      <div style={{ minWidth:'72px' }}>
                        <p style={{ fontSize:'11px', fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.3px' }}>{formatFecha(r.fecha)}</p>
                        <p style={{ fontSize:'14px', fontWeight:800, color:'#111827' }}>{r.hora?.slice(0, 5)}</p>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{r.cliente_nombre}</p>
                        <p style={{ fontSize:'12px', color:'#6B7280', marginTop:'1px' }}>{svc?.nombre ?? 'Servicio'}</p>
                      </div>
                      <span style={{ background:est.bg, color:est.color, fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'6px', flexShrink:0 }}>{est.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════ TAB: CALENDARIO ══════════════ */}
        {tabActiva === 'calendario' && (
          <div className="emp-card">
            {/* ── VISTA MES ── */}
            {vistaCalendario === 'mes' && (
              <>
                {/* Header mes */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', gap:'8px', flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <button
                      className="cal-nav-btn"
                      onClick={() => {
                        if (calMes === 0) { setCalMes(11); setCalAnio(y => y - 1) }
                        else setCalMes(m => m - 1)
                      }}
                    >‹</button>
                    <span style={{ fontSize:'16px', fontWeight:800, color:'#111827', minWidth:'140px', textAlign:'center' }}>
                      {MESES_LARGO[calMes]} {calAnio}
                    </span>
                    <button
                      className="cal-nav-btn"
                      onClick={() => {
                        if (calMes === 11) { setCalMes(0); setCalAnio(y => y + 1) }
                        else setCalMes(m => m + 1)
                      }}
                    >›</button>
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button className="vista-btn active">Mes</button>
                    <button className="vista-btn" onClick={() => setVistaCalendario('semana')}>Semana</button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="cal-grid" style={{ marginBottom:'4px' }}>
                  {['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d => (
                    <div key={d} style={{ textAlign:'center', fontSize:'11px', fontWeight:700, color:'#9CA3AF', padding:'4px 0', letterSpacing:'0.3px' }}>{d}</div>
                  ))}
                </div>

                {cargandoCal ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF', fontSize:'14px' }}>Cargando…</div>
                ) : (
                  (() => {
                    const totalDias = diasEnMes(calAnio, calMes)
                    const firstDay = primerDiaSemana(calAnio, calMes)
                    const prevDias = diasEnMes(calAnio, calMes === 0 ? 11 : calMes - 1)
                    const cells: { iso: string; esEsteMes: boolean; day: number }[] = []

                    // Prev month padding
                    for (let i = firstDay - 1; i >= 0; i--) {
                      const d = prevDias - i
                      const m = calMes === 0 ? 11 : calMes - 1
                      const y = calMes === 0 ? calAnio - 1 : calAnio
                      cells.push({ iso: `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, esEsteMes: false, day: d })
                    }
                    // This month
                    for (let d = 1; d <= totalDias; d++) {
                      cells.push({ iso: `${calAnio}-${String(calMes + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, esEsteMes: true, day: d })
                    }
                    // Next month padding
                    const remaining = 7 - (cells.length % 7)
                    if (remaining < 7) {
                      for (let d = 1; d <= remaining; d++) {
                        const m = calMes === 11 ? 0 : calMes + 1
                        const y = calMes === 11 ? calAnio + 1 : calAnio
                        cells.push({ iso: `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, esEsteMes: false, day: d })
                      }
                    }

                    return (
                      <div className="cal-grid">
                        {cells.map(({ iso, esEsteMes, day }) => {
                          const rsv = reservasCalendario.filter(r => r.fecha === iso)
                          const blq = bloqueos.filter(b => b.fecha === iso)
                          const tieneConfirmada = rsv.some(r => r.estado === 'confirmada' || r.estado === 'completada')
                          const tieneCancelada = rsv.some(r => r.estado === 'cancelada')
                          const tieneBloqueo = blq.length > 0
                          const esHoy = iso === hoy
                          const seleccionado = iso === diaSeleccionado

                          return (
                            <div
                              key={iso}
                              className={`cal-cell${esHoy ? ' hoy' : ''}${!esEsteMes ? ' otro-mes' : ''}${seleccionado ? ' seleccionado' : ''}`}
                              onClick={() => { setDiaSeleccionado(iso); setVistaCalendario('dia') }}
                            >
                              <div className="cal-num">{day}</div>
                              <div className="cal-dots">
                                {tieneConfirmada && <div className="cal-dot" style={{ background:'#10B981' }}/>}
                                {tieneCancelada && <div className="cal-dot" style={{ background:'#EF4444' }}/>}
                                {tieneBloqueo && <div className="cal-dot" style={{ background:'#9CA3AF' }}/>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()
                )}

                {/* Legend */}
                <div style={{ display:'flex', gap:'14px', marginTop:'16px', flexWrap:'wrap' }}>
                  {[
                    { color:'#10B981', label:'Citas' },
                    { color:'#EF4444', label:'Canceladas' },
                    { color:'#9CA3AF', label:'Bloqueado' },
                  ].map(l => (
                    <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:l.color }}/>
                      <span style={{ fontSize:'11px', color:'#6B7280', fontWeight:500 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── VISTA SEMANA ── */}
            {vistaCalendario === 'semana' && (
              <>
                {/* Header semana */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', gap:'8px', flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <button className="cal-nav-btn" onClick={() => setSemanaInicio(prev => addDays(prev, -7))}>‹</button>
                    <span style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>
                      {formatDiaSemana(semanaInicio)} – {formatDiaSemana(addDays(semanaInicio, 6))}
                    </span>
                    <button className="cal-nav-btn" onClick={() => setSemanaInicio(prev => addDays(prev, 7))}>›</button>
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button className="vista-btn" onClick={() => setVistaCalendario('mes')}>Mes</button>
                    <button className="vista-btn active">Semana</button>
                  </div>
                </div>

                {/* Day headers */}
                <div style={{ display:'flex', marginBottom:'6px' }}>
                  <div style={{ width:'36px', flexShrink:0 }}/>
                  <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:0 }}>
                    {semanasDias.map(iso => {
                      const esHoy = iso === hoy
                      return (
                        <div key={iso} style={{ textAlign:'center', padding:'4px 2px' }}>
                          <div style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:600, textTransform:'uppercase' }}>
                            {isoToDate(iso).toLocaleDateString('es-ES', { weekday:'short' })}
                          </div>
                          <div style={{
                            fontSize:'15px', fontWeight:800,
                            color: esHoy ? 'white' : '#111827',
                            background: esHoy ? '#4F46E5' : 'transparent',
                            borderRadius:'50%', width:'28px', height:'28px',
                            display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0',
                          }}>
                            {isoToDate(iso).getDate()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {cargandoCal ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF', fontSize:'14px' }}>Cargando…</div>
                ) : (
                  <div className="timeline-wrap" style={{ overflowX:'auto' }}>
                    {/* Hour labels */}
                    <div className="timeline-hours">
                      {timelineHours.map(h => (
                        <div key={h} className="timeline-hour-label">{h}</div>
                      ))}
                    </div>
                    {/* Columns */}
                    <div style={{ flex:1, position:'relative', minWidth:'420px' }}>
                      {/* Hour lines */}
                      {timelineHours.map((h, i) => (
                        <div
                          key={h}
                          className="timeline-hline"
                          style={{ top: i * HOUR_PX }}
                        />
                      ))}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', height:`${timelineHours.length * HOUR_PX}px` }}>
                        {semanasDias.map(iso => {
                          const dayReservas = reservasCalendario.filter(r => r.fecha === iso)
                          const dayBloqueos = bloqueos.filter(b => b.fecha === iso)
                          return (
                            <div key={iso} className="timeline-col" style={{ height:'100%', position:'relative' }}>
                              {dayBloqueos.map(b => (
                                <div key={b.id} style={bloqueoStyle(b)}>
                                  <span style={{ fontSize:'9px', color:'#6B7280', fontWeight:600 }}>
                                    {b.motivo ?? 'Bloqueado'}
                                  </span>
                                </div>
                              ))}
                              {dayReservas.map(r => {
                                const svc = r.servicios as { nombre?: string; duracion?: number } | null
                                const dur = svc?.duracion ?? 30
                                const est = COLORES_ESTADO[r.estado] ?? COLORES_ESTADO.pendiente
                                return (
                                  <div
                                    key={r.id}
                                    style={blockStyle(r.hora, dur, est.dot, est.bg)}
                                    onClick={() => { setDiaSeleccionado(iso); setVistaCalendario('dia') }}
                                  >
                                    <div style={{ fontSize:'9px', fontWeight:700, color:est.color, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                      {r.hora.slice(0,5)} {r.cliente_nombre}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── VISTA DÍA ── */}
            {vistaCalendario === 'dia' && (
              <>
                {/* Header día */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', gap:'8px', flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <button
                      className="cal-nav-btn"
                      onClick={() => setVistaCalendario('mes')}
                      style={{ fontSize:'13px', fontWeight:700 }}
                    >
                      ← Mes
                    </button>
                    <span style={{ fontSize:'16px', fontWeight:800, color:'#111827' }}>
                      {diaSeleccionado
                        ? isoToDate(diaSeleccionado).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
                        : '—'
                      }
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button
                      onClick={() => {
                        setBloqueoFecha(diaSeleccionado ?? hoy)
                        setShowBloqueo(true)
                      }}
                      style={{ padding:'7px 12px', background:'#F3F4F6', border:'1.5px solid #E5E7EB', borderRadius:'10px', fontSize:'12px', fontWeight:700, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}
                    >
                      🚫 Bloquear horario
                    </button>
                    <button
                      onClick={() => {
                        setNrFecha(diaSeleccionado ?? hoy)
                        setShowModal(true)
                        setErrorNR('')
                      }}
                      style={{ padding:'7px 12px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'white', border:'none', borderRadius:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                    >
                      + Nueva reserva
                    </button>
                  </div>
                </div>

                {cargandoCal ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF', fontSize:'14px' }}>Cargando…</div>
                ) : (
                  (() => {
                    const isoDay = diaSeleccionado ?? hoy
                    const dayReservas = reservasCalendario.filter(r => r.fecha === isoDay).sort((a, b) => a.hora.localeCompare(b.hora))
                    const dayBloqueos = bloqueos.filter(b => b.fecha === isoDay)

                    return (
                      <div className="timeline-wrap">
                        {/* Hour labels */}
                        <div className="timeline-hours">
                          {timelineHours.map(h => (
                            <div key={h} className="timeline-hour-label">{h}</div>
                          ))}
                        </div>
                        {/* Single column */}
                        <div style={{ flex:1, position:'relative', height:`${timelineHours.length * HOUR_PX}px` }}>
                          {/* Hour lines */}
                          {timelineHours.map((h, i) => (
                            <div
                              key={h}
                              className="timeline-hline"
                              style={{ top: i * HOUR_PX }}
                            />
                          ))}
                          {/* Bloqueos */}
                          {dayBloqueos.map(b => (
                            <div key={b.id} style={{ ...bloqueoStyle(b), left:4, right:4 }}>
                              <div style={{ fontSize:'11px', fontWeight:700, color:'#6B7280' }}>
                                🚫 {b.dia_completo ? 'Día bloqueado' : `${b.hora_inicio?.slice(0,5) ?? ''} – ${b.hora_fin?.slice(0,5) ?? ''}`}
                              </div>
                              {b.motivo && (
                                <div style={{ fontSize:'10px', color:'#9CA3AF', marginTop:'2px' }}>{b.motivo}</div>
                              )}
                            </div>
                          ))}
                          {/* Reservas */}
                          {dayReservas.map(r => {
                            const svc = r.servicios as { nombre?: string; duracion?: number; precio?: number } | null
                            const dur = svc?.duracion ?? 30
                            const est = COLORES_ESTADO[r.estado] ?? COLORES_ESTADO.pendiente
                            return (
                              <div key={r.id} style={{ ...blockStyle(r.hora, dur, est.dot, est.bg), left:4, right:4 }}>
                                <div style={{ fontSize:'12px', fontWeight:800, color:est.color, marginBottom:'2px' }}>
                                  {r.hora.slice(0,5)} · {r.cliente_nombre}
                                </div>
                                {svc?.nombre && (
                                  <div style={{ fontSize:'10px', color:est.color, opacity:0.75 }}>
                                    {svc.nombre}{svc.precio ? ` · ${svc.precio}€` : ''}{svc.duracion ? ` · ${svc.duracion}min` : ''}
                                  </div>
                                )}
                                <span style={{ display:'inline-flex', background:'rgba(255,255,255,0.5)', fontSize:'9px', fontWeight:700, padding:'1px 5px', borderRadius:'4px', marginTop:'2px', color:est.color }}>
                                  {est.label}
                                </span>
                              </div>
                            )
                          })}
                          {/* Empty state */}
                          {dayReservas.length === 0 && dayBloqueos.length === 0 && (
                            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', color:'#9CA3AF' }}>
                              <div style={{ fontSize:'28px', marginBottom:'6px' }}>📭</div>
                              <p style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Sin eventos este día</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════ TAB: ESTADÍSTICAS ══════════════ */}
        {tabActiva === 'estadisticas' && (
          <>
            <div className="stat-grid">
              {[
                { label:'Citas este mes',      value: totalMes,       bg:'#EFF6FF', color:'#1D4ED8', icon:'📅' },
                { label:'Completadas',         value: completadasMes, bg:'#F0FDF4', color:'#16A34A', icon:'✅' },
                { label:'Clientes únicos',     value: clientesUnicos, bg:'#FAF5FF', color:'#7C3AED', icon:'👥' },
                { label:'Servicio top',        value: servicioTop,    bg:'#FFFBEB', color:'#D97706', icon:'⭐', small: true },
              ].map((s, i) => (
                <div key={i} style={{ background:s.bg, borderRadius:'16px', padding:'16px 18px', border:'1px solid rgba(0,0,0,0.04)' }}>
                  <p style={{ fontSize:'11px', fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
                    <span>{s.icon}</span>{s.label}
                  </p>
                  <p style={{ fontSize:(s as { small?: boolean }).small ? '14px' : '26px', fontWeight:800, color:'#111827', lineHeight:1.2 }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="emp-card">
              <h2 className="emp-card-title">Citas últimos 6 meses</h2>
              <div ref={chartRef} style={{ width:'100%', height:'200px' }}>
                {chartW > 0 && chartData.length > 0 && (
                  <BarChart width={chartW} height={200} data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                    <XAxis dataKey="mes" tick={{ fontSize:12, fill:'#6B7280', fontFamily:'Plus Jakarta Sans' }} axisLine={false} tickLine={false}/>
                    <YAxis allowDecimals={false} tick={{ fontSize:11, fill:'#9CA3AF', fontFamily:'Plus Jakarta Sans' }} axisLine={false} tickLine={false}/>
                    <Tooltip
                      contentStyle={{ borderRadius:'10px', border:'none', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', fontSize:'13px', fontFamily:'Plus Jakarta Sans' }}
                      labelStyle={{ fontWeight:700, color:'#111827' }}
                      formatter={(v) => [`${v ?? 0}`, 'Citas']}
                    />
                    <Bar dataKey="citas" fill="#6366F1" radius={[6,6,0,0]}/>
                  </BarChart>
                )}
                {chartData.length === 0 && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#9CA3AF', fontSize:'14px' }}>
                    Sin datos suficientes
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════ TAB: NÓMINAS ══════════════ */}
        {tabActiva === 'nominas' && (
          <div className="emp-card">
            <h2 className="emp-card-title">Mis nóminas</h2>
            {nominas.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF' }}>
                <div style={{ fontSize:'40px', marginBottom:'10px' }}>💶</div>
                <p style={{ fontSize:'14px', fontWeight:600, color:'#374151' }}>Sin nóminas registradas</p>
                <p style={{ fontSize:'13px', marginTop:'4px' }}>Contacta con tu empleador</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {nominas.map(n => (
                  <div key={n.id} style={{ background:'#F9FAFB', borderRadius:'14px', padding:'16px', border:'1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                      <div>
                        <p style={{ fontSize:'15px', fontWeight:800, color:'#111827' }}>
                          {n.mes ? MESES_LARGO[n.mes - 1] : '—'} {n.anio ?? ''}
                        </p>
                        <p style={{ fontSize:'12px', color:'#9CA3AF', marginTop:'1px' }}>Nómina mensual</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:'18px', fontWeight:800, color:'#16A34A' }}>{fmt(n.neto)}</p>
                        <p style={{ fontSize:'11px', color:'#9CA3AF' }}>neto</p>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom: n.pdf_url ? '12px' : '0' }}>
                      {[
                        { label:'Bruto', value: fmt(n.bruto), color:'#374151' },
                        { label:'IRPF', value: fmt(n.irpf), color:'#DC2626' },
                        { label:'S.S.', value: fmt(n.ss), color:'#D97706' },
                      ].map((item, i) => (
                        <div key={i} style={{ background:'white', borderRadius:'10px', padding:'10px', border:'1px solid rgba(0,0,0,0.05)', textAlign:'center' }}>
                          <p style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'3px' }}>{item.label}</p>
                          <p style={{ fontSize:'13px', fontWeight:700, color:item.color }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {n.pdf_url && (
                      <a
                        href={n.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'10px', background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(124,58,237,0.08))', border:'1.5px solid rgba(99,102,241,0.2)', borderRadius:'10px', color:'#4F46E5', fontWeight:700, fontSize:'13px', textDecoration:'none' }}
                      >
                        📄 Descargar PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ TAB: PERFIL ══════════════ */}
        {tabActiva === 'perfil' && (
          <div className="emp-card">
            <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
              <div style={{ width:'60px', height:'60px', borderRadius:'16px', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:800, color:'#1E3A5F', flexShrink:0, overflow:'hidden' }}>
                {trabajador?.foto_url
                  ? <img src={trabajador.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : avatarIniciales(trabajador?.nombre ?? '?')
                }
              </div>
              <div>
                <p style={{ fontSize:'17px', fontWeight:800, color:'#111827', letterSpacing:'-0.3px' }}>{trabajador?.nombre}</p>
                {trabajador?.especialidad && <p style={{ fontSize:'13px', color:'#6B7280', marginTop:'2px' }}>{trabajador.especialidad}</p>}
                <p style={{ fontSize:'12px', color:'#9CA3AF', marginTop:'2px' }}>{userEmail}</p>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'16px', marginBottom:'24px' }}>
              <div>
                <label className="form-label">Nombre</label>
                <input className="form-input" value={pfNombre} onChange={e => setPfNombre(e.target.value)} placeholder="Tu nombre"/>
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={pfTelefono} onChange={e => setPfTelefono(e.target.value)} placeholder="+34 600 000 000" type="tel"/>
              </div>
            </div>

            <div style={{ background:'#F9FAFB', borderRadius:'14px', padding:'16px', marginBottom:'20px', border:'1px solid rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'14px' }}>Cambiar contraseña</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <div>
                  <label className="form-label">Nueva contraseña</label>
                  <input className="form-input" value={pfPass1} onChange={e => setPfPass1(e.target.value)} type="password" placeholder="Mínimo 6 caracteres"/>
                </div>
                <div>
                  <label className="form-label">Repetir contraseña</label>
                  <input className="form-input" value={pfPass2} onChange={e => setPfPass2(e.target.value)} type="password" placeholder="Repite la contraseña"/>
                </div>
              </div>
            </div>

            {msgPf && (
              <div style={{ background: msgPf.startsWith('✓') ? '#D1FAE5' : '#FEE2E2', color: msgPf.startsWith('✓') ? '#065F46' : '#991B1B', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', fontWeight:600, marginBottom:'16px' }}>
                {msgPf}
              </div>
            )}

            <button
              onClick={guardarPerfil}
              disabled={guardandoPf}
              style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'white', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: guardandoPf ? 0.7 : 1 }}
            >
              {guardandoPf ? 'Guardando…' : 'Guardar cambios'}
            </button>

            <button
              onClick={cerrarSesion}
              style={{ width:'100%', marginTop:'12px', padding:'13px', background:'rgba(239,68,68,0.08)', color:'#DC2626', border:'1.5px solid rgba(239,68,68,0.18)', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        )}

      </div>

      {/* ══════════════ MODAL NUEVA RESERVA ══════════════ */}
      {showModal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:800, color:'#111827', letterSpacing:'-0.3px' }}>Nueva reserva</h2>
              <button onClick={() => setShowModal(false)} style={{ width:'32px', height:'32px', border:'none', background:'#F3F4F6', borderRadius:'8px', cursor:'pointer', fontSize:'18px', color:'#6B7280' }}>×</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <label className="form-label">Servicio</label>
                <select className="form-select" value={nrServicioId} onChange={e => setNrServicioId(e.target.value)}>
                  <option value="">Sin servicio específico</option>
                  {servicios.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre} — {s.duracion}min{s.precio ? ` — ${s.precio}€` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Cliente *</label>
                <input className="form-input" value={nrCliente} onChange={e => setNrCliente(e.target.value)} placeholder="Nombre del cliente"/>
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={nrTelefono} onChange={e => setNrTelefono(e.target.value)} placeholder="+34 600 000 000" type="tel"/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label className="form-label">Fecha *</label>
                  <input className="form-input" value={nrFecha} onChange={e => setNrFecha(e.target.value)} type="date"/>
                </div>
                <div>
                  <label className="form-label">Hora *</label>
                  <input className="form-input" value={nrHora} onChange={e => setNrHora(e.target.value)} type="time"/>
                </div>
              </div>
            </div>

            {errorNR && (
              <div style={{ background:'#FEE2E2', color:'#991B1B', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', fontWeight:600, marginTop:'14px' }}>
                {errorNR}
              </div>
            )}

            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex:1, padding:'13px', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarNuevaReserva}
                disabled={guardandoNR}
                style={{ flex:2, padding:'13px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'white', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: guardandoNR ? 0.7 : 1 }}
              >
                {guardandoNR ? 'Guardando…' : 'Crear reserva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL BLOQUEAR HORARIO ══════════════ */}
      {showBloqueo && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowBloqueo(false) }}>
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
              <h2 style={{ fontSize:'17px', fontWeight:800, color:'#111827' }}>Bloquear horario</h2>
              <button onClick={() => setShowBloqueo(false)} style={{ width:'30px', height:'30px', border:'none', background:'#F3F4F6', borderRadius:'8px', cursor:'pointer', fontSize:'16px' }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={bloqueoFecha} onChange={e => setBloqueoFecha(e.target.value)} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'14px', fontWeight:600, color:'#374151' }}>
                  <input type="checkbox" checked={bloqueoCompleto} onChange={e => setBloqueoCompleto(e.target.checked)} />
                  Día completo
                </label>
              </div>
              {!bloqueoCompleto && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <div>
                    <label className="form-label">Hora inicio</label>
                    <input className="form-input" type="time" value={bloqueoHoraInicio} onChange={e => setBloqueoHoraInicio(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Hora fin</label>
                    <input className="form-input" type="time" value={bloqueoHoraFin} onChange={e => setBloqueoHoraFin(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <label className="form-label">Motivo</label>
                <select className="form-select" value={bloqueoMotivo} onChange={e => setBloqueoMotivo(e.target.value)}>
                  <option value="">Sin especificar</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="enfermedad">Enfermedad</option>
                  <option value="descanso">Descanso</option>
                  <option value="formacion">Formación</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button onClick={() => setShowBloqueo(false)} style={{ flex:1, padding:'12px', background:'#F3F4F6', border:'none', borderRadius:'12px', fontFamily:'inherit', fontSize:'14px', fontWeight:700, color:'#374151', cursor:'pointer' }}>Cancelar</button>
              <button
                onClick={guardarBloqueo}
                disabled={!bloqueoFecha || guardandoBloqueo}
                style={{ flex:2, padding:'12px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'white', border:'none', borderRadius:'12px', fontFamily:'inherit', fontSize:'14px', fontWeight:700, cursor:'pointer', opacity: (!bloqueoFecha || guardandoBloqueo) ? 0.6 : 1 }}
              >
                {guardandoBloqueo ? 'Guardando…' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
