import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getIP } from '../../lib/rateLimit'

// Vercel Cron — ejecuta auto-completado cada 15 minutos
// vercel.json: { "path": "/api/completar-reservas", "schedule": "*/15 * * * *" }

function hoyISO(): string {
  return new Date().toISOString().split('T')[0]
}

function ahoraHHMM(): string {
  return new Date().toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function toMins(hhmm: string): number {
  const [h, m] = (hhmm ?? '00:00').split(':').map(Number)
  return h * 60 + m
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(getIP(req), 10)
  if (!rl.ok) return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })

  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const hoy = hoyISO()
  const ahoraMins = toMins(ahoraHHMM())

  // Reservas confirmadas de días anteriores
  const { data: pasadas } = await sb
    .from('reservas')
    .select('id, hora, user_id, negocio_id, servicios(duracion, precio)')
    .eq('estado', 'confirmada')
    .lt('fecha', hoy)

  // Reservas confirmadas de hoy
  const { data: hoyData } = await sb
    .from('reservas')
    .select('id, hora, user_id, negocio_id, servicios(duracion, precio)')
    .eq('estado', 'confirmada')
    .eq('fecha', hoy)

  const hoyFinalizadas = (hoyData ?? []).filter((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const duracion = (Array.isArray(r.servicios) ? r.servicios[0] : r.servicios as any)?.duracion ?? 30
    return toMins((r.hora as string)?.slice(0, 5)) + duracion <= ahoraMins
  })

  const ids = [...(pasadas ?? []), ...hoyFinalizadas].map(r => r.id)

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, completadas: 0 })
  }

  const { error } = await sb
    .from('reservas')
    .update({ estado: 'completada' })
    .in('id', ids)

  if (error) {
    console.error('[completar-reservas] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Otorgar puntos de fidelización
  const todasReservas = [...(pasadas ?? []), ...hoyFinalizadas]
  let puntosOtorgados = 0

  for (const r of todasReservas) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (r as any).user_id as string | null
    if (!userId) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const precio = (Array.isArray(r.servicios) ? r.servicios[0] : r.servicios as any)?.precio ?? 0
    const puntos = Math.floor(precio)
    if (puntos <= 0) continue

    // Incrementar puntos en profiles (sin race conditions)
    await sb.rpc('increment_puntos', { p_user_id: userId, p_puntos: puntos })

    // Insertar historial
    await sb.from('historial_puntos').insert({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user_id: userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      negocio_id: (r as any).negocio_id ?? null,
      reserva_id: r.id,
      puntos,
      concepto: 'Reserva completada',
    })

    // Actualizar puntos_ganados en la reserva
    await sb.from('reservas').update({ puntos_ganados: puntos }).eq('id', r.id)

    puntosOtorgados += puntos
  }

  console.log(`[completar-reservas] ${ids.length} reservas completadas, ${puntosOtorgados} puntos otorgados`)
  return NextResponse.json({ ok: true, completadas: ids.length, puntosOtorgados })
}
