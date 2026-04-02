'use client'

import type { TripDetail } from '@/hooks/useTrips'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(depIso: string | null | undefined, arrIso: string | null | undefined): string {
  if (!depIso || !arrIso) return '-'
  const mins = Math.round((new Date(arrIso).getTime() - new Date(depIso).getTime()) / 60000)
  if (mins < 0) return '-'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getMapCanvas(mapContainer: HTMLElement): HTMLCanvasElement | null {
  return mapContainer.querySelector('canvas')
}

function getOperatorColor(operator: string | null): string {
  if (!operator) return '#e11d48'
  const op = operator.toUpperCase()
  if (op.includes('DB')) return '#E32228'
  if (op.includes('SBB')) return '#EB0000'
  if (op.includes('OBB') || op.includes('ÖBB')) return '#C8102E'
  if (op.includes('FLIX')) return '#74B43A'
  if (op.includes('SNCF') || op.includes('TGV')) return '#E05206'
  return '#e11d48'
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planned:   { bg: '#3f3f46', text: '#d4d4d8' },
  active:    { bg: '#1e3a5f', text: '#93c5fd' },
  completed: { bg: '#14532d', text: '#86efac' },
  cancelled: { bg: '#450a0a', text: '#fca5a5' },
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fitTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  let value = text
  while (ctx.measureText(value).width > maxWidth && value.length > 4) {
    value = value.slice(0, -1)
  }
  return value === text ? value : `${value.trimEnd()}…`
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = words[0]

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }

    lines.push(current)
    current = word

    if (lines.length === maxLines - 1) break
  }

  const consumedWords = lines.join(' ').split(/\s+/).filter(Boolean).length
  const remainingWords = words.slice(consumedWords)
  if (remainingWords.length > 0) {
    const finalLine = remainingWords.join(' ')
    lines.push(fitTextToWidth(ctx, finalLine, maxWidth))
  } else {
    lines.push(current)
  }

  return lines.slice(0, maxLines)
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  sourceW: number,
  sourceH: number,
) {
  const scale = Math.max(targetW / sourceW, targetH / sourceH)
  const drawW = sourceW * scale
  const drawH = sourceH * scale
  const drawX = targetX + (targetW - drawW) / 2
  const drawY = targetY + (targetH - drawH) / 2

  ctx.save()
  ctx.beginPath()
  ctx.rect(targetX, targetY, targetW, targetH)
  ctx.clip()
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.restore()
}

// ── IMAGE EXPORT ───────────────────────────────────────────────────────────────

export async function exportTripAsImage(
  trip: TripDetail,
  mapContainer: HTMLElement | null,
): Promise<void> {
  const legs = trip.legs

  // Step 1: get map image.
  // Priority: live MapLibre canvas → SVG from coordinates → dark placeholder
  let mapImageSrc: string | null = null

  // Try the MapLibre canvas rendered on the page (requires preserveDrawingBuffer: true)
  const mapCanvas = mapContainer ? getMapCanvas(mapContainer) : null
  if (mapCanvas && mapCanvas.width > 0 && mapCanvas.height > 0) {
    try { mapImageSrc = mapCanvas.toDataURL('image/png') } catch { /* tainted/cross-origin */ }
  }

  // If canvas unavailable, generate an SVG route map from coordinates
  if (!mapImageSrc) {
    const { generateFallbackMapSVG } = await import('./fallbackMap')
    mapImageSrc = generateFallbackMapSVG(
      legs.map(l => ({
        origin_lat: l.originLat,
        origin_lon: l.originLon,
        destination_lat: l.destLat,
        destination_lon: l.destLon,
        operator: l.operator,
      })),
      660,
      630,
    )
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext('2d')!

  const MAP_W = 660
  const MAP_H = 630
  const PANEL_X = MAP_W
  const PANEL_W = 540
  const PAD = 36
  const PANEL_INNER_W = PANEL_W - PAD * 2
  const STATS_Y = 555
  const CONTENT_BOTTOM = STATS_Y - 18

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#080d1a'
  ctx.fillRect(0, 0, 1200, 630)

  // ── Left: map image ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#0a1628'
  ctx.fillRect(0, 0, MAP_W, MAP_H)
  if (mapImageSrc) {
    const img = new Image()
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = mapImageSrc!
    })
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      drawCoverImage(ctx, img, 0, 0, MAP_W, MAP_H, img.naturalWidth, img.naturalHeight)
    }
  }

  // ── Divider ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#4f8ef7'
  ctx.fillRect(MAP_W, 0, 2, MAP_H)

  // ── Right: dark info panel ───────────────────────────────────────────────────
  ctx.fillStyle = '#080d1a'
  ctx.fillRect(PANEL_X + 2, 0, PANEL_W - 2, MAP_H)

  let cy = 52

  // Trip title
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 28px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'left'
  const titleLines = wrapText(ctx, trip.title, PANEL_INNER_W, 2)
  titleLines.forEach((line) => {
    ctx.fillText(line, PANEL_X + PAD, cy)
    cy += 34
  })
  cy += 6

  // Status badge
  const status = trip.status ?? 'planned'
  const sc = STATUS_COLORS[status] ?? STATUS_COLORS.planned
  ctx.font = '500 11px system-ui, -apple-system, sans-serif'
  const badgeText = status.toUpperCase()
  const badgeW = ctx.measureText(badgeText).width + 20
  ctx.fillStyle = sc.bg
  roundRect(ctx, PANEL_X + PAD, cy, badgeW, 22, 11)
  ctx.fill()
  ctx.fillStyle = sc.text
  ctx.textAlign = 'left'
  ctx.fillText(badgeText, PANEL_X + PAD + 10, cy + 15)
  cy += 34

  // Date range
  const startDate = formatDate(trip.startDate)
  const endDate = formatDate(trip.endDate)
  const dateRange = startDate !== '-' && endDate !== '-' && startDate !== endDate
    ? `${startDate} – ${endDate}` : startDate !== '-' ? startDate : endDate
  if (dateRange && dateRange !== '-') {
    ctx.fillStyle = '#4a6a9a'
    ctx.font = '400 15px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    const dateLines = wrapText(ctx, dateRange, PANEL_INNER_W, 2)
    dateLines.forEach((line) => {
      ctx.fillText(line, PANEL_X + PAD, cy)
      cy += 22
    })
  }

  cy += 14

  // Divider
  ctx.fillStyle = '#1e2d4a'
  ctx.fillRect(PANEL_X + PAD, cy, PANEL_INNER_W, 1)
  cy += 20

  const legAreaTop = cy
  let availableLegHeight = CONTENT_BOTTOM - legAreaTop
  let maxVisibleLegs = Math.min(legs.length, 5)

  if (legs.length > maxVisibleLegs) {
    availableLegHeight -= 20
  }

  while (maxVisibleLegs > 0 && maxVisibleLegs * 56 > availableLegHeight) {
    maxVisibleLegs -= 1
  }

  const visibleLegs = legs.slice(0, Math.max(maxVisibleLegs, 0))
  const extraLegs = legs.length - visibleLegs.length

  for (const leg of visibleLegs) {
    const opColor = getOperatorColor(leg.operator ?? null)
    ctx.font = '500 11px system-ui, -apple-system, sans-serif'
    const trainLabel = fitTextToWidth(
      ctx,
      [leg.trainType, leg.trainNumber].filter(Boolean).join(' ') || '—',
      140,
    )
    const depTime = formatTime(leg.plannedDeparture)
    const arrTime = formatTime(leg.plannedArrival)
    const routeMaxWidth = PANEL_INNER_W - 16
    const routeLines = (() => {
      ctx.font = '400 12px system-ui, -apple-system, sans-serif'
      return wrapText(ctx, `${leg.originName} → ${leg.destName}`, routeMaxWidth, 2)
    })()

    // Operator colour dot
    ctx.fillStyle = opColor
    ctx.beginPath()
    ctx.arc(PANEL_X + PAD + 6, cy + 7, 4, 0, Math.PI * 2)
    ctx.fill()

    // Train label badge
    ctx.font = '500 11px system-ui, -apple-system, sans-serif'
    const trainW = ctx.measureText(trainLabel).width + 14
    ctx.fillStyle = '#0d1f3c'
    roundRect(ctx, PANEL_X + PAD + 16, cy - 1, trainW, 18, 4)
    ctx.fill()
    ctx.fillStyle = '#4f8ef7'
    ctx.textAlign = 'left'
    ctx.fillText(trainLabel, PANEL_X + PAD + 23, cy + 13)

    // Time range
    const timeStr = `${depTime} → ${arrTime}`
    ctx.fillStyle = '#8ba3c7'
    ctx.font = '400 12px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(timeStr, PANEL_X + PANEL_W - PAD, cy + 13)

    cy += 22

    ctx.fillStyle = '#8ba3c7'
    ctx.font = '400 12px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    routeLines.forEach((line) => {
      ctx.fillText(line, PANEL_X + PAD + 16, cy)
      cy += 16
    })

    cy += 8

    // Separator
    ctx.fillStyle = '#1e2d4a'
    ctx.fillRect(PANEL_X + PAD, cy, PANEL_INNER_W, 1)
    cy += 10
  }

  if (extraLegs > 0) {
    ctx.fillStyle = '#4a6a9a'
    ctx.font = '400 12px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`+ ${extraLegs} weitere Abschnitte`, PANEL_X + PAD, cy + 12)
  }

  // ── Stats bar ────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0a1628'
  ctx.fillRect(PANEL_X + 2, 555, PANEL_W - 2, 75)
  ctx.fillStyle = '#1e2d4a'
  ctx.fillRect(PANEL_X + 2, 555, PANEL_W - 2, 1)

  const totalKm = Math.round(legs.reduce((s, l) => s + (l.distanceKm ?? 0), 0))
  const statItems = [
    { label: 'ZÜGE', value: String(legs.length) },
    ...(totalKm > 0 ? [{ label: 'STRECKE', value: `${totalKm.toLocaleString('de-DE')} km` }] : []),
  ]
  statItems.forEach((s, i) => {
    const x = PANEL_X + PAD + i * 160
    ctx.fillStyle = '#4a6a9a'
    ctx.font = '400 10px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(s.label, x, 578)
    ctx.fillStyle = '#ffffff'
    ctx.font = '500 17px system-ui, -apple-system, sans-serif'
    ctx.fillText(s.value, x, 604)
  })

  // Branding
  ctx.fillStyle = '#1e3a6e'
  ctx.font = '500 12px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('RAILTRAX', PANEL_X + PANEL_W - PAD, 604)

  // Download
  const link = document.createElement('a')
  link.download = `railtrax-${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ── PDF EXPORT ─────────────────────────────────────────────────────────────────

export async function exportTripAsPdf(
  trip: TripDetail,
  mapContainer: HTMLElement,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const legs = trip.legs

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const PW = 297
  const PH = 210
  const M = 12

  const BG_DARK = [15, 23, 42] as const       // #0f172a
  const BG_ROW  = [30, 41, 59] as const        // #1e293b
  const RED_RGB = [227, 34, 40] as const       // #E32228

  // Full page dark background
  pdf.setFillColor(...BG_DARK)
  pdf.rect(0, 0, PW, PH, 'F')

  // ── Map ──────────────────────────────────────────────────────────────────────
  const MAP_H = 90 // mm
  const mapCanvas = getMapCanvas(mapContainer)
  if (mapCanvas) {
    const mapData = mapCanvas.toDataURL('image/png')
    pdf.addImage(mapData, 'PNG', M, M, PW - 2 * M, MAP_H)
  } else {
    pdf.setFillColor(20, 30, 48)
    pdf.rect(M, M, PW - 2 * M, MAP_H, 'F')
    pdf.setFontSize(10)
    pdf.setTextColor(100, 116, 139)
    pdf.text('Map unavailable', PW / 2, M + MAP_H / 2, { align: 'center' })
  }

  // Red accent bar below map
  pdf.setFillColor(...RED_RGB)
  pdf.rect(M, M + MAP_H, PW - 2 * M, 1, 'F')

  // ── Title & date ─────────────────────────────────────────────────────────────
  const topY = M + MAP_H + 7
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(trip.title, M, topY)

  const startDate = formatDate(trip.startDate)
  const endDate = formatDate(trip.endDate)
  const dateRange = startDate !== '-' && endDate !== '-' && startDate !== endDate
    ? `${startDate} – ${endDate}` : startDate !== '-' ? startDate : endDate

  if (dateRange && dateRange !== '-') {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text(dateRange, M, topY + 5.5)
  }

  // ── Leg table ────────────────────────────────────────────────────────────────
  const TABLE_Y = topY + 11
  const ROW_H = 7
  const HEADER_H = ROW_H + 1

  const cols = {
    date:  M,
    train: M + 24,
    route: M + 52,
    dep:   M + 168,
    arr:   M + 188,
    dur:   M + 208,
    seat:  M + 230,
  }

  // Header row (red background)
  pdf.setFillColor(...RED_RGB)
  pdf.rect(M, TABLE_Y - ROW_H + 1, PW - 2 * M, HEADER_H, 'F')
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255, 255, 255)
  const headerY = TABLE_Y + 0.5
  pdf.text('Date',     cols.date,  headerY)
  pdf.text('Train',    cols.train, headerY)
  pdf.text('From → To', cols.route, headerY)
  pdf.text('Dep',      cols.dep,   headerY)
  pdf.text('Arr',      cols.arr,   headerY)
  pdf.text('Dur',      cols.dur,   headerY)
  pdf.text('Seat',     cols.seat,  headerY)

  let y = TABLE_Y + ROW_H
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)

  legs.forEach((leg, i) => {
    if (y > PH - 14) {
      pdf.addPage()
      // Re-fill dark bg on new page
      pdf.setFillColor(...BG_DARK)
      pdf.rect(0, 0, PW, PH, 'F')
      y = 20
    }

    // Alternating row background
    if (i % 2 === 1) {
      pdf.setFillColor(...BG_ROW)
      pdf.rect(M, y - ROW_H + 1.5, PW - 2 * M, ROW_H, 'F')
    }

    // Operator colour dot
    const opColor = getOperatorColor(leg.operator ?? null)
    const [r, g, b] = hexToRgb(opColor)
    pdf.setFillColor(r, g, b)
    pdf.circle(cols.train - 3, y - 1.5, 1.5, 'F')

    pdf.setTextColor(203, 213, 225) // #cbd5e1
    pdf.text(formatDate(leg.plannedDeparture), cols.date, y)
    pdf.text(
      [leg.trainType, leg.trainNumber].filter(Boolean).join(' ') || '—',
      cols.train, y,
    )

    const routeStr = `${leg.originName} → ${leg.destName}`
    const maxRouteW = cols.dep - cols.route - 4
    const truncated = truncatePdfText(pdf, routeStr, maxRouteW)
    pdf.text(truncated, cols.route, y)

    pdf.text(formatTime(leg.plannedDeparture), cols.dep, y)
    pdf.text(formatTime(leg.plannedArrival),   cols.arr, y)
    pdf.text(formatDuration(leg.plannedDeparture, leg.plannedArrival), cols.dur, y)
    pdf.setTextColor(100, 116, 139)
    pdf.text(leg.seat ?? '—', cols.seat, y)
    pdf.setTextColor(203, 213, 225)

    y += ROW_H
  })

  // ── Footer ───────────────────────────────────────────────────────────────────
  pdf.setFontSize(6.5)
  pdf.setTextColor(71, 85, 105) // #475569
  pdf.text(
    `Generated by Railtrax · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    M, PH - 5,
  )
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(100, 116, 139)
  pdf.text('RAILTRAX', PW - M, PH - 5, { align: 'right' })

  pdf.save(`railtrax-${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  const n = parseInt(v, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function truncatePdfText(pdf: InstanceType<typeof import('jspdf').jsPDF>, text: string, maxMm: number): string {
  // jsPDF getStringUnitWidth returns width in points; divide by 2.835 to get mm at font size 1
  const fontSize = 7.5
  let t = text
  while (t.length > 4) {
    const w = pdf.getStringUnitWidth(t) * fontSize / 2.835
    if (w <= maxMm) return t
    t = t.slice(0, -1).trimEnd()
  }
  return t + '…'
}
