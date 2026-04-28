'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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

// ─── Inner component (needs useSearchParams inside Suspense) ──────────────────

function ResenaForm() {
  const params    = useParams()
  const search    = useSearchParams()
  const negocioId = params?.id as string
  const reservaId = search.get('reserva_id') ?? ''

  type Estado = 'cargando' | 'formulario' | 'enviando' | 'gracias' | 'ya_enviada' | 'invalida'

  const [estado,      setEstado]      = useState<Estado>('cargando')
  const [negNombre,   setNegNombre]   = useState('')
  const [svcNombre,   setSvcNombre]   = useState('')
  const [nombre,      setNombre]      = useState('')
  const [estrellas,   setEstrellas]   = useState(0)
  const [hover,       setHover]       = useState(0)
  const [comentario,  setComentario]  = useState('')
  const [error,       setError]       = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<HCaptcha>(null)

  useEffect(() => {
    if (!negocioId) return
    ;(async () => {
      // 1. Cargar nombre del negocio
      const { data: neg } = await supabase
        .from('negocios')
        .select('nombre')
        .eq('id', negocioId)
        .single()
      if (!neg) { setEstado('invalida'); return }
      setNegNombre(neg.nombre)

      // 2. Si viene reserva_id, validar y pre-rellenar
      if (reservaId) {
        // Comprobar si ya existe una reseña para esta reserva
        const { data: yaResena } = await supabase
          .from('resenas')
          .select('id')
          .eq('reserva_id', reservaId)
          .maybeSingle()

        if (yaResena) { setEstado('ya_enviada'); return }

        // Cargar datos de la reserva para pre-rellenar nombre
        const { data: reserva } = await supabase
          .from('reservas')
          .select('cliente_nombre, negocio_id, servicios(nombre)')
          .eq('id', reservaId)
          .single()

        if (!reserva || reserva.negocio_id !== negocioId) {
          setEstado('invalida'); return
        }

        setNombre(reserva.cliente_nombre ?? '')
        setSvcNombre((reserva.servicios as any)?.nombre ?? '')
      }

      setEstado('formulario')
    })()
  }, [negocioId, reservaId])

  async function enviar() {
    if (!nombre.trim())    { setError('Escribe tu nombre'); return }
    if (estrellas === 0)   { setError('Selecciona una puntuación'); return }
    if (!comentario.trim()){ setError('Escribe un comentario'); return }
    if (!captchaToken)     { setError('Por favor completa la verificación de seguridad'); return }
    setError(''); setEstado('enviando')
    const captchaOk = await verifyCaptcha(captchaToken)
    if (!captchaOk) { setError('Verificación de seguridad fallida. Inténtalo de nuevo.'); setEstado('formulario'); captchaRef.current?.resetCaptcha(); setCaptchaToken(''); return }

    const { error: insertErr } = await supabase.from('resenas').insert({
      negocio_id:     negocioId,
      reserva_id:     reservaId || null,
      cliente_nombre: sanitizeField(nombre, 100),
      valoracion:     estrellas,
      comentario:     sanitizeField(comentario, 2000),
    })

    captchaRef.current?.resetCaptcha()
    setCaptchaToken('')

    if (insertErr) {
      setError('Error al enviar. Inténtalo de nuevo.')
      setEstado('formulario')
      return
    }
    setEstado('gracias')
  }

  // ── Render states ────────────────────────────────────────────────────────

  if (estado === 'cargando') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F9FC' }}>
        <div style={{ fontSize: '15px', color: '#9CA3AF' }}>Cargando...</div>
      </div>
    )
  }

  if (estado === 'invalida') {
    return (
      <Pantalla emoji="❌" titulo="Enlace no válido" sub="Este enlace no corresponde a ninguna cita o negocio." />
    )
  }

  if (estado === 'ya_enviada') {
    return (
      <Pantalla emoji="✅" titulo="Ya enviaste tu reseña" sub={`Ya has dejado una valoración para tu cita en ${negNombre}. ¡Gracias!`} />
    )
  }

  if (estado === 'gracias') {
    return (
      <Pantalla
        emoji="🙏"
        titulo="¡Gracias por tu reseña!"
        sub={`Tu opinión ayuda a ${negNombre} a seguir mejorando y a otros clientes a elegir bien.`}
        extra={
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="26" height="26" viewBox="0 0 20 20" fill={i <= estrellas ? '#FBBF24' : '#E5E7EB'}>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            ))}
          </div>
        }
      />
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────

  const starsActive  = hover || estrellas
  const starLabels   = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente']

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⭐</div>
            <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>
              ¿Cómo fue tu experiencia?
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', lineHeight: 1.5 }}>
              Deja tu opinión sobre{svcNombre ? ` ${svcNombre} en` : ''} <strong style={{ color: '#374151' }}>{negNombre}</strong>
            </p>
          </div>

          {/* Estrellas */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setEstrellas(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 1, transition: 'transform 0.1s', transform: hover === n ? 'scale(1.2)' : 'scale(1)' }}
                >
                  <svg width="36" height="36" viewBox="0 0 20 20" fill={n <= starsActive ? '#FBBF24' : '#E5E7EB'} style={{ display: 'block', transition: 'fill 0.1s' }}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#F59E0B', minHeight: '18px', transition: 'opacity 0.15s', opacity: starsActive ? 1 : 0 }}>
              {starLabels[starsActive]}
            </div>
          </div>

          {/* Nombre */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Tu nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre que aparecerá en la reseña"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', color: '#111827', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#111827')}
              onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* Comentario */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Comentario
            </label>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Cuéntanos cómo fue tu experiencia..."
              rows={4}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', color: '#111827', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.55, boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#111827')}
              onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* hCaptcha */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <HCaptcha
              ref={captchaRef}
              sitekey={HCAPTCHA_SITEKEY}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken('')}
              onError={() => setCaptchaToken('')}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', fontSize: '13px', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={enviar}
            disabled={estado === 'enviando'}
            style={{ width: '100%', padding: '14px', background: '#111827', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: estado === 'enviando' ? 'not-allowed' : 'pointer', opacity: estado === 'enviando' ? 0.6 : 1, transition: 'opacity 0.15s' }}
          >
            {estado === 'enviando' ? 'Enviando...' : 'Enviar reseña'}
          </button>

          <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>
            Tu reseña es pública y puede ser respondida por el negocio.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Estado final pantalla ────────────────────────────────────────────────────

function Pantalla({ emoji, titulo, sub, extra }: { emoji: string; titulo: string; sub: string; extra?: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '14px' }}>{emoji}</div>
        <h1 style={{ margin: '0 0 10px', fontSize: '21px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>{titulo}</h1>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#6B7280', lineHeight: 1.6 }}>{sub}</p>
        {extra}
      </div>
    </div>
  )
}

// ─── Page export con Suspense ─────────────────────────────────────────────────

export default function ResenaPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F9FC' }}>
        <div style={{ fontSize: '15px', color: '#9CA3AF' }}>Cargando...</div>
      </div>
    }>
      <ResenaForm />
    </Suspense>
  )
}
