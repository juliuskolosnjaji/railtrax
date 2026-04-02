import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/trips',
          '/settings',
          '/stats',
          '/abfahrten',
          '/search',
          '/entdecken',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://railtrax.app/sitemap.xml',
  }
}
