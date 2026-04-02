import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: '#111827',
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 14,
    marginBottom: 16,
  },
  brand: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 4,
  },
  description: {
    fontSize: 10,
    color: '#374151',
    marginTop: 8,
    lineHeight: 1.4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  mapBlock: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  mapImage: {
    width: '100%',
    height: 180,
    borderWidth: 1,
    borderColor: '#d1d5db',
    objectFit: 'contain',
  },
  mapPlaceholder: {
    height: 180,
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  mapPlaceholderText: {
    color: '#6b7280',
    fontSize: 10,
  },
  routeTable: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  colIndex: {
    width: 24,
    fontSize: 9,
    color: '#6b7280',
  },
  colRoute: {
    flex: 1.9,
    paddingRight: 10,
  },
  colTimes: {
    width: 110,
    paddingRight: 10,
  },
  colTrain: {
    width: 110,
    paddingRight: 10,
  },
  colMeta: {
    width: 88,
    textAlign: 'right',
  },
  headerText: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  routeText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  routeSubtext: {
    fontSize: 8.5,
    color: '#6b7280',
    marginTop: 2,
  },
  bodyText: {
    fontSize: 9.5,
    color: '#111827',
  },
  bodySubtext: {
    fontSize: 8.5,
    color: '#6b7280',
    marginTop: 2,
  },
  overflowNote: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    marginTop: 18,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerText: {
    fontSize: 8.5,
    color: '#6b7280',
  },
})

interface TripLeg {
  id: string
  originName: string
  destName: string
  plannedDeparture: string | null
  plannedArrival: string | null
  operator: string | null
  trainNumber: string | null
  lineName: string | null
  distanceKm: number | null
  platformPlanned: string | null
}

interface TripDocumentProps {
  trip: {
    title: string
    description?: string | null
  }
  legs: TripLeg[]
  mapImageBase64: string | null
  totalKm: number
  totalDuration: string
  shareUrl: string | null
}

export function TripDocument({
  trip,
  legs,
  mapImageBase64,
  totalKm,
  totalDuration,
  shareUrl,
}: TripDocumentProps) {
  const visibleLegs = legs.slice(0, 10)
  const hiddenLegCount = legs.length - visibleLegs.length

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Railtrax Trip Overview</Text>
          <Text style={styles.title}>{trip.title}</Text>
          <Text style={styles.subtitle}>{formatDateRange(legs)}</Text>
          {trip.description ? <Text style={styles.description}>{trip.description}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <SummaryCard label="Abschnitte" value={String(legs.length)} />
          <SummaryCard label="Strecke" value={totalKm > 0 ? `${Math.round(totalKm)} km` : '–'} />
          <SummaryCard label="Dauer" value={totalDuration} />
        </View>

        <View style={styles.mapBlock}>
          <Text style={styles.sectionLabel}>Route</Text>
          {mapImageBase64 ? (
            <Image src={mapImageBase64} style={styles.mapImage} />
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Karte nicht verfuegbar</Text>
            </View>
          )}
        </View>

        <View>
          <Text style={styles.sectionLabel}>Abschnitte</Text>
          <View style={styles.routeTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, styles.colIndex]}>#</Text>
              <Text style={[styles.headerText, styles.colRoute]}>Route</Text>
              <Text style={[styles.headerText, styles.colTimes]}>Zeit</Text>
              <Text style={[styles.headerText, styles.colTrain]}>Zug</Text>
              <Text style={[styles.headerText, styles.colMeta]}>Info</Text>
            </View>

            {visibleLegs.map((leg, index) => (
              <View
                key={leg.id}
                style={index === visibleLegs.length - 1 ? [styles.tableRow, styles.tableRowLast] : styles.tableRow}
              >
                <Text style={styles.colIndex}>{index + 1}</Text>
                <View style={styles.colRoute}>
                  <Text style={styles.routeText}>{leg.originName} → {leg.destName}</Text>
                  {leg.distanceKm ? (
                    <Text style={styles.routeSubtext}>{Math.round(leg.distanceKm)} km</Text>
                  ) : null}
                </View>
                <View style={styles.colTimes}>
                  <Text style={styles.bodyText}>
                    {formatTime(leg.plannedDeparture)} → {formatTime(leg.plannedArrival)}
                  </Text>
                  <Text style={styles.bodySubtext}>
                    {calcDuration(leg.plannedDeparture, leg.plannedArrival) || ' '}
                  </Text>
                </View>
                <View style={styles.colTrain}>
                  <Text style={styles.bodyText}>{formatTrainLabel(leg)}</Text>
                  {leg.operator ? <Text style={styles.bodySubtext}>{leg.operator}</Text> : null}
                </View>
                <Text style={styles.colMeta}>
                  {leg.platformPlanned ? `Gleis ${leg.platformPlanned}` : ' '}
                </Text>
              </View>
            ))}
          </View>
          {hiddenLegCount > 0 ? (
            <Text style={styles.overflowNote}>
              + {hiddenLegCount} weitere Abschnitte sind in dieser Uebersicht nicht dargestellt.
            </Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Erstellt am {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} mit railtrax.eu
          </Text>
          <Text style={styles.footerText}>
            {shareUrl ? shareUrl : 'Privater Trip'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

function formatTrainLabel(leg: TripLeg) {
  return leg.lineName || leg.trainNumber || '–'
}

function formatTime(iso: string | null) {
  if (!iso) return '–'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '–'
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDateRange(legs: TripLeg[]) {
  const datedLegs = legs.filter(
    (leg) => leg.plannedDeparture && !Number.isNaN(new Date(leg.plannedDeparture).getTime()),
  )
  if (!datedLegs.length) return 'Datum unbekannt'

  const first = new Date(datedLegs[0].plannedDeparture!)
  const lastSource = datedLegs[datedLegs.length - 1].plannedArrival ?? datedLegs[datedLegs.length - 1].plannedDeparture
  const last = lastSource ? new Date(lastSource) : first

  const formatDate = (date: Date) =>
    date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

  return first.toDateString() === last.toDateString()
    ? formatDate(first)
    : `${formatDate(first)} – ${formatDate(last)}`
}

function calcDuration(dep: string | null, arr: string | null) {
  if (!dep || !arr) return ''
  const departure = new Date(dep)
  const arrival = new Date(arr)
  if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) return ''

  const minutes = Math.round((arrival.getTime() - departure.getTime()) / 60000)
  if (minutes <= 0) return ''

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`
}
