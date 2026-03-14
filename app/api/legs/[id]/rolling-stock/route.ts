import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getFormation } from '@/lib/formation'

// Schema for linking rolling stock to a leg
const linkRollingStockSchema = z.object({
  rollingStockId: z.string(),
  setNumber: z.string().optional(),
  source: z.string().optional(), // 'auto', 'manual', 'community'
})

// Schema for user reports (when auto-detection fails or is wrong)
const reportRollingStockSchema = z.object({
  rollingStockId: z.string(),
  setNumber: z.string().optional(),
  source: z.literal('user_report'),
})

type Params = { params: Promise<{ id: string }> }

// Verify the leg belongs to the authenticated user via its trip
async function getLegForUser(legId: string, userId: string) {
  return prisma().leg.findFirst({
    where: { id: legId, trip: { userId } },
    include: { rollingStock: true }
  })
}

// GET formation data for this leg — combines live API lookup with static fallback.
// Also returns any manually-linked rolling stock as manualLink for UI display.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const leg = await getLegForUser(id, user.id)
    if (!leg) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // Run formation lookup and manual-link fetch in parallel
    const [formation, manualLink] = await Promise.all([
      getFormation({
        operator: leg.operator,
        lineName: leg.lineName,
        trainNumber: leg.trainNumber,
        plannedDeparture: leg.plannedDeparture,
        originIbnr: leg.originIbnr,
      }),
      leg.rollingStock
        ? prisma().rollingStock.findUnique({ where: { id: leg.rollingStock.rollingStockId } })
        : Promise.resolve(null),
    ])

    return NextResponse.json({
      data: {
        formation,                          // FormationResult | null — live / static lookup
        manualLink: manualLink
          ? { ...leg.rollingStock, rollingStock: manualLink }
          : null,                           // manually-linked entry from DB, if any
      },
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

// POST link rolling stock to this leg
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = linkRollingStockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  try {
    const leg = await getLegForUser(id, user.id)
    if (!leg) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // Verify the rolling stock exists
    const rollingStock = await prisma().rollingStock.findUnique({
      where: { id: parsed.data.rollingStockId }
    })
    if (!rollingStock) {
      return NextResponse.json({ error: 'rolling_stock_not_found' }, { status: 404 })
    }

    // Create or update the link
    const link = await prisma().legRollingStock.upsert({
      where: { legId: id },
      update: {
        rollingStockId: parsed.data.rollingStockId,
        setNumber: parsed.data.setNumber,
        confirmed: true, // Manual linking is always confirmed
        source: parsed.data.source || 'manual',
      },
      create: {
        legId: id,
        rollingStockId: parsed.data.rollingStockId,
        setNumber: parsed.data.setNumber,
        confirmed: true,
        source: parsed.data.source || 'manual',
      },
    })

    return NextResponse.json({ data: link })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

// PUT user report for rolling stock (when auto-detection is wrong)
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = reportRollingStockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  try {
    const leg = await getLegForUser(id, user.id)
    if (!leg) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // Verify the rolling stock exists
    const rollingStock = await prisma().rollingStock.findUnique({
      where: { id: parsed.data.rollingStockId }
    })
    if (!rollingStock) {
      return NextResponse.json({ error: 'rolling_stock_not_found' }, { status: 404 })
    }

    // Update with user report (overrides any existing link)
    const link = await prisma().legRollingStock.upsert({
      where: { legId: id },
      update: {
        rollingStockId: parsed.data.rollingStockId,
        setNumber: parsed.data.setNumber,
        confirmed: true, // User reports are always confirmed
        source: 'user_report',
      },
      create: {
        legId: id,
        rollingStockId: parsed.data.rollingStockId,
        setNumber: parsed.data.setNumber,
        confirmed: true,
        source: 'user_report',
      },
    })

    return NextResponse.json({ data: link })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

// DELETE remove rolling stock link
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const leg = await getLegForUser(id, user.id)
    if (!leg) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    await prisma().legRollingStock.delete({
      where: { legId: id }
    })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}