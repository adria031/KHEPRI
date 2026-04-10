/**
 * API route genérico para mutaciones de tablas del dashboard.
 * El cliente envía el Bearer token explícitamente → sin depender de cookies.
 *
 * Body: { op, table, id?, negocioId?, data }
 *   op:        'update' | 'insert' | 'delete' | 'upsert'
 *   table:     nombre de tabla permitida
 *   id:        id de la fila (para update/delete)
 *   negocioId: id del negocio propietario (para verificar pertenencia)
 *   data:      objeto de campos a escribir
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_TABLES = ['servicios', 'horarios', 'trabajadores', 'productos', 'horarios_especiales', 'negocios', 'caja', 'nominas']

function clientWithToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-supabase-token')
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = clientWithToken(token)
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const body = await req.json() as {
    op: string; table: string; id?: string; negocioId?: string; data?: Record<string, unknown>
  }
  const { op, table, id, negocioId, data } = body

  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Tabla no permitida' }, { status: 400 })
  }

  // Verificar que el negocio pertenece al usuario (cuando aplica)
  if (negocioId && table !== 'negocios') {
    const { data: neg } = await supabase
      .from('negocios')
      .select('id')
      .eq('id', negocioId)
      .eq('user_id', user.id)
      .single()
    if (!neg) return NextResponse.json({ error: 'Sin permisos sobre este negocio' }, { status: 403 })
  }

  if (op === 'update' && id) {
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: result })
  }

  if (op === 'insert') {
    const { data: result, error } = await supabase.from(table).insert(data).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: result })
  }

  if (op === 'upsert') {
    const { data: result, error } = await supabase.from(table).upsert(data).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: result })
  }

  if (op === 'delete' && id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Operación no válida' }, { status: 400 })
}
