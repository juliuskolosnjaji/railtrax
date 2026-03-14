import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Wifi, Utensils, Bike, Zap, Calendar, Factory, Gauge, Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LegWithTrip {
  id: string
  tripId: string
  trainNumber?: string | null
  plannedDeparture: Date
  originName: string
  destName: string
  trip: {
    title: string
    userId: string
  }
}

interface RollingStockLeg {
  leg: LegWithTrip
  setNumber?: string | null
  confirmed: boolean
  source: string | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RollingStockPage({ params }: PageProps) {
  const { id } = await params
  const rollingStock = await prisma().rollingStock.findUnique({
    where: { id },
    include: {
      legs: {
        select: {
          leg: {
            select: {
              id: true,
              tripId: true,
              trainNumber: true,
              plannedDeparture: true,
              originName: true,
              destName: true,
              trip: {
                select: {
                  title: true,
                  userId: true,
                },
              },
            },
          },
          setNumber: true,
          confirmed: true,
          source: true,
        },
        take: 10,
        orderBy: { leg: { plannedDeparture: 'desc' } },
      },
      _count: {
        select: { legs: true },
      },
    },
  })

  if (!rollingStock) {
    notFound()
  }

  const features = [
    { 
      enabled: rollingStock.hasWifi, 
      icon: Wifi, 
      label: 'WiFi',
      color: 'text-blue-600'
    },
    { 
      enabled: rollingStock.hasBistro, 
      icon: Utensils, 
      label: 'Bistro/Restaurant',
      color: 'text-orange-600'
    },
    { 
      enabled: rollingStock.hasBikeSpace, 
      icon: Bike, 
      label: 'Bike spaces',
      color: 'text-purple-600'
    },
    { 
      enabled: !!rollingStock.powerSystem, 
      icon: Zap, 
      label: `Power system: ${rollingStock.powerSystem}`,
      color: 'text-yellow-600'
    },
  ].filter(f => f.enabled)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {rollingStock.operator}
                </Badge>
                <span className="text-slate-500">•</span>
                <span className="text-slate-600">{rollingStock.series}</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900">
                {rollingStock.operator} {rollingStock.series}
              </h1>
              {rollingStock.description && (
                <p className="text-slate-600">{rollingStock.description}</p>
              )}
            </div>
            {rollingStock.photoUrl && (
              <img 
                src={rollingStock.photoUrl} 
                alt={`${rollingStock.operator} ${rollingStock.series}`}
                className="w-32 h-20 object-cover rounded-lg border border-slate-200"
              />
            )}
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <feature.icon className={cn("h-4 w-4", feature.color)} />
                  <span className="text-slate-700">{feature.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Specifications</h2>
            <div className="space-y-3">
              {rollingStock.manufacturer && (
                <div className="flex items-center gap-3">
                  <Factory className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Manufacturer</p>
                    <p className="text-sm text-slate-600">{rollingStock.manufacturer}</p>
                  </div>
                </div>
              )}
              
              {rollingStock.introducedYear && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Introduced</p>
                    <p className="text-sm text-slate-600">{rollingStock.introducedYear}</p>
                  </div>
                </div>
              )}
              
              {rollingStock.maxSpeedKmh && (
                <div className="flex items-center gap-3">
                  <Gauge className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Max Speed</p>
                    <p className="text-sm text-slate-600">{rollingStock.maxSpeedKmh} km/h</p>
                  </div>
                </div>
              )}
              
              {rollingStock.powerSystem && (
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Power System</p>
                    <p className="text-sm text-slate-600">{rollingStock.powerSystem}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Capacity</h2>
            <div className="space-y-3">
              {rollingStock.seats1st && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">First Class Seats</p>
                    <p className="text-sm text-slate-600">{rollingStock.seats1st}</p>
                  </div>
                </div>
              )}
              
              {rollingStock.seats2nd && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Second Class Seats</p>
                    <p className="text-sm text-slate-600">{rollingStock.seats2nd}</p>
                  </div>
                </div>
              )}
              
              {rollingStock.hasWheelchair && (
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 text-slate-400">♿</div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Wheelchair Accessible</p>
                    <p className="text-sm text-slate-600">Yes</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Sightings */}
        {rollingStock.legs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Sightings</h2>
              <Badge variant="secondary">
                {rollingStock._count.legs} total
              </Badge>
            </div>
            
            <div className="space-y-3">
              {rollingStock.legs.map((link: RollingStockLeg) => (
                <div key={link.leg.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {link.leg.trainNumber}
                      </span>
                      <span className="text-sm text-slate-600">
                        {link.leg.originName} → {link.leg.destName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(link.leg.plannedDeparture).toLocaleDateString()} • {link.leg.trip.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {link.setNumber && (
                      <Badge variant="outline" className="text-xs">
                        {link.setNumber}
                      </Badge>
                    )}
                    {!link.confirmed && (
                      <Badge variant="secondary" className="text-xs">
                        Unconfirmed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wikipedia Link */}
        {rollingStock.wikiUrl && (
          <div className="flex justify-center mt-6">
            <a href={rollingStock.wikiUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Learn more on Wikipedia
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}