export const metadata = { title: 'Datenschutzerklärung — Railtrax' }

const LAST_UPDATED = '2026-03-18'

const S = {
  page: {
    background: '#080d1a',
    minHeight: '100vh',
    padding: '60px 24px',
    color: '#fff',
    fontFamily: 'var(--font-sans, sans-serif)',
  } as React.CSSProperties,
  inner: { maxWidth: 720, margin: '0 auto' } as React.CSSProperties,
  h1: { fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#fff' } as React.CSSProperties,
  meta: { fontSize: 13, color: '#4a6a9a', marginBottom: 40 } as React.CSSProperties,
  h2: { fontSize: 17, fontWeight: 600, marginTop: 40, marginBottom: 10, color: '#8ba3c7' } as React.CSSProperties,
  h3: { fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 6, color: '#c5d4e8' } as React.CSSProperties,
  p: { fontSize: 14, lineHeight: 1.75, color: '#c5d4e8', marginBottom: 12 } as React.CSSProperties,
  ul: { fontSize: 14, lineHeight: 1.75, color: '#c5d4e8', paddingLeft: 20, marginBottom: 12 } as React.CSSProperties,
  a: { color: '#4f8ef7' } as React.CSSProperties,
  divider: { height: 1, background: '#1e2d4a', margin: '32px 0' } as React.CSSProperties,
  footer: {
    marginTop: 48,
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap' as const,
    borderTop: '1px solid #1e2d4a',
    paddingTop: 20,
  },
  footerLink: { fontSize: 12, color: '#4a6a9a', textDecoration: 'none' } as React.CSSProperties,
}

export default function DatenschutzPage() {
  const name   = process.env.NEXT_PUBLIC_OPERATOR_NAME   ?? '[Name einsetzen]'
  const street = process.env.NEXT_PUBLIC_OPERATOR_STREET ?? '[Straße einsetzen]'
  const city   = process.env.NEXT_PUBLIC_OPERATOR_CITY   ?? '[PLZ + Stadt einsetzen]'
  const email  = process.env.NEXT_PUBLIC_OPERATOR_EMAIL  ?? 'legal@railtrax.eu'

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <h1 style={S.h1}>Datenschutzerklärung</h1>
        <p style={S.meta}>Zuletzt aktualisiert: {LAST_UPDATED}</p>

        {/* §1 */}
        <h2 style={S.h2}>§ 1 Verantwortlicher</h2>
        <p style={S.p}>
          {name}<br />
          {street}<br />
          {city}<br />
          E-Mail: <a href={`mailto:${email}`} style={S.a}>{email}</a>
        </p>

        <div style={S.divider} />

        {/* §2 */}
        <h2 style={S.h2}>§ 2 Datenerfassung auf unserer Website</h2>

        <h3 style={S.h3}>2.1 Server-Logfiles</h3>
        <p style={S.p}>
          Beim Aufruf unserer Website übermittelt Ihr Browser automatisch Informationen an unseren
          Server. Dies sind: IP-Adresse (nach 7 Tagen anonymisiert), Browser-Typ und -version,
          verwendetes Betriebssystem, Referrer-URL, aufgerufene URL sowie Datum und Uhrzeit des
          Zugriffs. Diese Daten sind technisch erforderlich, um die Website auszuliefern, und dienen
          der Sicherheit und Fehleranalyse.
        </p>
        <p style={S.p}>
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).<br />
          <strong>Speicherdauer:</strong> 7 Tage, danach automatische Löschung.
        </p>

        <h3 style={S.h3}>2.2 Cookies und LocalStorage</h3>
        <p style={S.p}>
          Wir verwenden ausschließlich technisch notwendige Speichertechnologien:
        </p>
        <ul style={S.ul}>
          <li>
            <strong>Supabase Session-Cookie</strong> — speichert Ihre Anmeldesitzung. Ohne dieses
            Cookie ist eine Nutzung der App nicht möglich.
          </li>
          <li>
            <strong>railtrax_consent</strong> — speichert Ihre Cookie-Einwilligung (LocalStorage).
          </li>
          <li>
            <strong>recent-searches</strong> — speichert Ihre zuletzt gesuchten Bahnhöfe
            lokal in Ihrem Browser (LocalStorage, niemals auf unsere Server übertragen).
          </li>
        </ul>
        <p style={S.p}>
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und
          § 25 Abs. 2 Nr. 2 TTDSG (technisch notwendig).<br />
          Wir setzen keine Tracking-, Werbe- oder Analyse-Cookies ein.
        </p>

        <div style={S.divider} />

        {/* §3 */}
        <h2 style={S.h2}>§ 3 Registrierung und Nutzerkonto</h2>
        <p style={S.p}>
          Für die Nutzung von Railtrax ist eine Registrierung erforderlich. Dabei verarbeiten wir:
        </p>
        <ul style={S.ul}>
          <li>E-Mail-Adresse (Pflichtangabe)</li>
          <li>Passwort (wird ausschließlich als bcrypt-Hash gespeichert — kein Klartextzugriff)</li>
          <li>Benutzername (Pflichtangabe)</li>
          <li>Profilbild (optional)</li>
        </ul>
        <p style={S.p}>
          <strong>Zweck:</strong> Bereitstellung des Dienstes (Vertragserfüllung).<br />
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO.<br />
          <strong>Speicherdauer:</strong> Bis zur Kontolöschung. Nach Löschung werden alle
          personenbezogenen Daten binnen 30 Tagen vollständig entfernt.
        </p>
        <p style={S.p}>
          <strong>Google OAuth:</strong> Falls Sie sich über Google anmelden, werden Ihr Name und
          Ihre E-Mail-Adresse von Google an uns übermittelt. Datenschutzerklärung Google:{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>
            https://policies.google.com/privacy
          </a>
        </p>
        <p style={S.p}>
          <strong>Mindestalter:</strong> Die Nutzung von Railtrax setzt ein Mindestalter von
          16 Jahren voraus (Art. 8 DSGVO).
        </p>

        <div style={S.divider} />

        {/* §4 */}
        <h2 style={S.h2}>§ 4 Reisedaten</h2>
        <p style={S.p}>
          Im Rahmen der Kernfunktionen der App verarbeiten wir folgende Daten:
        </p>
        <ul style={S.ul}>
          <li>Abfahrts- und Ankunftsstationen, Verbindungsdaten, Reisedaten</li>
          <li>Zugtyp, Betreiber, Zugnummer, Gleis, Verspätungsinformationen</li>
          <li>Reisenotizen und Fotos (optional, nur nach expliziter Eingabe durch Sie)</li>
        </ul>
        <p style={S.p}>
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO.<br />
          <strong>Speicherdauer:</strong> Bis zur Löschung durch Sie oder Kontolöschung.
        </p>
        <p style={S.p}>
          <strong>Öffentliche Trips:</strong> Wenn Sie eine Reise als öffentlich markieren, ist
          diese für jeden mit dem Share-Link einsehbar. Die Veröffentlichung erfolgt auf Ihre
          ausdrückliche Initiative hin (Art. 6 Abs. 1 lit. a DSGVO). Sie können die
          Veröffentlichung jederzeit rückgängig machen.
        </p>

        <div style={S.divider} />

        {/* §5 */}
        <h2 style={S.h2}>§ 5 Externe Dienste (Auftragsverarbeiter)</h2>

        <h3 style={S.h3}>5.1 Supabase (Datenbankdienstleister)</h3>
        <p style={S.p}>
          Anbieter: Supabase Inc., 970 Trestle Glen Rd, Oakland, CA 94610, USA.<br />
          Supabase verarbeitet Ihre Daten ausschließlich in unserem Auftrag (Art. 28 DSGVO). Ein
          Auftragsverarbeitungsvertrag (DPA) ist geschlossen. Datentransfer in die USA erfolgt auf
          Basis von EU-Standardvertragsklauseln (Art. 46 DSGVO). Datenspeicherort: AWS
          eu-central-1 (Frankfurt, EU).<br />
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>
            https://supabase.com/privacy
          </a>
        </p>

        <h3 style={S.h3}>5.2 Upstash Redis (Cache)</h3>
        <p style={S.p}>
          Anbieter: Upstash Inc. Zweck: Temporäres Caching von Suchanfragen (max. 5 Minuten).
          Gespeicherte Daten: anonymisierte Bahnhof-IDs (IBNRs) — keine personenbezogenen Daten.
          Datenspeicherort: EU.<br />
          <a href="https://upstash.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>
            https://upstash.com/privacy
          </a>
        </p>

        <h3 style={S.h3}>5.3 DB Navigator API / db-vendo-client</h3>
        <p style={S.p}>
          Für die Verbindungssuche und Echtzeitdaten werden Bahnhof-IDs (IBNRs) und Zeitstempel an
          die DB Navigator API übermittelt. Es werden keine personenbezogenen Daten (z. B.
          Nutzername, E-Mail) übertragen. Anbieter: Deutsche Bahn AG, 60329 Frankfurt am Main.
        </p>

        <h3 style={S.h3}>5.4 OpenFreeMap / MapLibre GL</h3>
        <p style={S.p}>
          Für die Kartenansicht werden beim Laden von Kartenkacheln technisch bedingt IP-Adressen an
          den CDN von OpenFreeMap übermittelt. Wir haben auf diese Verarbeitung keinen Einfluss.<br />
          <a href="https://openfreemap.org/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>
            https://openfreemap.org/privacy
          </a>
        </p>

        <h3 style={S.h3}>5.5 Träwelling (optional, nur bei aktiver Verbindung)</h3>
        <p style={S.p}>
          Wenn Sie Träwelling mit Railtrax verbinden, wird Ihr Träwelling-API-Token verschlüsselt
          in unserer Datenbank gespeichert. Bei einem Check-in werden Reisedaten an Träwelling
          übermittelt. Sie können die Verbindung jederzeit in den Einstellungen trennen.
          Datenschutzerklärung Träwelling:{' '}
          <a href="https://traewelling.de/datenschutz" target="_blank" rel="noopener noreferrer" style={S.a}>
            https://traewelling.de/datenschutz
          </a>
        </p>

        <h3 style={S.h3}>5.6 Lemon Squeezy (Zahlungsabwicklung, nur bei Abonnement)</h3>
        <p style={S.p}>
          Anbieter: Lemon Squeezy LLC. Zweck: Zahlungsabwicklung und Abonnementverwaltung.
          Verarbeitete Daten: E-Mail-Adresse und Zahlungsdaten. Kreditkartendaten werden
          ausschließlich von Lemon Squeezy verarbeitet und gelangen nicht in unsere Systeme.
          Lemon Squeezy ist Merchant of Record und übernimmt die EU-Umsatzsteuerabführung.<br />
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO.<br />
          <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>
            https://www.lemonsqueezy.com/privacy
          </a>
        </p>

        <h3 style={S.h3}>5.7 Resend (E-Mail-Versand)</h3>
        <p style={S.p}>
          Anbieter: Resend Inc. Zweck: Versand von Transaktionsmails (Anmeldebestätigung,
          Passwort-Reset). Ihre E-Mail-Adresse wird für den Versand an Resend übermittelt.<br />
          <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>
            https://resend.com/privacy
          </a>
        </p>

        <div style={S.divider} />

        {/* §6 */}
        <h2 style={S.h2}>§ 6 Ihre Rechte (Art. 15–22 DSGVO)</h2>
        <p style={S.p}>Sie haben folgende Rechte gegenüber uns:</p>
        <ul style={S.ul}>
          <li>
            <strong>Auskunft (Art. 15 DSGVO):</strong> Kostenloser Datenexport als JSON-Datei
            in den Einstellungen unter „Daten &amp; Privatsphäre".
          </li>
          <li>
            <strong>Berichtigung (Art. 16 DSGVO):</strong> Ihr Profil ist jederzeit in den
            Einstellungen bearbeitbar.
          </li>
          <li>
            <strong>Löschung (Art. 17 DSGVO):</strong> Kontolöschung jederzeit in den
            Einstellungen möglich. Vollständige Löschung aller Daten binnen 30 Tagen.
          </li>
          <li>
            <strong>Einschränkung (Art. 18 DSGVO):</strong> Auf Anfrage an{' '}
            <a href={`mailto:${email}`} style={S.a}>{email}</a>.
          </li>
          <li>
            <strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> JSON-Export in den
            Einstellungen unter „Daten &amp; Privatsphäre".
          </li>
          <li>
            <strong>Widerspruch (Art. 21 DSGVO):</strong> Gegen Verarbeitungen auf Basis von
            Art. 6 Abs. 1 lit. f DSGVO (Logfiles).
          </li>
          <li>
            <strong>Beschwerde:</strong> Sie haben das Recht, sich bei einer
            Datenschutz-Aufsichtsbehörde zu beschweren, z. B. beim Landesbeauftragten für
            Datenschutz Ihres Bundeslandes.
          </li>
        </ul>

        <div style={S.divider} />

        {/* §7 */}
        <h2 style={S.h2}>§ 7 Datensicherheit</h2>
        <p style={S.p}>
          Alle Daten werden ausschließlich verschlüsselt übertragen (TLS 1.3). Passwörter werden
          als bcrypt-Hash gespeichert — ein Klartextzugriff ist technisch ausgeschlossen.
          Zahlungsdaten werden nicht auf unseren Servern gespeichert. Zugriff auf
          Produktionssysteme ist auf das Notwendigste beschränkt (Principle of Least Privilege).
        </p>

        {/* §8 */}
        <h2 style={S.h2}>§ 8 Änderungen dieser Datenschutzerklärung</h2>
        <p style={S.p}>
          Wir behalten uns vor, diese Datenschutzerklärung bei Änderungen der gesetzlichen
          Anforderungen oder unserer Dienste anzupassen. Bei wesentlichen Änderungen informieren
          wir Sie per E-Mail. Das Datum der letzten Aktualisierung ist oben angegeben.
        </p>

        <div style={S.footer}>
          <a href="/impressum" style={S.footerLink}>Impressum</a>
          <a href="/nutzungsbedingungen" style={S.footerLink}>AGB</a>
          <a href="/dashboard" style={S.footerLink}>Zurück zur App</a>
        </div>
      </div>
    </div>
  )
}
