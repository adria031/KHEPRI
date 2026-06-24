'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { dbMutation } from '../../lib/dbApi'
import { DashboardShell } from '../DashboardShell'



const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const diasLabels: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
}
const diasShort: Record<string, string> = {
  lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V', sabado: 'S', domingo: 'D'
}
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CAL = ['L','M','X','J','V','S','D']

type Horario = { id?: string; dia: string; estado: 'abierto' | 'partido' | 'cerrado'; apertura: string; cierre: string; apertura2: string; cierre2: string }
type Excepcion = { id?: string; fecha: string; abierto: boolean; hora_apertura: string; hora_cierre: string; hora_apertura2: string; hora_cierre2: string; nota: string }
type BloqueoEquipo = { id: string; trabajador_id: string; negocio_id: string; fecha: string; hora_inicio: string | null; hora_fin: string | null; motivo: string | null; dia_completo: boolean }
type BloqueoForm = { dia_completo: boolean; hora_inicio: string; hora_fin: string; motivo: string }
type TrabMin = { id: string; nombre: string }

const defaultHorario = (dia: string): Horario => ({
  dia, estado: dia === 'domingo' ? 'cerrado' : 'abierto',
  apertura: '09:00', cierre: '14:00', apertura2: '16:00', cierre2: '20:00',
})

const defaultExcepcion = (fecha: string): Excepcion => ({
  fecha, abierto: false,
  hora_apertura: '09:00', hora_cierre: '14:00',
  hora_apertura2: '16:00', hora_cierre2: '20:00',
  nota: ''
})

function isoFecha(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function Horarios() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [horarios, setHorarios] = useState<Record<string, Horario>>(
    Object.fromEntries(diasSemana.map(d => [d, defaultHorario(d)]))
  )
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [apiError, setApiError] = useState('')

  // Calendario
  const hoy = new Date()
  const [calAnio, setCalAnio] = useState(hoy.getFullYear())
  const [calMes, setCalMes] = useState(hoy.getMonth())
  const [excepciones, setExcepciones] = useState<Record<string, Excepcion>>({})
  const [cargandoCal, setCargandoCal] = useState(false)

  // Modal excepción negocio
  const [modalFecha, setModalFecha] = useState<string | null>(null)
  const [modalData, setModalData] = useState<Excepcion | null>(null)
  const [guardandoModal, setGuardandoModal] = useState(false)

  // Selector sección
  const [seccion, setSeccion] = useState<'mios' | 'equipo'>('mios')

  // Equipo — lista de trabajadores
  const [trabEquipo, setTrabEquipo] = useState<TrabMin[]>([])
  const [trabSeleccionado, setTrabSeleccionado] = useState<string | null>(null)
  const [bloqueosEquipo, setBloqueosEquipo] = useState<Record<string, BloqueoEquipo[]>>({})
  const [cargandoBloqueosEq, setCargandoBloqueosEq] = useState(false)

  // Modal bloqueo equipo
  const [blModalFecha, setBlModalFecha] = useState<string | null>(null)
  const [blModalData, setBlModalData] = useState<BloqueoForm | null>(null)
  const [guardandoBlModal, setGuardandoBlModal] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo: negocio, todos } = await getNegocioActivo(user.id, session.access_token)
      if (!negocio) { window.location.href = '/onboarding'; return }
      setNegocioId(negocio.id)
      setNegocio(negocio)
      setTodosNegocios(todos)
      {
        const { data } = await db.from('horarios').select('*').eq('negocio_id', negocio.id)
        if (data && data.length > 0) {
          const map: Record<string, Horario> = {}
          data.forEach((h: any) => {
            map[h.dia] = {
              id: h.id, dia: h.dia,
              estado: h.abierto ? (h.hora_apertura2 ? 'partido' : 'abierto') : 'cerrado',
              apertura: h.hora_apertura || '09:00',
              cierre: h.hora_cierre || '14:00',
              apertura2: h.hora_apertura2 || '16:00',
              cierre2: h.hora_cierre2 || '20:00',
            }
          })
          diasSemana.forEach(d => { if (!map[d]) map[d] = defaultHorario(d) })
          setHorarios(map)
        }
      }
      const { data: twData } = await db.from('trabajadores').select('id, nombre').eq('negocio_id', negocio.id).eq('activo', true).order('nombre')
      if (twData) setTrabEquipo(twData as TrabMin[])

      setCargando(false)
    })()
  }, [])

  const cargarExcepciones = useCallback(async (nid: string, anio: number, mes: number) => {
    setCargandoCal(true)
    const desde = isoFecha(anio, mes, 1)
    const hasta = isoFecha(anio, mes, new Date(anio, mes + 1, 0).getDate())
    const { data } = await supabase
      .from('horarios_especiales')
      .select('*')
      .eq('negocio_id', nid)
      .gte('fecha', desde)
      .lte('fecha', hasta)
    if (data) {
      const map: Record<string, Excepcion> = {}
      data.forEach((e: any) => {
        map[e.fecha] = {
          id: e.id, fecha: e.fecha,
          abierto: e.abierto,
          hora_apertura: e.hora_apertura || '09:00',
          hora_cierre: e.hora_cierre || '14:00',
          hora_apertura2: e.hora_apertura2 || '16:00',
          hora_cierre2: e.hora_cierre2 || '20:00',
          nota: e.nota || '',
        }
      })
      setExcepciones(map)
    }
    setCargandoCal(false)
  }, [])

  useEffect(() => {
    if (negocioId && seccion === 'mios') cargarExcepciones(negocioId, calAnio, calMes)
  }, [negocioId, calAnio, calMes, cargarExcepciones, seccion])

  const cargarBloqueosEquipo = useCallback(async (nid: string, trabId: string, anio: number, mes: number) => {
    setCargandoBloqueosEq(true)
    const desde = isoFecha(anio, mes, 1)
    const hasta = isoFecha(anio, mes, new Date(anio, mes + 1, 0).getDate())
    const { data } = await supabase
      .from('bloqueos_trabajador')
      .select('*')
      .eq('negocio_id', nid)
      .eq('trabajador_id', trabId)
      .gte('fecha', desde)
      .lte('fecha', hasta)
    const map: Record<string, BloqueoEquipo[]> = {}
    for (const b of (data ?? []) as BloqueoEquipo[]) {
      if (!map[b.fecha]) map[b.fecha] = []
      map[b.fecha].push(b)
    }
    setBloqueosEquipo(map)
    setCargandoBloqueosEq(false)
  }, [])

  useEffect(() => {
    if (seccion === 'equipo' && negocioId && trabSeleccionado) {
      cargarBloqueosEquipo(negocioId, trabSeleccionado, calAnio, calMes)
    }
  }, [seccion, negocioId, trabSeleccionado, calAnio, calMes, cargarBloqueosEquipo])

  function updateHorario(dia: string, campo: string, valor: string) {
    setHorarios(prev => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }))
  }

  async function guardar() {
    if (!negocioId) return
    setGuardando(true); setApiError('')
    const rows = diasSemana.map(dia => {
      const h = horarios[dia]
      return {
        negocio_id: negocioId,
        dia,
        abierto: h.estado !== 'cerrado',
        hora_apertura: h.apertura,
        hora_cierre: h.cierre,
        hora_apertura2: h.estado === 'partido' ? h.apertura2 : null,
        hora_cierre2: h.estado === 'partido' ? h.cierre2 : null,
      }
    })
    const { error } = await supabase
      .from('horarios')
      .upsert(rows, { onConflict: 'negocio_id,dia' })
    if (error) {
      console.error('Error guardando horarios:', error)
      setApiError(error.message)
      setGuardando(false)
      return
    }
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  function abrirModal(fecha: string) {
    setModalFecha(fecha)
    setModalData(excepciones[fecha] ? { ...excepciones[fecha] } : defaultExcepcion(fecha))
  }

  function cerrarModal() {
    setModalFecha(null)
    setModalData(null)
  }

  async function guardarExcepcion() {
    if (!negocioId || !modalFecha || !modalData) return
    setGuardandoModal(true)
    const datos = {
      negocio_id: negocioId,
      fecha: modalFecha,
      abierto: modalData.abierto,
      hora_apertura: modalData.abierto ? modalData.hora_apertura : null,
      hora_cierre: modalData.abierto ? modalData.hora_cierre : null,
      hora_apertura2: (modalData.abierto && modalData.hora_apertura2) ? modalData.hora_apertura2 : null,
      hora_cierre2: (modalData.abierto && modalData.hora_apertura2) ? modalData.hora_cierre2 : null,
      nota: modalData.nota || null,
    }
    const existing = excepciones[modalFecha]
    if (existing?.id) {
      const { error: errExcUpd } = await dbMutation({ op: 'update', table: 'horarios_especiales', id: existing.id, negocioId, data: datos })
      if (!errExcUpd) setExcepciones(prev => ({ ...prev, [modalFecha]: { ...modalData, id: existing.id } }))
    } else {
      const { data, error: errExcIns } = await dbMutation({ op: 'insert', table: 'horarios_especiales', negocioId, data: datos })
      if (!errExcIns && data) setExcepciones(prev => ({ ...prev, [modalFecha]: { ...modalData, id: (data as { id: string }).id } }))
    }
    setGuardandoModal(false)
    cerrarModal()
  }

  async function eliminarExcepcion() {
    if (!modalFecha || !excepciones[modalFecha]?.id) { cerrarModal(); return }
    await dbMutation({ op: 'delete', table: 'horarios_especiales', id: excepciones[modalFecha].id!, negocioId: negocioId! })
    setExcepciones(prev => {
      const next = { ...prev }
      delete next[modalFecha]
      return next
    })
    cerrarModal()
  }

  function iniciales(n: string) { return n.split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2) }

  function abrirBlModal(fecha: string) {
    const existing = bloqueosEquipo[fecha]?.[0]
    setBlModalFecha(fecha)
    setBlModalData(existing
      ? { dia_completo: existing.dia_completo, hora_inicio: existing.hora_inicio || '09:00', hora_fin: existing.hora_fin || '18:00', motivo: existing.motivo || '' }
      : { dia_completo: false, hora_inicio: '09:00', hora_fin: '18:00', motivo: '' }
    )
  }

  async function guardarBloqueoEquipo() {
    if (!negocioId || !trabSeleccionado || !blModalFecha || !blModalData) return
    setGuardandoBlModal(true)
    const existing = bloqueosEquipo[blModalFecha]?.[0]
    const datos = {
      trabajador_id: trabSeleccionado,
      negocio_id: negocioId,
      fecha: blModalFecha,
      dia_completo: blModalData.dia_completo,
      hora_inicio: blModalData.dia_completo ? null : blModalData.hora_inicio,
      hora_fin: blModalData.dia_completo ? null : blModalData.hora_fin,
      motivo: blModalData.motivo || null,
    }
    if (existing?.id) {
      await supabase.from('bloqueos_trabajador').update(datos).eq('id', existing.id)
      setBloqueosEquipo(prev => ({ ...prev, [blModalFecha]: [{ ...existing, ...datos }] }))
    } else {
      const { data: newB } = await supabase.from('bloqueos_trabajador').insert(datos).select().single()
      if (newB) setBloqueosEquipo(prev => ({ ...prev, [blModalFecha]: [newB as BloqueoEquipo] }))
    }
    setGuardandoBlModal(false)
    setBlModalFecha(null); setBlModalData(null)
  }

  async function eliminarBloqueoEquipo() {
    if (!blModalFecha) return
    const existing = bloqueosEquipo[blModalFecha]?.[0]
    if (existing?.id) {
      await supabase.from('bloqueos_trabajador').delete().eq('id', existing.id)
      setBloqueosEquipo(prev => { const next = { ...prev }; delete next[blModalFecha!]; return next })
    }
    setBlModalFecha(null); setBlModalData(null)
  }

  function getDiaSemana(y: number, m: number, d: number): string {
    const js = new Date(y, m, d).getDay() // 0=dom..6=sab
    const map = [6, 0, 1, 2, 3, 4, 5] // domingo→6, lunes→0...
    const idx = map[js]
    return diasSemana[idx]
  }

  function getDayColorEquipo(fechaStr: string, y: number, m: number, d: number): { bg: string; color: string; label?: string } {
    const blqs = bloqueosEquipo[fechaStr]
    if (blqs && blqs.length > 0) {
      const b = blqs[0]
      const rangoLabel = b.dia_completo ? 'Día completo' : `${b.hora_inicio?.slice(0,5)||''}–${b.hora_fin?.slice(0,5)||''}`
      return { bg: '#FEE2E2', color: '#DC2626', label: b.motivo || rangoLabel }
    }
    const diaNombre = getDiaSemana(y, m - 1, d)
    const h = horarios[diaNombre]
    if (!h || h.estado === 'cerrado') return { bg: '#F3F4F6', color: '#9CA3AF' }
    return { bg: '#D1FAE5', color: '#065F46' }
  }

  function getDayColor(fechaStr: string, y: number, m: number, d: number): { bg: string; color: string; label?: string } {
    const exc = excepciones[fechaStr]
    if (exc) {
      if (exc.abierto) return { bg: '#DBEAFE', color: '#1D4ED8', label: exc.nota || 'Especial' }
      return { bg: '#FEE2E2', color: '#DC2626', label: exc.nota || 'Cerrado especial' }
    }
    const diaNombre = getDiaSemana(y, m, d)
    const h = horarios[diaNombre]
    if (!h || h.estado === 'cerrado') return { bg: '#F3F4F6', color: '#9CA3AF' }
    return { bg: '#D1FAE5', color: '#065F46' }
  }

  // Genera celdas del calendario
  function generarCeldas() {
    const primerDia = new Date(calAnio, calMes, 1)
    const offset = (primerDia.getDay() + 6) % 7 // lunes=0
    const diasEnMes = new Date(calAnio, calMes + 1, 0).getDate()
    const celdas: (number | null)[] = []
    for (let i = 0; i < offset; i++) celdas.push(null)
    for (let d = 1; d <= diasEnMes; d++) celdas.push(d)
    return celdas
  }

  function prevMes() {
    if (calMes === 0) { setCalAnio(y => y - 1); setCalMes(11) }
    else setCalMes(m => m - 1)
  }
  function nextMes() {
    if (calMes === 11) { setCalAnio(y => y + 1); setCalMes(0) }
    else setCalMes(m => m + 1)
  }


  const celdas = generarCeldas()

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
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
        /* Selector sección */
        .seccion-selector { display: flex; gap: 8px; margin-bottom: 24px; }
        .seccion-btn { padding: 8px 20px; border-radius: 999px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .seccion-btn.active { background: var(--blue-soft); border: 2px solid var(--blue-dark); color: var(--blue-dark); }
        .seccion-btn.inactive { background: white; border: 1.5px solid var(--border); color: var(--muted); }
        /* Equipo */
        .trab-pill { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .trab-pill.active { background: rgba(124,58,237,0.08); border: 2px solid #7C3AED; color: #7C3AED; }
        .trab-pill.inactive { background: white; border: 1.5px solid var(--border); color: var(--text2); }
        .trab-pill:hover:not(.active) { border-color: #9CA3AF; }
        .trab-avatar { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg,#7C3AED,#4FACFE); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 800; flex-shrink: 0; }
        /* Section headers */
        .section-title { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
        .section-sub { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
        /* Weekly schedule */
        .horarios-card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; margin-bottom: 32px; }
        .horario-row { display: flex; flex-direction: column; padding: 16px 20px; border-bottom: 1px solid var(--border); gap: 10px; }
        .horario-row:last-child { border-bottom: none; }
        .horario-top { display: flex; align-items: center; gap: 12px; }
        .dia-badge { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .dia-badge.abierto { background: var(--blue); color: var(--blue-dark); }
        .dia-badge.partido { background: var(--lila); color: var(--lila-dark); }
        .dia-badge.cerrado { background: rgba(0,0,0,0.06); color: var(--muted); }
        .dia-nombre { font-size: 14px; font-weight: 700; color: var(--text); width: 90px; flex-shrink: 0; }
        .tipo-btns { display: flex; gap: 6px; }
        .tipo-btn { padding: 5px 12px; border-radius: 100px; border: 1.5px solid var(--border); background: white; font-family: inherit; font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer; transition: all 0.2s; }
        .tipo-btn.active-seguido { background: var(--blue-dark); border-color: var(--blue-dark); color: white; }
        .tipo-btn.active-partido { background: var(--lila-dark); border-color: var(--lila-dark); color: white; }
        .tipo-btn.active-cerrado { background: #111827; border-color: #111827; color: white; }
        .horario-times { display: flex; align-items: center; gap: 8px; padding-left: 48px; flex-wrap: wrap; }
        .time-label { font-size: 11px; color: var(--muted); font-weight: 600; width: 52px; flex-shrink: 0; }
        .time-input { padding: 7px 10px; border: 1.5px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; color: var(--text); outline: none; width: 92px; }
        .time-input:focus { border-color: var(--blue-dark); }
        .cerrado-txt { padding-left: 48px; font-size: 13px; color: var(--muted); }
        .btn-guardar { background: var(--text); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-guardar:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-guardado { background: var(--green-dark); }
        /* Calendar */
        .cal-card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
        .cal-nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
        .cal-nav-btn { background: none; border: 1.5px solid var(--border); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; color: var(--text2); }
        .cal-nav-btn:hover { background: var(--bg); }
        .cal-mes-label { font-size: 16px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); padding: 16px; gap: 4px; }
        .cal-header-cell { text-align: center; font-size: 11px; font-weight: 700; color: var(--muted); padding: 6px 0; letter-spacing: 0.5px; }
        .cal-cell { aspect-ratio: 1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; position: relative; font-size: 13px; font-weight: 700; border: 2px solid transparent; min-height: 44px; }
        .cal-cell:hover { transform: scale(1.05); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .cal-cell.hoy { border-color: var(--blue-dark); }
        .cal-cell-nota { font-size: 9px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90%; text-align: center; opacity: 0.8; }
        /* Leyenda */
        .leyenda { display: flex; gap: 16px; padding: 12px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; }
        .leyenda-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text2); }
        .leyenda-dot { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }
        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal { background: var(--white); border-radius: 20px; width: 100%; max-width: 440px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .modal-title { font-size: 16px; font-weight: 800; color: var(--text); }
        .modal-close { background: none; border: none; cursor: pointer; font-size: 20px; color: var(--muted); padding: 4px; line-height: 1; }
        .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; }
        .modal-label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .modal-toggle { display: flex; gap: 8px; }
        .modal-toggle-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; }
        .modal-toggle-btn.active-open { background: #D1FAE5; border-color: #6EE7B7; color: #065F46; }
        .modal-toggle-btn.active-closed { background: #FEE2E2; border-color: #FCA5A5; color: #DC2626; }
        .modal-textarea { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; color: var(--text); outline: none; resize: none; height: 72px; }
        .modal-textarea:focus { border-color: var(--blue-dark); }
        .btn-primary { flex: 1; padding: 11px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-danger { padding: 11px 18px; background: #FEE2E2; color: #DC2626; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-danger:hover { background: #FECACA; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .dia-nombre { width: 70px; }
          .tipo-btn { padding: 9px 12px; font-size: 12px; }
          .cal-cell { font-size: 12px; }
          .cal-cell-nota { display: none; }
        }
        @media (max-width: 480px) {
          .horario-times { padding-left: 0 !important; }
          .time-input { width: 80px; font-size: 13px; }
          .time-label { width: 44px; font-size: 10px; }
          .horario-row { padding: 12px 14px; }
          .dia-nombre { width: 60px; font-size: 13px; }
          .tipo-btn { padding: 7px 8px; font-size: 11px; }
          .horarios-card { border-radius: 12px; }
          .modal { max-width: calc(100vw - 24px) !important; }
          .modal-body { padding: 16px; }
        }
      `}</style>

            {/* ── SELECTOR SECCIÓN ── */}
            <div className="seccion-selector">
              <button className={`seccion-btn ${seccion === 'mios' ? 'active' : 'inactive'}`} onClick={() => setSeccion('mios')}>
                🙋 Mis horarios
              </button>
              <button className={`seccion-btn ${seccion === 'equipo' ? 'active' : 'inactive'}`} onClick={() => setSeccion('equipo')}>
                👥 Horarios del equipo
              </button>
            </div>

            {/* ── SECCIÓN: MIS HORARIOS ── */}
            {seccion === 'mios' && (<>

            {/* ── SECCIÓN 1: HORARIO SEMANAL ── */}
            <div className="section-title">Horario semanal</div>
            <div className="section-sub">Define el horario base para cada día de la semana</div>

            {cargando ? (
              <div style={{textAlign:'center', padding:'60px', color:'var(--muted)'}}>Cargando...</div>
            ) : (
              <div className="horarios-card">
                {diasSemana.map(dia => {
                  const h = horarios[dia]
                  return (
                    <div key={dia} className="horario-row">
                      <div className="horario-top">
                        <div className={`dia-badge ${h.estado}`}>{diasShort[dia]}</div>
                        <span className="dia-nombre">{diasLabels[dia]}</span>
                        <div className="tipo-btns">
                          <button className={`tipo-btn ${h.estado === 'abierto' ? 'active-seguido' : ''}`} onClick={() => updateHorario(dia, 'estado', 'abierto')}>Seguido</button>
                          <button className={`tipo-btn ${h.estado === 'partido' ? 'active-partido' : ''}`} onClick={() => updateHorario(dia, 'estado', 'partido')}>Partido</button>
                          <button className={`tipo-btn ${h.estado === 'cerrado' ? 'active-cerrado' : ''}`} onClick={() => updateHorario(dia, 'estado', 'cerrado')}>Cerrado</button>
                        </div>
                      </div>

                      {h.estado === 'abierto' && (
                        <div className="horario-times">
                          <span className="time-label">Abre</span>
                          <input type="time" className="time-input" value={h.apertura} onChange={e => updateHorario(dia, 'apertura', e.target.value)} />
                          <span style={{fontSize:'13px', color:'var(--muted)'}}>a</span>
                          <input type="time" className="time-input" value={h.cierre} onChange={e => updateHorario(dia, 'cierre', e.target.value)} />
                        </div>
                      )}

                      {h.estado === 'partido' && (
                        <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                          <div className="horario-times">
                            <span className="time-label">Mañana</span>
                            <input type="time" className="time-input" value={h.apertura} onChange={e => updateHorario(dia, 'apertura', e.target.value)} />
                            <span style={{fontSize:'13px', color:'var(--muted)'}}>a</span>
                            <input type="time" className="time-input" value={h.cierre} onChange={e => updateHorario(dia, 'cierre', e.target.value)} />
                          </div>
                          <div className="horario-times">
                            <span className="time-label">Tarde</span>
                            <input type="time" className="time-input" value={h.apertura2} onChange={e => updateHorario(dia, 'apertura2', e.target.value)} />
                            <span style={{fontSize:'13px', color:'var(--muted)'}}>a</span>
                            <input type="time" className="time-input" value={h.cierre2} onChange={e => updateHorario(dia, 'cierre2', e.target.value)} />
                          </div>
                        </div>
                      )}

                      {h.estado === 'cerrado' && (
                        <span className="cerrado-txt">Cerrado este día</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── GUARDAR HORARIO SEMANAL ── */}
            {!cargando && (
              <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className={`btn-guardar ${guardado ? 'btn-guardado' : ''}`}
                  onClick={guardar}
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar horarios'}
                </button>
                {apiError && (
                  <span style={{ fontSize: 13, color: '#DC2626' }}>Error: {apiError}</span>
                )}
              </div>
            )}

            {/* ── SECCIÓN 2: CALENDARIO MENSUAL ── */}
            <div className="section-title">Excepciones del calendario</div>
            <div className="section-sub">Haz clic en cualquier día para marcarlo como cerrado o con horario especial</div>

            <div className="cal-card">
              <div className="cal-nav">
                <button className="cal-nav-btn" onClick={prevMes}>&#8249;</button>
                <span className="cal-mes-label">{MESES[calMes]} {calAnio}</span>
                <button className="cal-nav-btn" onClick={nextMes}>&#8250;</button>
              </div>

              {cargandoCal ? (
                <div style={{textAlign:'center', padding:'40px', color:'var(--muted)'}}>Cargando...</div>
              ) : (
                <div className="cal-grid">
                  {DIAS_CAL.map(d => (
                    <div key={d} className="cal-header-cell">{d}</div>
                  ))}
                  {celdas.map((d, i) => {
                    if (!d) return <div key={`e-${i}`} />
                    const fecha = isoFecha(calAnio, calMes, d)
                    const esHoy = calAnio === hoy.getFullYear() && calMes === hoy.getMonth() && d === hoy.getDate()
                    const { bg, color, label } = getDayColor(fecha, calAnio, calMes, d)
                    const tieneExc = !!excepciones[fecha]
                    return (
                      <div
                        key={fecha}
                        className={`cal-cell ${esHoy ? 'hoy' : ''}`}
                        style={{ background: bg, color }}
                        onClick={() => abrirModal(fecha)}
                        title={label}
                      >
                        {d}
                        {tieneExc && label && (
                          <span className="cal-cell-nota">{label}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="leyenda">
                <div className="leyenda-item"><div className="leyenda-dot" style={{background:'#D1FAE5'}} /><span>Abierto (horario normal)</span></div>
                <div className="leyenda-item"><div className="leyenda-dot" style={{background:'#F3F4F6'}} /><span>Cerrado (horario normal)</span></div>
                <div className="leyenda-item"><div className="leyenda-dot" style={{background:'#DBEAFE'}} /><span>Abierto (excepción)</span></div>
                <div className="leyenda-item"><div className="leyenda-dot" style={{background:'#FEE2E2'}} /><span>Cerrado (excepción)</span></div>
              </div>
            </div>

            </>)} {/* fin seccion === 'mios' */}

            {/* ── SECCIÓN: HORARIOS DEL EQUIPO ── */}
            {seccion === 'equipo' && (
              <div>
                {trabEquipo.length === 0 ? (
                  <div style={{textAlign:'center', padding:'60px 20px', background:'var(--white)', border:'1px solid var(--border)', borderRadius:16}}>
                    <div style={{fontSize:40, marginBottom:12}}>👥</div>
                    <div style={{fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6}}>Sin trabajadores</div>
                    <div style={{fontSize:13, color:'var(--muted)'}}>Añade empleados desde la sección "Mi equipo"</div>
                  </div>
                ) : (
                  <>
                    {/* Selector de trabajador */}
                    <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:20}}>
                      {trabEquipo.map(t => (
                        <button
                          key={t.id}
                          className={`trab-pill ${trabSeleccionado === t.id ? 'active' : 'inactive'}`}
                          onClick={() => setTrabSeleccionado(prev => prev === t.id ? null : t.id)}
                        >
                          <div className="trab-avatar">{iniciales(t.nombre)}</div>
                          {t.nombre}
                        </button>
                      ))}
                    </div>

                    {!trabSeleccionado ? (
                      <div style={{textAlign:'center', padding:'48px 20px', color:'var(--muted)', background:'var(--white)', border:'1px solid var(--border)', borderRadius:16}}>
                        <div style={{fontSize:32, marginBottom:10}}>👆</div>
                        <div style={{fontSize:14, fontWeight:600, color:'var(--text2)'}}>Selecciona un trabajador</div>
                        <div style={{fontSize:13, marginTop:4}}>para ver y gestionar su disponibilidad</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{fontSize:13, color:'var(--muted)', marginBottom:16, padding:'10px 14px', background:'rgba(184,216,248,0.2)', borderRadius:10, border:'1px solid rgba(184,216,248,0.5)'}}>
                          ℹ️ El horario base es el del negocio. Marca días bloqueados (vacaciones, bajas…) haciendo clic en el calendario.
                        </div>

                        <div className="cal-card">
                          <div className="cal-nav">
                            <button className="cal-nav-btn" onClick={prevMes}>&#8249;</button>
                            <span className="cal-mes-label">{MESES[calMes]} {calAnio}</span>
                            <button className="cal-nav-btn" onClick={nextMes}>&#8250;</button>
                          </div>

                          {cargandoBloqueosEq ? (
                            <div style={{textAlign:'center', padding:'40px', color:'var(--muted)'}}>Cargando...</div>
                          ) : (
                            <div className="cal-grid">
                              {DIAS_CAL.map(d => (
                                <div key={d} className="cal-header-cell">{d}</div>
                              ))}
                              {celdas.map((d, i) => {
                                if (!d) return <div key={`e-${i}`} />
                                const fecha = isoFecha(calAnio, calMes, d)
                                const esHoy = calAnio === hoy.getFullYear() && calMes === hoy.getMonth() && d === hoy.getDate()
                                const { bg, color, label } = getDayColorEquipo(fecha, calAnio, calMes + 1, d)
                                const tieneBloqueo = !!bloqueosEquipo[fecha]
                                return (
                                  <div
                                    key={fecha}
                                    className={`cal-cell ${esHoy ? 'hoy' : ''}`}
                                    style={{ background: bg, color }}
                                    onClick={() => abrirBlModal(fecha)}
                                    title={label}
                                  >
                                    {d}
                                    {tieneBloqueo && label && (
                                      <span className="cal-cell-nota">{label}</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          <div className="leyenda">
                            <div className="leyenda-item"><div className="leyenda-dot" style={{background:'#D1FAE5'}} /><span>Disponible</span></div>
                            <div className="leyenda-item"><div className="leyenda-dot" style={{background:'#F3F4F6'}} /><span>Negocio cerrado</span></div>
                            <div className="leyenda-item"><div className="leyenda-dot" style={{background:'#FEE2E2'}} /><span>Bloqueado</span></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

      {/* ── MODAL BLOQUEO EQUIPO ── */}
      {blModalFecha && blModalData && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setBlModalFecha(null); setBlModalData(null) } }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                {new Date(blModalFecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <button className="modal-close" onClick={() => { setBlModalFecha(null); setBlModalData(null) }}>×</button>
            </div>
            <div className="modal-body">
              <div>
                <div className="modal-label">Estado ese día para {trabEquipo.find(t => t.id === trabSeleccionado)?.nombre}</div>
                <div className="modal-toggle">
                  <button
                    className={`modal-toggle-btn ${!bloqueosEquipo[blModalFecha] ? 'active-open' : ''}`}
                    onClick={() => eliminarBloqueoEquipo()}
                  >✓ Disponible</button>
                  <button
                    className={`modal-toggle-btn ${bloqueosEquipo[blModalFecha] ? 'active-closed' : ''}`}
                    onClick={() => setBlModalData(d => d ? { ...d } : d)}
                    style={bloqueosEquipo[blModalFecha] ? { background:'#FEE2E2', borderColor:'#FCA5A5', color:'#DC2626' } : {}}
                  >🚫 Bloqueado</button>
                </div>
              </div>
              <div>
                <div className="modal-label">Tipo de bloqueo</div>
                <div className="modal-toggle">
                  <button
                    className={`modal-toggle-btn ${!blModalData.dia_completo ? 'active-open' : ''}`}
                    onClick={() => setBlModalData(d => d ? { ...d, dia_completo: false } : d)}
                  >Horas concretas</button>
                  <button
                    className={`modal-toggle-btn ${blModalData.dia_completo ? 'active-closed' : ''}`}
                    onClick={() => setBlModalData(d => d ? { ...d, dia_completo: true } : d)}
                  >Día completo</button>
                </div>
              </div>
              {!blModalData.dia_completo && (
                <div>
                  <div className="modal-label">Horario bloqueado</div>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <input type="time" className="time-input" value={blModalData.hora_inicio} onChange={e => setBlModalData(d => d ? {...d, hora_inicio: e.target.value} : d)} />
                    <span style={{fontSize:'13px', color:'var(--muted)'}}>a</span>
                    <input type="time" className="time-input" value={blModalData.hora_fin} onChange={e => setBlModalData(d => d ? {...d, hora_fin: e.target.value} : d)} />
                  </div>
                </div>
              )}
              <div>
                <div className="modal-label">Motivo (opcional)</div>
                <textarea
                  className="modal-textarea"
                  placeholder="Ej: Vacaciones, Baja médica..."
                  value={blModalData.motivo}
                  onChange={e => setBlModalData(d => d ? {...d, motivo: e.target.value} : d)}
                />
              </div>
            </div>
            <div className="modal-footer">
              {bloqueosEquipo[blModalFecha] && (
                <button className="btn-danger" onClick={eliminarBloqueoEquipo}>Eliminar bloqueo</button>
              )}
              <button className="btn-primary" onClick={guardarBloqueoEquipo} disabled={guardandoBlModal}>
                {guardandoBlModal ? 'Guardando...' : 'Guardar bloqueo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EXCEPCIÓN ── */}
      {modalFecha && modalData && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                {new Date(modalFecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <button className="modal-close" onClick={cerrarModal}>×</button>
            </div>
            <div className="modal-body">
              <div>
                <div className="modal-label">Estado ese día</div>
                <div className="modal-toggle">
                  <button
                    className={`modal-toggle-btn ${modalData.abierto ? 'active-open' : ''}`}
                    onClick={() => setModalData(d => d ? {...d, abierto: true} : d)}
                  >Abierto</button>
                  <button
                    className={`modal-toggle-btn ${!modalData.abierto ? 'active-closed' : ''}`}
                    onClick={() => setModalData(d => d ? {...d, abierto: false} : d)}
                  >Cerrado</button>
                </div>
              </div>

              {modalData.abierto && (
                <>
                  <div>
                    <div className="modal-label">Turno mañana</div>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <input type="time" className="time-input" value={modalData.hora_apertura} onChange={e => setModalData(d => d ? {...d, hora_apertura: e.target.value} : d)} />
                      <span style={{fontSize:'13px', color:'var(--muted)'}}>a</span>
                      <input type="time" className="time-input" value={modalData.hora_cierre} onChange={e => setModalData(d => d ? {...d, hora_cierre: e.target.value} : d)} />
                    </div>
                  </div>
                  <div>
                    <div className="modal-label">Turno tarde (opcional)</div>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <input type="time" className="time-input" value={modalData.hora_apertura2} onChange={e => setModalData(d => d ? {...d, hora_apertura2: e.target.value} : d)} />
                      <span style={{fontSize:'13px', color:'var(--muted)'}}>a</span>
                      <input type="time" className="time-input" value={modalData.hora_cierre2} onChange={e => setModalData(d => d ? {...d, hora_cierre2: e.target.value} : d)} />
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="modal-label">Nota (opcional)</div>
                <textarea
                  className="modal-textarea"
                  placeholder="Ej: Festivo local, Vacaciones de verano..."
                  value={modalData.nota}
                  onChange={e => setModalData(d => d ? {...d, nota: e.target.value} : d)}
                />
              </div>
            </div>
            <div className="modal-footer">
              {excepciones[modalFecha] && (
                <button className="btn-danger" onClick={eliminarExcepcion}>Eliminar</button>
              )}
              <button className="btn-primary" onClick={guardarExcepcion} disabled={guardandoModal}>
                {guardandoModal ? 'Guardando...' : 'Guardar excepción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
