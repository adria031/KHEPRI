'use client'
import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

type IntegCard = {
  icon: string
  nombre: string
  desc: string
  estado: 'disponible' | 'proximamente'
}

const INTEGRACIONES: IntegCard[] = [
  {
    icon: '💬',
    nombre: 'WhatsApp Business',
    desc: 'Recibe y gestiona reservas directamente desde WhatsApp. Notificaciones automáticas a clientes.',
    estado: 'proximamente',
  },
  {
    icon: '📸',
    nombre: 'Instagram',
    desc: 'Añade el botón "Reservar" en tu perfil de Instagram. Sincroniza publicaciones con tu catálogo.',
    estado: 'proximamente',
  },
  {
    icon: '📅',
    nombre: 'Google Calendar',
    desc: 'Sincroniza tus reservas con Google Calendar. Las citas aparecen automáticamente en tu agenda.',
    estado: 'proximamente',
  },
]

export default function Integraciones() {
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [copiadoWidget, setCopiadoWidget] = useState(false)
  const [origen, setOrigen] = useState('')
  const qrRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    setOrigen(window.location.origin)
    async function init() {
      const { session } = await getSessionClient()
      if (!session) return
      const { activo, todos } = await getNegocioActivo(session.user.id)
      if (activo) { setNegocio(activo); setNegocioId(activo.id) }
      setTodosNegocios(todos)
    }
    init()
  }, [])

  const enlaceReserva = negocioId ? `${origen}/negocio/${negocioId}` : ''
  const codigoWidget = negocioId
    ? `<script src="${origen}/widget/${negocioId}.js" async></script>`
    : ''

  function copiar(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  function descargarQR() {
    const svg = document.querySelector('#qr-reserva svg') as SVGSVGElement | null
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      const a = document.createElement('a')
      a.download = `qr-reserva-${negocioId}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))
  }

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <div style={{ maxWidth: '680px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ds-text)', marginBottom: '6px' }}>Integraciones</h1>
        <p style={{ fontSize: '14px', color: 'var(--ds-text2)', marginBottom: '28px' }}>
          Conecta Khepria con tus herramientas favoritas.
        </p>

        {/* ── Enlace de reserva ── */}
        <div style={{
          background: 'var(--ds-white)', border: '1px solid var(--ds-border)',
          borderRadius: '16px', padding: '24px', marginBottom: '20px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '18px' }}>
            🔗 Enlace de reserva
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--ds-text2)', marginBottom: '12px' }}>
            Comparte este enlace en Instagram, WhatsApp o donde quieras para que tus clientes puedan reservar directamente.
          </p>

          {/* URL */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <div style={{
              flex: 1, padding: '10px 14px',
              background: 'var(--ds-bg)', border: '1px solid var(--ds-border)', borderRadius: '10px',
              fontSize: '13px', color: 'var(--ds-text)', fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {enlaceReserva || 'Cargando...'}
            </div>
            <button
              onClick={() => copiar(enlaceReserva, setCopiado)}
              disabled={!enlaceReserva}
              style={{
                padding: '10px 18px', borderRadius: '10px', border: 'none',
                background: copiado ? '#2E8A5E' : 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
                color: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                cursor: enlaceReserva ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
            >
              {copiado ? '✅ Copiado' : '📋 Copiar'}
            </button>
          </div>

          {/* QR */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            <div id="qr-reserva" style={{
              background: 'white', padding: '12px', borderRadius: '12px',
              border: '1px solid var(--ds-border)', display: 'inline-block',
            }}>
              {enlaceReserva ? (
                <QRCodeSVG value={enlaceReserva} size={120} />
              ) : (
                <div style={{ width: 120, height: 120, background: 'var(--ds-bg)', borderRadius: '8px' }} />
              )}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text)', marginBottom: '6px' }}>
                Código QR del enlace de reserva
              </p>
              <p style={{ fontSize: '12px', color: 'var(--ds-text2)', marginBottom: '14px', maxWidth: '300px' }}>
                Imprime o muestra este QR en tu negocio para que los clientes reserven escaneando con su móvil.
              </p>
              <button
                onClick={descargarQR}
                disabled={!enlaceReserva}
                style={{
                  padding: '9px 18px', borderRadius: '10px',
                  border: '1px solid var(--ds-border)', background: 'var(--ds-bg)',
                  color: 'var(--ds-text)', fontFamily: 'inherit', fontSize: '13px',
                  fontWeight: 600, cursor: enlaceReserva ? 'pointer' : 'not-allowed',
                }}
              >
                ⬇️ Descargar QR (PNG)
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
            background: '#1E1E2E', borderRadius: '10px', padding: '14px 16px',
            marginBottom: '12px', position: 'relative',
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
              background: copiadoWidget ? '#2E8A5E' : 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
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
            {INTEGRACIONES.map((int) => (
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
