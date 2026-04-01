import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file)
      return NextResponse.json({ error: 'no_file' }, { status: 400 })

    const filename = `community/${id}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filename, file)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    const {
      data: { publicUrl },
    } = supabase.storage.from('photos').getPublicUrl(filename)

    const photo = await prisma().communityPhoto.create({
      data: {
        communityTripId: id,
        userId: user.id,
        url: publicUrl,
      },
    })

    return NextResponse.json({ data: photo }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
}
