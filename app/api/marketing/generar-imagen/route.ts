import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIP } from '../../../lib/rateLimit'
import { geminiGenerate } from '../../../lib/gemini'
import { registrarErrorIA } from '../../../lib/ia-errores'

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), 10)
  if (!rl.ok) return rl.response

  const { prompt, negocioId } = await req.json()
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    await registrarErrorIA({ endpoint: 'marketing/generar-imagen', error: new Error('API key no configurada'), negocioId })
    return NextResponse.json({ error: 'No se pudo generar la imagen. Inténtalo de nuevo.' }, { status: 500 })
  }

  const { ok, data, triedModels } = await geminiGenerate(
    { contents: [{ parts: [{ text: prompt }] }] },
    apiKey
  )

  if (!ok) {
    console.error('[generar-imagen] All models failed. Tried:', triedModels)
    await registrarErrorIA({ endpoint: 'marketing/generar-imagen', error: data, negocioId })
    return NextResponse.json({ error: 'No se pudo generar la imagen. Inténtalo de nuevo.' }, { status: 503 })
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
