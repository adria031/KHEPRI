import { NextRequest, NextResponse } from 'next/server'

const GEMINI_KEY = 'AIzaSyBwszdn-eYK3UQN2SBmJNzhdPkgOgkilns'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  // Fetch the page HTML
  let html = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })
    html = await res.text()
    // Truncate to avoid huge prompts (keep first 40k chars)
    html = html.slice(0, 40000)
    // Strip scripts/styles to reduce noise
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '')
    html = html.replace(/<[^>]+>/g, ' ')
    html = html.replace(/\s{3,}/g, '  ')
  } catch (e: unknown) {
    return NextResponse.json({ error: `No se pudo acceder a la URL: ${(e as Error).message}` }, { status: 422 })
  }

  const prompt = `Eres un extractor de datos de negocios. Analiza el siguiente texto de una página web (Fresha, Treatwell, Booksy, Google Maps, Instagram u otra) y extrae los datos del negocio en JSON.

Devuelve SOLO un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "nombre": "nombre del negocio o null",
  "descripcion": "descripción del negocio en español o null",
  "telefono": "teléfono con código de país o null",
  "direccion": "calle y número o null",
  "ciudad": "ciudad o null",
  "codigo_postal": "código postal o null",
  "instagram": "usuario de instagram sin @ o null",
  "whatsapp": "número de whatsapp con código de país o null",
  "facebook": "usuario o url de facebook o null",
  "servicios": ["lista de servicios con precio si disponible, máx 10"]
}

Texto de la página:
${html.slice(0, 15000)}`

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!geminiRes.ok) {
    const errText = await geminiRes.text()
    return NextResponse.json({ error: `Error de Gemini: ${errText}` }, { status: 500 })
  }

  const geminiData = await geminiRes.json()
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta')
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'No se pudieron extraer los datos. Prueba con otra URL.' }, { status: 422 })
  }
}
