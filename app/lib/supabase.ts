import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/** Gets the current session and ensures it's active on the client before making queries. */
export async function getSessionClient() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    // Ensure the singleton has this session set for RLS-authenticated queries
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  }
  return { session, db: supabase }
}
