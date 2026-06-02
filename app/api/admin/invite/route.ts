import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const FROM = process.env.EMAIL_FROM ?? 'Khepria <reservas@khepria.app>'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a Khepria</title>
</head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4);padding:40px 36px;text-align:center;">
      <div style="width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,0.3);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#1E3A5F;letter-spacing:-0.5px;">¡Bienvenido a Khepria! 🎉</h1>
      <p style="margin:10px 0 0;font-size:15px;color:rgba(30,58,95,0.75);">Has sido invitado a probar Khepria gratis de por vida</p>
    </div>
    <div style="padding:36px;">
      <p style="font-size:15px;color:#374151;line-height:1.75;margin:0 0 26px;">
        Hola,<br><br>
        Te invitamos a unirte a <strong style="color:#111827;">Khepria</strong>, la plataforma de gestión de citas y agenda para negocios. Como usuario especial, tendrás acceso <strong style="color:#4F46E5;">gratuito de por vida</strong> con el plan Beta.
      </p>

      <div style="background:linear-gradient(135deg,rgba(184,216,248,0.12),rgba(212,197,249,0.12));border:1.5px solid rgba(184,216,248,0.4);border-radius:14px;padding:22px;margin-bottom:28px;">
        <div style="font-size:11px;font-weight:800;color:#4F46E5;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.8px;">Plan Beta — todo incluido</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;"><span style="color:#22C55E;font-weight:800;margin-right:10px;">✓</span>Acceso gratuito de por vida</td></tr>
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;"><span style="color:#22C55E;font-weight:800;margin-right:10px;">✓</span>2.000 créditos de IA incluidos</td></tr>
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;"><span style="color:#22C55E;font-weight:800;margin-right:10px;">✓</span>Agenda, clientes y reservas ilimitadas</td></tr>
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;"><span style="color:#22C55E;font-weight:800;margin-right:10px;">✓</span>Soporte prioritario directo</td></tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:32px;">
        <a href="https://khepria.app/onboarding" style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;font-weight:800;font-size:16px;border-radius:13px;text-decoration:none;letter-spacing:-0.3px;">
          Crear mi cuenta gratis →
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#9CA3AF;">Sin tarjeta de crédito · Sin permanencia</p>
      </div>

      <hr style="border:none;border-top:1px solid #F3F4F6;margin:0 0 24px;">
      <p style="font-size:12px;color:#9CA3AF;text-align:center;line-height:1.7;margin:0;">
        ¿Tienes alguna pregunta? Responde a este email o escríbenos a
        <a href="mailto:hola@khepria.app" style="color:#6B7280;text-decoration:none;">hola@khepria.app</a><br>
        © 2025 Khepria ·
        <a href="https://khepria.app" style="color:#9CA3AF;text-decoration:none;">khepria.app</a>
      </p>
    </div>
  </div>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: '🎉 Has sido invitado a probar Khepria gratis de por vida',
      html,
    }),
  })

  if (!res.ok) {
    const data = await res.json()
    return NextResponse.json({ error: data.message || 'Error al enviar el email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
