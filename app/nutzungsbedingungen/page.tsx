export const metadata = { title: 'Nutzungsbedingungen — Railtrax' }

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

export default function NutzungsbedingungenPage() {
  const name   = process.env.NEXT_PUBLIC_OPERATOR_NAME  ?? '[Name einsetzen]'
  const city   = process.env.NEXT_PUBLIC_OPERATOR_CITY  ?? '[Stadt einsetzen]'
  const email  = process.env.NEXT_PUBLIC_OPERATOR_EMAIL ?? 'legal@railtrax.eu'

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <h1 style={S.h1}>Nutzungsbedingungen (AGB)</h1>
        <p style={S.meta}>Stand: März 2026</p>

        <h2 style={S.h2}>§ 1 Geltungsbereich</h2>
        <p style={S.p}>
          Diese Nutzungsbedingungen gelten für die Nutzung von Railtrax, einem Dienst von {name},
          zur privaten Reiseplanung und -dokumentation mit der Bahn in Europa. Kommerzielle Nutzung
          — insbesondere das automatisierte Abrufen von Verbindungsdaten für eigene Systeme oder
          Dienste Dritter — ist nur mit ausdrücklicher schriftlicher Genehmigung des Betreibers
          erlaubt.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>§ 2 Leistungsbeschreibung</h2>
        <p style={S.p}>
          Railtrax bietet folgende Leistungen an:
        </p>
        <ul style={S.ul}>
          <li>
            <strong>Free-Tarif:</strong> Bis zu 3 Reisen, Verbindungssuche, grundlegende
            Kartenfunktionen.
          </li>
          <li>
            <strong>Plus/Pro:</strong> Erweiterte Funktionen gemäß der aktuellen Preisseite.
          </li>
        </ul>
        <p style={S.p}>
          Verbindungsdaten (Abfahrtszeiten, Verspätungen, Gleisangaben) werden von der DB
          Navigator API und weiteren Quellen bezogen. Für die Richtigkeit dieser Daten übernehmen
          wir keine Haftung. Maßgeblich sind stets die Angaben des jeweiligen
          Verkehrsunternehmens.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>§ 3 Nutzerkonto</h2>
        <ul style={S.ul}>
          <li>Mindestalter für die Nutzung: 16 Jahre (Art. 8 DSGVO).</li>
          <li>Pro Person ist nur ein Konto zulässig.</li>
          <li>
            Die Zugangsdaten sind geheim zu halten. Bei Verdacht auf unberechtigte Nutzung ist
            der Betreiber unverzüglich unter{' '}
            <a href={`mailto:${email}`} style={S.a}>{email}</a> zu informieren.
          </li>
        </ul>

        <div style={S.divider} />

        <h2 style={S.h2}>§ 4 Abonnements und Zahlung</h2>
        <ul style={S.ul}>
          <li>
            Abonnements verlängern sich automatisch zum Ende der jeweiligen Abrechnungsperiode,
            sofern Sie nicht zuvor kündigen.
          </li>
          <li>
            Eine Kündigung ist jederzeit möglich und wirksam zum Ende der laufenden
            Abrechnungsperiode. Die Kündigung erfolgt über die Einstellungen der App oder per
            E-Mail.
          </li>
          <li>
            Bereits gezahlte Beträge werden grundsätzlich nicht erstattet, sofern kein
            gesetzlicher Widerrufsanspruch besteht (vgl. § 5).
          </li>
          <li>
            Preisänderungen werden mindestens 30 Tage vor Wirksamwerden per E-Mail angekündigt.
          </li>
        </ul>

        <div style={S.divider} />

        <h2 style={S.h2}>§ 5 Widerrufsrecht</h2>
        <p style={S.p}>
          Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen einen Vertrag über den
          Erwerb eines Abonnements zu widerrufen (§ 355 BGB). Die Widerrufsfrist beginnt mit dem
          Tag des Vertragsschlusses.
        </p>
        <p style={S.p}>
          Um das Widerrufsrecht auszuüben, teilen Sie uns Ihre Entscheidung, diesen Vertrag zu
          widerrufen, durch eine eindeutige Erklärung per E-Mail an{' '}
          <a href={`mailto:${email}`} style={S.a}>{email}</a> mit.
        </p>
        <p style={S.p}>
          <strong>Erlöschen des Widerrufsrechts:</strong> Wenn Sie ausdrücklich zustimmen, dass
          mit der Ausführung des Dienstes vor Ablauf der Widerrufsfrist begonnen wird, und Sie
          zur Kenntnis nehmen, dass Ihr Widerrufsrecht mit vollständiger Vertragserfüllung
          erlischt (§ 356 Abs. 5 BGB), entfällt das Widerrufsrecht nach vollständiger Erbringung
          der Leistung.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>§ 6 Verbotene Nutzung</h2>
        <p style={S.p}>Folgende Nutzungen sind untersagt:</p>
        <ul style={S.ul}>
          <li>
            Automatisiertes Abfragen der DB Navigator API oder anderer Datenquellen über unsere
            Plattform (außer mit explizit freigegebenem API-Key im Pro-Tarif).
          </li>
          <li>
            Verbreitung rechtswidriger, beleidigender oder die Rechte Dritter verletzender Inhalte
            in öffentlichen Trips.
          </li>
          <li>
            Reverse Engineering, Dekompilierung oder sonstige Manipulation der App oder ihrer
            Bestandteile.
          </li>
          <li>
            Umgehung von Nutzungsbeschränkungen (z. B. Erstellung mehrerer Accounts zur Umgehung
            des Free-Tarif-Limits).
          </li>
        </ul>

        <div style={S.divider} />

        <h2 style={S.h2}>§ 7 Haftungsbeschränkung</h2>
        <p style={S.p}>
          Wir haften nicht für:
        </p>
        <ul style={S.ul}>
          <li>
            Die Richtigkeit, Vollständigkeit oder Aktualität von Verbindungs- und Verspätungsdaten.
          </li>
          <li>
            Schäden, die durch die Nutzung von Verbindungsdaten für Buchungs- oder
            Reiseentscheidungen entstehen.
          </li>
          <li>
            Datenverlust durch höhere Gewalt, Ausfälle von Drittdiensten (Supabase, Upstash, etc.)
            oder außerhalb unserer Kontrolle liegende Ereignisse.
          </li>
        </ul>
        <p style={S.p}>
          Für kostenlose Leistungen ist die Haftung auf Vorsatz und grobe Fahrlässigkeit
          beschränkt (§ 521 BGB analog). Für entgeltliche Leistungen gilt die gesetzliche Haftung,
          begrenzt auf den vorhersehbaren vertragstypischen Schaden.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>§ 8 Änderungen der AGB</h2>
        <p style={S.p}>
          Wesentliche Änderungen dieser Nutzungsbedingungen werden mindestens 30 Tage vor
          Wirksamwerden per E-Mail angekündigt. Bei Widerspruch haben Sie das Recht zur
          kostenlosen Kündigung Ihres Abonnements zum Zeitpunkt des Wirksamwerdens der Änderungen.
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>§ 9 Anwendbares Recht und Gerichtsstand</h2>
        <p style={S.p}>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
          UN-Kaufrechts (CISG). Gerichtsstand für Streitigkeiten mit Unternehmern ist{' '}
          {city?.split(' ').slice(1).join(' ') || city}, soweit gesetzlich zulässig. Für
          Verbraucher gelten die gesetzlichen Gerichtsstände.
        </p>

        <div style={S.footer}>
          <a href="/impressum" style={S.footerLink}>Impressum</a>
          <a href="/datenschutz" style={S.footerLink}>Datenschutz</a>
          <a href="/dashboard" style={S.footerLink}>Zurück zur App</a>
        </div>
      </div>
    </div>
  )
}
