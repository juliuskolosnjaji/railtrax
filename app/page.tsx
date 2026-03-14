import Link from 'next/link'
import { Clock, Map, CheckCircle, Train, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const FEATURES = [
  {
    icon: Clock,
    title: 'Live-Abfahrten',
    desc: 'Echtzeit-Abfahrtszeiten und Verspätungen direkt aus dem DB-Navigator.',
  },
  {
    icon: Map,
    title: 'Kartenvisualisierung',
    desc: 'Zeige deine Reiseroute auf einer interaktiven Karte mit genauen Streckendaten.',
  },
  {
    icon: CheckCircle,
    title: 'Träwelling Check-in',
    desc: 'Automatischer Check-in auf Träwelling für jeden abgeschlossenen Abschnitt.',
  },
  {
    icon: Train,
    title: 'Baureihen-Info',
    desc: 'Fahrzeuginfo für ICE, TGV, Railjet und mehr — WiFi, Bistro, Fahrradstellplätze.',
  },
]

const OPERATORS = [
  { name: 'DB',        color: '#e32208' },
  { name: 'SBB',       color: '#e30613' },
  { name: 'ÖBB',       color: '#e2001a' },
  { name: 'NS',        color: '#4ea5e8' },
  { name: 'SNCF',      color: '#d00027' },
  { name: 'Eurostar',  color: '#ffe500' },
  { name: 'Flixtrain', color: '#73d700' },
]

export default function HomePage() {
  return (
    <div style={{ backgroundColor: '#080d1a', color: '#fff', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <header style={{ borderBottom: '1px solid #1e2d4a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Logo size="md" />
          <nav style={{ display: 'flex', gap: 32, fontSize: 14 }}>
            <a href="#features" style={{ color: '#8ba3c7', textDecoration: 'none' }}>Features</a>
            <a href="#züge"     style={{ color: '#8ba3c7', textDecoration: 'none' }}>Züge</a>
            <a href="#preise"   style={{ color: '#8ba3c7', textDecoration: 'none' }}>Preise</a>
          </nav>
          <Link href="/signup" style={{ background: '#4f8ef7', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Kostenlos starten
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: '100px 2rem 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ color: '#4f8ef7', fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24 }}>
            EUROPEAN RAIL PLANNER
          </p>
          <h1 style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.02em' }}>
            Deine Reise.<br />
            <span style={{ color: '#4f8ef7' }}>Quer durch Europa.</span>
          </h1>
          <p style={{ color: '#8ba3c7', fontSize: 18, lineHeight: 1.65, marginBottom: 40, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
            Plane Zugreisen über alle Landesgrenzen hinweg. Visualisiere deine Route, dokumentiere Erlebnisse und check dich automatisch ein.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#4f8ef7', color: '#fff', padding: '13px 28px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Jetzt starten — kostenlos
              <ArrowRight size={16} />
            </Link>
            <Link href="/login" style={{ background: 'transparent', color: '#8ba3c7', padding: '13px 28px', borderRadius: 8, fontSize: 15, fontWeight: 500, textDecoration: 'none', border: '1px solid #1e3a6e' }}>
              Einloggen
            </Link>
          </div>
        </div>
      </section>

      {/* ── Map preview card ── */}
      <section style={{ padding: '0 2rem 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 16, overflow: 'hidden' }}>
          {/* Route bar */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div>
                <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 2, letterSpacing: '0.06em', fontWeight: 600 }}>VON</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Amsterdam Centraal</p>
              </div>
              <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
                <line x1="0" y1="7" x2="30" y2="7" stroke="#4f8ef7" strokeWidth="1.5"/>
                <path d="M28 3L32 7L28 11" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="0" cy="7" r="2" fill="#4f8ef7"/>
              </svg>
              <div>
                <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 2, letterSpacing: '0.06em', fontWeight: 600 }}>NACH</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Wien Hauptbahnhof</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4f8ef7', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>ICE 228</span>
              <span style={{ background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4f8ef7', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>RJ 68</span>
            </div>
          </div>

          {/* SVG Route Map */}
          <div style={{ padding: '24px', position: 'relative', overflow: 'hidden', minHeight: 240 }}>
            {/* Background grid */}
            <svg width="100%" height="220" viewBox="0 0 860 220" fill="none" style={{ position: 'absolute', inset: 0, opacity: 0.08 }}>
              {Array.from({ length: 13 }).flatMap((_, i) =>
                Array.from({ length: 7 }).map((_, j) => (
                  <circle key={`${i}-${j}`} cx={30 + i * 67} cy={20 + j * 32} r="1.5" fill="#4f8ef7" />
                ))
              )}
            </svg>

            {/* Route */}
            <svg width="100%" height="210" viewBox="0 0 820 210" fill="none" style={{ position: 'relative', zIndex: 1 }}>
              {/* Route polyline */}
              <path
                d="M 90 155 C 170 148 220 130 290 120 C 360 110 400 102 470 98 C 540 94 590 112 650 125"
                stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round" fill="none"
              />
              {/* Dashed secondary track */}
              <path
                d="M 90 159 C 170 152 220 134 290 124 C 360 114 400 106 470 102 C 540 98 590 116 650 129"
                stroke="#1e3a6e" strokeWidth="1" strokeDasharray="4 4" strokeLinecap="round" fill="none"
              />

              {/* Amsterdam */}
              <circle cx="90"  cy="155" r="6" fill="#080d1a" stroke="#4f8ef7" strokeWidth="2"/>
              <circle cx="90"  cy="155" r="3" fill="#4f8ef7"/>
              <text x="90"  y="175" textAnchor="middle" fill="#8ba3c7" fontSize="11" fontFamily="Inter, sans-serif">Amsterdam</text>

              {/* Köln */}
              <circle cx="260" cy="123" r="4.5" fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="260" cy="123" r="2"   fill="#4f8ef7"/>
              <text x="260" y="140" textAnchor="middle" fill="#8ba3c7" fontSize="10" fontFamily="Inter, sans-serif">Köln</text>

              {/* Frankfurt */}
              <circle cx="380" cy="106" r="4.5" fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="380" cy="106" r="2"   fill="#4f8ef7"/>
              <text x="380" y="123" textAnchor="middle" fill="#8ba3c7" fontSize="10" fontFamily="Inter, sans-serif">Frankfurt</text>

              {/* München */}
              <circle cx="510" cy="98" r="4.5" fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="510" cy="98" r="2"   fill="#4f8ef7"/>
              <text x="510" y="115" textAnchor="middle" fill="#8ba3c7" fontSize="10" fontFamily="Inter, sans-serif">München</text>

              {/* Wien */}
              <circle cx="650" cy="125" r="6"   fill="#080d1a" stroke="#4f8ef7" strokeWidth="2"/>
              <circle cx="650" cy="125" r="3"   fill="#4f8ef7"/>
              <text x="650" y="145" textAnchor="middle" fill="#8ba3c7" fontSize="11" fontFamily="Inter, sans-serif">Wien</text>

              {/* Train marker */}
              <rect x="435" y="76" width="30" height="18" rx="5" fill="#4f8ef7"/>
              <text x="450" y="89" textAnchor="middle" fill="#080d1a" fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif">ICE</text>
            </svg>
          </div>

          {/* Stats bar */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid #1e2d4a', display: 'flex', gap: 36 }}>
            <div>
              <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>STRECKE</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>1.428 km</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>DAUER</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>11h 30m</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>ABSCHNITTE</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>2 Züge</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>CO₂ GESPART</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3ecf6e' }}>314 kg</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '80px 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 30, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>
            Alles was du für deine Reise brauchst
          </h2>
          <p style={{ textAlign: 'center', color: '#8ba3c7', fontSize: 16, marginBottom: 48 }}>
            Von der Planung bis zum Reisebericht — alles in einer App.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 12, padding: 24 }}>
                <div style={{ width: 40, height: 40, background: '#0d1f3c', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={20} color="#4f8ef7" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#fff' }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#8ba3c7', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Operator strip ── */}
      <section id="züge" style={{ padding: '56px 2rem', borderTop: '1px solid #1e2d4a', borderBottom: '1px solid #1e2d4a' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#4a6a9a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24, fontWeight: 600 }}>
            UNTERSTÜTZTE BETREIBER
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {OPERATORS.map(({ name, color }) => (
              <span
                key={name}
                style={{
                  background: `${color}18`,
                  border: `1px solid ${color}40`,
                  color,
                  padding: '6px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section id="preise" style={{ padding: '80px 2rem' }}>
        <div style={{ maxWidth: 580, margin: '0 auto', background: '#0a1628', border: '1px solid #1e3a6e', borderRadius: 16, padding: '60px 48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 14 }}>
            Bereit für deine nächste Reise?
          </h2>
          <p style={{ color: '#8ba3c7', fontSize: 16, marginBottom: 36, lineHeight: 1.65 }}>
            Kostenlos starten. Keine Kreditkarte erforderlich.
          </p>
          <Link
            href="/signup"
            style={{ background: '#4f8ef7', color: '#fff', padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
          >
            Kostenlos starten
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #1e2d4a', padding: '32px 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size="sm" />
            <span style={{ color: '#4a6a9a', fontSize: 13 }}>European Rail Planner</span>
          </div>
          <p style={{ color: '#4a6a9a', fontSize: 13, margin: 0 }}>
            © {new Date().getFullYear()} Railtrax
          </p>
        </div>
      </footer>

    </div>
  )
}
