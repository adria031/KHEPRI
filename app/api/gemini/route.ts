import { NextRequest, NextResponse } from 'next/server'

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!

// Keys AQ. (nuevo AI Studio) → Bearer + v1
// Keys AIzaSy (clásica)      → ?key= + v1beta
function buildRequest(body: unknown) {
  const isOAuth = GEMINI_KEY?.startsWith('AQ.')
  const version = isOAuth ? 'v1' : 'v1beta'
  const model   = 'gemini-1.5-flash'
  const url = isOAuth
    ? `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`
    : `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_KEY}`
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (isOAuth) headers['Authorization'] = `Bearer ${GEMINI_KEY}`
  else         headers['x-goog-api-key'] = GEMINI_KEY
  return { url, headers, body: JSON.stringify(body) }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { url, headers, body: bodyStr } = buildRequest(body)
  const res = await fetch(url, { method: 'POST', headers, body: bodyStr })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
