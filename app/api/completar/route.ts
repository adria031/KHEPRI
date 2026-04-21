import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_KEY = 're_N8LsEXXq_GE7J444xiXkHjRyxWwgZNgS1'

function hoyISO(): string {
  return new Date().toISOString().split('T')[0]
}

/** Current wall-clock time as "HH:MM" in Spain timezone */
function ahoraHHMM(): string {
  return new Date().toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** "HH:MM" → minutes since midnight */
function toMins(hhmm: string): number {
  const [h, m] = (hhmm ?? '00:00').split(':').map(Number)
  return h * 60 + m
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildResenaHtml(r: any, resenaUrl: string, appUrl: string): string {
  // Supabase may return related rows as array or object depending on the join cardinality
  const negocio  = (Array.isArray(r.negocios)  ? r.negocios[0]  : r.negocios)  ?? { nombre: '' }
  const servicio = (Array.isArray(r.servicios) ? r.servicios[0] : r.servicios) ?? { nombre: '' }
  const fecha    = new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const hora = (r.hora as string)?.slice(0, 5) ?? ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>¿Cómo fue tu experiencia?</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#D4C5F9,#B8EDD4);padding:36px 36px 28px;text-align:center;">
          <div style="font-size:48px;margin-bottom:10px;">⭐</div>
          <h1 style="margin:0;color:#1E3A5F;font-size:22px;font-weight:700;letter-spacing:-0.3px;">¿Qué tal tu experiencia?</h1>
          <p style="margin:8px 0 0;color:rgba(30,58,95,0.7);font-size:14px;">Tu opinión importa en <strong>${negocio.nombre}</strong></p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 36px;">
          <p style="margin:0 0 22px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola <strong style="color:#111827;">${r.cliente_nombre}</strong>, gracias por visitarnos el <strong style="color:#111827;">${fecha} a las ${hora}</strong>${servicio.nombre ? ` para tu <strong style="color:#111827;">${servicio.nombre}</strong>` : ''}.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#4B5563;line-height:1.6;">
            Nos encantaría saber qué te pareció. Solo te llevará 30 segundos y nos ayuda a mejorar para ti y para otros clientes.
          </p>

          <!-- Stars preview -->
          <div style="text-align:center;margin-bottom:28px;">
            <span style="font-size:28px;letter-spacing:4px;">⭐⭐⭐⭐⭐</span>
          </div>

          <!-- CTA button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td align="center">
                <a href="${resenaUrl}"
                   style="display:inline-block;padding:15px 36px;background:#111827;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px;letter-spacing:-0.2px;">
                  Dejar mi valoración →
                </a>
              </td>
            </tr>
          </table>

          <!-- Details card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:14px;overflow:hidden;margin-bottom:24px;">
            <tr>
              <td style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
                <span style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Negocio</span><br>
                <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${negocio.nombre}</span>
              </td>
            </tr>
            ${servicio.nombre ? `<tr>
              <td style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
                <span style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Servicio</span><br>
                <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${servicio.nombre}</span>
              </td>
            </tr>` : ''}
            <tr>
              <td style="padding:14px 20px;">
                <span style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Cita</span><br>
                <span style="font-size:15px;font-weight:700;color:#111827;margin-top:3px;display:block;">${fecha} · ${hora}</span>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
            Si no quieres recibir estos emails, ignora este mensaje.<br>
            Tu enlace de reseña: <a href="${resenaUrl}" style="color:#6B7280;">${resenaUrl}</a>
          </p>
        </td>
      </tr>

      <!-- Footer -->
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
  const auth = req.headers.get('x-cron-secret')
  if (auth !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepri-nu.vercel.app'
  const hoy     = hoyISO()
  const ahoraMins = toMins(ahoraHHMM())

  // ── 1. Fetch all confirmed reservas from past days ───────────────────────
  const { data: pasadas, error: errPasadas } = await supabase
    .from('reservas')
    .select('id, cliente_email, cliente_nombre, fecha, hora, negocio_id, resena_enviada, servicios(nombre, duracion, precio), negocios(nombre, telefono), trabajadores(nombre)')
    .eq('estado', 'confirmada')
    .lt('fecha', hoy)

  if (errPasadas) {
    console.error('[completar] error buscando pasadas:', errPasadas)
    return NextResponse.json({ error: errPasadas.message }, { status: 500 })
  }

  // ── 2. Fetch today's confirmed reservas and filter by time ───────────────
  const { data: hoyReservas, error: errHoy } = await supabase
    .from('reservas')
    .select('id, cliente_email, cliente_nombre, fecha, hora, negocio_id, resena_enviada, servicios(nombre, duracion, precio), negocios(nombre, telefono), trabajadores(nombre)')
    .eq('estado', 'confirmada')
    .eq('fecha', hoy)

  if (errHoy) {
    console.error('[completar] error buscando hoy:', errHoy)
  }

  // Keep today's reservas where hora + duracion (min 30) < now
  const hoyFinalizadas = (hoyReservas ?? []).filter((r) => {
    const duracion = (r.servicios as { duracion?: number } | null)?.duracion ?? 30
    return toMins((r.hora as string)?.slice(0, 5)) + duracion <= ahoraMins
  })

  const paraCompletar = [...(pasadas ?? []), ...hoyFinalizadas]

  if (paraCompletar.length === 0) {
    return NextResponse.json({ ok: true, completadas: 0, resenas: 0 })
  }

  // ── 3. Mark all as completada ────────────────────────────────────────────
  const ids = paraCompletar.map((r) => r.id)
  const { error: errUpdate } = await supabase
    .from('reservas')
    .update({ estado: 'completada' })
    .in('id', ids)

  if (errUpdate) {
    console.error('[completar] error actualizando estado:', errUpdate)
    return NextResponse.json({ error: errUpdate.message }, { status: 500 })
  }

  // ── 4. Award loyalty points ──────────────────────────────────────────────
  for (const r of paraCompletar) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const servicio = (Array.isArray(r.servicios) ? r.servicios[0] : r.servicios) as any
    const precio   = servicio?.precio ?? 0
    const puntos   = Math.floor(precio)
    if (puntos <= 0) continue

    // Update puntos_ganados on the reserva
    await supabase.from('reservas').update({ puntos_ganados: puntos }).eq('id', r.id)

    // Increment client's total points in profiles
    if (r.cliente_email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, puntos')
        .eq('email', r.cliente_email)
        .maybeSingle()
      if (profile) {
        await supabase
          .from('profiles')
          .update({ puntos: (profile.puntos ?? 0) + puntos })
          .eq('id', profile.id)
      }
    }
  }

  // ── 5. Send review emails for those with email & resena_enviada = false ──
  let resenas = 0
  let erroresResena = 0

  for (const r of paraCompletar) {
    if (!r.cliente_email || r.resena_enviada) continue

    const resenaUrl = `${appUrl}/negocio/${r.negocio_id}/resena?reserva_id=${r.id}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = buildResenaHtml(r as any, resenaUrl, appUrl)
    const negRaw = Array.isArray(r.negocios) ? r.negocios[0] : r.negocios
    const negNombre = (negRaw as { nombre?: string } | null)?.nombre ?? 'tu negocio'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Khepria <reservas@khepria.app>',
        to: [r.cliente_email as string],
        subject: `⭐ ¿Qué tal tu experiencia en ${negNombre}?`,
        html,
      }),
    })

    if (res.ok) {
      await supabase
        .from('reservas')
        .update({ resena_enviada: true })
        .eq('id', r.id)
      resenas++
    } else {
      const body = await res.json().catch(() => ({}))
      console.error('[completar] error Resend para reserva', r.id, body)
      erroresResena++
    }
  }

  return NextResponse.json({
    ok: true,
    completadas: ids.length,
    resenas,
    erroresResena,
  })
}

// GET para test manual
export async function GET() {
  return NextResponse.json({ ok: true, mensaje: 'Usa POST para ejecutar el auto-completado y envío de reseñas' })
}
