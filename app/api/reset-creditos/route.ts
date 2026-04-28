import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cron mensual — vercel.json: { "path": "/api/reset-creditos", "schedule": "0 0 1 * *" }

const CREDITOS_POR_PLAN: Record<string, number> = {
  starter: 100,
  basico:  300,
  pro:     1000,
  plus:    5000,
  beta:    2000,
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const hoy = new Date().toISOString().split('T')[0]

  // Fetch all negocios with their plan
  const { data: negocios, error } = await sb
    .from('negocios')
    .select('id, plan')

  if (error) {
    console.error('[reset-creditos] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let actualizados = 0
  for (const neg of negocios ?? []) {
    const plan   = (neg.plan as string) ?? 'starter'
    const nuevos = CREDITOS_POR_PLAN[plan] ?? 100
    await sb
      .from('negocios')
      .update({ creditos_usados: 0, creditos_totales: nuevos, creditos_reset_date: hoy })
      .eq('id', neg.id)
    actualizados++
  }

  console.log(`[reset-creditos] ${actualizados} negocios reseteados`)
  return NextResponse.json({ ok: true, actualizados, fecha: hoy })
}
