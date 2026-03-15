/**
 * Generate a vagonweb.cz Wagenreihung URL for a given leg.
 * Returns null when there is not enough data to build the URL.
 */
export function getWagenreihungUrl(leg: {
  trainNumber?: string | null
  lineName?: string | null
  operator?: string | null
  originIbnr?: string | null
  plannedDeparture?: Date | string | null
  departure?: Date | string | null
}): string | null {
  const tn = leg.trainNumber ?? leg.lineName
  if (!tn) return null

  const match = tn.trim().match(/^([A-Za-zÄÖÜäöü\s]+?)\s*(\d+)$/)
  if (!match) return null

  const trainType = match[1].trim().toUpperCase().replace(/\s+/g, '')
  const number = match[2]

  const rawDate = leg.plannedDeparture ?? leg.departure
  const depDate = rawDate
    ? new Date(rawDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  // Derive country from operator name, then override with IBNR prefix
  const operatorUpper = (leg.operator ?? '').toUpperCase()
  let country = 'de'

  if (operatorUpper.includes('ÖBB') || operatorUpper.includes('OBB')) country = 'at'
  else if (operatorUpper.includes('SBB') || operatorUpper.includes('CFF')) country = 'ch'
  else if (operatorUpper.includes('SNCF') || trainType.includes('TGV') || trainType.includes('OUIGO')) country = 'fr'
  else if (
    operatorUpper.includes('TRENITALIA') ||
    operatorUpper.includes('ITALO') ||
    ['FR', 'FA', 'FB', 'ITA'].includes(trainType)
  ) country = 'it'
  else if (operatorUpper.includes('PKP')) country = 'pl'
  else if (operatorUpper.includes('CD') || operatorUpper.includes('ČD')) country = 'cz'
  else if (operatorUpper.includes('NS') && !operatorUpper.includes('SNCF')) country = 'nl'
  else if (operatorUpper.includes('RENFE') || operatorUpper.includes('IRYO')) country = 'es'
  else if (operatorUpper.includes('SJ') || operatorUpper.includes('SNCF') === false && trainType === 'X2') country = 'se'

  // IBNR prefix overrides operator heuristic — more reliable
  if (leg.originIbnr) {
    const prefix = String(leg.originIbnr).substring(0, 2)
    const map: Record<string, string> = {
      '80': 'de',
      '81': 'at',
      '85': 'ch',
      '87': 'fr',
      '83': 'it',
      '51': 'pl',
      '54': 'cz',
      '84': 'nl',
      '88': 'es',
      '79': 'gb',
      '74': 'dk',
      '76': 'se',
      '78': 'no',
      '72': 'fi',
    }
    if (map[prefix]) country = map[prefix]
  }

  return `https://www.vagonweb.cz/razeni/vlak.php?zeme=${country}&cislo=${number}&datum=${depDate}`
}
