export const revalidate = 3600

import { prisma } from '@/lib/prisma'
import { RollingStockChip } from '@/components/rolling-stock/RollingStockChip'
import { SearchIcon } from '@/components/ui/icons/SearchIcon'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'

interface RollingStockWithCount {
  id: string
  operator: string
  series: string
  uicClass?: string | null
  manufacturer?: string | null
  introducedYear?: number | null
  maxSpeedKmh?: number | null
  seats1st?: number | null
  seats2nd?: number | null
  hasBistro?: boolean | null
  hasWifi?: boolean | null
  hasWheelchair?: boolean | null
  hasBikeSpace?: boolean | null
  powerSystem?: string | null
  traction?: string | null
  description?: string | null
  photoUrl?: string | null
  wikiUrl?: string | null
  dataSource?: string | null
  _count: {
    legs: number
  }
}

interface PageProps {
  searchParams?: Promise<{ q?: string; operator?: string }>
}

export default async function RollingStockDirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const searchQuery = params?.q
  const operatorFilter = params?.operator

  const where = {
    ...(searchQuery && {
      OR: [
        { series: { contains: searchQuery, mode: 'insensitive' as const } },
        { operator: { contains: searchQuery, mode: 'insensitive' as const } },
        { manufacturer: { contains: searchQuery, mode: 'insensitive' as const } },
      ],
    }),
    ...(operatorFilter && {
      operator: { contains: operatorFilter, mode: 'insensitive' as const },
    }),
  }

  const rollingStock = await prisma().rollingStock.findMany({
    where,
    orderBy: [
      { operator: 'asc' },
      { series: 'asc' },
    ],
    include: {
      _count: {
        select: { legs: true },
      },
    },
  })

  const operators = await prisma().rollingStock.findMany({
    distinct: ['operator'],
    select: { operator: true },
    orderBy: { operator: 'asc' },
  })

  return (
    <div style={{ minHeight: '100vh', background: '#080d1a' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 16px' }}>

        <BackButton />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>
            Zugtypen
          </h1>
          <p style={{ fontSize: 16, color: '#4a6a9a' }}>
            Entdecke europäische Züge und ihre Ausstattung
          </p>
        </div>

        {/* Search and Filters */}
        <div style={{ background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Search input */}
            <form action="/rolling-stock" method="GET" style={{ position: 'relative' }}>
              <SearchIcon
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#4a6a9a', pointerEvents: 'none' }}
              />
              <input
                name="q"
                placeholder="Suche nach Baureihe, Betreiber oder Hersteller..."
                defaultValue={searchQuery}
                style={{
                  width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                  background: '#080d1a', border: '1px solid #1e2d4a', borderRadius: 8,
                  color: '#ffffff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={undefined}
              />
              {operatorFilter && (
                <input type="hidden" name="operator" value={operatorFilter} />
              )}
            </form>

            {/* Operator filter chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {operatorFilter && (
                <Link
                  href={searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '?'}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                    background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4a6a9a',
                    textDecoration: 'none', transition: 'all 0.15s',
                  }}
                >
                  Alle
                </Link>
              )}
              {operators.map(({ operator }) => (
                <Link
                  key={operator}
                  href={`?operator=${encodeURIComponent(operator)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                    textDecoration: 'none', transition: 'all 0.15s',
                    ...(operatorFilter === operator
                      ? { background: '#4f8ef7', border: '1px solid #4f8ef7', color: '#ffffff' }
                      : { background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4a6a9a' }
                    ),
                  }}
                >
                  {operator}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {rollingStock.map((stock: RollingStockWithCount) => (
            <Link
              key={stock.id}
              href={`/rolling-stock/${stock.id}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 12,
                padding: 24, transition: 'border-color 0.15s',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#4f8ef7', marginBottom: 4, fontWeight: 500 }}>
                        {stock.operator}
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 500, color: '#ffffff', margin: 0 }}>
                        {stock.series}
                      </h3>
                    </div>
                    {stock.photoUrl && (
                      <img
                        src={stock.photoUrl}
                        alt={`${stock.operator} ${stock.series}`}
                        style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #1e2d4a' }}
                      />
                    )}
                  </div>

                  <RollingStockChip
                    rollingStock={stock}
                    className="!bg-transparent !border-none !p-0"
                  />

                  {stock.description && (
                    <p style={{ fontSize: 13, color: '#8ba3c7', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {stock.description}
                    </p>
                  )}

                  {stock.manufacturer && (
                    <p style={{ fontSize: 13, margin: 0 }}>
                      <span style={{ color: '#4a6a9a' }}>Hersteller: </span>
                      <span style={{ color: '#8ba3c7' }}>{stock.manufacturer}</span>
                    </p>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #1e2d4a' }}>
                    {stock.maxSpeedKmh ? (
                      <div style={{ fontSize: 13, color: '#4a6a9a' }}>
                        <span style={{ fontWeight: 600, color: '#8ba3c7' }}>{stock.maxSpeedKmh}</span> km/h
                      </div>
                    ) : <div />}
                    <div style={{ fontSize: 13, color: '#4a6a9a' }}>
                      {stock._count.legs} Fahrten
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {rollingStock.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#4a6a9a', fontSize: 16 }}>Keine Zugtypen gefunden</p>
            <p style={{ color: '#1e3a6e', fontSize: 14, marginTop: 8 }}>
              Suchbegriff oder Filter anpassen
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
