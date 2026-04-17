'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
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

const tips = [
  { icon: '📸', titulo: 'Añade fotos de calidad', desc: 'Los negocios con 5+ fotos reciben un 80% más de visitas. Sube imágenes del local, el equipo y los trabajos realizados.', color: 'rgba(184,216,248,0.2)', border: 'rgba(184,216,248,0.5)' },
  { icon: '⭐', titulo: 'Responde a las reseñas', desc: 'Responder a reseñas (positivas y negativas) genera confianza y mejora tu posicionamiento en búsquedas.', color: 'rgba(253,233,162,0.3)', border: 'rgba(253,233,162,0.7)' },
  { icon: '🕐', titulo: 'Mantén los horarios actualizados', desc: 'El 60% de los clientes comprueban el horario antes de reservar. Indica festivos y vacaciones con antelación.', color: 'rgba(184,237,212,0.2)', border: 'rgba(184,237,212,0.5)' },
  { icon: '💬', titulo: 'Activa el WhatsApp', desc: 'Los negocios con WhatsApp visible reciben hasta 3 veces más contactos directos de nuevos clientes.', color: 'rgba(184,237,212,0.2)', border: 'rgba(184,237,212,0.5)' },
  { icon: '🔧', titulo: 'Completa todos los servicios', desc: 'Añade duración y precio a cada servicio. Los clientes que ven precios claros reservan un 40% más.', color: 'rgba(212,197,249,0.2)', border: 'rgba(212,197,249,0.5)' },
  { icon: '📱', titulo: 'Comparte tu enlace en redes', desc: 'Pega tu enlace de reserva en la bio de Instagram y Facebook para convertir seguidores en clientes.', color: 'rgba(251,207,232,0.2)', border: 'rgba(251,207,232,0.5)' },
]

export default function Marketing() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [negocioTipo, setNegocioTipo] = useState('')
  const [negocioServicios, setNegocioServicios] = useState<{nombre:string; precio:number}[]>([])
  const [negocioValoracion, setNegocioValoracion] = useState<number|null>(null)
  const [copiado, setCopiado] = useState(false)
  const [qrDescargando, setQrDescargando] = useState(false)

  // IA Marketing state
  const [iaTab, setIaTab] = useState<'posts'|'resenas'|'estrategia'|'ofertas'>('posts')
  const [generando, setGenerando] = useState(false)
  const [iaError, setIaError] = useState('')

  // Tab: Posts Instagram
  const [postTema, setPostTema] = useState('promocion')
  const [postContexto, setPostContexto] = useState('')
  const [postResultado, setPostResultado] = useState('')
  const [postCopiado, setPostCopiado] = useState(false)

  // Tab: Respuestas a reseñas
  const [reseñaTexto, setReseñaTexto] = useState('')
  const [reseñaEstrellas, setReseñaEstrellas] = useState(5)
  const [reseñaTono, setReseñaTono] = useState('profesional')
  const [reseñaResultado, setReseñaResultado] = useState('')
  const [reseñaCopiado, setReseñaCopiado] = useState(false)

  // Tab: Estrategia mensual
  const hoy = new Date()
  const [estrategiaMes, setEstrategiaMes] = useState(hoy.getMonth())
  const [estrategiaAnio, setEstrategiaAnio] = useState(hoy.getFullYear())
  const [estrategiaObjetivo, setEstrategiaObjetivo] = useState('nuevos_clientes')
  const [estrategiaResultado, setEstrategiaResultado] = useState('')
  const [estrategiaCopiado, setEstrategiaCopiado] = useState(false)

  // Tab: Ofertas y promociones
  const [ofertaTemporada, setOfertaTemporada] = useState('actual')
  const [ofertaNotas, setOfertaNotas] = useState('')
  const [ofertaResultado, setOfertaResultado] = useState('')
  const [ofertaCopiado, setOfertaCopiado] = useState(false)

  useEffect(() => {
    (async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo: data, todos: todosNegs } = await getNegocioActivo(user.id, session.access_token)
      if (!data) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todosNegs)
      setNegocioId(data.id)
      setNegocioNombre(data.nombre)

      const [{ data: neg }, { data: svcs }, { data: resenas }] = await Promise.all([
        db.from('negocios').select('tipo, descripcion').eq('id', data.id).single(),
        db.from('servicios').select('nombre, precio').eq('negocio_id', data.id).eq('activo', true).limit(8),
        db.from('resenas').select('puntuacion').eq('negocio_id', data.id),
      ])
      if (neg) setNegocioTipo(neg.tipo || '')
      if (svcs) setNegocioServicios(svcs as {nombre:string; precio:number}[])
      if (resenas && resenas.length > 0) {
        const avg = (resenas as any[]).reduce((s, r) => s + (r.puntuacion || 0), 0) / resenas.length
        setNegocioValoracion(Math.round(avg * 10) / 10)
      }
    })()
  }, [])

  const qrRef = useRef<SVGSVGElement>(null)
  const urlPublica = negocioId ? `${typeof window !== 'undefined' ? window.location.origin : 'https://khepri.app'}/negocio/${negocioId}` : ''

  async function copiarEnlace() {
    if (!urlPublica) return
    await navigator.clipboard.writeText(urlPublica)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function compartirWhatsApp() {
    const msg = encodeURIComponent(`¡Reserva en ${negocioNombre} fácil y rápido! 📅\n${urlPublica}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  function descargarQR() {
    if (!qrRef.current || !urlPublica) return
    setQrDescargando(true)
    const svg = qrRef.current
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      const a = document.createElement('a')
      a.download = `qr-${negocioNombre.toLowerCase().replace(/\s+/g, '-')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
      setQrDescargando(false)
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }

  function imprimirQR() {
    if (!qrRef.current || !urlPublica) return
    const svg = qrRef.current.outerHTML
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head><title>QR ${negocioNombre}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        svg { width: 280px; height: 280px; }
        h2 { font-size: 22px; font-weight: bold; margin: 16px 0 6px; text-align: center; }
        p { font-size: 13px; color: #6B7280; text-align: center; word-break: break-all; max-width: 320px; }
      </style></head>
      <body onload="window.print()">${svg}<h2>${negocioNombre}</h2><p>${urlPublica}</p></body></html>
    `)
    win.document.close()
  }

  // ── Gemini ────────────────────────────────────────────────────────────────
  const GEMINI_URL = '/api/gemini'
  const MESES_NOMBRE = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

  function buildContexto(): string {
    const svcs = negocioServicios.length > 0
      ? negocioServicios.map(s => `${s.nombre}${s.precio ? ` (${s.precio}€)` : ''}`).join(', ')
      : 'no especificados'
    return `Negocio: "${negocioNombre}"
Tipo: ${negocioTipo || 'no especificado'}
Servicios principales: ${svcs}${negocioValoracion ? `\nValoración media de clientes: ${negocioValoracion}/5 ⭐` : ''}`
  }

  async function llamarGemini(prompt: string): Promise<string> {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 900, temperature: 0.85 },
      }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`) }
    const json = await res.json()
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  }

  async function generarPost() {
    if (!negocioNombre) return
    setGenerando(true); setIaError(''); setPostResultado('')
    const temaLabels: Record<string,string> = {
      promocion: 'Promoción u oferta especial',
      nuevo_servicio: 'Presentación de un nuevo servicio',
      festivo: 'Mensaje festivo o de celebración',
      consejo: 'Consejo o tip útil para los clientes',
      agradecimiento: 'Agradecimiento y conexión con la comunidad',
      detras: 'Behind the scenes — día a día del negocio',
    }
    const prompt = `Eres un experto en marketing digital para negocios locales en España.
${buildContexto()}

Genera un post completo y listo para publicar en Instagram sobre el siguiente tema: ${temaLabels[postTema] || postTema}.
${postContexto ? `Contexto adicional: ${postContexto}` : ''}

El post debe:
- Tener entre 180-220 palabras
- Usar emojis de forma natural y atractiva
- Incluir una llamada a la acción clara
- Sonar auténtico, no corporativo
- Adaptarse perfectamente al tipo de negocio

Tras el texto, añade una línea con tres guiones (---) y luego entre 20 y 25 hashtags relevantes:
- Mezcla español e inglés
- Incluye hashtags de nicho específicos del tipo de negocio
- Incluye hashtags de ciudad (usa "Madrid" como ejemplo)
- Incluye hashtags populares relacionados`

    try {
      setPostResultado(await llamarGemini(prompt))
    } catch (e: any) { setIaError(e.message) }
    finally { setGenerando(false) }
  }

  async function generarRespuestaResena() {
    if (!reseñaTexto.trim()) { setIaError('Escribe el texto de la reseña'); return }
    setGenerando(true); setIaError(''); setReseñaResultado('')
    const tono = reseñaTono === 'formal' ? 'formal y corporativo' : reseñaTono === 'amigable' ? 'cálido y cercano' : 'profesional y natural'
    const tipo = reseñaEstrellas <= 2 ? 'negativa' : reseñaEstrellas === 3 ? 'neutra' : 'positiva'
    const prompt = `Eres un experto en gestión de reputación online para negocios locales.
${buildContexto()}

El negocio ha recibido la siguiente reseña de ${reseñaEstrellas} estrella${reseñaEstrellas !== 1 ? 's' : ''} (reseña ${tipo}):
"${reseñaTexto.trim()}"

Genera 2 respuestas diferentes en tono ${tono}. Cada respuesta debe:
- Ser personalizada (no genérica ni robótica)
- Mencionar algún detalle concreto de la reseña
- Agradecer el tiempo dedicado a escribirla
${reseñaEstrellas <= 3 ? '- Pedir disculpas de forma sincera sin excusas\n- Ofrecer solución o invitar a contactar directamente\n- Mostrar que se tomará acción' : '- Celebrar la experiencia positiva\n- Invitar a volver o recomendar'}
- Máximo 80-100 palabras por respuesta
- Firma con el nombre del negocio

Formato de respuesta:
OPCIÓN 1:
[respuesta]

OPCIÓN 2:
[respuesta]`

    try {
      setReseñaResultado(await llamarGemini(prompt))
    } catch (e: any) { setIaError(e.message) }
    finally { setGenerando(false) }
  }

  async function generarEstrategia() {
    if (!negocioNombre) return
    setGenerando(true); setIaError(''); setEstrategiaResultado('')
    const objetivoLabels: Record<string,string> = {
      nuevos_clientes: 'Atraer nuevos clientes',
      fidelizacion: 'Fidelizar clientes actuales',
      ventas: 'Aumentar ventas y ticket medio',
      visibilidad: 'Aumentar visibilidad y seguidores',
    }
    const mesNombre = MESES_NOMBRE[estrategiaMes]
    const prompt = `Eres un experto en marketing de contenidos para negocios locales en España.
${buildContexto()}

Crea un calendario de contenido detallado para redes sociales del mes de ${mesNombre} de ${estrategiaAnio}.
Objetivo principal: ${objetivoLabels[estrategiaObjetivo] || estrategiaObjetivo}

El calendario debe incluir:
- 3-4 publicaciones por semana (lunes, miércoles y viernes mínimo)
- Para cada publicación: día exacto, red social (Instagram/Stories/Reels), tema concreto y descripción breve (1-2 frases sobre el contenido)
- Mezcla de contenidos: educativo (30%), promocional (25%), behind-the-scenes (20%), testimonios/social proof (15%), entretenimiento (10%)
- Aprovechar festivos y fechas señaladas de ${mesNombre}
- Ideas específicas y accionables, NO genéricas

Estructura por semanas. Sé específico con los temas, adaptados al tipo de negocio y sus servicios.`

    try {
      setEstrategiaResultado(await llamarGemini(prompt))
    } catch (e: any) { setIaError(e.message) }
    finally { setGenerando(false) }
  }

  async function generarOfertas() {
    if (!negocioNombre) return
    setGenerando(true); setIaError(''); setOfertaResultado('')
    const temporadaLabels: Record<string,string> = {
      actual: `temporada actual (${MESES_NOMBRE[hoy.getMonth()]} ${hoy.getFullYear()})`,
      primavera: 'primavera (marzo-mayo)',
      verano: 'verano (junio-agosto)',
      otono: 'otoño (septiembre-noviembre)',
      invierno: 'invierno (diciembre-febrero)',
      navidad: 'Navidad y Año Nuevo',
      san_valentin: 'San Valentín',
      black_friday: 'Black Friday / Cyber Monday',
      vuelta_cole: 'Vuelta al cole / septiembre',
      dia_madre: 'Día de la Madre',
      personalizado: ofertaNotas || 'ocasión personalizada',
    }
    const prompt = `Eres un experto en estrategia de marketing y promociones para negocios locales en España.
${buildContexto()}

Genera 4 ideas de ofertas y promociones para la ${temporadaLabels[ofertaTemporada]}.
${ofertaNotas ? `Notas del negocio: ${ofertaNotas}` : ''}

Para cada promoción incluye:
1. 🏷️ Nombre atractivo de la oferta
2. 📝 Descripción clara (qué incluye, cuánto descuento o qué valor añadido)
3. ⏰ Duración recomendada
4. 📣 Texto listo para publicar en Instagram y WhatsApp (conciso, con emojis)
5. 💡 Consejo de implementación

Las ofertas deben ser:
- Viables para un negocio pequeño/mediano sin grandes presupuestos
- Específicas para el tipo de negocio y sus servicios
- Variadas en mecanismo (descuento %, precio especial, pack, regalo, bono, etc.)
- Diseñadas para generar urgencia o exclusividad`

    try {
      setOfertaResultado(await llamarGemini(prompt))
    } catch (e: any) { setIaError(e.message) }
    finally { setGenerando(false) }
  }

  function copiarIA(texto: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(texto).then(() => {
      setter(true); setTimeout(() => setter(false), 2200)
    })
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
          --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --green-dark: #2E8A5E;
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
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 30; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; max-width: 900px; }

        .sec-title { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 12px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; padding: 22px; margin-bottom: 20px; }

        /* Enlace */
        .enlace-row { display: flex; align-items: center; gap: 10px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; }
        .enlace-url { flex: 1; font-size: 14px; color: var(--text2); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .btn-copiar { padding: 8px 16px; background: var(--text); color: white; border: none; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s; }
        .btn-copiar.ok { background: #2E8A5E; }
        .btns-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-outline { padding: 10px 18px; background: white; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; transition: border-color 0.15s; }
        .btn-outline:hover { border-color: var(--text); }
        .btn-outline.wa { border-color: rgba(37,211,102,0.4); color: #128C7E; }
        .btn-outline.wa:hover { background: rgba(37,211,102,0.06); border-color: #25D366; }

        /* QR */
        .qr-wrap { display: flex; align-items: flex-start; gap: 28px; flex-wrap: wrap; }
        .qr-img-box { background: white; border: 1.5px solid var(--border); border-radius: 16px; padding: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .qr-img-box img { display: block; width: 200px; height: 200px; border-radius: 4px; }
        .qr-placeholder { width: 200px; height: 200px; background: var(--bg); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 13px; }
        .qr-info { flex: 1; min-width: 200px; }
        .qr-desc { font-size: 14px; color: var(--text2); line-height: 1.6; margin-bottom: 16px; }
        .qr-btns { display: flex; flex-direction: column; gap: 8px; }

        /* Stats */
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 4px; }
        .stat-box { background: var(--bg); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
        .stat-box-icon { font-size: 24px; margin-bottom: 10px; }
        .stat-box-val { font-size: 28px; font-weight: 800; color: var(--text); letter-spacing: -1px; margin-bottom: 3px; }
        .stat-box-label { font-size: 13px; color: var(--text2); font-weight: 500; margin-bottom: 2px; }
        .stat-box-sub { font-size: 11px; color: var(--muted); }
        .mock-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #C4860A; background: rgba(253,233,162,0.4); padding: 3px 8px; border-radius: 100px; margin-top: 12px; }

        /* Tips */
        .tips-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .tip-card { border-radius: 14px; padding: 18px; border: 1.5px solid; }
        .tip-icon { font-size: 24px; margin-bottom: 10px; }
        .tip-titulo { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 5px; }
        .tip-desc { font-size: 13px; color: var(--text2); line-height: 1.55; }

        /* IA Marketing */
        .ia-tabs { display: flex; gap: 4px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
        .ia-tab { flex: 1; padding: 9px 6px; background: none; border: none; border-radius: 9px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.15s; text-align: center; }
        .ia-tab:hover { color: var(--text); }
        .ia-tab.active { background: white; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .ia-form-row { margin-bottom: 14px; }
        .ia-label { display: block; font-size: 13px; font-weight: 600; color: var(--text2); margin-bottom: 6px; }
        .ia-select { width: 100%; padding: 10px 12px; background: white; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); appearance: none; cursor: pointer; }
        .ia-select:focus { outline: none; border-color: #111827; }
        .ia-textarea { width: 100%; padding: 10px 12px; background: white; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); resize: vertical; min-height: 80px; }
        .ia-textarea:focus { outline: none; border-color: #111827; }
        .ia-chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .ia-chip { padding: 7px 14px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.15s; }
        .ia-chip:hover { border-color: #111827; color: #111827; }
        .ia-chip.active { background: #111827; border-color: #111827; color: white; }
        .ia-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .btn-ia { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
        .btn-ia:hover:not(:disabled) { opacity: 0.85; }
        .btn-ia:disabled { opacity: 0.5; cursor: not-allowed; }
        .ia-result-wrap { margin-top: 18px; }
        .ia-result-box { position: relative; background: var(--bg); border: 1.5px solid var(--border); border-radius: 12px; padding: 16px 16px 48px; white-space: pre-wrap; font-size: 14px; color: var(--text); line-height: 1.65; }
        .ia-copy-btn { position: absolute; right: 12px; bottom: 10px; padding: 6px 14px; background: white; border: 1.5px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .ia-copy-btn:hover { border-color: #111827; }
        .ia-copy-btn.ok { background: #111827; color: white; border-color: #111827; }
        .ia-error { margin-top: 10px; padding: 10px 14px; background: #FEE2E2; border-radius: 10px; font-size: 13px; color: #DC2626; }
        .stars-row { display: flex; gap: 6px; margin-bottom: 4px; }
        .star-btn { background: none; border: none; font-size: 22px; cursor: pointer; padding: 2px; transition: transform 0.1s; line-height: 1; }
        .star-btn:hover { transform: scale(1.15); }
        .tono-row { display: flex; gap: 8px; }
        .tono-btn { flex: 1; padding: 8px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 9px; font-family: inherit; font-size: 12px; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.15s; }
        .tono-btn.active { background: #111827; border-color: #111827; color: white; }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; } .hamburger { display: flex; }
          .main { margin-left: 0; } .topbar { padding: 12px 16px; } .content { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .tips-grid { grid-template-columns: 1fr; }
          .qr-wrap { flex-direction: column; }
          .ia-tabs { gap: 2px; }
          .ia-tab { font-size: 11px; padding: 8px 4px; }
          .ia-row2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/marketing' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Marketing</span>
          </header>

          <main className="content">

            {/* ── 1. ENLACE DE RESERVA ── */}
            <div className="sec-title">🔗 Tu enlace de reserva</div>
            <div className="card">
              <div style={{fontSize:'13px', color:'var(--muted)', marginBottom:'12px'}}>
                Comparte este enlace para que tus clientes puedan ver tu perfil y reservar online.
              </div>
              <div className="enlace-row">
                <span className="enlace-url">{urlPublica || 'Cargando...'}</span>
                <button
                  className={`btn-copiar ${copiado ? 'ok' : ''}`}
                  onClick={copiarEnlace}
                  disabled={!urlPublica}
                >
                  {copiado ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="btns-row">
                <Link href={urlPublica || '#'} target="_blank" className="btn-outline" style={{pointerEvents: urlPublica ? 'auto' : 'none'}}>
                  👁️ Ver mi perfil
                </Link>
                <button className="btn-outline wa" onClick={compartirWhatsApp} disabled={!urlPublica}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.008-1.371l-.36-.213-3.732.973.999-3.63-.234-.374A9.818 9.818 0 1112 21.818z"/>
                  </svg>
                  Compartir por WhatsApp
                </button>
              </div>
            </div>

            {/* ── 2. CÓDIGO QR ── */}
            <div className="sec-title">📱 Código QR</div>
            <div className="card">
              <div className="qr-wrap">
                <div className="qr-img-box">
                  {urlPublica
                    ? <QRCodeSVG ref={qrRef} value={urlPublica} size={200} bgColor="#ffffff" fgColor="#111827" level="M" />
                    : <div className="qr-placeholder">Cargando...</div>
                  }
                </div>
                <div className="qr-info">
                  <p className="qr-desc">
                    Imprime este código QR y ponlo en la entrada de tu local, en tarjetas de visita o en el mostrador. Tus clientes podrán escanearlo con el móvil y reservar al instante.
                  </p>
                  <div className="qr-btns">
                    <button className="btn-outline" onClick={descargarQR} disabled={!urlPublica || qrDescargando}>
                      {qrDescargando ? '⏳ Descargando...' : '⬇️ Descargar PNG'}
                    </button>
                    <button className="btn-outline" onClick={imprimirQR} disabled={!urlPublica}>
                      🖨️ Imprimir QR
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. ESTADÍSTICAS ── */}
            <div className="sec-title">📊 Estadísticas del perfil</div>
            <div className="card">
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-box-icon">👁️</div>
                  <div className="stat-box-val">—</div>
                  <div className="stat-box-label">Visitas al perfil</div>
                  <div className="stat-box-sub">Este mes</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-icon">📅</div>
                  <div className="stat-box-val">—</div>
                  <div className="stat-box-label">Reservas este mes</div>
                  <div className="stat-box-sub">Desde tu perfil</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-icon">📈</div>
                  <div className="stat-box-val">—</div>
                  <div className="stat-box-label">Tasa de conversión</div>
                  <div className="stat-box-sub">Visitas → Reservas</div>
                </div>
              </div>
              <div className="mock-badge">
                🚧 Analíticas detalladas próximamente
              </div>
            </div>

            {/* ── 4. IA MARKETING ── */}
            <div className="sec-title" style={{marginTop:'8px'}}>🤖 IA Marketing</div>
            <div className="card" style={{marginBottom:'20px'}}>
              <div style={{fontSize:'13px', color:'var(--muted)', marginBottom:'16px'}}>
                Genera contenido para redes sociales y estrategias de marketing usando inteligencia artificial con los datos reales de tu negocio.
              </div>

              {/* Tabs */}
              <div className="ia-tabs">
                {([
                  {key:'posts',    label:'📸 Posts IG'},
                  {key:'resenas',  label:'⭐ Reseñas'},
                  {key:'estrategia', label:'📅 Estrategia'},
                  {key:'ofertas',  label:'🏷️ Ofertas'},
                ] as const).map(t => (
                  <button key={t.key} className={`ia-tab ${iaTab === t.key ? 'active' : ''}`} onClick={() => { setIaTab(t.key); setIaError('') }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Posts Instagram ── */}
              {iaTab === 'posts' && (
                <div>
                  <div className="ia-form-row">
                    <label className="ia-label">Tema del post</label>
                    <div className="ia-chip-row">
                      {([
                        {key:'promocion',      label:'🏷️ Promoción'},
                        {key:'nuevo_servicio', label:'✨ Nuevo servicio'},
                        {key:'festivo',        label:'🎉 Festivo'},
                        {key:'consejo',        label:'💡 Consejo útil'},
                        {key:'agradecimiento', label:'🙏 Agradecimiento'},
                        {key:'detras',         label:'🎬 Behind the scenes'},
                      ] as const).map(c => (
                        <button key={c.key} className={`ia-chip ${postTema === c.key ? 'active' : ''}`} onClick={() => setPostTema(c.key)}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ia-form-row">
                    <label className="ia-label">Contexto adicional <span style={{fontWeight:400, color:'var(--muted)'}}>(opcional)</span></label>
                    <textarea
                      className="ia-textarea"
                      placeholder="Ej: Tenemos un 20% de descuento este fin de semana, nueva máquina de tratamiento facial..."
                      value={postContexto}
                      onChange={e => setPostContexto(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <button className="btn-ia" onClick={generarPost} disabled={generando || !negocioNombre}>
                    {generando ? '⏳ Generando post...' : '✨ Generar post para Instagram'}
                  </button>
                  {iaError && <div className="ia-error">⚠️ {iaError}</div>}
                  {postResultado && (
                    <div className="ia-result-wrap">
                      <div className="ia-result-box">
                        {postResultado}
                        <button className={`ia-copy-btn ${postCopiado ? 'ok' : ''}`} onClick={() => copiarIA(postResultado, setPostCopiado)}>
                          {postCopiado ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Respuestas a reseñas ── */}
              {iaTab === 'resenas' && (
                <div>
                  <div className="ia-form-row">
                    <label className="ia-label">Puntuación de la reseña</label>
                    <div className="stars-row">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} className="star-btn" onClick={() => setReseñaEstrellas(n)}>
                          {n <= reseñaEstrellas ? '⭐' : '☆'}
                        </button>
                      ))}
                      <span style={{marginLeft:'6px', fontSize:'13px', color:'var(--text2)', alignSelf:'center'}}>{reseñaEstrellas} estrella{reseñaEstrellas !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="ia-form-row">
                    <label className="ia-label">Tono de la respuesta</label>
                    <div className="tono-row">
                      {([
                        {key:'profesional', label:'💼 Profesional'},
                        {key:'amigable',    label:'😊 Amigable'},
                        {key:'formal',      label:'🎩 Formal'},
                      ] as const).map(t => (
                        <button key={t.key} className={`tono-btn ${reseñaTono === t.key ? 'active' : ''}`} onClick={() => setReseñaTono(t.key)}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ia-form-row">
                    <label className="ia-label">Texto de la reseña</label>
                    <textarea
                      className="ia-textarea"
                      placeholder="Pega aquí el texto de la reseña que quieres responder..."
                      value={reseñaTexto}
                      onChange={e => setReseñaTexto(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <button className="btn-ia" onClick={generarRespuestaResena} disabled={generando || !reseñaTexto.trim()}>
                    {generando ? '⏳ Generando respuestas...' : '💬 Generar 2 respuestas'}
                  </button>
                  {iaError && <div className="ia-error">⚠️ {iaError}</div>}
                  {reseñaResultado && (
                    <div className="ia-result-wrap">
                      <div className="ia-result-box">
                        {reseñaResultado}
                        <button className={`ia-copy-btn ${reseñaCopiado ? 'ok' : ''}`} onClick={() => copiarIA(reseñaResultado, setReseñaCopiado)}>
                          {reseñaCopiado ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Estrategia mensual ── */}
              {iaTab === 'estrategia' && (
                <div>
                  <div className="ia-row2">
                    <div className="ia-form-row" style={{marginBottom:0}}>
                      <label className="ia-label">Mes</label>
                      <select className="ia-select" value={estrategiaMes} onChange={e => setEstrategiaMes(Number(e.target.value))}>
                        {MESES_NOMBRE.map((m, i) => <option key={i} value={i}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="ia-form-row" style={{marginBottom:0}}>
                      <label className="ia-label">Año</label>
                      <select className="ia-select" value={estrategiaAnio} onChange={e => setEstrategiaAnio(Number(e.target.value))}>
                        {[hoy.getFullYear(), hoy.getFullYear()+1].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="ia-form-row">
                    <label className="ia-label">Objetivo principal</label>
                    <select className="ia-select" value={estrategiaObjetivo} onChange={e => setEstrategiaObjetivo(e.target.value)}>
                      <option value="nuevos_clientes">Atraer nuevos clientes</option>
                      <option value="fidelizacion">Fidelizar clientes actuales</option>
                      <option value="ventas">Aumentar ventas y ticket medio</option>
                      <option value="visibilidad">Aumentar visibilidad y seguidores</option>
                    </select>
                  </div>
                  <button className="btn-ia" onClick={generarEstrategia} disabled={generando || !negocioNombre}>
                    {generando ? '⏳ Generando calendario...' : '📅 Generar estrategia mensual'}
                  </button>
                  {iaError && <div className="ia-error">⚠️ {iaError}</div>}
                  {estrategiaResultado && (
                    <div className="ia-result-wrap">
                      <div className="ia-result-box">
                        {estrategiaResultado}
                        <button className={`ia-copy-btn ${estrategiaCopiado ? 'ok' : ''}`} onClick={() => copiarIA(estrategiaResultado, setEstrategiaCopiado)}>
                          {estrategiaCopiado ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Ofertas y promociones ── */}
              {iaTab === 'ofertas' && (
                <div>
                  <div className="ia-form-row">
                    <label className="ia-label">Temporada u ocasión</label>
                    <div className="ia-chip-row">
                      {([
                        {key:'actual',      label:'📆 Temporada actual'},
                        {key:'primavera',   label:'🌸 Primavera'},
                        {key:'verano',      label:'☀️ Verano'},
                        {key:'otono',       label:'🍂 Otoño'},
                        {key:'invierno',    label:'❄️ Invierno'},
                        {key:'navidad',     label:'🎄 Navidad'},
                        {key:'san_valentin',label:'💝 San Valentín'},
                        {key:'black_friday',label:'🛍️ Black Friday'},
                        {key:'vuelta_cole', label:'🎒 Vuelta al cole'},
                        {key:'dia_madre',   label:'💐 Día de la Madre'},
                        {key:'personalizado',label:'✏️ Personalizado'},
                      ] as const).map(c => (
                        <button key={c.key} className={`ia-chip ${ofertaTemporada === c.key ? 'active' : ''}`} onClick={() => setOfertaTemporada(c.key)}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ia-form-row">
                    <label className="ia-label">Notas o restricciones <span style={{fontWeight:400, color:'var(--muted)'}}>(opcional)</span></label>
                    <textarea
                      className="ia-textarea"
                      placeholder="Ej: Solo para clientes nuevos, máximo 10% descuento, queremos dar de regalo un producto..."
                      value={ofertaNotas}
                      onChange={e => setOfertaNotas(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <button className="btn-ia" onClick={generarOfertas} disabled={generando || !negocioNombre}>
                    {generando ? '⏳ Generando ofertas...' : '🏷️ Generar 4 ideas de promociones'}
                  </button>
                  {iaError && <div className="ia-error">⚠️ {iaError}</div>}
                  {ofertaResultado && (
                    <div className="ia-result-wrap">
                      <div className="ia-result-box">
                        {ofertaResultado}
                        <button className={`ia-copy-btn ${ofertaCopiado ? 'ok' : ''}`} onClick={() => copiarIA(ofertaResultado, setOfertaCopiado)}>
                          {ofertaCopiado ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* ── 5. CONSEJOS ── */}
            <div className="sec-title">💡 Consejos para mejorar tu perfil</div>
            <div className="tips-grid">
              {tips.map((tip, i) => (
                <div key={i} className="tip-card" style={{background: tip.color, borderColor: tip.border}}>
                  <div className="tip-icon">{tip.icon}</div>
                  <div className="tip-titulo">{tip.titulo}</div>
                  <div className="tip-desc">{tip.desc}</div>
                </div>
              ))}
            </div>

          </main>
        </div>
      </div>
    </>
  )
}
