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

async function getRenderedMapImage(mapContainer: HTMLElement | null): Promise<string | null> {
  const mapCanvas = mapContainer ? getMapCanvas(mapContainer) : null
  if (!mapCanvas || mapCanvas.width <= 0 || mapCanvas.height <= 0) return null

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  try {
    return mapCanvas.toDataURL('image/png')
  } catch {
    return null
  }
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
  const EXPORT_SCALE = 3
  const EXPORT_W = 1200
  const EXPORT_H = 630

  // Step 1: get map image.
  // Priority: live MapLibre canvas → SVG from coordinates → dark placeholder
  let mapImageSrc: string | null = await getRenderedMapImage(mapContainer)

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
      660 * EXPORT_SCALE,
      630 * EXPORT_SCALE,
      { theme: 'dark' },
    )
  }

  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_W * EXPORT_SCALE
  canvas.height = EXPORT_H * EXPORT_SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE)

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
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H)

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

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210
  const PH = 297
  const M = 14
  const CONTENT_W = PW - M * 2
  const mapImage = await getRenderedMapImage(mapContainer)

  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, PW, PH, 'F')

  let y = 20

  pdf.setTextColor(107, 114, 128)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('Railtrax Trip Overview', M, y)
  y += 8

  pdf.setTextColor(17, 24, 39)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  const titleLines = pdf.splitTextToSize(trip.title, CONTENT_W)
  pdf.text(titleLines, M, y)
  y += titleLines.length * 8

  const startDate = formatDate(trip.startDate)
  const endDate = formatDate(trip.endDate)
  const dateRange = startDate !== '-' && endDate !== '-' && startDate !== endDate
    ? `${startDate} – ${endDate}` : startDate !== '-' ? startDate : endDate

  if (dateRange && dateRange !== '-') {
    pdf.setTextColor(75, 85, 99)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(dateRange, M, y)
    y += 7
  }

  if (trip.description) {
    pdf.setTextColor(55, 65, 81)
    pdf.setFontSize(10)
    const descriptionLines = pdf.splitTextToSize(trip.description, CONTENT_W)
    pdf.text(descriptionLines, M, y)
    y += descriptionLines.length * 5 + 3
  }

  const totalKm = Math.round(legs.reduce((sum, leg) => sum + (leg.distanceKm ?? 0), 0))
  const stats = [
    { label: 'Abschnitte', value: String(legs.length) },
    { label: 'Strecke', value: totalKm > 0 ? `${totalKm} km` : '–' },
    { label: 'Dauer', value: formatDuration(legs[0]?.plannedDeparture, legs[legs.length - 1]?.plannedArrival) },
  ]

  const statW = (CONTENT_W - 8) / 3
  stats.forEach((stat, index) => {
    const x = M + index * (statW + 4)
    pdf.setFillColor(249, 250, 251)
    pdf.setDrawColor(209, 213, 219)
    pdf.roundedRect(x, y, statW, 18, 2, 2, 'FD')
    pdf.setTextColor(107, 114, 128)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(stat.label.toUpperCase(), x + 4, y + 6)
    pdf.setTextColor(17, 24, 39)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(stat.value, x + 4, y + 13)
  })
  y += 26

  pdf.setTextColor(107, 114, 128)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('Route', M, y)
  y += 4

  const mapH = 82
  pdf.setDrawColor(209, 213, 219)
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(M, y, CONTENT_W, mapH, 2, 2, 'FD')
  if (mapImage) {
    pdf.addImage(mapImage, 'PNG', M + 1, y + 1, CONTENT_W - 2, mapH - 2)
  } else {
    pdf.setTextColor(107, 114, 128)
    pdf.setFontSize(10)
    pdf.text('Karte nicht verfuegbar', PW / 2, y + mapH / 2, { align: 'center' })
  }
  y += mapH + 10

  pdf.setTextColor(107, 114, 128)
  pdf.setFontSize(9)
  pdf.text('Abschnitte', M, y)
  y += 5

  const visibleLegs = legs.slice(0, 10)
  pdf.setDrawColor(209, 213, 219)
  pdf.setFillColor(243, 244, 246)
  pdf.rect(M, y, CONTENT_W, 8, 'FD')
  pdf.setTextColor(107, 114, 128)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('#', M + 3, y + 5.3)
  pdf.text('Route', M + 12, y + 5.3)
  pdf.text('Zeit', M + 110, y + 5.3)
  pdf.text('Zug', M + 145, y + 5.3)
  y += 8

  visibleLegs.forEach((leg, index) => {
    pdf.setFillColor(index % 2 === 0 ? 255 : 249, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 251)
    pdf.rect(M, y, CONTENT_W, 11, 'F')
    pdf.setDrawColor(229, 231, 235)
    pdf.line(M, y + 11, M + CONTENT_W, y + 11)

    pdf.setTextColor(17, 24, 39)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.text(String(index + 1), M + 3, y + 6.5)
    pdf.text(truncatePdfText(pdf, `${leg.originName} → ${leg.destName}`, 92), M + 12, y + 4.8)
    pdf.setTextColor(107, 114, 128)
    pdf.setFontSize(7.5)
    if (leg.distanceKm) {
      pdf.text(`${Math.round(leg.distanceKm)} km`, M + 12, y + 8.8)
    }

    pdf.setTextColor(17, 24, 39)
    pdf.setFontSize(8.5)
    pdf.text(`${formatTime(leg.plannedDeparture)} → ${formatTime(leg.plannedArrival)}`, M + 110, y + 6.5)
    const trainText = [leg.trainType, leg.trainNumber].filter(Boolean).join(' ') || leg.lineName || '—'
    pdf.text(truncatePdfText(pdf, trainText, 42), M + 145, y + 6.5)
    y += 11
  })

  if (legs.length > visibleLegs.length) {
    y += 4
    pdf.setTextColor(107, 114, 128)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text(`+ ${legs.length - visibleLegs.length} weitere Abschnitte`, M, y)
  }

  pdf.setTextColor(107, 114, 128)
  pdf.setFontSize(8)
  pdf.text('Erstellt mit railtrax.eu', M, PH - 10)

  pdf.save(`railtrax-${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
