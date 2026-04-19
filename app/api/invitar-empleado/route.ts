import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email, nombreEmpleado, nombreNegocio, negocioId } = await req.json()
    if (!email || !nombreEmpleado || !nombreNegocio || !negocioId) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?negocio=${negocioId}&rol=empleado`

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        nombre: nombreEmpleado,
        negocio_id: negocioId,
        rol: 'empleado',
      },
    })

    if (error) {
      console.error('[invitar-empleado] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[invitar-empleado] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
