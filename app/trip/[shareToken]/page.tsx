import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TripMap } from '@/components/map/TripMapClient'
import { Logo } from '@/components/ui/Logo'
import { LeafIcon } from '@/components/ui/icons/LeafIcon'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ shareToken: string }>
}

interface RollingStockRef {
  set_number?: string | null
  rolling_stock?: { series: string; operator: string } | null
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

const IBNR_COUNTRIES: Record<string, { flag: string; name: string }> = {
  '80': { flag: '🇩🇪', name: 'Deutschland' },
  '81': { flag: '🇦🇹', name: 'Österreich' },
  '82': { flag: '🇱🇺', name: 'Luxemburg' },
  '83': { flag: '🇧🇪', name: 'Belgien' },
  '84': { flag: '🇳🇱', name: 'Niederlande' },
  '85': { flag: '🇨🇭', name: 'Schweiz' },
  '86': { flag: '🇪🇸', name: 'Spanien' },
  '87': { flag: '🇫🇷', name: 'Frankreich' },
  '88': { flag: '🇭🇺', name: 'Ungarn' },
  '70': { flag: '🇬🇧', name: 'Großbritannien' },
  '79': { flag: '🇮🇹', name: 'Italien' },
}

function getCountries(legs: TripLeg[]): { flag: string; name: string }[] {
  const seen = new Set<string>()
  const result: { flag: string; name: string }[] = []
  for (const leg of legs) {
    for (const ibnr of [leg.origin_ibnr, leg.dest_ibnr]) {
      if (!ibnr) continue
      const prefix = ibnr.slice(0, 2)
      if (!seen.has(prefix) && IBNR_COUNTRIES[prefix]) {
        seen.add(prefix)
        result.push(IBNR_COUNTRIES[prefix])
      }
    }
  }
  return result
}

function getOperatorStyle(operator: string | null | undefined): { background: string; color: string; border: string } {
  const op = (operator ?? '').toUpperCase()
  if (op.includes('DB') || op.includes('ICE')) return { background: '#2d0a0a', color: '#E32228', border: '1px solid #E32228' }
  if (op.includes('SBB') || op.includes('TPF') || op.includes('MOB') || op.includes('RHB') || op.includes('BLS'))
    return { background: '#2d0a0a', color: '#EB0000', border: '1px solid #EB0000' }
  if (op.includes('ÖBB') || op.includes('OBB') || op.includes('WESTbahn'))
    return { background: '#2d0a0a', color: '#C8102E', border: '1px solid #C8102E' }
  if (op.includes('SNCF') || op.includes('TGV') || op.includes('OUIGO') || op.includes('TRANSILIEN'))
    return { background: '#2a1500', color: '#E05206', border: '1px solid #E05206' }
  if (op.includes('EUROSTAR') || op.includes('THALYS'))
    return { background: '#1a1500', color: '#FBBF24', border: '1px solid #FBBF24' }
  if (op.includes('NS') || op.includes('ARRIVA'))
    return { background: '#1a1500', color: '#EAB308', border: '1px solid #EAB308' }
  if (op.includes('RENFE')) return { background: '#2d0a0a', color: '#e25555', border: '1px solid #e25555' }
  if (op.includes('FLIX')) return { background: '#0a1f0a', color: '#74B43A', border: '1px solid #74B43A' }
  if (op.includes('TRENITALIA') || op.includes('ITALO') || op.includes('FS'))
    return { background: '#1a1a0a', color: '#84cc16', border: '1px solid #84cc16' }
  return { background: '#0d1f3c', color: '#8ba3c7', border: '1px solid #1e3a6e' }
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

  return {
    title: `${trip.title} – Railtrax`,
    description: desc,
    openGraph: {
      title: trip.title,
      description: desc,
      images: [`/api/og/trip/${shareToken}`],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: trip.title,
      description: desc,
      images: [`/api/og/trip/${shareToken}`],
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
      *,
      legs(
        *,
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
  const treesEquiv = Math.round(co2SavedKg / 22)

  const countries = getCountries(legs)
  const uniqueOperators = [...new Set(legs.map(l => l.operator).filter(Boolean))] as string[]

  const authorName = (trip.user as { username?: string; display_name?: string } | null)?.display_name
    || (trip.user as { username?: string; display_name?: string } | null)?.username
    || 'Unbekannt'

  // ── Stats chips ────────────────────────────────────────────────────────────
  const statChips = [
    { label: 'ZÜGE', value: `${legs.length}` },
    ...(totalDistanceKm > 0 ? [{ label: 'STRECKE', value: `${Math.round(totalDistanceKm).toLocaleString('de-DE')} km` }] : []),
    ...(totalDurationMs > 0 ? [{ label: 'DAUER', value: formatTotalDuration(totalDurationMs) }] : []),
    ...(countries.length > 0 ? [{ label: 'LÄNDER', value: `${countries.map(c => c.flag).join('')} ${countries.length}` }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#080d1a', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Navbar ── */}
      <nav style={{ background: '#080d1a', borderBottom: '1px solid #1e2d4a', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo size="md" />
          </Link>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/login" style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              background: '#0a1628', border: '1px solid #1e2d4a', color: '#8ba3c7',
              textDecoration: 'none',
            }}>
              Anmelden
            </Link>
            <Link href="/signup" style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              background: '#4f8ef7', color: '#ffffff', textDecoration: 'none',
            }}>
              Kostenlos starten
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 16px' }}>

        {/* Top grid: info card + map */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left: info card ── */}
          <div style={{ background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Title + description */}
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 500, color: '#ffffff', margin: 0, marginBottom: 6, lineHeight: 1.3 }}>
                {trip.title}
              </h1>
              {trip.description && (
                <p style={{ fontSize: 14, color: '#4a6a9a', margin: 0, lineHeight: 1.5 }}>
                  {trip.description}
                </p>
              )}
            </div>

            {/* Stats chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {statChips.map(chip => (
                <div key={chip.label} style={{ background: '#0d1f3c', border: '1px solid #1e3a6e', borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ fontSize: 10, color: '#4a6a9a', margin: 0, marginBottom: 4, letterSpacing: '0.08em', fontWeight: 600 }}>
                    {chip.label}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', margin: 0 }}>
                    {chip.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Date */}
            <div>
              <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 4, letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
                Datum
              </p>
              <p style={{ fontSize: 14, color: '#8ba3c7', margin: 0 }}>
                {formatDateRange(trip.start_date, trip.end_date)}
              </p>
            </div>

            {/* Operators */}
            {uniqueOperators.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 8, letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
                  Betreiber
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {uniqueOperators.map(op => {
                    const s = getOperatorStyle(op)
                    return (
                      <span key={op} style={{ ...s, padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>
                        {op}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CO₂ */}
            {co2SavedKg > 0 && (
              <div style={{ background: '#0d2618', border: '1px solid #1a4a2e', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <LeafIcon size={16} style={{ color: '#3ecf6e', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#3ecf6e', margin: 0 }}>
                    {co2SavedKg.toLocaleString('de-DE')} kg CO₂ gespart vs. Fliegen
                  </p>
                  {treesEquiv > 0 && (
                    <p style={{ fontSize: 12, color: '#4a6a9a', margin: 0, marginTop: 2 }}>
                      entspricht {treesEquiv} {treesEquiv === 1 ? 'Baum' : 'Bäumen'} pro Jahr
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Divider + shared by + CTA */}
            <div style={{ borderTop: '1px solid #1e2d4a', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#4a6a9a', margin: 0 }}>
                Geteilt von{' '}
                <span style={{ color: '#4f8ef7', fontWeight: 500 }}>{authorName}</span>
              </p>
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center', padding: '10px 0',
                background: '#4f8ef7', color: '#ffffff', borderRadius: 8,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}>
                Eigene Reise planen →
              </Link>
            </div>
          </div>

          {/* ── Right: map ── */}
          <div style={{ background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 12, overflow: 'hidden', height: 480 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <TripMap legs={legs as any} />
          </div>
        </div>

        {/* ── Legs timeline card ── */}
        <div style={{ marginTop: 24, background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 12, overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e2d4a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: '#ffffff', margin: 0 }}>
              Streckenverlauf
            </h2>
            <span style={{ background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4a6a9a', padding: '2px 8px', borderRadius: 5, fontSize: 12 }}>
              {legs.length} {legs.length === 1 ? 'Abschnitt' : 'Abschnitte'}
            </span>
          </div>

          <div style={{ padding: '24px' }}>
            {legs.length === 0 ? (
              <p style={{ color: '#4a6a9a', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                Keine Abschnitte vorhanden
              </p>
            ) : (
              <div>
                {legs.map((leg, index) => {
                  const isLast = index === legs.length - 1
                  const opStyle = getOperatorStyle(leg.operator)
                  const duration = formatLegDuration(leg.planned_departure, leg.planned_arrival)
                  const depTime = formatTime(leg.planned_departure)
                  const arrTime = formatTime(leg.planned_arrival)
                  const platform = leg.platform_actual ?? leg.platform_planned
                  const trainLabel = [leg.train_type, leg.train_number].filter(Boolean).join(' ')
                  const rs = leg.leg_rolling_stock?.[0]?.rolling_stock
                  const setNum = leg.leg_rolling_stock?.[0]?.set_number
                  const hasDelay = (leg.delay_minutes ?? 0) > 0

                  return (
                    <div key={leg.id} style={{ position: 'relative', display: 'flex', gap: 16, paddingBottom: isLast ? 0 : 28 }}>
                      {/* Connecting dotted line */}
                      {!isLast && (
                        <div style={{
                          position: 'absolute',
                          left: 15, top: 36, bottom: 0,
                          borderLeft: '2px dashed #1e3a6e',
                          pointerEvents: 'none',
                        }} />
                      )}

                      {/* Number badge */}
                      <div style={{
                        width: 32, height: 32, flexShrink: 0,
                        background: '#0d1f3c', border: '1px solid #1e3a6e',
                        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600, color: '#4f8ef7',
                        position: 'relative', zIndex: 1,
                      }}>
                        {index + 1}
                      </div>

                      {/* Leg content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Station names row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 500, color: '#ffffff' }}>
                            {leg.origin_name ?? '–'}
                          </span>
                          <span style={{ color: '#4f8ef7', fontSize: 14, fontWeight: 600 }}>→</span>
                          <span style={{ fontSize: 15, fontWeight: 500, color: '#ffffff' }}>
                            {leg.dest_name ?? '–'}
                          </span>
                        </div>

                        {/* Details row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {/* Time */}
                          <span style={{ fontSize: 13, color: '#4a6a9a' }}>
                            {depTime} → {arrTime}
                          </span>

                          {/* Duration */}
                          {duration && (
                            <>
                              <span style={{ color: '#1e3a6e', fontSize: 12 }}>•</span>
                              <span style={{ fontSize: 13, color: '#4a6a9a' }}>{duration}</span>
                            </>
                          )}

                          {/* Operator badge */}
                          {leg.operator && (
                            <>
                              <span style={{ color: '#1e3a6e', fontSize: 12 }}>•</span>
                              <span style={{
                                ...opStyle,
                                padding: '1px 7px', borderRadius: 4,
                                fontSize: 11, fontWeight: 600,
                              }}>
                                {leg.operator}
                              </span>
                            </>
                          )}

                          {/* Train number */}
                          {trainLabel && (
                            <span style={{ fontSize: 13, color: '#4f8ef7', fontWeight: 500 }}>
                              {trainLabel}
                            </span>
                          )}

                          {/* Delay badge */}
                          {hasDelay && (
                            <span style={{
                              background: '#2a1500', border: '1px solid #f59e0b',
                              color: '#f59e0b', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            }}>
                              +{leg.delay_minutes} min
                            </span>
                          )}

                          {/* Platform badge */}
                          {platform && (
                            <span style={{
                              background: '#0d1f3c', border: '1px solid #1e3a6e',
                              color: '#8ba3c7', padding: '1px 7px', borderRadius: 4, fontSize: 11,
                            }}>
                              Gl. {platform}
                            </span>
                          )}
                        </div>

                        {/* Rolling stock chip */}
                        {rs && (
                          <div style={{ marginTop: 6 }}>
                            <span style={{
                              background: '#0d1f3c', border: '1px solid #1e3a6e',
                              color: '#4f8ef7', padding: '2px 9px', borderRadius: 5,
                              fontSize: 12, fontWeight: 500,
                            }}>
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

        {/* ── Footer ── */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: '#1e3a6e', margin: 0 }}>
            © {new Date().getFullYear()} Railtrax
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/signup" style={{ fontSize: 13, color: '#4a6a9a', textDecoration: 'none' }}>
              Registrieren
            </Link>
            <Link href="/login" style={{ fontSize: 13, color: '#4a6a9a', textDecoration: 'none' }}>
              Anmelden
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
