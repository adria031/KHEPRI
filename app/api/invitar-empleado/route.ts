import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const FROM = 'onboarding@khepria.app'

function htmlInvitacion(nombreEmpleado: string, nombreNegocio: string, url: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invitación a ${nombreNegocio}</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;border:1px solid rgba(0,0,0,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.08);overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4);padding:36px 40px;text-align:center;">
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
            <p style="font-size:28px;text-align:center;margin:0 0 8px;">🎉</p>
            <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 12px;letter-spacing:-0.5px;">¡Hola ${nombreEmpleado}!</h1>
            <p style="font-size:15px;color:#4B5563;text-align:center;line-height:1.6;margin:0 0 28px;">Te han invitado a unirte a <strong>${nombreNegocio}</strong> en Khepria como miembro del equipo. Crea tu cuenta para empezar a gestionar reservas, ver tu agenda y mucho más.</p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:16px;padding:24px;margin-bottom:28px;">
              <tr>
                <td>
                  <p style="font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Con tu cuenta podrás</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:8px 0;font-size:14px;color:#111827;">📅&nbsp;&nbsp;Ver y gestionar tus reservas</td></tr>
                    <tr><td style="padding:8px 0;font-size:14px;color:#4B5563;">🕐&nbsp;&nbsp;Consultar tu horario de trabajo</td></tr>
                    <tr><td style="padding:8px 0;font-size:14px;color:#4B5563;">👥&nbsp;&nbsp;Coordinar con tu equipo</td></tr>
                    <tr><td style="padding:8px 0;font-size:14px;color:#4B5563;">📊&nbsp;&nbsp;Acceder a estadísticas de tu actividad</td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${url}" style="display:inline-block;background:#111827;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;">Crear mi cuenta →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="font-size:12px;color:#9CA3AF;margin:0;">Khepria · Tu plataforma de gestión inteligente<br>Si no esperabas esta invitación, puedes ignorar este correo.</p>
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
    const { email, nombreEmpleado, nombreNegocio, negocioId } = await req.json()
    if (!email || !nombreEmpleado || !nombreNegocio || !negocioId) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const url = `https://khepri-nu.vercel.app/auth?modo=registro&email=${encodeURIComponent(email)}&negocio=${negocioId}&rol=empleado`
    const subject = `Te han invitado a unirte a ${nombreNegocio} en Khepria`
    const html = htmlInvitacion(nombreEmpleado, nombreNegocio, url)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: email, subject, html }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[invitar-empleado] Resend error:', err)
      return NextResponse.json({ error: err }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[invitar-empleado] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
