import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(c => pendingCookies.push(c as typeof pendingCookies[0]))
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  function makeResponse(destination: URL | string) {
    const response = NextResponse.redirect(destination)
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    )
    return response
  }

  // Password reset / magic link — honour ?next param
  if (next && !error) {
    return makeResponse(`${origin}${next}`)
  }

  if (error) {
    return makeResponse(new URL('/onboarding', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return makeResponse(new URL('/onboarding', request.url))
  }

  const ADMIN_EMAILS = ['adria.gaitan.sola@gmail.com']
  if (ADMIN_EMAILS.includes(user.email ?? '')) {
    return makeResponse(new URL('/admin', request.url))
  }

  const rol         = searchParams.get('rol')
  const negocioParam = searchParams.get('negocio')

  // Employee invitation — rol=empleado in URL params
  if (rol === 'empleado' && negocioParam) {
    const nombre = user.user_metadata?.nombre as string | undefined
    await supabase.from('profiles').upsert(
      { id: user.id, tipo: 'empleado', email: user.email, ...(nombre ? { nombre } : {}) },
      { onConflict: 'id' }
    )
    return makeResponse(new URL('/empleado', request.url))
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (perfil?.tipo === 'empleado') return makeResponse(new URL('/empleado', request.url))
  if (perfil?.tipo === 'negocio')  return makeResponse(new URL('/dashboard', request.url))
  if (perfil?.tipo === 'cliente')  return makeResponse(new URL('/cliente', request.url))
  return makeResponse(new URL('/onboarding', request.url))
}
