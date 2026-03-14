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

// ── IMAGE EXPORT ───────────────────────────────────────────────────────────────

export async function exportTripAsImage(
  trip: TripDetail,
  mapContainer: HTMLElement,
): Promise<void> {
  const legs = trip.legs

  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext('2d')!

  const MAP_W = 660
  const PANEL_X = MAP_W
  const PANEL_W = 540
  const BG = '#0f172a'
  const RED = '#E32228'

  // ── Left: map ───────────────────────────────────────────────────────────────
  const mapCanvas = getMapCanvas(mapContainer)
  if (mapCanvas) {
    ctx.drawImage(mapCanvas, 0, 0, MAP_W, 630)
  } else {
    ctx.fillStyle = '#13132a'
    ctx.fillRect(0, 0, MAP_W, 630)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Map unavailable', MAP_W / 2, 315)
  }

  // Red vertical divider
  ctx.fillStyle = RED
  ctx.fillRect(MAP_W, 0, 2, 630)

  // ── Right: dark info panel ───────────────────────────────────────────────────
  ctx.fillStyle = BG
  ctx.fillRect(PANEL_X + 2, 0, PANEL_W - 2, 630)

  const PAD = 36
  let cy = 52

  // Trip title
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'left'
  // Truncate title to fit
  let title = trip.title
  while (ctx.measureText(title).width > PANEL_W - PAD * 2 - 10 && title.length > 4) {
    title = title.slice(0, -1)
  }
  if (title !== trip.title) title = title.trimEnd() + '…'
  ctx.fillText(title, PANEL_X + PAD, cy)
  cy += 36

  // Status badge
  const status = trip.status ?? 'planned'
  const sc = STATUS_COLORS[status] ?? STATUS_COLORS.planned
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
  const badgeText = status.toUpperCase()
  const badgeW = ctx.measureText(badgeText).width + 20
  ctx.fillStyle = sc.bg
  roundRect(ctx, PANEL_X + PAD, cy, badgeW, 22, 5)
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
    ctx.fillStyle = '#94a3b8'
    ctx.font = '16px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(dateRange, PANEL_X + PAD, cy)
    cy += 28
  }

  cy += 14

  // Divider
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(PANEL_X + PAD, cy, PANEL_W - PAD * 2, 1)
  cy += 16

  // Legs (up to 4)
  const visibleLegs = legs.slice(0, 4)
  const extraLegs = legs.length - visibleLegs.length

  for (const leg of visibleLegs) {
    const opColor = getOperatorColor(leg.operator ?? null)
    const trainLabel = [leg.trainType, leg.trainNumber].filter(Boolean).join(' ') || '—'
    const depTime = formatTime(leg.plannedDeparture)
    const arrTime = formatTime(leg.plannedArrival)

    // Operator colour dot
    ctx.fillStyle = opColor
    ctx.beginPath()
    ctx.arc(PANEL_X + PAD + 6, cy + 7, 5, 0, Math.PI * 2)
    ctx.fill()

    // Train label badge
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
    const trainW = ctx.measureText(trainLabel).width + 14
    ctx.fillStyle = opColor + '33' // 20% opacity
    roundRect(ctx, PANEL_X + PAD + 16, cy - 1, trainW, 18, 4)
    ctx.fill()
    ctx.fillStyle = opColor
    ctx.textAlign = 'left'
    ctx.fillText(trainLabel, PANEL_X + PAD + 23, cy + 13)

    // Time range
    const timeStr = `${depTime} → ${arrTime}`
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '13px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(timeStr, PANEL_X + PANEL_W - PAD, cy + 13)

    cy += 22

    // Origin → Dest
    ctx.fillStyle = '#64748b'
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    const routeText = `${leg.originName} → ${leg.destName}`
    let rt = routeText
    while (ctx.measureText(rt).width > PANEL_W - PAD * 2 - 10 && rt.length > 4) {
      rt = rt.slice(0, -1)
    }
    if (rt !== routeText) rt = rt.trimEnd() + '…'
    ctx.fillText(rt, PANEL_X + PAD + 16, cy)

    cy += 24

    // Separator
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(PANEL_X + PAD, cy, PANEL_W - PAD * 2, 1)
    cy += 12
  }

  if (extraLegs > 0) {
    ctx.fillStyle = '#475569'
    ctx.font = '13px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`+ ${extraLegs} more leg${extraLegs > 1 ? 's' : ''}`, PANEL_X + PAD, cy + 12)
    cy += 28
  }

  // Stats row near bottom
  const totalKm = Math.round(legs.reduce((s, l) => s + (l.distanceKm ?? 0), 0))
  const statsY = 575
  const stats = [
    { v: String(legs.length), l: legs.length === 1 ? 'leg' : 'legs' },
    ...(totalKm > 0 ? [{ v: totalKm.toLocaleString('en'), l: 'km' }] : []),
  ]
  let pillX = PANEL_X + PAD
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
  for (const s of stats) {
    const text = `${s.v} ${s.l}`
    const pw = ctx.measureText(text).width + 20
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    roundRect(ctx, pillX, statsY - 16, pw, 24, 6)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'left'
    ctx.fillText(text, pillX + 10, statsY)
    pillX += pw + 8
  }

  // Branding
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('RAILTRAX', PANEL_X + PANEL_W - PAD, 614)

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
