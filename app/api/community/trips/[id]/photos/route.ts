import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPublicCommunityTripOrNull } from '@/lib/community'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const communityTrip = await getPublicCommunityTripOrNull(id)
    if (!communityTrip)
      return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file)
      return NextResponse.json({ error: 'no_file' }, { status: 400 })

    const filename = `community/${id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage
      .from('photos')
      .upload(filename, file)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    const {
      data: { publicUrl },
    } = supabase.storage.from('photos').getPublicUrl(filename)

    try {
      const photo = await prisma().communityPhoto.create({
        data: {
          communityTripId: communityTrip.id,
          userId: user.id,
          url: publicUrl,
        },
      })

      return NextResponse.json({ data: photo }, { status: 201 })
    } catch {
      await supabase.storage.from('photos').remove([filename]).catch(() => {})
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
