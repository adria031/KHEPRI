import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('URL requerida', { status: 400 })

  // Only allow http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return new NextResponse('URL inválida', { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/avif,image/apng,image/*,*/*;q=0.8',
        Referer: new URL(url).origin,
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      return new NextResponse('No se pudo obtener la imagen', { status: 502 })
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return new NextResponse('El recurso no es una imagen', { status: 422 })
    }

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e: unknown) {
    return new NextResponse(`Error: ${(e as Error).message}`, { status: 502 })
  }
}
