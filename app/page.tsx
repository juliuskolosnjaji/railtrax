'use client'

import Link from 'next/link'
import { Clock, Map, CheckCircle, Train } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import DemoMap from '@/components/landing/DemoMap'
import { useBreakpoint } from '@/hooks/useBreakpoint'

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
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'

  return (
    <div style={{ backgroundColor: '#080d1a', color: '#fff', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <header style={{ borderBottom: '1px solid #1e2d4a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '14px 16px' : '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: isMobile ? 'auto' : 64 }}>
          <Logo size="md" />
          {!isMobile && (
            <nav style={{ display: 'flex', gap: 32, fontSize: 14 }}>
              <a href="#features" style={{ color: '#8ba3c7', textDecoration: 'none' }}>Features</a>
              <a href="#züge"     style={{ color: '#8ba3c7', textDecoration: 'none' }}>Züge</a>
              <a href="#preise"   style={{ color: '#8ba3c7', textDecoration: 'none' }}>Preise</a>
            </nav>
          )}
          <Link href="/signup" style={{ 
            background: '#4f8ef7', 
            color: '#fff', 
            padding: isMobile ? '8px 14px' : '8px 20px', 
            borderRadius: 8, 
            fontSize: isMobile ? 12 : 14, 
            fontWeight: 500, 
            textDecoration: 'none',
            whiteSpace: 'nowrap'
          }}>
            {isMobile ? 'Starten' : 'Kostenlos starten'}
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: isMobile ? '40px 20px 32px' : '100px 2rem 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: isMobile ? '100%' : 680, margin: '0 auto' }}>
          <p style={{ color: '#4f8ef7', fontSize: isMobile ? 10 : 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24 }}>
            EUROPEAN RAIL PLANNER
          </p>
          <h1 style={{ 
            fontSize: isMobile ? 36 : 56, 
            fontWeight: 700, 
            lineHeight: 1.15, 
            marginBottom: isMobile ? 12 : 24, 
            letterSpacing: isMobile ? -1 : '-0.02em' 
          }}>
            Deine Reise.<br />
            <span style={{ color: '#4f8ef7' }}>Quer durch Europa.</span>
          </h1>
          <p style={{ 
            color: '#8ba3c7', 
            fontSize: isMobile ? 14 : 18, 
            lineHeight: 1.65, 
            marginBottom: isMobile ? 24 : 40, 
            maxWidth: isMobile ? '100%' : 500, 
            marginLeft: 'auto', 
            marginRight: 'auto',
            padding: isMobile ? '0 8px' : 0
          }}>
            Plane Zugreisen über alle Landesgrenzen hinweg. Visualisiere deine Route, dokumentiere Erlebnisse und check dich automatisch ein.
          </p>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 10 : 12, 
            justifyContent: 'center', 
            alignItems: 'center'
          }}>
            <Link href="/search" style={{
              background: '#4f8ef7',
              color: '#fff',
              padding: '13px 28px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? 320 : 'none'
            }}>
              Verbindungen suchen →
            </Link>
            <Link href="/login" style={{
              background: 'transparent',
              color: '#8ba3c7',
              padding: '13px 22px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              border: '1px solid #1e3a6e',
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? 320 : 'none'
            }}>
              Reisen planen — kostenlos
            </Link>
          </div>
        </div>
      </section>

      {/* ── Map preview card ── */}
      <section style={{ padding: isMobile ? '0 16px 60px' : '0 2rem 80px' }}>
        <div style={{ 
          maxWidth: isMobile ? '100%' : 900, 
          margin: '0 auto', 
          background: '#0a1628', 
          border: '1px solid #1e2d4a', 
          borderRadius: 16, 
          overflow: 'hidden' 
        }}>
          {/* Route bar */}
          <div style={{ 
            padding: isMobile ? '12px 14px' : '14px 24px', 
            borderBottom: '1px solid #1e2d4a', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, minWidth: 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 9, color: '#4a6a9a', marginBottom: 2, letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase' }}>VON</p>
                <p style={{ 
                  fontSize: isMobile ? 12 : 14, 
                  fontWeight: 600, 
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>Amsterdam Centraal</p>
              </div>
              <div style={{ color: '#4f8ef7', fontSize: isMobile ? 12 : 14, flexShrink: 0 }}>→</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 9, color: '#4a6a9a', marginBottom: 2, letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase' }}>NACH</p>
                <p style={{ 
                  fontSize: isMobile ? 12 : 14, 
                  fontWeight: 600, 
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>Wien Hauptbahnhof</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <span style={{ 
                background: '#0d1f3c', 
                border: '1px solid #1e3a6e', 
                color: '#4f8ef7', 
                padding: isMobile ? '2px 6px' : '4px 10px', 
                borderRadius: 6, 
                fontSize: isMobile ? 9 : 12, 
                fontWeight: 600 
              }}>ICE 228</span>
              <span style={{ 
                background: '#0d1f3c', 
                border: '1px solid #1e3a6e', 
                color: '#4f8ef7', 
                padding: isMobile ? '2px 6px' : '4px 10px', 
                borderRadius: 6, 
                fontSize: isMobile ? 9 : 12, 
                fontWeight: 600 
              }}>RJ 68</span>
            </div>
          </div>

          {/* Demo Map */}
          <div style={{ height: isMobile ? 160 : 200, overflow: 'hidden' }}>
            <DemoMap />
          </div>

          {/* Stats bar - 2x2 grid on mobile, 1x4 on desktop */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: 0,
            borderTop: '1px solid #1e2d4a'
          }}>
            {[
              { label: 'STRECKE', value: '1.428 km' },
              { label: 'DAUER', value: '13h 28m' },
              { label: 'ABSCHNITTE', value: '2 Züge' },
              { label: 'CO₂ GESPART', value: '314 kg', color: '#3ecf6e' }
            ].map(({ label, value, color }, index) => (
              <div key={label} style={{
                padding: isMobile ? '12px 14px' : '14px 24px',
                borderRight: index % (isMobile ? 2 : 4) < (isMobile ? 1 : 3) ? '1px solid #1e2d4a' : 'none',
                borderBottom: isMobile && index < 2 ? '1px solid #1e2d4a' : 'none'
              }}>
                <p style={{ 
                  fontSize: 9, 
                  color: '#4a6a9a', 
                  marginBottom: 3, 
                  letterSpacing: '0.06em', 
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>{label}</p>
                <p style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: color || '#fff'
                }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: isMobile ? '60px 16px' : '80px 2rem', background: '#010409' }}>
        <div style={{ maxWidth: isMobile ? '100%' : 900, margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: isMobile ? 24 : 30, 
            fontWeight: 700, 
            textAlign: 'center', 
            marginBottom: isMobile ? 8 : 12,
            letterSpacing: isMobile ? -0.5 : 0
          }}>
            Alles was du für deine Reise brauchst
          </h2>
          <p style={{ 
            textAlign: 'center', 
            color: '#8ba3c7', 
            fontSize: isMobile ? 14 : 16, 
            marginBottom: isMobile ? 32 : 48 
          }}>
            Von der Planung bis zum Reisebericht — alles in einer App.
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
            gap: isMobile ? 12 : 16,
            maxWidth: isMobile ? '100%' : 600,
            margin: '0 auto'
          }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ 
                background: '#0a1628', 
                border: '1px solid #1e2d4a', 
                borderRadius: 12, 
                padding: isMobile ? '16px' : 24,
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                alignItems: isMobile ? 'flex-start' : 'flex-start',
                gap: isMobile ? 12 : 0
              }}>
                <div style={{ 
                  width: 28, 
                  height: 28, 
                  background: '#0d1f3c', 
                  borderRadius: 8, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginBottom: isMobile ? 0 : 16
                }}>
                  <Icon size={isMobile ? 16 : 20} color="#4f8ef7" />
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: 13, 
                    fontWeight: 600, 
                    marginBottom: 4, 
                    color: '#fff' 
                  }}>{title}</h3>
                  <p style={{ 
                    fontSize: 12, 
                    color: '#8ba3c7', 
                    lineHeight: 1.6, 
                    margin: 0 
                  }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Operator strip ── */}
      <section id="züge" style={{ 
        padding: isMobile ? '32px 16px' : '56px 2rem', 
        borderTop: '1px solid #1e2d4a', 
        borderBottom: '1px solid #1e2d4a',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ 
            fontSize: 10, 
            color: '#4a6a9a', 
            letterSpacing: isMobile ? 3 : '0.1em', 
            textTransform: 'uppercase', 
            marginBottom: isMobile ? 16 : 24, 
            fontWeight: 600 
          }}>
            UNTERSTÜTZTE BETREIBER
          </p>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            maxWidth: isMobile ? 360 : 'none',
            margin: '0 auto'
          }}>
            {OPERATORS.map(({ name, color }) => (
              <span
                key={name}
                style={{
                  background: color === '#4f8ef7' ? '#0d1f3c' : `${color}18`,
                  border: `1px solid ${color}33`,
                  color,
                  padding: isMobile ? '5px 12px' : '6px 16px',
                  borderRadius: 5,
                  fontSize: isMobile ? 11 : 13,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap'
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section id="preise" style={{ padding: isMobile ? '60px 16px' : '80px 2rem' }}>
        <div style={{ 
          maxWidth: isMobile ? '100%' : 580, 
          margin: '0 auto', 
          background: '#0a1628', 
          border: '1px solid #1e3a6e', 
          borderRadius: 16, 
          padding: isMobile ? '40px 24px' : '60px 48px', 
          textAlign: 'center' 
        }}>
          <h2 style={{ 
            fontSize: isMobile ? 24 : 30, 
            fontWeight: 700, 
            marginBottom: isMobile ? 10 : 14 
          }}>
            Bereit für deine nächste Reise?
          </h2>
          <p style={{ 
            color: '#8ba3c7', 
            fontSize: isMobile ? 14 : 16, 
            marginBottom: isMobile ? 24 : 36, 
            lineHeight: 1.65 
          }}>
            Kostenlos starten. Keine Kreditkarte erforderlich.
          </p>
          <Link
            href="/signup"
            style={{ 
              background: '#4f8ef7', 
              color: '#fff', 
              padding: '14px 36px', 
              borderRadius: 8, 
              fontSize: 15, 
              fontWeight: 600, 
              textDecoration: 'none', 
              display: 'inline-block',
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? 320 : 'none'
            }}
          >
            Kostenlos starten
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ 
        borderTop: '1px solid #1e2d4a', 
        padding: isMobile ? '24px 16px' : '32px 2rem' 
      }}>
        <div style={{ 
          maxWidth: 1100, 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 16 : 0
        }}>
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
