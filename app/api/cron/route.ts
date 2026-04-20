import { NextRequest, NextResponse } from 'next/server'

// Vercel Cron Job — ejecuta recordatorios cada día a las 10:00 UTC
// Configurado en vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "0 10 * * *" }] }

export async function GET(req: NextRequest) {
  // Vercel envía la cabecera Authorization en cron jobs
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepri-nu.vercel.app'

  const res = await fetch(`${appUrl}/api/recordatorios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': process.env.CRON_SECRET ?? '',
    },
  })

  const data = await res.json().catch(() => ({}))
  console.log('[cron] recordatorios result:', data)

  return NextResponse.json({ ok: true, ...data })
}
