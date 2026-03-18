import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Railtrax API',
    version: '1.0.0',
    description: 'REST API for Railtrax — plan, track and analyse European train journeys.',
    contact: { email: 'support@railtrax.eu' },
  },
  servers: [{ url: 'https://railtrax.eu/api/v1', description: 'Production' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT or rtx_<api-key>',
        description: 'Supabase access token or Railtrax API key (prefix: rtx_)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
      Trip: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['planned', 'active', 'completed'] },
          startDate: { type: 'string', format: 'date-time', nullable: true },
          endDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          _count: { type: 'object', properties: { legs: { type: 'integer' } } },
        },
      },
      Leg: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tripId: { type: 'string', format: 'uuid' },
          position: { type: 'integer' },
          originName: { type: 'string' },
          originIbnr: { type: 'string', nullable: true },
          destName: { type: 'string' },
          destIbnr: { type: 'string', nullable: true },
          plannedDeparture: { type: 'string', format: 'date-time' },
          plannedArrival: { type: 'string', format: 'date-time' },
          operator: { type: 'string', nullable: true },
          trainNumber: { type: 'string', nullable: true },
          trainType: { type: 'string', nullable: true },
          lineName: { type: 'string', nullable: true },
          platformPlanned: { type: 'string', nullable: true },
          platformActual: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['planned', 'checked_in', 'completed'] },
          delayMinutes: { type: 'integer' },
          distanceKm: { type: 'number', nullable: true },
          seat: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
        },
      },
      Stats: {
        type: 'object',
        properties: {
          trips: { type: 'integer' },
          legs: { type: 'integer' },
          totalDistanceKm: { type: 'integer' },
          totalDurationMinutes: { type: 'integer' },
          countriesVisited: { type: 'array', items: { type: 'string' } },
          operatorBreakdown: { type: 'object', additionalProperties: { type: 'integer' } },
        },
      },
    },
  },
  paths: {
    '/trips': {
      get: {
        summary: 'List trips',
        tags: ['Trips'],
        parameters: [
          { name: 'legs', in: 'query', schema: { type: 'string', enum: ['0', '1'] }, description: 'Include legs in response' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Trip' } }, meta: { type: 'object' } } } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        summary: 'Create a trip',
        tags: ['Trips'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' }, startDate: { type: 'string', format: 'date-time' }, endDate: { type: 'string', format: 'date-time' } } } } } },
        responses: {
          200: { description: 'Created trip', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Trip' } } } } } },
          401: { description: 'Unauthorized' },
          403: { description: 'Plan limit exceeded' },
        },
      },
    },
    '/trips/{id}': {
      get: { summary: 'Get a trip', tags: ['Trips'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Trip with legs' }, 404: { description: 'Not found' } } },
      put: { summary: 'Update a trip', tags: ['Trips'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Updated trip' }, 404: { description: 'Not found' } } },
      delete: { summary: 'Delete a trip', tags: ['Trips'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } } },
    },
    '/legs': {
      post: {
        summary: 'Create a leg',
        tags: ['Legs'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tripId', 'originName', 'destName', 'plannedDeparture', 'plannedArrival'], properties: { tripId: { type: 'string', format: 'uuid' }, originName: { type: 'string' }, destName: { type: 'string' }, plannedDeparture: { type: 'string', format: 'date-time' }, plannedArrival: { type: 'string', format: 'date-time' }, operator: { type: 'string' }, trainNumber: { type: 'string' } } } } } },
        responses: { 200: { description: 'Created leg' }, 401: { description: 'Unauthorized' }, 403: { description: 'Plan limit exceeded' }, 404: { description: 'Trip not found' } },
      },
    },
    '/legs/{id}': {
      get: { summary: 'Get a leg', tags: ['Legs'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Leg' }, 404: { description: 'Not found' } } },
      put: { summary: 'Update a leg', tags: ['Legs'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Updated leg' } } },
      delete: { summary: 'Delete a leg', tags: ['Legs'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/search': {
      get: {
        summary: 'Search train connections',
        tags: ['Search'],
        parameters: [
          { name: 'from', in: 'query', required: true, schema: { type: 'string' }, description: 'Origin IBNR or station name' },
          { name: 'to', in: 'query', required: true, schema: { type: 'string' }, description: 'Destination IBNR or station name' },
          { name: 'datetime', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } },
          { name: 'class', in: 'query', schema: { type: 'string', enum: ['1', '2'], default: '2' } },
        ],
        responses: { 200: { description: 'Journey results' }, 503: { description: 'Search service unavailable' } },
      },
    },
    '/stats': {
      get: {
        summary: 'Get travel statistics',
        tags: ['Stats'],
        responses: { 200: { description: 'Stats', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Stats' } } } } } } },
      },
    },
    '/user': {
      get: {
        summary: 'Get user profile or export data',
        tags: ['User'],
        parameters: [{ name: 'export', in: 'query', schema: { type: 'string', enum: ['0', '1'] }, description: 'Set to 1 to export all user data' }],
        responses: { 200: { description: 'User profile or data export' } },
      },
    },
    '/rolling-stock': {
      get: {
        summary: 'List rolling stock',
        tags: ['Rolling Stock'],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query' },
          { name: 'operator', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { 200: { description: 'Rolling stock list' } },
      },
    },
    '/rolling-stock/{id}': {
      get: { summary: 'Get a rolling stock entry', tags: ['Rolling Stock'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Rolling stock entry' }, 404: { description: 'Not found' } } },
    },
    '/app': {
      get: { summary: 'App configuration (no auth required)', tags: ['App'], security: [], responses: { 200: { description: 'App config, feature flags, VAPID public key' } } },
    },
  },
}

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
