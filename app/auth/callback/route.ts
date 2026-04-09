import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code  = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error)}`, request.url))
  }

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tipo')
        .eq('id', session.user.id)
        .single()

      if (profile?.tipo === 'negocio') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else if (profile?.tipo === 'cliente') {
        return NextResponse.redirect(new URL('/cliente', request.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/onboarding', request.url))
}
