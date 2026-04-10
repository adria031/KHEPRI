import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/** Creates a Supabase client with an explicit Bearer token — bypasses cookie issues in production. */
export function createAuthClient(accessToken: string) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
}

/** Gets the current session and returns both the session and an auth-ready client. */
export async function getSessionClient(): Promise<{
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
  db: ReturnType<typeof createAuthClient> | typeof supabase
}> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { session: null, db: supabase }
  return { session, db: createAuthClient(session.access_token) }
}
