import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NotificationsClient } from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let preferences = await prisma().userPreferences.findUnique({
    where: { userId: user.id },
  })

  if (!preferences) {
    preferences = await prisma().userPreferences.create({
      data: { userId: user.id },
    })
  }

  return (
    <NotificationsClient
      initialPreferences={{
        notificationsEnabled: preferences.notificationsEnabled,
        delayAlerts: preferences.delayAlerts,
        platformChanges: preferences.platformChanges,
        cancellations: preferences.cancellations,
      }}
    />
  )
}
