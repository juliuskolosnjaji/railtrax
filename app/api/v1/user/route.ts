/**
 * GET  /api/v1/user    — return authenticated user's profile
 * GET  /api/v1/user?export=1 — return full data export (JSON)
 */
import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const isExport = new URL(req.url).searchParams.get('export') === '1'

  if (isExport) {
    const [trips, preferences] = await Promise.all([
      prisma().trip.findMany({
        where: { userId: auth.userId },
        include: { legs: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma().userPreferences.findUnique({ where: { userId: auth.userId } }),
    ])
    return v1Ok({ userId: auth.userId, exportedAt: new Date().toISOString(), trips, preferences })
  }

  // Profile — combine Supabase metadata with DB prefs
  const [prefs, supabase] = await Promise.all([
    prisma().userPreferences.findUnique({ where: { userId: auth.userId } }),
    createClient(),
  ])
  const { data: { user } } = await supabase.auth.getUser()

  return v1Ok({
    id: auth.userId,
    email: user?.email,
    username: user?.user_metadata?.username,
    avatarUrl: user?.user_metadata?.avatar_url,
    preferences: prefs,
    createdAt: user?.created_at,
  })
}
