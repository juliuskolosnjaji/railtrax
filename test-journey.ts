import { createClient } from 'db-vendo-client'
import { profile } from 'db-vendo-client/p/dbnav/index.js'

async function run() {
  const client = createClient(profile, 'railtrax/1.0')
  const deps = await client.departures('8000044', { results: 200, duration: 200 })
  console.log("total departures:", deps.departures.length)
  const ic = deps.departures.find(d => d.line?.name?.includes('IC') || d.line?.name?.includes('RE'))
  if (ic) {
    const tripId = ic.tripId
    const trip = await client.trip(tripId, { stopovers: true })
    console.log(JSON.stringify(trip.trip.stopovers.slice(0,2).map(s => ({
      stationName: s.stop?.name,
      stationId: s.stop?.id,
      realName: s.stop?.station?.name // fallback maybe?
    })), null, 2))
  }
}
run().catch(console.error)
