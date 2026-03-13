# RailPlanner — Developer Context

> **Paste this file at the start of every Claude Code session.**
> Keep it updated as you make decisions. It is the single source of truth for "what have we already decided and why."

---

## What this project is

A full-stack web app for planning, visualising, and documenting European train journeys. Users can search connections across DB/SBB/ÖBB, build multi-leg trips, visualise routes on a map, check in to Träwelling, and document their journeys in a travel journal. Monetised via freemium subscriptions (Lemon Squeezy).

Full product spec is in `SPEC.md` at the root of this repo.

---

## Stack — non-negotiable decisions

| Layer | Choice | Do not suggest alternatives |
|---|---|---|
| Framework | Next.js 14, App Router, TypeScript | No Pages Router, no Remix |
| Database | Supabase (PostgreSQL) | No PlanetScale, no Neon |
| ORM | Prisma | No Drizzle, no raw SQL in app code |
| Auth | Supabase Auth | No NextAuth, no Clerk |
| Styling | Tailwind CSS + shadcn/ui | No MUI, no Chakra |
| Map | Maplibre GL JS + react-map-gl | No Google Maps, no Leaflet |
| Map tiles | OpenFreeMap (tiles.openfreemap.org) | No API key needed — completely free |
| Billing | Lemon Squeezy | No Stripe — LS handles EU VAT |
| Cache / rate limit | Upstash Redis | No self-hosted Redis |
| Email (outbound) | Resend | No SendGrid, no Nodemailer |
| State management | React built-ins + Zustand for global UI state | No Redux, no Jotai |
| Data fetching | TanStack Query (React Query) v5 | No SWR |
| Forms | React Hook Form + Zod | No Formik |
| Rich text (journal) | Tiptap | No Quill, no Slate |
| Charts (stats page) | Recharts | No Chart.js in this project |
| AI | Anthropic Claude API (server-side only) | Never expose API key to client |
| Deployment | Vercel Hobby (free) | No Railway, no Fly.io |
| Background jobs | Supabase Edge Functions + pg_cron | No separate worker process |
| PDF generation | @react-pdf/renderer (Node.js only) | No client-side PDF libraries |

---

## Project structure

```
railplanner/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup, forgot-password)
│   ├── (app)/                    # Authenticated app shell
│   │   ├── dashboard/            # Trip list
│   │   ├── trips/[id]/           # Trip detail + map
│   │   ├── search/               # Connection search
│   │   ├── stats/                # Statistics + heatmap
│   │   ├── settings/
│   │   │   └── billing/          # Subscription management
│   │   └── layout.tsx            # App shell with nav
│   ├── api/
│   │   ├── billing/
│   │   │   ├── checkout/route.ts # POST → create LS checkout URL
│   │   │   └── webhook/route.ts  # POST → handle LS subscription events
│   │   ├── trips/route.ts
│   │   ├── trips/[id]/route.ts
│   │   ├── legs/route.ts
│   │   ├── legs/[id]/route.ts
│   │   ├── legs/[id]/checkin/route.ts
│   │   ├── search/connections/route.ts
│   │   ├── stations/search/route.ts
│   │   ├── calendar/[token].ics/route.ts
│   │   ├── v1/                   # Public API (Pro only)
│   │   └── health/route.ts
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui primitives (auto-generated, do not edit)
│   ├── map/                      # Map components
│   │   ├── TripMap.tsx
│   │   ├── RouteLayer.tsx
│   │   └── StationMarker.tsx
│   ├── trips/                    # Trip-related components
│   ├── billing/
│   │   └── UpgradeModal.tsx
│   └── shared/                   # Generic shared components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (cookies)
│   │   └── admin.ts              # Service role client (webhooks only)
│   ├── lemonsqueezy.ts           # LS checkout + portal helpers
│   ├── entitlements.ts           # Plan limits + feature gates
│   ├── redis.ts                  # Upstash client
│   ├── ratelimit.ts              # Rate limiting helper
│   ├── hafas.ts                  # DB Hafas connection search
│   └── email.ts                  # Resend helpers
├── hooks/
│   ├── useUser.ts                # Current user + plan
│   ├── useTrips.ts
│   └── useEntitlements.ts        # Client-side gate helpers
├── prisma/
│   └── schema.prisma
├── supabase/
│   ├── migrations/               # SQL migrations
│   └── functions/
│       └── poll-delays/          # Edge function for live delay polling
├── public/
│   └── manifest.json             # PWA manifest
├── CONTEXT.md                    # ← this file
└── SPEC.md                       # Full product spec
```

---

## Database schema summary

All tables defined in `prisma/schema.prisma`. Key relationships:

```
users (1) ──< trips (1) ──< legs
users (1) ──< subscriptions
users (1) ── usage_counters
users (1) ──< tickets
users (1) ──< journal_entries ──< journal_photos
users (1) ──< api_keys
users (1) ──< interrail_passes
users (1) ──< custom_routes
trips (1) ──< legs ──< leg_rolling_stock
legs (1) ──< route_reviews
```

Full SQL in SPEC.md §3.

---

## Auth & session pattern

```typescript
// Server component / API route — always use this
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
// user.app_metadata.plan → 'free' | 'plus' | 'pro'

// Client component — use the hook
import { useUser } from '@/hooks/useUser'
const { user, plan, isLoading } = useUser()
```

**Never use `getSession()` on the server — always `getUser()`.** `getSession()` reads from the cookie without re-validating with Supabase. `getUser()` calls the Supabase Auth server and is authoritative.

The user's subscription plan is stored in `user.app_metadata.plan` (set by the billing webhook). This means plan checks are a JWT decode — no database hit required.

---

## Entitlements pattern

```typescript
import { getPlan, can, getLimit } from '@/lib/entitlements'

// In server API routes
const plan = getPlan(user.app_metadata)
if (!can(plan, 'journal')) return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })

// Limit checks use usage_counters table (O(1) — triggers keep it updated)
const { data: usage } = await supabase.from('usage_counters').select('trips_count').eq('user_id', user.id).single()
if ((usage?.trips_count ?? 0) >= getLimit(plan, 'maxTrips')) { ... }

// In client components
import { useEntitlements } from '@/hooks/useEntitlements'
const { can, getLimit } = useEntitlements()
if (!can('journal')) return <UpgradeModal feature="journal" />
```

**Rule: client gates are UX only. All real enforcement is server-side.**

---

## API response conventions

```typescript
// Success
return NextResponse.json({ data: result }, { status: 200 })

// Created
return NextResponse.json({ data: result }, { status: 201 })

// Auth error
return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

// Plan gate
return NextResponse.json({ error: 'upgrade_required', requiredPlan: 'plus' }, { status: 403 })

// Limit reached
return NextResponse.json({ error: 'limit_reached', limit: 3, current: 3, upgrade: true }, { status: 403 })

// Validation error
return NextResponse.json({ error: 'validation_error', details: zodError.flatten() }, { status: 422 })

// Server error (never expose internal error messages to client)
return NextResponse.json({ error: 'internal_error' }, { status: 500 })
```

---

## Environment variables

All env vars are listed in SPEC.md §11.7. The ones needed from day one:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       ← server only, never NEXT_PUBLIC_
DATABASE_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_STORE_ID
LS_VARIANT_PLUS_MONTHLY
LS_VARIANT_PLUS_YEARLY
LS_VARIANT_PRO_MONTHLY
LS_VARIANT_PRO_YEARLY
NEXT_PUBLIC_URL                 ← e.g. https://railplanner.app
```

Optional (add when those features are being built):
```
ANTHROPIC_API_KEY               ← server only
```

---

## Key rules — always follow these

1. **No raw SQL in app code.** Use Prisma for all DB operations. Exception: Supabase Edge Functions (Deno) use the Supabase client directly.

2. **No `SUPABASE_SERVICE_ROLE_KEY` in client code ever.** Only used in `lib/supabase/admin.ts`, which is only imported in server-side code (API routes, Edge Functions).

3. **All mutations go through API routes**, not Supabase client directly from the browser. This ensures server-side entitlement checks run on every write.

4. **Validate all inputs with Zod** before touching the database. Define schemas in `lib/validators/` and share them between client (form validation) and server (API validation).

5. **Maplibre map instances are expensive.** Never unmount and remount the map on navigation. Use a single persistent map instance in a layout component and update sources/layers programmatically.

6. **The Lemon Squeezy webhook endpoint must not use Next.js body parsing.** It needs the raw body to verify the HMAC signature. Export `config = { api: { bodyParser: false } }` from the route.

7. **Supabase free tier pauses after 1 week of inactivity.** The `/api/health` endpoint + UptimeRobot ping (every 5 min) prevents this. Do not remove the health endpoint.

8. **All Overpass API calls are server-side and cached** in Upstash Redis with a 7-day TTL. Never call Overpass from the browser — rate limits are per-IP.

9. **Connection search results are cached** in Redis for 5 minutes per (origin, destination, datetime, operators) key. Cache key format: `search:{originIbnr}:{destIbnr}:{datetimeHour}:{operators}`.

10. **AI features (Claude API) are server-side only.** Never import the Anthropic SDK in any file that could end up in the browser bundle.

---

## What has been built (update this as you go)

### ✅ Done
- [x] Next.js 14 App Router scaffold (TypeScript, Tailwind CSS, ESLint)
- [x] shadcn/ui configured (zinc base, CSS variables, default theme)
- [x] Prisma schema — all 16 models (users, trips, legs, tickets, journal_entries, journal_photos, route_reviews, interrail_passes, achievements, user_achievements, api_keys, subscriptions, usage_counters, custom_routes, rolling_stock, leg_rolling_stock)
- [x] lib/supabase/client.ts, server.ts, admin.ts created
- [x] app/api/health/route.ts created
- [x] supabase/migrations/20260312000000_storage_and_triggers.sql — storage buckets (tickets, journal-photos, avatars) + RLS policies + usage_counter triggers
- [x] Dependencies installed: @supabase/supabase-js, @supabase/ssr, prisma, zod, react-hook-form, @tanstack/react-query v5, zustand, @upstash/redis, @upstash/ratelimit, resend
- [x] Root layout and placeholder homepage with RailPlanner branding
- [x] Auth pages: /login (email+password + Google OAuth), /signup (email+password+username), /forgot-password
- [x] app/auth/callback/route.ts — OAuth code exchange handler
- [x] middleware.ts — session refresh on every request; redirects unauthenticated → /login, authenticated away from auth routes → /dashboard
- [x] hooks/useUser.ts — { user, plan, isLoading } using onAuthStateChange
- [x] lib/entitlements.ts — PLAN_LIMITS, getPlan, can, getLimit
- [x] app/(app)/layout.tsx — sidebar with nav (Dashboard, Search, Stats, Settings), user avatar, sign-out
- [x] app/(app)/dashboard/page.tsx — placeholder dashboard
- [x] supabase/migrations/20260313000000_handle_new_user.sql — trigger creates public.users + usage_counters on auth.users INSERT
- [x] components/shared/SignOutButton.tsx
- [x] hooks/useEntitlements.ts — { plan, can, getLimit } client hook
- [x] lib/lemonsqueezy.ts — createCheckoutUrl(), getCustomerPortalUrl()
- [x] app/api/billing/checkout/route.ts — POST, creates LS checkout URL
- [x] app/api/billing/webhook/route.ts — handles subscription_created/updated/resumed/cancelled/expired/payment_failed; raw body, HMAC verification
- [x] components/billing/UpgradeModal.tsx — dialog with monthly/yearly toggle, upgrades to Plus or Pro
- [x] app/(app)/settings/billing/page.tsx + BillingClient.tsx — plan badge, usage bars, upgrade cards, portal link, cancellation warning
- [x] app/api/trips/route.ts — GET list, POST create (auth + usage limit check)
- [x] app/api/trips/[id]/route.ts — GET, PUT, DELETE (ownership enforced)
- [x] app/api/legs/route.ts — POST create (auth + trip ownership + per-trip leg limit)
- [x] app/api/legs/[id]/route.ts — GET, PUT, DELETE (ownership via trip relation)
- [x] hooks/useTrips.ts — useTrips, useTrip, useCreateTrip, useUpdateTrip, useDeleteTrip, useCreateLeg, useUpdateLeg, useDeleteLeg (all with query invalidation)
- [x] components/trips/TripCard.tsx — card with status badge, date range, leg count
- [x] components/trips/NewTripSheet.tsx — RHF + Zod form, creates trip, navigates to detail
- [x] components/trips/LegEditorSheet.tsx — RHF + Zod form, dual create/edit, all leg fields
- [x] components/trips/LegCard.tsx — timeline item with operator badge, delay badge, edit/delete
- [x] app/(app)/dashboard/page.tsx — trip grid, New trip button with UpgradeModal gate
- [x] app/(app)/trips/[id]/page.tsx — trip header, leg timeline, Add leg button; wired to TripMap
- [x] maplibre-gl + react-map-gl installed; db-vendo-client installed (replaced db-hafas — DB shut down old HAFAS API permanently)
- [x] next.config.mjs — serverExternalPackages: ['db-vendo-client']
- [x] lib/hafas.ts — getHafas() singleton, fetchPolyline() with Hafas departure search + fallback
- [x] hooks/useTrips.ts Leg type — added originLat/Lon, destLat/Lon, polyline: [number, number][] | null
- [x] components/map/TripMap.tsx — react-map-gl Map with Stadia style, useRef<MapRef>, fitBounds on load, OpenRailwayMap overlay toggle (70% opacity), NavigationControl
- [x] components/map/RouteLayer.tsx — GeoJSON LineString per leg; uses polyline if stored, else straight line; colours per operator
- [x] components/map/StationMarker.tsx — circle Marker + Popup with station name, planned/actual time, delay
- [x] app/api/trips/[id]/polylines/route.ts — lazily fetches Hafas polylines for legs that have IBNR + trainNumber; falls back silently
- [x] lib/hafas-types.ts — shared types: HafasStation, HafasDeparture, HafasStopover, HafasJourney (used by API routes and client components)
- [x] lib/hafas.ts — added searchStations(), getDepartures(), getJourney(), getJourneyByTrainNumber() (searches major German hubs by full-day departures)
- [x] hooks/useDebounce.ts — generic useDebounce<T> hook
- [x] hooks/useTrips.ts — apiFetch exported (was private)
- [x] app/api/stations/search/route.ts — GET ?q=… → HafasStation[]
- [x] app/api/departures/route.ts — GET ?ibnr=…&when=… → HafasDeparture[]
- [x] app/api/journey/route.ts — GET ?tripId=… → HafasJourney
- [x] app/api/trains/route.ts — GET ?number=…&date=… → HafasJourney or 404
- [x] components/trips/LegEditorSheet.tsx — full redesign: 3-tab sheet (Departures / Train / Manual); Departures tab: station autocomplete + datetime picker → departure list → journey confirm; Train tab: train number + date + find button → journey confirm; journey confirm: board/alight selects with preview, seat/notes, submit; Manual tab: existing RHF form preserved

- [x] app/(app)/search/page.tsx — connection search: station autocomplete (StationInput, debounce 300ms), swap button, date/time pickers, 1st/2nd class toggle, TanStack Query search (enabled by searchParams state), recent searches in localStorage (max 5, chip quick-picks), 3 skeleton loading cards, 503/empty/error states
- [x] components/search/StationInput.tsx — controlled station autocomplete, /api/stations/search, dropdown with 6 results, debounce 300ms
- [x] components/search/JourneyCard.tsx — result card: departure→arrival + duration + transfers, route strip (station dots + coloured segments + train labels per leg type), operator badges, expand chevron → intermediate stops via /api/search/trip (useQueries, lazy fetch per leg, Skeleton loading)
- [x] components/search/AddToTripSheet.tsx — sheet: list user trips + inline "create new trip" form; posts each JourneyLeg to /api/legs sequentially; redirects to /trips/[id] on success
- [x] app/(app)/search/loading.tsx — Suspense skeleton for search page

- [x] app/(app)/dashboard/loading.tsx, trips/[id]/loading.tsx, settings/billing/loading.tsx — Suspense streaming skeletons matching each page's layout
- [x] trips/[id]/page.tsx — TripMap dynamic() loading prop prevents CLS while maplibre bundle downloads
- [x] app/layout.tsx — Inter font display:'swap' prevents invisible text during load
- [x] prisma/schema.prisma — idx_trips_user_status_created, idx_legs_trip_departure, idx_legs_status_departure
- [x] supabase/migrations/20260313000002_performance_indexes.sql — same indexes as raw SQL for Supabase SQL editor

- [x] app/api/stats/route.ts — GET (auth required): sums distance_km + counts completed legs/trips, derives total_hours from departure/arrival diff, extracts country codes from IBNRs (80=DE 85=AT 88=CH 87=FR); free plan gets base stats + upgradeRequired:true; plus/pro also get co2_saved_kg = total_km × 0.22
- [x] app/(app)/stats/page.tsx — 4 stat cards (Total distance, Completed trips, Time on trains, Countries visited), CO2 card (Plus only, locked with UpgradeModal for free), placeholder heatmap + chart cards locked for free
- [x] public/manifest.json — PWA manifest: name "Railtripper", theme_color "#E32228", display "standalone", start_url "/dashboard", icons at 192px and 512px
- [x] @ducanh2912/next-pwa installed; next.config.mjs wrapped with withPWA: NetworkFirst /api/*, CacheFirst _next/static/*, CacheFirst OpenFreeMap tiles (max 500, 30d TTL), StaleWhileRevalidate for page navigations; disabled in development
- [x] app/layout.tsx — added <link rel="manifest">, <meta name="theme-color" content="#E32228">, <meta name="apple-mobile-web-app-capable">

- [x] app/api/journal/route.ts — GET ?tripId= (list entries with photos) + POST (Plus/Pro gate, trip ownership check, optional leg validation)
- [x] app/api/journal/[id]/route.ts — GET, PUT, DELETE (ownership enforced)
- [x] app/api/journal/[id]/photos/route.ts — POST multipart: sharp resize to max 2000px → JPEG 85%, upload to journal-photos/{userId}/{entryId}/{uuid}.jpg, increment usage_counters
- [x] app/api/stats/heatmap/route.ts — GET (Plus/Pro gate): returns GeoJSON FeatureCollection of all leg polylines (falls back to straight line); consumed by HeatmapMap on stats page
- [x] @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/html installed; sharp + yet-another-react-lightbox installed
- [x] lib/validators/journal.ts — createJournalEntrySchema + updateJournalEntrySchema (Zod)
- [x] hooks/useJournal.ts — useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry (TanStack Query with invalidation)
- [x] components/journal/JournalEditor.tsx — Tiptap editor (StarterKit + Image + Link + Placeholder); toolbar (Bold/Italic/BulletList/Link/ImageUpload); mood emoji picker; 30s autosave (debounced); creates entry on first save (POST), updates on subsequent saves (PUT); image upload creates entry first if needed
- [x] components/journal/JournalEntryCard.tsx — read-only; generateHTML from @tiptap/html; mood + timestamp + location header; photo grid (3-col); yet-another-react-lightbox on photo click; edit/delete on hover
- [x] app/(app)/trips/[id]/page.tsx — reworked timeline: leg-linked entries appear indented below their leg; floating entries in "General entries" section; "Add entry" button (gated behind Plus via UpgradeModal); "add journal entry for this leg" inline link per leg; journal editor rendered as fixed modal overlay
- [x] Trip export (PDF + image) — @react-pdf/renderer for PDF, @vercel/og for image; static map from OpenStreetMap staticmap API; Export button in trip detail header (DropdownMenu with PDF/Image options); available to all users

### 🚧 In progress
- (nothing — Session 10 complete)

### ⏳ Not started
- Fill .env.local with real Supabase/LS/Upstash credentials, then run `npx prisma db push`
- Run storage bucket + trigger SQL in Supabase SQL editor
- Run supabase/migrations/20260313000000_handle_new_user.sql in Supabase SQL editor
- Enable Google OAuth in Supabase dashboard (Authentication → Providers → Google)
- Everything in SPEC.md §12 Phase 1 beyond auth (trips CRUD, connection search, map)

---

## Known issues & decisions log

*Add entries here whenever you make a non-obvious decision or hit a gotcha. Format: date — decision — reason.*

- 2026-03-12 — Chose Lemon Squeezy over Stripe — handles EU VAT automatically as Merchant of Record, no VAT registration needed in each country
- 2026-03-12 — Chose Upstash Redis over Vercel KV — better free tier limits (10k commands/day vs Vercel KV's 3k/day)
- 2026-03-12 — Using `db-hafas` npm package for DB connection search — community-maintained Hafas client, more reliable than scraping DB Navigator
- 2026-03-13 — shadcn/ui re-initialised with style=default, zinc base — initial scaffold had picked up "base-nova" style which lacks the form component
- 2026-03-13 — New user trigger (handle_new_user) derives username from raw_user_meta_data.username at signup; falls back to email-prefix + UUID suffix for OAuth signups where no username is set
- 2026-03-13 — db-hafas is ESM-only; added to serverExternalPackages in next.config.mjs so Next.js doesn't bundle it (Node.js loads it natively via dynamic import in the API route)
- 2026-03-13 — Migrated from db-hafas to db-vendo-client — old HAFAS API was shut down by DB permanently; db-vendo-client uses the DB Navigator API (dbnav profile) with withRetrying() wrapper; p-retry installed as required peer; types/db-vendo-client.d.ts added since the package ships no TypeScript declarations
- 2026-03-13 — Polyline stored as [[lon, lat], [lon, lat], ...] (GeoJSON coordinate pairs) in the `polyline Json?` Prisma field; RouteLayer reads this directly as GeoJSON LineString coordinates
- 2026-03-13 — TripMap is dynamically imported (next/dynamic, ssr: false) in the trip detail page to avoid SSR issues with maplibre-gl; the Map component itself is never conditionally rendered inside TripMap
- 2026-03-13 — Performance audit: added loading.tsx for dashboard, trips/[id], settings/billing (Suspense streaming); added loading prop to TripMap dynamic() to prevent CLS during bundle download; added display:'swap' to Inter font; added 3 DB indexes (trips user+status+created, legs trip+departure, legs status+departure); verified no Supabase data queries run in client components
- 2026-03-13 — Added trip_id_vendo to legs table (migration 20260313000004). LegEditorSheet and AddToTripSheet now save the Vendo tripId on leg creation. polylines/route.ts uses it directly via getTripById() (fast path) instead of re-scanning the departure board (slow path). RouteLayer draws a dashed straight line between origin/dest coords when the real polyline hasn't been fetched yet — ensures something is always visible on the map.
- 2026-03-13 — Switched map tiles from Stadia Maps to OpenFreeMap (tiles.openfreemap.org). Completely free with no API key or tile limits. Works directly with existing MapLibre setup. Using positron style (clean light/grey — coloured route lines stand out clearly).
- 2026-03-13 — Replaced db-hafas with db-vendo-client (dbnav profile). Old DB HAFAS API shut down permanently 2025. Vendo wraps DB Navigator + bahn.de APIs. Rate limits stricter than HAFAS — Redis caching is critical. lib/vendo.ts centralises all transit lookups with Redis TTLs (stations 24h, departures 2min, trip 5min, journeys 5min). API routes under /api/search/* and /api/stations/search all enforce 30 req/user/min via Upstash Ratelimit (slidingWindow); HafasError or any vendo error → 503 { error: 'service_unavailable', retryAfter: 30 }.
- 2026-03-13 — Implemented trip export (PDF + image) using @react-pdf/renderer for PDF and @vercel/og (ImageResponse) for image. Static map tiles from OpenStreetMap staticmap API (no key needed). No files stored in Supabase. Export available to all users (free included).
