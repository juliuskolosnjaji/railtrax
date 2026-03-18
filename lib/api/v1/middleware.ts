/**
 * API v1 authentication middleware.
 *
 * Supports two authentication methods:
 *   1. Supabase JWT — `Authorization: Bearer <supabase-access-token>`
 *   2. Railtrax API key — `Authorization: Bearer rtx_<api-key>` (hashed lookup)
 *
 * Returns the authenticated userId, or a NextResponse (401/429) to return immediately.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'
import crypto from 'crypto'

// 60 requests per minute per user for v1 API
const v1Limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'rl:v1',
    })
  : null

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export type AuthResult =
  | { userId: string; response?: never }
  | { userId?: never; response: NextResponse }

export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return {
      response: NextResponse.json(
        { error: 'unauthorized', message: 'Missing or invalid Authorization header' },
        { status: 401 },
      ),
    }
  }

  const token = authorization.slice(7)
  let userId: string | null = null

  if (token.startsWith('rtx_')) {
    // Railtrax API key authentication
    const keyHash = hashApiKey(token)
    const apiKey = await prisma().apiKey.findUnique({
      where: { keyHash },
      select: { userId: true, id: true },
    })
    if (!apiKey) {
      return {
        response: NextResponse.json(
          { error: 'unauthorized', message: 'Invalid API key' },
          { status: 401 },
        ),
      }
    }
    // Update lastUsed async (fire-and-forget)
    prisma().apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    }).catch(() => {})

    userId = apiKey.userId
  } else {
    // Supabase JWT authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: { getAll: () => [], setAll: () => {} },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return {
        response: NextResponse.json(
          { error: 'unauthorized', message: 'Invalid or expired token' },
          { status: 401 },
        ),
      }
    }
    userId = user.id
  }

  // Rate limiting
  if (v1Limiter) {
    const { success, reset } = await v1Limiter.limit(userId)
    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      return {
        response: NextResponse.json(
          { error: 'rate_limit_exceeded', retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } },
        ),
      }
    }
  }

  return { userId }
}

/** Standard v1 JSON response wrapper */
export function v1Ok<T>(data: T, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) })
}

export function v1Error(message: string, status: number, code?: string): NextResponse {
  return NextResponse.json({ error: code ?? 'error', message }, { status })
}
