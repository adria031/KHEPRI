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
  const { op, table, id, data } = opts

  if (op === 'update' && id) {
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select('id').single()
    if (error) {
      console.error('[dbMutation] update error:', error.message, error.details, error.hint)
      return { error: error.message }
    }
    return { data: result }
  }

  if (op === 'insert') {
    const { data: result, error } = await supabase.from(table).insert(data).select().single()
    if (error) {
      console.error('[dbMutation] insert error:', error.message, error.details, error.hint)
      return { error: error.message }
    }
    return { data: result }
  }

  if (op === 'upsert') {
    const { data: result, error } = await supabase.from(table).upsert(data).select().single()
    if (error) {
      console.error('[dbMutation] upsert error:', error.message, error.details, error.hint)
      return { error: error.message }
    }
    return { data: result }
  }

  if (op === 'delete' && id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      console.error('[dbMutation] delete error:', error.message, error.details, error.hint)
      return { error: error.message }
    }
    return { data: null }
  }

  return { error: 'Operación no válida' }
}
