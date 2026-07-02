import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Meta webhook verification
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

// Incoming messages from Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const value    = body?.entry?.[0]?.changes?.[0]?.value
    const messages = value?.messages

    // Status updates, delivery receipts — acknowledge and ignore
    if (!messages?.length) return NextResponse.json({ ok: true })

    const msg = messages[0]
    if (msg.type !== 'text') return NextResponse.json({ ok: true })

    const phoneNumberId: string = value?.metadata?.phone_number_id
    const from: string          = msg.from
    const text: string          = msg.text?.body

    if (!phoneNumberId || !from || !text) return NextResponse.json({ ok: true })

    // Look up which negocio owns this phone number
    const { data: neg } = await sb
      .from('negocios')
      .select('id, whatsapp_token')
      .eq('whatsapp_phone_id', phoneNumberId)
      .eq('whatsapp_activo', true)
      .maybeSingle()

    if (!neg?.whatsapp_token) return NextResponse.json({ ok: true })

    // Send the message to the Khepria AI chatbot
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.app'
    const chatRes  = await fetch(`${appUrl}/api/chat-negocio`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        messages:  [{ rol: 'usuario', texto: text }],
        negocioId: neg.id,
      }),
    })

    if (!chatRes.ok) return NextResponse.json({ ok: true })
    const { mensaje } = await chatRes.json() as { mensaje?: string }
    if (!mensaje) return NextResponse.json({ ok: true })

    // Strip internal booking markers before sending to WhatsApp
    const waText = mensaje
      .replace(/\[RESERVA:[^\]]+\]/g, '')
      .replace(/\[MOSTRAR_OPCIONES\]/g, '')
      .trim()

    if (!waText) return NextResponse.json({ ok: true })

    // Reply via WhatsApp Business API
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${neg.whatsapp_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:   from,
        type: 'text',
        text: { body: waText },
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[whatsapp/webhook]', e)
    return NextResponse.json({ ok: true }) // Always ACK to Meta
  }
}
