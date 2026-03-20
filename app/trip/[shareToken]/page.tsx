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

   const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://railtrax.eu'
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

  const statChips = [
    { label: 'ZÜGE', value: `${legs.length}` },
    ...(totalDistanceKm > 0 ? [{ label: 'STRECKE', value: `${Math.round(totalDistanceKm).toLocaleString('de-DE')} km` }] : []),
    ...(totalDurationMs > 0 ? [{ label: 'DAUER', value: formatTotalDuration(totalDurationMs) }] : []),
    ...(countries.length > 0 ? [{ label: 'LÄNDER', value: `${countries.map(c => c.flag).join('')} ${countries.length}` }] : []),
  ]

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
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Top grid: info card + map */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">

          {/* ── Left: info card ── */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-5">

            {/* Title + description */}
            <div>
              <h1 className="text-xl font-semibold text-foreground leading-snug mb-1.5">
                {trip.title}
              </h1>
              {trip.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{trip.description}</p>
              )}
            </div>

            {/* Stats chips */}
            <div className="grid grid-cols-2 gap-2">
              {statChips.map(chip => (
                <div key={chip.label} className="bg-secondary border border-border rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/60 font-semibold tracking-widest uppercase mb-1">
                    {chip.label}
                  </p>
                  <p className="text-[15px] font-semibold text-foreground">{chip.value}</p>
                </div>
              ))}
            </div>

            {/* Date */}
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-semibold tracking-widest uppercase mb-1">
                Datum
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(trip.start_date, trip.end_date)}
              </p>
            </div>

            {/* Operators */}
            {uniqueOperators.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-semibold tracking-widest uppercase mb-2">
                  Betreiber
                </p>
                <div className="flex gap-1.5 flex-wrap">
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
              <div className="bg-success/10 border border-success/20 rounded-lg px-3.5 py-3 flex gap-2.5 items-start">
                <LeafIcon size={16} className="text-success mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-success">
                    {co2SavedKg.toLocaleString('de-DE')} kg CO₂ gespart vs. Fliegen
                  </p>
                  {treesEquiv > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      entspricht {treesEquiv} {treesEquiv === 1 ? 'Baum' : 'Bäumen'} pro Jahr
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Divider + shared by + CTA */}
            <div className="border-t border-border pt-4 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Geteilt von{' '}
                <span className="text-primary font-medium">{authorName}</span>
              </p>
              <Link
                href="/signup"
                className="block text-center py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Eigene Reise planen →
              </Link>
            </div>
          </div>

          {/* ── Right: map ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden h-[480px]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <TripMap legs={legs as any} />
          </div>
        </div>

        {/* ── Legs timeline card ── */}
        <div className="mt-6 bg-card border border-border rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-border flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold text-foreground">Streckenverlauf</h2>
            <span className="bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-md text-xs">
              {legs.length} {legs.length === 1 ? 'Abschnitt' : 'Abschnitte'}
            </span>
          </div>

          <div className="p-6">
            {legs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
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
                    <div key={leg.id} className={`relative flex gap-4 ${isLast ? '' : 'pb-7'}`}>
                      {/* Connecting dotted line */}
                      {!isLast && (
                        <div className="absolute left-[15px] top-9 bottom-0 border-l-2 border-dashed border-border pointer-events-none" />
                      )}

                      {/* Number badge */}
                      <div className="w-8 h-8 shrink-0 bg-secondary border border-border rounded-lg flex items-center justify-center text-[13px] font-semibold text-primary relative z-10">
                        {index + 1}
                      </div>

                      {/* Leg content */}
                      <div className="flex-1 min-w-0">
                        {/* Station names row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[15px] font-medium text-foreground">
                            {leg.origin_name ?? '–'}
                          </span>
                          <span className="text-primary text-sm font-semibold">→</span>
                          <span className="text-[15px] font-medium text-foreground">
                            {leg.dest_name ?? '–'}
                          </span>
                        </div>

                        {/* Details row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-muted-foreground">
                            {depTime} → {arrTime}
                          </span>

                          {duration && (
                            <>
                              <span className="text-border text-xs">•</span>
                              <span className="text-sm text-muted-foreground">{duration}</span>
                            </>
                          )}

                          {leg.operator && (
                            <>
                              <span className="text-border text-xs">•</span>
                              <span style={{ ...opStyle, padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                {leg.operator}
                              </span>
                            </>
                          )}

                          {trainLabel && (
                            <span className="text-sm text-primary font-medium">{trainLabel}</span>
                          )}

                          {hasDelay && (
                            <span className="bg-amber-950/60 border border-amber-500/50 text-amber-400 px-1.5 py-px rounded text-[11px] font-semibold">
                              +{leg.delay_minutes} min
                            </span>
                          )}

                          {platform && (
                            <span className="bg-secondary border border-border text-muted-foreground px-1.5 py-px rounded text-[11px]">
                              Gl. {platform}
                            </span>
                          )}
                        </div>

                        {/* Rolling stock chip */}
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

        {/* ── Footer ── */}
        <div className="mt-10 pt-5 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground/40">
            © {new Date().getFullYear()} Railtrax
          </p>
          <div className="flex gap-5">
            <Link href="/signup" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Registrieren
            </Link>
            <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Anmelden
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
