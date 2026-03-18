export const metadata = { title: 'Impressum — Railtrax' }

const S = {
  page: {
    background: '#080d1a',
    minHeight: '100vh',
    padding: '60px 24px',
    color: '#fff',
    fontFamily: 'var(--font-sans, sans-serif)',
  } as React.CSSProperties,
  inner: { maxWidth: 680, margin: '0 auto' } as React.CSSProperties,
  h1: { fontSize: 28, fontWeight: 700, marginBottom: 32, color: '#fff' } as React.CSSProperties,
  h2: { fontSize: 16, fontWeight: 600, marginTop: 28, marginBottom: 8, color: '#8ba3c7' } as React.CSSProperties,
  p: { fontSize: 14, lineHeight: 1.7, color: '#c5d4e8', marginBottom: 0 } as React.CSSProperties,
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

export default function ImpressumPage() {
  const name    = process.env.NEXT_PUBLIC_OPERATOR_NAME   ?? '[Name einsetzen]'
  const street  = process.env.NEXT_PUBLIC_OPERATOR_STREET ?? '[Straße einsetzen]'
  const city    = process.env.NEXT_PUBLIC_OPERATOR_CITY   ?? '[PLZ + Stadt einsetzen]'
  const email   = process.env.NEXT_PUBLIC_OPERATOR_EMAIL  ?? 'legal@railtrax.eu'
  const phone   = process.env.NEXT_PUBLIC_OPERATOR_PHONE
  const vat     = process.env.NEXT_PUBLIC_OPERATOR_VAT

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <h1 style={S.h1}>Impressum</h1>

        <h2 style={S.h2}>Angaben gemäß § 5 TMG</h2>
        <p style={S.p}>
          {name}<br />
          {street}<br />
          {city}
        </p>

        <h2 style={S.h2}>Kontakt</h2>
        <p style={S.p}>
          E-Mail:{' '}
          <a href={`mailto:${email}`} style={S.a}>{email}</a>
          {phone && <><br />Telefon: {phone}</>}
        </p>

        {vat && (
          <>
            <h2 style={S.h2}>Umsatzsteuer-ID</h2>
            <p style={S.p}>
              Umsatzsteuer-Identifikationsnummer gemäß § 27a
              Umsatzsteuergesetz: {vat}
            </p>
          </>
        )}

        <h2 style={S.h2}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p style={S.p}>
          {name}<br />
          {street}<br />
          {city}
        </p>

        <div style={S.divider} />

        <h2 style={S.h2}>Streitschlichtung</h2>
        <p style={S.p}>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={S.a}>
            https://ec.europa.eu/consumers/odr
          </a>.<br />
          Unsere E-Mail-Adresse finden Sie oben im Impressum.
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
          vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>

        <h2 style={S.h2}>Haftung für Inhalte</h2>
        <p style={S.p}>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
          Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
          diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
          Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden
          wir diese Inhalte umgehend entfernen.
        </p>

        <h2 style={S.h2}>Haftung für Links</h2>
        <p style={S.p}>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links
          umgehend entfernen.
        </p>

        <div style={S.footer}>
          <a href="/datenschutz" style={S.footerLink}>Datenschutz</a>
          <a href="/nutzungsbedingungen" style={S.footerLink}>AGB</a>
          <a href="/dashboard" style={S.footerLink}>Zurück zur App</a>
        </div>
      </div>
    </div>
  )
}
