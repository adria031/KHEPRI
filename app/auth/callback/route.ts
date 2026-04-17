import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // Collect cookies set during session exchange, apply to response
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

  // Si viene con ?next (ej. recuperar contraseña), redirigir ahí directamente
  if (next && !error) {
    const response = NextResponse.redirect(`${origin}${next}`)
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    )
    return response
  }

  let redirectTo = `${origin}/onboarding`

  if (!error) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Check if user already has a negocio → go to dashboard
      // Otherwise → go to onboarding to complete setup
      const { data: neg } = await supabase
        .from('negocios')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (neg) redirectTo = `${origin}/dashboard`
    }
  }

  const response = NextResponse.redirect(redirectTo)
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  )
  return response
}
