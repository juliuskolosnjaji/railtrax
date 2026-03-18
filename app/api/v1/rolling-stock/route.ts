/**
 * GET /api/v1/rolling-stock?q=&operator=&page=&limit=
 * Search/list rolling stock entries.
 */
import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  const operator = url.searchParams.get('operator') ?? ''
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')))
  const skip = (page - 1) * limit

  const where = {
    ...(q && {
      OR: [
        { series: { contains: q, mode: 'insensitive' as const } },
        { name: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    ...(operator && { operator: { contains: operator, mode: 'insensitive' as const } }),
  }

  const [items, total] = await Promise.all([
    prisma().rollingStock.findMany({ where, skip, take: limit, orderBy: { series: 'asc' } }),
    prisma().rollingStock.count({ where }),
  ])

  return v1Ok(items, { page, limit, total, pages: Math.ceil(total / limit) })
}
