import { NextRequest, NextResponse } from 'next/server'

const RESEND_KEY = 're_N8LsEXXq_GE7J444xiXkHjRyxWwgZNgS1'

export async function POST(req: NextRequest) {
  try {
    const { email, nombreEmpleado, nombreNegocio, negocioId } = await req.json()
    if (!email || !nombreEmpleado || !nombreNegocio || !negocioId) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepri-nu.vercel.app'
    const registroUrl = `${appUrl}/auth?modo=registro&email=${encodeURIComponent(email)}&negocio=${negocioId}&rol=empleado`

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invitación al equipo</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

      <tr>
        <td style="background:linear-gradient(135deg,#D4C5F9,#B8D8F8);padding:32px 36px;text-align:center;">
          <div style="font-size:36px;margin-bottom:10px;">👋</div>
          <h1 style="margin:0;color:#2D1B69;font-size:22px;font-weight:700;letter-spacing:-0.3px;">¡Te han invitado al equipo!</h1>
          <p style="margin:6px 0 0;color:rgba(45,27,105,0.7);font-size:14px;">${nombreNegocio}</p>
        </td>
      </tr>

      <tr>
        <td style="padding:32px 36px;">
          <p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.6;">
            Hola <strong style="color:#111827;">${nombreEmpleado}</strong>, has sido invitado a unirte al equipo de <strong style="color:#111827;">${nombreNegocio}</strong> como empleado en Khepria.
          </p>
          <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
            Crea tu cuenta gratuita para acceder a tu panel de empleado, ver tu agenda del día y gestionar tus citas.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td align="center">
                <a href="${registroUrl}"
                   style="display:inline-block;padding:14px 32px;background:#111827;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
                  Crear mi cuenta
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
            Si no esperabas esta invitación, puedes ignorar este email.
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Khepria <reservas@khepria.app>',
        to: [email],
        subject: `👋 ${nombreNegocio} te ha invitado a unirte al equipo`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[invitar-empleado] Resend error:', body)
      return NextResponse.json({ error: (body as any)?.message ?? `Resend error ${res.status}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[invitar-empleado] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
