import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function buildHtml(opts: {
  cliente_nombre: string
  cliente_email: string
  fecha: string
  hora: string
  negocio: { nombre: string; direccion?: string | null; ciudad?: string | null; telefono?: string | null }
  servicio: { nombre: string; precio?: number | null }
  trabajador?: { nombre: string } | null
  confirmarUrl: string
  cancelarUrl: string
}): string {
  const { cliente_nombre, fecha, hora, negocio, servicio, trabajador, confirmarUrl, cancelarUrl } = opts
  const fechaFmt    = formatFecha(fecha)
  const horaFmt     = (hora as string)?.slice(0, 5) ?? ''
  const direccion   = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'

  const row = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:14px 20px;${last ? '' : 'border-bottom:1px solid rgba(0,0,0,0.06);'}">
        <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">${label}</span><br>
        <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${value}</span>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reserva confirmada</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
      <tr>
        <td style="background:linear-gradient(135deg,#22C55E,#16A34A);padding:32px 36px;text-align:center;">
          <div style="font-size:40px;margin-bottom:10px;">✅</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">¡Tu cita está confirmada!</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${negocio.nombre}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 36px;">
          <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola <strong style="color:#111827;">${cliente_nombre}</strong>, tu cita ha quedado confirmada con los siguientes detalles:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:14px;overflow:hidden;margin-bottom:28px;">
            ${row('Negocio', negocio.nombre)}
            ${row('Servicio', servicio.nombre)}
            ${trabajador ? row('Profesional', trabajador.nombre) : ''}
            ${row('Fecha', fechaFmt)}
            ${row('Hora', horaFmt, !direccion)}
            ${direccion ? row('Dirección', direccion, true) : ''}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="padding:0 8px 0 0;">
                <a href="${confirmarUrl}"
                   style="display:block;padding:13px 20px;background:#DCFCE7;color:#166534;text-align:center;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;border:1px solid #BBF7D0;">
                  ✅ Confirmo mi asistencia
                </a>
              </td>
              <td style="padding:0 0 0 8px;">
                <a href="${cancelarUrl}"
                   style="display:block;padding:13px 20px;background:#FEE2E2;color:#991B1B;text-align:center;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;border:1px solid #FECACA;">
                  ❌ Cancelar cita
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6;">
            ¿Alguna duda? Contacta con <strong style="color:#6B7280;">${negocio.nombre}</strong>${negocio.telefono ? ` al <strong style="color:#6B7280;">${negocio.telefono}</strong>` : ''}.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#F7F9FC;padding:18px 36px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">Gestionado con <strong style="color:#6B7280;">Khepria</strong> — <a href="${appUrl}" style="color:#9CA3AF;">khepria.app</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function POST(req: Request) {
  console.log('[confirmar-reserva] POST recibido')

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) {
    console.error('[confirmar-reserva] RESEND_API_KEY no configurada')
    return NextResponse.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  console.log('[confirmar-reserva] body:', JSON.stringify(body))

  // ── Modo A: datos completos pasados directamente (desde dashboard) ──────
  // body: { reserva, negocio, servicio, trabajador }
  // ── Modo B: IDs para cargar desde Supabase (desde reservar/page.tsx) ────
  // body: { reserva_id, cliente_email, cliente_nombre, negocio_id, servicio_id, fecha, hora }

  let clienteNombre: string
  let clienteEmail: string
  let fecha: string
  let hora: string
  let reservaId: string | undefined
  let negocio: { nombre: string; direccion?: string | null; ciudad?: string | null; telefono?: string | null }
  let servicio: { nombre: string; precio?: number | null }
  let trabajador: { nombre: string } | null = null

  if (body.reserva_id) {
    // Modo B — cargar todo desde Supabase
    const reservaId_ = body.reserva_id as string
    reservaId        = reservaId_

    const { data: reserva, error: rErr } = await supabase
      .from('reservas')
      .select('*, servicios(nombre, precio), trabajadores(nombre), negocios(nombre, direccion, ciudad, telefono)')
      .eq('id', reservaId_)
      .single()

    console.log('[confirmar-reserva] reserva cargada:', JSON.stringify({ reserva, error: rErr }))

    if (rErr || !reserva) {
      console.error('[confirmar-reserva] reserva no encontrada:', rErr)
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    if (!reserva.cliente_email) {
      console.log('[confirmar-reserva] sin email, omitido')
      return NextResponse.json({ skipped: true, reason: 'sin email' })
    }

    clienteNombre = reserva.cliente_nombre ?? ''
    clienteEmail  = reserva.cliente_email
    fecha         = reserva.fecha
    hora          = reserva.hora
    negocio       = (reserva.negocios as typeof negocio) ?? { nombre: 'Negocio' }
    servicio      = (reserva.servicios as typeof servicio) ?? { nombre: 'Servicio' }
    trabajador    = (reserva.trabajadores as typeof trabajador) ?? null

  } else if (body.reserva && body.negocio) {
    // Modo A — datos completos pasados desde el dashboard
    const r = body.reserva as Record<string, unknown>
    const n = body.negocio as Record<string, unknown>
    const s = body.servicio as Record<string, unknown> | undefined
    const t = body.trabajador as { nombre: string } | null | undefined

    if (!r.cliente_email) return NextResponse.json({ skipped: true, reason: 'sin email' })

    reservaId     = r.id as string | undefined
    clienteNombre = (r.cliente_nombre as string) ?? ''
    clienteEmail  = r.cliente_email as string
    fecha         = r.fecha as string
    hora          = r.hora as string
    negocio       = { nombre: (n.nombre as string) ?? '', direccion: n.direccion as string | null, ciudad: n.ciudad as string | null, telefono: n.telefono as string | null }
    servicio      = { nombre: (s?.nombre as string) ?? '', precio: s?.precio as number | null }
    trabajador    = t ?? null

  } else {
    console.error('[confirmar-reserva] body sin campos reconocidos')
    return NextResponse.json({ error: 'Faltan campos: reserva_id o reserva+negocio' }, { status: 400 })
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'
  const confirmarUrl = reservaId ? `${appUrl}/reserva/${reservaId}/confirmar` : appUrl
  const cancelarUrl  = reservaId ? `${appUrl}/reserva/${reservaId}/cancelar`  : appUrl

  const html = buildHtml({ cliente_nombre: clienteNombre, cliente_email: clienteEmail, fecha, hora, negocio, servicio, trabajador, confirmarUrl, cancelarUrl })

  console.log('[confirmar-reserva] enviando email a:', clienteEmail)
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Khepria <reservas@khepria.app>',
      to: [clienteEmail],
      subject: `✅ Reserva confirmada en ${negocio.nombre}`,
      html,
    }),
  })

  const emailBody = await emailRes.json().catch(() => ({}))
  console.log('[confirmar-reserva] Resend respuesta:', JSON.stringify({ status: emailRes.status, body: emailBody }))

  if (!emailRes.ok) {
    console.error('[confirmar-reserva] Resend error:', emailBody)
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
