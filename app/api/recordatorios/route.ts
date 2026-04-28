import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getIP } from '../../lib/rateLimit'

const RESEND_KEY = 're_N8LsEXXq_GE7J444xiXkHjRyxWwgZNgS1'

function manana(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

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

  const fecha    = formatFecha(r.fecha)
  const hora     = (r.hora as string)?.slice(0, 5) ?? ''
  const direccion = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')

  const row = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:14px 20px;${last ? '' : 'border-bottom:1px solid rgba(0,0,0,0.06);'}">
        <span style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">${label}</span><br>
        <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${value}</span>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recordatorio de cita</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

      <tr>
        <td style="background:linear-gradient(135deg,#B8D8F8,#D4C5F9);padding:32px 36px;text-align:center;">
          <div style="font-size:36px;margin-bottom:10px;">⏰</div>
          <h1 style="margin:0;color:#1E3A5F;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Recuerda tu cita de mañana</h1>
          <p style="margin:6px 0 0;color:rgba(30,58,95,0.7);font-size:14px;">${negocio.nombre ?? ''}</p>
        </td>
      </tr>

      <tr>
        <td style="padding:32px 36px;">
          <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola <strong style="color:#111827;">${r.cliente_nombre}</strong>, te recordamos que tienes una cita programada para mañana:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:14px;overflow:hidden;margin-bottom:28px;">
            ${row('Servicio', servicio.nombre ?? '')}
            ${trabajador ? row('Con', trabajador.nombre) : ''}
            ${row('Fecha', fecha)}
            ${row('Hora', hora, !direccion)}
            ${direccion ? row('Dirección', direccion, true) : ''}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center">
                <a href="${cancelUrl}"
                   style="display:inline-block;padding:12px 28px;background:#F3F4F6;color:#6B7280;font-size:13px;font-weight:600;text-decoration:none;border-radius:10px;border:1px solid #E5E7EB;">
                  Cancelar esta cita
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6;">
            ¿Necesitas cambiar algo? Contacta con <strong style="color:#6B7280;">${negocio.nombre ?? 'el negocio'}</strong>${negocio.telefono ? ` al <strong style="color:#6B7280;">${negocio.telefono}</strong>` : ''}.
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

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), 10)
  if (!rl.ok) return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })

  // Verificar clave de autorización para evitar llamadas no autorizadas
  const auth = req.headers.get('x-cron-secret')
  if (auth !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const fechaManana = manana()

  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('*, servicios(nombre, precio), trabajadores(nombre), negocios(nombre, direccion, ciudad, telefono)')
    .eq('fecha', fechaManana)
    .eq('estado', 'confirmada')
    .eq('recordatorio_enviado', false)

  if (error) {
    console.error('[recordatorios] error al buscar reservas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!reservas || reservas.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0, mensaje: 'Sin reservas para mañana' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepri-nu.vercel.app'
  let enviados = 0
  let errores = 0

  for (const reserva of reservas) {
    if (!reserva.cliente_email) continue

    const cancelUrl = `${appUrl}/reserva/${reserva.id}/cancelar`
    const html = buildHtml(reserva, cancelUrl)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Khepria <reservas@khepria.app>',
        to: [reserva.cliente_email as string],
        subject: `⏰ Recordatorio: tu cita de mañana en ${(reserva.negocios as any)?.nombre ?? 'tu negocio'}`,
        html,
      }),
    })

    if (res.ok) {
      await supabase
        .from('reservas')
        .update({ recordatorio_enviado: true })
        .eq('id', reserva.id)
      enviados++
    } else {
      const body = await res.json().catch(() => ({}))
      console.error('[recordatorios] error Resend para reserva', reserva.id, body)
      errores++
    }
  }

  return NextResponse.json({ ok: true, enviados, errores, total: reservas.length })
}

// GET para test manual
export async function GET() {
  return NextResponse.json({ ok: true, mensaje: 'Usa POST para ejecutar los recordatorios' })
}
