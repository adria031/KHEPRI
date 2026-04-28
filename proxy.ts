import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['es', 'ca', 'en']
const DEFAULT_LOCALE = 'es'

const PROTECTED = ['/dashboard', '/cliente', '/empleado', '/admin']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  // ── Session refresh via @supabase/ssr ─────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // ── Auth: protect private routes ─────────────────────────────────────────
  const isProtected = PROTECTED.some(r => pathname.startsWith(r))
  if (isProtected && !session) {
    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── i18n: detect locale from cookie or Accept-Language ───────────────────
  const cookieLocale = request.cookies.get('locale')?.value
  if (cookieLocale && LOCALES.includes(cookieLocale)) {
    return supabaseResponse
  }

  const acceptLang = request.headers.get('accept-language') ?? ''
  const lang = acceptLang.split(',')[0].split(';')[0].trim().toLowerCase().split('-')[0]
  const detected = LOCALES.includes(lang) ? lang : DEFAULT_LOCALE

  supabaseResponse.cookies.set('locale', detected, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icon-|sw\\.js|manifest\\.json|api/).*)',
  ],
}
