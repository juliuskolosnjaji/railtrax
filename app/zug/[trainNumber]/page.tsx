import { Metadata } from 'next'
import Link from 'next/link'
import { TrainPublicView } from '@/components/trains/TrainPublicView'
import { ShareButton } from '@/components/trains/ShareButton'
import { AddToTripButton } from '@/components/trains/AddToTripButton'
import { Logo } from '@/components/ui/Logo'

interface Props {
  params: Promise<{ trainNumber: string }>
  searchParams: Promise<{ tripId?: string; date?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trainNumber } = await params
  const decodedTrainNumber = decodeURIComponent(trainNumber).toUpperCase()

  return {
    title: `${decodedTrainNumber} Live · Railtrax`,
    description: `Live-Streckenverlauf und Haltestelleninformationen für ${decodedTrainNumber}`,
  }
}

export default async function TrainPage({ params, searchParams }: Props) {
  const { trainNumber } = await params
  const { tripId, date } = await searchParams
  const decodedTrainNumber = decodeURIComponent(trainNumber)

  return (
    <div
      className="train-page-root"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#080c12',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid #1a2030',
          background: '#080c12',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo size="sm" />
          </Link>

          <nav style={{ display: 'flex', gap: 2 }}>
            {[
              { label: 'Suche', href: '/search' },
              { label: 'Live Abfahrten', href: '/abfahrten' },
              { label: 'Entdecken', href: '/entdecken' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: 12,
                  color: '#4a5568',
                  padding: '4px 10px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  transition: 'color .15s ease, background .15s ease',
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ShareButton trainNumber={decodedTrainNumber} />
          <AddToTripButton />
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <TrainPublicView
          trainNumber={decodedTrainNumber}
          tripId={tripId}
          date={date}
        />
      </div>
    </div>
  )
}
