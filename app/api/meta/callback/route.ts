import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const META_API = 'https://graph.facebook.com/v18.0'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')   // "{negocioId}|instagram" or "|whatsapp"
  const errorParam = searchParams.get('error')

  const back = `${origin}/dashboard/integraciones`

  if (errorParam || !code || !state) {
    return NextResponse.redirect(`${back}?meta_error=cancelled`)
  }

  const parts     = state.split('|')
  const negocioId = parts[0]
  const tipo      = parts[1]  // 'instagram' | 'whatsapp'

  if (!negocioId || !tipo) {
    return NextResponse.redirect(`${back}?meta_error=invalid_state`)
  }

  const appId      = process.env.NEXT_PUBLIC_META_APP_ID
  const appSecret  = process.env.META_APP_SECRET
  const redirectUri = `${origin}/api/meta/callback`

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${back}?meta_error=missing_env`)
  }

  // 1. Exchange code → short-lived access token
  const tokenRes = await fetch(
    `${META_API}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
  ).catch(() => null)

  if (!tokenRes?.ok) {
    return NextResponse.redirect(`${back}?meta_error=token_failed`)
  }

  const tokenData: { access_token?: string; error?: unknown } = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${back}?meta_error=token_failed`)
  }

  const shortToken = tokenData.access_token

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Instagram ─────────────────────────────────────────────────────────────
  if (tipo === 'instagram') {
    // 2. Exchange short-lived → long-lived token (60 days)
    const llRes = await fetch(
      `${META_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    ).catch(() => null)

    const llData = llRes?.ok ? await llRes.json() : {}
    const longToken: string = llData.access_token || shortToken

    // 3. Get Facebook pages to find linked Instagram Business Account
    let igUserId   = ''
    let igUsername = ''

    const pagesRes = await fetch(`${META_API}/me/accounts?access_token=${longToken}`).catch(() => null)
    const pagesData = pagesRes?.ok ? await pagesRes.json() : {}
    const firstPage = pagesData?.data?.[0]

    if (firstPage?.id) {
      const igLinkRes = await fetch(
        `${META_API}/${firstPage.id}?fields=instagram_business_account&access_token=${firstPage.access_token}`
      ).catch(() => null)
      const igLink = igLinkRes?.ok ? await igLinkRes.json() : {}
      igUserId = igLink?.instagram_business_account?.id ?? ''

      if (igUserId) {
        const igInfoRes = await fetch(
          `${META_API}/${igUserId}?fields=username,name&access_token=${firstPage.access_token}`
        ).catch(() => null)
        const igInfo = igInfoRes?.ok ? await igInfoRes.json() : {}
        igUsername = igInfo?.username || igInfo?.name || ''
      }
    }

    // Fallback: get user name from token owner
    if (!igUsername) {
      const meRes = await fetch(`${META_API}/me?fields=name&access_token=${longToken}`).catch(() => null)
      const me = meRes?.ok ? await meRes.json() : {}
      igUsername = me?.name ?? ''
    }

    await supabase.from('negocios').update({
      instagram_token:    longToken,
      instagram_user_id:  igUserId || null,
      instagram_username: igUsername || null,
      instagram_activo:   true,
    }).eq('id', negocioId)

    return NextResponse.redirect(`${back}?meta_ok=instagram`)
  }

  // ── WhatsApp Business ─────────────────────────────────────────────────────
  if (tipo === 'whatsapp') {
    // Get WhatsApp Business Account and phone numbers
    let phoneId   = ''
    let phoneNum  = ''

    const waRes = await fetch(`${META_API}/me/phone_numbers?access_token=${shortToken}`).catch(() => null)
    const waData = waRes?.ok ? await waRes.json() : {}
    const firstPhone = waData?.data?.[0]
    if (firstPhone) {
      phoneId  = firstPhone.id ?? ''
      phoneNum = firstPhone.display_phone_number ?? ''
    }

    await supabase.from('negocios').update({
      whatsapp_token:    shortToken,
      whatsapp_phone_id: phoneId || null,
      whatsapp_activo:   true,
    }).eq('id', negocioId)

    const extra = phoneNum ? `&wa_phone=${encodeURIComponent(phoneNum)}` : ''
    return NextResponse.redirect(`${back}?meta_ok=whatsapp${extra}`)
  }

  return NextResponse.redirect(`${back}?meta_error=unknown_type`)
}
