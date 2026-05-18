'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { descontarCreditos, obtenerCreditos } from '../../lib/creditos'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

// ─── Types ────────────────────────────────────────────────────────────────────

type Resena = {
  id: string
  valoracion: number
  comentario: string | null
  autor_nombre: string | null
  created_at: string
  respuesta?: string | null
}

type CalSlot = {
  fecha: string
  tipo: string
  tema: string
  caption: string
}

// ─── Template renderers ───────────────────────────────────────────────────────

function TemplateDarkPublicacion({ contenido, negocioNombre }: {
  contenido: { titulo: string; subtitulo: string; dato: string | null; cta: string }
  negocioNombre: string
}) {
  return (
    <div style={{
      width: 540, height: 540, background: '#080810', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '48px',
    }}>
      {/* Blobs */}
      <div style={{ position:'absolute', top:-80, left:-80, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(107,79,216,0.45) 0%,transparent 70%)', filter:'blur(30px)' }} />
      <div style={{ position:'absolute', bottom:-60, right:-60, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.35) 0%,transparent 70%)', filter:'blur(25px)' }} />
      <div style={{ position:'absolute', top:'40%', right:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.25) 0%,transparent 70%)', filter:'blur(20px)' }} />
      {/* Content */}
      <div style={{ position:'relative', zIndex:2, textAlign:'center', width:'100%' }}>
        {contenido.dato && (
          <div style={{ fontSize:72, fontWeight:900, color:'#FFFFFF', lineHeight:1, marginBottom:8, letterSpacing:'-2px',
            background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {contenido.dato}
          </div>
        )}
        <div style={{ fontSize: contenido.dato ? 28 : 36, fontWeight:800, color:'#FFFFFF', lineHeight:1.2, marginBottom:12, letterSpacing:'-0.5px' }}>
          {contenido.titulo}
        </div>
        <div style={{ fontSize:16, color:'rgba(255,255,255,0.65)', lineHeight:1.5, marginBottom:32 }}>
          {contenido.subtitulo}
        </div>
        <div style={{ display:'inline-block', padding:'12px 28px', background:'linear-gradient(135deg,#6B4FD8,#4F46E5)', borderRadius:100, fontSize:14, fontWeight:700, color:'white' }}>
          {contenido.cta}
        </div>
      </div>
      {/* Negocio name */}
      <div style={{ position:'absolute', bottom:20, left:0, right:0, textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.35)', letterSpacing:1, textTransform:'uppercase' }}>
        {negocioNombre}
      </div>
    </div>
  )
}

function TemplateClaroPublicacion({ contenido, negocioNombre }: {
  contenido: { titulo: string; subtitulo: string; dato: string | null; cta: string }
  negocioNombre: string
}) {
  return (
    <div style={{
      width: 540, height: 540, background: '#F7F9FC', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '48px',
    }}>
      <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(184,216,248,0.7) 0%,transparent 70%)', filter:'blur(20px)' }} />
      <div style={{ position:'absolute', bottom:-50, left:-50, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,197,249,0.6) 0%,transparent 70%)', filter:'blur(20px)' }} />
      <div style={{ position:'relative', zIndex:2, textAlign:'center', width:'100%' }}>
        {contenido.dato && (
          <div style={{ fontSize:72, fontWeight:900, lineHeight:1, marginBottom:8, letterSpacing:'-2px',
            background:'linear-gradient(135deg,#4F46E5,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {contenido.dato}
          </div>
        )}
        <div style={{ fontSize: contenido.dato ? 28 : 36, fontWeight:800, color:'#111827', lineHeight:1.2, marginBottom:12, letterSpacing:'-0.5px' }}>
          {contenido.titulo}
        </div>
        <div style={{ fontSize:16, color:'#6B7280', lineHeight:1.5, marginBottom:32 }}>
          {contenido.subtitulo}
        </div>
        <div style={{ display:'inline-block', padding:'12px 28px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', borderRadius:100, fontSize:14, fontWeight:700, color:'white' }}>
          {contenido.cta}
        </div>
      </div>
      <div style={{ position:'absolute', bottom:20, left:0, right:0, textAlign:'center', fontSize:12, color:'#9CA3AF', letterSpacing:1, textTransform:'uppercase' }}>
        {negocioNombre}
      </div>
    </div>
  )
}

function TemplateDarkHistoria({ contenido, negocioNombre }: {
  contenido: { titulo: string; subtitulo: string; dato: string | null; cta: string }
  negocioNombre: string
}) {
  return (
    <div style={{
      width: 540, height: 960, background: '#080810', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '60px 48px',
    }}>
      <div style={{ position:'absolute', top:-100, left:-80, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(107,79,216,0.5) 0%,transparent 70%)', filter:'blur(40px)' }} />
      <div style={{ position:'absolute', bottom:-80, right:-60, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.4) 0%,transparent 70%)', filter:'blur(30px)' }} />
      <div style={{ position:'absolute', top:'30%', right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.3) 0%,transparent 70%)', filter:'blur(25px)' }} />
      <div style={{ position:'relative', zIndex:2, textAlign:'center', width:'100%' }}>
        {contenido.dato && (
          <div style={{ fontSize:96, fontWeight:900, color:'#FFFFFF', lineHeight:1, marginBottom:12, letterSpacing:'-3px',
            background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {contenido.dato}
          </div>
        )}
        <div style={{ fontSize: contenido.dato ? 36 : 48, fontWeight:800, color:'#FFFFFF', lineHeight:1.2, marginBottom:16, letterSpacing:'-0.5px' }}>
          {contenido.titulo}
        </div>
        <div style={{ fontSize:20, color:'rgba(255,255,255,0.65)', lineHeight:1.6, marginBottom:48 }}>
          {contenido.subtitulo}
        </div>
        <div style={{ display:'inline-block', padding:'16px 40px', background:'linear-gradient(135deg,#6B4FD8,#4F46E5)', borderRadius:100, fontSize:18, fontWeight:700, color:'white' }}>
          {contenido.cta}
        </div>
      </div>
      <div style={{ position:'absolute', bottom:32, left:0, right:0, textAlign:'center', fontSize:14, color:'rgba(255,255,255,0.35)', letterSpacing:1.5, textTransform:'uppercase' }}>
        {negocioNombre}
      </div>
    </div>
  )
}

function TemplateClaroHistoria({ contenido, negocioNombre }: {
  contenido: { titulo: string; subtitulo: string; dato: string | null; cta: string }
  negocioNombre: string
}) {
  return (
    <div style={{
      width: 540, height: 960, background: '#F7F9FC', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '60px 48px',
    }}>
      <div style={{ position:'absolute', top:-80, right:-60, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(184,216,248,0.8) 0%,transparent 70%)', filter:'blur(30px)' }} />
      <div style={{ position:'absolute', bottom:-60, left:-40, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,197,249,0.7) 0%,transparent 70%)', filter:'blur(25px)' }} />
      <div style={{ position:'relative', zIndex:2, textAlign:'center', width:'100%' }}>
        {contenido.dato && (
          <div style={{ fontSize:96, fontWeight:900, lineHeight:1, marginBottom:12, letterSpacing:'-3px',
            background:'linear-gradient(135deg,#4F46E5,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {contenido.dato}
          </div>
        )}
        <div style={{ fontSize: contenido.dato ? 36 : 48, fontWeight:800, color:'#111827', lineHeight:1.2, marginBottom:16, letterSpacing:'-0.5px' }}>
          {contenido.titulo}
        </div>
        <div style={{ fontSize:20, color:'#6B7280', lineHeight:1.6, marginBottom:48 }}>
          {contenido.subtitulo}
        </div>
        <div style={{ display:'inline-block', padding:'16px 40px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', borderRadius:100, fontSize:18, fontWeight:700, color:'white' }}>
          {contenido.cta}
        </div>
      </div>
      <div style={{ position:'absolute', bottom:32, left:0, right:0, textAlign:'center', fontSize:14, color:'#9CA3AF', letterSpacing:1.5, textTransform:'uppercase' }}>
        {negocioNombre}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio]             = useState<NegMin | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [negocioId, setNegocioId]         = useState<string | null>(null)
  const [negServicios, setNegServicios]   = useState<string[]>([])
  const [cargando, setCargando]           = useState(true)

  // ── Sección 1: Crear contenido ────────────────────────────────────────────
  const [formato, setFormato]         = useState<'publicacion' | 'historia'>('publicacion')
  const [paso, setPaso]               = useState<1 | 2 | 3>(1)
  const [tipoContenido, setTipoContenido] = useState<'promocion' | 'nuevo_servicio' | 'consejo' | 'oferta' | 'presentacion'>('promocion')
  const [tono, setTono]               = useState<'profesional' | 'cercano' | 'divertido'>('cercano')
  const [servicio, setServicio]       = useState('')
  const [estilo, setEstilo]           = useState<'oscuro' | 'claro'>('oscuro')
  const [imgContenido, setImgContenido] = useState<{
    titulo: string; subtitulo: string; dato: string | null; cta: string
    descripcion?: string; hashtags?: string[]
  } | null>(null)
  const [generandoImg, setGenerandoImg] = useState(false)
  const [imgError, setImgError]       = useState('')
  const [imgDescargando, setImgDescargando] = useState(false)
  const [descCopiado, setDescCopiado] = useState(false)
  const [hashCopiado, setHashCopiado] = useState(false)
  const pubRef    = useRef<HTMLDivElement>(null)
  const historiaRef = useRef<HTMLDivElement>(null)

  // ── Sección 2: Responder reseñas ─────────────────────────────────────────
  const [resenas, setResenas]             = useState<Resena[]>([])
  const [respuestas, setRespuestas]       = useState<Record<string, string>>({})
  const [generandoResp, setGenerandoResp] = useState<string | null>(null)
  const [respCopiada, setRespCopiada]     = useState<string | null>(null)

  // ── Sección 3: Calendario mensual ────────────────────────────────────────
  const hoyDate                           = new Date()
  const [calMes, setCalMes]               = useState(hoyDate.getMonth())
  const [calAnio, setCalAnio]             = useState(hoyDate.getFullYear())
  const [calSlots, setCalSlots]           = useState<CalSlot[]>([])
  const [generandoCal, setGenerandoCal]   = useState(false)
  const [calError, setCalError]           = useState('')

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  // ─── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const { activo, todos } = await getNegocioActivo(session.user.id, session.access_token)
      if (!activo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todos)
      setNegocio(activo)
      setNegocioNombre(activo.nombre)
      setNegocioId(activo.id)

      const [{ data: svcs }, { data: res }] = await Promise.all([
        db.from('servicios').select('nombre').eq('negocio_id', activo.id).eq('activo', true).order('nombre'),
        db.from('resenas').select('id, valoracion, comentario, autor_nombre, created_at, respuesta')
          .eq('negocio_id', activo.id).is('respuesta', null).order('created_at', { ascending: false }).limit(20),
      ])
      if (svcs) setNegServicios(svcs.map((s: { nombre: string }) => s.nombre))
      if (res)  setResenas(res as Resena[])
      setCargando(false)
    })()
  }, [])

  // ─── Generar imagen ──────────────────────────────────────────────────────
  async function generarImagen() {
    if (!negocioId) return
    setImgError('')
    setGenerandoImg(true)

    const creditos = await obtenerCreditos(negocioId)
    if (!creditos || creditos.disponibles < 10) {
      setImgError('Necesitas al menos 10 créditos para generar contenido.')
      setGenerandoImg(false)
      return
    }

    const tipoLabel: Record<string, string> = {
      promocion: 'una promoción especial', nuevo_servicio: 'un nuevo servicio',
      consejo: 'un consejo profesional', oferta: 'una oferta de temporada',
      presentacion: 'la presentación del negocio',
    }
    const esHistoria = formato === 'historia'

    const prompt = `Eres experto en marketing para negocios de servicios en España. Crea contenido para ${tipoLabel[tipoContenido]} del negocio "${negocioNombre}"${servicio ? `, destacando "${servicio}"` : ''}. Tono: ${tono}. Formato: ${esHistoria ? 'historia vertical Instagram' : 'publicación cuadrada Instagram'}.

Devuelve SOLO JSON sin markdown:
{
  "titulo": "máximo 4 palabras impactantes",
  "subtitulo": "máximo 8 palabras descriptivas",
  "dato": "cifra o dato impactante o null",
  "cta": "llamada a la acción máximo 4 palabras",
  "descripcion": "texto completo para caption Instagram máximo 120 palabras en español",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"]
}`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const { text } = await res.json()
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      setImgContenido(parsed)
      await descontarCreditos(negocioId, 10, 'crear_contenido_marketing')
      setPaso(3)
    } catch {
      setImgError('Error al generar el contenido. Inténtalo de nuevo.')
    }
    setGenerandoImg(false)
  }

  // ─── Descargar imagen ────────────────────────────────────────────────────
  async function descargarImagen() {
    const ref = formato === 'historia' ? historiaRef : pubRef
    if (!ref.current || !imgContenido) return
    setImgDescargando(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const [w, h] = formato === 'historia' ? [540, 960] : [540, 540]
      const canvas = await html2canvas(ref.current, { width: w, height: h, scale: 2, useCORS: true, backgroundColor: null })
      const link = document.createElement('a')
      link.download = `marketing_${formato}_${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      /* ignorar */
    }
    setImgDescargando(false)
  }

  // ─── Generar respuesta reseña ────────────────────────────────────────────
  async function generarRespuesta(resena: Resena) {
    if (!negocioId) return
    setGenerandoResp(resena.id)

    const ok = await descontarCreditos(negocioId, 3, 'respuesta_resena')
    if (!ok) { setGenerandoResp(null); return }

    const prompt = `Eres el propietario de "${negocioNombre}", negocio de servicios en España. Responde a esta reseña de forma ${resena.valoracion >= 4 ? 'agradecida y cercana' : 'empática y constructiva'}. Respuesta máximo 3 frases, en español, natural.

Reseña (${resena.valoracion}★): "${resena.comentario ?? 'Sin comentario'}"
Autor: ${resena.autor_nombre ?? 'cliente'}

Devuelve SOLO el texto de la respuesta, sin comillas ni explicaciones.`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const { text } = await res.json()
      setRespuestas(prev => ({ ...prev, [resena.id]: text.trim() }))
    } catch { /* ignorar */ }
    setGenerandoResp(null)
  }

  async function guardarRespuesta(resena: Resena) {
    const texto = respuestas[resena.id]
    if (!texto?.trim()) return
    await supabase.from('resenas').update({ respuesta: texto.trim() }).eq('id', resena.id)
    setResenas(prev => prev.filter(r => r.id !== resena.id))
  }

  // ─── Generar calendario ──────────────────────────────────────────────────
  async function generarCalendario() {
    if (!negocioId) return
    setCalError('')
    setGenerandoCal(true)

    const ok = await descontarCreditos(negocioId, 15, 'calendario_marketing')
    if (!ok) {
      setCalError('Necesitas al menos 15 créditos para generar el calendario.')
      setGenerandoCal(false)
      return
    }

    const serviciosStr = negServicios.slice(0, 5).join(', ') || 'servicios generales'
    const mesNombre = MESES[calMes]

    const prompt = `Eres experto en marketing para negocios de servicios en España. Crea un plan de contenido para Instagram para "${negocioNombre}" (servicios: ${serviciosStr}) para ${mesNombre} ${calAnio}. 3 publicaciones por semana, 12 en total.

Devuelve SOLO JSON sin markdown:
{
  "posts": [
    {"semana": 1, "dia": "lunes", "tipo": "Educativo|Promocional|Behind the scenes|Testimonio|Oferta", "tema": "tema corto máx 8 palabras", "caption": "ejemplo de caption máx 40 palabras"},
    ... (12 posts en total, 3 por semana durante 4 semanas)
  ]
}`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const { text } = await res.json()
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      const posts: CalSlot[] = (parsed.posts ?? []).map((p: {
        semana: number; dia: string; tipo: string; tema: string; caption: string
      }) => ({
        fecha: `Sem. ${p.semana} — ${p.dia}`,
        tipo: p.tipo,
        tema: p.tema,
        caption: p.caption,
      }))
      setCalSlots(posts)
    } catch {
      setCalError('Error al generar el calendario. Inténtalo de nuevo.')
    }
    setGenerandoCal(false)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }

        .mk-wrap { animation: fadeUp .3s ease; max-width: 900px; }

        /* ── Section card ── */
        .mk-section { background:white; border:1px solid #E8ECF0; border-radius:20px; padding:28px; box-shadow:0 2px 8px rgba(0,0,0,0.04); margin-bottom:20px; }
        .mk-section-head { display:flex; align-items:center; gap:12px; margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid #F3F4F6; }
        .mk-section-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .mk-section-title { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:#111827; }
        .mk-section-sub { font-size:13px; color:#9CA3AF; margin-top:2px; }

        /* ── Paso selector ── */
        .mk-steps { display:flex; gap:0; margin-bottom:24px; border:1px solid #E5E7EB; border-radius:12px; overflow:hidden; }
        .mk-step { flex:1; padding:10px 14px; font-size:12.5px; font-weight:700; text-align:center; background:#F9FAFB; color:#6B7280; border:none; cursor:pointer; font-family:inherit; transition:all .15s; }
        .mk-step.active { background:#4F46E5; color:white; }
        .mk-step:not(:last-child) { border-right:1px solid #E5E7EB; }

        /* ── Format cards ── */
        .mk-format-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px; }
        .mk-format-card { border:2px solid #E5E7EB; border-radius:16px; padding:20px; cursor:pointer; transition:all .15s; text-align:center; background:white; }
        .mk-format-card:hover { border-color:#C7D2FE; }
        .mk-format-card.selected { border-color:#4F46E5; background:#EEF2FF; }
        .mk-format-emoji { font-size:36px; display:block; margin-bottom:10px; }
        .mk-format-name { font-size:15px; font-weight:800; color:#111827; margin-bottom:4px; }
        .mk-format-dim { font-size:12px; color:#9CA3AF; }

        /* ── Form fields ── */
        .mk-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px; }
        .mk-field { display:flex; flex-direction:column; gap:5px; }
        .mk-field-full { grid-column:1/-1; }
        .mk-label { font-size:11.5px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.4px; }
        .mk-select, .mk-input { width:100%; padding:9px 12px; border:1.5px solid rgba(0,0,0,0.1); border-radius:10px; font-size:13px; font-family:inherit; outline:none; background:white; }
        .mk-select:focus, .mk-input:focus { border-color:#4F46E5; }

        /* ── Estilo toggle ── */
        .mk-estilo-row { display:flex; gap:8px; }
        .mk-estilo-btn { flex:1; padding:9px; border-radius:10px; border:1.5px solid #E5E7EB; background:white; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; text-align:center; }
        .mk-estilo-btn.selected-dark { background:#080810; color:white; border-color:#080810; }
        .mk-estilo-btn.selected-light { background:#F7F9FC; color:#111827; border-color:#4F46E5; }
        .mk-estilo-btn:not([class*=selected]):hover { border-color:#C7D2FE; }

        /* ── Generate button ── */
        .mk-gen-btn { width:100%; padding:14px; border-radius:14px; border:none; background:linear-gradient(135deg,#4F46E5,#7C3AED); color:white; font-size:15px; font-weight:800; cursor:pointer; font-family:inherit; transition:opacity .15s; display:flex; align-items:center; justify-content:center; gap:10px; }
        .mk-gen-btn:hover:not(:disabled) { opacity:0.9; }
        .mk-gen-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .mk-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin .8s linear infinite; }

        /* ── Error box ── */
        .mk-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:10px 14px; font-size:13px; color:#B91C1C; margin-bottom:14px; }

        /* ── Preview step ── */
        .mk-preview-wrap { display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; }
        .mk-preview-img { flex-shrink:0; border-radius:12px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.15); }
        .mk-preview-info { flex:1; min-width:260px; }
        .mk-preview-label { font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
        .mk-copy-area { background:#F8FAFC; border:1px solid #E5E7EB; border-radius:12px; padding:14px; margin-bottom:12px; font-size:13px; color:#374151; line-height:1.6; white-space:pre-wrap; }
        .mk-copy-btn { padding:8px 14px; border-radius:9px; border:1.5px solid #E5E7EB; background:white; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .15s; color:#374151; }
        .mk-copy-btn:hover { border-color:#4F46E5; color:#4F46E5; }
        .mk-copy-btn.copied { background:#ECFDF5; border-color:#6EE7B7; color:#059669; }
        .mk-dl-btn { width:100%; padding:12px; border-radius:12px; border:none; background:#111827; color:white; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity .15s; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:10px; }
        .mk-dl-btn:hover:not(:disabled) { opacity:0.85; }
        .mk-dl-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .mk-restart-btn { width:100%; padding:10px; border-radius:12px; border:1.5px solid #E5E7EB; background:white; font-size:13px; font-weight:700; color:#374151; cursor:pointer; font-family:inherit; transition:all .15s; }
        .mk-restart-btn:hover { border-color:#4F46E5; color:#4F46E5; }

        /* ── Reseñas ── */
        .mk-resena-card { border:1px solid #F0F2F5; border-radius:14px; padding:16px; margin-bottom:12px; }
        .mk-resena-stars { font-size:16px; margin-bottom:6px; }
        .mk-resena-text { font-size:13px; color:#374151; line-height:1.5; margin-bottom:4px; }
        .mk-resena-meta { font-size:11px; color:#9CA3AF; margin-bottom:12px; }
        .mk-resena-resp-area { width:100%; min-height:80px; resize:vertical; border:1.5px solid #E5E7EB; border-radius:10px; padding:10px 12px; font-size:13px; font-family:inherit; outline:none; margin-bottom:8px; }
        .mk-resena-resp-area:focus { border-color:#4F46E5; }
        .mk-resena-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .mk-resena-btn { padding:8px 14px; border-radius:9px; border:none; font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity .15s; }
        .mk-resena-btn:hover:not(:disabled) { opacity:0.85; }
        .mk-resena-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .mk-empty { text-align:center; padding:40px 20px; color:#9CA3AF; }
        .mk-empty-icon { font-size:36px; margin-bottom:10px; opacity:0.5; }

        /* ── Calendario ── */
        .mk-cal-controls { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
        .mk-cal-select { padding:9px 12px; border:1.5px solid #E5E7EB; border-radius:10px; font-size:13px; font-family:inherit; outline:none; background:white; }
        .mk-cal-select:focus { border-color:#4F46E5; }
        .mk-cal-gen-btn { padding:10px 20px; border-radius:10px; border:none; background:linear-gradient(135deg,#4F46E5,#7C3AED); color:white; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; transition:opacity .15s; }
        .mk-cal-gen-btn:hover:not(:disabled) { opacity:0.9; }
        .mk-cal-gen-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .mk-cal-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
        .mk-cal-slot { border:1px solid #E8ECF0; border-radius:14px; padding:14px; background:white; }
        .mk-cal-slot-date { font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
        .mk-cal-slot-tipo { display:inline-flex; padding:3px 9px; border-radius:100px; font-size:11px; font-weight:700; margin-bottom:8px; }
        .mk-cal-slot-tema { font-size:13px; font-weight:700; color:#111827; margin-bottom:6px; }
        .mk-cal-slot-caption { font-size:12px; color:#6B7280; line-height:1.5; }
        .mk-cal-sem { font-size:12px; font-weight:700; color:#4F46E5; padding:8px 0 4px; }

        /* Type color badges */
        .tipo-Educativo { background:rgba(59,130,246,0.1); color:#1D4ED8; }
        .tipo-Promocional { background:rgba(239,68,68,0.1); color:#B91C1C; }
        .tipo-Behind { background:rgba(52,211,153,0.1); color:#065F46; }
        .tipo-Testimonio { background:rgba(196,134,10,0.1); color:#92400E; }
        .tipo-Oferta { background:rgba(107,79,216,0.1); color:#6B4FD8; }

        @media (max-width:700px) {
          .mk-format-grid { grid-template-columns:1fr 1fr; }
          .mk-form-grid { grid-template-columns:1fr; }
          .mk-preview-wrap { flex-direction:column; }
          .mk-preview-img { align-self:center; }
          .mk-cal-grid { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:480px) {
          .mk-section { padding:18px; }
          .mk-format-grid { grid-template-columns:1fr 1fr; gap:8px; }
          .mk-cal-grid { grid-template-columns:1fr; }
        }
      `}</style>

      {/* Hidden templates for html2canvas */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, visibility: 'hidden', pointerEvents: 'none' }}>
        <div ref={pubRef}>
          {imgContenido && (estilo === 'oscuro'
            ? <TemplateDarkPublicacion contenido={imgContenido} negocioNombre={negocioNombre} />
            : <TemplateClaroPublicacion contenido={imgContenido} negocioNombre={negocioNombre} />
          )}
        </div>
        <div ref={historiaRef}>
          {imgContenido && (estilo === 'oscuro'
            ? <TemplateDarkHistoria contenido={imgContenido} negocioNombre={negocioNombre} />
            : <TemplateClaroHistoria contenido={imgContenido} negocioNombre={negocioNombre} />
          )}
        </div>
      </div>

      <div className="mk-wrap">

        {/* ════════════════════════════════════════════════
            SECCIÓN 1 — Crear contenido
        ════════════════════════════════════════════════ */}
        <div className="mk-section">
          <div className="mk-section-head">
            <div className="mk-section-icon" style={{ background: 'linear-gradient(135deg,#EEF2FF,#F5F3FF)' }}>🎨</div>
            <div>
              <div className="mk-section-title">Crear contenido</div>
              <div className="mk-section-sub">Genera imágenes para Instagram listas para publicar · 10 créditos</div>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="mk-steps">
            <button className={`mk-step${paso === 1 ? ' active' : ''}`} onClick={() => { setPaso(1); setImgContenido(null) }}>
              1 · Formato
            </button>
            <button className={`mk-step${paso === 2 ? ' active' : ''}`} onClick={() => paso >= 2 && setPaso(2)}>
              2 · Configurar
            </button>
            <button className={`mk-step${paso === 3 ? ' active' : ''}`} onClick={() => paso === 3 && setPaso(3)}>
              3 · Resultado
            </button>
          </div>

          {/* PASO 1: Elegir formato */}
          {paso === 1 && (
            <div>
              <div className="mk-format-grid">
                <div
                  className={`mk-format-card${formato === 'publicacion' ? ' selected' : ''}`}
                  onClick={() => setFormato('publicacion')}
                >
                  <span className="mk-format-emoji">📸</span>
                  <div className="mk-format-name">Publicación</div>
                  <div className="mk-format-dim">1080 × 1080 px</div>
                </div>
                <div
                  className={`mk-format-card${formato === 'historia' ? ' selected' : ''}`}
                  onClick={() => setFormato('historia')}
                >
                  <span className="mk-format-emoji">📱</span>
                  <div className="mk-format-name">Historia</div>
                  <div className="mk-format-dim">1080 × 1920 px</div>
                </div>
              </div>
              <button className="mk-gen-btn" onClick={() => setPaso(2)}>
                Continuar con {formato === 'publicacion' ? 'Publicación' : 'Historia'} →
              </button>
            </div>
          )}

          {/* PASO 2: Configurar */}
          {paso === 2 && (
            <div>
              {imgError && <div className="mk-error">{imgError}</div>}
              <div className="mk-form-grid">
                <div className="mk-field">
                  <label className="mk-label">Tipo de contenido</label>
                  <select className="mk-select" value={tipoContenido} onChange={e => setTipoContenido(e.target.value as typeof tipoContenido)}>
                    <option value="promocion">🎉 Promoción especial</option>
                    <option value="nuevo_servicio">✨ Nuevo servicio</option>
                    <option value="consejo">💡 Consejo profesional</option>
                    <option value="oferta">🏷️ Oferta de temporada</option>
                    <option value="presentacion">👋 Presentación</option>
                  </select>
                </div>
                <div className="mk-field">
                  <label className="mk-label">Tono de voz</label>
                  <select className="mk-select" value={tono} onChange={e => setTono(e.target.value as typeof tono)}>
                    <option value="cercano">😊 Cercano y amigable</option>
                    <option value="profesional">💼 Profesional</option>
                    <option value="divertido">🎈 Divertido</option>
                  </select>
                </div>
                <div className="mk-field mk-field-full">
                  <label className="mk-label">Servicio destacado (opcional)</label>
                  {negServicios.length > 0 ? (
                    <select className="mk-select" value={servicio} onChange={e => setServicio(e.target.value)}>
                      <option value="">Sin servicio específico</option>
                      {negServicios.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input className="mk-input" placeholder="Ej: Corte de cabello, Manicura…" value={servicio} onChange={e => setServicio(e.target.value)} />
                  )}
                </div>
                <div className="mk-field mk-field-full">
                  <label className="mk-label">Estilo visual</label>
                  <div className="mk-estilo-row">
                    <button
                      className={`mk-estilo-btn${estilo === 'oscuro' ? ' selected-dark' : ''}`}
                      onClick={() => setEstilo('oscuro')}
                    >
                      🌙 Oscuro
                    </button>
                    <button
                      className={`mk-estilo-btn${estilo === 'claro' ? ' selected-light' : ''}`}
                      onClick={() => setEstilo('claro')}
                    >
                      ☀️ Claro
                    </button>
                  </div>
                </div>
              </div>
              <button className="mk-gen-btn" onClick={generarImagen} disabled={generandoImg || cargando}>
                {generandoImg ? <><span className="mk-spinner" /> Generando…</> : '✨ Generar con IA — 10 créditos'}
              </button>
            </div>
          )}

          {/* PASO 3: Resultado */}
          {paso === 3 && imgContenido && (
            <div className="mk-preview-wrap">
              {/* Preview miniatura visible */}
              <div className="mk-preview-img" style={{ transform: formato === 'historia' ? 'scale(0.42)' : 'scale(0.55)', transformOrigin: 'top left', marginBottom: formato === 'historia' ? -220 : -8 }}>
                {estilo === 'oscuro'
                  ? (formato === 'publicacion'
                    ? <TemplateDarkPublicacion contenido={imgContenido} negocioNombre={negocioNombre} />
                    : <TemplateDarkHistoria contenido={imgContenido} negocioNombre={negocioNombre} />)
                  : (formato === 'publicacion'
                    ? <TemplateClaroPublicacion contenido={imgContenido} negocioNombre={negocioNombre} />
                    : <TemplateClaroHistoria contenido={imgContenido} negocioNombre={negocioNombre} />)
                }
              </div>

              {/* Actions + text */}
              <div className="mk-preview-info">
                <button className="mk-dl-btn" onClick={descargarImagen} disabled={imgDescargando}>
                  {imgDescargando ? <><span className="mk-spinner" style={{ borderTopColor:'white' }} /> Exportando…</> : '⬇️ Descargar PNG'}
                </button>

                {formato === 'publicacion' && imgContenido.descripcion && (
                  <>
                    <div className="mk-preview-label">Descripción</div>
                    <div className="mk-copy-area">{imgContenido.descripcion}</div>
                    <button
                      className={`mk-copy-btn${descCopiado ? ' copied' : ''}`}
                      onClick={() => {
                        navigator.clipboard?.writeText(imgContenido.descripcion ?? '')
                        setDescCopiado(true)
                        setTimeout(() => setDescCopiado(false), 2000)
                      }}
                    >
                      {descCopiado ? '✓ Copiada' : '📋 Copiar descripción'}
                    </button>
                  </>
                )}

                {formato === 'publicacion' && imgContenido.hashtags && imgContenido.hashtags.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="mk-preview-label">Hashtags</div>
                    <div className="mk-copy-area" style={{ fontSize: 12 }}>{imgContenido.hashtags.join(' ')}</div>
                    <button
                      className={`mk-copy-btn${hashCopiado ? ' copied' : ''}`}
                      onClick={() => {
                        navigator.clipboard?.writeText((imgContenido.hashtags ?? []).join(' '))
                        setHashCopiado(true)
                        setTimeout(() => setHashCopiado(false), 2000)
                      }}
                    >
                      {hashCopiado ? '✓ Copiados' : '# Copiar hashtags'}
                    </button>
                  </div>
                )}

                <button className="mk-restart-btn" style={{ marginTop: 14 }} onClick={() => { setPaso(1); setImgContenido(null); setImgError('') }}>
                  ↩ Crear otro contenido
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════
            SECCIÓN 2 — Responder reseñas
        ════════════════════════════════════════════════ */}
        <div className="mk-section">
          <div className="mk-section-head">
            <div className="mk-section-icon" style={{ background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)' }}>⭐</div>
            <div>
              <div className="mk-section-title">Responder reseñas</div>
              <div className="mk-section-sub">Genera respuestas profesionales para reseñas sin contestar · 3 créditos por reseña</div>
            </div>
          </div>

          {cargando ? (
            <div className="mk-empty"><div className="mk-empty-icon">⏳</div><div>Cargando reseñas…</div></div>
          ) : resenas.length === 0 ? (
            <div className="mk-empty">
              <div className="mk-empty-icon">✅</div>
              <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>¡Al día!</div>
              <div style={{ fontSize: 13 }}>No hay reseñas pendientes de respuesta.</div>
            </div>
          ) : resenas.map(r => {
            const estrellas = '★'.repeat(r.valoracion) + '☆'.repeat(5 - r.valoracion)
            const resp = respuestas[r.id] ?? ''
            return (
              <div key={r.id} className="mk-resena-card">
                <div className="mk-resena-stars" style={{ color: r.valoracion >= 4 ? '#F59E0B' : '#9CA3AF' }}>{estrellas}</div>
                <div className="mk-resena-text">"{r.comentario ?? 'Sin comentario'}"</div>
                <div className="mk-resena-meta">{r.autor_nombre ?? 'Anónimo'} · {new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <textarea
                  className="mk-resena-resp-area"
                  placeholder="Genera una respuesta con IA o escríbela manualmente…"
                  value={resp}
                  onChange={e => setRespuestas(prev => ({ ...prev, [r.id]: e.target.value }))}
                />
                <div className="mk-resena-actions">
                  <button
                    className="mk-resena-btn"
                    style={{ background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9)', color: '#1E3A5F' }}
                    onClick={() => generarRespuesta(r)}
                    disabled={generandoResp === r.id}
                  >
                    {generandoResp === r.id ? '⏳ Generando…' : '🤖 Generar respuesta (3 créditos)'}
                  </button>
                  {resp && (
                    <>
                      <button
                        className="mk-resena-btn"
                        style={{ background: respCopiada === r.id ? '#ECFDF5' : 'white', color: respCopiada === r.id ? '#059669' : '#374151', border: '1.5px solid #E5E7EB' }}
                        onClick={() => {
                          navigator.clipboard?.writeText(resp)
                          setRespCopiada(r.id)
                          setTimeout(() => setRespCopiada(null), 2000)
                        }}
                      >
                        {respCopiada === r.id ? '✓ Copiada' : '📋 Copiar'}
                      </button>
                      <button
                        className="mk-resena-btn"
                        style={{ background: '#059669', color: 'white' }}
                        onClick={() => guardarRespuesta(r)}
                      >
                        ✓ Guardar respuesta
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ════════════════════════════════════════════════
            SECCIÓN 3 — Calendario mensual
        ════════════════════════════════════════════════ */}
        <div className="mk-section">
          <div className="mk-section-head">
            <div className="mk-section-icon" style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)' }}>📅</div>
            <div>
              <div className="mk-section-title">Calendario mensual</div>
              <div className="mk-section-sub">Plan de contenido para Instagram — 12 posts, 3 por semana · 15 créditos</div>
            </div>
          </div>

          <div className="mk-cal-controls">
            <select className="mk-cal-select" value={calMes} onChange={e => setCalMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select className="mk-cal-select" value={calAnio} onChange={e => setCalAnio(Number(e.target.value))}>
              {[calAnio - 1, calAnio, calAnio + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="mk-cal-gen-btn" onClick={generarCalendario} disabled={generandoCal || cargando}>
              {generandoCal ? <><span className="mk-spinner" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'white' }} /> Generando…</> : '✨ Generar plan del mes — 15 créditos'}
            </button>
          </div>

          {calError && <div className="mk-error">{calError}</div>}

          {calSlots.length > 0 && (() => {
            const TIPO_CLASS: Record<string, string> = {
              'Educativo': 'tipo-Educativo', 'Promocional': 'tipo-Promocional',
              'Behind the scenes': 'tipo-Behind', 'Testimonio': 'tipo-Testimonio', 'Oferta': 'tipo-Oferta',
            }
            const semanas: CalSlot[][] = [[], [], [], []]
            calSlots.forEach((s, i) => semanas[Math.floor(i / 3)].push(s))
            return (
              <div>
                {semanas.map((sem, si) => sem.length > 0 && (
                  <div key={si}>
                    <div className="mk-cal-sem">Semana {si + 1} — {MESES[calMes]} {calAnio}</div>
                    <div className="mk-cal-grid">
                      {sem.map((slot, idx) => (
                        <div key={idx} className="mk-cal-slot">
                          <div className="mk-cal-slot-date">{slot.fecha}</div>
                          <span className={`mk-cal-slot-tipo ${TIPO_CLASS[slot.tipo] ?? 'tipo-Educativo'}`}>{slot.tipo}</span>
                          <div className="mk-cal-slot-tema">{slot.tema}</div>
                          <div className="mk-cal-slot-caption">"{slot.caption}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {calSlots.length === 0 && !generandoCal && (
            <div className="mk-empty">
              <div className="mk-empty-icon">📋</div>
              <div>Genera tu plan de contenido para {MESES[calMes]} {calAnio}</div>
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  )
}
