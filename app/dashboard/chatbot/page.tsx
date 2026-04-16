'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { NegocioSelector } from '../NegocioSelector'
import {
  verificarDisponibilidad,
  crearReserva,
  buscarReservas,
  cancelarReserva,
  FUNCTION_DECLARATIONS,
} from '../../lib/chatbotFunctions'

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

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`

type Msg = { role: 'user' | 'bot'; text: string; ts: Date }

type NegocioInfo = {
  id: string; nombre: string; tipo: string; descripcion: string | null
  direccion: string | null; ciudad: string | null; telefono: string | null
}
type ServicioInfo = { id: string; nombre: string; precio: number; duracion: number }
type TrabajadorInfo = { id: string; nombre: string; especialidad: string | null }
type HorarioInfo = { dia: string; abierto: boolean; apertura: string; cierre: string; apertura2: string | null; cierre2: string | null }

const DIAS_ES: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
}

function buildSystemPrompt(
  negocio: NegocioInfo,
  config: { nombreBot: string; bienvenida: string; tono: string },
  horarios: HorarioInfo[],
  servicios: ServicioInfo[],
  trabajadores: TrabajadorInfo[]
): string {
  const tonoDesc = config.tono === 'formal'
    ? 'formal y profesional, usando usted'
    : config.tono === 'amigable'
    ? 'amigable y cercano, usando tú, con emojis ocasionales'
    : 'profesional pero accesible, usando tú'

  const horariosText = horarios
    .filter(h => h.abierto)
    .map(h => {
      const turno2 = h.apertura2 ? ` y de ${h.apertura2} a ${h.cierre2}` : ''
      return `  - ${DIAS_ES[h.dia] || h.dia}: ${h.apertura}–${h.cierre}${turno2}`
    }).join('\n')
  const cerrados = horarios.filter(h => !h.abierto).map(h => DIAS_ES[h.dia] || h.dia).join(', ')

  const serviciosText = servicios.map(s =>
    `  - ID:${s.id} | ${s.nombre} | ${s.precio}€ | ${s.duracion} min`
  ).join('\n')

  const trabajadoresText = trabajadores.length > 0
    ? trabajadores.map(t => `  - ID:${t.id} | ${t.nombre}${t.especialidad ? ` (${t.especialidad})` : ''}`).join('\n')
    : '  (No hay trabajadores registrados)'

  return `Eres ${config.nombreBot}, el asistente virtual de ${negocio.nombre}, un negocio de tipo ${negocio.tipo}.
Tu tono es ${tonoDesc}.
Responde siempre en español. Sé conciso: máximo 3-4 frases por respuesta salvo que se pida información extensa.

== INFORMACIÓN DEL NEGOCIO ==
Nombre: ${negocio.nombre}
Tipo: ${negocio.tipo}
${negocio.descripcion ? `Descripción: ${negocio.descripcion}` : ''}
${negocio.direccion ? `Dirección: ${negocio.direccion}` : ''}
${negocio.ciudad ? `Ciudad: ${negocio.ciudad}` : ''}
${negocio.telefono ? `Teléfono: ${negocio.telefono}` : ''}

== HORARIOS ==
Días abiertos:
${horariosText || '  (Sin horarios configurados)'}
${cerrados ? `Días cerrados: ${cerrados}` : ''}

== SERVICIOS (ID | nombre | precio | duración) ==
${serviciosText || '  (Sin servicios)'}

== EQUIPO (ID | nombre | especialidad) ==
${trabajadoresText}

== CAPACIDADES ==
Tienes acceso a funciones para gestionar reservas. Úsalas cuando el cliente lo necesite:

- Para RESERVAR: recoge paso a paso nombre, teléfono, servicio, trabajador (opcional), fecha, hora y email (opcional, para enviar confirmación).
  SIEMPRE llama primero a verificarDisponibilidad antes de crearReserva.
  Si no está disponible, muestra los slots sugeridos y pregunta por otra hora.

- Para CANCELAR: pide el teléfono, llama a buscarReservas, muestra la lista y cuando el cliente
  confirme qué reserva cancelar, llama a cancelarReserva con el ID.

Si no puedes ayudar con algo, indica que contacte directamente con ${negocio.nombre}${negocio.telefono ? ` al ${negocio.telefono}` : ''}.`
}

export default function ChatbotPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // Datos negocio
  const [negocio, setNegocio] = useState<NegocioInfo | null>(null)
  const [servicios, setServicios] = useState<ServicioInfo[]>([])
  const [trabajadores, setTrabajadores] = useState<TrabajadorInfo[]>([])
  const [horarios, setHorarios] = useState<HorarioInfo[]>([])

  // Config chatbot
  const [activo, setActivo] = useState(true)
  const [nombreBot, setNombreBot] = useState('Asistente')
  const [bienvenida, setBienvenida] = useState('¡Hola! ¿En qué puedo ayudarte hoy?')
  const [tono, setTono] = useState<'formal' | 'amigable' | 'profesional'>('profesional')
  const [configGuardada, setConfigGuardada] = useState(false)
  const [guardandoConfig, setGuardandoConfig] = useState(false)

  // Chat preview
  const [mensajes, setMensajes] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [chatIniciado, setChatIniciado] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user

      const { activo: negBase, todos: todosNegs } = await getNegocioActivo(user.id, session.access_token)
      if (!negBase) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todosNegs)
      // Re-fetch full fields for chatbot
      const { data: neg } = await db.from('negocios')
        .select('id, nombre, tipo, descripcion, direccion, ciudad, telefono')
        .eq('id', negBase.id).single()
      if (!neg) { setCargando(false); return }

      setNegocioId(neg.id)
      setNegocio(neg)
      setNombreBot(`Asistente de ${neg.nombre}`)
      setBienvenida(`¡Hola! Soy el asistente de ${neg.nombre}. ¿En qué puedo ayudarte?`)

      const [{ data: svcs }, { data: trabs }, { data: hors }, { data: cfg }] = await Promise.all([
        db.from('servicios').select('id, nombre, precio, duracion').eq('negocio_id', neg.id).eq('activo', true),
        db.from('trabajadores').select('id, nombre, especialidad').eq('negocio_id', neg.id).eq('activo', true),
        db.from('horarios').select('dia, abierto, hora_apertura, hora_cierre, hora_apertura2, hora_cierre2').eq('negocio_id', neg.id),
        db.from('chatbot_config').select('*').eq('negocio_id', neg.id).single(),
      ])

      if (svcs) setServicios(svcs.map((s: any) => ({ id: s.id, nombre: s.nombre, precio: s.precio || 0, duracion: s.duracion || 30 })))
      if (trabs) setTrabajadores(trabs.map((t: any) => ({ id: t.id, nombre: t.nombre, especialidad: t.especialidad || null })))
      if (hors) setHorarios(hors.map((h: any) => ({
        dia: h.dia, abierto: h.abierto,
        apertura: h.hora_apertura || '09:00', cierre: h.hora_cierre || '18:00',
        apertura2: h.hora_apertura2 || null, cierre2: h.hora_cierre2 || null,
      })))
      if (cfg) {
        setActivo(cfg.activo ?? true)
        if (cfg.nombre_bot) setNombreBot(cfg.nombre_bot)
        if (cfg.bienvenida) setBienvenida(cfg.bienvenida)
        if (cfg.tono) setTono(cfg.tono)
      }

      setCargando(false)
    })()
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [mensajes])

  function iniciarChat() {
    setChatIniciado(true)
    setMensajes([{ role: 'bot', text: bienvenida, ts: new Date() }])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function resetChat() {
    setChatIniciado(false)
    setMensajes([])
    setInput('')
  }

  const addMsg = useCallback((msg: Msg) => {
    setMensajes(prev => [...prev, msg])
  }, [])

  async function enviarMensaje() {
    const texto = input.trim()
    if (!texto || enviando || !negocio || !negocioId) return

    setInput('')
    setEnviando(true)
    addMsg({ role: 'user', text: texto, ts: new Date() })

    try {
      const systemPrompt = buildSystemPrompt(
        negocio,
        { nombreBot, bienvenida, tono },
        horarios, servicios, trabajadores
      )

      // Build history (exclude welcome msg)
      const historial: any[] = mensajes
        .filter(m => !(m.role === 'bot' && m.text === bienvenida))
        .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
      historial.push({ role: 'user', parts: [{ text: texto }] })

      // Function Calling loop (max 5 iterations)
      for (let i = 0; i < 5; i++) {
        const res = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: historial,
            tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
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
                fnResult = await verificarDisponibilidad({ negocio_id: negocioId, ...args })
                break
              case 'crearReserva':
                fnResult = await crearReserva({ negocio_id: negocioId, ...args })
                break
              case 'buscarReservas':
                fnResult = await buscarReservas({ negocio_id: negocioId, ...args })
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

        // Text response — done
        const textPart = parts.find((p: any) => p.text)
        addMsg({ role: 'bot', text: textPart?.text ?? '...', ts: new Date() })
        break
      }
    } catch (err: any) {
      addMsg({ role: 'bot', text: `Error de conexión: ${err.message}`, ts: new Date() })
    } finally {
      setEnviando(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  async function guardarConfig() {
    if (!negocioId) return
    setGuardandoConfig(true)
    const datos = { negocio_id: negocioId, activo, nombre_bot: nombreBot, bienvenida, tono }
    await supabase.from('chatbot_config').upsert(datos, { onConflict: 'negocio_id' })
    setGuardandoConfig(false)
    setConfigGuardada(true)
    setTimeout(() => setConfigGuardada(false), 3000)
    resetChat()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const statsData = [
    { label: 'Conversaciones este mes', value: '—', icon: '💬' },
    { label: 'Reservas creadas por el bot', value: '—', icon: '📅' },
    { label: 'Tasa de resolución', value: '—', icon: '✅' },
    { label: 'Tiempo medio de respuesta', value: '<2s', icon: '⚡' },
  ]

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
        /* layout dos columnas */
        .two-col { display: grid; grid-template-columns: 1fr 420px; gap: 24px; align-items: start; }
        .left-col { display: flex; flex-direction: column; gap: 20px; }
        /* Cards */
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
        .card-header { padding: 18px 20px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .card-title { font-size: 15px; font-weight: 800; color: var(--text); }
        .card-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .card-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        /* Toggle */
        .toggle-row { display: flex; align-items: center; justify-content: space-between; }
        .toggle-label { font-size: 14px; font-weight: 600; color: var(--text); }
        .toggle-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .toggle-wrap { position: relative; width: 48px; height: 26px; flex-shrink: 0; }
        .toggle-wrap input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-track { position: absolute; inset: 0; border-radius: 100px; background: #E5E7EB; cursor: pointer; transition: background 0.2s; }
        .toggle-track.on { background: #2E8A5E; }
        .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform 0.2s; }
        .toggle-thumb.on { transform: translateX(22px); }
        /* Form */
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .field input, .field textarea { padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; color: var(--text); outline: none; background: var(--white); }
        .field input:focus, .field textarea:focus { border-color: var(--blue-dark); }
        .field textarea { resize: vertical; min-height: 72px; }
        .tono-btns { display: flex; gap: 8px; }
        .tono-btn { flex: 1; padding: 9px 6px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer; text-align: center; }
        .tono-btn.active { background: var(--lila); border-color: var(--lila-dark); color: var(--lila-dark); }
        .btn-guardar { padding: 11px 20px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .btn-guardar:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-guardado { background: var(--green-dark); }
        /* Chat preview */
        .chat-card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; height: 560px; position: sticky; top: 80px; }
        .chat-topbar { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
        .bot-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #D4C5F9, #B8D8F8); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .bot-info { flex: 1; min-width: 0; }
        .bot-nombre { font-size: 13px; font-weight: 700; color: var(--text); }
        .bot-estado { font-size: 11px; color: var(--green-dark); display: flex; align-items: center; gap: 4px; }
        .bot-estado-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green-dark); }
        .btn-reset { background: none; border: none; cursor: pointer; font-size: 11px; color: var(--muted); font-family: inherit; font-weight: 600; padding: 4px 8px; border-radius: 6px; }
        .btn-reset:hover { background: var(--bg); color: var(--text2); }
        .chat-msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
        .chat-start { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: var(--muted); text-align: center; padding: 24px; }
        .chat-start-icon { font-size: 36px; }
        .chat-start-title { font-size: 14px; font-weight: 700; color: var(--text); }
        .chat-start-desc { font-size: 12px; line-height: 1.5; }
        .btn-start { padding: 10px 24px; background: linear-gradient(135deg, #D4C5F9, #B8D8F8); border: none; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--lila-dark); cursor: pointer; }
        .bubble { max-width: 80%; padding: 9px 13px; border-radius: 14px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
        .bubble-bot { background: var(--bg); color: var(--text); border-bottom-left-radius: 4px; align-self: flex-start; }
        .bubble-user { background: linear-gradient(135deg, #D4C5F9 0%, #B8D8F8 100%); color: var(--text); border-bottom-right-radius: 4px; align-self: flex-end; }
        .bubble-ts { font-size: 10px; color: var(--muted); margin-top: 2px; }
        .bubble-ts-bot { align-self: flex-start; }
        .bubble-ts-user { align-self: flex-end; }
        .typing { display: flex; gap: 4px; align-items: center; padding: 10px 14px; background: var(--bg); border-radius: 14px; border-bottom-left-radius: 4px; align-self: flex-start; }
        .typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); animation: typing-bounce 1.2s infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
        .chat-input-row { padding: 12px; border-top: 1px solid var(--border); display: flex; gap: 8px; }
        .chat-input { flex: 1; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 100px; font-family: inherit; font-size: 13px; color: var(--text); outline: none; }
        .chat-input:focus { border-color: var(--lila-dark); }
        .chat-input:disabled { background: var(--bg); color: var(--muted); }
        .btn-send { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #D4C5F9, #B8D8F8); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
        /* Stats */
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 20px; }
        .stat-item { background: var(--bg); border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 10px; }
        .stat-icon { font-size: 20px; }
        .stat-val { font-size: 18px; font-weight: 800; color: var(--text); }
        .stat-label { font-size: 11px; color: var(--muted); font-weight: 500; line-height: 1.3; }
        /* Info chips */
        .info-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 14px 20px; border-top: 1px solid var(--border); }
        .chip { padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }
        .chip-blue { background: var(--blue-soft); color: var(--blue-dark); }
        .chip-lila { background: rgba(212,197,249,0.3); color: var(--lila-dark); }
        .chip-green { background: rgba(184,237,212,0.3); color: var(--green-dark); }
        @media (max-width: 1100px) { .two-col { grid-template-columns: 1fr; } .chat-card { position: static; height: 480px; } }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .tono-btns { flex-wrap: wrap; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/chatbot' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
              <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Chatbot IA</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'var(--muted)', fontWeight:600}}>
              <span style={{width:'8px', height:'8px', borderRadius:'50%', background: activo ? '#2E8A5E' : '#E5E7EB', display:'inline-block'}} />
              {activo ? 'Activo' : 'Inactivo'}
            </div>
            <NegocioSelector negocios={todosNegocios} activoId={negocioId??''} />
          </header>

          {cargando ? (
            <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)'}}>Cargando...</div>
          ) : (
            <main className="content">
              <div className="two-col">

                {/* ── Columna izquierda ── */}
                <div className="left-col">

                  {/* 1. ESTADO */}
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">Estado del chatbot</div>
                        <div className="card-sub">Actívalo para que los clientes puedan usarlo en tu página pública</div>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="toggle-row">
                        <div>
                          <div className="toggle-label">{activo ? 'Chatbot activo' : 'Chatbot inactivo'}</div>
                          <div className="toggle-desc">{activo ? 'Los clientes pueden chatear en tu página de negocio' : 'El widget de chat no se muestra a los clientes'}</div>
                        </div>
                        <div className="toggle-wrap" onClick={() => setActivo(v => !v)}>
                          <div className={`toggle-track ${activo ? 'on' : ''}`} />
                          <div className={`toggle-thumb ${activo ? 'on' : ''}`} />
                        </div>
                      </div>
                    </div>
                    {negocio && (
                      <div className="info-chips">
                        <span className="chip chip-blue">{servicios.length} servicios</span>
                        <span className="chip chip-lila">{trabajadores.length} trabajadores</span>
                        <span className="chip chip-green">{horarios.filter(h => h.abierto).length} días con horario</span>
                      </div>
                    )}
                  </div>

                  {/* 2. CONFIGURACIÓN */}
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">Configuración</div>
                        <div className="card-sub">Personaliza el comportamiento y la voz del asistente</div>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="field">
                        <label>Nombre del bot</label>
                        <input
                          type="text"
                          value={nombreBot}
                          onChange={e => setNombreBot(e.target.value)}
                          placeholder="Ej: Asistente de María, Luna..."
                        />
                      </div>
                      <div className="field">
                        <label>Mensaje de bienvenida</label>
                        <textarea
                          value={bienvenida}
                          onChange={e => setBienvenida(e.target.value)}
                          placeholder="Ej: ¡Hola! ¿En qué puedo ayudarte hoy?"
                        />
                      </div>
                      <div className="field">
                        <label>Tono de comunicación</label>
                        <div className="tono-btns">
                          {(['formal', 'profesional', 'amigable'] as const).map(t => (
                            <button key={t} className={`tono-btn ${tono === t ? 'active' : ''}`} onClick={() => setTono(t)}>
                              {t === 'formal' ? '🎩 Formal' : t === 'profesional' ? '💼 Profesional' : '😊 Amigable'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        className={`btn-guardar ${configGuardada ? 'btn-guardado' : ''}`}
                        onClick={guardarConfig}
                        disabled={guardandoConfig}
                      >
                        {guardandoConfig ? 'Guardando...' : configGuardada ? '✓ Guardado' : '💾 Guardar configuración'}
                      </button>
                    </div>
                  </div>

                  {/* 4. ESTADÍSTICAS */}
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">Estadísticas</div>
                        <div className="card-sub">Datos del mes actual</div>
                      </div>
                    </div>
                    <div className="stats-grid">
                      {statsData.map(s => (
                        <div key={s.label} className="stat-item">
                          <span className="stat-icon">{s.icon}</span>
                          <div>
                            <div className="stat-val">{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* ── 3. PREVIEW CHAT (columna derecha) ── */}
                <div className="chat-card">
                  <div className="chat-topbar">
                    <div className="bot-avatar">🤖</div>
                    <div className="bot-info">
                      <div className="bot-nombre">{nombreBot}</div>
                      <div className="bot-estado">
                        <div className="bot-estado-dot" />
                        {activo ? 'En línea' : 'Inactivo'}
                      </div>
                    </div>
                    {chatIniciado && (
                      <button className="btn-reset" onClick={resetChat}>↺ Reiniciar</button>
                    )}
                  </div>

                  <div className="chat-msgs" ref={chatRef}>
                    {!chatIniciado ? (
                      <div className="chat-start">
                        <div className="chat-start-icon">🤖</div>
                        <div className="chat-start-title">Prueba el chatbot</div>
                        <div className="chat-start-desc">
                          Simula cómo verán el chat tus clientes. Puedes preguntar por servicios, horarios o solicitar una cita.
                        </div>
                        <button className="btn-start" onClick={iniciarChat}>Iniciar conversación</button>
                      </div>
                    ) : (
                      <>
                        {mensajes.map((m, i) => (
                          <div key={i}>
                            <div className={`bubble bubble-${m.role === 'bot' ? 'bot' : 'user'}`}>
                              {m.text}
                            </div>
                            <div className={`bubble-ts bubble-ts-${m.role === 'bot' ? 'bot' : 'user'}`}>
                              {m.ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                        {enviando && (
                          <div className="typing">
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="chat-input-row">
                    <input
                      ref={inputRef}
                      className="chat-input"
                      placeholder={chatIniciado ? 'Escribe un mensaje...' : 'Inicia la conversación primero'}
                      value={input}
                      disabled={!chatIniciado || enviando}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje() } }}
                    />
                    <button className="btn-send" onClick={enviarMensaje} disabled={!chatIniciado || enviando || !input.trim()}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B4FD8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            </main>
          )}
        </div>
      </div>
    </>
  )
}
