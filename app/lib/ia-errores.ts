import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function registrarErrorIA(params: {
  endpoint: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any
  negocioId?: string
  userId?: string
}) {
  try {
    await supabaseAdmin.from('ia_errores').insert({
      endpoint:       params.endpoint,
      error_mensaje:  params.error?.message || String(params.error),
      error_completo: params.error,
      negocio_id:     params.negocioId || null,
      user_id:        params.userId    || null,
    })
  } catch (e) {
    console.error('[ia-errores] Error registrando error IA:', e)
  }
}
