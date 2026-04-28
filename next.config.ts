import type { NextConfig } from "next";

// next-intl: using client-side NextIntlClientProvider (no routing/URL changes).
// To enable server-side translations with locale routing, uncomment:
//   import createNextIntlPlugin from 'next-intl/plugin'
//   const withNextIntl = createNextIntlPlugin('./i18n.ts')
//   export default withNextIntl(nextConfig)

const securityHeaders = [
  { key: 'X-Frame-Options',       value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/((?!widget).*)',
        headers: securityHeaders,
      },
      {
        // Allow /widget/* to be embedded in any iframe (overrides X-Frame-Options above)
        source: '/widget/:path*',
        headers: [
          { key: 'X-Frame-Options',        value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *;" },
        ],
      },
    ]
  },
};

export default nextConfig;
