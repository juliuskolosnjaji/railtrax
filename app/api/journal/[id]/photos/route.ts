import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

const MAX_DIMENSION = 2000
const MAX_STORAGE_MB = 500
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Verify entry ownership
  const entry = await prisma().journalEntry.findUnique({ where: { id: id }, select: { userId: true } })
  if (!entry) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (entry.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Parse form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'validation_error', details: 'invalid form data' }, { status: 422 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'validation_error', details: 'file required' }, { status: 422 })
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'validation_error', details: 'unsupported image type' }, { status: 422 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'validation_error', details: 'file too large' }, { status: 413 })
  }

  // Check storage limit
  const usage = await prisma().usageCounter.findUnique({ where: { userId: user.id } })
  const usedBytes = Number(usage?.storageBytes ?? 0)
  const maxBytes = MAX_STORAGE_MB * 1024 * 1024
  if (usedBytes >= maxBytes) {
    return NextResponse.json({ error: 'limit_reached', limit: MAX_STORAGE_MB }, { status: 403 })
  }

  // Read + resize with sharp
  const inputBuffer = Buffer.from(await file.arrayBuffer())
  let outputBuffer: Buffer
  try {
    outputBuffer = await sharp(inputBuffer, { limitInputPixels: 25_000_000 })
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'validation_error', details: 'invalid image' }, { status: 422 })
  }

  // Upload to Supabase storage
  const uuid = randomUUID()
  const storagePath = `${user.id}/${id}/${uuid}.jpg`
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('journal-photos')
    .upload(storagePath, outputBuffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('journal-photos').getPublicUrl(storagePath)

  // Determine position (append to end)
  const photoCount = await prisma().journalPhoto.count({ where: { entryId: id } })

  const photo = await prisma().journalPhoto.create({
    data: { entryId: id, url: publicUrl, position: photoCount },
  })

  // Update usage counters
  try {
    await prisma().usageCounter.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        photosCount: 1,
        storageBytes: BigInt(outputBuffer.length),
      },
      update: {
        photosCount: { increment: 1 },
        storageBytes: { increment: outputBuffer.length },
      },
    })
  } catch {
    await prisma().journalPhoto.delete({ where: { id: photo.id } }).catch(() => {})
    await admin.storage.from('journal-photos').remove([storagePath]).catch(() => {})
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }

  return NextResponse.json({ data: photo }, { status: 201 })
}
