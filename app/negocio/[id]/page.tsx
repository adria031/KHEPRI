'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { descontarCreditos } from '../../lib/creditos'
import { LanguageSelector } from '../../components/LanguageSelector'

// ─── helpers ─────────────────────────────────────────────────────────────────

function KhepriLogo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
      <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight:800, fontSize:'17px', letterSpacing:'-0.5px', color:'#111827' }}>Khepria</span>
    </div>
  )
}

const diasLabels: Record<string,string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo',
}
const diasOrden = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']

type Negocio = {
  id:string; nombre:string; tipo:string; descripcion:string;
  telefono:string; direccion:string; ciudad:string; codigo_postal:string;
  instagram:string; whatsapp:string; facebook:string;
  logo_url:string; fotos:string[]; metodos_pago:string[]|null
}
type Horario = { dia:string; abierto:boolean; hora_apertura:string; hora_cierre:string; hora_apertura2:string|null; hora_cierre2:string|null }
type Servicio = { id:string; nombre:string; duracion:number; precio:number; precio_descuento:number|null; descuento_inicio:string|null; descuento_fin:string|null; categoria?:string|null }
type Resena  = { id:string; valoracion:number; texto:string|null; comentario:string|null; created_at:string; autor_nombre:string|null; cliente_nombre:string|null }
type Trabajador = { id:string; nombre:string; especialidad:string|null; foto_url?:string|null }
type ChatMsg = { rol:'usuario'|'bot'; texto:string }

function ofertaActiva(s: Servicio) {
  if (!s.precio_descuento || !s.descuento_inicio || !s.descuento_fin) return false
  const hoy = new Date().toLocaleDateString('en-CA')
  return hoy >= s.descuento_inicio && hoy <= s.descuento_fin
}
function fmtH(h: string) { return h?.slice(0,5) ?? '' }
function horarioTexto(h: Horario) {
  if (!h.abierto) return 'Cerrado'
  const base = `${fmtH(h.hora_apertura)} – ${fmtH(h.hora_cierre)}`
  if (h.hora_apertura2) return `${base} / ${fmtH(h.hora_apertura2)} – ${fmtH(h.hora_cierre2!)}`
  return base
}
function agruparServicios(servicios: Servicio[]): Record<string, Servicio[]> {
  const grupos: Record<string, Servicio[]> = {}
  for (const s of servicios) {
    const cat = (s.categoria && s.categoria.trim()) ? s.categoria.trim() : 'General'
    if (!grupos[cat]) grupos[cat] = []
    grupos[cat].push(s)
  }
  if (Object.keys(grupos).length <= 1) return { todos: servicios }
  return grupos
}

const CAT_PALETTE = [
  { bg:'#EFF6FF', color:'#1D4ED8', border:'rgba(191,219,254,0.6)', dot:'#60A5FA' },
  { bg:'#F5F3FF', color:'#6D28D9', border:'rgba(221,214,254,0.6)', dot:'#A78BFA' },
  { bg:'#ECFDF5', color:'#065F46', border:'rgba(167,243,208,0.6)', dot:'#34D399' },
  { bg:'#FFFBEB', color:'#92400E', border:'rgba(253,230,138,0.6)', dot:'#FBBF24' },
  { bg:'#FFF1F2', color:'#9F1239', border:'rgba(254,205,211,0.6)', dot:'#F87171' },
  { bg:'#F0F9FF', color:'#075985', border:'rgba(186,230,253,0.6)', dot:'#38BDF8' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FichaNegocio() {
  const params = useParams()
  const id = params?.id as string

  const [negocio,    setNegocio]    = useState<Negocio|null>(null)
  const [horarios,   setHorarios]   = useState<Horario[]>([])
  const [servicios,  setServicios]  = useState<Servicio[]>([])
  const [resenas,    setResenas]    = useState<Resena[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [fotoActiva, setFotoActiva] = useState(0)
  const [cargando,   setCargando]   = useState(true)
  const [grupoAbierto, setGrupoAbierto] = useState<string|null>(null)
  const [userId,     setUserId]     = useState<string|null>(null)
  const [esFav,      setEsFav]      = useState(false)
  const [favCargando, setFavCargando] = useState(false)
  const [clientePuntos, setClientePuntos] = useState<number|null>(null)
  const [coordenadas, setCoordenadas] = useState<[number,number]|null>(null)
  // Chat
  const [chatAbierto, setChatAbierto] = useState(false)
  const [mensajes,   setMensajes]   = useState<ChatMsg[]>([])
  const [chatInput,  setChatInput]  = useState('')
  const [chatCargando, setChatCargando] = useState(false)
  const [reservaConfirmada, setReservaConfirmada] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [chatIdioma, setChatIdioma] = useState('es')

  const hoyDia = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][new Date().getDay()]

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('negocios').select('*').eq('id', id).single(),
      supabase.from('horarios').select('*').eq('negocio_id', id),
      supabase.from('servicios').select('*').eq('negocio_id', id).eq('activo', true),
      supabase.from('resenas').select('*').eq('negocio_id', id).order('created_at', { ascending: false }),
      supabase.from('trabajadores').select('id,nombre,especialidad,foto_url').eq('negocio_id', id).eq('activo', true).order('nombre'),
    ]).then(([{data:neg},{data:hor},{data:ser},{data:res},{data:trab}]) => {
      if (neg) setNegocio(neg)
      if (hor) setHorarios(hor)
      if (ser) {
        setServicios(ser)
        const grupos = agruparServicios(ser)
        setGrupoAbierto(Object.keys(grupos)[0])
      }
      if (res) setResenas(res)
      if (trab) setTrabajadores(trab as Trabajador[])
      setCargando(false)
    })
  }, [id])

  // Geocodificar dirección para el mini mapa
  useEffect(() => {
    if (!negocio?.direccion && !negocio?.ciudad) return
    const addr = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?country=ES&limit=1&access_token=${token}`)
      .then(r => r.json())
      .then(d => {
        const coords = d?.features?.[0]?.geometry?.coordinates
        if (coords) setCoordenadas(coords as [number,number])
      })
      .catch(() => {})
  }, [negocio])

  useEffect(() => {
    if (!id) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('favoritos').select('id').eq('user_id', user.id).eq('negocio_id', id).maybeSingle()
        .then(({ data }) => setEsFav(!!data))
      supabase.from('profiles').select('puntos').eq('id', user.id).maybeSingle()
        .then(({ data }) => setClientePuntos((data as { puntos: number | null } | null)?.puntos ?? 0))
    })
  }, [id])

  async function toggleFav() {
    if (!userId) { window.location.href = '/auth'; return }
    setFavCargando(true)
    if (esFav) {
      const { error } = await supabase.from('favoritos').delete().eq('user_id', userId).eq('negocio_id', id)
      if (error) { alert('Error al quitar favorito: ' + error.message); setFavCargando(false); return }
      setEsFav(false)
    } else {
      const { error } = await supabase.from('favoritos').insert({ user_id: userId, negocio_id: id })
      if (error) { alert('Error al guardar favorito: ' + error.message); setFavCargando(false); return }
      setEsFav(true)
    }
    setFavCargando(false)
  }

  function detectarIdioma(): string {
    if (typeof navigator === 'undefined') return 'es'
    const lang = (navigator.language ?? 'es').toLowerCase().split('-')[0]
    if (lang === 'ca') return 'ca'
    if (lang === 'en') return 'en'
    return 'es'
  }

  const BIENVENIDAS: Record<string, string> = {
    es: `¡Hola! 👋 Soy el asistente de ${negocio?.nombre ?? 'este negocio'}. ¿En qué puedo ayudarte?`,
    ca: `Hola! 👋 Soc l'assistent de ${negocio?.nombre ?? 'aquest negoci'}. En què et puc ajudar?`,
    en: `Hi! 👋 I'm the assistant for ${negocio?.nombre ?? 'this business'}. How can I help you?`,
  }

  function abrirChat() {
    const idioma = detectarIdioma()
    setChatIdioma(idioma)
    setChatAbierto(true)
    if (mensajes.length === 0) setMensajes([{ rol: 'bot', texto: BIENVENIDAS[idioma] ?? BIENVENIDAS.es }])
  }

  async function enviarMensaje(textoOverride?: string) {
    const texto = textoOverride ?? chatInput.trim()
    if (!texto || chatCargando) return
    const nuevos: ChatMsg[] = [...mensajes, { rol: 'usuario', texto }]
    setMensajes(nuevos)
    setChatInput('')
    setChatCargando(true)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      const res = await fetch('/api/chat-negocio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nuevos, negocioId: id, idioma: chatIdioma }),
      })
      const data = await res.json()
      const respuesta: string = data.respuesta ?? 'Lo siento, hubo un error.'
      setMensajes(prev => [...prev, { rol: 'bot', texto: respuesta }])

      // Auto-ejecutar reserva cuando el bot genera un bloque [RESERVA:{...}]
      const reservaIdx = respuesta.indexOf('[RESERVA:')
      if (reservaIdx !== -1 && !reservaConfirmada) {
        const jsonStart = reservaIdx + '[RESERVA:'.length
        const jsonEnd = respuesta.indexOf(']', jsonStart)
        if (jsonEnd !== -1) {
          try {
            const datos = JSON.parse(respuesta.slice(jsonStart, jsonEnd))
            if (datos.nombre && datos.telefono && datos.servicio && datos.fecha && datos.hora) {
              await crearReservaChatbot(datos)
            }
          } catch { /* JSON inválido, el confirm button manual servirá de fallback */ }
        }
      }
    } catch {
      setMensajes(prev => [...prev, { rol: 'bot', texto: 'Error de conexión.' }])
    }
    setChatCargando(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function crearReservaChatbot(datos: { nombre:string; telefono:string; servicio:string; trabajador:string; fecha:string; hora:string }) {
    const servMatch = servicios.find(s => s.nombre.toLowerCase().includes(datos.servicio.toLowerCase()) || datos.servicio.toLowerCase().includes(s.nombre.toLowerCase()))
    const trabMatch = datos.trabajador && datos.trabajador !== 'cualquiera'
      ? trabajadores.find(t => t.nombre.toLowerCase().includes(datos.trabajador.toLowerCase()))
      : null
    const { error } = await supabase.rpc('crear_reserva', {
      p_negocio_id: id, p_servicio_id: servMatch?.id ?? null, p_trabajador_id: trabMatch?.id ?? null,
      p_cliente_nombre: datos.nombre, p_cliente_telefono: datos.telefono, p_cliente_email: null,
      p_fecha: datos.fecha, p_hora: datos.hora,
    })
    if (error) {
      setMensajes(prev => [...prev, { rol: 'bot', texto: `No pude crear la reserva: ${error.message}. Intenta reservar directamente.` }])
    } else {
      setReservaConfirmada(true)
      setMensajes(prev => [...prev, { rol: 'bot', texto: `✅ ¡Reserva confirmada!\n\n👤 ${datos.nombre}\n📞 ${datos.telefono}\n✂️ ${datos.servicio}\n📅 ${datos.fecha} a las ${datos.hora}\n\n¡Hasta pronto!` }])
      descontarCreditos(id, 3, 'chatbot_reserva').catch(() => {})
    }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function abrirGPS() {
    if (!negocio) return
    let url: string
    if (coordenadas) {
      // coordenadas es [lng, lat] (formato Mapbox)
      const lat = coordenadas[1]
      const lng = coordenadas[0]
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
      url = isIOS
        ? `maps://maps.apple.com/?daddr=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    } else {
      const addr = encodeURIComponent(`${negocio.direccion ?? ''} ${negocio.ciudad ?? ''}`.trim())
      url = `https://www.google.com/maps/search/${addr}`
    }
    window.open(url, '_blank')
  }

  // ─── Derived ───────────────────────────────────────────────────────────────
  const fotos       = negocio?.fotos?.filter(Boolean) ?? []
  const horarioHoy  = horarios.find(h => h.dia === hoyDia)
  const mediaVal    = resenas.length ? resenas.reduce((a,r) => a + r.valoracion, 0) / resenas.length : 0
  const grupos      = servicios.length ? agruparServicios(servicios) : {}
  const mapToken    = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapSrc      = coordenadas && mapToken
    ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+6366F1(${coordenadas[0]},${coordenadas[1]})/${coordenadas[0]},${coordenadas[1]},15,0/400x180@2x?access_token=${mapToken}`
    : null

  // ─── Loading / Not found ───────────────────────────────────────────────────
  if (cargando) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFF',fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'52px',height:'52px',borderRadius:'16px',background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)',margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.6"/><circle cx="11" cy="11" r="2.5" fill="white"/></svg>
        </div>
        <div style={{color:'#9CA3AF',fontSize:'14px',fontWeight:500}}>Cargando...</div>
      </div>
    </div>
  )

  if (!negocio) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFF',fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'56px',marginBottom:'16px'}}>🔍</div>
        <div style={{fontSize:'20px',fontWeight:800,color:'#111827',marginBottom:'8px'}}>Negocio no encontrado</div>
        <Link href="/cliente" style={{color:'#6366F1',textDecoration:'none',fontSize:'14px',fontWeight:600}}>← Volver al inicio</Link>
      </div>
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { background:#F8FAFC; font-family:'Plus Jakarta Sans',sans-serif; color:#111827; -webkit-font-smoothing:antialiased; }

        /* ── NAV ── */
        .nav { position:sticky; top:0; z-index:100; background:rgba(255,255,255,0.92); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border-bottom:1px solid rgba(0,0,0,0.05); padding:0 28px; height:60px; display:flex; align-items:center; justify-content:space-between; }
        .nav-right { display:flex; align-items:center; gap:10px; }
        .btn-fav { background:white; border:1.5px solid rgba(0,0,0,0.09); border-radius:100px; width:40px; height:40px; min-height:44px; min-width:44px; display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer; transition:all 0.15s; }
        .btn-fav:hover { border-color:rgba(239,68,68,0.3); transform:scale(1.05); }
        .btn-fav.active { background:rgba(239,68,68,0.06); border-color:rgba(239,68,68,0.3); }
        .btn-nav-cita { background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; border:none; padding:10px 22px; border-radius:100px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:7px; box-shadow:0 4px 12px rgba(99,102,241,0.3); transition:transform 0.15s,box-shadow 0.15s; white-space:nowrap; }
        .btn-nav-cita:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(99,102,241,0.4); }

        /* ── HERO ── */
        .hero { position:relative; overflow:hidden; background:linear-gradient(135deg,#EEF2FF,#F5F3FF,#EDE9FE); }
        .hero-tall { height:420px; }
        .hero-short { height:180px; display:flex; align-items:center; justify-content:center; }
        .hero img { width:100%; height:100%; object-fit:cover; display:block; }
        .hero-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.1) 55%,transparent 100%); pointer-events:none; }
        .hero-bottom { position:absolute; bottom:0; left:0; right:0; padding:24px 32px 28px; display:flex; align-items:flex-end; gap:18px; z-index:2; }
        .hero-logo { width:72px; height:72px; border-radius:18px; border:3px solid rgba(255,255,255,0.9); overflow:hidden; flex-shrink:0; background:white; box-shadow:0 4px 20px rgba(0,0,0,0.2); }
        .hero-logo img { width:100%; height:100%; object-fit:cover; }
        .hero-name-block { flex:1; min-width:0; }
        .hero-tipo-badge { display:inline-flex; align-items:center; background:rgba(255,255,255,0.18); backdrop-filter:blur(8px); color:white; font-size:11px; font-weight:700; padding:3px 11px; border-radius:100px; letter-spacing:0.5px; text-transform:capitalize; margin-bottom:6px; border:1px solid rgba(255,255,255,0.2); }
        .hero-title { font-family:'Syne',sans-serif; font-size:clamp(24px,4vw,36px); font-weight:800; color:white; line-height:1.1; letter-spacing:-0.5px; text-shadow:0 2px 12px rgba(0,0,0,0.3); }
        .hero-badges { display:flex; align-items:center; gap:8px; margin-top:8px; flex-wrap:wrap; }
        .badge-open { background:rgba(16,185,129,0.85); color:white; padding:4px 12px; border-radius:100px; font-size:11px; font-weight:700; backdrop-filter:blur(6px); }
        .badge-closed { background:rgba(0,0,0,0.4); color:rgba(255,255,255,0.7); padding:4px 12px; border-radius:100px; font-size:11px; font-weight:700; backdrop-filter:blur(6px); }
        /* No-photo hero */
        .hero-nofotos-circles { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
        .gc { position:absolute; border-radius:50%; }
        .hero-nofotos-name { font-family:'Syne',sans-serif; font-size:clamp(22px,4vw,32px); font-weight:800; color:#111827; text-align:center; letter-spacing:-0.5px; }
        .hero-nofotos-tipo { display:inline-flex; background:rgba(99,102,241,0.09); color:#6366F1; font-size:12px; font-weight:700; padding:5px 14px; border-radius:100px; margin-top:10px; }
        /* Gallery controls */
        .gal-btn { position:absolute; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.88); border:none; border-radius:50%; width:42px; height:42px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; box-shadow:0 2px 14px rgba(0,0,0,0.18); z-index:3; transition:transform 0.15s; backdrop-filter:blur(8px); }
        .gal-btn:hover { transform:translateY(-50%) scale(1.08); }
        .gal-btn-l { left:16px; }
        .gal-btn-r { right:16px; }
        .gal-dots { position:absolute; bottom:18px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:3; }
        .gal-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.5); border:none; cursor:pointer; padding:0; transition:all 0.2s; }
        .gal-dot.act { background:white; width:22px; border-radius:100px; }

        /* ── LAYOUT ── */
        .wrap { max-width:1040px; margin:0 auto; padding:0 24px; }
        .page-grid { display:grid; grid-template-columns:1fr 320px; gap:28px; padding:28px 0 80px; align-items:start; }

        /* ── PROFILE STRIP (below hero for no-photo) ── */
        .profile-strip { padding:28px 0 20px; border-bottom:1px solid rgba(0,0,0,0.05); margin-bottom:0; display:flex; align-items:flex-start; gap:16px; flex-wrap:wrap; }
        .profile-strip-logo { width:68px; height:68px; border-radius:16px; border:2px solid rgba(0,0,0,0.07); overflow:hidden; flex-shrink:0; background:white; box-shadow:0 4px 16px rgba(0,0,0,0.08); }
        .profile-strip-logo img { width:100%; height:100%; object-fit:cover; }
        .profile-strip-info { flex:1; min-width:0; }
        .strip-tipo { display:inline-flex; background:rgba(99,102,241,0.08); color:#6366F1; font-size:11px; font-weight:700; padding:3px 11px; border-radius:100px; text-transform:capitalize; letter-spacing:0.3px; margin-bottom:6px; }
        .strip-name { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; color:#111827; letter-spacing:-0.5px; line-height:1.15; }
        .strip-meta { display:flex; align-items:center; gap:12px; margin-top:10px; flex-wrap:wrap; }
        .meta-chip { display:inline-flex; align-items:center; gap:5px; font-size:13px; color:#6B7280; font-weight:500; }
        .badge-open-strip { background:rgba(16,185,129,0.1); color:#059669; padding:4px 12px; border-radius:100px; font-size:12px; font-weight:700; border:1px solid rgba(16,185,129,0.2); }
        .badge-closed-strip { background:rgba(0,0,0,0.05); color:#9CA3AF; padding:4px 12px; border-radius:100px; font-size:12px; font-weight:700; }

        /* ── CARD ── */
        .card { background:white; border:1px solid rgba(0,0,0,0.06); border-radius:20px; padding:26px; margin-bottom:16px; box-shadow:0 1px 8px rgba(0,0,0,0.04); }
        .card-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:800; color:#111827; margin-bottom:18px; letter-spacing:-0.2px; }
        .descripcion { font-size:15px; color:#4B5563; line-height:1.8; }

        /* ── SERVICES ── */
        .grupo-wrap { margin-bottom:8px; border-radius:14px; overflow:hidden; border:1px solid rgba(0,0,0,0.06); }
        .grupo-header { display:flex; align-items:center; justify-content:space-between; padding:13px 16px; cursor:pointer; user-select:none; transition:opacity 0.15s; }
        .grupo-header:hover { opacity:0.88; }
        .grupo-izq { display:flex; align-items:center; gap:10px; }
        .grupo-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
        .grupo-nombre { font-size:13.5px; font-weight:700; }
        .grupo-count { font-size:11px; font-weight:600; padding:2px 8px; border-radius:100px; background:rgba(0,0,0,0.07); opacity:0.7; }
        .grupo-arrow { transition:transform 0.22s; opacity:0.55; }
        .grupo-arrow.open { transform:rotate(180deg); }
        .grupo-body { background:white; padding:0 16px; }
        .serv-item { display:flex; align-items:center; justify-content:space-between; padding:13px 0; border-bottom:1px solid rgba(0,0,0,0.04); }
        .serv-item:last-child { border-bottom:none; }
        .serv-nombre { font-size:14px; font-weight:600; color:#111827; margin-bottom:3px; }
        .serv-dur { font-size:12px; color:#9CA3AF; }
        .serv-precio { font-size:16px; font-weight:800; color:#111827; }
        .serv-precio-old { font-size:12px; color:#9CA3AF; text-decoration:line-through; }
        .serv-precio-oferta { font-size:16px; font-weight:800; color:#EF4444; }
        .oferta-badge { display:inline-flex; background:rgba(239,68,68,0.1); color:#EF4444; border-radius:100px; font-size:10px; font-weight:700; padding:2px 8px; margin-left:6px; vertical-align:middle; }

        /* ── SCHEDULE ── */
        .horario-row { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:12px; margin-bottom:3px; }
        .horario-row.hoy { background:linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.07)); border:1px solid rgba(99,102,241,0.13); }
        .horario-dia { font-size:13px; font-weight:600; color:#374151; display:flex; align-items:center; gap:8px; }
        .horario-row.hoy .horario-dia { color:#6366F1; font-weight:700; }
        .hoy-pill { font-size:10px; font-weight:700; background:#6366F1; color:white; padding:2px 8px; border-radius:100px; }
        .horario-hora { font-size:13px; color:#4B5563; font-weight:500; }
        .horario-cerrado { color:#D1D5DB; }

        /* ── WORKERS ── */
        .workers-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:12px; }
        .worker-card { display:flex; flex-direction:column; align-items:center; gap:10px; padding:18px 12px; background:#F9FAFB; border:1px solid rgba(0,0,0,0.06); border-radius:16px; text-align:center; }
        .worker-av { width:56px; height:56px; border-radius:50%; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; color:white; }
        .worker-av img { width:100%; height:100%; object-fit:cover; }
        .worker-name { font-size:13px; font-weight:700; color:#111827; line-height:1.3; }
        .worker-spec { font-size:11px; color:#9CA3AF; font-weight:500; margin-top:2px; }

        /* ── REVIEWS ── */
        .stars-big { display:flex; gap:4px; }
        .val-media-block { display:flex; align-items:center; gap:20px; padding:16px 0 20px; border-bottom:1px solid rgba(0,0,0,0.06); margin-bottom:20px; }
        .val-num { font-family:'Syne',sans-serif; font-size:54px; font-weight:800; color:#111827; line-height:1; letter-spacing:-2px; }
        .resena-item { padding:16px 0; border-bottom:1px solid rgba(0,0,0,0.04); }
        .resena-item:last-child { border-bottom:none; }
        .resena-autor { font-size:13px; font-weight:700; color:#111827; margin-bottom:4px; display:flex; align-items:center; justify-content:space-between; }
        .resena-fecha { font-size:11px; color:#9CA3AF; font-weight:400; }
        .resena-texto { font-size:13px; color:#4B5563; line-height:1.65; margin-top:6px; }

        /* ── SOCIAL ── */
        .social-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .social-chip { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:100px; border:1.5px solid rgba(0,0,0,0.08); background:white; font-family:inherit; font-size:13px; font-weight:600; color:#111827; text-decoration:none; transition:all 0.15s; }
        .social-chip:hover { border-color:#6366F1; color:#6366F1; background:#F5F3FF; transform:translateY(-1px); }

        /* ── RIGHT COLUMN ── */
        .sticky-col { position:sticky; top:76px; }
        .reserve-card { background:linear-gradient(135deg,#6366F1,#8B5CF6); border-radius:22px; padding:26px; margin-bottom:14px; box-shadow:0 8px 32px rgba(99,102,241,0.28); }
        .reserve-card-title { font-family:'Syne',sans-serif; font-size:19px; font-weight:800; color:white; margin-bottom:4px; }
        .reserve-card-sub { font-size:13px; color:rgba(255,255,255,0.72); margin-bottom:22px; line-height:1.5; }
        .btn-reservar { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:16px; background:white; color:#6366F1; border:none; border-radius:14px; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; text-decoration:none; box-shadow:0 4px 16px rgba(0,0,0,0.1); transition:transform 0.15s,box-shadow 0.15s; }
        .btn-reservar:hover { transform:scale(1.02); box-shadow:0 6px 22px rgba(0,0,0,0.15); }
        .btn-wa { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:13px; background:#25D366; color:white; border:none; border-radius:14px; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; text-decoration:none; margin-top:10px; transition:opacity 0.15s; }
        .btn-wa:hover { opacity:0.9; }

        /* ── MAP CARD ── */
        .map-card { background:white; border:1px solid rgba(0,0,0,0.06); border-radius:20px; overflow:hidden; margin-bottom:14px; box-shadow:0 1px 8px rgba(0,0,0,0.04); }
        .map-img { width:100%; height:150px; object-fit:cover; display:block; }
        .map-placeholder { height:150px; background:linear-gradient(135deg,#EEF2FF,#F5F3FF); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .map-placeholder-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(99,102,241,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.06) 1px,transparent 1px); background-size:22px 22px; }
        .map-placeholder-pin { position:relative; font-size:36px; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.15)); }
        .map-body { padding:18px 20px; }
        .map-label { font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; }
        .map-addr { font-size:13px; color:#4B5563; line-height:1.65; margin-bottom:14px; }
        .btn-gps { display:flex; align-items:center; justify-content:center; gap:7px; width:100%; padding:11px; background:#6366F1; color:white; border:none; border-radius:12px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity 0.15s; }
        .btn-gps:hover { opacity:0.88; }

        /* ── PAYMENT ── */
        .pago-chips { display:flex; flex-wrap:wrap; gap:7px; }
        .pago-chip { display:inline-flex; align-items:center; gap:5px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.14); color:#6366F1; padding:6px 12px; border-radius:100px; font-size:12px; font-weight:600; }

        /* ── MOBILE CTA ── */
        .mobile-cta { display:none; position:fixed; bottom:0; left:0; right:0; padding:14px 20px; background:rgba(255,255,255,0.97); backdrop-filter:blur(16px); border-top:1px solid rgba(0,0,0,0.07); z-index:90; }
        .mobile-cta-inner { display:flex; gap:10px; align-items:center; }
        .mobile-cta-reserve { display:flex; align-items:center; justify-content:center; gap:8px; flex:1; padding:15px; background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; border-radius:14px; font-family:inherit; font-size:15px; font-weight:800; text-decoration:none; box-shadow:0 4px 16px rgba(99,102,241,0.35); min-height:44px; }
        .mobile-cta-wa { display:flex; align-items:center; justify-content:center; gap:6px; padding:12px 16px; background:#25D366; color:white; border-radius:14px; font-family:inherit; font-size:13px; font-weight:700; text-decoration:none; min-height:44px; white-space:nowrap; }

        /* ── CHATBOT ── */
        .chat-fab { position:fixed; bottom:100px; right:22px; width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,#6366F1,#8B5CF6); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 4px 20px rgba(99,102,241,0.45); z-index:200; transition:transform 0.18s; }
        .chat-fab:hover { transform:scale(1.1); }
        .chat-panel { position:fixed; bottom:170px; right:22px; width:360px; max-height:520px; background:white; border-radius:22px; box-shadow:0 8px 40px rgba(0,0,0,0.16); z-index:200; display:flex; flex-direction:column; overflow:hidden; animation:chatIn 0.22s ease; }
        @keyframes chatIn { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:none; } }
        .chat-header { background:linear-gradient(135deg,#6366F1,#8B5CF6); padding:14px 18px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .chat-avatar { width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .chat-header-name { font-size:13.5px; font-weight:700; color:white; }
        .chat-header-status { font-size:11px; color:rgba(255,255,255,0.72); display:flex; align-items:center; gap:4px; margin-top:2px; }
        .chat-close { background:rgba(255,255,255,0.18); border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; color:white; font-size:15px; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }
        .chat-close:hover { background:rgba(255,255,255,0.3); }
        .chat-msgs { flex:1; overflow-y:auto; padding:14px 14px 8px; display:flex; flex-direction:column; gap:10px; }
        .chat-wrap { display:flex; flex-direction:column; }
        .chat-wrap.usuario { align-items:flex-end; }
        .chat-wrap.bot { align-items:flex-start; }
        .chat-bubble { max-width:82%; padding:10px 14px; border-radius:15px; font-size:13px; line-height:1.55; white-space:pre-wrap; word-break:break-word; }
        .chat-bubble.usuario { background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; border-bottom-right-radius:4px; }
        .chat-bubble.bot { background:#F3F4F6; color:#111827; border-bottom-left-radius:4px; }
        .chat-opts { display:flex; flex-direction:column; gap:7px; margin-top:8px; width:100%; }
        .chat-opt { display:flex; align-items:center; gap:8px; padding:10px 14px; border:1.5px solid rgba(99,102,241,0.2); border-radius:12px; background:white; cursor:pointer; font-family:inherit; font-size:13px; font-weight:600; color:#6366F1; transition:all 0.15s; text-align:left; text-decoration:none; }
        .chat-opt:hover { background:#EEF2FF; border-color:#6366F1; }
        .chat-confirm-btn { padding:10px 16px; background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; border-radius:10px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; margin-top:8px; transition:opacity 0.15s; }
        .chat-typing { display:flex; gap:5px; padding:10px 13px; background:#F3F4F6; border-radius:14px; border-bottom-left-radius:4px; align-self:flex-start; }
        .chat-dot { width:7px; height:7px; border-radius:50%; background:#9CA3AF; animation:dotPulse 1.4s infinite; }
        .chat-dot:nth-child(2) { animation-delay:0.2s; }
        .chat-dot:nth-child(3) { animation-delay:0.4s; }
        @keyframes dotPulse { 0%,80%,100% { transform:scale(0.7); opacity:0.5; } 40% { transform:scale(1); opacity:1; } }
        .chat-input-row { padding:10px 12px; border-top:1px solid rgba(0,0,0,0.06); display:flex; gap:8px; align-items:center; flex-shrink:0; }
        .chat-input { flex:1; border:1.5px solid rgba(0,0,0,0.1); border-radius:100px; padding:9px 15px; font-family:inherit; font-size:13px; outline:none; transition:border-color 0.15s; background:white; }
        .chat-input:focus { border-color:#6366F1; }
        .chat-send { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#6366F1,#8B5CF6); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform 0.15s; }
        .chat-send:hover { transform:scale(1.08); }
        .chat-send:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .nav { padding:0 16px; }
          .btn-nav-cita { display:none; }
          .hero-tall { height:280px; }
          .hero-short { height:140px; }
          .hero-bottom { padding:16px 20px 22px; gap:12px; }
          .hero-logo { width:56px; height:56px; border-radius:14px; }
          .wrap { padding:0 16px; }
          .page-grid { grid-template-columns:1fr; padding-top:0; }
          .sticky-col { display:none; }
          .mobile-cta { display:block; }
          body { padding-bottom:90px; }
          .card { padding:18px 16px; }
          .workers-grid { grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px; }
          input, select, textarea { font-size:16px !important; }
        }

        /* ── DARK MODE ── */
        html.dark, html.dark body { background:#0d0d0d !important; color:#f9fafb !important; }
        html.dark .nav { background:rgba(13,13,13,0.95); border-color:rgba(255,255,255,0.06); }
        html.dark .card { background:#1a1a1a; border-color:rgba(255,255,255,0.06); }
        html.dark .card-title { color:#f9fafb; }
        html.dark .descripcion { color:#9CA3AF; }
        html.dark .strip-name { color:#f9fafb; }
        html.dark .serv-nombre { color:#f9fafb; }
        html.dark .serv-precio { color:#f9fafb; }
        html.dark .grupo-wrap { border-color:rgba(255,255,255,0.06); }
        html.dark .grupo-body { background:#1a1a1a; }
        html.dark .serv-item { border-color:rgba(255,255,255,0.04); }
        html.dark .horario-row.hoy { background:rgba(99,102,241,0.1); }
        html.dark .horario-dia { color:#9CA3AF; }
        html.dark .horario-hora { color:#9CA3AF; }
        html.dark .val-num { color:#f9fafb; }
        html.dark .resena-autor { color:#f9fafb; }
        html.dark .resena-texto { color:#9CA3AF; }
        html.dark .worker-card { background:#111; border-color:rgba(255,255,255,0.06); }
        html.dark .worker-name { color:#f9fafb; }
        html.dark .social-chip { background:#1a1a1a; border-color:rgba(255,255,255,0.08); color:#f9fafb; }
        html.dark .social-chip:hover { background:#242424; color:#818CF8; border-color:#6366F1; }
        html.dark .map-card { background:#1a1a1a; border-color:rgba(255,255,255,0.06); }
        html.dark .map-addr { color:#9CA3AF; }
        html.dark .mobile-cta { background:rgba(13,13,13,0.97); border-color:rgba(255,255,255,0.06); }
        html.dark .chat-panel { background:#1a1a1a; }
        html.dark .chat-bubble.bot { background:#2a2a2a; color:#f9fafb; }
        html.dark .chat-input-row { border-color:rgba(255,255,255,0.06); }
        html.dark .chat-input { background:#242424; color:#f9fafb; border-color:rgba(255,255,255,0.1); }
        html.dark .chat-opt { background:#1a1a1a; border-color:rgba(99,102,241,0.3); }
        html.dark .chat-opt:hover { background:#242424; }
        html.dark .btn-fav { background:#1a1a1a; border-color:rgba(255,255,255,0.1); }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <Link href="/cliente" style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <div className="nav-right">
          <LanguageSelector />
          <button className={`btn-fav${esFav?' active':''}`} onClick={toggleFav} disabled={favCargando} title={esFav?'Quitar de favoritos':'Guardar'}>
            {esFav ? '❤️' : '🤍'}
          </button>
          <Link href={`/negocio/${id}/reservar`} className="btn-nav-cita">📅 Pedir cita</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      {fotos.length > 0 ? (
        <div className="hero hero-tall">
          <img src={fotos[fotoActiva]} alt="Foto del local"/>
          <div className="hero-overlay"/>

          {fotos.length > 1 && (
            <>
              <button className="gal-btn gal-btn-l" onClick={() => setFotoActiva(i => (i-1+fotos.length)%fotos.length)}>‹</button>
              <button className="gal-btn gal-btn-r" onClick={() => setFotoActiva(i => (i+1)%fotos.length)}>›</button>
              <div className="gal-dots">
                {fotos.map((_,i) => <button key={i} className={`gal-dot${i===fotoActiva?' act':''}`} onClick={() => setFotoActiva(i)}/>)}
              </div>
            </>
          )}

          <div className="hero-bottom">
            {negocio.logo_url && (
              <div className="hero-logo"><img src={negocio.logo_url} alt="Logo"/></div>
            )}
            <div className="hero-name-block">
              {negocio.tipo && <div className="hero-tipo-badge">{negocio.tipo}</div>}
              <div className="hero-title">{negocio.nombre}</div>
              <div className="hero-badges">
                {horarioHoy && (
                  <span className={horarioHoy.abierto ? 'badge-open' : 'badge-closed'}>
                    {horarioHoy.abierto ? '● Abierto ahora' : '● Cerrado ahora'}
                  </span>
                )}
                {resenas.length > 0 && (
                  <span style={{background:'rgba(251,191,36,0.25)',color:'#FCD34D',padding:'3px 11px',borderRadius:'100px',fontSize:'11px',fontWeight:700,backdropFilter:'blur(6px)'}}>
                    ★ {mediaVal.toFixed(1)} ({resenas.length})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hero hero-short">
          <div className="hero-nofotos-circles">
            <div className="gc" style={{width:'280px',height:'280px',background:'radial-gradient(circle,rgba(184,216,248,0.45),transparent 70%)',top:'-80px',left:'-60px'}}/>
            <div className="gc" style={{width:'240px',height:'240px',background:'radial-gradient(circle,rgba(212,197,249,0.45),transparent 70%)',bottom:'-60px',right:'-50px'}}/>
            <div className="gc" style={{width:'180px',height:'180px',background:'radial-gradient(circle,rgba(184,237,212,0.35),transparent 70%)',top:'20px',right:'120px'}}/>
          </div>
          <div style={{position:'relative',textAlign:'center'}}>
            <div className="hero-nofotos-name">{negocio.nombre}</div>
            {negocio.tipo && <div style={{display:'flex',justifyContent:'center',marginTop:'10px'}}><div className="hero-nofotos-tipo">{negocio.tipo}</div></div>}
          </div>
        </div>
      )}

      {/* ── PROFILE STRIP (for no-photo layout) ── */}
      {fotos.length === 0 && (
        <div className="wrap">
          <div className="profile-strip">
            {negocio.logo_url && (
              <div className="profile-strip-logo"><img src={negocio.logo_url} alt="Logo"/></div>
            )}
            <div className="profile-strip-info">
              <div className="strip-meta">
                {negocio.ciudad && <span className="meta-chip">📍 {negocio.ciudad}</span>}
                {negocio.telefono && <span className="meta-chip">📞 {negocio.telefono}</span>}
                {horarioHoy && (
                  <span className={horarioHoy.abierto ? 'badge-open-strip' : 'badge-closed-strip'}>
                    {horarioHoy.abierto ? '● Abierto' : '● Cerrado'}
                  </span>
                )}
                {resenas.length > 0 && (
                  <span style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'13px',fontWeight:700,color:'#92400E',background:'rgba(253,230,138,0.3)',padding:'3px 10px',borderRadius:'100px',border:'1px solid rgba(253,230,138,0.5)'}}>
                    ★ {mediaVal.toFixed(1)} · {resenas.length} reseñas
                  </span>
                )}
                {clientePuntos !== null && clientePuntos > 0 && (
                  <span style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(212,197,249,0.25)',color:'#6D28D9',fontSize:'12px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',border:'1px solid rgba(212,197,249,0.4)'}}>
                    ⭐ {clientePuntos} pts
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="wrap">
        <div className="page-grid" style={fotos.length > 0 ? {paddingTop:'28px'} : {paddingTop:'0'}}>

          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Star + meta strip for photo layout */}
            {fotos.length > 0 && (
              <div style={{display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap',marginBottom:'20px',paddingBottom:'18px',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                {negocio.ciudad && <span className="meta-chip">📍 {negocio.ciudad}</span>}
                {negocio.telefono && <span className="meta-chip">📞 {negocio.telefono}</span>}
                {resenas.length > 0 && (
                  <span style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'13px',color:'#92400E',fontWeight:700,background:'rgba(253,230,138,0.25)',padding:'3px 10px',borderRadius:'100px'}}>
                    ★ {mediaVal.toFixed(1)} · {resenas.length} reseñas
                  </span>
                )}
                {clientePuntos !== null && clientePuntos > 0 && (
                  <span style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(212,197,249,0.25)',color:'#6D28D9',fontSize:'12px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',border:'1px solid rgba(212,197,249,0.4)'}}>
                    ⭐ {clientePuntos} pts
                  </span>
                )}
              </div>
            )}

            {/* DESCRIPCIÓN */}
            {negocio.descripcion && (
              <div className="card">
                <div className="card-title">Sobre nosotros</div>
                <p className="descripcion">{negocio.descripcion}</p>
              </div>
            )}

            {/* SERVICIOS */}
            {servicios.length > 0 && (
              <div className="card">
                <div className="card-title">Servicios y precios</div>
                {(() => {
                  const esUnica = Object.keys(grupos).length === 1
                  return Object.entries(grupos).map(([grupo, items], gi) => {
                    const pal = CAT_PALETTE[gi % CAT_PALETTE.length]
                    const abierto = grupoAbierto === grupo
                    const lista = (
                      <div className={esUnica ? '' : 'grupo-body'}>
                        {items.map(s => (
                          <div key={s.id} className="serv-item">
                            <div style={{flex:1}}>
                              <div className="serv-nombre">
                                {s.nombre}
                                {ofertaActiva(s) && <span className="oferta-badge">🏷 OFERTA</span>}
                              </div>
                              <div className="serv-dur" style={{fontSize:'12px',color:'#9CA3AF',marginTop:'3px'}}>⏱ {s.duracion} min</div>
                            </div>
                            <div style={{textAlign:'right',flexShrink:0}}>
                              {ofertaActiva(s) ? (
                                <>
                                  <div className="serv-precio-old">€{s.precio.toFixed(2)}</div>
                                  <div className="serv-precio-oferta">€{s.precio_descuento!.toFixed(2)}</div>
                                </>
                              ) : (
                                <div className="serv-precio">€{s.precio.toFixed(2)}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                    if (esUnica) return <div key={grupo}>{lista}</div>
                    return (
                      <div key={grupo} className="grupo-wrap" style={{borderColor:pal.border}}>
                        <div className="grupo-header" style={{background:pal.bg,color:pal.color}} onClick={() => setGrupoAbierto(abierto ? null : grupo)}>
                          <div className="grupo-izq">
                            <span className="grupo-dot" style={{background:pal.dot}}/>
                            <span className="grupo-nombre" style={{color:pal.color}}>{grupo}</span>
                            <span className="grupo-count">{items.length}</span>
                          </div>
                          <svg className={`grupo-arrow${abierto?' open':''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        {abierto && lista}
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* HORARIOS */}
            {horarios.length > 0 && (
              <div className="card">
                <div className="card-title">Horario</div>
                {diasOrden.map(dia => {
                  const h = horarios.find(x => x.dia === dia)
                  const esHoy = dia === hoyDia
                  return (
                    <div key={dia} className={`horario-row${esHoy?' hoy':''}`}>
                      <span className="horario-dia">
                        {diasLabels[dia]}
                        {esHoy && <span className="hoy-pill">Hoy</span>}
                      </span>
                      <span className={`horario-hora${(!h||!h.abierto)?' horario-cerrado':''}`}>
                        {h ? horarioTexto(h) : 'Cerrado'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* EQUIPO */}
            {trabajadores.length > 0 && (
              <div className="card">
                <div className="card-title">Nuestro equipo</div>
                <div className="workers-grid">
                  {trabajadores.map((t, i) => {
                    const colors = ['#6366F1','#8B5CF6','#EC4899','#10B981','#F59E0B','#3B82F6','#EF4444','#14B8A6']
                    const bg = colors[i % colors.length]
                    const initial = t.nombre.charAt(0).toUpperCase()
                    return (
                      <div key={t.id} className="worker-card">
                        <div className="worker-av" style={{background:t.foto_url ? 'transparent' : `linear-gradient(135deg,${bg},${bg}cc)`}}>
                          {t.foto_url ? <img src={t.foto_url} alt={t.nombre}/> : initial}
                        </div>
                        <div>
                          <div className="worker-name">{t.nombre}</div>
                          {t.especialidad && <div className="worker-spec">{t.especialidad}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* RESEÑAS */}
            {resenas.length > 0 && (
              <div className="card">
                <div className="card-title">Valoraciones</div>
                <div className="val-media-block">
                  <div className="val-num">{mediaVal.toFixed(1)}</div>
                  <div>
                    <div className="stars-big">
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} width="22" height="22" viewBox="0 0 24 24" fill={i <= Math.round(mediaVal) ? '#F59E0B' : '#E5E7EB'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    <div style={{fontSize:'13px',color:'#9CA3AF',marginTop:'6px'}}>{resenas.length} valoración{resenas.length!==1?'es':''}</div>
                  </div>
                </div>
                {resenas.slice(0,5).map(r => (
                  <div key={r.id} className="resena-item">
                    <div className="resena-autor">
                      <span>{r.autor_nombre || r.cliente_nombre || 'Cliente'}</span>
                      <span className="resena-fecha">{new Date(r.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</span>
                    </div>
                    <div style={{display:'flex',gap:'2px',marginBottom:'4px'}}>
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i<=r.valoracion?'#F59E0B':'#E5E7EB'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    {(r.texto || r.comentario) && <p className="resena-texto">{r.texto || r.comentario}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* REDES SOCIALES */}
            {(negocio.instagram || negocio.whatsapp || negocio.facebook) && (
              <div className="card">
                <div className="card-title">Encuéntranos en</div>
                <div className="social-grid">
                  {negocio.instagram && (
                    <a href={`https://instagram.com/${negocio.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="social-chip">📸 Instagram</a>
                  )}
                  {negocio.whatsapp && (
                    <a href={`https://wa.me/${negocio.whatsapp.replace(/\s+/g,'').replace('+','')}`} target="_blank" rel="noreferrer" className="social-chip">💬 WhatsApp</a>
                  )}
                  {negocio.facebook && (
                    <a href={negocio.facebook.startsWith('http') ? negocio.facebook : `https://${negocio.facebook}`} target="_blank" rel="noreferrer" className="social-chip">👤 Facebook</a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="sticky-col">

            {/* RESERVAR */}
            <div className="reserve-card">
              <div className="reserve-card-title">Reserva tu cita</div>
              <div className="reserve-card-sub">Elige servicio, día y hora en pocos segundos</div>
              <Link href={`/negocio/${id}/reservar`} className="btn-reservar">📅 Pedir cita online</Link>
              {negocio.whatsapp && (
                <a href={`https://wa.me/${negocio.whatsapp.replace(/\s+/g,'').replace('+','')}`} target="_blank" rel="noreferrer" className="btn-wa">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.97 0C5.372 0 0 5.373 0 11.97c0 2.11.552 4.09 1.518 5.814L0 24l6.335-1.652A11.935 11.935 0 0011.97 24c6.598 0 11.97-5.373 11.97-11.97C23.94 5.373 18.568 0 11.97 0zm0 21.818a9.817 9.817 0 01-5.003-1.366l-.36-.213-3.72.97.993-3.62-.235-.374A9.819 9.819 0 012.152 11.97c0-5.42 4.399-9.818 9.818-9.818 5.42 0 9.818 4.399 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>
                  WhatsApp
                </a>
              )}
            </div>

            {/* MAPA */}
            {(negocio.direccion || negocio.ciudad) && (
              <div className="map-card">
                {mapSrc ? (
                  <img className="map-img" src={mapSrc} alt="Mapa de ubicación"/>
                ) : (
                  <div className="map-placeholder">
                    <div className="map-placeholder-grid"/>
                    <span className="map-placeholder-pin">📍</span>
                  </div>
                )}
                <div className="map-body">
                  <div className="map-label">Ubicación</div>
                  <div className="map-addr">
                    {negocio.direccion && <div>{negocio.direccion}</div>}
                    {negocio.ciudad && <div>{negocio.ciudad}{negocio.codigo_postal ? `, ${negocio.codigo_postal}` : ''}</div>}
                  </div>
                  <button className="btn-gps" onClick={abrirGPS}>🗺️ Cómo llegar</button>
                </div>
              </div>
            )}

            {/* MÉTODOS DE PAGO */}
            {negocio.metodos_pago && negocio.metodos_pago.length > 0 && (
              <div className="map-card">
                <div className="map-body">
                  <div className="map-label">Métodos de pago</div>
                  <div className="pago-chips">
                    {negocio.metodos_pago.map(m => {
                      const info: Record<string,{icon:string;label:string}> = {
                        pago_app:{icon:'📱',label:'App'},efectivo:{icon:'💵',label:'Efectivo'},datafono:{icon:'💳',label:'Datáfono'},
                      }
                      const {icon,label} = info[m] ?? {icon:'💰',label:m}
                      return <span key={m} className="pago-chip">{icon} {label}</span>
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE FIXED CTA ── */}
      <div className="mobile-cta">
        <div className="mobile-cta-inner">
          <button className={`btn-fav${esFav?' active':''}`} onClick={toggleFav} disabled={favCargando}>
            {esFav ? '❤️' : '🤍'}
          </button>
          <Link href={`/negocio/${id}/reservar`} className="mobile-cta-reserve">📅 Pedir cita</Link>
          {negocio.whatsapp && (
            <a href={`https://wa.me/${negocio.whatsapp.replace(/\s+/g,'').replace('+','')}`} target="_blank" rel="noreferrer" className="mobile-cta-wa">💬 WA</a>
          )}
        </div>
      </div>

      {/* ── CHATBOT FAB ── */}
      <button className="chat-fab" onClick={() => chatAbierto ? setChatAbierto(false) : abrirChat()} title="Asistente virtual">
        {chatAbierto ? '✕' : '💬'}
      </button>

      {/* ── CHAT PANEL ── */}
      {chatAbierto && (
        <div className="chat-panel">
          <div className="chat-header">
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <div className="chat-avatar">🤖</div>
              <div>
                <div className="chat-header-name">Asistente de {negocio.nombre}</div>
                <div className="chat-header-status"><span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#4ADE80',display:'inline-block'}}/>En línea</div>
              </div>
            </div>
            <button className="chat-close" onClick={() => setChatAbierto(false)}>✕</button>
          </div>

          <div className="chat-msgs">
            {mensajes.map((m, i) => {
              const tieneOpciones = m.rol === 'bot' && m.texto.includes('[MOSTRAR_OPCIONES]')
              const reservaMatch = m.rol === 'bot' ? (() => {
                const idx = m.texto.indexOf('[RESERVA:')
                if (idx === -1) return null
                const jsonStart = idx + '[RESERVA:'.length
                const jsonEnd = m.texto.indexOf(']', jsonStart)
                if (jsonEnd === -1) return null
                return m.texto.slice(jsonStart, jsonEnd)
              })() : null
              const textoLimpio = m.texto
                .replace('[MOSTRAR_OPCIONES]', '')
                .replace(/\[RESERVA:\{[^[\]]*\}\]/g, '')
                .trim()
              return (
                <div key={i} className={`chat-wrap ${m.rol}`}>
                  <div className={`chat-bubble ${m.rol}`}>{textoLimpio}</div>
                  {tieneOpciones && !reservaConfirmada && (
                    <div className="chat-opts">
                      <a href={`/negocio/${id}/reservar`} className="chat-opt">🔗 <span><strong>Reservar yo mismo</strong></span></a>
                      <button className="chat-opt" onClick={() => enviarMensaje('Prefiero que lo gestiones tú.')}>🤖 <span><strong>Que lo gestione el asistente</strong></span></button>
                    </div>
                  )}
                  {reservaMatch && !reservaConfirmada && (() => {
                    try {
                      const datos = JSON.parse(reservaMatch)
                      return <button className="chat-confirm-btn" onClick={() => crearReservaChatbot(datos)} onTouchEnd={(e) => { e.preventDefault(); crearReservaChatbot(datos) }}>✅ Confirmar reserva</button>
                    } catch { return null }
                  })()}
                </div>
              )
            })}
            {chatCargando && (
              <div className="chat-typing">
                <div className="chat-dot"/><div className="chat-dot"/><div className="chat-dot"/>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>

          <div className="chat-input-row">
            <input className="chat-input" placeholder="Escribe tu mensaje..." value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && enviarMensaje()}
              disabled={chatCargando}
            />
            <button className="chat-send" onClick={() => enviarMensaje()} disabled={chatCargando || !chatInput.trim()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
