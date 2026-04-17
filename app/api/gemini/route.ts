import { NextRequest, NextResponse } from 'next/server'

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!

// Proxy server-side para Gemini — la key nunca llega al navegador
export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_KEY,
      },
      body: JSON.stringify(body),
    }
  )

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
