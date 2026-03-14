import { config } from 'dotenv'
config({ path: '.env.local' })

const nsKey = process.env.NS_API_KEY!
const navitiaKey = process.env.NAVITIA_API_KEY!

async function main() {
  const h = { 'Ocp-Apim-Subscription-Key': nsKey }

  // Test individual endpoint with real ritnummer from list (8210 = SPR running now)
  console.log('=== NS /trein/8210 ===')
  const r = await fetch('https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein/8210', { headers: h, signal: AbortSignal.timeout(6000) })
  console.log('status:', r.status)
  const t = await r.text()
  console.log('response:', t.slice(0, 800))

  // Also test type map from list — extract a few running trains
  console.log('\n=== NS /trein list — extract train types ===')
  const list = await fetch('https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein', { headers: h, signal: AbortSignal.timeout(6000) })
  const listData: Record<string, Record<string, { treindelen?: {type?: string}[] }>> = await list.json()
  const sample = Object.entries(listData).slice(0, 5).map(([num, stations]) => {
    const first = Object.values(stations)[0]
    return { ritnummer: num, types: first?.treindelen?.map(d => d.type) }
  })
  console.log('sample running trains:', JSON.stringify(sample, null, 2))

  // SNCF — verify trip.id parsing works for physical mode
  console.log('\n=== SNCF trip.id physical mode parsing ===')
  const basicAuth = Buffer.from(navitiaKey + ':').toString('base64')
  const since = new Date(); since.setHours(6, 0, 0, 0)
  const until = new Date(); until.setHours(23, 0, 0, 0)
  const url = `https://api.navitia.io/v1/coverage/sncf/vehicle_journeys?headsign=6107&since=${since.toISOString()}&until=${until.toISOString()}&count=1`
  const sncfRes = await fetch(url, { headers: { Authorization: `Basic ${basicAuth}` }, signal: AbortSignal.timeout(8000) })
  const sncfData = await sncfRes.json()
  const vj = sncfData.vehicle_journeys?.[0]
  if (vj) {
    console.log('trip.id:', vj.trip?.id)
    // Parse physical mode from trip ID: "SNCF:date:trainNum:serviceNum:PhysicalMode"
    const mode = vj.trip?.id?.split(':').pop()
    console.log('parsed mode:', mode)
    // Also check headsign field
    console.log('headsign:', vj.headsign)
    console.log('name:', vj.name)
  }
}

main().catch(console.error)
