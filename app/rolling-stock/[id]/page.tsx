export const revalidate = 3600

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { WifiIcon } from '@/components/ui/icons/WifiIcon'
import { UtensilsIcon } from '@/components/ui/icons/UtensilsIcon'
import { BikeIcon } from '@/components/ui/icons/BikeIcon'
import { ZapIcon } from '@/components/ui/icons/ZapIcon'
import { CalendarIcon } from '@/components/ui/icons/CalendarIcon'
import { FactoryIcon } from '@/components/ui/icons/FactoryIcon'
import { GaugeIcon } from '@/components/ui/icons/GaugeIcon'
import { UsersIcon } from '@/components/ui/icons/UsersIcon'
import { ExternalLinkIcon } from '@/components/ui/icons/ExternalLinkIcon'
import { ArrowLeftIcon } from '@/components/ui/icons/ArrowLeftIcon'

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

  const hasFeatures = rollingStock.hasWifi || rollingStock.hasBistro || rollingStock.hasBikeSpace || !!rollingStock.powerSystem

  const card: React.CSSProperties = {
    background: '#0a1628',
    border: '1px solid #1e2d4a',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  }

  const label: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: '#8ba3c7',
    marginBottom: 2,
  }

  const value: React.CSSProperties = {
    fontSize: 14,
    color: '#ffffff',
  }

  return (
    <div style={{ background: '#080d1a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 16px' }}>

        {/* Back button */}
        <Link
          href="/rolling-stock"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#4a6a9a', fontSize: 14, marginBottom: 24,
            textDecoration: 'none', transition: 'color 0.15s',
          }}
        >
          <ArrowLeftIcon size={16} />
          Zurück
        </Link>

        {/* Header card */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                  background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4f8ef7',
                }}>
                  {rollingStock.operator}
                </span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 6 }}>
                {rollingStock.series}
              </h1>
              {rollingStock.description && (
                <p style={{ fontSize: 14, color: '#8ba3c7', margin: 0 }}>
                  {rollingStock.description}
                </p>
              )}
            </div>
            {rollingStock.photoUrl && (
              <img
                src={rollingStock.photoUrl}
                alt={`${rollingStock.operator} ${rollingStock.series}`}
                style={{ width: 128, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #1e2d4a', flexShrink: 0 }}
              />
            )}
          </div>

          {/* Features */}
          {hasFeatures && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 16,
              marginTop: 20, paddingTop: 20, borderTop: '1px solid #1e2d4a',
            }}>
              {rollingStock.hasWifi && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8ba3c7' }}>
                  <WifiIcon className="h-4 w-4 text-blue-400" />
                  WiFi
                </div>
              )}
              {rollingStock.hasBistro && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8ba3c7' }}>
                  <UtensilsIcon className="h-4 w-4 text-orange-400" />
                  Bistro/Restaurant
                </div>
              )}
              {rollingStock.hasBikeSpace && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8ba3c7' }}>
                  <BikeIcon className="h-4 w-4 text-purple-400" />
                  Fahrradplätze
                </div>
              )}
              {!!rollingStock.powerSystem && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8ba3c7' }}>
                  <ZapIcon className="h-4 w-4 text-yellow-400" />
                  Stromsystem: {rollingStock.powerSystem}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Specs + Capacity grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 24, marginBottom: 24 }}>
          {/* Technische Daten */}
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 20, marginTop: 0 }}>
              Technische Daten
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rollingStock.manufacturer && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <FactoryIcon className="h-4 w-4 text-[#4a6a9a] mt-0.5" />
                  <div>
                    <p style={label}>Hersteller</p>
                    <p style={value}>{rollingStock.manufacturer}</p>
                  </div>
                </div>
              )}
              {rollingStock.introducedYear && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CalendarIcon className="h-4 w-4 text-[#4a6a9a] mt-0.5" />
                  <div>
                    <p style={label}>In Betrieb seit</p>
                    <p style={value}>{rollingStock.introducedYear}</p>
                  </div>
                </div>
              )}
              {rollingStock.maxSpeedKmh && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <GaugeIcon className="h-4 w-4 text-[#4a6a9a] mt-0.5" />
                  <div>
                    <p style={label}>Höchstgeschwindigkeit</p>
                    <p style={value}>{rollingStock.maxSpeedKmh} km/h</p>
                  </div>
                </div>
              )}
              {rollingStock.powerSystem && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <ZapIcon className="h-4 w-4 text-[#4a6a9a] mt-0.5" />
                  <div>
                    <p style={label}>Stromsystem</p>
                    <p style={value}>{rollingStock.powerSystem}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Kapazität */}
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 20, marginTop: 0 }}>
              Kapazität
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rollingStock.seats1st && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <UsersIcon className="h-4 w-4 text-[#4a6a9a] mt-0.5" />
                  <div>
                    <p style={label}>Plätze 1. Klasse</p>
                    <p style={value}>{rollingStock.seats1st}</p>
                  </div>
                </div>
              )}
              {rollingStock.seats2nd && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <UsersIcon className="h-4 w-4 text-[#4a6a9a] mt-0.5" />
                  <div>
                    <p style={label}>Plätze 2. Klasse</p>
                    <p style={value}>{rollingStock.seats2nd}</p>
                  </div>
                </div>
              )}
              {rollingStock.hasWheelchair && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ fontSize: 16, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>♿</div>
                  <div>
                    <p style={label}>Rollstuhlgerecht</p>
                    <p style={value}>Ja</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Sightings */}
        {rollingStock.legs.length > 0 && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>
                Gesichtete Fahrten
              </h2>
              <span style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4a6a9a',
              }}>
                {rollingStock._count.legs} gesamt
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rollingStock.legs.map((link: RollingStockLeg) => (
                <div key={link.leg.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, background: '#080d1a',
                  border: '1px solid #1e2d4a',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      {link.leg.trainNumber && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
                          {link.leg.trainNumber}
                        </span>
                      )}
                      <span style={{ fontSize: 13, color: '#8ba3c7' }}>
                        {link.leg.originName} → {link.leg.destName}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#4a6a9a' }}>
                      {new Date(link.leg.plannedDeparture).toLocaleDateString('de-DE')} · {link.leg.trip.title}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {link.setNumber && (
                      <span style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 4,
                        background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4a6a9a',
                      }}>
                        {link.setNumber}
                      </span>
                    )}
                    {!link.confirmed && (
                      <span style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 4,
                        background: '#1a1a0d', border: '1px solid #2a2a1a', color: '#8b7a4a',
                      }}>
                        Unbestätigt
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wikipedia Link */}
        {rollingStock.wikiUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <a href={rollingStock.wikiUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4f8ef7',
                borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
            >
              <ExternalLinkIcon className="h-4 w-4" />
              Wikipedia öffnen →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
