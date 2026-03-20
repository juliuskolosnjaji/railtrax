import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/shared/QueryProvider'
import { CookieBanner } from '@/components/legal/CookieBanner'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#080d1a',
}

const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Railtrax',
  description: 'Plan, visualise, and document European train journeys.',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://railtrax.app',
    siteName: 'Railtrax',
    images: [
      {
        url: 'https://railtrax.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Railtrax - Plan your European train journeys',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@railtrax',
    images: ['https://railtrax.app/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={dmSans.className}>
        <QueryProvider>{children}</QueryProvider>
        <CookieBanner />
      </body>
    </html>
  )
}
