import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const FROM = 'onboarding@khepria.app'

function htmlNegocio(nombre: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bienvenido a Khepria</title></head>
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
            <p style="font-size:28px;text-align:center;margin:0 0 8px;">🚀</p>
            <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 12px;letter-spacing:-0.5px;">¡Bienvenido a Khepria, ${nombre}!</h1>
            <p style="font-size:15px;color:#4B5563;text-align:center;line-height:1.6;margin:0 0 28px;">Tu negocio ya tiene un espacio en Khepria. Ahora puedes configurarlo, aceptar reservas y gestionar tu equipo con IA.</p>

            <!-- Steps -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:16px;padding:24px;margin-bottom:28px;">
              <tr>
                <td>
                  <p style="font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Próximos pasos</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:8px 0;font-size:14px;color:#111827;">✅&nbsp;&nbsp;Cuenta creada</td></tr>
                    <tr><td style="padding:8px 0;font-size:14px;color:#4B5563;">📸&nbsp;&nbsp;Sube tu logo y fotos del local</td></tr>
                    <tr><td style="padding:8px 0;font-size:14px;color:#4B5563;">🔧&nbsp;&nbsp;Añade tus servicios y precios</td></tr>
                    <tr><td style="padding:8px 0;font-size:14px;color:#4B5563;">⏰&nbsp;&nbsp;Configura tus horarios</td></tr>
                    <tr><td style="padding:8px 0;font-size:14px;color:#4B5563;">🤖&nbsp;&nbsp;Activa el chatbot IA</td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://khepria-nu.vercel.app/dashboard" style="display:inline-block;background:#111827;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;">Ir a mi panel →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="font-size:12px;color:#9CA3AF;margin:0;">Khepria · Tu plataforma de gestión inteligente<br>Si no creaste esta cuenta, ignora este correo.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function htmlCliente(nombre: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bienvenido a Khepria</title></head>
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
            <p style="font-size:28px;text-align:center;margin:0 0 8px;">🗺️</p>
            <h1 style="font-size:22px;font-weight:800;color:#111827;text-align:center;margin:0 0 12px;letter-spacing:-0.5px;">¡Hola ${nombre}, bienvenido!</h1>
            <p style="font-size:15px;color:#4B5563;text-align:center;line-height:1.6;margin:0 0 28px;">Ya formas parte de Khepria. Descubre los mejores negocios cerca de ti, reserva citas en segundos y gestiona todo desde un solo lugar.</p>

            <!-- Categories -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:16px;padding:24px;margin-bottom:28px;">
              <tr>
                <td>
                  <p style="font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Encuentra negocios como</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#111827;">💈&nbsp;&nbsp;Peluquerías y barberías</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;">💆&nbsp;&nbsp;Spas y masajes</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#111827;">🦷&nbsp;&nbsp;Dentistas y clínicas</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;">🧘&nbsp;&nbsp;Yoga y pilates</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#111827;">💅&nbsp;&nbsp;Estética y belleza</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;">🐾&nbsp;&nbsp;Veterinarias</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://khepria-nu.vercel.app/cliente" style="display:inline-block;background:#111827;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;">Explorar negocios →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="font-size:12px;color:#9CA3AF;margin:0;">Khepria · Reservas inteligentes cerca de ti<br>Si no creaste esta cuenta, ignora este correo.</p>
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
    const { email, nombre, tipo } = await req.json()
    if (!email || !nombre || !tipo) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const esNegocio = tipo === 'negocio'
    const subject = esNegocio
      ? 'Bienvenido a Khepria — ya puedes configurar tu negocio'
      : 'Bienvenido a Khepria — descubre negocios cerca de ti'
    const html = esNegocio ? htmlNegocio(nombre) : htmlCliente(nombre)

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
      console.error('[bienvenida] Resend error:', err)
      return NextResponse.json({ error: err }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[bienvenida] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
