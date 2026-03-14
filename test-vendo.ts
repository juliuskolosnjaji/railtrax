import { createClient } from 'db-vendo-client'
import { profile } from 'db-vendo-client/p/dbnav/index.js'

async function run() {
  const client = createClient(profile, 'railtrax/1.0')
  const locations = await client.locations('Bonn Hbf', { results: 1 })
  const ibnr = locations[0].id
  console.log("Station ID:", ibnr)
  
  const deps = await client.departures(ibnr, { results: 1, duration: 20 })
  console.log("Departures:", deps.departures.length)
  if (deps.departures.length > 0) {
     const tripId = deps.departures[0].tripId
     console.log("Trip ID:", tripId)
     const trip = await client.trip(tripId, { stopovers: true })
     console.log("Stopovers[0]:", JSON.stringify(trip.trip.stopovers[0], null, 2))
  }
}
run().catch(console.error)
