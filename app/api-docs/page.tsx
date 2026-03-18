export const metadata = {
  title: 'API Documentation — Railtrax',
  description: 'REST API v1 reference for Railtrax',
}

const BASE = 'https://railtrax.eu/api/v1'

const endpoints: Array<{
  tag: string
  items: Array<{ method: string; path: string; description: string; note?: string; curl: string }>
}> = [
  {
    tag: 'Authentication',
    items: [
      {
        method: 'ALL',
        path: '/api/v1/*',
        description: 'All endpoints require an Authorization header.',
        note: 'Pass your Supabase access token or a Railtrax API key (prefix: rtx_) as a Bearer token.',
        curl: `curl -H "Authorization: Bearer <your-token>" ${BASE}/user`,
      },
    ],
  },
  {
    tag: 'Trips',
    items: [
      {
        method: 'GET',
        path: '/api/v1/trips',
        description: 'List all trips. Add ?legs=1 to include legs, ?page=&limit= for pagination.',
        curl: `curl -H "Authorization: Bearer <token>" "${BASE}/trips?legs=1&page=1&limit=10"`,
      },
      {
        method: 'POST',
        path: '/api/v1/trips',
        description: 'Create a new trip.',
        curl: `curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \\
  -d '{"title":"Berlin–Paris","startDate":"2026-04-01T08:00:00Z"}' \\
  ${BASE}/trips`,
      },
      {
        method: 'GET',
        path: '/api/v1/trips/:id',
        description: 'Get a single trip with all its legs.',
        curl: `curl -H "Authorization: Bearer <token>" ${BASE}/trips/<trip-id>`,
      },
      {
        method: 'PUT',
        path: '/api/v1/trips/:id',
        description: 'Update trip title, description, dates, or status.',
        curl: `curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \\
  -d '{"status":"completed"}' \\
  ${BASE}/trips/<trip-id>`,
      },
      {
        method: 'DELETE',
        path: '/api/v1/trips/:id',
        description: 'Delete a trip and all its legs.',
        curl: `curl -X DELETE -H "Authorization: Bearer <token>" ${BASE}/trips/<trip-id>`,
      },
    ],
  },
  {
    tag: 'Legs',
    items: [
      {
        method: 'POST',
        path: '/api/v1/legs',
        description: 'Add a leg to a trip.',
        curl: `curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \\
  -d '{"tripId":"<trip-id>","originName":"Berlin Hbf","destName":"Paris Est","plannedDeparture":"2026-04-01T10:00:00Z","plannedArrival":"2026-04-01T17:30:00Z","operator":"DB","trainNumber":"ICE 9551"}' \\
  ${BASE}/legs`,
      },
      {
        method: 'GET',
        path: '/api/v1/legs/:id',
        description: 'Get a single leg.',
        curl: `curl -H "Authorization: Bearer <token>" ${BASE}/legs/<leg-id>`,
      },
      {
        method: 'PUT',
        path: '/api/v1/legs/:id',
        description: 'Update a leg (status, times, seat, notes, etc.).',
        curl: `curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \\
  -d '{"status":"completed","seat":"42A"}' \\
  ${BASE}/legs/<leg-id>`,
      },
      {
        method: 'DELETE',
        path: '/api/v1/legs/:id',
        description: 'Delete a leg.',
        curl: `curl -X DELETE -H "Authorization: Bearer <token>" ${BASE}/legs/<leg-id>`,
      },
    ],
  },
  {
    tag: 'Search',
    items: [
      {
        method: 'GET',
        path: '/api/v1/search',
        description: 'Search for train connections between two stations. Rate-limited to 30 req/min.',
        curl: `curl -H "Authorization: Bearer <token>" \\
  "${BASE}/search?from=8011160&to=8700013&datetime=2026-04-01T08:00:00Z&class=2"`,
      },
    ],
  },
  {
    tag: 'Statistics',
    items: [
      {
        method: 'GET',
        path: '/api/v1/stats',
        description: 'Aggregated travel statistics: total distance, duration, operators, countries.',
        curl: `curl -H "Authorization: Bearer <token>" ${BASE}/stats`,
      },
    ],
  },
  {
    tag: 'User',
    items: [
      {
        method: 'GET',
        path: '/api/v1/user',
        description: 'Get profile of the authenticated user.',
        curl: `curl -H "Authorization: Bearer <token>" ${BASE}/user`,
      },
      {
        method: 'GET',
        path: '/api/v1/user?export=1',
        description: 'Export all user data as JSON (DSGVO Art. 20).',
        curl: `curl -H "Authorization: Bearer <token>" "${BASE}/user?export=1" -o my-railtrax-data.json`,
      },
    ],
  },
  {
    tag: 'Rolling Stock',
    items: [
      {
        method: 'GET',
        path: '/api/v1/rolling-stock',
        description: 'Search the rolling stock database. Supports ?q=, ?operator=, pagination.',
        curl: `curl -H "Authorization: Bearer <token>" "${BASE}/rolling-stock?q=ICE4&operator=DB"`,
      },
      {
        method: 'GET',
        path: '/api/v1/rolling-stock/:id',
        description: 'Get a single rolling stock entry.',
        curl: `curl -H "Authorization: Bearer <token>" ${BASE}/rolling-stock/<id>`,
      },
    ],
  },
  {
    tag: 'App',
    items: [
      {
        method: 'GET',
        path: '/api/v1/app',
        description: 'App configuration, feature flags, and VAPID public key. No authentication required.',
        curl: `curl ${BASE}/app`,
      },
    ],
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET: '#3ecf6e',
  POST: '#4f8ef7',
  PUT: '#f59e0b',
  DELETE: '#e25555',
  ALL: '#8ba3c7',
}

export default function ApiDocsPage() {
  return (
    <div style={{ backgroundColor: '#080d1a', minHeight: '100vh', color: '#fff', fontFamily: 'monospace' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            Railtrax API <span style={{ color: '#4f8ef7' }}>v1</span>
          </h1>
          <p style={{ color: '#8ba3c7', fontSize: 14, lineHeight: 1.6, maxWidth: 640 }}>
            REST API for building apps on top of Railtrax. All endpoints live under{' '}
            <code style={{ color: '#4f8ef7', backgroundColor: '#0d1f3c', padding: '1px 6px', borderRadius: 4 }}>
              https://railtrax.eu/api/v1
            </code>.
            The{' '}
            <a href="/api/v1/openapi.json" style={{ color: '#4f8ef7' }}>OpenAPI 3.1 spec</a>
            {' '}is available for import into Postman, Insomnia, or code generators.
          </p>
        </div>

        {/* Auth box */}
        <div style={{ border: '1px solid #1e3a6e', borderRadius: 12, padding: '20px 24px', marginBottom: 40, backgroundColor: '#0a1628' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#4f8ef7', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Authentication</h2>
          <p style={{ color: '#8ba3c7', fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
            All endpoints (except <code style={{ color: '#4f8ef7' }}>/api/v1/app</code>) require an{' '}
            <code style={{ color: '#8ba3c7' }}>Authorization: Bearer &lt;token&gt;</code> header.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240, backgroundColor: '#0d1f3c', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: '#4a6a9a', marginBottom: 6, fontFamily: 'sans-serif' }}>Supabase JWT</div>
              <code style={{ fontSize: 12, color: '#8ba3c7' }}>Bearer eyJ...</code>
            </div>
            <div style={{ flex: 1, minWidth: 240, backgroundColor: '#0d1f3c', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: '#4a6a9a', marginBottom: 6, fontFamily: 'sans-serif' }}>Railtrax API Key</div>
              <code style={{ fontSize: 12, color: '#8ba3c7' }}>Bearer rtx_...</code>
            </div>
          </div>
        </div>

        {/* Rate limits */}
        <div style={{ border: '1px solid #1e2d4a', borderRadius: 12, padding: '16px 24px', marginBottom: 48, backgroundColor: '#0a1628' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'sans-serif' }}>Rate Limits</h2>
          <p style={{ color: '#8ba3c7', fontSize: 13, lineHeight: 1.7, fontFamily: 'sans-serif' }}>
            General endpoints: <strong style={{ color: '#fff' }}>60 requests / minute</strong>.
            Search endpoints: <strong style={{ color: '#fff' }}>30 requests / minute</strong>.
            Exceeded limits return HTTP <code style={{ color: '#e25555' }}>429</code> with a <code style={{ color: '#8ba3c7' }}>Retry-After</code> header.
          </p>
        </div>

        {/* Endpoints */}
        {endpoints.map(group => (
          <div key={group.tag} style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20, fontFamily: 'sans-serif', borderBottom: '1px solid #1e2d4a', paddingBottom: 10 }}>
              {group.tag}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {group.items.map((item, i) => (
                <div
                  key={i}
                  style={{ border: '1px solid #1e2d4a', borderRadius: 12, overflow: 'hidden', backgroundColor: '#0a1628' }}
                >
                  {/* Endpoint header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #0d1f3c' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: METHOD_COLORS[item.method] ?? '#8ba3c7',
                      backgroundColor: `${METHOD_COLORS[item.method] ?? '#8ba3c7'}18`,
                      padding: '3px 8px',
                      borderRadius: 4,
                      letterSpacing: '0.05em',
                    }}>
                      {item.method}
                    </span>
                    <code style={{ fontSize: 13, color: '#e2e8f0' }}>{item.path}</code>
                  </div>
                  {/* Description */}
                  <div style={{ padding: '12px 20px' }}>
                    <p style={{ fontSize: 13, color: '#8ba3c7', lineHeight: 1.6, marginBottom: item.note ? 8 : 16, fontFamily: 'sans-serif' }}>
                      {item.description}
                    </p>
                    {item.note && (
                      <p style={{ fontSize: 12, color: '#4a6a9a', marginBottom: 16, fontFamily: 'sans-serif' }}>{item.note}</p>
                    )}
                    {/* Curl example */}
                    <div style={{ backgroundColor: '#050b16', borderRadius: 8, padding: '12px 16px', overflowX: 'auto' }}>
                      <pre style={{ fontSize: 12, color: '#8ba3c7', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {item.curl}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1e2d4a', paddingTop: 32, marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#4a6a9a', fontFamily: 'sans-serif' }}>
            <a href="/api/v1/openapi.json" style={{ color: '#4f8ef7', marginRight: 16 }}>OpenAPI Spec</a>
            <a href="mailto:support@railtrax.eu" style={{ color: '#4f8ef7' }}>support@railtrax.eu</a>
          </p>
        </div>
      </div>
    </div>
  )
}
