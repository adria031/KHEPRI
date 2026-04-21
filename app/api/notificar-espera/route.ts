import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_KEY = 're_N8LsEXXq_GE7J444xiXkHjRyxWwgZNgS1'

export async function POST(req: NextRequest) {
  const { reserva_id } = await req.json()
  if (!reserva_id) return NextResponse.json({ ok: false, error: 'falta reserva_id' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Get reservation details
  const { data: reserva } = await supabase
    .from('reservas')
    .select('negocio_id, fecha, servicio_id, negocios(nombre), servicios(nombre)')
    .eq('id', reserva_id)
    .maybeSingle()

  if (!reserva) return NextResponse.json({ ok: true, notificado: false, motivo: 'reserva no encontrada' })

  // Find first person on the wait list for same negocio + fecha + servicio
  const { data: espera } = await supabase
    .from('lista_espera')
    .select('*')
    .eq('negocio_id', reserva.negocio_id)
    .eq('fecha', reserva.fecha)
    .eq('servicio_id', reserva.servicio_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!espera || !espera.cliente_email) {
    return NextResponse.json({ ok: true, notificado: false, motivo: 'sin entradas con email en lista de espera' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const negNombre = (Array.isArray(reserva.negocios) ? reserva.negocios[0] : reserva.negocios as any)?.nombre ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const servNombre = (Array.isArray(reserva.servicios) ? reserva.servicios[0] : reserva.servicios as any)?.nombre ?? ''
  const fecha = new Date(reserva.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const reservarUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'}/negocio/${reserva.negocio_id}/reservar`

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>¡Hay un hueco para ti!</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
      <tr>
        <td style="background:linear-gradient(135deg,#B8EDD4,#B8D8F8);padding:36px;text-align:center;">
          <div style="font-size:48px;margin-bottom:10px;">🎉</div>
          <h1 style="margin:0;color:#1E3A5F;font-size:22px;font-weight:700;">¡Se ha liberado una plaza!</h1>
          <p style="margin:8px 0 0;color:rgba(30,58,95,0.7);font-size:14px;">Una cita en <strong>${negNombre}</strong> está disponible</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 36px;">
          <p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola <strong style="color:#111827;">${espera.cliente_nombre}</strong>, te habías apuntado a la lista de espera para <strong style="color:#111827;">${servNombre}</strong> el <strong style="color:#111827;">${fecha}</strong>.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#4B5563;line-height:1.6;">
            Se ha cancelado una cita y ahora hay disponibilidad. ¡Reserva antes de que se ocupe!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${reservarUrl}"
                 style="display:inline-block;padding:15px 36px;background:#111827;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px;letter-spacing:-0.2px;">
                Reservar ahora →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
            Si ya no necesitas la cita, simplemente ignora este email.
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
</body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Khepria <reservas@khepria.app>',
      to: [espera.cliente_email as string],
      subject: `🎉 ¡Se ha liberado una plaza en ${negNombre}!`,
      html,
    }),
  })

  if (res.ok) {
    // Remove the notified entry from wait list
    await supabase.from('lista_espera').delete().eq('id', espera.id)
  } else {
    const body = await res.json().catch(() => ({}))
    console.error('[notificar-espera] error Resend:', body)
  }

  return NextResponse.json({ ok: true, notificado: res.ok })
}
