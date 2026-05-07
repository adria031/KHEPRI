import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { rateLimit, getIP } from '../../lib/rateLimit'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), 10)
  if (!rl.ok) return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })

  try {
    const body = await req.json()
    // Accept both field name conventions
    const email: string = body.email
    const nombreTrabajador: string = body.nombreTrabajador ?? body.nombre
    const especialidad: string | undefined = body.especialidad
    const nombreNegocio: string = body.nombreNegocio ?? body.negocio_nombre
    const negocioId: string = body.negocioId ?? body.negocio_id

    if (!email || !nombreTrabajador || !nombreNegocio || !negocioId) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'
    const registroUrl = `${appUrl}/onboarding/trabajador?negocio_id=${negocioId}&email=${encodeURIComponent(email)}&nombre=${encodeURIComponent(nombreTrabajador)}`

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invitación al equipo</title></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

      <tr>
        <td style="background:linear-gradient(135deg,#B8D8F8,#D4C5F9);padding:36px;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">👋</div>
          <h1 style="margin:0;color:#1E3A5F;font-size:22px;font-weight:800;letter-spacing:-0.3px;">¡Bienvenido al equipo!</h1>
          <p style="margin:8px 0 0;color:rgba(30,58,95,0.7);font-size:14px;">${nombreNegocio}</p>
        </td>
      </tr>

      <tr>
        <td style="padding:36px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
            Hola <strong style="color:#111827;">${nombreTrabajador}</strong> 👋
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.7;">
            <strong style="color:#111827;">${nombreNegocio}</strong> te ha invitado a unirte a su equipo${especialidad ? ` como <strong style="color:#4F46E5;">${especialidad}</strong>` : ''} en Khepria.
          </p>
          <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.7;">
            Haz clic en el botón para crear tu cuenta y acceder a tu agenda de citas.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td align="center">
                <a href="${registroUrl}"
                   style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:-0.2px;">
                  Crear mi cuenta →
                </a>
              </td>
            </tr>
          </table>

          <div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
              🔗 Si el botón no funciona, copia este enlace:<br>
              <a href="${registroUrl}" style="color:#4F46E5;word-break:break-all;font-size:12px;">${registroUrl}</a>
            </p>
          </div>

          <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
            Si no esperabas esta invitación, ignora este email.
          </p>
        </td>
      </tr>

      <tr>
        <td style="background:#F8FAFC;padding:16px 36px;text-align:center;border-top:1px solid #F1F5F9;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            Gestionado con <strong style="color:#6B7280;">Khepria</strong>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

    console.log('[invitar-trabajador] Enviando email a:', email)
    const { data, error: resendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Khepria <reservas@khepria.app>',
      to: [email],
      subject: `✂️ ${nombreNegocio} te ha añadido a su equipo en Khepria`,
      html,
    })
    console.log('[invitar-trabajador] Respuesta Resend:', JSON.stringify({ data, error: resendError }))

    if (resendError) {
      console.error('[invitar-trabajador] Resend error:', resendError)
      return NextResponse.json(
        { error: 'No se pudo enviar el email. Verifica el dominio en Resend.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[invitar-trabajador] error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
