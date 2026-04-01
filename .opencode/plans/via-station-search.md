# Plan: Via Station + Push Filters to API

## Files to modify

### 1. `lib/vendo.ts`

**Change**: Extend `searchJourneys()` signature and implementation

- Add new interface `JourneySearchOptions` before the function:
```ts
export interface JourneySearchOptions {
  viaIbnr?: string
  bike?: boolean
  maxTransfers?: number
  onlyLongDistance?: boolean
}
```

- Update function signature (line 317):
```ts
export async function searchJourneys(
  fromIbnr: string,
  toIbnr: string,
  datetime: Date,
  travelClass: 1 | 2,
  options?: JourneySearchOptions,
): Promise<Journey[]>
```

- Update cache key (line 323-324):
```ts
const { viaIbnr, bike, maxTransfers, onlyLongDistance } = options ?? {}
const bucket = Math.floor(datetime.getTime() / 300_000)
const key = `journeys:${fromIbnr}:${toIbnr}:${viaIbnr ?? 'none'}:${bucket}:${travelClass}:${bike ? 'bike' : 'nobike'}:${maxTransfers ?? 'any'}:${onlyLongDistance ? 'ld' : 'all'}`
```

- Update `client.journeys()` call (line 327-333), add spread options:
```ts
const result = await client.journeys(fromIbnr, toIbnr, {
  departure: datetime,
  results: 6,
  tickets: false,
  firstClass: travelClass === 1,
  products: LONG_DISTANCE_PRODUCTS,
  ...(viaIbnr && { via: viaIbnr }),
  ...(bike && { bike: true }),
  ...(maxTransfers !== undefined && { transfers: maxTransfers }),
})
```

- Change `return (result.journeys as any[])` to `let journeys = (result.journeys as any[])` and add post-filter at end:
```ts
if (onlyLongDistance) {
  const longDistancePattern = /^(ICE|IC|EC|RJ|NJ|TGV|OUIGO|FR)/i
  journeys = journeys.filter((j: Journey) =>
    j.legs.some(l => longDistancePattern.test(l.trainNumber ?? ''))
  )
}
return journeys
```

---

### 2. `app/api/search/connections/route.ts`

**Change**: Parse and forward new query params

After line 28 (`const travelClass = ...`), add:
```ts
const via = req.nextUrl.searchParams.get('via') ?? undefined
const bike = req.nextUrl.searchParams.get('bike') === 'true'
const maxTransfersStr = req.nextUrl.searchParams.get('maxTransfers')
const maxTransfers = maxTransfersStr ? parseInt(maxTransfersStr, 10) : undefined
const onlyLongDistance = req.nextUrl.searchParams.get('onlyLongDistance') === 'true'
```

Update the `searchJourneys` call (line 31):
```ts
const journeys = await searchJourneys(from, to, datetime, travelClass, {
  viaIbnr: via,
  bike: bike || undefined,
  maxTransfers,
  onlyLongDistance: onlyLongDistance || undefined,
})
```

---

### 3. `app/(app)/search/page.tsx`

#### 3a. Add Via station state

After line 580 (`const [to, setTo] = useState...`), add:
```ts
const [showVia, setShowVia] = useState(false)
const [via, setVia] = useState<Station | null>(null)
const [viaQuery, setViaQuery] = useState('')
const [viaFocus, setViaFocus] = useState(false)
const debouncedVia = useDebounce(viaQuery, 300)
```

#### 3b. Add Via autocomplete query

After the `toSuggestions` query (line 630), add:
```ts
const { data: viaSuggestions } = useQuery({
  queryKey: ['stations', debouncedVia],
  queryFn: () =>
    fetch(`/api/stations/search?q=${encodeURIComponent(debouncedVia)}`)
      .then(r => r.json())
      .then(d => d.data as Station[]),
  enabled: debouncedVia.length >= 2 && viaFocus,
  staleTime: 1000 * 60 * 60,
})
```

#### 3c. Update searchParams type and query

Line 633-635, update searchParams type:
```ts
const [searchParams, setSearchParams] = useState<{
  from: string; to: string; via?: string; datetime: string; class: number
  bike?: boolean; maxTransfers?: number; onlyLongDistance?: boolean
} | null>(null)
```

Update the queryFn (line 637-668), after building URLSearchParams:
```ts
const p = new URLSearchParams({
  from: searchParams.from,
  to: searchParams.to,
  datetime: searchParams.datetime,
  class: String(searchParams.class),
})
if (searchParams.via) p.set('via', searchParams.via)
if (searchParams.bike) p.set('bike', 'true')
if (searchParams.maxTransfers !== undefined) p.set('maxTransfers', String(searchParams.maxTransfers))
if (searchParams.onlyLongDistance) p.set('onlyLongDistance', 'true')
```

#### 3d. Update handleSearch

Line 671-682, update to include via and push filters:
```ts
function handleSearch() {
  if (!from || !to) return
  const datetime = new Date(`${date}T${time}`).toISOString()
  
  // Map UI filters to API params
  let maxTransfers: number | undefined
  if (filters.direct) maxTransfers = 0
  else if (filters.maxChanges2) maxTransfers = 2
  
  setSearchParams({
    from: from.id,
    to: to.id,
    via: via?.id,
    datetime,
    class: travelClass,
    bike: filters.bike || undefined,
    maxTransfers,
    onlyLongDistance: filters.onlyICE || undefined,
  })
  // ... recent searches logic stays the same
}
```

#### 3e. Remove client-side applyFilters

Remove the `applyFilters` function (lines 694-707) and line 709:
```ts
// DELETE: function applyFilters(journeys: Journey[]): Journey[] { ... }
// CHANGE: const filtered = journeys ? applyFilters(journeys) : []
// TO:     const filtered = journeys ?? []
```

Keep only `sortBy` client-side:
```ts
const filtered = journeys ? [...journeys].sort((a, b) => {
  if (sortBy === 'duration') return a.totalDuration - b.totalDuration
  if (sortBy === 'changes') return a.changes - b.changes
  const aTime = new Date(a.legs[0]?.departure ?? 0).getTime()
  const bTime = new Date(b.legs[0]?.departure ?? 0).getTime()
  return aTime - bTime
}) : []
```

#### 3f. Add Via UI in search card

In the search card (after line 752, after the Von StationInput and before the swap button), add:

```tsx
{showVia && (
  <StationInput
    label="Via"
    value={via}
    query={viaQuery}
    onChange={setViaQuery}
    onSelect={v => setVia(v)}
    suggestions={viaSuggestions}
    onFocus={() => setViaFocus(true)}
    onBlur={() => setViaFocus(false)}
    placeholder="Zwischenstopp..."
    icon={
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
        <circle cx="6" cy="6" r="1.5" fill="hsl(var(--muted-foreground))" />
      </svg>
    }
  />
)}
```

Add a "+ Via" toggle button. Best placement: below the Von/Swap/Nach row, before the date/time row. Add after line 785 (after the Nach StationInput closing tag, before the Date section):

Actually, better UX: put it as a small button below the Von/Nach row. Add after the swap button closing tag area, or as a separate row. The cleanest approach:

After line 785 (Nach StationInput), before the Date div (line 788), add:
```tsx
{!showVia && (
  <button
    onClick={() => setShowVia(true)}
    style={{
      fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
      border: '1px dashed hsl(var(--border))', background: 'none',
      color: 'hsl(var(--muted-foreground))', alignSelf: 'flex-end', height: 36,
    }}
  >
    + Via
  </button>
)}
```

#### 3g. Update handleShift to preserve via

Line 684-692, ensure via is preserved (it already is since we spread searchParams).

#### 3h. Update recent searches click handler

Line 951, when clicking a recent search, also reset via:
```ts
onClick={() => { setFrom(r.from); setTo(r.to); setVia(null); setShowVia(false) }}
```

---

## Execution order

1. `lib/vendo.ts` — backend function
2. `app/api/search/connections/route.ts` — API route
3. `app/(app)/search/page.tsx` — UI (largest change)
4. TypeScript check
