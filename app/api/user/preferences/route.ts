import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const preferencesSchema = {
  parse: (body: unknown) => {
    const obj = body as {
      notificationsEnabled?: boolean
      delayAlerts?: boolean
      platformChanges?: boolean
      cancellations?: boolean
    }
    return { success: true as const, data: obj }
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    let prefs = await prisma().userPreferences.findUnique({
      where: { userId: user.id },
    })

    if (!prefs) {
      prefs = await prisma().userPreferences.create({
        data: { userId: user.id },
      })
    }

    return NextResponse.json({
      notificationsEnabled: prefs.notificationsEnabled,
      delayAlerts: prefs.delayAlerts,
      platformChanges: prefs.platformChanges,
      cancellations: prefs.cancellations,
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = preferencesSchema.parse(body)

  try {
    const prefs = await prisma().userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        notificationsEnabled: parsed.data.notificationsEnabled ?? false,
        delayAlerts: parsed.data.delayAlerts ?? true,
        platformChanges: parsed.data.platformChanges ?? true,
        cancellations: parsed.data.cancellations ?? true,
      },
      update: {
        notificationsEnabled: parsed.data.notificationsEnabled,
        delayAlerts: parsed.data.delayAlerts,
        platformChanges: parsed.data.platformChanges,
        cancellations: parsed.data.cancellations,
      },
    })

    return NextResponse.json({
      notificationsEnabled: prefs.notificationsEnabled,
      delayAlerts: prefs.delayAlerts,
      platformChanges: prefs.platformChanges,
      cancellations: prefs.cancellations,
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
