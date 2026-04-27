import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '../../lib/gemini'

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  let rawHtml = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(14000),
    })
    rawHtml = await res.text()
  } catch (e: unknown) {
    return NextResponse.json({ error: `No se pudo acceder a la URL: ${(e as Error).message}` }, { status: 422 })
  }

  // ── 1. Extraer JSON-LD ANTES de limpiar el HTML ───────────────────────────
  let jsonLdContext = ''
  const jsonLdMatches = rawHtml.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
  for (const block of jsonLdMatches) {
    const content = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
    try {
      JSON.parse(content) // validate
      jsonLdContext = content
      break
    } catch { /* skip invalid */ }
  }

  // ── 2. Extraer secciones relevantes del HTML ──────────────────────────────
  // Buscar sección de servicios
  const servicesSectionMatch = rawHtml.match(/services-section[\s\S]{0,6000}/)
  const servicesHtml = servicesSectionMatch
    ? servicesSectionMatch[0].replace(/<[^>]+>/g, ' ').replace(/\s{3,}/g, '  ').slice(0, 3000)
    : ''

  // Buscar staff/equipo
  const staffMatch = rawHtml.match(/(?:staff|team|equipo|empleado|barbero|stylist)[\s\S]{0,3000}/i)
  const staffHtml = staffMatch
    ? staffMatch[0].replace(/<[^>]+>/g, ' ').replace(/\s{3,}/g, '  ').slice(0, 1500)
    : ''

  // Texto general limpio (sin scripts, sin estilos)
  let generalText = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '  ')
    .slice(0, 10000)

  const prompt = `Eres un extractor experto de datos de negocios. Analiza la información de una página web (puede ser Fresha, Treatwell, Booksy, Google Maps, Instagram, web propia u otra).

${jsonLdContext ? `## DATOS ESTRUCTURADOS (JSON-LD) — mayor fiabilidad:\n${jsonLdContext.slice(0, 4000)}\n` : ''}

${servicesHtml ? `## SECCIÓN DE SERVICIOS (HTML):\n${servicesHtml}\n` : ''}

${staffHtml ? `## SECCIÓN DE PERSONAL:\n${staffHtml}\n` : ''}

## TEXTO GENERAL DE LA PÁGINA:
${generalText}

---
Devuelve SOLO un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "nombre": "nombre del negocio o null",
  "descripcion": "descripción en español, máx 300 caracteres o null",
  "telefono": "teléfono con código de país ej +34612345678 o null",
  "direccion": "calle y número o null",
  "ciudad": "ciudad o null",
  "codigo_postal": "código postal o null",
  "instagram": "usuario sin @ o null",
  "whatsapp": "número con código de país o null",
  "facebook": "usuario o URL o null",
  "servicios": [
    { "nombre": "nombre del servicio", "precio": 25.00, "duracion": 60 }
  ],
  "horarios": [
    { "dia": "lunes", "abierto": true, "hora_apertura": "09:00", "hora_cierre": "19:00" }
  ],
  "trabajadores": [
    { "nombre": "Nombre Apellido", "especialidad": "Barbero" }
  ]
}

Reglas:
- servicios: extrae TODOS los servicios con precio y duración. precio en número (€). duracion en minutos. Si no hay precio pon null. Si no hay duración pon 30. Máx 25 servicios.
- horarios: día exactamente en: lunes, martes, miercoles, jueves, viernes, sabado, domingo. Si en JSON-LD openingHours ves "mi"=miercoles, "ju"=jueves, "vi"=viernes, "sá"=sabado, "lu"=lunes, "ma"=martes, "do"=domingo. Incluye solo días que aparezcan. Si un día está cerrado: abierto:false, hora_apertura:"00:00", hora_cierre:"00:00".
- trabajadores: extrae nombres de barberos, estilistas, empleados si aparecen. especialidad según su rol. Si no hay trabajadores pon [].
- Si no encuentras un campo pon null para strings o [] para arrays.`

  const { ok, data: geminiData, model, triedModels } = await geminiGenerate(
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    },
    GEMINI_KEY
  )

  if (!ok) {
    console.error('[importar-negocio] Gemini falló:', triedModels)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (geminiData as any)?.error?.message ?? 'Cuota de Gemini agotada'
    return NextResponse.json({ error: msg }, { status: 429 })
  }
  if (triedModels.length > 1) console.info(`[importar-negocio] Fallback model: ${model}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text: string = (geminiData as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta')
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json({ data, model })
  } catch {
    return NextResponse.json({ error: 'No se pudieron extraer los datos. Prueba con otra URL.' }, { status: 422 })
  }
}
