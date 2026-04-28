'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from '../../../lib/supabase'
import { sanitizeField } from '../../../lib/sanitize'

const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001'

async function verifyCaptcha(token: string): Promise<boolean> {
  const res = await fetch('/api/verify-captcha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  return res.ok
}
import {
  verificarDisponibilidad,
  crearReserva,
  buscarReservas,
  cancelarReserva,
  FUNCTION_DECLARATIONS,
} from '../../../lib/chatbotFunctions'

const GEMINI_URL = '/api/gemini'

type ChatMsg = { role: 'user' | 'bot'; text: string }

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

type Servicio = { id: string; nombre: string; duracion: number; precio: number }
type Trabajador = { id: string; nombre: string; especialidad?: string | null; color?: string | null }
type Horario = { dia: string; abierto: boolean; hora_apertura: string; hora_cierre: string; hora_apertura2: string | null; hora_cierre2: string | null }

const WORKER_COLORS  = ['#818CF8','#34D399','#FBBF24','#F472B6','#38BDF8','#FB923C','#A78BFA','#F87171']
const WORKER_BG      = ['#EEF2FF','#ECFDF5','#FFFBEB','#FDF2F8','#F0F9FF','#FFF7ED','#F5F3FF','#FEF2F2']

function trabajadorColor(t: Trabajador, idx: number): string {
  return t.color || WORKER_COLORS[idx % WORKER_COLORS.length]
}
function trabajadorBg(t: Trabajador, idx: number): string {
  return t.color ? `${t.color}22` : WORKER_BG[idx % WORKER_BG.length]
}

const diasNombre = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']
const mesesNombre = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const diasSemana = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

function generarSlots(apertura: string, cierre: string, duracion: number, intervalo: number, margen: number): string[] {
  if (!apertura || !cierre || duracion <= 0) return []
  const [ah, am] = apertura.split(':').map(Number)
  const [ch, cm] = cierre.split(':').map(Number)
  let mins = ah * 60 + am
  const finMins = ch * 60 + cm
  const slots: string[] = []
  while (mins + duracion + margen <= finMins) {
    slots.push(`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`)
    mins += intervalo
  }
  return slots
}

function formatFecha(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function Reservar() {
  const params = useParams()
  const id = params?.id as string

  const [paso, setPaso] = useState(0)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [cargandoInit, setCargandoInit] = useState(true)
  const [negocioPolitica, setNegocioPolitica] = useState<{ horas: number; mensaje: string }>({ horas: 24, mensaje: '' })
  const [negocioAgenda, setNegocioAgenda] = useState({ intervalo: 15, margen: 0, anteMin: 60, anteMax: 43200, maxSimul: 1 })

  // Selecciones
  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null)
  const [fecha, setFecha] = useState<string>('')
  const [hora, setHora] = useState<string>('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [horasOcupadas, setHorasOcupadas] = useState<Set<string>>(new Set())
  const [cargandoSlots, setCargandoSlots] = useState(false)

  // Lista de espera
  const [listaEsperaMode, setListaEsperaMode] = useState(false)
  const [listaEsperaEnviada, setListaEsperaEnviada] = useState(false)
  const [enviandoEspera, setEnviandoEspera] = useState(false)

  // Captcha
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<HCaptcha>(null)

  // Chat widget
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatEnviando, setChatEnviando] = useState(false)
  const chatBodyRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Calendario
  const hoy = new Date()
  const [calMes, setCalMes] = useState(hoy.getMonth())
  const [calAnio, setCalAnio] = useState(hoy.getFullYear())

  useEffect(() => {
    if (!id) return

    // Precargar datos del cliente si tiene sesión
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      const u = session.user

      // Email siempre disponible
      setEmail(u.email || '')

      // Nombre y teléfono desde profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, telefono')
        .eq('id', u.id)
        .single()
      const nombreGuardado = profile?.nombre
        || u.user_metadata?.nombre
        || u.user_metadata?.full_name
        || ''
      if (nombreGuardado) setNombre(nombreGuardado)
      if (profile?.telefono) setTelefono(profile.telefono)
    })

    Promise.all([
      supabase.from('negocios').select('nombre, horas_cancelacion, mensaje_cancelacion, intervalo_agenda, margen_servicio, max_reservas_simultaneas, antelacion_minima, antelacion_maxima').eq('id', id).single(),
      supabase.from('servicios').select('id,nombre,duracion,precio').eq('negocio_id', id).eq('activo', true).order('nombre'),
      supabase.from('trabajadores').select('id,nombre,especialidad,color').eq('negocio_id', id).eq('activo', true).order('nombre'),
      supabase.from('horarios').select('*').eq('negocio_id', id),
    ]).then(([{data: neg}, {data: ser}, {data: tra}, {data: hor}]) => {
      if (neg) {
        setNegocioNombre(neg.nombre)
        setNegocioPolitica({ horas: neg.horas_cancelacion ?? 24, mensaje: neg.mensaje_cancelacion || '' })
        setNegocioAgenda({
          intervalo: neg.intervalo_agenda ?? 15,
          margen: neg.margen_servicio ?? 0,
          anteMin: neg.antelacion_minima ?? 60,
          anteMax: neg.antelacion_maxima ?? 43200,
          maxSimul: neg.max_reservas_simultaneas ?? 1,
        })
      }
      if (ser) setServicios(ser)
      if (tra) setTrabajadores(tra)
      if (hor) setHorarios(hor)
      setCargandoInit(false)
    })
  }, [id])

  // Cargar horas ocupadas cuando llegamos al paso de hora
  useEffect(() => {
    if (paso !== 3 || !fecha || !servicio || !id) return
    setCargandoSlots(true)
    let query = supabase
      .from('reservas')
      .select('hora')
      .eq('negocio_id', id)
      .eq('fecha', fecha)
      .neq('estado', 'cancelada')
    if (trabajador?.id) query = query.eq('trabajador_id', trabajador.id)
    query.then(({ data }) => {
      // Count reservations per slot; mark as occupied when count >= maxSimul
      const counts: Record<string, number> = {}
      for (const r of data || []) {
        const h = r.hora.slice(0, 5)
        counts[h] = (counts[h] ?? 0) + 1
      }
      const { maxSimul } = negocioAgenda
      const ocupados = new Set(Object.entries(counts).filter(([, n]) => n >= maxSimul).map(([h]) => h))
      setHorasOcupadas(ocupados)
      setCargandoSlots(false)
    })
  }, [paso, fecha, servicio, trabajador, id, negocioAgenda])

  // Generar slots para la fecha y servicio seleccionados
  const slots = useCallback((): string[] => {
    if (!fecha || !servicio) return []
    const [y, m, d] = fecha.split('-').map(Number)
    const diaNombre = diasNombre[new Date(y, m-1, d).getDay()]
    const horario = horarios.find(h => h.dia === diaNombre)
    if (!horario || !horario.abierto) return []
    const { intervalo, margen, anteMin } = negocioAgenda
    const s1 = generarSlots(horario.hora_apertura, horario.hora_cierre, servicio.duracion, intervalo, margen)
    const s2 = horario.hora_apertura2 ? generarSlots(horario.hora_apertura2, horario.hora_cierre2!, servicio.duracion, intervalo, margen) : []
    const ahora = Date.now()
    return [...s1, ...s2].filter(slot => {
      const [sh, sm] = slot.split(':').map(Number)
      const slotTime = new Date(y, m - 1, d, sh, sm).getTime()
      return slotTime >= ahora + anteMin * 60 * 1000
    })
  }, [fecha, servicio, horarios, negocioAgenda])

  function diaDisponible(y: number, m: number, d: number): boolean {
    const f = new Date(y, m, d)
    const h = new Date(); h.setHours(0,0,0,0)
    if (f < h) return false
    const maxDias = Math.ceil(negocioAgenda.anteMax / 1440)
    const limite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + maxDias)
    if (f >= limite) return false
    const diaNombre = diasNombre[f.getDay()]
    const horario = horarios.find(h => h.dia === diaNombre)
    return !!(horario?.abierto)
  }

  function diasEnMes(y: number, m: number) { return new Date(y, m+1, 0).getDate() }
  function primerDiaMes(y: number, m: number) {
    // Ajustar para que la semana empiece en Lunes (0=Lu, 6=Do)
    return (new Date(y, m, 1).getDay() + 6) % 7
  }

  function abrirChat() {
    if (!chatOpen) {
      setChatOpen(true)
      if (chatMsgs.length === 0) {
        setChatMsgs([{ role: 'bot', text: `¡Hola! Soy el asistente de ${negocioNombre}. Puedo ayudarte a reservar o cancelar una cita. ¿Qué necesitas?` }])
      }
      setTimeout(() => chatInputRef.current?.focus(), 150)
    } else {
      setChatOpen(false)
    }
  }

  async function enviarChatMsg() {
    const texto = chatInput.trim()
    if (!texto || chatEnviando || !id) return

    setChatInput('')
    setChatEnviando(true)
    const nuevos: ChatMsg[] = [...chatMsgs, { role: 'user', text: texto }]
    setChatMsgs(nuevos)
    setTimeout(() => { if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight }, 50)

    try {
      const serviciosText = servicios.map(s => `  - ID:${s.id} | ${s.nombre} | ${s.precio}€ | ${s.duracion}min`).join('\n')
      const trabajadoresText = trabajadores.length > 0
        ? trabajadores.map(t => `  - ID:${t.id} | ${t.nombre}`).join('\n')
        : '  (Sin trabajadores registrados)'
      const diasNombreMap: Record<string, string> = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }
      const horariosText = horarios.filter(h => h.abierto).map(h => `  - ${diasNombreMap[h.dia]||h.dia}: ${h.hora_apertura}–${h.hora_cierre}`).join('\n')

      const systemPrompt = `Eres el asistente virtual de ${negocioNombre}. Responde en español, sé conciso.
Ayuda a reservar citas y cancelarlas. Para reservar recoge: nombre, teléfono, servicio, trabajador (si hay varios), fecha, hora y email (opcional, para confirmación).
SIEMPRE llama a verificarDisponibilidad antes de crearReserva. Si no está disponible muestra slots alternativos.
Hoy es ${new Date().toISOString().split('T')[0]}.
== SERVICIOS == \n${serviciosText || '(Sin servicios)'}
== EQUIPO == \n${trabajadoresText}
== HORARIOS == \n${horariosText || '(Sin horarios)'}`

      const historial: any[] = nuevos
        .slice(0, -1) // exclude the just-added user msg (we add it below)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
      historial.push({ role: 'user', parts: [{ text: texto }] })

      for (let iter = 0; iter < 5; iter++) {
        const res = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: historial,
            tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error?.message || `HTTP ${res.status}`)
        }

        const json = await res.json()
        const parts: any[] = json.candidates?.[0]?.content?.parts ?? []
        const fnCallPart = parts.find((p: any) => p.functionCall)

        if (fnCallPart) {
          const { name, args } = fnCallPart.functionCall
          historial.push({ role: 'model', parts: [{ functionCall: { name, args } }] })

          let fnResult: any
          try {
            switch (name) {
              case 'verificarDisponibilidad':
                fnResult = await verificarDisponibilidad({ negocio_id: id as string, ...args })
                break
              case 'crearReserva':
                fnResult = await crearReserva({ negocio_id: id as string, ...args })
                break
              case 'buscarReservas':
                fnResult = await buscarReservas({ negocio_id: id as string, ...args })
                break
              case 'cancelarReserva':
                fnResult = await cancelarReserva(args)
                break
              default:
                fnResult = { error: 'Función desconocida' }
            }
          } catch (e: any) {
            fnResult = { error: e.message }
          }

          historial.push({
            role: 'user',
            parts: [{ functionResponse: { name, response: fnResult } }],
          })
          continue
        }

        const textPart = parts.find((p: any) => p.text)
        const respuesta = textPart?.text ?? '...'
        setChatMsgs(prev => [...prev, { role: 'bot', text: respuesta }])
        setTimeout(() => { if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight }, 50)
        break
      }
    } catch (e: any) {
      setChatMsgs(prev => [...prev, { role: 'bot', text: `Error: ${e.message}` }])
    } finally {
      setChatEnviando(false)
      setTimeout(() => chatInputRef.current?.focus(), 50)
    }
  }

  async function inscribirEspera() {
    if (!nombre.trim() || !id || !servicio || !fecha) return
    setEnviandoEspera(true)
    await supabase.from('lista_espera').insert({
      negocio_id: id,
      servicio_id: servicio.id,
      cliente_nombre: nombre.trim(),
      cliente_telefono: telefono.trim() || null,
      cliente_email: email.trim() || null,
      fecha,
    })
    setEnviandoEspera(false)
    setListaEsperaEnviada(true)
  }

  async function confirmar() {
    if (!nombre.trim()) { setError('Introduce tu nombre'); return }
    if (!telefono.trim()) { setError('Introduce tu teléfono'); return }
    if (!servicio) { setError('Selecciona un servicio'); return }
    if (!id) { setError('Error: negocio no identificado'); return }
    if (!captchaToken) { setError('Por favor completa la verificación de seguridad'); return }
    setError(''); setEnviando(true)
    const captchaOk = await verifyCaptcha(captchaToken)
    if (!captchaOk) { setError('Verificación de seguridad fallida. Inténtalo de nuevo.'); setEnviando(false); captchaRef.current?.resetCaptcha(); setCaptchaToken(''); return }

    const nombreSanitized  = sanitizeField(nombre, 100)
    const telefonoSanitized = sanitizeField(telefono, 20)
    const emailSanitized   = sanitizeField(email, 254)

    const { error: err } = await supabase.rpc('crear_reserva', {
      p_negocio_id: id,
      p_servicio_id: servicio.id,
      p_trabajador_id: trabajador?.id || null,
      p_cliente_nombre: nombreSanitized,
      p_cliente_telefono: telefonoSanitized,
      p_cliente_email: emailSanitized || null,
      p_fecha: fecha,
      p_hora: hora,
    })

    captchaRef.current?.resetCaptcha()
    setCaptchaToken('')

    if (err) {
      setError(`Error al guardar: ${err.message}${err.details ? ' — ' + err.details : ''}`)
      console.error('[reservar] insert error:', err)
      setEnviando(false)
      return
    }

    // Guardar teléfono y vincular reserva al usuario (historial cross-device)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      if (telefono.trim()) {
        supabase.from('profiles').update({ telefono: telefono.trim() }).eq('id', session.user.id).then(() => {})
      }
      // Vincular la reserva recién creada al user_id para que aparezca en móvil/PC
      supabase.from('reservas')
        .update({ user_id: session.user.id })
        .eq('negocio_id', id)
        .eq('fecha', fecha)
        .eq('hora', hora)
        .is('user_id', null)
        .then(() => {})
    }

    // Fire confirmation email (non-blocking, without needing the new row ID)
    fetch('/api/reservas/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ negocio_id: id, cliente_email: email.trim(), fecha, hora }),
    }).catch(() => {})

    setPaso(5)
  }

  function avanzarServicio(s: Servicio) {
    setServicio(s)
    // Si no hay trabajadores o solo hay uno, saltar ese paso
    if (trabajadores.length <= 1) {
      setTrabajador(trabajadores[0] || null)
      setPaso(2)
    } else {
      setPaso(1)
    }
  }

  if (cargandoInit) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #F7F9FC !important; font-family: 'Plus Jakarta Sans', sans-serif; color: #111827; }
        .topnav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
        .page { max-width: 520px; margin: 0 auto; padding: 24px 16px 48px; }
        .progress-bar { display: flex; gap: 4px; margin-bottom: 28px; }
        .progress-step { flex: 1; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.08); transition: background 0.3s; }
        .progress-step.done { background: #1D4ED8; }
        .step-header { margin-bottom: 22px; }
        .step-header h2 { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 4px; }
        .step-header p { font-size: 14px; color: #6B7280; }
        .opcion-lista { display: flex; flex-direction: column; gap: 10px; }
        .opcion { display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: white; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 14px; cursor: pointer; transition: all 0.15s; }
        .opcion:hover { border-color: #1D4ED8; box-shadow: 0 0 0 3px rgba(29,78,216,0.07); }
        .opcion.selected { border-color: #1D4ED8; background: rgba(184,216,248,0.1); }
        .opcion-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(184,216,248,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .opcion-nombre { font-size: 15px; font-weight: 700; color: #111827; }
        .opcion-sub { font-size: 13px; color: #6B7280; margin-top: 2px; }
        .opcion-precio { font-size: 16px; font-weight: 800; color: #111827; margin-left: auto; flex-shrink: 0; }
        /* Calendario */
        .cal { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden; }
        .cal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .cal-mes { font-size: 15px; font-weight: 700; color: #111827; text-transform: capitalize; }
        .cal-nav { background: none; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: #4B5563; }
        .cal-body { padding: 12px; }
        .cal-dias-semana { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 6px; }
        .cal-dia-nombre { text-align: center; font-size: 11px; font-weight: 700; color: #9CA3AF; padding: 4px 0; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .cal-dia { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; border-radius: 8px; cursor: default; color: #9CA3AF; }
        .cal-dia.disponible { color: #111827; cursor: pointer; }
        .cal-dia.disponible:hover { background: rgba(184,216,248,0.3); color: #1D4ED8; }
        .cal-dia.hoy { font-weight: 800; }
        .cal-dia.seleccionado { background: #1D4ED8 !important; color: white !important; font-weight: 700; }
        /* Slots */
        .slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .slot { padding: 11px 8px; background: white; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 10px; text-align: center; font-size: 14px; font-weight: 600; color: #111827; cursor: pointer; transition: all 0.15s; }
        .slot:hover { border-color: #1D4ED8; color: #1D4ED8; background: rgba(184,216,248,0.1); }
        .slot.selected { background: #1D4ED8; color: white; border-color: #1D4ED8; }
        /* Formulario */
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px; }
        .field input { width: 100%; padding: 13px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 16px; color: #111827; outline: none; background: white; -webkit-appearance: none; }
        .field input:focus { border-color: #1D4ED8; }
        /* Resumen */
        .resumen { background: rgba(184,216,248,0.1); border: 1.5px solid rgba(184,216,248,0.4); border-radius: 14px; padding: 16px 18px; margin-bottom: 20px; }
        .resumen-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14px; }
        .resumen-row:not(:last-child) { border-bottom: 1px solid rgba(0,0,0,0.06); }
        .resumen-label { color: #6B7280; font-weight: 500; }
        .resumen-val { color: #111827; font-weight: 700; }
        /* Botones nav */
        .btn-primary { width: 100%; padding: 15px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 20px; min-height: 44px; }
        .btn-primary:disabled { background: #9CA3AF; cursor: not-allowed; }
        .btn-back { background: none; border: none; font-family: inherit; font-size: 14px; font-weight: 600; color: #6B7280; cursor: pointer; padding: 8px 0; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; min-height: 44px; }
        .error-msg { background: rgba(251,207,232,0.3); color: #B5467A; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-top: 12px; }
        /* Worker avatar circle */
        .worker-circle { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; flex-shrink: 0; letter-spacing: -0.5px; }
        .opcion-especialidad { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
        /* Horizontal day strip */
        .day-strip-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 8px; }
        .day-strip-wrap::-webkit-scrollbar { height: 3px; }
        .day-strip-wrap::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 2px; }
        .day-strip { display: flex; gap: 8px; padding: 4px 2px 8px; width: max-content; }
        .day-chip { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 12px; min-width: 52px; border-radius: 14px; cursor: pointer; border: 1.5px solid rgba(0,0,0,0.08); background: white; transition: all 0.15s; }
        .day-chip.cerrado { cursor: default; opacity: 0.4; }
        .day-chip.cerrado .day-num { text-decoration: line-through; }
        .day-chip.disponible:hover { border-color: #1D4ED8; box-shadow: 0 0 0 3px rgba(29,78,216,0.07); }
        .day-chip.seleccionado { background: #1D4ED8; border-color: #1D4ED8; color: white !important; }
        .day-chip.seleccionado .day-label, .day-chip.seleccionado .day-num, .day-chip.seleccionado .day-month { color: white !important; }
        .day-chip.es-hoy .day-num { font-weight: 800; }
        .day-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; }
        .day-num { font-size: 20px; font-weight: 800; color: #111827; line-height: 1; }
        .day-month { font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; }
        /* Slot list */
        .slot-list { display: flex; flex-direction: column; gap: 8px; }
        .slot-item { display: flex; align-items: center; padding: 13px 16px; background: white; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 12px; cursor: pointer; transition: all 0.15s; gap: 14px; }
        .slot-item:hover { border-color: #1D4ED8; box-shadow: 0 0 0 3px rgba(29,78,216,0.07); }
        .slot-item.selected { background: #1D4ED8; border-color: #1D4ED8; }
        .slot-item.selected .slot-hora, .slot-item.selected .slot-precio { color: white; }
        .slot-item.ocupado { background: #F9FAFB; cursor: not-allowed; opacity: 0.5; }
        .slot-item.ocupado .slot-hora { text-decoration: line-through; color: #9CA3AF; }
        .slot-dot { width: 8px; height: 8px; border-radius: 50%; background: #34D399; flex-shrink: 0; }
        .slot-item.ocupado .slot-dot { background: #F87171; }
        .slot-item.selected .slot-dot { background: rgba(255,255,255,0.6); }
        .slot-hora { font-size: 16px; font-weight: 800; color: #111827; flex: 1; }
        .slot-precio { font-size: 14px; font-weight: 700; color: #6B7280; }
        .slot-tag { font-size: 11px; font-weight: 700; color: #F87171; background: rgba(248,113,113,0.1); padding: 2px 8px; border-radius: 100px; }
        /* Éxito */
        .exito { text-align: center; padding: 40px 20px; }
        .exito-icon { font-size: 64px; margin-bottom: 16px; }
        .exito-titulo { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 8px; }
        .exito-sub { font-size: 14px; color: #6B7280; line-height: 1.6; margin-bottom: 28px; }
        .exito-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 18px; text-align: left; margin-bottom: 20px; }
        .exito-card-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .exito-card-row:last-child { border-bottom: none; }
        /* Chatbot widget */
        .chat-fab { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #D4C5F9, #B8D8F8); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 200; transition: transform 0.2s; }
        .chat-fab:hover { transform: scale(1.08); }
        .chat-panel { position: fixed; bottom: 96px; right: 24px; width: 340px; height: 480px; background: white; border: 1px solid rgba(0,0,0,0.1); border-radius: 20px; box-shadow: 0 12px 40px rgba(0,0,0,0.15); z-index: 200; display: flex; flex-direction: column; overflow: hidden; }
        .chat-head { padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,0.07); display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, rgba(212,197,249,0.15), rgba(184,216,248,0.15)); }
        .chat-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #D4C5F9, #B8D8F8); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .chat-head-name { font-size: 13px; font-weight: 700; color: #111827; }
        .chat-head-status { font-size: 11px; color: #2E8A5E; display: flex; align-items: center; gap: 3px; }
        .chat-head-close { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 18px; color: #9CA3AF; line-height: 1; }
        .chat-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .chat-bubble { max-width: 82%; padding: 9px 12px; border-radius: 14px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
        .chat-bubble-bot { background: #F7F9FC; color: #111827; border-bottom-left-radius: 4px; align-self: flex-start; }
        .chat-bubble-user { background: linear-gradient(135deg, #D4C5F9 0%, #B8D8F8 100%); color: #111827; border-bottom-right-radius: 4px; align-self: flex-end; }
        .chat-input-row { padding: 10px; border-top: 1px solid rgba(0,0,0,0.07); display: flex; gap: 8px; }
        .chat-input-field { flex: 1; padding: 9px 13px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 100px; font-family: inherit; font-size: 13px; color: #111827; outline: none; }
        .chat-input-field:focus { border-color: #6B4FD8; }
        .chat-send { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #D4C5F9, #B8D8F8); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .chat-typing { display: flex; gap: 3px; align-items: center; padding: 9px 12px; background: #F7F9FC; border-radius: 14px; border-bottom-left-radius: 4px; align-self: flex-start; }
        .chat-typing span { width: 5px; height: 5px; border-radius: 50%; background: #9CA3AF; animation: tb 1.2s infinite; }
        .chat-typing span:nth-child(2) { animation-delay: 0.2s; }
        .chat-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes tb { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
        @media (max-width: 400px) { .chat-panel { width: calc(100vw - 32px); right: 16px; } }
        @media (max-width: 768px) {
          input, select, textarea { font-size: 16px !important; }
          .page { padding: 16px 16px 48px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <nav className="topnav">
        <Link href={`/negocio/${id}`} style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <span style={{fontSize:'13px', color:'#6B7280', fontWeight:600}}>{negocioNombre}</span>
      </nav>

      <div className="page">

        {/* PASO 5: ÉXITO */}
        {paso === 5 && (
          <div className="exito">
            <div className="exito-icon">🎉</div>
            <div className="exito-titulo">¡Cita confirmada!</div>
            <div className="exito-sub">Tu reserva ha sido registrada correctamente. Te esperamos.</div>
            <div className="exito-card">
              <div className="exito-card-row"><span style={{color:'#6B7280'}}>Servicio</span><span style={{fontWeight:700}}>{servicio?.nombre}</span></div>
              {trabajador && <div className="exito-card-row"><span style={{color:'#6B7280'}}>Profesional</span><span style={{fontWeight:700}}>{trabajador.nombre}</span></div>}
              <div className="exito-card-row"><span style={{color:'#6B7280'}}>Fecha</span><span style={{fontWeight:700}}>{fecha && new Date(fecha+'T00:00:00').toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'})}</span></div>
              <div className="exito-card-row"><span style={{color:'#6B7280'}}>Hora</span><span style={{fontWeight:700}}>{hora}</span></div>
              <div className="exito-card-row"><span style={{color:'#6B7280'}}>Nombre</span><span style={{fontWeight:700}}>{nombre}</span></div>
            </div>
            <Link href={`/negocio/${id}`} style={{display:'block', width:'100%', padding:'14px', background:'#111827', color:'white', border:'none', borderRadius:'12px', fontFamily:'inherit', fontSize:'15px', fontWeight:700, textAlign:'center', textDecoration:'none'}}>
              Volver al negocio
            </Link>
          </div>
        )}

        {paso < 5 && (
          <>
            {/* Barra de progreso: pasos 0–4 */}
            <div className="progress-bar">
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`progress-step ${i < paso ? 'done' : i === paso ? 'done' : ''}`}
                  style={i < paso ? {background:'#1D4ED8'} : i === paso ? {background:'rgba(29,78,216,0.35)'} : {}}
                />
              ))}
            </div>

            {/* PASO 0: SERVICIO */}
            {paso === 0 && (
              <>
                <div className="step-header">
                  <h2>¿Qué servicio necesitas?</h2>
                  <p>Selecciona el servicio que quieres reservar</p>
                </div>
                {servicios.length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px', color:'#9CA3AF', fontSize:'14px'}}>Este negocio aún no tiene servicios configurados.</div>
                ) : (
                  <div className="opcion-lista">
                    {servicios.map(s => (
                      <div key={s.id} className={`opcion ${servicio?.id === s.id ? 'selected' : ''}`}
                        onClick={() => avanzarServicio(s)}
                        onTouchEnd={(e) => { e.preventDefault(); avanzarServicio(s) }}
                      >
                        <div className="opcion-icon">🔧</div>
                        <div>
                          <div className="opcion-nombre">{s.nombre}</div>
                          <div className="opcion-sub">⏱ {s.duracion} min</div>
                        </div>
                        <div className="opcion-precio">€{s.precio.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* PASO 1: TRABAJADOR */}
            {paso === 1 && (
              <>
                <button className="btn-back" onClick={() => setPaso(0)}>← Atrás</button>
                <div className="step-header">
                  <h2>¿Con quién quieres ir?</h2>
                  <p>Elige tu profesional de confianza</p>
                </div>
                <div className="opcion-lista">
                  <div className={`opcion ${!trabajador ? 'selected' : ''}`}
                    onClick={() => { setTrabajador(null); setPaso(2) }}
                    onTouchEnd={(e) => { e.preventDefault(); setTrabajador(null); setPaso(2) }}
                  >
                    <div className="worker-circle" style={{background:'rgba(156,163,175,0.15)', color:'#6B7280', fontSize:'20px'}}>🎲</div>
                    <div>
                      <div className="opcion-nombre">Sin preferencia</div>
                      <div className="opcion-sub">Cualquier profesional disponible</div>
                    </div>
                  </div>
                  {trabajadores.map((t, idx) => {
                    const initials = t.nombre.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()
                    return (
                      <div key={t.id} className={`opcion ${trabajador?.id === t.id ? 'selected' : ''}`}
                        onClick={() => { setTrabajador(t); setPaso(2) }}
                        onTouchEnd={(e) => { e.preventDefault(); setTrabajador(t); setPaso(2) }}
                      >
                        <div className="worker-circle" style={{background: trabajadorBg(t, idx), color: trabajadorColor(t, idx)}}>
                          {initials}
                        </div>
                        <div>
                          <div className="opcion-nombre">{t.nombre}</div>
                          {t.especialidad && <div className="opcion-especialidad">{t.especialidad}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* PASO 2: FECHA */}
            {paso === 2 && (
              <>
                <button className="btn-back" onClick={() => setPaso(trabajadores.length > 1 ? 1 : 0)}>← Atrás</button>
                <div className="step-header">
                  <h2>¿Qué día te viene bien?</h2>
                  <p>Desliza para ver más fechas · días tachados cerrados</p>
                </div>
                <div className="day-strip-wrap">
                  <div className="day-strip">
                    {Array.from({ length: Math.ceil(negocioAgenda.anteMax / 1440) }).map((_, i) => {
                      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i)
                      const y = d.getFullYear(), m = d.getMonth(), day = d.getDate()
                      const fechaISO = formatFecha(y, m, day)
                      const disp = diaDisponible(y, m, day)
                      const esHoy = i === 0
                      const selec = fecha === fechaISO
                      const labelDia = diasSemana[(d.getDay() + 6) % 7]
                      const labelMes = mesesNombre[m].slice(0,3).toUpperCase()
                      return (
                        <div
                          key={fechaISO}
                          className={`day-chip ${disp ? 'disponible' : 'cerrado'} ${selec ? 'seleccionado' : ''} ${esHoy ? 'es-hoy' : ''}`}
                          onClick={() => {
                            if (!disp) return
                            setFecha(fechaISO); setHora(''); setListaEsperaMode(false); setListaEsperaEnviada(false); setPaso(3)
                          }}
                          onTouchEnd={(e) => {
                            if (!disp) return
                            e.preventDefault()
                            setFecha(fechaISO); setHora(''); setListaEsperaMode(false); setListaEsperaEnviada(false); setPaso(3)
                          }}
                        >
                          <span className="day-label">{labelDia}</span>
                          <span className="day-num">{day}</span>
                          <span className="day-month">{labelMes}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* PASO 3: HORA */}
            {paso === 3 && (
              <>
                <button className="btn-back" onClick={() => { setHora(''); setPaso(2) }}>← Atrás</button>
                <div className="step-header">
                  <h2>¿A qué hora?</h2>
                  <p>{fecha && new Date(fecha+'T00:00:00').toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'})}</p>
                </div>
                {cargandoSlots ? (
                  <div style={{textAlign:'center', padding:'40px', color:'#9CA3AF', fontSize:'14px'}}>Comprobando disponibilidad…</div>
                ) : slots().length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px', color:'#9CA3AF', fontSize:'14px'}}>No hay horas disponibles este día</div>
                ) : (
                  <>
                    <div className="slot-list">
                      {slots().map(s => {
                        const ocupado = horasOcupadas.has(s)
                        return (
                          <div
                            key={s}
                            className={`slot-item ${ocupado ? 'ocupado' : ''} ${hora === s ? 'selected' : ''}`}
                            onClick={() => { if (!ocupado) { setHora(s); setPaso(4) } }}
                            onTouchEnd={(e) => { if (!ocupado) { e.preventDefault(); setHora(s); setPaso(4) } }}
                          >
                            <span className="slot-dot" />
                            <span className="slot-hora">{s}</span>
                            {ocupado
                              ? <span className="slot-tag">Ocupado</span>
                              : <span className="slot-precio">{servicio ? `€${servicio.precio.toFixed(2)}` : ''}</span>
                            }
                          </div>
                        )
                      })}
                    </div>

                    {/* Lista de espera — mostrar si TODOS los slots están ocupados */}
                    {slots().length > 0 && slots().every(s => horasOcupadas.has(s)) && (
                      <div style={{marginTop:'20px', padding:'18px', background:'rgba(253,230,138,0.15)', border:'1.5px solid rgba(253,230,138,0.5)', borderRadius:'14px'}}>
                        <div style={{fontSize:'15px', fontWeight:700, color:'#92400E', marginBottom:'6px'}}>⏳ Agenda completa este día</div>
                        <div style={{fontSize:'13px', color:'#6B7280', marginBottom:'14px'}}>Apúntate y te avisamos si se libera una plaza.</div>

                        {listaEsperaEnviada ? (
                          <div style={{textAlign:'center', padding:'12px', background:'rgba(184,237,212,0.3)', borderRadius:'10px', fontSize:'14px', fontWeight:700, color:'#166534'}}>
                            ✓ ¡Apuntado! Te avisaremos si se libera algo.
                          </div>
                        ) : listaEsperaMode ? (
                          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            <input
                              type="text"
                              placeholder="Tu nombre *"
                              value={nombre}
                              onChange={e => setNombre(e.target.value)}
                              style={{padding:'12px 14px', border:'1.5px solid rgba(0,0,0,0.1)', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', outline:'none'}}
                            />
                            <input
                              type="tel"
                              placeholder="Teléfono (opcional)"
                              value={telefono}
                              onChange={e => setTelefono(e.target.value)}
                              style={{padding:'12px 14px', border:'1.5px solid rgba(0,0,0,0.1)', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', outline:'none'}}
                            />
                            <input
                              type="email"
                              placeholder="Email para avisar *"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              style={{padding:'12px 14px', border:'1.5px solid rgba(0,0,0,0.1)', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', outline:'none'}}
                            />
                            <button
                              onClick={inscribirEspera}
                              onTouchEnd={(e) => { e.preventDefault(); inscribirEspera() }}
                              disabled={enviandoEspera || !nombre.trim() || !email.trim()}
                              style={{padding:'13px', background:'#92400E', color:'white', border:'none', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', fontWeight:700, cursor:'pointer', opacity: enviandoEspera ? 0.6 : 1, minHeight:'44px'}}
                            >
                              {enviandoEspera ? 'Apuntando...' : '⏳ Apuntarme a la lista de espera'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setListaEsperaMode(true)}
                            onTouchEnd={(e) => { e.preventDefault(); setListaEsperaMode(true) }}
                            style={{width:'100%', padding:'13px', background:'#92400E', color:'white', border:'none', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', fontWeight:700, cursor:'pointer', minHeight:'44px'}}
                          >
                            ⏳ Apuntarme a la lista de espera
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* PASO 4: DATOS + CONFIRMAR */}
            {paso === 4 && (
              <>
                <button className="btn-back" onClick={() => setPaso(3)}>← Atrás</button>
                <div className="step-header">
                  <h2>Confirma tu cita</h2>
                  <p>Introduce tus datos para finalizar</p>
                </div>

                <div className="resumen">
                  <div className="resumen-row"><span className="resumen-label">Negocio</span><span className="resumen-val">{negocioNombre}</span></div>
                  <div className="resumen-row"><span className="resumen-label">Servicio</span><span className="resumen-val">{servicio?.nombre}</span></div>
                  {trabajador && <div className="resumen-row"><span className="resumen-label">Profesional</span><span className="resumen-val">{trabajador.nombre}</span></div>}
                  <div className="resumen-row"><span className="resumen-label">Fecha</span><span className="resumen-val">{new Date(fecha+'T00:00:00').toLocaleDateString('es-ES', {weekday:'short', day:'numeric', month:'short'})}</span></div>
                  <div className="resumen-row"><span className="resumen-label">Hora</span><span className="resumen-val">{hora}</span></div>
                  <div className="resumen-row"><span className="resumen-label">Precio</span><span className="resumen-val">€{servicio?.precio.toFixed(2)}</span></div>
                  {nombre && <div className="resumen-row"><span className="resumen-label">Nombre</span><span className="resumen-val">{nombre}</span></div>}
                  {telefono && <div className="resumen-row"><span className="resumen-label">Teléfono</span><span className="resumen-val">{telefono}</span></div>}
                </div>

                {/* Política de cancelación */}
                <div style={{padding:'12px 16px', background:'rgba(184,216,248,0.12)', border:'1px solid rgba(184,216,248,0.4)', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', color:'#374151', lineHeight:1.6}}>
                  <span style={{fontWeight:700, color:'#1D4ED8'}}>ℹ️ Política de cancelación:</span> Puedes cancelar hasta <strong>{negocioPolitica.horas === 1 ? '1 hora' : `${negocioPolitica.horas} horas`} antes</strong> de la cita sin penalización.
                  {negocioPolitica.mensaje && (
                    <div style={{marginTop:'6px', color:'#6B7280', fontStyle:'italic'}}>"{negocioPolitica.mensaje}"</div>
                  )}
                </div>

                <div className="field">
                  <label>Tu nombre</label>
                  <input type="text" placeholder="María García" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" />
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input type="tel" placeholder="612 345 678" value={telefono} onChange={e => setTelefono(e.target.value)} autoComplete="tel" inputMode="tel" />
                </div>
                <div className="field">
                  <label>Email <span style={{fontSize:'11px', color:'#6366F1', fontWeight:600}}>(para confirmación y ver tu historial)</span></label>
                  <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
                </div>

                <div style={{ margin: '16px 0 4px', display: 'flex', justifyContent: 'center' }}>
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={HCAPTCHA_SITEKEY}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken('')}
                    onError={() => setCaptchaToken('')}
                  />
                </div>

                {error && <div className="error-msg">{error}</div>}

                <button className="btn-primary"
                  onClick={confirmar}
                  onTouchEnd={(e) => { e.preventDefault(); if (!enviando) confirmar() }}
                  disabled={enviando}
                >
                  {enviando ? 'Confirmando...' : '✓ Confirmar reserva'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Floating chatbot widget */}
      {!cargandoInit && servicios.length > 0 && (
        <>
          {chatOpen && (
            <div className="chat-panel">
              <div className="chat-head">
                <div className="chat-avatar">🤖</div>
                <div>
                  <div className="chat-head-name">Asistente IA</div>
                  <div className="chat-head-status"><span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#2E8A5E',display:'inline-block'}} />En línea</div>
                </div>
                <button className="chat-head-close" onClick={() => setChatOpen(false)}>×</button>
              </div>
              <div className="chat-body" ref={chatBodyRef}>
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role === 'bot' ? 'chat-bubble-bot' : 'chat-bubble-user'}`}>
                    {m.text}
                  </div>
                ))}
                {chatEnviando && (
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                )}
              </div>
              <div className="chat-input-row">
                <input
                  ref={chatInputRef}
                  className="chat-input-field"
                  placeholder="Escribe un mensaje..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarChatMsg() } }}
                  disabled={chatEnviando}
                />
                <button
                  className="chat-send"
                  onClick={enviarChatMsg}
                  onTouchEnd={(e) => { e.preventDefault(); enviarChatMsg() }}
                  disabled={chatEnviando || !chatInput.trim()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#6B4FD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
          <button className="chat-fab" onClick={abrirChat} onTouchEnd={(e) => { e.preventDefault(); abrirChat() }} title="Reservar con asistente IA">
            {chatOpen ? '×' : '🤖'}
          </button>
        </>
      )}
    </>
  )
}
