import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  legIds: z.array(z.string()).min(1),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 422 })
  }

  // Verify the trip belongs to this user
  const trip = await prisma().trip.findUnique({ where: { id, userId: user.id } })
  if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  try {
    await prisma().$transaction(
      parsed.data.legIds.map((legId, index) =>
        prisma().leg.update({
          where: { id: legId, tripId: id },
          data: { position: index },
        })
      )
    )
    return NextResponse.json({ data: { ok: true } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
