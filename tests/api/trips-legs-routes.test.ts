import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import {
  handleDeleteTrip,
  handleGetTrip,
  handleUpdateTrip,
  type TripRouteDeps,
} from '@/app/api/trips/[id]/route'
import {
  handleDeleteLeg,
  handleGetLeg,
  handleUpdateLeg,
  type LegRouteDeps,
} from '@/app/api/legs/[id]/route'

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function jsonRequest(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/test', {
    method,
    ...(body !== undefined
      ? {
          body: JSON.stringify(body),
          headers: { 'content-type': 'application/json' },
        }
      : {}),
  })
}

function createTripDeps(userId: string | null, tripRecord: unknown = null): TripRouteDeps & {
  calls: { findUnique: Record<string, unknown>[]; update: Record<string, unknown>[]; delete: Record<string, unknown>[] }
} {
  const calls = { findUnique: [] as Record<string, unknown>[], update: [] as Record<string, unknown>[], delete: [] as Record<string, unknown>[] }
  return {
    calls,
    async getUser() {
      return userId ? { id: userId } : null
    },
    trip: {
      async findUnique(args) {
        calls.findUnique.push(args)
        return tripRecord
      },
      async update(args) {
        calls.update.push(args)
        return { id: 'trip-1', ...((args.data as Record<string, unknown>) ?? {}) }
      },
      async delete(args) {
        calls.delete.push(args)
        return { id: 'trip-1' }
      },
    },
  }
}

function createLegDeps(userId: string | null, legRecord: unknown = null): LegRouteDeps & {
  calls: { findFirst: Record<string, unknown>[]; update: Record<string, unknown>[]; delete: Record<string, unknown>[] }
} {
  const calls = { findFirst: [] as Record<string, unknown>[], update: [] as Record<string, unknown>[], delete: [] as Record<string, unknown>[] }
  return {
    calls,
    async getUser() {
      return userId ? { id: userId } : null
    },
    leg: {
      async findFirst(args) {
        calls.findFirst.push(args)
        return legRecord
      },
      async update(args) {
        calls.update.push(args)
        return { id: 'leg-1', ...((args.data as Record<string, unknown>) ?? {}) }
      },
      async delete(args) {
        calls.delete.push(args)
        return { id: 'leg-1' }
      },
    },
  }
}

test('trip routes return 401 when no user is authenticated', async () => {
  const deps = createTripDeps(null)

  const getRes = await handleGetTrip(jsonRequest('GET'), params('trip-1'), deps)
  assert.equal(getRes.status, 401)

  const putRes = await handleUpdateTrip(jsonRequest('PUT', { title: 'Test' }), params('trip-1'), deps)
  assert.equal(putRes.status, 401)

  const deleteRes = await handleDeleteTrip(jsonRequest('DELETE'), params('trip-1'), deps)
  assert.equal(deleteRes.status, 401)
})

test('trip routes scope lookup to the authenticated owner', async () => {
  const ownedTrip = { id: 'trip-1', userId: 'user-1' }
  const deps = createTripDeps('user-1', ownedTrip)

  const getRes = await handleGetTrip(jsonRequest('GET'), params('trip-1'), deps)
  assert.equal(getRes.status, 200)
  assert.deepEqual(deps.calls.findUnique[0]?.where, { id: 'trip-1', userId: 'user-1' })

  const putRes = await handleUpdateTrip(
    jsonRequest('PUT', { title: 'Updated title' }),
    params('trip-1'),
    deps,
  )
  assert.equal(putRes.status, 200)
  assert.deepEqual(deps.calls.findUnique[1]?.where, { id: 'trip-1', userId: 'user-1' })
  assert.equal((deps.calls.update[0]?.data as Record<string, unknown>).title, 'Updated title')

  const deleteRes = await handleDeleteTrip(jsonRequest('DELETE'), params('trip-1'), deps)
  assert.equal(deleteRes.status, 200)
  assert.deepEqual(deps.calls.findUnique[2]?.where, { id: 'trip-1', userId: 'user-1' })
  assert.deepEqual(deps.calls.delete[0]?.where, { id: 'trip-1' })
})

test('trip update returns 404 when the authenticated user does not own the trip', async () => {
  const deps = createTripDeps('user-1', null)

  const res = await handleUpdateTrip(
    jsonRequest('PUT', { title: 'Updated title' }),
    params('trip-2'),
    deps,
  )

  assert.equal(res.status, 404)
  assert.equal(deps.calls.update.length, 0)
})

test('leg routes return 401 when no user is authenticated', async () => {
  const deps = createLegDeps(null)

  const getRes = await handleGetLeg(jsonRequest('GET'), params('leg-1'), deps)
  assert.equal(getRes.status, 401)

  const putRes = await handleUpdateLeg(jsonRequest('PUT', { status: 'completed' }), params('leg-1'), deps)
  assert.equal(putRes.status, 401)

  const deleteRes = await handleDeleteLeg(jsonRequest('DELETE'), params('leg-1'), deps)
  assert.equal(deleteRes.status, 401)
})

test('leg routes scope lookup to the authenticated owner and persist minimal status updates', async () => {
  const ownedLeg = { id: 'leg-1', tripId: 'trip-1' }
  const deps = createLegDeps('user-1', ownedLeg)

  const getRes = await handleGetLeg(jsonRequest('GET'), params('leg-1'), deps)
  assert.equal(getRes.status, 200)
  assert.deepEqual(deps.calls.findFirst[0]?.where, { id: 'leg-1', trip: { userId: 'user-1' } })

  const putRes = await handleUpdateLeg(
    jsonRequest('PUT', { status: 'completed' }),
    params('leg-1'),
    deps,
  )
  assert.equal(putRes.status, 200)
  assert.deepEqual(deps.calls.findFirst[1]?.where, { id: 'leg-1', trip: { userId: 'user-1' } })
  assert.deepEqual(deps.calls.update[0], {
    where: { id: 'leg-1' },
    data: { status: 'completed' },
  })

  const deleteRes = await handleDeleteLeg(jsonRequest('DELETE'), params('leg-1'), deps)
  assert.equal(deleteRes.status, 200)
  assert.deepEqual(deps.calls.findFirst[2]?.where, { id: 'leg-1', trip: { userId: 'user-1' } })
  assert.deepEqual(deps.calls.delete[0]?.where, { id: 'leg-1' })
})

test('leg update returns 404 when the authenticated user does not own the leg', async () => {
  const deps = createLegDeps('user-1', null)

  const res = await handleUpdateLeg(
    jsonRequest('PUT', { notes: 'Private notes' }),
    params('leg-2'),
    deps,
  )

  assert.equal(res.status, 404)
  assert.equal(deps.calls.update.length, 0)
})
