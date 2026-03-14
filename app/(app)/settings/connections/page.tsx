import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConnectionsClient } from './ConnectionsClient'

export default async function ConnectionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch from Prisma to get the latest DB state reliably
  // (Alternatively from Supabase directly, but Prisma is typed)
  const { data: userData } = await supabase
    .from('users')
    .select('traewelling_username')
    .eq('id', user.id)
    .single()

  return (
    <ConnectionsClient
      initialTraewellingUsername={userData?.traewelling_username ?? null}
    />
  )
}
