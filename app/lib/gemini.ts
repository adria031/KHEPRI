/**
 * Gemini API helper con fallback automático de modelos.
 * Si un modelo devuelve error de cuota (429 / RESOURCE_EXHAUSTED),
 * prueba el siguiente hasta agotar la lista.
 */

const FALLBACK_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
]

function isQuotaError(status: number, body: unknown): boolean {
  if (status === 429) return true
  const str = JSON.stringify(body).toLowerCase()
  return str.includes('quota') || str.includes('resource_exhausted') || str.includes('limit:') || str.includes('exceeded')
}

export async function geminiGenerate(
  requestBody: object,
  apiKey: string
): Promise<{ ok: boolean; data: unknown; model: string; triedModels: string[] }> {
  const tried: string[] = []

  for (const model of FALLBACK_MODELS) {
    tried.push(model)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    let res: Response
    let data: unknown
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      data = await res.json()
    } catch (e) {
      console.warn(`[gemini] ${model} network error:`, e)
      continue
    }

    if (res.ok) {
      if (tried.length > 1) {
        console.info(`[gemini] Using fallback model: ${model} (tried: ${tried.slice(0, -1).join(', ')})`)
      }
      return { ok: true, data, model, triedModels: tried }
    }

    if (isQuotaError(res.status, data)) {
      console.warn(`[gemini] ${model} quota exceeded (${res.status}), trying next model…`)
      continue
    }

    // Error no relacionado con cuota — devolver tal cual
    console.error(`[gemini] ${model} non-quota error ${res.status}:`, JSON.stringify(data).slice(0, 200))
    return { ok: false, data, model, triedModels: tried }
  }

  return {
    ok: false,
    data: { error: { message: `Cuota agotada en todos los modelos disponibles (${tried.join(', ')}). Revisa tu plan en https://ai.dev/rate-limit` } },
    model: '',
    triedModels: tried,
  }
}
