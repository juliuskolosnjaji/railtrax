import { prisma } from '@/lib/prisma'
import { RollingStockChip } from '@/components/rolling-stock/RollingStockChip'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

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
  searchParams?: { q?: string; operator?: string }
}

export default async function RollingStockDirectoryPage({ searchParams }: PageProps) {
  const searchQuery = searchParams?.q
  const operatorFilter = searchParams?.operator

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Rolling Stock Directory
          </h1>
          <p className="text-lg text-slate-600">
            Explore European train types and specifications
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by series, operator, or manufacturer..."
                defaultValue={searchQuery}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              {operators.map(({ operator }) => (
                <Link
                  key={operator}
                  href={`?operator=${encodeURIComponent(operator)}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    operatorFilter === operator
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {operator}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rollingStock.map((stock: RollingStockWithCount) => (
            <Link
              key={stock.id}
              href={`/rolling-stock/${stock.id}`}
              className="block"
            >
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-slate-500 mb-1">{stock.operator}</div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {stock.series}
                      </h3>
                    </div>
                    {stock.photoUrl && (
                      <img 
                        src={stock.photoUrl} 
                        alt={`${stock.operator} ${stock.series}`}
                        className="w-16 h-12 object-cover rounded border border-slate-200"
                      />
                    )}
                  </div>

                  <RollingStockChip 
                    rollingStock={stock} 
                    className="!bg-transparent !border-none !p-0"
                  />

                  {stock.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {stock.description}
                    </p>
                  )}

                  {stock.manufacturer && (
                    <p className="text-sm text-slate-500">
                      Made by {stock.manufacturer}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    {stock.maxSpeedKmh && (
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">{stock.maxSpeedKmh}</span> km/h
                      </div>
                    )}
                    
                    <div className="text-sm text-slate-500">
                      {stock._count.legs} sightings
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {rollingStock.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-500 text-lg">
              No rolling stock found
            </div>
            <p className="text-slate-400 mt-2">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}
      </div>
    </div>
  )
}