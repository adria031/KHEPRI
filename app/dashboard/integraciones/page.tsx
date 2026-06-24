'use client'
import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

const META_APP_ID  = process.env.NEXT_PUBLIC_META_APP_ID || '1006980128417758'
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'
const CALLBACK_URI = `${APP_URL}/api/meta/callback`

type QrEstilo = 'cuadrado' | 'redondeado' | 'puntos' | 'cristal'
const ESTILOS_QR: { id: QrEstilo; label: string; icon: string }[] = [
  { id: 'cuadrado',   label: 'Cuadrado',  icon: '⬛' },
  { id: 'redondeado', label: 'Suave',     icon: '🔲' },
  { id: 'puntos',     label: 'Puntos',    icon: '⚫' },
  { id: 'cristal',    label: 'Cristal',   icon: '✦'  },
]

const WEBHOOK_URL   = 'https://khepria.app/api/whatsapp/webhook'
const VERIFY_TOKEN  = process.env.NEXT_PUBLIC_META_VERIFY_TOKEN ?? 'khepria_webhook_2026'

export default function Integraciones() {
  const [negocio,       setNegocio]       = useState<NegMin | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId,     setNegocioId]     = useState<string | null>(null)
  const [colorPpal,     setColorPpal]     = useState('#1a1a2e')
  const [qrUrl,      setQrUrl]      = useState<string | null>(null)
  const [generando,  setGenerando]  = useState(false)
  const [qrColor,    setQrColor]    = useState('#1a1a2e')
  const [qrBgColor,  setQrBgColor]  = useState('#ffffff')
  const [qrEstilo,   setQrEstilo]   = useState<QrEstilo>('cuadrado')
  const [qrConLogo,  setQrConLogo]  = useState(true)
  const [qrSize,     setQrSize]     = useState(400)
  const [copiado,           setCopiado]           = useState(false)
  const [copiadoWidget,     setCopiadoWidget]     = useState(false)
  const [showWidgetPreview, setShowWidgetPreview] = useState(false)

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
  const [igUsername,  setIgUsername]  = useState('')
  const [igOpen,      setIgOpen]      = useState(false)
  const [guardandoIg, setGuardandoIg] = useState(false)
  const [igOk,        setIgOk]        = useState(false)

  // OAuth meta result
  const [metaMsg,     setMetaMsg]     = useState('')
  const [metaErr,     setMetaErr]     = useState('')

  useEffect(() => {
    async function init() {
      const { session } = await getSessionClient()
      if (!session) return
      const { activo, todos } = await getNegocioActivo(session.user.id)
      setTodosNegocios(todos)
      if (!activo) return

      setNegocio(activo)
      setNegocioId(activo.id)

      // Read post-OAuth URL params
      const urlParams = new URLSearchParams(window.location.search)
      const metaOk  = urlParams.get('meta_ok')
      const metaErrP = urlParams.get('meta_error')
      if (metaOk === 'instagram') setMetaMsg('✅ Instagram conectado correctamente')
      if (metaOk === 'whatsapp')  setMetaMsg('✅ WhatsApp conectado correctamente')
      if (metaErrP === 'cancelled')     setMetaErr('Conexión cancelada por el usuario.')
      if (metaErrP === 'token_failed')  setMetaErr('Error al obtener el token. Inténtalo de nuevo.')
      if (metaErrP === 'missing_env')   setMetaErr('Falta configurar NEXT_PUBLIC_META_APP_ID en Vercel.')
      if (metaOk || metaErrP) {
        // Clean URL without page reload
        window.history.replaceState({}, '', window.location.pathname)
      }

      let color = '#1a1a2e'
      const { data: negData } = await supabase
        .from('negocios')
        .select('color_principal, whatsapp_token, whatsapp_phone_id, whatsapp_activo, instagram_token, instagram_activo, instagram_user_id, instagram_username')
        .eq('id', activo.id)
        .single()

      if (negData?.color_principal)    { color = negData.color_principal; setColorPpal(color); setQrColor(color) }
      if (negData?.whatsapp_token)      setWaToken(negData.whatsapp_token)
      if (negData?.whatsapp_phone_id)   setWaPhoneId(negData.whatsapp_phone_id)
      if (negData?.whatsapp_activo)     setWaActivo(true)
      if (negData?.instagram_token)     setIgToken(negData.instagram_token)
      if (negData?.instagram_activo)    setIgActivo(true)
      if (negData?.instagram_username)  setIgUsername(negData.instagram_username)
      else if (negData?.instagram_user_id) setIgUsername(negData.instagram_user_id)
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

  async function desconectarIg() {
    if (!negocioId) return
    await supabase.from('negocios').update({
      instagram_token:    null,
      instagram_user_id:  null,
      instagram_username: null,
      instagram_activo:   false,
    }).eq('id', negocioId)
    setIgActivo(false)
    setIgToken('')
    setIgUsername('')
  }

  async function desconectarWa() {
    if (!negocioId) return
    await supabase.from('negocios').update({
      whatsapp_token:    null,
      whatsapp_phone_id: null,
      whatsapp_activo:   false,
    }).eq('id', negocioId)
    setWaActivo(false)
    setWaToken('')
    setWaPhoneId('')
  }

  function oauthUrlIg() {
    const scope = 'instagram_basic,pages_show_list,instagram_manage_messages,pages_read_engagement'
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(CALLBACK_URI)}&state=${negocioId}|instagram&scope=${scope}`
  }

  function oauthUrlWa() {
    const scope = 'whatsapp_business_management,whatsapp_business_messaging'
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(CALLBACK_URI)}&state=${negocioId}|whatsapp&scope=${scope}`
  }

  const urlNegocio   = negocioId ? `https://khepria.app/negocio/${negocioId}` : ''
  const urlWidget    = negocioId ? `https://khepria.app/widget/${negocioId}` : ''
  const codigoWidget = negocioId
    ? `<iframe src="https://khepria.app/widget/${negocioId}" width="100%" height="600px" frameborder="0" style="border:none;border-radius:12px;"></iframe>`
    : ''

  const generarQR = useCallback(async () => {
    if (!negocioId) return
    const url = `https://khepria.app/negocio/${negocioId}`
    setGenerando(true)
    try {
      const qr = QRCode.create(url, { errorCorrectionLevel: 'H' })
      const canvas = document.createElement('canvas')
      canvas.width = qrSize
      canvas.height = qrSize
      const ctx = canvas.getContext('2d')!
      const n = qr.modules.size
      const margin = Math.floor(qrSize * 0.04)
      const cell = (qrSize - margin * 2) / n

      ctx.fillStyle = qrBgColor
      ctx.fillRect(0, 0, qrSize, qrSize)
      ctx.fillStyle = qrColor

      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          if (!qr.modules.data[row * n + col]) continue
          const x = margin + col * cell
          const y = margin + row * cell
          if (qrEstilo === 'puntos') {
            ctx.beginPath()
            ctx.arc(x + cell / 2, y + cell / 2, cell * 0.42, 0, Math.PI * 2)
            ctx.fill()
          } else if (qrEstilo === 'redondeado') {
            const r = cell * 0.3
            ctx.beginPath()
            ctx.moveTo(x + r, y); ctx.lineTo(x + cell - r, y)
            ctx.quadraticCurveTo(x + cell, y, x + cell, y + r)
            ctx.lineTo(x + cell, y + cell - r)
            ctx.quadraticCurveTo(x + cell, y + cell, x + cell - r, y + cell)
            ctx.lineTo(x + r, y + cell)
            ctx.quadraticCurveTo(x, y + cell, x, y + cell - r)
            ctx.lineTo(x, y + r)
            ctx.quadraticCurveTo(x, y, x + r, y)
            ctx.closePath(); ctx.fill()
          } else if (qrEstilo === 'cristal') {
            const pad = cell * 0.12
            const pw = cell - pad * 2
            const r = pw * 0.45
            const px = x + pad, py = y + pad
            ctx.beginPath()
            ctx.moveTo(px + r, py); ctx.lineTo(px + pw - r, py)
            ctx.quadraticCurveTo(px + pw, py, px + pw, py + r)
            ctx.lineTo(px + pw, py + pw - r)
            ctx.quadraticCurveTo(px + pw, py + pw, px + pw - r, py + pw)
            ctx.lineTo(px + r, py + pw)
            ctx.quadraticCurveTo(px, py + pw, px, py + pw - r)
            ctx.lineTo(px, py + r)
            ctx.quadraticCurveTo(px, py, px + r, py)
            ctx.closePath(); ctx.fill()
          } else {
            ctx.fillRect(x, y, cell, cell)
          }
        }
      }

      if (qrConLogo && negocio?.logo_url) {
        await new Promise<void>(resolve => {
          const logo = new Image()
          logo.crossOrigin = 'anonymous'
          logo.src = negocio!.logo_url!
          logo.onload = () => {
            const ls = qrSize * 0.18
            const cx = qrSize / 2, cy = qrSize / 2
            ctx.beginPath()
            ctx.arc(cx, cy, ls / 2 + 8, 0, Math.PI * 2)
            ctx.fillStyle = qrBgColor
            ctx.fill()
            ctx.save()
            ctx.beginPath()
            ctx.arc(cx, cy, ls / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(logo, cx - ls / 2, cy - ls / 2, ls, ls)
            ctx.restore()
            resolve()
          }
          logo.onerror = () => resolve()
        })
      }

      setQrUrl(canvas.toDataURL('image/png'))
    } catch { /* silencioso */ }
    setGenerando(false)
  }, [negocioId, qrColor, qrBgColor, qrEstilo, qrConLogo, qrSize, negocio])

  useEffect(() => {
    if (negocioId) generarQR()
  }, [negocioId, generarQR])

  function descargarPNG() {
    if (!qrUrl || !negocioId) return
    const a = document.createElement('a')
    a.download = `qr-${negocioId}.png`
    a.href = qrUrl
    a.click()
  }

  async function descargarSVG() {
    if (!negocioId) return
    try {
      const url = `https://khepria.app/negocio/${negocioId}`
      const svgStr = await QRCode.toString(url, {
        type: 'svg',
        color: { dark: qrColor, light: qrBgColor },
        errorCorrectionLevel: 'H',
        margin: 2,
      } as Parameters<typeof QRCode.toString>[1])
      const blob = new Blob([svgStr as string], { type: 'image/svg+xml' })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.download = `qr-${negocioId}.svg`
      a.href = blobUrl
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch { /* silencioso */ }
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
        <p style={{ fontSize: '14px', color: 'var(--ds-text2)', marginBottom: metaMsg || metaErr ? '16px' : '28px' }}>
          Conecta Khepria con tus herramientas favoritas.
        </p>

        {metaMsg && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: '#15803D' }}>
            {metaMsg}
          </div>
        )}
        {metaErr && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: '#DC2626' }}>
            ⚠️ {metaErr}
          </div>
        )}

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
            {/* Preview */}
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
                  <div style={{ fontSize: '10px', color: 'var(--ds-text2)', fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' as const, lineHeight: 1.4 }}>
                    khepria.app/negocio/{negocioId}
                  </div>
                </>
              )}
            </div>

            {/* Controles */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Enlace */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text2)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.6px' }}>
                  Enlace de reserva
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    flex: 1, padding: '10px 12px',
                    background: 'var(--ds-bg)', border: '1px solid var(--ds-border)', borderRadius: '10px',
                    fontSize: '12px', color: 'var(--ds-text)', fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
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
                      cursor: urlNegocio ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' as const,
                      transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    {copiado ? '✅' : '📋'}
                  </button>
                </div>
              </div>

              {/* Estilo */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text2)', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.6px' }}>
                  Estilo
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                  {ESTILOS_QR.map(est => (
                    <button key={est.id} onClick={() => setQrEstilo(est.id)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', border: '1.5px solid',
                        borderColor: qrEstilo === est.id ? '#6B4FD8' : 'var(--ds-border)',
                        background: qrEstilo === est.id ? 'rgba(107,79,216,0.08)' : 'var(--ds-bg)',
                        color: qrEstilo === est.id ? '#6B4FD8' : 'var(--ds-text2)',
                        fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {est.icon} {est.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colores */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' as const }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text2)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.6px' }}>
                    Color QR
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid var(--ds-border)', cursor: 'pointer', padding: '2px', background: 'none' }}
                    />
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--ds-text2)' }}>{qrColor}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text2)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.6px' }}>
                    Fondo
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="color" value={qrBgColor} onChange={e => setQrBgColor(e.target.value)}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid var(--ds-border)', cursor: 'pointer', padding: '2px', background: 'none' }}
                    />
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--ds-text2)' }}>{qrBgColor}</span>
                  </div>
                </div>
              </div>

              {/* Tamaño y Logo */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text2)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.6px' }}>
                    Tamaño: {qrSize}px
                  </div>
                  <input type="range" min={200} max={600} step={50} value={qrSize}
                    onChange={e => setQrSize(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#6B4FD8' }}
                  />
                </div>
                {negocio?.logo_url && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', paddingBottom: '4px' }}>
                    <input type="checkbox" checked={qrConLogo} onChange={e => setQrConLogo(e.target.checked)}
                      style={{ accentColor: '#6B4FD8', width: '15px', height: '15px' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text2)' }}>Logo</span>
                  </label>
                )}
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={descargarPNG} disabled={!qrUrl}
                    style={{
                      flex: 1, padding: '11px 14px', borderRadius: '10px', border: 'none',
                      background: qrUrl ? 'linear-gradient(135deg,#6B4FD8,#4F46E5)' : 'var(--ds-bg)',
                      color: qrUrl ? 'white' : 'var(--ds-text2)',
                      fontFamily: 'inherit', fontSize: '13px', fontWeight: 700,
                      cursor: qrUrl ? 'pointer' : 'not-allowed',
                      boxShadow: qrUrl ? '0 4px 12px rgba(107,79,216,0.25)' : 'none',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    ⬇️ PNG
                  </button>
                  <button onClick={descargarSVG} disabled={!urlNegocio}
                    style={{
                      flex: 1, padding: '11px 14px', borderRadius: '10px',
                      border: '1.5px solid var(--ds-border)', background: 'var(--ds-bg)',
                      color: 'var(--ds-text)', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                      cursor: urlNegocio ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ⬇️ SVG
                  </button>
                </div>
                <button onClick={compartir} disabled={!urlNegocio}
                  style={{
                    padding: '11px 14px', borderRadius: '10px',
                    border: '1.5px solid var(--ds-border)', background: 'var(--ds-bg)',
                    color: 'var(--ds-text)', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                    cursor: urlNegocio ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  📤 Compartir enlace
                </button>
              </div>
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
            Pega este <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>&lt;iframe&gt;</code> en cualquier web — tus clientes reservan sin salir de tu página.
          </p>

          {/* URL pública */}
          {negocioId && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-text2)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                URL pública del widget
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--ds-bg)', border: '1px solid var(--ds-border)', borderRadius: '10px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {urlWidget}
              </div>
            </div>
          )}

          {/* Código iframe */}
          <div style={{ background: '#1E1E2E', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
            <code style={{ fontSize: '12px', color: '#A78BFA', fontFamily: 'monospace', wordBreak: 'break-all' as const, display: 'block', whiteSpace: 'pre-wrap' as const }}>
              {codigoWidget || 'Cargando...'}
            </code>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, marginBottom: showWidgetPreview ? '16px' : '0' }}>
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
            <button
              onClick={() => setShowWidgetPreview(v => !v)}
              disabled={!negocioId}
              style={{
                padding: '9px 18px', borderRadius: '10px',
                border: '1.5px solid var(--ds-border)', background: 'var(--ds-bg)',
                color: 'var(--ds-text)', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                cursor: negocioId ? 'pointer' : 'not-allowed',
              }}
            >
              {showWidgetPreview ? '🔼 Ocultar preview' : '👁 Ver preview'}
            </button>
          </div>

          {showWidgetPreview && negocioId && (
            <div style={{ border: '1.5px solid var(--ds-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--ds-border)', fontSize: '12px', fontWeight: 600, color: 'var(--ds-text2)', background: 'var(--ds-bg)' }}>
                Preview — así lo verán tus clientes
              </div>
              <iframe
                src={urlWidget}
                width="100%"
                height="600"
                style={{ border: 'none', display: 'block' }}
                title="Preview widget de reservas"
              />
            </div>
          )}
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
              <p style={{ fontWeight: 700, marginBottom: '10px', color: '#4F46E5' }}>Requisitos para conectar:</p>
              <ol style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Cuenta Meta Business</strong> — Crea o accede en <a href="https://business.facebook.com" target="_blank" rel="noopener" style={{ color: '#4F46E5' }}>business.facebook.com</a> y verifica tu negocio.</li>
                <li><strong>Número dedicado</strong> — Necesitas un número exclusivo para WhatsApp Business (no puede tener cuenta activa de WhatsApp).</li>
                <li><strong>App en Meta Developers</strong> — En <a href="https://developers.facebook.com" target="_blank" rel="noopener" style={{ color: '#4F46E5' }}>developers.facebook.com</a>, crea una app tipo &quot;Business&quot; con el producto &quot;WhatsApp&quot; activado.</li>
                <li>
                  <strong>Configura el Webhook</strong> después de conectar — URL:{' '}
                  <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>{WEBHOOK_URL}</code>{' '}
                  · Token: <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>{VERIFY_TOKEN}</code>{' '}
                  · Evento: <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>messages</code>
                </li>
                <li><strong>Aprobación Meta</strong> — Para mensajes a clientes nuevos necesitas aprobación de Meta (2-4 semanas).</li>
              </ol>
            </div>
          )}

          {waActivo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px',
                padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803D' }}>✅ WhatsApp conectado</div>
                  {waPhoneId && (
                    <div style={{ fontSize: '12px', color: '#166534', marginTop: '3px' }}>
                      Phone ID: {waPhoneId}
                    </div>
                  )}
                </div>
                <button
                  onClick={desconectarWa}
                  style={{
                    padding: '7px 14px', borderRadius: '8px',
                    border: '1.5px solid #FCA5A5', background: '#FEF2F2',
                    color: '#DC2626', fontFamily: 'inherit', fontSize: '12px',
                    fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  }}
                >
                  Desconectar
                </button>
              </div>
              <div>
                <label style={labelSt}>URL del Webhook (configúrala en Meta Developers)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={WEBHOOK_URL} readOnly style={{ ...inputSt, color: '#6B7280', flex: 1 }} />
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
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text2)' }}>
                Para conectar necesitas una cuenta <strong>Meta Business</strong> con una app configurada.{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener" style={{ color: '#4F46E5' }}>
                  developers.facebook.com →
                </a>
              </p>
              <button
                onClick={() => { if (negocioId && META_APP_ID) window.location.href = oauthUrlWa() }}
                disabled={!negocioId || !META_APP_ID}
                style={{
                  padding: '13px', borderRadius: '12px', border: 'none',
                  background: negocioId && META_APP_ID ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'var(--ds-bg)',
                  color: negocioId && META_APP_ID ? 'white' : 'var(--ds-text2)',
                  fontFamily: 'inherit', fontSize: '14px', fontWeight: 700,
                  cursor: negocioId && META_APP_ID ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: negocioId && META_APP_ID ? '0 4px 12px rgba(37,211,102,0.3)' : 'none',
                }}
              >
                🔗 Conectar WhatsApp Business
              </button>
              {!META_APP_ID && (
                <p style={{ margin: 0, fontSize: '12px', color: '#DC2626' }}>
                  Falta configurar <code>NEXT_PUBLIC_META_APP_ID</code> en Vercel.
                </p>
              )}
            </div>
          )}
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
              <p style={{ fontWeight: 700, marginBottom: '10px', color: '#EC4899' }}>Requisitos para conectar:</p>
              <ol style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Cuenta Business o Creator</strong> — Tu perfil de Instagram debe ser Business o Creator (Instagram → Configuración → Tipo de cuenta).</li>
                <li><strong>Vincula a Facebook</strong> — Conecta tu Instagram a una página de Facebook desde <a href="https://business.facebook.com" target="_blank" rel="noopener" style={{ color: '#EC4899' }}>Meta Business Suite</a>.</li>
                <li><strong>Al hacer clic en &quot;Conectar&quot;</strong> — Serás redirigido a Meta para autorizar los permisos. Se guarda automáticamente un token de larga duración (60 días).</li>
                <li><strong>Renovación</strong> — Deberás volver a conectar cada 60 días.</li>
              </ol>
            </div>
          )}

          {igActivo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: '#FDF2F8', border: '1px solid #F9A8D4', borderRadius: '12px',
                padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#9D174D' }}>✅ Instagram conectado</div>
                  {igUsername && (
                    <div style={{ fontSize: '12px', color: '#831843', marginTop: '3px' }}>
                      @{igUsername}
                    </div>
                  )}
                </div>
                <button
                  onClick={desconectarIg}
                  style={{
                    padding: '7px 14px', borderRadius: '8px',
                    border: '1.5px solid #FCA5A5', background: '#FEF2F2',
                    color: '#DC2626', fontFamily: 'inherit', fontSize: '12px',
                    fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  }}
                >
                  Desconectar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text2)' }}>
                Para conectar necesitas una cuenta <strong>Instagram Business o Creator</strong> vinculada a una página de Facebook.{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener" style={{ color: '#EC4899' }}>
                  developers.facebook.com →
                </a>
              </p>
              <button
                onClick={() => { if (negocioId && META_APP_ID) window.location.href = oauthUrlIg() }}
                disabled={!negocioId || !META_APP_ID}
                style={{
                  padding: '13px', borderRadius: '12px', border: 'none',
                  background: negocioId && META_APP_ID ? 'linear-gradient(135deg,#E1306C,#833AB4)' : 'var(--ds-bg)',
                  color: negocioId && META_APP_ID ? 'white' : 'var(--ds-text2)',
                  fontFamily: 'inherit', fontSize: '14px', fontWeight: 700,
                  cursor: negocioId && META_APP_ID ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: negocioId && META_APP_ID ? '0 4px 12px rgba(225,48,108,0.3)' : 'none',
                }}
              >
                🔗 Conectar con Instagram
              </button>
              {!META_APP_ID && (
                <p style={{ margin: 0, fontSize: '12px', color: '#DC2626' }}>
                  Falta configurar <code>NEXT_PUBLIC_META_APP_ID</code> en Vercel.
                </p>
              )}
            </div>
          )}
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
