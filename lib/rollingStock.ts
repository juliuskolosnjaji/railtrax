export interface RollingStockInfo {
  name: string
  operator: string
  topSpeed: number
  hasWifi: boolean
  hasBistro: boolean
  hasBike: boolean
  description: string
  wikiUrl?: string
}

// ─── ICE number-range helper ──────────────────────────────────────────────────

function iceByNumber(num: number | null): RollingStockInfo {
  if (num !== null) {
    if (num <= 108) return { name: 'ICE 1', operator: 'DB', topSpeed: 280, hasWifi: true, hasBistro: true, hasBike: false, description: 'BR 401 — original ICE from 1991, bistro car on board.', wikiUrl: 'https://en.wikipedia.org/wiki/ICE_1' }
    if (num <= 209) return { name: 'ICE 2', operator: 'DB', topSpeed: 280, hasWifi: true, hasBistro: true, hasBike: false, description: 'BR 402 — half-set ICE with driving trailer, often coupled in pairs.', wikiUrl: 'https://en.wikipedia.org/wiki/ICE_2' }
    if (num <= 399) return { name: 'ICE 3', operator: 'DB', topSpeed: 330, hasWifi: true, hasBistro: true, hasBike: false, description: 'BR 403/406 — distributed-traction ICE 3, up to 330 km/h.', wikiUrl: 'https://en.wikipedia.org/wiki/ICE_3' }
    if (num <= 499) return { name: 'ICE-T', operator: 'DB', topSpeed: 230, hasWifi: true, hasBistro: true, hasBike: false, description: 'BR 411/415 — tilting ICE for curves, used on Stuttgart–Zürich.', wikiUrl: 'https://en.wikipedia.org/wiki/ICE_T' }
    if (num <= 599) return { name: 'ICE 4', operator: 'DB', topSpeed: 250, hasWifi: true, hasBistro: true, hasBike: true, description: 'BR 412 (13-car) — long-form ICE 4 by Bombardier/Alstom.', wikiUrl: 'https://en.wikipedia.org/wiki/ICE_4' }
    if (num <= 799) return { name: 'ICE 3 Neo', operator: 'DB', topSpeed: 320, hasWifi: true, hasBistro: true, hasBike: true, description: 'BR 408 — next-generation Velaro by Siemens, with bike spaces.', wikiUrl: 'https://en.wikipedia.org/wiki/Siemens_Velaro_MS' }
    if (num <= 899) return { name: 'ICE 4', operator: 'DB', topSpeed: 250, hasWifi: true, hasBistro: true, hasBike: true, description: 'BR 412 (7-car) — short-form ICE 4 by Bombardier/Alstom.', wikiUrl: 'https://en.wikipedia.org/wiki/ICE_4' }
    if (num <= 999) return { name: 'ICE-T', operator: 'DB', topSpeed: 230, hasWifi: true, hasBistro: true, hasBike: false, description: 'BR 411 (7-car) — tilting ICE for curvy routes.', wikiUrl: 'https://en.wikipedia.org/wiki/ICE_T' }
  }
  return { name: 'ICE', operator: 'DB', topSpeed: 300, hasWifi: true, hasBistro: true, hasBike: false, description: 'Deutsche Bahn high-speed intercity-express.', wikiUrl: 'https://en.wikipedia.org/wiki/Intercity-Express' }
}

// ─── Main lookup ──────────────────────────────────────────────────────────────

/**
 * Identify rolling stock from static tables.
 *
 * Strategy: extract the category word from lineName first (e.g. "ICE 521" → "ICE"),
 * falling back to trainType, then the leading letters of trainNumber.
 * Category alone is enough for most European trains — operator is not required.
 *
 * The leg object mirrors the Leg type from hooks/useTrips.ts (camelCase).
 */
export function identifyRollingStock(leg: {
  lineName?: string | null
  trainType?: string | null
  trainNumber?: string | null
  operator?: string | null
}): RollingStockInfo | null {
  // Build a "full name" string to extract category + optional number from.
  // lineName from vendo is the most reliable source: "ICE 521", "RJ 60", "TGV 9576"
  const fullName = leg.lineName ?? leg.trainType ?? leg.trainNumber ?? ''
  const cleaned = fullName.trim()
  
  // Handle special cases like "Bus RE5X" - split on space and find the meaningful part
  const parts = cleaned.split(/\s+/)
  let category = ''
  let num: number | null = null
  
  if (parts.length > 1) {
    // If first part is "Bus", skip it and look at the rest
    if (parts[0].toUpperCase() === 'BUS') {
      const secondPart = parts[1]
      const m = secondPart.match(/^([A-ZÖÜÄa-zöüä]+)\s*(\d+)?/)
      if (m) {
        category = m[1].toUpperCase()
        num = m[2] ? parseInt(m[2], 10) : null
      }
    } else {
      // Normal case: try the first part
      const m = parts[0].match(/^([A-ZÖÜÄa-zöüä]+)\s*(\d+)?/)
      if (m) {
        category = m[1].toUpperCase()
        num = m[2] ? parseInt(m[2], 10) : null
      }
    }
  } else {
    // Single part
    const m = cleaned.match(/^([A-ZÖÜÄa-zöüä]+)\s*(\d+)?/)
    if (m) {
      category = m[1].toUpperCase()
      num = m[2] ? parseInt(m[2], 10) : null
    }
  }
  
  if (!category) return null

  switch (category) {
    // ── DB ───────────────────────────────────────────────────────────────────
    case 'ICE':
      return iceByNumber(num)

    case 'IC':
      // IC2 routes tend to have numbers ≥ 2000
      if (num !== null && num >= 2000) {
        return { name: 'IC 2 (Twindexx)', operator: 'DB', topSpeed: 160, hasWifi: true, hasBistro: false, hasBike: true, description: 'Bombardier Twindexx double-deck push-pull (BR 4110), used on IC 2 routes.', wikiUrl: 'https://en.wikipedia.org/wiki/Bombardier_Twindexx' }
      }
      return { name: 'IC', operator: 'DB', topSpeed: 200, hasWifi: true, hasBistro: true, hasBike: true, description: 'DB Intercity — classic long-distance push-pull service.', wikiUrl: 'https://en.wikipedia.org/wiki/Intercity_(Deutsche_Bahn)' }

    case 'EC':
      return { name: 'EuroCity', operator: 'various', topSpeed: 200, hasWifi: false, hasBistro: true, hasBike: false, description: 'International EuroCity service — often Railjet (ÖBB/DB) or SBB Giruno.' }

    // ── ÖBB ──────────────────────────────────────────────────────────────────
    case 'RJ':
    case 'RJX':
      return { name: 'Railjet', operator: 'ÖBB/ČD', topSpeed: 230, hasWifi: true, hasBistro: true, hasBike: false, description: 'Siemens Viaggio Comfort — Austrian high-speed flagship, 3-class.', wikiUrl: 'https://en.wikipedia.org/wiki/Railjet' }

    case 'NJ':
      return { name: 'Nightjet', operator: 'ÖBB', topSpeed: 200, hasWifi: false, hasBistro: false, hasBike: true, description: 'ÖBB overnight sleeper — seats, couchettes and private sleeping cars across 27+ routes.', wikiUrl: 'https://en.wikipedia.org/wiki/Nightjet' }

    case 'REX':
      return { name: 'RegionalExpress', operator: 'ÖBB', topSpeed: 160, hasWifi: false, hasBistro: false, hasBike: true, description: 'ÖBB regional express, typically Cityjet (Siemens Desiro ML) or Talent.' }

    // ── SNCF ─────────────────────────────────────────────────────────────────
    case 'TGV':
    case 'INOUI':
      return { name: 'TGV Inouï', operator: 'SNCF', topSpeed: 320, hasWifi: true, hasBistro: true, hasBike: false, description: 'Alstom Euroduplex / TGV Océane — SNCF flagship high-speed.', wikiUrl: 'https://en.wikipedia.org/wiki/TGV_Inouï' }

    case 'OUIGO':
      return { name: 'OUIGO', operator: 'SNCF', topSpeed: 320, hasWifi: true, hasBistro: false, hasBike: false, description: 'SNCF low-cost high-speed — TGV Duplex with dense seating, no bistro.', wikiUrl: 'https://en.wikipedia.org/wiki/Ouigo' }

    case 'INTERCITES':
    case 'INTERCITÉS':
      return { name: 'Intercités', operator: 'SNCF', topSpeed: 200, hasWifi: false, hasBistro: true, hasBike: true, description: 'SNCF medium-distance intercity — Corail coaches or B 85000 EMU.' }

    case 'TER':
      return { name: 'TER', operator: 'SNCF', topSpeed: 160, hasWifi: false, hasBistro: false, hasBike: true, description: 'SNCF regional express — Alstom Regiolis or Bombardier Régioduplex.' }

    // ── Trenitalia ────────────────────────────────────────────────────────────
    case 'FR':
    case 'FRECCIAROSSA':
      return { name: 'Frecciarossa 1000', operator: 'Trenitalia', topSpeed: 400, hasWifi: true, hasBistro: true, hasBike: false, description: "ETR 400 — Italy's flagship, world speed record 393 km/h in 2016.", wikiUrl: 'https://en.wikipedia.org/wiki/ETR_400' }

    case 'FA':
    case 'FRECCIARGENTO':
      return { name: 'Frecciargento', operator: 'Trenitalia', topSpeed: 250, hasWifi: true, hasBistro: true, hasBike: false, description: 'ETR 600/485 — tilting train for non-HSL routes, Rome to Reggio Calabria.', wikiUrl: 'https://en.wikipedia.org/wiki/ETR_600' }

    case 'FB':
    case 'FRECCIABIANCA':
      return { name: 'Frecciabianca', operator: 'Trenitalia', topSpeed: 200, hasWifi: true, hasBistro: true, hasBike: false, description: 'ETR 460 — intercity high-speed on non-dedicated lines.' }

    case 'ITA':
    case 'ITALO':
      return { name: 'Italo EVO', operator: 'Italo NTV', topSpeed: 360, hasWifi: true, hasBistro: true, hasBike: false, description: 'AGV (Alstom) — Italian private high-speed operator competing with Trenitalia.', wikiUrl: 'https://en.wikipedia.org/wiki/AGV_(train)' }

    // ── SBB ──────────────────────────────────────────────────────────────────
    case 'IR':
      return { name: 'InterRegio', operator: 'SBB', topSpeed: 200, hasWifi: true, hasBistro: false, hasBike: true, description: 'SBB InterRegio — KISS double-deck or RABe 200 EMU.' }

    case 'ICN':
      return { name: 'ICN', operator: 'SBB', topSpeed: 200, hasWifi: true, hasBistro: true, hasBike: true, description: 'SBB RABDe 500 — tilting InterCity Neigezug.' }

    // ── Renfe ─────────────────────────────────────────────────────────────────
    case 'AVE':
      return { name: 'AVE', operator: 'Renfe', topSpeed: 310, hasWifi: true, hasBistro: true, hasBike: false, description: 'Spanish high-speed — Siemens Velaro E or CAF Oaris on dedicated HSL.', wikiUrl: 'https://en.wikipedia.org/wiki/Alta_Velocidad_Española' }

    case 'AVLO':
      return { name: 'AVLO', operator: 'Renfe', topSpeed: 310, hasWifi: true, hasBistro: false, hasBike: false, description: 'Renfe low-cost AVE — high-speed, no frills, Velaro E stock.' }

    case 'ALVIA':
      return { name: 'Alvia', operator: 'Renfe', topSpeed: 250, hasWifi: true, hasBistro: true, hasBike: false, description: 'Renfe variable-gauge high-speed — CAF 730 or Talgo 250 on mixed gauge.' }

    // ── International ─────────────────────────────────────────────────────────
    case 'ES':
    case 'EUROSTAR':
      return { name: 'Eurostar e320', operator: 'Eurostar', topSpeed: 320, hasWifi: true, hasBistro: true, hasBike: false, description: 'Siemens Velaro — Channel Tunnel high-speed to London, Paris, Brussels, Amsterdam.', wikiUrl: 'https://en.wikipedia.org/wiki/Class_374' }

    case 'THALYS':
    case 'THY':
      return { name: 'Eurostar (ex-Thalys)', operator: 'Eurostar', topSpeed: 300, hasWifi: true, hasBistro: true, hasBike: false, description: 'PBKA trainset (TGV-derived) — Paris/Brussels/Amsterdam/Cologne.', wikiUrl: 'https://en.wikipedia.org/wiki/Thalys' }

    case 'EN':
      return { name: 'EuroNight', operator: 'various', topSpeed: 160, hasWifi: false, hasBistro: false, hasBike: true, description: 'International overnight sleeper — seats, couchettes, and sleeping cars.' }

    case 'FLX':
    case 'FLIXTRAIN':
      return { name: 'Flixtrain', operator: 'Flixtrain', topSpeed: 160, hasWifi: true, hasBistro: false, hasBike: true, description: 'Budget intercity — classic loco-hauled coaches in Flixtrain livery.' }

    // ── Regional / PE ───────────────────────────────────────────────────────────
    case 'PE':
      return { name: 'Panorama Express', operator: 'various', topSpeed: 140, hasWifi: false, hasBistro: false, hasBike: true, description: 'Swiss/Austrian regional express — scenic routes, often Panorama cars.' }

    // ── Additional DB categories ─────────────────────────────────────────────────
    case 'RE':
    case 'RB':
      return { name: 'RegionalExpress/RegionalBahn', operator: 'DB', topSpeed: 140, hasWifi: false, hasBistro: false, hasBike: true, description: 'DB regional service — typically LINT or Talent EMUs, or classic coaches.' }

    case 'S':
      return { name: 'S-Bahn', operator: 'DB', topSpeed: 140, hasWifi: false, hasBistro: false, hasBike: false, description: 'DB S-Bahn — suburban metro style service in major metros.' }

    default:
      return null
  }
}
