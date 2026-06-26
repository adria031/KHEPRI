import { NextResponse } from 'next/server'
import { rateLimit, getIP } from '../../lib/rateLimit'
import { geminiGenerate } from '../../lib/gemini'
import { registrarErrorIA } from '../../lib/ia-errores'

export async function POST(req: Request) {
  const rl = rateLimit(getIP(req), 20)
  if (!rl.ok) return rl.response

  const { prompt } = await req.json()
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    await registrarErrorIA({ endpoint: 'api/ai', error: new Error('API key no configurada') })
    return NextResponse.json({ error: 'El servicio de IA no está disponible ahora mismo.' }, { status: 500 })
  }

  const { ok, data, model, triedModels } = await geminiGenerate(
    { contents: [{ parts: [{ text: prompt }] }] },
    apiKey
  )

  if (!ok) {
    console.error('[api/ai] All models failed. Tried:', triedModels)
    await registrarErrorIA({ endpoint: 'api/ai', error: data })
    return NextResponse.json({ error: 'El servicio de IA no está disponible ahora mismo. Inténtalo en unos segundos.' }, { status: 503 })
  }

  if (triedModels.length > 1) {
    console.info(`[api/ai] Fallback model used: ${model} (tried: ${triedModels.slice(0,-1).join(', ')})`)
  }

  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return NextResponse.json({ text })
}
