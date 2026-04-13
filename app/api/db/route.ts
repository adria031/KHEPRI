import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_TABLES = ['servicios', 'horarios', 'trabajadores', 'productos', 'horarios_especiales', 'negocios', 'caja', 'nominas', 'chatbot_config']

/** Decode JWT payload without network call — signature is enforced by Supabase RLS */
function getUserIdFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return decoded.sub ?? null
  } catch {
    return null
  }
}

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

  const userId = getUserIdFromJwt(token)
  if (!userId) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const supabase = clientWithToken(token)

  const body = await req.json() as {
    op: string; table: string; id?: string; negocioId?: string; data?: Record<string, unknown>
  }
  const { op, table, id, negocioId, data } = body

  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Tabla no permitida' }, { status: 400 })
  }

  // Verificar que el negocio pertenece al usuario
  if (negocioId && table !== 'negocios') {
    const { data: neg } = await supabase
      .from('negocios')
      .select('id')
      .eq('id', negocioId)
      .eq('user_id', userId)
      .single()
    if (!neg) return NextResponse.json({ error: 'Sin permisos sobre este negocio' }, { status: 403 })
  }

  if (op === 'update' && id) {
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select('id').single()
    if (error) {
      console.error('[api/db] update error:', error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: result })
  }

  if (op === 'insert') {
    const { data: result, error } = await supabase.from(table).insert(data).select().single()
    if (error) {
      console.error('[api/db] insert error:', error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: result })
  }

  if (op === 'upsert') {
    const { data: result, error } = await supabase.from(table).upsert(data).select().single()
    if (error) {
      console.error('[api/db] upsert error:', error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: result })
  }

  if (op === 'delete' && id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      console.error('[api/db] delete error:', error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Operación no válida' }, { status: 400 })
}
