import { prisma } from '@/lib/prisma'

interface DetectionResult {
  rollingStockId: string
  confidence: number // 0-1
  reason: string
}

/**
 * Auto-detect rolling stock based on leg information
 * Uses operator, train type, train number, and other metadata
 */
export async function detectRollingStock(
  operator?: string | null,
  trainType?: string | null,
  trainNumber?: string | null,
  lineName?: string | null
): Promise<DetectionResult | null> {
  if (!operator && !trainType) {
    return null
  }

  // Normalize inputs
  const normalizedOperator = operator?.toUpperCase().trim()
  const normalizedTrainType = trainType?.toUpperCase().trim()
  const normalizedTrainNumber = trainNumber?.toUpperCase().trim()

  // Try exact matches first
  const candidates = await prisma().rollingStock.findMany({
    where: {
      AND: [
        normalizedOperator ? { operator: { contains: normalizedOperator, mode: 'insensitive' } } : {},
        normalizedTrainType ? { series: { contains: normalizedTrainType, mode: 'insensitive' } } : {},
      ],
    },
    orderBy: [
      { operator: 'asc' },
      { series: 'asc' },
    ],
  })

  if (candidates.length === 0) {
    return null
  }

  // Score candidates based on match quality
  const scored = candidates.map(stock => {
    let score = 0
    const reasons: string[] = []

    // Operator match (high weight)
    if (normalizedOperator && stock.operator.toUpperCase().includes(normalizedOperator)) {
      score += 50
      reasons.push(`Operator: ${stock.operator}`)
    }

    // Train type match (high weight)
    if (normalizedTrainType) {
      const stockSeries = stock.series.toUpperCase()
      if (stockSeries.includes(normalizedTrainType)) {
        score += 40
        reasons.push(`Series: ${stock.series}`)
      } else if (normalizedTrainType.length > 2 && stockSeries.includes(normalizedTrainType.slice(0, 3))) {
        score += 20
        reasons.push(`Partial match: ${stock.series}`)
      }
    }

    // Train number patterns (medium weight)
    if (normalizedTrainNumber) {
      // ICE patterns
      if (normalizedTrainNumber.startsWith('ICE') && stock.series.includes('ICE')) {
        score += 30
        reasons.push(`ICE train number pattern`)
      }
      
      // TGV patterns
      if (normalizedTrainNumber.startsWith('TGV') && stock.series.includes('TGV')) {
        score += 30
        reasons.push(`TGV train number pattern`)
      }

      // Railjet patterns
      if (normalizedTrainNumber.includes('RJ') && stock.series.includes('Railjet')) {
        score += 30
        reasons.push(`Railjet train number pattern`)
      }

      // Eurostar patterns
      if (normalizedTrainNumber.includes('ES') && stock.series.includes('Eurostar')) {
        score += 30
        reasons.push(`Eurostar train number pattern`)
      }
    }

    // Line name patterns (low weight)
    if (lineName) {
      const normalizedLine = lineName.toUpperCase()
      if (stock.series.toUpperCase().includes(normalizedLine)) {
        score += 10
        reasons.push(`Line name match: ${lineName}`)
      }
    }

    return {
      stock,
      score,
      reasons: reasons.join(', '),
    }
  })

  // Sort by score and return best match if confident enough
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]

  // Require minimum confidence score
  if (best.score < 30) {
    return null
  }

  // Convert score to confidence (0-1)
  const maxPossibleScore = 100 // Adjust based on weights
  const confidence = Math.min(best.score / maxPossibleScore, 1)

  return {
    rollingStockId: best.stock.id,
    confidence,
    reason: best.reasons,
  }
}

/**
 * Common train type to rolling stock mappings for fallback detection
 */
const TRAIN_TYPE_MAPPINGS: Record<string, string[]> = {
  'ICE': ['ICE 1', 'ICE 2', 'ICE 3', 'ICE 3M', 'ICE 4', 'ICE T', 'ICE TD'],
  'IC': ['Intercity', 'IC', 'InterCity'],
  'EC': ['EuroCity', 'EC'],
  'TGV': ['TGV Duplex', 'TGV POS', 'TGV 2N2', 'TGV Euroduplex'],
  'THALYS': ['Thalys PBA', 'Thalys PBKA'],
  'RJ': ['Railjet', 'Railjet Express'],
  'RE': ['Regional Express', 'RE'],
  'RB': ['Regional Bahn', 'RB'],
  'S': ['S-Bahn', 'S-Bahn Zürich'],
}

/**
 * Fallback detection using common mappings when database search fails
 */
export function getFallbackRollingStock(
  trainType?: string | null
): string | null {
  if (!trainType) return null

  const normalized = trainType.toUpperCase().trim()
  
  // Direct mappings
  for (const [key, series] of Object.entries(TRAIN_TYPE_MAPPINGS)) {
    if (normalized.includes(key)) {
      return series[0] // Return first match
    }
  }

  // Special cases
  if (normalized.includes('EUROSTAR')) return 'Eurostar e320'
  if (normalized.includes('CISalpino')) return 'Cisalpino ETR'
  if (normalized.includes('PENDOLINO')) return 'Pendolino'
  if (normalized.includes('X2000')) return 'X 2000'
  if (normalized.includes('REGIO')) return 'Regio'

  return null
}