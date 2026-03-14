import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendToUser } from '@/lib/push'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    await sendToUser(user.id, {
      title: 'Test Notification',
      body: 'Push notifications are working!',
      url: '/dashboard',
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
