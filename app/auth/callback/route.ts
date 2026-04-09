import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code  = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Exchange code server-side using @supabase/ssr (reads/writes cookies for session persistence)
  const response = NextResponse.redirect(new URL('/onboarding', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data.session) {
    // Exchange failed (e.g. PKCE verifier mismatch) — send to onboarding anyway
    console.error('[auth/callback] exchangeCodeForSession:', exchangeError)
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Check if user already has a profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('tipo')
    .eq('id', data.session.user.id)
    .single()

  if (profile?.tipo === 'negocio') {
    response.headers.set('Location', new URL('/dashboard', request.url).toString())
    return response
  }
  if (profile?.tipo === 'cliente') {
    response.headers.set('Location', new URL('/cliente', request.url).toString())
    return response
  }

  // No profile yet → onboarding (response already points there)
  return response
}
