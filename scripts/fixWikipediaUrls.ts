import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const fixes = [
  { series: 'SBB Giruno', url: 'https://de.wikipedia.org/wiki/SBB_RABe_501' },
  { series: 'SBB Astoro', url: 'https://de.wikipedia.org/wiki/SBB_RABe_503' },
  { series: 'SBB KISS', url: 'https://de.wikipedia.org/wiki/Stadler_KISS' },
  { series: 'SBB FLIRT', url: 'https://de.wikipedia.org/wiki/Stadler_FLIRT' },
  { series: 'SBB ICN', url: 'https://de.wikipedia.org/wiki/SBB_RABDe_500' },
  { series: 'SBB IC2000', url: 'https://de.wikipedia.org/wiki/SBB-Personenwagen_IC2000' },
  { series: 'RABe 200 NPZ', url: 'https://de.wikipedia.org/wiki/SBB_RABe_NPZ' },
  { series: 'Giruno', url: 'https://de.wikipedia.org/wiki/SBB_RABe_501' },
  { series: 'Astoro', url: 'https://de.wikipedia.org/wiki/SBB_RABe_503' },
  { series: 'KISS', url: 'https://de.wikipedia.org/wiki/Stadler_KISS' },
  { series: 'FLIRT', url: 'https://de.wikipedia.org/wiki/Stadler_FLIRT' },
  { series: 'ICN', url: 'https://de.wikipedia.org/wiki/SBB_RABDe_500' },
  { series: 'NPZ', url: 'https://de.wikipedia.org/wiki/SBB_RABe_NPZ' },
  { series: 'RABe 501', url: 'https://de.wikipedia.org/wiki/SBB_RABe_501' },
  { series: 'RABe 503', url: 'https://de.wikipedia.org/wiki/SBB_RABe_503' },
  { series: 'RABe 511', url: 'https://de.wikipedia.org/wiki/Stadler_KISS' },
  { series: 'RABe 522', url: 'https://de.wikipedia.org/wiki/Stadler_FLIRT' },
  { series: 'RABDe 500', url: 'https://de.wikipedia.org/wiki/SBB_RABDe_500' },
]

async function fixWikipediaUrls() {
  console.log('Fixing Swiss rolling stock Wikipedia URLs...')

  for (const fix of fixes) {
    const result = await prisma.rollingStock.updateMany({
      where: { 
        OR: [
          { series: { contains: fix.series } },
        ]
      },
      data: { wikiUrl: fix.url }
    })
    if (result.count > 0) {
      console.log(`Fixed ${result.count} entries for "${fix.series}"`)
    }
  }

  console.log('Done!')
}

fixWikipediaUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
