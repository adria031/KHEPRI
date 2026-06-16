import { NextResponse } from 'next/server'
import { rateLimit, getIP } from '../../lib/rateLimit'
import { geminiGenerate } from '../../lib/gemini'

export async function POST(req: Request) {
  const rl = rateLimit(getIP(req), 20)
  if (!rl.ok) return rl.response

  const { prompt } = await req.json()
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const { ok, data, model, triedModels } = await geminiGenerate(
    { contents: [{ parts: [{ text: prompt }] }] },
    apiKey
  )

  if (!ok) {
    console.error('[api/ai] All models failed. Tried:', triedModels)
    const msg = (data as { error?: { message?: string } })?.error?.message ?? 'Error de IA'
    return NextResponse.json({ error: msg }, { status: 503 })
  }

  if (triedModels.length > 1) {
    console.info(`[api/ai] Fallback model used: ${model} (tried: ${triedModels.slice(0,-1).join(', ')})`)
  }

  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return NextResponse.json({ text })
}
