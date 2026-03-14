/**
 * Formation source integration test — verbose version.
 *
 * Calls each source DIRECTLY (bypasses getFormation/Redis) so we can see
 * the raw HTTP status and response body, not just the final result.
 *
 * Run: npx tsx scripts/testFormation.ts
 * (dotenv loads .env.local automatically — no --env-file flag needed)
 *
 * If Marudor shows "self-signed cert" error: your machine has an HTTPS proxy
 * intercepting traffic. This will NOT affect production (Vercel). To test locally:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/testFormation.ts
 */

// ─── Load .env.local first — must be before any other imports ─────────────────
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' }) // fallback

// ─── Imports ──────────────────────────────────────────────────────────────────
import type { FormationLeg } from '../lib/formation/types'

// ─── Env check ────────────────────────────────────────────────────────────────
function checkEnv() {
  const keys = {
    SWISS_OTD_API_KEY: process.env.SWISS_OTD_API_KEY,
    NS_API_KEY:        process.env.NS_API_KEY,
    NAVITIA_API_KEY:   process.env.NAVITIA_API_KEY,
  }
  console.log('\nEnv vars:')
  for (const [k, v] of Object.entries(keys)) {
    const status = v ? `✓ set (${v.slice(0, 8)}…)` : '✗ MISSING'
    console.log(`  ${k}: ${status}`)
  }
  console.log('  Marudor: no key needed')
  console.log()
}

// ─── Raw HTTP probe ────────────────────────────────────────────────────────────
async function probe(
  label: string,
  url: string,
  headers: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; text: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Railtrax/1.0-test', ...headers },
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    const snippet = text.slice(0, 400).replace(/\s+/g, ' ')
    const icon =
      res.ok ? '✓' :
      res.status === 401 ? '✗ 401 AUTH FAILED' :
      res.status === 403 ? '✗ 403 FORBIDDEN' :
      res.status === 404 ? '○ 404 not found' :
      `✗ ${res.status}`
    console.log(`   ${icon}`)
    if (!res.ok || process.env.VERBOSE) console.log(`   body: ${snippet}`)
    return { ok: res.ok, status: res.status, text }
  } catch (err: any) {
    const cause = err?.cause?.message ?? err?.cause?.code ?? ''
    console.log(`   ✗ fetch error: ${err.message}${cause ? ` (${cause})` : ''}`)
    if (cause.includes('SELF_SIGNED') || cause.includes('CERT')) {
      console.log('   ↳ SSL proxy issue — won\'t affect Vercel production.')
      console.log('   ↳ To test locally: NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/testFormation.ts')
    }
    return null
  }
}

// ─── Test: Marudor ────────────────────────────────────────────────────────────
async function testMarudor() {
  console.log('─── 1. Marudor (DB — no key) ───────────────────────────────')

  // Use trainInfo endpoint — more lenient about exact departure time
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dt = `${today.getFullYear()}${pad(today.getMonth()+1)}${pad(today.getDate())}0800`

  // Try several ICE numbers that run most days
  const candidates = ['693', '77', '1', '11', '599', '521', '529']
  let found = false

  for (const num of candidates) {
    const url = `https://marudor.de/api/reihung/v4/trainInfo/${num}?datetime=${dt}`
    process.stdout.write(`  trainInfo ICE ${num}... `)
    const r = await probe(`ICE ${num}`, url)
    if (r?.ok) {
      const data = JSON.parse(r.text)
      console.log(`  ← series: "${data?.train?.type}" name: "${data?.train?.name ?? '—'}"`)
      found = true
      break
    }
    if (!r) break  // Network/SSL error — stop trying, won't get better
  }

  if (!found) {
    // Also try formation endpoint with timestamp
    const ts = new Date().setHours(8, 0, 0, 0)
    const url = `https://marudor.de/api/reihung/v4/formation/693/${ts}`
    process.stdout.write(`  formation ICE 693... `)
    await probe('formation', url)
  }
}

// ─── Test: Swiss OTD ─────────────────────────────────────────────────────────
async function testSwissOtd() {
  console.log('\n─── 2. Swiss OTD (SBB) ─────────────────────────────────────')
  const key = process.env.SWISS_OTD_API_KEY
  if (!key) { console.log('  ✗ SWISS_OTD_API_KEY not set'); return }

  const date = new Date().toISOString().slice(0, 10)
  const headers = { Authorization: `Bearer ${key}` }

  // Try multiple IC/IR train numbers — Swiss IC trains run daily
  const candidates = [
    { num: '1',   label: 'IC 1' },
    { num: '5',   label: 'IC 5' },
    { num: '3',   label: 'IC 3' },
    { num: '6',   label: 'IC 6' },
    { num: '8',   label: 'IC 8' },
    { num: '2000', label: 'IR 2000' },
  ]

  for (const c of candidates) {
    const url = `https://api.opentransportdata.swiss/formation/v2/formations_stop_based` +
      `?operationDate=${date}&trainNumber=${c.num}`
    process.stdout.write(`  ${c.label} (trainNumber=${c.num})... `)
    const r = await probe(c.label, url, headers)
    if (r?.ok) {
      const data = JSON.parse(r.text)
      // Explore structure to find vehicle designations
      const vehicles = data?.vehicles ?? data?.formation?.vehicles ?? data?.trainFormation?.vehicles ?? []
      const firstDesignation = vehicles[0]?.typeDesignation ?? vehicles[0]?.vehicleType ?? JSON.stringify(Object.keys(data ?? {})).slice(0, 80)
      console.log(`  ← ${vehicles.length} vehicles. First designation: "${firstDesignation}"`)
      console.log(`  ← Response keys: ${Object.keys(data ?? {}).join(', ')}`)
      break
    }
    if (r?.status === 401 || r?.status === 403) break  // Auth failed — no point trying more
    if (!r) break  // Network error
  }
}

// ─── Test: NS ─────────────────────────────────────────────────────────────────
async function testNs() {
  console.log('\n─── 3. NS (Netherlands) ────────────────────────────────────')
  const key = process.env.NS_API_KEY
  if (!key) { console.log('  ✗ NS_API_KEY not set'); return }

  const headers = { 'Ocp-Apim-Subscription-Key': key }

  // Step 1: fetch live list to get a real ritnummer for today
  process.stdout.write('  Fetching live train list... ')
  const listRes = await probe('list', 'https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein', headers)
  let liveRitnummer: string | null = null
  if (listRes?.ok) {
    const listData: Record<string, unknown> = JSON.parse(listRes.text)
    liveRitnummer = Object.keys(listData)[0] ?? null
    console.log(`  ← ${Object.keys(listData).length} active trains. Using ritnummer ${liveRitnummer}`)
  }

  // Step 2: probe individual endpoint with the live ritnummer
  const candidates = liveRitnummer ? [liveRitnummer] : ['700', '1700', '3501']
  for (const num of candidates) {
    const url = `https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein/${num}`
    process.stdout.write(`  ritnummer ${num}... `)
    const r = await probe(num, url, headers)
    if (r?.ok) {
      const data = JSON.parse(r.text)
      // materieeldelen[].type is a plain string, e.g. "ICE-3NEO", "SNG 3"
      const parts: { type?: string; faciliteiten?: string[] }[] = data?.materieeldelen ?? []
      const firstType = parts[0]?.type ?? '?'
      const faciliteiten = parts.flatMap((p: { faciliteiten?: string[] }) => p.faciliteiten ?? [])
      console.log(`  ← ${parts.length} materieeldelen. First type: "${firstType}"`)
      console.log(`  ← faciliteiten: ${faciliteiten.join(', ')}`)
      console.log(`  ← Response keys: ${Object.keys(data ?? {}).join(', ')}`)
      break
    }
    if (r?.status === 401 || r?.status === 403) break
    if (!r) break
  }
}

// ─── Test: SNCF Navitia ───────────────────────────────────────────────────────
async function testSncf() {
  console.log('\n─── 4. SNCF Navitia (France) ───────────────────────────────')
  const key = process.env.NAVITIA_API_KEY
  if (!key) { console.log('  ✗ NAVITIA_API_KEY not set'); return }

  const basicAuth = Buffer.from(`${key}:`).toString('base64')
  const headers = { Authorization: `Basic ${basicAuth}` }

  // Verify auth first
  process.stdout.write('  Auth check (coverage endpoint)... ')
  const authCheck = await probe('auth', 'https://api.navitia.io/v1/coverage', headers)
  if (!authCheck?.ok) return

  // 18-hour window for today, early morning → evening
  const since = new Date(); since.setHours(5, 0, 0, 0)
  const until = new Date(); until.setHours(23, 0, 0, 0)
  const sinceStr = since.toISOString()
  const untilStr = until.toISOString()

  // TGV numbers that run every day Paris→Lyon (very high frequency)
  const candidates = ['6201', '6203', '6101', '6107', '5107', '5109', '5121', '5153']

  for (const num of candidates) {
    const url = `https://api.navitia.io/v1/coverage/sncf/vehicle_journeys` +
      `?headsign=${num}&since=${sinceStr}&until=${untilStr}&count=1`
    process.stdout.write(`  TGV/INOUI ${num}... `)
    const r = await probe(num, url, headers)
    if (r?.ok) {
      const data = JSON.parse(r.text)
      const vj = data?.vehicle_journeys?.[0]
      if (vj) {
        console.log(`  ← name: "${vj.name}", mode: "${vj.physical_modes?.[0]?.name}"`)
        break
      } else {
        console.log(`  ← HTTP 200 but no vehicle_journeys for ${num}`)
      }
    }
    if (r?.status === 401 || r?.status === 403) break
    if (!r) break
  }
}

// ─── Source function test — after probes ──────────────────────────────────────
async function runSourceFunctions() {
  console.log('\n\n═══ Source function results ════════════════════════════════\n')

  const { marudorLookup } = await import('../lib/formation/marudor')
  const { swissOtdLookup } = await import('../lib/formation/swissOtd')
  const { nsLookup } = await import('../lib/formation/ns')
  const { sncfLookup } = await import('../lib/formation/sncf')

  const today = new Date()

  // For NS: find a live ritnummer from the list endpoint
  let nsRitnummer = '8210'
  let nsLineName = 'SPR 8210'
  if (process.env.NS_API_KEY) {
    try {
      const listRes = await fetch('https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein', {
        headers: { 'Ocp-Apim-Subscription-Key': process.env.NS_API_KEY },
        signal: AbortSignal.timeout(5000),
      })
      if (listRes.ok) {
        const listData: Record<string, unknown> = await listRes.json()
        const firstNum = Object.keys(listData)[0]
        if (firstNum) { nsRitnummer = firstNum; nsLineName = `train ${firstNum}` }
      }
    } catch { /* ignore */ }
  }

  const cases: Array<{ label: string; fn: (l: FormationLeg) => Promise<unknown>; leg: FormationLeg }> = [
    {
      label: 'Marudor — ICE 693',
      fn: marudorLookup,
      leg: { lineName: 'ICE 693', trainNumber: '693', originIbnr: '8000261', plannedDeparture: today, operator: 'DB Fernverkehr AG' },
    },
    {
      label: 'Swiss OTD — IC 5',
      fn: swissOtdLookup,
      leg: { lineName: 'IC 5', trainNumber: '5', originIbnr: '8503000', plannedDeparture: today, operator: 'SBB' },
    },
    {
      label: `NS — ${nsLineName}`,
      fn: nsLookup,
      leg: { lineName: nsLineName, trainNumber: nsRitnummer, originIbnr: '8400058', plannedDeparture: today, operator: 'NS' },
    },
    {
      label: 'SNCF — TGV 6107',
      fn: sncfLookup,
      leg: { lineName: 'TGV 6107', trainNumber: '6107', originIbnr: '8727100', plannedDeparture: today, operator: 'SNCF' },
    },
  ]

  let live = 0
  for (const { label, fn, leg } of cases) {
    process.stdout.write(`${label}... `)
    try {
      const result = await fn(leg) as Record<string, unknown> | null
      if (result) {
        console.log(`✓ [${result.source}] ${result.series}`)
        live++
      } else {
        console.log('→ null')
      }
    } catch (err: any) {
      const cause = err?.cause?.code ?? err?.cause?.message ?? ''
      console.log(`✗ ${err.message}${cause ? ` (${cause})` : ''}`)
    }
  }

  const total = cases.filter(c => {
    const key = c.label.includes('Marudor') ? null :
      c.label.includes('Swiss') ? process.env.SWISS_OTD_API_KEY :
      c.label.includes('NS') ? process.env.NS_API_KEY : process.env.NAVITIA_API_KEY
    return c.label.includes('Marudor') || !!key
  }).length

  console.log(`\n${live}/${total} configured sources returned live data`)
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]
  console.log('═'.repeat(60))
  console.log('Formation source integration test (verbose)')
  console.log(`Date: ${new Date().toISOString().slice(0, 10)}  Day: ${day}`)
  console.log('═'.repeat(60))

  checkEnv()

  await testMarudor()
  await testSwissOtd()
  await testNs()
  await testSncf()

  await runSourceFunctions()
  console.log()
}

main().catch(console.error)
