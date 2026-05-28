import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { negocioId, to, text } = await req.json()

    if (!negocioId || !to || !text) {
      return NextResponse.json({ error: 'Faltan parámetros: negocioId, to, text' }, { status: 400 })
    }

    const { data: neg } = await sb
      .from('negocios')
      .select('whatsapp_token, whatsapp_phone_id, whatsapp_activo')
      .eq('id', negocioId)
      .maybeSingle()

    if (!neg?.whatsapp_activo || !neg.whatsapp_token || !neg.whatsapp_phone_id) {
      return NextResponse.json({ error: 'WhatsApp no configurado o inactivo' }, { status: 400 })
    }

    const res = await fetch(`https://graph.facebook.com/v18.0/${neg.whatsapp_phone_id}/messages`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${neg.whatsapp_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: 502 })
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    console.error('[whatsapp/send]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
