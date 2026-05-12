import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { prompt } = await req.json()
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  )
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return NextResponse.json({ text })
}
