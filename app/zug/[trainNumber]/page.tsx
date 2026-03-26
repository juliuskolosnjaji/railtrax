import { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { TrainPublicView } from '@/components/trains/TrainPublicView'

interface Props {
  params: Promise<{ trainNumber: string }>
  searchParams: Promise<{ date?: string; from?: string; tripId?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trainNumber } = await params
  const train = trainNumber.toUpperCase()
  return {
    title: `${train} — Live Zuginformationen | Railtrax`,
    description: `Aktuelle Haltestelleninformationen und Verspätungen für ${train}`,
    openGraph: {
      title: `${train} Live`,
      description: `Verfolge ${train} in Echtzeit auf Railtrax`,
    },
  }
}

export default async function TrainPublicPage({ params, searchParams }: Props) {
  const { trainNumber } = await params
  const { date, from, tripId } = await searchParams

  return (
    <div style={{ background: 'hsl(var(--background))', minHeight: '100vh' }}>
      <header style={{
        padding: '14px 20px',
        borderBottom: '1px solid hsl(var(--border))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Logo />
        </Link>
        <Link href="/abfahrten" style={{ fontSize: 13, color: 'hsl(var(--primary))', textDecoration: 'none' }}>
          Live Abfahrten →
        </Link>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <TrainPublicView
          trainNumber={trainNumber}
          date={date}
          tripId={tripId}
          fromStation={from}
        />
      </div>
    </div>
  )
}
