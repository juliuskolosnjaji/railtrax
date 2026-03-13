import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Only import in server-side code (API routes, Edge Functions).
// NEVER import this in any file that could end up in the browser bundle.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
