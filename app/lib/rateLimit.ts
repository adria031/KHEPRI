// In-memory rate limiter (resets on cold start; sufficient for single-instance / edge use)
// For multi-instance production, swap the Map for a Redis store.

const store = new Map<string, { count: number; reset: number }>()

export function getIP(req: Request): string {
  const fwd = (req.headers as Headers).get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'unknown'
}

/**
 * Returns { ok: true } if the IP is within limits, { ok: false } with 429 response if exceeded.
 * @param ip  Client IP address
 * @param limit  Max requests per window (default 10)
 * @param windowMs  Window in milliseconds (default 60 000 = 1 min)
 */
export function rateLimit(
  ip: string,
  limit = 10,
  windowMs = 60_000,
): { ok: true } | { ok: false; response: Response } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.reset) {
    store.set(ip, { count: 1, reset: now + windowMs })
    return { ok: true }
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Demasiadas peticiones. Inténtalo en un minuto.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
      ),
    }
  }

  entry.count++
  return { ok: true }
}
