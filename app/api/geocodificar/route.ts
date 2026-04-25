import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

async function geocode(direccion: string, ciudad: string): Promise<{ lat: number; lng: number } | null> {
  const query = [direccion, ciudad, 'España'].filter(Boolean).join(', ')
  if (!query.trim()) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TOKEN}&country=es&limit=1&language=es`
    )
    const data = await res.json()
    const center = data?.features?.[0]?.center
    if (!center) return null
    return { lng: center[0], lat: center[1] }
  } catch {
    return null
  }
}

// GET /api/geocodificar — geocodifica todos los negocios sin lat/lng
export async function GET() {
  if (!TOKEN) return NextResponse.json({ error: 'NEXT_PUBLIC_MAPBOX_TOKEN no configurado' }, { status: 500 })

  const { data: negocios, error } = await supabase
    .from('negocios')
    .select('id, nombre, direccion, ciudad')
    .or('lat.is.null,lng.is.null')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!negocios?.length) return NextResponse.json({ message: 'Todos los negocios ya tienen coordenadas', updated: 0 })

  const results: { id: string; nombre: string; ok: boolean; lat?: number; lng?: number }[] = []

  for (const neg of negocios) {
    if (!neg.direccion && !neg.ciudad) {
      results.push({ id: neg.id, nombre: neg.nombre, ok: false })
      continue
    }
    const coords = await geocode(neg.direccion || '', neg.ciudad || '')
    if (!coords) {
      results.push({ id: neg.id, nombre: neg.nombre, ok: false })
      continue
    }
    await supabase.from('negocios').update({ lat: coords.lat, lng: coords.lng }).eq('id', neg.id)
    results.push({ id: neg.id, nombre: neg.nombre, ok: true, ...coords })
    // Pausa mínima para no saturar la API de Mapbox
    await new Promise(r => setTimeout(r, 100))
  }

  const updated = results.filter(r => r.ok).length
  return NextResponse.json({ updated, total: negocios.length, results })
}
