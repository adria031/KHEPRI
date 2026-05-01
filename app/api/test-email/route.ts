import { NextResponse } from 'next/server'

// onboarding@resend.dev solo puede enviar al email del dueño de la cuenta Resend
// Para enviar a cualquier destinatario hay que verificar un dominio propio en resend.com/domains
const TEST_TO = 'khepriacontact@gmail.com'

export async function GET() {
  const key = process.env.RESEND_API_KEY
  console.log('[test-email] RESEND_API_KEY set:', !!key, '| prefix:', key?.slice(0, 8))

  if (!key) {
    return NextResponse.json({ error: 'RESEND_API_KEY no está configurada en el entorno' }, { status: 500 })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Khepria <onboarding@resend.dev>',
      to: [TEST_TO],
      subject: '✅ Test email Khepria — Resend funcionando',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F7F9FC;border-radius:16px;">
          <h2 style="color:#111827;margin-bottom:8px;">✅ ¡Resend funciona!</h2>
          <p style="color:#4B5563;font-size:15px;">Este email se generó desde <strong>api/test-email</strong> en Khepria.</p>
          <p style="color:#6B7280;font-size:13px;">Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>
          <p style="color:#6B7280;font-size:13px;">Key prefix: <code>${key.slice(0, 8)}...</code></p>
        </div>
      `,
    }),
  })

  const body = await res.json().catch(() => ({}))
  console.log('[test-email] Respuesta Resend:', JSON.stringify({ status: res.status, body }))

  if (!res.ok) {
    return NextResponse.json({ error: 'Resend error', status: res.status, detail: body }, { status: 502 })
  }

  return NextResponse.json({ ok: true, to: TEST_TO, resend_id: (body as any).id })
}
