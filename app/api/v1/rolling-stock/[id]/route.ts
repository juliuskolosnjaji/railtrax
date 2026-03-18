import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response
  const { id } = await params

  const rs = await prisma().rollingStock.findUnique({ where: { id } })
  if (!rs) return v1Error('Rolling stock not found', 404, 'not_found')
  return v1Ok(rs)
}
