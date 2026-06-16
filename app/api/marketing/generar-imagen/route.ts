import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIP } from '../../../lib/rateLimit'
import { geminiGenerate } from '../../../lib/gemini'

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), 10)
  if (!rl.ok) return rl.response

  const { prompt } = await req.json()
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

  const { ok, data, triedModels } = await geminiGenerate(
    { contents: [{ parts: [{ text: prompt }] }] },
    apiKey
  )

  if (!ok) {
    console.error('[generar-imagen] All models failed. Tried:', triedModels)
    const msg = (data as { error?: { message?: string } })?.error?.message ?? 'Error de IA'
    return NextResponse.json({ error: msg }, { status: 503 })
  }

  const d = data as { candidates?: { content?: { parts?: { text?: string; inlineData?: { data?: string; mimeType?: string } }[] } }[] }
  const parts = d.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(p => p.inlineData?.data)
  const textPart  = parts.find(p => p.text)

  // If no image part, return text content (model returned text only)
  if (!imagePart) {
    const text = textPart?.text ?? ''
    return NextResponse.json({ text, descripcion: text.slice(0, 400), hashtags: [] })
  }

  const mimeType = imagePart.inlineData!.mimeType || 'image/png'
  const imagen = `data:${mimeType};base64,${imagePart.inlineData!.data}`

  let descripcion = ''
  let hashtags: string[] = []
  if (textPart?.text) {
    try {
      const clean = textPart.text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(clean)
      descripcion = parsed.descripcion || ''
      hashtags    = parsed.hashtags || []
    } catch {
      descripcion = textPart.text.slice(0, 400)
    }
  }

  return NextResponse.json({ imagen, descripcion, hashtags })
}
