'use client'

import Link from 'next/link'
import { Clock, Map, CheckCircle, Train } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import DemoMap from '@/components/landing/DemoMap'

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
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <header className="border-b border-border">
        <div className="max-w-[1100px] mx-auto px-5 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#züge" className="hover:text-foreground transition-colors">Züge</a>
            <a href="#preise" className="hover:text-foreground transition-colors">Preise</a>
          </nav>
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md px-5 h-10 inline-flex items-center transition-colors"
          >
            <span className="hidden sm:inline">Kostenlos starten</span>
            <span className="sm:hidden">Starten</span>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="text-center px-5 py-24 md:py-[100px]">
        <div className="max-w-[680px] mx-auto hero-content">
          <p className="text-primary text-[11px] font-semibold tracking-[0.15em] uppercase mb-6">
            European Rail Planner
          </p>
          <h1 className="text-4xl md:text-[56px] font-bold leading-[1.15] tracking-tight mb-4 md:mb-6">
            Deine Reise.<br />
            <span className="text-primary">Quer durch Europa.</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 md:mb-10 max-w-[500px] mx-auto">
            Plane Zugreisen über alle Landesgrenzen hinweg. Visualisiere deine Route, dokumentiere Erlebnisse und check dich automatisch ein.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/search"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-md px-7 h-11 inline-flex items-center gap-2 transition-colors text-sm"
            >
              Verbindungen suchen →
            </Link>
            <Link
              href="/login"
              className="border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium rounded-md px-6 h-11 inline-flex items-center gap-2 transition-colors text-sm"
            >
              Reisen planen — kostenlos
            </Link>
          </div>
        </div>
      </section>

      {/* ── Map preview card ── */}
      <section className="px-5 pb-20 md:pb-[80px]">
        <div className="max-w-[900px] mx-auto">
          <div className="card rounded-xl overflow-hidden">
            {/* Route bar */}
            <div className="px-5 md:px-6 py-3.5 border-b border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <p className="stat-label mb-0.5">Von</p>
                  <p className="text-sm font-semibold truncate">Amsterdam Centraal</p>
                </div>
                <span className="text-primary text-sm flex-shrink-0">→</span>
                <div className="min-w-0 flex-1">
                  <p className="stat-label mb-0.5">Nach</p>
                  <p className="text-sm font-semibold truncate">Wien Hauptbahnhof</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0 tap-small">
                <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold rounded-md px-2.5 py-1 tap-small">
                  ICE 228
                </span>
                <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold rounded-md px-2.5 py-1 tap-small">
                  RJ 68
                </span>
              </div>
            </div>

            {/* Demo Map */}
            <div className="h-[200px] md:h-[320px]">
              <DemoMap />
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x-0 md:divide-x divide-y md:divide-y-0 border-t border-border">
              {[
                { label: 'STRECKE', value: '1.428 km' },
                { label: 'DAUER', value: '13h 28m' },
                { label: 'ABSCHNITTE', value: '2 Züge' },
                { label: 'CO₂ GESPART', value: '314 kg', highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="px-5 md:px-6 py-3.5">
                  <p className="stat-label mb-1">{label}</p>
                  <p className={`text-sm font-semibold ${highlight ? 'text-success' : 'text-foreground'}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-[hsl(var(--card))] py-20 md:py-[80px] px-5">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 tracking-tight">
            Alles was du für deine Reise brauchst
          </h2>
          <p className="text-center text-muted-foreground text-sm md:text-base mb-12 md:mb-14">
            Von der Planung bis zum Reisebericht — alles in einer App.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[600px] mx-auto">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="glass-panel rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center tap-small">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Operator strip ── */}
      <section id="züge" className="py-14 md:py-[56px] px-5 text-center border-y border-border">
        <div className="max-w-[900px] mx-auto">
          <p className="stat-label mb-6 md:mb-8">
            Unterstützte Betreiber
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {OPERATORS.map(({ name, color }) => (
              <span
                key={name}
                className="text-xs font-semibold tracking-wide rounded-md px-3.5 py-1.5 tap-small"
                style={{
                  background: `${color}18`,
                  border: `1px solid ${color}33`,
                  color,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section id="preise" className="py-20 md:py-[80px] px-5">
        <div className="max-w-[580px] mx-auto card rounded-xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
            Bereit für deine nächste Reise?
          </h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8">
            Kostenlos starten. Keine Kreditkarte erforderlich.
          </p>
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-md px-9 h-11 inline-flex items-center transition-colors text-sm"
          >
            Kostenlos starten
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-5">
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-muted-foreground text-sm">European Rail Planner</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/impressum" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
              Datenschutz
            </Link>
            <Link href="/nutzungsbedingungen" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
              AGB
            </Link>
          </div>
          <p className="text-muted-foreground text-sm m-0">
            © {new Date().getFullYear()} Railtrax
          </p>
        </div>
      </footer>

    </div>
  )
}
