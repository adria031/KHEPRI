import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const telefono = searchParams.get('telefono')
  const email = searchParams.get('email')

  if (!telefono && !email) {
    return NextResponse.json({ cliente: null, error: 'Proporciona telefono o email' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  let query = supabase.from('profiles').select('id, nombre, telefono, email').eq('tipo', 'cliente')

  if (telefono) query = query.eq('telefono', telefono)
  else if (email) query = query.eq('email', email)

  const { data } = await query.single()

  return NextResponse.json({ cliente: data ?? null })
}
