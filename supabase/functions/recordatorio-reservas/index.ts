import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** YYYY-MM-DD de mañana en zona horaria Europe/Madrid */
function getTomorrowMadrid(): string {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  const [y, m, d] = hoy.split('-').map(Number)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' })
    .format(new Date(y, m - 1, d + 1))
}

function formatFecha(fecha: string, hora: string): string {
  const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]} de ${y} a las ${hora.slice(0, 5)}`
}

function cleanPhone(tel: string): string {
  const t = tel.replace(/[\s\-()+.]/g, '')
  if (t.startsWith('0034')) return t.slice(2)
  if (t.startsWith('34') && t.length >= 11) return t
  return '34' + t
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildEmail(r: any, cancelUrl: string, resenaUrl: string): string {
  const neg  = r.negocios    ?? {}
  const svc  = r.servicios   ?? {}
  const trab = r.trabajadores ?? null

  const fechaTexto = formatFecha(r.fecha, r.hora)
  const dir = [neg.direccion, neg.ciudad].filter(Boolean).join(', ')

  const waUrl = neg.whatsapp
    ? `https://wa.me/${cleanPhone(neg.whatsapp)}?text=${encodeURIComponent(`Hola, tengo cita en ${neg.nombre} el ${r.fecha} a las ${r.hora}. `)}`
    : null

  const detRow = (label: string, value: string) => `
    <tr>
      <td style="padding:11px 18px;font-size:13px;color:#6B7280;font-weight:600;white-space:nowrap;border-bottom:1px solid #F3F4F6;vertical-align:top;">${label}</td>
      <td style="padding:11px 18px;font-size:13px;color:#111827;font-weight:700;border-bottom:1px solid #F3F4F6;">${value}</td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:36px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

      <!-- Header amber -->
      <tr>
        <td style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:30px 36px;text-align:center;">
          <div style="font-size:34px;margin-bottom:8px;">⏰</div>
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">Recordatorio de cita</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Mañana tienes una cita en <strong>${neg.nombre ?? ''}</strong></p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:30px 36px;">
          <p style="margin:0 0 22px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola <strong style="color:#111827;">${r.cliente_nombre}</strong>, te recordamos que mañana tienes una cita. ¡Te esperamos!
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;margin-bottom:26px;">
            ${detRow('Servicio',    svc.nombre ?? '—')}
            ${trab              ? detRow('Profesional', trab.nombre) : ''}
            ${detRow('Cuándo',     fechaTexto)}
            ${dir               ? detRow('Dirección',   dir) : ''}
          </table>

          <!-- Buttons -->
          <table width="100%" cellpadding="0" cellspacing="0">
            ${waUrl ? `<tr><td align="center" style="padding-bottom:10px;">
              <a href="${waUrl}" style="display:inline-block;padding:12px 26px;background:#25D366;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;">
                💬 Contactar por WhatsApp
              </a>
            </td></tr>` : ''}
            <tr><td align="center" style="padding-bottom:10px;">
              <a href="${cancelUrl}" style="display:inline-block;padding:11px 24px;background:#F9FAFB;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:12px;font-size:13px;font-weight:600;text-decoration:none;">
                Cancelar esta cita
              </a>
            </td></tr>
          </table>

          <!-- Reseña (tras la cita) -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #F3F4F6;padding-top:20px;">
            <tr><td align="center">
              <p style="margin:0 0 10px;font-size:13px;color:#9CA3AF;">Después de tu cita, ¿nos dejas tu opinión?</p>
              <a href="${resenaUrl}" style="display:inline-block;padding:11px 24px;background:#FEF3C7;color:#92400E;border:1.5px solid #FDE68A;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;">
                ⭐ Valorar mi experiencia
              </a>
            </td></tr>
          </table>

          ${neg.telefono ? `<p style="margin:22px 0 0;font-size:13px;color:#9CA3AF;text-align:center;">
            ¿Necesitas ayuda? Llama al <strong style="color:#6B7280;">${neg.telefono}</strong>
          </p>` : ''}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F7F9FC;padding:16px 36px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">Recordatorio automático · <strong style="color:#6B7280;">Khepria</strong></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verificar CRON_SECRET si está configurado
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const auth = req.headers.get('Authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const appUrl    = Deno.env.get('APP_URL') ?? 'https://khepri-nu.vercel.app'
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Khepria <reservas@khepria.app>'

  const manana = getTomorrowMadrid()
  const stats  = { fecha: manana, total: 0, enviados: 0, sin_email: 0, errores: 0 }

  try {
    const { data: reservas, error: fetchErr } = await supabase
      .from('reservas')
      .select(`
        id, fecha, hora, cliente_nombre, cliente_email, negocio_id,
        servicios   ( nombre ),
        trabajadores( nombre ),
        negocios    ( nombre, direccion, ciudad, telefono, whatsapp )
      `)
      .eq('fecha', manana)
      .eq('estado', 'confirmada')
      .eq('recordatorio_enviado', false)

    if (fetchErr) throw fetchErr

    if (!reservas || reservas.length === 0) {
      return new Response(JSON.stringify({ ok: true, ...stats, msg: 'Sin reservas para mañana' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    stats.total = reservas.length

    const marcadas: string[] = []   // IDs a marcar como recordatorio_enviado = true

    for (const r of reservas) {
      try {
        if (!r.cliente_email) {
          stats.sin_email++
          marcadas.push(r.id)       // sin email → marcar para no reintentar
          continue
        }

        if (!resendKey) {
          console.warn('RESEND_API_KEY no configurado')
          stats.sin_email++
          marcadas.push(r.id)
          continue
        }

        const cancelUrl = `${appUrl}/reserva/${r.id}/cancelar`
        const resenaUrl = `${appUrl}/negocio/${r.negocio_id}/resena?reserva_id=${r.id}`
        const html = buildEmail(r, cancelUrl, resenaUrl)

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:    fromEmail,
            to:      [r.cliente_email],
            subject: `⏰ Recordatorio: cita mañana en ${(r.negocios as any)?.nombre ?? 'tu negocio'}`,
            html,
          }),
        })

        if (res.ok) {
          stats.enviados++
          marcadas.push(r.id)
        } else {
          const err = await res.json().catch(() => ({}))
          console.error(`Error Resend para ${r.id}:`, err)
          stats.errores++
          // NO marcamos → reintento en la próxima hora
        }
      } catch (err) {
        console.error(`Error procesando reserva ${r.id}:`, err)
        stats.errores++
      }
    }

    if (marcadas.length > 0) {
      const { error: updateErr } = await supabase
        .from('reservas')
        .update({ recordatorio_enviado: true })
        .in('id', marcadas)

      if (updateErr) console.error('Error marcando recordatorios:', updateErr)
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Error fatal:', e)
    return new Response(JSON.stringify({ ok: false, error: e.message, ...stats }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
