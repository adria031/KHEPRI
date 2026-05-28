'use client'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

async function buildQR(url: string, color: string, logoUrl?: string | null): Promise<string> {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, url, {
    width: 400,
    margin: 2,
    color: { dark: color || '#1a1a2e', light: '#ffffff' },
  })
  const ctx = canvas.getContext('2d')!
  if (logoUrl) {
    await new Promise<void>(resolve => {
      const logo = new Image()
      logo.crossOrigin = 'anonymous'
      logo.src = logoUrl
      logo.onload = () => {
        const logoSize = canvas.width * 0.2
        const cx = canvas.width / 2
        const cy = canvas.height / 2
        ctx.beginPath()
        ctx.arc(cx, cy, logoSize / 2 + 8, 0, Math.PI * 2)
        ctx.fillStyle = 'white'
        ctx.fill()
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(logo, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)
        ctx.restore()
        resolve()
      }
      logo.onerror = () => resolve()
    })
  }
  return canvas.toDataURL('image/png')
}

const WEBHOOK_URL   = 'https://khepria.app/api/whatsapp/webhook'
const VERIFY_TOKEN  = 'khepria_wa_2026'

export default function Integraciones() {
  const [negocio,       setNegocio]       = useState<NegMin | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId,     setNegocioId]     = useState<string | null>(null)
  const [colorPpal,     setColorPpal]     = useState('#1a1a2e')
  const [qrUrl,         setQrUrl]         = useState<string | null>(null)
  const [generando,     setGenerando]     = useState(false)
  const [copiado,       setCopiado]       = useState(false)
  const [copiadoWidget, setCopiadoWidget] = useState(false)

  // WhatsApp
  const [waToken,     setWaToken]     = useState('')
  const [waPhoneId,   setWaPhoneId]   = useState('')
  const [waActivo,    setWaActivo]    = useState(false)
  const [waOpen,      setWaOpen]      = useState(false)
  const [guardandoWa, setGuardandoWa] = useState(false)
  const [waOk,        setWaOk]        = useState(false)
  const [copiadoWh,   setCopiadoWh]   = useState(false)

  // Instagram
  const [igToken,     setIgToken]     = useState('')
  const [igActivo,    setIgActivo]    = useState(false)
  const [igOpen,      setIgOpen]      = useState(false)
  const [guardandoIg, setGuardandoIg] = useState(false)
  const [igOk,        setIgOk]        = useState(false)

  useEffect(() => {
    async function init() {
      const { session } = await getSessionClient()
      if (!session) return
      const { activo, todos } = await getNegocioActivo(session.user.id)
      setTodosNegocios(todos)
      if (!activo) return

      setNegocio(activo)
      setNegocioId(activo.id)

      let color = '#1a1a2e'
      const { data: negData } = await supabase
        .from('negocios')
        .select('color_principal, whatsapp_token, whatsapp_phone_id, whatsapp_activo, instagram_token, instagram_activo')
        .eq('id', activo.id)
        .single()

      if (negData?.color_principal)   { color = negData.color_principal; setColorPpal(color) }
      if (negData?.whatsapp_token)     setWaToken(negData.whatsapp_token)
      if (negData?.whatsapp_phone_id)  setWaPhoneId(negData.whatsapp_phone_id)
      if (negData?.whatsapp_activo)    setWaActivo(true)
      if (negData?.instagram_token)    setIgToken(negData.instagram_token)
      if (negData?.instagram_activo)   setIgActivo(true)

      setGenerando(true)
      try {
        const url = `https://khepria.app/negocio/${activo.id}`
        const dataUrl = await buildQR(url, color, activo.logo_url)
        setQrUrl(dataUrl)
      } catch { /* silencioso */ }
      setGenerando(false)
    }
    init()
  }, [])

  async function guardarWa() {
    if (!negocioId) return
    setGuardandoWa(true)
    const activo = Boolean(waToken && waPhoneId)
    await supabase.from('negocios').update({
      whatsapp_token:    waToken || null,
      whatsapp_phone_id: waPhoneId || null,
      whatsapp_activo:   activo,
    }).eq('id', negocioId)
    setWaActivo(activo)
    setGuardandoWa(false)
    setWaOk(true)
    setTimeout(() => setWaOk(false), 2500)
  }

  async function guardarIg() {
    if (!negocioId) return
    setGuardandoIg(true)
    const activo = Boolean(igToken)
    await supabase.from('negocios').update({
      instagram_token:  igToken || null,
      instagram_activo: activo,
    }).eq('id', negocioId)
    setIgActivo(activo)
    setGuardandoIg(false)
    setIgOk(true)
    setTimeout(() => setIgOk(false), 2500)
  }

  const urlNegocio   = negocioId ? `https://khepria.app/negocio/${negocioId}` : ''
  const codigoWidget = negocioId
    ? `<script src="https://khepria.app/widget/${negocioId}.js" async></script>`
    : ''

  async function regenerarQR() {
    if (!urlNegocio || generando) return
    setGenerando(true)
    try {
      const dataUrl = await buildQR(urlNegocio, colorPpal, negocio?.logo_url)
      setQrUrl(dataUrl)
    } catch { /* silencioso */ }
    setGenerando(false)
  }

  function descargarQR() {
    if (!qrUrl || !negocioId) return
    const a = document.createElement('a')
    a.download = `qr-${negocioId}.png`
    a.href = qrUrl
    a.click()
  }

  async function compartir() {
    if (!urlNegocio) return
    if (navigator.share && qrUrl) {
      try {
        const blob = await (await fetch(qrUrl)).blob()
        const file = new File([blob], `qr-${negocioId}.png`, { type: 'image/png' })
        await navigator.share({ title: negocio?.nombre ?? 'Mi negocio', url: urlNegocio, files: [file] })
        return
      } catch { /* user cancelled or files not supported — fall through */ }
    }
    navigator.clipboard.writeText(urlNegocio).catch(() => {})
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }

  function copiar(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  const inputSt = {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid var(--ds-border)', borderRadius: '10px',
    fontFamily: 'inherit', fontSize: '13px', color: 'var(--ds-text)',
    background: 'var(--ds-bg)', outline: 'none',
  } as const

  const labelSt = {
    display: 'block', fontSize: '12px', fontWeight: 600 as const,
    color: 'var(--ds-text2)', marginBottom: '5px',
  }

  function statusBadge(activo: boolean) {
    return (
      <span style={{
        padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
        background: activo ? 'rgba(5,150,105,0.1)' : 'rgba(156,163,175,0.15)',
        color: activo ? '#059669' : '#6B7280',
        whiteSpace: 'nowrap' as const,
      }}>
        {activo ? '● Conectado' : '○ No conectado'}
      </span>
    )
  }

  function toggleBtn(open: boolean, onClick: () => void) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: '7px 12px', borderRadius: '8px',
          border: '1px solid var(--ds-border)', background: 'var(--ds-bg)',
          color: 'var(--ds-text2)', fontFamily: 'inherit', fontSize: '12px',
          fontWeight: 600, cursor: 'pointer', marginBottom: '16px',
        }}
      >
        {open ? '▲ Ocultar instrucciones' : '▼ Cómo conectar'}
      </button>
    )
  }

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <div style={{ maxWidth: '680px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ds-text)', marginBottom: '6px' }}>Integraciones</h1>
        <p style={{ fontSize: '14px', color: 'var(--ds-text2)', marginBottom: '28px' }}>
          Conecta Khepria con tus herramientas favoritas.
        </p>

        {/* ── QR con logo ── */}
        <div style={{
          background: 'var(--ds-white)', border: '1px solid var(--ds-border)',
          borderRadius: '20px', padding: '28px', marginBottom: '20px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '6px' }}>
            📱 Código QR de tu negocio
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--ds-text2)', marginBottom: '24px' }}>
            Imprime o comparte este QR — tus clientes podrán reservar escaneándolo con su móvil.
          </p>

          <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{
              background: 'linear-gradient(135deg,#F8F9FF,#F3F0FF)',
              border: '1px solid rgba(107,79,216,0.15)',
              borderRadius: '16px', padding: '20px 20px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              flexShrink: 0,
            }}>
              {qrUrl ? (
                <img src={qrUrl} alt="QR del negocio" style={{ width: 180, height: 180, borderRadius: '10px', display: 'block' }} />
              ) : (
                <div style={{
                  width: 180, height: 180, borderRadius: '10px',
                  background: 'rgba(107,79,216,0.07)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '8px',
                }}>
                  {generando
                    ? <><span style={{ fontSize: '28px', opacity: 0.5 }}>⏳</span><span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>Generando…</span></>
                    : <span style={{ fontSize: '32px' }}>📱</span>}
                </div>
              )}
              {negocio && (
                <>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ds-text)', textAlign: 'center', letterSpacing: '-0.2px' }}>
                    {negocio.nombre}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--ds-text2)', fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all', lineHeight: 1.4 }}>
                    khepria.app/negocio/{negocioId}
                  </div>
                </>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Enlace de reserva
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    flex: 1, padding: '10px 12px',
                    background: 'var(--ds-bg)', border: '1px solid var(--ds-border)', borderRadius: '10px',
                    fontSize: '12px', color: 'var(--ds-text)', fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {urlNegocio || 'Cargando...'}
                  </div>
                  <button
                    onClick={() => copiar(urlNegocio, setCopiado)}
                    disabled={!urlNegocio}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', border: 'none',
                      background: copiado ? '#059669' : 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
                      color: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                      cursor: urlNegocio ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                      transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    {copiado ? '✅' : '📋'}
                  </button>
                </div>
              </div>

              <button
                onClick={descargarQR}
                disabled={!qrUrl}
                style={{
                  padding: '12px 18px', borderRadius: '10px', border: 'none',
                  background: qrUrl ? 'linear-gradient(135deg,#6B4FD8,#4F46E5)' : 'var(--ds-bg)',
                  color: qrUrl ? 'white' : 'var(--ds-text2)',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 700,
                  cursor: qrUrl ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: qrUrl ? '0 4px 12px rgba(107,79,216,0.25)' : 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                ⬇️ Descargar QR (PNG alta resolución)
              </button>

              <button
                onClick={compartir}
                disabled={!urlNegocio}
                style={{
                  padding: '12px 18px', borderRadius: '10px',
                  border: '1.5px solid var(--ds-border)', background: 'var(--ds-bg)',
                  color: 'var(--ds-text)', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                  cursor: urlNegocio ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                📤 Compartir enlace
              </button>

              <button
                onClick={regenerarQR}
                disabled={!negocioId || generando}
                style={{
                  padding: '12px 18px', borderRadius: '10px',
                  border: '1.5px solid rgba(107,79,216,0.2)',
                  background: 'rgba(107,79,216,0.06)',
                  color: '#6B4FD8', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                  cursor: negocioId && !generando ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                🔄 {generando ? 'Generando…' : 'Regenerar QR'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Widget ── */}
        <div style={{
          background: 'var(--ds-white)', border: '1px solid var(--ds-border)',
          borderRadius: '16px', padding: '24px', marginBottom: '20px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '8px' }}>
            🧩 Widget de reservas para tu web
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--ds-text2)', marginBottom: '14px' }}>
            Pega este código en tu web para añadir un botón de reserva directamente.
          </p>
          <div style={{ background: '#1E1E2E', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
            <code style={{ fontSize: '12px', color: '#A78BFA', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {codigoWidget || 'Cargando...'}
            </code>
          </div>
          <button
            onClick={() => copiar(codigoWidget, setCopiadoWidget)}
            disabled={!codigoWidget}
            style={{
              padding: '9px 18px', borderRadius: '10px', border: 'none',
              background: copiadoWidget ? '#059669' : 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
              color: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
              cursor: codigoWidget ? 'pointer' : 'not-allowed', transition: 'background 0.2s',
            }}
          >
            {copiadoWidget ? '✅ Copiado' : '📋 Copiar código'}
          </button>
        </div>

        {/* ── WhatsApp Business ── */}
        <div style={{
          background: 'var(--ds-white)', border: '1px solid var(--ds-border)',
          borderRadius: '16px', padding: '24px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text)', margin: 0 }}>
              💬 WhatsApp Business
            </h2>
            {statusBadge(waActivo)}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ds-text2)', marginBottom: '14px' }}>
            Tus clientes te escriben por WhatsApp y la IA de Khepria responde automáticamente, gestiona citas y resuelve dudas.
          </p>

          {toggleBtn(waOpen, () => setWaOpen(v => !v))}

          {waOpen && (
            <div style={{
              background: 'rgba(79,70,229,0.04)', border: '1px solid rgba(79,70,229,0.15)',
              borderRadius: '12px', padding: '16px', marginBottom: '16px',
              fontSize: '13px', lineHeight: 1.75, color: 'var(--ds-text)',
            }}>
              <p style={{ fontWeight: 700, marginBottom: '10px', color: '#4F46E5' }}>Pasos para conectar:</p>
              <ol style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Cuenta Meta Business</strong> — Crea o accede a tu cuenta en <strong>business.facebook.com</strong> y verifica tu negocio.</li>
                <li><strong>Número dedicado</strong> — Necesitas un número de teléfono exclusivo para WhatsApp Business (no puede estar en WhatsApp personal ni tener cuenta activa).</li>
                <li><strong>App en Meta Developers</strong> — Entra en <strong>developers.facebook.com</strong>, crea una app tipo &quot;Business&quot; y activa el producto &quot;WhatsApp&quot;.</li>
                <li><strong>Credenciales</strong> — En &quot;WhatsApp → Configuración de API&quot; encontrarás el <strong>Token de acceso permanente</strong> y el <strong>Phone Number ID</strong>.</li>
                <li>
                  <strong>Configura el Webhook</strong> — En &quot;WhatsApp → Configuración → Webhooks&quot;:<br />
                  <span style={{ display: 'inline-block', marginTop: '4px' }}>
                    URL de callback:{' '}
                    <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>{WEBHOOK_URL}</code>
                  </span><br />
                  <span>
                    Token de verificación:{' '}
                    <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>{VERIFY_TOKEN}</code>
                  </span><br />
                  <span>Suscríbete al evento: <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>messages</code></span>
                </li>
                <li><strong>Variable de entorno</strong> — Añade en Vercel: <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>WHATSAPP_VERIFY_TOKEN={VERIFY_TOKEN}</code></li>
                <li><strong>Aprobación Meta</strong> — Para mensajes a clientes nuevos necesitarás aprobación de Meta (2-4 semanas). En modo prueba puedes usar números verificados manualmente.</li>
              </ol>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelSt}>Token de acceso de WhatsApp Business</label>
              <input
                type="password"
                value={waToken}
                onChange={e => setWaToken(e.target.value)}
                placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxx..."
                style={inputSt}
                autoComplete="off"
              />
            </div>
            <div>
              <label style={labelSt}>Phone Number ID</label>
              <input
                value={waPhoneId}
                onChange={e => setWaPhoneId(e.target.value)}
                placeholder="1234567890123456"
                style={inputSt}
              />
            </div>
            <div>
              <label style={labelSt}>URL del Webhook (copia esta URL en Meta Developers)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={WEBHOOK_URL}
                  readOnly
                  style={{ ...inputSt, color: '#6B7280', flex: 1 }}
                />
                <button
                  onClick={() => copiar(WEBHOOK_URL, setCopiadoWh)}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', border: 'none', flexShrink: 0,
                    background: copiadoWh ? '#059669' : 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
                    color: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {copiadoWh ? '✅' : '📋'}
                </button>
              </div>
            </div>
            <button
              onClick={guardarWa}
              disabled={guardandoWa || !negocioId}
              style={{
                padding: '11px', borderRadius: '10px', border: 'none',
                background: waOk ? '#059669' : 'linear-gradient(135deg,#25D366,#128C7E)',
                color: 'white', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700,
                cursor: guardandoWa || !negocioId ? 'not-allowed' : 'pointer',
                opacity: guardandoWa || !negocioId ? 0.6 : 1, transition: 'background 0.2s',
              }}
            >
              {waOk ? '✅ Guardado' : guardandoWa ? 'Guardando...' : '💾 Guardar configuración WhatsApp'}
            </button>
          </div>
        </div>

        {/* ── Instagram Business ── */}
        <div style={{
          background: 'var(--ds-white)', border: '1px solid var(--ds-border)',
          borderRadius: '16px', padding: '24px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text)', margin: 0 }}>
              📸 Instagram Business
            </h2>
            {statusBadge(igActivo)}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ds-text2)', marginBottom: '14px' }}>
            Conecta tu Instagram Business para gestionar mensajes directos y mostrar tu catálogo de servicios.
          </p>

          {toggleBtn(igOpen, () => setIgOpen(v => !v))}

          {igOpen && (
            <div style={{
              background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.15)',
              borderRadius: '12px', padding: '16px', marginBottom: '16px',
              fontSize: '13px', lineHeight: 1.75, color: 'var(--ds-text)',
            }}>
              <p style={{ fontWeight: 700, marginBottom: '10px', color: '#EC4899' }}>Pasos para conectar:</p>
              <ol style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Cuenta Business o Creator</strong> — Tu perfil de Instagram debe ser de tipo Business o Creator. Cámbialo en Instagram → Configuración → Tipo de cuenta y herramientas.</li>
                <li><strong>Vincula a Facebook</strong> — Conecta tu Instagram a una página de Facebook desde <strong>Meta Business Suite</strong>.</li>
                <li><strong>Meta Developers</strong> — En developers.facebook.com, crea o usa tu app Business y añade el producto &quot;Instagram Graph API&quot;.</li>
                <li><strong>Genera el Access Token</strong> — En el &quot;Explorador de la API de Graph&quot; genera un token con permisos <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>instagram_basic</code> y <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>pages_show_list</code>. Convierte el token a larga duración (60 días).</li>
                <li><strong>Pega el token</strong> — Copia el token generado y pégalo en el campo de abajo. Recuerda renovarlo cada 60 días.</li>
              </ol>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelSt}>Instagram Access Token</label>
              <input
                type="password"
                value={igToken}
                onChange={e => setIgToken(e.target.value)}
                placeholder="IGQxxxxxxxxxxxxxxxxxxxxxxxx..."
                style={inputSt}
                autoComplete="off"
              />
            </div>
            <button
              onClick={guardarIg}
              disabled={guardandoIg || !negocioId}
              style={{
                padding: '11px', borderRadius: '10px', border: 'none',
                background: igOk ? '#059669' : 'linear-gradient(135deg,#E1306C,#833AB4)',
                color: 'white', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700,
                cursor: guardandoIg || !negocioId ? 'not-allowed' : 'pointer',
                opacity: guardandoIg || !negocioId ? 0.6 : 1, transition: 'background 0.2s',
              }}
            >
              {igOk ? '✅ Guardado' : guardandoIg ? 'Guardando...' : '💾 Guardar configuración Instagram'}
            </button>
          </div>
        </div>

        {/* ── Más integraciones (próximamente) ── */}
        <div style={{
          background: 'var(--ds-white)', border: '1px solid var(--ds-border)',
          borderRadius: '16px', padding: '24px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '14px' }}>
            🔌 Más integraciones
          </h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px',
            background: 'var(--ds-bg)', border: '1px solid var(--ds-border)',
            borderRadius: '12px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg,rgba(212,197,249,0.3),rgba(184,216,248,0.3))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', flexShrink: 0,
            }}>
              📅
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '3px' }}>
                Google Calendar
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text2)' }}>
                Sincroniza tus reservas con Google Calendar. Las citas aparecen automáticamente en tu agenda.
              </div>
            </div>
            <div style={{
              padding: '5px 12px', borderRadius: '100px', whiteSpace: 'nowrap',
              fontSize: '11px', fontWeight: 700,
              background: 'rgba(212,197,249,0.25)', color: '#6B4FD8',
            }}>
              Próximamente
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
