# RailPlanner — Product Specification

> **Version:** 0.3 (added: billing & subscriptions, free-tier hosting strategy)
> **Purpose:** Full-stack web app + public API for planning, visualising, and documenting train journeys across Europe.
> **Target stack (suggested):** Next.js 14 (App Router), TypeScript, Supabase (Postgres + Auth + Storage), Prisma ORM, Tailwind CSS, shadcn/ui, Maplibre GL JS / React Map GL, Lemon Squeezy (billing)

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [User Roles & Auth](#2-user-roles--auth)
3. [Data Model](#3-data-model)
4. [Feature Modules](#4-feature-modules)
   - 4.1 Connection Search
   - 4.2 Trip Planning & Management
   - 4.3 Map Visualisation
   - 4.4 Check-in & Träwelling Integration
   - 4.5 Import (DB Navigator, SBB, ÖBB, E-Mail)
   - 4.6 Ticket Wallet
   - 4.7 Live Tracking & Notifications
   - 4.8 Statistics & Heatmap
   - 4.9 Travel Journal
   - 4.10 Streckenbewertungen (Route Reviews)
   - 4.11 Gamification & Achievements
   - 4.12 Interrail Tracker
   - 4.13 Collaborative Trip Planning
   - 4.14 AI Travel Suggestions
   - 4.15 Sharing & Embed
   - 4.16 Kalender-Export
   - 4.17 Packlisten
   - 4.18 Custom Routes (Freie Streckenplanung)
   - 4.19 POI entlang der Strecke
   - 4.20 OpenRailwayMap Integration
   - 4.21 Baureihen & Fahrzeuginfo
5. [Public REST API](#5-public-rest-api)
6. [Mobile Integration (Android / iOS)](#6-mobile-integration-android--ios)
7. [Third-Party Integrations](#7-third-party-integrations)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Tech Stack Details](#9-tech-stack-details)
10. [Billing & Subscriptions](#10-billing--subscriptions)
11. [Free-Tier Hosting Strategy](#11-free-tier-hosting-strategy)
12. [Phased Rollout](#12-phased-rollout)

---

## 1. Vision & Goals

RailPlanner is **the** platform for train travellers in Europe. It covers the full journey lifecycle:

```
Search → Plan → Organise → Travel (check-in, live info) → Document → Reflect
```

**Core differentiators vs. existing apps:**
- Works across all major European operators (DB, SBB, ÖBB, SNCF, NS, Eurostar, …) through a unified abstraction layer
- First-class map visualisation of every trip — not just a list of connections
- API-first: everything the web UI can do, third-party apps can do too
- Deep Träwelling integration — check in in one tap, no copy-pasting
- Community route reviews that no official operator app has
- Rich travel history, statistics, and journaling
- Custom route creation for scenic or exploratory trips not tied to a fixed timetable
- Rolling stock info per leg — know what train you're actually sitting in before you board

---

## 2. User Roles & Auth

| Role | Description |
|---|---|
| `guest` | Can use connection search and view public trips. Cannot save anything. |
| `free` | Default after signup. Access to core planning features within limits (see §10). |
| `plus` | Paid tier (€4/mo). Unlocks journal, ticket wallet, full statistics, notifications. |
| `pro` | Paid tier (€8/mo). Everything in Plus + API access, collaborative trips, AI suggestions. |
| `api_user` | Any `pro` user who has issued API keys for third-party apps. |
| `admin` | Moderation of route reviews, abuse reports. Internal use only. |

**Auth providers:** Email + password, Google OAuth, GitHub OAuth (for devs building on the API).

**Sessions:** JWT via Supabase Auth. Refresh tokens stored in httpOnly cookies.

**Subscription state** is stored in the `subscriptions` table (§3.12) and cached in the user's JWT custom claims for zero-latency gate checks on every request.

---

## 3. Data Model

### 3.1 Users

```sql
users (
  id          uuid PRIMARY KEY,
  email       text UNIQUE NOT NULL,
  username    text UNIQUE NOT NULL,
  display_name text,
  avatar_url  text,
  home_station text,          -- EVA number or IBNR
  traewelling_token text,     -- OAuth token for Träwelling
  created_at  timestamptz DEFAULT now()
)
```

### 3.2 Trips

A **Trip** is a named journey that contains one or more **Legs**.

```sql
trips (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  title       text NOT NULL,             -- e.g. "Interrail Sommer 2025"
  description text,
  status      text CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  start_date  date,
  end_date    date,
  is_public   boolean DEFAULT false,
  share_token text UNIQUE,               -- for public share links
  interrail_pass_id uuid,                -- optional link to an Interrail pass
  created_at  timestamptz DEFAULT now()
)
```

### 3.3 Legs

A **Leg** is one train ride (one vehicle, one departure → one arrival).

```sql
legs (
  id                uuid PRIMARY KEY,
  trip_id           uuid REFERENCES trips(id),
  position          int NOT NULL,        -- ordering within the trip

  -- Origin
  origin_name       text NOT NULL,
  origin_ibnr       text,               -- IBNR / UIC station code
  origin_lat        float,
  origin_lon        float,
  planned_departure timestamptz NOT NULL,
  actual_departure  timestamptz,

  -- Destination
  dest_name         text NOT NULL,
  dest_ibnr         text,
  dest_lat          float,
  dest_lon          float,
  planned_arrival   timestamptz NOT NULL,
  actual_arrival    timestamptz,

  -- Train info
  operator          text,               -- "DB", "SBB", "ÖBB", …
  line_name         text,               -- "ICE 123", "RJ 42", …
  train_type        text,               -- "ICE", "IC", "RE", "S", "EC", …
  train_number      text,
  platform_planned  text,
  platform_actual   text,

  -- Status
  status            text CHECK (status IN ('planned', 'checked_in', 'completed', 'cancelled')),
  delay_minutes     int DEFAULT 0,
  cancelled         boolean DEFAULT false,

  -- Geo
  polyline          jsonb,              -- GeoJSON LineString of the route
  distance_km       float,

  -- Meta
  ticket_id         uuid,              -- optional link to ticket in wallet
  traewelling_status_id text,          -- ID of the Träwelling status after check-in
  notes             text,
  seat              text,              -- "Wagen 5, Platz 42"
  created_at        timestamptz DEFAULT now()
)
```

### 3.4 Tickets

```sql
tickets (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  title       text,                     -- "ICE München–Berlin, 24.06."
  operator    text,
  valid_from  timestamptz,
  valid_until timestamptz,
  file_url    text,                     -- PDF or image in Supabase Storage
  barcode     text,                     -- extracted QR/barcode value
  raw_text    text,                     -- OCR output for search
  created_at  timestamptz DEFAULT now()
)
```

### 3.5 Route Reviews

```sql
route_reviews (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  leg_id      uuid REFERENCES legs(id),

  origin_ibnr text NOT NULL,
  dest_ibnr   text NOT NULL,
  operator    text,
  train_type  text,

  score_overall      int CHECK (score_overall BETWEEN 1 AND 5),
  score_scenery      int CHECK (score_scenery BETWEEN 1 AND 5),
  score_comfort      int CHECK (score_comfort BETWEEN 1 AND 5),
  score_punctuality  int CHECK (score_punctuality BETWEEN 1 AND 5),
  score_wifi         int CHECK (score_wifi BETWEEN 1 AND 5),

  text        text,
  created_at  timestamptz DEFAULT now()
)
```

### 3.6 Journal Entries

```sql
journal_entries (
  id          uuid PRIMARY KEY,
  trip_id     uuid REFERENCES trips(id),
  leg_id      uuid REFERENCES legs(id),
  user_id     uuid REFERENCES users(id),
  body        text,                     -- Markdown content
  mood        text,                     -- emoji or enum: "great","good","neutral","bad"
  location_name text,
  lat         float,
  lon         float,
  created_at  timestamptz DEFAULT now()
)

journal_photos (
  id          uuid PRIMARY KEY,
  entry_id    uuid REFERENCES journal_entries(id),
  url         text NOT NULL,
  caption     text,
  position    int
)
```

### 3.7 Interrail Passes

```sql
interrail_passes (
  id              uuid PRIMARY KEY,
  user_id         uuid REFERENCES users(id),
  pass_type       text,                 -- "Global Pass", "One Country", …
  travel_class    int CHECK (travel_class IN (1, 2)),
  total_days      int,
  used_days       int DEFAULT 0,
  start_date      date,
  end_date        date,
  countries       text[],              -- ["DE","AT","CH",…]
  price_paid_eur  numeric(8,2),
  created_at      timestamptz DEFAULT now()
)
```

### 3.8 Achievements

```sql
achievements (
  id          text PRIMARY KEY,         -- "first_trip", "1000km", "10_countries", …
  title       text,
  description text,
  icon        text                      -- emoji or icon name
)

user_achievements (
  user_id       uuid REFERENCES users(id),
  achievement_id text REFERENCES achievements(id),
  unlocked_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
)
```

### 3.12 Subscriptions

```sql
subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES users(id) ON DELETE CASCADE,

  -- Lemon Squeezy IDs
  ls_subscription_id    text UNIQUE,        -- Lemon Squeezy subscription ID
  ls_customer_id        text,               -- Lemon Squeezy customer ID
  ls_variant_id         text,               -- which plan variant (Plus / Pro / API)
  ls_order_id           text,               -- original order ID

  -- Plan
  plan                  text NOT NULL CHECK (plan IN ('free', 'plus', 'pro')),
  status                text NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'expired', 'past_due')),
  billing_interval      text CHECK (billing_interval IN ('monthly', 'yearly')),

  -- Dates (all UTC)
  current_period_start  timestamptz,
  current_period_end    timestamptz,        -- subscription is valid until this date
  cancel_at_period_end  boolean DEFAULT false,
  cancelled_at          timestamptz,
  trial_ends_at         timestamptz,        -- optional 14-day trial

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
)

-- Index for fast plan lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_ls_id   ON subscriptions(ls_subscription_id);
```

### 3.13 Usage Counters

Used to enforce free-tier limits without expensive COUNT queries on every request.

```sql
usage_counters (
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  trips_count   int DEFAULT 0,              -- total trips created
  legs_count    int DEFAULT 0,              -- total legs created
  photos_count  int DEFAULT 0,              -- journal photos uploaded
  storage_bytes bigint DEFAULT 0,          -- total storage used (tickets + photos)
  api_calls_this_month int DEFAULT 0,      -- resets on billing cycle
  updated_at    timestamptz DEFAULT now()
)
```

Counters are incremented/decremented via Postgres triggers on INSERT/DELETE of the relevant tables. This keeps enforcement O(1) — a single integer read — rather than a full table scan.

```sql
-- Example trigger: increment trips_count on trip creation
CREATE OR REPLACE FUNCTION increment_trips_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_counters (user_id, trips_count)
    VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id)
    DO UPDATE SET trips_count = usage_counters.trips_count + 1,
                  updated_at  = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trips_count
  AFTER INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION increment_trips_count();
```

```sql
api_keys (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  name        text,                     -- "My Android App"
  key_hash    text UNIQUE NOT NULL,     -- bcrypt hash
  scopes      text[],                  -- ["trips:read","trips:write","checkin"]
  last_used   timestamptz,
  created_at  timestamptz DEFAULT now()
)
```

### 3.10 Custom Routes

A **Custom Route** is a user-drawn or waypoint-based route on the map, not tied to a specific timetable connection. Used for scenic planning, research, or "I want to travel this line someday" bookmarks.

```sql
custom_routes (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  title       text NOT NULL,
  description text,
  color       text DEFAULT '#e63946',   -- hex, user-selectable
  is_public   boolean DEFAULT false,
  waypoints   jsonb NOT NULL,           -- array of {lat, lon, name?, station_ibnr?}
  polyline    jsonb,                    -- GeoJSON LineString (snapped to rail network if possible)
  distance_km float,
  tags        text[],                   -- ["scenic","bucket-list","alpine",…]
  created_at  timestamptz DEFAULT now()
)
```

### 3.11 Rolling Stock

```sql
rolling_stock (
  id              text PRIMARY KEY,     -- e.g. "ice3neo", "railjet", "tgv-inouiflexity"
  operator        text NOT NULL,        -- "DB", "ÖBB", "SNCF", …
  series          text NOT NULL,        -- "ICE 3neo", "Railjet", "TGV inoui"
  uic_class       text,                 -- UIC classification code
  manufacturer    text,                 -- "Siemens", "Bombardier", "Alstom", …
  introduced_year int,
  max_speed_kmh   int,
  seats_1st       int,
  seats_2nd       int,
  has_bistro      boolean,
  has_wifi        boolean,
  has_wheelchair  boolean,
  has_bike_space  boolean,
  power_system    text,                 -- "25kV AC", "15kV AC", "multi-system"
  traction        text,                 -- "electric", "diesel", "hydrogen"
  description     text,                -- short editorial paragraph
  photo_url       text,
  wiki_url        text,
  data_source     text                  -- "community", "operator-official"
)

leg_rolling_stock (
  leg_id            uuid REFERENCES legs(id) PRIMARY KEY,
  rolling_stock_id  text REFERENCES rolling_stock(id),
  set_number        text,               -- e.g. "Tz 9002" for specific ICE unit
  confirmed         boolean DEFAULT false, -- true = confirmed from operator API, false = user-reported
  source            text                -- "db-api", "user", "community"
)
```

---

## 4. Feature Modules

### 4.1 Connection Search

**Goal:** Search for train connections across European operators from one unified UI.

**Backend:**
- Abstraction layer over multiple APIs (see §7). All results normalized to a shared `Connection` schema.
- Results cached in Redis/Supabase for 5 minutes per query to reduce API load.
- Parallel queries to multiple operators; results merged and de-duplicated by departure time + train number.

**Unified Connection schema:**
```ts
interface Connection {
  id: string                  // composite key for dedup
  legs: {
    origin: Station
    destination: Station
    departure: string         // ISO 8601
    arrival: string
    operator: string
    lineName: string
    trainType: string
    trainNumber: string
    platform?: string
    polyline?: GeoJSON.LineString
    distanceKm?: number
  }[]
  totalDurationMinutes: number
  transfers: number
  price?: { amount: number; currency: string; bookingUrl: string }
}
```

**UI:**
- Origin / Destination autocomplete using a combined station DB (IBNR + UIC codes, all European stations)
- Date + time picker, travel class selector, passenger count
- Results sorted by departure time; filter by: direct only, max transfers, operators, max duration
- Each result shows a mini inline route preview (stations as dots on a line)
- "Add to Trip" button on each result — opens a sheet to pick or create a trip

---

### 4.2 Trip Planning & Management

**Goal:** Manage multi-leg journeys end to end.

**Views:**
- **Trip list:** cards showing trip name, date range, status badge, thumbnail map
- **Trip detail:** timeline view of all legs + map (see §4.3) + journal entries + tickets
- **Leg editor:** add/edit a leg manually or from search results

**Trip creation flow:**
1. Name your trip + set date range
2. Add legs one by one via search or manual entry
3. Optionally link an Interrail pass
4. Save as `planned`

**Status transitions:**
```
planned → active (first leg departure day) → completed (after last leg arrival)
         → cancelled (manual)
```

**Manual leg entry fields:** origin, destination, departure/arrival datetime, operator, train number, seat, notes, ticket.

---

### 4.3 Map Visualisation

**Goal:** Every trip is visualised on an interactive map.

**Libraries:** Maplibre GL JS (open source, no Google Maps dependency). Tiles from OpenRailwayMap or Stadia Maps.

**Map layers:**
- **Route layer:** Animated polyline connecting all leg routes. Each operator gets a distinct colour (DB = red, SBB = dark red, ÖBB = grey-red, etc.)
- **Station markers:** Circles at each stop. Hover shows station name + planned time. Click shows leg detail panel.
- **Current position** (during active trip, if live tracking enabled): pulsing dot on the route.
- **Heatmap layer** (on statistics page): density map of all routes ever travelled by the user.

**Controls:**
- Fit to trip bounds (button)
- Toggle satellite / OSM / rail-focused base map
- Toggle individual legs on/off
- Full-screen mode

**Polyline source:** Fetched from the operator APIs where available (DB Hafas provides full polylines). Fallback: straight line between stations. Stored in `legs.polyline` after first fetch.

---

### 4.4 Check-in & Träwelling Integration

**Goal:** One-tap check-in to Träwelling from within the app.

**Setup:**
- User connects their Träwelling account via OAuth in Settings.
- Token stored encrypted in `users.traewelling_token`.

**Check-in flow:**
1. 10 minutes before a planned leg's departure → push notification: "Jetzt einchecken?"
2. User taps → app calls Träwelling `/api/v1/trains/checkin` with the train details.
3. On success: `legs.traewelling_status_id` saved, leg status → `checked_in`.
4. After arrival: Träwelling checkout triggered automatically (or manual).

**Manual check-in:** Also available at any time from the leg detail view.

**Träwelling API endpoints used:**
- `GET /api/v1/trains/station/{name}/departures` — fetch departures for check-in
- `POST /api/v1/trains/checkin` — perform check-in
- `DELETE /api/v1/statuses/{id}` — undo check-in

---

### 4.5 Import

**Goal:** Bring planned connections from other apps into RailPlanner without manual entry.

#### 4.5.1 Share Intent (Android / iOS)

- Register as a Share Target for URLs and plain text.
- Parse DB Navigator deep links: `https://www.bahn.de/buchung/fahrplan/verbindung?...` → extract origin, destination, datetime, train number.
- Parse SBB app share URLs similarly.
- Show a confirmation screen "Diese Verbindung importieren?" before saving.

#### 4.5.2 Email Import

- User forwards booking confirmation emails to a personal import address (e.g. `import+{userId}@railplanner.app`).
- Inbound email parsed via Postmark / Mailgun inbound webhook.
- Parser handles: DB Bahn confirmations, SBB e-tickets, ÖBB Railjet tickets, Eurostar, Interrail pass booking.
- Extracted data: train number, origin, destination, departure/arrival time, seat, ticket PDF attachment → auto-saved to trip + ticket wallet.
- On ambiguity: user gets in-app notification "1 Verbindung importiert — bitte überprüfen".

#### 4.5.3 Calendar / iCal Import

- User uploads an `.ics` file exported from DB Navigator or another app.
- Parser extracts VEVENT entries with train-specific summary formats.

#### 4.5.4 Screenshot / OCR Import

- User uploads a screenshot of a connection in any supported app.
- Server-side OCR (Tesseract or GPT-4o vision).
- Extracted connection shown in confirmation UI before saving.
- Supported: DB Navigator, SBB Mobile, ÖBB app, Ouigo, Eurostar.

---

### 4.6 Ticket Wallet

**Goal:** Store all train tickets (PDFs, images, QR codes) in one place linked to legs.

**Features:**
- Upload PDF or image; stored in Supabase Storage (private bucket, signed URLs).
- OCR on upload to extract: train number, departure, arrival, passenger name, seat, barcode value.
- Barcode / QR code displayed fullscreen for conductor scanning.
- Tickets linked to legs — shown directly in leg detail view.
- Tickets searchable by date, operator, route.
- Offline access via PWA service worker cache for tickets on upcoming legs.

---

### 4.7 Live Tracking & Notifications

**Goal:** Real-time delay info for active legs + smart notifications.

**Data source:** DB Hafas API for German trains (real-time data). For other operators: best-effort via their APIs.

**Notifications (push via Web Push / mobile via deep link):**

| Trigger | Message |
|---|---|
| 60 min before departure | "Dein ICE 724 fährt in 60 Min. ab München Hbf" |
| Platform change | "⚠️ Gleiswechsel: ICE 724 jetzt Gleis 12" |
| Delay > 5 min | "ICE 724 hat 12 Min. Verspätung" |
| Cancellation | "❌ ICE 724 ist ausgefallen — Alternative suchen?" |
| Träwelling reminder | "Jetzt einchecken in ICE 724?" (10 min before departure) |
| Connection at risk | "⚠️ Nur 4 Min. Umstieg — Alternative anzeigen?" |

**Notification preferences:** Granular settings per notification type (push, email, none).

---

### 4.8 Statistics & Heatmap

**Goal:** Show the user an overview of all their train travels.

**Stats computed from completed legs:**

- Total distance (km) — all time, this year, this month
- Total travel time (hours)
- Number of trips
- Number of unique stations visited
- Number of countries visited
- Average delay minutes
- Favourite operators (by km)
- CO₂ saved vs. equivalent flight (using ICAO formula)
- Longest single leg (km + duration)
- Fastest average speed trip

**Views:**
- **Summary cards** (top of stats page): key numbers at a glance
- **Distance over time chart:** monthly bar chart (recharts)
- **Country map:** Europe map with visited countries shaded
- **Route heatmap:** Maplibre heatmap layer of all polylines
- **Year-in-review page** (generated annually): Spotify Wrapped-style highlight reel with top stats, most memorable route, total km as "X times around the Earth", shareable as image

---

### 4.9 Travel Journal

**Goal:** Let users document their journeys with text, photos, mood, and location.

**Entry creation:**
- Triggered from a leg's detail view or as a standalone entry within a trip.
- Rich text editor (Tiptap) with Markdown support.
- Photo upload (up to 20 per entry), stored in Supabase Storage.
- Mood selector (emoji-based: 😊 😐 😔 🤩 😴).
- Auto-filled location from current GPS (PWA Geolocation API) or from the leg's current station.

**Journal view:**
- Timeline within a trip: journal entries interspersed with leg cards.
- Photo gallery view per trip.
- Entries searchable across all trips.

---

### 4.10 Streckenbewertungen (Route Reviews)

**Goal:** Community knowledge about what a specific route is actually like.

**Review flow:**
- After a leg is marked completed, user is prompted: "Wie war die Strecke?"
- 5 criteria rated 1–5: Overall, Scenery, Comfort, Punctuality, WiFi quality.
- Optional text review.

**Display:**
- On connection search results: average scores shown as stars for each result.
- Route detail page: aggregated scores + all text reviews for that route (origin → destination, any operator).
- Filter reviews by operator, train type, direction.

**Moderation:**
- Profanity filter on text reviews.
- Admin review queue for flagged reviews.

---

### 4.11 Gamification & Achievements

**Goal:** Make tracking train travel intrinsically motivating.

**Achievement examples:**

| ID | Title | Condition |
|---|---|---|
| `first_trip` | Erste Fahrt | Complete 1 leg |
| `1000km` | 1.000 km | Cumulative 1.000 km |
| `5000km` | 5.000 km | Cumulative 5.000 km |
| `10_countries` | Europafahrer | 10 different countries |
| `night_train` | Nachtzugfahrer | Complete a night train leg |
| `early_bird` | Frühaufsteher | Departure before 06:00 |
| `interrail_1` | Interrailer | Complete a trip with Interrail pass |
| `on_time_streak` | Pünktlichkeit | 10 legs in a row with ≤ 5 min delay |
| `1_year` | Treuer Reisender | Account active for 1 year |
| `bucket_list_complete` | Traumstrecken-Held | Mark 5 bucket list routes as done |

**Bucket list:**
- Curated list of iconic European train routes (Glacier Express, Bernina Express, Cinque Terre, Railjets through Austria, …).
- Users can add routes to their personal bucket list.
- Completed when a matching leg appears in their history.

**Leaderboard:** Optional opt-in leaderboard among friends (not public by default).

---

### 4.12 Interrail Tracker

**Goal:** Manage an Interrail pass and track its usage.

**Features:**
- Create a pass (type, class, valid dates, travel days, countries, price paid).
- Each leg can be marked as "uses Interrail day" — increments `used_days`.
- Dashboard: days used / total, days remaining, date remaining, countries visited vs. allowed.
- Budget tracker: accommodation, food, activities alongside the pass cost.
- Calendar view: which days have already been activated.
- Warning when approaching end of validity.

---

### 4.13 Collaborative Trip Planning

**Goal:** Plan trips together with friends.

**Features:**
- Invite friends to a trip via email or link (roles: `owner`, `editor`, `viewer`).
- Real-time collaborative editing via Supabase Realtime.
- Comments on legs and journal entries (threaded).
- "Abstimmung" (poll) on a leg: suggest alternatives, members vote.
- Shared trip appears in each member's trip list.
- Notifications on changes: "Max hat Leg 2 geändert".

---

### 4.14 AI Travel Suggestions

**Goal:** Inspire users with new trips based on their history and preferences.

**Features:**
- "Tagesausflug"-generator: based on home station, suggest day trip destinations reachable within N hours.
- "Nächste große Reise"-suggestions: multi-day itineraries generated by AI.
- Powered by: Claude API (claude-sonnet-4-20250514) with structured output.
- Context given to AI: user's past trips, home station, preferred travel time, budget.
- Suggestions displayed as trip cards with "Als Reise speichern" button.
- AI also suggests optimal routes when user types a vague destination ("Ich will nach Prag").

**Implementation note:** AI calls are server-side only (API key never in client). Results cached per user for 24h.

---

### 4.15 Sharing & Embed

**Goal:** Share trips publicly or embed them on blogs/websites.

**Features:**
- Toggle trip visibility to `public` → generates a `share_token`.
- Public URL: `railplanner.app/trip/{share_token}` — read-only, no auth required.
- Open Graph meta tags for rich previews when shared on social media (map screenshot as OG image, generated server-side via Playwright).
- Embed code: `<iframe src="railplanner.app/embed/{share_token}">` — shows the map + leg list in a compact view.
- Export trip as GPX for GPS devices.
- Export trip as PDF trip report (cover page with map + per-leg details).

---

### 4.16 Kalender-Export

**Goal:** Get all planned legs into the user's calendar.

**Features:**
- "Alle Fahrten exportieren" → downloads `.ics` file with all planned legs as VEVENTs.
- Each event contains: title (train number + route), location (origin station), description (platform, seat, ticket info).
- Subscribe URL: `railplanner.app/api/calendar/{token}.ics` — live-updating iCal feed that calendar apps can subscribe to.
- Individual leg export also available.

---

### 4.17 Packlisten

**Goal:** Remember what to pack for different trip types.

**Features:**
- Default templates: Day trip, Weekend, Week+, Interrail.
- Fully customisable: add/remove/reorder items, create own templates.
- Items can be checked off per trip.
- Linked to a trip — packing list shown in trip detail.
- Smart suggestions based on trip duration and season (e.g. "Es sind Schneefall-Warnungen für deine Route").

---

### 4.18 Custom Routes (Freie Streckenplanung)

**Goal:** Let users draw, save, and share train routes freely on the map — independent of a scheduled connection. Useful for planning dream routes, exploring the rail network, or bookmarking scenic lines.

**Creation modes:**

1. **Waypoint mode:** Click stations or arbitrary points on the map → app snaps the path to the nearest rail line (using OpenRailwayMap's network graph via Overpass API). Shows estimated distance.
2. **Draw mode:** Freehand drawing on the map along the rail network (constrained to track geometries from OpenRailwayMap).
3. **From search result:** Any connection search result can be saved as a custom route (decoupled from a specific date/time).
4. **From existing leg:** "Als freie Strecke speichern" on any completed leg — extracts the polyline.

**Route detail page:**
- Full-screen map of the route with all waypoints.
- Elevation profile chart (data from OpenTopoData API).
- List of stations along the route with their names and IBNR codes.
- Estimated travel time (based on line speed from OpenRailwayMap `maxspeed` tags).
- Tags: user-defined + suggested (e.g. "alpine", "coastal", "high-speed", "scenic").
- "Als Trip planen" → pre-fills trip creation with the route's stations and suggests connections.
- POI panel (see §4.19).

**Route library:**
- User's saved custom routes listed with map thumbnails.
- Filter by tag, country, distance.
- Public routes discoverable by others (optional).
- "Bucket list" toggle: mark a custom route as something you want to travel someday (links to §4.11).

**Data model:** See `custom_routes` in §3.10.

**API:**
```
GET    /custom-routes            → list user's routes
POST   /custom-routes            → create route
GET    /custom-routes/{id}       → detail
PUT    /custom-routes/{id}       → update
DELETE /custom-routes/{id}       → delete
GET    /custom-routes/{id}/pois  → fetch POIs along route (proxied from Overpass / OSM)
```

---

### 4.19 POI entlang der Strecke

**Goal:** Show what the user will see out the window and what to do at stops along any route — both planned legs and custom routes.

**Data sources:**
- **Overpass API (OpenStreetMap):** Query POIs within a corridor around the route polyline (configurable buffer: 2–20 km). Categories: natural features, UNESCO sites, historic monuments, viewpoints, lakes, mountains, castles.
- **Wikipedia API:** Short descriptions + thumbnail for named POIs.
- **Wikidata:** Structured data (elevation, founding year, etc.) for enriched info cards.

**UI — "Streckeninfos" panel (shown in trip detail and custom route detail):**

Side panel alongside the map with a scrollable list of POIs grouped by category:

| Category | Icon | Examples |
|---|---|---|
| Sehenswürdigkeiten | 🏛 | Schloss Neuschwanstein, Kölner Dom |
| Natur & Landschaft | 🏔 | Zugspitze, Bodensee, Rheintal |
| Aussichtspunkte | 👁 | Rüdesheimer Berg, Heidelberger Schloss |
| Städte & Orte | 🏙 | Zürich, Innsbruck, Basel |
| Museen | 🎨 | DB Museum Nürnberg, Technikmuseum Speyer |
| Bahnhistorie | 🚂 | Erste Eisenbahn Deutschlands (Nürnberg–Fürth) |

**Interaction:**
- Clicking a POI on the list highlights it on the map with a pin and shows an info card (photo, 2–3 sentence description, Wikipedia link, distance from track).
- "Stopp einplanen" button: adds an intermediate stop at the nearest station to the POI in the trip planner.
- Filtering by category.
- "Linke / rechte Seite" indicator: based on direction of travel + POI bearing from track, suggests which window seat has the best view.

**Performance:** POI query is done server-side and cached per route polyline hash for 7 days (OSM data doesn't change often). Results stored in `custom_routes` or pre-computed for common routes.

**Implementation:**
```ts
// Example Overpass query for a route corridor
const query = `
  [out:json][timeout:30];
  (
    node["tourism"="attraction"](around:5000, ${wktPoints});
    node["natural"="peak"](around:10000, ${wktPoints});
    node["historic"](around:5000, ${wktPoints});
    node["amenity"="place_of_worship"]["wikidata"](around:3000, ${wktPoints});
  );
  out body;
`;
```

---

### 4.20 OpenRailwayMap Integration

**Goal:** Use OpenRailwayMap as both a visual map layer and a data source for rail infrastructure info.

#### 4.20.1 Map Layer

Three switchable ORM tile layers available in the map controls alongside the standard basemap:

| Layer | URL | Shows |
|---|---|---|
| Standard | `.../standard/{z}/{x}/{y}.png` | All tracks, stations, line colours by operator |
| Max speed | `.../maxspeed/{z}/{x}/{y}.png` | Track speed limits (colour coded) |
| Signals | `.../signals/{z}/{x}/{y}.png` | Signal infrastructure |
| Electrification | `.../electrification/{z}/{x}/{y}.png` | Power system by track segment |

**UI:** Toggle group in map controls — "Kartenebene: Standard / Infrastruktur / Geschwindigkeit / Signale". Layers blend with 70% opacity over the basemap.

#### 4.20.2 Track Data via Overpass API

Used to:
- **Snap custom routes** to actual rail geometry (§4.18) — query `railway=rail` ways within a bounding box.
- **Fetch line metadata** for a route: operator, electrification voltage, max speed, gauge.
- **Identify what tracks a train runs on** to show infrastructure context in leg detail.

**Example enrichment on a leg detail page:**
```
Strecke München Hbf → Salzburg
Betreiber: DB / ÖBB (gemeinschaftlich)
Streckentyp: Hauptbahn, zweigleisig
Elektrifizierung: 15 kV 16,7 Hz (DE) / 25 kV 50 Hz (AT)
Höchstgeschwindigkeit: 200 km/h
Streckenlänge: 156 km
```

#### 4.20.3 Infrastructure Info Panel

Accessible from the map via click on any track segment:

- Line name / Streckenummer (e.g. KBS 950)
- Operator
- Max speed
- Electrification
- Number of tracks
- "Diese Strecke in meinen Trips" — links to all legs that used this segment

---

### 4.21 Baureihen & Fahrzeuginfo

**Goal:** Tell the user exactly what train they're sitting in, with full technical and historical context.

#### 4.21.1 Automatic Detection

- When a leg is created from a search result, the train number is known (e.g. "ICE 724").
- DB Hafas API returns the vehicle type (`Tz`/`ICE3neo`, `IC2`, etc.) for many trains.
- App looks up `rolling_stock` by operator + series → auto-links to the leg.
- For trains where the API doesn't return vehicle data: community contributions fill the gap.

#### 4.21.2 Rolling Stock Detail Page

Accessible from a leg detail via "Baureihe anzeigen" button. Full-page view:

**Header:**
- Series name + photo (e.g. ICE 3neo / BR 408)
- Operator logo
- "Du bist X mal mit dieser Baureihe gefahren" (personalised stat)

**Specs table:**
- Hersteller, Baujahr (Einführung), Anzahl im Bestand
- Höchstgeschwindigkeit
- Antrieb & Stromsystem
- Sitzplätze 1. / 2. Klasse
- Ausstattung: WLAN ✓, Bistro ✓, Fahrradstellplätze ✓, Rollstuhlplatz ✓
- Spurweite, Achsformel

**Description:** 3–5 sentence editorial overview of the series (history, notable features, routes it typically runs).

**Photo gallery:** Creative Commons images from Wikimedia Commons (queried via Wikimedia API by vehicle series name).

**Wikipedia / Eisenbahn-kurier link.**

**"Strecken dieser Baureihe":** Common routes this rolling stock operates, based on community data + DB API.

#### 4.21.3 Rolling Stock in Leg Detail

In the leg detail card, a small "Fahrzeuginfo"-chip shows:
- Series name
- Key icons: 🚄 speed / 📶 WiFi / 🍽 Bistro / 🚲 Bike / ♿ Wheelchair
- Tap → opens full detail page

#### 4.21.4 Community Contributions

Since not all operators expose vehicle data via API:
- Users can report the rolling stock for a leg ("Ich bin heute mit ICE 3neo gefahren").
- Reports are aggregated per train-number + date → if 3+ users report the same series, it's marked `confirmed`.
- Corrections possible if the operator API data is outdated.

#### 4.21.5 Rolling Stock Database

Curated entries for all major European series:

| Operator | Series |
|---|---|
| DB | ICE 1, ICE 2, ICE 3, ICE 3neo (BR 408), ICE 4, IC2, RE-Doppelstock |
| ÖBB | Railjet, Cityjet, Nightjet |
| SBB | IC2000, FV-Dosto, RABe 503 (Astoro) |
| SNCF | TGV Duplex, TGV inoui, Intercités |
| Eurostar | e320, Class 373 |
| NS | ICNG, Intercity Direct |
| Renfe | AVE S-103, Alvia |

Community can add new entries via a contribution form (moderated).

---

## 5. Public REST API

**Base URL:** `https://railplanner.app/api/v1`

**Auth:** Bearer token (API key issued in settings). Scope-based permissions.

**Rate limiting:** 100 requests/min per API key (standard), 1000/min (verified apps).

### Endpoints

#### Trips

```
GET    /trips                  → list user's trips
POST   /trips                  → create trip
GET    /trips/{id}             → get trip detail
PUT    /trips/{id}             → update trip
DELETE /trips/{id}             → delete trip
GET    /trips/{id}/legs        → list legs of a trip
POST   /trips/{id}/legs        → add leg to trip
```

#### Legs

```
GET    /legs/{id}              → get leg detail
PUT    /legs/{id}              → update leg
DELETE /legs/{id}              → delete leg
POST   /legs/{id}/checkin      → trigger Träwelling check-in (scope: checkin)
POST   /legs/{id}/checkout     → trigger Träwelling checkout
```

#### Connection Search

```
GET    /search/connections
  ?from={stationId}
  &to={stationId}
  &datetime={ISO8601}
  &travelers=1
  &class=2
  &operators=DB,SBB         → comma-separated filter
```

#### Stations

```
GET    /stations/search?q={query}    → autocomplete
GET    /stations/{ibnr}              → station detail + realtime departures
```

#### Custom Routes

```
GET    /custom-routes                → list user's custom routes
POST   /custom-routes                → create route
GET    /custom-routes/{id}           → detail + waypoints + polyline
PUT    /custom-routes/{id}           → update
DELETE /custom-routes/{id}           → delete
GET    /custom-routes/{id}/pois      → POIs along route (OSM/Overpass)
GET    /custom-routes/{id}/elevation → elevation profile data
```

#### Rolling Stock

```
GET    /rolling-stock                → list all series (paginated)
GET    /rolling-stock/{id}           → full detail
GET    /legs/{id}/rolling-stock      → get rolling stock linked to a leg
PUT    /legs/{id}/rolling-stock      → report/update rolling stock for a leg
```

#### Statistics

```
GET    /stats                  → aggregate stats for the user
GET    /stats/heatmap          → GeoJSON FeatureCollection of all routes (for map rendering)
```

#### Webhooks (outbound)

Users can register webhook URLs to receive events:

```
POST   /webhooks               → register webhook
DELETE /webhooks/{id}          → remove webhook
```

**Event types:**
- `leg.delay_updated`
- `leg.cancelled`
- `leg.checkin_succeeded`
- `trip.status_changed`

**Webhook payload:**
```json
{
  "event": "leg.delay_updated",
  "timestamp": "2025-06-24T08:12:00Z",
  "data": { "leg_id": "...", "delay_minutes": 12 }
}
```

### OpenAPI spec

A full OpenAPI 3.1 spec is to be maintained at `/api/v1/openapi.json` and served interactively via Scalar at `/api/docs`.

---

## 6. Mobile Integration (Android / iOS)

### 6.1 Progressive Web App (PWA)

- Service Worker caches: upcoming leg tickets, trip details, map tiles for current trip.
- Web Push notifications for all alerts (§4.7).
- Add to home screen prompt.
- Offline-capable trip view (read-only when offline).

### 6.2 Share Target (Android)

Register as Android Share Target in `manifest.json`:

```json
"share_target": {
  "action": "/import/share",
  "method": "GET",
  "params": { "url": "url", "text": "text", "title": "title" }
}
```

- Receives shared URLs from DB Navigator, SBB Mobile, ÖBB.
- Parse incoming URL and pre-fill import confirmation screen.

### 6.3 Native Apps (future / third-party)

The public REST API (§5) enables native Android/iOS apps. Documentation and SDK (TypeScript) published on GitHub.

**Suggested Android integration:**
- Register as Intent handler for `bahn.de` URLs and `sbb.ch` URLs.
- Deep link scheme: `railplanner://trip/{id}` — opens trip on app.

---

## 7. Third-Party Integrations

### 7.1 DB (Deutsche Bahn)

- **Library:** `db-hafas` (npm) or direct Hafas API
- **Data:** Connection search, realtime departures, polylines, platforms, delays
- **Docs:** Marudor / Hafas community docs

### 7.2 SBB (Schweizer Bundesbahnen)

- **API:** SBB Open Data API (`transport.opendata.ch`)
- **Data:** Connection search (Swiss network), station data
- **Limitation:** No real-time polylines; fallback to straight-line interpolation

### 7.3 ÖBB (Österreichische Bundesbahnen)

- **Library:** `oebb-hafas` (npm) — Hafas-based like DB
- **Data:** Connection search, real-time data for Austrian network

### 7.4 Träwelling

- **API docs:** `traewelling.de/api-docs`
- **Auth:** OAuth2 (user connects in settings)
- **Endpoints used:** departures, check-in, checkout, status list

### 7.5 OpenRailwayMap

- **Usage:** Map tile layers (standard, maxspeed, signals, electrification) + track geometry data
- **Tile URL:** `https://{s}.tiles.openrailwaymap.org/{style}/{z}/{x}/{y}.png`
- **Track data:** Via Overpass API (`overpass-api.de`) querying `railway=rail` ways for route snapping and infrastructure metadata
- **Rate limiting:** Overpass queries cached server-side per bounding box + query hash for 7 days; tile requests go direct from client (ORM tiles are public)
- **See also:** §4.20 for full integration detail

### 7.8 Overpass API (OpenStreetMap)

- **Usage:** POI queries along route corridors (§4.19), rail track geometry for custom route snapping (§4.18), infrastructure metadata (§4.20)
- **Endpoint:** `https://overpass-api.de/api/interpreter`
- **Query language:** Overpass QL
- **Caching:** All Overpass results cached in Supabase/Redis — POIs cached 7 days, track geometry cached 30 days (rarely changes)
- **Fallback:** `https://overpass.karte.io` as secondary endpoint

### 7.9 Wikipedia & Wikimedia APIs

- **Usage:** POI descriptions (§4.19), rolling stock photos (§4.21)
- **Wikipedia REST API:** `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` — returns extract + thumbnail
- **Wikimedia Commons API:** Query images by category (e.g. `Category:ICE_3neo`) for rolling stock gallery
- **Language:** Auto-select DE or EN based on user language setting

### 7.10 OpenTopoData

- **Usage:** Elevation profile for custom routes (§4.18)
- **Endpoint:** `https://api.opentopodata.org/v1/eudem25m?locations=...`
- **Dataset:** EUDEM 25m (European Digital Elevation Model) — best resolution for Europe
- **Caching:** Elevation profiles cached per polyline hash indefinitely

### 7.6 Email Inbound (Import)

- **Provider:** Postmark Inbound (or Mailgun)
- **Each user gets:** `import+{userId}@railplanner.app`
- **Processing:** Parse multipart/form-data, extract text + attachments, run through booking parser

### 7.7 AI (Claude)

- **Model:** `claude-sonnet-4-20250514`
- **Use cases:** Travel suggestions (§4.14), OCR-based import parsing (§4.5.4), smart packing list suggestions (§4.17)
- **API key:** Server-side only, never exposed to client

---

## 8. Non-Functional Requirements

### Performance
- Connection search results: < 2s for first result (streaming)
- Map tile load: < 1s on good connection
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

### Security
- All API keys hashed (bcrypt) — never stored in plaintext
- Träwelling OAuth tokens encrypted at rest (AES-256)
- Tickets stored in private Supabase Storage bucket; accessed only via short-lived signed URLs (1h TTL)
- CSRF protection on all mutation endpoints
- Rate limiting on all public endpoints

### Accessibility
- WCAG 2.1 AA
- Full keyboard navigation
- Screen reader compatible map controls (ARIA labels)

### Internationalisation
- UI languages: German, English (default: German)
- Dates/times always in user's local timezone (stored as UTC)
- Station names: displayed in local language where available

### Privacy
- Public trips show no personal data by default (username is optional on share page)
- Users can export all their data (GDPR Article 20)
- Users can delete their account and all associated data (GDPR Article 17)
- No third-party analytics by default; optional opt-in to anonymised telemetry

---

## 9. Tech Stack Details

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for trip share pages + SEO, API routes for backend |
| Language | TypeScript | End-to-end type safety |
| Database | Supabase (PostgreSQL) | Auth + Realtime + Storage + DB in one |
| ORM | Prisma | Type-safe queries, migrations |
| Cache | Upstash Redis | Connection search cache, rate limiting |
| Auth | Supabase Auth | Built-in OAuth, JWT, RLS |
| Map | Maplibre GL JS + react-map-gl | Open source, no API key required for base tiles |
| Map tiles | Stadia Maps (free tier) | Good-looking, reliable |
| UI | Tailwind CSS + shadcn/ui | Rapid development, accessible primitives |
| Rich text | Tiptap | Journal editor |
| Charts | Recharts | Statistics page |
| Email | Resend | Transactional emails |
| Email inbound | Postmark | Import feature |
| Push notifications | Web Push (via `web-push` npm package) | PWA notifications |
| File storage | Supabase Storage | Tickets, journal photos |
| OCR | Tesseract.js (client) / GPT-4o vision (server) | Screenshot import |
| AI | Anthropic Claude API | Suggestions, import parsing |
| Billing | Lemon Squeezy | Subscriptions, VAT, webhooks (simpler than Stripe for EU) |
| Overpass API | OpenStreetMap Overpass | POI queries, rail geometry for custom routes |
| Wikimedia API | Wikipedia + Commons | POI descriptions, rolling stock photos |
| OpenTopoData | EUDEM elevation API | Elevation profiles for custom routes |
| Deployment | Vercel (Hobby free tier) | Zero-config Next.js, free for personal projects |
| CI/CD | GitHub Actions | Lint, test, deploy |

---

## 10. Billing & Subscriptions

### 10.1 Plan Overview

| Feature | Free | Plus (€4/mo) | Pro (€8/mo) |
|---|---|---|---|
| Connection search | ✓ | ✓ | ✓ |
| Trip planning | Up to 3 trips | Unlimited | Unlimited |
| Legs per trip | Up to 10 | Unlimited | Unlimited |
| Map visualisation | ✓ | ✓ | ✓ |
| Träwelling check-in | ✓ | ✓ | ✓ |
| Basic statistics | ✓ | ✓ | ✓ |
| Travel Journal | — | ✓ | ✓ |
| Photo uploads | — | 500 MB | 5 GB |
| Ticket Wallet | — | ✓ | ✓ |
| Full statistics + heatmap | — | ✓ | ✓ |
| Live notifications | — | ✓ | ✓ |
| Route reviews | Read only | Write | Write |
| Interrail tracker | — | ✓ | ✓ |
| Custom routes | 1 | Unlimited | Unlimited |
| POI along route | — | ✓ | ✓ |
| Rolling stock info | Basic | Full | Full |
| Achievements | — | ✓ | ✓ |
| Collaborative trips | — | — | ✓ (up to 5 members) |
| AI travel suggestions | — | — | ✓ (10/month) |
| Public REST API | — | — | ✓ |
| API rate limit | — | — | 1000 req/min |
| Year-in-review | — | ✓ | ✓ |
| Sharing & embed | Public link | ✓ | ✓ |
| Kalender-Export | — | ✓ | ✓ |
| Yearly discount | — | €40/yr (save €8) | €80/yr (save €16) |

**Why Lemon Squeezy over Stripe:**
Lemon Squeezy acts as a Merchant of Record — they handle all VAT/GST collection and remittance across every EU country automatically. You receive clean payouts with zero tax complexity. For a solo developer or small team in Germany/EU, this saves enormous compliance overhead. Stripe requires you to register for VAT in every country where you have customers above local thresholds.

### 10.2 Lemon Squeezy Setup

**Account setup:**
1. Create account at `app.lemonsqueezy.com`
2. Create a Store → "RailPlanner"
3. Create Products:
   - **RailPlanner Plus Monthly** — €4.00/month recurring
   - **RailPlanner Plus Yearly** — €40.00/year recurring
   - **RailPlanner Pro Monthly** — €8.00/month recurring
   - **RailPlanner Pro Yearly** — €80.00/year recurring
4. Note the `variantId` of each product — stored in environment variables

**Environment variables:**
```env
# Lemon Squeezy
LEMONSQUEEZY_API_KEY=your_api_key
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_STORE_ID=12345

# Variant IDs (get these from LS dashboard after creating products)
LS_VARIANT_PLUS_MONTHLY=11111
LS_VARIANT_PLUS_YEARLY=11112
LS_VARIANT_PRO_MONTHLY=11113
LS_VARIANT_PRO_YEARLY=11114
```

### 10.3 Implementation

**Install the SDK:**
```bash
npm install @lemonsqueezy/lemonsqueezy.js
```

**Lemon Squeezy client (`lib/lemonsqueezy.ts`):**
```typescript
import { lemonSqueezySetup, createCheckout, getSubscription } from '@lemonsqueezy/lemonsqueezy.js'

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! })

export async function createCheckoutUrl(
  userId: string,
  userEmail: string,
  variantId: number,
): Promise<string> {
  const { data, error } = await createCheckout(
    Number(process.env.LEMONSQUEEZY_STORE_ID),
    variantId,
    {
      checkoutOptions: {
        embed: false,
        media: false,
      },
      checkoutData: {
        email: userEmail,
        custom: {
          user_id: userId,         // passed back in webhook
        },
      },
      productOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_URL}/settings/billing?success=true`,
        receiptButtonText: 'Go to RailPlanner',
      },
    },
  )

  if (error) throw new Error(error.message)
  return data!.data.attributes.url
}
```

**Checkout API route (`app/api/billing/checkout/route.ts`):**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutUrl } from '@/lib/lemonsqueezy'

const VARIANT_MAP: Record<string, number> = {
  'plus-monthly': Number(process.env.LS_VARIANT_PLUS_MONTHLY),
  'plus-yearly':  Number(process.env.LS_VARIANT_PLUS_YEARLY),
  'pro-monthly':  Number(process.env.LS_VARIANT_PRO_MONTHLY),
  'pro-yearly':   Number(process.env.LS_VARIANT_PRO_YEARLY),
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json()
  const variantId = VARIANT_MAP[plan]
  if (!variantId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const url = await createCheckoutUrl(user.id, user.email!, variantId)
  return NextResponse.json({ url })
}
```

**Webhook handler (`app/api/billing/webhook/route.ts`):**

This is the most important piece — Lemon Squeezy calls this endpoint whenever a subscription is created, updated, cancelled, or a payment fails. It must be reliable and idempotent.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Map LS variant IDs to plan names
const VARIANT_TO_PLAN: Record<string, 'plus' | 'pro'> = {
  [process.env.LS_VARIANT_PLUS_MONTHLY!]: 'plus',
  [process.env.LS_VARIANT_PLUS_YEARLY!]:  'plus',
  [process.env.LS_VARIANT_PRO_MONTHLY!]:  'pro',
  [process.env.LS_VARIANT_PRO_YEARLY!]:   'pro',
}

function verifyWebhookSignature(body: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
  const digest = hmac.update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  const eventName: string = event.meta.event_name
  const attrs = event.data.attributes
  const userId: string = event.meta.custom_data?.user_id

  const supabase = createAdminClient()   // service role — bypasses RLS

  // Handle all relevant subscription lifecycle events
  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated':
    case 'subscription_resumed': {
      const plan = VARIANT_TO_PLAN[String(attrs.variant_id)] ?? 'free'

      await supabase.from('subscriptions').upsert({
        user_id:               userId,
        ls_subscription_id:    String(event.data.id),
        ls_customer_id:        String(attrs.customer_id),
        ls_variant_id:         String(attrs.variant_id),
        ls_order_id:           String(attrs.order_id),
        plan,
        status:                attrs.status,          // 'active', 'paused', etc.
        billing_interval:      attrs.variant_name?.toLowerCase().includes('yearly') ? 'yearly' : 'monthly',
        current_period_start:  attrs.renews_at ? new Date(attrs.created_at).toISOString() : null,
        current_period_end:    attrs.renews_at,
        cancel_at_period_end:  attrs.cancelled,
        updated_at:            new Date().toISOString(),
      }, { onConflict: 'ls_subscription_id' })

      // Update the user's plan claim in Supabase Auth metadata for fast JWT reads
      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { plan },
      })
      break
    }

    case 'subscription_cancelled': {
      // Don't delete — mark cancelled but keep valid until period end
      await supabase
        .from('subscriptions')
        .update({
          status:              'cancelled',
          cancel_at_period_end: true,
          cancelled_at:        new Date().toISOString(),
          updated_at:          new Date().toISOString(),
        })
        .eq('ls_subscription_id', String(event.data.id))
      break
    }

    case 'subscription_expired': {
      // Period has ended after cancellation — downgrade to free
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', plan: 'free', updated_at: new Date().toISOString() })
        .eq('ls_subscription_id', String(event.data.id))

      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { plan: 'free' },
      })
      break
    }

    case 'subscription_payment_failed': {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('ls_subscription_id', String(event.data.id))
      // Optionally: send an email via Resend telling the user to update their card
      break
    }
  }

  return NextResponse.json({ received: true })
}

// Disable body parsing — we need the raw body for signature verification
export const config = { api: { bodyParser: false } }
```

### 10.4 Entitlement Checking

All feature gates live in a single utility so they're easy to update.

**`lib/entitlements.ts`:**
```typescript
export type Plan = 'free' | 'plus' | 'pro'

export interface Limits {
  maxTrips:         number   // Infinity = unlimited
  maxLegsPerTrip:   number
  maxPhotosMb:      number
  maxCustomRoutes:  number
  aiSuggestionsPerMonth: number
  apiAccess:        boolean
  journal:          boolean
  ticketWallet:     boolean
  fullStats:        boolean
  notifications:    boolean
  interrailTracker: boolean
  collaborativeTrips: boolean
  poiAlongRoute:    boolean
}

export const PLAN_LIMITS: Record<Plan, Limits> = {
  free: {
    maxTrips:              3,
    maxLegsPerTrip:        10,
    maxPhotosMb:           0,
    maxCustomRoutes:       1,
    aiSuggestionsPerMonth: 0,
    apiAccess:             false,
    journal:               false,
    ticketWallet:          false,
    fullStats:             false,
    notifications:         false,
    interrailTracker:      false,
    collaborativeTrips:    false,
    poiAlongRoute:         false,
  },
  plus: {
    maxTrips:              Infinity,
    maxLegsPerTrip:        Infinity,
    maxPhotosMb:           500,
    maxCustomRoutes:       Infinity,
    aiSuggestionsPerMonth: 0,
    apiAccess:             false,
    journal:               true,
    ticketWallet:          true,
    fullStats:             true,
    notifications:         true,
    interrailTracker:      true,
    collaborativeTrips:    false,
    poiAlongRoute:         true,
  },
  pro: {
    maxTrips:              Infinity,
    maxLegsPerTrip:        Infinity,
    maxPhotosMb:           5000,
    maxCustomRoutes:       Infinity,
    aiSuggestionsPerMonth: 10,
    apiAccess:             true,
    journal:               true,
    ticketWallet:          true,
    fullStats:             true,
    notifications:         true,
    interrailTracker:      true,
    collaborativeTrips:    true,
    poiAlongRoute:         true,
  },
}

export function getPlan(userMetadata: { plan?: string }): Plan {
  const p = userMetadata?.plan
  if (p === 'plus' || p === 'pro') return p
  return 'free'
}

export function can(plan: Plan, feature: keyof Omit<Limits, 'maxTrips' | 'maxLegsPerTrip' | 'maxPhotosMb' | 'maxCustomRoutes' | 'aiSuggestionsPerMonth'>): boolean {
  return PLAN_LIMITS[plan][feature]
}

export function getLimit(plan: Plan, limit: 'maxTrips' | 'maxLegsPerTrip' | 'maxPhotosMb' | 'maxCustomRoutes' | 'aiSuggestionsPerMonth'): number {
  return PLAN_LIMITS[plan][limit]
}
```

**Server-side gate example (`app/api/trips/route.ts`):**
```typescript
import { getPlan, getLimit } from '@/lib/entitlements'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = getPlan(user.app_metadata)
  const maxTrips = getLimit(plan, 'maxTrips')

  if (maxTrips !== Infinity) {
    // Read from usage_counters — O(1), no table scan
    const { data: usage } = await supabase
      .from('usage_counters')
      .select('trips_count')
      .eq('user_id', user.id)
      .single()

    if ((usage?.trips_count ?? 0) >= maxTrips) {
      return NextResponse.json(
        { error: 'Trip limit reached', upgrade: true, plan },
        { status: 403 }
      )
    }
  }

  // ... create the trip
}
```

**Client-side gate example (React component):**
```typescript
'use client'
import { useUser } from '@/hooks/useUser'
import { getPlan, can } from '@/lib/entitlements'
import { UpgradeModal } from '@/components/UpgradeModal'

export function JournalButton({ legId }: { legId: string }) {
  const { user } = useUser()
  const plan = getPlan(user?.app_metadata ?? {})

  if (!can(plan, 'journal')) {
    return <UpgradeModal requiredPlan="plus" feature="Travel Journal" />
  }

  return <button onClick={() => openJournal(legId)}>Write Journal Entry</button>
}
```

**Important:** Client-side gates are UX only — they prevent users from seeing locked UI. All actual enforcement must happen server-side in API routes. Never trust the client.

### 10.5 Upgrade Modal

When a free user hits a limit, show an upgrade modal — not a wall. The modal explains what they unlock and links directly to checkout.

```typescript
// components/UpgradeModal.tsx
'use client'
import { useState } from 'react'
import { PLAN_LIMITS } from '@/lib/entitlements'

const FEATURE_COPY: Record<string, { title: string; body: string; requiredPlan: 'plus' | 'pro' }> = {
  journal:           { title: 'Travel Journal', body: 'Document your journeys with photos, notes, and mood.', requiredPlan: 'plus' },
  ticketWallet:      { title: 'Ticket Wallet', body: 'Store all your tickets with QR codes in one place.', requiredPlan: 'plus' },
  fullStats:         { title: 'Full Statistics', body: 'See your heatmap, CO₂ saved, country map, and more.', requiredPlan: 'plus' },
  collaborativeTrips:{ title: 'Collaborative Trips', body: 'Plan trips together with friends in real time.', requiredPlan: 'pro' },
  apiAccess:         { title: 'API Access', body: 'Build your own apps on top of RailPlanner.', requiredPlan: 'pro' },
}

export function UpgradeModal({ feature }: { feature: keyof typeof FEATURE_COPY }) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const copy = FEATURE_COPY[feature]

  async function handleUpgrade(plan: 'plus' | 'pro') {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: `${plan}-${billing}` }),
      headers: { 'Content-Type': 'application/json' },
    })
    const { url } = await res.json()
    window.location.href = url     // redirect to Lemon Squeezy hosted checkout
  }

  return (
    <dialog open>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      <div>
        <button onClick={() => setBilling('monthly')}>Monthly</button>
        <button onClick={() => setBilling('yearly')}>Yearly (save 2 months)</button>
      </div>
      <button onClick={() => handleUpgrade(copy.requiredPlan)}>
        Upgrade to {copy.requiredPlan === 'plus' ? 'Plus — €4/mo' : 'Pro — €8/mo'}
      </button>
    </dialog>
  )
}
```

### 10.6 Billing Settings Page

Route: `/settings/billing`

Shows:
- Current plan badge
- Usage bars (trips used / limit, storage used / limit)
- Current period end date + "Cancels at period end" warning if applicable
- Upgrade/downgrade buttons (redirect to Lemon Squeezy customer portal)
- "Manage subscription" link → Lemon Squeezy customer portal URL

**Customer portal link:**
```typescript
// Lemon Squeezy provides a hosted customer portal where users manage their sub
// Get the portal URL from the subscription object
import { getSubscription } from '@lemonsqueezy/lemonsqueezy.js'

export async function getCustomerPortalUrl(lsSubscriptionId: string): Promise<string> {
  const { data } = await getSubscription(lsSubscriptionId)
  return data!.data.attributes.urls.customer_portal
}
```

### 10.7 Revenue Projections

Break-even analysis at scale (infrastructure cost ~€0 on free tiers, ~€80/mo at 5k users):

| Paying users | Mix assumed | MRR | Infra cost | Net |
|---|---|---|---|---|
| 0 | — | €0 | €0 | €0 |
| 20 | 15 Plus + 5 Pro | €100 | €0 | €100 |
| 50 | 35 Plus + 15 Pro | €260 | €0–€80 | ~€200 |
| 100 | 70 Plus + 30 Pro | €520 | €80 | ~€440 |
| 500 | 300 Plus + 200 Pro | €2,800 | €350 | ~€2,450 |

At 50 paying users the project is self-sustaining. At 500 it's a meaningful side income. The Interrail community alone on Reddit has 300k members — converting 0.1% is enough.

---

## 11. Free-Tier Hosting Strategy

The entire stack can run at €0/month for the first several hundred users. Here is the exact setup.

### 11.1 Vercel (Frontend + API Routes)

**Plan:** Hobby (Free)

**Limits that matter:**
- 100 GB bandwidth/month — easily enough for early stage
- Serverless function execution: 100 GB-hours/month
- No custom domains on Hobby? Wrong — custom domains ARE supported on Hobby
- Deployments: unlimited

**What this covers:** The entire Next.js app — pages, API routes, image optimisation, Edge middleware.

**When to upgrade:** Once you need team members with access to the Vercel dashboard, or when you exceed bandwidth limits. Vercel Pro is €20/mo.

**One gotcha:** Vercel Hobby has a 10-second timeout on serverless functions. Long-running operations (email parsing, OCR) should be offloaded to a background job. Use Supabase Edge Functions or a free-tier background worker (see §11.5) for anything that might take longer.

### 11.2 Supabase (Database + Auth + Storage)

**Plan:** Free tier

**Free limits:**
- 500 MB database storage
- 1 GB file storage (tickets + journal photos)
- 50,000 monthly active users
- 2 GB bandwidth
- 500 MB RAM
- Unlimited API requests

**Critical: free tier pauses after 1 week of inactivity.** During development this is annoying but harmless. Once you have real users it won't be an issue since traffic keeps the project active. You can also set up a free uptime monitor (UptimeRobot, free plan) to ping your app's `/api/health` endpoint every 5 minutes — this counts as activity and prevents pausing.

**Setup steps:**
```bash
# 1. Create project at supabase.com
# 2. Get connection strings from Settings > Database
# 3. Set environment variables in Vercel:
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]   # server-side only, never expose

# 4. Run migrations with Prisma
npx prisma db push
```

**Storage bucket setup (run once):**
```sql
-- In Supabase SQL editor
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('tickets', 'tickets', false),       -- private: tickets are user-sensitive
  ('journal-photos', 'journal-photos', false),
  ('avatars', 'avatars', true);        -- public: avatar images

-- RLS policy: users can only access their own files
CREATE POLICY "Users can upload own tickets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tickets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own tickets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tickets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**When to upgrade:** Supabase Pro is $25/mo and removes the pause behaviour, gives you 8 GB storage, daily backups, and email support. Upgrade when you hit 200+ active users or 800 MB of storage.

### 11.3 Upstash Redis (Caching + Rate Limiting)

**Plan:** Free tier (Serverless Redis)

**Free limits:**
- 10,000 commands/day
- 256 MB storage
- 1 database

**Usage in RailPlanner:**
- Connection search cache (5-min TTL per query)
- Rate limiting for API endpoints
- Session-level request deduplication

**Setup:**
```bash
npm install @upstash/redis @upstash/ratelimit
```

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),  // 100 requests per minute
})

// Usage in an API route:
const { success, remaining } = await ratelimit.limit(userId)
if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
```

**When to upgrade:** Upstash Pay-As-You-Go starts at $0.2 per 100k commands. At 10k users you're looking at ~$5–10/mo.

### 11.4 Resend (Transactional Email)

**Plan:** Free tier

**Free limits:** 3,000 emails/month, 100/day — more than enough for early stage (password resets, welcome emails, delay notifications).

**Setup:**
```bash
npm install resend
```

```typescript
// lib/email.ts
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendDelayNotification(to: string, legTitle: string, delayMin: number) {
  await resend.emails.send({
    from:    'RailPlanner <notifications@railplanner.app>',
    to,
    subject: `Dein Zug hat ${delayMin} Min. Verspätung`,
    html:    `<p><strong>${legTitle}</strong> hat ${delayMin} Minuten Verspätung.</p>`,
  })
}
```

**Custom domain email:** Add your domain in the Resend dashboard and verify DNS records. Takes 10 minutes. Free on all plans.

**When to upgrade:** Resend Pro is $20/mo for 50k emails. Move there at ~1k active users.

### 11.5 Background Jobs (Free)

Vercel serverless functions time out at 10 seconds on Hobby. For longer tasks (email import parsing, OCR, Overpass queries), use one of:

**Option A: Supabase Edge Functions** (free, included in Supabase free tier)
- Deno-based, runs server-side
- No timeout on scheduled functions
- Use for: nightly heatmap pre-computation, delay polling for active trips

```typescript
// supabase/functions/poll-delays/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Find all active legs departing in the next 2 hours
  const { data: legs } = await supabase
    .from('legs')
    .select('*')
    .eq('status', 'planned')
    .gte('planned_departure', new Date().toISOString())
    .lte('planned_departure', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())

  for (const leg of legs ?? []) {
    // Fetch real-time delay from DB Hafas
    // Update leg.delay_minutes
    // Send push notification if delay > 5 min
  }

  return new Response('OK')
})
```

Schedule it with a Supabase cron job (pg_cron, free):
```sql
SELECT cron.schedule('poll-delays', '*/5 * * * *', $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/poll-delays',
    headers := '{"Authorization": "Bearer [service-role-key]"}'::jsonb
  );
$$);
```

**Option B: GitHub Actions (free, 2000 min/month)**
For less frequent scheduled jobs (nightly stats aggregation, year-in-review computation):

```yaml
# .github/workflows/nightly-stats.yml
name: Nightly stats aggregation
on:
  schedule:
    - cron: '0 2 * * *'     # 02:00 UTC every night
jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx tsx scripts/aggregate-stats.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 11.6 Map Tiles (Free)

**Stadia Maps:** Free tier includes 200,000 tile requests/month. More than sufficient until 1k+ active users.

Sign up at `client.stadiamaps.com` → create an API key → add to environment:
```env
NEXT_PUBLIC_STADIA_API_KEY=your_key_here
```

```typescript
// In your Maplibre initialisation
const map = new maplibregl.Map({
  container: 'map',
  style: `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${process.env.NEXT_PUBLIC_STADIA_API_KEY}`,
})
```

**OpenRailwayMap tiles** are completely free and have no rate limits for reasonable usage. No API key needed.

**When to upgrade:** Stadia Maps Pay-As-You-Go is $0.30 per 1000 tile requests after the free tier.

### 11.7 Complete Free-Tier Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
DATABASE_URL=postgresql://postgres:[pw]@[host]:5432/postgres

# Upstash
UPSTASH_REDIS_REST_URL=https://[url].upstash.io
UPSTASH_REDIS_REST_TOKEN=[token]

# Resend
RESEND_API_KEY=re_[key]

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=[key]
LEMONSQUEEZY_WEBHOOK_SECRET=[secret]
LEMONSQUEEZY_STORE_ID=[id]
LS_VARIANT_PLUS_MONTHLY=[id]
LS_VARIANT_PLUS_YEARLY=[id]
LS_VARIANT_PRO_MONTHLY=[id]
LS_VARIANT_PRO_YEARLY=[id]

# Maps
NEXT_PUBLIC_STADIA_API_KEY=[key]

# App
NEXT_PUBLIC_URL=https://railplanner.app

# Optional (add when enabling AI features)
ANTHROPIC_API_KEY=sk-ant-[key]
```

**Setting env vars in Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Set secrets (use --env flag for non-secret vars)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add LEMONSQUEEZY_WEBHOOK_SECRET production
# ... repeat for all secrets

# Or set them in the Vercel dashboard: Settings > Environment Variables
```

### 11.8 Deployment Checklist (First Deploy)

```bash
# 1. Create GitHub repo and push code
git init && git add . && git commit -m "initial commit"
gh repo create railplanner --private && git push -u origin main

# 2. Connect repo to Vercel (one-time)
#    → vercel.com → New Project → Import from GitHub

# 3. Create Supabase project
#    → supabase.com → New Project

# 4. Run database migrations
npx prisma db push

# 5. Set all environment variables in Vercel dashboard

# 6. Configure Lemon Squeezy webhook
#    → app.lemonsqueezy.com → Settings → Webhooks
#    URL: https://railplanner.app/api/billing/webhook
#    Events: subscription_created, subscription_updated,
#            subscription_cancelled, subscription_expired,
#            subscription_payment_failed

# 7. Configure Resend DNS records for custom domain

# 8. Set up UptimeRobot (free) to ping /api/health every 5 min
#    → uptimerobot.com → New Monitor → HTTPS → https://railplanner.app/api/health

# 9. Deploy
git push origin main    # Vercel auto-deploys on push
```

**Health check endpoint (`app/api/health/route.ts`):**
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    await supabase.from('users').select('count').limit(1)   // verify DB connectivity
    return NextResponse.json({ status: 'ok', ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
```

### 11.9 Cost Summary (Free Tier)

| Service | Free limit | Upgrade trigger | Upgrade cost |
|---|---|---|---|
| Vercel Hobby | 100 GB bandwidth | Team access / limits hit | €20/mo |
| Supabase Free | 500 MB DB, 1 GB storage, 50k MAU | 200+ users or 800 MB storage | $25/mo |
| Upstash Free | 10k commands/day | High API usage | ~$5/mo |
| Stadia Maps | 200k tiles/mo | 1k+ daily active users | ~$5/mo |
| Resend Free | 3k emails/mo | 1k+ users | $20/mo |
| Lemon Squeezy | Free (5% + $0.50 fee per transaction) | Never — fee scales with revenue | — |
| OpenRailwayMap | Unlimited | Never | — |
| Overpass API | Rate limited, free | High custom route usage | Self-host ($5/mo VPS) |
| GitHub | Unlimited public repos, 2k Actions min/mo | Private repos / CI minutes | $4/mo |
| **Total** | | **First ~200 users** | **€0/mo** |

**Note on Lemon Squeezy fees:** They charge 5% + $0.50 per transaction on the free plan, or 3.5% + $0.50 on the paid plan ($10/mo). At low transaction volumes the free plan is fine — you only pay when you earn. At €4/mo Plus, LS takes ~€0.70 per transaction. At 50 transactions/mo that's ~€35 in fees, well worth the zero VAT admin overhead.

---

## 12. Phased Rollout

### Phase 1 — MVP (Build this first, €0 cost)

Focus: core loop working end to end. Everything on free tiers.

- [ ] Auth (email + Google via Supabase Auth)
- [ ] Free vs Plus plan gating wired up via Lemon Squeezy + entitlements
- [ ] Trip + Leg CRUD (free tier: 3 trips / 10 legs)
- [ ] Connection search (DB only via db-hafas)
- [ ] Map visualisation (polylines + station markers via Maplibre + Stadia)
- [ ] Träwelling check-in
- [ ] Basic statistics (total km, trip count — free)
- [ ] `/api/health` endpoint + UptimeRobot monitor to prevent Supabase pausing
- [ ] PWA basics (installable, offline trip view)
- [ ] Billing settings page (upgrade flow to Plus/Pro via Lemon Squeezy)
- [ ] Webhook handler for subscription lifecycle events

### Phase 2 — Richness (Plus tier justified)

- [ ] SBB + ÖBB connection search
- [ ] Ticket Wallet (Plus only — Supabase Storage)
- [ ] Email import via Resend inbound (or Postmark)
- [ ] Live delay tracking + push notifications (Plus only)
- [ ] Travel Journal with photos (Plus only)
- [ ] Full statistics + heatmap (Plus only)
- [ ] Route reviews (write access: Plus+)
- [ ] Interrail tracker (Plus only)
- [ ] Achievements + gamification (Plus only)

### Phase 3 — Community & API (Pro tier justified)

- [ ] Public REST API + API key management (Pro only)
- [ ] Sharing & embed (public link: free; custom embed: Plus+)
- [ ] Collaborative trip planning (Pro only)
- [ ] Kalender-Export / iCal subscribe (Plus+)
- [ ] Packlisten (Plus+)
- [ ] Rolling stock database (basic info: free; full specs: Plus+)
- [ ] OpenRailwayMap tile layers in map (free)

### Phase 4 — Intelligence & Exploration (Pro tier premium)

- [ ] AI travel suggestions (Pro only, 10/month, Claude API cost covered by subscription margin)
- [ ] Screenshot OCR import (Plus+)
- [ ] Year-in-review page (Plus+)
- [ ] Share intent handler (Android PWA)
- [ ] Bucket list with iconic routes (Plus+)
- [ ] Custom route creation (free: 1 route; Plus+: unlimited)
- [ ] POI along route (Plus+)
- [ ] Elevation profile for custom routes (Plus+)
- [ ] OpenRailwayMap infrastructure panel (free)
- [ ] Rolling stock community contributions (Plus+)
- [ ] "Linke/rechte Seite" window view suggestions (Plus+)

---

*End of spec. Last updated: 2026-03-12 (v0.3 — added §10 Billing, §11 Free-Tier Hosting, §12 updated rollout)*
