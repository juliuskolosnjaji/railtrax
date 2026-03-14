import { config } from 'dotenv'
config({ path: '.env.local' })

const key = process.env.NS_API_KEY!
const h = { 'Ocp-Apim-Subscription-Key': key }

async function main() {
  const list = await fetch('https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein', { headers: h, signal: AbortSignal.timeout(5000) })
  const listData: Record<string, unknown> = await list.json()
  const ritnummer = Object.keys(listData)[0]
  console.log('ritnummer:', ritnummer)

  const r = await fetch(`https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein/${ritnummer}`, { headers: h, signal: AbortSignal.timeout(5000) })
  const data: Record<string, unknown> = await r.json()
  console.log('top keys:', Object.keys(data))
  console.log('type field:', JSON.stringify(data.type))
  const mats = (data.materieeldelen ?? []) as Record<string, unknown>[]
  console.log('materieeldelen count:', mats.length)
  if (mats[0]) {
    console.log('materieeldelen[0] keys:', Object.keys(mats[0]))
    console.log('materieeldelen[0].type:', JSON.stringify(mats[0].type))
    console.log('materieeldelen[0] full:', JSON.stringify(mats[0]).slice(0, 800))
  }
}

main().catch(console.error)
