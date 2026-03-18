import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/shared/QueryProvider'
import { CookieBanner } from '@/components/legal/CookieBanner'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Railtrax',
  description: 'Plan, visualise, and document European train journeys.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080d1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
        <CookieBanner />
      </body>
    </html>
  )
}
