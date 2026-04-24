import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['es', 'ca', 'en']
const DEFAULT_LOCALE = 'es'

/**
 * i18n middleware — detects locale from cookie or Accept-Language header.
 * Does NOT change URLs (preference stored in cookie + localStorage on client).
 * The actual translations are applied client-side via LocaleProvider.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // If locale cookie already set by client, respect it
  const cookieLocale = request.cookies.get('locale')?.value
  if (cookieLocale && LOCALES.includes(cookieLocale)) {
    return response
  }

  // Detect from Accept-Language header
  const acceptLang = request.headers.get('accept-language') ?? ''
  const primary = acceptLang.split(',')[0].split(';')[0].trim().toLowerCase()
  const lang = primary.split('-')[0]

  let detected = DEFAULT_LOCALE
  if (lang === 'ca') detected = 'ca'
  else if (lang === 'en') detected = 'en'
  else if (lang === 'es') detected = 'es'

  // Set cookie so subsequent server requests pick up the same locale
  response.cookies.set('locale', detected, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  return response
}

export const config = {
  matcher: [
    // Match all paths except static assets, api routes, and _next internals
    '/((?!_next/static|_next/image|favicon|icon-|sw\\.js|manifest\\.json|api/).*)',
  ],
}
