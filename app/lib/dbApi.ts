'use client'
import { supabase } from './supabase'

type DbOp = 'update' | 'insert' | 'delete' | 'upsert'

export async function dbMutation(opts: {
  op: DbOp
  table: string
  id?: string
  negocioId?: string
  data?: Record<string, unknown>
}): Promise<{ data?: unknown; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Sesión expirada. Recarga la página.' }

  const res = await fetch('/api/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-supabase-token': session.access_token,
    },
    body: JSON.stringify(opts),
  })

  const json = await res.json()
  if (!res.ok || json.error) return { error: json.error || 'Error desconocido' }
  return { data: json.data }
}
