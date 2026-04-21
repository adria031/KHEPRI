import { NextRequest, NextResponse } from 'next/server'

// Vercel Cron Job — ejecuta auto-completado de reservas y envío de reseñas a las 21:00 UTC (23:00 España)
// Configurado en vercel.json: { "crons": [{ "path": "/api/cron-completar", "schedule": "0 21 * * *" }] }

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepri-nu.vercel.app'

  const res = await fetch(`${appUrl}/api/completar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': process.env.CRON_SECRET ?? '',
    },
  })

  const data = await res.json().catch(() => ({}))
  console.log('[cron-completar] result:', data)

  return NextResponse.json({ ok: true, ...data })
}
