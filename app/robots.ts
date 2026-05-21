import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/cliente', '/negocio/', '/auth', '/terminos', '/privacidad'],
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/empleado',
          '/onboarding/',
          '/upgrade',
          '/nuevo-negocio',
        ],
      },
    ],
    sitemap: 'https://khepria.app/sitemap.xml',
  }
}
