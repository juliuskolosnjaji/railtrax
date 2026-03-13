'use client'

/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  coverDateRange: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  coverMap: {
    width: 500,
    height: 250,
    marginBottom: 30,
    objectFit: 'cover',
  },
  placeholderMap: {
    width: 500,
    height: 250,
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
  },
  summaryItem: {
    fontSize: 12,
    color: '#555',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 9,
    color: '#555',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowCancelled: {
    backgroundColor: '#fff5f5',
    textDecoration: 'line-through',
    opacity: 0.7,
  },
  colDate: { width: 70 },
  colTime: { width: 45 },
  colTrain: { width: 80 },
  colFrom: { width: 85 },
  colTo: { width: 85 },
  colArrival: { width: 55 },
  colDuration: { width: 60 },
  colPlatform: { width: 50 },
  colSeat: { width: 60 },
  cell: {
    fontSize: 9,
    color: '#333',
  },
  operatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  trainNumber: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  delayText: {
    color: '#e65100',
    fontSize: 8,
    marginLeft: 4,
  },
  qrSection: {
    marginTop: 40,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  qrLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 10,
  },
  qrImage: {
    width: 100,
    height: 100,
  },
})

const OPERATOR_COLORS: Record<string, string> = {
  DB: '#e32228',
  SBB: '#e32228',
  OBB: '#e32228',
  OEBB: '#e32228',
  TGV: '#003399',
  SNCF: '#003399',
  Eurostar: '#ffd100',
  FLIX: '#6c5ce7',
  Flixtrain: '#6c5ce7',
  Westbahn: '#e32228',
}

function getOperatorColor(operator: string | null): string {
  if (!operator) return '#999999'
  const op = operator.toUpperCase()
  for (const key of Object.keys(OPERATOR_COLORS)) {
    if (op.includes(key.toUpperCase())) {
      return OPERATOR_COLORS[key]
    }
  }
  return '#999999'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const diffMs = e.getTime() - s.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function calculateTotalStats(legs: Array<{ distanceKm: number | null; plannedDeparture: string; plannedArrival: string; originIbnr: string | null }>) {
  const totalKm = legs.reduce((sum, l) => sum + (l.distanceKm ?? 0), 0)
  const countries = new Set<string>()
  legs.forEach(l => {
    if (l.originIbnr) {
      const code = l.originIbnr.substring(0, 2)
      if (code >= '80' && code <= '99') countries.add(code)
    }
  })
  const totalMs = legs.reduce((sum, l) => {
    return sum + (new Date(l.plannedArrival).getTime() - new Date(l.plannedDeparture).getTime())
  }, 0)
  const totalHours = Math.round(totalMs / (1000 * 60 * 60) * 10) / 10
  return { totalKm: Math.round(totalKm), totalHours, countries: countries.size || 1 }
}

interface TripPdfLeg {
  id: string
  plannedDeparture: string
  plannedArrival: string
  originName: string
  destName: string
  operator: string | null
  trainType: string | null
  trainNumber: string | null
  delayMinutes: number
  cancelled: boolean
  platformPlanned: string | null
  seat: string | null
  distanceKm: number | null
  originIbnr: string | null
}

interface TripPdfProps {
  trip: {
    title: string
    startDate: string | null
    endDate: string | null
    isPublic: boolean
    shareToken: string | null
    legs: TripPdfLeg[]
  }
  mapImage: string | null
  qrCodeImage: string | null
  generatedAt: string
}

export function TripPdfDocument({ trip, mapImage, qrCodeImage, generatedAt }: TripPdfProps) {
  const startDate = formatDate(trip.startDate)
  const endDate = formatDate(trip.endDate)
  const dateRange = startDate !== '-' && endDate !== '-' ? `${startDate} – ${endDate}` : (startDate !== '-' ? `From ${startDate}` : '')
  const { totalKm, totalHours, countries } = calculateTotalStats(trip.legs)
  const publicUrl = trip.isPublic && trip.shareToken 
    ? `${process.env.NEXT_PUBLIC_URL || 'https://railtripper.app'}/share/${trip.shareToken}`
    : null

  return (
    <Document>
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{trip.title}</Text>
        {dateRange && <Text style={styles.coverDateRange}>{dateRange}</Text>}
        
        {mapImage ? (
          <Image src={mapImage} style={styles.coverMap} />
        ) : (
          <View style={styles.placeholderMap}>
            <Text style={styles.placeholderText}>Map unavailable</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>{trip.legs.length} legs</Text>
          <Text style={styles.summaryItem}>·</Text>
          <Text style={styles.summaryItem}>{totalKm} km</Text>
          <Text style={styles.summaryItem}>·</Text>
          <Text style={styles.summaryItem}>{totalHours}h total</Text>
          <Text style={styles.summaryItem}>·</Text>
          <Text style={styles.summaryItem}>{countries} countries</Text>
        </View>

        <Text style={styles.footer}>
          Generated by Railtripper on {generatedAt}
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1a1a1a' }}>
          Trip Details
        </Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
            <Text style={[styles.tableHeaderText, styles.colTime]}>Dep.</Text>
            <Text style={[styles.tableHeaderText, styles.colTrain]}>Train</Text>
            <Text style={[styles.tableHeaderText, styles.colFrom]}>From</Text>
            <Text style={[styles.tableHeaderText, styles.colTo]}>To</Text>
            <Text style={[styles.tableHeaderText, styles.colArrival]}>Arr.</Text>
            <Text style={[styles.tableHeaderText, styles.colDuration]}>Duration</Text>
            <Text style={[styles.tableHeaderText, styles.colPlatform]}>Plat.</Text>
            <Text style={[styles.tableHeaderText, styles.colSeat]}>Seat</Text>
          </View>

          {trip.legs.map((leg) => (
            <View 
              key={leg.id} 
              style={leg.cancelled ? [styles.tableRow, styles.tableRowCancelled] : styles.tableRow}
            >
              <Text style={[styles.cell, styles.colDate]}>{formatDate(leg.plannedDeparture)}</Text>
              <Text style={[styles.cell, styles.colTime]}>
                {formatTime(leg.plannedDeparture)}
                {leg.delayMinutes > 0 && (
                  <Text style={styles.delayText}> +{leg.delayMinutes}m</Text>
                )}
              </Text>
              <View style={[styles.cell, styles.colTrain, styles.trainNumber]}>
                <View style={[styles.operatorDot, { backgroundColor: getOperatorColor(leg.operator) }]} />
                <Text>{leg.trainType || ''} {leg.trainNumber || '-'}</Text>
              </View>
              <Text style={[styles.cell, styles.colFrom]}>{leg.originName}</Text>
              <Text style={[styles.cell, styles.colTo]}>{leg.destName}</Text>
              <Text style={[styles.cell, styles.colArrival]}>{formatTime(leg.plannedArrival)}</Text>
              <Text style={[styles.cell, styles.colDuration]}>
                {formatDuration(leg.plannedDeparture, leg.plannedArrival)}
              </Text>
              <Text style={[styles.cell, styles.colPlatform]}>{leg.platformPlanned || '-'}</Text>
              <Text style={[styles.cell, styles.colSeat]}>{leg.seat || '-'}</Text>
            </View>
          ))}
        </View>

        {publicUrl && qrCodeImage && (
          <View style={styles.qrSection}>
            <Text style={styles.qrLabel}>Scan to view this trip online</Text>
            <Image src={qrCodeImage} style={styles.qrImage} />
          </View>
        )}
      </Page>
    </Document>
  )
}

export { getOperatorColor, calculateTotalStats }
