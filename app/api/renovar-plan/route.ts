import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cron diario a las 06:00 UTC — vercel.json: { "path": "/api/renovar-plan", "schedule": "0 6 * * *" }
// Renueva créditos a los usuarios cuyo plan_fecha_inicio coincide con el día de hoy.

const RESEND_KEY = process.env.RESEND_API_KEY ?? ''

const CREDITOS_POR_PLAN: Record<string, number> = {
  starter: 100,
  basico:  300,
  pro:     1000,
  plus:    5000,
  beta:    2000,
}

function buildRenovacionHtml(email: string, creditos: number, plan: string): string {
  const planLabel: Record<string, string> = {
    starter: 'Starter', basico: 'Básico', pro: 'Pro', plus: 'Plus', beta: 'Beta',
  }
  const nombre = planLabel[plan] ?? plan

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tus créditos se han renovado</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#6B4FD8,#4F46E5);padding:36px 36px 28px;text-align:center;">
          <div style="font-size:48px;margin-bottom:10px;">⚡</div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">¡Tus créditos se han renovado!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Plan <strong>${nombre}</strong> · renovación mensual</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 36px;">
          <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola, este mes tienes disponibles <strong style="color:#111827;">${creditos} créditos IA</strong> en tu cuenta Khepria. Úsalos para generar contenido de marketing, responder reseñas y crear calendarios de publicación.
          </p>

          <!-- Credits badge -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td align="center">
                <div style="display:inline-block;padding:20px 40px;background:linear-gradient(135deg,#EEF2FF,#F5F3FF);border-radius:16px;border:1px solid #C7D2FE;">
                  <div style="font-size:48px;font-weight:900;color:#4F46E5;letter-spacing:-2px;line-height:1;">${creditos}</div>
                  <div style="font-size:13px;font-weight:600;color:#6B7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">créditos disponibles</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- What you can do -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:14px;overflow:hidden;margin-bottom:28px;">
            <tr>
              <td style="padding:14px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
                <span style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">¿Qué puedes hacer?</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
                <span style="font-size:14px;color:#374151;">🎨 <strong>Crear imagen Instagram</strong> — 10 créditos</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;border-bottom:1px solid rgba(0,0,0,0.06);">
                <span style="font-size:14px;color:#374151;">⭐ <strong>Responder reseña</strong> — 3 créditos</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;">
                <span style="font-size:14px;color:#374151;">📅 <strong>Calendario mensual</strong> — 15 créditos</span>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center">
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'}/dashboard/marketing"
                   style="display:inline-block;padding:14px 32px;background:#4F46E5;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:-0.2px;">
                  Ir al panel de marketing →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
            Los créditos se renuevan cada mes en la fecha en que activaste tu plan.<br>
            Si tienes dudas escríbenos a <a href="mailto:hola@khepria.app" style="color:#6B7280;">hola@khepria.app</a>
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

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const today    = new Date()
  const todayDay = today.getDate()
  const hoyISO   = today.toISOString().split('T')[0]

  // 1. Todos los profiles con plan_fecha_inicio definido
  const { data: perfiles, error: errPerfiles } = await sb
    .from('profiles')
    .select('id, email, plan_fecha_inicio')
    .not('plan_fecha_inicio', 'is', null)

  if (errPerfiles) {
    console.error('[renovar-plan] error leyendo profiles:', errPerfiles)
    return NextResponse.json({ error: errPerfiles.message }, { status: 500 })
  }

  // 2. Filtrar los que renuevan hoy (mismo día del mes)
  const perfilesHoy = (perfiles ?? []).filter(p => {
    if (!p.plan_fecha_inicio) return false
    const d = new Date(p.plan_fecha_inicio + 'T00:00:00')
    return d.getDate() === todayDay
  })

  if (perfilesHoy.length === 0) {
    return NextResponse.json({ ok: true, renovados: 0, mensaje: `Ningún plan renueva el día ${todayDay}` })
  }

  let renovados      = 0
  let emailsEnviados = 0
  let erroresEmail   = 0

  for (const perfil of perfilesHoy) {
    // 3. Negocios del usuario
    const { data: negocios } = await sb
      .from('negocios')
      .select('id, plan, nombre')
      .eq('user_id', perfil.id)

    if (!negocios?.length) continue

    // 4. Resetear créditos por negocio
    for (const neg of negocios) {
      const plan   = (neg.plan as string) ?? 'starter'
      const nuevos = CREDITOS_POR_PLAN[plan] ?? 100
      await sb
        .from('negocios')
        .update({ creditos_usados: 0, creditos_totales: nuevos, creditos_reset_date: hoyISO })
        .eq('id', neg.id)
      renovados++
    }

    // 5. Email con el total de créditos del primer negocio (plan principal)
    if (perfil.email) {
      const planPrincipal = (negocios[0].plan as string) ?? 'starter'
      const creditosPlan  = CREDITOS_POR_PLAN[planPrincipal] ?? 100
      const html = buildRenovacionHtml(perfil.email, creditosPlan, planPrincipal)

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'Khepria <reservas@khepria.app>',
          to:   [perfil.email],
          subject: '⚡ Tus créditos Khepria se han renovado',
          html,
        }),
      })

      if (res.ok) {
        emailsEnviados++
      } else {
        const body = await res.json().catch(() => ({}))
        console.error('[renovar-plan] error Resend para', perfil.email, body)
        erroresEmail++
      }
    }
  }

  console.log(`[renovar-plan] ${renovados} negocios renovados, ${emailsEnviados} emails enviados, ${erroresEmail} errores`)
  return NextResponse.json({ ok: true, renovados, emailsEnviados, erroresEmail })
}
