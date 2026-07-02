import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const entry = body?.entry?.[0]

    if (entry?.messaging?.length) return handleInstagram(entry)
    if (entry?.changes?.length)   return handleWhatsApp(entry)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[webhook/meta]', e)
    return NextResponse.json({ ok: true })
  }
}

async function callChat(negocioId: string, text: string): Promise<string | null> {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'
  const chatRes = await fetch(`${appUrl}/api/chat-negocio`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages: [{ rol: 'usuario', texto: text }], negocioId }),
  })
  if (!chatRes.ok) return null
  const { mensaje } = await chatRes.json() as { mensaje?: string }
  if (!mensaje) return null
  return mensaje.replace(/\[RESERVA:.*?\]/gs, '').replace(/\[MOSTRAR_OPCIONES\]/g, '').trim() || null
}

async function handleInstagram(entry: Record<string, unknown>) {
  const messaging = (entry.messaging as Array<Record<string, unknown>>)[0]
  const senderId  = (messaging?.sender as Record<string, string>)?.id
  const text      = (messaging?.message as Record<string, string>)?.text

  if (!senderId || !text) return NextResponse.json({ ok: true })

  // ponytail: entry.id = FB Page ID → stored in instagram_page_id after OAuth
  const { data: neg } = await sb
    .from('negocios')
    .select('id, instagram_token, instagram_user_id')
    .eq('instagram_page_id', entry.id as string)
    .eq('instagram_activo', true)
    .maybeSingle()

  if (!neg?.instagram_token) return NextResponse.json({ ok: true })

  const reply = await callChat(neg.id, text)
  if (!reply) return NextResponse.json({ ok: true })

  // instagram_user_id is the IG Business Account ID used to send messages
  const igId = neg.instagram_user_id ?? (messaging?.recipient as Record<string, string>)?.id
  await fetch(`https://graph.facebook.com/v25.0/${igId}/messages`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${neg.instagram_token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ recipient: { id: senderId }, message: { text: reply } }),
  })

  return NextResponse.json({ ok: true })
}

async function handleWhatsApp(entry: Record<string, unknown>) {
  const value    = (entry.changes as Array<Record<string, unknown>>)[0]?.value as Record<string, unknown>
  const messages = value?.messages as Array<Record<string, unknown>>

  if (!messages?.length) return NextResponse.json({ ok: true })

  const msg = messages[0]
  if (msg.type !== 'text') return NextResponse.json({ ok: true })

  const phoneNumberId = (value?.metadata as Record<string, string>)?.phone_number_id
  const from          = msg.from as string
  const text          = (msg.text as Record<string, string>)?.body

  if (!phoneNumberId || !from || !text) return NextResponse.json({ ok: true })

  const { data: neg } = await sb
    .from('negocios')
    .select('id, whatsapp_token')
    .eq('whatsapp_phone_id', phoneNumberId)
    .eq('whatsapp_activo', true)
    .maybeSingle()

  if (!neg?.whatsapp_token) return NextResponse.json({ ok: true })

  const reply = await callChat(neg.id, text)
  if (!reply) return NextResponse.json({ ok: true })

  await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${neg.whatsapp_token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messaging_product: 'whatsapp', to: from, type: 'text', text: { body: reply } }),
  })

  return NextResponse.json({ ok: true })
}
