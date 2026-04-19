import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_KEY = process.env.RESEND_API_KEY

// ── Helpers ────────────────────────────────────────────────────────────────

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function buildHtml(r: any, cancelUrl: string): string {
  const negocio    = r.negocios    ?? {}
  const servicio   = r.servicios   ?? {}
  const trabajador = r.trabajadores

  const fecha = formatFecha(r.fecha)
  const hora  = (r.hora as string)?.slice(0, 5) ?? ''

  const row = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:14px 20px;${last ? '' : 'border-bottom:1px solid rgba(0,0,0,0.06);'}">
        <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">${label}</span><br>
        <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${value}</span>
      </td>
    </tr>`

  const direccion = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reserva confirmada</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

      <tr>
        <td style="background:linear-gradient(135deg,#22C55E,#16A34A);padding:32px 36px;text-align:center;">
          <div style="font-size:36px;margin-bottom:10px;">✅</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">¡Reserva confirmada!</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${negocio.nombre ?? ''}</p>
        </td>
      </tr>

      <tr>
        <td style="padding:32px 36px;">
          <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola <strong style="color:#111827;">${r.cliente_nombre}</strong>, tu cita ha quedado confirmada con los siguientes detalles:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:14px;overflow:hidden;margin-bottom:28px;">
            ${row('Servicio', servicio.nombre ?? '')}
            ${trabajador ? row('Con', trabajador.nombre) : ''}
            ${row('Fecha', fecha)}
            ${row('Hora', hora, !direccion)}
            ${direccion ? row('Dirección', direccion, true) : ''}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <a href="${cancelUrl}"
                   style="display:inline-block;padding:12px 28px;background:#F3F4F6;color:#6B7280;font-size:13px;font-weight:600;text-decoration:none;border-radius:10px;border:1px solid #E5E7EB;">
                  Cancelar esta cita
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6;">
            ¿Alguna duda? Contacta con <strong style="color:#6B7280;">${negocio.nombre ?? 'el negocio'}</strong>${negocio.telefono ? ` al <strong style="color:#6B7280;">${negocio.telefono}</strong>` : ''}.
          </p>
        </td>
      </tr>

      <tr>
        <td style="background:#F7F9FC;padding:18px 36px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">Gestionado con <strong style="color:#6B7280;">Khepria</strong></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { reserva_id } = await req.json() as { reserva_id?: string }
    if (!reserva_id) {
      return NextResponse.json({ error: 'reserva_id requerido' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: reserva, error: fetchErr } = await supabase
      .from('reservas')
      .select('*, servicios(nombre), trabajadores(nombre), negocios(nombre, direccion, ciudad, telefono)')
      .eq('id', reserva_id)
      .single()

    if (fetchErr || !reserva) {
      return NextResponse.json({ error: 'reserva no encontrada' }, { status: 404 })
    }

    if (!reserva.cliente_email) {
      return NextResponse.json({ skipped: true, reason: 'sin email' })
    }

    if (!RESEND_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 })
    }

    const host    = req.headers.get('host') ?? 'localhost:3000'
    const proto   = host.startsWith('localhost') ? 'http' : 'https'
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
    const cancelUrl = `${appUrl}/reserva/${reserva_id}/cancelar`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Khepria <reservas@khepria.app>',
        to: [reserva.cliente_email as string],
        subject: `✅ Reserva confirmada en ${(reserva.negocios as any)?.nombre ?? 'tu negocio'}`,
        html: buildHtml(reserva, cancelUrl),
      }),
    })

    if (!emailRes.ok) {
      const body = await emailRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: (body as any)?.message ?? `Resend error ${emailRes.status}` },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
