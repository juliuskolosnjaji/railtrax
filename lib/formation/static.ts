/**
 * Static formation source — guaranteed fallback for all operators.
 * Wraps lib/rollingStock.ts identifyRollingStock() and converts RollingStockInfo → FormationResult.
 * Used when no live source is available or when live sources return null.
 */

import { identifyRollingStock } from '@/lib/rollingStock'
import type { FormationResult, FormationLeg } from './types'

export function staticLookup(leg: FormationLeg): FormationResult | null {
  const info = identifyRollingStock({
    lineName: leg.lineName,
    trainNumber: leg.trainNumber,
    operator: leg.operator,
    // trainType not in FormationLeg; identifyRollingStock falls back to lineName
  })

  if (!info) return null

  return {
    series: info.name,
    operator: info.operator,
    topSpeedKmh: info.topSpeed,
    hasWifi: info.hasWifi,
    hasBistro: info.hasBistro,
    hasBike: info.hasBike,
    hasWheelchair: false, // static table doesn't track this; assume unknown
    description: info.description,
    wikipediaUrl: info.wikiUrl ?? null,
    imageUrl: null,
    source: 'static',
    trainName: null,
  }
}
