'use client'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

type IntegCard = {
  icon: string
  nombre: string
  desc: string
}

const INTEGRACIONES: IntegCard[] = [
  { icon: '💬', nombre: 'WhatsApp Business', desc: 'Recibe y gestiona reservas directamente desde WhatsApp. Notificaciones automáticas a clientes.' },
  { icon: '📸', nombre: 'Instagram', desc: 'Añade el botón "Reservar" en tu perfil de Instagram. Sincroniza publicaciones con tu catálogo.' },
  { icon: '📅', nombre: 'Google Calendar', desc: 'Sincroniza tus reservas con Google Calendar. Las citas aparecen automáticamente en tu agenda.' },
]

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
        // White circle background
        ctx.beginPath()
        ctx.arc(cx, cy, logoSize / 2 + 8, 0, Math.PI * 2)
        ctx.fillStyle = 'white'
        ctx.fill()
        // Clip logo to circle
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

export default function Integraciones() {
  const [negocio,       setNegocio]       = useState<NegMin | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId,     setNegocioId]     = useState<string | null>(null)
  const [colorPpal,     setColorPpal]     = useState('#1a1a2e')
  const [qrUrl,         setQrUrl]         = useState<string | null>(null)
  const [generando,     setGenerando]     = useState(false)
  const [copiado,       setCopiado]       = useState(false)
  const [copiadoWidget, setCopiadoWidget] = useState(false)

  useEffect(() => {
    async function init() {
      const { session } = await getSessionClient()
      if (!session) return
      const { activo, todos } = await getNegocioActivo(session.user.id)
      setTodosNegocios(todos)
      if (!activo) return

      setNegocio(activo)
      setNegocioId(activo.id)

      // Fetch color_principal
      let color = '#1a1a2e'
      const { data: negData } = await supabase
        .from('negocios')
        .select('color_principal')
        .eq('id', activo.id)
        .single()
      if (negData?.color_principal) {
        color = negData.color_principal
        setColorPpal(color)
      }

      // Generate QR immediately with all data
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

  const urlNegocio  = negocioId ? `https://khepria.app/negocio/${negocioId}` : ''
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
    // Fallback: copy link
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

            {/* QR preview card */}
            <div style={{
              background: 'linear-gradient(135deg,#F8F9FF,#F3F0FF)',
              border: '1px solid rgba(107,79,216,0.15)',
              borderRadius: '16px', padding: '20px 20px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              flexShrink: 0,
            }}>
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="QR del negocio"
                  style={{ width: 180, height: 180, borderRadius: '10px', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: 180, height: 180, borderRadius: '10px',
                  background: 'rgba(107,79,216,0.07)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', fontSize: '32px',
                }}>
                  {generando ? (
                    <>
                      <span style={{ fontSize: '28px', opacity: 0.5 }}>⏳</span>
                      <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>Generando…</span>
                    </>
                  ) : '📱'}
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

            {/* URL + botones */}
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* URL row */}
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

              {/* Action buttons */}
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
                  transition: 'border-color 0.15s',
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

        {/* ── Widget de reservas ── */}
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
          <div style={{
            background: '#1E1E2E', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px',
          }}>
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

        {/* ── Integraciones externas ── */}
        <div style={{
          background: 'var(--ds-white)', border: '1px solid var(--ds-border)',
          borderRadius: '16px', padding: '24px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '18px' }}>
            🔌 Integraciones externas
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {INTEGRACIONES.map(int => (
              <div
                key={int.nombre}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px',
                  background: 'var(--ds-bg)', border: '1px solid var(--ds-border)',
                  borderRadius: '12px',
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'linear-gradient(135deg,rgba(212,197,249,0.3),rgba(184,216,248,0.3))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', flexShrink: 0,
                }}>
                  {int.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '3px' }}>
                    {int.nombre}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ds-text2)' }}>{int.desc}</div>
                </div>
                <div style={{
                  padding: '5px 12px', borderRadius: '100px', whiteSpace: 'nowrap',
                  fontSize: '11px', fontWeight: 700,
                  background: 'rgba(212,197,249,0.25)', color: '#6B4FD8',
                }}>
                  Próximamente
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
