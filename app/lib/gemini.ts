/**
 * Gemini API helper con fallback automático de modelos.
 * Si un modelo devuelve error de cuota (429 / RESOURCE_EXHAUSTED),
 * prueba el siguiente hasta agotar la lista.
 */

// Modelos ordenados de más disponible a menos — se prueban en cascada
const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

/**
 * Devuelve true cuando el error es recuperable probando el siguiente modelo:
 *  - 429 quota / rate-limit
 *  - 404 modelo no encontrado o no disponible con esta clave
 *  - 503 servicio no disponible
 */
function shouldRetry(status: number, body: unknown): boolean {
  if (status === 429 || status === 404 || status === 503) return true
  const str = JSON.stringify(body).toLowerCase()
  return (
    str.includes('quota') ||
    str.includes('resource_exhausted') ||
    str.includes('limit:') ||
    str.includes('exceeded') ||
    str.includes('not found') ||
    str.includes('not supported') ||
    str.includes('not available')
  )
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

    if (shouldRetry(res.status, data)) {
      console.warn(`[gemini] ${model} → ${res.status}, probando siguiente modelo…`)
      continue
    }

    // Error no recuperable (ej. 400 bad request, 401 auth) — devolver tal cual
    console.error(`[gemini] ${model} error no recuperable ${res.status}:`, JSON.stringify(data).slice(0, 200))
    return { ok: false, data, model, triedModels: tried }
  }

  return {
    ok: false,
    data: { error: { message: `Cuota agotada en todos los modelos disponibles (${tried.join(', ')}). Revisa tu plan en https://ai.dev/rate-limit` } },
    model: '',
    triedModels: tried,
  }
}
