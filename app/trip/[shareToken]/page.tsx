import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import Link from 'next/link'
import { TripMapCard } from '@/components/map/TripMapClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ shareToken: string }>
}

interface RollingStockRef {
  set_number?: string | null
  rolling_stock?: { series: string; operator: string }[] | null
}

interface TripLeg {
  id: string
  position: number
  planned_departure: string
  planned_arrival: string
  actual_departure?: string | null
  actual_arrival?: string | null
  distance_km?: number | null
  origin_name?: string | null
  dest_name?: string | null
  origin_ibnr?: string | null
  dest_ibnr?: string | null
  origin_lat?: number | null
  origin_lon?: number | null
  dest_lat?: number | null
  dest_lon?: number | null
  train_type?: string | null
  train_number?: string | null
  operator?: string | null
  platform_planned?: string | null
  platform_actual?: string | null
  delay_minutes?: number | null
  polyline?: unknown
  leg_rolling_stock?: RollingStockRef[] | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOperatorStyle(operator: string | null | undefined): { background: string; color: string; border: string } {
  const op = (operator ?? '').toUpperCase()
  if (op.includes('DB') || op.includes('ICE')) return { background: 'rgba(227,34,40,0.12)', color: '#E32228', border: '1px solid rgba(227,34,40,0.35)' }
  if (op.includes('SBB') || op.includes('TPF') || op.includes('MOB') || op.includes('RHB') || op.includes('BLS'))
    return { background: 'rgba(235,0,0,0.12)', color: '#EB0000', border: '1px solid rgba(235,0,0,0.35)' }
  if (op.includes('ÖBB') || op.includes('OBB') || op.includes('WESTbahn'))
    return { background: 'rgba(200,16,46,0.12)', color: '#C8102E', border: '1px solid rgba(200,16,46,0.35)' }
  if (op.includes('SNCF') || op.includes('TGV') || op.includes('OUIGO') || op.includes('TRANSILIEN'))
    return { background: 'rgba(224,82,6,0.12)', color: '#E05206', border: '1px solid rgba(224,82,6,0.35)' }
  if (op.includes('EUROSTAR') || op.includes('THALYS'))
    return { background: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.35)' }
  if (op.includes('NS') || op.includes('ARRIVA'))
    return { background: 'rgba(234,179,8,0.12)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.35)' }
  if (op.includes('RENFE')) return { background: 'rgba(226,85,85,0.12)', color: '#e25555', border: '1px solid rgba(226,85,85,0.35)' }
  if (op.includes('FLIX')) return { background: 'rgba(116,180,58,0.12)', color: '#74B43A', border: '1px solid rgba(116,180,58,0.35)' }
  if (op.includes('TRENITALIA') || op.includes('ITALO') || op.includes('FS'))
    return { background: 'rgba(132,204,22,0.12)', color: '#84cc16', border: '1px solid rgba(132,204,22,0.35)' }
  return { background: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))', border: '1px solid hsl(var(--border))' }
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatLegDuration(dep: string, arr: string): string {
  const ms = new Date(arr).getTime() - new Date(dep).getTime()
  if (ms <= 0) return ''
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTotalDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return 'Kein Datum'
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null

  const sameDay = end && start.toDateString() === end.toDateString()
  if (!end || sameDay) {
    return start.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  }
  const s = start.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  const e = end.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} — ${e}`
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('title, description, start_date, end_date, user_id')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single()

  if (!trip) return { title: 'Reise nicht gefunden' }

  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', trip.user_id)
    .single()

  const dateRange = trip.start_date && trip.end_date
    ? `${new Date(trip.start_date).toLocaleDateString('de-DE')} – ${new Date(trip.end_date).toLocaleDateString('de-DE')}`
    : ''

  const desc = trip.description || `Zugreise von ${user?.username || 'einem Reisenden'}${dateRange ? ` · ${dateRange}` : ''}`

  const baseUrl = (process.env.NEXT_PUBLIC_URL ?? 'https://railtrax.eu').replace(/\/+$/, '')
   return {
     title: `${trip.title} – Railtrax`,
     description: desc,
     openGraph: {
       title: trip.title,
       description: desc,
       images: [`${baseUrl}/api/og/trip/${shareToken}`],
       type: 'website',
     },
     twitter: {
       card: 'summary_large_image',
       title: trip.title,
       description: desc,
       images: [`${baseUrl}/api/og/trip/${shareToken}`],
     },
   }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicTripPage({ params }: PageProps) {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select(`
      id,
      title,
      description,
      status,
      start_date,
      end_date,
      legs(
        id,
        position,
        planned_departure,
        planned_arrival,
        actual_departure,
        actual_arrival,
        distance_km,
        origin_name,
        dest_name,
        origin_ibnr,
        dest_ibnr,
        origin_lat,
        origin_lon,
        dest_lat,
        dest_lon,
        train_type,
        train_number,
        operator,
        platform_planned,
        platform_actual,
        delay_minutes,
        polyline,
        leg_rolling_stock(
          set_number,
          rolling_stock(series, operator)
        )
      ),
      user:users(username, display_name)
    `)
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single()

  if (!trip) notFound()

  const legs: TripLeg[] = ((trip.legs as TripLeg[]) ?? []).sort((a, b) =>
    new Date(a.planned_departure).getTime() - new Date(b.planned_departure).getTime()
  )

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalDistanceKm = legs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
  const totalDurationMs = legs.reduce((s, l) => {
    const ms = new Date(l.planned_arrival).getTime() - new Date(l.planned_departure).getTime()
    return s + (ms > 0 ? ms : 0)
  }, 0)
  const co2SavedKg = Math.round(totalDistanceKm * 0.22)

  const authorName = (trip.user as { username?: string; display_name?: string } | null)?.display_name
    || (trip.user as { username?: string; display_name?: string } | null)?.username
    || 'Unbekannt'

  const firstLeg = legs[0]
  const lastLeg  = legs[legs.length - 1]
  const mapLegs  = legs.map(leg => ({
    id: leg.id,
    tripId: '',
    position: leg.position,
    originName: leg.origin_name ?? '',
    originIbnr: leg.origin_ibnr ?? null,
    originLat: leg.origin_lat ?? null,
    originLon: leg.origin_lon ?? null,
    plannedDeparture: leg.planned_departure,
    actualDeparture: leg.actual_departure ?? null,
    destName: leg.dest_name ?? '',
    destIbnr: leg.dest_ibnr ?? null,
    destLat: leg.dest_lat ?? null,
    destLon: leg.dest_lon ?? null,
    plannedArrival: leg.planned_arrival,
    actualArrival: leg.actual_arrival ?? null,
    operator: leg.operator ?? null,
    lineName: leg.train_type ?? null,
    trainType: leg.train_type ?? null,
    trainNumber: leg.train_number ?? null,
    platformPlanned: leg.platform_planned ?? null,
    platformActual: leg.platform_actual ?? null,
    arrivalPlatformPlanned: null,
    arrivalPlatformActual: null,
    status: null,
    delayMinutes: leg.delay_minutes ?? 0,
    cancelled: false,
    distanceKm: leg.distance_km ?? null,
    tripIdVendo: null,
    journeyNumber: null,
    polyline: (leg.polyline as [number, number][] | null) ?? null,
    seat: null,
    notes: null,
    traewellingStatusId: null,
  }))

  const statusLabel = trip.status === 'completed' ? 'Abgeschlossen'
    : trip.status === 'active' ? 'Aktiv' : 'Geplant'
  const statusColor = trip.status === 'completed' ? '#2dd4b0' : '#4f8ef7'
  const statusBg    = trip.status === 'completed' ? 'rgba(45,212,176,0.1)' : 'rgba(79,142,247,0.1)'

  return (
    <div className="min-h-screen bg-background">

      {/* ── Navbar ── */}
      <nav className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-[60px] flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <div className="flex gap-2.5">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border text-secondary-foreground hover:text-foreground transition-colors"
            >
              Anmelden
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>

        {/* Title + status */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
            {trip.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '3px 10px', borderRadius: 20,
              background: statusBg, color: statusColor,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {statusLabel}
            </span>
            <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
          </div>
        </div>

        {/* ── Route card ── */}
        <div style={{
          background: '#0f1117',
          border: '1px solid #1e2530',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          {/* Von → Nach header + train badges */}
          <div style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, marginBottom: 2 }}>Von</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>{firstLeg?.origin_name ?? '–'}</div>
              </div>
              <span style={{ color: '#2dd4b0', fontSize: 16 }}>→</span>
              <div>
                <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, marginBottom: 2 }}>Nach</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>{lastLeg?.dest_name ?? '–'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {legs.slice(0, 5).map(leg => (
                <span key={leg.id} style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 5,
                  background: '#1a2030', border: '1px solid #2a3545',
                  color: '#8ba3c7',
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {leg.train_type ?? leg.train_number ?? '–'}
                </span>
              ))}
            </div>
          </div>

          {/* Full-width map */}
          <TripMapCard legs={mapLegs} height={360} />

          {/* Stats row */}
          <div className="shared-trip-stats" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: '1px solid #1e2530',
          }}>
            {[
              { label: 'Strecke',    value: `${Math.round(totalDistanceKm).toLocaleString('de-DE')} km`, color: '#f0f4f8' },
              { label: 'Dauer',      value: formatTotalDuration(totalDurationMs), color: '#f0f4f8' },
              { label: 'Abschnitte', value: String(legs.length), color: '#f0f4f8' },
              { label: 'CO₂ Gespart', value: `${co2SavedKg.toLocaleString('de-DE')} kg`, color: '#2dd4b0' },
            ].map(({ label, value, color }, i) => (
              <div key={label} style={{
                padding: '14px 16px',
                paddingLeft: i === 0 ? 20 : 16,
                borderLeft: i > 0 ? '1px solid #1e2530' : 'none',
              }}>
                <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: '-0.5px' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Legs list ── */}
        <div className="mt-0 bg-card border border-border rounded-xl overflow-hidden" style={{ marginBottom: 20 }}>
          <div className="px-6 py-4 border-b border-border flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold text-foreground">Streckenverlauf</h2>
            <span className="bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-md text-xs">
              {legs.length} {legs.length === 1 ? 'Abschnitt' : 'Abschnitte'}
            </span>
          </div>
          <div className="p-6">
            {legs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Keine Abschnitte vorhanden</p>
            ) : (
              <div>
                {legs.map((leg, index) => {
                  const isLast   = index === legs.length - 1
                  const opStyle  = getOperatorStyle(leg.operator)
                  const duration = formatLegDuration(leg.planned_departure, leg.planned_arrival)
                  const depTime  = formatTime(leg.planned_departure)
                  const arrTime  = formatTime(leg.planned_arrival)
                  const platform = leg.platform_actual ?? leg.platform_planned
                  const trainLabel = [leg.train_type, leg.train_number].filter(Boolean).join(' ')
                  const rs     = leg.leg_rolling_stock?.[0]?.rolling_stock?.[0]
                  const setNum = leg.leg_rolling_stock?.[0]?.set_number
                  const hasDelay = (leg.delay_minutes ?? 0) > 0

                  return (
                    <div key={leg.id} className={`relative flex gap-4 ${isLast ? '' : 'pb-7'}`}>
                      {!isLast && (
                        <div className="absolute left-[15px] top-9 bottom-0 border-l-2 border-dashed border-border pointer-events-none" />
                      )}
                      <div className="w-8 h-8 shrink-0 bg-secondary border border-border rounded-lg flex items-center justify-center text-[13px] font-semibold text-primary relative z-10">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[15px] font-medium text-foreground">{leg.origin_name ?? '–'}</span>
                          <span className="text-primary text-sm font-semibold">→</span>
                          <span className="text-[15px] font-medium text-foreground">{leg.dest_name ?? '–'}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-muted-foreground">{depTime} → {arrTime}</span>
                          {duration && (<><span className="text-border text-xs">•</span><span className="text-sm text-muted-foreground">{duration}</span></>)}
                          {leg.operator && (<><span className="text-border text-xs">•</span><span style={{ ...opStyle, padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{leg.operator}</span></>)}
                          {trainLabel && <span className="text-sm text-primary font-medium">{trainLabel}</span>}
                          {hasDelay && <span className="bg-amber-950/60 border border-amber-500/50 text-amber-400 px-1.5 py-px rounded text-[11px] font-semibold">+{leg.delay_minutes} min</span>}
                          {platform && <span className="bg-secondary border border-border text-muted-foreground px-1.5 py-px rounded text-[11px]">Gl. {platform}</span>}
                        </div>
                        {rs && (
                          <div className="mt-1.5">
                            <span className="bg-secondary border border-border text-primary px-2 py-0.5 rounded text-xs font-medium">
                              {rs.series}{setNum ? ` · ${setNum}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── CTA + shared by ── */}
        <div style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
          marginBottom: 32,
        }}>
          <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
            Geteilt von{' '}
            <span style={{ color: 'hsl(var(--primary))', fontWeight: 500 }}>
              {authorName}
            </span>
          </p>
          <Link
            href="/signup"
            style={{
              display: 'block',
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              padding: '12px 32px',
              borderRadius: 9,
              fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
              width: '100%',
              maxWidth: 320,
              textAlign: 'center',
            }}
          >
            Eigene Reise planen →
          </Link>
        </div>

        {/* ── Footer ── */}
        <div className="pt-5 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground/40">© {new Date().getFullYear()} Railtrax</p>
          <div className="flex gap-5">
            <Link href="/signup" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Registrieren</Link>
            <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Anmelden</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
