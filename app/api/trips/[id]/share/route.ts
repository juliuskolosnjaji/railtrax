import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const shareTripSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Validate trip ID
  const validation = shareTripSchema.safeParse({ id })
  if (!validation.success) {
    return NextResponse.json({ error: 'validation_error', details: validation.error.flatten() }, { status: 422 })
  }

  // Check if user owns the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id, is_public, share_token')
    .eq('id', id)
    .single()

  if (tripError || !trip) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Generate share token if not already shared
  let shareToken = trip.share_token
  
  if (!shareToken) {
    shareToken = crypto.randomUUID()
    
    const { error: updateError } = await supabase
      .from('trips')
      .update({ 
        is_public: true,
        share_token: shareToken 
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_URL}/trip/${shareToken}`
  const embedUrl = `${process.env.NEXT_PUBLIC_URL}/embed/${shareToken}`

  return NextResponse.json({ 
    data: {
      shareUrl,
      embedUrl,
      shareToken
    }
  }, { status: 200 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Validate trip ID
  const validation = shareTripSchema.safeParse({ id })
  if (!validation.success) {
    return NextResponse.json({ error: 'validation_error', details: validation.error.flatten() }, { status: 422 })
  }

  // Check if user owns the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id, is_public, share_token')
    .eq('id', id)
    .single()

  if (tripError || !trip) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Unshare the trip
  const { error: updateError } = await supabase
    .from('trips')
    .update({ 
      is_public: false,
      share_token: null 
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }

  return NextResponse.json({ data: { unshared: true } }, { status: 200 })
}