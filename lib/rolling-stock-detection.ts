import { prisma } from '@/lib/prisma'

interface DetectionResult {
  rollingStockId: string
  confidence: number // 0-1
  reason: string
}

// Regex patterns ordered by specificity (most specific first)
const PATTERNS: Array<{ pattern: RegExp; id: string; reason: string }> = [
  // ICE Neo / Velaro variants — before generic ICE
  { pattern: /\bice\s*3?\s*neo\b/i,        id: 'ice-3-neo',      reason: 'ICE 3 Neo pattern' },
  { pattern: /\bice\s*3?\s*velaro\b/i,      id: 'ice-3-velaro',   reason: 'ICE 3 Velaro pattern' },
  { pattern: /\bbr\s*408\b/i,               id: 'ice-3-neo',      reason: 'BR 408 pattern' },
  { pattern: /\bbr\s*407\b/i,               id: 'ice-3-velaro',   reason: 'BR 407 pattern' },
  { pattern: /\bbr\s*412\b/i,               id: 'ice-4-13',       reason: 'BR 412 pattern' },
  { pattern: /\bbr\s*411\b|\bice[-\s]?t\b/i, id: 'ice-t',         reason: 'ICE-T / BR 411 pattern' },
  { pattern: /\bice\s*4\b/i,                id: 'ice-4-13',       reason: 'ICE 4 pattern' },
  { pattern: /\bice\s*3\b/i,                id: 'ice-3',          reason: 'ICE 3 pattern' },
  { pattern: /\bice\s*2\b/i,                id: 'ice-2',          reason: 'ICE 2 pattern' },
  { pattern: /\bice\s*1\b/i,                id: 'ice-1',          reason: 'ICE 1 pattern' },
  // IC 2 before generic IC
  { pattern: /\bic\s*2\b|\btwindexx\b/i,    id: 'db-ic2',         reason: 'IC 2 / Twindexx pattern' },
  { pattern: /\bintercity\b|\b^ic\s*\d/i,   id: 'db-intercity',   reason: 'Intercity pattern' },
  { pattern: /\bnightjet\b|\b^nj\s*\d/i,    id: 'db-nightjet',    reason: 'Nightjet pattern' },
  // ÖBB
  { pattern: /\brailjet\s*x(press)?\b|\brjx\b/i, id: 'obb-rjx',  reason: 'RJX pattern' },
  { pattern: /\brailjet\b|\b^rj\s*\d/i,     id: 'obb-railjet',    reason: 'Railjet pattern' },
  { pattern: /\bcityjet\b/i,                 id: 'obb-cityjet',    reason: 'Cityjet pattern' },
  // SBB
  { pattern: /\bgiruno\b|\brab[ea]\s*501\b/i, id: 'sbb-giruno',   reason: 'Giruno pattern' },
  { pattern: /\bicn\b|\brab[a-z]+\s*500\b/i, id: 'sbb-icn',      reason: 'ICN pattern' },
  { pattern: /\betr\s*610\b|\bastoro\b/i,    id: 'sbb-etr610',    reason: 'ETR 610 / Astoro pattern' },
  { pattern: /\bfv[-\s]?dosto\b|\brab[a-z]+\s*512\b/i, id: 'sbb-fv-dosto', reason: 'FV-Dosto pattern' },
  { pattern: /\btwindexx\s*express\b|\brab[a-z]+\s*511\b/i, id: 'sbb-twindexx', reason: 'Twindexx Express' },
  { pattern: /\bic\s*2000\b/i,              id: 'sbb-ic2000',     reason: 'IC 2000 pattern' },
  // SNCF
  { pattern: /\btgv\s*pos\b/i,              id: 'tgv-pos',        reason: 'TGV POS pattern' },
  { pattern: /\bouigo\b/i,                  id: 'ouigo',          reason: 'OUIGO pattern' },
  { pattern: /\bthalys\b|\bpbka\b/i,        id: 'thalys-pbka',    reason: 'Thalys/PBKA pattern' },
  { pattern: /\btgv\b|\binoui\b/i,          id: 'tgv-inoui',      reason: 'TGV / Inouï pattern' },
  // Eurostar
  { pattern: /\be320\b|\bclass\s*374\b/i,   id: 'eurostar-e320',  reason: 'Eurostar e320 pattern' },
  { pattern: /\be300\b|\bclass\s*373\b|\beurostar\b/i, id: 'eurostar-e300', reason: 'Eurostar e300 pattern' },
  // Italy
  { pattern: /\betr\s*400\b|\bfrecciarossa\s*1000\b/i, id: 'trenitalia-fr1000', reason: 'FR 1000 pattern' },
  { pattern: /\betr\s*500\b|\bfrecciarossa\b/i, id: 'trenitalia-etr500', reason: 'ETR 500 pattern' },
  { pattern: /\betr\s*600\b|\bfrecciargento\b|\b^fa\s*\d/i, id: 'trenitalia-fa', reason: 'Frecciargento' },
  { pattern: /\betr\s*460\b|\bfrecciabianca\b|\b^fb\s*\d/i, id: 'trenitalia-fb', reason: 'Frecciabianca' },
  { pattern: /\bitalo\s*evo\b/i,            id: 'italo-evo',      reason: 'Italo EVO pattern' },
  { pattern: /\bitalo\b|\bagv\b/i,          id: 'italo-agv',      reason: 'Italo AGV pattern' },
  // Spain
  { pattern: /\bave\s*s[-\s]?103\b|\bvelaro\s*e\b/i, id: 'renfe-ave-s103', reason: 'AVE S-103' },
  { pattern: /\bave\s*s[-\s]?102\b|\btalgo\s*350\b/i, id: 'renfe-ave-s102', reason: 'AVE S-102' },
  { pattern: /\bavlo\b/i,                   id: 'renfe-avlo',     reason: 'AVLO pattern' },
  { pattern: /\biryo\b/i,                   id: 'iryo',           reason: 'Iryo pattern' },
  // Netherlands
  { pattern: /\bicng\b/i,                   id: 'ns-icng',        reason: 'ICNG pattern' },
  { pattern: /\bvirm\b/i,                   id: 'ns-virm',        reason: 'VIRM pattern' },
  // Belgium
  { pattern: /\bm7\b/i,                     id: 'sncb-m7',        reason: 'M7 pattern' },
  { pattern: /\bi11\b/i,                    id: 'sncb-i11',       reason: 'I11 pattern' },
  // Czech
  { pattern: /\bregiojet\b/i,               id: 'regiojet',       reason: 'RegioJet pattern' },
  // Poland
  { pattern: /\bpendolino\b|\bed250\b/i,    id: 'pkp-pendolino',  reason: 'Pendolino pattern' },
  { pattern: /\beip\b/i,                    id: 'pkp-eip',        reason: 'EIP pattern' },
  { pattern: /\bdart\b|\bed161\b/i,         id: 'pkp-dart',       reason: 'Dart pattern' },
  // Sweden
  { pattern: /\bsj\s*3000\b/i,             id: 'sj-3000',        reason: 'SJ 3000 pattern' },
  { pattern: /\bx\s*2000\b|\bx2\b/i,       id: 'sj-x2000',       reason: 'X 2000 pattern' },
  // Misc
  { pattern: /\bflixtrain\b|\bflx\b/i,      id: 'flixtrain',      reason: 'Flixtrain pattern' },
  { pattern: /\bwestbahn\b/i,               id: 'westbahn',       reason: 'Westbahn pattern' },
  { pattern: /\beuronight\b|\b^en\s*\d/i,   id: 'en-generic',     reason: 'EuroNight pattern' },
  // DB regional
  { pattern: /\bdesiro\s*hc\b|\bbr\s*462\b/, id: 'db-462',        reason: 'Desiro HC / BR 462' },
  { pattern: /\btalent\s*2\b|\bbr\s*442\b/i, id: 'db-442',        reason: 'Talent 2 / BR 442' },
  { pattern: /\btalent\s*3\b|\bbr\s*463\b/i, id: 'db-talent3',    reason: 'Talent 3 / BR 463' },
  { pattern: /\bcoradia\b|\bbr\s*44[05]\b/i, id: 'db-440',        reason: 'Coradia / BR 440' },
  { pattern: /\bflirt\b|\bbr\s*429\b/i,      id: 'db-429',        reason: 'FLIRT / BR 429' },
]

/**
 * Detect rolling stock by matching a joined input string against known patterns.
 * Strategy: join trainNumber + lineName + operator into one string,
 * try regex patterns in order (most specific first), return first match.
 * Falls back to DB series substring search if no pattern matches.
 */
export async function detectRollingStock(
  operator?: string | null,
  trainType?: string | null,
  trainNumber?: string | null,
  lineName?: string | null,
): Promise<DetectionResult | null> {
  // Build a single lookup string from all available identifiers
  const parts = [trainNumber, lineName, trainType, operator].filter(Boolean)
  if (parts.length === 0) return null
  const lookup = parts.join(' ')

  // 1. Try regex patterns (client-side, zero DB queries)
  for (const { pattern, id, reason } of PATTERNS) {
    if (pattern.test(lookup)) {
      // Verify the ID actually exists in the DB before returning
      const stock = await prisma().rollingStock.findUnique({ where: { id } })
      if (stock) {
        return { rollingStockId: id, confidence: 0.9, reason }
      }
    }
  }

  // 2. Fallback: DB full-text substring search on series
  const normalizedOperator = operator?.trim()
  const candidates = await prisma().rollingStock.findMany({
    where: normalizedOperator
      ? { operator: { contains: normalizedOperator, mode: 'insensitive' } }
      : undefined,
    orderBy: { series: 'asc' },
  })

  const best = candidates.find(s =>
    lookup.toLowerCase().includes(s.series.toLowerCase()) ||
    s.series.toLowerCase().includes(lookup.toLowerCase()),
  )

  if (best) {
    return { rollingStockId: best.id, confidence: 0.5, reason: `Series match: ${best.series}` }
  }

  return null
}

/**
 * Common train type to rolling stock mappings for fallback detection (no DB needed)
 */
export function getFallbackRollingStockId(
  trainNumber?: string | null,
  lineName?: string | null,
  trainType?: string | null,
  operator?: string | null,
): string | null {
  const lookup = [trainNumber, lineName, trainType, operator].filter(Boolean).join(' ')
  if (!lookup) return null

  for (const { pattern, id } of PATTERNS) {
    if (pattern.test(lookup)) return id
  }
  return null
}
