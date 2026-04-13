import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/** Decode JWT payload without network call */
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

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-supabase-token')
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = getUserIdFromJwt(token)
  if (!userId) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const supabase = clientWithToken(token)

  const { data, error } = await supabase
    .from('negocios')
    .select('*')
    .eq('user_id', userId)
    .order('creado_en', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    console.error('[api/negocio] GET error:', error.message, error.details, error.hint)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('x-supabase-token')
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = getUserIdFromJwt(token)
  if (!userId) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const supabase = clientWithToken(token)
  const body = await req.json()
  const { negocioId, ...campos } = body

  if (!negocioId) return NextResponse.json({ error: 'negocioId requerido' }, { status: 400 })

  // Verificar propiedad
  const { data: check } = await supabase
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .eq('user_id', userId)
    .single()

  if (!check) return NextResponse.json({ error: 'No tienes permiso para editar este negocio' }, { status: 403 })

  const { data, error } = await supabase
    .from('negocios')
    .update(campos)
    .eq('id', negocioId)
    .eq('user_id', userId)
    .select('id')
    .single()

  if (error) {
    console.error('[api/negocio] PATCH error:', error.message, error.details, error.hint)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'No se actualizó ninguna fila' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
