import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/** Gets the current session. Uses the singleton which already has auth from cookies. */
export async function getSessionClient() {
  const { data: { session } } = await supabase.auth.getSession()
  return { session, db: supabase }
}
