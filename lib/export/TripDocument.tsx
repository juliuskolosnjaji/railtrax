import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Helvetica' },

  header: { backgroundColor: '#080d1a', padding: '16 24', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoText: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headerRight: { alignItems: 'flex-end' },
  tripTitle: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold' },
  tripDate: { color: '#4a6a9a', fontSize: 9, marginTop: 2 },

  accentBar: { height: 3, backgroundColor: '#4f8ef7' },

  mapImage: { width: '100%', height: 180 },
  mapPlaceholder: { height: 180, backgroundColor: '#0a1628', justifyContent: 'center', alignItems: 'center' },
  mapPlaceholderText: { color: '#1e3a6e', fontSize: 10 },

  statsBar: { backgroundColor: '#080d1a', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e2d4a' },
  stat: { flex: 1, padding: '10 14', borderRightWidth: 1, borderRightColor: '#1e2d4a' },
  statLast: { flex: 1, padding: '10 14' },
  statLabel: { color: '#4a6a9a', fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { color: '#ffffff', fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  statValueGreen: { color: '#3ecf6e', fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  co2Note: { color: '#3ecf6e', fontSize: 7, marginTop: 1 },

  sectionHeader: { backgroundColor: '#f8f9fa', padding: '6 20', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sectionTitle: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 },

  leg: { flexDirection: 'row', padding: '12 20', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', alignItems: 'flex-start', gap: 12 },
  legNumCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#080d1a', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  legNum: { color: '#4f8ef7', fontSize: 10, fontFamily: 'Helvetica-Bold' },
  legBody: { flex: 1 },
  legRoute: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111111' },
  legMeta: { flexDirection: 'row', marginTop: 4, gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  legTime: { fontSize: 11, color: '#374151', fontFamily: 'Helvetica-Bold' },
  legDuration: { fontSize: 10, color: '#6b7280' },
  badgeOperator: { backgroundColor: '#fef2f2', color: '#dc2626', fontSize: 9, padding: '2 6', borderRadius: 3 },
  badgeTrain: { backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: 9, padding: '2 6', borderRadius: 3 },
  badgeRolling: { backgroundColor: '#f0fdf4', color: '#15803d', fontSize: 9, padding: '2 6', borderRadius: 3 },
  legRight: { alignItems: 'flex-end', fontSize: 10, color: '#6b7280' },

  footer: { backgroundColor: '#080d1a', padding: '12 20', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: {},
  footerText: { fontSize: 9, color: '#4a6a9a' },
  footerDisclaimer: { fontSize: 8, color: '#1e3a6e', marginTop: 2 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerUrl: { fontSize: 9, color: '#4f8ef7', textAlign: 'right' },
  qrImage: { width: 52, height: 52 },
})

interface TripDocumentProps {
  trip: any
  legs: any[]
  mapImageBase64: string | null
  qrBase64: string | null
  totalKm: number
  totalDuration: string
  co2Saved: number
  shareUrl: string | null
}

export function TripDocument({ trip, legs, mapImageBase64, qrBase64, totalKm, totalDuration, co2Saved, shareUrl }: TripDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logoText}>Railtrax</Text>
          <View style={styles.headerRight}>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            <Text style={styles.tripDate}>{formatDateRange(legs)}</Text>
          </View>
        </View>

        <View style={styles.accentBar} />

        {mapImageBase64
          ? <Image src={mapImageBase64} style={styles.mapImage} />
          : <View style={styles.mapPlaceholder}><Text style={styles.mapPlaceholderText}>KARTE NICHT VERFÜGBAR</Text></View>
        }

        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Strecke</Text>
            <Text style={styles.statValue}>{Math.round(totalKm)} km</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Dauer</Text>
            <Text style={styles.statValue}>{totalDuration}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Abschnitte</Text>
            <Text style={styles.statValue}>{legs.length} Züge</Text>
          </View>
          <View style={styles.statLast}>
            <Text style={styles.statLabel}>CO₂ gespart</Text>
            <Text style={styles.statValueGreen}>{Math.round(co2Saved)} kg</Text>
            <Text style={styles.co2Note}>vs. Fliegen</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reiseabschnitte</Text>
        </View>

        {legs.map((leg, i) => (
          <View key={leg.id} style={styles.leg}>
            <View style={styles.legNumCircle}>
              <Text style={styles.legNum}>{i + 1}</Text>
            </View>
            <View style={styles.legBody}>
              <Text style={styles.legRoute}>
                {leg.origin_name} → {leg.destination_name}
              </Text>
              <View style={styles.legMeta}>
                <Text style={styles.legTime}>
                  {formatTime(leg.planned_departure)} → {formatTime(leg.planned_arrival)}
                </Text>
                <Text style={styles.legDuration}>
                  {calcDuration(leg.planned_departure, leg.planned_arrival)}
                </Text>
                {leg.operator && <Text style={styles.badgeOperator}>{leg.operator}</Text>}
                {leg.train_number && <Text style={styles.badgeTrain}>{leg.train_number}</Text>}
                {leg.rolling_stock?.series && <Text style={styles.badgeRolling}>{leg.rolling_stock.series}</Text>}
              </View>
            </View>
            <View style={styles.legRight}>
              {leg.platform_planned && <Text>{`Gleis ${leg.platform_planned}`}</Text>}
              {leg.seat && <Text>{leg.seat}</Text>}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              Erstellt am {new Date().toLocaleDateString('de-DE', { day:'numeric', month:'long', year:'numeric' })} · railtrax.eu
            </Text>
            <Text style={styles.footerDisclaimer}>
              Alle Angaben ohne Gewähr. Bitte offizielle Fahrpläne prüfen.
            </Text>
          </View>
          <View style={styles.footerRight}>
            {shareUrl && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.footerText}>Trip teilen</Text>
                <Text style={styles.footerUrl}>{shareUrl}</Text>
              </View>
            )}
            {qrBase64 && <Image src={qrBase64} style={styles.qrImage} />}
          </View>
        </View>
      </Page>
    </Document>
  )
}

function formatTime(iso: string | null) {
  if (!iso) return '–'
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDateRange(legs: any[]) {
  if (!legs.length) return ''
  const first = new Date(legs[0].planned_departure)
  const last = new Date(legs[legs.length-1].planned_arrival)
  const fmt = (d: Date) => d.toLocaleDateString('de-DE', { day:'numeric', month:'long', year:'numeric' })
  return first.toDateString() === last.toDateString() ? fmt(first) : `${fmt(first)} — ${fmt(last)}`
}

function calcDuration(dep: string | null, arr: string | null) {
  if (!dep || !arr) return ''
  const mins = Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000)
  return `${Math.floor(mins/60)}h ${mins%60}m`
}
