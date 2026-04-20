import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '../../lib/gemini'

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  let html = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })
    html = await res.text()
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '')
    html = html.replace(/<[^>]+>/g, ' ')
    html = html.replace(/\s{3,}/g, '  ')
    html = html.slice(0, 18000)
  } catch (e: unknown) {
    return NextResponse.json({ error: `No se pudo acceder a la URL: ${(e as Error).message}` }, { status: 422 })
  }

  const prompt = `Eres un extractor de datos de negocios. Analiza el siguiente texto de una página web (puede ser Fresha, Treatwell, Booksy, Google Maps, Instagram, web propia u otra) y extrae los datos en JSON.

Devuelve SOLO un JSON válido (sin markdown, sin bloques de código, sin explicaciones) con esta estructura exacta:
{
  "nombre": "nombre del negocio o null",
  "descripcion": "descripción del negocio en español, máx 300 caracteres o null",
  "telefono": "teléfono con código de país o null",
  "direccion": "calle y número o null",
  "ciudad": "ciudad o null",
  "codigo_postal": "código postal o null",
  "instagram": "usuario de instagram sin @ o null",
  "whatsapp": "número de whatsapp con código de país o null",
  "facebook": "usuario o url de facebook o null",
  "servicios": [
    { "nombre": "nombre del servicio", "precio": 25.00, "duracion": 60 }
  ],
  "horarios": [
    { "dia": "lunes", "abierto": true, "hora_apertura": "09:00", "hora_cierre": "19:00" }
  ]
}

Reglas:
- servicios: máx 15. precio en número (€), duracion en minutos (número). Si no hay precio pon null. Si no hay duración pon 30.
- horarios: usa exactamente estos valores para dia: lunes, martes, miercoles, jueves, viernes, sabado, domingo. hora_apertura y hora_cierre en formato "HH:MM". Si un día está cerrado pon abierto:false y hora_apertura:"00:00", hora_cierre:"00:00". Solo incluye los días que encuentres.
- Si no encuentras un campo, pon null para strings o [] para arrays.

Texto de la página:
${html}`

  const { ok, data: geminiData, model, triedModels } = await geminiGenerate(
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    },
    GEMINI_KEY
  )

  if (!ok) {
    console.error('[importar-negocio] Gemini falló en todos los modelos:', triedModels)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (geminiData as any)?.error?.message ?? 'Cuota de Gemini agotada'
    return NextResponse.json({ error: msg }, { status: 429 })
  }
  if (triedModels.length > 1) console.info(`[importar-negocio] Usando modelo fallback: ${model}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text: string = (geminiData as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta')
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'No se pudieron extraer los datos. Prueba con otra URL.' }, { status: 422 })
  }
}
