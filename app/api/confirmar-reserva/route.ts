import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export async function POST(req: Request) {
  const { reserva, negocio, servicio, trabajador } = await req.json()

  if (!reserva?.cliente_email) {
    return NextResponse.json({ skipped: true, reason: 'sin email' })
  }

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) return NextResponse.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'
  const confirmarUrl = `${appUrl}/reserva/${reserva.id}/confirmar`
  const cancelarUrl  = `${appUrl}/reserva/${reserva.id}/cancelar`

  const fechaFmt = reserva.fecha ? formatFecha(reserva.fecha) : reserva.fecha
  const horaFmt  = (reserva.hora as string)?.slice(0, 5) ?? ''

  const html = `<!DOCTYPE html>
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
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${negocio?.nombre ?? ''}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 36px;">
          <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola <strong style="color:#111827;">${reserva.cliente_nombre ?? ''}</strong>, tu cita ha quedado confirmada con los siguientes detalles:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:14px;overflow:hidden;margin-bottom:28px;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Negocio</span><br>
              <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${negocio?.nombre ?? ''}</span>
            </td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Servicio</span><br>
              <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${servicio?.nombre ?? ''}</span>
            </td></tr>
            ${trabajador ? `<tr><td style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Profesional</span><br>
              <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${trabajador.nombre}</span>
            </td></tr>` : ''}
            <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Fecha</span><br>
              <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${fechaFmt}</span>
            </td></tr>
            <tr><td style="padding:14px 20px;${negocio?.direccion ? 'border-bottom:1px solid rgba(0,0,0,0.06);' : ''}">
              <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Hora</span><br>
              <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${horaFmt}</span>
            </td></tr>
            ${negocio?.direccion ? `<tr><td style="padding:14px 20px;">
              <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Dirección</span><br>
              <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${negocio.direccion}${negocio.ciudad ? ', ' + negocio.ciudad : ''}</span>
            </td></tr>` : ''}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
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
          <p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6;">
            ¿Alguna duda? Contacta con <strong style="color:#6B7280;">${negocio?.nombre ?? 'el negocio'}</strong>${negocio?.telefono ? ` al <strong style="color:#6B7280;">${negocio.telefono}</strong>` : ''}.
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

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Khepria <reservas@khepria.app>',
      to: [reserva.cliente_email as string],
      subject: `✅ Reserva confirmada en ${negocio?.nombre ?? 'tu negocio'}`,
      html,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}))
    console.error('[confirmar-reserva] Resend error:', err)
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
