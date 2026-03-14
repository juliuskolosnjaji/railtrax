import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { updateJournalEntrySchema } from '@/lib/validators/journal'

async function getEntryAndVerifyOwner(id: string, userId: string) {
  const entry = await prisma().journalEntry.findUnique({
    where: { id },
    include: { photos: { orderBy: { position: 'asc' } } },
  })
  if (!entry) return { entry: null, error: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  if (entry.userId !== userId) return { entry: null, error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { entry, error: null }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { entry, error } = await getEntryAndVerifyOwner(id, user.id)
  if (error) return error
  return NextResponse.json({ data: entry })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { entry, error } = await getEntryAndVerifyOwner(id, user.id)
  if (error) return error

  const body = await req.json()
  const parsed = updateJournalEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const updated = await prisma().journalEntry.update({
      where: { id: entry!.id },
      data: {
        ...(parsed.data.body !== undefined && { body: JSON.stringify(parsed.data.body) }),
        ...(parsed.data.mood !== undefined && { mood: parsed.data.mood }),
        ...(parsed.data.location_name !== undefined && { locationName: parsed.data.location_name }),
        ...(parsed.data.lat !== undefined && { lat: parsed.data.lat }),
        ...(parsed.data.lon !== undefined && { lon: parsed.data.lon }),
      },
      include: { photos: { orderBy: { position: 'asc' } } },
    })
    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { entry, error } = await getEntryAndVerifyOwner(id, user.id)
  if (error) return error

  try {
    await prisma().journalEntry.delete({ where: { id: entry!.id } })
    return NextResponse.json({ data: { id: entry!.id } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
