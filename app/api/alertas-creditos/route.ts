import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const FROM = 'Khepria <onboarding@resend.dev>'

const PLAN_UPGRADE: Record<string, { siguiente: string; label: string; creditos: number }> = {
  starter: { siguiente: 'basico',  label: 'Básico — 29,99€/mes',  creditos: 300 },
  basico:  { siguiente: 'pro',     label: 'Pro — 59,99€/mes',      creditos: 1000 },
  pro:     { siguiente: 'plus',    label: 'Plus — 99,99€/mes',     creditos: 5000 },
  plus:    { siguiente: '',        label: '',                       creditos: 0 },
}

function htmlAlerta(nombre: string, creditos_usados: number, creditos_totales: number, plan: string) {
  const restantes = Math.max(0, creditos_totales - creditos_usados)
  const porcentaje = creditos_totales > 0 ? Math.round((creditos_usados / creditos_totales) * 100) : 0
  const upgrade = PLAN_UPGRADE[plan]
  const barWidth = Math.min(porcentaje, 100)
  const barColor = porcentaje >= 90 ? '#EF4444' : '#F59E0B'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pocos créditos — Khepria</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;border:1px solid rgba(0,0,0,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.08);overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4);padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:rgba(255,255,255,0.25);border-radius:14px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                  <span style="font-size:24px;line-height:48px;">⬡</span>
                </td>
                <td style="padding-left:12px;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Khepria</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="font-size:32px;text-align:center;margin:0 0 8px;">⚡</p>
            <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 12px;letter-spacing:-0.5px;">Te quedan pocos créditos IA</h1>
            <p style="font-size:15px;color:#4B5563;text-align:center;line-height:1.6;margin:0 0 28px;">Hola <strong>${nombre}</strong>, has usado el ${porcentaje}% de tus créditos este mes. Te quedan <strong>${restantes.toLocaleString('es-ES')} créditos</strong>.</p>

            <!-- Barra de progreso -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                    <tr>
                      <td style="font-size:13px;color:#6B7280;">Créditos usados</td>
                      <td align="right" style="font-size:13px;font-weight:700;color:#111827;">${creditos_usados.toLocaleString('es-ES')} / ${creditos_totales.toLocaleString('es-ES')}</td>
                    </tr>
                  </table>
                  <div style="background:#F3F4F6;border-radius:100px;height:10px;overflow:hidden;">
                    <div style="background:${barColor};height:10px;border-radius:100px;width:${barWidth}%;"></div>
                  </div>
                </td>
              </tr>
            </table>

            ${upgrade?.siguiente ? `
            <!-- Upgrade -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(212,197,249,0.15),rgba(184,216,248,0.15));border:1.5px solid rgba(212,197,249,0.5);border-radius:16px;padding:20px;margin-bottom:28px;">
              <tr>
                <td>
                  <p style="font-size:13px;font-weight:700;color:#6B4FD8;margin:0 0 6px;">🚀 Amplía tus créditos</p>
                  <p style="font-size:14px;color:#111827;font-weight:700;margin:0 0 4px;">${upgrade.label}</p>
                  <p style="font-size:13px;color:#4B5563;margin:0;">${upgrade.creditos.toLocaleString('es-ES')} créditos IA por mes</p>
                </td>
              </tr>
            </table>
            ` : `
            <!-- Already on max plan -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(184,237,212,0.2);border:1px solid rgba(46,138,94,0.3);border-radius:16px;padding:20px;margin-bottom:28px;">
              <tr>
                <td>
                  <p style="font-size:14px;color:#2E8A5E;font-weight:600;margin:0;">✅ Estás en el plan máximo (Plus). Tus créditos se recargan automáticamente el 1 de cada mes.</p>
                </td>
              </tr>
            </table>
            `}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://khepria-nu.vercel.app/dashboard" style="display:inline-block;background:#111827;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;">Ver mi panel →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="font-size:12px;color:#9CA3AF;margin:0;">Khepria · Los créditos se recargan automáticamente cada mes.<br>Puedes gestionar tu plan desde el panel de control.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { email, nombre, creditos_usados, creditos_totales, plan } = await req.json()
    if (!email || !nombre || creditos_usados == null || creditos_totales == null) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Solo enviar si >= 80% usado
    const porcentaje = creditos_totales > 0 ? creditos_usados / creditos_totales : 0
    if (porcentaje < 0.8) {
      return NextResponse.json({ ok: true, enviado: false, motivo: 'Uso por debajo del 80%' })
    }

    const restantes = Math.max(0, creditos_totales - creditos_usados)
    const subject = restantes === 0
      ? '⚡ Te has quedado sin créditos IA — Khepria'
      : `⚡ Te quedan solo ${restantes} créditos IA — Khepria`

    const html = htmlAlerta(nombre, creditos_usados, creditos_totales, plan ?? 'starter')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: email, subject, html }),
    })
    const resBody = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('[alertas-creditos] Resend error:', resBody)
      return NextResponse.json({ error: resBody }, { status: res.status })
    }

    return NextResponse.json({ ok: true, enviado: true })
  } catch (e: any) {
    console.error('[alertas-creditos] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
