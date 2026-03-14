import { config } from 'dotenv'
config({ path: '.env.local' })

const key = process.env.NAVITIA_API_KEY!
const swissKey = process.env.SWISS_OTD_API_KEY!
const nsKey = process.env.NS_API_KEY!
const basicAuth = Buffer.from(key + ':').toString('base64')

async function sncfStructure() {
  console.log('=== SNCF: full VJ structure for TGV 6107 ===')
  const since = new Date(); since.setHours(6, 0, 0, 0)
  const until = new Date(); until.setHours(23, 0, 0, 0)
  const url = `https://api.navitia.io/v1/coverage/sncf/vehicle_journeys?headsign=6107&since=${since.toISOString()}&until=${until.toISOString()}&count=1`
  const res = await fetch(url, { headers: { Authorization: `Basic ${basicAuth}` }, signal: AbortSignal.timeout(8000) })
  const data = await res.json()
  const vj = data.vehicle_journeys?.[0]
  if (vj) {
    console.log('keys:', Object.keys(vj).join(', '))
    console.log('physical_modes:', JSON.stringify(vj.physical_modes))
    console.log('journey_pattern keys:', JSON.stringify(Object.keys(vj.journey_pattern ?? {})))
    console.log('journey_pattern.physical_mode:', JSON.stringify(vj.journey_pattern?.physical_mode))
    console.log('trip:', JSON.stringify(vj.trip))
  } else {
    console.log('no VJ. keys:', Object.keys(data).join(', '))
    if (data.error) console.log('error:', data.error)
  }
}

async function swissOtdProbe() {
  console.log('\n=== Swiss OTD: trying different endpoints & params ===')
  const date = new Date().toISOString().slice(0, 10)
  const headers = { Authorization: `Bearer ${swissKey}` }

  // Try the root to check auth
  const root = await fetch('https://api.opentransportdata.swiss/formation/v2', { headers, signal: AbortSignal.timeout(6000) })
  console.log('root /formation/v2:', root.status, await root.text().then(t => t.slice(0, 200)))

  // Try with evu param (SBB EVU code = 11)
  const withEvu = await fetch(
    `https://api.opentransportdata.swiss/formation/v2/formations_stop_based?operationDate=${date}&trainNumber=1&evu=11`,
    { headers, signal: AbortSignal.timeout(6000) }
  )
  console.log('\nwith evu=11:', withEvu.status, await withEvu.text().then(t => t.slice(0, 300)))

  // Try IC 5
  const ic5 = await fetch(
    `https://api.opentransportdata.swiss/formation/v2/formations_stop_based?operationDate=${date}&trainNumber=5`,
    { headers, signal: AbortSignal.timeout(6000) }
  )
  console.log('\nIC 5:', ic5.status)
  const ic5Headers: Record<string, string> = {}
  ic5.headers.forEach((v, k) => { ic5Headers[k] = v })
  console.log('response headers:', JSON.stringify(ic5Headers))
  console.log('body:', await ic5.text().then(t => t.slice(0, 300)))
}

async function nsProbe() {
  console.log('\n=== NS: trying list endpoint ===')
  const headers = { 'Ocp-Apim-Subscription-Key': nsKey }

  // Try the list endpoint without a ritnummer
  const list = await fetch('https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein', { headers, signal: AbortSignal.timeout(6000) })
  console.log('list /trein:', list.status, await list.text().then(t => t.slice(0, 400)))

  // Try actual departures API to find real ritnummer
  const deps = await fetch('https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/departures?station=ASD&maxJourneys=3', { headers, signal: AbortSignal.timeout(6000) })
  console.log('\ndepartures ASD:', deps.status, await deps.text().then(t => t.slice(0, 500)))
}

async function main() {
  await sncfStructure()
  await swissOtdProbe()
  await nsProbe()
}

main().catch(console.error)
