import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function formatFechaLarga(fecha: string, hora: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]} de ${y} a las ${hora}`
}

function buildHtml(r: any, cancelUrl: string): string {
  const negocio = r.negocios ?? {}
  const servicio = r.servicios ?? {}
  const trabajador = r.trabajadores ?? null

  const fechaTexto = formatFechaLarga(r.fecha, r.hora)
  const direccion = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')

  const rows = [
    { label: 'Servicio', value: servicio.nombre || '—' },
    trabajador ? { label: 'Profesional', value: trabajador.nombre } : null,
    { label: 'Fecha y hora', value: fechaTexto },
    direccion ? { label: 'Dirección', value: direccion } : null,
    negocio.telefono ? { label: 'Teléfono negocio', value: negocio.telefono } : null,
    servicio.precio != null ? { label: 'Precio', value: `${Number(servicio.precio).toFixed(2)} €` } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const rowsHtml = rows.map(row => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#6B7280;font-weight:600;width:140px;vertical-align:top;border-bottom:1px solid #F3F4F6;">${row.label}</td>
      <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:700;border-bottom:1px solid #F3F4F6;">${row.value}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Cita confirmada</title>
</head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4);border-radius:20px 20px 0 0;padding:28px 32px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.6);display:inline-block;line-height:40px;text-align:center;font-size:20px;">✦</div>
            <span style="font-size:20px;font-weight:800;color:#1D4ED8;letter-spacing:-0.5px;">Khepria</span>
          </div>
        </td></tr>

        <!-- Green confirmed banner -->
        <tr><td style="background:#2E8A5E;padding:14px 32px;text-align:center;">
          <span style="font-size:13px;font-weight:700;color:white;letter-spacing:0.5px;">✓ CITA CONFIRMADA</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:32px 32px 24px;border-radius:0 0 20px 20px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">¡Tu cita está reservada!</p>
          <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
            Hola <strong>${r.cliente_nombre}</strong>, tu reserva en <strong>${negocio.nombre}</strong> ha sido registrada correctamente.
          </p>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;margin-bottom:28px;">
            ${rowsHtml}
          </table>

          <!-- Cancel button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${cancelUrl}"
                style="display:inline-block;padding:13px 28px;background:#111827;color:white;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;">
                Cancelar mi cita
              </a>
            </td></tr>
          </table>

          <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
            Si no puedes asistir, cancela con antelación para que otros clientes puedan reservar ese horario.<br/>
            En caso de dudas, contacta con ${negocio.nombre}${negocio.telefono ? ` al ${negocio.telefono}` : ''}.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">
            Gestionado por <strong>Khepria</strong> · Sistema de reservas inteligente
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reserva_id } = await req.json()
    if (!reserva_id) {
      return new Response(JSON.stringify({ error: 'reserva_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: reserva, error } = await supabase
      .from('reservas')
      .select(`
        id, fecha, hora, cliente_nombre, cliente_telefono, cliente_email,
        servicios (nombre, precio),
        trabajadores (nombre),
        negocios (nombre, direccion, ciudad, telefono)
      `)
      .eq('id', reserva_id)
      .single()

    if (error || !reserva) {
      return new Response(JSON.stringify({ error: 'Reserva not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!reserva.cliente_email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No client email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://khepria.vercel.app'
    const cancelUrl = `${appUrl}/reserva/${reserva.id}/cancelar`
    const html = buildHtml(reserva, cancelUrl)

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL') || 'Khepria <noreply@khepria.com>',
        to: [reserva.cliente_email],
        subject: `✅ Cita confirmada en ${(reserva.negocios as any)?.nombre}`,
        html,
      }),
    })

    const emailJson = await emailRes.json()

    if (!emailRes.ok) {
      return new Response(JSON.stringify({ error: 'Resend error', details: emailJson }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, email_id: emailJson.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
