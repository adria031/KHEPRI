import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTomorrowMadrid(): string {
  // Returns YYYY-MM-DD of tomorrow in Europe/Madrid timezone
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  const [y, m, d] = today.split('-').map(Number)
  const tomorrow = new Date(y, m - 1, d + 1)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(tomorrow)
}

function formatFechaLarga(fecha: string, hora: string): string {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]} de ${y} a las ${hora}`
}

function cleanPhone(tel: string): string {
  const clean = tel.replace(/[\s\-().]/g, '')
  if (clean.startsWith('+')) return clean.slice(1) // wa.me needs number without +
  if (clean.startsWith('0034')) return clean.slice(2)
  if (clean.startsWith('34') && clean.length >= 11) return clean
  return '34' + clean // assume Spain
}

function buildReminderEmail(r: any, cancelUrl: string, appUrl: string): string {
  const negocio = r.negocios ?? {}
  const servicio = r.servicios ?? {}
  const trabajador = r.trabajadores ?? null
  const fechaTexto = formatFechaLarga(r.fecha, r.hora)
  const direccion = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')

  const whatsappNum = negocio.whatsapp ? cleanPhone(negocio.whatsapp) : null
  const waText = encodeURIComponent(`Hola, tengo una cita en ${negocio.nombre} el ${r.fecha} a las ${r.hora}. `)
  const waUrl = whatsappNum ? `https://wa.me/${whatsappNum}?text=${waText}` : null

  const rows = [
    { label: 'Servicio', value: servicio.nombre || '—' },
    trabajador ? { label: 'Profesional', value: trabajador.nombre } : null,
    { label: 'Fecha y hora', value: fechaTexto },
    direccion ? { label: 'Dirección', value: direccion } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const rowsHtml = rows.map(row => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#6B7280;font-weight:600;width:130px;vertical-align:top;border-bottom:1px solid #F3F4F6;">${row.label}</td>
      <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:700;border-bottom:1px solid #F3F4F6;">${row.value}</td>
    </tr>`).join('')

  const waButton = waUrl ? `
    <tr><td align="center" style="padding-top:10px;">
      <a href="${waUrl}"
        style="display:inline-block;padding:12px 24px;background:#25D366;color:white;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;">
        💬 Contactar por WhatsApp
      </a>
    </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header gradient (amber for reminder, different from green confirmation) -->
        <tr><td style="background:linear-gradient(135deg,#FEF3C7,#FDE68A,#FCD34D);border-radius:20px 20px 0 0;padding:28px 32px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.6);display:inline-block;line-height:40px;text-align:center;font-size:20px;">✦</div>
            <span style="font-size:20px;font-weight:800;color:#92400E;letter-spacing:-0.5px;">Khepria</span>
          </div>
        </td></tr>

        <!-- Amber reminder banner -->
        <tr><td style="background:#D97706;padding:14px 32px;text-align:center;">
          <span style="font-size:13px;font-weight:700;color:white;letter-spacing:0.5px;">⏰ RECORDATORIO DE CITA — MAÑANA</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:32px 32px 24px;border-radius:0 0 20px 20px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Te recordamos tu cita</p>
          <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
            Hola <strong>${r.cliente_nombre}</strong>, mañana tienes una cita en <strong>${negocio.nombre}</strong>.
          </p>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;margin-bottom:24px;">
            ${rowsHtml}
          </table>

          <!-- Buttons -->
          <table width="100%" cellpadding="0" cellspacing="0">
            ${waButton}
            <tr><td align="center" style="padding-top:10px;">
              <a href="${cancelUrl}"
                style="display:inline-block;padding:12px 24px;background:#F9FAFB;color:#374151;border:1.5px solid #E5E7EB;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;">
                ✕ Cancelar mi cita
              </a>
            </td></tr>
          </table>

          <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
            Si no puedes asistir, cancela con antelación para liberar ese horario.<br/>
            ${negocio.telefono ? `Teléfono: ${negocio.telefono}` : ''}
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">
            Recordatorio automático de <strong>Khepria</strong>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify cron secret
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const appUrl = Deno.env.get('APP_URL') || 'https://khepria.vercel.app'
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Khepria <noreply@khepria.com>'

  const tomorrowStr = getTomorrowMadrid()
  const stats = { date: tomorrowStr, total: 0, email_sent: 0, no_email: 0, errors: 0 }

  try {
    // Fetch all unreminded reservations for tomorrow
    const { data: reservas, error: fetchErr } = await supabase
      .from('reservas')
      .select(`
        id, fecha, hora, cliente_nombre, cliente_telefono, cliente_email,
        servicios (nombre),
        trabajadores (nombre),
        negocios (nombre, direccion, ciudad, telefono, whatsapp)
      `)
      .eq('fecha', tomorrowStr)
      .in('estado', ['pendiente', 'confirmada'])
      .eq('recordatorio_enviado', false)

    if (fetchErr) throw fetchErr
    if (!reservas || reservas.length === 0) {
      return new Response(JSON.stringify({ ok: true, ...stats, message: 'No reservations for tomorrow' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    stats.total = reservas.length
    const processedIds: string[] = []

    for (const r of reservas) {
      try {
        if (!r.cliente_email) {
          stats.no_email++
          processedIds.push(r.id)
          continue
        }

        if (!resendKey) {
          // No Resend key — log but mark as processed so we don't retry forever
          console.warn(`RESEND_API_KEY not set, skipping email for reserva ${r.id}`)
          stats.no_email++
          processedIds.push(r.id)
          continue
        }

        const cancelUrl = `${appUrl}/reserva/${r.id}/cancelar`
        const html = buildReminderEmail(r, cancelUrl, appUrl)
        const negocioNombre = (r.negocios as any)?.nombre ?? 'tu cita'

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [r.cliente_email],
            subject: `⏰ Recordatorio: cita mañana en ${negocioNombre}`,
            html,
          }),
        })

        if (emailRes.ok) {
          stats.email_sent++
          processedIds.push(r.id)
        } else {
          const errBody = await emailRes.json().catch(() => ({}))
          console.error(`Email failed for ${r.id}:`, errBody)
          stats.errors++
          // Don't add to processedIds — will retry next hour
        }
      } catch (innerErr) {
        console.error(`Error processing reserva ${r.id}:`, innerErr)
        stats.errors++
      }
    }

    // Mark processed reservations as reminded
    if (processedIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('reservas')
        .update({ recordatorio_enviado: true })
        .in('id', processedIds)

      if (updateErr) console.error('Error marking as reminded:', updateErr)
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Fatal error:', e)
    return new Response(JSON.stringify({ ok: false, error: e.message, ...stats }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
