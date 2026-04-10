import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const supabase = clientWithToken(token)

  const { data: user, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user.user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const { data, error } = await supabase
    .from('negocios')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('x-supabase-token')
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = clientWithToken(token)

  const { data: user, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user.user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const body = await req.json()
  const { negocioId, ...campos } = body

  if (!negocioId) return NextResponse.json({ error: 'negocioId requerido' }, { status: 400 })

  // Verificar que el negocio pertenece al usuario (sin depender de RLS)
  const { data: check } = await supabase
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .eq('user_id', user.user.id)
    .single()

  if (!check) return NextResponse.json({ error: 'No tienes permiso para editar este negocio' }, { status: 403 })

  const { data, error } = await supabase
    .from('negocios')
    .update(campos)
    .eq('id', negocioId)
    .eq('user_id', user.user.id)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No se actualizó ninguna fila' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
